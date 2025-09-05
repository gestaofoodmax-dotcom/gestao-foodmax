import type { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

const SuporteCreateSchema = z.object({
  tipo: z.enum([
    "Técnico",
    "Financeiro",
    "Dúvida",
    "Sugestão",
    "Reclamação",
    "Outro",
  ]),
  prioridade: z.enum(["Baixa", "Média", "Alta"]),
  nome_usuario: z.string().min(1),
  email_usuario: z.string().email(),
  titulo: z.string().min(1),
  descricao: z.string().min(1),
  status: z.enum(["Aberto", "Em Andamento", "Resolvido", "Fechado"]).optional(),
  resposta_admin: z.string().optional().nullable(),
});

const SuporteUpdateSchema = SuporteCreateSchema.partial();

async function getUserRoleAndEmail(userId: number) {
  const supabase = getSupabaseServiceClient();
  const { data: user, error } = await supabase
    .from("usuarios")
    .select("role, email")
    .eq("id", userId)
    .single();
  if (error || !user) throw new Error("Usuário não encontrado");
  const role = String(user.role || "user").toLowerCase() as "admin" | "user";
  return { role, email: user.email as string };
}

export const listSuportes: RequestHandler = async (req, res) => {
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

    const { role } = await getUserRoleAndEmail(userId);

    let query = supabase.from("suportes").select("*");

    if (role !== "admin") {
      query = query.eq("id_usuario", userId);
    }

    if (search) {
      query = query.or(
        `titulo.ilike.%${search}%,descricao.ilike.%${search}%,email_usuario.ilike.%${search}%,nome_usuario.ilike.%${search}%`,
      );
    }

    if (status && status !== "Todos") {
      query = query.eq("status", status);
    }

    const countQuery = supabase
      .from("suportes")
      .select("*", { count: "exact", head: true });
    const { count } = await (role !== "admin"
      ? countQuery.eq("id_usuario", userId)
      : countQuery);

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
  } catch (error) {
    console.error("Error listing suportes:", error);
    // Fallback: return empty list to keep UI usable when DB/env not ready
    res.json({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }
};

export const getSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);

    let query = supabase.from("suportes").select("*").eq("id", id);
    if (role !== "admin") {
      query = query.eq("id_usuario", userId);
    }

    const { data, error } = await query.single();
    if (error || !data)
      return res.status(404).json({ error: "Registro não encontrado" });

    res.json(data);
  } catch (error) {
    console.error("Error getting suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const input = SuporteCreateSchema.parse(req.body);

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);

    const insertData: any = {
      id_usuario: userId,
      nome_usuario: input.nome_usuario,
      email_usuario: input.email_usuario,
      tipo: input.tipo,
      prioridade: input.prioridade,
      titulo: input.titulo,
      descricao: input.descricao,
      status: input.status || "Aberto",
      resposta_admin: input.resposta_admin || null,
    };

    const { data, error } = await supabase
      .from("suportes")
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;

    if (role === "user") {
      const { data: admin } = await supabase
        .from("usuarios")
        .select("email")
        .eq("role", "admin")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();
      const adminEmail = (admin as any)?.email || null;

      await supabase.from("suportes_eventos").insert({
        suporte_id: data.id,
        tipo_evento: "criacao",
        detalhes: `Novo ticket criado e enviado para ${adminEmail || "admin"}`,
      });
    }

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Error creating suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const input = SuporteUpdateSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);

    const { data: existing, error: exErr } = await supabase
      .from("suportes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (exErr || !existing)
      return res.status(404).json({ error: "Registro não encontrado" });

    if (role !== "admin" && existing.id_usuario !== userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const updateData: any = { ...input };

    const { data, error } = await supabase
      .from("suportes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    if (
      role === "admin" &&
      typeof input.resposta_admin !== "undefined" &&
      (input.resposta_admin || "").trim() &&
      input.resposta_admin !== existing.resposta_admin
    ) {
      await supabase.from("suportes_eventos").insert({
        suporte_id: id,
        tipo_evento: "resposta_admin",
        detalhes:
          "Resposta enviada ao usuário criador do ticket (via formulário)",
      });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Error updating suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);

    const { data: existing, error: exErr } = await supabase
      .from("suportes")
      .select("id, id_usuario")
      .eq("id", id)
      .maybeSingle();
    if (exErr || !existing)
      return res.status(404).json({ error: "Registro não encontrado" });

    if (role !== "admin" && existing.id_usuario !== userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { error } = await supabase.from("suportes").delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const responderSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const { resposta, status } = z
      .object({
        resposta: z.string().min(1),
        status: z
          .enum(["Aberto", "Em Andamento", "Resolvido", "Fechado"])
          .optional(),
      })
      .parse(req.body);

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);
    if (role !== "admin")
      return res.status(403).json({ error: "Apenas admin pode responder" });

    const { data: existing, error: exErr } = await supabase
      .from("suportes")
      .select("*")
      .eq("id", id)
      .single();
    if (exErr || !existing)
      return res.status(404).json({ error: "Registro não encontrado" });

    const update: any = {
      resposta_admin: resposta,
      data_resposta_admin: new Date().toISOString(),
    };
    if (status) update.status = status;

    const { data, error } = await supabase
      .from("suportes")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("suportes_eventos").insert({
      suporte_id: id,
      tipo_evento: "resposta_admin",
      detalhes: "Resposta enviada ao usuário criador do ticket",
    });

    res.json({ success: true, data });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Error responding suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
