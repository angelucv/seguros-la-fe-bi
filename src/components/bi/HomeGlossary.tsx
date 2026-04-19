/**
 * Glosario de la pantalla Inicio: tarjetas por término y bloque de abreviaturas.
 */
export function HomeGlossaryContent() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-slate-700">
      <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-slate-600">
        Definiciones orientativas para interpretar este tablero; la normativa y las definiciones oficiales son las
        publicadas por <strong>SUDEASEG</strong> y los documentos fuente del boletín y del anuario.
      </p>

      <section>
        <h3 className="text-base font-bold text-[#7823BD]">Abreviaturas</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[280px] text-left text-xs sm:text-sm">
            <tbody className="divide-y divide-slate-100">
              {[
                ['SUDEASEG', 'Superintendencia de la Actividad Aseguradora en Venezuela.'],
                ['PNC', 'Primas netas cobradas (base en Bs. que usa el boletín para ciertos ratios).'],
                ['RT', 'Resultado técnico (componentes del cuadro de resultados / saldo de operaciones).'],
                ['YTD', 'Year-to-date: acumulado desde enero hasta la fecha de corte del cuadro.'],
              ].map(([sigla, desc]) => (
                <tr key={sigla}>
                  <th className="w-[28%] whitespace-nowrap px-3 py-2.5 font-mono font-bold text-[#7823BD]">{sigla}</th>
                  <td className="px-3 py-2.5 text-slate-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-base font-bold text-[#7823BD]">Marco</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <GlossaryCard
            term="SUDEASEG"
            body="Superintendencia del sector asegurador en Venezuela; publica estadísticas y boletines con definiciones propias para cada ratio."
          />
          <GlossaryCard
            term="Primas netas"
            body="Ingresos por pólizas según el criterio del cuadro oficial (pueden diferir de otras nociones contables de ingreso)."
          />
          <GlossaryCard
            term="Acumulado del año (YTD)"
            body="Suma de primas desde enero hasta la fecha de corte del cuadro descargado."
          />
          <GlossaryCard
            term="Primas del mes / flujo mensual"
            body="Aquí se aproxima por diferencia entre acumulados consecutivos; refleja el volumen del mes de forma indicativa."
          />
          <GlossaryCard
            term="PNC en el boletín"
            body="Base en bolívares que el boletín utiliza como denominador o referencia en porcentajes indicados en los cuadros."
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-bold text-[#7823BD]">Índices habituales en el boletín</h3>
        <p className="mt-1 text-xs text-slate-500">
          Numeración alineada a las pantallas «BI Sectorial» e «Índices»; cada ratio relaciona magnitudes del propio boletín.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOLETIN_INDICES.map((item) => (
            <article
              key={item.n}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <p className="font-mono text-[11px] font-bold text-[#7823BD]/80">({item.n})</p>
              <h4 className="mt-1 font-semibold text-slate-900">{item.title}</h4>
              <p className="mt-2 text-xs leading-snug text-slate-600">{item.def}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-base font-bold text-[#7823BD]">Resultado técnico y saldo (cuadro del boletín)</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <GlossaryCard
            term="Resultado técnico (RT bruto / neto)"
            body="Magnitudes del cuadro de resultados en miles de Bs.; el desglose sigue la estructura del documento fuente (incl. reaseguro cedido)."
          />
          <GlossaryCard
            term="Saldo de operaciones y % Saldo / PNC"
            body="Permite comparar el saldo respecto a las primas netas cobradas en el mismo corte; el ranking y la tabla de inicio reproducen la lógica del boletín."
          />
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Las definiciones contables y regulatorias finales están en la normativa vigente y en los documentos publicados por
        SUDEASEG.
      </p>
    </div>
  );
}

function GlossaryCard({ term, body }: { term: string; body: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h4 className="font-semibold text-[#7823BD]">{term}</h4>
      <p className="mt-2 text-xs leading-snug text-slate-600 sm:text-sm">{body}</p>
    </article>
  );
}

const BOLETIN_INDICES: { n: number; title: string; def: string }[] = [
  {
    n: 1,
    title: 'Siniestros pagados / primas netas',
    def: 'Relación entre siniestros efectivamente pagados y primas netas en el periodo de referencia del cuadro.',
  },
  {
    n: 2,
    title: 'Reservas técnicas / primas netas',
    def: 'Provisión técnica frente al volumen de primas; indica carga de reservas respecto a la prima.',
  },
  {
    n: 3,
    title: 'Siniestros incurridos / prima devengada',
    def: 'Siniestros reconocidos (incluidos IBNR según criterio del boletín) sobre prima devengada.',
  },
  {
    n: 4,
    title: 'Comisiones / primas netas',
    def: 'Costo de comercialización y estructura de comisiones en relación con primas netas cobradas.',
  },
  {
    n: 5,
    title: 'Gastos de adquisición / primas netas',
    def: 'Eficiencia de gastos de adquisición frente a la base de primas netas del corte.',
  },
  {
    n: 6,
    title: 'Gastos de administración / primas netas',
    def: 'Carga de gastos administrativos sobre primas netas; comparable entre empresas en el mismo periodo.',
  },
  {
    n: 7,
    title: 'Costo de reaseguro / prima devengada',
    def: 'Costo del reaseguro cedido en relación con la prima devengada del mismo periodo.',
  },
  {
    n: 8,
    title: 'Tasa combinada',
    def: 'Indicador sintético de siniestralidad y gastos respecto a primas (definición operativa del boletín).',
  },
  {
    n: 9,
    title: 'Índice de cobertura de reservas',
    def: 'Relación entre reservas técnicas y magnitudes de siniestralidad esperada según el cuadro publicado.',
  },
];
