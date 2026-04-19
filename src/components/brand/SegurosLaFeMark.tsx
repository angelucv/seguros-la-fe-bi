import { cn } from '../../../lib/utils';

type Variant = 'sidebar' | 'header' | 'hero';

const LOGO_SRC = '/seguros-la-fe-logo.png';

/**
 * Marca Seguros La Fe: logo oficial y colores alineados con seguroslafe.com y `lib/bi/config.ts`.
 */
export function SegurosLaFeMark({ variant = 'hero', className }: { variant?: Variant; className?: string }) {
  if (variant === 'sidebar') {
    return (
      <div className={cn('flex w-full min-w-0 flex-col items-stretch gap-4 brand-enter', className)}>
        <div className="flex w-full justify-center overflow-visible px-1 pb-1 pt-0.5 sm:px-2">
          <div
            className="mx-auto w-full max-w-[220px] rounded-xl border border-white/25 bg-white/95 px-4 py-3 shadow-md"
            role="img"
            aria-label="Seguros La Fe"
          >
            <img
              src={LOGO_SRC}
              alt=""
              width={480}
              height={125}
              className="mx-auto h-auto w-full max-h-[72px] object-contain object-left"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
        <div className="w-full border-t border-white/15 pt-3 text-left">
          <span className="text-sm font-bold tracking-tight text-white">Seguros La Fe</span>
          <span className="ml-1.5 inline-block rounded bg-[#FFC857] px-2 py-0.5 text-xs font-extrabold text-[#7823BD]">
            BI
          </span>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
            Mercado y sector asegurador
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={cn('flex min-w-0 shrink items-center gap-2 brand-enter', className)}>
        <div className="flex max-w-[min(200px,42vw)] items-center rounded-md border border-[#7823BD]/20 bg-white px-2 py-1 shadow-sm">
          <img
            src={LOGO_SRC}
            alt="Seguros La Fe"
            width={200}
            height={52}
            className="h-8 w-auto max-w-full object-contain object-left"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-3 brand-enter', className)}>
      <div className="flex w-full max-w-lg flex-col items-center rounded-2xl border border-[#7823BD]/20 bg-[#FBF9F9] px-6 py-5 shadow-md sm:max-w-xl">
        <img
          src={LOGO_SRC}
          alt="Seguros La Fe"
          width={480}
          height={125}
          className="mx-auto h-auto w-full max-w-md object-contain"
          loading="eager"
          decoding="async"
        />
      </div>
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#423F40]/80">
        Información financiera · mercado asegurador
      </p>
    </div>
  );
}
