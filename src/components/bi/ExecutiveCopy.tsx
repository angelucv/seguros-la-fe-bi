import type { ReactNode } from 'react';

/**
 * Texto largo en escritorio y resumen corto en móvil (vista dirección / uso en movimiento).
 */
export function ExecLead({
  shortMobile,
  children,
}: {
  /** Una o dos frases máximo. */
  shortMobile: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block">{children}</div>
      <p className="text-sm leading-relaxed text-slate-700 md:hidden">{shortMobile}</p>
    </>
  );
}

/** Franja discreta solo móvil: contexto de la pantalla para lectura rápida. */
export function ExecMobileStrip({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-[#7823BD]/20 bg-gradient-to-r from-[#7823BD]/8 to-violet-50/50 px-3 py-2.5 text-center text-[12px] font-medium leading-snug text-slate-800 shadow-sm md:hidden">
      {children}
    </div>
  );
}
