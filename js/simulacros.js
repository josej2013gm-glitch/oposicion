// ============================================================
// SIMULACROS: las 3 pruebas teóricas (Test, Callejero y Escrito)
//
// Cada simulacro es un objeto en S.sims (un documento por simulacro en
// Firestore: users/{uid}/sims/{id}, ver sync.js):
//   {id, tipo:'test'|'callejero'|'escrito', date:'AAAA-MM-DD', created, nota, obs,
//    a, f, b                         ← test y callejero (aciertos, fallos, en blanco)
//    tema, mins, informe, ia:{…}     ← escrito (tema 1-40, minutos, informe externo, evaluación de Gemini)}
// ============================================================
const SIM_TIPOS={
  test:{l:'Tipo test',ic:'📝',max:5,min:2.5,pen:0.02,c:'var(--info)'},
  callejero:{l:'Callejero',ic:'🗺️',max:2,min:null,pen:0.03,c:'var(--warn)'},
  escrito:{l:'Escrito',ic:'✍️',max:5,min:2.5,c:'var(--accent)'},
};
const SIM_ORDEN=['test','callejero','escrito'];
const SIM_MAX_TOTAL=12;          // 5 + 2 + 5
const ESCRITO_MAX_MIN=90;        // 1 h 30 min
const SIM_CRITERIOS=[
  ['conocimiento','Conocimiento del tema'],
  ['contenido','Calidad del contenido'],
  ['estructura','Claridad y estructuración'],
  ['ortografia','Corrección ortográfica y gramatical'],
  ['expresion','Expresión escrita'],
];

let simFilter='';           // '' = todos
let simForm={tipo:'test',edit:null};
let simBusy=false;

// ---------- utilidades ----------
const fmtN=(n,d=2)=>n==null||!isFinite(n)?'—':(Math.round(n*10**d)/10**d).toFixed(d).replace('.',',');
const simInt=v=>{const n=parseInt(v,10);return isFinite(n)&&n>0?n:0;};
function fmtMins(m){m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return h?`${h} h${r?' '+r+' min':''}`:`${r} min`;}
function simPass(x){const T=SIM_TIPOS[x.tipo];return T.min==null?null:x.nota>=T.min;}
function simColor(tipo,nota){
  const T=SIM_TIPOS[tipo];if(nota==null)return 'var(--fg-3)';
  if(T.min!=null)return nota>=T.min?'var(--ok)':'var(--danger)';
  const r=nota/T.max;return r>=0.6?'var(--ok)':r>=0.4?'var(--warn)':'var(--danger)';
}

// Puntuación de Test y Callejero: el valor de cada acierto es el máximo entre el n.º de preguntas;
// cada fallo resta la penalización fija y las preguntas en blanco no puntúan ni penalizan.
function simScore(tipo,a,f,b){
  const T=SIM_TIPOS[tipo];
  const n=a+f+b;
  if(!n)return {nota:0,n:0,valor:0,bruto:0,pen:0};
  const valor=T.max/n,bruto=a*valor,pen=f*T.pen;
  const nota=Math.max(0,Math.min(T.max,bruto-pen));
  return {nota:Math.round(nota*100)/100,n,valor,bruto,pen};
}

// ---------- panel ----------
function renderSims(){
  const g=simAgg();
  const list=S.sims.filter(x=>!simFilter||x.tipo===simFilter)
    .sort((a,b)=>(b.date+(b.created||'')).localeCompare(a.date+(a.created||'')));
  let h=`<div class="filters sim-top">
    <div class="seg">${[['','Todos'],...SIM_ORDEN.map(k=>[k,SIM_TIPOS[k].ic+' '+SIM_TIPOS[k].l])].map(([k,l])=>`<button class="${simFilter===k?'on':''}" onclick="setSimFilter('${k}')">${esc(l)}</button>`).join('')}</div>
    <span style="flex:1"></span>
    <button class="btn btn-primary btn-sm" onclick="openSim()">+ Nuevo simulacro</button>
  </div>`;
  h+=simSummaryHTML(g);
  h+=`<div class="two-col" style="margin-top:14px">
    <div class="card"><div class="card-title">Evolución (últimos 12 de cada prueba)</div>${simEvoHTML()}</div>
    <div class="card"><div class="card-title">Detalle por prueba</div>${simDetailHTML(g)}</div></div>`;
  h+=`<div class="section-label">Historial${simFilter?' · '+esc(SIM_TIPOS[simFilter].l):''} <span class="muted" style="font-weight:400">(${list.length})</span></div>`;
  h+=list.length?`<div class="card sim-list">${list.map(simRowHTML).join('')}</div>`
    :`<div class="card muted">${S.sims.length?'No hay simulacros de este tipo.':'Aún no has registrado ningún simulacro. Pulsa «+ Nuevo simulacro» después de hacer un test, un callejero o un escrito.'}</div>`;
  $('sims-cont').innerHTML=h;
}
function setSimFilter(k){simFilter=k;renderSims();}

