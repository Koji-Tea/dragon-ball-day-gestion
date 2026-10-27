"use strict";
/* ---------- Navigation ---------- */
// [écran, libellé, icône, visible ?, groupe]
const NAV=[["accueil","Accueil","home",()=>true,""],["taches","Tâches","list",()=>canRead("tasks"),""],
  ["programme","Programme","clock",()=>canRead("activities"),"La convention"],["invites","Invités","mic",()=>canRead("guests"),"La convention"],["exposants","Exposants","store",()=>canRead("exhibitors"),"La convention"],
  ["logistique","Logement & transport","bed",()=>canRead("lodging"),"La convention"],["benevoles","Bénévoles","heart",()=>canRead("shifts")&&(!isStaff()||canRead("volunteers")),"La convention"],
  ["sponsors","Sponsors & partenaires","gift",()=>canRead("sponsors"),"Partenaires"],["fournisseurs","Fournisseurs","truck",()=>canRead("suppliers"),"Partenaires"],
  ["contacts","Contacts","people",()=>canRead("contacts"),"Partenaires"],
  ["budget","Budget & compta","coins",()=>canRead("budget"),"Argent"],["billetterie","Billetterie","ticket",()=>canRead("ticketing"),"Argent"],
  ["membres","Membres","id",()=>canRead("members"),"Association"],["guerriers","Guerriers Z","bolt",()=>canRead("warriors"),"Association"],["editions","Éditions","star",()=>true,"Association"],["reglages","Réglages","gear",()=>true,"Association"]];
const TAB=["accueil","taches","programme","benevoles"];
let route="accueil";
const navItems=()=>NAV.filter(n=>n[3]());
function modeLabel(){return MODE==="cloud"?"Données partagées avec toute l’équipe.":MODE==="local"?"Mode essai : données gardées dans ce navigateur uniquement.":"Connexion…"}
function pickEdition(id){UI.edition=id;ls("dbday-edition",id);changed()}
function nav(){
  route=(location.hash||"").replace("#","")||"accueil";
  if(route!=="plus"&&!navItems().find(n=>n[0]===route))route="accueil";
  const items=navItems(),lab=(items.find(n=>n[0]===route)||[0,"Plus"])[1];
  const eds=editions(),cur=currentEdition();
  $("#side").innerHTML=`<div class="logo"><img alt="Dragon Ball Day" src="${IMG.logo}"></div>`+
    (eds.length>1?`<div class="edsel"><label class="label" for="edSel">Édition</label><select id="edSel" data-change="edition">${eds.map(e=>opt(e.id,e.name,cur&&cur.id)).join("")}</select></div>`:"")+
    items.map(([k,l,i,,g],j)=>(g&&g!==(items[j-1]||[])[4]?`<div class="grp">${g}</div>`:"")+`<a href="#${k}" class="${route===k?"on":""}">${ic(i)}${k==="benevoles"&&!isStaff()?"Mon planning":l}</a>`).join("")+
    `<div class="who"><img alt="" src="${IMG.goku}"><span>${MODE==="cloud"?`<b>${esc(ME.name||ME.email)}</b>${esc(ROLES[ME.role].l)}`:esc(modeLabel())}</span></div>`;
  const tabs=tabsShown();
  $("#tabbar").style.gridTemplateColumns=`repeat(${tabs.length+1},1fr)`;
  $("#tabbar").innerHTML=tabs.map(k=>{const n=NAV.find(x=>x[0]===k);return `<a href="#${k}" class="${route===k?"on":""}"><span class="ic">${ic(n[2])}</span>${k==="benevoles"&&!isStaff()?"Planning":n[1]}</a>`}).join("")+
    `<a href="#plus" class="${!tabs.includes(route)?"on":""}"><span class="ic">${ic("more")}</span>Plus</a>`;
  $("#ttl").textContent=route==="accueil"?(cur?cur.name:"Dragon Ball Day"):lab;
  render();
}
window.addEventListener("hashchange",()=>{UI.q="";UI.filter="";nav();window.scrollTo(0,0)});
const tabsShown=()=>TAB.filter(k=>navItems().find(n=>n[0]===k)).slice(0,3);

