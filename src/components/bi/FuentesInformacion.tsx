import { BookOpen, Building2, LineChart, Mail } from 'lucide-react';

/**
 * Documentación de fuentes para la dirección (sin listado técnico de archivos del servidor).
 */
export function FuentesInformacion() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-[#7823BD]/10 p-2.5 text-[#7823BD]">
            <BookOpen className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#7823BD] sm:text-xl">Fuentes de la información</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Este tablero consolida <strong>estadísticas públicas</strong> del mercado asegurador y tipos de cambio oficiales
              para facilitar la lectura ejecutiva. No sustituye las publicaciones originales: ante cualquier duda de cifra o
              metodología, prevalece el documento fuente en el sitio del organismo correspondiente.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-[#7823BD]">
          <Building2 className="h-5 w-5 shrink-0" aria-hidden />
          <h3 className="text-base font-bold sm:text-lg">Superintendencia de la Actividad Aseguradora (SUDEASEG)</h3>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            <strong>Seguro en cifras</strong> y publicaciones periódicas del sector: primas, participación, rankings y cuadros
            agregados utilizados en <em>BI Sectorial</em>, <em>BI Histórico</em> y en los resúmenes del inicio.
          </li>
          <li>
            <strong>Boletín / anuario</strong> (referencias de año y cuadros de gestión): base para índices, tacómetros y
            tablas de comparativa por empresa cuando el corte del tablero coincide con la información publicada.
          </li>
          <li>
            <strong>Ramo funerario — Cuadro 5-A</strong>: primas del ramo funerarios en el seguro de personas (seguro directo),
            tal como se indica en <em>BI Funerario</em>. Las participaciones por año se calculan sobre el total funerario del
            mismo cuadro.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[#7823BD]/10 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-[#7823BD]">
          <LineChart className="h-5 w-5 shrink-0" aria-hidden />
          <h3 className="text-base font-bold sm:text-lg">Banco Central de Venezuela (BCV)</h3>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            <strong>Tipo de cambio oficial</strong> para expresar cifras en <strong>dólares estadounidenses</strong>: en series
            mensuales (por ejemplo en BI Histórico) se usa el tipo de cada mes; en el ramo funerario, la conversión anual puede
            usar el tipo de <strong>cierre de diciembre</strong> del año indicado, de forma coherente con el resto del tablero.
          </li>
          <li>
            Los importes en bolívares son <strong>nominales</strong> según el período de la fuente; la conversión a USD es
            meramente referencial para comparar magnitudes.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-8">
        <h3 className="text-base font-bold text-slate-800">Uso responsable</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Los gráficos y tablas priorizan la visibilidad de <strong>Seguros La Fe</strong> frente al mercado y a un grupo de
          empresas de volumen comparable, según la configuración de cada vista. Las cifras dependen de la fecha de corte y de la
          actualización de las fuentes públicas.
        </p>
      </section>

      <footer className="rounded-2xl border border-[#7823BD]/15 bg-gradient-to-br from-[#7823BD]/8 to-violet-50/50 p-5 sm:p-6">
        <p className="flex items-start gap-2 text-sm text-slate-700">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#7823BD]" aria-hidden />
          <span>
            <span className="font-semibold text-[#7823BD]">Contacto</span>
            <br />
            <a
              href="mailto:acolmenares@seguroslafe.com"
              className="text-[#7823BD] underline decoration-[#7823BD]/30 underline-offset-2 hover:decoration-[#7823BD]"
            >
              acolmenares@seguroslafe.com
            </a>
          </span>
        </p>
      </footer>
    </div>
  );
}
