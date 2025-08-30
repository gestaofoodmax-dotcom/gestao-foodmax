import { z } from "zod";
import type { RequestHandler } from "express";
import { getSupabaseServiceClient } from "../supabase";

const ClienteSchema = z.object({
  estabelecimento_id: z.number().int(),
  nome: z.string().min(1, "Nome é obrigatório"),
  genero: z.enum(["Masculino", "Feminino", "Outro"]).optional(),
  profissao: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
  ddi: z.string().min(1, "DDI é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  ativo: z.boolean().default(true),
  aceita_promocao_email: z.boolean().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  pais: z.string().default("Brasil"),
});

const UpdateClienteSchema = ClienteSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

const checkUserPermissions = async (userId: number, clienteId?: number) => {
  const supabase = getSupabaseServiceClient();

  const { data: user, error: userError } = await supabase
    .from("usuarios")
    .select("role, data_pagamento")
    .eq("id", userId)
    .single();
  if (userError || !user) throw new Error("Usuário não encontrado");

  if (clienteId) {
    const { data: cliente, error: cliError } = await supabase
      .from("clientes")
      .select("id_usuario")
      .eq("id", clienteId)
      .single();
    if (cliError || !cliente) throw new Error("Cliente não encontrado");
    if (cliente.id_usuario !== userId) throw new Error("Acesso negado");
  }

  return {
    role: user.role as "admin" | "user",
    hasPayment: !!user.data_pagamento,
  };
};

export const listClientes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const supabase = getSupabaseServiceClient();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("clientes")
      .select(`*, clientes_enderecos (*), estabelecimentos (id, nome)`)
      .eq("id_usuario", userId);

    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%`,
      );
    }

    const { count } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true })
      .eq("id_usuario", userId);

    const { data: clientes, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formatted = (clientes || []).map((c: any) => ({
      ...c,
      endereco: c.clientes_enderecos?.[0] || null,
      estabelecimento_nome: c.estabelecimentos?.nome || null,
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
    console.error("List clientes error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getCliente: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const supabase = getSupabaseServiceClient();
    const { data: cliente, error } = await supabase
      .from("clientes")
      .select(`*, clientes_enderecos (*), estabelecimentos (id, nome)`)
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json({
      ...cliente,
      endereco: (cliente as any).clientes_enderecos?.[0] || null,
      estabelecimento_nome: (cliente as any).estabelecimentos?.nome || null,
    });
  } catch (error: any) {
    console.error("Get cliente error:", error);
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createCliente: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    await checkUserPermissions(userId);

    const validated = ClienteSchema.parse(req.body);
    const { cep, endereco, cidade, uf, pais, ...clienteData } = validated;

    const supabase = getSupabaseServiceClient();

    // Validate estabelecimento ownership
    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("id, id_usuario, ativo, data_cadastro")
      .eq("id", clienteData.estabelecimento_id)
      .single();
    if (!est || est.id_usuario !== userId) {
      return res.status(403).json({ error: "Estabelecimento inválido" });
    }

    const { data: novo, error: cliError } = await supabase
      .from("clientes")
      .insert({ ...clienteData, id_usuario: userId })
      .select()
      .single();
    if (cliError) throw cliError;

    if (cep || endereco || cidade) {
      const { error: endError } = await supabase
        .from("clientes_enderecos")
        .insert({
          cliente_id: novo.id,
          cep,
          endereco,
          cidade,
          uf,
          pais,
        });
      if (endError) console.error("Error creating cliente endereco:", endError);
    }

    res.status(201).json({ message: "Cliente criado com sucesso", data: novo });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Create cliente error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateCliente: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const validated = UpdateClienteSchema.parse(req.body);
    const { cep, endereco, cidade, uf, pais, ...clienteData } = validated;

    const supabase = getSupabaseServiceClient();

    if (clienteData.estabelecimento_id !== undefined) {
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("id, id_usuario")
        .eq("id", clienteData.estabelecimento_id)
        .single();
      if (!est || est.id_usuario !== userId) {
        return res.status(403).json({ error: "Estabelecimento inválido" });
      }
    }

    const { data: updated, error: upError } = await supabase
      .from("clientes")
      .update(clienteData)
      .eq("id", id)
      .select()
      .single();
    if (upError) throw upError;

    if (cep !== undefined || endereco !== undefined || cidade !== undefined) {
      const { data: existing } = await supabase
        .from("clientes_enderecos")
        .select("id")
        .eq("cliente_id", id)
        .maybeSingle();

      const endData = {
        cliente_id: id,
        cep,
        endereco,
        cidade,
        uf,
        pais: pais || "Brasil",
      };
      if (existing) {
        await supabase
          .from("clientes_enderecos")
          .update(endData)
          .eq("id", existing.id);
      } else {
        await supabase.from("clientes_enderecos").insert(endData);
      }
    }

    res.json({ message: "Cliente atualizado com sucesso", data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Update cliente error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteCliente: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const supabase = getSupabaseServiceClient();

    // Delete child address first to avoid FK issues if cascade is not set
    await supabase.from("clientes_enderecos").delete().eq("cliente_id", id);

    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      if ((error as any).code === "23503") {
        return res.status(409).json({
          error:
            "Não é possível excluir o Cliente pois existem dependências com outros módulos.",
        });
      }
      throw error;
    }

    res.json({ message: "Cliente excluído com sucesso" });
  } catch (error: any) {
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Delete cliente error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteClientes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
    if (ids.length === 0)
      return res.status(400).json({ error: "Nenhum ID fornecido" });

    const supabase = getSupabaseServiceClient();

    const { data: clientes, error: checkError } = await supabase
      .from("clientes")
      .select("id, id_usuario")
      .in("id", ids);
    if (checkError) throw checkError;

    const unauthorized = (clientes || []).filter(
      (c) => c.id_usuario !== userId,
    );
    if (unauthorized.length > 0) {
      return res
        .status(403)
        .json({ error: "Acesso negado para alguns registros" });
    }

    // Delete child addresses first to avoid FK issues
    await supabase.from("clientes_enderecos").delete().in("cliente_id", ids);

    const { error: delError } = await supabase
      .from("clientes")
      .delete()
      .in("id", ids);
    if (delError) {
      if ((delError as any).code === "23503") {
        return res.status(409).json({
          error:
            "Não é possível excluir alguns Clientes pois existem dependências com outros módulos.",
        });
      }
      throw delError;
    }

    res.json({
      message: `${ids.length} cliente(s) excluído(s) com sucesso`,
      deletedCount: ids.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Bulk delete clientes error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const toggleClienteStatus: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    await checkUserPermissions(userId, id);

    const supabase = getSupabaseServiceClient();
    const { data: cliente, error: getError } = await supabase
      .from("clientes")
      .select("ativo")
      .eq("id", id)
      .single();
    if (getError) throw getError;

    const { data: updated, error: updateError } = await supabase
      .from("clientes")
      .update({ ativo: !(cliente as any).ativo })
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw updateError;

    res.json({
      message: `Cliente ${(updated as any).ativo ? "ativado" : "desativado"} com sucesso`,
      data: updated,
    });
  } catch (error: any) {
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Toggle cliente status error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const importClientes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    await checkUserPermissions(userId);

    const { records } = z
      .object({ records: z.array(z.record(z.any())) })
      .parse(req.body);
    if (records.length === 0)
      return res.status(400).json({ error: "Nenhum registro fornecido" });
    if (records.length > 1000) {
      return res.status(400).json({
        error: "Só é possível importar até 1000 registros por arquivo",
      });
    }

    const supabase = getSupabaseServiceClient();
    const imported: any[] = [];
    const errors: string[] = [];

    const toBool = (v: any): boolean | undefined => {
      if (typeof v === "boolean") return v;
      if (v == null || v === "") return undefined;
      const s = String(v).trim().toLowerCase();
      if (["1", "true", "ativo", "sim", "yes"].includes(s)) return true;
      if (["0", "false", "inativo", "nao", "não", "no"].includes(s))
        return false;
      return undefined;
    };
    const onlyDigits = (v: any): string => String(v || "").replace(/\D/g, "");

    for (let i = 0; i < records.length; i++) {
      try {
        const raw = records[i] as any;

        // Resolve estabelecimento by id (estabelecimento_id), id_estabelecimento, or name
        let estabelecimentoId: number | null = null;

        if (raw.estabelecimento_id != null) {
          const num = Number(raw.estabelecimento_id);
          estabelecimentoId = Number.isFinite(num) ? num : null;
        }
        if (!estabelecimentoId && raw.id_estabelecimento != null) {
          const val = raw.id_estabelecimento;
          const num = Number(val);
          if (Number.isFinite(num)) {
            estabelecimentoId = num;
          } else if (typeof val === "string" && val.trim()) {
            // treat as nome
            const nomeBusca = val.trim();
            // Try exact match first
            const { data: byEq } = await supabase
              .from("estabelecimentos")
              .select("id, id_usuario, nome")
              .eq("id_usuario", userId)
              .eq("nome", nomeBusca)
              .maybeSingle();
            if (byEq) estabelecimentoId = byEq.id;
            if (!estabelecimentoId) {
              const { data: byLike } = await supabase
                .from("estabelecimentos")
                .select("id, id_usuario, nome")
                .eq("id_usuario", userId)
                .ilike("nome", `%${nomeBusca}%`)
                .limit(1);
              if (byLike && byLike.length) estabelecimentoId = byLike[0].id;
            }
          }
        }
        if (
          !estabelecimentoId &&
          typeof raw.estabelecimento_nome === "string"
        ) {
          const nomeBusca = raw.estabelecimento_nome.trim();
          if (nomeBusca) {
            const { data: byEq } = await supabase
              .from("estabelecimentos")
              .select("id, id_usuario, nome")
              .eq("id_usuario", userId)
              .eq("nome", nomeBusca)
              .maybeSingle();
            if (byEq) estabelecimentoId = byEq.id;
            if (!estabelecimentoId) {
              const { data: byLike } = await supabase
                .from("estabelecimentos")
                .select("id, id_usuario, nome")
                .eq("id_usuario", userId)
                .ilike("nome", `%${nomeBusca}%`)
                .limit(1);
              if (byLike && byLike.length) estabelecimentoId = byLike[0].id;
            }
          }
        }

        if (!estabelecimentoId) {
          errors.push(
            `Linha ${i + 1}: Estabelecimento inválido ou não encontrado`,
          );
          continue;
        }

        // Validate ownership of estabelecimento
        const { data: est } = await supabase
          .from("estabelecimentos")
          .select("id, id_usuario")
          .eq("id", estabelecimentoId)
          .single();
        if (!est || est.id_usuario !== userId) {
          errors.push(`Linha ${i + 1}: Estabelecimento inválido`);
          continue;
        }

        // Normalize cliente data
        const nome = String(raw.nome || "").trim();
        if (!nome) {
          errors.push(`Linha ${i + 1}: Nome é obrigatório`);
          continue;
        }

        const email = raw.email ? String(raw.email).trim() : undefined;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Linha ${i + 1}: Email inválido`);
          continue;
        }

        const ddiRaw = String(raw.ddi || "+55").replace(/\D/g, "");
        const ddi = `+${ddiRaw || "55"}`;
        const telefone = onlyDigits(raw.telefone || "");

        const ativo = toBool(raw.ativo);
        const aceitaProm = toBool(raw.aceita_promocao_email);

        // Duplicate rule: same user and same nome + telefone
        const { data: dup } = await supabase
          .from("clientes")
          .select("id")
          .eq("id_usuario", userId)
          .eq("nome", nome)
          .eq("telefone", telefone)
          .maybeSingle();
        if (dup) {
          errors.push(`Linha ${i + 1}: Cliente duplicado (nome + telefone)`);
          continue;
        }

        // Insert cliente
        const { data: novo, error: insError } = await supabase
          .from("clientes")
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome,
            genero: raw.genero,
            profissao: raw.profissao,
            email,
            ddi,
            telefone,
            id_usuario: userId,
            ...(ativo !== undefined ? { ativo } : {}),
            ...(aceitaProm !== undefined
              ? { aceita_promocao_email: aceitaProm }
              : {}),
          })
          .select()
          .single();
        if (insError) throw insError;

        // Insert address if present
        const cep = onlyDigits(raw.cep || "");
        const endereco = raw.endereco ? String(raw.endereco).trim() : undefined;
        const cidade = raw.cidade ? String(raw.cidade).trim() : undefined;
        const uf = raw.uf
          ? String(raw.uf).trim().toUpperCase().slice(0, 2)
          : undefined;
        const pais = raw.pais ? String(raw.pais).trim() : undefined;

        if (cep || endereco || cidade || uf || pais) {
          await supabase.from("clientes_enderecos").insert({
            cliente_id: (novo as any).id,
            cep: cep || null,
            endereco: endereco || null,
            cidade: cidade || null,
            uf: uf || null,
            pais: pais || "Brasil",
          });
        }

        imported.push(novo);
      } catch (e: any) {
        errors.push(`Linha ${i + 1}: ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `${imported.length} cliente(s) importado(s) com sucesso`,
      imported: imported.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    console.error("Import clientes error:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro interno do servidor" });
  }
};
