import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@shared/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userId: number, email: string) => void;
  logout: () => void;
  getUserRole: () => "admin" | "user" | null;
  hasPayment: () => boolean;
  getUserId: () => number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPaymentFlag, setHasPaymentFlag] = useState<boolean>(false);

  const isAuthenticated = !!user;

  // Initialize user from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUserId = localStorage.getItem("fm_user_id");

        if (storedUserId) {
          // Fetch user data from server
          const response = await fetch("/api/auth/me", {
            headers: {
              "x-user-id": storedUserId,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
            setHasPaymentFlag(!!userData.user?.hasPayment);
          } else {
            // Invalid stored user, clear localStorage
            localStorage.removeItem("fm_user_id");
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        localStorage.removeItem("fm_user_id");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userId: number, email: string) => {
    // Store basic user info (we'll fetch full data from server later)
    const basicUser: User = {
      id: userId,
      email,
      role: "user", // Will be updated when full data is fetched
      ativo: true,
      onboarding: true,
      data_cadastro: new Date().toISOString(),
    };

    setUser(basicUser);
    setHasPaymentFlag(false);
    localStorage.setItem("fm_user_id", userId.toString());
  };

  const logout = () => {
    setUser(null);
    setHasPaymentFlag(false);
    localStorage.removeItem("fm_user_id");
  };

  const getUserRole = (): "admin" | "user" | null => {
    const r = user?.role;
    if (!r) return null;
    const s = String(r).toLowerCase();
    return s === "admin" ? "admin" : s === "user" ? "user" : "user";
  };

  const hasPayment = (): boolean => {
    if (user?.role === "admin") return true;
    const fromUser = (user as any)?.hasPayment;
    return Boolean(fromUser ?? hasPaymentFlag);
  };

  const getUserId = (): number | null => {
    return user?.id || null;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    getUserRole,
    hasPayment,
    getUserId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Higher-order component for protecting routes
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foodmax-orange"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Acesso negado
            </h2>
            <p className="text-gray-600">
              Você precisa estar logado para acessar esta página.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// Hook for making authenticated API requests
export function useAuthenticatedRequest() {
  const { user, isAuthenticated } = useAuth();

  const makeRequest = React.useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!isAuthenticated) {
        throw new Error("Você precisa estar logado para realizar esta ação.");
      }

      const userId = user?.id;
      if (!userId) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      const headers = {
        "Content-Type": "application/json",
        "x-user-id": userId.toString(),
        ...options.headers,
      } as Record<string, string>;

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}) as any);
        const serverMessage =
          (errorData as any)?.error || (errorData as any)?.message;
        let friendly = serverMessage as string | undefined;
        if (!friendly) {
          switch (response.status) {
            case 401:
              friendly = "Você precisa estar logado para realizar esta ação.";
              break;
            case 403:
              friendly = "Você não tem permissão para realizar esta ação.";
              break;
            case 404:
              friendly = "Recurso não encontrado.";
              break;
            case 409:
              friendly =
                "Não é possível excluir: existem dependências vinculadas a este registro.";
              break;
            default:
              friendly = `Erro ${response.status}`;
          }
        }
        const err = new Error(friendly);
        (err as any).status = response.status;
        (err as any).data = errorData;
        throw err;
      }

      return response.json();
    },
    [isAuthenticated, user?.id],
  );

  return { makeRequest };
}
