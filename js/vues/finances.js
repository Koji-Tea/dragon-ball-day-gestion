"use strict";
/* ---------- Budget et comptabilité de l'édition ----------
   Prévu : les lignes du budget. Engagé : ce qui est signé ou commandé. Payé : ce qui est réellement sorti ou entré.
   Les montants des autres modules (cachets, hôtels, fournisseurs, sponsors, stands, billetterie) arrivent tout seuls. */
const EXP_CATS=["Invités & cachets","Logement","Transport","Salle & technique","Fournisseurs & matériel","Programme & activités","Communication","Bénévoles","Assurances & autorisations","Frais de billetterie & banque","Divers"];
const REV_CATS=["Billetterie","Sponsors & partenaires","Stands & exposants","Bar & restauration","Subventions","Dons","Divers recettes"];
const catKind=c=>REV_CATS.includes(c)?"Recette":"Dépense";
const CAT_OPTS=()=>[...EXP_CATS.map(c=>[c,"Dépense · "+c]),...REV_CATS.map(c=>[c,"Recette · "+c])];
const SUPPLIER_TO_CAT={"Salle & technique":"Salle & technique","Sono & lumière":"Salle & technique","Impression & communication":"Communication","Transport":"Transport"};
defineMod({
  key:"budget",col:"budget",label:"Budget prévu",one:"ligne de budget",img:"freezer",newLabel:"Nouvelle ligne de budget",added:"Ligne de budget ajoutée.",
  titleOf:o=>esc(o.label||o.cat),
  fields:[
    {k:"cat",l:"Catégorie",type:"select",options:CAT_OPTS,wide:true},
    {k:"label",l:"Détail",ph:"ex. Cachets des invités principaux"},
    {k:"planned",l:"Montant prévu",type:"money",req:true},
    {k:"notes",l:"Notes",type:"textarea",wide:true},
  ],
});
defineMod({
  key:"entries",col:"entries",label:"Écritures",one:"écriture",img:"freezer",newLabel:"Nouvelle écriture",added:"Écriture enregistrée. Freezer compte chaque centime.",
  titleOf:o=>esc(o.label),
  fields:[
    {k:"label",l:"Libellé",req:true,wide:true,ph:"ex. Assurance RC manifestation"},
    {k:"cat",l:"Catégorie",type:"select",options:CAT_OPTS,wide:true},
    {k:"amount",l:"Montant",type:"money",req:true},
    {k:"date",l:"Date",type:"date"},
    {k:"paid",l:"Payé / encaissé",type:"check"},
    {k:"method",l:"Moyen",type:"select",options:["Virement","TWINT","Espèces","Carte","Autre"],blank:"–"},
    {k:"ref",l:"N° de facture ou de pièce"},
    {k:"notes",l:"Notes",type:"textarea",wide:true},
  ],
});
// Toutes les lignes de l'édition : saisies à la main ou venues des autres modules.
function ledger(){return memo("ledger",()=>{
  const L=[],add=(cat,label,amount,paidAmt,key,o)=>{if(+amount)L.push({cat,kind:catKind(cat),label,amount:+amount,paid:Math.min(+paidAmt||0,+amount),key,id:o.id,date:o.date||o.day||o.checkIn||o.delivery||""})};
  const r=c=>canRead(c)?inEdition(c):[];
  r("guests").filter(g=>g.status==="Confirmé").forEach(g=>add("Invités & cachets","Cachet · "+g.name,g.fee,g.feePaid?g.fee:0,"guests",g));
  r("lodging").filter(l=>l.status==="Réservé"||l.status==="Confirmé").forEach(l=>add("Logement",`${l.hotel}${forWho(l)?" · "+forWho(l):""}`,lodgingCost(l),l.paid?lodgingCost(l):0,"lodging",l));
  r("transport").filter(t=>t.booked).forEach(t=>add("Transport",`${t.kind}${forWho(t)?" · "+forWho(t):""}`,t.cost,t.paid?t.cost:0,"transport",t));
  r("suppliers").filter(s=>ORDERED.includes(s.status)).forEach(s=>add(SUPPLIER_TO_CAT[s.cat]||"Fournisseurs & matériel",`${s.item} · ${s.name}`,s.amount,s.status==="Payé"?s.amount:s.deposit,"suppliers",s));
  r("activities").forEach(a=>add("Programme & activités",a.title,a.cost,0,"activities",a));
  r("sponsors").filter(s=>s.status==="Signé"||s.status==="Payé").forEach(s=>add("Sponsors & partenaires",s.name,s.amount,s.status==="Payé"?s.amount:0,"sponsors",s));
  r("exhibitors").filter(x=>x.status==="Accepté"||x.status==="Payé").forEach(x=>add("Stands & exposants",x.name,x.fee,x.status==="Payé"?x.fee:0,"exhibitors",x));
  if(canRead("ticketing")){const t=ticketTotals();if(t.gross){add("Billetterie","Ventes de billets (Infomaniak)",t.gross,t.gross,"",{id:""});add("Frais de billetterie & banque","Frais Infomaniak estimés",t.fees,t.fees,"",{id:""})}}
  r("entries").forEach(e=>add(e.cat||"Divers",e.label,e.amount,e.paid?e.amount:0,"entries",e));
  return L;
})}
function moneyRows(cats,L,B){
  return cats.map(c=>{const ls=L.filter(l=>l.cat===c),pl=sum(B.filter(b=>b.cat===c),b=>b.planned);return {c,pl,en:sum(ls,l=>l.amount),pa:sum(ls,l=>l.paid)}}).filter(r=>r.pl||r.en);
}
function moneyTable(title,rows,exp){
  if(!rows.length)return `<h3 class="group-title">${title}</h3><p class="small muted">Rien pour l’instant.</p>`;
  const tot=k=>sum(rows,r=>r[k]);
  return `<h3 class="group-title">${title}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Catégorie</th><th class="n">Prévu</th><th class="n">${exp?"Engagé":"Attendu"}</th><th class="n">${exp?"Payé":"Encaissé"}</th><th class="meter-col" aria-label="Avancement"></th></tr></thead><tbody>
    ${rows.map(r=>{const over=exp&&r.pl&&r.en>r.pl;const pct=r.pl?Math.min(100,r.en/r.pl*100):r.en?100:0;
      return `<tr><td>${esc(r.c)}${over?` <span class="pill bad">dépassé de ${chf(r.en-r.pl)}</span>`:""}</td><td class="n">${r.pl?chf(r.pl):"–"}</td><td class="n">${chf(r.en)}</td><td class="n">${chf(r.pa)}</td>
      <td class="meter-col"><span class="meter ${over?"over":""}" title="${exp?"Engagé":"Attendu"} : ${Math.round(r.pl?r.en/r.pl*100:100)} % du prévu"><i style="width:${pct}%"></i></span></td></tr>`}).join("")}
    </tbody><tfoot><tr><td>Total</td><td class="n">${chf(tot("pl"))}</td><td class="n">${chf(tot("en"))}</td><td class="n">${chf(tot("pa"))}</td><td></td></tr></tfoot></table></div>`;
}
VIEWS.budget=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Budget & comptabilité","freezer");
  const tab=tabOf("budget","overview");
  const L=ledger(),B=inEdition("budget");
  const exp=moneyRows(EXP_CATS,L,B),rev=moneyRows(REV_CATS,L,B);
  const T=(rows,k)=>sum(rows,r=>r[k]);
  const planned=T(rev,"pl")-T(exp,"pl"),committed=T(rev,"en")-T(exp,"en"),cash=T(rev,"pa")-T(exp,"pa"),toPay=T(exp,"en")-T(exp,"pa");
  const sign=n=>`<b style="color:${n<0?"var(--bad)":"var(--good)"}">${n>0?"+":""}${chf(n)}</b>`;
  let body;
  if(tab==="overview"){
    body=(B.length?"":`<div class="banner"><img alt="" src="${IMG.freezer}"><div class="grow small"><b>Pas encore de budget prévu</b><div class="muted">Ajoute une ligne par catégorie pour comparer le prévu et le réel. Les montants engagés arrivent déjà tout seuls depuis les autres modules.</div></div>${addBtn("budget","Ligne de budget","sm")}</div>`)+
      moneyTable("Dépenses",exp,true)+moneyTable("Recettes",rev,false);
  }else if(tab==="lines"){
    const xs=L.filter(l=>(!UI.filter||l.kind===UI.filter)&&matchQ(l,["label","cat"])).sort((a,b)=>(b.date||"")<(a.date||"")?-1:1);
    const SRC={guests:"Invités",lodging:"Logement",transport:"Transport",suppliers:"Fournisseurs",activities:"Programme",sponsors:"Sponsors",exhibitors:"Stands",entries:"Saisie",'':"Billetterie"};
    body=`<div class="row" style="margin-bottom:10px">${searchBox("Rechercher une écriture…")}<div class="chips">${[["","Tout"],["Dépense","Dépenses"],["Recette","Recettes"]].map(([k,l])=>`<button class="chip ${UI.filter===k?"on":""}" data-act="filter" data-v="${k}">${l}</button>`).join("")}</div></div>
      ${xs.length?`<div class="list">${xs.map(l=>`<div class="item ${l.key?"click":""}" ${l.key?`data-act="openRecord" data-mod="${l.key}" data-id="${l.id}"`:""}><div class="main"><b>${esc(l.label)}</b><span class="small muted">${esc([l.cat,SRC[l.key],l.date?fDate(l.date):""].filter(Boolean).join(" · "))}</span></div>
        <div class="end"><b class="num" style="color:${l.kind==="Recette"?"var(--good)":"inherit"}">${l.kind==="Recette"?"+":"−"}${chf(l.amount)}</b><br>${l.paid>=l.amount?`<span class="pill good">${l.kind==="Recette"?"Encaissé":"Payé"}</span>`:l.paid?`<span class="pill warn">${chf(l.paid)} ${l.kind==="Recette"?"encaissés":"payés"}</span>`:`<span class="pill neutral">${l.kind==="Recette"?"À encaisser":"À payer"}</span>`}</div></div>`).join("")}</div>`
      :emptyBox("freezer","Aucune écriture","Les cachets, hôtels, commandes, sponsors et ventes de billets apparaîtront ici. Ajoute le reste à la main.",addBtn("entries","Écriture"))}`;
  }else{
    const xs=B.slice().sort((a,b)=>CAT_OPTS().findIndex(c=>c[0]===a.cat)-CAT_OPTS().findIndex(c=>c[0]===b.cat));
    body=xs.length?`<div class="list">${xs.map(b=>rowItem("budget",b,{title:b.label||b.cat,av:false,sub:esc(catKind(b.cat)+" · "+b.cat),end:`<b class="num">${chf(b.planned)}</b>`})).join("")}</div>`
      :emptyBox("freezer","Pas encore de budget","Une ligne par poste : cachets, salle, technique, communication, billetterie, sponsors…",addBtn("budget","Première ligne"));
  }
  return head("Budget & comptabilité",esc(ed.name),addBtn("entries","Écriture")+addBtn("budget","Budget","")+`<button class="btn" data-act="exportLedger">${ic("down")}CSV</button>`,"freezer")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Résultat prévu</span>${sign(planned)}<small>selon le budget</small></div>
    <div class="kpi"><span class="label">Résultat engagé</span>${sign(committed)}<small>signé, commandé, vendu</small></div>
    <div class="kpi"><span class="label">Trésorerie</span>${sign(cash)}<small>réellement payé et encaissé</small></div>
    <div class="kpi"><span class="label">Reste à payer</span><b>${chf(toPay)}</b><small>factures engagées</small></div></div>
  <div class="card"><div style="margin-bottom:6px">${segTabs("budget",[["overview","Prévu et réel"],["lines",`Écritures · ${L.length}`],["plan",`Budget prévu · ${B.length}`]],"overview")}</div>${body}</div></div>`;
};
