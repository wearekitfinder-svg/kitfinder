/* Panel KitFinder — gráficos y animaciones del prototipo (kitfinder-panel.html),
   sin cifras de ejemplo: solo se pinta lo que llega en directo desde /analytics
   (ver auth.js). Lo que todavía no existe se queda en "—" o "Sin datos todavía". */
(function(){
var NS='http://www.w3.org/2000/svg';
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function fmt(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function money(n){return '€ '+n.toFixed(2).replace('.',',')}

var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/* ---------- datos en directo (los rellena kfRender) ---------- */
var DATA={loaded:false,last30:null,year:[]};

/* ---------- count-up ---------- */
function countUp(node){
  var to=parseFloat(node.dataset.count),money_=node.dataset.money,t0=null,dur=1100;
  function f(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/dur,1),e=1-Math.pow(1-p,4),v=to*e;
    node.textContent=money_?money(v):fmt(v);if(p<1)requestAnimationFrame(f)}
  requestAnimationFrame(f);
}
var started=false;
window.kfStart=function(){
started=true;
document.querySelectorAll('[data-count]').forEach(function(n,i){setTimeout(function(){countUp(n)},250+i*60)});
document.querySelectorAll('.meter i').forEach(function(i){i.style.width=0;setTimeout(function(){i.style.width=i.dataset.w+'%'},500)});
if(window.__kfInit)window.__kfInit();
};

/* ---------- gráfico usuarios ---------- */
var sv=document.getElementById('sv'),ch=document.getElementById('ch'),tip=document.getElementById('tip');
var W=560,H=220,L=36,R=14,T=16,B=28,cur='30';
function emptyText(svg,x,y,txt){var t=el('text',{x:x,y:y,'text-anchor':'middle',style:'font:500 15px "DM Sans",sans-serif;fill:#5b7468'},svg);t.textContent=txt}
function draw(key){
  cur=key;
  sv.innerHTML='';tip.classList.remove('show');
  [0,.5,1].forEach(function(f){var y=T+(H-T-B)*f;el('line',{x1:L,x2:W-R,y1:y,y2:y,class:'gl','stroke-dasharray':'3 5'},sv)});
  if(!DATA.loaded){emptyText(sv,W/2,H/2+4,'Cargando…');return}
  if(key==='30'){
    var r=DATA.last30;
    if(r&&r.users_active!=null){
      var t1=el('text',{x:W/2,y:H/2-6,'text-anchor':'middle',style:'font:700 54px Outfit,sans-serif;fill:#ecf4ef;letter-spacing:-2px'},sv);t1.textContent=fmt(r.users_active);
      var t2=el('text',{x:W/2,y:H/2+22,'text-anchor':'middle',style:'font:500 14px "DM Sans",sans-serif;fill:#8ca598'},sv);t2.textContent='usuarios activos · '+(r.users_new!=null?fmt(r.users_new):'—')+' nuevos (últimos 30 días)';
    }else{
      emptyText(sv,W/2,H/2+4,'Sin datos todavía');
    }
    var t4=el('text',{x:W/2,y:H-B+16,'text-anchor':'middle',class:'ax'},sv);t4.textContent='Usuarios por día: sin datos todavía';
  }else if(key==='anio'&&DATA.year.length){
    drawYear();
  }else{
    emptyText(sv,W/2,H/2+4,'Sin datos todavía');
  }
}
/* Este año: usuarios de cada mes cerrado (snapshots 'month'). El mes en curso
   no tiene snapshot todavía, así que no lleva barra. */
function drawYear(){
  var rows=DATA.year,last=rows[rows.length-1].m,n=last+1;
  var mx=Math.max.apply(null,rows.map(function(r){return r.v}))||1;
  var slot=(W-L-R)/n,bw=Math.min(slot*.56,34);
  var df=el('defs',{},sv),lg=el('linearGradient',{id:'gbar',x1:0,y1:0,x2:0,y2:1},df);
  el('stop',{offset:'0%','stop-color':'#46f0ad'},lg);el('stop',{offset:'100%','stop-color':'#17b985'},lg);
  [[1,T],[.5,T+(H-T-B)/2],[0,H-B]].forEach(function(a){var t=el('text',{x:L-8,y:a[1]+3.5,'text-anchor':'end',class:'ax'},sv);t.textContent=fmt(mx*a[0])});
  for(var m=0;m<n;m++){var t=el('text',{x:L+slot*(m+.5),y:H-B+16,'text-anchor':'middle',class:'ax'},sv);t.textContent=MES[m]}
  rows.forEach(function(r,i){
    var h=(H-T-B)*r.v/mx,x=L+slot*(r.m+.5)-bw/2,y=H-B-h;
    var b=el('rect',{x:x,y:y,width:bw,height:Math.max(h,1),rx:6,fill:'url(#gbar)',class:'bar',style:'animation-delay:'+(i*60)+'ms'},sv);
    function show(){
      var sr=sv.getBoundingClientRect(),cr=ch.getBoundingClientRect(),k=sr.width/W;
      tip.innerHTML='<b>'+fmt(r.v)+'</b><span>usuarios en el mes · '+MES[r.m]+' '+r.y+'</span>';
      tip.style.left=(sr.left-cr.left+(x+bw/2)*k)+'px';tip.style.top=(sr.top-cr.top+y*k)+'px';
      tip.classList.add('show');
    }
    b.addEventListener('mouseenter',show);b.addEventListener('touchstart',show,{passive:true});
    b.addEventListener('mouseleave',function(){tip.classList.remove('show')});
  });
}
/* segmented con indicador deslizante */
var seg=document.getElementById('seg'),pill=document.getElementById('pill'),btns=seg.querySelectorAll('button');
function movePill(b){pill.style.width=b.offsetWidth+'px';pill.style.transform='translateX('+(b.offsetLeft-4)+'px)'}
pill.style.left='4px';
function setPeriod(p){
  var b=seg.querySelector('[data-p="'+p+'"]');
  if(!b||b.classList.contains('on'))return;
  btns.forEach(function(x){x.classList.remove('on')});b.classList.add('on');movePill(b);
  document.querySelectorAll('.k').forEach(function(k){k.classList.toggle('sel',k.dataset.p===p)});
  tip.classList.remove('show');sv.classList.add('swap');
  setTimeout(function(){draw(p);sv.classList.remove('swap')},200);
}
btns.forEach(function(b){b.addEventListener('click',function(){setPeriod(b.dataset.p)})});
document.querySelectorAll('.k').forEach(function(k){
  k.addEventListener('click',function(){setPeriod(k.dataset.p)});
  k.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();setPeriod(k.dataset.p)}});
});
function init(){movePill(seg.querySelector('.on'))}
draw('30');
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(init)}
init();window.__kfInit=init;window.addEventListener('resize',init);

