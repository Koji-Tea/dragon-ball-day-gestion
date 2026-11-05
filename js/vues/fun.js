"use strict";
/* ---------- Fun : petite pause entre deux tâches ---------- */
const FUN_GAMES=[
  {name:"Dragon Ball Devolution",url:"https://www.txori.com/dbdevolution",
   text:"Le jeu de combat gratuit créé par des fans : choisis ton guerrier et affronte tes amis ou l’ordinateur.",
   tip:"Se joue au clavier, plutôt sur ordinateur. Il s’ouvre dans un nouvel onglet."},
  {name:"Hyper Dragon Ball Z",url:"https://hyper-dragon-ball-z.fr.uptodown.com/windows",btn:"Télécharger",
   text:"Un jeu de combat en 2D créé par des fans, avec de grands sprites dessinés à la main.",
   tip:"Jeu pour Windows : à télécharger puis installer sur un PC (ne marche pas sur téléphone ni sur Mac)."},
];
VIEWS.fun=()=>head("Fun","Une petite pause entre deux tâches","","goku")+
  `<div class="stack">${FUN_GAMES.map(g=>`<div class="card"><div><h2 style="margin:0 0 4px">${esc(g.name)}</h2><p class="small" style="margin:0 0 6px">${esc(g.text)}</p><p class="tiny muted" style="margin:0 0 12px">${esc(g.tip)}</p>
    <a class="btn primary" href="${esc(g.url)}" target="_blank" rel="noopener">${ic(g.btn?"down":"game")}${esc(g.btn||"Jouer")}</a></div></div>`).join("")}</div>`;
