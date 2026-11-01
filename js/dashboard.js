// ============================================================
// DASHBOARD: Hoy, cuenta atrás, fechas clave, repasos, progreso
// ============================================================
function renderDash(){
  renderHoy();renderLegis();renderCountdown();renderStatTiles();
  renderRepasoList();renderGroupProg();renderUpcoming();
}

function rateBtns(n){
  return `<span class="rate-inline"><button class="rate-btn" title="Flojo" onclick="doRepaso(${n},'flojo')">😕</button><button class="rate-btn" title="Normal" onclick="doRepaso(${n},'normal')">🙂</button><button class="rate-btn" title="Bien" onclick="doRepaso(${n},'bien')">💪</button></span>`;
}

// --- Hoy (+ revisión semanal los domingos) ---
function renderHoy(){
  const t=todayD(),ds=ymd(t);
  const evs=S.events.filter(e=>e.date===ds).sort((a,b)=>a.s.localeCompare(b.s));
  const due=dueRepasos(0);
  const pend=pastUnmarked().length;
  const hTot=evs.reduce((a,e)=>a+hrs(e),0);
  let html='';
  if(t.getDay()===0)html+=weekReviewHTML(mondayOf(t));
  html+=`<div class="card hoy-card"><div class="plan-head"><div>
      <div class="plan-title">☀️ Hoy · ${esc(cap(t.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})))}</div>
      <div class="plan-sub">${evs.length?`${evs.length} tarea${evs.length>1?'s':''} · ${fmtH(hTot)} planificadas`:'Sin tareas planificadas para hoy'}${due.length?` · ${due.length} repaso${due.length>1?'s':''} vencido${due.length>1?'s':''}`:''}</div></div>
      <div class="hoy-btns"><button class="btn btn-primary btn-sm" onclick="tmStartFree()">▶ Sesión libre</button><button class="btn btn-ghost btn-sm" onclick="openAddEvent()">+ Tarea</button></div></div>`;
  if(pend)html+=`<div class="alert alert-warn">Tienes <strong>${pend}</strong> tarea${pend>1?'s':''} pasada${pend>1?'s':''} sin marcar. <button class="link" onclick="goPending()">Márcalas</button> para que el planificador las tenga en cuenta.</div>`;
  html+=evs.length?evs.map(taskRow).join(''):`<div class="muted" style="margin-bottom:10px">Nada para hoy. Usa el <button class="link-plain" onclick="nav('plan')">Planificador</button> o añade una tarea.</div>`;
  if(due.length){
    html+=`<div class="day-hdr">🔄 Repasos vencidos</div>`+due.slice(0,6).map(t=>{
      const d=td(t.n);
      return `<div class="repaso-row"><span class="rn">T${t.n}</span><span class="rt">${esc(t.t.split(':')[0])}</span><span class="badge b${d.e}">${ESTADOS[d.e]}</span>${rateBtns(t.n)}</div>`;
    }).join('')+(due.length>6?`<div class="muted" style="margin-top:6px">+${due.length-6} más · <button class="link-plain" onclick="verVencidos()">verlos en Temas</button></div>`:'');
  }
  html+='</div>';
  $('hoy-card').innerHTML=html;
}
function verVencidos(){nav('temas');$('f-estado').value='due';renderTemas();}

function weekReviewHTML(ws){
  const we=addDays(ws,6),evs=eventsIn(ws,we),c=stats(evs);
  const plan=evs.reduce((a,e)=>a+hrs(e),0),real=evs.reduce((a,e)=>a+effHours(e),0);
  const t=todayD();
  const open=evs.filter(e=>e.status==='no'||e.status==='partial'||(!e.status&&pd(e.date)<=t)).sort((a,b)=>a.date.localeCompare(b.date));
  const nextHas=eventsIn(addDays(ws,7),addDays(ws,13)).length;
  return `<div class="card review-card"><div class="plan-head"><div>
    <div class="plan-title">📋 Revisión de la semana</div>
    <div class="plan-sub">Del ${esc(ws.toLocaleDateString('es-ES',{day:'numeric',month:'long'}))} al ${esc(we.toLocaleDateString('es-ES',{day:'numeric',month:'long'}))}</div></div>
    <button class="btn btn-primary btn-sm" onclick="goPlan(1)">✨ ${nextHas?'Revisar':'Planificar'} la próxima semana</button></div>
    <div class="rec-chips" style="margin-bottom:10px"><span class="badge b3">✓ ${c.done} completadas</span><span class="badge b1">½ ${c.partial} parciales</span><span class="badge bno">✕ ${c.no} no hechas</span><span class="badge b0">${c.none} sin marcar</span><span class="badge b2">${fmtH(real)} reales de ${fmtH(plan)}</span></div>
    ${open.length?`<div class="muted" style="margin-bottom:6px">Quedaron pendientes (${open.length}):</div>`+open.slice(0,6).map(e=>`<div class="rev-item" onclick="openTask('${e.id}')">${TYPE_ICON[e.type]} ${esc(e.title)} <span class="res-meta">${esc(fmtDM(e.date))} · ${e.status?ST_LBL[e.status]:'sin marcar'}</span></div>`).join(''):'<div class="alert alert-ok" style="margin:0">¡Semana cerrada sin tareas pendientes!</div>'}
  </div>`;
}
function goPlan(off){planOff=off;nav('plan');}

