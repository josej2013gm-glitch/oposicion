// ============================================================
// TEMAS: estados, confianza, repetición espaciada, notas y recursos
// ============================================================
const gOpen={I:true,II:false,III:false};
const openNote=new Set(), openRes=new Set(), openRate=new Set();

function isDue(n){const r=td(n).r;return !!(r&&pd(r)<=todayD());}
function dueRepasos(days){
  const lim=addDays(todayD(),days||0);
  return TEMAS.filter(t=>{const r=td(t.n).r;return r&&pd(r)<=lim;}).sort((a,b)=>td(a.n).r.localeCompare(td(b.n).r)||a.n-b.n);
}
function fmtDM(s){const d=pd(String(s).slice(0,10));return d.toLocaleDateString('es-ES',{day:'numeric',month:'short'});}
function safeUrl(u){
  u=String(u||'').trim();if(!u)return null;
  if(!/^https?:\/\//i.test(u))u='https://'+u;
  try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:null;}catch(e){return null;}
}
function fmtSize(b){return b>=1048576?(b/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(b/1024))+' KB';}
function resCount(n){const d=td(n);return d.links.length+d.docs.length+d.weak.filter(w=>!w.done).length;}

function renderTemas(){
  const fE=$('f-estado').value;
  const fG=$('f-grupo').value;
  const fS=$('f-search').value.toLowerCase();
  const cont=$('temas-cont');
  let html='';
  ['I','II','III'].forEach(g=>{
    if(fG&&fG!==g)return;
    const gTemas=TEMAS.filter(t=>t.g===g);
    const filtered=gTemas.filter(t=>{
      const d=td(t.n);
      if(fE==='due'){if(!isDue(t.n))return false;}
      else if(fE==='weak'){if(!d.weak.some(w=>!w.done))return false;}
      else if(fE==='low'){if(!(d.conf>0&&d.conf<=2))return false;}
      else if(fE!==''&&d.e.toString()!==fE)return false;
      if(fS&&!t.t.toLowerCase().includes(fS)&&!('tema '+t.n).includes(fS))return false;
      return true;
    });
    const filtering=fE||fS;
    if(!filtered.length&&filtering)return;
    const con=gTemas.filter(t=>td(t.n).e===3).length;
    const open=gOpen[g]||(filtering&&filtered.length);
    html+=`<div class="grupo-card">
      <div class="grupo-header" onclick="togG('${g}')">
        <span class="grupo-badge">${GRUPOS[g].label}</span>
        <div style="flex:1;min-width:0">
          <div class="grupo-name">${GRUPOS[g].name}</div>
          <div style="font-size:11px;color:var(--fg-3)">${GRUPOS[g].rng}</div>
        </div>
        <span class="grupo-meta">${con}/${gTemas.length} consol.</span>
        <span class="grupo-chev${open?' open':''}" id="chev-${g}">▶</span>
      </div>
      <div class="grupo-body${open?' open':''}" id="gb-${g}">
        ${(filtering?filtered:gTemas).map(temaRow).join('')}
      </div>
    </div>`;
  });
  cont.innerHTML=html||'<div style="color:var(--fg-3);font-size:13px;padding:16px 0">Sin resultados con estos filtros.</div>';
}

