import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const TipoEntregaEnum = z.enum(["Própria", "iFood", "Rappi", "UberEats", "Outro"]);
const StatusEntregaEnum = z.enum(["Pendente", "Saiu", "Entregue", "Cancelado"]);
const FormaPagamentoEnum = z.enum([
  "PIX",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Dinheiro",
  "Outro",
]);

const EnderecoSchema = z.object({
  cep: z
    .string()
    .max(8)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
  endereco: z.string().min(1),
  cidade: z.string().min(1),
  uf: z.string().length(2),
  pais: z.string().min(1),
});

const EntregaSchema = z.object({
  estabelecimento_id: z.number().int().positive(),
  tipo_entrega: TipoEntregaEnum.default("Própria"),
  pedido_id: z.number().int().positive().nullable().optional(),
  codigo_pedido_app: z
    .string()
    .max(64)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
  valor_pedido: z.number().int().nonnegative().default(0),
  taxa_extra: z.number().int().nonnegative().default(0),
  valor_entrega: z.number().int().nonnegative().default(0),
  forma_pagamento: FormaPagamentoEnum.default("PIX"),
  cliente_id: z.number().int().positive().nullable().optional(),
  ddi: z.string().min(1),
  telefone: z.string().min(1).max(15),
  data_hora_saida: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
  data_hora_entregue: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
  observacao: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
  status: StatusEntregaEnum.default("Pendente").optional(),
  endereco: EnderecoSchema,
});

const UpdateEntregaSchema = EntregaSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"]; // provided by frontend
  return userId ? parseInt(userId as string) : null;
};

