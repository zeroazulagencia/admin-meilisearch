'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type ApiResponse = {
  success: boolean;
  metadata: { total_projects: number };
  indicadores_cpm: Record<string, number>;
  indicadores_inversion_uso: Record<string, number>;
  indicadores_empleo: Record<string, number>;
  otros_impactos_estrategicos: Record<string, number>;
  data: ProjectRow[];
};

type ProjectRow = Record<string, string> & {
  licitaciones_detalle?: Record<string, Record<string, string>>;
};

type TabKey = 'visor' | 'cpm' | 'licitaciones' | 'impacto';

const COLORS = {
  primary: '#00AEEF',
  dark: '#1a237e',
  light: '#f5f7fb',
  text: '#333333',
  accent: '#4CAF50',
  warn: '#FF9800',
  danger: '#F44336',
};

const CPM_KEYS = {
  granEmpresa: 'cpm_composicion_participante_gran_empresa',
  pymes: 'cpm_composicion_participante_pymes_startups',
  universidad: 'cpm_composicion_participante_universidad_centros ',
  consorcios: 'cpm_Analisis_esquema_presentación_consorcios ',
  individuales: 'cpm_Analisis_esquema_presentación_individuales',
  gallegas: 'cpm_composicion_origen_propuestas_gallegas',
  nacionales: 'cpm_composicion_origen_propuestas_nacionales',
  internacionales: 'cpm_composicion_origen_propuestas_internacionales',
};

const LIC_KEYS = {
  gallegas: 'composicion_licitadores_pyme_origen_gallegas',
  noGallegas: 'composicion_licitadores_pyme_origen_no_gallegas',
  porcGallegas: 'porcen_composicion_licitadores_pyme_origen_gallegas',
  porcNoGallegas: 'porcen_composicion_licitadores_pyme_origen_no_gallegas',
  porcPymes: 'porcen_pymes_licitan',
  porcUtes: 'porcen_utes_presentadas',
  porcAdjudicatorios: 'porcen_adjudicatorios_participan_cmp ',
  porcRecursos: 'porcen_recursos_aceptados',
  retornoRoyalties: 'retorno_inversion_via_royalties',
};

