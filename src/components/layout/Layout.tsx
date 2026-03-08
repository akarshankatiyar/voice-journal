import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAppStore } from '@/store/useAppStore';

export function Layout() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen flex w-full overflow-x-hidden">
      <AppSidebar />
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
