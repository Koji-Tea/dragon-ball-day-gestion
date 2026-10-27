"use strict";
/* ---------- Billetterie Infomaniak ----------
   On importe l'export CSV des ventes (Infomaniak Manager > Billetterie > Ventes > Exporter).
   Seuls des totaux par jour et par tarif sont gardés : aucune donnée personnelle des acheteurs n'est enregistrée. */
function ticketTotals(){return memo("ticketTotals",()=>{
  const ed=currentEdition(),rows=inEdition("ticketing").flatMap(l=>l.rows||[]);
  const gross=sum(rows,r=>r.a),qty=sum(rows,r=>r.q),pct=+(ed&&ed.ticketFeePct)||0;
  const byT={};rows.forEach(r=>{const t=byT[r.t]||(byT[r.t]={t:r.t,q:0,a:0});t.q+=+r.q||0;t.a+=+r.a||0});
  return {rows,gross,qty,fees:Math.round(gross*pct)/100,pct,byTarif:Object.values(byT).sort((a,b)=>b.q-a.q)};
})}
/* --- Lecture du fichier --- */
function parseCSV(txt){
  txt=txt.replace(/^﻿/,"");
  const first=txt.split(/\r?\n/)[0]||"",sep=[";","\t",","].map(s=>[s,first.split(s).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;else if(c===sep){row.push(cur);cur=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&txt[i+1]==="\n")i++;row.push(cur);cur="";if(row.some(x=>x.trim()))rows.push(row);row=[]}else cur+=c}
  row.push(cur);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
const parseMoney=s=>{s=String(s||"").replace(/[^0-9,.\-]/g,"");if(s.includes(",")&&s.includes("."))s=s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");else s=s.replace(",",".");return +s||0};
const parseDay=s=>{s=String(s||"");let m=s.match(/(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);if(m){const y=m[3].length===2?"20"+m[3]:m[3];return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}return ""};
// Devine les colonnes d'après leurs titres ; la personne peut corriger avant d'importer.
const COL_GUESS={date:/date|cr[ée]{1,2}|achat|commande|vente|order|purchase/i,tarif:/tarif|cat[ée]gorie|billet|ticket|type|price ?name|offre/i,amount:/montant|prix|total|amount|price|chf/i,qty:/quantit|qt[ée]|nombre|qty|quantity|nb/i};
let TI=null;
function ticketImportSheet(name,txt){
  const rows=parseCSV(txt);if(rows.length<2){toast("Ce fichier ne contient pas de ventes lisibles.","freezer");return}
  const hd=rows[0].map(h=>h.trim()),guess={};
  Object.entries(COL_GUESS).forEach(([k,re])=>{const i=hd.findIndex((h,j)=>re.test(h)&&!Object.values(guess).includes(j));guess[k]=i});
  if(guess.amount>=0&&guess.tarif===guess.amount)guess.tarif=-1;
  TI={name,hd,rows:rows.slice(1)};
  const sel=(k,l,opt0)=>`<div class="f"><label for="ti_${k}">${l}</label><select id="ti_${k}" name="${k}">${opt0?`<option value="-1">${opt0}</option>`:""}${hd.map((h,i)=>opt(String(i),h||"Colonne "+(i+1),String(guess[k]))).join("")}</select></div>`;
  openSheet(sheetHead("Importer les ventes","goku")+`<form data-submit="ticketImport"><p class="small muted" style="margin-top:0"><b>${esc(name)}</b> · ${plural(TI.rows.length,"ligne")}. Vérifie quelle colonne correspond à quoi. Les noms et e-mails des acheteurs ne sont pas importés.</p>
    <div class="fields">${sel("date","Date de la vente")}${sel("tarif","Tarif ou catégorie","Un seul tarif")}${sel("amount","Montant payé")}${sel("qty","Quantité","1 billet par ligne")}</div>
    <div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr>${hd.slice(0,6).map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${TI.rows.slice(0,4).map(r=>`<tr>${r.slice(0,6).map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <label class="check" style="margin-top:14px"><input type="checkbox" name="replace" checked> Remplacer les imports précédents de cette édition</label>
    <div class="formfoot"><span></span><button class="btn primary">Importer</button></div></form>`);
}
function saveTicketImport(form){
  const ed=currentEdition();if(!ed||!TI)return;
  const f=Object.fromEntries(new FormData(form)),ix=k=>+f[k];
  const agg={};let skipped=0;
  TI.rows.forEach(r=>{const d=parseDay(r[ix("date")]),t=ix("tarif")>=0?(r[ix("tarif")]||"").trim()||"Billet":"Billet",q=ix("qty")>=0?(parseMoney(r[ix("qty")])||0):1,a=parseMoney(r[ix("amount")]);
    if(!d||(!q&&!a)){skipped++;return}const k=d+"|"+t;const x=agg[k]||(agg[k]={d,t,q:0,a:0});x.q+=q;x.a+=a});
  const rows=Object.values(agg).map(x=>({...x,a:Math.round(x.a*100)/100}));
  if(!rows.length){toast("Aucune vente trouvée : vérifie la colonne de date.","freezer");return}
  if(f.replace)inEdition("ticketing").filter(l=>l.source==="Import").forEach(l=>del("ticketing",l.id));
  put("ticketing",{editionId:ed.id,source:"Import",label:TI.name,rows,count:TI.rows.length-skipped,demo:false});
  TI=null;closeSheet();toast(`${plural(sum(rows,r=>r.q),"billet")} importés${skipped?` (${plural(skipped,"ligne ignorée","lignes ignorées")})`:""}.`,"goku");
}
function ticketManualSheet(){
  openSheet(sheetHead("Ajouter des ventes à la main","goku")+`<form data-submit="ticketManual"><p class="small muted" style="margin-top:0">Pour les ventes sur place ou hors Infomaniak.</p><div class="fields">
    <div class="f"><label for="tm_d">Date</label><input id="tm_d" name="d" type="date" required value="${today()}"></div>
    <div class="f"><label for="tm_t">Tarif</label><input id="tm_t" name="t" required placeholder="ex. Entrée adulte" list="tm_list"><datalist id="tm_list">${ticketTotals().byTarif.map(x=>`<option value="${esc(x.t)}">`).join("")}</datalist></div>
    <div class="f"><label for="tm_q">Nombre de billets</label><input id="tm_q" name="q" type="number" min="1" required value="1"></div>
    <div class="f"><label for="tm_a">Montant total</label><input id="tm_a" name="a" type="number" step="0.05" required placeholder="CHF"></div>
    <div class="f wide"><label for="tm_l">Note</label><input id="tm_l" name="label" placeholder="ex. Caisse du matin"></div></div>
    <div class="formfoot"><span></span><button class="btn primary">Ajouter</button></div></form>`);
}
function saveTicketManual(form){
  const ed=currentEdition();if(!ed)return;const f=Object.fromEntries(new FormData(form));
  put("ticketing",{editionId:ed.id,source:"Saisie",label:f.label||"Saisie à la main",rows:[{d:f.d,t:f.t.trim(),q:+f.q,a:+f.a}],demo:false});
  closeSheet();toast("Ventes ajoutées.","goku");
}
/* --- Graphique : billets vendus par semaine --- */
function weekOf(d){const x=new Date(d+"T12:00:00");x.setDate(x.getDate()-((x.getDay()+6)%7));return iso(x)}
function salesChart(rows){
  const by={};rows.forEach(r=>{const w=weekOf(r.d);by[w]=(by[w]||0)+(+r.q||0)});
  const ws=Object.keys(by).sort();if(!ws.length)return "";
  const all_=[];for(let w=ws[0];w<=ws[ws.length-1];w=addDays(w,7))all_.push(w);
  const W=640,H=200,pl=36,pb=24,pt=10,max=Math.max(...all_.map(w=>by[w]||0)),step=Math.pow(10,Math.floor(Math.log10(max||1))),top=Math.ceil((max||1)/step)*step;
  const bw=(W-pl)/all_.length,y=v=>pt+(H-pt-pb)*(1-v/top);
  const ticks=[0,top/2,top];const every=Math.ceil(all_.length/8);let cum=0;
  return `<figure class="chart"><figcaption class="small muted">Billets vendus par semaine</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Billets vendus par semaine">
    ${ticks.map(t=>`<line x1="${pl}" x2="${W}" y1="${y(t)}" y2="${y(t)}" class="grid-l"/><text x="${pl-6}" y="${y(t)+4}" text-anchor="end" class="ax">${num(t)}</text>`).join("")}
    ${all_.map((w,i)=>{const v=by[w]||0;cum+=v;const x=pl+i*bw+Math.max(1,bw*.12),bwi=Math.max(2,bw*.76),h=Math.max(0,y(0)-y(v));
      return `<g class="bar"><rect x="${pl+i*bw}" y="${pt}" width="${bw}" height="${H-pt-pb}" fill="transparent"/>${v?`<path d="M${x} ${y(0)}v${-(h-Math.min(4,h))}q0 -${Math.min(4,h)} ${Math.min(4,h)} -${Math.min(4,h)}h${bwi-2*Math.min(4,h)}q${Math.min(4,h)} 0 ${Math.min(4,h)} ${Math.min(4,h)}v${h-Math.min(4,h)}z" class="bar-m"/>`:""}
        <title>Semaine du ${fDate(w)} : ${plural(v,"billet")} (cumul ${num(cum)})</title>${i%every===0?`<text x="${pl+i*bw+bw/2}" y="${H-6}" text-anchor="middle" class="ax">${new Date(w+"T12:00:00").toLocaleDateString("fr-CH",{day:"numeric",month:"short"})}</text>`:""}</g>`}).join("")}
  </svg></figure>`;
}
VIEWS.billetterie=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Billetterie","goku");
  const t=ticketTotals(),can=canWrite("ticketing"),lots=inEdition("ticketing").sort((a,b)=>(b.createdAt||"")<(a.createdAt||"")?-1:1);
  const cap=+ed.capacity||0,goal=+ed.goal||0;
  const meter=(v,of,l)=>of?`<div style="margin-top:8px"><div class="row small" style="justify-content:space-between"><span>${l}</span><b class="num">${num(v)} / ${num(of)} · ${Math.round(v/of*100)} %</b></div><span class="meter big ${v>of?"over":""}"><i style="width:${Math.min(100,v/of*100)}%"></i></span></div>`:"";
  const actions=can?`<label class="btn primary" for="ticketFile">${ic("upload")}Importer le CSV</label><input id="ticketFile" type="file" accept=".csv,text/csv,text/plain" data-change="ticketFile" hidden><button class="btn" data-act="ticketManual">${ic("plus")}Saisie</button>`:"";
  return head("Billetterie",`${esc(ed.name)} · Infomaniak`,actions,"goku")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Billets vendus</span><b>${num(t.qty)}</b><small>${goal?Math.round(t.qty/goal*100)+" % de l’objectif":"objectif à définir"}</small></div>
    <div class="kpi"><span class="label">Recette brute</span><b>${chf(t.gross)}</b><small>${t.qty?"prix moyen "+chf(t.gross/t.qty):"–"}</small></div>
    <div class="kpi"><span class="label">Frais Infomaniak</span><b>${chf(t.fees)}</b><small>${t.pct?t.pct+" % (estimation)":"taux à renseigner dans l’édition"}</small></div>
    <div class="kpi"><span class="label">Net</span><b>${chf(t.gross-t.fees)}</b><small>pour l’association</small></div></div>
  ${t.qty?`<div class="grid g3"><div class="card">${salesChart(t.rows)}${meter(t.qty,goal,"Objectif de visiteurs")}${meter(t.qty,cap,"Jauge de la salle")}</div>
    <div class="card"><h2>Par tarif</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tarif</th><th class="n">Billets</th><th class="n">Montant</th></tr></thead><tbody>${t.byTarif.map(x=>`<tr><td>${esc(x.t)}</td><td class="n">${num(x.q)}</td><td class="n">${chf(x.a)}</td></tr>`).join("")}</tbody></table></div></div></div>`
  :`<div class="card">${emptyBox("goku","Pas encore de ventes","Dans Infomaniak Manager, ouvre ta billetterie, exporte la liste des ventes en CSV, puis importe le fichier ici. Tu peux recommencer chaque semaine : le nouvel import remplace l’ancien.",actions)}</div>`}
  ${lots.length?`<div class="card"><h2>Imports et saisies</h2><div class="list">${lots.map(l=>`<div class="item"><div class="main"><b>${esc(l.label)}</b><span class="small muted">${esc(l.source)} · ${fDate((l.createdAt||"").slice(0,10))} · ${plural(sum(l.rows||[],r=>r.q),"billet")} · ${chf(sum(l.rows||[],r=>r.a))}</span></div>${can?`<button class="btn sm danger" data-act="delTicketLot" data-id="${l.id}" data-confirm="Oui, supprimer">Supprimer</button>`:""}</div>`).join("")}</div></div>`:""}
  </div>`;
};
