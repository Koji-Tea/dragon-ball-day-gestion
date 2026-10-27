"use strict";
/* ---------- Invités, artistes et exposants ---------- */
const GUEST_KINDS=["Invité d’honneur","Comédien·ne de doublage","Chanteur·euse","Mangaka / illustrateur·rice","Cosplayeur·euse","Créateur·rice de contenu","Autre"];
const GUEST_STATES=["Idée","Contacté","En discussion","Confirmé","Annulé"];
const GUEST_PILL={"Confirmé":"good","En discussion":"warn","Contacté":"info","Annulé":"bad"};
defineMod({
  key:"guests",col:"guests",label:"Invités",one:"invité",img:"saiyaman",newLabel:"Nouvel invité",added:"Invité ajouté. Great Saiyaman s’occupe de l’accueil !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Nom",req:true,wide:true,ph:"ex. Bernard Minet"},
    {k:"photo",l:"Photo",type:"photo",help:"Recadrée en carré pour la vignette."},
    {k:"kind",l:"Type",type:"select",options:GUEST_KINDS,def:"Invité d’honneur"},
    {k:"status",l:"Statut",type:"select",options:GUEST_STATES,def:"Idée"},
    {k:"contactId",l:"Contact (agent, manager…)",type:"select",blank:"Aucun",options:refOpts("contacts")},
    {k:"owner",l:"Référent·e dans l’équipe",type:"member"},
    {k:"travel",l:"Moyen de transport",type:"select",options:["Train","Avion","Voiture","Autre"],blank:"–"},
    {k:"arrival",l:"Arrivée",type:"date"},
    {k:"departure",l:"Départ",type:"date"},
    {k:"fee",l:"Cachet",type:"money",help:"Laisse vide si l’invité vient sans cachet."},
    {k:"feePaid",l:"Cachet payé",type:"check"},
    {k:"contract",l:"Contrat signé",type:"check"},
    docField("contractFile","Contrat d’artiste"),
    {k:"announced",l:"Annoncé au public",type:"check"},
    {k:"people",l:"Accompagnant·es",type:"number",help:"Nombre de personnes qui viennent avec l’invité."},
    {k:"rider",l:"Besoins (rider)",type:"textarea",ph:"Loge, boissons, régime alimentaire, matériel de scène…"},
    {k:"signing",l:"Dédicaces",type:"textarea",ph:"Créneaux, prix, nombre de signatures, photos autorisées…"},
    {k:"notes",l:"Notes",type:"textarea"},
  ],
});
const EXHIB_KINDS=["Artiste","Exposant","Association","Restauration"];
const EXHIB_STATES=["Candidature","Accepté","Payé","Refusé"];
defineMod({
  key:"exhibitors",col:"exhibitors",label:"Exposants",one:"exposant",img:"saiyaman",newLabel:"Nouvel exposant",added:"Exposant ajouté.",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Nom du stand ou de l’artiste",req:true,wide:true},
    {k:"spot",l:"N° d’emplacement",ph:"ex. 12 ou A12"},
    {k:"tables",l:"Nombre de tables réservées",type:"number",ph:"ex. 2"},
    {k:"kind",l:"Type",type:"select",options:EXHIB_KINDS,def:"Exposant"},
    {k:"status",l:"Statut",type:"select",options:EXHIB_STATES,def:"Candidature"},
    {k:"contactName",l:"Personne de contact"},
    {k:"email",l:"E-mail",type:"email"},
    {k:"phone",l:"Téléphone",type:"tel"},
    {k:"fee",l:"Prix du stand",type:"money",help:"Ce que le stand paie à l’association."},
    {k:"power",l:"Besoin d’électricité",type:"check"},
    {k:"products",l:"Ce qui est vendu ou présenté",type:"textarea",wide:true},
    docField("doc","Contrat ou inscription"),
    {k:"notes",l:"Notes",type:"textarea"},
  ],
});

