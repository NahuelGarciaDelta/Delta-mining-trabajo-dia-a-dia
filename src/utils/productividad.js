export function normalizarTexto(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
export function calcularProduccion({ unidad, largo, ancho, profundidad, cantidad, total }) {
  const u = normalizarTexto(unidad);
  const l = Number(largo || 0), a = Number(ancho || 0), p = Number(profundidad || 0), c = Number(cantidad || 0);
  if (['ML','M LINEAL','METROS LINEALES'].includes(u)) return l || c;
  if (['KM','KM LINEAL','KILOMETROS LINEALES','KILÓMETROS LINEALES'].includes(u)) return l ? l / 1000 : c;
  if (['M2','M²'].includes(u)) return l && a ? l * a : c;
  if (['M3','M³'].includes(u)) return l && a && p ? l * a * p : c;
  return c;
}
export function calcularProductividad(produccion, horas) {
  const hs = Number(horas || 0), prod = Number(produccion || 0);
  return hs > 0 ? prod / hs : 0;
}
