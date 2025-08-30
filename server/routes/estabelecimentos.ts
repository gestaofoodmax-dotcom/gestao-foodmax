import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

// Validation schemas
const EstabelecimentoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  razao_social: z.string().optional(),
  cnpj: z.string().optional(),
  tipo_estabelecimento: z.enum(
    [
      "Restaurante",
      "Bar",
      "Lancheria",
      "Churrascaria",
      "Petiscaria",
      "Pizzaria",
      "Outro",
    ],
    { required_error: "Tipo de estabelecimento é obrigatório" },
  ),
  email: z.string().email("Email inválido"),
  ddi: z.string().min(1, "DDI é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  ativo: z.boolean().default(true),

  // Endereço (opcional)
  cep: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  pais: z.string().default("Brasil"),
});

const UpdateEstabelecimentoSchema = EstabelecimentoSchema.partial();

// Helper function to get user ID from request
const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

// Helper function to check user permissions
const checkUserPermissions = async (
  userId: number,
  estabelecimentoId?: number,
) => {
  const supabase = getSupabaseServiceClient();

  // Get user info
  const { data: user, error: userError } = await supabase
    .from("usuarios")
    .select("role, data_pagamento")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new Error("Usuário não encontrado");
  }

  // If checking specific estabelecimento, verify ownership
  if (estabelecimentoId) {
    const { data: estabelecimento, error: estError } = await supabase
      .from("estabelecimentos")
      .select("id_usuario")
      .eq("id", estabelecimentoId)
      .single();

    if (estError || !estabelecimento) {
      throw new Error("Estabelecimento não encontrado");
    }

    if (estabelecimento.id_usuario !== userId) {
      throw new Error("Acesso negado");
    }
  }

  return {
    role: user.role as "admin" | "user",
    hasPayment: !!user.data_pagamento,
  };
};