// Tarjetas de medias + nota global estimada (también las usa Estadísticas)
function simSummaryHTML(g){
  const tiles=SIM_ORDEN.map(k=>{
    const T=SIM_TIPOS[k],x=g[k];
    return `<div class="stat-tile"><div class="stat-label">${T.ic} ${esc(T.l)} · media</div>
      <div class="stat-value" style="color:${simColor(k,x.avg)}">${fmtN(x.avg)}<span class="sim-of">/${T.max}</span></div>
      <div class="stat-sub">${x.n?`${x.n} simulacro${x.n===1?'':'s'} · mejor ${fmtN(x.best)}`:'sin simulacros'}${T.min!=null?` · mín. ${fmtN(T.min)}`:' · no eliminatorio'}</div></div>`;
  });
  const gl=g.global;
  const gc=gl.complete?(gl.ok?'var(--ok)':'var(--danger)'):'var(--fg-3)';
  tiles.push(`<div class="stat-tile sim-global"><div class="stat-label">🎯 Nota teórica estimada</div>
    <div class="stat-value" style="color:${gc}">${gl.any?fmtN(gl.sum):'—'}<span class="sim-of">/${SIM_MAX_TOTAL}</span></div>
    <div class="stat-sub">${!gl.any?'suma de las medias de las 3 pruebas':gl.complete?(gl.ok?'superarías las pruebas eliminatorias':'⚠ alguna media eliminatoria por debajo de 2,50'):'parcial: falta '+gl.missing.map(k=>SIM_TIPOS[k].l).join(' y ')}</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${gl.any?Math.round(gl.sum/SIM_MAX_TOTAL*100):0}%;background:${gc}"></div></div></div>`);
  return `<div class="stats-row">${tiles.join('')}</div>`;
}

function simDetailHTML(g){
  return SIM_ORDEN.map(k=>{
    const T=SIM_TIPOS[k],x=g[k];
    if(!x.n)return `<div class="sim-det"><strong>${T.ic} ${esc(T.l)}</strong><div class="muted">Sin datos todavía.</div></div>`;
    const trend=x.n>=2&&x.last5!=null&&x.avg!=null?x.last5-x.avg:null;
    const tr=trend==null||Math.abs(trend)<0.05?'':trend>0?`<span style="color:var(--ok)">▲ ${fmtN(trend)}</span>`:`<span style="color:var(--danger)">▼ ${fmtN(-trend)}</span>`;
    let extra='';
    if(k!=='escrito')extra=`Media: ${fmtN(x.aAvg,1)} aciertos · ${fmtN(x.fAvg,1)} fallos · ${fmtN(x.bAvg,1)} en blanco`;
    else extra=`Tiempo medio: ${fmtMins(x.minsAvg)} · ${x.temas} tema${x.temas===1?'':'s'} distinto${x.temas===1?'':'s'}`;
    return `<div class="sim-det"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${T.ic} ${esc(T.l)}</strong>
      <span class="muted">últimos 5: <strong style="color:${simColor(k,x.last5)}">${fmtN(x.last5)}</strong> ${tr}</span></div>
      <div class="muted">${T.min!=null?`${x.pass}/${x.n} aprobados · `:''}peor ${fmtN(x.worst)} · ${extra}</div></div>`;
  }).join('');
}

