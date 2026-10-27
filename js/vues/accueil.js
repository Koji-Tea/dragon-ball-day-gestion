"use strict";
/* ---------- Accueil : compte à rebours, avancement, tâches urgentes ---------- */
/* Modules prévus aux étapes suivantes, avec leur personnage (voir le document d'architecture). */
const BIENTOT=[["saiyaman","Invités & artistes"],["chichi","Logement & transport"],["bulma","Fournisseurs & matériel"],["freezer","Budget & comptabilité"],["piccolo","Bénévoles"],["trunks","Programme & activités"],["goku","Billetterie Infomaniak"]];

function welcome(){
  if(editions().length)return "";
  return `<div class="banner"><img alt="" src="${IMG.goku}"><div class="grow"><b>Bienvenue dans la gestion du Dragon Ball Day !</b><div class="small muted">Commence par créer l’édition du 6 juin 2027 à La Marive. Tu peux aussi charger des exemples pour découvrir l’application.</div></div>
  ${canWrite("editions")?`<button class="btn primary sm" data-act="newEdition2027">Créer l’édition 2027</button>`:""}${isAdmin()?`<button class="btn sm" data-act="loadDemo">Voir des exemples</button>`:""}</div>`;
}
VIEWS.accueil=()=>{
  const ed=currentEdition();
  const h=new Date().getHours(),hello=h<5||h>=18?"Bonsoir":"Salut";
  const name=(ME.name||"").split(" ")[0];
  if(!ed)return head(`${hello}${name?" "+esc(name):""} !`,"Prêt·e pour la prochaine convention ?")+welcome()+soonCard();
  const d=daysTo(ed.date);
  const st=STAFF.includes(ME.role)?taskStats():null;
  // Les 7 boules de cristal : chaque septième des tâches terminées en allume une.
  const lit=st&&st.all.length?Math.floor(st.done/st.all.length*7):0;
  const hero=`<div class="hero"><div class="hero-in"><span class="label" style="color:#fff;opacity:.85">Prochaine édition</span><h1>${esc(ed.name)}</h1>
    <span class="when">${edWhen(ed)}${ed.place?" · "+esc(ed.place):""}${ed.city?", "+esc(ed.city):""}</span>
    <span class="count">${d>0?`J-${d}<small>${d>1?"jours":"jour"}</small>`:d===0?"C’est aujourd’hui !":`Terminé<small>il y a ${plural(-d,"jour")}</small>`}</span></div>
    <img class="mascot" alt="" src="${IMG.goku}"></div>`;
  if(!st)return head(`${hello}${name?" "+esc(name):""} !`,"Merci de faire partie de l’aventure.")+hero+`<div class="card" style="margin-top:16px">${emptyBox("piccolo","Ton espace bénévole arrive bientôt","Tu y trouveras ton planning, tes postes et les infos pratiques du jour J.")}</div>`;
  const al=[...st.late.map(t=>({t,c:"bad"})),...st.soon.map(t=>({t,c:"warn"}))];
  return head(`${hello}${name?" "+esc(name):""} !`,"Voici où en est la préparation.")+welcome()+
  `<div class="stack">${hero}
  <div class="kpis">
    <a class="kpi" href="#taches"><span class="label">Tâches ouvertes</span><b>${st.open.length}</b><small>sur ${st.all.length} au total</small></a>
    <a class="kpi" href="#taches"><span class="label">En retard</span><b style="color:${st.late.length?"var(--bad)":"inherit"}">${st.late.length}</b><small>${st.late.length?"à rattraper":"rien en retard"}</small></a>
    <a class="kpi" href="#contacts"><span class="label">Contacts</span><b>${all("contacts").length}</b><small>dans le carnet</small></a>
    <div class="kpi"><span class="label">Visiteurs</span><b>${ed.goal?num(ed.goal):"–"}</b><small>${ed.capacity?"objectif · jauge "+num(ed.capacity):"objectif à définir"}</small></div>
  </div>
  <div class="grid g3">
    <div class="card"><div class="card-head"><h2>À faire bientôt</h2><a class="btn sm" href="#taches">Toutes les tâches</a></div>
      ${al.length?`<div class="list">${al.slice(0,8).map(x=>taskItem(x.t)).join("")}</div>`:emptyBox("trunks",st.all.length?"Rien d’urgent":"Pas encore de tâche",st.all.length?"Aucune tâche en retard ni prévue ces 14 prochains jours.":"Ajoute ce qu’il faut préparer avant la convention.",canWrite("tasks")?`<button class="btn primary sm" data-act="newRecord" data-mod="tasks">${ic("plus")}Tâche</button>`:"")}</div>
    <div class="card"><h2>Les 7 boules de cristal</h2><p class="small muted" style="margin-top:0">Une boule s’allume à chaque septième des tâches terminées. Toutes réunies : la convention est prête !</p>
      <div class="balls">${[1,2,3,4,5,6,7].map(i=>dragonBall(i,i<=lit)).join("")}</div>
      <p class="small" style="margin-bottom:0"><b>${st.done}</b> tâche${st.done>1?"s":""} terminée${st.done>1?"s":""} sur ${st.all.length}${lit===7?" · Shenron peut apparaître !":""}</p></div>
  </div>${soonCard()}</div>`;
};
function soonCard(){
  return `<div class="card"><h2>Bientôt dans l’application</h2><p class="small muted" style="margin-top:0">Les prochains modules arrivent étape par étape.</p>
  <div class="soon">${BIENTOT.map(([i,l])=>`<div><img alt="" src="${IMG[i]}">${l}</div>`).join("")}</div></div>`;
}