// Ce qui manque encore pour un invité confirmé : utilisé ici et sur l'accueil.
function guestTodo(g){
  if(g.status!=="Confirmé")return [];
  const t=[];
  if(!g.contract)t.push("contrat");
  if(g.fee&&!g.feePaid)t.push("cachet");
  if(canRead("lodging")&&g.departure&&g.arrival&&g.departure>g.arrival&&!inEdition("lodging").some(l=>l.guestId===g.id))t.push("logement");
  if(canRead("transport")&&!inEdition("transport").some(x=>x.guestId===g.id))t.push("transport");
  return t;
}
VIEWS.invites=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Invités","saiyaman");
  const gs=inEdition("guests"),conf=gs.filter(g=>g.status==="Confirmé");
  const xs=gs.filter(g=>(!UI.filter||g.status===UI.filter)&&matchQ(g,["name","kind","notes"])).sort((a,b)=>GUEST_STATES.indexOf(b.status)-GUEST_STATES.indexOf(a.status)||a.name.localeCompare(b.name,"fr"));
  return head("Invités",esc(ed.name),addBtn("guests","Invité")+`<button class="btn" data-act="exportMod" data-mod="guests">${ic("down")}CSV</button>`,"saiyaman")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Confirmés</span><b>${conf.length}</b><small>sur ${plural(gs.filter(g=>g.status!=="Annulé").length,"piste")}</small></div>
    <div class="kpi"><span class="label">Cachets</span><b>${chf(sum(conf,g=>g.fee))}</b><small>${chf(sum(conf.filter(g=>g.feePaid),g=>g.fee))} déjà payés</small></div>
    <div class="kpi"><span class="label">Contrats</span><b>${conf.filter(g=>g.contract).length}/${conf.length}</b><small>signés</small></div>
    <div class="kpi"><span class="label">Annoncés</span><b>${conf.filter(g=>g.announced).length}</b><small>au public</small></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher un invité…")}</div>
    <div class="chips" style="margin-bottom:10px"><button class="chip ${!UI.filter?"on":""}" data-act="filter" data-v="">Tous</button>${GUEST_STATES.filter(s=>gs.some(g=>g.status===s)).map(s=>`<button class="chip ${UI.filter===s?"on":""}" data-act="filter" data-v="${esc(s)}">${esc(s)} · ${gs.filter(g=>g.status===s).length}</button>`).join("")}</div>
    ${xs.length?`<div class="list">${xs.map(g=>{const todo=guestTodo(g);return rowItem("guests",g,{title:g.name,
      sub:esc([g.kind,g.arrival?"arrive "+fDay(g.arrival):"",g.travel,g.fee?chf(g.fee):"",memberName(g.owner)?"suivi par "+memberName(g.owner):""].filter(Boolean).join(" · "))+(todo.length?` · <b style="color:var(--warn)">reste : ${esc(todo.join(", "))}</b>`:""),
      end:statusPill(g.status,GUEST_PILL)})}).join("")}</div>`
    :emptyBox("saiyaman",gs.length?"Personne ne correspond":"Pas encore d’invité",gs.length?"Essaie un autre mot ou un autre statut.":"Note les pistes dès qu’elles apparaissent, même au stade de l’idée.",gs.length?"":addBtn("guests","Premier invité"))}</div></div>`;
};
// Tri par numéro d'emplacement (A2 avant A10), les stands sans emplacement à la fin.
const spotCmp=(a,b)=>!a.spot!==!b.spot?(a.spot?-1:1):String(a.spot||"").localeCompare(String(b.spot||""),"fr",{numeric:true})||a.name.localeCompare(b.name,"fr");
VIEWS.exposants=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Exposants","saiyaman");
  const ex=inEdition("exhibitors"),ok=ex.filter(x=>x.status==="Accepté"||x.status==="Payé");
  const xs=ex.filter(x=>(!UI.filter||x.kind===UI.filter)&&matchQ(x,["name","contactName","products","spot"])).sort(spotCmp);
  const dup=ok.filter(x=>x.spot&&ok.some(y=>y.id!==x.id&&norm(y.spot)===norm(x.spot)));
  return head("Exposants",esc(ed.name),addBtn("exhibitors","Exposant")+`<button class="btn" data-act="exportMod" data-mod="exhibitors">${ic("down")}CSV</button>`,"saiyaman")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Stands acceptés</span><b>${ok.length}</b><small>${plural(ex.filter(x=>x.status==="Candidature").length,"candidature")} à traiter</small></div>
    <div class="kpi"><span class="label">Sans emplacement</span><b style="color:${ok.some(x=>!x.spot)?"var(--warn)":"inherit"}">${ok.filter(x=>!x.spot).length}</b><small>stands acceptés à placer</small></div>
    <div class="kpi"><span class="label">Recette stands</span><b>${chf(sum(ok,x=>x.fee))}</b><small>${chf(sum(ex.filter(x=>x.status==="Payé"),x=>x.fee))} encaissés</small></div>
    <div class="kpi"><span class="label">Tables réservées</span><b>${num(sum(ok,x=>x.tables))}</b><small>${ok.filter(x=>x.power).length} avec électricité</small></div></div>
  ${dup.length?`<div class="banner" style="margin:0;background:var(--bad-bg)"><img alt="" src="${IMG.saiyaman}"><div class="grow small"><b style="color:var(--bad)">Emplacement attribué deux fois</b>${[...new Set(dup.map(x=>x.spot))].map(sp=>`<div>N° ${esc(sp)} : ${esc(dup.filter(x=>norm(x.spot)===norm(sp)).map(x=>x.name).join(", "))}</div>`).join("")}</div></div>`:""}
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher un exposant ou un n°…")}</div>
    <div class="chips" style="margin-bottom:10px"><button class="chip ${!UI.filter?"on":""}" data-act="filter" data-v="">Tous</button>${EXHIB_KINDS.filter(k=>ex.some(x=>x.kind===k)).map(k=>`<button class="chip ${UI.filter===k?"on":""}" data-act="filter" data-v="${esc(k)}">${esc(k)}</button>`).join("")}</div>
    ${xs.length?`<div class="list">${xs.map(x=>rowItem("exhibitors",x,{title:x.name,av:x.spot?String(x.spot).slice(0,4):"–",sub:esc([x.kind,x.spot?"emplacement "+x.spot:"pas d’emplacement",x.tables?plural(x.tables,"table"):"",x.fee?chf(x.fee):""].filter(Boolean).join(" · ")),
      end:statusPill(x.status,{"Payé":"good","Accepté":"info","Candidature":"warn","Refusé":"bad"})})).join("")}</div>`
    :emptyBox("saiyaman",ex.length?"Aucun exposant ne correspond":"Pas encore d’exposant","Ajoute les artistes, boutiques et associations qui tiendront un stand.",ex.length?"":addBtn("exhibitors","Premier exposant"))}</div></div>`;
};
