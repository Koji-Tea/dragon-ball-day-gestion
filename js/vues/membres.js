"use strict";
/* ---------- Membres de l'association (indépendants des éditions). Les cotisants sont les Guerriers Z (guerriers.js). ---------- */
const ASSO_ROLES=["Président·e","Vice-président·e","Trésorier·ère","Secrétaire","Membre du comité","Membre","Membre d’honneur"];
defineMod({
  key:"members",col:"members",label:"Membres",one:"membre",img:"chichi",newLabel:"Nouveau membre",added:"Bienvenue dans l’association !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Prénom et nom",req:true},
    {k:"photo",l:"Photo",type:"photo",help:"Recadrée en carré pour la vignette."},
    {k:"assoRole",l:"Fonction",type:"select",options:ASSO_ROLES,def:"Membre"},
    {k:"email",l:"E-mail",type:"email"},
    {k:"phone",l:"Téléphone",type:"tel"},
    {k:"since",l:"Membre depuis",type:"date"},
    {k:"status",l:"Statut",type:"select",options:["Actif","Inactif"],def:"Actif"},
    {k:"address",l:"Adresse",type:"textarea"},
    {k:"notes",l:"Notes",type:"textarea"},
  ],
});
VIEWS.membres=()=>{
  const ms=all("members"),act=ms.filter(m=>m.status!=="Inactif");
  const board=act.filter(m=>m.assoRole!=="Membre"&&m.assoRole!=="Membre d’honneur");
  const xs=ms.filter(m=>(!UI.filter||(UI.filter==="board"?board.includes(m):m.status===UI.filter))&&matchQ(m,["name","email","assoRole","notes"]))
    .sort((a,b)=>ASSO_ROLES.indexOf(a.assoRole)-ASSO_ROLES.indexOf(b.assoRole)||a.name.localeCompare(b.name,"fr"));
  return head("Membres",esc(CFG.assoName),addBtn("members","Membre")+`<button class="btn" data-act="exportMod" data-mod="members">${ic("down")}CSV</button>`,"chichi")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Membres actifs</span><b>${act.length}</b><small>${plural(ms.length-act.length,"inactif")}</small></div>
    <div class="kpi"><span class="label">Comité</span><b>${board.length}</b><small>avec une fonction</small></div>
    <div class="kpi"><span class="label">Membres d’honneur</span><b>${act.filter(m=>m.assoRole==="Membre d’honneur").length}</b><small>actifs</small></div>
    <div class="kpi"><span class="label">Guerriers Z</span><b>${canRead("warriors")?all("warriors").filter(w=>w.status!=="Inactif").length:"–"}</b><small>membres cotisants</small></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher un membre…")}${act.some(m=>m.email)?`<button class="btn sm" data-act="copyMails" data-v="${esc(act.map(m=>m.email).filter(Boolean).join(", "))}">${ic("mail")}Copier les e-mails</button>`:""}</div>
  <div class="chips" style="margin-bottom:10px">${[["","Tous"],["Actif","Actifs"],["board","Comité"],["Inactif","Inactifs"]].map(([k,l])=>`<button class="chip ${UI.filter===k?"on":""}" data-act="filter" data-v="${k}">${l}</button>`).join("")}</div>
  ${xs.length?`<div class="list">${xs.map(m=>rowItem("members",m,{title:m.name,sub:esc([m.assoRole,m.email||m.phone,m.since?"depuis "+m.since.slice(0,4):""].filter(Boolean).join(" · ")),
    end:m.status==="Inactif"?`<span class="pill neutral">Inactif</span>`:m.assoRole==="Membre d’honneur"?`<span class="pill info">Honneur</span>`:""})).join("")}</div>`
  :emptyBox("chichi",ms.length?"Personne ne correspond":"Pas encore de membre","Ajoute les membres de l’association et leur fonction.",ms.length?"":addBtn("members","Premier membre"))}</div></div>`;
};
