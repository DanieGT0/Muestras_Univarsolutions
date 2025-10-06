import { LogOut, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuthStore } from '../../hooks/useAuth';
import logo from '../../assets/univar.webp';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-6 h-16 flex items-center justify-between">
        {/* Logo and Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="md:hidden text-gray-700 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-10 w-auto flex items-center">
              <img
                src={logo}
                alt="Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block border-l border-gray-200 pl-4">
              <h1 className="text-sm font-semibold text-gray-900">
                Sistema de Muestras
              </h1>
              <p className="text-xs text-gray-500">Gestión y Control</p>
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {/* User Info */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-medium">
              {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {user?.full_name || user?.email}
              </span>
              <span className="text-xs text-gray-500">
                {user?.role || 'Usuario'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}