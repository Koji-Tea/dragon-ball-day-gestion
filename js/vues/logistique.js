"use strict";
/* ---------- Logement et transport des invités ---------- */
const LODGING_STATES=["Option","Réservé","Confirmé","Annulé"];
const guestOpts=refOpts("guests");
defineMod({
  key:"lodging",col:"lodging",label:"Logement",one:"réservation",img:"chichi",newLabel:"Nouvelle réservation",added:"Réservation notée. Chichi a préparé les chambres !",
  titleOf:o=>esc(o.hotel||"Réservation"),
  prefill:o=>o.total==null&&o.price?{...o,total:legacyLodging(o)}:o,
  fields:[
    {k:"guestId",l:"Pour",type:"select",blank:"Équipe / autre",options:guestOpts},
    {k:"who",l:"Ou nom de la personne",ph:"si ce n’est pas un invité"},
    {k:"hotel",l:"Hôtel ou logement",req:true,ph:"ex. Hôtel du Lac, Yverdon"},
    {k:"status",l:"Statut",type:"select",options:LODGING_STATES,def:"Option"},
    {k:"checkIn",l:"Arrivée",type:"date",req:true},
    {k:"checkOut",l:"Départ",type:"date",req:true},
    {k:"rooms",l:"Chambres",type:"number",def:1},
    {k:"total",l:"Prix total",type:"money",help:"Toutes nuits et chambres comprises."},
    {k:"ref",l:"N° de réservation"},
    {k:"paid",l:"Payé",type:"check"},
    {k:"address",l:"Adresse et contact de l’hôtel",type:"textarea",wide:true},
    docField("doc","Contrat ou confirmation de réservation"),
    {k:"notes",l:"Notes",type:"textarea",ph:"Petit-déjeuner, parking, arrivée tardive…"},
  ],
});
// Prix total saisi ; les anciennes fiches n'ont qu'un prix par chambre et par nuit, d'où le calcul de secours.
const legacyLodging=l=>nights(l.checkIn,l.checkOut)*(+l.rooms||1)*(+l.price||0);
const lodgingCost=l=>l.status==="Annulé"?0:l.total!=null&&l.total!==""?+l.total||0:legacyLodging(l);
const TRANSPORT_KINDS=["Avion","Train","Voiture","Navette de l’équipe","Taxi","Autre"];
defineMod({
  key:"transport",col:"transport",label:"Transport",one:"trajet",img:"chichi",newLabel:"Nouveau trajet",added:"Trajet ajouté.",
  titleOf:o=>esc([o.from,o.to].filter(Boolean).join(" → ")||"Trajet"),
  fields:[
    {k:"guestId",l:"Pour",type:"select",blank:"Équipe / matériel",options:guestOpts},
    {k:"kind",l:"Moyen",type:"select",options:TRANSPORT_KINDS,def:"Train"},
    {k:"date",l:"Date",type:"date",req:true},
    {k:"time",l:"Heure",type:"time"},
    {k:"from",l:"Départ",ph:"ex. Aéroport de Genève"},
    {k:"to",l:"Arrivée",ph:"ex. Hôtel du Lac"},
    {k:"ref",l:"N° de vol ou de train"},
    {k:"driver",l:"Chauffeur·euse / accueil",type:"member"},
    {k:"cost",l:"Coût",type:"money"},
    {k:"booked",l:"Billet réservé",type:"check"},
    {k:"paid",l:"Payé",type:"check"},
    docField("doc","Billet ou réservation"),
    {k:"notes",l:"Notes",type:"textarea"},
  ],
});
const forWho=o=>refName("guests",o.guestId)||o.who||"";

