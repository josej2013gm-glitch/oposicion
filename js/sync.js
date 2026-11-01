// ============================================================
// FIREBASE: acceso con Google, sincronización por documentos y archivos adjuntos
//
// Estructura en Firestore (cada documento muy por debajo del límite de 1 MB):
//   users/{uid}/store/config   → ajustes, fechas clave, disponibilidad, semana tipo, propuesta del planificador
//   users/{uid}/store/temas    → estado, notas, repasos y recursos de los 41 temas
//   users/{uid}/store/chat     → historial del tutor y dudas pendientes
//   users/{uid}/store/psico    → resultados de los cuestionarios psicotécnicos
//   users/{uid}/store/entr     → perfil, marcas y registro del entrenamiento físico
//   users/{uid}/events/{id}    → una tarea por documento
//   users/{uid}                → documento ÚNICO de la versión anterior (solo se lee para migrar)
// Archivos adjuntos: troceados en base64 en users/{uid}/files/{idArchivo}_{n} (solo Firestore, plan gratuito)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, collection, onSnapshot, setDoc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Configuración pública del proyecto (no es secreta: la seguridad la dan las reglas de Firestore)
const firebaseConfig = {
  apiKey: "AIzaSyBDu-PpJYWhMHF4H9HIOKghRkgO9QtRKVQ",
  authDomain: "gestor-oposicion.firebaseapp.com",
  projectId: "gestor-oposicion",
  messagingSenderId: "467544293584",
  appId: "1:467544293584:web:2d39aaab0c9644cc945ed5"
};
const ALLOWED_EMAIL = "josej2013gm@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { db = initializeFirestore(app, { localCache: memoryLocalCache() }); }

// Qué claves del estado S van en cada documento
const PARTS = {
  config: ['ai', 'theme', 'avail', 'startHour', 'exam', 'preview', 'tpl', 'timerCfg'],
  temas: ['temas'],
  chat: ['chatLog', 'doubts'],
  psico: ['psico'],
  entr: ['entr'],
};
const PART_NAMES = Object.keys(PARTS);

const gate = document.getElementById('gate'), gateBody = document.getElementById('gate-body');
const G_ICON = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
const escH = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function showGate(mode, info) {
  gate.classList.remove('hide');
  if (mode === 'loading') gateBody.innerHTML = `<div class="spinner"></div><div class="gate-msg">${escH(info || 'Cargando tus datos…')}</div>`;
  else if (mode === 'login') gateBody.innerHTML = `${info ? `<div class="gate-msg err">${escH(info)}</div>` : '<div class="gate-msg">Entra con tu cuenta de Google para ver tu progreso en cualquier dispositivo.</div>'}<button class="g-btn" id="g-login">${G_ICON} Entrar con Google</button>`;
  else if (mode === 'denied') gateBody.innerHTML = `<div class="gate-msg err">La cuenta <strong>${escH(info)}</strong> no tiene acceso a esta web.</div><button class="g-btn" id="g-other">Usar otra cuenta</button>`;
  else if (mode === 'error') gateBody.innerHTML = `<div class="gate-msg err">${escH(info)}</div><button class="g-btn" id="g-retry">Reintentar</button> <button class="btn btn-ghost btn-sm" id="g-out" style="margin-top:10px">Cerrar sesión</button>`;
  document.getElementById('g-login')?.addEventListener('click', signIn);
  document.getElementById('g-other')?.addEventListener('click', () => signOut(auth));
  document.getElementById('g-retry')?.addEventListener('click', () => location.reload());
  document.getElementById('g-out')?.addEventListener('click', () => signOut(auth).then(() => location.reload()));
}
function hideGate() { gate.classList.add('hide'); }

function authErr(e) {
  const c = e && e.code || '';
  if (c === 'auth/unauthorized-domain') return 'Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).';
  if (c === 'auth/network-request-failed') return 'Sin conexión. Comprueba tu internet e inténtalo de nuevo.';
  return 'No se pudo iniciar sesión (' + (c || e.message || 'error') + ').';
}
async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
      try { await signInWithRedirect(auth, provider); } catch (e2) { showGate('login', authErr(e2)); }
    } else if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) showGate('login', authErr(e));
  }
}
getRedirectResult(auth).catch(e => showGate('login', authErr(e)));