function simEvoHTML(){
  const rows=SIM_ORDEN.map(k=>{
    const T=SIM_TIPOS[k];
    const xs=S.sims.filter(x=>x.tipo===k&&x.nota!=null).sort((a,b)=>(a.date+(a.created||'')).localeCompare(b.date+(b.created||''))).slice(-12);
    const bars=xs.length?xs.map(x=>`<div class="sim-bar" title="${esc(simFD(x.date))}: ${fmtN(x.nota)}/${T.max}" style="height:${Math.max(4,Math.round(x.nota/T.max*100))}%;background:${simColor(k,x.nota)}" onclick="openSimDetail('${x.id}')"></div>`).join('')
      :'<span class="muted" style="align-self:center">—</span>';
    const line=T.min!=null?`<div class="sim-min" style="bottom:${T.min/T.max*100}%" title="Mínimo ${fmtN(T.min)}"></div>`:'';
    return `<div class="sim-evo-row"><div class="sim-evo-lbl">${T.ic} ${esc(T.l)}<span>/${T.max}</span></div><div class="sim-evo">${line}${bars}</div></div>`;
  });
  return rows.join('')+'<div class="cal-legend"><span>La línea marca el mínimo de 2,50 · pulsa una barra para ver el simulacro</span></div>';
}

function simRowHTML(x){
  const T=SIM_TIPOS[x.tipo],p=simPass(x);
  let det;
  if(x.tipo==='escrito'){const t=TEMAS.find(y=>y.n===x.tema);det=`Tema ${x.tema}${t?' · '+esc(temaShort(t)):''} · ${fmtMins(x.mins)}`;}
  else det=`✓ ${x.a} · ✕ ${x.f} · ○ ${x.b} <span class="muted">(${x.a+x.f+x.b} preguntas)</span>`;
  const badge=p==null?'':p?'<span class="badge b3">Aprobado</span>':'<span class="badge bno">No apto</span>';
  return `<div class="sim-row" onclick="openSimDetail('${x.id}')">
    <span class="sim-ic" title="${esc(T.l)}">${T.ic}</span>
    <div class="sim-mid"><div class="sim-t">${esc(T.l)} <span class="muted">· ${esc(simFD(x.date))}</span></div><div class="sim-d">${det}</div></div>
    ${badge}<span class="sim-nota" style="color:${simColor(x.tipo,x.nota)}">${fmtN(x.nota)}<span>/${T.max}</span></span></div>`;
}
function simFD(s){try{return pd(s).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});}catch(e){return s;}}

