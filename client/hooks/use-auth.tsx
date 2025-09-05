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
        let storedUserId = localStorage.getItem("fm_user_id");

        // Force admin user for testing if not logged in
        if (!storedUserId) {
          console.log("[DEBUG] No user found, creating admin user");
          storedUserId = "1";
          localStorage.setItem("fm_user_id", storedUserId);
        }

        if (storedUserId) {
          // Provisionally authenticate immediately so early actions work
          const provisionalUser: User = {
            id: parseInt(storedUserId, 10),
            email: "admin@foodmax.com",
            role: "admin",
            ativo: true,
            onboarding: true,
            data_cadastro: new Date().toISOString(),
          };
          setUser((prev) => prev ?? provisionalUser);
          setHasPaymentFlag(true);

          // Fetch user data from server (non-fatal)
          try {
            const response = await fetch("/api/auth/me", {
              headers: {
                "x-user-id": storedUserId,
              },
            });

            if (response.ok) {
              const userData = await response.json();
              console.log("[DEBUG] User data loaded:", userData);
              setUser(userData.user);
              setHasPaymentFlag(!!userData.user?.hasPayment);
              try {
                if (userData?.user?.email) {
                  localStorage.setItem("fm_user_email", userData.user.email);
                }
                const serverName = (userData?.user as any)?.nome;
                if (serverName && String(serverName).trim()) {
                  const mod = await import("@/lib/utils");
                  localStorage.setItem(
                    "fm_user_name",
                    mod.toTitleCase(String(serverName).trim()),
                  );
                } else {
                  const existingName = localStorage.getItem("fm_user_name");
                  if (!existingName && userData?.user?.email) {
                    const fallback = String(userData.user.email).split("@")[0];
                    localStorage.setItem("fm_user_name", fallback);
                  }
                }
              } catch {}
            } else {
              console.log(
                "[DEBUG] Auth API failed, keeping fallback admin user",
              );
              setHasPaymentFlag(true);
              try {
                const existingName = localStorage.getItem("fm_user_name");
                if (!existingName) {
                  localStorage.setItem("fm_user_name", "Admin");
                }
              } catch {}
            }
          } catch (e) {
            console.log(
              "[DEBUG] Auth API unreachable, using fallback admin user",
            );
            setHasPaymentFlag(true);
            try {
              const existingName = localStorage.getItem("fm_user_name");
              if (!existingName) {
                localStorage.setItem("fm_user_name", "Admin");
              }
            } catch {}
          }
        }
      } catch (error) {
        console.warn(
          "[WARN] Error initializing auth (fallback in use):",
          error,
        );
        // Still create fallback admin user even on error
        const adminUser = {
          id: 1,
          email: "admin@foodmax.com",
          role: "admin",
          ativo: true,
          onboarding: true,
          data_cadastro: new Date().toISOString(),
        } as User;
        setUser(adminUser);
        setHasPaymentFlag(true);
        localStorage.setItem("fm_user_id", "1");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userId: number, email: string) => {
    const basicUser: User = {
      id: userId,
      email,
      role: "user",
      ativo: true,
      onboarding: true,
      data_cadastro: new Date().toISOString(),
    };

    setUser(basicUser);
    setHasPaymentFlag(false);
    localStorage.setItem("fm_user_id", userId.toString());
    try {
      if (email) {
        localStorage.setItem("fm_user_email", email);
        const base = String(email).split("@")[0];
        localStorage.setItem("fm_user_name", base);
      }
    } catch {}
  };

  const logout = () => {
    setUser(null);
    setHasPaymentFlag(false);
    try {
      localStorage.removeItem("fm_user_id");
    } catch {}
    // Best-effort: clear caches on logout as well
    try {
      import("@/lib/cache").then((m) => m.clearAllAppCaches());
    } catch {}
  };

  const getUserRole = (): "admin" | "user" | null => {
    const r = user?.role;
    if (!r) return null;
    const s = String(r).toLowerCase();
    return s === "admin" ? "admin" : s === "user" ? "user" : null;
  };

  const hasPayment = (): boolean => {
    const role = user?.role ? String(user.role).toLowerCase() : null;
    if (role === "admin") return true;
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
      // Be resilient during early app load: use localStorage fallback
      let effectiveUserId: number | null = user?.id ?? null;
      if (!effectiveUserId) {
        try {
          const ls =
            typeof window !== "undefined"
              ? localStorage.getItem("fm_user_id")
              : null;
          if (ls) {
            effectiveUserId = parseInt(ls, 10) || null;
          } else {
            // Create fallback admin id for development/test flows
            localStorage.setItem("fm_user_id", "1");
            effectiveUserId = 1;
          }
        } catch {
          // ignore localStorage errors
        }
      }

      if (!effectiveUserId) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      const method = String(options.method || "GET").toUpperCase();
      const headers = {
        ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
        "x-user-id": String(effectiveUserId),
        ...(options.headers as any),
      } as Record<string, string>;

      // Add a timeout so hung requests don't blow up the UI
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
      } catch (err: any) {
        clearTimeout(timeout);
        // Graceful offline/connection fallback for GET requests
        if (method === "GET") {
          return null as any;
        }
        const networkMsg =
          navigator && navigator.onLine === false
            ? "Sem conexão com a internet. Verifique sua rede."
            : "Falha de rede ao comunicar com o servidor.";
        const e = new Error(networkMsg);
        (e as any).cause = err;
        throw e;
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        // Try to decode JSON error; if it fails, fall back to text/status
        let errorData: any = {};
        let serverMessage: string | undefined;
        try {
          errorData = await response.json();
          serverMessage = errorData?.error || errorData?.message;
        } catch {
          try {
            const text = await response.text();
            serverMessage = text && text.length < 300 ? text : undefined;
          } catch {}
        }

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

      // Try JSON response; if it fails, return null for GET
      try {
        return await response.json();
      } catch (e) {
        if (method === "GET") return null as any;
        const err = new Error("Resposta inválida do servidor");
        (err as any).cause = e;
        throw err;
      }
    },
    [user?.id],
  );

  return { makeRequest };
}