// ---------------- sincronización ----------------
const ind = document.getElementById('sync-ind');
let uid = null, unsubs = [], started = false, starting = false, booting = false;
let saveTimer = null, online = navigator.onLine, syncErr = false;
const lastPart = {};           // JSON de cada documento tal como está en la nube
const lastEv = {};             // JSON de cada tarea tal como está en la nube
const pend = { config: false, temas: false, chat: false, events: false };
const ready = { config: false, temas: false, chat: false, events: false };
const firstData = {};          // primer contenido de cada documento
let firstEvents = [], evSnap = null;

const toast = document.createElement('div'); toast.className = 'sync-toast'; document.body.appendChild(toast);
function showToast(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('on'), 7000); }
const hasPending = () => Object.values(pend).some(Boolean);
function paintSync() {
  let t = '☁️ Guardado', tip = 'Todo guardado en tu cuenta';
  if (syncErr) { t = '⚠️ Error'; tip = 'No se ha podido guardar. Revisa tu conexión o las reglas de Firestore.'; }
  else if (!online) { t = '📴 Sin conexión'; tip = 'Los cambios se guardan en este dispositivo y se subirán al volver la conexión'; }
  else if (saveTimer || hasPending()) { t = '⏳ Guardando…'; tip = 'Guardando cambios'; }
  ind.textContent = window.innerWidth < 520 ? t.split(' ')[0] : t;
  ind.title = tip; ind.classList.toggle('err', syncErr);
}
addEventListener('online', () => { online = true; paintSync(); });
addEventListener('offline', () => { online = false; paintSync(); });
addEventListener('resize', paintSync);

const partRef = p => doc(db, 'users', uid, 'store', p);
const evCol = () => collection(db, 'users', uid, 'events');
function partJSON(p) { const o = {}; PARTS[p].forEach(k => { if (S[k] !== undefined) o[k] = S[k]; }); return JSON.stringify(o); }
function applyPart(p, str) {
  try { const o = JSON.parse(str); PARTS[p].forEach(k => { if (k in o) S[k] = o[k]; }); }
  catch (e) { console.error('Documento ilegible:', p, e); }
}

// Escribe solo lo que ha cambiado: los documentos de ajustes y una escritura por tarea modificada
function flush() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!uid || !started) return;
  const jobs = [];
  for (const p of PART_NAMES) {
    const json = partJSON(p);
    if (json === lastPart[p]) continue;
    if (json.length > 900000) console.warn('El documento', p, 'se acerca al límite de 1 MB');
    const prev = lastPart[p];
    lastPart[p] = json;
    jobs.push(setDoc(partRef(p), { data: json, updatedAt: serverTimestamp(), v: 2 }).catch(e => { lastPart[p] = prev; throw e; }));
  }
  const ops = [], seen = new Set();
  S.events.forEach(e => {
    seen.add(e.id);
    const j = JSON.stringify(e);
    if (lastEv[e.id] !== j) ops.push({ k: 'set', id: e.id, j, prev: lastEv[e.id], date: e.date });
  });
  Object.keys(lastEv).forEach(id => { if (!seen.has(id)) ops.push({ k: 'del', id, prev: lastEv[id] }); });
  for (let i = 0; i < ops.length; i += 400) {
    const chunk = ops.slice(i, i + 400), batch = writeBatch(db);
    chunk.forEach(o => {
      if (o.k === 'set') { batch.set(doc(evCol(), o.id), { data: o.j, date: o.date, updatedAt: serverTimestamp() }); lastEv[o.id] = o.j; }
      else { batch.delete(doc(evCol(), o.id)); delete lastEv[o.id]; }
    });
    jobs.push(batch.commit().catch(e => {
      chunk.forEach(o => { if (o.prev === undefined) delete lastEv[o.id]; else lastEv[o.id] = o.prev; });
      throw e;
    }));
  }
  if (!jobs.length) { paintSync(); return; }
  syncErr = false;
  Promise.all(jobs).then(() => { syncErr = false; paintSync(); }).catch(e => {
    console.error(e); syncErr = true; paintSync();
    showToast(e && e.code === 'permission-denied'
      ? '⚠️ Firestore no deja guardar: revisa las reglas (permiso de escritura).'
      : '⚠️ No se pudieron guardar los cambios (' + (e && (e.code || e.message)) + '). Se reintentará con el próximo cambio.');
  });
  paintSync();
}
window.cloudSave = () => { if (!uid || !started || booting) return; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 500); paintSync(); };
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) flush(); });
addEventListener('pagehide', () => { if (saveTimer) flush(); });
addEventListener('beforeunload', e => { if (saveTimer || hasPending()) { if (saveTimer) flush(); e.preventDefault(); e.returnValue = ''; } });
window.fbSignOut = async () => { if (saveTimer) flush(); await signOut(auth); location.reload(); };

