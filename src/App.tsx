import { useEffect, useState } from 'react';
import { fetchApiJson } from '@/lib/apiFetch';
import { Sidebar } from './components/layout/Sidebar';
import { Menu, X } from 'lucide-react';
import { BiHome } from './pages/BiHome';
import type { BiHomeNavigateTab } from './pages/BiHome';
import { BiSector } from './pages/BiSector';
import { BiHistorico } from './pages/BiHistorico';
import { BiFunerario } from './pages/BiFunerario';
import { SegurosLaFeMark } from './components/brand/SegurosLaFeMark';

type Tab = 'home' | 'sector' | 'historico' | 'funerario' | 'datos';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 bg-[#F0F4FB]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(id) => setActiveTab(id as Tab)}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[#7823BD]/10 bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] shadow-sm sm:min-h-16 sm:px-5 sm:pb-0">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7823BD]/15 bg-[#F0F4FB] text-[#7823BD] lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <SegurosLaFeMark variant="header" />
            <h1 className="truncate text-base font-bold text-[#7823BD] sm:text-lg">
              {activeTab === 'home' && 'Inicio'}
              {activeTab === 'sector' && 'BI Sectorial'}
              {activeTab === 'historico' && 'BI Histórico'}
              {activeTab === 'funerario' && 'BI Funerario'}
              {activeTab === 'datos' && 'Datos técnicos'}
            </h1>
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="mx-auto min-w-0 max-w-6xl">
            {activeTab === 'home' && (
              <BiHome onNavigateTab={(t: BiHomeNavigateTab) => setActiveTab(t)} />
            )}
            {activeTab === 'sector' && (
              <BiSector onOpenFunerario={() => setActiveTab('funerario')} />
            )}
            {activeTab === 'historico' && <BiHistorico />}
            {activeTab === 'funerario' && <BiFunerario />}
            {activeTab === 'datos' && <DataFilesPanel />}
          </div>
        </div>
      </main>
    </div>
  );
}

function DataFilesPanel() {
  const [info, setInfo] = useState<{ files?: string[]; dataDir?: string } | null>(null);

  useEffect(() => {
    fetchApiJson<{ files?: string[]; dataDir?: string }>('/api/data-files')
      .then(setInfo)
      .catch(() => setInfo({}));
  }, []);

  return (
    <div className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-[#7823BD]">Conjuntos de datos cargados</h2>
      <p className="mt-1 text-sm text-slate-500">
        Listado de tablas fuente disponibles en esta instalación (uso técnico o auditoría).
      </p>
      {info?.dataDir ? (
        <p className="mt-2 text-xs text-slate-400">Origen interno configurado para el servidor.</p>
      ) : null}
      <ul className="mt-4 space-y-1 font-mono text-xs text-slate-700">
        {info?.files?.map((f) => (
          <li key={f} className="rounded bg-slate-50 px-2 py-1">
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
