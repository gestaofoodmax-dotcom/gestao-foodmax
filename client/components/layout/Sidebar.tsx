import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Menu,
  Home,
  Users,
  Truck,
  List,
  Utensils,
  ShoppingBag,
  Store,
  Package,
  ChevronDown,
  ChevronUp,
  LogOut,
  Bike,
  Motorcycle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toTitleCase } from "@/lib/utils";

export interface SidebarProps {
  open: boolean;
  onToggle: (next?: boolean) => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  // Default groups expanded when sidebar is open
  const [groupsOpen, setGroupsOpen] = useState<{ [k: string]: boolean }>({
    gestao: true,
    operacoes: true,
    compra: true,
    venda: true,
  });

  useEffect(() => {
    // Collapse groups when sidebar closed to save space
    if (!open) {
      setGroupsOpen((prev) => ({
        ...prev,
        gestao: false,
        operacoes: false,
        compra: false,
        venda: false,
      }));
    } else {
      setGroupsOpen((prev) => ({
        ...prev,
        gestao: true,
        operacoes: true,
        compra: true,
        venda: true,
      }));
    }
  }, [open]);

  const activeClass =
    "bg-orange-50 text-foodmax-orange border-r-4 border-foodmax-orange";
  const linkBase = "w-full flex items-center px-4 py-2 text-left text-black";

  const menuGroups = useMemo(
    () => [
      {
        key: "gestao",
        label: "Gestão",
        items: [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          {
            icon: Store,
            label: "Estabelecimentos",
            route: "/estabelecimentos",
          },
          { icon: Users, label: "Clientes", route: "/clientes" },
          { icon: Truck, label: "Fornecedores", route: "/fornecedores" },
        ],
      },
      {
        key: "operacoes",
        label: "Operações",
        items: [
          { icon: List, label: "Itens", route: "/itens" },
          { icon: Utensils, label: "Cardápios", route: "/cardapios" },
        ],
      },
      {
        key: "compra",
        label: "Compra",
        items: [
          { icon: Package, label: "Abastecimentos", route: "/abastecimentos" },
        ],
      },
      {
        key: "venda",
        label: "Venda",
        items: [
          { icon: ShoppingBag, label: "Pedidos", route: "/pedidos" },
          { icon: Motorcycle, label: "Entregas", route: "/entregas" },
        ],
      },
    ],
    [],
  );

  const displayName = useMemo(() => {
    try {
      const stored = localStorage.getItem("fm_user_name");
      if (stored && stored.trim()) return toTitleCase(stored.trim());
    } catch {}
    const email = user?.email || "";
    const base = email.split("@")[0] || "Usuário";
    return toTitleCase(base);
  }, [user?.email]);

  // Wrapper styles: fixed column on desktop; overlay on mobile when open
  const wrapperBase = "bg-white shadow-lg flex flex-col h-full";
  const widthClass = open ? "w-64" : "w-16";
  const desktopClass = `${widthClass} ${wrapperBase}`;
  const mobileClass = open
    ? `fixed inset-y-0 left-0 z-50 w-64 ${wrapperBase}`
    : "hidden";

  return (
    <div className={isMobile ? mobileClass : desktopClass}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {/* Top: Logo + name + slogan + hamburger */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white border">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fa7bafc3970304eb0878591251d4a4ab7%2F5e17dcb490c545d2af9805fbbed2e376?format=webp&width=200"
                  alt="FoodMax"
                  className="w-full h-full object-contain"
                />
              </div>
              {open && (
                <div>
                  <h1 className="font-bold text-lg text-gray-800 leading-tight">
                    FoodMax
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">
                    Gestão Gastronômica
                  </p>
                </div>
              )}
            </Link>
            <button
              onClick={() => onToggle(!open)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label={open ? "Minimizar menu" : "Maximizar menu"}
              title={open ? "Minimizar" : "Maximizar"}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Groups */}
        {menuGroups.map((group) => (
          <div key={group.key}>
            {open && (
              <button
                onClick={() =>
                  setGroupsOpen((prev) => ({
                    ...prev,
                    [group.key]: !prev[group.key],
                  }))
                }
                className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 uppercase tracking-wide"
              >
                <span>{group.label}</span>
                {groupsOpen[group.key] ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
            <nav className="pb-2">
              {(open ? groupsOpen[group.key] : true) &&
                group.items.map((item) => {
                  const isActive = location.pathname === item.route;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.route}
                      to={item.route}
                      className={`${linkBase} ${isActive ? activeClass : "hover:bg-gray-100"}`}
                      onClick={() => {
                        if (isMobile) onToggle(false);
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {open && (
                        <span className="ml-3 text-sm">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom fixed user area */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center px-4 py-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">
              {displayName.charAt(0)}
            </span>
          </div>
          {open && (
            <div className="ml-3 flex-1 flex items-center justify-between">
              <Link to="/minha-conta" className="block">
                <div className="text-sm font-medium text-gray-800">
                  {displayName}
                </div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="flex items-center gap-1 text-sm text-gray-700 hover:text-foodmax-orange"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
