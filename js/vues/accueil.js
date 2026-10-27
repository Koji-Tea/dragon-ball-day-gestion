"use strict";
/* ---------- Accueil : compte à rebours, avancement, tâches urgentes ---------- */
/* Points d'attention : ce qui coince dans chaque module, avec un lien pour aller régler. */
function attention(){
  const A=[],r=c=>canRead(c)?inEdition(c):null;
  const g=r("guests");if(g)g.filter(x=>guestTodo(x).length).forEach(x=>A.push(["mic",`${x.name} : ${guestTodo(x).join(", ")} à régler`,"invites"]));
  const lo=r("lodging");if(lo&&lo.some(l=>l.status==="Option"))A.push(["bed",`${plural(lo.filter(l=>l.status==="Option").length,"chambre en option","réservations en option")} à confirmer`,"logistique"]);
  const ac=r("activities");if(ac&&isStaff()){const c=conflicts(ac);if(c.length)A.push(["clock",`${plural(c.length,"conflit")} dans le programme`,"programme"])}
  const sh=r("shifts");if(sh&&isStaff()){const n=sh.filter(s=>(s.volunteerIds||[]).length<(+s.needed||0)).length;if(n)A.push(["heart",`${plural(n,"créneau bénévole incomplet","créneaux bénévoles incomplets")}`,"benevoles"]);
    if(shiftClashes().length)A.push(["heart","Des bénévoles sont sur deux créneaux en même temps","benevoles"])}
  const sp=r("sponsors");if(sp){const n=sp.filter(s=>["Prospect","Contacté","En discussion"].includes(s.status)&&s.next&&s.next<=addDays(today(),7)).length;if(n)A.push(["gift",`${plural(n,"sponsor")} à relancer cette semaine`,"sponsors"])}
  const su=r("suppliers");if(su){const n=su.filter(s=>s.due&&s.status!=="Payé"&&ORDERED.includes(s.status)&&s.due<today()).length;if(n)A.push(["truck",`${plural(n,"facture fournisseur")} en retard de paiement`,"fournisseurs"])}
  if(canRead("budget")&&r("budget").length){const L=ledger(),B=r("budget");const over=EXP_CATS.filter(c=>{const pl=sum(B.filter(b=>b.cat===c),b=>b.planned);return pl&&sum(L.filter(l=>l.cat===c),l=>l.amount)>pl});if(over.length)A.push(["coins",`Budget dépassé : ${over.join(", ")}`,"budget"])}
  if(canRead("warriors")){const y=String(new Date().getFullYear()),n=all("warriors").filter(w=>w.status!=="Inactif"&&!(w.paid||[]).includes(y)).length;if(n)A.push(["bolt",`${plural(n,"cotisation")} ${y} de Guerriers Z à encaisser`,"guerriers"])}
  return A;
}

