import type { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

const CreateComSchema = z.object({
  estabelecimento_id: z.number().int().positive(),
  tipo_comunicacao: z.enum(["Promoção", "Fornecedor", "Outro"]),
  assunto: z.string().min(1),
  mensagem: z.string().min(1),
  destinatarios_tipo: z.enum([
    "TodosClientes",
    "ClientesEspecificos",
    "TodosFornecedores",
    "FornecedoresEspecificos",
    "Outros",
  ]),
  clientes_ids: z.array(z.number().int().positive()).optional(),
  fornecedores_ids: z.array(z.number().int().positive()).optional(),
  destinatarios_text: z.string().optional(),
  status: z.enum(["Pendente", "Enviado", "Cancelado"]).optional(),
  data_hora_enviado: z.string().optional(),
});
const UpdateComSchema = CreateComSchema.partial();

export const listComunicacoes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const estabelecimentoId = (req.query.estabelecimento_id as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("comunicacoes")
      .select("*")
      .eq("id_usuario", userId);

    if (search) {
      query = query.or(`assunto.ilike.%${search}%,mensagem.ilike.%${search}%`);
    }

    if (status && status !== "Todos") {
      query = query.eq("status", status);
    }

    if (estabelecimentoId && estabelecimentoId !== "todos") {
      query = query.eq("estabelecimento_id", parseInt(estabelecimentoId));
    }

    const { count } = await supabase
      .from("comunicacoes")
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
  } catch (error) {
    console.error("Error listing comunicacoes:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getComunicacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const { id } = req.params;
    const { data, error } = await supabase
      .from("comunicacoes")
      .select("*")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Registro não encontrado" });

    res.json(data);
  } catch (error) {
    console.error("Error getting comunicacao:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createComunicacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const parsed = CreateComSchema.parse(req.body);

    const insertData: any = {
      id_usuario: userId,
      estabelecimento_id: parsed.estabelecimento_id,
      tipo_comunicacao: parsed.tipo_comunicacao,
      assunto: parsed.assunto,
      mensagem: parsed.mensagem,
      destinatarios_tipo: parsed.destinatarios_tipo,
      clientes_ids: parsed.clientes_ids || [],
      fornecedores_ids: parsed.fornecedores_ids || [],
      destinatarios_text: parsed.destinatarios_text || null,
      status: parsed.status || "Pendente",
      data_hora_enviado: parsed.data_hora_enviado
        ? new Date(parsed.data_hora_enviado).toISOString()
        : null,
    };

    const { data, error } = await supabase
      .from("comunicacoes")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    console.error("Error creating comunicacao:", error);
    if (error.name === "ZodError")
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateComunicacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const parsed = UpdateComSchema.parse(req.body);

    // Check ownership
    const { data: existing, error: exErr } = await supabase
      .from("comunicacoes")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (exErr || !existing)
      return res.status(404).json({ error: "Registro não encontrado" });

    const updateData: any = { ...parsed };

    const { data, error } = await supabase
      .from("comunicacoes")
      .update(updateData)
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error updating comunicacao:", error);
    if (error.name === "ZodError")
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteComunicacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { error } = await supabase
      .from("comunicacoes")
      .delete()
      .eq("id", id)
      .eq("id_usuario", userId);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting comunicacao:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteComunicacoes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const { ids } = req.body as { ids: number[] };
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "IDs inválidos" });

    const { error } = await supabase
      .from("comunicacoes")
      .delete()
      .in("id", ids)
      .eq("id_usuario", userId);

    if (error) throw error;

    res.json({ deletedCount: ids.length });
  } catch (error) {
    console.error("Error bulk deleting comunicacoes:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

async function ensurePaidPlan(userId: number) {
  const supabase = getSupabaseServiceClient();
  const { data: user, error } = await supabase
    .from("usuarios")
    .select("role, data_pagamento")
    .eq("id", userId)
    .single();
  if (error) throw error;
  const role = String(user?.role || "user").toLowerCase();
  const hasPayment = !!user?.data_pagamento || role === "admin";
  return hasPayment;
}

function extractEmailsFromText(text?: string | null): string[] {
  if (!text) return [];
  const parts = text
    .split(/[;,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return parts.filter((p) => re.test(p.toLowerCase()));
}

export const sendComunicacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const hasPayment = await ensurePaidPlan(userId);
    if (!hasPayment) {
      return res
        .status(403)
        .json({ error: "Essa ação só funciona no plano pago." });
    }

    const { id } = req.params;
    const { data: com, error: comErr } = await supabase
      .from("comunicacoes")
      .select("*")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();
    if (comErr || !com)
      return res.status(404).json({ error: "Registro não encontrado" });

    if (com.status !== "Pendente") {
      return res
        .status(400)
        .json({ error: "Apenas registros pendentes podem ser enviados" });
    }

    // Build recipients
    let emails: string[] = [];
    if (com.tipo_comunicacao === "Promoção") {
      if (com.destinatarios_tipo === "TodosClientes") {
        const { data: clientes } = await supabase
          .from("clientes")
          .select("email, ativo, aceita_promocao_email, estabelecimento_id")
          .eq("id_usuario", userId)
          .eq("estabelecimento_id", com.estabelecimento_id)
          .eq("ativo", true)
          .eq("aceita_promocao_email", true);
        emails = (clientes || [])
          .map((c: any) => (c?.email || "").trim())
          .filter((e: string) => !!e);
      }
      if (com.destinatarios_tipo === "ClientesEspecificos") {
        const ids = Array.isArray(com.clientes_ids) ? com.clientes_ids : [];
        if (ids.length > 0) {
          const { data: clientes } = await supabase
            .from("clientes")
            .select("id, email, ativo, aceita_promocao_email")
            .in("id", ids)
            .eq("id_usuario", userId)
            .eq("ativo", true)
            .eq("aceita_promocao_email", true);
          emails = (clientes || [])
            .map((c: any) => (c?.email || "").trim())
            .filter((e: string) => !!e);
        }
      }
    } else if (com.tipo_comunicacao === "Fornecedor") {
      if (com.destinatarios_tipo === "TodosFornecedores") {
        const { data: fornecs } = await supabase
          .from("fornecedores")
          .select("email, ativo")
          .eq("id_usuario", userId)
          .eq("ativo", true);
        emails = (fornecs || [])
          .map((f: any) => (f?.email || "").trim())
          .filter((e: string) => !!e);
      }
      if (com.destinatarios_tipo === "FornecedoresEspecificos") {
        const ids = Array.isArray(com.fornecedores_ids)
          ? com.fornecedores_ids
          : [];
        if (ids.length > 0) {
          const { data: fornecs } = await supabase
            .from("fornecedores")
            .select("email, ativo")
            .in("id", ids)
            .eq("id_usuario", userId)
            .eq("ativo", true);
          emails = (fornecs || [])
            .map((f: any) => (f?.email || "").trim())
            .filter((e: string) => !!e);
        }
      }
    } else {
      emails = extractEmailsFromText(com.destinatarios_text);
    }

    emails = Array.from(new Set(emails.filter(Boolean)));

    // Simulate sending email: here you would integrate with email provider
    // Mark as sent
    const { data, error } = await supabase
      .from("comunicacoes")
      .update({
        email_enviado: true,
        status: "Enviado",
        data_hora_enviado: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();
    if (error) throw error;

    res.json({
      success: true,
      sentCount: emails.length,
      recipients: emails,
      comunicacao: data,
    });
  } catch (error) {
    console.error("Error sending comunicacao:", error);
    res.status(500).json({ error: "Erro ao enviar email" });
  }
};

export const sendComunicacoesBulk: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const hasPayment = await ensurePaidPlan(userId);
    if (!hasPayment) {
      return res
        .status(403)
        .json({ error: "Essa ação só funciona no plano pago." });
    }

    const { ids } = req.body as { ids: number[] };
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "Seleção inválida" });
    if (ids.length > 50)
      return res
        .status(400)
        .json({ error: "Só é possível enviar até 50 registros por vez" });

    const { data: rows, error: listErr } = await supabase
      .from("comunicacoes")
      .select("*")
      .in("id", ids)
      .eq("id_usuario", userId)
      .eq("status", "Pendente");
    if (listErr) throw listErr;

    let processed = 0;
    let totalEmails = 0;

    for (const com of rows || []) {
      // For each communication, reuse send logic partially
      // Build recipients (respecting promotion acceptance for clients)
      let emails: string[] = [];
      if (com.tipo_comunicacao === "Promoção") {
        if (com.destinatarios_tipo === "TodosClientes") {
          const { data: clientes } = await supabase
            .from("clientes")
            .select("email, ativo, aceita_promocao_email, estabelecimento_id")
            .eq("id_usuario", userId)
            .eq("estabelecimento_id", com.estabelecimento_id)
            .eq("ativo", true)
            .eq("aceita_promocao_email", true);
          emails = (clientes || [])
            .map((c: any) => (c?.email || "").trim())
            .filter((e: string) => !!e);
        }
        if (com.destinatarios_tipo === "ClientesEspecificos") {
          const ids = Array.isArray(com.clientes_ids) ? com.clientes_ids : [];
          if (ids.length > 0) {
            const { data: clientes } = await supabase
              .from("clientes")
              .select("id, email, ativo, aceita_promocao_email")
              .in("id", ids)
              .eq("id_usuario", userId)
              .eq("ativo", true)
              .eq("aceita_promocao_email", true);
            emails = (clientes || [])
              .map((c: any) => (c?.email || "").trim())
              .filter((e: string) => !!e);
          }
        }
      } else if (com.tipo_comunicacao === "Fornecedor") {
        if (com.destinatarios_tipo === "TodosFornecedores") {
          const { data: fornecs } = await supabase
            .from("fornecedores")
            .select("email, ativo")
            .eq("id_usuario", userId)
            .eq("ativo", true);
          emails = (fornecs || [])
            .map((f: any) => (f?.email || "").trim())
            .filter((e: string) => !!e);
        }
        if (com.destinatarios_tipo === "FornecedoresEspecificos") {
          const ids = Array.isArray(com.fornecedores_ids)
            ? com.fornecedores_ids
            : [];
          if (ids.length > 0) {
            const { data: fornecs } = await supabase
              .from("fornecedores")
              .select("email, ativo")
              .in("id", ids)
              .eq("id_usuario", userId)
              .eq("ativo", true);
            emails = (fornecs || [])
              .map((f: any) => (f?.email || "").trim())
              .filter((e: string) => !!e);
          }
        }
      } else {
        emails = extractEmailsFromText(com.destinatarios_text);
      }

      emails = Array.from(new Set(emails.filter(Boolean)));
      totalEmails += emails.length;

      // Simulate send and mark record
      await supabase
        .from("comunicacoes")
        .update({
          email_enviado: true,
          status: "Enviado",
          data_hora_enviado: new Date().toISOString(),
        })
        .eq("id", com.id)
        .eq("id_usuario", userId);

      processed += 1;
    }

    res.json({
      success: true,
      processed,
      total: (rows || []).length,
      totalEmails,
    });
  } catch (error: any) {
    console.error("Error bulk sending comunicacoes:", error);
    res.status(500).json({ error: error?.message || "Erro ao enviar emails" });
  }
};