function temaRow(t){
  const d=td(t.n),n=t.n,due=isDue(n);
  const rc=resCount(n);
  const rep=d.r?`🔄 Próx. repaso: ${esc(pd(d.r).toLocaleDateString('es-ES'))}${due?' · <strong style="color:var(--warn)">vencido</strong>':''}`:'';
  const hist=d.reps?`${d.reps} repaso${d.reps>1?'s':''} · último ${esc(fmtDM(d.last))}`:'Sin repasos todavía';
  const noteOpen=!!d.note||openNote.has(n);
  return `<div class="tema-row" id="tr-${n}">
    <span class="tema-num">${n}</span>
    <div class="tema-body">
      <div class="tema-title">${esc(t.t)}</div>
      <div class="tema-meta">
        <select class="tema-sel" onchange="upTema(${n},this.value)" aria-label="Estado">
          ${ESTADOS.map((e,i)=>`<option value="${i}"${d.e===i?' selected':''}>${e}</option>`).join('')}
        </select>
        <span class="badge b${d.e}">${ESTADOS[d.e]}</span>
        <select class="tema-sel" onchange="setConf(${n},this.value)" aria-label="Confianza" title="Confianza en el tema">
          ${CONF_LBL.map((l,i)=>`<option value="${i}"${d.conf===i?' selected':''}>${i?'★'.repeat(i)+' '+l.split(' · ')[1]:'Confianza: —'}</option>`).join('')}
        </select>
      </div>
      <div class="tema-meta" style="margin-top:6px">
        <span class="tema-repaso-info">${hist}${rep?' · '+rep:''}</span>
      </div>
      <div class="tema-meta" style="margin-top:6px">
        ${d.e>0?`<button class="btn btn-ghost btn-sm" onclick="togRate(${n})">✓ Repasado</button>`:''}
        <button class="nota-btn" onclick="togNote(${n})">📝 Notas</button>
        <button class="nota-btn" onclick="togRes(${n})">📎 Recursos${rc?' ('+rc+')':''}</button>
        <button class="nota-btn" onclick="openTutorTema(${n})">🎓 Tutor</button>
        <button class="nota-btn" onclick="openAddEventTema(${n})">＋ Sesión</button>
      </div>
      ${openRate.has(n)?`<div class="rate-panel"><span>¿Cómo te ha salido el repaso?</span>
        <button class="btn btn-ghost btn-sm" onclick="doRepaso(${n},'flojo')">😕 Flojo</button>
        <button class="btn btn-ghost btn-sm" onclick="doRepaso(${n},'normal')">🙂 Normal</button>
        <button class="btn btn-ghost btn-sm" onclick="doRepaso(${n},'bien')">💪 Bien</button></div>`:''}
      <textarea class="tema-nota${noteOpen?' open':''}" id="note-${n}"
        placeholder="Apuntes y notas sobre este tema…"
        onblur="saveNote(${n},this.value)">${esc(d.note||'')}</textarea>
      ${openRes.has(n)?resHTML(n):''}
    </div>
  </div>`;
}
function rerenderTema(n){
  const row=$('tr-'+n),t=TEMAS.find(x=>x.n===n);
  if(row&&t)row.outerHTML=temaRow(t);
}

function togG(g){
  gOpen[g]=!gOpen[g];
  $('gb-'+g)?.classList.toggle('open',gOpen[g]);
  $('chev-'+g)?.classList.toggle('open',gOpen[g]);
}
function expandAll(){
  ['I','II','III'].forEach(g=>{gOpen[g]=true;$('gb-'+g)?.classList.add('open');$('chev-'+g)?.classList.add('open');});
}

// --- estado, confianza, notas ---
function upTema(n,v){
  const d=td(n);d.e=parseInt(v,10);
  if(d.e>0){d.iv=REPASO_DIAS[d.e];d.r=ymd(addDays(todayD(),d.iv));}
  else{d.r=null;d.iv=0;}
  saveS();refreshViews();
}
function setConf(n,v){td(n).conf=parseInt(v,10)||0;saveS();rerenderTema(n);}
function togNote(n){
  const el=$('note-'+n);if(!el)return;
  el.classList.toggle('open');
  if(el.classList.contains('open')){openNote.add(n);el.focus();}else openNote.delete(n);
}
function saveNote(n,v){const d=td(n);if(d.note!==v){d.note=v;saveS();}}
function togRes(n){openRes.has(n)?openRes.delete(n):openRes.add(n);rerenderTema(n);}
function togRate(n){openRate.has(n)?openRate.delete(n):openRate.add(n);
  if($('tr-'+n))rerenderTema(n);else refreshViews();}