// ---------- formulario ----------
function openSim(tipo,editId){
  const x=editId?S.sims.find(y=>y.id===editId):null;
  simForm={tipo:x?x.tipo:(tipo||simFilter||'test'),edit:x?x.id:null};
  $('sim-mtitle').textContent=x?'✏️ Editar simulacro':'🎯 Nuevo simulacro';
  $('sim-date').value=x?x.date:ymd(todayD());
  $('sim-a').value=x&&x.a!=null?x.a:'';$('sim-f').value=x&&x.f!=null?x.f:'';$('sim-b').value=x&&x.b!=null?x.b:'';
  $('sim-tema').innerHTML='<option value="">Elige el tema…</option>'+TEMAS.filter(t=>t.n<=40).map(t=>`<option value="${t.n}">T${t.n} · ${esc(temaShort(t))}</option>`).join('');
  $('sim-tema').value=x&&x.tema?x.tema:'';
  const m=x&&x.mins?x.mins:'';
  $('sim-h').value=m?Math.floor(m/60):'';$('sim-m').value=m?m%60:'';
  $('sim-inf').value=x&&x.informe?x.informe:'';
  $('sim-obs').value=x&&x.obs?x.obs:'';
  $('sim-err').textContent='';
  simSetTipo(simForm.tipo);
  $('modal-sim').style.display='flex';
}
function simSetTipo(k){
  simForm.tipo=k;
  document.querySelectorAll('#sim-tipo button').forEach(b=>{b.classList.toggle('on',b.dataset.t===k);b.disabled=!!simForm.edit&&b.dataset.t!==k;});
  const es=k==='escrito';
  $('sim-box-q').hidden=es;$('sim-box-e').hidden=!es;
  const T=SIM_TIPOS[k];
  $('sim-rules').innerHTML=es
    ?`Hasta <strong>5,00</strong> puntos · mínimo <strong>2,50</strong> para aprobar · tiempo máximo <strong>1 h 30 min</strong>. Pega el informe de corrección externo: Gemini lo evaluará con los criterios de las bases y asignará la nota.`
    :`Hasta <strong>${fmtN(T.max)}</strong> puntos · ${T.min!=null?`mínimo <strong>${fmtN(T.min)}</strong> para aprobar`:'<strong>no eliminatorio</strong>'} · cada fallo resta <strong>${fmtN(T.pen)}</strong> · las preguntas en blanco no penalizan.`;
  simPreview();simInfCount();
  $('sim-save').textContent=es&&simNeedsAI()?'✨ Evaluar con IA y guardar':'Guardar';
}
function simPreview(){
  if(simForm.tipo==='escrito')return;
  const a=simInt($('sim-a').value),f=simInt($('sim-f').value),b=simInt($('sim-b').value);
  const T=SIM_TIPOS[simForm.tipo],r=simScore(simForm.tipo,a,f,b);
  const el=$('sim-prev');
  if(!r.n){el.innerHTML='<span class="muted">Introduce aciertos, fallos y en blanco para ver la nota.</span>';return;}
  const p=T.min==null?'':r.nota>=T.min?' · <span style="color:var(--ok)">Aprobado</span>':' · <span style="color:var(--danger)">No apto</span>';
  el.innerHTML=`<div class="sim-prev-n" style="color:${simColor(simForm.tipo,r.nota)}">${fmtN(r.nota)} <span>/ ${fmtN(T.max)}</span>${p}</div>
    <div class="muted">${r.n} preguntas · cada acierto vale ${fmtN(r.valor,3)} → ${a} × ${fmtN(r.valor,3)} = ${fmtN(r.bruto)} − ${f} × ${fmtN(T.pen)} = ${fmtN(r.pen)} de penalización</div>`;
}
function simInfCount(){const v=$('sim-inf').value.trim();$('sim-inf-n').textContent=(v?v.split(/\s+/).length:0)+' palabras';
  if(simForm.tipo==='escrito')$('sim-save').textContent=simNeedsAI()?'✨ Evaluar con IA y guardar':'Guardar';}
// Hace falta llamar a la IA si es un escrito nuevo, si cambió el informe o si nunca se evaluó
function simNeedsAI(){
  const x=simForm.edit&&S.sims.find(y=>y.id===simForm.edit);
  return !x||x.nota==null||(x.informe||'')!==$('sim-inf').value.trim();
}
async function simPaste(){
  try{const t=await navigator.clipboard.readText();if(t){$('sim-inf').value=t;simInfCount();}else toast('El portapapeles está vacío.');}
  catch(e){toast('No se pudo leer el portapapeles: pega el texto con Ctrl+V / mantener pulsado.');}
}

