import { RequestHandler } from "express";
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
  codigo: z.string().length(10),
  titulo: z.string().min(1),
  descricao: z.string().min(1),
  status: z.enum(["Aberto", "Em Andamento", "Resolvido", "Fechado"]).optional(),
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

const nameFromEmail = (email?: string | null) => {
  if (!email) return "Usuário";
  const [n] = String(email).split("@");
  return n || "Usuário";
};

const toTitleCase = (input: string): string => {
  const s = String(input || "").trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

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
      const s = search.replace(/,/g, " ");
      query = query.or(
        [
          `codigo.ilike.%${s}%`,
          `titulo.ilike.%${s}%`,
          `descricao.ilike.%${s}%`,
          `email_usuario.ilike.%${s}%`,
          `nome_usuario.ilike.%${s}%`,
          `tipo.ilike.%${s}%`,
          `prioridade.ilike.%${s}%`,
          `status.ilike.%${s}%`,
        ].join(","),
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

    const insertData: any = {
      id_usuario: userId,
      nome_usuario: input.nome_usuario,
      email_usuario: input.email_usuario,
      tipo: input.tipo,
      prioridade: input.prioridade,
      codigo: input.codigo,
      titulo: input.titulo,
      descricao: input.descricao,
      status: input.status || "Aberto",
    };

    const { data, error } = await supabase
      .from("suportes")
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;

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

    if (role !== "admin" && (existing as any).id_usuario !== userId) {
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

// Legacy admin-only responder (kept for backward compatibility)
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

    // Registrar resposta como histórico
    await supabase.from("suportes_respostas").insert({
      suporte_id: id,
      id_usuario: userId,
      resposta,
    });
    const update: any = {};
    if (status) {
      update.status = status;
      if (status === "Resolvido")
        update.data_hora_resolvido = new Date().toISOString();
      if (status === "Fechado")
        update.data_hora_fechado = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("suportes")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

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

// New: respostas history
export const listRespostasSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);

    const { data: suporte, error: errSup } = await supabase
      .from("suportes")
      .select("id, id_usuario")
      .eq("id", id)
      .maybeSingle();
    if (errSup || !suporte)
      return res.status(404).json({ error: "Registro não encontrado" });

    if (role !== "admin" && (suporte as any).id_usuario !== userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { data: respostas, error } = await supabase
      .from("suportes_respostas")
      .select("*")
      .eq("suporte_id", id)
      .order("data_cadastro", { ascending: true });
    if (error) throw error;

    const userIds = Array.from(
      new Set((respostas || []).map((r: any) => r.id_usuario)),
    );
    let users: any[] = [];
    let contacts: any[] = [];
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("usuarios")
        .select("id, email, role")
        .in("id", userIds);
      users = usersData || [];

      const { data: contactsData } = await supabase
        .from("usuarios_contatos")
        .select("usuario_id, nome")
        .in("usuario_id", userIds);
      contacts = contactsData || [];
    }
    const contactMap = Object.fromEntries(
      contacts.map((c: any) => [c.usuario_id, c.nome]),
    );

    const data = (respostas || []).map((r: any) => {
      const u = users.find((x) => x.id === r.id_usuario);
      const role = String((u as any)?.role || "user").toLowerCase();
      const contactName = contactMap[r.id_usuario];
      const nome =
        contactName && String(contactName).trim()
          ? toTitleCase(String(contactName))
          : toTitleCase(nameFromEmail(u?.email || null));
      return {
        ...r,
        nome_usuario: nome,
        role,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error listing respostas suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const addRespostaSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const body = z
      .object({
        resposta: z.string().min(1),
        status: z
          .enum(["Aberto", "Em Andamento", "Resolvido", "Fechado"])
          .optional(),
      })
      .parse(req.body);

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);

    const { data: suporte, error: errSup } = await supabase
      .from("suportes")
      .select("*")
      .eq("id", id)
      .single();
    if (errSup || !suporte)
      return res.status(404).json({ error: "Registro não encontrado" });

    if (role !== "admin" && (suporte as any).id_usuario !== userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const { error: insErr } = await supabase.from("suportes_respostas").insert({
      suporte_id: id,
      id_usuario: userId,
      resposta: body.resposta,
    });
    if (insErr) throw insErr;

    // Optionally update status when admin provided
    if (role === "admin" && body.status) {
      const update: any = { status: body.status };
      if (body.status === "Resolvido")
        update.data_hora_resolvido = new Date().toISOString();
      if (body.status === "Fechado")
        update.data_hora_fechado = new Date().toISOString();
      await supabase.from("suportes").update(update).eq("id", id);
    }

    const { data: updated } = await supabase
      .from("suportes")
      .select("*")
      .eq("id", id)
      .single();

    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Error adding resposta suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const resolverSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);
    if (role !== "admin")
      return res.status(403).json({ error: "Apenas admin" });

    const { data: existing } = await supabase
      .from("suportes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing)
      return res.status(404).json({ error: "Registro não encontrado" });

    const { data, error } = await supabase
      .from("suportes")
      .update({
        status: "Resolvido",
        data_hora_resolvido: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error resolving suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const fecharSuporte: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const supabase = getSupabaseServiceClient();
    const { role } = await getUserRoleAndEmail(userId);
    if (role !== "admin")
      return res.status(403).json({ error: "Apenas admin" });

    const { data: existing } = await supabase
      .from("suportes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing)
      return res.status(404).json({ error: "Registro não encontrado" });

    const { data, error } = await supabase
      .from("suportes")
      .update({
        status: "Fechado",
        data_hora_fechado: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error closing suporte:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
