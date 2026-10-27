"use strict";
/* ---------- Membres de l'association et cotisations (indépendants des éditions) ---------- */
const ASSO_ROLES=["Président·e","Vice-président·e","Trésorier·ère","Secrétaire","Membre du comité","Membre","Membre d’honneur"];
const thisYear=()=>new Date().getFullYear();
const feeYears=()=>{const y=thisYear();return [y-1,y,y+1].map(String)};
defineMod({
  key:"members",col:"members",label:"Membres",one:"membre",img:"chichi",newLabel:"Nouveau membre",added:"Bienvenue dans l’association !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Prénom et nom",req:true},
    {k:"assoRole",l:"Fonction",type:"select",options:ASSO_ROLES,def:"Membre"},
    {k:"email",l:"E-mail",type:"email"},
    {k:"phone",l:"Téléphone",type:"tel"},
    {k:"since",l:"Membre depuis",type:"date"},
    {k:"status",l:"Statut",type:"select",options:["Actif","Inactif"],def:"Actif"},
    {k:"paid",l:"Cotisations payées",type:"checks",options:()=>feeYears().map(y=>[y,y])},
    {k:"address",l:"Adresse",type:"textarea"},
    {k:"notes",l:"Notes",type:"textarea"},
  ],
});
const feePaid=(m,y=String(thisYear()))=>(m.paid||[]).includes(y);
VIEWS.membres=()=>{
  const y=String(thisYear()),ms=all("members"),act=ms.filter(m=>m.status!=="Inactif");
  const late=act.filter(m=>!feePaid(m,y)&&m.assoRole!=="Membre d’honneur");
  const xs=ms.filter(m=>(!UI.filter||(UI.filter==="late"?late.includes(m):m.status===UI.filter))&&matchQ(m,["name","email","assoRole","notes"]))
    .sort((a,b)=>ASSO_ROLES.indexOf(a.assoRole)-ASSO_ROLES.indexOf(b.assoRole)||a.name.localeCompare(b.name,"fr"));
  return head("Membres & cotisations",`${CFG.assoName} · cotisation ${chf(CFG.memberFee)} par an`,addBtn("members","Membre")+`<button class="btn" data-act="exportMod" data-mod="members">${ic("down")}CSV</button>`,"chichi")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Membres actifs</span><b>${act.length}</b><small>${act.filter(m=>m.assoRole!=="Membre"&&m.assoRole!=="Membre d’honneur").length} au comité</small></div>
    <div class="kpi"><span class="label">Cotisations ${y}</span><b>${act.filter(m=>feePaid(m,y)).length}/${act.length}</b><small>payées</small></div>
    <div class="kpi"><span class="label">Encaissé ${y}</span><b>${chf(ms.filter(m=>feePaid(m,y)).length*(+CFG.memberFee||0))}</b><small>en cotisations</small></div>
    <div class="kpi"><span class="label">À relancer</span><b style="color:${late.length?"var(--warn)":"inherit"}">${late.length}</b><small>cotisation ${y} due</small></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher un membre…")}${late.some(m=>m.email)?`<button class="btn sm" data-act="copyMails" data-v="${esc(late.map(m=>m.email).filter(Boolean).join(", "))}">${ic("mail")}Copier les e-mails à relancer</button>`:""}</div>
  <div class="chips" style="margin-bottom:10px">${[["","Tous"],["Actif","Actifs"],["late","À relancer"],["Inactif","Inactifs"]].map(([k,l])=>`<button class="chip ${UI.filter===k?"on":""}" data-act="filter" data-v="${k}">${l}</button>`).join("")}</div>
  ${xs.length?`<div class="list">${xs.map(m=>rowItem("members",m,{title:m.name,sub:esc([m.assoRole,m.email||m.phone,m.since?"depuis "+m.since.slice(0,4):""].filter(Boolean).join(" · ")),
    end:m.status==="Inactif"?`<span class="pill neutral">Inactif</span>`:m.assoRole==="Membre d’honneur"?`<span class="pill info">Honneur</span>`:feePaid(m,y)?`<span class="pill good">${y} payé</span>`:`<span class="pill warn">${y} à payer</span>`})).join("")}</div>`
  :emptyBox("chichi",ms.length?"Personne ne correspond":"Pas encore de membre","Ajoute les membres de l’association pour suivre les cotisations.",ms.length?"":addBtn("members","Premier membre"))}</div></div>`;
};
