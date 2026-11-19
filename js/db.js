const DB_NAME = 'rotateit';
const DB_VERSION = 2;
const STORES = ['equipos', 'jugadores', 'partidos', 'eventos', 'calendario', 'noticias'];
const SUPABASE_URL = 'https://nxomnwcwmkqkozqqkwxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8U6E_UtNeHnbulmPoRo_rQ_DDaAuotA';
const nube = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let dbPromise = null;
let ultimoTs = 0;

// ---------- Mapeo entre objetos de la app y columnas de Supabase ----------
// Solo las tablas que existen en Supabase. calendario y noticias siguen solo en el navegador.
const aFila = {
  equipos: e => ({ id: e.id, nombre: e.nombre }),
  jugadores: j => ({
    id: j.id, equipo_id: j.equipoId, numero: j.numero, nombre: j.nombre, posicion: j.posicion
  }),
  partidos: p => ({
    id: p.id, fecha: p.fecha, local_id: p.localId, visitante_id: p.visitanteId,
    rot_inicial: p.rotInicial, saque_inicial: p.saqueInicial
  }),
  eventos: e => ({
    id: e.id, partido_id: e.partidoId, ts: e.ts, tipo: e.tipo,
    equipo: e.equipo ?? null, jugador_id: e.jugadorId ?? null, accion: e.accion ?? null,
    ganador: e.ganador ?? null, sale_pid: e.salePid ?? null, entra_pid: e.entraPid ?? null
  })
};

const aObjeto = {
  equipos: f => ({ id: f.id, nombre: f.nombre }),
  jugadores: f => ({
    id: f.id, equipoId: f.equipo_id, numero: f.numero, nombre: f.nombre, posicion: f.posicion
  }),
  partidos: f => ({
    id: f.id, fecha: f.fecha, localId: f.local_id, visitanteId: f.visitante_id,
    rotInicial: f.rot_inicial, saqueInicial: f.saque_inicial
  }),
  eventos: f => ({
    id: f.id, partidoId: f.partido_id, ts: Number(f.ts), tipo: f.tipo,
    equipo: f.equipo, jugadorId: f.jugador_id, accion: f.accion, ganador: f.ganador,
    salePid: f.sale_pid, entraPid: f.entra_pid
  })
};

// ---------- IndexedDB (copia local) ----------
function abrirDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach(s => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// ---------- Cola de pendientes (cambios que aún no llegan a Supabase) ----------
const CLAVE_COLA = 'rotateit-pendientes';
const leerCola = () => JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]');
const escribirCola = cola => localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
function encolar(op) { escribirCola([...leerCola(), op]); }

// Envía la cola en orden. Si falla (sin internet), se detiene y conserva lo pendiente.
async function procesarCola() {
  while (true) {
    const cola = leerCola();
    if (!cola.length || !nube) return;
    const op = cola[0];
    try {
      const { error } = op.op === 'upsert'
        ? await nube.from(op.store).upsert(aFila[op.store](op.obj))
        : await nube.from(op.store).delete().eq('id', op.id);
      if (error) return;
    } catch {
      return;
    }
    escribirCola(leerCola().slice(1));
  }
}

let enviando = null;
function vaciar() {
  if (!enviando) enviando = procesarCola().finally(() => { enviando = null; });
  return enviando;
}

// ---------- API usada por el resto de la app ----------
async function guardar(store, obj) {
  const db = await abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(obj);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (aFila[store]) {
    encolar({ op: 'upsert', store, obj: JSON.parse(JSON.stringify(obj)) });
    vaciar();
  }
  return obj;
}

async function obtenerTodo(store) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function borrar(store, id) {
  const db = await abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (aFila[store]) {
    encolar({ op: 'delete', store, id });
    vaciar();
  }
}

// ---------- Sincronización con Supabase ----------
async function leerTabla(tabla) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await nube.from(tabla).select('*').order('id').range(desde, desde + 999);
    if (error) throw error;
    filas.push(...data);
    if (data.length < 1000) return filas;
  }
}

async function reemplazarLocal(store, objetos) {
  const db = await abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    st.clear();
    objetos.forEach(o => st.put(o));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 1) Envía lo pendiente. 2) Si no quedó nada pendiente, baja lo de Supabase a la copia local.
// Devuelve true si la sincronización completa funcionó.
async function sincronizar() {
  if (!nube) return false;
  await vaciar();
  if (leerCola().length) return false;
  try {
    for (const tabla of Object.keys(aFila)) {
      const filas = await leerTabla(tabla);
      await reemplazarLocal(tabla, filas.map(aObjeto[tabla]));
    }
    return true;
  } catch (e) {
    console.warn('Sincronización con Supabase fallida:', e.message ?? e);
    return false;
  }
}

function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Marca de tiempo estrictamente creciente, para ordenar eventos tomados en el mismo milisegundo
function marcaTiempo() {
  ultimoTs = Math.max(Date.now(), ultimoTs + 1);
  return ultimoTs;
}

// Descarga todas las tablas en un JSON (sirve como evidencia de la base de datos)
async function exportarRespaldo() {
  const datos = {};
  for (const s of STORES) datos[s] = await obtenerTodo(s);
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rotateit-respaldo.json';
  a.click();
}