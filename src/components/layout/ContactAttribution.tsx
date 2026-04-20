import { Mail } from 'lucide-react';
import { CONTACT_ATTRIBUTION, CONTACT_EMAIL, CONTACT_MAILTO } from '@/lib/contactAttribution';

/** Pie visible al final del contenido en todas las vistas (móvil y escritorio). */
export function AppContentFooter() {
  return (
    <footer className="mt-8 border-t border-[#7823BD]/10 pt-5 text-center sm:mt-10 sm:pt-6">
      <p className="text-[11px] leading-snug text-slate-600 sm:text-xs">{CONTACT_ATTRIBUTION}</p>
      <a
        href={CONTACT_MAILTO}
        className="mt-2 inline-block min-h-[44px] min-w-0 py-2 text-sm font-medium text-[#7823BD] underline decoration-[#7823BD]/30 underline-offset-2 sm:min-h-0 sm:py-0 hover:decoration-[#7823BD]"
      >
        {CONTACT_EMAIL}
      </a>
    </footer>
  );
}

/** Bloque destacado en la pantalla Fuentes (misma información que el pie global). */
export function FuentesContactCard() {
  return (
    <footer className="rounded-2xl border border-[#7823BD]/15 bg-gradient-to-br from-[#7823BD]/8 to-violet-50/50 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Mail className="h-5 w-5 shrink-0 text-[#7823BD] sm:mt-0.5" aria-hidden />
        <div className="min-w-0 text-sm leading-relaxed text-slate-700">
          <p className="font-semibold text-[#7823BD]">Contacto</p>
          <p className="mt-1 text-slate-600">{CONTACT_ATTRIBUTION}</p>
          <a
            href={CONTACT_MAILTO}
            className="mt-2 inline-block min-h-[44px] py-2 text-[#7823BD] font-medium underline decoration-[#7823BD]/30 underline-offset-2 sm:min-h-0 sm:py-0 hover:decoration-[#7823BD]"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
