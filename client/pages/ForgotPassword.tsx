import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ErrorResponse,
} from "@shared/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (!email) {
      setError("Por favor, digite seu email");
      setIsLoading(false);
      return;
    }

    try {
      const forgotPasswordData: ForgotPasswordRequest = { email };

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(forgotPasswordData),
      });

      const data: ForgotPasswordResponse | ErrorResponse =
        await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        setError(errorData.error || "Erro ao processar solicitação");
        return;
      }

      const successData = data as ForgotPasswordResponse;

      if (successData.success) {
        setMessage(successData.message);
      } else {
        setError("Erro ao processar solicitação");
      }
    } catch (err) {
      setError("Erro de conectividade. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-foodmax-gray-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-foodmax-red/30">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa7bafc3970304eb0878591251d4a4ab7%2F5e17dcb490c545d2af9805fbbed2e376?format=webp&width=800"
              alt="FoodMax Logo"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">FoodMax</h1>
          <p className="text-gray-600 text-lg">Gestão Gastronômica</p>
        </div>

        {/* Forgot password form card */}
        <div className="foodmax-card-shadow-red p-8 shadow-lg shadow-foodmax-red/20 border-t-4 border-foodmax-red">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-2">
            Esqueceu sua senha?
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Digite seu email e enviaremos instruções para redefinir sua senha
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu email"
                  className="foodmax-input pl-10"
                  required
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full foodmax-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Enviando..." : "Enviar"}
            </button>
          </form>

          {/* Back to login link */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-foodmax-red hover:text-red-700 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
