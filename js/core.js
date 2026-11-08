// ============================================================
// ESTADO, NAVEGACIÓN, TEMA, AJUSTES, COPIA DE SEGURIDAD E INICIO
// (los datos llegan de Firestore: ver sync.js)
// ============================================================
const $ = id => document.getElementById(id);

function defaultState(){
  return {
    temas:{}, events:[], sims:[], theme:'',
    ai:{provider:'gemini', key:'', model:'gemini-3.8-flash', search:false},
    chatLog:[], doubts:[],
    avail:{1:3,2:3,3:3,4:3,5:3,6:4,0:0}, startHour:'09:00',
    exam:{date:'', borm:'', legisOk:false, hitos:[]},
    tpl:[], timerCfg:{pomo:false, work:25, brk:5}, preview:null,
  };
}
let S = defaultState();

function temaDef(){return {e:0,r:null,note:'',conf:0,reps:0,last:null,iv:0,links:[],weak:[],docs:[],h:[]};}
function td(n){if(!S.temas[n])S.temas[n]=temaDef();return S.temas[n];}
function saveS(){if(typeof window.cloudSave==='function')window.cloudSave();}

function toast(msg,ms){
  let t=$('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('on');
  clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),ms||3500);
}

// ============================================================
// NAVEGACIÓN
// ============================================================
const PANELS = ['dashboard','temas','plan','cal','sims','stats','tutor'];

function nav(name){
  PANELS.forEach(p=>$('p-'+p).classList.toggle('active',p===name));
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.toggle('active',el.dataset.panel===name));
  const ab=document.querySelector('.nav-btn.active');if(ab&&ab.scrollIntoView)ab.scrollIntoView({block:'nearest',inline:'nearest'});
  $('content').scrollTop=0;
  if(name==='temas') renderTemas();
  else if(name==='plan') renderPlan();
  else if(name==='cal') renderCal();
  else if(name==='dashboard') renderDash();
  else if(name==='stats') renderStats();
  else if(name==='sims') renderSims();
  else if(name==='tutor'){renderTutorBar();scrollChat();updateApiNotice();}
}

// ============================================================
// TEMA VISUAL
// ============================================================
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  setTheme(cur==='dark'?'light':cur==='light'?'':'dark');
}
function setTheme(v){
  S.theme=v||'';saveS();applyThemeUI();
  const sel=$('theme-sel');if(sel)sel.value=v||'';
}
function applyThemeUI(){
  if(S.theme)document.documentElement.setAttribute('data-theme',S.theme);else document.documentElement.removeAttribute('data-theme');
  const dark=S.theme==='dark'||(!S.theme&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches);
  $('th-icon').textContent=dark?'☀️':'🌙';
}

