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
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 h-16 flex items-center justify-between">
        {/* Logo and Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-auto bg-white rounded-lg flex items-center justify-center px-3 py-2 shadow-sm">
              <img
                src={logo}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">
              Sistema de Muestras
            </h1>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700 hidden sm:inline">
            Bienvenido, {user?.full_name || user?.email}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}