let rT;function scheduleRender(){cancelAnimationFrame(rT);rT=requestAnimationFrame(nav)}
function render(){
  if(!ready())return;
  const a=document.activeElement,aid=a&&a.id,sel=a&&a.selectionStart;
  $("#main").innerHTML=(VIEWS[route]||VIEWS.accueil)();
  if(aid){const el=document.getElementById(aid);if(el&&el!==a&&!$("#sheetRoot").contains(el)){el.focus();try{el.setSelectionRange(sel,sel)}catch(e){}}}
}
VIEWS.plus=()=>{const xs=navItems().filter(n=>!tabsShown().includes(n[0]));return head("Plus","")+`<div class="morelist">${xs.map(([k,l,i,,g],j)=>(g&&g!==(xs[j-1]||[])[4]?`<div class="grp label">${g}</div>`:"")+`<a href="#${k}">${ic(i)}${l}</a>`).join("")}</div>
  ${editions().length>1?`<div class="card" style="margin-top:16px"><div class="f"><label for="edSelM">Édition affichée</label><select id="edSelM" data-change="edition">${editions().map(e=>opt(e.id,e.name,(currentEdition()||{}).id)).join("")}</select></div></div>`:""}
  <div class="banner" style="margin-top:16px"><img alt="" src="${IMG.goku}"><div class="grow small">${MODE==="cloud"?`Connecté·e : <b>${esc(ME.name||ME.email)}</b> · ${esc(ROLES[ME.role].l)}<br>`:""}${modeLabel()}</div></div>`};

