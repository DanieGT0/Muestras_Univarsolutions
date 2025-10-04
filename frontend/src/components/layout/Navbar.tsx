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
    <header className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 shadow-lg border-b border-orange-700/30 sticky top-0 z-50 backdrop-blur-sm">
      <div className="px-4 h-16 flex items-center justify-between">
        {/* Logo and Menu Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="md:hidden text-white hover:bg-white/20"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-auto bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center px-3 py-2 shadow-xl ring-2 ring-white/30">
              <img
                src={logo}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-white hidden sm:block drop-shadow-lg">
              Sistema de Muestras
            </h1>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-white drop-shadow">
              {user?.full_name || user?.email}
            </span>
            <span className="text-xs text-white/80">
              {user?.role || 'Usuario'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="bg-white/90 backdrop-blur-sm border-white/50 text-orange-600 hover:bg-white hover:text-orange-700 font-semibold shadow-lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}