/* ---------- gráfico afiliados ---------- */
var sv2=document.getElementById('sv2');
(function(){var W2=720,H2=230,L2=40,R2=40,T2=18,B2=30;
  [0,.5,1].forEach(function(f){var y=T2+(H2-T2-B2)*f;el('line',{x1:L2,x2:W2-R2,y1:y,y2:y,class:'gl','stroke-dasharray':'3 5'},sv2)});
  var t=el('text',{x:W2/2,y:H2/2,'text-anchor':'middle',style:'font:500 15px "DM Sans",sans-serif;fill:#5b7468'},sv2);t.textContent='Sin datos todavía';})();

/* ---------- afiliados: clics por tienda ----------
   store_clicks llega por nombre de tienda o, si GA4 no tenía la dimensión,
   por dominio de destino (ver analytics_report.py), así que se compara con
   nombre y dominio normalizados. */
var AF_MATCH={
  ebay:['ebay'],
  cfc:['cfcollectives','classicfootballcollectibles'],
  kitplug:['kitplug'],
  cfs:['classicfootballshirts'],
  tsa:['soccerarchive']
};
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function renderAffiliates(r){
  if(!r||!r.store_clicks)return;
  var counts={},total=0,max=0;
  Object.keys(AF_MATCH).forEach(function(k){counts[k]=0});
  r.store_clicks.forEach(function(sc){
    var key=norm(sc[0]);
    for(var k in AF_MATCH){
      if(AF_MATCH[k].some(function(m){return key.indexOf(m)!==-1})){counts[k]+=Number(sc[1])||0;break}
    }
  });
  Object.keys(counts).forEach(function(k){total+=counts[k];if(counts[k]>max)max=counts[k]});
  Object.keys(counts).forEach(function(k){
    var td=document.querySelector('td[data-af="'+k+'"]');if(!td)return;
    var w=max?Math.round(counts[k]/max*100):0;
    td.innerHTML='<span class="cl"><i><s style="--w:'+w+'%"></s></i>'+fmt(counts[k])+'</span>';
  });
  document.getElementById('afTotal').textContent=fmt(total);
  var c=document.getElementById('afClicks');c.textContent=fmt(total);c.classList.remove('empty');
}

