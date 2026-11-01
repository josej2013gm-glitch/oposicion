// ============================================================
// ESTADÍSTICAS: horas, racha, mapa de calor, cumplimiento, temas dudosos
// ============================================================
// Horas efectivas de una tarea: el tiempo real del temporizador si existe;
// si no, las planificadas (completa) o la mitad (parcial).
function effHours(e){
  if(e.type==='fisico')return 0;      // el entrenamiento físico no cuenta como horas de estudio
  if(e.real!=null&&isFinite(e.real))return e.real/60;
  if(e.status==='done')return hrs(e);
  if(e.status==='partial')return hrs(e)/2;
  return 0;
}
function dayHoursMap(){
  const m={};
  S.events.forEach(e=>{const h=effHours(e);if(h>0)m[e.date]=(m[e.date]||0)+h;});
  return m;
}
function reviewDaysSet(){
  const s=new Set();
  TEMAS.forEach(t=>td(t.n).h.forEach(x=>{if(x&&x.d)s.add(x.d);}));
  return s;
}
function countReviews(days){
  const from=ymd(addDays(todayD(),-(days-1)));let n=0;
  TEMAS.forEach(t=>td(t.n).h.forEach(x=>{if(x&&x.d>=from)n++;}));
  return n;
}
function streaks(){
  const days=new Set(Object.keys(dayHoursMap()));
  reviewDaysSet().forEach(d=>days.add(d));
  let cur=0,d=todayD();
  if(!days.has(ymd(d)))d=addDays(d,-1);
  while(days.has(ymd(d))){cur++;d=addDays(d,-1);}
  let best=0,run=0,prev=null;
  [...days].sort().forEach(s=>{
    const dt=pd(s);
    run=(prev&&Math.round((dt-prev)/864e5)===1)?run+1:1;
    if(run>best)best=run;prev=dt;
  });
  return {cur,best};
}
function temaGrupo(n){const t=TEMAS.find(x=>x.n===n);return t?t.g:null;}

function renderStats(){
  const t=todayD(),ws=mondayOf(t),we=addDays(ws,6);
  const wk=eventsIn(ws,we);
  const plan=wk.reduce((a,e)=>a+hrs(e),0),real=wk.reduce((a,e)=>a+effHours(e),0);
  const sk=streaks(),c14=stats(eventsIn(addDays(t,-14),t));
  const r7=countReviews(7),r30=countReviews(30);
  const tiles=[
    {l:'Horas esta semana',v:fmtH(real).replace(' h',''),s:`de ${fmtH(plan)} planificadas`,c:'var(--accent)'},
    {l:'Racha actual',v:sk.cur,s:`mejor racha: ${sk.best} día${sk.best===1?'':'s'}`,c:'var(--ok)'},
    {l:'Cumplimiento 14 d',v:c14.pct==null?'—':c14.pct+'%',s:`${c14.done} completadas · ${c14.no} no hechas`,c:c14.pct==null?'var(--fg-3)':c14.pct>=75?'var(--ok)':c14.pct>=50?'var(--warn)':'var(--danger)'},
    {l:'Repasos hechos',v:r7,s:`últimos 7 días · ${r30} en 30`,c:'var(--info)'},
  ];
  let html=`<div class="stats-row">${tiles.map(x=>`<div class="stat-tile"><div class="stat-label">${x.l}</div><div class="stat-value" style="color:${x.c}">${x.v}</div><div class="stat-sub">${x.s}</div></div>`).join('')}</div>`;
  html+=weekReviewHTML(ws);
  html+=`<div class="two-col" style="margin-top:14px"><div class="card"><div class="card-title">Horas por semana (últimas 10)</div>${barsHTML(ws)}</div>
    <div class="card"><div class="card-title">Cumplimiento por grupo</div>${groupCompHTML()}</div></div>`;
  html+=`<div class="card" style="margin-top:14px"><div class="card-title">Actividad (últimas 26 semanas)</div>${heatHTML(ws)}</div>`;
  html+=`<div class="card" style="margin-top:14px"><div class="card-title">Temas que más se te resisten</div>${doubtfulHTML()}</div>`;
  $('stats-cont').innerHTML=html;
}

