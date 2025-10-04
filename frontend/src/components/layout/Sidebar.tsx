import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Package,
  Upload,
  Activity,
  FileText,
  RefreshCw,
  Sliders,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAuthStore } from '../../hooks/useAuth';

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  path: string;
}

interface SidebarProps {
  currentView: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ currentView, isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // All available menu items
  const allItems: SidebarItem[] = [
    { icon: BarChart3, title: "Dashboard", path: "dashboard" },
    { icon: Package, title: "Muestras", path: "samples" },
    { icon: Upload, title: "Importar", path: "imports" },
    { icon: Activity, title: "Movimientos", path: "movements" },
    { icon: FileText, title: "Kardex", path: "kardex" },
    { icon: RefreshCw, title: "Traslados", path: "transfers" },
    { icon: Sliders, title: "Configuraciones", path: "config" },
  ];

  // Admin-only items
  const adminItems: SidebarItem[] = [
    { icon: Users, title: "Gestión de Usuarios", path: "users" },
    { icon: Shield, title: "Seguridad", path: "security" },
  ];

  // Commercial user items (only dashboard)
  const commercialItems: SidebarItem[] = [
    { icon: BarChart3, title: "Dashboard", path: "dashboard" },
  ];

  // Determine which items to show based on user role
  const getItemsForRole = (role?: string): SidebarItem[] => {
    if (!role) return allItems;

    const roleUpper = role.toUpperCase();

    // Admin roles (various possible values)
    if (roleUpper === "ADMIN" || roleUpper === "ADMINISTRATOR" || roleUpper === "ADMINS") {
      return [...allItems, ...adminItems];
    }

    // Commercial roles
    if (roleUpper === "COMMERCIAL" || roleUpper === "COMERCIAL") {
      return commercialItems;
    }

    // User roles (default)
    return allItems;
  };

  const menuItems = getItemsForRole(user?.role);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleItemClick = (item: SidebarItem) => {
    navigate(`/${item.path}`);
    onClose(); // Close mobile sidebar after selection
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          fixed md:static inset-y-0 left-0 z-50
          bg-gradient-to-b from-white via-orange-50/30 to-white border-r border-orange-200/50 shadow-xl
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'w-16' : 'w-64'}
          flex flex-col h-screen md:h-auto
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-orange-200/50 bg-gradient-to-r from-orange-100/50 to-transparent flex items-center justify-between">
          {!collapsed && (
            <span className="font-bold text-orange-800">Menú</span>
          )}

          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex hover:bg-orange-100 text-orange-700"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="md:hidden hover:bg-orange-100 text-orange-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg
                    text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                      : 'text-gray-700 hover:bg-orange-100/80 hover:text-orange-700 hover:scale-102'
                    }
                    ${collapsed ? 'justify-center' : 'justify-start'}
                  `}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  {!collapsed && (
                    <span className="truncate">{item.title}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info */}
        {!collapsed && user?.email && (
          <div className="p-4 border-t border-orange-200/50 bg-gradient-to-r from-orange-100/50 to-transparent">
            <div className="text-xs text-gray-700 truncate mb-1 font-medium">
              📧 {user.email}
            </div>
            <div className="text-xs text-orange-700 truncate font-semibold">
              👤 {user.role || 'No definido'}
            </div>
            <div className="text-xs text-green-600 truncate font-medium mt-1">
              📊 {menuItems.length} módulos disponibles
            </div>
          </div>
        )}
      </div>
    </>
  );
}