/* ---------- catálogo (de /admin/catalog-stats) ----------
   Rellena data-count / data-w y deja que la animación del prototipo (kfStart)
   cuente y llene las barras; si el panel ya está abierto, la lanza aquí. */
function pctTxt(v){return v.toFixed(1).replace('.',',')+' %'}
window.kfRenderCatalog=function(s){
  if(!s)return;
  var nodes=[];
  [['catStores',s.stores],['catProducts',s.products]].forEach(function(a){
    var n=document.getElementById(a[0]);
    if(typeof a[1]!=='number')return;
    n.dataset.count=a[1];n.classList.remove('empty');n.textContent=fmt(0);nodes.push(n);
  });
  var meters=[];
  document.querySelectorAll('.meter[data-k]').forEach(function(m){
    var v=s.pct?s.pct[m.dataset.k]:null;
    if(typeof v!=='number')return;
    var i=m.querySelector('i');i.dataset.w=v;m.querySelector('b').textContent=pctTxt(v);meters.push(i);
  });
  if(!started)return;
  nodes.forEach(function(n,i){setTimeout(function(){countUp(n)},250+i*60)});
  meters.forEach(function(i){i.style.width=i.dataset.w+'%'});
};

/* ---------- tareas de Todoist (de /admin/todoist/tasks, ver auth.js) ----------
   Orden: primero las "en curso", luego por fecha; sin fecha, al final. El
   círculo cierra la tarea en Todoist; la fila solo se quita cuando el Worker
   responde ok, y el aviso de abajo permite deshacer durante 8 segundos. Todo
   el texto que viene de Todoist se pinta con textContent, nunca como HTML. */
var taskList=document.getElementById('taskList'),toast=document.getElementById('toast'),
    toastMsg=document.getElementById('toastMsg'),toastUndo=document.getElementById('toastUndo');
var pendingClose={},tasksLoading=false,tasksAgain=false,toastTimer=null,undoTask=null;
var CLOSE_ERR={409:'Esta tarea tiene subtareas; ciérrala en Todoist',403:'No se pudo cerrar esta tarea',404:'No se pudo cerrar esta tarea',502:'Todoist no responde, inténtalo de nuevo'};

function taskRow(cls,text){
  var li=document.createElement('li');li.className=cls;
  var c=document.createElement('span');c.className='chk';c.setAttribute('aria-hidden','true');
  var t=document.createElement('span');t.className='tx';t.textContent=text;
  li.appendChild(c);li.appendChild(t);return li;
}
function tasksMessage(text,withRetry){
  taskList.innerHTML='';
  var li=taskRow('empty',text);
  if(withRetry){
    var b=document.createElement('button');b.type='button';b.className='go retry';b.textContent='Reintentar';
    b.addEventListener('click',function(){tasksMessage('Cargando…');window.kfTasksLoad()});
    li.appendChild(b);
  }
  taskList.appendChild(li);
}
function dueKey(d){return d?d.slice(0,10):'9999-99-99'}
function dueTxt(d){
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||'');if(!m)return '';
  var txt=(+m[3])+' '+MES[+m[2]-1];
  return +m[1]===new Date().getFullYear()?txt:txt+' '+m[1];
}
function tag(text,cls){var e=document.createElement('em');e.className='tg'+(cls?' '+cls:'');e.textContent=text;return e}

function renderTasks(tasks){
  tasks=tasks.slice().sort(function(a,b){
    if(!!a.in_progress!==!!b.in_progress)return a.in_progress?-1:1;
    var da=dueKey(a.due),db=dueKey(b.due);return da<db?-1:da>db?1:0;
  });
  taskList.innerHTML='';
  if(!tasks.length){tasksMessage('Sin tareas pendientes');return}
  tasks.forEach(function(t){
    var li=document.createElement('li');li.className=t.in_progress?'prog':'';li.dataset.id=t.id;
    var b=document.createElement('button');b.type='button';b.className='chk';
    b.setAttribute('aria-label','Cerrar tarea: '+t.content);
    b.disabled=!!pendingClose[t.id];
    b.addEventListener('click',function(){closeTask(t)});
    var tx=document.createElement('span');tx.className='tx';tx.textContent=t.content;
    var tg=document.createElement('span');tg.className='tgs';
    if(t.in_progress)tg.appendChild(tag('En curso','c'));
    if(t.due)tg.appendChild(tag(dueTxt(t.due)));
    (t.labels||[]).forEach(function(l){tg.appendChild(tag(l))});
    li.appendChild(b);li.appendChild(tx);if(tg.children.length)li.appendChild(tg);
    taskList.appendChild(li);
  });
}

