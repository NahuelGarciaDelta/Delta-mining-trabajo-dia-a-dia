const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function request(payload) {
  if (!API_URL) {
    throw new Error('Falta configurar VITE_APPS_SCRIPT_URL en .env');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error('Respuesta NO JSON del Apps Script:', text);
    throw new Error('Apps Script devolvió HTML en vez de JSON. Revisá que el Web App esté implementado como: Ejecutar como Yo / Acceso Cualquier persona.');
  }

  if (!data.ok) {
    throw new Error(data.error || 'Error del Apps Script');
  }

  return data;
}

export function obtenerDatosIniciales() {
  return request({ accion: 'obtenerDatosIniciales' });
}

export function crearTrabajo(trabajo) {
  return request({ accion: 'crearTrabajo', trabajo });
}

export function crearAvance(avance) {
  return request({ accion: 'crearAvance', avance });
}

export function finalizarTrabajo(idTrabajo) {
  return request({ accion: 'finalizarTrabajo', idTrabajo });
}

export function actualizarEstadoTrabajo(idTrabajo, estado) {
  return request({ accion: 'actualizarEstadoTrabajo', idTrabajo, estado });
}

export function sincronizarPendientes(pendientes) {
  return request({ accion: 'sincronizarPendientes', pendientes });
}
