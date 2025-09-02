import { RequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServiceClient } from "../supabase";

const CardapioSchema = z.object({
  nome: z.string().min(1),
  tipo_cardapio: z.enum([
    "Café",
    "Almoço",
    "Janta",
    "Lanche",
    "Bebida",
    "Outro",
  ]),
  margem_lucro_percentual: z.number().min(0),
  preco_total: z.number().int().nonnegative(),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
  itens: z.array(
    z.object({
      item_id: z.number(),
      quantidade: z.number().int().positive(),
      valor_unitario_centavos: z.number().int().nonnegative(),
    }),
  ),
});
const UpdateCardapioSchema = CardapioSchema.partial();

const getUserId = (req: any): number | null => {
  const userId = req.headers["x-user-id"];
  return userId ? parseInt(userId as string) : null;
};

export const listCardapios: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const search = (req.query.search as string) || "";
    const tipo = (req.query.tipo as string) || "";
    const offset = (page - 1) * limit;

    let query = supabase.from("cardapios").select("*").eq("id_usuario", userId);

    if (search) {
      query = query.or(`nome.ilike.%${search}%`);
    }

    if (tipo && tipo !== "Todos") {
      query = query.eq("tipo_cardapio", tipo);
    }

    const { count } = await supabase
      .from("cardapios")
      .select("*", { count: "exact", head: true })
      .eq("id_usuario", userId);

    const { data, error } = await query
      .order("data_cadastro", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get item count for each cardapio
    const cardapiosWithItemCount = await Promise.all(
      data.map(async (cardapio) => {
        const { count: itemCount } = await supabase
          .from("cardapios_itens")
          .select("*", { count: "exact", head: true })
          .eq("cardapio_id", cardapio.id);

        return {
          ...cardapio,
          qtde_itens: itemCount || 0,
        };
      }),
    );

    res.json({
      data: cardapiosWithItemCount,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error listing cardapios:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getCardapio: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const { data: cardapio, error } = await supabase
      .from("cardapios")
      .select("*")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (error || !cardapio) {
      return res.status(404).json({ error: "Cardápio não encontrado" });
    }

    // Get cardapio items with item details
    const { data: itens, error: itensError } = await supabase
      .from("cardapios_itens")
      .select(
        `
        *,
        itens:item_id (
          id,
          nome,
          estoque_atual,
          itens_categorias:categoria_id (nome)
        )
      `,
      )
      .eq("cardapio_id", id);

    if (itensError) throw itensError;

    const cardapioDetalhado = {
      ...cardapio,
      itens: itens.map((item) => ({
        id: item.id,
        item_id: item.item_id,
        item_nome: item.itens?.nome || "",
        categoria_nome: item.itens?.itens_categorias?.nome || "",
        quantidade: item.quantidade,
        valor_unitario_centavos: item.valor_unitario_centavos,
        item_estoque_atual: item.itens?.estoque_atual,
      })),
    };

    res.json(cardapioDetalhado);
  } catch (error) {
    console.error("Error getting cardapio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const createCardapio: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const parsed = CardapioSchema.parse(req.body);

    // Calculate totals
    const quantidade_total = parsed.itens.reduce(
      (sum, item) => sum + item.quantidade,
      0,
    );
    const preco_itens_centavos = parsed.itens.reduce(
      (sum, item) => sum + item.quantidade * item.valor_unitario_centavos,
      0,
    );

    // Create cardapio
    const { data: cardapio, error } = await supabase
      .from("cardapios")
      .insert({
        id_usuario: userId,
        nome: parsed.nome,
        tipo_cardapio: parsed.tipo_cardapio,
        quantidade_total,
        preco_itens_centavos,
        margem_lucro_percentual: parsed.margem_lucro_percentual,
        preco_total: parsed.preco_total,
        descricao: parsed.descricao,
        ativo: parsed.ativo,
      })
      .select()
      .single();

    if (error) throw error;

    // Create cardapio items
    if (parsed.itens.length > 0) {
      const cardapioItens = parsed.itens.map((item) => ({
        cardapio_id: cardapio.id,
        item_id: item.item_id,
        quantidade: item.quantidade,
        valor_unitario_centavos: item.valor_unitario_centavos,
      }));

      const { error: itensError } = await supabase
        .from("cardapios_itens")
        .insert(cardapioItens);

      if (itensError) throw itensError;
    }

    res.status(201).json(cardapio);
  } catch (error: any) {
    console.error("Error creating cardapio:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateCardapio: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    const parsed = UpdateCardapioSchema.parse(req.body);

    // Check if cardapio exists and belongs to user
    const { data: existing, error: existingError } = await supabase
      .from("cardapios")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: "Cardápio não encontrado" });
    }

    let updateData: any = { ...parsed };
    delete updateData.itens; // Handle items separately

    // Calculate totals if items are provided
    if (parsed.itens) {
      const quantidade_total = parsed.itens.reduce(
        (sum, item) => sum + item.quantidade,
        0,
      );
      const preco_itens_centavos = parsed.itens.reduce(
        (sum, item) => sum + item.quantidade * item.valor_unitario_centavos,
        0,
      );
      updateData.quantidade_total = quantidade_total;
      updateData.preco_itens_centavos = preco_itens_centavos;
    }

    // Update cardapio
    const { data: cardapio, error } = await supabase
      .from("cardapios")
      .update(updateData)
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (error) throw error;

    // Update items if provided
    if (parsed.itens) {
      // Delete existing items
      await supabase.from("cardapios_itens").delete().eq("cardapio_id", id);

      // Insert new items
      if (parsed.itens.length > 0) {
        const cardapioItens = parsed.itens.map((item) => ({
          cardapio_id: parseInt(id),
          item_id: item.item_id,
          quantidade: item.quantidade,
          valor_unitario_centavos: item.valor_unitario_centavos,
        }));

        const { error: itensError } = await supabase
          .from("cardapios_itens")
          .insert(cardapioItens);

        if (itensError) throw itensError;
      }
    }

    res.json(cardapio);
  } catch (error: any) {
    console.error("Error updating cardapio:", error);
    if (error.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteCardapio: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    // Check if cardapio exists and belongs to user
    const { data: existing, error: existingError } = await supabase
      .from("cardapios")
      .select("id")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: "Cardápio não encontrado" });
    }

    // Delete cardapio (items will be deleted by cascade)
    const { error } = await supabase
      .from("cardapios")
      .delete()
      .eq("id", id)
      .eq("id_usuario", userId);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting cardapio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const bulkDeleteCardapios: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();

    const { ids }: { ids: number[] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    const { error } = await supabase
      .from("cardapios")
      .delete()
      .in("id", ids)
      .eq("id_usuario", userId);

    if (error) throw error;

    res.json({ deletedCount: ids.length });
  } catch (error) {
    console.error("Error bulk deleting cardapios:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const toggleCardapioStatus: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });
    const supabase = getSupabaseServiceClient();
    const { id } = req.params;

    // Get current status
    const { data: current, error: currentError } = await supabase
      .from("cardapios")
      .select("ativo")
      .eq("id", id)
      .eq("id_usuario", userId)
      .single();

    if (currentError || !current) {
      return res.status(404).json({ error: "Cardápio não encontrado" });
    }

    // Toggle status
    const { data, error } = await supabase
      .from("cardapios")
      .update({ ativo: !current.ativo })
      .eq("id", id)
      .eq("id_usuario", userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error toggling cardapio status:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Import cardápios from CSV
export const importCardapios: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Usuário não autenticado" });

    const RecordsSchema = z.object({
      records: z.array(
        z.object({
          nome: z.string().min(1),
          tipo_cardapio: z.enum([
            "Café",
            "Almoço",
            "Janta",
            "Lanche",
            "Bebida",
            "Outro",
          ]),
          quantidade_total: z.union([z.number(), z.string()]).optional(),
          preco_itens: z.union([z.number(), z.string()]).optional(),
          margem_lucro: z.union([z.number(), z.string()]).optional(),
          preco_total: z.union([z.number(), z.string()]).optional(),
          descricao: z.string().optional(),
          status: z.string().optional(),
          data_cadastro: z.string().optional(),
          data_atualizacao: z.string().optional(),
          item_nome: z.string().optional(),
          item_quantidade: z.union([z.number(), z.string()]).optional(),
          item_valor_unitario: z.union([z.number(), z.string()]).optional(),
        }),
      ),
    });

    console.log("Import request body:", req.body);

    let records;
    try {
      const parsed = RecordsSchema.parse(req.body);
      records = parsed.records;
      console.log("Parsed records:", records);
    } catch (parseError) {
      console.error("Schema validation error:", parseError);
      // Try to work with raw records if schema fails
      records = req.body.records || [];
      console.log("Using raw records:", records);
    }

    const parseCentavos = (val: any): number => {
      if (val === undefined || val === null || val === "") return 0;
      if (typeof val === "number") {
        return Number.isInteger(val) ? val : Math.round(val * 100);
      }
      const s = String(val).trim();
      const clean = s
        .replace(/[^0-9,.-]/g, "")
        .replace(/\.(?=\d{3}(,|$))/g, "");
      const dot = clean.replace(",", ".");
      const n = Number(dot);
      if (!isNaN(n)) return Math.round(n * 100);
      const digits = s.replace(/\D/g, "");
      return digits ? parseInt(digits, 10) : 0;
    };

    const toBool = (v: any): boolean => {
      if (typeof v === "boolean") return v;
      const s = String(v ?? "")
        .trim()
        .toLowerCase();
      if (["1", "true", "ativo", "sim", "yes"].includes(s)) return true;
      if (["0", "false", "inativo", "nao", "não", "no"].includes(s))
        return false;
      return true;
    };

    const supabase = getSupabaseServiceClient();

    // Group records by cardapio (nome + tipo_cardapio)
    const cardapiosMap = new Map<string, any>();

    for (const r of records) {
      console.log("Processing record:", r);
      const key = `${r.nome}_${r.tipo_cardapio}`;

      if (!cardapiosMap.has(key)) {
        const preco_total = parseCentavos(r.preco_total);
        const preco_itens_centavos = parseCentavos(r.preco_itens);
        const quantidade_total =
          typeof r.quantidade_total === "string"
            ? Number(r.quantidade_total) || 0
            : r.quantidade_total || 0;

        const margem_lucro_percentual =
          typeof r.margem_lucro === "string"
            ? Number(String(r.margem_lucro).replace(",", ".")) || 0
            : r.margem_lucro || 0;

        cardapiosMap.set(key, {
          nome: r.nome,
          tipo_cardapio: r.tipo_cardapio,
          quantidade_total,
          preco_itens_centavos,
          margem_lucro_percentual,
          preco_total,
          descricao: r.descricao || "",
          ativo: r.status ? toBool(r.status) : true,
          itens: [],
        });
      }

      // Add item if provided
      if (r.item_nome && r.item_nome.trim()) {
        cardapiosMap.get(key).itens.push({
          item_nome: r.item_nome.trim(),
          quantidade:
            typeof r.item_quantidade === "string"
              ? Number(r.item_quantidade) || 1
              : r.item_quantidade || 1,
          valor_unitario_centavos: parseCentavos(r.item_valor_unitario),
        });
      }
    }

    let imported = 0;
    console.log(`Processing ${cardapiosMap.size} unique cardapios`);

    for (const cardapioData of cardapiosMap.values()) {
      try {
        console.log("Inserting cardapio:", cardapioData);

        // Create cardapio
        const { data: cardapio, error } = await supabase
          .from("cardapios")
          .insert({
            id_usuario: userId,
            nome: cardapioData.nome,
            tipo_cardapio: cardapioData.tipo_cardapio,
            quantidade_total: cardapioData.quantidade_total,
            preco_itens_centavos: cardapioData.preco_itens_centavos,
            margem_lucro_percentual: cardapioData.margem_lucro_percentual,
            preco_total: cardapioData.preco_total,
            descricao: cardapioData.descricao,
            ativo: cardapioData.ativo,
          })
          .select()
          .single();

        if (error) {
          console.error(
            `Database error for cardapio ${cardapioData.nome}:`,
            error,
          );
        } else if (cardapio) {
          console.log(`Successfully created cardapio: ${cardapio.nome}`);

          // Create cardapio items if any exist
          if (cardapioData.itens && cardapioData.itens.length > 0) {
            console.log(
              `Creating ${cardapioData.itens.length} items for cardapio ${cardapio.nome}`,
            );

            for (const itemData of cardapioData.itens) {
              // First, try to find the item by name in the database
              let item_id = null;
              const itemName = itemData.item_nome;

              if (itemName) {
                // Try to find existing item by name
                const { data: existingItem } = await supabase
                  .from("itens")
                  .select("id")
                  .eq("nome", itemName)
                  .eq("id_usuario", userId)
                  .single();

                if (existingItem) {
                  item_id = existingItem.id;
                  console.log(
                    `Found existing item: ${itemName} with id ${item_id}`,
                  );
                } else {
                  // Create new item if it doesn't exist
                  const { data: newItem, error: itemError } = await supabase
                    .from("itens")
                    .insert({
                      id_usuario: userId,
                      nome: itemName,
                      categoria_id: 1, // Default category - you might want to handle this better
                      unidade_medida: "un",
                      estoque_atual: 0,
                      estoque_minimo: 0,
                      custo_unitario_centavos: itemData.valor_unitario_centavos,
                      ativo: true,
                    })
                    .select("id")
                    .single();

                  if (newItem && !itemError) {
                    item_id = newItem.id;
                    console.log(
                      `Created new item: ${itemName} with id ${item_id}`,
                    );
                  } else {
                    console.error(
                      `Error creating item ${itemName}:`,
                      itemError,
                    );
                  }
                }
              }

              // If we have an item_id, create the cardapio_item relationship
              if (item_id) {
                const { error: itemRelationError } = await supabase
                  .from("cardapios_itens")
                  .insert({
                    cardapio_id: cardapio.id,
                    item_id: item_id,
                    quantidade: itemData.quantidade,
                    valor_unitario_centavos: itemData.valor_unitario_centavos,
                  });

                if (itemRelationError) {
                  console.error(
                    `Error creating cardapio item relation:`,
                    itemRelationError,
                  );
                } else {
                  console.log(
                    `Created cardapio item relation for item ${item_id}`,
                  );
                }
              }
            }
          }

          imported++;
        }
      } catch (error) {
        console.error(`Error importing cardapio ${cardapioData.nome}:`, error);
      }
    }

    console.log(`Import completed. ${imported} cardapios imported.`);
    res.json({ success: true, imported });
  } catch (error: any) {
    console.error("Error importing cardapios:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