// List estabelecimentos
export const listEstabelecimentos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const supabase = getSupabaseServiceClient();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("estabelecimentos")
      .select(
        `
        *,
        estabelecimentos_enderecos (*)
      `,
      )
      .eq("id_usuario", userId);

    // Add search filter
    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,email.ilike.%${search}%,cnpj.ilike.%${search}%`,
      );
    }

    // Get total count
    const { count } = await supabase
      .from("estabelecimentos")
      .select("*", { count: "exact", head: true })
      .eq("id_usuario", userId);

    // Get paginated data
    const { data: estabelecimentos, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Format response
    const formattedData =
      estabelecimentos?.map((est) => ({
        ...est,
        endereco: est.estabelecimentos_enderecos?.[0] || null,
      })) || [];

    res.json({
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("List estabelecimentos error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Get single estabelecimento
export const getEstabelecimento: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const estabelecimentoId = parseInt(req.params.id);
    if (!estabelecimentoId) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await checkUserPermissions(userId, estabelecimentoId);

    const supabase = getSupabaseServiceClient();
    const { data: estabelecimento, error } = await supabase
      .from("estabelecimentos")
      .select(
        `
        *,
        estabelecimentos_enderecos (*)
      `,
      )
      .eq("id", estabelecimentoId)
      .single();

    if (error) throw error;

    const formattedData = {
      ...estabelecimento,
      endereco: estabelecimento.estabelecimentos_enderecos?.[0] || null,
    };

    res.json(formattedData);
  } catch (error: any) {
    console.error("Get estabelecimento error:", error);
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Create estabelecimento
export const createEstabelecimento: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const permissions = await checkUserPermissions(userId);

    // Check free plan limit
    if (permissions.role === "user" && !permissions.hasPayment) {
      const supabase = getSupabaseServiceClient();
      const { count } = await supabase
        .from("estabelecimentos")
        .select("*", { count: "exact", head: true })
        .eq("id_usuario", userId);

      if (count && count >= 1) {
        return res.status(403).json({
          error: "Só é possível cadastrar 1 Estabelecimento no plano gratuito",
        });
      }
    }

    const validatedData = EstabelecimentoSchema.parse(req.body);
    const { cep, endereco, cidade, uf, pais, ...estabelecimentoData } =
      validatedData;

    const supabase = getSupabaseServiceClient();

    // Check for duplicate estabelecimento name for this user
    const { data: existing } = await supabase
      .from("estabelecimentos")
      .select("id")
      .eq("id_usuario", userId)
      .eq("nome", estabelecimentoData.nome)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: "Já existe um estabelecimento com este nome",
      });
    }

    // Create estabelecimento
    const { data: novoEstabelecimento, error: estError } = await supabase
      .from("estabelecimentos")
      .insert({
        ...estabelecimentoData,
        id_usuario: userId,
      })
      .select()
      .single();

    if (estError) throw estError;

    // Create endereco if provided
    if (cep || endereco || cidade) {
      const { error: endError } = await supabase
        .from("estabelecimentos_enderecos")
        .insert({
          estabelecimento_id: novoEstabelecimento.id,
          cep,
          endereco,
          cidade,
          uf,
          pais,
        });

      if (endError) {
        console.error("Error creating endereco:", endError);
        // Don't fail the whole operation, just log the error
      }
    }

    res.status(201).json({
      message: "Estabelecimento criado com sucesso",
      data: novoEstabelecimento,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    if (
      error.message ===
      "Só é possível cadastrar 1 Estabelecimento no plano gratuito"
    ) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Create estabelecimento error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Update estabelecimento
export const updateEstabelecimento: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const estabelecimentoId = parseInt(req.params.id);
    if (!estabelecimentoId) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await checkUserPermissions(userId, estabelecimentoId);

    const validatedData = UpdateEstabelecimentoSchema.parse(req.body);
    const { cep, endereco, cidade, uf, pais, ...estabelecimentoData } =
      validatedData;

    const supabase = getSupabaseServiceClient();

    // Update estabelecimento
    const { data: updatedEstabelecimento, error: estError } = await supabase
      .from("estabelecimentos")
      .update(estabelecimentoData)
      .eq("id", estabelecimentoId)
      .select()
      .single();

    if (estError) throw estError;

    // Update or create endereco
    if (cep !== undefined || endereco !== undefined || cidade !== undefined) {
      const { data: existingEndereco } = await supabase
        .from("estabelecimentos_enderecos")
        .select("id")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      const enderecoData = {
        estabelecimento_id: estabelecimentoId,
        cep,
        endereco,
        cidade,
        uf,
        pais: pais || "Brasil",
      };

      if (existingEndereco) {
        // Update existing
        await supabase
          .from("estabelecimentos_enderecos")
          .update(enderecoData)
          .eq("id", existingEndereco.id);
      } else {
        // Create new
        await supabase.from("estabelecimentos_enderecos").insert(enderecoData);
      }
    }

    res.json({
      message: "Estabelecimento atualizado com sucesso",
      data: updatedEstabelecimento,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Update estabelecimento error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Delete estabelecimento
export const deleteEstabelecimento: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const estabelecimentoId = parseInt(req.params.id);
    if (!estabelecimentoId) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await checkUserPermissions(userId, estabelecimentoId);

    const supabase = getSupabaseServiceClient();

    // Delete estabelecimento (cascade will delete endereco)
    const { error } = await supabase
      .from("estabelecimentos")
      .delete()
      .eq("id", estabelecimentoId);

    if (error) throw error;

    res.json({ message: "Estabelecimento excluído com sucesso" });
  } catch (error: any) {
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Delete estabelecimento error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Bulk delete estabelecimentos
export const bulkDeleteEstabelecimentos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);

    if (ids.length === 0) {
      return res.status(400).json({ error: "Nenhum ID fornecido" });
    }

    const supabase = getSupabaseServiceClient();

    // Verify all estabelecimentos belong to the user
    const { data: estabelecimentos, error: checkError } = await supabase
      .from("estabelecimentos")
      .select("id, id_usuario")
      .in("id", ids);

    if (checkError) throw checkError;

    const unauthorized = estabelecimentos?.filter(
      (est) => est.id_usuario !== userId,
    );
    if (unauthorized && unauthorized.length > 0) {
      return res
        .status(403)
        .json({ error: "Acesso negado para alguns registros" });
    }

    // Delete estabelecimentos
    const { error: deleteError } = await supabase
      .from("estabelecimentos")
      .delete()
      .in("id", ids);

    if (deleteError) throw deleteError;

    res.json({
      message: `${ids.length} estabelecimento(s) excluído(s) com sucesso`,
      deletedCount: ids.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    console.error("Bulk delete estabelecimentos error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Toggle estabelecimento status
export const toggleEstabelecimentoStatus: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const estabelecimentoId = parseInt(req.params.id);
    if (!estabelecimentoId) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await checkUserPermissions(userId, estabelecimentoId);

    const supabase = getSupabaseServiceClient();

    // Get current status
    const { data: estabelecimento, error: getError } = await supabase
      .from("estabelecimentos")
      .select("ativo")
      .eq("id", estabelecimentoId)
      .single();

    if (getError) throw getError;

    // Toggle status
    const { data: updated, error: updateError } = await supabase
      .from("estabelecimentos")
      .update({ ativo: !estabelecimento.ativo })
      .eq("id", estabelecimentoId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      message: `Estabelecimento ${updated.ativo ? "ativado" : "desativado"} com sucesso`,
      data: updated,
    });
  } catch (error: any) {
    if (error.message === "Acesso negado") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Toggle status error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Import estabelecimentos from CSV
export const importEstabelecimentos: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const permissions = await checkUserPermissions(userId);

    // Check if user can import
    if (permissions.role === "user" && !permissions.hasPayment) {
      return res.status(403).json({
        error: "Essa ação só funciona no plano pago",
      });
    }

    const { records } = z
      .object({
        records: z.array(EstabelecimentoSchema),
      })
      .parse(req.body);

    if (records.length === 0) {
      return res.status(400).json({ error: "Nenhum registro fornecido" });
    }

    if (records.length > 1000) {
      return res.status(400).json({
        error: "Só é possível importar até 1000 registros por arquivo",
      });
    }

    const supabase = getSupabaseServiceClient();
    const imported = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const { cep, endereco, cidade, uf, pais, ...estabelecimentoData } =
          record;

        // Check for duplicates (by CNPJ if provided, else by Nome)
        let isDuplicate = false;
        const cnpjDigits = (record.cnpj || "").replace(/\D/g, "");
        if (cnpjDigits) {
          const { data: existByCnpj } = await supabase
            .from("estabelecimentos")
            .select("id")
            .eq("id_usuario", userId)
            .eq("cnpj", cnpjDigits)
            .maybeSingle();
          if (existByCnpj) isDuplicate = true;
        }
        if (!isDuplicate) {
          const { data: existByName } = await supabase
            .from("estabelecimentos")
            .select("id")
            .eq("id_usuario", userId)
            .eq("nome", estabelecimentoData.nome)
            .maybeSingle();
          if (existByName) isDuplicate = true;
        }
        if (isDuplicate) {
          errors.push(
            `Linha ${i + 1}: Estabelecimento duplicado (nome ou CNPJ)`,
          );
          continue;
        }

        // Create estabelecimento
        const { data: novoEstabelecimento, error: estError } = await supabase
          .from("estabelecimentos")
          .insert({
            ...estabelecimentoData,
            id_usuario: userId,
          })
          .select()
          .single();

        if (estError) throw estError;

        // Create endereco if provided (any address field)
        if (cep || endereco || cidade || uf || pais) {
          await supabase.from("estabelecimentos_enderecos").insert({
            estabelecimento_id: novoEstabelecimento.id,
            cep: cep || null,
            endereco: endereco || null,
            cidade: cidade || null,
            uf: uf || null,
            pais: pais || "Brasil",
          });
        }

        imported.push(novoEstabelecimento);
      } catch (recordError: any) {
        errors.push(`Linha ${i + 1}: ${recordError.message}`);
      }
    }

    res.json({
      success: true,
      message: `${imported.length} estabelecimento(s) importado(s) com sucesso`,
      imported: imported.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    console.error("Import estabelecimentos error:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
};
