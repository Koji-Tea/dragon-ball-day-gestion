"use strict";
/* ---------- Fun : petite pause entre deux tâches ---------- */
const FUN_GAMES=[
  {name:"Dragon Ball Devolution",url:"https://www.txori.com/dbdevolution",
   text:"Le jeu de combat gratuit créé par des fans : choisis ton guerrier et affronte tes amis ou l’ordinateur.",
   tip:"Se joue au clavier, plutôt sur ordinateur. Il s’ouvre dans un nouvel onglet."},
];
VIEWS.fun=()=>head("Fun","Une petite pause entre deux tâches","","goku")+
  `<div class="stack"><div class="card"><h2 style="margin:0 0 4px">La chasse aux boules</h2><p class="small" style="margin:0 0 6px">Notre mini-jeu maison : attrape les 7 boules de cristal avec Goku et esquive les attaques de Freezer.</p><p class="tiny muted" style="margin:0 0 12px">Se joue directement ici, au doigt sur téléphone ou à la souris. Record : <b>${+ls("dbday-best")||0}</b> pts.</p>
    <button type="button" class="btn primary" data-act="openGame">${ic("game")}Jouer</button></div>${FUN_GAMES.map(g=>`<div class="card"><div><h2 style="margin:0 0 4px">${esc(g.name)}</h2><p class="small" style="margin:0 0 6px">${esc(g.text)}</p><p class="tiny muted" style="margin:0 0 12px">${esc(g.tip)}</p>
    <a class="btn primary" href="${esc(g.url)}" target="_blank" rel="noopener">${ic(g.btn?"down":"game")}${esc(g.btn||"Jouer")}</a></div></div>`).join("")}</div>`;
