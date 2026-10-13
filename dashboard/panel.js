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
function init(){movePill(seg.querySelector('.on'));movePills()}
draw('30');
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(init)}
init();window.__kfInit=init;window.addEventListener('resize',init);

/* ---------- gráfico afiliados (periodo elegido) ----------
   Barras = clics de Kit Finder a tiendas (store_clicks_daily, suma de todas las
   tiendas). Puntos = conversiones (orders de affiliate_daily, sin las filas de
   «pico atípico»). Cada serie tiene su propia escala: no se mezclan ni se
   calcula ninguna tasa entre ellas. Un día o semana sin ninguna fila es «sin
   dato» y no se pinta (no es un cero). En modo Mes va por día; si no, por
   semana (lunes a domingo). */
var sv2=document.getElementById('sv2'),ch2=document.getElementById('ch2'),tip2=document.getElementById('tip2');
var W2=720,H2=230,L2=40,R2=40,T2=18,B2=30;
function chartText(txt,y,cls){var t=el('text',{x:W2/2,y:y,'text-anchor':'middle',style:'font:500 15px "DM Sans",sans-serif;fill:#5b7468'},sv2);if(cls)t.setAttribute('class',cls);t.textContent=txt;return t}
function drawAfChart(o){
  sv2.innerHTML='';tip2.classList.remove('show');
  [0,.5,1].forEach(function(f){var y=T2+(H2-T2-B2)*f;el('line',{x1:L2,x2:W2-R2,y1:y,y2:y,class:'gl','stroke-dasharray':'3 5'},sv2)});
  if(!o){chartText('Cargando…',H2/2);return}
  var bk=o.buckets,n=bk.length;
  var hc=bk.filter(function(b){return b.clicks!==null}),ho=bk.filter(function(b){return b.orders!==null});
  if(!hc.length&&!ho.length){
    chartText(o.message||'Sin datos en este periodo',H2/2);
    if(o.clicksErr)chartText('Clics de Kit Finder: sin datos (no se pudieron cargar)',H2/2+22,'ax');
    return;
  }
  var slot=(W2-L2-R2)/n,X=function(i){return L2+slot*(i+.5)};
  var mc=Math.max(1,Math.max.apply(null,hc.map(function(b){return b.clicks}).concat([0])));
  var mo=Math.max(1,Math.max.apply(null,ho.map(function(b){return b.orders}).concat([0])));
  var Yc=function(v){return H2-B2-(H2-T2-B2)*v/mc},Yo=function(v){return H2-B2-(H2-T2-B2)*v/mo};
  [[1,T2],[.5,T2+(H2-T2-B2)/2],[0,H2-B2]].forEach(function(a){
    if(hc.length){var t=el('text',{x:L2-8,y:a[1]+3.5,'text-anchor':'end',class:'ax'},sv2);t.textContent=fmt(mc*a[0])}
    if(ho.length){var u=el('text',{x:W2-R2+8,y:a[1]+3.5,'text-anchor':'start',class:'ax',style:'fill:#b8913f'},sv2);u.textContent=String(Math.round(mo*a[0]*10)/10).replace('.',',')}
  });
  var step=Math.max(1,Math.ceil(n/10));
  bk.forEach(function(b,i){if(i%step===0){var t=el('text',{x:X(i),y:H2-B2+16,'text-anchor':'middle',class:'ax'},sv2);t.textContent=b.label}});
  if(o.clicksErr){var e=el('text',{x:W2-R2,y:T2-6,'text-anchor':'end',class:'ax'},sv2);e.textContent='Clics de Kit Finder: sin datos'}
  var df=el('defs',{},sv2),lg=el('linearGradient',{id:'gbar2',x1:0,y1:0,x2:0,y2:1},df);
  el('stop',{offset:'0%','stop-color':'#46f0ad'},lg);el('stop',{offset:'100%','stop-color':'#17b985'},lg);
  var bw=Math.max(2,Math.min(slot*.6,18));
  bk.forEach(function(b,i){
    if(b.clicks===null)return;
    var y=Yc(b.clicks);
    el('rect',{x:X(i)-bw/2,y:y,width:bw,height:Math.max(H2-B2-y,1),rx:Math.min(4,bw/3),fill:'url(#gbar2)',opacity:.8,class:'bar',style:'animation-delay:'+Math.min(i*25,600)+'ms'},sv2);
  });
  // línea de conversiones solo entre puntos seguidos con dato
  for(var i=1;i<n;i++){
    if(bk[i].orders!==null&&bk[i-1].orders!==null)
      el('line',{x1:X(i-1),y1:Yo(bk[i-1].orders),x2:X(i),y2:Yo(bk[i].orders),stroke:'#f4bb4c','stroke-width':2,'stroke-linecap':'round',opacity:.7},sv2);
  }
  bk.forEach(function(b,i){
    if(b.orders===null)return;
    el('circle',{cx:X(i),cy:Yo(b.orders),r:n>40?3.5:5,fill:'#f4bb4c',class:'dot',style:'animation-delay:'+Math.min(i*25,600)+'ms'},sv2);
  });
  // zona de ratón / dedo por cada día o semana
  bk.forEach(function(b,i){
    var hit=el('rect',{x:X(i)-slot/2,y:T2,width:slot,height:H2-T2-B2,fill:'transparent'},sv2);
    function show(){
      var sr=sv2.getBoundingClientRect(),cr=ch2.getBoundingClientRect(),k=sr.width/W2;
      var c=b.clicks===null?(o.clicksErr||b.beforeGa4?'—':'sin dato'):fmt(b.clicks);
      var v=b.orders===null?'sin dato':fmt(b.orders);
      tip2.innerHTML='<b>'+c+'</b><span>clics Kit Finder · <i>'+v+'</i> '+(b.orders===1?'conversión':'conversiones')+'<br>'+b.long+'</span>';
      var y=Math.min(b.clicks!==null?Yc(b.clicks):H2-B2,b.orders!==null?Yo(b.orders):H2-B2);
      tip2.style.left=(sr.left-cr.left+X(i)*k)+'px';tip2.style.top=(sr.top-cr.top+y*k)+'px';tip2.classList.add('show');
    }
    hit.addEventListener('mouseenter',show);hit.addEventListener('touchstart',show,{passive:true});
    hit.addEventListener('mouseleave',function(){tip2.classList.remove('show')});
  });
}
drawAfChart(null);

