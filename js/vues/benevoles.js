"use strict";
/* ---------- Bénévoles : inscriptions, postes et créneaux ---------- */
const POSTS=["Accueil & billetterie","Bar & restauration","Sécurité","Loges des invités","Dédicaces","Scène & technique","Animation","Montage","Démontage","Navette","Autre"];
const SIZES=["XS","S","M","L","XL","XXL"];
const VOL_STATES=["Inscrit·e","Confirmé·e","Désisté·e"];
defineMod({
  key:"volunteers",col:"volunteers",label:"Bénévoles",one:"bénévole",img:"piccolo",newLabel:"Nouveau ou nouvelle bénévole",added:"Bénévole inscrit·e. Piccolo l’attend à l’entraînement !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Prénom et nom",req:true},
    {k:"photo",l:"Photo",type:"photo",help:"Recadrée en carré pour la vignette."},
    {k:"email",l:"E-mail",type:"email",help:"Le même que son compte : il lui permet de voir son planning."},
    {k:"phone",l:"Téléphone",type:"tel"},
    {k:"status",l:"Statut",type:"select",options:VOL_STATES,def:"Inscrit·e"},
    {k:"size",l:"Taille de t-shirt",type:"select",options:SIZES,blank:"–"},
    {k:"minor",l:"Mineur·e (autorisation parentale)",type:"check"},
    {k:"wishes",l:"Postes souhaités",type:"checks",options:POSTS.map(p=>[p,p])},
    {k:"avail",l:"Disponibilités",type:"textarea",ph:"ex. samedi montage dès 14 h, dimanche toute la journée"},
    {k:"notes",l:"Notes",type:"textarea"},
  ],
  beforeSave:o=>{o.email=(o.email||"").toLowerCase();return o},
});
defineMod({
  key:"shifts",col:"shifts",label:"Créneaux",one:"créneau",img:"piccolo",newLabel:"Nouveau créneau",added:"Créneau ajouté au planning.",
  titleOf:o=>esc(o.post+" · "+(o.start||"")+"–"+(o.end||"")),
  fields:[
    {k:"post",l:"Poste",type:"select",options:POSTS,def:"Accueil & billetterie"},
    {k:"day",l:"Jour",type:"date",req:true},
    {k:"start",l:"Début",type:"time",req:true},
    {k:"end",l:"Fin",type:"time",req:true},
    {k:"needed",l:"Bénévoles nécessaires",type:"number",def:2},
    {k:"lead",l:"Responsable du poste",type:"member"},
    {k:"volunteerIds",l:"Bénévoles affecté·es",type:"checks",options:()=>inEdition("volunteers").filter(v=>v.status!=="Désisté·e").sort((a,b)=>a.name.localeCompare(b.name,"fr")).map(v=>[v.id,v.name])},
    {k:"notes",l:"Consignes",type:"textarea",wide:true,ph:"Où se présenter, tenue, matériel…"},
  ],
  // Les e-mails des bénévoles affecté·es permettent à chacun·e de lire son propre planning.
  beforeSave:o=>{if(hm(o.end)<=hm(o.start))o.end=fHM(hm(o.start)+60);o.emails=[...new Set((o.volunteerIds||[]).map(id=>(get("volunteers",id)||{}).email).filter(Boolean))];return o},
  sheetTop:o=>{const c=shiftClashes().filter(x=>x.shift.id===o.id||x.other.id===o.id).map(x=>x.shift.id===o.id?x:{...x,other:x.shift});return c.length?`<div class="banner" style="background:var(--bad-bg)"><div class="grow small"><b style="color:var(--bad)">Double affectation</b>${c.map(x=>`<div>${esc(x.vol.name)} est aussi sur ${esc(x.other.post)} (${esc(x.other.start)}–${esc(x.other.end)})</div>`).join("")}</div></div>`:""},
});
const shiftsSorted=xs=>xs.slice().sort((a,b)=>(a.day+a.start)<(b.day+b.start)?-1:1);
const shiftNames=s=>(s.volunteerIds||[]).map(id=>(get("volunteers",id)||{}).name).filter(Boolean);
// Un·e bénévole placé·e sur deux créneaux qui se chevauchent.
function shiftClashes(){return memo("shiftClashes",()=>{
  const xs=inEdition("shifts"),out=[];
  xs.forEach(a=>xs.forEach(b=>{if(a.id>=b.id||a.day!==b.day||!(hm(a.start)<hm(b.end)&&hm(b.start)<hm(a.end)))return;
    (a.volunteerIds||[]).filter(id=>(b.volunteerIds||[]).includes(id)).forEach(id=>{const vol=get("volunteers",id);if(vol)out.push({shift:a,other:b,vol})})}));
  return out;
})}
const fillPill=s=>{const n=(s.volunteerIds||[]).length,need=+s.needed||0;return `<span class="pill ${n>=need?"good":n?"warn":"bad"}">${n}/${need}</span>`};
function shiftItem(s,mine){
  return `<div class="item click" data-act="openRecord" data-mod="shifts" data-id="${s.id}"><span class="pill neutral" style="min-width:96px;justify-content:center">${esc(s.start)}–${esc(s.end)}</span>
    <div class="main"><b>${esc(s.post)}</b><span class="small muted">${mine?esc(s.notes||"Consignes à venir"):esc(shiftNames(s).join(", ")||"Personne pour l’instant")}</span></div>${mine?"":`<div class="end">${fillPill(s)}</div>`}</div>`;
}
function myShifts(){
  const xs=shiftsSorted(inEdition("shifts").filter(s=>(s.emails||[]).includes((ME.email||"").toLowerCase())));
  const days=[...new Set(xs.map(s=>s.day))];
  return xs.length?days.map(d=>`<h3 class="group-title">${fLong(d)}</h3><div class="list">${xs.filter(s=>s.day===d).map(s=>shiftItem(s,true)).join("")}</div>`).join("")
    :emptyBox("piccolo","Pas encore de créneau","L’équipe bénévoles te place bientôt sur le planning. Tu le verras ici.");
}
VIEWS.benevoles=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Bénévoles","piccolo");
  if(!isStaff())return head("Mon planning",esc(ed.name),"","piccolo")+`<div class="card">${myShifts()}</div>`;
  const tab=tabOf("benevoles","planning");
  const vs=inEdition("volunteers"),ss=inEdition("shifts"),active=vs.filter(v=>v.status!=="Désisté·e");
  const needed=sum(ss,s=>s.needed),filled=sum(ss,s=>Math.min((s.volunteerIds||[]).length,+s.needed||0));
  const clashes=shiftClashes();
  let body;
  if(tab==="planning"){
    const xs=shiftsSorted(ss),days=[...new Set(xs.map(s=>s.day))];
    body=(clashes.length?`<div class="banner" style="background:var(--bad-bg)"><img alt="" src="${IMG.piccolo}"><div class="grow small"><b style="color:var(--bad)">Double affectation</b>${[...new Set(clashes.map(c=>`${c.vol.name} : ${c.shift.post} et ${c.other.post} (${fDay(c.shift.day)})`))].slice(0,6).map(x=>`<div>${esc(x)}</div>`).join("")}</div></div>`:"")+
      (xs.length?days.map(d=>`<h3 class="group-title">${fLong(d)}</h3><div class="list">${xs.filter(s=>s.day===d).map(s=>shiftItem(s)).join("")}</div>`).join("")
      :emptyBox("piccolo","Aucun créneau","Crée les créneaux (accueil, bar, sécurité…) puis place les bénévoles dessus.",addBtn("shifts","Premier créneau")));
  }else{
    const count=id=>ss.filter(s=>(s.volunteerIds||[]).includes(id)).length;
    const xs=vs.filter(v=>matchQ(v,["name","email","notes"])).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
    const sizes=SIZES.map(z=>[z,active.filter(v=>v.size===z).length]).filter(x=>x[1]);
    body=`<div class="row" style="margin-bottom:10px">${searchBox("Rechercher un·e bénévole…")}</div>
      ${sizes.length?`<p class="small muted" style="margin:0 0 10px">T-shirts : ${sizes.map(([z,n])=>`${z} × ${n}`).join(" · ")}</p>`:""}
      ${xs.length?`<div class="list">${xs.map(v=>rowItem("volunteers",v,{title:v.name,sub:esc([v.phone||v.email,plural(count(v.id),"créneau","créneaux"),v.minor?"mineur·e":""].filter(Boolean).join(" · ")),
        end:statusPill(v.status,{"Confirmé·e":"good","Inscrit·e":"info","Désisté·e":"neutral"})})).join("")}</div>`
      :emptyBox("piccolo",vs.length?"Personne ne correspond":"Pas encore de bénévole","Inscris les bénévoles avec leur e-mail : s’ils ont un compte « Bénévole », ils verront leur planning. Tu peux aussi importer une liste (CSV avec prénom, nom, téléphone et e-mail).",vs.length?"":addBtn("volunteers","Premier·e bénévole"))}`;
  }
  return head("Bénévoles",esc(ed.name),addBtn("shifts","Créneau",tab==="planning"?"primary":"")+addBtn("volunteers","Bénévole",tab==="planning"?"":"primary")+(canWrite("volunteers")?`<label class="btn" for="volFile">${ic("upload")}Importer</label><input id="volFile" type="file" accept=".csv,text/csv,text/plain" data-change="volFile" hidden>`:"")+`<button class="btn" data-act="exportMod" data-mod="${tab==="planning"?"shifts":"volunteers"}">${ic("down")}CSV</button>`,"piccolo")+
  `<div class="stack"><div class="kpis">
    <div class="kpi"><span class="label">Bénévoles</span><b>${active.length}</b><small>${active.filter(v=>v.status==="Confirmé·e").length} confirmé·es</small></div>
    <div class="kpi"><span class="label">Postes pourvus</span><b>${filled}/${needed}</b><small>${needed?Math.round(filled/needed*100)+" %":"aucun créneau"}</small></div>
    <div class="kpi"><span class="label">Créneaux incomplets</span><b style="color:${ss.some(s=>(s.volunteerIds||[]).length<(+s.needed||0))?"var(--warn)":"inherit"}">${ss.filter(s=>(s.volunteerIds||[]).length<(+s.needed||0)).length}</b><small>sur ${ss.length}</small></div>
    <div class="kpi"><span class="label">Heures</span><b>${num(sum(ss,s=>(s.volunteerIds||[]).length*(hm(s.end)-hm(s.start)))/60)}</b><small>de bénévolat prévues</small></div></div>
  <div class="card"><div style="margin-bottom:14px">${segTabs("benevoles",[["planning",`Planning · ${ss.length}`],["people",`Bénévoles · ${vs.length}`]],"planning")}</div>${body}</div></div>`;
};