export const listEntregas: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const search = (req.query.search as string) || "";
    const tipo = (req.query.tipo as string) || ""; // filter by tipo_entrega
    const offset = (page - 1) * limit;

    let query = supabase
      .from("entregas")
      .select("*", { count: "exact" })
      .eq("id_usuario", userId);

    if (search) {
      query = query.or(
        [
          `codigo_pedido_app.ilike.%${search}%`,
          `observacao.ilike.%${search}%`,
        ].join(","),
      );
    }

    if (tipo && ["Própria", "iFood", "Rappi", "UberEats", "Outro"].includes(tipo)) {
      query = query.eq("tipo_entrega", tipo);
    }

    const { data, count, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const result = [] as any[];
    for (const e of data || []) {
      let estabelecimento_nome: string | undefined;
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("nome")
        .eq("id", e.estabelecimento_id)
        .single();

      let pedido_codigo: string | null = null;
      if (e.pedido_id) {
        const { data: ped } = await supabase
          .from("pedidos")
          .select("codigo")
          .eq("id", e.pedido_id)
          .maybeSingle();
        pedido_codigo = ped?.codigo || null;
      }
      estabelecimento_nome = est?.nome;
      result.push({ ...e, estabelecimento_nome, pedido_codigo });
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
    console.error("Error listing entregas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getEntrega: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (error || !entrega)
      return res.status(404).json({ error: "Entrega não encontrada" });

    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("nome")
      .eq("id", entrega.estabelecimento_id)
      .single();

    let cliente_nome: string | null = null;
    if (entrega.cliente_id) {
      const { data: cli } = await supabase
        .from("clientes")
        .select("nome, ddi, telefone")
        .eq("id", entrega.cliente_id)
        .maybeSingle();
      cliente_nome = cli?.nome || null;
    }

    let pedido_codigo: string | null = null;
    let pedido_valor_total: number | null = null;
    if (entrega.pedido_id) {
      const { data: ped } = await supabase
        .from("pedidos")
        .select("codigo, valor_total")
        .eq("id", entrega.pedido_id)
        .maybeSingle();
      pedido_codigo = ped?.codigo || null;
      pedido_valor_total = ped?.valor_total ?? null;
    }

    const { data: endereco } = await supabase
      .from("entregas_enderecos")
      .select("*")
      .eq("entrega_id", id)
      .single();

    res.json({
      ...entrega,
      estabelecimento_nome: est?.nome,
      cliente_nome,
      pedido_codigo,
      pedido_valor_total,
      endereco: endereco || null,
    });
  } catch (error) {
    console.error("Error getting entrega:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createEntrega: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const parsed = EntregaSchema.parse(req.body);

    // regra de consistência: se tipo != Própria, não aceitar pedido_id
    const tipo = parsed.tipo_entrega;
    const pedido_id = tipo === "Própria" ? parsed.pedido_id ?? null : null;
    const codigo_pedido_app = tipo === "Própria" ? null : parsed.codigo_pedido_app ?? null;

    const insertData: any = {
      id_usuario: userId,
      estabelecimento_id: parsed.estabelecimento_id,
      tipo_entrega: tipo,
      pedido_id,
      codigo_pedido_app,
      valor_pedido: parsed.valor_pedido ?? 0,
      taxa_extra: parsed.taxa_extra ?? 0,
      valor_entrega: parsed.valor_entrega ?? 0,
      forma_pagamento: parsed.forma_pagamento ?? "PIX",
      cliente_id: parsed.cliente_id ?? null,
      ddi: parsed.ddi,
      telefone: parsed.telefone,
      data_hora_saida: parsed.data_hora_saida ?? null,
      data_hora_entregue: parsed.data_hora_entregue ?? null,
      observacao: parsed.observacao ?? null,
      status: parsed.status ?? "Pendente",
    };

    const { data: entrega, error } = await supabase
      .from("entregas")
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;

    // Endereco
    const enderecoData = {
      entrega_id: entrega.id,
      cep: parsed.endereco.cep ?? null,
      endereco: parsed.endereco.endereco,
      cidade: parsed.endereco.cidade,
      uf: parsed.endereco.uf,
      pais: parsed.endereco.pais,
    };
    const { error: endErr } = await supabase
      .from("entregas_enderecos")
      .insert(enderecoData);
    if (endErr) throw endErr;

    res.status(201).json(entrega);
  } catch (error: any) {
    console.error("Error creating entrega:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateEntrega: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const parsed = UpdateEntregaSchema.parse(req.body);

    const { data: existing } = await supabase
      .from("entregas")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (!existing) return res.status(404).json({ error: "Entrega não encontrada" });

    const { endereco: _e, ...body } = parsed as any;

    // normalizar consistência de campos conforme tipo
    if (body.tipo_entrega && body.tipo_entrega !== "Própria") {
      body.pedido_id = null;
    }
    if (body.tipo_entrega && body.tipo_entrega === "Própria") {
      body.codigo_pedido_app = null;
    }

    const { data: entrega, error } = await supabase
      .from("entregas")
      .update(body)
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();
    if (error) throw error;

    if (parsed.endereco) {
      await supabase.from("entregas_enderecos").delete().eq("entrega_id", id);
      await supabase.from("entregas_enderecos").insert({
        entrega_id: parseInt(id),
        cep: parsed.endereco.cep ?? null,
        endereco: parsed.endereco.endereco,
        cidade: parsed.endereco.cidade,
        uf: parsed.endereco.uf,
        pais: parsed.endereco.pais,
      });
    }

    res.json(entrega);
  } catch (error: any) {
    console.error("Error updating entrega:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteEntrega: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { data: existing } = await supabase
      .from("entregas")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (!existing) return res.status(404).json({ error: "Entrega não encontrada" });

    const { error } = await supabase
      .from("entregas")
      .delete()
      .eq("id", id)
      .eq("id_usuario", userId);
    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting entrega:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteEntregas: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { ids }: { ids: number[] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "IDs inválidos" });

    const { error } = await supabase
      .from("entregas")
      .delete()
      .in("id", ids)
      .eq("id_usuario", userId);
    if (error) throw error;

    res.json({ deletedCount: ids.length });
  } catch (error) {
    console.error("Error bulk deleting entregas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const registrarSaida: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("entregas")
      .update({ status: "Saiu", data_hora_saida: now })
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error setting entrega Saída:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const registrarEntregue: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("entregas")
      .update({ status: "Entregue", data_hora_entregue: now })
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Error setting entrega Entregue:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const importEntregasFull: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const { records } = req.body as { records: any[] };
    if (!Array.isArray(records))
      return res.status(400).json({ error: "Records deve ser um array" });

    let imported = 0;

    for (const r of records) {
      try {
        const estNome = String(r.estabelecimento_nome || "").trim();
        if (!estNome) continue;
        const { data: est } = await supabase
          .from("estabelecimentos")
          .select("id")
          .eq("nome", estNome)
          .eq("id_usuario", userId)
          .single();
        if (!est) continue;

        const tipo: z.infer<typeof TipoEntregaEnum> = (r.tipo_entrega as any) || "Própria";
        const forma: z.infer<typeof FormaPagamentoEnum> = (r.forma_pagamento as any) || "PIX";

        let pedido_id: number | null = null;
        let codigo_pedido_app: string | null = null;
        if (tipo === "Própria") {
          const codigo = String(r.pedido_codigo || r.codigo_pedido || r.pedido || "").trim();
          if (codigo) {
            const { data: ped } = await supabase
              .from("pedidos")
              .select("id")
              .eq("codigo", codigo)
              .eq("id_usuario", userId)
              .maybeSingle();
            pedido_id = ped?.id ?? null;
          }
        } else {
          codigo_pedido_app = String(r.codigo_pedido_app || r.pedido || r.pedido_codigo || "").trim() || null;
        }

        let cliente_id: number | null = null;
        const cliNome = String(r.cliente_nome || "").trim();
        if (cliNome && cliNome.toLowerCase() !== "não cliente") {
          const { data: cli } = await supabase
            .from("clientes")
            .select("id")
            .eq("nome", cliNome)
            .eq("id_usuario", userId)
            .maybeSingle();
          cliente_id = cli?.id ?? null;
        }

        const valor_pedido = Number(r.valor_pedido) || 0;
        const taxa_extra = Number(r.taxa_extra) || 0;
        const valor_entrega = Number(r.valor_entrega) || valor_pedido + taxa_extra;

        const { data: entrega } = await supabase
          .from("entregas")
          .insert({
            id_usuario: userId,
            estabelecimento_id: est.id,
            tipo_entrega: tipo,
            pedido_id,
            codigo_pedido_app,
            valor_pedido,
            taxa_extra,
            valor_entrega,
            forma_pagamento: forma,
            cliente_id,
            ddi: r.ddi || "+55",
            telefone: r.telefone || "",
            data_hora_saida: r.data_hora_saida ? new Date(r.data_hora_saida).toISOString() : null,
            data_hora_entregue: r.data_hora_entregue ? new Date(r.data_hora_entregue).toISOString() : null,
            observacao: r.observacao || null,
            status: (r.status as any) || "Pendente",
          })
          .select()
          .single();

        const end = r.endereco || r.endereco_entrega || null;
        if (entrega && end) {
          await supabase.from("entregas_enderecos").insert({
            entrega_id: entrega.id,
            cep: end.cep || null,
            endereco: end.endereco || "",
            cidade: end.cidade || "",
            uf: end.uf || "",
            pais: end.pais || "Brasil",
          });
        }

        imported++;
      } catch (e) {
        continue;
      }
    }

    res.json({ success: true, imported });
  } catch (error) {
    console.error("Error importing entregas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
