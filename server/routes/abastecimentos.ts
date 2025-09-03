import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const StatusAbastecimentoEnum = z.enum([
  "Pendente",
  "Enviado",
  "Recebido",
  "Cancelado",
]);

const AbastecimentoSchema = z.object({
  estabelecimento_id: z.number().int().positive(),
  fornecedores_ids: z.array(z.number().int().positive()).min(1),
  categoria_id: z.number().int().positive(),
  telefone: z.string().min(1),
  ddi: z.string().min(1),
  email: z
    .string()
    .email()
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  data_hora_recebido: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  observacao: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  status: StatusAbastecimentoEnum.optional().default("Pendente"),
  email_enviado: z.boolean().optional().default(false),
  itens: z
    .array(
      z.object({
        item_id: z.number().int().positive(),
        quantidade: z.number().int().positive(),
      }),
    )
    .min(1),
  endereco: z.object({
    cep: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : val)),
    endereco: z.string().min(1),
    cidade: z.string().min(1),
    uf: z.string().length(2),
    pais: z.string().min(1),
  }),
  codigo: z.string().length(8),
});

const UpdateAbastecimentoSchema = AbastecimentoSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

// Test endpoint for database connectivity
export const testDatabaseConnection: RequestHandler = async (req, res) => {
  try {
    console.log("=== Database Connection Test ===");
    const userId = getUserId(req);
    console.log("User ID from header:", userId);

    if (!userId) {
      return res.status(401).json({ error: "x-user-id header missing" });
    }

    const supabase = getSupabaseServiceClient();
    console.log("Supabase client created");

    // Test basic query
    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("User query error:", userError);
      return res.status(500).json({
        error: "Database query failed",
        details: userError.message,
      });
    }

    console.log("User found:", user);

    // Test related tables
    const { count: estabelecimentosCount, error: estError } = await supabase
      .from("estabelecimentos")
      .select("id", { count: "exact", head: true })
      .eq("id_usuario", userId);

    const { count: fornecedoresCount, error: fornError } = await supabase
      .from("fornecedores")
      .select("id", { count: "exact", head: true })
      .eq("id_usuario", userId);

    const { count: categoriasCount, error: catError } = await supabase
      .from("itens_categorias")
      .select("id", { count: "exact", head: true })
      .eq("id_usuario", userId);

    const { count: itensCount, error: itensError } = await supabase
      .from("itens")
      .select("id", { count: "exact", head: true })
      .eq("id_usuario", userId);

    console.log("Counts:", {
      estabelecimentos: estabelecimentosCount,
      fornecedores: fornecedoresCount,
      categorias: categoriasCount,
      itens: itensCount,
    });

    res.json({
      success: true,
      user,
      counts: {
        estabelecimentos: estabelecimentosCount || 0,
        fornecedores: fornecedoresCount || 0,
        categorias: categoriasCount || 0,
        itens: itensCount || 0,
      },
      errors: {
        estabelecimentos: estError?.message,
        fornecedores: fornError?.message,
        categorias: catError?.message,
        itens: itensError?.message,
      },
    });
  } catch (error: any) {
    console.error("Database test error:", error);
    res.status(500).json({
      error: "Database test failed",
      details: error.message,
    });
  }
};