/* Una carga a la vez; si se pide otra mientras tanto, se repite al acabar. */
window.kfTasksLoad=function(){
  if(!window.kfTodoist)return;
  if(tasksLoading){tasksAgain=true;return}
  tasksLoading=true;
  window.kfTodoist.list()
    .then(function(d){renderTasks((d&&d.tasks)||[])})
    .catch(function(e){console.warn('[panel] /admin/todoist/tasks:',e.message);tasksMessage('Sin datos todavía',true)})
    .then(function(){tasksLoading=false;if(tasksAgain){tasksAgain=false;window.kfTasksLoad()}});
};

function showToast(text,task){
  clearTimeout(toastTimer);
  toastMsg.textContent=text;undoTask=task||null;toastUndo.hidden=!task;
  toast.classList.add('show');
  toastTimer=setTimeout(function(){toast.classList.remove('show');undoTask=null},task?8000:5000);
}
/* La lista puede repintarse mientras la petición está en curso (al volver
   a la pestaña), así que la fila se busca por id al llegar la respuesta. */
function rowOf(id){
  var rows=taskList.querySelectorAll('li[data-id]');
  for(var i=0;i<rows.length;i++)if(rows[i].dataset.id===String(id))return rows[i];
  return null;
}
function setBusy(id,busy){
  var li=rowOf(id),b=li&&li.querySelector('button.chk');if(b)b.disabled=busy;
}
function closeTask(t){
  if(pendingClose[t.id])return;
  pendingClose[t.id]=true;setBusy(t.id,true);
  window.kfTodoist.close(t.id)
    .then(function(){
      var li=rowOf(t.id);
      delete pendingClose[t.id];
      if(li)li.classList.add('done');
      setTimeout(function(){if(li&&li.parentNode)li.parentNode.removeChild(li);if(!taskList.children.length)tasksMessage('Sin tareas pendientes')},350);
      showToast('Cerrada: '+t.content,t);
    })
    .catch(function(e){
      console.warn('[panel] cerrar tarea:',e.message);
      delete pendingClose[t.id];setBusy(t.id,false);
      showToast(CLOSE_ERR[e.status]||'No se pudo cerrar esta tarea');
    });
}
toastUndo.addEventListener('click',function(){
  var t=undoTask;if(!t)return;
  undoTask=null;toastUndo.hidden=true;clearTimeout(toastTimer);toastMsg.textContent='Reabriendo…';
  window.kfTodoist.reopen(t.id)
    .then(function(){toast.classList.remove('show');window.kfTasksLoad()})
    .catch(function(e){
      console.warn('[panel] reabrir tarea:',e.message);
      showToast(e.status===502?'Todoist no responde, inténtalo de nuevo':'No se pudo deshacer; reábrela en Todoist');
    });
});

/* ---------- entrada de datos (llamada desde auth.js) ----------
   rolling: snapshots 'rolling30d'; monthly: snapshots 'month' (ambos de /analytics). */
window.kfRender=function(rolling,monthly){
  rolling=(rolling||[]).slice().sort(function(a,b){return a.period_key<b.period_key?-1:1});
  monthly=(monthly||[]).slice().sort(function(a,b){return a.period_key<b.period_key?-1:1});
  DATA.last30=rolling.length?rolling[rolling.length-1]:null;
  var yr=new Date().getFullYear();
  DATA.year=monthly.filter(function(m){return /^\d{4}-\d{2}$/.test(m.period_key)&&+m.period_key.slice(0,4)===yr&&m.users_active!=null})
    .map(function(m){return {y:yr,m:+m.period_key.slice(5,7)-1,v:m.users_active}});
  DATA.loaded=true;
  draw(cur);
  renderAffiliates(DATA.last30);
};
})();
