import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ConfiguracoesModule() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const [template, setTemplate] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [newImage, setNewImage] = useState("");

  useEffect(() => {
    try {
      setTemplate(localStorage.getItem("fm_config_promocao_template") || "");
      const raw = localStorage.getItem("fm_config_promocao_imagens");
      setImages(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem("fm_config_promocao_template", template);
    localStorage.setItem("fm_config_promocao_imagens", JSON.stringify(images));
    toast({ title: "Salvo", description: "Configurações atualizadas" });
  };

  return (
    <div className="flex h-screen bg-foodmax-gray-bg">
      <Sidebar open={sidebarOpen} onToggle={(next) => setSidebarOpen(typeof next === 'boolean' ? next : !sidebarOpen)} />
      <div className="flex-1 flex flex-col">
        <header className="bg-foodmax-gray-bg px-6 py-4">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 mr-3 rounded-lg border bg-white" aria-label="Abrir menu">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-semibold text-gray-800">Configurações</h2>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-3">Template de Promoção</h3>
              <Textarea rows={8} value={template} onChange={(e) => setTemplate(e.target.value)} className="foodmax-input resize-none" />
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-3">Imagens (URLs)</h3>
              <div className="flex gap-2 mb-3">
                <Input placeholder="https://..." value={newImage} onChange={(e) => setNewImage(e.target.value)} className="foodmax-input" />
                <Button
                  onClick={() => {
                    if (!newImage.trim()) return;
                    setImages((prev) => [...prev, newImage.trim()]);
                    setNewImage("");
                  }}
                >
                  Adicionar
                </Button>
              </div>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((src, idx) => (
                    <div key={idx} className="w-32">
                      <div className="w-full h-24 rounded border overflow-hidden bg-gray-50">
                        <img src={src} alt="img" className="w-full h-full object-cover" />
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}>Remover</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Button onClick={save} className="bg-foodmax-orange hover:bg-orange-600"><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