// ============================================================
// AJUSTES
// ============================================================
const GEM_MODELS=[
  ['gemini-3.8-flash','Gemini 3.8 Flash (recomendado)'],
  ['gemini-3.6-flash','Gemini 3.6 Flash'],
  ['gemini-3.5-flash-lite','Gemini 3.5 Flash-Lite (más rápido)'],
  ['gemini-3.1-flash-lite','Gemini 3.1 Flash-Lite'],
  ['gemini-3.1-pro-preview','Gemini 3.1 Pro (preview, más potente)'],
  ['gemini-2.5-pro','Gemini 2.5 Pro'],
  ['gemini-2.5-flash','Gemini 2.5 Flash'],
];
let gemModelList=GEM_MODELS.slice();
function fillModelSel(cur){
  const sel=$('model-sel');
  const ids=gemModelList.map(m=>m[0]);
  const isCustom=cur&&!ids.includes(cur);
  sel.innerHTML=gemModelList.map(([id,l])=>`<option value="${esc(id)}">${esc(l)}</option>`).join('')+'<option value="__custom">Otro (escribir ID)…</option>';
  sel.value=isCustom?'__custom':(cur||GEM_MODELS[0][0]);
  const ci=$('model-custom');
  ci.style.display=isCustom?'block':'none';ci.value=isCustom?cur:'';
}
function cfgModelChange(){
  const custom=$('model-sel').value==='__custom';
  const ci=$('model-custom');ci.style.display=custom?'block':'none';if(custom)ci.focus();
}
function togKey(){const k=$('key-inp');k.type=k.type==='password'?'text':'password';}
function cfgModel(){
  const v=$('model-sel').value;
  return v==='__custom'?$('model-custom').value.trim():v;
}
function setCfgStatus(t,c){const el=$('cfg-status');el.textContent=t;el.style.color=c||'var(--fg-3)';}
function openSettings(){
  $('theme-sel').value=S.theme||'';
  $('key-inp').value=S.ai.key||'';
  $('key-inp').type='password';
  fillModelSel(S.ai.model);setCfgStatus('');
  $('cfg-pw').value=S.timerCfg.work;$('cfg-pb').value=S.timerCfg.brk;
  dataStatus('');
  $('modal-cfg').style.display='flex';
}
function saveCfg(){
  setTheme($('theme-sel').value);
  S.ai.provider='gemini';
  S.ai.key=$('key-inp').value.trim();
  S.ai.model=cfgModel()||GEM_MODELS[0][0];
  const w=parseInt($('cfg-pw').value,10),b=parseInt($('cfg-pb').value,10);
  S.timerCfg.work=w>=1&&w<=180?w:25;S.timerCfg.brk=b>=1&&b<=60?b:5;
  saveS();closeM('modal-cfg');updateApiNotice();renderPlanInfo();
}
async function loadModels(){
  const key=$('key-inp').value.trim();
  if(!key){setCfgStatus('Introduce primero la API Key.','var(--warn)');return;}
  setCfgStatus('Cargando modelos…');
  try{
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':key}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error?.message||('HTTP '+r.status));
    const list=(d.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent'))
      .map(m=>[m.name.replace(/^models\//,''),m.displayName||m.name.replace(/^models\//,'')])
      .filter(([id])=>/gemini|gemma/i.test(id)&&!/image|tts|audio|live|embedding|robotics|veo|lyria/i.test(id));
    if(!list.length)throw new Error('No se encontraron modelos de texto para esta clave.');
    const cur=cfgModel();gemModelList=list;fillModelSel(cur);
    setCfgStatus(`✓ ${list.length} modelos cargados`,'var(--ok)');
  }catch(e){setCfgStatus(gemErrText(e),'var(--danger)');}
}
async function testConn(){
  const key=$('key-inp').value.trim();const model=cfgModel();
  if(!key){setCfgStatus('Introduce primero la API Key.','var(--warn)');return;}
  if(!model){setCfgStatus('Elige un modelo.','var(--warn)');return;}
  setCfgStatus('Probando…');
  try{await callGemini([{role:'user',content:'Responde solo: OK'}],{key,model});setCfgStatus('✓ Conexión correcta con '+model,'var(--ok)');}
  catch(e){setCfgStatus(gemErrText(e),'var(--danger)');}
}
function gemErrText(e){
  if(e&&e.blocked)return 'Sin conexión con Google AI Studio. Comprueba tu conexión a internet e inténtalo de nuevo.';
  return '✕ '+(e&&e.message?e.message:'Error desconocido');
}
function updateApiNotice(){
  const el=$('api-notice');
  if(!S.ai.key){el.style.display='block';el.innerHTML='<strong>Falta la API Key.</strong> Añade tu clave de Google AI Studio y elige el modelo en <button class="link" onclick="openSettings()">⚙️ Configuración</button>.';}
  else el.style.display='none';
}
function closeM(id){$(id).style.display='none';}
function outsideClose(e,id){if(e.target.id===id)closeM(id);}

// ============================================================
// NORMALIZACIÓN Y ESTADO REMOTO
// ============================================================
function normalizeState(){
  const D=defaultState();
  if(!S.temas||typeof S.temas!=='object')S.temas={};
  if(!Array.isArray(S.events))S.events=[];
  if(!Array.isArray(S.sims))S.sims=[];
  if(!Array.isArray(S.chatLog))S.chatLog=[];
  if(!Array.isArray(S.doubts))S.doubts=[];
  if(!Array.isArray(S.tpl))S.tpl=[];
  if(!S.ai||typeof S.ai!=='object')S.ai=D.ai;
  if(S.gemKey&&!S.ai.key)S.ai.key=S.gemKey;
  S.ai.provider='gemini';
  if(!S.ai.model||S.ai.model==='gemini-2.0-flash')S.ai.model='gemini-3.8-flash';
  if(S.ai.search==null)S.ai.search=false;
  if(!S.avail||typeof S.avail!=='object')S.avail=D.avail;
  if(!S.startHour)S.startHour='09:00';
  S.exam={...D.exam,...(S.exam||{})};
  if(!Array.isArray(S.exam.hitos))S.exam.hitos=[];
  S.timerCfg={...D.timerCfg,...(S.timerCfg||{})};
  // restos de versiones anteriores
  delete S.gemKey;delete S.req;delete S.boeDate;delete S.psico;delete S.entr;
  S.events=S.events.filter(e=>e&&e.id&&e.date).map(e=>Object.assign({src:'manual',status:null,tema:null,desc:'',adv:false},e));
  S.sims=S.sims.filter(x=>x&&x.id&&x.date&&SIM_TIPOS[x.tipo]);
  TEMAS.forEach(t=>{
    const d={...temaDef(),...(S.temas[t.n]||{})};
    ['links','weak','docs','h'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[];});
    S.temas[t.n]=d;
  });
}
// Llamado por sync.js cuando llegan cambios de otro dispositivo
function onRemotePart(part){
  normalizeState();applyThemeUI();
  if(part==='chat'){$('chat-win').innerHTML='';initChat();}
  if(part==='config'||part==='chat')updateApiNotice();
  tmRender();refreshViews();
}
function replaceState(obj){
  S={...defaultState(),...obj};
  normalizeState();applyThemeUI();
  $('chat-win').innerHTML='';initChat();
  refreshViews();updateApiNotice();
}

// ============================================================
// COPIA DE SEGURIDAD
// ============================================================
function dataStatus(h){$('data-status').innerHTML=h;}
function exportData(){
  const d=JSON.parse(JSON.stringify(S));if(d.ai)d.ai.key='';delete d.preview;
  const json=JSON.stringify({app:'oposicion-pl-cieza',version:2,exportedAt:new Date().toISOString(),data:d});
  const filename='oposicion-datos-'+ymd(new Date())+'.json';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download=filename;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  dataStatus('✓ Descargado: '+esc(filename)+' (los documentos adjuntos no van dentro: están en la nube, aparte)');
}
let pendingImport=null;
function importData(inp){
  const f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    let j;try{j=JSON.parse(r.result);}catch(e){dataStatus('✕ El archivo no es un JSON válido.');return;}
    const d=j&&j.data?j.data:j;
    if(!d||typeof d!=='object'||!d.temas||!Array.isArray(d.events)){dataStatus('✕ El archivo no parece una copia de esta web.');return;}
    pendingImport=d;
    const nT=Object.values(d.temas).filter(t=>t&&t.e>0).length;
    const when=j.exportedAt?new Date(j.exportedAt).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}):'fecha desconocida';
    const nS=Array.isArray(d.sims)?d.sims.length:0;
    dataStatus(`Copia del ${esc(when)}: ${nT} temas iniciados, ${d.events.length} tareas y ${nS} simulacros. Sustituirá todos tus datos actuales. <button class="link-plain" onclick="applyImport()">Importar</button> · <button class="link-plain" onclick="pendingImport=null;dataStatus('')">Cancelar</button>`);
  };
  r.readAsText(f);
}
function applyImport(){
  const d=pendingImport;if(!d)return;pendingImport=null;
  const cur=S.ai||{};
  const ai={...(d.ai||{}),provider:'gemini',model:(d.ai&&d.ai.model)||cur.model,key:(d.ai&&d.ai.key)||cur.key||''};
  replaceState({...d,ai});saveS();
  $('theme-sel').value=S.theme||'';
  dataStatus('✓ Datos importados correctamente.');
}

// ============================================================
// INICIO (lo llama sync.js cuando llegan tus datos)
// ============================================================
function init(){
  normalizeState();
  applyThemeUI();
  renderDash();
  renderQuickPrompts();
  updateApiNotice();
  initChat();
  tmInit();
}
