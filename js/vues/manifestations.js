"use strict";
/* ---------- Manifestations : salons et événements où l'on vend des billets et fait la promo ---------- */
const EVENT_STATES=["Repérée","Inscription envoyée","Confirmée","Terminée","Annulée"];
const EVENT_GOALS=["Vente de billets","Promotion","Recrutement de bénévoles","Recherche de sponsors"];
defineMod({
  key:"events",col:"events",label:"Manifestations",one:"manifestation",img:"chichi",newLabel:"Nouvelle manifestation",added:"Manifestation ajoutée. Chichi prépare le stand !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Manifestation",req:true,ph:"ex. Polymanga, marché de Noël…"},
    {k:"place",l:"Lieu",ph:"Ville, salle"},
    {k:"start",l:"Du",type:"date",req:true},
    {k:"end",l:"Au",type:"date",help:"Vide si un seul jour."},
    {k:"status",l:"Statut",type:"select",options:EVENT_STATES,def:"Repérée"},
    {k:"goals",l:"Objectifs",type:"checks",options:EVENT_GOALS.map(g=>[g,g])},
    {k:"standCost",l:"Coût du stand",type:"money"},
    {k:"ticketsSold",l:"Billets vendus sur place",type:"number"},
    {k:"sales",l:"Montant des ventes",type:"money"},
    {k:"owner",l:"Responsable",type:"member"},
    {k:"team",l:"Équipe sur place",ph:"ex. Lolo, Noah, Mia"},
    {k:"contactId",l:"Contact organisateur",type:"ref",col:"contacts",ph:"Nom de la personne",help:"Choisis dans tes contacts ou écris simplement un nom."},
    docField("doc","Inscription ou contrat"),
    {k:"material",l:"Matériel à emporter",type:"textarea",wide:true,ph:"Flyers, kakémono, caisse, terminal de paiement…"},
    {k:"notes",l:"Notes",type:"textarea",wide:true},
  ],
  // Tâches reliées à cette manifestation (pôle Manifestations dans les tâches).
  sheetTop:o=>{if(!canRead("tasks"))return "";const ts=eventTasks(o.id);
    return `<div class="card" style="margin:0 0 14px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Tâches · ${ts.filter(t=>t.status!=="Fait").length} à faire</h3>${canWrite("tasks")?`<button type="button" class="btn sm" data-act="newEventTask" data-id="${o.id}">${ic("plus")}Tâche</button>`:""}</div>
    ${ts.length?`<div class="list">${ts.map(taskItem).join("")}</div>`:`<p class="small muted" style="margin:6px 0 0">Aucune tâche pour l’instant.</p>`}</div>`},
});
const eventTasks=id=>all("tasks").filter(t=>t.eventId===id).sort((a,b)=>(a.status==="Fait")-(b.status==="Fait")||((a.due||"9")<(b.due||"9")?-1:1));
const eventEnd=e=>e.end&&e.end>e.start?e.end:e.start;
VIEWS.manifestations=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Manifestations","chichi");
  const all_=inEdition("events"),live=all_.filter(e=>e.status!=="Annulée");
  const xs=all_.filter(e=>matchQ(e,["name","place","team","notes"])).sort((a,b)=>(a.start||"")<(b.start||"")?-1:1);
  const next=xs.filter(e=>e.status!=="Annulée"&&eventEnd(e)>=today()),past=xs.filter(e=>!next.includes(e)).reverse();
  const when=e=>e.start?(e.end&&e.end>e.start?`${fDay(e.start)} → ${fDay(e.end)}`:fDay(e.start)):"";
  const row=e=>rowItem("events",e,{title:e.name,av:false,
    sub:esc([when(e),e.place,(e.goals||[]).join(", "),e.ticketsSold?plural(+e.ticketsSold,"billet vendu","billets vendus"):"",e.sales?chf(e.sales):"",canRead("tasks")&&eventTasks(e.id).some(t=>t.status!=="Fait")?plural(eventTasks(e.id).filter(t=>t.status!=="Fait").length,"tâche à faire","tâches à faire"):""].filter(Boolean).join(" · ")),
    end:statusPill(e.status,{"Confirmée":"good","Inscription envoyée":"warn","Terminée":"info","Annulée":"neutral"})});
  return head("Manifestations",esc(ed.name)+" · salons et événements pour vendre des billets et faire la promo",addBtn("events","Manifestation")+`<button class="btn" data-act="exportMod" data-mod="events">${ic("down")}CSV</button>`,"chichi")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">À venir</span><b>${next.length}</b><small>${next.filter(e=>e.status==="Confirmée").length} confirmées</small></div>
    <div class="kpi"><span class="label">Billets vendus</span><b>${sum(live,e=>e.ticketsSold)}</b><small>sur les stands</small></div>
    <div class="kpi"><span class="label">Ventes</span><b>${chf(sum(live,e=>e.sales))}</b><small>encaissées sur place</small></div>
    <div class="kpi"><span class="label">Coût des stands</span><b>${chf(sum(live,e=>e.standCost))}</b><small>${plural(live.filter(e=>+e.standCost).length,"stand payant","stands payants")}</small></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher une manifestation…")}</div>
  ${xs.length?(next.length?`<h3 class="group-title">À venir <span class="muted small">· ${next.length}</span></h3><div class="list">${next.map(row).join("")}</div>`:"")+(past.length?`<h3 class="group-title">Passées ou annulées <span class="muted small">· ${past.length}</span></h3><div class="list">${past.map(row).join("")}</div>`:"")
  :emptyBox("chichi",all_.length?"Rien ne correspond":"Aucune manifestation","Salons, conventions, marchés : note où l’équipe tient un stand pour vendre des billets et parler du Dragon Ball Day.",all_.length?"":addBtn("events","Première manifestation"))}</div></div>`;
};
