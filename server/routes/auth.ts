import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getSupabaseServiceClient, getClientIp } from "../supabase";

function normalizeIp(raw: string | undefined): string {
  const ip = (raw || "").trim();
  const v4 =
    /^(25[0-5]|2[0-4]\d|[01]?\d\d?)(\.(25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/;
  const v6 = /^[0-9a-fA-F:]+$/; // coarse check
  if (v4.test(ip) || v6.test(ip)) return ip;
  return "127.0.0.1";
}

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const RegisterSchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
        "Senha deve conter letras, números e símbolos",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
  });

const OnboardingSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  ddi: z.string().min(1, "DDI é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  selectedPlan: z.enum(["free", "paid"]),
});

// Get current user endpoint
export const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    const userId = Number(req.headers["x-user-id"]);
    if (!userId) {
      return res.status(401).json({ error: "x-user-id header é obrigatório" });
    }

    const supabase = getSupabaseServiceClient();
    const { data: user, error: userErr } = await supabase
      .from("usuarios")
      .select(
        "id, email, role, ativo, onboarding, data_cadastro, data_pagamento",
      )
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!user.ativo) {
      return res.status(401).json({ error: "Usuário inativo" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role || "user",
        ativo: user.ativo,
        onboarding: user.onboarding,
        data_cadastro: user.data_cadastro,
        hasPayment: !!user.data_pagamento,
      },
    });
  } catch (error) {
    console.error("get_user_error", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Login endpoint
export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const clientIP = normalizeIp(getClientIp(req));

    // Enforce 5 failed attempts/day
    const today = new Date().toISOString().slice(0, 10);
    const { data: attemptRow, error: attErr } = await supabase
      .from("login_attempts")
      .select("*")
      .eq("ip", clientIP)
      .eq("email", email)
      .eq("attempt_date", today)
      .maybeSingle();
    if (attErr && attErr.code !== "PGRST116") throw attErr;
    if (attemptRow && attemptRow.attempts_count >= 5) {
      return res.status(429).json({
        error:
          "Você excedeu o limite de tentativas hoje. Por favor, troque sua senha.",
      });
    }

    // Find user
    const { data: user, error: userErr } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (userErr && userErr.code !== "PGRST116") throw userErr;
    if (!user || !user.ativo)
      return res
        .status(401)
        .json({ error: "Credenciais inválidas ou usuário inativo" });

    const ok = await bcrypt.compare(password, user.senha);
    if (!ok) {
      if (attemptRow) {
        await supabase
          .from("login_attempts")
          .update({
            attempts_count: attemptRow.attempts_count + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq("id", attemptRow.id);
      } else {
        await supabase.from("login_attempts").insert({ ip: clientIP, email });
      }
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    // Success - reset attempts
    if (attemptRow) {
      await supabase.from("login_attempts").delete().eq("id", attemptRow.id);
    }

    res.json({
      success: true,
      needsOnboarding: !user.onboarding,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || "user",
        ativo: user.ativo,
        onboarding: user.onboarding,
        data_cadastro: user.data_cadastro,
        hasPayment: !!user.data_pagamento,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("login_error", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Register endpoint
export const handleRegister: RequestHandler = async (req, res) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);
    const { email, password } = validatedData;

    const supabase = getSupabaseServiceClient();
    const clientIP = normalizeIp(getClientIp(req));

    // Rate limit: max 3 registrations per IP/day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: regRow, error: regErr } = await supabase
      .from("registration_attempts")
      .select("*")
      .eq("ip", clientIP)
      .eq("registration_date", today.toISOString().slice(0, 10))
      .maybeSingle();

    if (regErr && regErr.code !== "PGRST116") throw regErr;

    if (regRow && regRow.registrations_count >= 3) {
      return res.status(429).json({
        error: "Limite de 3 contas por dia para este IP atingido",
      });
    }

    // Check existing email
    const { data: existing, error: existErr } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existErr && existErr.code !== "PGRST116") throw existErr;
    if (existing) return res.status(409).json({ error: "Email já cadastrado" });

    // Hash password and insert user
    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error: insErr } = await supabase
      .from("usuarios")
      .insert({ email, senha: hashedPassword, ip: clientIP })
      .select("*")
      .single();
    if (insErr) throw insErr;

    // Upsert registration attempt counter
    if (regRow) {
      await supabase
        .from("registration_attempts")
        .update({
          registrations_count: regRow.registrations_count + 1,
          last_registration: new Date().toISOString(),
        })
        .eq("id", regRow.id);
    } else {
      await supabase.from("registration_attempts").insert({ ip: clientIP });
    }

    res.status(201).json({
      success: true,
      message: "Conta criada",
      user: {
        id: user.id,
        email: user.email,
        role: user.role || "user",
        ativo: user.ativo,
        onboarding: user.onboarding,
        data_cadastro: user.data_cadastro,
        hasPayment: !!user.data_pagamento,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("register_error", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Forgot password endpoint
export const handleForgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = z
      .object({
        email: z.string().email("Email inválido"),
      })
      .parse(req.body);

    // TODO: Implement password reset logic when database is connected
    // Check if email exists
    // Generate reset token
    // Send email (would need email service)

    res.json({
      message: "Forgot password endpoint ready - needs database connection",
      email,
      status: "pending_database",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Email inválido",
        details: error.errors,
      });
    } else {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }
};

// Complete onboarding endpoint
export const handleOnboarding: RequestHandler = async (req, res) => {
  try {
    const validatedData = OnboardingSchema.parse(req.body);
    const { nome, ddi, telefone } = validatedData;

    const supabase = getSupabaseServiceClient();
    const userId = Number(req.headers["x-user-id"]);
    if (!userId)
      return res.status(400).json({ error: "x-user-id header é obrigatório" });

    const { error: insertErr } = await supabase
      .from("usuarios_contatos")
      .insert({ usuario_id: userId, nome, ddi, telefone });
    if (insertErr) throw insertErr;

    const { error: updErr } = await supabase
      .from("usuarios")
      .update({ onboarding: true })
      .eq("id", userId);
    if (updErr) throw updErr;

    res.json({ success: true, message: "Onboarding concluído" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("onboarding_error", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};
