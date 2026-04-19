import { useEffect, useState, type ReactNode } from 'react';
import { fetchApiJson } from '@/lib/apiFetch';
import { ArrowRight, BookOpen, Database, LayoutGrid, LineChart, PieChart } from 'lucide-react';
import { APP_NAME } from './biConstants';
import { HomeGlossaryContent } from '../components/bi/HomeGlossary';
import { ResultadoTecnicoSection, type ResultadoPayload } from '../components/bi/ResultadoTecnicoSection';
import { SegurosLaFeMark } from '../components/brand/SegurosLaFeMark';

type HomeApi = {
  /** Presente en APIs recientes; si falta, otra instancia o proxy viejo. */
  serverMark?: string;
  vistaResultado?: string;
  _meta?: { mark: string; resultadoTabla: string };
  ultimoCierre: string;
  peerIdsAnalisis: string[];
  resultado: ResultadoPayload | null;
  cortesResultado: { value: string; label: string }[];
  defaultCorte: string;
  periodoPrimas?: { minFecha: string; maxFecha: string };
  anuarioReferenceYear?: number;
};

export type BiHomeNavigateTab = 'home' | 'sector' | 'historico' | 'funerario' | 'datos';

type BiHomeProps = {
  onNavigateTab?: (tab: BiHomeNavigateTab) => void;
};

export function BiHome({ onNavigateTab }: BiHomeProps) {
  const [data, setData] = useState<HomeApi | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchApiJson<HomeApi>('/api/bi/home')
      .then((j) => setData(j))
      .catch((e: unknown) => setErr(String(e)));
  }, []);

  const go = onNavigateTab ?? (() => {});

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-8">
        <SegurosLaFeMark variant="hero" className="mb-6" />
        <p className="text-center text-lg font-semibold text-[#7823BD]">{APP_NAME}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Posición de <strong>Seguros La Fe</strong> en el mercado asegurador venezolano, con base en{' '}
          <strong>información estadística pública</strong> (SUDEASEG y tipo de cambio BCV cuando aplica).
        </p>
        {data && data.periodoPrimas && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Cobertura de primas:{' '}
            <strong className="text-slate-700">
              {data.periodoPrimas.minFecha.slice(0, 7)} — {data.periodoPrimas.maxFecha.slice(0, 7)}
            </strong>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-[#7823BD]">Accesos rápidos</h2>
        <p className="mt-2 text-sm text-slate-600">
          Cada módulo resume información pública del sector. Pulse la tarjeta para abrirla (también desde el menú lateral).
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AccessCard
            icon={<PieChart className="h-5 w-5" aria-hidden />}
            title="BI Sectorial"
            description="Participación, tacómetros e índices frente al mercado, primas mensuales y tablas de detalle."
            onClick={() => go('sector')}
          />
          <AccessCard
            icon={<LineChart className="h-5 w-5" aria-hidden />}
            title="BI Histórico"
            description="Serie mensual de primas y participación: evolución frente al líder y Seguros La Fe."
            onClick={() => go('historico')}
          />
          <AccessCard
            icon={<LayoutGrid className="h-5 w-5" aria-hidden />}
            title="BI Funerario"
            description="Ramo funerario: participación por año, evolución y detalle por empresa (Bs. o USD)."
            onClick={() => go('funerario')}
          />
          <AccessCard
            icon={<Database className="h-5 w-5" aria-hidden />}
            title="Datos técnicos"
            description="Listado de tablas cargadas en esta instalación (consulta o auditoría interna)."
            onClick={() => go('datos')}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-[#7823BD]">Fuentes</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Información pública del sector asegurador (SUDEASEG) y tipo de cambio oficial (BCV) para conversiones a USD cuando
          se muestran en esa moneda.
        </p>
      </div>

      <details className="group rounded-2xl border border-[#7823BD]/10 bg-white shadow-sm open:ring-1 open:ring-[#7823BD]/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-bold text-[#7823BD] sm:px-8 [&::-webkit-details-marker]:hidden">
          <BookOpen className="h-5 w-5 shrink-0 text-[#7823BD]/80" aria-hidden />
          Glosario de terminología
          <span className="text-xs font-normal text-slate-500">(definiciones alineadas a las pantallas)</span>
        </summary>
        <div className="border-t border-slate-100 px-5 pb-6 pt-4 sm:px-8">
          <HomeGlossaryContent />
        </div>
      </details>

      <div className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-[#7823BD]">Resultado técnico y PNC — comparativa entre volumen similar</h2>
        <p className="mt-1 text-xs text-slate-500">
          Saldo de operaciones y prima neta cobrada en el cierre elegido; mismas empresas que en posiciones intermedias por
          prima (segmento comparable), con Seguros La Fe para seguimiento.
        </p>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        {!data && !err && <p className="mt-3 text-sm text-slate-500">Cargando datos…</p>}
        {data && (
          <div className="mt-4">
            <ResultadoTecnicoSection
              title="Resultado técnico / Saldo"
              fechRef={data.ultimoCierre}
              cortes={data.cortesResultado}
              defaultCorte={data.defaultCorte}
              initial={data.resultado}
              rankingScope="bandaPnc"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AccessCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full flex-col rounded-2xl border border-[#7823BD]/15 bg-gradient-to-b from-white to-[#F0F4FB]/80 p-4 text-left shadow-sm transition hover:border-[#7823BD]/35 hover:shadow-md"
    >
      <span className="flex items-center gap-2 text-[#7823BD]">
        <span className="rounded-lg bg-[#7823BD]/10 p-2 text-[#7823BD]">{icon}</span>
        <span className="text-base font-bold">{title}</span>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </span>
      <p className="mt-3 flex-1 text-xs leading-relaxed text-slate-600">{description}</p>
    </button>
  );
}
