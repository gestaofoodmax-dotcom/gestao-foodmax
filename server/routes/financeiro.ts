import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const FinanceiroSchema = z.object({
  estabelecimento_id: z.number(),
  tipo: z.enum(["Receita", "Despesa"]),
  categoria: z.string().min(1),
  valor: z.number().int().nonnegative(),
  data_transacao: z.string().datetime().optional().nullable(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});
const UpdateFinanceiroSchema = FinanceiroSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"]; // set by auth middleware/client hook
  return userId ? parseInt(userId as string) : null;
};

const parsePeriod = (period?: string) => {
  if (!period || period === "all") return null;
  const now = new Date();
  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === "12m") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 12);
    return d;
  }
  // ISO date support
  const d = new Date(period);
  return isNaN(d.getTime()) ? null : d;
};

export const listTransacoes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const supabase = getSupabaseServiceClient();
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const search = (req.query.search as string) || "";
    const tipo = (req.query.tipo as string) || undefined; // "Receita" | "Despesa"
    const estabelecimentoId = req.query.estabelecimento_id
      ? parseInt(req.query.estabelecimento_id as string)
      : undefined;
    const period = (req.query.period as string) || "all";
    const dateFrom = parsePeriod(period);

    const offset = (page - 1) * limit;

    let base = supabase
      .from("financeiro_transacoes")
      .select("*", { count: "exact" })
      .eq("id_usuario", userId);

    if (tipo && (tipo === "Receita" || tipo === "Despesa")) {
      base = base.eq("tipo", tipo);
    }
    if (estabelecimentoId) {
      base = base.eq("estabelecimento_id", estabelecimentoId);
    }
    if (dateFrom) {
      base = base.gte("data_transacao", dateFrom.toISOString());
    }
    if (search) {
      base = base.or(`categoria.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    const { data, error, count } = await base
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    // Totals
    const totals = { totalReceitas: 0, totalDespesas: 0, saldoLiquido: 0 };
    try {
      let tQuery = supabase
        .from("financeiro_transacoes")
        .select("valor, tipo")
        .eq("id_usuario", userId);
      if (estabelecimentoId)
        tQuery = tQuery.eq("estabelecimento_id", estabelecimentoId);
      if (dateFrom)
        tQuery = tQuery.gte("data_transacao", dateFrom.toISOString());
      if (search)
        tQuery = tQuery.or(
          `categoria.ilike.%${search}%,descricao.ilike.%${search}%`,
        );
      const { data: all } = await tQuery.limit(10000);
      const rec = (all || []).filter((r: any) => r.tipo === "Receita");
      const desp = (all || []).filter((r: any) => r.tipo === "Despesa");
      totals.totalReceitas = rec.reduce(
        (sum: number, r: any) => sum + (r.valor || 0),
        0,
      );
      totals.totalDespesas = desp.reduce(
        (sum: number, r: any) => sum + (r.valor || 0),
        0,
      );
      totals.saldoLiquido = totals.totalReceitas - totals.totalDespesas;
    } catch {}

    res.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      totals,
    });
  } catch (e) {
    console.error("List financeiro error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getTransacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("financeiro_transacoes")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Get transacao error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createTransacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const input = FinanceiroSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("financeiro_transacoes")
      .insert({ ...input, id_usuario: userId })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: "Transação criada com sucesso", data });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Create transacao error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateTransacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const input = UpdateFinanceiroSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("financeiro_transacoes")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ message: "Transação atualizada com sucesso", data });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Update transacao error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteTransacao: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("financeiro_transacoes")
      .delete()
      .eq("id", id);
    if (error) throw error;
    res.json({ message: "Transação excluída com sucesso" });
  } catch (e) {
    console.error("Delete transacao error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteTransacoes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("financeiro_transacoes")
      .delete()
      .in("id", ids);
    if (error) throw error;
    res.json({
      message: `${ids.length} transação(ões) excluída(s) com sucesso`,
      deletedCount: ids.length,
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: e.errors });
    }
    console.error("Bulk delete transacoes error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const toggleTransacaoStatus: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const id = parseInt(req.params.id);
    const supabase = getSupabaseServiceClient();
    const { data: current, error: ge } = await supabase
      .from("financeiro_transacoes")
      .select("ativo")
      .eq("id", id)
      .single();
    if (ge) throw ge;
    const { data, error } = await supabase
      .from("financeiro_transacoes")
      .update({ ativo: !(current as any).ativo })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({
      message: `Transação ${(data as any).ativo ? "ativada" : "desativada"} com sucesso`,
      data,
    });
  } catch (e) {
    console.error("Toggle transacao status error:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
