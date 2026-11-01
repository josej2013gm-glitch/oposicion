// ============================================================
// UTILIDADES, PLANIFICADOR CON IA Y CALENDARIO
// ============================================================
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function pd(s){return new Date(String(s).slice(0,10)+'T00:00:00');}
function todayD(){const d=new Date();d.setHours(0,0,0,0);return d;}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function addMin(hm,min){const [h,m]=hm.split(':').map(Number);const t=Math.min(h*60+m+Math.round(min),23*60+59);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
function hrs(ev){if(ev.type==='fisico')return 0;const a=(ev.s||'0:0').split(':').map(Number),b=(ev.e||'0:0').split(':').map(Number);return Math.max(0,(b[0]*60+b[1]-a[0]*60-a[1])/60);}
function fmtH(h){return (Math.round(h*10)/10).toString().replace('.',',')+' h';}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
const DOW=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DOW_S=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const ORDER=[1,2,3,4,5,6,0];
const TYPE_ICON={study:'📖',repaso:'🔄',test:'📝',psico:'🧩',fisico:'🏋️',other:'🎯'};
const TYPE_LBL={study:'Estudio',repaso:'Repaso',test:'Test / simulacro',psico:'Psicotécnicos',fisico:'Entrenamiento',other:'Otro'};
const TYPE_COL={study:'var(--accent)',repaso:'var(--ok)',test:'var(--info)',psico:'#8B5CF6',fisico:'#F97316',other:'var(--warn)'};
const ST_LBL={done:'Completada',partial:'Parcial',no:'No hecha'};
const ST_ICON={done:'✓',partial:'½',no:'✕'};

function wkStart(off){
  const hoy=new Date();const day=hoy.getDay()||7;
  const m=new Date(hoy);m.setDate(hoy.getDate()-day+1+off*7);m.setHours(0,0,0,0);return m;
}
function mondayOf(d){const m=new Date(d);m.setHours(0,0,0,0);m.setDate(m.getDate()-((m.getDay()+6)%7));return m;}
function eventsIn(from,to){return S.events.filter(e=>{const d=pd(e.date);return d>=from&&d<=to;});}
function pastUnmarked(){const t=todayD();return S.events.filter(e=>!e.status&&pd(e.date)<t);}
function stats(evs){
  const c={done:0,partial:0,no:0,none:0,total:evs.length};
  evs.forEach(e=>{c[e.status||'none']++;});
  const marked=c.done+c.partial+c.no;
  c.pct=marked?Math.round((c.done+c.partial*0.5)/marked*100):null;
  return c;
}
function refreshViews(){
  const act=PANELS.find(p=>$('p-'+p).classList.contains('active'));
  if(act==='cal')renderCal();else if(act==='plan')renderPlan();else if(act==='dashboard')renderDash();
  else if(act==='temas')renderTemas();else if(act==='stats')renderStats();else if(act==='psico')renderPsico();else if(act==='entr')renderEntr();
}
function temaShort(x){const s=x.t.split(/[:.]/)[0];return s.length>90?s.slice(0,88)+'…':s;}

// ============================================================
// PLANIFICADOR
// ============================================================
let planOff=1;       // 0 = esta semana (desde hoy), 1 = próxima, 2, 3…
let planBusy=false;
const PLAN_LBL=['esta semana','la próxima semana','dentro de 2 semanas','dentro de 3 semanas'];
function planFrom(ws){const t=todayD();return ws<t?t:ws;}
function setPlanOff(v){planOff=parseInt(v,10)||0;renderPlanInfo();}
function renderPlan(){renderAvail();renderRecent();renderPlanInfo();renderPreview();}
function renderAvail(){
  $('avail-grid').innerHTML=ORDER.map(d=>`<label class="av-day"><span>${DOW_S[d]}</span><input type="number" min="0" max="12" step="0.5" value="${+S.avail[d]||0}" onchange="setAvail(${d},this.value)" aria-label="Horas el ${DOW[d]}"></label>`).join('');
  $('start-hour').value=S.startHour;
  const tot=ORDER.reduce((a,d)=>a+(+S.avail[d]||0),0);
  $('avail-total').textContent='Total: '+fmtH(tot)+' / semana';
}
function setAvail(d,v){let n=parseFloat(String(v).replace(',','.'));if(!isFinite(n))n=0;S.avail[d]=Math.max(0,Math.min(12,Math.round(n*2)/2));saveS();renderAvail();renderPreview();}
function saveStart(){S.startHour=$('start-hour').value||'09:00';saveS();renderPreview();}

function renderRecent(){
  const t=todayD();const c=stats(eventsIn(addDays(t,-14),t));
  const el=$('recent');
  const un=pastUnmarked().length;
  const warn=un?`<div class="alert alert-warn" style="margin:12px 0 0">Tienes <strong>${un}</strong> tarea${un>1?'s':''} pasada${un>1?'s':''} sin marcar. <button class="link" onclick="goPending()">Márcalas en el calendario</button> para que la IA las tenga en cuenta.</div>`:'';
  if(!c.total){el.innerHTML='<div class="muted">Aún no hay tareas en los últimos 14 días. El primer plan se basará en el estado de tus 41 temas y en tu disponibilidad.</div>'+warn;return;}
  const col=c.pct==null?'var(--fg-3)':c.pct>=75?'var(--ok)':c.pct>=50?'var(--warn)':'var(--danger)';
  const real=eventsIn(addDays(t,-14),t).reduce((a,e)=>a+effHours(e),0);
  el.innerHTML=`<div class="rec-row"><div class="rec-pct" style="color:${col}">${c.pct==null?'—':c.pct+'%'}</div><div class="muted">de cumplimiento<br>en los últimos 14 días · ${fmtH(real)} reales</div></div>
    <div class="rec-chips"><span class="badge b3">✓ ${c.done} completadas</span><span class="badge b1">½ ${c.partial} parciales</span><span class="badge bno">✕ ${c.no} no hechas</span><span class="badge b0">${c.none} sin marcar</span></div>${warn}`;
}
function aiLabel(){return 'Google AI Studio · '+S.ai.model;}
function renderPlanInfo(){
  const ws=wkStart(planOff),we=addDays(ws,6),from=planFrom(ws);
  $('plan-week').value=String(planOff);
  const p=projection();
  $('plan-target').textContent='Del '+from.toLocaleDateString('es-ES',{day:'numeric',month:'long'})+' al '+we.toLocaleDateString('es-ES',{day:'numeric',month:'long'})
    +(p&&p.days>=0?` · faltan ${p.days} días para el examen (${{cobertura:'fase de cobertura',refuerzo:'fase de refuerzo',final:'repaso final'}[p.phase]})`:' · fija la fecha del examen en el Dashboard para planificar hacia atrás');
  $('plan-btn').innerHTML='✨ Planificar '+PLAN_LBL[planOff];
  const have=eventsIn(from,we).length;
  $('plan-ai-info').innerHTML=(S.ai.key?`IA: <strong>${esc(aiLabel())}</strong> · <button class="link-plain" onclick="openSettings()">cambiar</button>`:`⚠️ Falta la API Key de Google AI Studio. <button class="link-plain" onclick="openSettings()">Configurar</button>`)
    +(have?`<br>📅 Ya tienes <strong>${have}</strong> tarea${have>1?'s':''} en el calendario en ese periodo · <button class="link-plain" onclick="showWeek('${ymd(ws)}')">verlas</button>`:'');
}

function buildPlanPrompt(ws,extra){
  const t=todayD(),from=planFrom(ws);
  const days=[...Array(7)].map((_,i)=>addDays(ws,i)).filter(d=>d>=from);
  const availTxt=days.map(d=>`- ${ymd(d)} (${DOW[d.getDay()]}): ${+S.avail[d.getDay()]||0} h`).join('\n');
  const hist={};
  S.events.forEach(e=>{if(!e.tema)return;const h=hist[e.tema]||(hist[e.tema]={done:0,partial:0,no:0,h:0});if(e.status)h[e.status]++;h.h+=effHours(e);});
  const temasTxt=TEMAS.map(x=>{
    const d=td(x.n),h=hist[x.n],wk=d.weak.filter(w=>!w.done).map(w=>w.text).join('; ').slice(0,120);
    return `T${x.n} | G${x.g} | ${ESTADOS[d.e]} | conf ${d.conf?d.conf+'/5':'-'} | repasos ${d.reps||0}${d.last?' (último '+d.last+')':''} | próx. repaso ${d.r?String(d.r).slice(0,10):'-'} | ${h?`${h.done} compl., ${h.partial} parc., ${h.no} no hechas, ${fmtH(h.h)} dedicadas`:'sin tareas'} | débil: ${wk||'-'} | ${temaShort(x)}`;}).join('\n');
  const recent=S.events.filter(e=>{const d=pd(e.date);return d>=addDays(t,-21)&&d<from;}).sort((a,b)=>a.date.localeCompare(b.date)||a.s.localeCompare(b.s));
  const recTxt=recent.length?recent.map(e=>`- ${e.date} | ${TYPE_LBL[e.type]} | ${e.tema?'T'+e.tema:'-'} | ${fmtH(hrs(e))}${e.real!=null?' (reales '+e.real+' min)':''} | ${e.status?ST_LBL[e.status]:(pd(e.date)<t?'Sin marcar':'Pendiente')} | ${e.title}`).join('\n'):'(ninguna todavía)';
  const keep=weekKeep(ws);
  const keepTxt=keep.length?keep.map(e=>`- ${e.date} ${e.s}-${e.e} | ${TYPE_LBL[e.type]} | ${e.tema?'T'+e.tema:'-'} | ${e.title}`).join('\n'):'(ninguna)';
  const c=stats(eventsIn(addDays(t,-14),t));
  const p=projection();
  const hitos=S.exam.hitos.filter(h=>h.date&&pd(h.date)>=t).sort((a,b)=>a.date.localeCompare(b.date)).map(h=>`- ${h.date}: ${h.label}`).join('\n');
  const examTxt=p?`Fecha del 1.er ejercicio: ${S.exam.date} (faltan ${p.days} días). ${PHASE_TXT[p.phase]}
Estudio nuevo pendiente ≈ ${fmtH(p.need)}; necesario ≈ ${isFinite(p.needWeek)?fmtH(p.needWeek):'?'}/semana; ritmo ${p.hasData?'real':'disponible'} ≈ ${fmtH(p.pace)}/semana. Todo el temario debe estar repasado antes del examen.${hitos?'\nHitos próximos:\n'+hitos:''}`:'Fecha del examen: sin fijar (planifica por cobertura del temario).';
  const dud=S.doubts.filter(d=>!d.done).slice(0,8).map(d=>`- ${d.tema?'T'+d.tema+': ':''}${d.text}`).join('\n');
  return `Eres el planificador de estudio de un opositor a Agente de Policía Local del Ayuntamiento de Cieza (Murcia). Temario: 41 temas en 3 grupos (G I: temas 1-9, Derecho Constitucional y Administrativo; G II: temas 10-27, Derecho Penal, Procesal y Policial; G III: temas 28-41, Tráfico y Normativa Municipal). Estados de un tema: Sin empezar → 1ª Vuelta → 2ª Vuelta → Consolidado. "conf" es la confianza que el opositor tiene en el tema (1-5).

Hoy es ${ymd(t)}. Planifica del ${ymd(from)} al ${ymd(addDays(ws,6))}${from>ws?' (solo los días que quedan de esta semana)':' (lunes a domingo)'}.

PLAZOS Y FASE:
${examTxt}

DISPONIBILIDAD (horas máximas de estudio por día):
${availTxt}

ESTADO DEL TEMARIO (tema | grupo | estado | confianza | repasos | próximo repaso | historial de tareas | puntos débiles | título):
${temasTxt}

TAREAS DE LAS ÚLTIMAS 3 SEMANAS Y SU RESULTADO:
${recTxt}

Cumplimiento últimos 14 días: ${c.pct==null?'sin datos':c.pct+'%'} (${c.done} completadas, ${c.partial} parciales, ${c.no} no hechas, ${c.none} sin marcar).
${dud?`\nDUDAS PENDIENTES DEL OPOSITOR:\n${dud}\n`:''}${psicoPromptTxt(ws,keep)}
TAREAS YA FIJADAS EN EL CALENDARIO PARA ESE PERIODO (respétalas y descuenta su tiempo de la disponibilidad de ese día; las de tipo «Entrenamiento» son entrenamiento físico: no ocupes esa franja pero NO descuentes su tiempo de las horas de estudio):
${keepTxt}
${extra?`\nINDICACIONES DEL OPOSITOR (tienen prioridad):\n${extra}\n`:''}
REGLAS:
1. No superes las horas disponibles de cada día. Los días con 0 h son de descanso: sin tareas. Usa solo fechas del periodo indicado.
2. Prioridad: (a) recuperar tareas "No hecha", "Parcial" o "Sin marcar" recientes; (b) repasos vencidos o que vencen en ese periodo; (c) temas con confianza baja (1-2) o con puntos débiles; (d) avanzar temas "Sin empezar" siguiendo el orden del temario; (e) pasar a 2ª vuelta los temas en 1ª vuelta. Respeta la FASE indicada arriba: en el repaso final no se empiezan temas nuevos salvo que queden sin ver.
3. Bloques de 1 a 2,5 horas. Una 1ª vuelta de un tema suele necesitar 2-4 h; puedes dividirla en varias tareas.
4. "completa_vuelta": true solo en la tarea (de tipo study o repaso) cuyo final completa una vuelta o repaso del tema; si un tema se divide en varias tareas, solo la última lleva true. Al marcarla como completada el tema avanzará de estado.
5. Alterna grupos para no saturar. Si hay temas iniciados, incluye alguna tarea de tipo "test" que sea práctica de DESARROLLO ORAL/ESCRITO (esquema de memoria, exposición de un tema en 5 minutos, preguntas cortas abiertas); no son tests de opciones.
6. Si el cumplimiento reciente es bajo (<60 %), planifica algo menos que la disponibilidad máxima.
7. tipo: "study" (estudio de un tema, 1ª o 2ª vuelta), "repaso", "test" (práctica de desarrollo/simulacro), "psico" (sesión de psicotécnicos, sin tema; ver sección PSICOTÉCNICOS), "other".
8. Títulos cortos en español, p. ej. "Tema 5 · Acto administrativo (1ª vuelta)". En "descripcion" indica qué hacer en concreto (1-2 frases).

Responde SOLO con un objeto JSON, sin texto adicional, con esta forma:
{"resumen":"2-3 frases explicando el enfoque del periodo","tareas":[{"fecha":"YYYY-MM-DD","tipo":"study","tema":5,"titulo":"Tema 5 · Acto administrativo (1ª vuelta)","descripcion":"Lectura comprensiva y esquema de los apartados 1-3.","horas":2,"completa_vuelta":false}]}`;
}

async function aiText(prompt){
  if(!S.ai.key)throw {msg:'Falta la API Key de Google AI Studio. Añádela en ⚙️ Configuración.'};
  try{const r=await callGemini([{role:'user',content:prompt}],{key:S.ai.key,model:S.ai.model,json:true});return r.text;}
  catch(e){throw {msg:e&&e.blocked?'Sin conexión con Google AI Studio. Comprueba tu conexión a internet e inténtalo de nuevo.':'Error de Google AI Studio ('+S.ai.model+'): '+(e&&e.message||'desconocido')};}
}
function parseJSONLoose(t){
  t=String(t||'');
  try{return JSON.parse(t);}catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f){try{return JSON.parse(f[1]);}catch(e){}}
  const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1));}catch(e){}}
  return null;
}
function normTasks(data,ws){
  const from=planFrom(ws);
  const valid={};for(let i=0;i<7;i++){const d=addDays(ws,i);if(d>=from)valid[ymd(d)]=1;}
  const arr=Array.isArray(data&&data.tareas)?data.tareas:Array.isArray(data)?data:[];
  const out=[];
  arr.forEach(x=>{
    if(!x||typeof x!=='object')return;
    const fecha=String(x.fecha||x.date||'').slice(0,10);if(!valid[fecha])return;
    let tipo=String(x.tipo||x.type||'study').toLowerCase();
    if(!TYPE_LBL[tipo])tipo=/psic/.test(tipo)?'psico':/repas/.test(tipo)?'repaso':/test|simul/.test(tipo)?'test':/estud|study/.test(tipo)?'study':'other';
    let tema=parseInt(x.tema,10);if(!(tema>=1&&tema<=41)||tipo==='psico')tema=null;
    let h=parseFloat(String(x.horas??x.hours??1).replace(',','.'));if(!isFinite(h))h=1;h=Math.max(0.25,Math.min(6,Math.round(h*4)/4));
    const title=String(x.titulo||x.title||(tema?'Tema '+tema:TYPE_LBL[tipo])).slice(0,140);
    const cv=x.completa_vuelta;
    out.push({id:uid(),date:fecha,type:tipo,tema,title,desc:String(x.descripcion||x.desc||'').slice(0,600),h,
      adv:!!(tema&&(tipo==='study'||tipo==='repaso')&&cv!==false&&cv!=='false')});
  });
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function weekKeep(ws){return eventsIn(planFrom(ws),addDays(ws,6)).filter(e=>!(e.src==='ia'&&!e.status));}
function weekReplace(ws){return eventsIn(planFrom(ws),addDays(ws,6)).filter(e=>e.src==='ia'&&!e.status);}
function schedule(tasks,keep){
  const cur={};
  const fis=keep.filter(e=>e.type==='fisico');
  keep.forEach(e=>{if(e.type!=='fisico'&&e.e>(cur[e.date]||''))cur[e.date]=e.e;});
  // hoy: no programar en horas que ya han pasado
  const now=new Date(),ts=ymd(now);
  const mins=Math.ceil((now.getHours()*60+now.getMinutes()+1)/30)*30;
  const nowHM=String(Math.min(23,Math.floor(mins/60))).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
  return tasks.map(t=>{
    let base=S.startHour;
    if(t.date===ts&&nowHM>base)base=nowHM;
    const s=cur[t.date]&&cur[t.date]>base?cur[t.date]:base;
    let s2=s,e=addMin(s2,t.h*60);
    // el entrenamiento físico es un bloque fijo: la tarea de estudio se coloca después
    for(let k=0;k<5;k++){const ov=fis.find(f=>f.date===t.date&&f.s<e&&f.e>s2);if(!ov)break;s2=ov.e;e=addMin(s2,t.h*60);}
    cur[t.date]=e;return {...t,s:s2,e};
  });
}

async function planWeek(){
  if(planBusy)return;
  if(!S.ai.key){openSettings();return;}
  planBusy=true;
  const btn=$('plan-btn');btn.disabled=true;btn.innerHTML='<div class="spinner"></div> Planificando…';
  const el=$('plan-preview');
  el.innerHTML='<div class="card" style="display:flex;align-items:center;gap:10px"><div class="typing-dots"><span></span><span></span><span></span></div><span class="muted">La IA está preparando tu plan… puede tardar hasta un minuto.</span></div>';
  try{
    const ws=wkStart(planOff);
    const raw=await aiText(buildPlanPrompt(ws,$('plan-extra').value.trim()));
    const data=parseJSONLoose(raw);
    if(!data)throw {msg:'La respuesta de la IA no tenía un formato válido. Vuelve a pulsar «Planificar».'};
    const tasks=normTasks(data,ws);
    if(!tasks.length)throw {msg:'La IA no devolvió tareas válidas para ese periodo. Prueba otra vez o revisa tu disponibilidad.'};
    S.preview={ws:ymd(ws),resumen:String(data.resumen||'').slice(0,800),tasks,by:aiLabel()};saveS();
    planBusy=false;renderPreview();
  }catch(e){
    el.innerHTML=`<div class="alert alert-warn">❌ ${esc(e&&(e.msg||e.message)||'Error inesperado')}</div>`;
  }
  planBusy=false;btn.disabled=false;
  renderPlanInfo();
}
function renderPreview(){
  const el=$('plan-preview');
  const P=S.preview;
  if(planBusy)return;
  if(!P){el.innerHTML='';return;}
  const ws=pd(P.ws);
  if(ws<wkStart(0)){S.preview=null;saveS();el.innerHTML='';return;}
  const from=planFrom(ws);
  const keep=weekKeep(ws),rep=weekReplace(ws).length;
  const sch=schedule(P.tasks,keep);
  let days='';
  for(let i=0;i<7;i++){
    const d=addDays(ws,i),ds=ymd(d);
    if(d<from)continue;
    const tk=sch.filter(t=>t.date===ds),kp=keep.filter(e=>e.date===ds).sort((a,b)=>a.s.localeCompare(b.s));
    const sum=tk.reduce((a,t)=>a+t.h,0)+kp.reduce((a,e)=>a+hrs(e),0);
    const av=+S.avail[d.getDay()]||0;
    const rows=kp.map(e=>`<div class="pv-row kept"><span class="pv-time">${e.s}–${e.e}</span><span class="ev-dot" style="background:${TYPE_COL[e.type]}"></span><div class="ev-info"><div class="ev-title">${TYPE_ICON[e.type]} ${esc(e.title)}</div><div class="ev-sub">Ya en el calendario</div></div></div>`).join('')
      +tk.map(t=>`<div class="pv-row"><span class="pv-time">${t.s}–${t.e}</span><span class="ev-dot" style="background:${TYPE_COL[t.type]}"></span><div class="ev-info"><div class="ev-title">${TYPE_ICON[t.type]} ${esc(t.title)}</div><div class="ev-sub">${fmtH(t.h)}${t.adv?' · avanza el tema al completarla':''}${t.desc?' — '+esc(t.desc):''}</div></div><button class="ev-del" onclick="pvRemove('${t.id}')" title="Quitar de la propuesta">✕</button></div>`).join('');
    days+=`<div class="pv-day"><div class="pv-dh"><strong>${esc(cap(d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})))}</strong><span class="${sum>av+0.01?'over':''}">${fmtH(sum)} de ${fmtH(av)}</span></div>${rows||'<div class="muted" style="font-size:12px">Descanso</div>'}</div>`;
  }
  const n=P.tasks.length;
  el.innerHTML=`<div class="card">
    <div class="plan-head" style="margin-bottom:8px"><div><div class="plan-title">Propuesta para la semana del ${esc(ws.toLocaleDateString('es-ES',{day:'numeric',month:'long'}))}</div><div class="plan-sub">Generada con ${esc(P.by||'IA')} · revisa y quita lo que no quieras</div></div></div>
    ${P.resumen?`<div class="pv-sum">${esc(P.resumen)}</div>`:''}
    ${days}
    ${rep?`<div class="alert alert-info" style="margin:8px 0 0">Al aceptar se sustituirán ${rep} tarea${rep>1?'s':''} de IA sin marcar que ya había en ese periodo.</div>`:''}
    <div class="pv-actions">
      <button class="btn btn-ghost" onclick="discardPlan()">Descartar</button>
      <button class="btn btn-ghost" onclick="planWeek()">↻ Regenerar</button>
      <button class="btn btn-primary" onclick="acceptPlan()" ${n?'':'disabled'}>✓ Añadir al calendario (${n})</button>
    </div></div>`;
}
function pvRemove(id){if(!S.preview)return;S.preview.tasks=S.preview.tasks.filter(t=>t.id!==id);saveS();renderPreview();}
function discardPlan(){S.preview=null;saveS();renderPreview();}
function acceptPlan(){
  const P=S.preview;if(!P||!P.tasks.length)return;
  const ws=pd(P.ws);const keep=weekKeep(ws);const rem=new Set(weekReplace(ws).map(e=>e.id));
  S.events=S.events.filter(e=>!rem.has(e.id));
  schedule(P.tasks,keep).forEach(t=>S.events.push({id:t.id,title:t.title,date:t.date,type:t.type,s:t.s,e:t.e,tema:t.tema,desc:t.desc,adv:t.adv,src:'ia',status:null}));
  S.preview=null;saveS();
  calView='week';weekOff=Math.round((ws-wkStart(0))/(7*864e5));
  nav('cal');
}

// ============================================================
// CALENDARIO
// ============================================================
let weekOff=0,monthOff=0,calView='week',dragId=null;
function setCalView(v){
  if(v==='month'&&calView!=='month'){const ws=wkStart(weekOff),t=new Date();monthOff=(ws.getFullYear()-t.getFullYear())*12+ws.getMonth()-t.getMonth();}
  calView=v;renderCal();
}
function chgPeriod(d){if(calView==='week')weekOff+=d;else monthOff+=d;renderCal();}
function goToday(){weekOff=0;monthOff=0;renderCal();}
function goWeekOf(ds){weekOff=Math.round((mondayOf(pd(ds))-wkStart(0))/(7*864e5));calView='week';renderCal();}
function chipHTML(e){return `<div class="cal-ev ev-${e.type}${e.status?' st-'+e.status:''}" draggable="true" ondragstart="dragEv(event,'${e.id}')" onclick="event.stopPropagation();openTask('${e.id}')" title="${esc(e.title)} (${e.s}–${e.e})${e.status?' · '+ST_LBL[e.status]:''}">${e.status?ST_ICON[e.status]+' ':''}${e.s} ${esc(e.title)}</div>`;}
function dragEv(ev,id){dragId=id;try{ev.dataTransfer.setData('text/plain',id);ev.dataTransfer.effectAllowed='move';}catch(e){}}
function dropEv(ev,ds){
  ev.preventDefault();ev.stopPropagation();
  let id=dragId;if(!id){try{id=ev.dataTransfer.getData('text/plain');}catch(e){}}
  dragId=null;
  const e=S.events.find(x=>x.id===id);if(!e||e.date===ds)return;
  e.date=ds;saveS();refreshViews();
  toast('Tarea movida al '+pd(ds).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}));
}
function renderCal(){
  $('vw-week').classList.toggle('on',calView==='week');
  $('vw-month').classList.toggle('on',calView==='month');
  $('cal-tools').style.display=calView==='week'?'':'none';
  const hoy=todayD();
  const byDate={};S.events.forEach(e=>(byDate[e.date]||(byDate[e.date]=[])).push(e));
  Object.values(byDate).forEach(a=>a.sort((x,y)=>x.s.localeCompare(y.s)));
  let html=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="cal-day-hdr">${d}</div>`).join('');
  const grid=$('cal-grid');
  const dnd=ds=>`ondragover="event.preventDefault()" ondrop="dropEv(event,'${ds}')"`;
  if(calView==='week'){
    const ws=wkStart(weekOff),we=addDays(ws,6);
    $('week-lbl').textContent=ws.toLocaleDateString('es-ES',{day:'numeric',month:'short'})+' – '+we.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
    for(let i=0;i<7;i++){
      const d=addDays(ws,i),ds=ymd(d);
      html+=`<div class="cal-day${d.getTime()===hoy.getTime()?' today':''}" ${dnd(ds)} onclick="openAddEventOnDate('${ds}')"><div class="cal-day-num">${d.getDate()}</div>${(byDate[ds]||[]).map(chipHTML).join('')}</div>`;
    }
    grid.classList.remove('month');
    $('week-list-wrap').style.display='';
    renderWeekList(ws,we);
  }else{
    const t=new Date();const first=new Date(t.getFullYear(),t.getMonth()+monthOff,1);
    $('week-lbl').textContent=cap(first.toLocaleDateString('es-ES',{month:'long',year:'numeric'}));
    const start=mondayOf(first);const last=new Date(first.getFullYear(),first.getMonth()+1,0);const end=addDays(mondayOf(last),6);
    for(let d=new Date(start);d<=end;d=addDays(d,1)){
      const ds=ymd(d),evs=byDate[ds]||[];
      html+=`<div class="cal-day${d.getMonth()!==first.getMonth()?' out':''}${d.getTime()===hoy.getTime()?' today':''}" ${dnd(ds)} onclick="goWeekOf('${ds}')" title="Ver la semana"><div class="cal-day-num">${d.getDate()}</div>${evs.slice(0,3).map(chipHTML).join('')}${evs.length>3?`<div class="cal-more">+${evs.length-3} más</div>`:''}</div>`;
    }
    grid.classList.add('month');
    $('week-list-wrap').style.display='none';
  }
  grid.innerHTML=html;
  const n=pastUnmarked().length;
  let info=n?`<div class="alert alert-warn">Tienes <strong>${n}</strong> tarea${n>1?'s':''} pasada${n>1?'s':''} sin marcar. Indica si las completaste para que el planificador lo tenga en cuenta. <button class="link" onclick="goPending()">Ir a la primera</button></div>`:'';
  let vEnd,vStart;
  if(calView==='week'){vStart=wkStart(weekOff);vEnd=addDays(vStart,6);}
  else{const t=new Date();const f=new Date(t.getFullYear(),t.getMonth()+monthOff,1);vStart=mondayOf(f);vEnd=addDays(mondayOf(new Date(f.getFullYear(),f.getMonth()+1,0)),6);}
  if(!eventsIn(vStart,vEnd).length){
    const nx=nextEventAfter(vEnd);
    if(nx){const cnt=eventsIn(mondayOf(pd(nx.date)),addDays(mondayOf(pd(nx.date)),6)).length;
      info+=`<div class="alert alert-info">No hay tareas en ${calView==='week'?'esta semana':'este mes'}. Tienes <strong>${cnt}</strong> tarea${cnt>1?'s':''} planificada${cnt>1?'s':''} la semana del ${esc(mondayOf(pd(nx.date)).toLocaleDateString('es-ES',{day:'numeric',month:'long'}))}. <button class="link" onclick="goWeekOf('${nx.date}')">Ver esa semana →</button></div>`;}
  }
  $('cal-pending').innerHTML=info;
}
function renderWeekList(ws,we){
  const el=$('week-evs');
  const wEvs=eventsIn(ws,we).sort((a,b)=>a.date.localeCompare(b.date)||a.s.localeCompare(b.s));
  if(!wEvs.length){el.innerHTML=`<div class="muted">Sin tareas esta semana. Usa el <button class="link-plain" onclick="nav('plan')">Planificador</button> o haz clic en un día para añadir una.</div>`;return;}
  let last='';
  el.innerHTML=wEvs.map(e=>{const h=e.date!==last?`<div class="day-hdr">${esc(cap(pd(e.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})))}</div>`:'';last=e.date;return h+taskRow(e);}).join('');
}
function stBtns(e){
  return (e.status==='done'?'':e.type==='fisico'&&e.entr?`<button class="st-btn s-play" title="Registrar el entrenamiento" aria-label="Registrar el entrenamiento" onclick="entrLogOpen('${e.id}')">📝</button>`:e.type==='psico'?`<button class="st-btn s-play" title="Hacer un cuestionario" aria-label="Hacer un cuestionario" onclick="psicoFromTask('${e.id}')">🧩</button>`:`<button class="st-btn s-play" title="Iniciar temporizador" aria-label="Iniciar temporizador" onclick="tmStart('${e.id}')">▶</button>`)
    +['done','partial','no'].map(k=>`<button class="st-btn s-${k}${e.status===k?' on':''}" title="${ST_LBL[k]}" aria-label="${ST_LBL[k]}" onclick="setStatus('${e.id}','${k}')">${ST_ICON[k]}</button>`).join('');
}
function taskRow(e){
  const overdue=!e.status&&pd(e.date)<todayD();
  return `<div class="event-item${e.status?' st-'+e.status:''}${overdue?' overdue':''}">
    <div class="ev-dot" style="background:${TYPE_COL[e.type]}"></div>
    <div class="ev-info ev-click" onclick="openTask('${e.id}')">
      <div class="ev-title">${TYPE_ICON[e.type]} ${esc(e.title)}</div>
      <div class="ev-sub">${esc(e.s)}–${esc(e.e)} · ${fmtH(hrs(e))}${e.real!=null?' · ⏱ '+e.real+' min':''}${e.tema?' · Tema '+e.tema:''}${e.src==='ia'?' · ✨ IA':''}${overdue?' · <span style="color:var(--warn);font-weight:600">sin marcar</span>':''}</div>
    </div>
    <div class="st-btns">${stBtns(e)}</div>
  </div>`;
}
function showWeek(ds){nav('cal');goWeekOf(ds);}
function nextEventAfter(d){return S.events.filter(e=>pd(e.date)>d).sort((a,b)=>a.date.localeCompare(b.date)||a.s.localeCompare(b.s))[0];}
function goPending(){const p=pastUnmarked().sort((a,b)=>a.date.localeCompare(b.date))[0];if(!p)return;nav('cal');goWeekOf(p.date);}

// --- estado de una tarea ---
function setStatus(id,st){
  const e=S.events.find(x=>x.id===id);if(!e)return;
  applyStatus(id,e.status===st?null:st);
}
// Fija el estado (sin alternar). Al completar una tarea que cierra una vuelta, el tema avanza.
function applyStatus(id,nst){
  const e=S.events.find(x=>x.id===id);if(!e)return;
  if(e.advTo!=null&&nst!=='done'){
    const d=td(e.tema);if(d.e===e.advTo){d.e=e.advFrom;d.r=e.advR??null;d.iv=e.advIv??0;}
    e.advTo=null;e.advFrom=null;e.advR=null;e.advIv=null;
  }
  if(nst==='done'&&e.adv&&e.tema&&e.advTo==null){
    const d=td(e.tema);e.advFrom=d.e;e.advR=d.r;e.advIv=d.iv;
    const ne=Math.min(3,d.e+1);d.e=ne;d.iv=REPASO_DIAS[ne];d.r=ymd(addDays(new Date(),d.iv));e.advTo=ne;
  }
  e.status=nst;e.statusAt=nst?ymd(new Date()):null;
  saveS();refreshViews();
  if(curTask===id&&$('modal-task').style.display==='flex')openTask(id);
}
let curTask=null,delArmed=false;
function gcalUrl(e){
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(TYPE_ICON[e.type]+' '+e.title)
    +'&dates='+icsDT(e.date,e.s)+'/'+icsDT(e.date,e.e>e.s?e.e:addMin(e.s,60))
    +'&details='+encodeURIComponent(e.desc||'')+'&ctz=Europe%2FMadrid';
}
function openTask(id){
  const e=S.events.find(x=>x.id===id);if(!e)return;
  curTask=id;delArmed=false;
  $('tk-del').textContent='🗑 Eliminar';
  $('tk-title').textContent=TYPE_ICON[e.type]+' '+e.title;
  $('tk-meta').textContent=cap(pd(e.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}))+' · '+e.s+'–'+e.e+' · '+TYPE_LBL[e.type]+(e.tema?' · Tema '+e.tema:'')+(e.real!=null?' · ⏱ '+e.real+' min reales':'')+(e.src==='ia'?' · ✨ IA':'');
  const dd=$('tk-desc');
  const tema=e.tema?TEMAS.find(x=>x.n===e.tema):null;
  dd.textContent=e.desc||(tema?tema.t:'');dd.style.display=dd.textContent?'block':'none';
  $('tk-status').innerHTML=['done','partial','no'].map(k=>`<button class="btn btn-ghost${e.status===k?' on-'+k:''}" onclick="setStatus('${e.id}','${k}')">${ST_ICON[k]} ${ST_LBL[k]}</button>`).join('');
  $('tk-gcal').href=gcalUrl(e);
  $('tk-psico').style.display=e.type==='psico'?'':'none';
  $('tk-entr').style.display=e.type==='fisico'&&e.entr?'':'none';
  $('tk-timer').style.display=e.type==='fisico'?'none':'';
  let note='';
  if(e.advTo!=null)note=`✓ El Tema ${e.tema} pasó a «${ESTADOS[e.advTo]}» al completar esta tarea.`;
  else if(e.adv&&e.tema)note=`Al marcarla como completada, el Tema ${e.tema} avanzará de estado en «Temas» (ahora: ${ESTADOS[td(e.tema).e]}).`;
  else if(e.tema&&(e.type==='study'||e.type==='repaso'))note='Esta es una parte del tema: completarla no cambia su estado.';
  if(e.type==='psico')note=(e.pq&&e.pq.length?'Cuestionarios hechos en esta tarea: '+e.pq.join(' · ')+'. ':'')+'Pulsa «Hacer cuestionario»: se abre el sugerido y el tiempo se suma a la tarea.';
  if(e.type==='fisico')note=e.entr?'Pulsa «Registrar entrenamiento» al terminar: tus marcas, el esfuerzo y las molestias ajustan la semana siguiente.':'';
  $('tk-note').textContent=note;
  $('modal-task').style.display='flex';
}
function delTask(){
  if(!curTask)return;
  const b=$('tk-del');
  if(!delArmed){delArmed=true;b.textContent='¿Seguro? Pulsa otra vez';return;}
  S.events=S.events.filter(e=>e.id!==curTask);curTask=null;saveS();closeM('modal-task');refreshViews();
}
function postponeTask(){
  const e=S.events.find(x=>x.id===curTask);if(!e)return;
  const tm=addDays(todayD(),1);
  e.date=ymd(pd(e.date)>=tm?addDays(pd(e.date),1):tm);
  saveS();closeM('modal-task');refreshViews();
  toast('Pospuesta al '+pd(e.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}));
}
function tmStartCurrent(){tmStart(curTask);}

// --- crear / editar tareas ---
let editId=null;
function fillTemaSelect(){
  $('ev-tema').innerHTML='<option value="">Sin tema</option>'+TEMAS.map(t=>`<option value="${t.n}">Tema ${t.n} · ${esc(temaShort(t))}</option>`).join('');
}
function openAddEvent(){
  editId=null;fillTemaSelect();
  $('ev-mtitle').textContent='📅 Nueva sesión de estudio';
  $('ev-msub').textContent='Registra un bloque de tiempo en el planificador.';
  $('ev-save').textContent='Guardar tarea';
  $('ev-date').value=ymd(new Date());
  $('ev-title').value='';
  $('ev-type').value='study';
  $('ev-s').value=S.startHour||'09:00';
  $('ev-e').value=addMin(S.startHour||'09:00',120);
  $('ev-real').value='';
  $('modal-ev').style.display='flex';
}
function openAddEventOnDate(ds){openAddEvent();$('ev-date').value=ds;}
function openAddEventTema(n){openAddEvent();$('ev-tema').value=String(n);}
function editTask(){
  const e=S.events.find(x=>x.id===curTask);if(!e)return;
  closeM('modal-task');
  editId=e.id;fillTemaSelect();
  $('ev-mtitle').textContent='✏️ Editar tarea';
  $('ev-msub').textContent='Cambia la hora, el día o el título. El estado de la tarea se mantiene.';
  $('ev-save').textContent='Guardar cambios';
  $('ev-title').value=e.title;$('ev-date').value=e.date;$('ev-type').value=e.type;
  $('ev-tema').value=e.tema?String(e.tema):'';
  $('ev-s').value=e.s;$('ev-e').value=e.e;
  $('ev-real').value=e.real!=null?e.real:'';
  $('modal-ev').style.display='flex';
}
function saveEv(){
  const tema=parseInt($('ev-tema').value,10)||null;
  let title=$('ev-title').value.trim();
  if(!title&&tema)title='Tema '+tema+' · '+temaShort(TEMAS.find(t=>t.n===tema));
  if(!title){$('ev-title').focus();return;}
  const date=$('ev-date').value;if(!date){$('ev-date').focus();return;}
  const type=$('ev-type').value;
  const s=$('ev-s').value||'09:00';let e=$('ev-e').value;
  if(!e||e<=s)e=addMin(s,60);
  const rv=$('ev-real').value.trim(),real=rv===''?null:Math.max(0,Math.min(900,parseInt(rv,10)||0));
  if(editId){
    const ev=S.events.find(x=>x.id===editId);
    if(ev){
      Object.assign(ev,{title,date,type,s,e,tema,real});
      if(ev.advTo==null)ev.adv=!!(tema&&(type==='study'||type==='repaso'));
      if(ev.src==='ia')ev.src='manual'; // editada a mano: el planificador ya no la sustituye
    }
  }else{
    S.events.push({id:uid(),title,date,type,s,e,tema,desc:'',adv:!!(tema&&(type==='study'||type==='repaso')),src:'manual',status:null,real});
  }
  editId=null;saveS();closeM('modal-ev');refreshViews();
}

// --- copiar semana, semana tipo ---
function cloneEv(e,date){return {id:uid(),title:e.title,date,type:e.type,s:e.s,e:e.e,tema:e.tema||null,desc:e.desc||'',adv:!!e.adv,src:'copia',status:null};}
function copyPrevWeek(){
  const ws=wkStart(weekOff),pw=addDays(ws,-7);
  const evs=eventsIn(pw,addDays(pw,6));
  if(!evs.length){toast('La semana anterior no tiene tareas.');return;}
  const cur=eventsIn(ws,addDays(ws,6)).length;
  if(!confirm(`Se copiarán ${evs.length} tarea${evs.length>1?'s':''} de la semana anterior${cur?` (esta semana ya tiene ${cur}, se conservan)`:''}. ¿Continuar?`))return;
  evs.forEach(e=>S.events.push(cloneEv(e,ymd(addDays(pd(e.date),7)))));
  saveS();refreshViews();toast('Semana copiada');
}
function saveTpl(){
  const ws=wkStart(weekOff),evs=eventsIn(ws,addDays(ws,6));
  if(!evs.length){toast('Esta semana no tiene tareas que guardar.');return;}
  if(S.tpl.length&&!confirm('Ya tienes una semana tipo guardada. ¿Sustituirla por esta semana?'))return;
  S.tpl=evs.map(e=>({dow:Math.round((pd(e.date)-ws)/864e5),title:e.title,type:e.type,s:e.s,e:e.e,tema:e.tema||null,desc:e.desc||'',adv:!!e.adv}));
  saveS();toast(`Semana tipo guardada (${S.tpl.length} tareas)`);
}
function applyTpl(){
  if(!S.tpl.length){toast('Aún no has guardado una semana tipo (botón «Guardar como semana tipo»).');return;}
  const ws=wkStart(weekOff);
  if(!confirm(`Se añadirán ${S.tpl.length} tareas de tu semana tipo a esta semana. ¿Continuar?`))return;
  S.tpl.forEach(t=>S.events.push(cloneEv(t,ymd(addDays(ws,t.dow)))));
  saveS();refreshViews();
}

// --- exportar a calendario (.ics) ---
function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');}
function icsDT(date,hm){return String(date).replace(/-/g,'')+'T'+String(hm).replace(':','')+'00';}
function icsFold(l){const out=[];while(l.length>60){out.push(l.slice(0,60));l=' '+l.slice(60);}out.push(l);return out.join('\r\n');}
function buildICS(evs){
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Oposicion PL Cieza//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Oposición PL Cieza'];
  evs.forEach(e=>{
    const end=e.e>e.s?e.e:addMin(e.s,60);
    L.push('BEGIN:VEVENT','UID:'+e.id+'@oposicion-pl-cieza','DTSTAMP:'+stamp,'DTSTART:'+icsDT(e.date,e.s),'DTEND:'+icsDT(e.date,end),
      'SUMMARY:'+icsEsc(TYPE_ICON[e.type]+' '+e.title),'DESCRIPTION:'+icsEsc(e.desc||''),
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(e.title),'TRIGGER:-PT15M','END:VALARM','END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n')+'\r\n';
}
function exportICS(scope){
  let evs;
  if(scope==='week'){const ws=wkStart(weekOff);evs=eventsIn(ws,addDays(ws,6));}
  else{const t=todayD();evs=S.events.filter(e=>pd(e.date)>=t);}
  if(!evs.length){toast('No hay tareas que exportar.');return;}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buildICS(evs)],{type:'text/calendar;charset=utf-8'}));
  a.download='oposicion-'+(scope==='week'?'semana-'+ymd(wkStart(weekOff)):'pendientes')+'.ics';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
  toast(`${evs.length} tarea${evs.length>1?'s':''} exportada${evs.length>1?'s':''} (.ics)`);
}
