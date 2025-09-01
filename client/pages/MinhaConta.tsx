import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MinhaConta() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <Sidebar open={sidebarOpen} onToggle={(next) => setSidebarOpen(typeof next === 'boolean' ? next : !sidebarOpen)} />

      <div className="flex-1 flex flex-col">
        <header className="bg-foodmax-gray-bg px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 mr-3 rounded-lg border bg-white"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-semibold text-gray-800">Minha Conta</h2>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados do Usuário</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <Input value={user?.email?.split('@')[0] || ''} readOnly className="foodmax-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input value={user?.email || ''} readOnly className="foodmax-input" />
                </div>
              </div>
              <div className="mt-6">
                <Button variant="orange" disabled>Editar</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
