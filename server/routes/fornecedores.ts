import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const FornecedorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email("Email inválido"),
  ddi: z.string().min(1, "DDI é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório").max(15),
  nome_responsavel: z.string().optional(),
  ativo: z.boolean().default(true),
  // Endereço
  cep: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  pais: z.string().default("Brasil"),
});

const UpdateFornecedorSchema = FornecedorSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

const checkUserPermissions = async (userId: number, fornecedorId?: number) => {
  const supabase = getSupabaseServiceClient();

  const { data: user, error: userError } = await supabase
    .from("usuarios")
    .select("role, data_pagamento")
    .eq("id", userId)
    .single();
  if (userError || !user) throw new Error("Usuário não encontrado");

  if (fornecedorId) {
    const { data: fornecedor, error: fornError } = await supabase
      .from("fornecedores")
      .select("id_usuario")
      .eq("id", fornecedorId)
      .single();
    if (fornError || !fornecedor) throw new Error("Fornecedor não encontrado");
    if ((fornecedor as any).id_usuario !== userId) throw new Error("Acesso negado");
  }

  return { role: (user.role as "admin" | "user") || "user", hasPayment: !!user.data_pagamento };
};

export const listFornecedores: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const supabase = getSupabaseServiceClient();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("fornecedores")
      .select(`*, fornecedores_enderecos (*)`)
      .eq("id_usuario", userId);

    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,cnpj.ilike.%${search}%`);
    }

    const { count } = await supabase
      .from("fornecedores")
      .select("*", { count: "exact", head: true })
      .eq("id_usuario", userId);

    const { data, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const formatted = (data || []).map((f: any) => ({
      ...f,
      endereco: f.fornecedores_enderecos?.[0] || null,
    }));

    res.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("List fornecedores error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getFornecedor: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("fornecedores")
      .select(`*, fornecedores_enderecos (*)`)
      .eq("id", id)
      .single();
    if (error) throw error;

    const formatted = { ...data, endereco: (data as any).fornecedores_enderecos?.[0] || null };
    res.json(formatted);
  } catch (error: any) {
    console.error("Get fornecedor error:", error);
    if (error.message === "Acesso negado") return res.status(403).json({ error: error.message });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createFornecedor: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    await checkUserPermissions(userId);

    const validated = FornecedorSchema.parse(req.body);
    const { cep, endereco, cidade, uf, pais, ...fornecedorData } = validated;

    const supabase = getSupabaseServiceClient();

    // Duplicate by nome for same user (allow same CNPJ across different names)
    const { data: existing } = await supabase
      .from("fornecedores")
      .select("id")
      .eq("id_usuario", userId)
      .eq("nome", fornecedorData.nome)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: "Já existe um fornecedor com este nome" });
    }

    const { data: novo, error: insError } = await supabase
      .from("fornecedores")
      .insert({ ...fornecedorData, id_usuario: userId })
      .select()
      .single();
    if (insError) throw insError;

    if (cep || endereco || cidade) {
      const { error: endError } = await supabase
        .from("fornecedores_enderecos")
        .insert({ fornecedor_id: (novo as any).id, cep, endereco, cidade, uf, pais });
      if (endError) console.error("Error creating fornecedor endereco:", endError);
    }

    res.status(201).json({ message: "Fornecedor criado com sucesso", data: novo });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Create fornecedor error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateFornecedor: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const validated = UpdateFornecedorSchema.parse(req.body);
    const { cep, endereco, cidade, uf, pais, ...fornecedorData } = validated;

    const supabase = getSupabaseServiceClient();

    const { data: updated, error: upError } = await supabase
      .from("fornecedores")
      .update(fornecedorData)
      .eq("id", id)
      .select()
      .single();
    if (upError) throw upError;

    if (cep !== undefined || endereco !== undefined || cidade !== undefined) {
      const { data: existingEnd } = await supabase
        .from("fornecedores_enderecos")
        .select("id")
        .eq("fornecedor_id", id)
        .maybeSingle();

      const endData = { fornecedor_id: id, cep, endereco, cidade, uf, pais: pais || "Brasil" };
      if (existingEnd) {
        await supabase.from("fornecedores_enderecos").update(endData).eq("id", (existingEnd as any).id);
      } else {
        await supabase.from("fornecedores_enderecos").insert(endData);
      }
    }

    res.json({ message: "Fornecedor atualizado com sucesso", data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    if (error.message === "Acesso negado") return res.status(403).json({ error: error.message });
    console.error("Update fornecedor error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteFornecedor: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const supabase = getSupabaseServiceClient();

    await supabase.from("fornecedores_enderecos").delete().eq("fornecedor_id", id);

    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) {
      if ((error as any).code === "23503") {
        return res.status(409).json({ error: "Não é possível excluir o Fornecedor pois existem dependências." });
      }
      throw error;
    }

    res.json({ message: "Fornecedor excluído com sucesso" });
  } catch (error: any) {
    if (error.message === "Acesso negado") return res.status(403).json({ error: error.message });
    console.error("Delete fornecedor error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteFornecedores: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
    if (!ids.length) return res.status(400).json({ error: "Nenhum ID fornecido" });

    const supabase = getSupabaseServiceClient();

    const { data: fornecedores, error: checkError } = await supabase
      .from("fornecedores")
      .select("id, id_usuario")
      .in("id", ids);
    if (checkError) throw checkError;

    const unauthorized = (fornecedores || []).filter((f) => f.id_usuario !== userId);
    if (unauthorized.length > 0) {
      return res.status(403).json({ error: "Acesso negado para alguns registros" });
    }

    await supabase.from("fornecedores_enderecos").delete().in("fornecedor_id", ids);

    const { error: delError } = await supabase.from("fornecedores").delete().in("id", ids);
    if (delError) {
      if ((delError as any).code === "23503") {
        return res.status(409).json({ error: "Não é possível excluir alguns Fornecedores pois existem dependências." });
      }
      throw delError;
    }

    res.json({ message: `${ids.length} fornecedor(es) excluído(s) com sucesso`, deletedCount: ids.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Bulk delete fornecedores error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const toggleFornecedorStatus: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const supabase = getSupabaseServiceClient();
    const { data: fornecedor, error: getError } = await supabase
      .from("fornecedores")
      .select("ativo")
      .eq("id", id)
      .single();
    if (getError) throw getError;

    const { data: updated, error: updateError } = await supabase
      .from("fornecedores")
      .update({ ativo: !(fornecedor as any).ativo })
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw updateError;

    res.json({ message: `Fornecedor ${(updated as any).ativo ? "ativado" : "desativado"} com sucesso`, data: updated });
  } catch (error: any) {
    if (error.message === "Acesso negado") return res.status(403).json({ error: error.message });
    console.error("Toggle fornecedor status error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