/* --- Import d'une liste de bénévoles (CSV : prénom, nom, téléphone, e-mail) --- */
// Excel enregistre souvent en Windows-1252 : si l'UTF-8 donne des caractères cassés, on relit le fichier.
function readCSVFile(file,cb){const r=new FileReader();r.onload=()=>{if(String(r.result).includes("�")){const r2=new FileReader();r2.onload=()=>cb(r2.result);r2.readAsText(file,"windows-1252")}else cb(r.result)};r.readAsText(file)}
const VOL_GUESS={first:/pr[ée]nom|first/i,last:/^\s*(nom|nom de famille|last ?name|surname|family)\s*$/i,full:/nom complet|full ?name|^\s*name\s*$/i,phone:/t[ée]l|phone|mobile|natel|portable/i,email:/mail|courriel/i};
let VI=null;
function volImportSheet(name,txt){
  const rows=parseCSV(txt);if(!rows.length){toast("Ce fichier est vide.","freezer");return}
  const hd=rows[0].map(h=>h.trim()),guess={};
  Object.entries(VOL_GUESS).forEach(([k,re])=>{guess[k]=hd.findIndex((h,j)=>re.test(h)&&!Object.values(guess).includes(j))});
  if(guess.last<0&&guess.full<0)guess.last=hd.findIndex((h,j)=>/nom|name/i.test(h)&&j!==guess.first);
  if(guess.full<0||guess.first>=0)guess.full=-1;
  const titled=Object.values(guess).some(i=>i>=0);
  VI={name,hd,rows};
  const sel=(k,l)=>`<div class="f"><label for="vi_${k}">${l}</label><select id="vi_${k}" name="${k}"><option value="-1">Aucune</option>${hd.map((h,i)=>opt(String(i),(titled?h:"")||"Colonne "+(i+1),String(guess[k]))).join("")}</select></div>`;
  openSheet(sheetHead("Importer des bénévoles","piccolo")+`<form data-submit="volImport"><p class="small muted" style="margin-top:0"><b>${esc(name)}</b> · ${plural(rows.length-(titled?1:0),"ligne")}. Vérifie quelle colonne correspond à quoi.</p>
    <div class="fields">${sel("first","Prénom")}${sel("last","Nom")}${sel("phone","Téléphone")}${sel("email","E-mail")}${guess.full>=0?sel("full","Prénom et nom ensemble"):`<input type="hidden" name="full" value="-1">`}</div>
    <div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr>${hd.slice(0,6).map((h,i)=>`<th>${esc(titled?h:"Colonne "+(i+1))}</th>`).join("")}</tr></thead><tbody>${rows.slice(titled?1:0,(titled?1:0)+4).map(r=>`<tr>${r.slice(0,6).map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <label class="check" style="margin-top:14px"><input type="checkbox" name="titled" ${titled?"checked":""}> La première ligne contient les titres des colonnes</label>
    <p class="tiny muted" style="margin:8px 0 0">Les bénévoles déjà inscrit·es (même e-mail ou même nom) ne sont pas ajouté·es une deuxième fois.</p>
    <div class="formfoot"><span></span><button class="btn primary">Importer</button></div></form>`);
}
function saveVolImport(form){
  const ed=currentEdition();if(!ed||!VI)return;
  const f=Object.fromEntries(new FormData(form)),ix=k=>+f[k],cell=(r,k)=>ix(k)>=0?String(r[ix(k)]||"").trim():"";
  const known=inEdition("volunteers"),mails=new Set(known.map(v=>(v.email||"").toLowerCase()).filter(Boolean)),names=new Set(known.map(v=>norm(v.name||"")));
  let added=0,dup=0,empty=0;
  (f.titled?VI.rows.slice(1):VI.rows).forEach(r=>{
    const name=(cell(r,"full")||[cell(r,"first"),cell(r,"last")].filter(Boolean).join(" ")).replace(/\s+/g," ").trim(),email=cell(r,"email").toLowerCase(),phone=cell(r,"phone");
    if(!name&&!email){empty++;return}
    if((email&&mails.has(email))||(name&&names.has(norm(name)))){dup++;return}
    put("volunteers",{editionId:ed.id,name:name||email,email,phone,status:"Inscrit·e"});
    if(email)mails.add(email);if(name)names.add(norm(name));added++;
  });
  VI=null;closeSheet();
  toast(`${plural(added,"bénévole ajouté·e","bénévoles ajouté·es")}${dup?` · ${plural(dup,"déjà inscrit·e","déjà inscrit·es")}`:""}${empty?` · ${plural(empty,"ligne vide","lignes vides")}`:""}.`,"piccolo");
  UI.tab.benevoles="people";render();
}
