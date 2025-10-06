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
    <header className="relative bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/80 sticky top-0 z-50">
      {/* Subtle gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700"></div>

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
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl blur-sm opacity-0 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative h-11 w-auto bg-white rounded-xl flex items-center justify-center px-3 py-2 shadow-md border border-gray-200/50 group-hover:border-blue-300/50 transition-all">
                <img
                  src={logo}
                  alt="Logo"
                  className="h-9 w-auto object-contain"
                />
              </div>
            </div>
            <div className="hidden sm:block border-l border-gray-300 pl-4 h-8">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Sistema de Muestras
              </h1>
              <p className="text-xs text-gray-500 font-medium">Gestión y Control</p>
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {/* User Info Card */}
          <div className="hidden sm:flex items-center gap-3 bg-gray-50/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-200/50 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 leading-tight">
                {user?.full_name || user?.email}
              </span>
              <span className="text-xs text-gray-600 font-medium">
                {user?.role || 'Usuario'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-700 font-semibold shadow-sm transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}