async function saveSim(){
  if(simBusy)return;
  const err=t=>{$('sim-err').textContent=t;};
  const tipo=simForm.tipo,date=$('sim-date').value;
  if(!date){err('Indica la fecha del simulacro.');return;}
  const base=simForm.edit?S.sims.find(y=>y.id===simForm.edit):null;
  const x={...(base||{id:uid(),created:new Date().toISOString()}),tipo,date,obs:$('sim-obs').value.trim().slice(0,2000)};
  if(tipo!=='escrito'){
    const a=simInt($('sim-a').value),f=simInt($('sim-f').value),b=simInt($('sim-b').value);
    if(a+f+b===0){err('Introduce al menos una pregunta (aciertos, fallos o en blanco).');return;}
    if(a+f+b>500){err('Demasiadas preguntas: revisa los números.');return;}
    Object.assign(x,{a,f,b,nota:simScore(tipo,a,f,b).nota});
    simCommit(x);return;
  }
  const tema=parseInt($('sim-tema').value,10);
  const hh=simInt($('sim-h').value),mm=simInt($('sim-m').value),mins=hh*60+mm;
  const informe=$('sim-inf').value.trim();
  if(!(tema>=1&&tema<=40)){err('Elige el tema que has desarrollado (1 a 40).');return;}
  if(!mins){err('Indica el tiempo invertido.');return;}
  if(mm>59){err('Los minutos deben estar entre 0 y 59.');return;}
  if(mins>ESCRITO_MAX_MIN){err('El tiempo máximo del examen escrito es 1 h 30 min.');return;}
  if(informe.length<80){err('Pega el informe de corrección completo: es demasiado corto.');return;}
  if(informe.length>60000){err('El informe es demasiado largo (máx. 60 000 caracteres).');return;}
  Object.assign(x,{tema,mins,informe});
  if(!simNeedsAI()){simCommit(x);return;}
  if(!S.ai.key){err('Falta la API Key de Google AI Studio: añádela en ⚙️ Configuración.');return;}
  const btn=$('sim-save');simBusy=true;btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Evaluando con IA…';err('');
  try{
    const ev=await simEvaluate(tema,mins,informe);
    x.nota=ev.nota;x.ia=ev.ia;
    simCommit(x);
    toast(`✓ Escrito evaluado: ${fmtN(x.nota)} / 5`);
  }catch(e){err(e&&e.msg?e.msg:'No se pudo evaluar el informe.');}
  finally{simBusy=false;btn.disabled=false;simSetTipo(simForm.tipo);}
}
function simCommit(x){
  const i=S.sims.findIndex(y=>y.id===x.id);
  if(i>=0)S.sims[i]=x;else S.sims.push(x);
  saveS();closeM('modal-sim');
  if(PANELS.find(p=>$('p-'+p).classList.contains('active'))!=='sims')nav('sims');else renderSims();
  if(!simForm.edit)openSimDetail(x.id);
}

// ---------- evaluación del escrito con Gemini ----------
function simPrompt(tema,mins,informe){
  const t=TEMAS.find(y=>y.n===tema);
  return `Eres un miembro del tribunal calificador de la oposición a Agente de Policía Local del Ayuntamiento de Cieza (Murcia), convocatoria BORM n.º 140 de 20/06/2026.

PRUEBA: examen escrito de desarrollo de un tema del Anexo I. Puntuación de 0 a 5,00 puntos; hace falta un mínimo de 2,50 para superarla. Tiempo máximo: 1 h 30 min.
TEMA DESARROLLADO: Tema ${tema} — ${t?t.t:''}
TIEMPO INVERTIDO POR EL OPOSITOR: ${fmtMins(mins)}

Criterios de calificación de las bases:
1. Conocimiento del tema.
2. Calidad del contenido (exactitud, referencias normativas, amplitud y profundidad).
3. Claridad y estructuración (orden, epígrafes, introducción y conclusión).
4. Corrección ortográfica y gramatical.
5. Expresión escrita (redacción, precisión del lenguaje jurídico).

A continuación tienes el INFORME DE CORRECCIÓN que otra IA ha elaborado tras analizar las fotos del examen manuscrito. No ves el examen: basa tu evaluación exclusivamente en lo que el informe describe (aciertos, omisiones, errores, faltas de ortografía, estructura…). Si el informe trae una nota en otra escala (por ejemplo /10), tenla en cuenta pero ajústala con criterio de tribunal a la escala 0-5. Sé exigente y realista, como un tribunal de oposición.

Asigna a cada criterio una puntuación de 0 a 1,00 (con dos decimales); la nota final es la suma de los 5 criterios (0 a 5,00).

Responde SOLO con un JSON con esta forma exacta:
{"criterios":{"conocimiento":{"p":0.00,"com":"…"},"contenido":{"p":0.00,"com":"…"},"estructura":{"p":0.00,"com":"…"},"ortografia":{"p":0.00,"com":"…"},"expresion":{"p":0.00,"com":"…"}},
 "nota":0.00,
 "notaInforme":"nota que traía el informe, tal cual, o null",
 "resumen":"2-4 frases con la valoración global del tribunal",
 "mejoras":["3 acciones concretas para subir nota en este tema"],
 "debiles":["2-4 puntos débiles cortos (máx. 15 palabras) para anotar en el tema"]}
Cada "com" en una frase corta. Todo en español.

INFORME DE CORRECCIÓN:
"""
${informe}
"""`;
}
async function simEvaluate(tema,mins,informe){
  const txt=await aiText(simPrompt(tema,mins,informe));
  const d=parseJSONLoose(txt);
  if(!d||typeof d!=='object')throw {msg:'La IA no devolvió una evaluación legible. Vuelve a intentarlo o prueba otro modelo.'};
  const num=v=>{const n=typeof v==='number'?v:parseFloat(String(v??'').replace(',','.'));return isFinite(n)?n:null;};
  const crit={};let sum=0,nc=0;
  SIM_CRITERIOS.forEach(([k])=>{
    const c=d.criterios&&d.criterios[k]||{};const p=num(c.p);
    crit[k]={p:p==null?null:Math.max(0,Math.min(1,Math.round(p*100)/100)),com:String(c.com||'').slice(0,400)};
    if(crit[k].p!=null){sum+=crit[k].p;nc++;}
  });
  let nota=num(d.nota);
  if(nota==null&&nc===5)nota=sum;
  if(nota==null)throw {msg:'La IA no asignó ninguna nota. Vuelve a intentarlo.'};
  nota=Math.round(Math.max(0,Math.min(5,nota))*100)/100;
  const arr=v=>Array.isArray(v)?v.map(s=>String(s||'').trim()).filter(Boolean).slice(0,6).map(s=>s.slice(0,300)):[];
  return {nota,ia:{crit,resumen:String(d.resumen||'').slice(0,2000),mejoras:arr(d.mejoras),debiles:arr(d.debiles),
    notaInforme:d.notaInforme==null||d.notaInforme==='null'?'':String(d.notaInforme).slice(0,60),model:S.ai.model,at:new Date().toISOString()}};
}

