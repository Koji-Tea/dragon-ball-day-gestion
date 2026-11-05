"use strict";
/* ---------- Mini-jeu « La chasse aux boules » ----------
   Goku attrape les boules de cristal qui tombent et évite les boules d'énergie de Freezer.
   Les 7 boules réunies : vœu exaucé, bonus et une vie en plus. Se joue au doigt, à la souris ou aux flèches.
   Le jeu tourne dans une fenêtre (sheet) : l'écran principal peut se redessiner sans l'interrompre. */
const GAME={W:360,H:480};
function openGame(){
  openSheet(sheetHead("La chasse aux boules","goku")+
    `<p class="small muted" style="margin:-6px 0 10px">Glisse le doigt (ou la souris, ou les flèches) pour attraper les boules de cristal. Évite les attaques de Freezer !</p>
    <div style="position:relative;max-width:${GAME.W}px;margin:0 auto">
      <canvas id="gameCv" width="${GAME.W*2}" height="${GAME.H*2}" style="display:block;width:100%;aspect-ratio:3/4;max-height:62vh;margin:0 auto;border-radius:16px;touch-action:none;background:#7cc4ff"></canvas>
    </div>
    <div class="row" style="justify-content:space-between;margin-top:10px"><span class="small">Record : <b id="gameBest">${+ls("dbday-best")||0}</b></span><button type="button" class="btn primary" id="gameGo">${ic("game")}Jouer</button></div>`);
  const cv=$("#gameCv"),g=cv.getContext("2d");g.scale(2,2);
  const img=src=>{const i=new Image();i.src=src;return i},goku=img(IMG.goku),freezer=img(IMG.freezer);
  let S=null,raf=0,last=0;const keys={};
  const reset=()=>({x:GAME.W/2,items:[],score:0,lives:3,got:[],t:0,spawn:0,speed:1,flash:0,msg:"",over:false});
  const toX=e=>{const r=cv.getBoundingClientRect();return (e.clientX-r.left)/r.width*GAME.W};
  cv.addEventListener("pointermove",e=>{if(S&&!S.over)S.x=toX(e)});
  cv.addEventListener("pointerdown",e=>{if(S&&!S.over)S.x=toX(e)});
  const kd=e=>{if(!cv.isConnected){removeEventListener("keydown",kd);removeEventListener("keyup",ku);return}keys[e.key]=e.type==="keydown";if(e.key.startsWith("Arrow"))e.preventDefault()},ku=kd;
  addEventListener("keydown",kd);addEventListener("keyup",ku);
  function ball(x,y,r,n){
    const gr=g.createRadialGradient(x-r/3,y-r/3,r/5,x,y,r);gr.addColorStop(0,"#fff3b0");gr.addColorStop(.35,"#ffb21a");gr.addColorStop(1,"#e06a00");
    g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.strokeStyle="#2a2a2a";g.lineWidth=1.5;g.stroke();
    g.fillStyle="#c40000";const k=n>1?r*.38:0;for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2;star(x+(n>1?Math.cos(a)*k:0),y+(n>1?Math.sin(a)*k:0),n>4?r*.16:r*.22)}
  }
  function star(x,y,s){g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?s*.45:s;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}g.closePath();g.fill()}
  function blast(x,y,r,t){g.fillStyle="rgba(170,60,255,.35)";g.beginPath();g.arc(x,y,r*1.5+Math.sin(t/80)*2,0,7);g.fill();g.fillStyle="#d9a6ff";g.beginPath();g.arc(x,y,r,0,7);g.fill();g.fillStyle="#fff";g.beginPath();g.arc(x,y,r*.45,0,7);g.fill()}
  function draw(){
    const sky=g.createLinearGradient(0,0,0,GAME.H);sky.addColorStop(0,"#5aa9f0");sky.addColorStop(1,"#cdeaff");g.fillStyle=sky;g.fillRect(0,0,GAME.W,GAME.H);
    g.fillStyle="rgba(255,255,255,.8)";[[60,70],[250,120],[150,210]].forEach(([cx,cy],i)=>{const x=(cx+(S?S.t/40*(i+1):0))%(GAME.W+80)-40;g.beginPath();g.arc(x,cy,18,0,7);g.arc(x+20,cy-6,22,0,7);g.arc(x+42,cy,16,0,7);g.fill()});
    g.fillStyle="#6cbf4a";g.fillRect(0,GAME.H-24,GAME.W,24);
    if(freezer.complete&&freezer.naturalWidth)g.drawImage(freezer,GAME.W-62,4,56,56);
    if(!S)return;
    S.items.forEach(it=>it.bad?blast(it.x,it.y,it.r,S.t):ball(it.x,it.y,it.r,it.n));
    const pw=74,ph=74;if(goku.complete&&goku.naturalWidth)g.drawImage(goku,S.x-pw/2,GAME.H-24-ph+6,pw,ph);
    if(S.flash>0){g.fillStyle=`rgba(255,${S.hurt?60:230},${S.hurt?60:80},${S.flash/60*.5})`;g.fillRect(0,0,GAME.W,GAME.H)}
    g.fillStyle="#2a2a2a";g.font="bold 18px Nunito, sans-serif";g.textAlign="left";g.fillText(S.score+" pts",10,24);
    g.fillStyle="#c40000";g.fillText("♥".repeat(S.lives),10,46);
    for(let i=1;i<=7;i++){const x=10+(i-1)*22,y=64;if(S.got.includes(i))ball(x+8,y,8,i);else{g.strokeStyle="rgba(42,42,42,.35)";g.beginPath();g.arc(x+8,y,8,0,7);g.stroke()}}
    if(S.msg){g.textAlign="center";g.font="bold 26px Nunito, sans-serif";g.lineWidth=5;g.strokeStyle="#2a2a2a";g.strokeText(S.msg,GAME.W/2,GAME.H/2-20);g.fillStyle="#ffd400";g.fillText(S.msg,GAME.W/2,GAME.H/2-20);
      if(S.over){g.font="bold 16px Nunito, sans-serif";g.fillStyle="#2a2a2a";g.fillText("Touche « Rejouer » pour recommencer",GAME.W/2,GAME.H/2+12)}}
  }
  function step(now){
    if(!cv.isConnected){cancelAnimationFrame(raf);return}
    const dt=Math.min(40,now-(last||now));last=now;
    if(!S.over){
      S.t+=dt;S.speed=1+S.t/45000;
      if(keys.ArrowLeft)S.x-=.35*dt;if(keys.ArrowRight)S.x+=.35*dt;S.x=Math.max(28,Math.min(GAME.W-28,S.x));
      S.spawn-=dt;if(S.spawn<=0){const bad=Math.random()<Math.min(.45,.18+S.t/120000);
        const miss=[1,2,3,4,5,6,7].filter(n=>!S.got.includes(n));
        S.items.push({x:20+Math.random()*(GAME.W-40),y:-20,r:bad?11:13,bad,n:bad?0:miss[Math.floor(Math.random()*miss.length)]||1,v:(bad?.16:.12)*S.speed*(0.8+Math.random()*.5)});
        S.spawn=Math.max(320,900/S.speed)*(0.7+Math.random()*.6)}
      const py=GAME.H-24-34;
      S.items=S.items.filter(it=>{it.y+=it.v*dt;
        if(Math.abs(it.x-S.x)<30+it.r*.5&&Math.abs(it.y-py)<28){
          if(it.bad){S.lives--;S.flash=60;S.hurt=true;if(navigator.vibrate)navigator.vibrate(80);if(S.lives<=0)gameOver()}
          else{S.score++;if(!S.got.includes(it.n))S.got.push(it.n);
            if(S.got.length===7){S.score+=7;S.got=[];S.lives=Math.min(5,S.lives+1);S.msg="Vœu exaucé ! +7";S.msgT=1500;S.flash=60;S.hurt=false}}
          return false}
        return it.y<GAME.H+20});
      if(S.flash>0)S.flash-=dt/16;if(S.msgT>0){S.msgT-=dt;if(S.msgT<=0)S.msg=""}
    }
    draw();raf=requestAnimationFrame(step);
  }
  function gameOver(){
    S.over=true;S.flash=0;S.msg="Perdu ! "+S.score+" pts";const best=+ls("dbday-best")||0;
    if(S.score>best){ls("dbday-best",String(S.score));$("#gameBest").textContent=S.score;S.msg="Nouveau record : "+S.score+" !"}
    $("#gameGo").lastChild.textContent="Rejouer";$("#gameGo").hidden=false;
  }
  $("#gameGo").onclick=()=>{S=reset();last=0;$("#gameGo").hidden=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(step)};
  goku.onload=freezer.onload=()=>{if(!S)draw()};draw();
}
