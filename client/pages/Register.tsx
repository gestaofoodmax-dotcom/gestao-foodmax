import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { RegisterRequest, RegisterResponse, ErrorResponse } from "@shared/auth";

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("NITDM");
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasLetter && hasNumber && hasSymbol;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validations
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("Todos os campos são obrigatórios");
      setIsLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      setError(
        "A senha deve conter pelo menos 8 caracteres, incluindo letras, números e símbolos",
      );
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    if (!captchaVerified) {
      setError("Por favor, complete a verificação de segurança");
      setIsLoading(false);
      return;
    }

    try {
      const registerData: RegisterRequest = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      const data: RegisterResponse | ErrorResponse = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        setError(errorData.error || "Erro ao criar conta");
        return;
      }

      const successData = data as RegisterResponse;

      if (successData.success) {
        // Save user id for onboarding header
        try {
          const anyData: any = successData as any;
          if (anyData?.user?.id) {
            localStorage.setItem("fm_user_id", String(anyData.user.id));
          }
        } catch {}
        // Redirect to onboarding
        navigate("/onboarding");
      } else {
        setError(successData.message || "Erro ao criar conta");
      }
    } catch (err) {
      setError("Erro de conectividade. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaVerified(false);
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

        {/* Registration form card */}
        <div className="foodmax-card-shadow-red p-8 shadow-lg shadow-foodmax-red/20 border-t-4 border-foodmax-red">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Criar Conta
          </h2>

          {error && (
            <div
              className={`mb-4 p-3 border rounded-lg ${
                error.includes("sucesso")
                  ? "bg-green-100 border-green-400 text-green-700"
                  : "bg-red-100 border-red-400 text-red-700"
              }`}
            >
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
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
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
                Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Mínimo 8 caracteres"
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
              <p className="text-xs text-gray-500 mt-1">
                Deve conter letras, números e símbolos
              </p>
            </div>

            {/* Confirm Password field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirmar Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirme sua senha"
                  className="foodmax-input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Captcha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verificação de Segurança
              </label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center space-x-4 mb-3">
                  <input
                    type="checkbox"
                    id="robotCheck"
                    checked={captchaVerified}
                    onChange={(e) => setCaptchaVerified(e.target.checked)}
                    className="w-4 h-4 text-foodmax-red"
                  />
                  <label htmlFor="robotCheck" className="text-sm text-gray-700">
                    Não sou um robô
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="bg-white border rounded px-3 py-2 font-mono text-lg tracking-wider">
                    {captchaCode}
                  </div>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Digite o código acima"
                  className="w-full mt-2 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-foodmax-red"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full foodmax-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Criando Conta..." : "Criar Conta"}
            </button>
          </form>

          {/* Link to login */}
          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <Link
                to="/login"
                className="text-foodmax-red hover:text-red-700 font-medium"
              >
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