/* ---------- afiliados: tiendas ----------
   Cada fila de «Por tienda» es una tienda con acuerdo (data-store = nombre
   EXACTO en store_clicks_daily y affiliate_daily). Clics Kit Finder (GA4) y
   clics del programa son dos cifras distintas: nunca se suman ni se dividen
   entre sí. Si la ruta de clics por día falla, la columna GA4 vuelve a los
   clics de los últimos 30 días del informe de GA4 (como antes), avisándolo. */
var AF_MATCH={
  ebay:['ebay'],
  cfc:['cfcollectives','classicfootballcollectibles'],
  kitplug:['kitplug'],
  cfs:['classicfootballshirts'],
  tsa:['soccerarchive']
};
var SNAP=null; // clics de 30 días por tienda (snapshot rolling30d), por clave de AF_MATCH
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function renderAffiliates(r){
  if(!r||!r.store_clicks)return;
  var counts={};
  Object.keys(AF_MATCH).forEach(function(k){counts[k]=0});
  r.store_clicks.forEach(function(sc){
    var key=norm(sc[0]);
    for(var k in AF_MATCH){
      if(AF_MATCH[k].some(function(m){return key.indexOf(m)!==-1})){counts[k]+=Number(sc[1])||0;break}
    }
  });
  SNAP=counts;
  if(!AF.clicksOk)paintGa4();
}

/* ---------- eBay Partner Network (de /admin/affiliates/ebay) ----------
   Importes en céntimos por moneda: se pasan a euros solo al pintar; otra
   moneda distinta de EUR se enseña tal cual, sin convertir. Ventas = acciones
   no revertidas (pendientes + aprobadas); la comisión revertida va aparte y
   no se suma. Esta fuente no sigue el selector de periodo (es «últimos 30
   días» y «mes en curso» de la API de eBay), así que va en una línea pequeña
   bajo el nombre de eBay y no en las columnas del periodo. */
function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function centsTxt(m){
  m=m||{};
  var cur=Object.keys(m).filter(function(c){return m[c]}).sort(function(a,b){return a==='EUR'?-1:b==='EUR'?1:a<b?-1:1});
  if(!cur.length)return money(0);
  return cur.map(function(c){var v=m[c]/100;return c==='EUR'?money(v):v.toFixed(2).replace('.',',')+' '+esc(c)}).join(' + ');
}
function sumCents(a,b){var o={};[a||{},b||{}].forEach(function(m){Object.keys(m).forEach(function(c){o[c]=(o[c]||0)+m[c]})});return o}
function salesOf(b){var s=(b&&b.actions_by_state)||{};return (s.pending||0)+(s.approved||0)}
function ebayNotice(html){
  var box=document.getElementById('ebayDetail');
  box.innerHTML=html;box.parentNode.hidden=!html;
}
function plural(n,one,many){return fmt(n)+' '+(n===1?one:many)}
/* En un 502, upstreamStatus es el código que devolvió eBay (0 = no se pudo
   conectar). Si no llegó en el cuerpo, se deja el mensaje genérico. */
window.kfRenderEbay=function(d,errStatus,upstreamStatus){
  var api=document.getElementById('ebayApi');
  if(!d||!d.last30||!d.month){
    var why='';
    if(errStatus===502){
      if(typeof upstreamStatus==='number'&&isFinite(upstreamStatus)){
        why=upstreamStatus===0?' (no se pudo conectar con eBay)':' (eBay respondió con el código '+Math.trunc(upstreamStatus)+')';
      }else why=' (eBay no responde)';
    }
    api.hidden=true;
    ebayNotice('<span class="note">Sin datos de la API de eBay ahora'+why+'.</span>');
    return;
  }
  var L=d.last30,M=d.month,cL=L.commission_cents||{},cM=M.commission_cents||{};
  var s30=salesOf(L);
  api.textContent='API eBay: '+plural(s30,'venta','ventas')+' en 30 días · '+centsTxt(sumCents(cM.pending,cM.approved))+' comisión este mes';
  api.title='Últimos 30 días: '+plural(s30,'venta','ventas')+' · '+centsTxt(L.sale_cents)+' vendido\n'+
    'Comisión: '+centsTxt(cL.pending)+' pendiente, '+centsTxt(cL.approved)+' aprobada\n'+
    'Revertida (no se suma): '+centsTxt(cL.reversed)+'\n'+
    'Mes en curso: '+plural(salesOf(M),'venta','ventas')+' · '+centsTxt(cM.pending)+' pendiente, '+centsTxt(cM.approved)+' aprobada\n'+
    '(no sigue el selector de periodo)';
  api.hidden=false;
  var flags='';
  if(d.stale)flags+='<span class="chip gd" title="eBay no respondió; se muestra el último dato guardado">dato antiguo</span>';
  if(d.truncated||d.ignored>0)flags+='<span class="chip eb" title="Faltan páginas o hay acciones que no se pudieron leer">puede estar incompleto</span>';
  ebayNotice(flags);
};

/* ---------- affiliate_daily + store_clicks_daily, por periodo ----------
   Importes en unidades de cada moneda; aquí se suman en céntimos y se pintan
   por moneda, sin convertir divisas. Comisión = pendiente + aprobada (la
   revertida no se suma). program_clicks NULL = el programa no da ese dato: no
   se pinta ni se suma como 0. Las filas cuya nota dice «pico atípico»
   (posible tráfico no humano) cuentan en los clics del programa con una marca,
   pero no entran en el gráfico ni en ninguna tasa. */