VIEWS.logistique=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Logement & transport","chichi");
  const tab=tabOf("logistique","planning");
  const lo=inEdition("lodging"),tr=inEdition("transport");
  let body;
  if(tab==="lodging"){
    const xs=lo.slice().sort((a,b)=>(a.checkIn||"")<(b.checkIn||"")?-1:1);
    const live=lo.filter(l=>l.status!=="Annulé");
    body=`<div class="kpis" style="margin-bottom:14px">
      <div class="kpi"><span class="label">Nuitées</span><b>${num(sum(live,l=>nights(l.checkIn,l.checkOut)*(+l.rooms||1)))}</b><small>chambres × nuits</small></div>
      <div class="kpi"><span class="label">Coût</span><b>${chf(sum(live,lodgingCost))}</b><small>${chf(sum(live.filter(l=>l.paid),lodgingCost))} payés</small></div>
      <div class="kpi"><span class="label">En option</span><b style="color:${live.some(l=>l.status==="Option")?"var(--warn)":"inherit"}">${live.filter(l=>l.status==="Option").length}</b><small>à confirmer</small></div>
      <div class="kpi"><span class="label">Hôtels</span><b>${new Set(live.map(l=>l.hotel)).size}</b><small>différents</small></div></div>
      ${xs.length?`<div class="list">${xs.map(l=>rowItem("lodging",l,{title:forWho(l)||l.hotel,av:false,
        sub:esc([l.hotel,`${fDay(l.checkIn)} → ${fDay(l.checkOut)}`,plural(nights(l.checkIn,l.checkOut),"nuit"),lodgingCost(l)?chf(lodgingCost(l)):""].filter(Boolean).join(" · ")),
        end:statusPill(l.status,{"Confirmé":"good","Réservé":"info","Option":"warn","Annulé":"bad"})})).join("")}</div>`
      :emptyBox("chichi","Aucune réservation","Note les chambres réservées pour les invités et l’équipe.",addBtn("lodging","Réservation"))}`;
  }else if(tab==="transport"){
    const xs=tr.slice().sort((a,b)=>((a.date||"")+(a.time||""))<((b.date||"")+(b.time||""))?-1:1);
    body=xs.length?`<div class="list">${xs.map(t=>rowItem("transport",t,{title:`${forWho(t)||"Équipe"} · ${t.kind}`,av:false,
      sub:esc([fDay(t.date)+(t.time?" "+t.time:""),[t.from,t.to].filter(Boolean).join(" → "),t.ref,memberName(t.driver)?"avec "+memberName(t.driver):"",t.cost?chf(t.cost):""].filter(Boolean).join(" · ")),
      end:t.booked?`<span class="pill good">Réservé</span>`:`<span class="pill warn">À réserver</span>`})).join("")}</div>`
      :emptyBox("chichi","Aucun trajet","Vols, trains et navettes de l’équipe pour aller chercher les invités.",addBtn("transport","Trajet"));
  }else{
    // Planning : arrivées, nuits et départs de chaque invité confirmé, jour par jour.
    const ev=[];
    tr.forEach(t=>ev.push({d:t.date,t:t.time||"",txt:`${t.kind}${t.ref?" "+t.ref:""} : ${[t.from,t.to].filter(Boolean).join(" → ")}`,who:forWho(t)||"Équipe",key:"transport",o:t}));
    lo.filter(l=>l.status!=="Annulé").forEach(l=>{ev.push({d:l.checkIn,t:"",txt:`Arrivée à l’hôtel : ${l.hotel}`,who:forWho(l),key:"lodging",o:l});ev.push({d:l.checkOut,t:"",txt:`Départ de l’hôtel : ${l.hotel}`,who:forWho(l),key:"lodging",o:l})});
    const days=[...new Set(ev.map(e=>e.d).filter(Boolean))].sort();
    const missing=inEdition("guests").filter(g=>g.status==="Confirmé").map(g=>[g,guestTodo(g).filter(x=>x==="logement"||x==="transport")]).filter(x=>x[1].length);
    body=(missing.length?`<div class="banner"><img alt="" src="${IMG.chichi}"><div class="grow small"><b>Invités confirmés sans tout le nécessaire</b>${missing.map(([g,m])=>`<div>${esc(g.name)} : ${esc(m.join(" et "))} à organiser</div>`).join("")}</div></div>`:"")+
      (days.length?days.map(d=>`<h3 class="group-title">${fLong(d)}</h3><div class="list">${ev.filter(e=>e.d===d).sort((a,b)=>a.t<b.t?-1:1).map(e=>`<div class="item click" data-act="openRecord" data-mod="${e.key}" data-id="${e.o.id}"><span class="pill neutral" style="min-width:52px;justify-content:center">${esc(e.t||"–")}</span><div class="main"><b>${esc(e.who||"–")}</b><span class="small muted">${esc(e.txt)}</span></div></div>`).join("")}</div>`).join("")
      :emptyBox("chichi","Rien de prévu pour l’instant","Ajoute une réservation d’hôtel ou un trajet : le planning se remplit tout seul.",addBtn("lodging","Réservation")+addBtn("transport","Trajet","")));
  }
  const key=tab==="transport"?"transport":"lodging";
  return head("Logement & transport",esc(ed.name),addBtn("lodging","Réservation",tab==="transport"?"":"primary")+addBtn("transport","Trajet",tab==="transport"?"primary":"")+(tab!=="planning"?`<button class="btn" data-act="exportMod" data-mod="${key}">${ic("down")}CSV</button>`:""),"chichi")+
    `<div class="card"><div style="margin-bottom:14px">${segTabs("logistique",[["planning","Planning"],["lodging",`Hôtels · ${lo.length}`],["transport",`Trajets · ${tr.length}`]],"planning")}</div>${body}</div>`;
};