export const listAbastecimentos: RequestHandler = async (req, res) => {
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
      .from("abastecimentos")
      .select("*", { count: "exact" })
      .eq("id_usuario", userId);

    if (search) {
      query = query.or(`observacao.ilike.%${search}%`);
    }

    if (
      status &&
      ["Pendente", "Enviado", "Recebido", "Cancelado"].includes(status)
    ) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    // Load estabelecimento and categoria names, count items
    const result = [] as any[];
    for (const a of data || []) {
      let estabelecimento_nome: string | undefined;
      let categoria_nome: string | undefined;
      let qtde_itens = 0;

      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("nome")
        .eq("id", a.estabelecimento_id)
        .single();
      estabelecimento_nome = est?.nome;

      const { data: cat } = await supabase
        .from("itens_categorias")
        .select("nome")
        .eq("id", a.categoria_id)
        .single();
      categoria_nome = cat?.nome;

      const { count: itemsCount } = await supabase
        .from("abastecimentos_itens")
        .select("*", { count: "exact", head: true })
        .eq("abastecimento_id", a.id);
      qtde_itens = itemsCount || 0;

      result.push({
        ...a,
        estabelecimento_nome,
        categoria_nome,
        qtde_itens,
      });
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
    console.error("Error listing abastecimentos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getAbastecimento: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { data: abastecimento, error } = await supabase
      .from("abastecimentos")
      .select("*")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (error || !abastecimento)
      return res.status(404).json({ error: "Abastecimento não encontrado" });

    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("nome")
      .eq("id", abastecimento.estabelecimento_id)
      .single();

    const { data: cat } = await supabase
      .from("itens_categorias")
      .select("nome")
      .eq("id", abastecimento.categoria_id)
      .single();

    // Load fornecedores names
    let fornecedores_nomes: string[] = [];
    if (
      Array.isArray(abastecimento.fornecedores_ids) &&
      abastecimento.fornecedores_ids.length > 0
    ) {
      const { data: fornecedores } = await supabase
        .from("fornecedores")
        .select("id, nome")
        .in("id", abastecimento.fornecedores_ids);
      fornecedores_nomes = (fornecedores || []).map((f: any) => f.nome);
    }

    // Load itens relacionados
    const { data: itensRows } = await supabase
      .from("abastecimentos_itens")
      .select("*")
      .eq("abastecimento_id", id);

    let itensDetalhados: any[] = [];
    if (Array.isArray(itensRows) && itensRows.length > 0) {
      const itemIds = Array.from(
        new Set(itensRows.map((i: any) => i.item_id).filter(Boolean)),
      );

      const { data: itens } = await supabase
        .from("itens")
        .select("id, nome, estoque_atual")
        .in("id", itemIds);

      const itensMap = new Map<number, any>();
      (itens || []).forEach((i: any) => itensMap.set(i.id, i));

      itensDetalhados = (itensRows || []).map((i: any) => ({
        ...i,
        item_nome: itensMap.get(i.item_id)?.nome,
        estoque_atual: itensMap.get(i.item_id)?.estoque_atual,
      }));
    }

    // Load endereco
    const { data: endereco } = await supabase
      .from("abastecimentos_enderecos")
      .select("*")
      .eq("abastecimento_id", id)
      .single();

    res.json({
      ...abastecimento,
      estabelecimento_nome: est?.nome,
      categoria_nome: cat?.nome,
      fornecedores_nomes,
      itens: itensDetalhados,
      endereco: endereco || null,
    });
  } catch (error) {
    console.error("Error getting abastecimento:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createAbastecimento: RequestHandler = async (req, res) => {
  try {
    console.log("=== CreateAbastecimento START ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));

    const userId = getUserId(req);
    console.log("User ID:", userId);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const supabase = getSupabaseServiceClient();
    console.log("Supabase client obtained");

    // Test database connectivity
    console.log("Testing database connectivity...");
    const { data: testQuery, error: testError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", userId)
      .single();

    if (testError) {
      console.error("Database connectivity test failed:", testError);
      return res.status(500).json({
        error: "Erro de conexão com o banco de dados",
        details: testError.message,
      });
    }

    if (!testQuery) {
      console.error("User not found in database:", userId);
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    console.log("Database connectivity test passed");

    console.log("Parsing request body with schema...");
    const parsed = AbastecimentoSchema.parse(req.body);
    console.log("Parsed data:", JSON.stringify(parsed, null, 2));

    // Calculate quantidade_total
    const quantidade_total = parsed.itens.reduce(
      (sum, item) => sum + item.quantidade,
      0,
    );
    console.log("Calculated quantidade_total:", quantidade_total);

    const abastecimentoData = {
      id_usuario: userId,
      estabelecimento_id: parsed.estabelecimento_id,
      fornecedores_ids: parsed.fornecedores_ids,
      categoria_id: parsed.categoria_id,
      quantidade_total,
      telefone: parsed.telefone,
      ddi: parsed.ddi,
      email: parsed.email || null,
      codigo: parsed.codigo,
      data_hora_recebido: parsed.data_hora_recebido || null,
      observacao: parsed.observacao || null,
      status: parsed.status || "Pendente",
      email_enviado: parsed.email_enviado || false,
    };
    console.log(
      "Abastecimento data to insert:",
      JSON.stringify(abastecimentoData, null, 2),
    );

    let insertResult;
    try {
      insertResult = await supabase
        .from("abastecimentos")
        .insert(abastecimentoData)
        .select()
        .single();
    } catch (e) {
      insertResult = { data: null, error: e } as any;
    }

    let abastecimento = insertResult.data;
    let error = insertResult.error;

    if (
      error &&
      String(error.message || error)
        .toLowerCase()
        .includes("codigo")
    ) {
      console.warn("Retrying insert without 'codigo' column (fallback mode)");
      const { codigo, ...fallbackData } = abastecimentoData as any;
      const retry = await supabase
        .from("abastecimentos")
        .insert(fallbackData)
        .select()
        .single();
      abastecimento = retry.data;
      error = retry.error as any;
    }

    if (error) {
      console.error("Supabase error inserting abastecimento:", error);
      throw error;
    }
    console.log("Abastecimento inserted successfully:", abastecimento);

    // Insert itens
    if (parsed.itens.length > 0) {
      const itensData = parsed.itens.map((item) => ({
        abastecimento_id: abastecimento.id,
        item_id: item.item_id,
        quantidade: item.quantidade,
      }));
      console.log("Inserting itens:", JSON.stringify(itensData, null, 2));

      const { error: itensError } = await supabase
        .from("abastecimentos_itens")
        .insert(itensData);
      if (itensError) {
        console.error("Error inserting itens:", itensError);
        throw itensError;
      }
      console.log("Itens inserted successfully");
    }

    // Insert endereco
    const enderecoData = {
      abastecimento_id: abastecimento.id,
      cep: parsed.endereco.cep || null,
      endereco: parsed.endereco.endereco,
      cidade: parsed.endereco.cidade,
      uf: parsed.endereco.uf,
      pais: parsed.endereco.pais,
    };
    console.log("Inserting endereco:", JSON.stringify(enderecoData, null, 2));

    const { error: enderecoError } = await supabase
      .from("abastecimentos_enderecos")
      .insert(enderecoData);
    if (enderecoError) {
      console.error("Error inserting endereco:", enderecoError);
      throw enderecoError;
    }
    console.log("Endereco inserted successfully");

    console.log("=== CreateAbastecimento SUCCESS ===");
    res.status(201).json(abastecimento);
  } catch (error: any) {
    console.error("=== CreateAbastecimento ERROR ===");
    console.error("Error creating abastecimento:", error);
    if (error.name === "ZodError") {
      console.error("Zod validation errors:", error.errors);
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Full error object:", JSON.stringify(error, null, 2));
    res
      .status(500)
      .json({ error: "Erro interno do servidor", details: error.message });
  }
};

export const updateAbastecimento: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const parsed = UpdateAbastecimentoSchema.parse(req.body);

    // ensure exists and belongs to user
    const { data: existing } = await supabase
      .from("abastecimentos")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (!existing)
      return res.status(404).json({ error: "Abastecimento não encontrado" });

    const { itens: _i, endereco: _e, ...abastecimentoUpdate } = parsed as any;

    // Calculate quantidade_total if itens are provided
    if (parsed.itens) {
      abastecimentoUpdate.quantidade_total = parsed.itens.reduce(
        (sum, item) => sum + item.quantidade,
        0,
      );
    }

    let updateRes = await supabase
      .from("abastecimentos")
      .update(abastecimentoUpdate)
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (
      updateRes.error &&
      String(updateRes.error.message || "")
        .toLowerCase()
        .includes("codigo")
    ) {
      console.warn("Retrying update without 'codigo' column (fallback mode)");
      const { codigo, ...fallbackUpdate } = abastecimentoUpdate as any;
      updateRes = await supabase
        .from("abastecimentos")
        .update(fallbackUpdate)
        .eq("id", id)
        .eq("id_usuario", userId)
        .select()
        .single();
    }

    if (updateRes.error) throw updateRes.error;

    const abastecimento = updateRes.data;

    if (parsed.itens) {
      await supabase
        .from("abastecimentos_itens")
        .delete()
        .eq("abastecimento_id", id);
      if (parsed.itens.length > 0) {
        await supabase.from("abastecimentos_itens").insert(
          parsed.itens.map((item) => ({
            abastecimento_id: parseInt(id),
            item_id: item.item_id,
            quantidade: item.quantidade,
          })),
        );
      }
    }

    if (parsed.endereco) {
      await supabase
        .from("abastecimentos_enderecos")
        .delete()
        .eq("abastecimento_id", id);
      await supabase.from("abastecimentos_enderecos").insert({
        abastecimento_id: parseInt(id),
        cep: parsed.endereco.cep || null,
        endereco: parsed.endereco.endereco,
        cidade: parsed.endereco.cidade,
        uf: parsed.endereco.uf,
        pais: parsed.endereco.pais,
      });
    }

    res.json(abastecimento);
  } catch (error: any) {
    console.error("Error updating abastecimento:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteAbastecimento: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { data: existing } = await supabase
      .from("abastecimentos")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (!existing)
      return res.status(404).json({ error: "Abastecimento não encontrado" });

    const { error } = await supabase
      .from("abastecimentos")
      .delete()
      .eq("id", id)
      .eq("id_usuario", userId);
    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting abastecimento:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteAbastecimentos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const { ids }: { ids: number[] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "IDs inválidos" });

    const { error } = await supabase
      .from("abastecimentos")
      .delete()
      .in("id", ids)
      .eq("id_usuario", userId);
    if (error) throw error;

    res.json({ deletedCount: ids.length });
  } catch (error) {
    console.error("Error bulk deleting abastecimentos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const marcarRecebido: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("abastecimentos")
      .update({ status: "Recebido", data_hora_recebido: now })
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error marking abastecimento as received:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const enviarEmail: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    // Check user permissions
    const { data: user } = await supabase
      .from("usuarios")
      .select("role, data_pagamento")
      .eq("id", userId)
      .single();

    if (!user || (user.role === "user" && !user.data_pagamento)) {
      return res
        .status(403)
        .json({ error: "Essa ação só funciona no plano pago" });
    }

    const { destinatarios, assunto, mensagem } = req.body;

    // Here you would implement the actual email sending logic
    // For now, we'll just mark email as sent
    const { data, error } = await supabase
      .from("abastecimentos")
      .update({ email_enviado: true })
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, message: "Email enviado com sucesso" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const importAbastecimentos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const supabase = getSupabaseServiceClient();
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "Records deve ser um array" });
    }

    let imported = 0;

    for (const record of records) {
      try {
        const estNome = String(record.estabelecimento_nome || "").trim();
        if (!estNome) continue;

        // Resolve estabelecimento
        const { data: est } = await supabase
          .from("estabelecimentos")
          .select("id")
          .eq("nome", estNome)
          .eq("id_usuario", userId)
          .single();
        if (!est) continue;

        // Create basic abastecimento
        const { data: abastecimento, error: abastErr } = await supabase
          .from("abastecimentos")
          .insert({
            id_usuario: userId,
            estabelecimento_id: est.id,
            fornecedores_ids: [],
            categoria_id: 1, // Default category
            quantidade_total: 0,
            telefone: record.telefone || "",
            ddi: record.ddi || "+55",
            email: record.email || null,
            data_hora_recebido: record.data_hora_recebido
              ? new Date(record.data_hora_recebido).toISOString()
              : null,
            observacao: record.observacao || null,
            status: record.status || "Pendente",
            email_enviado: false,
          })
          .select()
          .single();

        if (abastErr || !abastecimento) continue;

        imported++;
      } catch (e) {
        continue;
      }
    }

    res.json({ success: true, imported });
  } catch (error) {
    console.error("Error importing abastecimentos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
