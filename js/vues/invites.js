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
    {k:"arrival",l:"Arrivée",type:"date"},
    {k:"departure",l:"Départ",type:"date"},
    {k:"fee",l:"Cachet",type:"money",help:"Laisse vide si l’invité vient sans cachet."},
    {k:"feePaid",l:"Cachet payé",type:"check"},
    {k:"contract",l:"Contrat signé",type:"check"},
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
  key:"exhibitors",col:"exhibitors",label:"Artistes & exposants",one:"stand",img:"saiyaman",newLabel:"Nouveau stand",added:"Stand ajouté.",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Nom du stand ou de l’artiste",req:true,wide:true},
    {k:"kind",l:"Type",type:"select",options:EXHIB_KINDS,def:"Exposant"},
    {k:"status",l:"Statut",type:"select",options:EXHIB_STATES,def:"Candidature"},
    {k:"contactName",l:"Personne de contact"},
    {k:"email",l:"E-mail",type:"email"},
    {k:"phone",l:"Téléphone",type:"tel"},
    {k:"tables",l:"Tables",type:"number"},
    {k:"spot",l:"Emplacement",ph:"ex. A12, allée des artistes"},
    {k:"fee",l:"Prix du stand",type:"money",help:"Ce que le stand paie à l’association."},
    {k:"power",l:"Besoin d’électricité",type:"check"},
    {k:"products",l:"Ce qui est vendu ou présenté",type:"textarea",wide:true},
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
  const ed=currentEdition();if(!ed)return noEdition("Invités & exposants","saiyaman");
  const tab=tabOf("invites","guests");
  const gs=inEdition("guests"),ex=inEdition("exhibitors");
  const conf=gs.filter(g=>g.status==="Confirmé");
  const tabs=segTabs("invites",[["guests",`Invités · ${gs.length}`],["exhibitors",`Artistes & exposants · ${ex.length}`]],"guests");
  let body;
  if(tab==="guests"){
    const xs=gs.filter(g=>(!UI.filter||g.status===UI.filter)&&matchQ(g,["name","kind","notes"])).sort((a,b)=>GUEST_STATES.indexOf(b.status)-GUEST_STATES.indexOf(a.status)||a.name.localeCompare(b.name,"fr"));
    body=`<div class="kpis" style="margin-bottom:14px">
      <div class="kpi"><span class="label">Confirmés</span><b>${conf.length}</b><small>sur ${plural(gs.filter(g=>g.status!=="Annulé").length,"piste")}</small></div>
      <div class="kpi"><span class="label">Cachets</span><b>${chf(sum(conf,g=>g.fee))}</b><small>${chf(sum(conf.filter(g=>g.feePaid),g=>g.fee))} déjà payés</small></div>
      <div class="kpi"><span class="label">Contrats</span><b>${conf.filter(g=>g.contract).length}/${conf.length}</b><small>signés</small></div>
      <div class="kpi"><span class="label">Annoncés</span><b>${conf.filter(g=>g.announced).length}</b><small>au public</small></div></div>
      <div class="row" style="margin-bottom:10px">${searchBox("Rechercher un invité…")}</div>
      <div class="chips" style="margin-bottom:10px"><button class="chip ${!UI.filter?"on":""}" data-act="filter" data-v="">Tous</button>${GUEST_STATES.filter(s=>gs.some(g=>g.status===s)).map(s=>`<button class="chip ${UI.filter===s?"on":""}" data-act="filter" data-v="${esc(s)}">${esc(s)} · ${gs.filter(g=>g.status===s).length}</button>`).join("")}</div>
      ${xs.length?`<div class="list">${xs.map(g=>{const todo=guestTodo(g);return rowItem("guests",g,{title:g.name,
        sub:esc([g.kind,g.arrival?"arrive "+fDay(g.arrival):"",g.fee?chf(g.fee):""].filter(Boolean).join(" · "))+(todo.length?` · <b style="color:var(--warn)">reste : ${esc(todo.join(", "))}</b>`:""),
        end:statusPill(g.status,GUEST_PILL)})}).join("")}</div>`
      :emptyBox("saiyaman",gs.length?"Personne ne correspond":"Pas encore d’invité",gs.length?"Essaie un autre mot ou un autre statut.":"Note les pistes dès qu’elles apparaissent, même au stade de l’idée.",gs.length?"":addBtn("guests","Premier invité"))}`;
  }else{
    const xs=ex.filter(x=>(!UI.filter||x.kind===UI.filter)&&matchQ(x,["name","contactName","products","spot"])).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
    const ok=ex.filter(x=>x.status==="Accepté"||x.status==="Payé");
    body=`<div class="kpis" style="margin-bottom:14px">
      <div class="kpi"><span class="label">Stands acceptés</span><b>${ok.length}</b><small>${plural(ex.filter(x=>x.status==="Candidature").length,"candidature")} à traiter</small></div>
      <div class="kpi"><span class="label">Tables</span><b>${num(sum(ok,x=>x.tables))}</b><small>à installer</small></div>
      <div class="kpi"><span class="label">Recette stands</span><b>${chf(sum(ok,x=>x.fee))}</b><small>${chf(sum(ex.filter(x=>x.status==="Payé"),x=>x.fee))} encaissés</small></div>
      <div class="kpi"><span class="label">Électricité</span><b>${ok.filter(x=>x.power).length}</b><small>stands à raccorder</small></div></div>
      <div class="row" style="margin-bottom:10px">${searchBox("Rechercher un stand…")}</div>
      <div class="chips" style="margin-bottom:10px"><button class="chip ${!UI.filter?"on":""}" data-act="filter" data-v="">Tous</button>${EXHIB_KINDS.filter(k=>ex.some(x=>x.kind===k)).map(k=>`<button class="chip ${UI.filter===k?"on":""}" data-act="filter" data-v="${esc(k)}">${esc(k)}</button>`).join("")}</div>
      ${xs.length?`<div class="list">${xs.map(x=>rowItem("exhibitors",x,{title:x.name,sub:esc([x.kind,x.spot,x.tables?plural(x.tables,"table"):"",x.fee?chf(x.fee):""].filter(Boolean).join(" · ")),
        end:statusPill(x.status,{"Payé":"good","Accepté":"info","Candidature":"warn","Refusé":"bad"})})).join("")}</div>`
      :emptyBox("saiyaman",ex.length?"Aucun stand ne correspond":"Pas encore de stand","Ajoute les artistes, boutiques et associations qui tiendront un stand.",ex.length?"":addBtn("exhibitors","Premier stand"))}`;
  }
  const key=tab==="guests"?"guests":"exhibitors";
  return head("Invités & exposants",esc(ed.name),addBtn(key,key==="guests"?"Invité":"Stand")+`<button class="btn" data-act="exportMod" data-mod="${key}">${ic("down")}CSV</button>`,"saiyaman")+
    `<div class="card"><div style="margin-bottom:14px">${tabs}</div>${body}</div>`;
};
