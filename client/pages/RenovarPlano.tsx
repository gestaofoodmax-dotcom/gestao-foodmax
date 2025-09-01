import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function RenovarPlano() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <Sidebar
        open={sidebarOpen}
        onToggle={(n) =>
          setSidebarOpen(typeof n === "boolean" ? n : !sidebarOpen)
        }
      />
      <div className="flex-1 p-6">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 mr-3 rounded-lg border bg-white"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800">
            Renovar Plano
          </h1>
        </div>
        <div className="mt-4 text-gray-600">Página para renovar o plano.</div>
      </div>
    </div>
  );
}
