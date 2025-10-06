import { FileText, Users, Calendar, Settings, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  activeView: 'projekte' | 'kunden' | 'termine' | 'einstellungen';
  onNavigate: (view: 'projekte' | 'kunden' | 'termine' | 'einstellungen') => void;
}

export function Navigation({ activeView, onNavigate }: NavigationProps) {
  const navItems = [
    { id: 'projekte' as const, label: 'Projekte', icon: FileText },
    { id: 'kunden' as const, label: 'Kunden', icon: Users },
    { id: 'termine' as const, label: 'Termine', icon: Calendar },
    { id: 'einstellungen' as const, label: 'Einstellungen', icon: Settings },
  ];

  return (
    <>
      {/* Desktop / Tablet Topbar */}
      <nav className="hidden sm:block app-gradient border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 py-3">
            <img
              src="https://i.postimg.cc/Vsqw5gDN/logo-maler.png"
              alt="Farbimpuls Logo"
              className="h-10 w-auto"
            />
            <div className="flex gap-2 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors
                      ${isActive ? 'bg-white text-primary shadow' : 'text-gray-700 hover:text-black hover:bg-white/70'}`}
                  >
                    <span className="inline-flex items-center gap-2"><Icon size={18} />{item.label}</span>
                  </button>
                );
              })}
              <div className="flex-1" />
              <button onClick={()=>supabase.auth.signOut()}
                className="px-3 py-2 rounded-xl text-gray-700 hover:text-black hover:bg-white/70 flex items-center gap-2">
                <LogOut size={18} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center py-3 text-xs ${isActive ? 'text-primary' : 'text-gray-600'}`}
              >
                <Icon size={22} />
                <span className="mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
