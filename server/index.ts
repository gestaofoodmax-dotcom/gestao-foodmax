import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import {
  handleLogin,
  handleRegister,
  handleForgotPassword,
  handleOnboarding,
  getCurrentUser,
} from "./routes/auth";
import { handleDemo } from "./routes/demo";
import {
  listFornecedores,
  getFornecedor,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
  bulkDeleteFornecedores,
  toggleFornecedorStatus,
  importFornecedores,
} from "./routes/fornecedores";
import {
  listEstabelecimentos,
  getEstabelecimento,
  createEstabelecimento,
  updateEstabelecimento,
  deleteEstabelecimento,
  bulkDeleteEstabelecimentos,
  toggleEstabelecimentoStatus,
  importEstabelecimentos,
} from "./routes/estabelecimentos";
import {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  bulkDeleteClientes,
  toggleClienteStatus,
  importClientes,
} from "./routes/clientes";
import {
  listItens,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  bulkDeleteItens,
  toggleItemStatus,
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  bulkDeleteCategorias,
  toggleCategoriaStatus,
} from "./routes/itens";
import {
  listCardapios,
  getCardapio,
  createCardapio,
  updateCardapio,
  deleteCardapio,
  bulkDeleteCardapios,
  toggleCardapioStatus,
} from "./routes/cardapios";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong" });
  });

  // Auth routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/register", handleRegister);
  app.post("/api/auth/forgot-password", handleForgotPassword);
  app.post("/api/auth/onboarding", handleOnboarding);
  app.get("/api/auth/me", getCurrentUser);

  // Demo routes
  app.get("/api/demo", handleDemo);

  // Estabelecimentos routes
  app.get("/api/estabelecimentos", listEstabelecimentos);
  app.get("/api/estabelecimentos/:id", getEstabelecimento);
  app.post("/api/estabelecimentos", createEstabelecimento);
  app.put("/api/estabelecimentos/:id", updateEstabelecimento);
  app.delete("/api/estabelecimentos/:id", deleteEstabelecimento);
  app.post("/api/estabelecimentos/bulk-delete", bulkDeleteEstabelecimentos);
  app.patch(
    "/api/estabelecimentos/:id/toggle-status",
    toggleEstabelecimentoStatus,
  );
  app.post("/api/estabelecimentos/import", importEstabelecimentos);

  // Clientes routes
  app.get("/api/clientes", listClientes);
  app.get("/api/clientes/:id", getCliente);
  app.post("/api/clientes", createCliente);
  app.put("/api/clientes/:id", updateCliente);
  app.delete("/api/clientes/:id", deleteCliente);
  app.post("/api/clientes/bulk-delete", bulkDeleteClientes);
  app.patch("/api/clientes/:id/toggle-status", toggleClienteStatus);
  app.post("/api/clientes/import", importClientes);

  // Fornecedores routes
  app.get("/api/fornecedores", listFornecedores);
  app.get("/api/fornecedores/:id", getFornecedor);
  app.post("/api/fornecedores", createFornecedor);
  app.put("/api/fornecedores/:id", updateFornecedor);
  app.delete("/api/fornecedores/:id", deleteFornecedor);
  app.post("/api/fornecedores/bulk-delete", bulkDeleteFornecedores);
  app.patch("/api/fornecedores/:id/toggle-status", toggleFornecedorStatus);
  app.post("/api/fornecedores/import", importFornecedores);

  // Itens routes
  app.get("/api/itens", listItens);
  app.get("/api/itens/:id", getItem);
  app.post("/api/itens", createItem);
  app.put("/api/itens/:id", updateItem);
  app.delete("/api/itens/:id", deleteItem);
  app.post("/api/itens/bulk-delete", bulkDeleteItens);
  app.patch("/api/itens/:id/toggle-status", toggleItemStatus);

  app.get("/api/itens-categorias", listCategorias);
  app.post("/api/itens-categorias", createCategoria);
  app.put("/api/itens-categorias/:id", updateCategoria);
  app.delete("/api/itens-categorias/:id", deleteCategoria);
  app.post("/api/itens-categorias/bulk-delete", bulkDeleteCategorias);
  app.patch("/api/itens-categorias/:id/toggle-status", toggleCategoriaStatus);

  // Cardapios routes
  app.get("/api/cardapios", listCardapios);
  app.get("/api/cardapios/:id", getCardapio);
  app.post("/api/cardapios", createCardapio);
  app.put("/api/cardapios/:id", updateCardapio);
  app.delete("/api/cardapios/:id", deleteCardapio);
  app.post("/api/cardapios/bulk-delete", bulkDeleteCardapios);
  app.patch("/api/cardapios/:id/toggle-status", toggleCardapioStatus);

  return app;
}
