import { Fragment, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CalendarDays, CheckCircle2, Clock, Construction, Eye, FileText, LogOut, Plus, RefreshCw, Save, Search, Settings, Users, X } from 'lucide-react';
import { obtenerDatosIniciales, sincronizarPendientes } from './services/api.js';
import { calcularProduccion, calcularProductividad, normalizarTexto } from './utils/productividad.js';

const ESTADOS_TRABAJO = ['En curso', 'En pausa', 'Finalizado'];
const hoyISO = () => new Date().toISOString().slice(0, 10);

const USUARIOS_PERMITIDOS = {
  'nahuel.garcia@deltamining.com.ar': { nombre: 'Nahuel García', email: 'nahuel.garcia@deltamining.com.ar', rol: 'admin' },
  'carlos.sisterna@deltamining.com.ar': { nombre: 'Carlos Sisterna', email: 'carlos.sisterna@deltamining.com.ar', rol: 'supervisor' },
  'gilberto.eseiza@deltamining.com.ar': { nombre: 'Gilberto Eseiza', email: 'gilberto.eseiza@deltamining.com.ar', rol: 'supervisor' },
};

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function esAdmin(usuario) {
  return normalizarTexto(usuario?.rol) === 'ADMIN';
}

function puedeVerTrabajo(usuario, trabajo) {
  if (esAdmin(usuario)) return true;
  const supervisor = normalizarTexto(supervisorTrabajo(trabajo));
  const nombre = normalizarTexto(usuario?.nombre);
  const email = normalizarEmail(usuario?.email);
  return supervisor === nombre || supervisor.includes(nombre) || nombre.includes(supervisor) || normalizarEmail(supervisorTrabajo(trabajo)) === email;
}

const DELTA_LOGO = 'data:image/jpeg;base64,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';


const STORAGE_DATOS = 'delta_trabajos_datos_local_v2';
const STORAGE_PENDIENTES = 'delta_trabajos_pendientes_excel_v2';

function leerJSONLocal(clave, fallback) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error('No se pudo leer localStorage:', clave, error);
    return fallback;
  }
}

function guardarJSONLocal(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (error) {
    console.error('No se pudo guardar localStorage:', clave, error);
  }
}

function pendientesVacios() {
  return { trabajos: [], avances: [], estados: [] };
}

function datosVacios() {
  return {
    ok: true,
    trabajos: [],
    avances: [],
    equiposAvance: [],
    equipos: [],
    tareas: [],
    supervisores: [],
    proyectos: []
  };
}

function generarIdLocal(prefijo) {
  return `${prefijo}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function cantidadPendiente(pendientes) {
  const p = pendientes || pendientesVacios();
  return (p.trabajos?.length || 0) + (p.avances?.length || 0) + (p.estados?.length || 0);
}

function actualizarListaPorId(lista, id, cambios) {
  return (lista || []).map((item) => String(idTrabajo(item)) === String(id) ? { ...item, ...cambios } : item);
}

function formatearFecha(v) {
  if (!v) return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function valor(obj, posibles) {
  if (!obj) return '';

  for (const key of posibles) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') return obj[key];
  }

  const objetivos = (posibles || []).map((x) => normalizarTexto(x));
  for (const key of Object.keys(obj || {})) {
    if (objetivos.includes(normalizarTexto(key)) && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }

  return '';
}
function idTrabajo(t) { return valor(t, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO']); }
function nombreTrabajo(t) { return valor(t, ['Nombre trabajo', 'Nombre Trabajo', 'Trabajo', 'Nombre', 'Descripción', 'Descripcion']); }
function estadoTrabajo(t) { return valor(t, ['Estado trabajo', 'Estado Trabajo', 'Estado', 'ESTADO']) || 'En curso'; }
function proyectoTrabajo(t) { return valor(t, ['Proyecto', 'PROYECTO']); }
function supervisorTrabajo(t) { return valor(t, ['Supervisor responsable', 'Supervisor', 'SUPERVISOR']); }
function frenteTrabajo(t) { return valor(t, ['Frente/Lugar', 'Frente / Lugar', 'Frente', 'Lugar', 'Ubicación', 'Ubicacion']); }
function fechaInicioTrabajo(t) { return formatearFecha(valor(t, ['Fecha inicio', 'Fecha Inicio', 'FECHA_INICIO'])); }
function fechaFinTrabajo(t) { return formatearFecha(valor(t, ['Fecha fin', 'Fecha Fin', 'FECHA_FIN'])); }
function tareaNombre(t) { return valor(t, ['Tarea', 'Nombre tarea', 'Descripcion tarea', 'Descripción tarea']); }
function tareaUnidad(t) { return valor(t, ['Unidad', 'Unidad productividad', 'Unidad de productividad']); }
function tareaTipo(t) { return valor(t, ['Tipo de trabajo', 'Tipo trabajo', 'Tipo', 'Equipo', 'Tipo equipo']); }
function equipoCodigo(e) { return valor(e, ['ID_Equipo', 'ID Equipo', 'Código', 'Codigo', 'Codigo interno', 'Código interno']); }
function equipoNombre(e) { return valor(e, ['Equipo', 'Tipo equipo', 'Tipo Equipo', 'Descripción', 'Descripcion']); }
function equipoTipo(e) { return valor(e, ['Tipo de trabajo', 'Tipo trabajo', 'Tipo equipo', 'Tipo Equipo', 'Tipo', 'Clase', 'Familia', 'Descripción', 'Descripcion', 'Equipo']); }

function dividirUnidades(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio) return [];
  return limpio
    .split(/[\/;,]+/g)
    .map(x => x.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex(x => normalizarTexto(x) === normalizarTexto(item)) === index);
}

function unidadesDisponibles(tarea) { return dividirUnidades(tareaUnidad(tarea)); }

function canonTipo(texto) {
  const n = normalizarTexto(texto);
  if (!n) return '';

  if (n.includes('MINICARGADORA') || n.includes('MINI CARGADORA')) return 'MINICARGADORA';
  if (n.includes('CARGADORA FRONTAL') || n.includes('CARGADOR FRONTAL')) return 'CARGADORA FRONTAL';
  if (n.includes('EXCAVADORA')) return 'EXCAVADORA';
  if (n.includes('RETROEXCAVADORA') || n.includes('RETRO EXCAVADORA')) return 'RETROEXCAVADORA';
  if (n.includes('TOPADORA') || n.includes('DOZER')) return 'TOPADORA';
  if (n.includes('MOTONIVELADORA') || n.includes('MOTO NIVELADORA')) return 'MOTONIVELADORA';
  if (n.includes('CAMION REGADOR')) return 'CAMION REGADOR';
  if (n.includes('CAMION VOLCADOR')) return 'CAMION VOLCADOR';
  if (n.includes('CAMIONETA')) return 'CAMIONETA';
  if (n.includes('CAMION')) return 'CAMION';
  if (n.includes('COMPACTADOR')) return 'COMPACTADOR';
  if (n.includes('RODILLO')) return 'RODILLO';

  return n;
}

function esTrabajoPorHora(tarea) {
  const n = normalizarTexto(tareaNombre(tarea));
  return n === 'TRABAJO POR HORA' || n.includes('TRABAJO POR HORA');
}

function mismaFamiliaEquipoTarea(equipoSeleccionado, tarea) {
  const tipoEq = canonTipo(equipoTipo(equipoSeleccionado));
  const tipoTar = canonTipo(tareaTipo(tarea));

  if (!tipoEq || !tipoTar) return false;
  if (tipoEq === tipoTar) return true;

  return tipoEq.includes(tipoTar) || tipoTar.includes(tipoEq);
}
function tareasParaEquipo(tareas, equipoSeleccionado) {
  if (!equipoSeleccionado) return [];

  const tipoEq = canonTipo(equipoTipo(equipoSeleccionado));

  let filtradas = tareas.filter((t) => mismaFamiliaEquipoTarea(equipoSeleccionado, t));

  // Regla operativa pedida: la minicargadora sólo carga "Trabajo por hora".
  if (tipoEq === 'MINICARGADORA') {
    const porHora = tareas.filter((t) => esTrabajoPorHora(t));
    filtradas = porHora.length ? porHora : filtradas;
  }

  return filtradas.filter((tarea, index, arr) =>
    arr.findIndex((x) => normalizarTexto(tareaNombre(x)) === normalizarTexto(tareaNombre(tarea))) === index
  );
}
function unidadesDisponiblesPorNombre(tareas, nombreTarea, equipoSeleccionado) {
  if (!nombreTarea || !equipoSeleccionado) return [];

  const coincidencias = tareas.filter((t) =>
    mismaFamiliaEquipoTarea(equipoSeleccionado, t) &&
    normalizarTexto(tareaNombre(t)) === normalizarTexto(nombreTarea)
  );

  const unidades = coincidencias.flatMap((t) => unidadesDisponibles(t));

  return unidades.filter((unidad, index, arr) =>
    arr.findIndex((x) => normalizarTexto(x) === normalizarTexto(unidad)) === index
  );
}


function esUnidadHoras(unidad) {
  const u = normalizarTexto(unidad);
  return u === 'HS' || u === 'HORA' || u === 'HORAS';
}

function mostrarProductividad(valorProductividad, unidad) {
  if (esUnidadHoras(unidad)) return '-';
  if (valorProductividad === '' || valorProductividad === null || valorProductividad === undefined) return '-';
  const n = Number(valorProductividad);
  if (!Number.isFinite(n)) return String(valorProductividad);
  return n.toFixed(2).replace(/\.00$/, '');
}

function unidadProductiva(unidad) {
  if (esUnidadHoras(unidad)) return '-';
  return unidad ? `${unidad}/hs` : '-';
}


function diferenciaDias(fechaInicio, fechaFin) {
  const ini = formatearFecha(fechaInicio);
  const fin = formatearFecha(fechaFin);
  if (!ini || !fin) return '-';
  const d1 = new Date(`${ini}T00:00:00`);
  const d2 = new Date(`${fin}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return '-';
  const dias = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  return dias > 0 ? dias : '-';
}