var CUR_SYM={EUR:'€ ',GBP:'£ '};
var MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var AF_FIRST_MONTH='2026-06',GA4_FROM='2026-08-05',AF_KEY='kf_panel_af_period';
function c2(v){var n=Number(v);return isFinite(n)?Math.round(n*100):0}
function curAmt(cents,cur){var v=fmt(Math.trunc(cents/100))+','+('0'+Math.abs(cents%100)).slice(-2);return CUR_SYM[cur]?CUR_SYM[cur]+v:v+' '+cur}
function curOrder(a,b){return a==='EUR'?-1:b==='EUR'?1:a==='GBP'?-1:b==='GBP'?1:a<b?-1:1}
/* m = {moneda: céntimos}; cada moneda por separado («€ 5,00 + £ 94,27»). */
function multiAmt(m,curs){
  curs=(curs||Object.keys(m||{})).slice().sort(curOrder);
  if(!curs.length)return '—';
  return curs.map(function(c){return curAmt((m&&m[c])||0,c)}).join(' + ');
}
function isAtypical(r){
  return String(r&&r.note||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().indexOf('pico atipico')!==-1;
}
function utcDay(s){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||'');return m?Date.UTC(+m[1],+m[2]-1,+m[3]):NaN}
function pad2(n){return ('0'+n).slice(-2)}
function todayYmd(){var d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function dayTxt(s){var t=new Date(utcDay(s));return t.getUTCDate()+' '+MES[t.getUTCMonth()]}

/* ----- periodo elegido ----- */
function monthOptions(){
  var out=[],t=todayYmd().slice(0,7),y=+t.slice(0,4),m=+t.slice(5,7);
  while(true){var k=y+'-'+pad2(m);if(k<AF_FIRST_MONTH)break;out.push(k);if(--m<1){m=12;y--}}
  return out; // el más reciente primero
}
function yearOptions(){var out=[],y=+todayYmd().slice(0,4);for(var a=y;a>=+AF_FIRST_MONTH.slice(0,4);a--)out.push(a);return out}
var AFP={mode:'month',month:todayYmd().slice(0,7),year:+todayYmd().slice(0,4)};
(function(){
  var s=null;
  try{s=JSON.parse(localStorage.getItem(AF_KEY)||'null')}catch(e){s=null}
  if(!s||typeof s!=='object')return;
  if(['month','ytd','year'].indexOf(s.mode)!==-1)AFP.mode=s.mode;
  if(monthOptions().indexOf(s.month)!==-1)AFP.month=s.month;
  if(yearOptions().indexOf(+s.year)!==-1)AFP.year=+s.year;
})();
function savePeriod(){try{localStorage.setItem(AF_KEY,JSON.stringify(AFP))}catch(e){}}
function periodRange(p){
  var t=todayYmd();
  if(p.mode==='ytd')return {from:t.slice(0,4)+'-01-01',to:t};
  if(p.mode==='year')return {from:p.year+'-01-01',to:p.year+'-12-31'};
  var y=+p.month.slice(0,4),m=+p.month.slice(5,7),last=new Date(Date.UTC(y,m,0)).getUTCDate();
  return {from:p.month+'-01',to:p.month+'-'+pad2(last)};
}
function periodLabel(p){
  if(p.mode==='ytd'){var t=todayYmd();return 'lo que va de '+t.slice(0,4)+' (1 ene – '+dayTxt(t)+')'}
  if(p.mode==='year')return 'año '+p.year;
  return MESL[+p.month.slice(5,7)-1]+' '+p.month.slice(0,4);
}

/* ----- selector de periodo ----- 
   Hay uno en cada sección que lo usa (afiliados «af», tráfico web «ga»),
   pero todos comparten el mismo periodo: cambiar uno cambia los demás y
   recarga todas las secciones. */
function fillSelect(sel,vals,txt,cur){
  sel.innerHTML='';
  vals.forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=txt(v);if(String(v)===String(cur))o.selected=true;sel.appendChild(o)});
}
var PERIOD_UI=[];
function periodChanged(){
  savePeriod();syncSelector();
  window.kfAfLoad();if(window.kfGaLoad)window.kfGaLoad();
}
function bindPeriod(prefix){
  var seg=document.getElementById(prefix+'Seg');if(!seg)return;
  var ui={seg:seg,pill:document.getElementById(prefix+'Pill'),ms:document.getElementById(prefix+'MonthSel'),ys:document.getElementById(prefix+'YearSel')};
  fillSelect(ui.ms,monthOptions(),function(k){var s=MESL[+k.slice(5,7)-1]+' '+k.slice(0,4);return s.charAt(0).toUpperCase()+s.slice(1)},AFP.month);
  fillSelect(ui.ys,yearOptions(),String,AFP.year);
  ui.pill.style.left='4px';
  seg.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){
    if(AFP.mode===b.dataset.m)return;AFP.mode=b.dataset.m;periodChanged();
  })});
  ui.ms.addEventListener('change',function(){AFP.month=ui.ms.value;periodChanged()});
  ui.ys.addEventListener('change',function(){AFP.year=+ui.ys.value;periodChanged()});
  PERIOD_UI.push(ui);
}
function movePills(){
  (PERIOD_UI||[]).forEach(function(ui){var b=ui.seg.querySelector('.on');if(!b||!b.offsetWidth)return;ui.pill.style.width=b.offsetWidth+'px';ui.pill.style.transform='translateX('+(b.offsetLeft-4)+'px)'});
}
function syncSelector(){
  PERIOD_UI.forEach(function(ui){
    ui.seg.querySelectorAll('button').forEach(function(b){var on=b.dataset.m===AFP.mode;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
    ui.ms.value=AFP.month;ui.ys.value=String(AFP.year);
    ui.ms.hidden=AFP.mode!=='month';ui.ys.hidden=AFP.mode!=='year';
  });
  movePills();
}
bindPeriod('af');bindPeriod('ga');
syncSelector();
window.addEventListener('resize',movePills);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(movePills);

/* ----- carga: una petición a cada ruta con el rango del periodo. Si se
   cambia de periodo mientras carga, la respuesta vieja se descarta. ----- */
var AF={seq:0,ready:false,clicksOk:false,byStore:null};
window.kfAfLoad=function(){
  if(!window.kfAffiliates||!AF.ready)return;
  var seq=++AF.seq,p={mode:AFP.mode,month:AFP.month,year:AFP.year},r=periodRange(p);
  setAfLoading(true);
  var ok=function(d){return {d:d}},ko=function(e){console.warn('[panel] afiliados:',e.message);return {err:e.status||0}};
  var pd=window.kfAffiliates.daily(r.from,r.to).then(ok,ko);
  var pc=r.to<GA4_FROM?Promise.resolve({before:true}):window.kfAffiliates.storeClicks(r.from,r.to).then(ok,ko);
  Promise.all([pd,pc]).then(function(res){
    if(seq!==AF.seq)return;
    setAfLoading(false);
    renderPeriod(p,r,res[0],res[1]);
  });
};
function setAfLoading(on){
  document.getElementById('afBody').classList.toggle('loading',on);
  document.getElementById('afLoading').hidden=!on;
}

/* ----- celdas de la tabla «Por tienda» ----- */
function cellSet(td,text,small,title,empty){
  td.textContent=text;td.classList.toggle('e',!!empty);td.title=title||'';
  if(small){var n=document.createElement('span');n.className='note afcell';n.textContent=small;td.appendChild(n)}
}
function storeRows(){return Array.prototype.slice.call(document.querySelectorAll('#afStoreBody tr[data-store]'))}
function ga4Cell(tr){return tr.querySelector('td.afg')}
/* GA4 por tienda: del periodo (ruta por día) o, si falla, de los 30 días. */
function paintGa4(){
  var rows=storeRows(),vals=[],max=0;
  rows.forEach(function(tr){
    var v=null,note='',title='';
    if(AF.clicksOk){var n=AF.byStore[tr.dataset.store];v=typeof n==='number'?n:null;if(v===null)title='Sin filas de clics para esta tienda en el periodo (no es un 0)'}
    else if(AF.clicksBefore){title='No hay clics de GA4 antes del 5 ago 2026'}
    else if(SNAP&&tr.dataset.af){v=SNAP[tr.dataset.af];note='30 días';title='La ruta de clics por día no respondió: se muestran los clics de los últimos 30 días del informe de GA4'}
    vals.push([tr,v,note,title]);if(v!==null&&v>max)max=v;
  });
  var tot=0,known=0;
  vals.forEach(function(a){
    var td=ga4Cell(a[0]);
    if(a[1]===null){td.innerHTML='';cellSet(td,'—','',a[3],true);return}
    tot+=a[1];known++;
    var w=max?Math.round(a[1]/max*100):0;
    td.classList.remove('e');td.title=a[3];
    td.innerHTML='<span class="cl"><i><s style="--w:'+w+'%"></s></i>'+fmt(a[1])+'</span>'+(a[2]?'<span class="note afcell">'+a[2]+'</span>':'');
  });
  var tc=document.getElementById('afTotGa4');cellSet(tc,known?fmt(tot):'—','',known&&!AF.clicksOk?'Últimos 30 días':'',!known);
}
/* Agrupa filas de affiliate_daily por tienda. */
function groupRows(rows){
  var g={};
  rows.forEach(function(r){
    var x=g[r.store];
    if(!x)x=g[r.store]={store:r.store,progs:{},curs:{},clicks:0,clickDays:0,nullDays:0,atyp:0,orders:0,ordersKnown:0,amtKnown:0,sales:{},pend:{},appr:{}};
    var c=r.currency;x.curs[c]=1;x.progs[r.program]=1;
    if(r.program_clicks===null||r.program_clicks===undefined)x.nullDays++;
    else{x.clicks+=Number(r.program_clicks)||0;x.clickDays++;if(isAtypical(r))x.atyp+=Number(r.program_clicks)||0}
    if(r.orders!==null&&r.orders!==undefined){x.orders+=Number(r.orders)||0;x.ordersKnown++}
    if(r.sales_amount!=null||r.commission_pending!=null||r.commission_approved!=null)x.amtKnown++;
    x.sales[c]=(x.sales[c]||0)+c2(r.sales_amount);
    x.pend[c]=(x.pend[c]||0)+c2(r.commission_pending);
    x.appr[c]=(x.appr[c]||0)+c2(r.commission_approved);
  });
  return g;
}
function addTo(t,x){
  if(!x)return;
  t.n++;t.clicks+=x.clicks;t.clickDays+=x.clickDays;t.atyp+=x.atyp;t.orders+=x.orders;t.ordersKnown+=x.ordersKnown;t.amtKnown+=x.amtKnown;
  Object.keys(x.curs).forEach(function(c){t.curs[c]=1;t.sales[c]=(t.sales[c]||0)+(x.sales[c]||0);t.pend[c]=(t.pend[c]||0)+(x.pend[c]||0);t.appr[c]=(t.appr[c]||0)+(x.appr[c]||0)});
}
function emptyAgg(){return {n:0,clicks:0,clickDays:0,atyp:0,orders:0,ordersKnown:0,amtKnown:0,curs:{},sales:{},pend:{},appr:{}}}
/* Pinta las 4 columnas de afiliado de una fila (o del total). x = null: sin filas. */
function paintAff(cells,x,why){
  var none=why||'Sin filas de afiliado en este periodo';
  if(!x){cells.forEach(function(td){td.innerHTML='';cellSet(td,'—','',none,true)});return}
  var curs=Object.keys(x.curs);
  // clics del programa
  if(!x.clickDays)cellSet(cells[0],'sin dato','','El programa no da clics para estas fechas',true);
  else{
    var t=[];if(x.nullDays)t.push(plural(x.nullDays,'día','días')+' sin dato (no cuentan como 0)');
    if(x.atyp)t.push(fmt(x.atyp)+' clics del pico atípico (posible tráfico no humano)');
    cellSet(cells[0],fmt(x.clicks),x.atyp?'incl. '+fmt(x.atyp)+' de pico atípico':(x.nullDays?plural(x.nullDays,'día','días')+' sin dato':''),t.join('\n'));
  }
  cellSet(cells[1],x.ordersKnown?fmt(x.orders):'—','',x.ordersKnown?'':'Sin dato de pedidos',!x.ordersKnown);
  if(x.amtKnown){
    var tot={};curs.forEach(function(c){tot[c]=(x.pend[c]||0)+(x.appr[c]||0)});
    cellSet(cells[2],multiAmt(x.sales,curs),'','Importe vendido');
    var split='pendiente '+multiAmt(x.pend,curs)+' / aprobada '+multiAmt(x.appr,curs);
    cellSet(cells[3],multiAmt(tot,curs),split,split+'\n(la revertida no se suma)');
  }else{cellSet(cells[2],'—','','Sin importes',true);cellSet(cells[3],'—','','Sin importes',true)}
}
function affCells(tr){return Array.prototype.slice.call(tr.querySelectorAll('td.afa'))}
/* Una tienda con filas en affiliate_daily que no está en la lista fija
   también sale (fila nueva antes del total), para no esconder datos. */
function extraRow(name){
  var tr=document.createElement('tr');tr.dataset.store=name;tr.className='afextra';
  var a=document.createElement('td');a.textContent=name;tr.appendChild(a);
  var g=document.createElement('td');g.className='afg';tr.appendChild(g);
  for(var i=0;i<4;i++){var c=document.createElement('td');c.className='m afa';tr.appendChild(c)}
  var tot=document.getElementById('afStoreBody').querySelector('tr.tot');tot.parentNode.insertBefore(tr,tot);
  return tr;
}

/* ----- tarjetas, tabla, gráfico y notas del periodo ----- */
function setNum(id,txt,empty,multi){var n=document.getElementById(id);n.textContent=txt;n.classList.toggle('empty',!!empty);n.classList.toggle('multi',!!multi)}
function setSmall(id,txt){var n=document.getElementById(id);n.textContent=txt||'';n.hidden=!txt}
function afBuckets(p,r){
  var DAY=864e5,from=utcDay(r.from),to=utcDay(r.to),ga=utcDay(GA4_FROM),list=[],first;
  if(p.mode==='month'){
    first=from;
    for(var t=from;t<=to;t+=DAY){var d=new Date(t);list.push({start:t,label:String(d.getUTCDate()),long:d.getUTCDate()+' '+MES[d.getUTCMonth()]+' '+d.getUTCFullYear(),clicks:null,orders:null,beforeGa4:t<ga})}
    return {list:list,first:first,size:DAY};
  }
  first=from-((new Date(from).getUTCDay()+6)%7)*DAY;
  for(var w=first;w<=to;w+=7*DAY){var e=new Date(w);list.push({start:w,label:e.getUTCDate()+' '+MES[e.getUTCMonth()],long:'semana del '+e.getUTCDate()+' '+MES[e.getUTCMonth()]+' '+e.getUTCFullYear(),clicks:null,orders:null,beforeGa4:w+6*DAY<ga})}
  return {list:list,first:first,size:7*DAY};
}
function renderPeriod(p,r,daily,clicks){
  var rows=daily.d&&Array.isArray(daily.d.rows)?daily.d.rows:null;
  var crows=clicks.d&&Array.isArray(clicks.d.rows)?clicks.d.rows:null;
  AF.clicksOk=!!crows;AF.clicksBefore=!!clicks.before;
  AF.byStore=crows?((clicks.d.totals&&clicks.d.totals.by_store)||crows.reduce(function(o,x){o[x.store]=(o[x.store]||0)+(Number(x.clicks)||0);return o},{})):null;
  var label=periodLabel(p);
  document.getElementById('afStoreSub').textContent='Por tienda · '+label;
  // avisos
  var notes=[];
  if(r.from<GA4_FROM)notes.push('Clics de Kit Finder (GA4) disponibles desde el 5 ago 2026.');
  if(!rows)notes.push('No se pudieron cargar los datos de afiliados'+(daily.err?' (error '+daily.err+')':'')+'; el resto sigue al día.');
  if(clicks.err!==undefined)notes.push('No se pudieron cargar los clics de Kit Finder por día'+(clicks.err?' (error '+clicks.err+')':'')+'; en la tabla se ven los de los últimos 30 días.');
  var noData=rows&&!rows.length&&(!crows||!crows.length)&&clicks.err===undefined;
  if(noData)notes.push('No hay datos de afiliados ni clics en '+label+'.');
  setSmall('afPeriodNote',notes.join(' '));
  // tarjetas
  if(crows&&crows.length){var tc=0;Object.keys(AF.byStore).forEach(function(k){tc+=AF.byStore[k]});setNum('afPClicks',fmt(tc))}
  else setNum('afPClicks','—',true);
  var g=rows?groupRows(rows):{},all=emptyAgg();
  Object.keys(g).forEach(function(k){addTo(all,g[k])});
  if(all.clickDays){setNum('afPProg',fmt(all.clicks));setSmall('afPProgNote',all.atyp?'incl. '+fmt(all.atyp)+' de pico atípico':'')}
  else{setNum('afPProg',rows&&all.n?'sin dato':'—',true);setSmall('afPProgNote','')}
  setNum('afPOrders',all.ordersKnown?fmt(all.orders):'—',!all.ordersKnown);
  var curs=Object.keys(all.curs);
  if(all.amtKnown){
    var tot={};curs.forEach(function(c){tot[c]=(all.pend[c]||0)+(all.appr[c]||0)});
    setNum('afPSales',multiAmt(all.sales,curs),false,curs.length>1);
    setNum('afPComm',multiAmt(tot,curs),false,curs.length>1);
    setSmall('afPCommSplit','pendiente '+multiAmt(all.pend,curs)+' / aprobada '+multiAmt(all.appr,curs));
  }else{setNum('afPSales','—',true);setNum('afPComm','—',true);setSmall('afPCommSplit','')}
  // tabla por tienda
  document.querySelectorAll('#afStoreBody tr.afextra').forEach(function(tr){tr.parentNode.removeChild(tr)});
  Object.keys(g).forEach(function(s){if(!document.querySelector('#afStoreBody tr[data-store="'+s.replace(/["\\]/g,'')+'"]'))extraRow(s)});
  var shown=emptyAgg();
  storeRows().forEach(function(tr){
    var x=g[tr.dataset.store]||null;if(x){x.n=1;addTo(shown,x)}
    paintAff(affCells(tr),rows?x:null,rows?null:'No se pudieron cargar los datos de afiliados');
  });
  paintAff(affCells(document.querySelector('#afStoreBody tr.tot')),rows&&shown.n?shown:null,rows?null:'No se pudieron cargar los datos de afiliados');
  paintGa4();
  // gráfico (sin las filas de «pico atípico»)
  var B=afBuckets(p,r);
  var idx=function(day){var t=utcDay(day);if(isNaN(t))return -1;var i=Math.floor((t-B.first)/B.size);return (i>=0&&i<B.list.length&&t>=utcDay(r.from)&&t<=utcDay(r.to))?i:-1};
  (crows||[]).forEach(function(x){var i=idx(x.day);if(i<0)return;B.list[i].clicks=(B.list[i].clicks||0)+(Number(x.clicks)||0)});
  (rows||[]).forEach(function(x){
    if(isAtypical(x)||x.orders===null||x.orders===undefined)return;
    var i=idx(x.day);if(i<0)return;B.list[i].orders=(B.list[i].orders||0)+(Number(x.orders)||0);
  });
  drawAfChart({buckets:B.list,clicksErr:clicks.err!==undefined,message:noData?'Sin datos en '+label:(!rows&&!crows?'Sin datos (no se pudieron cargar)':null)});
  renderAtypicalNote(rows||[]);
}
/* Nota bajo el gráfico: qué días se han dejado fuera y por qué. */
function renderAtypicalNote(rows){
  var box=document.getElementById('afAtypical'),a=rows.filter(isAtypical);
  if(!a.length){box.hidden=true;return}
  var clicks=a.reduce(function(s,r){return s+(Number(r.program_clicks)||0)},0),days=a.map(function(r){return r.day}).sort();
  var d0=new Date(utcDay(days[0])),d1=new Date(utcDay(days[days.length-1]));
  var span=days.length===1?d0.getUTCDate()+' '+MES[d0.getUTCMonth()]:
    d0.getUTCDate()+(d0.getUTCMonth()===d1.getUTCMonth()?'':' '+MES[d0.getUTCMonth()])+'–'+d1.getUTCDate()+' '+MES[d1.getUTCMonth()];
  box.textContent='Fuera del gráfico y de las tasas de conversión: '+span+' ('+fmt(clicks)+' clics sin ventas, «pico atípico», posible tráfico no humano).';
  box.hidden=false;
}

/* ----- comisión total acumulada: desde el 1 jun 2026 hasta hoy, siempre
   (no sigue el selector). Pendiente + aprobada, por moneda. ----- */
window.kfRenderTotal=function(d){
  var n=document.getElementById('afCommTotal'),split=document.getElementById('afCommTotalSplit');
  var by=d&&d.totals&&d.totals.by_currency;
  if(!by||!Object.keys(by).length){n.textContent='—';n.classList.add('empty');split.hidden=true;return}
  var pend={},appr={},tot={},curs=Object.keys(by);
  curs.forEach(function(c){var p=c2(by[c].commission_pending),a=c2(by[c].commission_approved);pend[c]=p;appr[c]=a;tot[c]=p+a});
  n.textContent=multiAmt(tot,curs);n.classList.remove('empty');n.classList.toggle('multi',curs.length>1);
  split.textContent='pendiente '+multiAmt(pend,curs)+' / aprobada '+multiAmt(appr,curs);split.hidden=false;
};
/* auth.js llama a esto al entrar: a partir de aquí el selector ya pide datos. */
window.kfAfStart=function(){AF.ready=true;window.kfAfLoad()};

/* ---------- tráfico web (de /admin/ga4/daily) ----------
   Mismo periodo que afiliados. «Usuarios activos (suma diaria)» es la suma
   de los usuarios activos de cada día (active_user_days): quien entra tres
   días cuenta tres veces, así que NO son personas distintas y nunca se
   llama «usuarios». Lo mismo vale para la cifra de cada país, que además no
   cuadra exactamente con el total (GA4 puede poner a una persona en dos
   países el mismo día). Las páginas no llevan %: el Worker solo guarda las 50
   más vistas de cada día, así que no hay un total completo. Todo el texto que
   viene de GA4 se pinta con textContent. */
var GA={seq:0,ready:false};
var sv3=document.getElementById('sv3'),ch3=document.getElementById('ch3'),tip3=document.getElementById('tip3');
var W3=720,H3=200,L3=40,R3=14,T3=14,B3=28;
var CHANNEL_ES={'Direct':'Directo','Organic Search':'Búsqueda orgánica','Referral':'Otras webs (enlaces)','Organic Social':'Redes sociales','Paid Search':'Búsqueda de pago','Paid Social':'Redes sociales de pago','Email':'Email','AI Assistant':'Asistentes de IA','Unassigned':'Sin asignar','Organic Video':'Vídeo','Display':'Display (anuncios)','Affiliates':'Afiliados','Cross-network':'Varias redes'};
function gaSet(id,txt,empty){var n=document.getElementById(id);n.textContent=txt;n.classList.toggle('empty',!!empty)}
function gaChartMsg(txt){
  sv3.innerHTML='';tip3.classList.remove('show');
  [0,.5,1].forEach(function(f){var y=T3+(H3-T3-B3)*f;el('line',{x1:L3,x2:W3-R3,y1:y,y2:y,class:'gl','stroke-dasharray':'3 5'},sv3)});
  var t=el('text',{x:W3/2,y:H3/2,'text-anchor':'middle',style:'font:500 15px "DM Sans",sans-serif;fill:#5b7468'},sv3);t.textContent=txt;
}
/* Sesiones por día en todo el periodo; un día sin fila queda en blanco. */
function gaChart(r,rows){
  var DAY=864e5,from=utcDay(r.from),to=utcDay(r.to),n=Math.round((to-from)/DAY)+1,by={};
  rows.forEach(function(x){by[x.day]=Number(x.sessions)||0});
  var days=[];for(var i=0;i<n;i++){var d=new Date(from+i*DAY),k=d.getUTCFullYear()+'-'+pad2(d.getUTCMonth()+1)+'-'+pad2(d.getUTCDate());days.push({k:k,d:d,v:by.hasOwnProperty(k)?by[k]:null})}
  gaChartMsg('');sv3.lastChild.remove();
  var mx=Math.max(1,Math.max.apply(null,days.map(function(x){return x.v||0})));
  var slot=(W3-L3-R3)/n,X=function(i){return L3+slot*(i+.5)},Y=function(v){return H3-B3-(H3-T3-B3)*v/mx};
  [[1,T3],[.5,T3+(H3-T3-B3)/2],[0,H3-B3]].forEach(function(a){var t=el('text',{x:L3-8,y:a[1]+3.5,'text-anchor':'end',class:'ax'},sv3);t.textContent=fmt(mx*a[0])});
  var step=Math.max(1,Math.ceil(n/8));
  days.forEach(function(x,i){if(i%step===0){var t=el('text',{x:X(i),y:H3-B3+16,'text-anchor':'middle',class:'ax'},sv3);t.textContent=x.d.getUTCDate()+' '+MES[x.d.getUTCMonth()]}});
  var df=el('defs',{},sv3),lg=el('linearGradient',{id:'gbar3',x1:0,y1:0,x2:0,y2:1},df);
  el('stop',{offset:'0%','stop-color':'#5fe3f0'},lg);el('stop',{offset:'100%','stop-color':'#1fa9bd'},lg);
  var bw=Math.max(1,Math.min(slot*.7,16));
  days.forEach(function(x,i){
    if(x.v===null)return;
    var y=Y(x.v);
    el('rect',{x:X(i)-bw/2,y:y,width:bw,height:Math.max(H3-B3-y,1),rx:Math.min(3,bw/3),fill:'url(#gbar3)',class:'bar',style:'animation-delay:'+Math.min(i*12,500)+'ms'},sv3);
  });
  days.forEach(function(x,i){
    var hit=el('rect',{x:X(i)-slot/2,y:T3,width:slot,height:H3-T3-B3,fill:'transparent'},sv3);
    function show(){
      var sr=sv3.getBoundingClientRect(),cr=ch3.getBoundingClientRect(),k=sr.width/W3;
      tip3.innerHTML='<b>'+(x.v===null?'sin dato':fmt(x.v))+'</b><span>'+(x.v===1?'sesión':'sesiones')+' · '+x.d.getUTCDate()+' '+MES[x.d.getUTCMonth()]+' '+x.d.getUTCFullYear()+'</span>';
      tip3.style.left=(sr.left-cr.left+X(i)*k)+'px';tip3.style.top=(sr.top-cr.top+(x.v===null?H3-B3:Y(x.v))*k)+'px';tip3.classList.add('show');
    }
    hit.addEventListener('mouseenter',show);hit.addEventListener('touchstart',show,{passive:true});
    hit.addEventListener('mouseleave',function(){tip3.classList.remove('show')});
  });
}
/* Lista con barra: items = [{name, title, value, pct|null}] */
function gaList(id,items,emptyTxt){
  var ul=document.getElementById(id);ul.innerHTML='';
  if(!items.length){var li=document.createElement('li');li.className='gaempty';li.textContent=emptyTxt||'—';ul.appendChild(li);return}
  var max=Math.max.apply(null,items.map(function(x){return x.value}))||1;
  items.forEach(function(x){
    var li=document.createElement('li');
    var nm=document.createElement('span');nm.className='gan';nm.textContent=x.name;if(x.title)nm.title=x.title;
    var v=document.createElement('span');v.className='gav';v.textContent=fmt(x.value)+(x.pct!=null?' · '+String(x.pct).replace('.',',')+' %':'');
    var bar=document.createElement('i');bar.className='gab';var s=document.createElement('s');s.style.width=Math.max(2,Math.round(x.value/max*100))+'%';bar.appendChild(s);
    li.appendChild(nm);li.appendChild(v);li.appendChild(bar);ul.appendChild(li);
  });
}
function gaClear(){
  ['gaSessions','gaNew','gaEngaged','gaAud'].forEach(function(i){gaSet(i,'—',true)});
  setSmall('gaEngagedPct','');
  ['gaCountries','gaChannels','gaPages'].forEach(function(i){gaList(i,[])});
}
function gaMessage(txt,retry){
  var box=document.getElementById('gaMsg');box.innerHTML='';box.hidden=!txt;if(!txt)return;
  var s=document.createElement('span');s.textContent=txt;box.appendChild(s);
  if(retry){var b=document.createElement('button');b.type='button';b.className='go retry';b.textContent='Reintentar';b.addEventListener('click',function(){window.kfGaLoad()});box.appendChild(b)}
}
function gaRender(p,r,d){
  var t=d.totals||{},rows=Array.isArray(d.rows)?d.rows:[];
  document.getElementById('gaSub').textContent='Tráfico web (GA4) · '+periodLabel(p);
  setSmall('gaNote',r.from<GA4_FROM?'Datos de GA4 disponibles desde el 5 ago 2026.':'');
  if(!rows.length||!t.days){
    gaClear();gaChartMsg('Sin datos en '+periodLabel(p));
    gaMessage('No hay datos de tráfico web en '+periodLabel(p)+'. Los datos de GA4 empiezan el 5 ago 2026 y se cargan cada día con un día de retraso.');
    return;
  }
  gaMessage('');
  gaSet('gaSessions',fmt(t.sessions||0));gaSet('gaNew',fmt(t.new_users||0));
  gaSet('gaEngaged',fmt(t.engaged_sessions||0));
  setSmall('gaEngagedPct',t.sessions?pctTxt((t.engaged_sessions||0)/t.sessions*100)+' de las sesiones':'');
  gaSet('gaAud',fmt(t.active_user_days||0));
  gaChart(r,rows);
  gaList('gaCountries',(d.countries||[]).map(function(c){return {name:c.country,value:Number(c.active_user_days)||0,pct:c.pct}}),'Sin datos de países');
  gaList('gaChannels',(d.channels||[]).map(function(c){return {name:CHANNEL_ES[c.channel]||c.channel,title:c.channel,value:Number(c.sessions)||0,pct:c.pct}}),'Sin datos de canales');
  gaList('gaPages',(d.pages||[]).map(function(x){return {name:x.page,title:x.page,value:Number(x.views)||0,pct:null}}),'Sin datos de páginas');
}
window.kfGaLoad=function(){
  if(!window.kfGa4||!GA.ready)return;
  var seq=++GA.seq,p={mode:AFP.mode,month:AFP.month,year:AFP.year},r=periodRange(p);
  var body=document.getElementById('gaBody');body.classList.add('loading');document.getElementById('gaLoading').hidden=false;
  window.kfGa4.daily(r.from,r.to)
    .then(function(d){if(seq!==GA.seq)return;gaRender(p,r,d||{})},
      function(e){
        if(seq!==GA.seq)return;
        console.warn('[panel] /admin/ga4/daily:',e.message);
        gaClear();gaChartMsg('Sin datos (error)');
        var s=e.status||0;
        gaMessage(s===401||s===403?'Tu sesión ha caducado o no tiene permiso. Recarga la página y vuelve a entrar.':
          s===0?'No se pudo conectar con el servidor (¿sin conexión?). El resto del panel sigue funcionando.':
          'El servidor no pudo dar los datos de tráfico (error '+s+'). El resto del panel sigue funcionando.',true);
      })
    .catch(function(e){console.error('[panel] tráfico web:',e)})
    .then(function(){if(seq!==GA.seq)return;body.classList.remove('loading');document.getElementById('gaLoading').hidden=true});
};
/* auth.js llama a esto al entrar. */
window.kfGaStart=function(){GA.ready=true;window.kfGaLoad()};
gaChartMsg('Cargando…');

/* ---------- añadir mes a mano (POST /admin/affiliates/manual) ----------
   Pedidos = orders; ventas (importe vendido) = sales_amount. El programa sale
   de una lista sin 'epn': eBay entra solo desde su API y el Worker lo rechaza. */
(function(){
  var form=document.getElementById('afManualForm'),msg=document.getElementById('afManualMsg');
  if(!form)return;
  var PROGRAMS=['tapfiliate','goaffpro','uppromote','opencart','webgains'];
  function say(t,err){msg.textContent=t;msg.classList.toggle('err',!!err)}
  var ERR={401:'Tu sesión ha caducado; vuelve a entrar.',403:'Esta cuenta no tiene permiso para guardar.',404:'El Worker no tiene esta ruta; no se ha guardado nada.',409:'Ya hay una fila automática (de la API) para esa tienda, programa y mes; no se ha cambiado nada.'};
  function twoDec(v){return Math.abs(v*100-Math.round(v*100))<1e-6}
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var f=form.elements,num=function(k){var v=String(f[k].value).trim().replace(',','.');return v===''?NaN:Number(v)};
    var row={month:f.month.value,store:f.store.value.trim(),program:f.program.value,
      orders:num('orders'),sales_amount:num('sales_amount'),commission_pending:num('commission_pending'),
      commission_approved:num('commission_approved'),commission_reversed:num('commission_reversed'),
      currency:f.currency.value.trim().toUpperCase(),note:f.note.value.trim()};
    if(!/^\d{4}-\d{2}$/.test(row.month)||!row.store)return say('Falta la tienda o el mes.',true);
    if(PROGRAMS.indexOf(row.program)===-1)return say('Elige un programa de la lista (eBay entra solo, no se añade a mano).',true);
    if(!/^[A-Z]{3}$/.test(row.currency))return say('La moneda debe tener 3 letras (p. ej. EUR o GBP).',true);
    if(!isFinite(row.orders)||row.orders<0||row.orders%1)return say('Pedidos debe ser un número entero, 0 o más.',true);
    var amounts=['sales_amount','commission_pending','commission_approved','commission_reversed'];
    if(amounts.some(function(k){return !isFinite(row[k])||row[k]<0||!twoDec(row[k])}))return say('Revisa los importes: no pueden estar vacíos ni ser negativos, y llevan como mucho 2 decimales.',true);
    var cur=row.currency;
    var ok=window.confirm('¿Guardar este mes?\n\n'+row.store+' · '+row.program+' · '+row.month+'\n'+
      'Pedidos: '+row.orders+' · Ventas (importe vendido): '+curAmt(c2(row.sales_amount),cur)+'\n'+
      'Comisión pendiente '+curAmt(c2(row.commission_pending),cur)+' / aprobada '+curAmt(c2(row.commission_approved),cur)+' / revertida '+curAmt(c2(row.commission_reversed),cur)+
      (row.note?'\nNota: '+row.note:''));
    if(!ok)return say('No se ha enviado nada.');
    var btn=form.querySelector('button[type=submit]');btn.disabled=true;say('Guardando…');
    window.kfAffiliates.manual(row)
      .then(function(){say('Guardado. Actualizando datos…');window.kfLoadDaily()})
      .catch(function(e){
        console.warn('[panel] /admin/affiliates/manual:',e.message);
        if(e.status===400)return say('El servidor no lo ha aceptado'+(e.serverMessage?': '+e.serverMessage:'')+'. No se ha guardado nada.',true);
        say(ERR[e.status]||('No se pudo guardar'+(e.status?' (error '+e.status+')':'')+'. Inténtalo de nuevo.'),true);
      })
      .then(function(){btn.disabled=false});
  });
})();

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
