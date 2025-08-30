import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const ItemSchema = z.object({
  categoria_id: z.number(),
  nome: z.string().min(1),
  preco_centavos: z.number().int().nonnegative(),
  custo_pago_centavos: z.number().int().nonnegative(),
  unidade_medida: z.string().min(1),
  peso_gramas: z.number().int().nonnegative().optional(),
  estoque_atual: z.number().int().nonnegative().optional(),
  ativo: z.boolean().default(true),
});
const UpdateItemSchema = ItemSchema.partial();

const CategoriaSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});
const UpdateCategoriaSchema = CategoriaSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"]; // set by auth middleware/client hook
  return userId ? parseInt(userId as string) : null;
};

export const listItens: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("itens")
      .select("*, itens_categorias:categoria_id (id, nome)")
      .eq("id_usuario", userId);
    if (search) {
      query = query.or(`nome.ilike.%${search}%`);
    }

    const { count } = await supabase
      .from("itens")
      .select("*", { count: "exact", head: true })
      .eq("id_usuario", userId);

    const { data, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    res.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (e) {
    console.error("List itens error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getItem: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("itens")
      .select("*, itens_categorias:categoria_id (id, nome)")
      .eq("id", id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Get item error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createItem: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const input = ItemSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("itens")
      .insert({ ...input, id_usuario: userId })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: "Item criado com sucesso", data });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Create item error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateItem: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const input = UpdateItemSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("itens")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: "Item atualizado com sucesso", data });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Update item error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteItem: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "Item excluído com sucesso" });
  } catch (e) {
    console.error("Delete item error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteItens: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("itens").delete().in("id", ids);
    if (error) throw error;
    res.json({ message: `${ids.length} item(ns) excluído(s) com sucesso`, deletedCount: ids.length });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Bulk delete itens error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const toggleItemStatus: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    const { data: current, error: ge } = await supabase
      .from("itens")
      .select("ativo")
      .eq("id", id)
      .single();
    if (ge) throw ge;
    const { data, error } = await supabase
      .from("itens")
      .update({ ativo: !(current as any).ativo })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: `Item ${(data as any).ativo ? "ativado" : "desativado"} com sucesso`, data });
  } catch (e) {
    console.error("Toggle item status error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Categorias
export const listCategorias: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "100");
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("itens_categorias")
      .select("*")
      .eq("id_usuario", userId);
    if (search) query = query.or(`nome.ilike.%${search}%`);

    const { count } = await supabase
      .from("itens_categorias")
      .select("*", { count: "exact", head: true })
      .eq("id_usuario", userId);

    if ((count || 0) === 0) {
      await supabase.rpc("seed_itens_categorias_defaults", { p_user_id: userId });
      query = supabase
        .from("itens_categorias")
        .select("*")
        .eq("id_usuario", userId);
    }

    const { data, error } = await query
      .order("nome", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    res.json({
      data: data || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (e) {
    console.error("List categorias error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createCategoria: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const input = CategoriaSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("itens_categorias")
      .insert({ ...input, id_usuario: userId })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: "Categoria criada com sucesso", data });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Create categoria error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateCategoria: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const input = UpdateCategoriaSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("itens_categorias")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: "Categoria atualizada com sucesso", data });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Update categoria error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteCategoria: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    // Check dependencies: itens referencing this categoria
    const { count } = await supabase
      .from("itens")
      .select("id", { count: "exact", head: true })
      .eq("categoria_id", id);
    if ((count || 0) > 0) {
      return res.status(409).json({ error: "Não é possível excluir Categoria com Itens vinculados" });
    }
    const { error } = await supabase.from("itens_categorias").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "Categoria excluída com sucesso" });
  } catch (e) {
    console.error("Delete categoria error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteCategorias: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
    const supabase = getSupabaseServiceClient();

    // Check dependencies
    const { data: deps } = await supabase
      .from("itens")
      .select("categoria_id")
      .in("categoria_id", ids);
    const blocked = new Set((deps || []).map((d: any) => d.categoria_id));
    const deletable = ids.filter((id) => !blocked.has(id));

    if (deletable.length > 0) {
      await supabase.from("itens_categorias").delete().in("id", deletable);
    }

    res.json({
      message: `${deletable.length} categoria(s) excluída(s) com sucesso`,
      deletedCount: deletable.length,
      blockedIds: Array.from(blocked),
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Bulk delete categorias error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const toggleCategoriaStatus: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    const { data: current, error: ge } = await supabase
      .from("itens_categorias")
      .select("ativo")
      .eq("id", id)
      .single();
    if (ge) throw ge;
    const { data, error } = await supabase
      .from("itens_categorias")
      .update({ ativo: !(current as any).ativo })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: `Categoria ${(data as any).ativo ? "ativada" : "desativada"} com sucesso`, data });
  } catch (e) {
    console.error("Toggle categoria status error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
