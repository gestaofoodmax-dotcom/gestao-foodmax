import { useState } from "react";
import {
  User,
  Phone,
  CheckCircle,
  XCircle,
  Gift,
  CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  OnboardingRequest,
  OnboardingResponse,
  ErrorResponse,
} from "@shared/auth";

export default function Onboarding() {
  const [formData, setFormData] = useState({
    nome: "",
    ddi: "+55",
    telefone: "",
  });
  const [selectedPlan, setSelectedPlan] = useState<"free" | "paid" | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFinish = async () => {
    if (!formData.nome || !formData.telefone || !selectedPlan) {
      setError("Por favor, preencha todos os campos e escolha um plano");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const onboardingData: OnboardingRequest = {
        nome: formData.nome,
        ddi: formData.ddi,
        telefone: formData.telefone,
        selectedPlan: selectedPlan!,
      };

      const userId = localStorage.getItem("fm_user_id");
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
        },
        body: JSON.stringify(onboardingData),
      });

      const data: OnboardingResponse | ErrorResponse = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        setError(errorData.error || "Erro ao finalizar cadastro");
        return;
      }

      const successData = data as OnboardingResponse;

      if (successData.success) {
        try {
          const mod = await import("@/lib/utils");
          localStorage.setItem("fm_user_name", mod.toTitleCase(formData.nome || ""));
        } catch {}
        navigate("/dashboard");
      } else {
        setError(successData.message || "Erro ao finalizar cadastro");
      }
    } catch (err) {
      setError("Erro de conectividade. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-foodmax-gray-bg p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with logo */}
        <div className="text-center mb-8 pt-8">
          <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-foodmax-red/30">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa7bafc3970304eb0878591251d4a4ab7%2F5e17dcb490c545d2af9805fbbed2e376?format=webp&width=800"
              alt="FoodMax Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Bem-Vindo ao FoodMax!
          </h1>
          <p className="text-gray-600">
            Falta pouco para você revolucionar a gestão do seu negócio.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg shadow-foodmax-red/20 border-t-4 border-foodmax-red p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Complete data */}
          <div className="mb-8">
            <div className="border-b border-foodmax-red pb-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                1 - Complete seus dados
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nome */}
              <div className="md:col-span-1">
                <label
                  htmlFor="nome"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nome <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Nome completo"
                    className="foodmax-input pl-10"
                    required
                  />
                </div>
              </div>

              {/* DDI */}
              <div className="md:col-span-1">
                <label
                  htmlFor="ddi"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  DDI
                </label>
                <select
                  id="ddi"
                  name="ddi"
                  value={formData.ddi}
                  onChange={handleInputChange}
                  className="foodmax-input"
                >
                  <option value="+55">+55</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+33">+33</option>
                  <option value="+49">+49</option>
                </select>
              </div>

              {/* Telefone */}
              <div className="md:col-span-1">
                <label
                  htmlFor="telefone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Telefone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="DDD + número telefone"
                    className="foodmax-input pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Choose plan */}
          <div className="mb-8">
            <div className="border-b border-foodmax-red pb-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                2 - Escolha seu plano
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Free plan */}
              <div
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPlan === "free"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setSelectedPlan("free")}
              >
                <div className="flex items-center mb-4">
                  <Gift className="w-6 h-6 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-600">
                    Testar Grátis
                  </h3>
                </div>

                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />5
                    dias para testar
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />1
                    Estabelecimento
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Relatórios
                  </li>
                  <li className="flex items-center text-sm">
                    <XCircle className="w-4 h-4 text-red-500 mr-2" />
                    Envio de promoção
                  </li>
                  <li className="flex items-center text-sm">
                    <XCircle className="w-4 h-4 text-red-500 mr-2" />
                    Importação de dados
                  </li>
                </ul>
              </div>

              {/* Paid plan */}
              <div
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPlan === "paid"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
                onClick={() => setSelectedPlan("paid")}
              >
                <div className="flex items-center mb-4">
                  <CreditCard className="w-6 h-6 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold text-green-600">
                    Assinar Plano
                  </h3>
                </div>

                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Acesso ilimitado
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Estabelecimentos ilimitados
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Relatórios
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Envio de promoção
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Importação de dados
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Finish button */}
          <div className="text-center">
            <button
              onClick={handleFinish}
              disabled={isLoading || !selectedPlan}
              className="foodmax-button-primary px-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Finalizando..." : "Finalizar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
