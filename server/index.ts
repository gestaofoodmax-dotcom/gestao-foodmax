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
  importCardapios,
} from "./routes/cardapios";
import {
  listPedidos,
  getPedido,
  createPedido,
  updatePedido,
  deletePedido,
  bulkDeletePedidos,
  finalizarPedido,
  importPedidos,
  importPedidosFull,
} from "./routes/pedidos";
import {
  listAbastecimentos,
  getAbastecimento,
  createAbastecimento,
  updateAbastecimento,
  deleteAbastecimento,
  bulkDeleteAbastecimentos,
  marcarRecebido,
  enviarEmail,
  importAbastecimentos,
  importAbastecimentosFull,
  testDatabaseConnection,
} from "./routes/abastecimentos";
import {
  listEntregas,
  getEntrega,
  createEntrega,
  updateEntrega,
  deleteEntrega,
  bulkDeleteEntregas,
  registrarSaida,
  registrarEntregue,
  importEntregasFull,
} from "./routes/entregas";
import {
  listTransacoes,
  getTransacao,
  createTransacao,
  updateTransacao,
  deleteTransacao,
  bulkDeleteTransacoes,
  toggleTransacaoStatus,
} from "./routes/financeiro";

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
  app.post("/api/cardapios/import", importCardapios);

  // Pedidos routes
  app.get("/api/pedidos", listPedidos);
  app.get("/api/pedidos/:id", getPedido);
  app.post("/api/pedidos", createPedido);
  app.put("/api/pedidos/:id", updatePedido);
  app.delete("/api/pedidos/:id", deletePedido);
  app.post("/api/pedidos/bulk-delete", bulkDeletePedidos);
  app.patch("/api/pedidos/:id/finalizar", finalizarPedido);
  app.post("/api/pedidos/import", importPedidos as any);
  app.post("/api/pedidos/import-full", importPedidosFull);

  // Database test route
  app.get("/api/test-database", testDatabaseConnection);

  // Abastecimentos routes
  app.get("/api/abastecimentos", listAbastecimentos);
  app.get("/api/abastecimentos/:id", getAbastecimento);
  app.post("/api/abastecimentos", createAbastecimento);
  app.put("/api/abastecimentos/:id", updateAbastecimento);
  app.delete("/api/abastecimentos/:id", deleteAbastecimento);
  app.post("/api/abastecimentos/bulk-delete", bulkDeleteAbastecimentos);
  app.patch("/api/abastecimentos/:id/recebido", marcarRecebido);
  app.post("/api/abastecimentos/:id/enviar-email", enviarEmail);
  app.post("/api/abastecimentos/import", importAbastecimentos);
  const importAbastFullHandler: any =
    (importAbastecimentosFull as any) || importAbastecimentos;
  app.post("/api/abastecimentos/import-full", importAbastFullHandler);

  // Entregas routes
  app.get("/api/entregas", listEntregas);
  app.get("/api/entregas/:id", getEntrega);
  app.post("/api/entregas", createEntrega);
  app.put("/api/entregas/:id", updateEntrega);
  app.delete("/api/entregas/:id", deleteEntrega);
  app.post("/api/entregas/bulk-delete", bulkDeleteEntregas);
  app.patch("/api/entregas/:id/saida", registrarSaida);
  app.patch("/api/entregas/:id/entregue", registrarEntregue);
  app.post("/api/entregas/import-full", importEntregasFull);

  return app;
}
