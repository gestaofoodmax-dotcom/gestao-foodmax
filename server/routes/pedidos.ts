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
  valor_total_centavos: z.number().int().nonnegative(),
  cardapios: z.array(
    z.object({
      cardapio_id: z.number().int().positive(),
      preco_total_centavos: z.number().int().nonnegative().optional(),
    }),
  ),
  itens_extras: z.array(
    z.object({
      item_id: z.number().int().positive(),
      categoria_id: z.number().int().positive(),
      quantidade: z.number().int().positive(),
      valor_unitario_centavos: z.number().int().nonnegative(),
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
      .select("*, cardapios:cardapio_id(nome, preco_total_centavos)")
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
      preco_total_centavos: number;
    }[];
    for (const c of parsed.cardapios) {
      let preco = c.preco_total_centavos;
      if (typeof preco !== "number") {
        const { data: cd } = await supabase
          .from("cardapios")
          .select("preco_total_centavos")
          .eq("id", c.cardapio_id)
          .single();
        preco = cd?.preco_total_centavos || 0;
      }
      cardapiosData.push({
        cardapio_id: c.cardapio_id,
        preco_total_centavos: preco!,
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
        valor_total_centavos: parsed.valor_total_centavos,
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
          preco_total_centavos: c.preco_total_centavos,
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
          valor_unitario_centavos: e.valor_unitario_centavos,
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
          preco_total_centavos: number;
        }[];
        for (const c of parsed.cardapios) {
          let preco = c.preco_total_centavos;
          if (typeof preco !== "number") {
            const { data: cd } = await supabase
              .from("cardapios")
              .select("preco_total_centavos")
              .eq("id", c.cardapio_id)
              .single();
            preco = cd?.preco_total_centavos || 0;
          }
          cardapiosData.push({
            cardapio_id: c.cardapio_id,
            preco_total_centavos: preco!,
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
