// ============================================================
// ENTRENAMIENTO FÍSICO: tablas del baremo, cuestionario de salud y valores por defecto
// Fuente de las marcas: BORM n.º 260, 10/11/2023 (bases del proceso; la convocatoria de 2026 remite a ellas).
// Cuatro pruebas eliminatorias puntuadas de 5 a 10. Las tablas dependen solo del sexo.
// ============================================================
const ENT_TESTS = {
  dom:   {n:'Dominadas',         ico:'💪', dir: 1, blk:'dom', step:1},
  k1000: {n:'1.000 m',           ico:'🏃', dir:-1, blk:'run', step:5},
  m50:   {n:'50 m',              ico:'⚡', dir:-1, blk:'run', step:0.1},
  salto: {n:'Salto de longitud', ico:'🦘', dir: 1, blk:'run', step:0.05},
};
const ENT_ORDER = ['dom','k1000','m50','salto'];

// Marca mínima para cada puntuación (5, 6, 7, 8, 9, 10). Dominadas y salto: mayor es mejor. 50 m y 1.000 m: menor es mejor.
// 1.000 m en segundos: hombres 3:50 → 230 s; mujeres 4:29 → 269 s.
const ENT_BAREMO = {
  H: {dom:[7,8,9,10,11,12],       salto:[2.15,2.20,2.25,2.30,2.35,2.40], m50:[7.5,7.4,7.3,7.2,7.1,7.0], k1000:[230,225,220,215,210,205]},
  M: {dom:[4,5,6,7,8,9],          salto:[1.85,1.90,1.95,2.00,2.05,2.10], m50:[8.5,8.4,8.3,8.2,8.1,8.0], k1000:[269,264,259,254,249,244]},
};

// Cuestionario de aptitud para la actividad física (basado en el PAR-Q)
const ENT_PARQ = [
  'Un médico te ha dicho alguna vez que tienes un problema de corazón y que solo debes hacer la actividad física que él te recomiende.',
  'Notas dolor en el pecho cuando haces actividad física.',
  'En el último mes, ¿has tenido dolor en el pecho sin estar haciendo actividad física?',
  'Pierdes el equilibrio por mareos o has perdido alguna vez el conocimiento.',
  'Tienes un problema óseo o articular (espalda, rodilla, cadera, hombro…) que podría empeorar con el ejercicio.',
  'Tomas medicación para la tensión arterial o para el corazón.',
  'Conoces cualquier otra razón por la que no deberías hacer actividad física.',
];

// Zonas de molestia y a qué pruebas afectan (para ajustar solo lo que corresponde)
const ENT_ZONAS = [
  ['', 'Ninguna'],
  ['hombro', 'Hombro / codo / muñeca'],
  ['espalda', 'Espalda'],
  ['cadera', 'Cadera / ingle'],
  ['rodilla', 'Rodilla'],
  ['pie', 'Tobillo / pie / gemelo'],
  ['otra', 'Otra'],
];
const ENT_ZONA_TESTS = {
  hombro: ['dom'],
  espalda: ['dom','k1000','m50','salto'],
  cadera: ['k1000','m50','salto'],
  rodilla: ['k1000','m50','salto'],
  pie: ['k1000','m50','salto'],
  otra: ['dom','k1000','m50','salto'],
};