function barsHTML(ws){
  const rows=[];
  for(let i=-9;i<=0;i++){
    const s=addDays(ws,7*i),evs=eventsIn(s,addDays(s,6));
    rows.push({s,plan:evs.reduce((a,e)=>a+hrs(e),0),real:evs.reduce((a,e)=>a+effHours(e),0)});
  }
  const max=Math.max(1,...rows.map(r=>Math.max(r.plan,r.real)));
  return `<div class="bars">${rows.map(r=>`<div class="bar-col" title="Semana del ${esc(fmtDM(ymd(r.s)))}: ${esc(fmtH(r.real))} reales / ${esc(fmtH(r.plan))} planificadas">
    <div class="bar-pair"><div class="bar plan" style="height:${Math.round(r.plan/max*100)}%"></div><div class="bar real" style="height:${Math.round(r.real/max*100)}%"></div></div>
    <div class="bar-val">${r.real?fmtH(r.real).replace(' h',''):'·'}</div><div class="bar-lbl">${r.s.getDate()}/${r.s.getMonth()+1}</div></div>`).join('')}</div>
    <div class="cal-legend"><span><i style="background:var(--border-strong)"></i>Planificadas</span><span><i style="background:var(--accent)"></i>Reales</span></div>`;
}

function groupCompHTML(){
  return ['I','II','III'].map(g=>{
    const evs=S.events.filter(e=>e.tema&&temaGrupo(e.tema)===g),c=stats(evs);
    const col=c.pct==null?'var(--fg-3)':c.pct>=75?'var(--ok)':c.pct>=50?'var(--warn)':'var(--danger)';
    return `<div style="margin-bottom:13px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:600">Grupo ${g}</span><span style="font-size:11px;color:var(--fg-3)">${c.pct==null?'sin datos':`${c.done} ✓ · ${c.partial} ½ · ${c.no} ✕`}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${c.pct||0}%;background:${col}"></div></div>
      <div style="font-size:10px;color:var(--fg-3);margin-top:2px">${c.pct==null?'—':c.pct+'% de cumplimiento'}</div></div>`;
  }).join('');
}

function heatHTML(ws){
  const m=dayHoursMap(),rv=reviewDaysSet(),t=todayD();
  const start=addDays(ws,-7*25);let cells='';
  for(let i=0;i<26*7;i++){
    const d=addDays(start,i),s=ymd(d),h=m[s]||0;
    const lv=d>t?"fut":h>=4?4:h>=2.5?3:h>=1?2:(h>0||rv.has(s))?1:0;
    cells+=`<div class="hc lv${lv}" title="${esc(d.toLocaleDateString('es-ES',{day:'numeric',month:'short'}))}: ${esc(fmtH(h))}${rv.has(s)?' + repasos':''}"></div>`;
  }
  return `<div class="heat">${cells}</div><div class="cal-legend"><span>Menos</span><span class="hc lv0"></span><span class="hc lv1"></span><span class="hc lv2"></span><span class="hc lv3"></span><span class="hc lv4"></span><span>Más</span></div>`;
}

function doubtfulHTML(){
  const rows=TEMAS.map(x=>{
    const evs=S.events.filter(e=>e.tema===x.n),no=evs.filter(e=>e.status==='no').length,pa=evs.filter(e=>e.status==='partial').length;
    const d=td(x.n),low=d.conf>0&&d.conf<=2,weak=d.weak.filter(w=>!w.done).length;
    return {x,no,pa,low,weak,score:no*2+pa+(low?2:0)+weak};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
  if(!rows.length)return '<div class="muted">Aún no hay señales: aparecerán cuando marques tareas como parciales o no hechas, valores tu confianza o anotes puntos débiles.</div>';
  return rows.map(r=>`<div class="repaso-row"><span class="rn">T${r.x.n}</span><span class="rt">${esc(r.x.t.split(':')[0])}</span>
    <span class="rec-chips">${r.no?`<span class="badge bno">✕ ${r.no}</span>`:''}${r.pa?`<span class="badge b1">½ ${r.pa}</span>`:''}${r.low?`<span class="badge b1">★ ${td(r.x.n).conf}</span>`:''}${r.weak?`<span class="badge b2">⚠ ${r.weak}</span>`:''}</span>
    <button class="nota-btn" onclick="openTutorTema(${r.x.n})">🎓</button><button class="nota-btn" onclick="openAddEventTema(${r.x.n})">＋</button></div>`).join('');
}