// ---------------- archivos adjuntos (en Firestore, sin Storage) ----------------
// Cada archivo se trocea en bloques base64 de 600 000 caracteres (< 1 MB por documento).
const CHUNK = 600000;
const fileDoc = (id, i) => doc(db, 'users', uid, 'files', id + '_' + i);
const readB64 = f => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1] || '');
  r.onerror = () => rej(r.error);
  r.readAsDataURL(f);
});
window.cloudUpload = async (file, tema, onProgress) => {
  if (!uid) throw { code: 'files/unauthenticated' };
  const b64 = await readB64(file);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const n = Math.max(1, Math.ceil(b64.length / CHUNK));
  try {
    for (let i = 0; i < n; i++) {
      await setDoc(fileDoc(id, i), { d: b64.slice(i * CHUNK, (i + 1) * CHUNK), i, n, tema, name: file.name.slice(-120), type: file.type || '' });
      if (onProgress) onProgress((i + 1) / n);
    }
  } catch (e) {
    try { await window.cloudDeleteFile(id, n); } catch (_) {}
    throw e;
  }
  return { path: id + ':' + n, size: file.size, name: file.name, type: file.type || '' };
};
const splitRef = p => { const [id, n] = String(p).split(':'); return { id, n: parseInt(n, 10) || 1 }; };
window.cloudFileUrl = async (p, type) => {
  const { id, n } = splitRef(p);
  const snaps = await Promise.all(Array.from({ length: n }, (_, i) => getDoc(fileDoc(id, i))));
  if (snaps.some(s => !s.exists())) throw { code: 'files/not-found' };
  const parts = snaps.map(s => {
    const bin = atob(s.data().d), u = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
    return u;
  });
  return URL.createObjectURL(new Blob(parts, { type: type || snaps[0].data().type || 'application/octet-stream' }));
};
window.cloudDeleteFile = async (p, nOverride) => {
  const { id, n } = splitRef(p);
  const total = nOverride || n;
  const batch = writeBatch(db);
  for (let i = 0; i < total; i++) batch.delete(fileDoc(id, i));
  await batch.commit();
};

// ---------------- arranque ----------------
function stopListeners() { unsubs.forEach(u => u()); unsubs = []; }
function waitMsg() { showGate('loading', online ? 'Conectando con tu cuenta…' : 'Sin conexión. Conéctate a internet para cargar tus datos la primera vez.'); }
function onListenErr(err) {
  console.error(err);
  if (!started) showGate('error', err.code === 'permission-denied'
    ? 'Firestore ha denegado el acceso. Revisa que las reglas tengan tu correo y estén publicadas (archivo firestore.rules).'
    : 'No se pudieron cargar tus datos (' + (err.code || err.message) + ').');
  else { syncErr = true; paintSync(); }
}

onAuthStateChanged(auth, user => {
  stopListeners();
  if (!user) { if (started) location.reload(); else showGate('login'); return; }
  if ((user.email || '').toLowerCase() !== ALLOWED_EMAIL) { showGate('denied', user.email); return; }
  showGate('loading');
  const acct = document.getElementById('acct-email'); if (acct) acct.textContent = user.email;
  uid = user.uid;
  PART_NAMES.forEach(p => unsubs.push(onSnapshot(partRef(p), { includeMetadataChanges: true }, snap => onPart(p, snap), onListenErr)));
  unsubs.push(onSnapshot(evCol(), { includeMetadataChanges: true }, onEvents, onListenErr));
});