// Principios que aplica el motor (se muestran en la pestaña para poder contrastarlos)
const ENT_PRINCIPIOS = [
  {t:'Sobrecarga progresiva y descargas', txt:'El volumen sube poco a poco durante 3 semanas y la cuarta es de descarga (≈ 60 % del volumen). Es el esquema habitual de periodización en bloques de 3+1 semanas.', ref:'ACSM (2009), «Progression models in resistance training for healthy adults», Med Sci Sports Exerc 41(3):687-708.'},
  {t:'Dominadas: lejos del fallo y con frecuencia', txt:'Las series se quedan por debajo del máximo (≈ 60-70 % de tus repeticiones) y se reparten en 2-3 sesiones no consecutivas. Con 0 dominadas se empieza por excéntricas y remo invertido.', ref:'ACSM (2009), frecuencia y proximidad al fallo en principiantes y nivel intermedio.'},
  {t:'Carrera: mucho volumen suave y poco intenso', txt:'La mayor parte del trabajo aeróbico es a ritmo conversacional; solo 1 sesión por semana se hace a ritmo de prueba. Los tiempos de los intervalos se acercan al objetivo de forma gradual.', ref:'Seiler (2010), «What is best practice for training intensity and duration distribution in endurance athletes?», Int J Sports Physiol Perform 5:276-291.'},
  {t:'Velocidad con recuperación completa', txt:'Los 50 m se entrenan con pocas repeticiones máximas y 2-4 min de descanso: la calidad manda sobre la cantidad. Una sola sesión semanal.', ref:'Principio general de entrenamiento de velocidad (calidad > fatiga).'},
  {t:'Salto: pliometría con contactos limitados', txt:'La pliometría mejora el salto; se empieza con pocos contactos por sesión y se suben gradualmente (máx. 90), con sentadilla y zancadas como base de fuerza.', ref:'Markovic (2007); de Villarreal et al. (2009), J Strength Cond Res 23(2):495-506 (metaanálisis).'},
  {t:'Afinar antes de las pruebas', txt:'En la última semana se reduce el volumen y se mantiene la calidad (puesta a punto).', ref:'Mujika y Padilla (2003), Med Sci Sports Exerc 35(7):1182-1187.'},
  {t:'Límites de seguridad', txt:'Las subidas de volumen de carrera no pasan del ~10 % semanal. Es una pauta práctica con respaldo científico limitado, no una ley: por eso el motor también reacciona al dolor, al esfuerzo percibido y a las faltas.'},
];

function entrDef() {
  return {
    ok: false, parqOk: false,
    sexo: '', edad: '', peso: '',
    hist: 'poco',          // nada | poco | regular | mucho  (entrenamiento en los últimos 3 meses)
    cont: 10,              // minutos que puede correr seguidos
    lesiones: '', parq: [],
    material: {barra: true, pista: true},
    dias: [1, 3, 5], hora: '19:00',
    meta: 7,               // puntuación objetivo en cada prueba (5-10)
    fecha: '',             // fecha de las pruebas físicas (si no, se toma del hito «Pruebas físicas»)
    marcas: {dom: [], k1000: [], m50: [], salto: []},
    c: {dom: 0, k1000: 0, m50: 0, salto: 0},   // semanas de progreso completadas por prueba (c % 4 === 3 → descarga)
    evals: {},             // ajustes decididos al evaluar cada semana
    log: [],               // sesiones registradas
    prev: null,            // propuesta pendiente de aceptar
  };
}
function entrNorm(x) {
  const D = entrDef(), o = {...D, ...(x && typeof x === 'object' ? x : {})};
  o.material = {...D.material, ...(o.material || {})};
  o.marcas = {...D.marcas, ...(o.marcas || {})};
  o.c = {...D.c, ...(o.c || {})};
  ENT_ORDER.forEach(t => {
    if (!Array.isArray(o.marcas[t])) o.marcas[t] = [];
    o.marcas[t] = o.marcas[t].filter(m => m && m.d && isFinite(m.v));
    o.c[t] = Math.max(0, parseInt(o.c[t], 10) || 0);
  });
  if (!Array.isArray(o.dias)) o.dias = D.dias;
  o.dias = [...new Set(o.dias.map(Number).filter(d => d >= 0 && d <= 6))];
  if (!Array.isArray(o.parq)) o.parq = [];
  if (!Array.isArray(o.log)) o.log = [];
  if (o.log.length > 400) o.log = o.log.slice(-400);
  if (!o.evals || typeof o.evals !== 'object') o.evals = {};
  o.meta = Math.max(5, Math.min(10, parseInt(o.meta, 10) || 7));
  if (!['nada', 'poco', 'regular', 'mucho'].includes(o.hist)) o.hist = 'poco';
  o.cont = Math.max(0, Math.min(90, parseInt(o.cont, 10) || 0));
  if (o.sexo !== 'H' && o.sexo !== 'M') o.sexo = '';
  return o;
}
