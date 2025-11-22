import React, { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Home, FileText, Calendar, Activity, LogOut, Pill, TrendingUp, MessageSquare, Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentPage, setCurrentPage, signOut } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'records', label: 'Medical Records', icon: FileText },
    { id: 'care-plan', label: 'Care Plan', icon: Calendar },
    { id: 'insights', label: 'Insights', icon: Activity },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'treatment-tracker', label: 'Tracker', icon: TrendingUp },
  ];

  const handleNav = (page: string, onNavigate?: () => void) => {
    setCurrentPage(page);
    navigate('/');
    onNavigate?.();
  };

  const renderNavItems = (onNavigate?: () => void) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = currentPage === item.id;
      return (
        <button
          key={item.id}
          onClick={() => {
            handleNav(item.id, onNavigate);
          }}
          className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Icon className="w-4 h-4 mr-3" />
          {item.label}
        </button>
      );
    });

  return (
    <div className="min-h-screen bg-app dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-400 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-800 dark:text-gray-100">Beat Cancer AI</span>
          </div>
          <div className="hidden xl:block">
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
          {renderNavItems()}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm sticky top-0 z-40">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-400 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Beat Cancer AI</span>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setMobileOpen((open) => !open)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
          {mobileOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {renderNavItems(() => setMobileOpen(false))}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-white"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 md:py-10 max-w-7xl safe-area-below-nav">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
