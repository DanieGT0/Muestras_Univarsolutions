import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Extract current view from pathname
  const currentView = location.pathname.split('/')[1] || 'dashboard';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Navbar onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/80 via-white/50 to-orange-50/60 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}