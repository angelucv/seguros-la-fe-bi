import { useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Menu, X } from 'lucide-react';
import { BiHome } from './pages/BiHome';
import type { BiHomeNavigateTab } from './pages/BiHome';
import { BiSector } from './pages/BiSector';
import { BiHistorico } from './pages/BiHistorico';
import { BiFunerario } from './pages/BiFunerario';
import { SegurosLaFeMark } from './components/brand/SegurosLaFeMark';
import { FuentesInformacion } from './components/bi/FuentesInformacion';

type Tab = 'home' | 'sector' | 'historico' | 'funerario' | 'fuentes';

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
              {activeTab === 'fuentes' && 'Fuentes'}
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
            {activeTab === 'fuentes' && <FuentesInformacion />}
          </div>
        </div>
      </main>
    </div>
  );
}