function valoresUnicos(lista) {
  return [...new Set((lista || []).map(x => String(x || '').trim()).filter(Boolean))];
}

function numeroResumen(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const limpio = String(v).replace(/\./g, '').replace(',', '.').trim();
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

function sumarEnMapa(mapa, clave, valorSuma) {
  const key = String(clave || 'Sin dato').trim() || 'Sin dato';
  mapa[key] = (mapa[key] || 0) + numeroResumen(valorSuma);
}

function formatearNumeroResumen(n) {
  const valor = Number(n || 0);
  if (!Number.isFinite(valor)) return '-';
  return valor.toFixed(2).replace(/\.00$/, '').replace('.', ',');
}


function dividirCampoMultiple(v) {
  return String(v || '')
    .split('|')
    .map(x => x.trim())
    .filter(Boolean);
}

function claveAvanceFila(avance) {
  return String(valor(avance || {}, ['ID_Avance', 'ID Avance', 'ID_AVANCE']) || '').trim();
}

function obtenerValorFilaResumen(fila, claves, indiceEnAvance = 0) {
  const directoEquipo = valor(fila.equipo || {}, claves);
  if (directoEquipo !== '' && directoEquipo !== null && directoEquipo !== undefined) return directoEquipo;

  const directoAvance = valor(fila.avance || {}, claves);
  const partes = dividirCampoMultiple(directoAvance);
  if (partes.length > 1) return partes[indiceEnAvance] || partes[partes.length - 1] || '';
  return directoAvance;
}


const CLAVES_TAREA_RESUMEN = [
  'Tarea realizada',
  'Tarea',
  'Trabajo realizado',
  'Trabajo',
  'Nombre tarea',
  'Descripcion tarea',
  'Descripción tarea'
];

const CLAVES_UNIDAD_RESUMEN = [
  'Unidad',
  'Unidad productividad',
  'Unidad de productividad'
];

const CLAVES_HORAS_RESUMEN = [
  'Horas trabajadas',
  'Horas',
  'Hs',
  'horasTrabajadas'
];

const CLAVES_CANTIDAD_RESUMEN = [
  'Cantidad productiva',
  'Total',
  'Cantidad producida',
  'Cantidad',
  'Produccion calculada',
  'Producción calculada',
  'Produccion',
  'Producción'
];

function construirResumenTrabajo(trabajo, avances = [], equiposAvance = []) {
  const id = idTrabajo(trabajo);
  const equiposTrabajo = (equiposAvance || []).filter((e) => String(valor(e, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO'])) === String(id));
  const avancesTrabajo = (avances || []).filter((a) => String(valor(a, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO'])) === String(id));

  const filasBase = equiposTrabajo.length
    ? equiposTrabajo.map((e) => ({ equipo: e, avance: buscarAvancePorEquipo(avancesTrabajo, e) || {} }))
    : avancesTrabajo.map((a) => ({ equipo: {}, avance: a }));

  const contadorPorAvance = {};
  const filasResumen = filasBase.map((fila) => {
    const idAv = claveAvanceFila(fila.equipo) || claveAvanceFila(fila.avance) || `${valor(fila.equipo, ['Fecha', 'FECHA'])}-${valor(fila.avance, ['Fecha', 'FECHA'])}`;
    const indice = contadorPorAvance[idAv] || 0;
    contadorPorAvance[idAv] = indice + 1;

    return {
      ...fila,
      indiceEnAvance: indice,
      tareaResumen: obtenerValorFilaResumen(fila, CLAVES_TAREA_RESUMEN, indice) || 'Sin tarea',
      unidadResumen: obtenerValorFilaResumen(fila, CLAVES_UNIDAD_RESUMEN, indice) || 'Sin unidad',
      horasResumen: obtenerValorFilaResumen(fila, CLAVES_HORAS_RESUMEN, indice),
      cantidadResumen: obtenerValorFilaResumen(fila, CLAVES_CANTIDAD_RESUMEN, indice),
      fechaResumen: formatearFecha(obtenerValorFilaResumen(fila, ['Fecha', 'FECHA'], indice)),
      maquinaResumen: obtenerValorFilaResumen(fila, ['Equipo', 'Código interno', 'Codigo interno', 'ID_Equipo', 'Tipo equipo'], indice) || 'Sin equipo'
    };
  });

  const maquinas = valoresUnicos(filasResumen.map((fila) => fila.maquinaResumen));
  const tareas = valoresUnicos(filasResumen.map((fila) => fila.tareaResumen));
  const unidades = valoresUnicos(filasResumen.map((fila) => fila.unidadResumen));
  const fechas = valoresUnicos(filasResumen.map((fila) => fila.fechaResumen)).sort();
  const fechaInicio = fechaInicioTrabajo(trabajo) || fechas[0] || '';
  const fechaFin = fechaFinTrabajo(trabajo) || fechas[fechas.length - 1] || '';

  const horasPorMaquina = {};
  const horasPorTarea = {};
  const cantidadPorTrabajoUnidad = {};
  const diasPorTarea = {};

  filasResumen.forEach((fila) => {
    const maquina = fila.maquinaResumen;
    const tarea = fila.tareaResumen;
    const unidad = fila.unidadResumen;
    const horas = fila.horasResumen;
    const cantidad = fila.cantidadResumen;
    const fecha = fila.fechaResumen;

    sumarEnMapa(horasPorMaquina, maquina, horas);
    sumarEnMapa(horasPorTarea, tarea, horas);

    if (!cantidadPorTrabajoUnidad[tarea]) cantidadPorTrabajoUnidad[tarea] = {};
    cantidadPorTrabajoUnidad[tarea][unidad] = (cantidadPorTrabajoUnidad[tarea][unidad] || 0) + numeroResumen(cantidad);

    if (!diasPorTarea[tarea]) diasPorTarea[tarea] = new Set();
    if (fecha) diasPorTarea[tarea].add(fecha);
  });

  const trabajoYCantidad = {};
  const diasTrabajadosPorTarea = {};

  Object.entries(cantidadPorTrabajoUnidad).forEach(([tarea, unidadesCantidad]) => {
    trabajoYCantidad[tarea] = Object.entries(unidadesCantidad)
      .filter(([, cantidad]) => numeroResumen(cantidad) !== 0)
      .map(([unidad, cantidad]) => `${formatearNumeroResumen(cantidad)} ${unidad}`)
      .join(' · ') || '-';
  });

  Object.entries(diasPorTarea).forEach(([tarea, setFechas]) => {
    diasTrabajadosPorTarea[tarea] = setFechas.size;
  });

  return {
    fechaInicio,
    fechaFin,
    dias: diferenciaDias(fechaInicio, fechaFin),
    maquinas,
    tareas,
    unidades,
    registros: filasResumen.length,
    diasConAvance: fechas.length,
    horasPorMaquina,
    horasPorTarea,
    trabajoYCantidad,
    diasTrabajadosPorTarea
  };
}

function ListaResumen({ titulo, datos, sufijo = '' }) {
  const entradas = Object.entries(datos || {});
  return <div className="resumen-bloque">
    <strong>{titulo}</strong>
    {entradas.length ? <ul>{entradas.map(([k, v]) => {
      const valorMostrado = typeof v === 'string' ? v : `${formatearNumeroResumen(v)}${sufijo}`;
      return <li key={k}><span>{k}</span><b>{valorMostrado}</b></li>;
    })}</ul> : <p>-</p>}
  </div>;
}

function ResumenFinalizado({ trabajo, avances = [], equiposAvance }) {
  const resumen = construirResumenTrabajo(trabajo, avances, equiposAvance);
  return <details className="resumen-finalizado">
    <summary>Ver resumen de finalización</summary>
    <div className="resumen-finalizado-grid">
      <div><strong>Duración:</strong> {resumen.dias} día{resumen.dias === 1 ? '' : 's'}</div>
      <div><strong>Fechas:</strong> {resumen.fechaInicio || '-'} → {resumen.fechaFin || '-'}</div>
      <div><strong>Máquinas que intervinieron:</strong> {resumen.maquinas.length ? resumen.maquinas.join(' · ') : '-'}</div>
      <div><strong>Trabajos realizados:</strong> {resumen.tareas.length ? resumen.tareas.join(' · ') : '-'}</div>
      <div><strong>Unidades usadas:</strong> {resumen.unidades.length ? resumen.unidades.join(' · ') : '-'}</div>
      <div><strong>Registros:</strong> {resumen.registros} · <strong>Días con avance:</strong> {resumen.diasConAvance}</div>
    </div>
    <div className="resumen-detalle-grid">
      <ListaResumen titulo="Horas por máquina" datos={resumen.horasPorMaquina} sufijo=" hs" />
      <ListaResumen titulo="Horas por trabajo realizado" datos={resumen.horasPorTarea} sufijo=" hs" />
      <ListaResumen titulo="Trabajo y cantidad ejecutada" datos={resumen.trabajoYCantidad} />
      <ListaResumen titulo="Días trabajados por tarea" datos={resumen.diasTrabajadosPorTarea} sufijo=" día(s)" />
    </div>
  </details>;
}

function TooltipCard({ titulo, detalle }) {
  return <div className="tooltip-card" tabIndex={0}>
    <span>{titulo}</span>
    <div className="tooltip-content">{detalle || '-'}</div>
  </div>;
}

function DeltaTheme() {
  return <style>{`
    :root {
      --delta-bg: #050505;
      --delta-panel: #0b0b0d;
      --delta-panel-2: #111113;
      --delta-line: rgba(239, 68, 68, 0.28);
      --delta-red: #dc2626;
      --delta-red-2: #b91c1c;
      --delta-red-soft: rgba(220, 38, 38, 0.16);
      --delta-text: #f8fafc;
      --delta-muted: #cbd5e1;
    }
    body { background: var(--delta-bg) !important; color: var(--delta-text) !important; }
    .delta-app, .main, .login-page { background: radial-gradient(circle at top left, rgba(185,28,28,.18), transparent 28%), #050505 !important; }
    .sidebar, .panel, .work-card, .metric-card, .modal-card, .login-card, .detail-page, .machine-card, .info-box { background: linear-gradient(180deg, #111113, #070707) !important; border-color: var(--delta-line) !important; }
    .topbar, .form-note, .production-preview { background: rgba(15, 15, 16, .92) !important; border-color: var(--delta-line) !important; }
    .primary-btn, .finish-btn { background: linear-gradient(135deg, var(--delta-red), var(--delta-red-2)) !important; color: #fff !important; border-color: rgba(248,113,113,.35) !important; }
    .secondary-btn, .ghost-btn, .icon-btn, .nav-btn { background: #151515 !important; color: #fff !important; border-color: rgba(239,68,68,.28) !important; }
    .nav-btn.active, .status, .brand-pill, .logo-mark { background: var(--delta-red-soft) !important; color: #fecaca !important; border-color: rgba(248,113,113,.42) !important; }
    input, select, textarea { background: #080808 !important; color: #fff !important; border-color: rgba(239,68,68,.32) !important; }
    table, .table-wrap { background: #080808 !important; border-color: rgba(239,68,68,.24) !important; }
    th { color: #fca5a5 !important; }
    td, th { border-color: rgba(239,68,68,.18) !important; }
    .progress-bar div { background: linear-gradient(90deg, var(--delta-red), #f87171) !important; }
    .alert-success { background: rgba(22, 101, 52, .25) !important; border-color: rgba(34,197,94,.38) !important; }
    .alert-error { background: rgba(127, 29, 29, .35) !important; border-color: rgba(248,113,113,.45) !important; }
    .resumen-finalizado {
      margin-top: 14px;
      border: 1px solid rgba(248,113,113,.28);
      border-radius: 14px;
      padding: 12px 14px;
      background: rgba(127,29,29,.12);
    }
    .resumen-finalizado summary {
      cursor: pointer;
      color: #fca5a5;
      font-weight: 800;
      list-style-position: inside;
    }
    .resumen-finalizado-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 16px;
      margin-top: 12px;
      color: #fff;
      font-size: 13px;
      line-height: 1.45;
    }
    .resumen-finalizado-grid strong { color: #fca5a5; }
    .resumen-detalle-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }
    .resumen-bloque {
      border: 1px solid rgba(248,113,113,.20);
      border-radius: 12px;
      padding: 12px;
      background: rgba(0,0,0,.22);
    }
    .resumen-bloque > strong { color: #fca5a5; display: block; margin-bottom: 8px; }
    .resumen-bloque ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .resumen-bloque li { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(248,113,113,.12); padding-bottom: 6px; }
    .resumen-bloque li:last-child { border-bottom: 0; padding-bottom: 0; }
    .resumen-bloque span { color: #fff; }
    .resumen-bloque b { color: #fecaca; white-space: nowrap; }
    .tooltip-card {
      position: relative;
      border-radius: 14px;
      padding: 14px 16px;
      min-height: 56px;
      display: flex;
      align-items: center;
      background: rgba(19, 19, 20, .96);
      border: 1px solid rgba(239, 68, 68, .32);
      color: #fff;
      font-weight: 800;
      cursor: help;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.02);
    }
    .tooltip-card span { color: #fca5a5; }
    .tooltip-content {
      position: absolute;
      left: 12px;
      top: calc(100% + 8px);
      z-index: 9999;
      min-width: 260px;
      max-width: 420px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #111;
      border: 1px solid rgba(248,113,113,.45);
      color: #fff;
      font-weight: 700;
      line-height: 1.35;
      box-shadow: 0 18px 40px rgba(0,0,0,.55);
      opacity: 0;
      transform: translateY(-4px);
      pointer-events: none;
      transition: opacity .15s ease, transform .15s ease;
      white-space: normal;
    }
    .tooltip-card:hover .tooltip-content, .tooltip-card:focus .tooltip-content { opacity: 1; transform: translateY(0); }

    .delta-logo-img {
      width: 54px;
      height: 54px;
      border-radius: 10px;
      object-fit: cover;
      border: 1px solid rgba(248,113,113,.38);
      box-shadow: 0 0 0 3px rgba(220,38,38,.12);
      background: #111;
      flex: 0 0 auto;
    }
    .login-logo-img {
      width: 118px;
      height: 118px;
      border-radius: 16px;
      object-fit: cover;
      display: block;
      margin: 0 auto 18px auto;
      border: 1px solid rgba(248,113,113,.38);
      box-shadow: 0 18px 40px rgba(0,0,0,.42);
    }
  `}</style>;
}

export default function App() {
  const [usuario, setUsuario] = useState(() => JSON.parse(localStorage.getItem('delta_usuario') || 'null'));
  const [datos, setDatos] = useState(() => leerJSONLocal(STORAGE_DATOS, null));
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensajeOk, setMensajeOk] = useState('');
  const [vista, setVista] = useState('dashboard');
  const [busqueda, setBusqueda] = useState('');
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState(null);
  const [modalTrabajo, setModalTrabajo] = useState(false);
  const [modalAvance, setModalAvance] = useState(false);
  const [modalFinalizacion, setModalFinalizacion] = useState(null);
  const [pendientes, setPendientes] = useState(() => leerJSONLocal(STORAGE_PENDIENTES, pendientesVacios()));

  async function cargarDatos() {
    setCargando(true);
    setError('');
    try {
      const datosExcel = await obtenerDatosIniciales();
      setDatos(datosExcel || datosVacios());
      guardarJSONLocal(STORAGE_DATOS, datosExcel || datosVacios());
      setMensajeOk('Datos actualizados desde Excel');
      setTimeout(() => setMensajeOk(''), 3000);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos desde Excel. Se mantienen los datos guardados en la app.');
      if (!datos) setDatos(leerJSONLocal(STORAGE_DATOS, datosVacios()));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (usuario && !datos) cargarDatos();
  }, [usuario]);

  useEffect(() => {
    if (datos) guardarJSONLocal(STORAGE_DATOS, datos);
  }, [datos]);

  useEffect(() => {
    guardarJSONLocal(STORAGE_PENDIENTES, pendientes);
  }, [pendientes]);

  function ingresar(form) {
    setError('');
    const email = normalizarEmail(form.email);
    const usuarioPermitido = USUARIOS_PERMITIDOS[email];

    if (!usuarioPermitido) {
      setError('Usuario no autorizado. Usá un mail habilitado por Delta Mining.');
      return;
    }

    localStorage.setItem('delta_usuario', JSON.stringify(usuarioPermitido));
    setUsuario(usuarioPermitido);
    setVista('dashboard');
  }
  function salir() { localStorage.removeItem('delta_usuario'); setUsuario(null); }

  const trabajos = datos?.trabajos || [], avances = datos?.avances || [], equipos = datos?.equipos || [], tareas = datos?.tareas || [], supervisores = datos?.supervisores || [], proyectos = datos?.proyectos || [], equiposAvance = datos?.equiposAvance || [];

  async function cambiarEstadoTrabajo(id, nuevoEstado) {
    setError('');
    setMensajeOk('');

    if (nuevoEstado === 'Finalizado') {
      setModalFinalizacion({ idTrabajo: id, fechaFin: hoyISO() });
      return;
    }

    aplicarCambioEstadoTrabajo(id, nuevoEstado, '');
  }

  function aplicarCambioEstadoTrabajo(id, nuevoEstado, fechaFinalizacion = '') {
    const fechaFinal = nuevoEstado === 'Finalizado' ? String(fechaFinalizacion || hoyISO()).trim() : '';

    setDatos((prev) => {
      const base = prev || datosVacios();
      return {
        ...base,
        trabajos: actualizarListaPorId(base.trabajos, id, { 'Estado trabajo': nuevoEstado, Estado: nuevoEstado, ...(nuevoEstado === 'Finalizado' ? { 'Fecha fin': fechaFinal } : { 'Fecha fin': '' }) })
      };
    });

    setPendientes((prev) => {
      const base = prev || pendientesVacios();
      const sinDuplicado = (base.estados || []).filter((x) => String(x.idTrabajo) !== String(id));
      return { ...base, estados: [...sinDuplicado, { idTrabajo: id, estado: nuevoEstado, fechaFin: fechaFinal }] };
    });

    // Cambio guardado localmente. No se muestra cartel para no ensuciar la pantalla.
  }

  function guardarTrabajoLocal(trabajo) {
    const id = idTrabajo(trabajo) || generarIdLocal('TR');
    const nuevoTrabajo = {
      ...trabajo,
      ID_Trabajo: id,
      'ID Trabajo': id,
      'Estado trabajo': trabajo['Estado trabajo'] || trabajo.Estado || 'En curso',
      Estado: trabajo['Estado trabajo'] || trabajo.Estado || 'En curso'
    };

    setDatos((prev) => {
      const base = prev || datosVacios();
      return { ...base, trabajos: [...(base.trabajos || []), nuevoTrabajo] };
    });

    setPendientes((prev) => {
      const base = prev || pendientesVacios();
      return { ...base, trabajos: [...(base.trabajos || []), nuevoTrabajo] };
    });

    setModalTrabajo(false);
    setMensajeOk('Trabajo guardado en la app. Pendiente de actualizar Excel.');
    setTimeout(() => setMensajeOk(''), 4500);
  }

  function guardarAvanceLocal(avance) {
    const idAvanceNuevo = avance.ID_Avance || generarIdLocal('AV');
    const equiposConIds = (avance.equipos || []).map((eq) => ({
      ...eq,
      ID_Equipo_Avance: eq.ID_Equipo_Avance || generarIdLocal('EA'),
      ID_Avance: idAvanceNuevo,
      'ID Avance': idAvanceNuevo,
      ID_Trabajo: avance.ID_Trabajo,
      'ID Trabajo': avance.ID_Trabajo,
      Fecha: avance.Fecha,
      Supervisor: avance.Supervisor
    }));

    const avanceLocal = {
      ...avance,
      ID_Avance: idAvanceNuevo,
      'ID Avance': idAvanceNuevo,
      equipos: equiposConIds
    };

    setDatos((prev) => {
      const base = prev || datosVacios();
      return {
        ...base,
        avances: [...(base.avances || []), avanceLocal],
        equiposAvance: [...(base.equiposAvance || []), ...equiposConIds]
      };
    });

    setPendientes((prev) => {
      const base = prev || pendientesVacios();
      return { ...base, avances: [...(base.avances || []), avanceLocal] };
    });

    setModalAvance(false);
    setMensajeOk('Avance guardado en la app. Pendiente de actualizar Excel.');
    setTimeout(() => setMensajeOk(''), 4500);
  }

  async function actualizarExcel() {
    const total = cantidadPendiente(pendientes);
    if (!total) {
      setMensajeOk('No hay registros pendientes para enviar a Excel.');
      setTimeout(() => setMensajeOk(''), 3000);
      return;
    }

    setCargando(true);
    setError('');
    setMensajeOk('');
    try {
      const res = await sincronizarPendientes(pendientes);
      setPendientes(pendientesVacios());
      localStorage.setItem(STORAGE_PENDIENTES, JSON.stringify(pendientesVacios()));
      setMensajeOk(res?.mensaje || 'Excel actualizado correctamente');
      await cargarDatos();
      setTimeout(() => setMensajeOk(''), 4500);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar Excel. Los datos siguen guardados en la app.');
    } finally {
      setCargando(false);
    }
  }

  const trabajosVisibles = useMemo(() => {
    return trabajos.filter((t) => puedeVerTrabajo(usuario, t));
  }, [trabajos, usuario]);

  const trabajosFiltrados = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return trabajosVisibles.filter((t) => !q || normalizarTexto(`${nombreTrabajo(t)} ${proyectoTrabajo(t)} ${supervisorTrabajo(t)} ${estadoTrabajo(t)}`).includes(q));
  }, [trabajosVisibles, busqueda]);

  const metricas = useMemo(() => {
    const activos = trabajosVisibles.filter((t) => normalizarTexto(estadoTrabajo(t)) === 'EN CURSO').length;
    const pausados = trabajosVisibles.filter((t) => ['PAUSADO', 'EN PAUSA'].includes(normalizarTexto(estadoTrabajo(t)))).length;
    const finalizados = trabajosVisibles.filter((t) => normalizarTexto(estadoTrabajo(t)) === 'FINALIZADO').length;
    const registrosEquipos = equiposAvance.length;
    return { activos, pausados, finalizados, registrosEquipos };
  }, [trabajosVisibles, equiposAvance]);

  if (!usuario) return <Login onIngresar={ingresar} />;

  return <div className="delta-app">
    <DeltaTheme />
    <aside className="sidebar">
      <div className="logo-box"><img className="delta-logo-img" src={DELTA_LOGO} alt="Delta Mining" /><div><strong>DELTA MINING</strong><span>Trabajos & Productividad</span></div></div>
      <NavButton active={vista === 'dashboard'} icon={<BarChart3 />} text="Dashboard" onClick={() => setVista('dashboard')} />
      <NavButton active={vista === 'trabajos'} icon={<Construction />} text="Trabajos" onClick={() => setVista('trabajos')} />
      <NavButton active={vista === 'estados'} icon={<CheckCircle2 />} text="Estados" onClick={() => setVista('estados')} />
      <NavButton active={vista === 'historial'} icon={<FileText />} text="Historial" onClick={() => setVista('historial')} />
      <NavButton active={vista === 'lineaTiempo'} icon={<Activity />} text="Línea de tiempo" onClick={() => setVista('lineaTiempo')} />
      {esAdmin(usuario) && <NavButton active={vista === 'maestros'} icon={<Settings />} text="Datos maestros" onClick={() => setVista('maestros')} />}
      <div className="sidebar-footer"><small>{usuario.nombre}</small><button className="ghost-btn" onClick={salir}><LogOut size={16} /> Salir</button></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><h1>{tituloVista(vista)}</h1><p>Gestión diaria de trabajos, equipos, horas y productividad.</p></div><div className="top-actions"><button className="secondary-btn" onClick={cargarDatos}><RefreshCw size={17} /> Actualizar desde Excel</button>{esAdmin(usuario) && <button className="secondary-btn" onClick={actualizarExcel}><Save size={17} /> Actualizar Excel ({cantidadPendiente(pendientes)})</button>}<button className="primary-btn" onClick={() => setModalTrabajo(true)}><Plus size={17} /> Nuevo trabajo</button></div></header>
      {error && <div className="alert-error">{error}</div>}{mensajeOk && <div className="alert-success">{mensajeOk}</div>}{cargando && <div className="loading-line">Cargando datos...</div>}
      <section className="metrics-grid"><MetricCard icon={<Construction />} label="Trabajos en curso" value={metricas.activos} /><MetricCard icon={<Clock />} label="En pausa" value={metricas.pausados} /><MetricCard icon={<CheckCircle2 />} label="Finalizados" value={metricas.finalizados} /><MetricCard icon={<Activity />} label="Registros de equipos" value={metricas.registrosEquipos} /></section>

      {vista === 'trabajos' && <section><div className="panel-head"><div className="search-box"><Search size={18} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por trabajo, proyecto o supervisor..." /></div></div><div className="cards-grid">{trabajosFiltrados.map((t, idx) => <TrabajoCard key={idTrabajo(t) || idx} trabajo={t} avances={avances} equiposAvance={equiposAvance} onAbrir={() => { setTrabajoSeleccionado(t); setVista('detalle'); }} onAvance={() => { setTrabajoSeleccionado(t); setModalAvance(true); }} onCambiarEstado={cambiarEstadoTrabajo} />)}</div>{!trabajosFiltrados.length && <Empty text="Todavía no hay trabajos cargados." />}</section>}
      {vista === 'detalle' && trabajoSeleccionado && <DetalleTrabajo trabajo={trabajoSeleccionado} avances={avances} equiposAvance={equiposAvance} onVolver={() => setVista('trabajos')} onCargarAvance={() => setModalAvance(true)} />}
      {vista === 'estados' && <EstadosTrabajos trabajos={trabajosFiltrados} avances={avances} equiposAvance={equiposAvance} onCambiarEstado={cambiarEstadoTrabajo} />}
      {vista === 'dashboard' && <Dashboard trabajos={trabajosVisibles} avances={avances} equiposAvance={equiposAvance} />}
      {vista === 'historial' && <Historial avances={avances} trabajos={trabajosVisibles} equiposAvance={equiposAvance} />}
      {vista === 'lineaTiempo' && <LineaTiempo trabajos={trabajosVisibles} avances={avances} equiposAvance={equiposAvance} />}
      {vista === 'maestros' && esAdmin(usuario) && <Maestros proyectos={proyectos} supervisores={supervisores} equipos={equipos} tareas={tareas} />}
    </main>

    {modalTrabajo && <Modal title="Nuevo trabajo" onClose={() => setModalTrabajo(false)}><FormularioTrabajo proyectos={proyectos} supervisores={supervisores} onGuardar={async (trabajo) => { try { setError(''); setMensajeOk(''); guardarTrabajoLocal(trabajo); } catch (err) { setMensajeOk(''); setError(err.message || 'No se pudo guardar el trabajo'); } }} /></Modal>}
    {modalAvance && trabajoSeleccionado && <Modal title={`Cargar avance - ${nombreTrabajo(trabajoSeleccionado)}`} onClose={() => setModalAvance(false)}><FormularioAvance trabajo={trabajoSeleccionado} tareas={tareas} equipos={equipos} usuario={usuario} onGuardar={async (avance) => { try { setError(''); setMensajeOk(''); guardarAvanceLocal(avance); } catch (err) { setMensajeOk(''); setError(err.message || 'No se pudo guardar el avance'); } }} /></Modal>}
    {modalFinalizacion && <ModalFinalizarTrabajo fechaInicial={modalFinalizacion.fechaFin} onClose={() => setModalFinalizacion(null)} onConfirmar={(fechaFin) => { aplicarCambioEstadoTrabajo(modalFinalizacion.idTrabajo, 'Finalizado', fechaFin); setModalFinalizacion(null); }} />}
  </div>;
}

function ModalFinalizarTrabajo({ fechaInicial, onClose, onConfirmar }) {
  const [fechaFin, setFechaFin] = useState(fechaInicial || hoyISO());
  const [errorLocal, setErrorLocal] = useState('');

  function confirmar(e) {
    e.preventDefault();
    setErrorLocal('');

    if (!fechaFin) {
      setErrorLocal('Falta seleccionar la fecha de finalización');
      return;
    }

    onConfirmar(fechaFin);
  }

  return <Modal title="Finalizar trabajo" onClose={onClose}>
    <form className="form-grid" onSubmit={confirmar}>
      <div className="form-note">
        Seleccioná la fecha de finalización dentro de la app. No se abrirán ventanas del navegador.
      </div>

      {errorLocal && <div className="alert-error">{errorLocal}</div>}

      <Field label="Fecha de finalización">
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          autoFocus
          required
        />
      </Field>

      <div className="card-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary-btn"><CheckCircle2 size={17} /> Finalizar trabajo</button>
      </div>
    </form>
  </Modal>;
}

function Login({ onIngresar }) {
  const [email, setEmail] = useState('');
  const usuarioPreview = USUARIOS_PERMITIDOS[normalizarEmail(email)];

  return <main className="login-page"><DeltaTheme /><section className="login-card"><img className="login-logo-img" src={DELTA_LOGO} alt="Delta Mining" /><div className="brand-pill">DELTA MINING</div><h1>Trabajos y Productividad</h1><p>Ingresá con tu mail autorizado de Delta Mining.</p><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@deltamining.com.ar" />{usuarioPreview && <div className="form-note">Usuario: <strong>{usuarioPreview.nombre}</strong> · Rol: <strong>{usuarioPreview.rol}</strong></div>}<button className="primary-btn full" onClick={() => onIngresar({ email })}>Ingresar</button></section></main>;
}
function NavButton({ active, icon, text, onClick }) { return <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>{icon}{text}</button>; }
function MetricCard({ icon, label, value }) { return <div className="metric-card"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong></div>; }
function TrabajoCard({ trabajo, avances, equiposAvance, onAbrir, onAvance, onCambiarEstado }) {
  const id = idTrabajo(trabajo), estado = estadoTrabajo(trabajo);
  const avancesTrabajo = avances.filter((a) => String(valor(a, ['ID_Trabajo', 'ID Trabajo'])) === String(id));

  async function cambiar(e) {
    const nuevoEstado = e.target.value;
    if (nuevoEstado === estado) return;
    await onCambiarEstado(id, nuevoEstado);
  }

  return <article className="work-card">
    <div className="work-top"><span className={`status ${normalizarTexto(estado).toLowerCase().replaceAll(' ', '-')}`}>{estado}</span><button className="icon-btn" onClick={onAbrir}><Eye size={17} /></button></div>
    <h3>{nombreTrabajo(trabajo) || 'Trabajo sin nombre'}</h3>
    <div className="work-info"><span><Construction size={15} /> {proyectoTrabajo(trabajo) || 'Sin proyecto'}</span><span><Users size={15} /> {supervisorTrabajo(trabajo) || 'Sin supervisor'}</span><span><CalendarDays size={15} /> {fechaInicioTrabajo(trabajo) || 'Sin fecha'}</span></div>
    <div className="progress-box"><div className="progress-label"><span>Avances registrados</span><strong>{avancesTrabajo.length}</strong></div><div className="progress-bar"><div style={{ width: `${Math.min(100, avancesTrabajo.length * 10)}%` }} /></div></div>
    <Field label="Estado del trabajo">
      <select value={estado} onChange={cambiar}>
        <option>En curso</option>
        <option>En pausa</option>
        <option>Finalizado</option>
      </select>
    </Field>
    <div className="card-actions"><button className="secondary-btn" onClick={onAbrir}>Ver detalle</button><button className="primary-btn" onClick={onAvance}>Cargar avance</button></div>
    {normalizarTexto(estado) === 'FINALIZADO' && <ResumenFinalizado trabajo={trabajo} avances={avances} equiposAvance={equiposAvance} />}
  </article>;
}

function DetalleTrabajo({ trabajo, avances, equiposAvance, onVolver, onCargarAvance }) {
  const id = idTrabajo(trabajo);
  const avancesTrabajo = avances.filter((a) => String(valor(a, ['ID_Trabajo', 'ID Trabajo'])) === String(id));
  const equiposTrabajo = (equiposAvance || []).filter((e) => String(valor(e, ['ID_Trabajo', 'ID Trabajo'])) === String(id));

  return <section className="detail-page">
    <button className="ghost-btn" onClick={onVolver}>← Volver</button>
    <div className="detail-header">
      <div>
        <span className="status">{estadoTrabajo(trabajo)}</span>
        <h2>{nombreTrabajo(trabajo)}</h2>
        <p>{proyectoTrabajo(trabajo)} · {supervisorTrabajo(trabajo)}</p>
      </div>
      <button className="primary-btn" onClick={onCargarAvance}><Plus size={17} /> Cargar avance de hoy</button>
    </div>
    <div className="detail-grid">
      <InfoBox label="Frente/Lugar" value={frenteTrabajo(trabajo)} />
      <InfoBox label="Fecha inicio" value={fechaInicioTrabajo(trabajo)} />
      <InfoBox label="Fecha fin" value={fechaFinTrabajo(trabajo)} />
      <InfoBox label="Avances" value={equiposTrabajo.length || avancesTrabajo.length} />
    </div>
    <h3>Avances por tarea y equipo</h3>
    <TablaAvances avances={avancesTrabajo} equiposAvance={equiposTrabajo} />
    {(!avancesTrabajo.length && !equiposTrabajo.length) && <Empty text="Este trabajo todavía no tiene avances." />}
  </section>;
}

function buscarAvancePorEquipo(avances, equipo) {
  const idAv = valor(equipo, ['ID_Avance', 'ID Avance', 'ID_AVANCE']);
  if (idAv) {
    const porId = avances.find((a) => String(valor(a, ['ID_Avance', 'ID Avance', 'ID_AVANCE'])) === String(idAv));
    if (porId) return porId;
  }

  const idTr = valor(equipo, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO']);
  const fecha = formatearFecha(valor(equipo, ['Fecha', 'FECHA']));
  return avances.find((a) =>
    String(valor(a, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO'])) === String(idTr) &&
    formatearFecha(valor(a, ['Fecha', 'FECHA'])) === fecha
  );
}

function valorAvanceEquipo(equipo, avance, clavesEquipo, clavesAvance = []) {
  return valor(equipo, clavesEquipo) || valor(avance, clavesAvance.length ? clavesAvance : clavesEquipo);
}

function TablaAvances({ avances, equiposAvance }) {
  const filas = (equiposAvance && equiposAvance.length)
    ? equiposAvance.map((e) => ({ equipo: e, avance: buscarAvancePorEquipo(avances, e) || {} }))
    : avances.map((a) => ({ equipo: {}, avance: a }));

  return <div className="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Equipo</th>
          <th>Horas</th>
          <th>Tarea</th>
          <th>Unidad</th>
          <th>Cantidad productiva</th>
          <th>Productividad</th>
          <th>Observación</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => {
          const e = fila.equipo || {};
          const a = fila.avance || {};
          const cantidad = valorAvanceEquipo(
            e,
            a,
            ['Cantidad productiva', 'Total', 'Cantidad producida', 'Cantidad', 'Produccion calculada', 'Producción calculada'],
            ['Cantidad productiva', 'Total', 'Cantidad producida', 'Cantidad', 'Produccion calculada', 'Producción calculada']
          );

          return <tr key={i}>
            <td>{formatearFecha(valorAvanceEquipo(e, a, ['Fecha', 'FECHA'])) || '-'}</td>
            <td>{valorAvanceEquipo(e, a, ['Equipo', 'Código interno', 'Codigo interno', 'ID_Equipo', 'Tipo equipo']) || '-'}</td>
            <td>{valorAvanceEquipo(e, a, ['Horas trabajadas', 'Horas', 'Hs']) || '-'}</td>
            <td>{valorAvanceEquipo(e, a, ['Tarea realizada', 'Tarea'], ['Tarea realizada', 'Tarea']) || '-'}</td>
            <td>{valorAvanceEquipo(e, a, ['Unidad', 'Unidad productividad'], ['Unidad', 'Unidad productividad']) || '-'}</td>
            <td>{cantidad !== '' ? cantidad : '-'}</td>
            <td>{mostrarProductividad(valorAvanceEquipo(e, a, ['Productividad', 'Productividad por hora']), valorAvanceEquipo(e, a, ['Unidad', 'Unidad productividad'], ['Unidad', 'Unidad productividad']))}</td>
            <td>{valorAvanceEquipo(e, a, ['Observación', 'Observacion'], ['Observación', 'Observacion']) || '-'}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}
function FormularioTrabajo({ proyectos, supervisores, onGuardar }) {
  const [form, setForm] = useState({
    'Nombre trabajo': '',
    Proyecto: '',
    'Frente/Lugar': '',
    'Tipo de trabajo': '',
    'Supervisor responsable': '',
    'Fecha inicio': hoyISO(),
    'Estado trabajo': 'En curso',
    'Descripción general': ''
  });
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  async function enviarFormulario(e) {
    e.preventDefault();
    setErrorLocal('');

    if (!form['Nombre trabajo']) return setErrorLocal('Falta cargar el nombre del trabajo');
    if (!form.Proyecto) return setErrorLocal('Falta seleccionar proyecto');
    if (!form['Supervisor responsable']) return setErrorLocal('Falta seleccionar supervisor que inició el trabajo');

    try {
      setGuardando(true);
      await onGuardar(form);
    } catch (err) {
      setErrorLocal(err.message || 'No se pudo guardar el trabajo');
    } finally {
      setGuardando(false);
    }
  }

  return <form className="form-grid" onSubmit={enviarFormulario}>
    {errorLocal && <div className="alert-error">{errorLocal}</div>}

    <Field label="Nombre del trabajo">
      <input required value={form['Nombre trabajo']} onChange={(e) => setForm({ ...form, 'Nombre trabajo': e.target.value })} />
    </Field>

    <Field label="Proyecto">
      <select required value={form.Proyecto} onChange={(e) => setForm({ ...form, Proyecto: e.target.value })}>
        <option value="">Seleccionar...</option>
        {proyectos.map((p, i) => <option key={i}>{valor(p, ['Proyecto', 'Nombre', 'PROYECTO'])}</option>)}
      </select>
    </Field>

    <Field label="Frente/Lugar">
      <input value={form['Frente/Lugar']} onChange={(e) => setForm({ ...form, 'Frente/Lugar': e.target.value })} placeholder="Ej: Camino Aurora" />
    </Field>

    <Field label="Tipo de trabajo">
      <input value={form['Tipo de trabajo']} onChange={(e) => setForm({ ...form, 'Tipo de trabajo': e.target.value })} placeholder="Ej: Movimiento de suelo" />
    </Field>

    <Field label="Supervisor que inició el trabajo">
      <select required value={form['Supervisor responsable']} onChange={(e) => setForm({ ...form, 'Supervisor responsable': e.target.value })}>
        <option value="">Seleccionar...</option>
        {supervisores.map((s, i) => <option key={i}>{valor(s, ['Supervisor', 'Nombre', 'Nombre supervisor'])}</option>)}
      </select>
    </Field>

    <Field label="Fecha inicio">
      <input type="date" value={form['Fecha inicio']} onChange={(e) => setForm({ ...form, 'Fecha inicio': e.target.value })} />
    </Field>

    <Field label="Estado">
      <select value={form['Estado trabajo']} onChange={(e) => setForm({ ...form, 'Estado trabajo': e.target.value })}>
        {ESTADOS_TRABAJO.map((e) => <option key={e}>{e}</option>)}
      </select>
    </Field>

    <Field label="Descripción general">
      <textarea value={form['Descripción general']} onChange={(e) => setForm({ ...form, 'Descripción general': e.target.value })} />
    </Field>

    <button className="primary-btn full" type="submit" disabled={guardando}>
      <Save size={17} /> {guardando ? 'Guardando...' : 'Guardar trabajo'}
    </button>
  </form>;
}

function FormularioAvance({ trabajo, tareas, equipos, usuario, onGuardar }) {
  function crearEquipoVacio() {
    return {
      "Código interno": "",
      Equipo: "",
      "Tipo equipo": "",
      Tarea: "",
      Unidad: "",
      Total: "",
      Horas: "",
      Observacion: "",
    };
  }

  const [form, setForm] = useState({
    ID_Trabajo: idTrabajo(trabajo),
    Fecha: hoyISO(),
    Supervisor: usuario.nombre,
    equipos: [crearEquipoVacio()],
  });
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  function equipoSeleccionado(eqForm) {
    return equipos.find((e) => String(equipoCodigo(e)) === String(eqForm["Código interno"]));
  }

  function tareasFiltradas(eqForm) {
    return tareasParaEquipo(tareas, equipoSeleccionado(eqForm));
  }

  function actualizarEquipo(index, key, value) {
    const copia = [...form.equipos];
    const actual = { ...copia[index] };

    if (key === "Código interno") {
      const eq = equipos.find((e) => String(equipoCodigo(e)) === String(value));
      actual["Código interno"] = value;
      actual.Equipo = equipoNombre(eq);
      actual["Tipo equipo"] = equipoTipo(eq) || equipoNombre(eq);
      actual.Tarea = "";
      actual.Unidad = "";
      actual.Total = "";
    } else if (key === "Tarea") {
      const eqSel = equipoSeleccionado(actual);
      const listaTareas = eqSel ? tareasParaEquipo(tareas, eqSel) : [];
      const opcionesUnidad = unidadesDisponiblesPorNombre(tareas, value, eqSel);
      actual.Tarea = value;
      actual.Unidad = opcionesUnidad.length === 1 ? opcionesUnidad[0] : "";
      actual.Total = "";
    } else {
      actual[key] = value;
    }

    copia[index] = actual;
    setForm({ ...form, equipos: copia });
  }

  function agregarEquipo() {
    setForm({ ...form, equipos: [...form.equipos, crearEquipoVacio()] });
  }

  function quitarEquipo(index) {
    if (form.equipos.length === 1) return;
    setForm({ ...form, equipos: form.equipos.filter((_, i) => i !== index) });
  }

  function numeroLocal(v) {
    if (v === '' || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function produccionEquipo(eq) {
    return numeroLocal(eq.Total);
  }

  const produccionTotal = form.equipos.reduce((acc, eq) => acc + produccionEquipo(eq), 0);
  const horasTotal = form.equipos.reduce((acc, eq) => acc + numeroLocal(eq.Horas), 0);

  async function enviarFormulario(e) {
    e.preventDefault();
    setErrorLocal('');

    for (let i = 0; i < form.equipos.length; i++) {
      const eq = form.equipos[i];
      if (!eq["Código interno"]) return setErrorLocal(`Falta seleccionar equipo en Máquina ${i + 1}`);
      if (!eq.Horas) return setErrorLocal(`Faltan horas trabajadas en Máquina ${i + 1}`);
      if (!eq.Tarea) return setErrorLocal(`Falta seleccionar tarea en Máquina ${i + 1}`);
      if (!eq.Unidad) return setErrorLocal(`Falta seleccionar unidad en Máquina ${i + 1}`);
      if (eq.Total === '' || eq.Total === null || eq.Total === undefined) return setErrorLocal(`Falta cargar total en Máquina ${i + 1}`);
    }

    const equiposConProduccion = form.equipos.map((eq) => {
      const prod = produccionEquipo(eq);
      const productividad = esUnidadHoras(eq.Unidad) ? '' : calcularProductividad(prod, eq.Horas);

      return {
        ...eq,
        Cantidad: prod,
        Total: prod,
        "Cantidad producida": prod,
        "Cantidad productiva": prod,
        "Cantidad producida avance": prod,
        "Productividad": productividad,
        "Productividad por hora": productividad,
        "Unidad productividad": eq.Unidad,
        "Horas trabajadas": numeroLocal(eq.Horas),
        "Tarea realizada": eq.Tarea,
        "Observación": eq.Observacion,
      };
    });

    const primerEquipo = equiposConProduccion[0] || {};

    try {
      setGuardando(true);
      await onGuardar({
        ID_Trabajo: form.ID_Trabajo,
        Fecha: form.Fecha,
        Supervisor: form.Supervisor,
        Tarea: primerEquipo.Tarea || "",
        Unidad: primerEquipo.Unidad || "",
        Cantidad: produccionTotal,
        Total: produccionTotal,
        "Cantidad productiva": produccionTotal,
        "Produccion calculada": produccionTotal,
        Observacion: equiposConProduccion.map((eq) => eq.Observacion).filter(Boolean).join(" | "),
        equipos: equiposConProduccion,
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={enviarFormulario}>
      <div className="form-note">
        Trabajo: <strong>{nombreTrabajo(trabajo)}</strong>
      </div>

      {errorLocal && <div className="alert-error">{errorLocal}</div>}

      <Field label="Fecha del avance">
        <input
          type="date"
          value={form.Fecha}
          onChange={(e) => setForm({ ...form, Fecha: e.target.value })}
        />
      </Field>

      <div className="production-preview">
        Producción total del avance: <strong>{produccionTotal.toFixed(2)}</strong>
        {" · "}
        Horas totales: <strong>{horasTotal.toFixed(2)}</strong>
      </div>

      <div className="equipos-section">
        <div className="section-title">
          <h3>Máquinas / equipos cargados</h3>
          <button type="button" className="secondary-btn" onClick={agregarEquipo}>
            <Plus size={16} /> Cargar otra máquina
          </button>
        </div>

        {form.equipos.map((eq, index) => {
          const eqSel = equipoSeleccionado(eq);
          const tareasDisponibles = tareasFiltradas(eq);
          const unidades = unidadesDisponiblesPorNombre(tareas, eq.Tarea, eqSel);
          const prodEq = produccionEquipo(eq);
          const productividad = esUnidadHoras(eq.Unidad) ? '' : calcularProductividad(prodEq, eq.Horas);

          return (
            <div className="machine-card" key={index}>
              <div className="machine-head">
                <h4>Máquina {index + 1}</h4>
                <button type="button" className="icon-btn danger" onClick={() => quitarEquipo(index)} disabled={form.equipos.length === 1}>
                  <X size={16} />
                </button>
              </div>

              <div className="machine-grid">
                <Field label="Equipo">
                  <select
                    required
                    value={eq["Código interno"]}
                    onChange={(e) => actualizarEquipo(index, "Código interno", e.target.value)}
                  >
                    <option value="">Seleccionar equipo...</option>
                    {equipos.map((e, i) => (
                      <option key={i} value={equipoCodigo(e)}>
                        {equipoCodigo(e)} - {equipoNombre(e)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Horas trabajadas">
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={eq.Horas}
                    onChange={(e) => actualizarEquipo(index, "Horas", e.target.value)}
                    placeholder="Ej: 8"
                  />
                </Field>

                <Field label="Tarea realizada">
                  <select
                    required
                    value={eq.Tarea}
                    onChange={(e) => actualizarEquipo(index, "Tarea", e.target.value)}
                    disabled={!eq["Código interno"]}
                  >
                    <option value="">{eq["Código interno"] ? "Seleccionar tarea..." : "Primero seleccioná equipo"}</option>
                    {tareasDisponibles.map((t, i) => (
                      <option key={`${tareaNombre(t)}-${i}`} value={tareaNombre(t)}>{tareaNombre(t)}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Unidad">
                  <select
                    required
                    value={eq.Unidad || ""}
                    onChange={(e) => actualizarEquipo(index, "Unidad", e.target.value)}
                    disabled={!eq.Tarea}
                  >
                    <option value="">{eq.Tarea ? "Seleccionar unidad..." : "Primero seleccioná tarea"}</option>
                    {unidades.map((unidad) => (
                      <option key={unidad} value={unidad}>{unidad}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Total">
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={eq.Total}
                    onChange={(e) => actualizarEquipo(index, "Total", e.target.value)}
                    placeholder="Cantidad total producida"
                  />
                </Field>

                <Field label="Observación de la máquina">
                  <textarea
                    value={eq.Observacion}
                    onChange={(e) => actualizarEquipo(index, "Observacion", e.target.value)}
                    placeholder="Observación específica de esta máquina..."
                  />
                </Field>
              </div>

              <div className="machine-results">
                <span>Tipo: <strong>{eq["Tipo equipo"] || '-'}</strong></span>
                <span>Producción: <strong>{Number(prodEq || 0).toFixed(2)} {eq.Unidad}</strong></span>
                <span>Productividad: <strong>{esUnidadHoras(eq.Unidad) ? '-' : `${Number(productividad || 0).toFixed(2)} ${eq.Unidad}/hs`}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="primary-btn full" type="submit" disabled={guardando}>
        <Save size={17} /> {guardando ? 'Guardando...' : 'Guardar avance completo'}
      </button>
    </form>
  );
}

function LineaTiempo({ trabajos, avances, equiposAvance }) {
  const [trabajoId, setTrabajoId] = useState('');

  const trabajoElegido = trabajos.find((t) => String(idTrabajo(t)) === String(trabajoId));
  const equiposFiltrados = (equiposAvance || []).filter((e) =>
    !trabajoId || String(valor(e, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO'])) === String(trabajoId)
  );
  const avancesFiltrados = (avances || []).filter((a) =>
    !trabajoId || String(valor(a, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO'])) === String(trabajoId)
  );

  const filas = equiposFiltrados.length
    ? equiposFiltrados.map((e) => ({ equipo: e, avance: buscarAvancePorEquipo(avancesFiltrados, e) || {} }))
    : avancesFiltrados.map((a) => ({ equipo: {}, avance: a }));

  const porFecha = filas.reduce((acc, fila) => {
    const fecha = formatearFecha(valorAvanceEquipo(fila.equipo, fila.avance, ['Fecha', 'FECHA'])) || 'Sin fecha';
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(fila);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(porFecha).sort();

  const estilos = {
    contenedor: {
      marginTop: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      position: 'relative'
    },
    item: {
      display: 'grid',
      gridTemplateColumns: '160px 1fr',
      gap: 16,
      alignItems: 'stretch'
    },
    fecha: {
      border: '1px solid rgba(239, 68, 68, 0.45)',
      background: 'rgba(220, 38, 38, 0.13)',
      borderRadius: 18,
      padding: 16,
      minHeight: 110,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 8,
      color: '#fff'
    },
    card: {
      border: '1px solid rgba(148, 163, 184, 0.22)',
      background: 'rgba(15, 23, 42, 0.78)',
      borderRadius: 20,
      padding: 18,
      boxShadow: '0 12px 30px rgba(0,0,0,0.18)'
    },
    resumen: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
      gap: 10,
      marginBottom: 14
    },
    chip: {
      borderRadius: 14,
      padding: '10px 12px',
      background: 'rgba(42, 37, 34, 0.95)',
      border: '1px solid rgba(255, 193, 7, 0.12)'
    },
    chipLabel: {
      display: 'block',
      fontSize: 11,
      color: '#93c5fd',
      marginBottom: 4
    },
    chipValue: {
      color: '#fff',
      fontWeight: 800
    }
  };

  return <section className="panel">
    <h3>Línea de tiempo por trabajo</h3>

    <div className="form-grid">
      <Field label="Trabajo">
        <select value={trabajoId} onChange={(e) => setTrabajoId(e.target.value)}>
          <option value="">Todos los trabajos</option>
          {trabajos.map((t, i) => <option key={i} value={idTrabajo(t)}>{nombreTrabajo(t) || idTrabajo(t)}</option>)}
        </select>
      </Field>
    </div>

    {trabajoElegido && <div className="form-note" style={{ marginTop: 12 }}>
      Trabajo: <strong>{nombreTrabajo(trabajoElegido)}</strong> · {proyectoTrabajo(trabajoElegido)} · {supervisorTrabajo(trabajoElegido)}
    </div>}

    <div style={estilos.contenedor}>
      {fechasOrdenadas.map((fecha) => {
        const registros = porFecha[fecha];

        const produccionDia = registros.reduce((acc, fila) => {
          const cantidad = valorAvanceEquipo(
            fila.equipo,
            fila.avance,
            ['Cantidad productiva', 'Total', 'Cantidad producida', 'Cantidad', 'Produccion calculada', 'Producción calculada']
          );
          return acc + (Number(cantidad) || 0);
        }, 0);

        const horasDia = registros.reduce((acc, fila) => {
          const horas = valorAvanceEquipo(fila.equipo, fila.avance, ['Horas trabajadas', 'Horas', 'Hs']);
          return acc + (Number(horas) || 0);
        }, 0);

        const equiposDia = registros
          .map((fila) => valorAvanceEquipo(fila.equipo, fila.avance, ['Equipo', 'Código interno', 'Codigo interno', 'ID_Equipo', 'Tipo equipo']))
          .filter(Boolean);

        const tareasDia = registros
          .map((fila) => valorAvanceEquipo(fila.equipo, fila.avance, ['Tarea realizada', 'Tarea'], ['Tarea realizada', 'Tarea']))
          .filter(Boolean);

        const unidadesDia = registros
          .map((fila) => valorAvanceEquipo(fila.equipo, fila.avance, ['Unidad', 'Unidad productividad'], ['Unidad', 'Unidad productividad']))
          .filter(Boolean);

        return <div style={estilos.item} key={fecha}>
          <div style={estilos.fecha}>
            <strong style={{ fontSize: 20 }}>{fecha}</strong>
            <span style={{ color: '#fecaca', fontWeight: 700 }}>{registros.length} registro{registros.length === 1 ? '' : 's'}</span>
          </div>

          <div style={estilos.card}>
            <div style={estilos.resumen}>
              <TooltipCard titulo="Trabajo realizado" detalle={tareasDia.length ? [...new Set(tareasDia)].join(' · ') : '-'} />
              <TooltipCard titulo="Máquinas" detalle={equiposDia.length ? [...new Set(equiposDia)].join(' · ') : '-'} />
              <TooltipCard titulo="Unidades usadas" detalle={unidadesDia.length ? [...new Set(unidadesDia)].join(' · ') : '-'} />
              <TooltipCard titulo="Registros cargados" detalle={`${registros.length} registro${registros.length === 1 ? '' : 's'}`} />
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Horas</th>
                    <th>Tarea</th>
                    <th>Unidad</th>
                    <th>Cantidad productiva</th>
                    <th>Productividad</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((fila, i) => (
                    <tr key={i}>
                      <td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Equipo', 'Código interno', 'Codigo interno', 'ID_Equipo', 'Tipo equipo']) || '-'}</td>
                      <td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Horas trabajadas', 'Horas', 'Hs']) || '-'}</td>
                      <td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Tarea realizada', 'Tarea'], ['Tarea realizada', 'Tarea']) || '-'}</td>
                      <td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Unidad', 'Unidad productividad'], ['Unidad', 'Unidad productividad']) || '-'}</td>
                      <td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Cantidad productiva', 'Total', 'Cantidad producida', 'Cantidad', 'Produccion calculada', 'Producción calculada']) || '-'}</td>
                      <td>{mostrarProductividad(valorAvanceEquipo(fila.equipo, fila.avance, ['Productividad', 'Productividad por hora']), valorAvanceEquipo(fila.equipo, fila.avance, ['Unidad', 'Unidad productividad'], ['Unidad', 'Unidad productividad']))}</td>
                      <td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Observación', 'Observacion'], ['Observación', 'Observacion']) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>;
      })}
    </div>

    {!fechasOrdenadas.length && <Empty text="No hay avances para mostrar en la línea de tiempo." />}
  </section>;
}

function Dashboard({ trabajos, avances, equiposAvance }) { const porTrabajo = trabajos.map((t) => { const id = idTrabajo(t); const av = avances.filter((a) => String(valor(a, ['ID_Trabajo', 'ID Trabajo'])) === String(id)); return { nombre: nombreTrabajo(t), avances: av.length }; }); return <section className="dashboard-grid"><div className="panel"><h3>Resumen por trabajo</h3>{porTrabajo.map((item, i) => <div className="mini-bar" key={i}><span>{item.nombre || 'Sin nombre'}</span><div><b style={{ width: `${Math.min(100, item.avances * 10)}%` }} /></div><strong>{item.avances}</strong></div>)}</div><div className="panel"><h3>Indicadores</h3><InfoBox label="Avances totales" value={avances.length} /><InfoBox label="Registros de equipos" value={equiposAvance.length} /><InfoBox label="Trabajos registrados" value={trabajos.length} /></div></section>; }
function Historial({ avances, trabajos, equiposAvance }) {
  const filas = (equiposAvance || []).length
    ? equiposAvance.map((e) => ({ equipo: e, avance: buscarAvancePorEquipo(avances, e) || {} }))
    : avances.map((a) => ({ equipo: {}, avance: a }));

  return <section className="panel"><h3>Historial completo de avances</h3><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Trabajo</th><th>Equipo</th><th>Horas</th><th>Tarea</th><th>Cantidad productiva</th><th>Unidad</th><th>Productividad</th><th>Unidad productiva</th></tr></thead><tbody>{filas.map((fila, i) => {
    const idTr = valorAvanceEquipo(fila.equipo, fila.avance, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO']);
    const tr = trabajos.find((t) => String(idTrabajo(t)) === String(idTr));
    const cantidad = valorAvanceEquipo(fila.equipo, fila.avance, ['Cantidad productiva', 'Total', 'Cantidad producida', 'Cantidad', 'Produccion calculada', 'Producción calculada']);
    const unidad = valorAvanceEquipo(fila.equipo, fila.avance, ['Unidad', 'Unidad productividad'], ['Unidad', 'Unidad productividad']);
    const productividad = valorAvanceEquipo(fila.equipo, fila.avance, ['Productividad', 'Productividad por hora']);
    return <tr key={i}><td>{formatearFecha(valorAvanceEquipo(fila.equipo, fila.avance, ['Fecha', 'FECHA']))}</td><td>{nombreTrabajo(tr) || idTr}</td><td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Equipo', 'Código interno', 'Codigo interno', 'ID_Equipo', 'Tipo equipo']) || '-'}</td><td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Horas trabajadas', 'Horas', 'Hs']) || '-'}</td><td>{valorAvanceEquipo(fila.equipo, fila.avance, ['Tarea realizada', 'Tarea'], ['Tarea realizada', 'Tarea']) || '-'}</td><td>{cantidad !== '' ? cantidad : '-'}</td><td>{unidad || '-'}</td><td>{mostrarProductividad(productividad, unidad)}</td><td>{unidadProductiva(unidad)}</td></tr>;
  })}</tbody></table></div>{!filas.length && <Empty text="Todavía no hay avances cargados." />}</section>;
}

function EstadosTrabajos({ trabajos, avances, equiposAvance, onCambiarEstado }) {
  return <section className="panel"><h3>Trabajos por estado</h3><div className="table-wrap"><table><thead><tr><th>Trabajo</th><th>Proyecto</th><th>Supervisor</th><th>Fecha inicio</th><th>Fecha fin</th><th>Avances</th><th>Estado</th></tr></thead><tbody>{trabajos.map((t, i) => {
    const id = idTrabajo(t);
    const avancesTrabajo = avances.filter((a) => String(valor(a, ['ID_Trabajo', 'ID Trabajo', 'ID_TRABAJO'])) === String(id));
    const finalizado = normalizarTexto(estadoTrabajo(t)) === 'FINALIZADO';
    return <Fragment key={id || i}>
      <tr><td>{nombreTrabajo(t) || '-'}</td><td>{proyectoTrabajo(t) || '-'}</td><td>{supervisorTrabajo(t) || '-'}</td><td>{fechaInicioTrabajo(t) || '-'}</td><td>{fechaFinTrabajo(t) || '-'}</td><td>{avancesTrabajo.length}</td><td><select value={estadoTrabajo(t)} onChange={(e) => onCambiarEstado(id, e.target.value)}><option>En curso</option><option>En pausa</option><option>Finalizado</option></select></td></tr>
      {finalizado && <tr key={`${id || i}-resumen`}><td colSpan="7"><ResumenFinalizado trabajo={t} avances={avances} equiposAvance={equiposAvance} /></td></tr>}
    </Fragment>;
  })}</tbody></table></div>{!trabajos.length && <Empty text="No hay trabajos cargados." />}</section>;
}

function Maestros({ proyectos, supervisores, equipos, tareas }) { return <section className="maestros-grid"><MasterList title="Proyectos" items={proyectos} /><MasterList title="Supervisores" items={supervisores} /><MasterList title="Equipos" items={equipos} /><MasterList title="Tareas y unidades" items={tareas} /></section>; }
function MasterList({ title, items }) { return <div className="panel"><h3>{title}</h3><p>{items.length} registros</p><div className="master-list">{items.slice(0, 10).map((item, i) => <span key={i}>{Object.values(item).filter(Boolean).slice(0, 3).join(' · ')}</span>)}</div></div>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Modal({ title, children, onClose }) { return <div className="modal-backdrop"><div className="modal-card"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X /></button></div>{children}</div></div>; }
function InfoBox({ label, value }) { return <div className="info-box"><span>{label}</span><strong>{value || '-'}</strong></div>; }
function Empty({ text }) { return <div className="empty-state">{text}</div>; }
function tituloVista(vista) { return ({ trabajos: 'Trabajos', estados: 'Estados de trabajos', detalle: 'Detalle del trabajo', dashboard: 'Dashboard', historial: 'Historial', lineaTiempo: 'Línea de tiempo', maestros: 'Datos maestros' })[vista] || 'Delta Mining'; }