// --- repetición espaciada ---
// El intervalo se acorta si el repaso sale flojo y se alarga si sale bien.
function doRepaso(n,rt){
  const d=td(n);
  const iv0=d.iv||REPASO_DIAS[Math.max(1,d.e)]||7;
  let iv;
  if(rt==='flojo')iv=Math.max(1,Math.min(2,Math.round(iv0*0.3)));
  else if(rt==='normal')iv=Math.max(3,Math.round(iv0*1.7));
  else iv=Math.max(5,Math.round(iv0*2.5));
  iv=Math.min(iv,120);
  const hoy=todayD();
  let r=addDays(hoy,iv);
  if(S.exam.date&&pd(S.exam.date)>hoy){
    const lim=addDays(pd(S.exam.date),-1);
    if(r>lim){r=lim>hoy?lim:addDays(hoy,1);iv=Math.max(1,Math.round((r-hoy)/864e5));}
  }
  d.iv=iv;d.r=ymd(r);d.last=ymd(hoy);d.reps=(d.reps||0)+1;
  if(!d.conf)d.conf=rt==='flojo'?2:rt==='normal'?3:4;
  else if(rt==='flojo')d.conf=Math.max(1,d.conf-1);
  else if(rt==='bien')d.conf=Math.min(5,d.conf+1);
  d.h=(d.h||[]).concat({d:ymd(hoy),rt}).slice(-40);
  openRate.delete(n);
  saveS();refreshViews();
  toast(`Tema ${n}: próximo repaso en ${iv} día${iv>1?'s':''} (${fmtDM(d.r)})`);
}

// --- recursos: enlaces, puntos débiles, documentos ---
function resHTML(n){
  const d=td(n);
  const links=d.links.map(l=>`<div class="res-item"><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">🔗 ${esc(l.title||l.url)}</a><button class="ev-del" onclick="delLink(${n},'${l.id}')" title="Quitar">✕</button></div>`).join('')||'<div class="muted" style="font-size:12px">Sin enlaces.</div>';
  const weak=d.weak.map(w=>`<div class="res-item${w.done?' done':''}"><label><input type="checkbox" ${w.done?'checked':''} onchange="togWeak(${n},'${w.id}')"> <span>${esc(w.text)}</span></label><button class="ev-del" onclick="delWeak(${n},'${w.id}')" title="Quitar">✕</button></div>`).join('')||'<div class="muted" style="font-size:12px">Anota aquí lo que se te resiste: la IA lo tendrá en cuenta al planificar.</div>';
  const docs=d.docs.map(f=>`<div class="res-item"><a href="#" onclick="openDoc(${n},'${f.id}');return false">📄 ${esc(f.name)}</a><span class="res-meta">${fmtSize(f.size||0)} · ${esc(fmtDM(f.at))}</span><button class="ev-del" onclick="delDoc(${n},'${f.id}')" title="Eliminar">✕</button></div>`).join('')||'<div class="muted" style="font-size:12px">Sin documentos adjuntos.</div>';
  return `<div class="res-panel">
    <div class="res-sec"><div class="res-h">🔗 Enlaces (BOE, apuntes, vídeos…)</div>${links}
      <div class="res-add"><input type="text" id="lk-t-${n}" placeholder="Título (opcional)"><input type="text" id="lk-u-${n}" placeholder="https://…" onkeydown="if(event.key==='Enter')addLink(${n})"><button class="btn btn-ghost btn-sm" onclick="addLink(${n})">Añadir</button></div></div>
    <div class="res-sec"><div class="res-h">⚠️ Puntos débiles</div>${weak}
      <div class="res-add"><input type="text" id="wk-${n}" placeholder="Ej.: plazos del procedimiento sancionador" onkeydown="if(event.key==='Enter')addWeak(${n})"><button class="btn btn-ghost btn-sm" onclick="addWeak(${n})">Añadir</button></div></div>
    <div class="res-sec"><div class="res-h">📎 Documentos</div>${docs}
      <div class="res-add"><input type="file" id="fl-${n}" multiple hidden onchange="uploadDocs(${n},this)"><button class="btn btn-ghost btn-sm" onclick="$('fl-${n}').click()">＋ Adjuntar documentos</button><span class="res-meta" id="up-${n}">PDF, Word, imágenes… (máx. 5 MB)</span></div></div>
    <div class="res-meta">Último repaso: ${d.last?esc(pd(d.last).toLocaleDateString('es-ES')):'—'} · Repasos: ${d.reps||0}</div>
  </div>`;
}
function addLink(n){
  const u=safeUrl($('lk-u-'+n).value);
  if(!u){toast('Introduce un enlace válido (http/https).');return;}
  td(n).links.push({id:uid(),title:$('lk-t-'+n).value.trim().slice(0,120),url:u});
  saveS();rerenderTema(n);
}
function delLink(n,id){const d=td(n);d.links=d.links.filter(x=>x.id!==id);saveS();rerenderTema(n);}
function addWeak(n){
  const v=$('wk-'+n).value.trim();if(!v)return;
  td(n).weak.push({id:uid(),text:v.slice(0,200),done:false});saveS();rerenderTema(n);
}
function togWeak(n,id){const w=td(n).weak.find(x=>x.id===id);if(w){w.done=!w.done;saveS();rerenderTema(n);}}
function delWeak(n,id){const d=td(n);d.weak=d.weak.filter(x=>x.id!==id);saveS();rerenderTema(n);}

