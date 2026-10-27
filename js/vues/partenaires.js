"use strict";
/* ---------- Sponsors, partenaires et fournisseurs ---------- */
const SPONSOR_KINDS=["Sponsor","Partenaire","Média","Institution / subvention"];
const SPONSOR_LEVELS=["Pack Goku","Pack Vegeta","Pack Bulma","Autre"];
const SPONSOR_STATES=["Prospect","Contacté","En discussion","Signé","Payé","Refusé"];
const SPONSOR_PILL={"Payé":"good","Signé":"info","En discussion":"warn","Refusé":"bad"};
defineMod({
  key:"sponsors",col:"sponsors",label:"Sponsors & partenaires",one:"sponsor",img:"goku",newLabel:"Nouveau sponsor ou partenaire",added:"Ajouté. Que la force des Saiyans soit avec la négociation !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Entreprise ou organisation",req:true,wide:true},
    {k:"kind",l:"Type",type:"select",options:SPONSOR_KINDS,def:"Sponsor"},
    {k:"level",l:"Niveau",type:"select",options:SPONSOR_LEVELS,blank:"–"},
    {k:"status",l:"Statut",type:"select",options:SPONSOR_STATES,def:"Prospect"},
    {k:"contactId",l:"Contact",type:"ref",col:"contacts",ph:"Nom de la personne",help:"Choisis dans tes contacts ou écris simplement un nom."},
    {k:"owner",l:"Suivi par",type:"member"},
    {k:"amount",l:"Montant en argent",type:"money"},
    {k:"inKindValue",l:"Valeur en nature",type:"money",help:"Lots, matériel, services offerts (valeur estimée)."},
    {k:"next",l:"Prochaine relance",type:"date"},
    {k:"logo",l:"Logo reçu",type:"check"},
    {k:"inKind",l:"Ce qui est offert en nature",type:"textarea"},
    {k:"perks",l:"Contreparties promises",type:"textarea",ph:"Logo sur l’affiche, stand, annonces sur scène, billets…"},
    docField("invoice","Facture"),
    docField("contractFile","Contrat de partenariat"),
    {k:"notes",l:"Notes",type:"textarea",wide:true},
  ],
});
const SUPPLIER_CATS=["Salle & technique","Sono & lumière","Impression & communication","Restauration & boissons","Sécurité","Location de matériel","Décoration","Transport","Autre"];
const SUPPLIER_STATES=["Devis demandé","Devis reçu","Commandé","Livré","Payé","Abandonné"];
const ORDERED=["Commandé","Livré","Payé"];
defineMod({
  key:"suppliers",col:"suppliers",label:"Fournisseurs",one:"commande",img:"bulma",newLabel:"Nouvelle commande ou devis",added:"Noté ! Bulma garde un œil sur la livraison.",
  titleOf:o=>esc(o.item||o.name),
  fields:[
    {k:"name",l:"Fournisseur",req:true},
    {k:"item",l:"Quoi ?",req:true,ph:"ex. Sono de la grande scène"},
    {k:"cat",l:"Catégorie",type:"select",options:SUPPLIER_CATS,def:"Autre"},
    {k:"status",l:"Statut",type:"select",options:SUPPLIER_STATES,def:"Devis demandé"},
    {k:"amount",l:"Montant (devis ou facture)",type:"money"},
    {k:"deposit",l:"Acompte versé",type:"money"},
    {k:"delivery",l:"Livraison ou intervention",type:"date"},
    {k:"due",l:"Échéance de paiement",type:"date"},
    {k:"contactId",l:"Contact",type:"select",blank:"Aucun",options:refOpts("contacts")},
    {k:"owner",l:"Suivi par",type:"member"},
    docField("invoice","Devis ou facture"),
    {k:"notes",l:"Notes",type:"textarea",wide:true,ph:"Conditions, horaires de livraison, numéro de devis…"},
  ],
});

