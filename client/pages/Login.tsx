import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { LoginRequest, LoginResponse, ErrorResponse } from "@shared/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Clear all caches before attempting login, as requested
    try {
      const mod = await import("@/lib/cache");
      await mod.clearAllAppCaches();
    } catch {}

    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      setIsLoading(false);
      return;
    }

    try {
      const loginData: LoginRequest = { email, password };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data: LoginResponse | ErrorResponse = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        setError(errorData.error || "Erro ao fazer login");
        return;
      }

      const successData = data as LoginResponse;

      if (successData.success) {
        // Save user id for later API calls
        try {
          const anyData: any = successData as any;
          if (anyData?.user?.id) {
            localStorage.setItem("fm_user_id", String(anyData.user.id));
          }
        } catch {}
        // Check if user needs onboarding
        if (successData.needsOnboarding) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      } else {
        setError(successData.message || "Erro ao fazer login");
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
          {/* Food icon with red background */}
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

        {/* Login form card */}
        <div className="foodmax-card-shadow-red p-8 shadow-lg shadow-foodmax-red/20 border-t-4 border-foodmax-red">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Login
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
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

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="foodmax-input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full foodmax-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <Link
              to="/forgot-password"
              className="text-foodmax-red hover:text-red-700 text-sm"
            >
              Esqueceu sua senha?
            </Link>
            <div className="text-gray-500 text-sm">ou</div>
            <div className="text-sm text-gray-600">
              Não tem uma conta?{" "}
              <Link
                to="/register"
                className="text-foodmax-red hover:text-red-700 font-medium"
              >
                Criar conta gratuita
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