function upErrText(e){
  const c=e&&e.code||'';
  if(c==='permission-denied'||c==='files/unauthenticated')return 'Firestore no permite guardar el archivo: revisa que las reglas de firestore.rules estén publicadas.';
  if(c==='files/not-found')return 'El archivo no se encuentra (puede estar a medio subir o borrado).';
  if(c==='resource-exhausted')return 'Se ha superado la cuota diaria gratuita de Firestore. Inténtalo mañana.';
  return 'No se pudo completar ('+(c||e&&e.message||'error')+').';
}
const DOC_MAX=5*1024*1024;
async function uploadDocs(n,inp){
  const files=[...inp.files];inp.value='';if(!files.length)return;
  const st=$('up-'+n);
  if(typeof window.cloudUpload!=='function'){st.textContent='La subida no está disponible todavía.';return;}
  if(!navigator.onLine){st.textContent='Sin conexión: los documentos solo se pueden subir con internet.';return;}
  for(const f of files){
    if(f.size>DOC_MAX){st.textContent=`«${f.name}» supera los 5 MB (límite del plan gratuito). Comprímelo o guárdalo en Drive y añade el enlace.`;continue;}
    try{
      st.textContent=`Subiendo «${f.name}»… 0 %`;
      const r=await window.cloudUpload(f,n,p=>{st.textContent=`Subiendo «${f.name}»… ${Math.round(p*100)} %`;});
      td(n).docs.push({id:uid(),name:f.name,path:r.path,size:r.size,type:r.type,at:ymd(new Date())});
      saveS();
    }catch(e){console.error(e);st.textContent='✕ '+upErrText(e);return;}
  }
  openRes.add(n);rerenderTema(n);
}
async function openDoc(n,id){
  const f=td(n).docs.find(x=>x.id===id);if(!f)return;
  if(typeof window.cloudFileUrl!=='function')return;
  const w=window.open('','_blank');
  try{
    const u=await window.cloudFileUrl(f.path,f.type);
    if(w)w.location.href=u;else location.href=u;
  }catch(e){if(w)w.close();toast('✕ '+upErrText(e),6000);}
}
async function delDoc(n,id){
  const d=td(n),f=d.docs.find(x=>x.id===id);if(!f)return;
  if(!confirm(`¿Eliminar «${f.name}»? Se borrará también de la nube.`))return;
  try{await window.cloudDeleteFile(f.path);}
  catch(e){if(!(e&&e.code==='files/not-found')){toast('✕ '+upErrText(e),6000);return;}}
  d.docs=d.docs.filter(x=>x.id!==id);saveS();rerenderTema(n);
}
