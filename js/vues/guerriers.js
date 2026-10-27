"use strict";
/* ---------- Guerriers Z : les membres cotisants de l'association, avec leur cotisation annuelle ---------- */
const thisYear=()=>new Date().getFullYear();
const feeYears=()=>{const y=thisYear();return [y-1,y,y+1].map(String)};
defineMod({
  key:"warriors",col:"warriors",label:"Guerriers Z",one:"Guerrier Z",img:"goku",newLabel:"Nouveau Guerrier Z",added:"Un nouveau Guerrier Z rejoint l’équipe !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Prénom et nom",req:true},
    {k:"photo",l:"Photo",type:"photo",help:"Recadrée en carré pour la vignette."},
    {k:"email",l:"E-mail",type:"email"},
    {k:"phone",l:"Téléphone",type:"tel"},
    {k:"since",l:"Guerrier Z depuis",type:"date"},
    {k:"status",l:"Statut",type:"select",options:["Actif","Inactif"],def:"Actif"},
    {k:"paid",l:"Cotisation payée",type:"checks",options:()=>feeYears().map(y=>[y,y])},
    {k:"address",l:"Adresse",type:"textarea"},
    {k:"notes",l:"Notes",type:"textarea"},
  ],
});
const feePaid=(w,y=String(thisYear()))=>(w.paid||[]).includes(y);
VIEWS.guerriers=()=>{
  const y=String(thisYear()),ws=all("warriors"),act=ws.filter(w=>w.status!=="Inactif");
  const late=act.filter(w=>!feePaid(w,y));
  const xs=ws.filter(w=>(!UI.filter||(UI.filter==="late"?late.includes(w):w.status===UI.filter))&&matchQ(w,["name","email","notes"])).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
  return head("Guerriers Z",`Membres cotisants · ${chf(CFG.memberFee)} par an`,addBtn("warriors","Guerrier Z")+`<button class="btn" data-act="exportMod" data-mod="warriors">${ic("down")}CSV</button>`,"goku")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Guerriers Z actifs</span><b>${act.length}</b><small>${plural(ws.length-act.length,"inactif")}</small></div>
    <div class="kpi"><span class="label">Cotisations ${y}</span><b>${act.filter(w=>feePaid(w,y)).length}/${act.length}</b><small>payées</small></div>
    <div class="kpi"><span class="label">Encaissé ${y}</span><b>${chf(ws.filter(w=>feePaid(w,y)).length*(+CFG.memberFee||0))}</b><small>en cotisations</small></div>
    <div class="kpi"><span class="label">À relancer</span><b style="color:${late.length?"var(--warn)":"inherit"}">${late.length}</b><small>cotisation ${y} due</small></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher un Guerrier Z…")}${late.some(w=>w.email)?`<button class="btn sm" data-act="copyMails" data-v="${esc(late.map(w=>w.email).filter(Boolean).join(", "))}">${ic("mail")}Copier les e-mails à relancer</button>`:""}</div>
  <div class="chips" style="margin-bottom:10px">${[["","Tous"],["Actif","Actifs"],["late","À relancer"],["Inactif","Inactifs"]].map(([k,l])=>`<button class="chip ${UI.filter===k?"on":""}" data-act="filter" data-v="${k}">${l}</button>`).join("")}</div>
  ${xs.length?`<div class="list">${xs.map(w=>rowItem("warriors",w,{title:w.name,sub:esc([w.email||w.phone,w.since?"depuis "+w.since.slice(0,4):""].filter(Boolean).join(" · ")),
    end:w.status==="Inactif"?`<span class="pill neutral">Inactif</span>`:feePaid(w,y)?`<span class="pill good">${y} payée</span>`:`<span class="pill warn">${y} à payer</span>`})).join("")}</div>`
  :emptyBox("goku",ws.length?"Personne ne correspond":"Pas encore de Guerrier Z","Ajoute les membres cotisants pour suivre leur cotisation chaque année.",ws.length?"":addBtn("warriors","Premier Guerrier Z"))}</div></div>`;
};
