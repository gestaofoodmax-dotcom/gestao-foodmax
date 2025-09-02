import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const TipoPedidoEnum = z.enum(["Atendente", "QR Code", "APP", "Outro"]);
const StatusPedidoEnum = z.enum(["Pendente", "Finalizado", "Cancelado"]);

const PedidoSchema = z.object({
  estabelecimento_id: z.number().int().positive(),
  cliente_id: z.number().int().positive().nullable().optional(),
  tipo_pedido: TipoPedidoEnum,
  codigo: z.string().optional(),
  observacao: z.string().nullable().optional(),
  status: StatusPedidoEnum.optional().default("Pendente"),
  valor_total: z.number().int().nonnegative(),
  cardapios: z.array(
    z.object({
      cardapio_id: z.number().int().positive(),
      preco_total: z.number().int().nonnegative().optional(),
    }),
  ),
  itens_extras: z.array(
    z.object({
      item_id: z.number().int().positive(),
      categoria_id: z.number().int().positive(),
      quantidade: z.number().int().positive(),
      valor_unitario: z.number().int().nonnegative(),
    }),
  ),
  data_hora_finalizado: z.string().nullable().optional(),
});

const UpdatePedidoSchema = PedidoSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

function generateCodigo(): string {
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${part()}-${part()}`;
}

export const listPedidos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("pedidos")
      .select("*", { count: "exact" })
      .eq("id_usuario", userId);

    if (search) {
      query = query.or(`codigo.ilike.%${search}%`);
    }

    if (status && ["Pendente", "Finalizado", "Cancelado"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    // Load estabelecimento names
    const result = [] as any[];
    for (const p of data || []) {
      let estabelecimento_nome: string | undefined;
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("nome")
        .eq("id", p.estabelecimento_id)
        .single();
      estabelecimento_nome = est?.nome;
      result.push({ ...p, estabelecimento_nome });
    }

    res.json({
      data: result,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error listing pedidos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getPedido: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (error || !pedido)
      return res.status(404).json({ error: "Pedido não encontrado" });

    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("nome")
      .eq("id", pedido.estabelecimento_id)
      .single();

    const { data: cli } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", pedido.cliente_id)
      .single();

    const { data: cardapios } = await supabase
      .from("pedidos_cardapios")
      .select("*, cardapios:cardapio_id(nome, preco_total)")
      .eq("pedido_id", id);

    const { data: extras } = await supabase
      .from("pedidos_itens_extras")
      .select(
        "*, itens:item_id(nome, estoque_atual), itens_categorias:categoria_id(nome)",
      )
      .eq("pedido_id", id);

    res.json({
      ...pedido,
      estabelecimento_nome: est?.nome,
      cliente_nome: cli?.nome || null,
      cardapios: (cardapios || []).map((c: any) => ({
        ...c,
        cardapio_nome: c.cardapios?.nome,
      })),
      itens_extras: (extras || []).map((e: any) => ({
        ...e,
        item_nome: e.itens?.nome,
        estoque_atual: e.itens?.estoque_atual,
        categoria_nome: e.itens_categorias?.nome,
      })),
    });
  } catch (error) {
    console.error("Error getting pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createPedido: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const parsed = PedidoSchema.parse(req.body);
    const codigo =
      parsed.codigo && parsed.codigo.trim() ? parsed.codigo : generateCodigo();

    // Validate itens_extras stock and categoria
    if (parsed.itens_extras.length > 0) {
      const ids = [...new Set(parsed.itens_extras.map((e) => e.item_id))];
      const { data: itens, error: itensError } = await supabase
        .from("itens")
        .select("id, estoque_atual, categoria_id")
        .in("id", ids);
      if (itensError) throw itensError;
      const byId = new Map<
        number,
        { estoque_atual: number | null; categoria_id: number }
      >();
      (itens || []).forEach((i: any) =>
        byId.set(i.id, {
          estoque_atual: i.estoque_atual,
          categoria_id: i.categoria_id,
        }),
      );
      for (const e of parsed.itens_extras) {
        const info = byId.get(e.item_id);
        const estoque = info?.estoque_atual ?? 0;
        if (!info) {
          return res.status(400).json({
            error: `Item inválido (${e.item_id})`,
          });
        }
        if (info.categoria_id !== e.categoria_id) {
          return res.status(400).json({
            error: `Categoria do item não confere para o item ${e.item_id}`,
          });
        }
        if (estoque <= 0) {
          return res.status(400).json({
            error: `Item sem estoque (${e.item_id}). Ajuste no módulo Itens.`,
          });
        }
        if (e.quantidade > estoque) {
          return res.status(400).json({
            error: `Quantidade informada (${e.quantidade}) é maior que o estoque atual (${estoque}) do item ${e.item_id}. Ajuste o estoque no módulo Itens.`,
          });
        }
      }
    }

    // If cardapio price not supplied, load it
    const cardapiosData = [] as {
      cardapio_id: number;
      preco_total: number;
    }[];
    for (const c of parsed.cardapios) {
      let preco = c.preco_total;
      if (typeof preco !== "number") {
        const { data: cd } = await supabase
          .from("cardapios")
          .select("preco_total")
          .eq("id", c.cardapio_id)
          .single();
        preco = cd?.preco_total || 0;
      }
      cardapiosData.push({
        cardapio_id: c.cardapio_id,
        preco_total: preco!,
      });
    }

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        id_usuario: userId,
        estabelecimento_id: parsed.estabelecimento_id,
        cliente_id: parsed.cliente_id ?? null,
        tipo_pedido: parsed.tipo_pedido,
        codigo,
        observacao: parsed.observacao || null,
        status: parsed.status || "Pendente",
        valor_total: parsed.valor_total,
        data_hora_finalizado: parsed.data_hora_finalizado ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    if (cardapiosData.length > 0) {
      await supabase.from("pedidos_cardapios").insert(
        cardapiosData.map((c) => ({
          pedido_id: pedido.id,
          cardapio_id: c.cardapio_id,
          preco_total: c.preco_total,
        })),
      );
    }

    if (parsed.itens_extras.length > 0) {
      await supabase.from("pedidos_itens_extras").insert(
        parsed.itens_extras.map((e) => ({
          pedido_id: pedido.id,
          item_id: e.item_id,
          categoria_id: e.categoria_id,
          quantidade: e.quantidade,
          valor_unitario: e.valor_unitario,
        })),
      );
    }

    res.status(201).json(pedido);
  } catch (error: any) {
    console.error("Error creating pedido:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updatePedido: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const parsed = UpdatePedidoSchema.parse(req.body);

    // ensure exists and belongs to user
    const { data: existing } = await supabase
      .from("pedidos")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (!existing)
      return res.status(404).json({ error: "Pedido não encontrado" });

    // Validate itens_extras if provided
    if (parsed.itens_extras && parsed.itens_extras.length > 0) {
      const ids = [...new Set(parsed.itens_extras.map((e) => e.item_id))];
      const { data: itens, error: itensError } = await supabase
        .from("itens")
        .select("id, estoque_atual, categoria_id")
        .in("id", ids);
      if (itensError) throw itensError;
      const byId = new Map<
        number,
        { estoque_atual: number | null; categoria_id: number }
      >();
      (itens || []).forEach((i: any) =>
        byId.set(i.id, {
          estoque_atual: i.estoque_atual,
          categoria_id: i.categoria_id,
        }),
      );
      for (const e of parsed.itens_extras) {
        const info = byId.get(e.item_id);
        const estoque = info?.estoque_atual ?? 0;
        if (!info) {
          return res
            .status(400)
            .json({ error: `Item inválido (${e.item_id})` });
        }
        if (info.categoria_id !== e.categoria_id) {
          return res.status(400).json({
            error: `Categoria do item não confere para o item ${e.item_id}`,
          });
        }
        if (estoque <= 0) {
          return res.status(400).json({
            error: `Item sem estoque (${e.item_id}). Ajuste no módulo Itens.`,
          });
        }
        if (e.quantidade > estoque) {
          return res.status(400).json({
            error: `Quantidade informada (${e.quantidade}) é maior que o estoque atual (${estoque}) do item ${e.item_id}. Ajuste o estoque no módulo Itens.`,
          });
        }
      }
    }

    const updateData: any = { ...parsed };

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .update(updateData)
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();
    if (error) throw error;

    if (parsed.cardapios) {
      await supabase.from("pedidos_cardapios").delete().eq("pedido_id", id);
      if (parsed.cardapios.length > 0) {
        const cardapiosData = [] as {
          cardapio_id: number;
          preco_total: number;
        }[];
        for (const c of parsed.cardapios) {
          let preco = c.preco_total;
          if (typeof preco !== "number") {
            const { data: cd } = await supabase
              .from("cardapios")
              .select("preco_total")
              .eq("id", c.cardapio_id)
              .single();
            preco = cd?.preco_total || 0;
          }
          cardapiosData.push({
            cardapio_id: c.cardapio_id,
            preco_total: preco!,
          });
        }
        await supabase
          .from("pedidos_cardapios")
          .insert(
            cardapiosData.map((c) => ({ pedido_id: parseInt(id), ...c })),
          );
      }
    }

    if (parsed.itens_extras) {
      await supabase.from("pedidos_itens_extras").delete().eq("pedido_id", id);
      if (parsed.itens_extras.length > 0) {
        await supabase
          .from("pedidos_itens_extras")
          .insert(
            parsed.itens_extras.map((e) => ({ pedido_id: parseInt(id), ...e })),
          );
      }
    }

    res.json(pedido);
  } catch (error: any) {
    console.error("Error updating pedido:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deletePedido: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { data: existing } = await supabase
      .from("pedidos")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (!existing)
      return res.status(404).json({ error: "Pedido não encontrado" });

    const { error } = await supabase
      .from("pedidos")
      .delete()
      .eq("id", id)
      .eq("id_usuario", userId);
    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeletePedidos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const { ids }: { ids: number[] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "IDs inválidos" });

    const { error } = await supabase
      .from("pedidos")
      .delete()
      .in("id", ids)
      .eq("id_usuario", userId);
    if (error) throw error;

    res.json({ deletedCount: ids.length });
  } catch (error) {
    console.error("Error bulk deleting pedidos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const finalizarPedido: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("pedidos")
      .update({ status: "Finalizado", data_hora_finalizado: now })
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error finalizing pedido:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const importPedidos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const RecordsSchema = z.object({
      records: z.array(
        z.object({
          estabelecimento_nome: z.string().min(1),
          cliente_nome: z.string().optional(),
          codigo: z.string().optional(),
          tipo_pedido: TipoPedidoEnum,
          valor_total: z.union([z.number(), z.string()]).optional(),
          status: StatusPedidoEnum.optional(),
          data_hora_finalizado: z.string().optional(),
          observacao: z.string().optional(),
          cardapio_nome: z.string().optional(),
          cardapio_preco_total: z.union([z.number(), z.string()]).optional(),
          // Old extras naming (backward compat)
          extra_item_nome: z.string().optional(),
          extra_item_categoria: z.string().optional(),
          extra_item_quantidade: z.union([z.number(), z.string()]).optional(),
          extra_item_valor_unitario: z
            .union([z.number(), z.string()])
            .optional(),
          // New extras naming
          itens_extras_nome: z.string().optional(),
          itens_extras_categoria: z.string().optional(),
          itens_extras_quantidade: z.union([z.number(), z.string()]).optional(),
          itens_extras_valor_unitario: z
            .union([z.number(), z.string()])
            .optional(),
        }),
      ),
    });

    let records: any[] = [];
    try {
      const parsed = RecordsSchema.parse(req.body);
      records = parsed.records;
    } catch (e) {
      records = Array.isArray(req.body?.records) ? req.body.records : [];
    }

    const supabase = getSupabaseServiceClient();

    const parseCentavos = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === "number")
        return Number.isInteger(val) ? val : Math.round(val * 100);
      const s = String(val).trim();
      const clean = s
        .replace(/[^0-9,.-]/g, "")
        .replace(/\.(?=\d{3}(,|$))/g, "");
      const dot = clean.replace(",", ".");
      const n = Number(dot);
      if (!isNaN(n)) return Math.round(n * 100);
      const digits = s.replace(/\D/g, "");
      return digits ? parseInt(digits, 10) : 0;
    };

    const groups = new Map<string, any[]>();
    for (const r of records) {
      const codigo = (r.codigo && String(r.codigo).trim()) || generateCodigo();
      if (!groups.has(codigo)) groups.set(codigo, []);
      groups.get(codigo)!.push(r);
    }

    let imported = 0;
    for (const [codigo, rows] of groups.entries()) {
      try {
        const first = rows[0];
        const estNome = String(first.estabelecimento_nome).trim();
        // Resolve estabelecimento
        const { data: est } = await supabase
          .from("estabelecimentos")
          .select("id")
          .eq("nome", estNome)
          .eq("id_usuario", userId)
          .single();
        if (!est) continue; // cannot import without estabelecimento

        // Skip if pedido with same codigo exists
        const { data: existing } = await supabase
          .from("pedidos")
          .select("id")
          .eq("codigo", codigo)
          .eq("id_usuario", userId)
          .maybeSingle();
        if (existing) continue;

        // Resolve cliente
        let cliente_id: number | null = null;
        const cliNome = String(first.cliente_nome || "").trim();
        if (cliNome) {
          const { data: cli } = await supabase
            .from("clientes")
            .select("id")
            .eq("nome", cliNome)
            .eq("id_usuario", userId)
            .eq("estabelecimento_id", est.id)
            .maybeSingle();
          cliente_id = cli?.id ?? null;
        }

        const tipo = first.tipo_pedido as z.infer<typeof TipoPedidoEnum>;
        const status =
          (first.status as z.infer<typeof StatusPedidoEnum>) || "Pendente";
        const valor_total = parseCentavos(first.valor_total);
        const data_hora_finalizado = first.data_hora_finalizado
          ? new Date(first.data_hora_finalizado).toISOString()
          : null;
        const observacao = first.observacao || null;

        const { data: pedido, error: pedErr } = await supabase
          .from("pedidos")
          .insert({
            id_usuario: userId,
            estabelecimento_id: est.id,
            cliente_id,
            tipo_pedido: tipo,
            codigo,
            observacao,
            status,
            valor_total,
            data_hora_finalizado,
          })
          .select()
          .single();
        if (pedErr || !pedido) continue;

        // Collect related cardapios
        const cardapioEntries: { cardapio_id: number; preco_total: number }[] =
          [];
        for (const r of rows) {
          const nome = String(r.cardapio_nome || "").trim();
          if (!nome) continue;
          let cardapio_id: number | null = null;
          const { data: existingCardapio } = await supabase
            .from("cardapios")
            .select("id")
            .eq("nome", nome)
            .eq("id_usuario", userId)
            .maybeSingle();
          if (existingCardapio) {
            cardapio_id = existingCardapio.id;
          } else {
            const { data: novoCard } = await supabase
              .from("cardapios")
              .insert({
                id_usuario: userId,
                nome,
                tipo_cardapio: "Outro",
                quantidade_total: 0,
                preco_itens: 0,
                margem_lucro_percentual: 0,
                preco_total: parseCentavos(r.cardapio_preco_total),
                descricao: "",
                ativo: true,
              })
              .select("id")
              .single();
            cardapio_id = novoCard?.id ?? null;
          }
          if (cardapio_id) {
            cardapioEntries.push({
              cardapio_id,
              preco_total: parseCentavos(r.cardapio_preco_total),
            });
          }
        }
        if (cardapioEntries.length > 0) {
          await supabase.from("pedidos_cardapios").insert(
            cardapioEntries.map((c) => ({
              pedido_id: pedido.id,
              cardapio_id: c.cardapio_id,
              preco_total: c.preco_total,
            })),
          );
        }

        // Collect extras
        const extraEntries: {
          item_id: number;
          categoria_id: number;
          quantidade: number;
          valor_unitario: number;
        }[] = [];
        for (const r of rows) {
          const itemNome = String(
            r.itens_extras_nome || r.extra_item_nome || "",
          ).trim();
          if (!itemNome) continue;
          const catNome =
            String(
              r.itens_extras_categoria || r.extra_item_categoria || "",
            ).trim() || "Sem Categoria";

          // Resolve categoria
          let categoria_id: number | null = null;
          const { data: cat } = await supabase
            .from("itens_categorias")
            .select("id")
            .eq("nome", catNome)
            .eq("id_usuario", userId)
            .maybeSingle();
          if (cat) {
            categoria_id = cat.id;
          } else {
            const { data: novaCat } = await supabase
              .from("itens_categorias")
              .insert({ id_usuario: userId, nome: catNome, ativo: true })
              .select("id")
              .single();
            categoria_id = novaCat?.id ?? null;
          }
          if (!categoria_id) continue;

          // Resolve item
          let item_id: number | null = null;
          const { data: item } = await supabase
            .from("itens")
            .select("id")
            .eq("nome", itemNome)
            .eq("id_usuario", userId)
            .maybeSingle();
          if (item) {
            item_id = item.id;
          } else {
            const { data: novoItem } = await supabase
              .from("itens")
              .insert({
                id_usuario: userId,
                categoria_id,
                nome: itemNome,
                preco: parseCentavos(r.extra_item_valor_unitario),
                custo_pago: 0,
                unidade_medida: "un",
                peso_gramas: null,
                estoque_atual: 0,
                ativo: true,
              })
              .select("id")
              .single();
            item_id = novoItem?.id ?? null;
          }
          if (!item_id) continue;

          const quantidade =
            Number(r.itens_extras_quantidade ?? r.extra_item_quantidade) || 1;
          const valor_unitario = parseCentavos(
            r.itens_extras_valor_unitario ?? r.extra_item_valor_unitario,
          );
          extraEntries.push({
            item_id,
            categoria_id,
            quantidade,
            valor_unitario,
          });
        }

        if (extraEntries.length > 0) {
          try {
            await supabase
              .from("pedidos_itens_extras")
              .insert(
                extraEntries.map((e) => ({ pedido_id: pedido.id, ...e })),
              );
          } catch (e) {
            // Ignore stock validation errors for import (skip extras)
          }
        }

        imported++;
      } catch (e) {
        // skip this group
      }
    }

    res.json({ success: true, imported });
  } catch (error) {
    console.error("Error importing pedidos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
