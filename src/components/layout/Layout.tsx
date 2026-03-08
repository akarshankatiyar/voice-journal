import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAppStore } from '@/store/useAppStore';
import { Menu } from 'lucide-react';

export function Layout() {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="min-h-screen flex w-full overflow-x-hidden">
      <AppSidebar />
      {/* Fixed hamburger button — only visible when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border text-foreground shadow-md hover:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <main
        className="flex-1 min-h-screen transition-all duration-300 min-w-0"
        style={{ marginLeft: sidebarOpen ? 260 : 0 }}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