function welcome(){
  if(editions().length)return "";
  return `<div class="banner"><img alt="" src="${IMG.goku}"><div class="grow"><b>Bienvenue dans la gestion du Dragon Ball Day !</b><div class="small muted">Commence par créer l’édition du 6 juin 2027 à La Marive. Tu peux aussi charger des exemples pour découvrir l’application.</div></div>
  ${canWrite("editions")?`<button class="btn primary sm" data-act="newEdition2027">Créer l’édition 2027</button>`:""}${isAdmin()?`<button class="btn sm" data-act="loadDemo">Voir des exemples</button>`:""}</div>`;
}
VIEWS.accueil=()=>{
  const ed=currentEdition();
  const h=new Date().getHours(),hello=h<5||h>=18?"Bonsoir":"Salut";
  const name=(ME.name||"").split(" ")[0];
  if(!ed)return head(`${hello}${name?" "+esc(name):""} !`,"Prêt·e pour la prochaine convention ?")+welcome();
  const d=daysTo(ed.date);
  const st=STAFF.includes(ME.role)?taskStats():null;
  // Les 7 boules de cristal : chaque septième des tâches terminées en allume une.
  const lit=st&&st.all.length?Math.floor(st.done/st.all.length*7):0;
  const hero=`<div class="hero"><div class="hero-in"><span class="label" style="color:#fff;opacity:.85">Prochaine édition</span><h1>${esc(ed.name)}</h1>
    <span class="when">${edWhen(ed)}${ed.place?" · "+esc(ed.place):""}${ed.city?", "+esc(ed.city):""}</span>
    <span class="count">${d>0?`J-${d}<small>${d>1?"jours":"jour"}</small>`:d===0?"C’est aujourd’hui !":`Terminé<small>il y a ${plural(-d,"jour")}</small>`}</span></div>
    <img class="mascot" alt="" src="${IMG.goku}"></div>`;
  if(!st)return head(`${hello}${name?" "+esc(name):""} !`,"Merci de faire partie de l’aventure.")+`<div class="stack">${hero}
    <div class="grid g2"><div class="card"><div class="card-head"><h2>Mon planning</h2><a class="btn sm" href="#benevoles">Voir tout</a></div>${myShifts()}</div>
    <div class="card"><div class="card-head"><h2>Programme</h2><a class="btn sm" href="#programme">Voir la grille</a></div><p class="small muted" style="margin:0">${plural(inEdition("activities").length,"activité")} au programme. Le détail des horaires et des lieux est dans la grille.</p></div></div></div>`;
  const al=[...st.late.map(t=>({t,c:"bad"})),...st.soon.map(t=>({t,c:"warn"}))];
  return head(`${hello}${name?" "+esc(name):""} !`,"Voici où en est la préparation.")+welcome()+
  `<div class="stack">${hero}
  <div class="kpis">
    <a class="kpi" href="#taches"><span class="label">Tâches ouvertes</span><b>${st.open.length}</b><small>${st.late.length?`<span style="color:var(--bad);font-weight:800">${st.late.length} en retard</span>`:"rien en retard"}</small></a>
    ${canRead("guests")?`<a class="kpi" href="#invites"><span class="label">Invités confirmés</span><b>${inEdition("guests").filter(g=>g.status==="Confirmé").length}</b><small>${plural(inEdition("exhibitors").filter(x=>x.status==="Accepté"||x.status==="Payé").length,"exposant")}</small></a>`:""}
    ${canRead("ticketing")?(()=>{const t=ticketTotals();return `<a class="kpi" href="#billetterie"><span class="label">Billets vendus</span><b>${num(t.qty)}</b><small>${ed.goal?Math.round(t.qty/ed.goal*100)+" % de l’objectif ("+num(ed.goal)+")":"objectif à définir"}</small></a>`})():""}
    ${canRead("budget")?(()=>{const L=ledger(),v=sum(L.filter(l=>l.kind==="Recette"),l=>l.amount)-sum(L.filter(l=>l.kind==="Dépense"),l=>l.amount);return `<a class="kpi" href="#budget"><span class="label">Résultat engagé</span><b style="color:${v<0?"var(--bad)":"var(--good)"}">${v>0?"+":""}${chf(v)}</b><small>recettes − dépenses</small></a>`})():""}
  </div>
  <div class="grid g3">
    <div class="card"><div class="card-head"><h2>À faire bientôt</h2><a class="btn sm" href="#taches">Toutes les tâches</a></div>
      ${al.length?`<div class="list">${al.slice(0,8).map(x=>taskItem(x.t)).join("")}</div>`:emptyBox("trunks",st.all.length?"Rien d’urgent":"Pas encore de tâche",st.all.length?"Aucune tâche en retard ni prévue ces 14 prochains jours.":"Ajoute ce qu’il faut préparer avant la convention.",canWrite("tasks")?`<button class="btn primary sm" data-act="newRecord" data-mod="tasks">${ic("plus")}Tâche</button>`:"")}</div>
    <div class="card"><h2>Les 7 boules de cristal</h2><p class="small muted" style="margin-top:0">Une boule s’allume à chaque septième des tâches terminées. Toutes réunies : la convention est prête !</p>
      <div class="balls">${[1,2,3,4,5,6,7].map(i=>dragonBall(i,i<=lit)).join("")}</div>
      <p class="small" style="margin-bottom:0"><b>${st.done}</b> tâche${st.done>1?"s":""} terminée${st.done>1?"s":""} sur ${st.all.length}${lit===7?" · Shenron peut apparaître !":""}</p></div>
  </div>${(()=>{const A=attention();return `<div class="card attn"><h2>Points d’attention</h2>${A.length?`<div class="list">${A.slice(0,10).map(([i,t,h])=>`<a class="item click" href="#${h}"><span class="ic-w">${ic(i)}</span><div class="main"><b>${esc(t)}</b></div></a>`).join("")}</div>`:`<p class="small muted" style="margin:0">Rien ne coince pour l’instant. Kamé Hamé Ha !</p>`}</div>`})()}</div>`;
};