// ---------- ficha del simulacro ----------
let simCur=null;
function openSimDetail(id){
  const x=S.sims.find(y=>y.id===id);if(!x)return;simCur=id;
  const T=SIM_TIPOS[x.tipo],p=simPass(x);
  $('simd-title').textContent=`${T.ic} ${T.l} · ${simFD(x.date)}`;
  let h=`<div class="sim-prev-n" style="color:${simColor(x.tipo,x.nota)}">${fmtN(x.nota)} <span>/ ${fmtN(T.max)}</span>${p==null?' <span class="badge b0">no eliminatorio</span>':p?' <span class="badge b3">Aprobado</span>':' <span class="badge bno">No apto (mín. 2,50)</span>'}</div>`;
  if(x.tipo!=='escrito'){
    const r=simScore(x.tipo,x.a,x.f,x.b);
    h+=`<div class="sim-kv"><div><span>Aciertos</span><strong style="color:var(--ok)">${x.a}</strong></div><div><span>Fallos</span><strong style="color:var(--danger)">${x.f}</strong></div><div><span>En blanco</span><strong>${x.b}</strong></div><div><span>Penalización</span><strong>−${fmtN(r.pen)}</strong></div></div>
      <div class="muted">${r.n} preguntas · ${fmtN(r.valor,3)} por acierto · −${fmtN(T.pen)} por fallo. Sin fallos habrías sacado ${fmtN(Math.min(T.max,r.bruto))}.</div>`;
  }else{
    const t=TEMAS.find(y=>y.n===x.tema);
    h+=`<div class="muted" style="margin-bottom:10px"><strong>Tema ${x.tema}</strong> — ${esc(t?t.t:'')}<br>Tiempo: ${fmtMins(x.mins)} de 1 h 30 min</div>`;
    const ia=x.ia;
    if(ia){
      h+=`<div class="sim-crit">${SIM_CRITERIOS.map(([k,l])=>{const c=ia.crit&&ia.crit[k]||{};const v=c.p;
        return `<div class="sim-crit-row"><div class="sim-crit-h"><span>${esc(l)}</span><strong>${fmtN(v)}<span class="muted"> / 1</span></strong></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${v==null?0:Math.round(v*100)}%;background:${v==null?'var(--fg-3)':v>=0.6?'var(--ok)':v>=0.4?'var(--warn)':'var(--danger)'}"></div></div>
          ${c.com?`<div class="muted">${esc(c.com)}</div>`:''}</div>`;}).join('')}</div>`;
      if(ia.resumen)h+=`<div class="sim-box"><strong>Valoración del tribunal (IA)</strong><div class="sim-md">${fmtMsg(ia.resumen)}</div></div>`;
      if(ia.mejoras&&ia.mejoras.length)h+=`<div class="sim-box"><strong>Cómo mejorar</strong><ul>${ia.mejoras.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>`;
      if(ia.debiles&&ia.debiles.length)h+=`<div class="sim-box"><strong>Puntos débiles detectados</strong><ul>${ia.debiles.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>
        <button class="btn btn-ghost btn-sm" onclick="simToWeak()">⚠ Añadir a los puntos débiles del tema ${x.tema}</button></div>`;
      h+=`<div class="muted" style="font-size:11px">${ia.notaInforme?`Nota que traía el informe: ${esc(ia.notaInforme)} · `:''}Evaluado con ${esc(ia.model||'Gemini')}${x.manual?' · nota ajustada a mano':''}</div>`;
    }else h+='<div class="alert alert-warn">Este escrito no tiene evaluación de la IA.</div>';
    h+=`<details class="sim-inf"><summary>📄 Informe de corrección (${(x.informe||'').split(/\s+/).filter(Boolean).length} palabras)</summary><div class="sim-md">${fmtMsg(x.informe||'')}</div></details>`;
  }
  if(x.obs)h+=`<div class="sim-box"><strong>Observaciones</strong><div>${esc(x.obs).replace(/\n/g,'<br>')}</div></div>`;
  $('simd-body').innerHTML=h;
  $('simd-es').hidden=x.tipo!=='escrito';$('simd-man').hidden=true;
  $('modal-simd').style.display='flex';
}
function simEditCur(){const id=simCur;closeM('modal-simd');openSim(null,id);}
function simDelCur(){
  const b=$('simd-del');
  if(b.dataset.c!=='1'){b.dataset.c='1';b.textContent='¿Seguro? Pulsa otra vez';setTimeout(()=>{b.dataset.c='';b.textContent='🗑 Eliminar';},3000);return;}
  b.dataset.c='';b.textContent='🗑 Eliminar';
  S.sims=S.sims.filter(y=>y.id!==simCur);saveS();closeM('modal-simd');renderSims();toast('Simulacro eliminado.');
}
async function simReevalCur(){
  const x=S.sims.find(y=>y.id===simCur);if(!x||simBusy)return;
  if(!S.ai.key){openSettings();return;}
  const b=$('simd-reeval');simBusy=true;b.disabled=true;b.textContent='⏳ Evaluando…';
  try{const ev=await simEvaluate(x.tema,x.mins,x.informe);x.nota=ev.nota;x.ia=ev.ia;delete x.manual;saveS();openSimDetail(x.id);if($('p-sims').classList.contains('active'))renderSims();toast(`✓ Nueva nota: ${fmtN(x.nota)} / 5`);}
  catch(e){toast(e&&e.msg?e.msg:'No se pudo evaluar.',6000);}
  finally{simBusy=false;b.disabled=false;b.textContent='✨ Reevaluar';}
}
function simManualCur(){
  const box=$('simd-man');box.hidden=!box.hidden;
  if(!box.hidden){const x=S.sims.find(y=>y.id===simCur);$('simd-man-v').value=x&&x.nota!=null?x.nota:'';$('simd-man-v').focus();}
}
function simManualSave(){
  const x=S.sims.find(y=>y.id===simCur);if(!x)return;
  const n=parseFloat(String($('simd-man-v').value).replace(',','.'));
  if(!isFinite(n)||n<0||n>5){toast('La nota debe estar entre 0 y 5.');return;}
  x.nota=Math.round(n*100)/100;x.manual=true;saveS();openSimDetail(x.id);renderSims();toast('✓ Nota ajustada.');
}
function simToWeak(){
  const x=S.sims.find(y=>y.id===simCur);if(!x||!x.ia)return;
  const d=td(x.tema),have=new Set(d.weak.map(w=>w.text.toLowerCase()));
  let n=0;(x.ia.debiles||[]).forEach(t=>{if(!have.has(t.toLowerCase())){d.weak.push({id:uid(),text:t.slice(0,200),done:false});n++;}});
  saveS();toast(n?`✓ ${n} punto${n===1?'':'s'} débil${n===1?'':'es'} añadido${n===1?'':'s'} al tema ${x.tema}`:'Ya estaban anotados.');
}
