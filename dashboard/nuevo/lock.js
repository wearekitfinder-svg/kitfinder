/* Pantalla de bloqueo del prototipo: hora, PIN y relock tras 10 minutos sin
   actividad. Es SOLO cosmética: se hace en el navegador, el PIN está en este
   archivo (repo público) y los datos siguen cargados en la página mientras
   está bloqueado. Lo que protege los datos es el login de Google (auth.js) y
   la comprobación del token en el Worker. auth.js la muestra con kfLockShow()
   una vez comprobado que la cuenta es de ADMIN_EMAILS. */
(function(){
  var PIN="1903",entered="",lock=document.getElementById('lock'),app=document.getElementById('app'),inp=document.getElementById('pinInput'),dots=document.querySelectorAll('#lkPins i'),idle=null,INACT=10*60*1000;
  function tick(){var n=new Date();document.getElementById('lockTime').textContent=n.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});document.getElementById('lockDate').textContent=n.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})}
  tick();setInterval(tick,15000);
  function render(err){dots.forEach(function(d,i){d.className=err?'e':(i<entered.length?'f':'')})}
  function reset(){clearTimeout(idle);if(app.hidden)return;idle=setTimeout(relock,INACT)}
  function unlock(){lock.classList.add('out');app.hidden=false;if(window.kfStart)window.kfStart();setTimeout(function(){lock.style.display='none'},380);reset()}
  function relock(){app.hidden=true;lock.hidden=false;lock.style.display='flex';lock.classList.remove('out');entered='';inp.value='';render();inp.focus()}
  inp.addEventListener('input',function(e){
    entered=e.target.value.replace(/[^0-9]/g,'').slice(0,4);e.target.value=entered;render();
    if(entered.length===4){
      if(entered===PIN){setTimeout(unlock,150)}
      else{lock.classList.add('shake');render(true);setTimeout(function(){lock.classList.remove('shake');entered='';inp.value='';render()},420)}
    }
  });
  document.addEventListener('click',function(){if(!app.hidden){reset()}else if(!lock.hidden){inp.focus()}});
  ['mousemove','keydown','scroll','touchstart'].forEach(function(ev){document.addEventListener(ev,reset,{passive:true})});

  window.kfLockShow=relock;
  window.kfLockHide=function(){clearTimeout(idle);app.hidden=true;lock.hidden=true};
})();