/* ---------- Actions ---------- */
const ACT={
  close:closeSheet,
  newRecord:el=>recordSheet(el.dataset.mod),openRecord:el=>recordSheet(el.dataset.mod,el.dataset.id),
  delRecord:el=>{const m=MODS[el.dataset.mod];if(!canWrite(m.col)){proposeDelete(m,el.dataset.id);closeSheet();return}del(m.col,el.dataset.id);
    // Supprimer une édition supprime aussi tout ce qui lui appartient.
    if(m.col==="editions")Object.keys(COLS).filter(c=>COLS[c].perEdition&&canWrite(c)).forEach(c=>all(c).filter(o=>o.editionId===el.dataset.id).forEach(o=>del(c,o.id)));
    closeSheet();toast("Supprimé.",m.img)},
  filter:el=>{UI.filter=el.dataset.v;render()},
  tab:el=>{UI.tab[el.dataset.view]=el.dataset.v;UI.filter="";UI.q="";render()},
  day:el=>{UI.day=el.dataset.v;render()},
  print:()=>window.print(),
  photoClear:el=>setPhoto(el.dataset.target,""),
  openFile:el=>openFile(el.dataset.file),
  fileClear:el=>setFile(el.dataset.target,el.dataset.k,null),
  openProposal:el=>proposalSheet(el.dataset.id),
  approveProposal:el=>approveProposal(el.dataset.id),
  refuseProposal:el=>refuseProposal(el.dataset.id),
  dismissProposal:el=>dismissProposal(el.dataset.id),
  copyMails:el=>{const v=el.dataset.v;(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast("E-mails copiés. Colle-les dans ton message."),()=>openSheet(sheetHead("E-mails à relancer","chichi")+`<textarea readonly style="min-height:140px">${esc(v)}</textarea>`))},
  exportMod:el=>{const k=el.dataset.mod,c=MODS[k].col;exportMod(k,COLS[c].perEdition?inEdition(c):all(c),norm(MODS[k].label).replace(/[^a-z]+/g,"-"))},
  exportProgramme:()=>{const xs=inEdition("activities").sort((a,b)=>(a.day+a.start)<(b.day+b.start)?-1:1);
    saveFile("dragon-ball-day-programme-"+today()+".csv",csv([["Jour","Début","Fin","Lieu","Activité","Type","Invité","Description"],...xs.map(a=>[a.day,a.start,a.end,a.room,a.title,a.kind,refName("guests",a.guestId),a.desc])]))},
  exportLedger:()=>saveFile("dragon-ball-day-compta-"+today()+".csv",csv([["Type","Catégorie","Libellé","Date","Montant","Payé / encaissé"],...ledger().map(l=>[l.kind,l.cat,l.label,l.date,l.amount.toFixed(2),l.paid.toFixed(2)])])),
  ticketManual:()=>ticketManualSheet(),
  delTicketLot:el=>{del("ticketing",el.dataset.id);toast("Supprimé.","goku")},
  taskTab:el=>{UI.taskTab=el.dataset.v;render()},
  toggleTask:el=>{const t=get("tasks",el.dataset.id);if(!t)return;const done=t.status!=="Fait";put("tasks",{...t,status:done?"Fait":"À faire",doneAt:done?today():null});if(done)toast("Bien joué ! Une tâche de moins.","trunks")},
  pickEdition:el=>{pickEdition(el.dataset.id);toast("Édition affichée : "+get("editions",el.dataset.id).name)},
  newEdition2027:()=>recordSheet("editions",null,EDITION_2027),
  newMember:()=>memberSheet(),editMember:el=>memberSheet(el.dataset.id),
  grantRequest:el=>{const r=REQUESTS.get(el.dataset.id);memberSheet(el.dataset.id,{email:r.email,name:r.name,role:"comite",modules:[]})},
  removeMember:el=>{DB.doc("users/"+el.dataset.id).delete().then(()=>toast("Accès retiré.","piccolo"),dbErr);closeSheet()},
  loadDemo:()=>loadDemo(),clearDemo:()=>clearDemo(),
  logout:()=>firebase.auth().signOut().then(()=>location.reload()),
  exportJson:()=>saveFile("dragon-ball-day-sauvegarde-"+today()+".json",JSON.stringify({app:"dragon-ball-day",version:1,exported:new Date().toISOString(),cfg:CFG,data:Object.fromEntries(Object.keys(COLS).filter(canRead).map(c=>[c,all(c)]))},null,1)),
  exportContacts:()=>{const rows=[["Nom","Catégorie","Organisation","E-mail","Téléphone","Site","Langue","Adresse","Notes"]];
    all("contacts").sort((a,b)=>a.name.localeCompare(b.name,"fr")).forEach(c=>rows.push([c.name,c.cat,c.org,c.email,c.phone,c.website,c.lang,c.address,c.notes]));
    saveFile("dragon-ball-day-contacts-"+today()+".csv",csv(rows))},
};
// Actions qui modifient des données : vérifiées avant exécution (la base refuse de toute façon ce que le rôle n'autorise pas).
const WRITES={approveProposal:"admin",refuseProposal:"admin",toggleTask:"tasks",delRecord:null,ticketManual:"ticketing",delTicketLot:"ticketing",newEdition2027:"editions",loadDemo:"admin",clearDemo:"admin",newMember:"admin",editMember:"admin",grantRequest:"admin",removeMember:"admin"};
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");
  if(e.target.classList&&e.target.classList.contains("scrim")){closeSheet();return}
  if(!el)return;
  const a=el.dataset.act;if(!ACT[a])return;
  if(el.dataset.confirm&&!el.classList.contains("armed")){e.preventDefault();e.stopPropagation();const old=el.innerHTML;el.classList.add("armed");el.textContent=el.dataset.confirm;setTimeout(()=>{if(el.isConnected){el.classList.remove("armed");el.innerHTML=old}},3500);return}
  if(el.tagName!=="A")e.preventDefault();
  const w=a in WRITES?(WRITES[a]||MODS[el.dataset.mod].col):null;
  if(w&&!(w==="admin"?isAdmin():canWrite(w)||(a==="delRecord"&&canPropose(w)))){toast("Ton rôle ne permet pas cette action.","freezer");return}
  ACT[a](el,e);
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
document.addEventListener("input",e=>{if(e.target.dataset.input==="search"){UI.q=e.target.value;render()}});
document.addEventListener("change",e=>{
  const t=e.target,c=t.dataset.change;
  if(c==="edition")pickEdition(t.value);
  if(c==="photo"&&t.files[0]){loadPhoto(t.files[0],t.dataset.target);t.value=""}
  if(c==="file"&&t.files[0]){loadFile(t.files[0],t.dataset.target,t.dataset.k);t.value=""}
  if(c==="taskPole"){UI.taskPole=t.value;render()}
  if(c==="ticketFile"&&t.files[0]&&canWrite("ticketing")){const file=t.files[0],r=new FileReader();r.onload=()=>{let txt=r.result;if(txt.includes("\uFFFD")){const r2=new FileReader();r2.onload=()=>ticketImportSheet(file.name,r2.result);r2.readAsText(file,"windows-1252");return}ticketImportSheet(file.name,txt)};r.readAsText(file);t.value=""}
  if(c==="import"&&t.files[0]){const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(j.app!=="dragon-ball-day"||!j.data)throw 0;Object.keys(COLS).forEach(col=>(j.data[col]||[]).forEach(o=>put(col,o)));if(j.cfg)putCfg(j.cfg);toast("Sauvegarde restaurée.")}catch(err){toast("Ce fichier n’est pas une sauvegarde Dragon Ball Day.","freezer")}};r.readAsText(t.files[0])}
});
document.addEventListener("submit",e=>{
  const f=e.target;if(f.id==="loginForm")return;e.preventDefault();
  const kind=f.dataset.submit;
  if(kind==="record"){const m=MODS[f.dataset.mod];if(!canWrite(m.col)&&!canPropose(m.col)){toast("Ton rôle ne permet pas cette modification.","freezer");return}saveRecord(f.dataset.mod,f)}
  if(kind==="member"&&isAdmin())saveMember(f);
  if(kind==="settings"&&isAdmin()){const d=Object.fromEntries(new FormData(f));putCfg({assoName:d.assoName.trim(),assoAddress:d.assoAddress.trim(),website:d.website.trim(),memberFee:+d.memberFee||0});toast("Réglages enregistrés.","bulma")}
  if(kind==="ticketImport"&&canWrite("ticketing"))saveTicketImport(f);
  if(kind==="ticketManual"&&canWrite("ticketing"))saveTicketManual(f);
});

if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
initStore();