// --- Fechas clave y proyección ---
function realRate(){
  const t=todayD(),from=addDays(t,-28);
  const evs=eventsIn(from,t);
  const marked=evs.filter(e=>e.status||e.real!=null);
  const h=evs.reduce((a,e)=>a+effHours(e),0);
  return {perWeek:h/4,hasData:marked.length>=3};
}
function projection(){
  const ex=S.exam;if(!ex.date)return null;
  const t=todayD(),days=Math.round((pd(ex.date)-t)/864e5);
  let need=0;
  TEMAS.forEach(x=>{const e=td(x.n).e;for(let s=e+1;s<=3;s++)need+=HORAS_PASO[s];});
  const avail=ORDER.reduce((a,d)=>a+(+S.avail[d]||0),0);
  const rr=realRate();
  const pace=rr.hasData?rr.perWeek:avail;
  const reserve=days>28?14:days>14?Math.round((days-14)/2):0;
  const weeks=Math.max(0,days-reserve)/7;
  const needWeek=weeks>0?need/weeks:Infinity;
  const toFinish=pace>0?need/pace*7:Infinity;
  const finish=isFinite(toFinish)?addDays(t,Math.ceil(toFinish)):null;
  const margin=finish?Math.round((pd(ex.date)-finish)/864e5):null;
  const phase=days<0?'pasado':days<=14?'final':days<=45?'refuerzo':'cobertura';
  return {days,need,avail,real:rr.perWeek,hasData:rr.hasData,pace,reserve,needWeek,finish,margin,phase};
}
const PHASE_TXT={
  cobertura:'FASE 1 · COBERTURA: lo prioritario es terminar la 1ª vuelta de todos los temas, intercalando repasos espaciados.',
  refuerzo:'FASE 2 · REFUERZO: cerrar la 1ª vuelta que falte, hacer la 2ª vuelta y consolidar con repasos y simulacros de desarrollo.',
  final:'FASE 3 · REPASO FINAL: no empezar temas nuevos salvo que queden sin ver; solo repasos, esquemas, puntos débiles y práctica de desarrollo.',
  pasado:'La fecha del examen ya pasó (actualízala en «Fechas clave»).',
};
function renderCountdown(){
  const el=$('countdown'),ex=S.exam,p=projection();
  if(!p){
    el.innerHTML=`<div class="card"><div class="plan-head" style="margin:0"><div><div class="plan-title">⏳ Fechas clave</div><div class="plan-sub">Fija la fecha del primer ejercicio para ver la cuenta atrás, la proyección de tu ritmo y que la IA planifique hacia atrás.</div></div><button class="btn btn-primary btn-sm" onclick="openFechas()">Fijar fechas</button></div></div>`;
    return;
  }
  const f=d=>d.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
  let verdict;
  if(p.days<0)verdict=`<div class="alert alert-warn" style="margin:0">La fecha del examen ya pasó. <button class="link" onclick="openFechas()">Actualízala</button>.</div>`;
  else if(p.need<=0)verdict=`<div class="alert alert-ok" style="margin:0">Todos los temas están consolidados: ahora toca mantener con repasos y práctica.</div>`;
  else if(p.finish&&p.margin>=0&&p.pace>=p.needWeek*0.95)verdict=`<div class="alert alert-ok" style="margin:0">Al ritmo actual terminas el temario el <strong>${esc(f(p.finish))}</strong>, ${p.margin} día${p.margin===1?'':'s'} antes del examen.</div>`;
  else verdict=`<div class="alert alert-warn" style="margin:0">${p.finish?`Al ritmo actual terminarías el <strong>${esc(f(p.finish))}</strong>${p.margin<0?`, ${-p.margin} día${p.margin===-1?'':'s'} después del examen`:''}.`:'Con tu disponibilidad actual no llegas a cubrir el temario.'} Necesitas unas <strong>${isFinite(p.needWeek)?fmtH(p.needWeek):'—'}/semana</strong>${isFinite(p.needWeek)?` (te faltan ${fmtH(Math.max(0,p.needWeek-p.pace))})`:''}.</div>`;
  const hitos=[...ex.hitos].filter(h=>h.date&&pd(h.date)>=todayD()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  el.innerHTML=`<div class="card"><div class="cd-grid">
    <div class="cd-days"><div class="cd-num">${Math.max(0,p.days)}</div><div class="cd-lbl">${p.days<0?'examen pasado':'días para el 1.er ejercicio'}</div><div class="cd-date">${esc(f(pd(ex.date)))}</div></div>
    <div class="cd-info">
      <div class="cd-met"><span>Estudio nuevo pendiente</span><strong>≈ ${fmtH(p.need)}</strong></div>
      <div class="cd-met"><span>Necesario por semana${p.reserve?` (reservando ${p.reserve} días finales)`:''}</span><strong>${isFinite(p.needWeek)?fmtH(p.needWeek):'—'}</strong></div>
      <div class="cd-met"><span>Tu ritmo (${p.hasData?'real, 4 semanas':'disponibilidad'})</span><strong>${fmtH(p.pace)}</strong></div>
      <div class="cd-met"><span>Fase actual</span><strong>${{cobertura:'Cobertura',refuerzo:'Refuerzo',final:'Repaso final',pasado:'—'}[p.phase]}</strong></div>
    </div></div>
    <div style="margin-top:12px">${verdict}</div>
    ${hitos.length?`<div class="day-hdr">Próximos hitos</div>`+hitos.map(h=>{const dd=Math.round((pd(h.date)-todayD())/864e5);return `<div class="rev-item">📌 ${esc(h.label)} <span class="res-meta">${esc(fmtDM(h.date))} · ${dd===0?'hoy':dd===1?'mañana':'en '+dd+' días'}</span></div>`;}).join(''):''}
    <div class="pv-actions" style="border:none;padding-top:8px;margin-top:4px"><button class="btn btn-ghost btn-sm" onclick="openFechas()">✏️ Editar fechas clave</button></div>
  </div>`;
}
function renderLegis(){
  const ex=S.exam,el=$('legis-alert');
  if(!ex.borm||ex.legisOk){el.innerHTML='';return;}
  const diff=Math.round((pd(ex.borm)-todayD())/864e5);
  const btns=`<button class="link" onclick="legisAsk()">Pedir revisión al tutor</button> · <button class="link" onclick="legisDone()">Marcar como revisado</button>`;
  if(diff<=0)el.innerHTML=`<div class="alert alert-warn">📜 <strong>Revisa la legislación.</strong> La fecha del 1.er ejercicio se publicó en el BORM el ${esc(pd(ex.borm).toLocaleDateString('es-ES'))} y el temario queda actualizado a ese día: comprueba si cambió alguna norma. ${btns}</div>`;
  else if(diff<=14)el.innerHTML=`<div class="alert alert-info">📜 En ${diff} día${diff>1?'s':''} se publica en el BORM la fecha del 1.er ejercicio: el temario se actualizará a ese día. Ve preparando la revisión de cambios legislativos.</div>`;
  else el.innerHTML='';
}
function legisDone(){S.exam.legisOk=true;saveS();renderLegis();}

// --- modal de fechas clave ---
const HITOS_SUG=['Pago de la tasa (17,75 €)','Fin del plazo de solicitudes','Lista provisional de admitidos','Lista definitiva de admitidos','Pruebas físicas','Reconocimiento médico','Examen teórico (1.er ejercicio)'];
let fxH=[];
function openFechas(){
  const ex=S.exam;
  $('fx-date').value=ex.date||'';$('fx-borm').value=ex.borm||'';
  fxH=JSON.parse(JSON.stringify(ex.hitos||[]));
  $('fx-sug').innerHTML=HITOS_SUG.map((s,i)=>`<button class="qp" onclick="fxAddSug(${i})">+ ${esc(s)}</button>`).join('');
  renderHitos();
  $('modal-fx').style.display='flex';
}
function renderHitos(){
  fxH.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  $('fx-hitos').innerHTML=fxH.map(h=>`<div class="res-item"><span style="flex:1;min-width:0">${esc(h.label)}</span><input type="date" value="${esc(h.date||'')}" onchange="fxSetDate('${h.id}',this.value)"><button class="ev-del" onclick="fxDel('${h.id}')" title="Quitar">✕</button></div>`).join('')||'<div class="muted" style="font-size:12px">Sin hitos todavía.</div>';
}
function fxAddSug(i){fxH.push({id:uid(),label:HITOS_SUG[i],date:''});renderHitos();}
function fxAddCustom(){const v=$('fx-new').value.trim();if(!v)return;fxH.push({id:uid(),label:v.slice(0,100),date:''});$('fx-new').value='';renderHitos();}
function fxSetDate(id,v){const h=fxH.find(x=>x.id===id);if(h)h.date=v;}
function fxDel(id){fxH=fxH.filter(x=>x.id!==id);renderHitos();}
function saveFechas(){
  const ex=S.exam,old=ex.borm;
  ex.date=$('fx-date').value||'';ex.borm=$('fx-borm').value||'';
  if(ex.borm!==old)ex.legisOk=false;
  ex.hitos=fxH.filter(h=>h.label);
  saveS();closeM('modal-fx');renderDash();
  if(planOff!==undefined&&$('p-plan').classList.contains('active'))renderPlan();
}

// --- tarjetas clásicas ---
function renderStatTiles(){
  const total=TEMAS.length;
  const cons=TEMAS.filter(t=>td(t.n).e===3).length;
  const started=TEMAS.filter(t=>td(t.n).e>=1).length;
  const rep=TEMAS.filter(t=>isDue(t.n)).length;
  const pct=Math.round(started/total*100);
  const tiles=[
    {l:'Consolidados',v:cons,s:`de ${total} temas`,c:'var(--ok)'},
    {l:'En progreso',v:started,s:`${pct}% del temario`,c:'var(--accent)'},
    {l:'Repasos hoy',v:rep,s:'pendientes',c:'var(--warn)'},
    {l:'Sin empezar',v:total-started,s:'temas restantes',c:'var(--fg-3)'},
  ];
  $('stat-tiles').innerHTML=tiles.map(t=>`
    <div class="stat-tile">
      <div class="stat-label">${t.l}</div>
      <div class="stat-value" style="color:${t.c}">${t.v}</div>
      <div class="stat-sub">${t.s}</div>
    </div>`).join('');
}

function renderRepasoList(){
  const hoy=todayD();
  const list=dueRepasos(7).slice(0,8);
  const el=$('repaso-list');
  if(!list.length){el.innerHTML='<div style="color:var(--fg-3);font-size:13px;padding:6px 0">Sin repasos urgentes esta semana 🎉</div>';return;}
  el.innerHTML=list.map(t=>{
    const d=td(t.n),f=pd(d.r);
    const diff=Math.round((f-hoy)/86400000);
    const fs=diff<0?'⚠️ Vencido':diff===0?'⚠️ Hoy':diff===1?'Mañana':`${f.getDate()}/${f.getMonth()+1}`;
    return `<div class="repaso-row"><span class="rn">T${t.n}</span><span class="rt">${esc(t.t.split(':')[0])}</span><span class="rd">${fs}</span>${diff<=0?rateBtns(t.n):`<span class="badge b${d.e}">${ESTADOS[d.e]}</span>`}</div>`;
  }).join('');
}

function renderGroupProg(){
  $('group-progress').innerHTML=['I','II','III'].map(g=>{
    const ts=TEMAS.filter(t=>t.g===g);
    const con=ts.filter(t=>td(t.n).e===3).length;
    const st=ts.filter(t=>td(t.n).e>=1).length;
    const pct=Math.round(st/ts.length*100);
    return `<div style="margin-bottom:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:600">Grupo ${g}</span>
        <span style="font-size:11px;color:var(--fg-3);font-variant-numeric:tabular-nums">${con}/${ts.length} consol.</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div style="font-size:10px;color:var(--fg-3);margin-top:2px">${pct}% en progreso</div>
    </div>`;
  }).join('');
}

function renderUpcoming(){
  const hoy=todayD();
  const evs=S.events.filter(e=>pd(e.date)>hoy)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.s.localeCompare(b.s)).slice(0,5);
  const el=$('upcoming-evs');
  if(!evs.length){el.innerHTML='<div style="color:var(--fg-3);font-size:13px">Sin más sesiones planificadas. <button class="link-plain" onclick="openAddEvent()">+ Agregar sesión</button></div>';return;}
  el.innerHTML=evs.map(e=>`<div class="event-item ev-click" onclick="openTask('${e.id}')">
      <div class="ev-dot" style="background:${TYPE_COL[e.type]}"></div>
      <div class="ev-info"><div class="ev-title">${TYPE_ICON[e.type]} ${esc(e.title)}</div>
      <div class="ev-sub">${esc(pd(e.date).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}))} · ${esc(e.s)}–${esc(e.e)}</div></div>
    </div>`).join('');
}