function onPart(p, snap) {
  pend[p] = snap.metadata.hasPendingWrites;
  if (!started) {
    // Sin datos en caché y sin respuesta del servidor todavía: esperar para no pisar nada
    if (!snap.exists() && snap.metadata.fromCache) { waitMsg(); return; }
    firstData[p] = snap.exists() ? snap.data().data : null;
    ready[p] = true; tryStart(); return;
  }
  paintSync();
  if (pend[p] || saveTimer) return;               // cambio propio aún sin confirmar
  const data = snap.exists() ? snap.data().data : null;
  if (data && data !== lastPart[p]) {              // cambio llegado de otro dispositivo
    lastPart[p] = data;
    booting = true;
    try { applyPart(p, data); onRemotePart(p === 'config' ? 'config' : p); } catch (e) { console.error(e); } finally { booting = false; }
  }
}

function onEvents(snap) {
  pend.events = snap.metadata.hasPendingWrites;
  if (!started) {
    evSnap = snap;
    ready.events = !(snap.empty && snap.metadata.fromCache);
    if (!ready.events) waitMsg();
    firstEvents = snap.docs.map(d => ({ id: d.id, j: d.data().data }));
    tryStart(); return;
  }
  paintSync();
  let changed = false;
  snap.docChanges().forEach(ch => {
    const d = ch.doc;
    if (d.metadata.hasPendingWrites) return;
    const id = d.id, loc = S.events.find(e => e.id === id);
    // si hay una edición local sin enviar, gana la local
    if (loc && lastEv[id] !== undefined && JSON.stringify(loc) !== lastEv[id]) return;
    if (ch.type === 'removed') {
      if (lastEv[id] !== undefined) { delete lastEv[id]; if (loc) { S.events.splice(S.events.indexOf(loc), 1); changed = true; } }
      return;
    }
    const j = d.data().data;
    if (lastEv[id] === j) return;
    let o; try { o = JSON.parse(j); } catch (e) { return; }
    lastEv[id] = j;
    const i = S.events.findIndex(e => e.id === id);
    if (i >= 0) S.events[i] = o; else S.events.push(o);
    changed = true;
  });
  if (changed) { booting = true; try { onRemotePart('events'); } finally { booting = false; } }
}

async function tryStart() {
  if (started || starting) return;
  const partsReady = PART_NAMES.every(p => ready[p]);
  const evOk = ready.events || (evSnap && firstData.config);   // sin tareas y offline pero con datos en caché
  if (!partsReady || !evOk) return;
  starting = true;
  const anyNew = PART_NAMES.some(p => firstData[p]) || firstEvents.length > 0;
  let migrated = false;
  if (!anyNew) {
    // Primera vez con la estructura nueva: ¿hay datos del documento único anterior?
    try {
      const lg = await getDoc(doc(db, 'users', uid));
      if (lg.exists() && lg.data().data) {
        const o = JSON.parse(lg.data().data);
        Object.keys(o).forEach(k => { S[k] = o[k]; });
        migrated = true;
      }
    } catch (e) { console.warn('No se pudo leer el documento anterior:', e); }
  } else {
    PART_NAMES.forEach(p => { if (firstData[p]) applyPart(p, firstData[p]); });
    S.events = [];
    firstEvents.forEach(x => { try { S.events.push(JSON.parse(x.j)); lastEv[x.id] = x.j; } catch (e) { console.error(e); } });
    PART_NAMES.forEach(p => { lastPart[p] = firstData[p] || ''; });
  }
  started = true; starting = false;
  // Cargar sin escribir: así una copia antigua de este dispositivo nunca pisa datos más nuevos de la nube
  booting = true;
  try { init(); } finally { booting = false; }
  hideGate();
  if (migrated || !anyNew) {
    flush();   // crea los documentos nuevos (los datos antiguos quedan intactos en el documento único como copia)
    if (migrated) showToast('✓ Datos migrados a la nueva estructura. El documento anterior se conserva como copia.');
  }
  paintSync();
}
