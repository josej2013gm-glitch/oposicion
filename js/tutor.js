// ============================================================
// TUTOR IA (Google AI Studio / Gemini): integrado con temas, dudas y corrección
// ============================================================
let chatLog=[],tutorTema=null,chatBusy=false;

const TEMA_QP=[
  ['📋 Esquema','Hazme un esquema jerárquico del Tema {n} listo para estudiar: apartados, conceptos clave y los datos que hay que memorizar (plazos, cifras, órganos, artículos).'],
  ['🔑 Puntos clave','¿Cuáles son los puntos clave, artículos, plazos y cifras que más se preguntan del Tema {n}? Dame una lista priorizada.'],
  ['🗣️ Como oral','Explícame el Tema {n} como si lo expusiera oralmente ante un tribunal: introducción, desarrollo con los apartados principales y conclusión, en unos 5 minutos de exposición.'],
  ['🔍 Mis lagunas','Quiero detectar mis lagunas en el Tema {n}. Hazme preguntas de desarrollo corto, UNA cada vez, y espera mi respuesta antes de pasar a la siguiente; al final resume qué debo reforzar.'],
  ['⚖️ Normativa vigente','Indica qué normas regulan el Tema {n}, su redacción vigente más relevante y si ha habido reformas recientes que deba tener en cuenta.'],
];

// ---------- chat ----------
function initChat(){
  chatLog=S.chatLog||[];
  const win=$('chat-win');
  if(!chatLog.length){appendMsg('ai','¡Hola! Soy tu **Tutor Jurídico IA** especializado en la oposición de Agente de Policía Local de Cieza.\n\nPuedo explicarte cualquiera de los 41 temas del temario oficial, resolver dudas sobre legislación penal, administrativa, de tráfico y las ordenanzas municipales de Cieza, **corregir tus desarrollos** y analizar tu ritmo de estudio.\n\nPulsa «🎓 Tutor» en cualquier tema para trabajarlo con contexto. ¿Sobre qué quieres que te explique algo?',false,{welcome:true});}
  else{chatLog.forEach(m=>appendMsg(m.r,m.c,false,{s:m.s}));}
  renderDoubtsCount();
  scrollChat();
}
function appendMsg(role,content,save=true,meta){
  meta=meta||{};
  const win=$('chat-win');
  const div=document.createElement('div');div.className=`chat-msg ${role}`;div._raw=content;
  const av=document.createElement('div');av.className=`chat-av ${role}`;
  av.textContent=role==='ai'?'⚖️':'👤';
  const col=document.createElement('div');col.className='chat-col';
  const bub=document.createElement('div');bub.className='chat-bubble';
  bub.innerHTML=fmtMsg(content);
  col.appendChild(bub);
  if(role==='ai'&&meta.s&&meta.s.length){
    const src=document.createElement('div');src.className='chat-src';
    src.innerHTML='🌐 Fuentes: '+meta.s.slice(0,6).map(x=>`<a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer">${esc(String(x.t).slice(0,40))}</a>`).join(' · ');
    col.appendChild(src);
  }
  if(role==='ai'&&!meta.err&&!meta.welcome){
    const act=document.createElement('div');act.className='msg-actions';
    act.innerHTML='<button onclick="msgToNotes(this)">💾 A las notas</button><button onclick="msgToDoubt(this)">❓ Anotar duda</button><button onclick="msgCopy(this)">📋 Copiar</button>';
    col.appendChild(act);
  }
  div.appendChild(av);div.appendChild(col);win.appendChild(div);
  if(save){const m={r:role,c:content};if(meta.s&&meta.s.length)m.s=meta.s;chatLog.push(m);S.chatLog=chatLog.slice(-40);saveS();}
  scrollChat();return div;
}
function inl(s){
  return s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g,'$1<em>$2</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
}
function fmtMsg(t){
  t=String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t=t.replace(/^#{1,4}\s*(.+)$/gm,'**$1**');
  let out='',mode=null,para=[];
  const flush=()=>{if(para.length){out+='<p>'+para.map(inl).join('<br>')+'</p>';para=[];}};
  const close=()=>{if(mode){out+='</'+mode+'>';mode=null;}};
  t.split('\n').forEach(l=>{
    let m;
    if((m=l.match(/^\s*[-•*]\s+(.*)$/))){flush();if(mode!=='ul'){close();out+='<ul>';mode='ul';}out+='<li>'+inl(m[1])+'</li>';}
    else if((m=l.match(/^\s*\d+[.)]\s+(.*)$/))){flush();if(mode!=='ol'){close();out+='<ol>';mode='ol';}out+='<li>'+inl(m[1])+'</li>';}
    else if(!l.trim()){flush();close();}
    else{close();para.push(l);}
  });
  flush();close();return out;
}
function scrollChat(){const w=$('chat-win');if(w)w.scrollTop=w.scrollHeight;}
function showErr(t){appendMsg('ai',t,false,{err:true});}

function chatKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}
function autoH(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,110)+'px';}
function sendMsg(){
  const inp=$('chat-inp'),txt=inp.value.trim();if(!txt)return;
  if(!S.ai.key){updateApiNotice();openSettings();return;}
  inp.value='';autoH(inp);sendText(txt);
}
function newChat(){
  if(!confirm('¿Empezar una conversación nueva? Se borra el historial del chat (las dudas anotadas se conservan).'))return;
  chatLog=[];S.chatLog=[];saveS();$('chat-win').innerHTML='';initChat();
}

async function sendText(txt){
  if(chatBusy){toast('Espera a que termine la respuesta actual.');return;}
  if(!S.ai.key){updateApiNotice();openSettings();return;}
  chatBusy=true;
  appendMsg('user',txt);
  const win=$('chat-win');
  const dot=document.createElement('div');dot.className='chat-msg ai';
  dot.innerHTML=`<div class="chat-av ai">⚖️</div><div class="chat-col"><div class="chat-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
  win.appendChild(dot);scrollChat();
  const bub=dot.querySelector('.chat-bubble');
  const btn=$('send-btn');btn.disabled=true;btn.innerHTML='<div class="spinner"></div>';
  const hist=chatLog.filter(m=>m.c&&!m.c.startsWith('❌')).slice(-12).map(m=>({role:m.r==='ai'?'assistant':'user',content:m.c}));
  try{
    const r=await callGemini(hist,{key:S.ai.key,model:S.ai.model,sys:buildSysCtx(),search:!!S.ai.search,onText:t=>{bub.innerHTML=fmtMsg(t);scrollChat();}});
    dot.remove();appendMsg('ai',r.text,true,{s:r.sources});
  }catch(e){
    dot.remove();
    showErr('❌ '+(e&&e.blocked?'Sin conexión con Google AI Studio. Comprueba tu conexión a internet e inténtalo de nuevo.':'Error de Google AI Studio ('+S.ai.model+'): '+(e&&e.message||'desconocido')+'\n\nRevisa la API Key y el modelo en ⚙️ Configuración.'));
  }
  chatBusy=false;btn.disabled=false;btn.innerHTML='➤';
}
// Abre el tutor y envía directamente una pregunta
function askTutor(prompt,tema){
  if(!S.ai.key){openSettings();return;}
  if(tema!==undefined)tutorTema=tema;
  nav('tutor');sendText(prompt);
}

// Google AI Studio (Gemini) con respuesta en streaming. La clave va en cabecera, no en la URL.
async function callGemini(turns,o){
  const {key,model,sys,onText,json,search}=o;
  const contents=[];
  turns.forEach(t=>{
    const role=t.role==='assistant'?'model':'user';
    if(!contents.length&&role==='model')return; // Gemini debe empezar con el usuario
    const last=contents[contents.length-1];
    if(last&&last.role===role)last.parts[0].text+='\n\n'+t.content;
    else contents.push({role,parts:[{text:t.content}]});
  });
  const body={contents,generationConfig:json?{temperature:0.6,maxOutputTokens:16384,responseMimeType:'application/json'}:{temperature:0.7,maxOutputTokens:4096}};
  if(sys)body.system_instruction={parts:[{text:sys}]};
  if(search&&!json)body.tools=[{google_search:{}}];
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  let res;
  try{res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});}
  catch(err){const e=new Error('Sin conexión de red');e.blocked=true;throw e;}
  if(!res.ok){const d=await res.json().catch(()=>({}));const m=d.error?.message||d[0]?.error?.message;throw new Error(m||('HTTP '+res.status));}
  let text='',buf='';const sources=[];
  const handle=line=>{
    if(!line.startsWith('data:'))return;
    try{
      const j=JSON.parse(line.slice(5).trim());
      if(j.error)throw new Error(j.error.message);
      const c=j.candidates?.[0];
      const parts=c?.content?.parts||[];
      const add=parts.filter(p=>!p.thought).map(p=>p.text||'').join('');
      if(add){text+=add;onText&&onText(text);}
      (c?.groundingMetadata?.groundingChunks||[]).forEach(g=>{
        const u=g.web&&g.web.uri;
        if(u&&/^https:\/\//.test(u)&&!sources.some(s=>s.u===u))sources.push({t:g.web.title||u,u});
      });
    }catch(e){if(e instanceof SyntaxError)return;throw e;}
  };
  if(res.body&&res.body.getReader){
    const rd=res.body.getReader();const dec=new TextDecoder();
    for(;;){const {done,value}=await rd.read();if(done)break;
      buf+=dec.decode(value,{stream:true});const lines=buf.split(/\r?\n/);buf=lines.pop();lines.forEach(handle);}
    if(buf)handle(buf);
  }else{(await res.text()).split(/\r?\n/).forEach(handle);}
  if(!text)throw new Error('El modelo no devolvió texto. Prueba otro modelo.');
  return {text,sources};
}

function buildSysCtx(){
  const total=TEMAS.length;
  const cons=TEMAS.filter(t=>td(t.n).e===3).length;
  const start=TEMAS.filter(t=>td(t.n).e>=1).length;
  const rep=TEMAS.filter(t=>isDue(t.n)).length;
  const p=projection();
  let s=`Eres el Tutor Jurídico IA de la oposición para Agente de Policía Local del Ayuntamiento de Cieza (Murcia, España). Convocatoria BORM n.º 140 del 20 de junio de 2026. 5 plazas, Grupo C1, sistema de oposición.

Hoy es ${ymd(todayD())}.${p&&p.days>=0?` El primer ejercicio es el ${S.exam.date} (faltan ${p.days} días).`:''}

Temario oficial — 41 temas:
- Grupo I (Temas 1-9): Derecho Constitucional y Derecho Administrativo General y Policial
- Grupo II (Temas 10-27): Derecho Penal, Derecho Procesal y Derecho Policial
- Grupo III (Temas 28-41): Normativa de Tráfico y Normativa Municipal de Cieza
Los exámenes se preparan para responder y desarrollar temas, así que prioriza la comprensión, la estructura y la base legal.

Estado actual del opositor: ${start}/${total} temas iniciados, ${cons} consolidados, ${rep} repasos pendientes hoy.`;
  if(tutorTema){
    const t=TEMAS.find(x=>x.n===tutorTema),d=td(tutorTema);
    s+=`\n\nTEMA EN ESTUDIO: Tema ${t.n} (Grupo ${t.g}) — ${t.t}\nEstado: ${ESTADOS[d.e]}. Confianza: ${d.conf?d.conf+'/5':'sin valorar'}. Repasos hechos: ${d.reps||0}.`;
    const wk=d.weak.filter(w=>!w.done).map(w=>w.text);
    if(wk.length)s+=`\nPuntos débiles que el opositor ha anotado: ${wk.join('; ')}.`;
    if(d.note)s+=`\nNotas del opositor (extracto):\n${d.note.slice(0,1500)}`;
  }
  const dud=S.doubts.filter(x=>!x.done).slice(0,10);
  if(dud.length)s+=`\n\nDUDAS PENDIENTES que el opositor anotó (tenlas presentes y resuélvelas si vienen al caso):\n`+dud.map(x=>`- ${x.tema?'T'+x.tema+': ':''}${x.text}`).join('\n');
  s+=S.ai.search
    ?'\n\nTienes búsqueda web: úsala para confirmar la redacción vigente de las normas (BOE, BORM) y señala cualquier reforma reciente.'
    :'\n\nNo tienes búsqueda web: si una norma pudo cambiar recientemente, avisa de que conviene verificarla en el BOE.';
  s+='\n\nResponde siempre en español. Sé preciso, estructurado y referencia artículos y leyes concretas cuando proceda. Usa párrafos cortos, **negritas** y listas con "- ". Si te piden análisis del ritmo de estudio, da recomendaciones prácticas y específicas basadas en el estado actual.\n\n(Estas son tus instrucciones de tutor; a continuación viene la conversación con el opositor.)';
  return s;
}

// ---------- barra del tutor: tema activo, atajos, búsqueda ----------
function openTutorTema(n){tutorTema=n;nav('tutor');}
function clearTutorTema(){tutorTema=null;renderTutorBar();}
function toggleSearch(v){S.ai.search=!!v;saveS();}
function renderTutorBar(){
  const ctx=$('tutor-ctx');
  if(tutorTema){
    const t=TEMAS.find(x=>x.n===tutorTema);
    ctx.style.display='flex';
    ctx.innerHTML=`<span>🎓 <strong>Tema ${t.n}</strong> · ${esc(temaShort(t))}</span><button class="nota-btn" onclick="clearTutorTema()" title="Quitar el tema">✕</button>`;
  }else{ctx.style.display='none';ctx.innerHTML='';}
  renderQuickPrompts();
  $('srch-chk').checked=!!S.ai.search;
  renderDoubtsCount();
}
function renderQuickPrompts(){
  const el=$('qp-area');
  if(tutorTema){
    el.innerHTML=TEMA_QP.map((q,i)=>`<button class="qp" onclick="temaQP(${i})">${q[0]}</button>`).join('')
      +`<button class="qp" onclick="openCorr(${tutorTema})">✍️ Corregir mi desarrollo</button>`;
  }else{
    el.innerHTML=QUICK.map((p,i)=>`<button class="qp" onclick="setQP(${i})">${esc(p)}</button>`).join('');
  }
}
function setQP(i){const inp=$('chat-inp');inp.value=QUICK[i];autoH(inp);inp.focus();}
function temaQP(i){askTutor(TEMA_QP[i][1].replace(/\{n\}/g,tutorTema));}

// ---------- acciones sobre una respuesta ----------
function msgToNotes(btn){
  const raw=btn.closest('.chat-msg')._raw;
  let n=tutorTema;
  if(!n){n=parseInt(prompt('¿En qué tema guardo esta respuesta? (1-41)'),10);if(!(n>=1&&n<=41))return;}
  const d=td(n);
  d.note=(d.note?d.note+'\n\n':'')+`— Tutor IA · ${new Date().toLocaleDateString('es-ES')} —\n`+raw;
  openNote.add(n);saveS();
  toast(`💾 Guardado en las notas del Tema ${n}`);
}
function msgToDoubt(btn){
  const msg=btn.closest('.chat-msg');
  let q='',p=msg.previousElementSibling;
  while(p){if(p.classList.contains('user')){q=p._raw||'';break;}p=p.previousElementSibling;}
  const t=prompt('Duda que quieres recordar:',q.replace(/\s+/g,' ').slice(0,160));
  if(t&&t.trim())addDoubt(t.trim(),tutorTema);
}
function msgCopy(btn){
  const raw=btn.closest('.chat-msg')._raw;
  const done=()=>toast('📋 Copiado');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(raw).then(done,()=>toast('No se pudo copiar'));
  else toast('Tu navegador no permite copiar desde aquí');
}

// ---------- dudas pendientes ----------
function renderDoubtsCount(){const el=$('dbt-n');if(el)el.textContent=S.doubts.filter(d=>!d.done).length;}
function addDoubt(text,tema){
  S.doubts.unshift({id:uid(),text:String(text).slice(0,300),tema:tema||null,at:ymd(new Date()),done:false});
  saveS();renderDoubtsCount();toast('❓ Duda anotada');
  if($('modal-db').style.display==='flex')renderDoubts();
}
function openDoubts(){
  $('db-tema').innerHTML='<option value="">Sin tema</option>'+TEMAS.map(t=>`<option value="${t.n}">Tema ${t.n}</option>`).join('');
  if(tutorTema)$('db-tema').value=String(tutorTema);
  renderDoubts();$('modal-db').style.display='flex';
}
function renderDoubts(){
  const open=S.doubts.filter(d=>!d.done),done=S.doubts.filter(d=>d.done);
  const row=d=>`<div class="event-item${d.done?' st-done':''}"><div class="ev-info"><div class="ev-title">${d.tema?`<span class="badge b2">T${d.tema}</span> `:''}${esc(d.text)}</div><div class="ev-sub">${esc(fmtDM(d.at))}</div></div>
    <div class="st-btns">${d.done?'':`<button class="btn btn-ghost btn-sm" onclick="askDoubt('${d.id}')">Preguntar</button>`}<button class="st-btn s-done${d.done?' on':''}" title="${d.done?'Reabrir':'Resuelta'}" onclick="togDoubt('${d.id}')">✓</button><button class="ev-del" onclick="delDoubt('${d.id}')" title="Eliminar">🗑</button></div></div>`;
  $('db-list').innerHTML=(open.length?open.map(row).join(''):'<div class="muted">No tienes dudas pendientes. Anótalas desde cualquier respuesta del tutor (❓) o aquí abajo.</div>')
    +(done.length?`<div class="day-hdr">Resueltas</div>`+done.slice(0,10).map(row).join(''):'');
}
function addDoubtFromModal(){
  const v=$('db-new').value.trim();if(!v)return;
  addDoubt(v,parseInt($('db-tema').value,10)||null);$('db-new').value='';
}
function togDoubt(id){const d=S.doubts.find(x=>x.id===id);if(d){d.done=!d.done;saveS();renderDoubts();renderDoubtsCount();}}
function delDoubt(id){S.doubts=S.doubts.filter(x=>x.id!==id);saveS();renderDoubts();renderDoubtsCount();}
function askDoubt(id){
  const d=S.doubts.find(x=>x.id===id);if(!d)return;
  closeM('modal-db');
  askTutor(`Tengo esta duda pendiente${d.tema?' sobre el Tema '+d.tema:''}: ${d.text}\n\nExplícamela con claridad y con la base legal si procede.`,d.tema||tutorTema);
}

// ---------- corrección de desarrollo (escrito o dictado) ----------
let rec=null;
function openCorr(n){
  $('corr-tema').innerHTML='<option value="">Elige un tema…</option>'+TEMAS.map(t=>`<option value="${t.n}">Tema ${t.n} · ${esc(temaShort(t))}</option>`).join('');
  $('corr-tema').value=String(n||tutorTema||'');
  $('corr-mic').style.display=(window.SpeechRecognition||window.webkitSpeechRecognition)?'':'none';
  $('modal-corr').style.display='flex';
}
function corrCount(){const v=$('corr-txt').value.trim();$('corr-count').textContent=(v?v.split(/\s+/).length:0)+' palabras';}
function corrMic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Tu navegador no admite dictado por voz.');return;}
  const btn=$('corr-mic');
  if(rec){rec.stop();return;}
  rec=new SR();rec.lang='es-ES';rec.continuous=true;rec.interimResults=false;
  rec.onresult=ev=>{
    for(let i=ev.resultIndex;i<ev.results.length;i++){
      if(ev.results[i].isFinal){
        const ta=$('corr-txt');
        ta.value+=(ta.value&&!/\s$/.test(ta.value)?' ':'')+ev.results[i][0].transcript.trim();
      }
    }
    corrCount();
  };
  rec.onend=()=>{rec=null;btn.textContent='🎤 Dictar';};
  rec.onerror=()=>{rec=null;btn.textContent='🎤 Dictar';};
  rec.start();btn.textContent='⏹ Parar dictado';
}
function corrSend(){
  const n=parseInt($('corr-tema').value,10),txt=$('corr-txt').value.trim();
  if(!(n>=1&&n<=41)){toast('Elige el tema que has desarrollado.');return;}
  if(txt.length<40){toast('Escribe (o dicta) tu desarrollo: es demasiado corto.');return;}
  if(!S.ai.key){openSettings();return;}
  if(rec)rec.stop();
  const t=TEMAS.find(x=>x.n===n);
  const prompt=`CORRECCIÓN DE DESARROLLO — Tema ${n}: ${t.t}

Actúa como tribunal examinador. Compara mi desarrollo con el contenido esperado del tema según el temario oficial y la normativa vigente. Responde con estos apartados:
1. **Nota orientativa** sobre 10, con una frase de justificación.
2. **Lo que está bien.**
3. **Omisiones importantes** (apartados, artículos, plazos, órganos o datos que faltan), ordenadas por importancia.
4. **Errores o imprecisiones** (indica la redacción o norma correcta).
5. **Cómo mejorarlo**: estructura recomendada y las 3 ideas o frases que no deberían faltar.
6. **Puntos débiles para anotar**: 2-3 frases cortas.

MI DESARROLLO:
"""
${txt}
"""`;
  closeM('modal-corr');$('corr-txt').value='';corrCount();
  askTutor(prompt,n);
}

// ---------- revisión de cambios legislativos ----------
function legisAsk(){
  if(!S.ai.key){openSettings();return;}
  S.ai.search=true;saveS();
  askTutor(`Revisión de cambios legislativos del temario (fecha de referencia: ${S.exam.borm||ymd(todayD())}). Usando búsqueda web (BOE y BORM), indica qué normas del temario han sido modificadas, derogadas o sustituidas recientemente, o tienen reformas aprobadas pendientes de entrar en vigor. Normas a revisar: Constitución Española, LO 4/1982 (Estatuto de Autonomía de Murcia), Ley 7/1985 de Bases de Régimen Local, Ley 39/2015, Ley 40/2015, TREBEP, LO 1/2004, LO 10/2022, LO 4/2000, LO 5/2000, LO 2/1986, LO 4/2015, Ley 6/2019 de coordinación de Policías Locales de la Región de Murcia, Código Penal y LECrim, Texto Refundido de la Ley de Tráfico (RDL 6/2015), Reglamentos Generales de Circulación, Conductores y Vehículos, Ley 7/2022 y RD 287/2002. Responde con una lista de «norma · qué cambió · tema afectado» y termina con los números de tema que debería repasar.`,null);
}
