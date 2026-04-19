import {
  LayoutDashboard,
  Building2,
  LineChart,
  LayoutGrid,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegurosLaFeMark } from '../brand/SegurosLaFeMark';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

const items = [
  { id: 'home', label: 'Inicio', icon: LayoutDashboard },
  { id: 'sector', label: 'BI Sectorial', icon: Building2 },
  { id: 'historico', label: 'BI Histórico', icon: LineChart },
  { id: 'funerario', label: 'BI Funerario', icon: LayoutGrid },
  { id: 'datos', label: 'Datos técnicos', icon: FileText },
];

export function Sidebar({ activeTab, setActiveTab, mobileOpen = false, onNavigate }: SidebarProps) {
  const select = (id: string) => {
    setActiveTab(id);
    onNavigate?.();
  };

  return (
    <div
      id="app-sidebar"
      role="navigation"
      aria-label="Menú principal"
      className={cn(
        'flex h-full min-h-0 w-[min(18rem,88vw)] shrink-0 flex-col border-r border-[#7823BD]/25 bg-gradient-to-b from-[#7823BD] via-[#5a2d8f] to-[#0f2e5f] text-[#EDE7F6]',
        'fixed inset-y-0 left-0 z-50 shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-72 lg:translate-x-0 lg:shadow-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="min-w-0 overflow-visible border-b border-white/10 px-6 pb-5 pt-6 sm:px-7">
        <SegurosLaFeMark variant="sidebar" />
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item.id)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
              activeTab === item.id
                ? 'bg-white text-[#7823BD] shadow-sm'
                : 'text-[#b8c0e0] hover:bg-white/5 hover:text-white'
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium leading-snug">{item.label}</span>
            </span>
            {activeTab === item.id && <ChevronRight className="h-4 w-4 shrink-0 text-[#7823BD]" />}
          </button>
        ))}
      </nav>
      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="text-[10px] leading-relaxed text-[#8892c4]">
          <p className="font-semibold text-[#a8b0d0]">Fuentes de la información</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 marker:text-[#6b7399]">
            <li>
              <span className="text-[#c4c9e8]">SUDEASEG</span> — estadísticas públicas del sector asegurador.
            </li>
            <li>
              <span className="text-[#c4c9e8]">BCV</span> — tipo de cambio oficial (referencia para series en USD).
            </li>
          </ul>
        </div>
        <p className="text-[10px] leading-relaxed text-[#9aa3cc]">
          <span className="font-semibold text-[#c4c9e8]">Contacto:</span>{' '}
          <a
            href="mailto:acolmenares@seguroslafe.com"
            className="break-all text-[#FFC857] underline-offset-2 hover:underline"
          >
            acolmenares@seguroslafe.com
          </a>
        </p>
      </div>
    </div>
  );
}