VIEWS.sponsors=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Sponsors & partenaires","goku");
  const xs=inEdition("sponsors").filter(s=>matchQ(s,["name","kind","notes","perks"]));
  const sig=inEdition("sponsors").filter(s=>s.status==="Signé"||s.status==="Payé");
  const open=inEdition("sponsors").filter(s=>["Prospect","Contacté","En discussion"].includes(s.status));
  const relance=open.filter(s=>s.next&&s.next<=addDays(today(),7)).sort((a,b)=>a.next<b.next?-1:1);
  const lanes=SPONSOR_STATES.map(st=>[st,xs.filter(s=>s.status===st)]).filter(l=>l[1].length);
  return head("Sponsors & partenaires",esc(ed.name),addBtn("sponsors","Sponsor")+`<button class="btn" data-act="exportMod" data-mod="sponsors">${ic("down")}CSV</button>`,"goku")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Signés</span><b>${sig.length}</b><small>${plural(open.length,"en cours","en cours")}</small></div>
    <div class="kpi"><span class="label">Montant signé</span><b>${chf(sum(sig,s=>s.amount))}</b><small>${chf(sum(inEdition("sponsors").filter(s=>s.status==="Payé"),s=>s.amount))} encaissés</small></div>
    <div class="kpi"><span class="label">En nature</span><b>${chf(sum(sig,s=>s.inKindValue))}</b><small>valeur estimée</small></div>
    <div class="kpi"><span class="label">Logos</span><b>${sig.filter(s=>s.logo).length}/${sig.length}</b><small>reçus pour l’affiche</small></div></div>
  ${relance.length?`<div class="banner" style="margin:0"><img alt="" src="${IMG.goku}"><div class="grow small"><b>À relancer cette semaine</b>${relance.map(s=>`<div>${esc(s.name)} · ${fDay(s.next)}</div>`).join("")}</div></div>`:""}
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher…")}</div>
  ${lanes.length?lanes.map(([st,ls])=>`<h3 class="group-title">${esc(st)} <span class="muted small">· ${ls.length}${sum(ls,s=>s.amount)?" · "+chf(sum(ls,s=>s.amount)):""}</span></h3><div class="list">${ls.sort((a,b)=>(+b.amount||0)-(+a.amount||0)).map(s=>rowItem("sponsors",s,{title:s.name,
    sub:esc([s.kind,s.level,s.amount?chf(s.amount):"",s.inKindValue?"nature "+chf(s.inKindValue):"",s.next&&!["Signé","Payé","Refusé"].includes(s.status)?"relance "+fDay(s.next):"",s.invoice?"facture jointe":""].filter(Boolean).join(" · ")),end:statusPill(s.status,SPONSOR_PILL)})).join("")}</div>`).join("")
  :emptyBox("goku",inEdition("sponsors").length?"Rien ne correspond":"Pas encore de sponsor","Ajoute les entreprises à démarcher : tu suis chaque piste jusqu’au paiement.",inEdition("sponsors").length?"":addBtn("sponsors","Premier sponsor"))}</div></div>`;
};

VIEWS.fournisseurs=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Fournisseurs & matériel","bulma");
  const all_=inEdition("suppliers");
  const xs=all_.filter(s=>(!UI.filter||s.cat===UI.filter)&&matchQ(s,["name","item","notes"])).sort((a,b)=>SUPPLIER_STATES.indexOf(a.status)-SUPPLIER_STATES.indexOf(b.status)||(a.delivery||"9")<(b.delivery||"9")?-1:1);
  const ord=all_.filter(s=>ORDERED.includes(s.status));
  const toPay=ord.filter(s=>s.status!=="Payé");
  return head("Fournisseurs & matériel",esc(ed.name),addBtn("suppliers","Commande")+`<button class="btn" data-act="exportMod" data-mod="suppliers">${ic("down")}CSV</button>`,"bulma")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Commandé</span><b>${chf(sum(ord,s=>s.amount))}</b><small>${plural(ord.length,"commande")}</small></div>
    <div class="kpi"><span class="label">Reste à payer</span><b>${chf(sum(toPay,s=>(+s.amount||0)-(+s.deposit||0)))}</b><small>${plural(toPay.length,"facture")}</small></div>
    <div class="kpi"><span class="label">Devis en attente</span><b>${all_.filter(s=>s.status==="Devis demandé").length}</b><small>${all_.filter(s=>s.status==="Devis reçu").length} reçus à décider</small></div>
    <div class="kpi"><span class="label">Livraisons</span><b>${ord.filter(s=>s.status==="Commandé"&&s.delivery).length}</b><small>à venir</small></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${searchBox("Rechercher un fournisseur…")}</div>
  <div class="chips" style="margin-bottom:10px"><button class="chip ${!UI.filter?"on":""}" data-act="filter" data-v="">Tout</button>${SUPPLIER_CATS.filter(c=>all_.some(s=>s.cat===c)).map(c=>`<button class="chip ${UI.filter===c?"on":""}" data-act="filter" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>
  ${xs.length?`<div class="list">${xs.map(s=>{const late=s.due&&s.status!=="Payé"&&ORDERED.includes(s.status)&&s.due<today();return rowItem("suppliers",s,{title:s.item||s.name,
    sub:esc([s.name,s.cat,s.amount?chf(s.amount):"",s.delivery?"livraison "+fDay(s.delivery):""].filter(Boolean).join(" · "))+(late?` · <b style="color:var(--bad)">paiement en retard</b>`:""),
    end:statusPill(s.status,{"Payé":"good","Livré":"info","Commandé":"info","Devis reçu":"warn","Abandonné":"neutral"})})}).join("")}</div>`
  :emptyBox("bulma",all_.length?"Rien ne correspond":"Aucun fournisseur","Demandes de devis, commandes, livraisons : tout ce qu’il faut louer ou acheter.",all_.length?"":addBtn("suppliers","Premier devis"))}</div></div>`;
};