function toNumber(value: string | number | undefined): number {
  if (value == null) return 0;
  const normalized = String(value).replace(/\s+/g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number): string {
  return Math.round(value || 0).toLocaleString('es-ES');
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function shortenProjectName(name: string): string {
  if (!name) return '';
  if (name.length <= 10) return name;
  const map: Record<string, string> = {
    PRECISAUDE: 'PRECISA',
    SMARTMINTECH: 'SMARTMIN',
    AGUATECH: 'AGUATECH',
  };
  const normalized = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return map[normalized] || `${name.slice(0, 10)}...`;
}

function getProjectName(project: ProjectRow): string {
  return project.nombre || project.proyecto || '';
}

export default function TablerosGainViewer({
  dataEndpoint,
  title = 'Tablero de Seguimiento',
  subtitle = 'Sistema de Monitoreo de Proyectos de GAIN',
}: {
  dataEndpoint: string;
  title?: string;
  subtitle?: string;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [activeTab, setActiveTab] = useState<TabKey>('visor');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(dataEndpoint, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          setError(json?.error || 'No se pudo cargar la informacion');
          setLoading(false);
          return;
        }
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Error de conexion');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dataEndpoint]);

  const projects = data?.data ?? [];

  const filteredProjects = useMemo(() => {
    if (selectedProject === 'all') return projects;
    return projects.filter((project) => getProjectName(project) === selectedProject);
  }, [projects, selectedProject]);

  const indicators = useMemo(() => {
    if (!data) return null;
    if (selectedProject === 'all') {
      return {
        cpm: data.indicadores_cpm,
        inversion: data.indicadores_inversion_uso,
        empleo: data.indicadores_empleo,
        impactos: data.otros_impactos_estrategicos,
        totalProjects: data.metadata.total_projects,
      };
    }

    const sum = (key: string) => filteredProjects.reduce((acc, p) => acc + toNumber(p[key]), 0);
    return {
      cpm: {
        entidades_presentan_ideas: sum('entidades_presentan_ideas'),
        ideas_recibidas: sum('ideas_recibidas'),
        entrevistas_realizadas: sum('entrevistas_realizadas'),
        licitaciones_realizadas: sum('licitaciones_realizadas'),
        importe_total_licitaciones: sum('importe_total_licitaciones'),
        importe_total_adjudicado: sum('importe_adjudicado'),
      },
      inversion: {
        inversion_idi_total: sum('inversion_i_d_i'),
        numero_usuarios_total: sum('usuarios'),
        posicionamiento_galicia_total: sum('posicionamiento_galicia'),
        potencial_extension_total: sum('potencial_extension'),
      },
      empleo: {
        empleo_tecnico_generado: sum('empleo_tecnico_generado'),
        empleo_tecnico_mantenido: sum('empleo_tecnico_mantenido'),
      },
      impactos: {
        inversion_idi_inducida: sum('inversion_i_d_i_inducida'),
        exportaciones: sum('exportaciones'),
      },
      totalProjects: filteredProjects.length,
    };
  }, [data, selectedProject, filteredProjects]);

  const cpmTotals = useMemo(() => {
    const source = selectedProject === 'all' ? projects : filteredProjects;
    const sum = (key: string) => source.reduce((acc, p) => acc + toNumber(p[key]), 0);
    const totalGran = sum(CPM_KEYS.granEmpresa);
    const totalPymes = sum(CPM_KEYS.pymes);
    const totalUni = sum(CPM_KEYS.universidad);
    const totalConsorcios = sum(CPM_KEYS.consorcios);
    const totalInd = sum(CPM_KEYS.individuales);
    const totalGal = sum(CPM_KEYS.gallegas);
    const totalNac = sum(CPM_KEYS.nacionales);
    const totalInt = sum(CPM_KEYS.internacionales);
    return {
      participantes: { totalGran, totalPymes, totalUni },
      esquemas: { totalConsorcios, totalInd },
      origen: { totalGal, totalNac, totalInt },
    };
  }, [projects, filteredProjects, selectedProject]);

  const chartProjects = filteredProjects.length > 0 ? filteredProjects : projects;

  const inversionChartData = chartProjects.map((p) => ({
    name: shortenProjectName(getProjectName(p)),
    value: toNumber(p.inversion_i_d_i),
  }));

  const usuariosChartData = chartProjects.map((p) => ({
    name: shortenProjectName(getProjectName(p)),
    value: toNumber(p.usuarios),
  }));

  const empleoChartData = chartProjects.map((p) => ({
    name: shortenProjectName(getProjectName(p)),
    generado: toNumber(p.empleo_tecnico_generado),
    mantenido: toNumber(p.empleo_tecnico_mantenido),
  }));

  const impactosChartData = chartProjects.map((p) => ({
    name: shortenProjectName(getProjectName(p)),
    inducida: toNumber(p.inversion_i_d_i_inducida) * 100,
    exportaciones: toNumber(p.exportaciones) * 100,
  }));

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-gray-500">Cargando tablero...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data || !indicators) return null;

  return (
    <div className="w-full">
      <header className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1a237e_0%,#283593_55%,#00AEEF_100%)] text-white p-8 md:p-10">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-wider">{title}</h1>
          <p className="text-sm md:text-base text-[#BCE8FF] mt-2 font-medium">{subtitle}</p>
        </div>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,white,transparent_45%)]" />
      </header>

      <section className="mt-6 bg-white border border-gray-200 rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#1a237e]">Filtrar por proyecto</h3>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="min-w-[220px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={getProjectName(project)} value={getProjectName(project)}>
                {getProjectName(project)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="mt-6">
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {([
            { id: 'visor', label: 'Visor general' },
            { id: 'cpm', label: 'CPM' },
            { id: 'licitaciones', label: 'Licitaciones' },
            { id: 'impacto', label: 'Impacto' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#00AEEF] text-white'
                  : 'text-gray-500 hover:text-[#00AEEF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'visor' && (
          <div className="bg-white border border-gray-200 rounded-b-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg md:text-2xl font-bold text-[#1a237e] uppercase tracking-wider border-b border-[#00AEEF] pb-3">
              Visor general proyectos GAIN
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                { id: 'proyectos', label: 'Nº proyectos GAIN', value: indicators.totalProjects, desc: 'Total de proyectos activos' },
                { id: 'entidades', label: 'Entidades en CPM', value: indicators.cpm.entidades_presentan_ideas, desc: 'Organizaciones participantes' },
                { id: 'ideas', label: 'Ideas recibidas en CPM', value: indicators.cpm.ideas_recibidas, desc: 'Total de propuestas recibidas' },
                { id: 'entrevistas', label: 'Entrevistas realizadas', value: indicators.cpm.entrevistas_realizadas, desc: 'Sesiones uno a uno' },
              ].map((item) => (
                <div key={item.id} className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5 md:p-6 text-center">
                  <div className="text-3xl font-bold text-[#1a237e]">{formatNumber(item.value)}</div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-gray-700 mt-2">{item.label}</div>
                  <div className="text-xs text-[#00AEEF] mt-1">{item.desc}</div>
                </div>
              ))}
            </div>

            <h3 className="mt-10 text-base md:text-lg font-bold text-[#1a237e] uppercase tracking-wider border-b border-[#00AEEF] pb-2">
              Resultados de licitaciones
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                { id: 'licitaciones', label: 'Licitaciones realizadas', value: indicators.cpm.licitaciones_realizadas, desc: 'Total de licitaciones' },
                { id: 'importe_total', label: 'Importe total licitaciones', value: formatCurrency(indicators.cpm.importe_total_licitaciones), desc: 'Importe total licitado' },
                { id: 'importe_adj', label: 'Importe adjudicado', value: formatCurrency(indicators.cpm.importe_total_adjudicado), desc: 'Importe total adjudicado' },
              ].map((item) => (
                <div key={item.id} className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5 text-center">
                  <div className="text-2xl font-bold text-[#1a237e]">{item.value}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mt-2">{item.label}</div>
                  <div className="text-xs text-[#00AEEF] mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cpm' && (
          <div className="bg-white border border-gray-200 rounded-b-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg md:text-2xl font-bold text-[#1a237e] uppercase tracking-wider border-b border-[#00AEEF] pb-3">
              Indicadores CPM
            </h2>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[#1a237e] uppercase tracking-wider">Participantes en CPM</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Grandes empresas</span><span className="font-semibold">{formatNumber(cpmTotals.participantes.totalGran)}</span></div>
                  <div className="flex justify-between"><span>Pymes y startups</span><span className="font-semibold">{formatNumber(cpmTotals.participantes.totalPymes)}</span></div>
                  <div className="flex justify-between"><span>Universidad o centros</span><span className="font-semibold">{formatNumber(cpmTotals.participantes.totalUni)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-2"><span>Total</span><span>{formatNumber(cpmTotals.participantes.totalGran + cpmTotals.participantes.totalPymes + cpmTotals.participantes.totalUni)}</span></div>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={[
                        { name: 'Grandes empresas', value: cpmTotals.participantes.totalGran },
                        { name: 'Pymes y startups', value: cpmTotals.participantes.totalPymes },
                        { name: 'Universidad o centros', value: cpmTotals.participantes.totalUni },
                      ]} outerRadius={80}>
                        {[COLORS.dark, COLORS.primary, COLORS.accent].map((color, index) => (
                          <Cell key={color + index} fill={color} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[#1a237e] uppercase tracking-wider">Esquema de presentacion</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Consorcios</span><span className="font-semibold">{formatNumber(cpmTotals.esquemas.totalConsorcios)}</span></div>
                  <div className="flex justify-between"><span>Individuales</span><span className="font-semibold">{formatNumber(cpmTotals.esquemas.totalInd)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-2"><span>Total</span><span>{formatNumber(cpmTotals.esquemas.totalConsorcios + cpmTotals.esquemas.totalInd)}</span></div>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Consorcios', value: cpmTotals.esquemas.totalConsorcios },
                      { name: 'Individuales', value: cpmTotals.esquemas.totalInd },
                    ]}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.warn} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[#1a237e] uppercase tracking-wider">Origen de propuestas</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Gallegas</span><span className="font-semibold">{formatNumber(cpmTotals.origen.totalGal)}</span></div>
                  <div className="flex justify-between"><span>Nacionales</span><span className="font-semibold">{formatNumber(cpmTotals.origen.totalNac)}</span></div>
                  <div className="flex justify-between"><span>Internacionales</span><span className="font-semibold">{formatNumber(cpmTotals.origen.totalInt)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-2"><span>Total</span><span>{formatNumber(cpmTotals.origen.totalGal + cpmTotals.origen.totalNac + cpmTotals.origen.totalInt)}</span></div>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={[
                        { name: 'Gallegas', value: cpmTotals.origen.totalGal },
                        { name: 'Nacionales', value: cpmTotals.origen.totalNac },
                        { name: 'Internacionales', value: cpmTotals.origen.totalInt },
                      ]} outerRadius={80}>
                        {[COLORS.accent, COLORS.warn, COLORS.danger].map((color, index) => (
                          <Cell key={color + index} fill={color} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'licitaciones' && (
          <div className="bg-white border border-gray-200 rounded-b-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg md:text-2xl font-bold text-[#1a237e] uppercase tracking-wider border-b border-[#00AEEF] pb-3">
              Indicadores de resultado de licitaciones
            </h2>

            {selectedProject === 'all' && (
              <div className="mt-8 text-center text-gray-500">
                Selecciona un proyecto especifico para ver el detalle de licitaciones.
              </div>
            )}

            {selectedProject !== 'all' && filteredProjects[0] && (
              <div className="mt-6 space-y-8">
                {Object.entries(filteredProjects[0].licitaciones_detalle || {}).length === 0 && (
                  <div className="text-center text-gray-500">No hay licitaciones registradas para este proyecto.</div>
                )}

                {Object.entries(filteredProjects[0].licitaciones_detalle || {}).map(([licNum, lic]) => {
                  const totalLicitadores = toNumber(lic[LIC_KEYS.gallegas]) + toNumber(lic[LIC_KEYS.noGallegas]);
                  const porcentajeGallegas = Math.round(toNumber(lic[LIC_KEYS.porcGallegas]) * 100);
                  const porcentajeNoGallegas = Math.round(toNumber(lic[LIC_KEYS.porcNoGallegas]) * 100);
                  const porcentajePymes = Math.round(toNumber(lic[LIC_KEYS.porcPymes]) * 100);
                  const porcentajeUtes = Math.round(toNumber(lic[LIC_KEYS.porcUtes]) * 100);
                  const porcentajeAdjudicatorios = Math.round(toNumber(lic[LIC_KEYS.porcAdjudicatorios]) * 100);
                  const porcentajeRecursos = Math.round(toNumber(lic[LIC_KEYS.porcRecursos]) * 100);
                  const retornoRoyalties = (toNumber(lic[LIC_KEYS.retornoRoyalties]) * 100).toFixed(1);

                  return (
                    <div key={licNum} className="border border-gray-200 rounded-2xl p-6 bg-[#f8f9fa]">
                      <div className="text-sm md:text-lg font-bold text-[#1a237e] uppercase tracking-wider text-center bg-[#e3f2fd] rounded-xl py-3">
                        Licitacion {licNum}
                      </div>

                      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
                        <div className="space-y-4">
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="text-sm font-semibold text-[#1a237e] uppercase tracking-wider">Composicion licitadores PYME</div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="text-center bg-[#f8f9fa] rounded-lg p-3">
                                <div className="text-2xl font-bold text-[#1a237e]">{formatNumber(totalLicitadores)}</div>
                                <div className="text-xs uppercase tracking-wider text-gray-500">Total licitadores</div>
                              </div>
                              <div className="text-center bg-[#f8f9fa] rounded-lg p-3">
                                <div className="text-2xl font-bold text-[#1a237e]">{porcentajeGallegas}%</div>
                                <div className="text-xs uppercase tracking-wider text-gray-500">PYMEs gallegas</div>
                              </div>
                            </div>
                            <div className="mt-4 text-sm">
                              <div className="flex justify-between border-b border-gray-100 py-2">
                                <span>PYMEs Gallegas</span>
                                <span className="font-semibold">{formatNumber(toNumber(lic[LIC_KEYS.gallegas]))} ({porcentajeGallegas}%)</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-100 py-2">
                                <span>PYMEs No Gallegas</span>
                                <span className="font-semibold">{formatNumber(toNumber(lic[LIC_KEYS.noGallegas]))} ({porcentajeNoGallegas}%)</span>
                              </div>
                              <div className="flex justify-between font-semibold py-2">
                                <span>Total</span>
                                <span>{formatNumber(totalLicitadores)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-4 h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                dataKey="value"
                                data={[
                                  { name: 'PYMEs Gallegas', value: toNumber(lic[LIC_KEYS.gallegas]) },
                                  { name: 'PYMEs No Gallegas', value: toNumber(lic[LIC_KEYS.noGallegas]) },
                                ]}
                                outerRadius={80}
                              >
                                {[COLORS.accent, COLORS.warn].map((color, index) => (
                                  <Cell key={color + index} fill={color} />
                                ))}
                              </Pie>
                              <Legend verticalAlign="bottom" height={36} />
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="text-sm font-semibold text-[#1a237e] uppercase tracking-wider">Indicadores licitacion</div>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between"><span>% PYMEs licitan</span><span className="font-semibold">{porcentajePymes}%</span></div>
                            <div className="flex justify-between"><span>% UTE presentadas</span><span className="font-semibold">{porcentajeUtes}%</span></div>
                            <div className="flex justify-between"><span>% Adjudicatorios CPM</span><span className="font-semibold">{porcentajeAdjudicatorios}%</span></div>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="text-sm font-semibold text-[#1a237e] uppercase tracking-wider">Indicadores adjudicacion</div>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between"><span>% Recursos aceptados</span><span className="font-semibold">{porcentajeRecursos}%</span></div>
                            <div className="flex justify-between"><span>Retorno via royalties</span><span className="font-semibold">{retornoRoyalties}%</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'impacto' && (
          <div className="bg-white border border-gray-200 rounded-b-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg md:text-2xl font-bold text-[#1a237e] uppercase tracking-wider border-b border-[#00AEEF] pb-3">
              Resultado de indicadores de impacto
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { id: 'inv', label: 'Inversion I+D+I total', value: formatCurrency(indicators.inversion.inversion_idi_total) },
                { id: 'usuarios', label: 'Numero de usuarios', value: formatNumber(indicators.inversion.numero_usuarios_total) },
                { id: 'empleo_gen', label: 'Empleo tecnico generado', value: formatNumber(indicators.empleo.empleo_tecnico_generado) },
                { id: 'empleo_man', label: 'Empleo tecnico mantenido', value: formatNumber(indicators.empleo.empleo_tecnico_mantenido) },
                { id: 'posicionamiento', label: 'Posicionamiento Galicia', value: formatNumber(indicators.inversion.posicionamiento_galicia_total) },
                { id: 'extension', label: 'Potencial extension', value: formatNumber(indicators.inversion.potencial_extension_total) },
                { id: 'inducida', label: 'Inversion I+D+I inducida', value: formatPercent(indicators.impactos.inversion_idi_inducida) },
                { id: 'export', label: 'Exportaciones', value: formatPercent(indicators.impactos.exportaciones) },
              ].map((item) => (
                <div key={item.id} className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5 text-center">
                  <div className="text-xl font-bold text-[#1a237e]">{item.value}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mt-2">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5 h-72">
                <div className="text-sm font-semibold text-[#1a237e] uppercase tracking-wider text-center">Inversion I+D+i por proyecto</div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inversionChartData}>
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => formatCurrency(Number(v))} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="value" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5 h-72">
                <div className="text-sm font-semibold text-[#1a237e] uppercase tracking-wider text-center">Numero de usuarios por proyecto</div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usuariosChartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatNumber(Number(value))} />
                      <Bar dataKey="value" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5 h-72">
                <div className="text-sm font-semibold text-[#1a237e] uppercase tracking-wider text-center">Empleo generado vs mantenido</div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={empleoChartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="generado" name="Generado" fill={COLORS.warn} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="mantenido" name="Mantenido" fill={COLORS.dark} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#f8f9fa] border border-gray-200 rounded-2xl p-5 h-72">
                <div className="text-sm font-semibold text-[#1a237e] uppercase tracking-wider text-center">Impactos estrategicos (%)</div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={impactosChartData}>
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(value) => `${Number(value).toFixed(0)}%`} />
                      <Legend />
                      <Bar dataKey="inducida" name="I+D+i inducida" fill={COLORS.danger} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="exportaciones" name="Exportaciones" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-gray-500">
        Tablero de Seguimiento GAIN
      </footer>
    </div>
  );
}
