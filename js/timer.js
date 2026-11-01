// ============================================================
// TEMPORIZADOR DE ESTUDIO (cronómetro o Pomodoro) vinculado a tareas
// El estado vive en este dispositivo (localStorage); el resultado se guarda en la tarea.
// ============================================================
const TM_KEY='opl_timer_v1';
const BASE_TITLE='Oposición PL Cieza';
let TM=null,tmInt=null,tmStatus='done';

function tmLoad(){try{TM=JSON.parse(localStorage.getItem(TM_KEY)||'null');}catch(e){TM=null;}}
function tmSave(){try{if(TM)localStorage.setItem(TM_KEY,JSON.stringify(TM));else localStorage.removeItem(TM_KEY);}catch(e){}}
function tmEnsureInt(){
  if(TM&&!tmInt)tmInt=setInterval(tmTick,1000);
  if(!TM&&tmInt){clearInterval(tmInt);tmInt=null;}
}
function tmInit(){tmLoad();if(TM&&TM.running){/* tras recargar, el tiempo transcurrido sigue contando */}tmEnsureInt();tmRender();}

function tmNow(){
  if(!TM)return {study:0,phaseMs:0};
  const d=TM.running?Date.now()-TM.seg:0;
  return {study:TM.acc+(TM.phase==='work'?d:0),phaseMs:TM.phaseAcc+d};
}
function tmFold(){
  if(!TM||!TM.running)return;
  const now=Date.now(),d=Math.max(0,now-TM.seg);
  if(TM.phase==='work')TM.acc+=d;
  TM.phaseAcc+=d;TM.seg=now;
}
function fmtClock(ms){
  const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  const p=n=>String(n).padStart(2,'0');
  return (h?h+':':'')+p(m)+':'+p(x);
}
function beep(){
  try{
    const c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();
    o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.15;o.start();o.stop(c.currentTime+.3);
  }catch(e){}
  try{if(navigator.vibrate)navigator.vibrate(250);}catch(e){}
}

function tmStart(id){tmBegin(id);}
function tmStartFree(){tmBegin(null);}
function tmBegin(taskId){
  if(TM){toast('Ya hay una sesión en marcha: termínala primero.');return;}
  const e=taskId?S.events.find(x=>x.id===taskId):null;
  const now=Date.now();
  TM={task:e?e.id:null,tema:e?e.tema:null,title:e?e.title:'Sesión libre',startedAt:now,acc:0,phase:'work',phaseAcc:0,seg:now,running:true,pomo:!!S.timerCfg.pomo};
  tmSave();tmEnsureInt();tmRender();
  closeM('modal-task');
  toast('⏱ Sesión iniciada');
}
function tmToggle(){
  if(!TM)return;
  if(TM.running){tmFold();TM.running=false;}else{TM.running=true;TM.seg=Date.now();}
  tmSave();tmRender();
}
function tmPomoToggle(){
  if(!TM)return;
  tmFold();TM.pomo=!TM.pomo;TM.phase='work';TM.phaseAcc=0;
  S.timerCfg.pomo=TM.pomo;saveS();tmSave();tmRender();
  toast(TM.pomo?`🍅 Pomodoro: ${S.timerCfg.work} min de trabajo / ${S.timerCfg.brk} de descanso`:'Cronómetro libre');
}
function tmTick(){
  if(!TM){tmEnsureInt();return;}
  tmFold();
  if(TM.pomo&&TM.running){
    const lim=(TM.phase==='work'?S.timerCfg.work:S.timerCfg.brk)*60000;
    if(TM.phaseAcc>=lim){
      TM.phase=TM.phase==='work'?'break':'work';TM.phaseAcc=0;beep();
      toast(TM.phase==='break'?`☕ Descanso de ${S.timerCfg.brk} min`:'📖 De vuelta al estudio',6000);
    }
  }
  tmSave();tmRender();
}
function tmRender(){
  const bar=$('tm-bar');if(!bar)return;
  if(!TM){bar.hidden=true;document.title=BASE_TITLE;return;}
  const n=tmNow();bar.hidden=false;
  let main=n.study,sub=`Estudiado ${fmtClock(n.study)}`;
  if(TM.pomo){
    const lim=(TM.phase==='work'?S.timerCfg.work:S.timerCfg.brk)*60000;
    main=lim-n.phaseMs;
    sub=(TM.phase==='work'?'🍅 Trabajo':'☕ Descanso')+` · estudiado ${fmtClock(n.study)}`;
  }
  $('tm-title').textContent=TM.title;
  $('tm-sub').textContent=(TM.running?'':'⏸ En pausa · ')+sub;
  $('tm-time').textContent=fmtClock(main);
  $('tm-pp').textContent=TM.running?'⏸':'▶';
  $('tm-pomo').classList.toggle('on',!!TM.pomo);
  document.title=(TM.running?'⏱ ':'⏸ ')+fmtClock(main)+' · '+BASE_TITLE;
}
function tmDiscard(){
  if(!TM)return;
  if(!confirm('¿Descartar la sesión sin guardar el tiempo?'))return;
  TM=null;tmSave();tmEnsureInt();tmRender();
}

// --- terminar y guardar ---
function tmFinish(){
  if(!TM)return;
  tmFold();TM.running=false;tmSave();tmRender();
  const mins=Math.round(TM.acc/60000);
  if(TM.acc<30000){
    if(confirm('Llevas menos de 30 segundos: no se guardará nada. ¿Descartar la sesión?')){TM=null;tmSave();tmEnsureInt();tmRender();}
    return;
  }
  tmStatus='done';
  $('tm-sum').textContent=`Has estudiado ${mins} min en «${TM.title}».`;
  $('tm-mins').value=Math.max(1,mins);
  const e=TM.task?S.events.find(x=>x.id===TM.task):null;
  $('tm-task-box').style.display=e?'block':'none';
  $('tm-free-box').style.display=e?'none':'block';
  if(e)tmPaintStatus();
  else $('tm-tema').innerHTML='<option value="">Sin tema concreto</option>'+TEMAS.map(t=>`<option value="${t.n}">Tema ${t.n} · ${esc(temaShort(t))}</option>`).join('');
  $('modal-tm').style.display='flex';
}
function tmPaintStatus(){
  $('tm-st').innerHTML=['done','partial','no'].map(k=>`<button class="btn btn-ghost${tmStatus===k?' on-'+k:''}" onclick="tmStatus='${k}';tmPaintStatus()">${ST_ICON[k]} ${ST_LBL[k]}</button>`).join('');
}
function tmConfirm(){
  if(!TM)return;
  const mins=Math.max(1,Math.min(600,parseInt($('tm-mins').value,10)||1));
  const e=TM.task?S.events.find(x=>x.id===TM.task):null;
  if(e){
    e.real=(e.real||0)+mins;
    applyStatus(e.id,tmStatus);
  }else{
    const tema=parseInt($('tm-tema').value,10)||null;
    const st=new Date(TM.startedAt),s=String(st.getHours()).padStart(2,'0')+':'+String(st.getMinutes()).padStart(2,'0');
    const tt=tema?TEMAS.find(x=>x.n===tema):null;
    S.events.push({id:uid(),title:tt?'Tema '+tema+' · '+temaShort(tt):'Sesión libre',date:ymd(st),type:'study',s,e:addMin(s,mins),
      tema,desc:'',adv:false,src:'timer',status:'done',statusAt:ymd(new Date()),real:mins});
  }
  TM=null;tmSave();tmEnsureInt();tmRender();
  saveS();closeM('modal-tm');refreshViews();
  toast(`✓ ${mins} min guardados`);
}
