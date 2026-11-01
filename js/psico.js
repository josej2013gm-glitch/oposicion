// ============================================================
// PSICOTÉCNICOS: batería BAT-POL (30 cuestionarios · 20 preguntas · 4 alternativas)
// Los cuestionarios viven en psico-data.js; en la nube solo se guardan los resultados (S.psico).
// Se pueden hacer desde una tarea del planificador (tipo «psico») o por libre desde el panel.
// ============================================================
const PS_MAX_RUNS = 600;
const PS_MEMO_SECS = 90;
const PS_LETTERS = 'ABCD';
let PS = null;            // cuestionario en curso
let psTick = null;

function psq(id){return PSICO_DATA.find(x=>x.id===id);}
function psName(q){return PSICO_BLOQUES[q.b].n;}
function psTitle(q){return PSICO_BLOQUES[q.b].i+' '+psName(q)+' · Cuestionario '+q.l;}
function psRuns(id){return S.psico.runs.filter(r=>r.q===id);}
function psPct(r){const n=r.ok+r.ko+r.bl;return n?Math.round(100*r.ok/n):0;}
function psFmtT(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function psCol(p){return p>=75?'var(--ok)':p>=50?'var(--warn)':'var(--danger)';}
function psDay(r){return pd(r.d).toLocaleDateString('es-ES',{day:'numeric',month:'short'});}

// último resultado, media y número de intentos de un cuestionario
function psInfo(id){
  const rs=psRuns(id);
  return {n:rs.length,last:rs[rs.length-1]||null,best:rs.reduce((m,r)=>Math.max(m,psPct(r)),0)};
}
// media de los últimos intentos de un bloque (el último intento de cada cuestionario)
function psBlockInfo(b){
  const qs=PSICO_DATA.filter(x=>x.b===b),inf=qs.map(q=>psInfo(q.id));
  const done=inf.filter(i=>i.n>0);
  const avg=done.length?Math.round(done.reduce((a,i)=>a+psPct(i.last),0)/done.length):null;
  return {done:done.length,total:qs.length,avg,runs:inf.reduce((a,i)=>a+i.n,0)};
}
// Cuestionario sugerido: el bloque con menos cuestionarios hechos (y, a igualdad, peor media);
// dentro del bloque, el que no se ha hecho o el más antiguo.
function psicoSuggest(){
  const bl=Object.keys(PSICO_BLOQUES).map(Number).map(b=>({b,...psBlockInfo(b)}));
  bl.sort((x,y)=>(x.done-y.done)||((x.avg??-1)-(y.avg??-1))||(x.b-y.b));
  const b=bl[0].b,qs=PSICO_DATA.filter(x=>x.b===b);
  const unseen=qs.find(q=>psInfo(q.id).n===0);
  let q=unseen;
  if(!q)q=qs.slice().sort((x,y)=>((psInfo(x.id).last.ts||0)-(psInfo(y.id).last.ts||0)))[0];
  const why=unseen?(bl[0].done===0?'Bloque sin practicar':'Cuestionario nuevo del bloque con menos práctica')
    :`Repetir el bloque con peor resultado (${bl[0].avg??0} %)`;
  return {q,why};
}

// ---------------- panel ----------------
function renderPsico(){
  const el=$('psico-cont');if(!el)return;
  const all=PSICO_DATA.map(q=>({q,i:psInfo(q.id)}));
  const done=all.filter(x=>x.i.n>0),runs=S.psico.runs;
  const avg=done.length?Math.round(done.reduce((a,x)=>a+psPct(x.i.last),0)/done.length):null;
  const mins=Math.round(runs.reduce((a,r)=>a+(r.s||0),0)/60);
  const sg=psicoSuggest();
  const tiles=[
    {l:'Cuestionarios hechos',v:`${done.length}/30`,s:`${runs.length} intento${runs.length===1?'':'s'} en total`,c:'var(--accent)'},
    {l:'Resultado medio',v:avg==null?'—':avg+'%',s:'último intento de cada uno',c:avg==null?'var(--fg-3)':psCol(avg)},
    {l:'Tiempo dedicado',v:mins>=60?fmtH(mins/60).replace(' h',''):mins,s:mins>=60?'horas':'minutos',c:'var(--info)'},
    {l:'Sesiones / semana',v:S.psico.perWeek,s:'que pedirá el planificador',c:'var(--ok)'},
  ];
  let h=`<div class="stats-row">${tiles.map(x=>`<div class="stat-tile"><div class="stat-label">${x.l}</div><div class="stat-value" style="color:${x.c}">${x.v}</div><div class="stat-sub">${x.s}</div></div>`).join('')}</div>`;
  h+=`<div class="card ps-suggest"><div><div class="card-title" style="margin-bottom:4px">Sugerido ahora</div>
    <div class="ps-sg-t">${esc(psTitle(sg.q))}</div>
    <div class="muted" style="font-size:12px">${esc(sg.why)} · ${sg.q.p.length} preguntas · ${sg.q.min} min recomendados</div></div>
    <button class="btn btn-primary" onclick="psicoOpen('${sg.q.id}')">▶ Empezar</button></div>`;
  h+=`<div class="ps-cfg"><label for="ps-per">Sesiones de psicotécnicos por semana en el planificador:</label>
    <select id="ps-per" onchange="psicoSetPer(this.value)">${[0,1,2,3,4,5].map(n=>`<option value="${n}"${n===S.psico.perWeek?' selected':''}>${n===0?'Ninguna':n}</option>`).join('')}</select></div>`;
  h+='<div class="ps-grid">'+Object.keys(PSICO_BLOQUES).map(k=>{
    const b=+k,m=PSICO_BLOQUES[k],bi=psBlockInfo(b);
    const btns=PSICO_DATA.filter(x=>x.b===b).map(q=>{
      const i=psInfo(q.id),p=i.last?psPct(i.last):null;
      return `<button class="ps-q" onclick="psicoOpen('${q.id}')" title="${esc(psTitle(q))}${i.n?` · ${i.n} intento${i.n>1?'s':''} · mejor ${i.best} %`:''}">
        <span class="ps-ql">${q.l}</span><span class="ps-qs" style="${p==null?'':'color:'+psCol(p)}">${p==null?'—':i.last.ok+'/'+(i.last.ok+i.last.ko+i.last.bl)}</span><span class="ps-qm">${q.min} min${i.n?` · ×${i.n}`:''}</span></button>`;}).join('');
    return `<div class="card ps-block"><div class="ps-bh"><span class="ps-bi">${m.i}</span><div style="min-width:0"><div class="ps-bn">${esc(m.n)}</div><div class="muted" style="font-size:11px">${esc(m.d)}</div></div>
      <div class="ps-bavg" style="${bi.avg==null?'':'color:'+psCol(bi.avg)}">${bi.avg==null?'—':bi.avg+'%'}</div></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${bi.avg||0}%;background:${bi.avg==null?'var(--fg-3)':psCol(bi.avg)}"></div></div>
      <div class="ps-qs-row">${btns}</div></div>`;}).join('')+'</div>';
  const last=runs.slice(-12).reverse();
  h+=`<div class="card" style="margin-top:14px"><div class="card-title">Últimos intentos</div>`+(last.length?last.map(r=>{
    const q=psq(r.q);if(!q)return '';const p=psPct(r);
    return `<div class="repaso-row"><span class="rn">${esc(r.q)}</span><span class="rt">${esc(PSICO_BLOQUES[q.b].n)} · ${q.l}</span>
      <span class="rec-chips"><span class="badge" style="background:transparent;color:${psCol(p)};border:1px solid ${psCol(p)}">${r.ok}/${r.ok+r.ko+r.bl} · ${p}%</span><span class="badge b0">⏱ ${psFmtT(r.s)}</span><span class="muted" style="font-size:11px">${esc(psDay(r))}</span></span>
      <button class="nota-btn" onclick="psicoReview('${r.id}')">Revisar</button></div>`;}).join(''):'<div class="muted">Todavía no has hecho ningún cuestionario. Empieza por el sugerido.</div>')+'</div>';
  el.innerHTML=h;
}
function psicoSetPer(v){S.psico.perWeek=Math.max(0,Math.min(7,parseInt(v,10)||0));saveS();renderPsico();}

// ---------------- ejecución ----------------
function psicoFromTask(id){
  const e=S.events.find(x=>x.id===id);if(!e)return;
  closeM('modal-task');
  psicoOpen(psicoSuggest().q.id,id);
}
function psicoOpen(qid,taskId){
  const q=psq(qid);if(!q)return;
  if(PS&&PS.phase==='quiz'&&!confirm('Tienes un cuestionario en curso. ¿Abandonarlo y abrir otro?'))return;
  psStopTick();
  PS={q,task:taskId||null,phase:'intro',i:0,ans:Array(q.p.length).fill(-1),t0:0,memoLeft:PS_MEMO_SECS,run:null};
  $('modal-psico').style.display='flex';
  psRender();
}
function psicoClose(force){
  if(PS&&PS.phase==='quiz'&&!force&&!confirm('Si sales ahora se pierde el cuestionario en curso. ¿Salir?'))return;
  psStopTick();PS=null;$('modal-psico').style.display='none';
  refreshViews();
  if($('p-psico').classList.contains('active'))renderPsico();
}
function psStopTick(){if(psTick){clearInterval(psTick);psTick=null;}}
function psBox(h){$('ps-box').innerHTML=h;}

function psRender(){
  if(!PS)return;
  if(PS.phase==='intro')psIntro();else if(PS.phase==='memo')psMemo();else if(PS.phase==='quiz')psQuiz();else psResult();
}
function psIntro(){
  const q=PS.q,inf=psInfo(q.id),e=PS.task?S.events.find(x=>x.id===PS.task):null;
  const opts=PSICO_DATA.map(x=>{const i=psInfo(x.id);return `<option value="${x.id}"${x.id===q.id?' selected':''}>${esc(PSICO_BLOQUES[x.b].n)} · ${x.l}${i.last?' — último '+i.last.ok+'/20':' — sin hacer'}</option>`;}).join('');
  psBox(`<div class="ps-head"><div class="modal-title" style="margin:0">${esc(psTitle(q))}</div><button class="btn btn-ghost btn-sm" onclick="psicoClose()">✕</button></div>
    ${e?`<div class="alert alert-info" style="margin:10px 0">📌 Tarea: <strong>${esc(e.title)}</strong> (${fmtH(hrs(e))} planificadas${e.real?` · ${e.real} min ya hechos`:''})</div>`:''}
    <div class="ps-facts"><div><b>${q.p.length}</b><span>preguntas</span></div><div><b>${q.min} min</b><span>recomendados</span></div><div><b>4</b><span>alternativas</span></div><div><b>${inf.n?inf.last.ok+'/'+q.p.length:'—'}</b><span>último intento</span></div></div>
    <ul class="ps-rules"><li>Hazlo de una sola vez y sin ayudas: el cronómetro empieza al pulsar «Empezar».</li>
      <li>Una sola respuesta correcta. <strong>Sin penalización por error</strong> (las bases no fijan una fórmula): puedes dejar en blanco o arriesgar.</li>
      ${q.ficha?`<li><strong>Atención y memoria:</strong> primero verás una ficha durante ${PS_MEMO_SECS} s. Después se tapa y las preguntas 1-${q.fichaN} se responden de memoria.</li>`:''}
      <li>Teclado: <kbd>A</kbd>-<kbd>D</kbd> o <kbd>1</kbd>-<kbd>4</kbd> para responder, <kbd>←</kbd> <kbd>→</kbd> para moverte.</li></ul>
    <label class="modal-label">Cuestionario</label><select id="ps-sel" class="w-full" onchange="psPick(this.value)">${opts}</select>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="psicoClose()">Cancelar</button><button class="btn btn-primary" onclick="psStart()">▶ Empezar</button></div>`);
}
function psPick(id){const q=psq(id);if(!q)return;PS.q=q;PS.ans=Array(q.p.length).fill(-1);PS.memoLeft=PS_MEMO_SECS;psIntro();}
function psStart(){
  if(PS.q.ficha){PS.phase='memo';PS.memoLeft=PS_MEMO_SECS;psRender();
    psStopTick();psTick=setInterval(()=>{PS.memoLeft--;if(PS.memoLeft<=0)psBegin();else{const t=$('ps-memo-t');if(t)t.textContent=PS.memoLeft+' s';}},1000);}
  else psBegin();
}
function psMemo(){
  psBox(`<div class="ps-head"><div class="modal-title" style="margin:0">${esc(psTitle(PS.q))}</div></div>
    <div class="alert alert-warn" style="margin:12px 0">🧠 Memoriza la ficha. Se taparán sola al llegar a 0 (<strong id="ps-memo-t">${PS.memoLeft} s</strong>).</div>
    <div class="ps-ficha">${esc(PS.q.ficha.replace(/\.\s*$/,'')).split('; ').map(x=>{const i=x.indexOf(':');return i<0?`<div>${x}</div>`:`<div><span>${x.slice(0,i)}</span>${x.slice(i+1)}</div>`;}).join('')}</div>
    <div class="modal-actions"><button class="btn btn-primary" onclick="psBegin()">Ya la tengo, empezar</button></div>`);
}
function psBegin(){
  psStopTick();PS.phase='quiz';PS.t0=Date.now();PS.i=0;psRender();
  psTick=setInterval(psClock,1000);
}
function psElapsed(){return PS&&PS.t0?Math.round((Date.now()-PS.t0)/1000):0;}
function psClock(){
  const t=$('ps-time');if(!t||!PS)return;
  const left=PS.q.min*60-psElapsed();
  t.textContent=left>=0?psFmtT(left):'+'+psFmtT(-left);
  t.classList.toggle('over',left<0);t.classList.toggle('warn',left>=0&&left<=60);
}
function psQuiz(){
  const q=PS.q,i=PS.i,p=q.p[i],last=i===q.p.length-1;
  const m=p.q.match(/^Texto ([A-D])\./),tx=m&&q.textos?q.textos.find(t=>t.i===m[1]):null;
  const memoQ=q.ficha&&i<q.fichaN;
  const answered=PS.ans.filter(a=>a>=0).length;
  psBox(`<div class="ps-top"><div class="ps-tt">${esc(PSICO_BLOQUES[q.b].i)} ${esc(psName(q))} · ${q.l}</div>
      <div class="ps-timer" title="Tiempo restante recomendado"><span id="ps-time" class="ps-time"></span></div></div>
    <div class="ps-prog"><div style="width:${Math.round(answered/q.p.length*100)}%"></div></div>
    <div class="ps-qn">Pregunta ${i+1} de ${q.p.length} <span class="muted">· ${answered} respondida${answered===1?'':'s'}</span></div>
    ${tx?`<div class="ps-text"><b>Texto ${tx.i}.</b> ${esc(tx.t)}</div>`:''}
    ${memoQ?'<div class="ps-memo-hint">🧠 Pregunta sobre la ficha (ya tapada)</div>':''}
    <div class="ps-q-text">${esc(tx?p.q.replace(/^Texto [A-D]\.\s*/,''):p.q)}</div>
    <div class="ps-opts">${p.o.map((o,k)=>`<button class="ps-opt${PS.ans[i]===k?' on':''}" onclick="psAnswer(${k})"><span class="ps-ol">${PS_LETTERS[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>
    <div class="ps-nav"><button class="btn btn-ghost" ${i===0?'disabled':''} onclick="psGo(${i-1})">◀ Anterior</button>
      <button class="btn btn-ghost" onclick="psClear()" ${PS.ans[i]<0?'disabled':''} title="Dejar en blanco">Borrar</button>
      ${last?`<button class="btn btn-primary" onclick="psFinish()">Finalizar ✓</button>`:`<button class="btn btn-primary" onclick="psGo(${i+1})">Siguiente ▶</button>`}</div>
    <div class="ps-map">${q.p.map((_,k)=>`<button class="ps-mp${PS.ans[k]>=0?' a':''}${k===i?' c':''}" onclick="psGo(${k})">${k+1}</button>`).join('')}</div>
    <div style="text-align:right;margin-top:8px"><button class="link-plain" onclick="psFinish()">Finalizar ahora</button> · <button class="link-plain" onclick="psicoClose()" style="color:var(--fg-3)">Abandonar</button></div>`);
  psClock();
}
function psAnswer(k){if(!PS||PS.phase!=='quiz')return;PS.ans[PS.i]=PS.ans[PS.i]===k?-1:k;psQuiz();}
function psClear(){if(!PS||PS.phase!=='quiz')return;PS.ans[PS.i]=-1;psQuiz();}
function psGo(n){if(!PS||PS.phase!=='quiz')return;PS.i=Math.max(0,Math.min(PS.q.p.length-1,n));psQuiz();}
addEventListener('keydown',ev=>{
  if(!PS||PS.phase!=='quiz'||$('modal-psico').style.display!=='flex')return;
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  const k=ev.key.toLowerCase();
  if('abcd'.includes(k)&&k.length===1){psAnswer('abcd'.indexOf(k));ev.preventDefault();}
  else if('1234'.includes(k)&&k.length===1){psAnswer(+k-1);ev.preventDefault();}
  else if(k==='arrowright'||k==='enter'){if(PS.i<PS.q.p.length-1)psGo(PS.i+1);ev.preventDefault();}
  else if(k==='arrowleft'){psGo(PS.i-1);ev.preventDefault();}
});

// ---------------- final y resultados ----------------
function psFinish(){
  if(!PS||PS.phase!=='quiz')return;
  const blanks=PS.ans.filter(a=>a<0).length;
  if(blanks&&!confirm(`Te quedan ${blanks} pregunta${blanks>1?'s':''} sin responder. ¿Finalizar igualmente?`))return;
  psStopTick();
  const q=PS.q,secs=Math.max(1,psElapsed());
  let ok=0,ko=0,bl=0;
  PS.ans.forEach((a,i)=>{if(a<0)bl++;else if(a===q.p[i].c)ok++;else ko++;});
  const run={id:uid(),q:q.id,d:ymd(new Date()),ts:Date.now(),ok,ko,bl,s:secs,a:PS.ans.map(a=>a<0?'-':PS_LETTERS[a].toLowerCase()).join(''),task:PS.task||null};
  S.psico.runs.push(run);
  if(S.psico.runs.length>PS_MAX_RUNS)S.psico.runs=S.psico.runs.slice(-PS_MAX_RUNS);
  PS.run=run;PS.phase='result';PS.review=false;
  psLinkTask(run);
  saveS();refreshViews();
  psRender();
}
// Vincula el intento con la tarea del planificador o crea una sesión libre ya completada
function psLinkTask(run){
  const mins=Math.max(1,Math.round(run.s/60));
  const q=psq(run.q),tag=`${run.q} ${psPct(run)}%`;
  let e=PS.task?S.events.find(x=>x.id===PS.task):null;
  if(e){
    e.real=(e.real||0)+mins;
    e.pq=(e.pq||[]).concat(tag);
    const planned=hrs(e)*60;
    PS.taskInfo={real:e.real,planned,auto:false};
    if(e.status!=='done'&&planned>0&&e.real>=planned*0.8){applyStatus(e.id,'done');PS.taskInfo.auto=true;}
  }else{
    const now=new Date(),end=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    const st=new Date(now.getTime()-run.s*1000),s=String(st.getHours()).padStart(2,'0')+':'+String(st.getMinutes()).padStart(2,'0');
    e={id:uid(),title:'Psicotécnicos · '+psName(q)+' '+q.l,date:ymd(now),type:'psico',s:st.getDate()===now.getDate()?s:'00:00',e:end,tema:null,desc:'',adv:false,src:'psico',status:'done',statusAt:ymd(now),real:mins,pq:[tag]};
    S.events.push(e);run.task=e.id;PS.taskInfo={real:mins,planned:mins,auto:true,free:true};
  }
}
function psicoReview(id){
  const run=S.psico.runs.find(r=>r.id===id);if(!run)return;
  const q=psq(run.q);if(!q)return;
  psStopTick();
  PS={q,task:null,phase:'result',i:0,ans:run.a.split('').map(c=>c==='-'?-1:'abcd'.indexOf(c)),run,review:true};
  $('modal-psico').style.display='flex';psRender();
}
function psResult(){
  const q=PS.q,r=PS.run,n=q.p.length,p=psPct(r);
  const prev=S.psico.runs.slice(0,Math.max(0,S.psico.runs.indexOf(r))).filter(x=>x.q===q.id).pop();
  const diff=prev?p-psPct(prev):null;
  const per=r.s/n,over=r.s-q.min*60;
  const rows=q.p.map((it,i)=>{
    const a=PS.ans[i],okk=a===it.c;
    const st=a<0?['–','blank','En blanco']:okk?['✓','ok','Correcta']:['✕','ko','Incorrecta'];
    const m=it.q.match(/^Texto ([A-D])\./),tx=m&&q.textos?q.textos.find(t=>t.i===m[1]):null;
    return `<details class="ps-row ${st[1]}"><summary><span class="ps-rn">${i+1}</span><span class="ps-ri">${st[0]}</span><span class="ps-rq">${esc(it.q)}</span></summary>
      <div class="ps-rd">${tx?`<div class="ps-text"><b>Texto ${tx.i}.</b> ${esc(tx.t)}</div>`:''}
      ${it.o.map((o,k)=>`<div class="ps-ro${k===it.c?' right':''}${k===a&&!okk?' wrong':''}"><span class="ps-ol">${PS_LETTERS[k]}</span>${esc(o)}${k===it.c?' <b>✓ correcta</b>':''}${k===a&&!okk?' <b>← tu respuesta</b>':''}</div>`).join('')}</div></details>`;
  }).join('');
  const T=PS.taskInfo,e=PS.task?S.events.find(x=>x.id===PS.task):null;
  let taskBox='';
  if(!PS.review&&T){
    if(T.free)taskBox=`<div class="alert alert-info">✓ Se ha registrado como sesión libre de ${T.real} min en tu calendario de hoy.</div>`;
    else taskBox=`<div class="alert ${T.auto?'alert-info':'alert-warn'}">📌 Tarea «${esc(e?e.title:'')}»: llevas <strong>${T.real}</strong> de ${Math.round(T.planned)} min.${T.auto?' Se ha marcado como <strong>completada</strong>.':' Haz otro cuestionario o márcala como hecha cuando termines.'}
      ${T.auto?'':`<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="psTaskDone()">✅ Marcar como hecha</button></div>`}</div>`;
  }
  const sg=psicoSuggest();
  psBox(`<div class="ps-head"><div class="modal-title" style="margin:0">${PS.review?'Revisión':'Resultado'} · ${esc(psTitle(q))}</div><button class="btn btn-ghost btn-sm" onclick="psicoClose(true)">✕</button></div>
    <div class="ps-score" style="color:${psCol(p)}"><b>${r.ok}</b>/${n}<span>${p} %</span></div>
    <div class="ps-facts"><div><b style="color:var(--ok)">${r.ok}</b><span>aciertos</span></div><div><b style="color:var(--danger)">${r.ko}</b><span>errores</span></div><div><b>${r.bl}</b><span>en blanco</span></div><div><b>${psFmtT(r.s)}</b><span>de ${q.min}:00 recomendados</span></div></div>
    <div class="muted" style="font-size:12px;margin:6px 0">${over>0?`Has tardado ${psFmtT(over)} más de lo recomendado. `:`Has terminado ${psFmtT(-over)} antes. `}Media: ${Math.round(per)} s por pregunta.${diff==null?' Es tu primer intento de este cuestionario.':diff>0?` Mejoras ${diff} puntos respecto al intento anterior.`:diff<0?` ${-diff} puntos menos que el intento anterior.`:' Igual que el intento anterior.'}</div>
    ${taskBox}
    <div class="card-title" style="margin:12px 0 6px">Corrección (toca una pregunta para ver el detalle)</div>
    <div class="ps-rows">${rows}</div>
    <div class="modal-actions" style="flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="psicoOpen('${q.id}',${PS.task&&!PS.review?`'${PS.task}'`:'null'})">↻ Repetir</button>
      ${PS.review?'':`<button class="btn btn-ghost" onclick="psicoOpen('${sg.q.id}',${PS.task?`'${PS.task}'`:'null'})">Siguiente sugerido</button>`}
      <button class="btn btn-primary" onclick="psicoClose(true)">Cerrar</button></div>`);
}
function psTaskDone(){
  if(!PS||!PS.task)return;
  applyStatus(PS.task,'done');
  if(PS.taskInfo)PS.taskInfo.auto=true;
  psRender();
}

// ---------------- integración con el planificador ----------------
// Texto para el prompt: objetivo semanal y rendimiento por bloque
function psicoPromptTxt(ws,keep){
  const per=S.psico.perWeek;
  if(!per)return '\nPSICOTÉCNICOS: el opositor no quiere sesiones de psicotécnicos esta temporada. No incluyas tareas de tipo "psico".\n';
  const already=(keep||[]).filter(e=>e.type==='psico').length;
  const doneWeek=S.events.filter(e=>e.type==='psico'&&e.status==='done'&&pd(e.date)>=ws&&pd(e.date)<=addDays(ws,6)).length;
  const rest=Math.max(0,per-Math.max(already,doneWeek));
  const bl=Object.keys(PSICO_BLOQUES).map(k=>{
    const b=+k,i=psBlockInfo(b);
    return `- ${PSICO_BLOQUES[k].n}: ${i.done}/3 cuestionarios hechos${i.avg==null?'':', media '+i.avg+' %'}`;
  }).join('\n');
  return `
PSICOTÉCNICOS (3.er ejercicio, 1.ª parte: 10 aptitudes; cuestionarios de 20 preguntas y 10-18 min cada uno, hay 30 en la web):
Objetivo: ${per} sesión(es) por semana. En este periodo ya hay ${Math.max(already,doneWeek)}; incluye ${rest} tarea(s) de tipo "psico" (sin tema, de 0,75 a 1,5 h, en días distintos y sin pegarlas a otra sesión de psicotécnicos).
La web escogerá el cuestionario concreto (el del bloque menos practicado o con peor resultado); en la descripción solo indica el bloque que conviene.
Situación actual:
${bl}
`;
}
