"use strict";
/* ---------- Réglages : association, équipe et rôles, sauvegardes ---------- */
function teamCard(){
  if(MODE!=="cloud")return `<div class="card"><h2>Équipe et rôles</h2><p class="small muted" style="margin:0">Disponible dès que l’application est reliée à Firebase : chaque membre aura alors son propre compte et son rôle. Pour l’instant, les données restent sur cet appareil.</p></div>`;
  const members=[...TEAM.values()].sort((a,b)=>(a.name||a.email).localeCompare(b.name||b.email,"fr"));
  const reqs=[...REQUESTS.values()].filter(r=>!TEAM.has(r.uid));
  return `<div class="card"><div class="card-head"><h2>Équipe et rôles</h2><button class="btn primary sm" data-act="newMember">${ic("plus")}Ajouter une personne</button></div>
  ${reqs.length?`<div class="banner" style="margin-bottom:10px"><img alt="" src="${IMG.piccolo}"><div class="grow small"><b>${plural(reqs.length,"personne attend","personnes attendent")} un rôle</b>${reqs.map(r=>`<div class="row" style="margin-top:6px"><span class="grow">${esc(r.email)}</span><button class="btn sm" data-act="grantRequest" data-id="${r.uid}">Donner un rôle</button></div>`).join("")}</div></div>`:""}
  <div class="list">${members.map(m=>`<div class="item click" data-act="editMember" data-id="${m.uid}"><span class="avatar">${esc(initials(m.name||m.email))}</span><div class="main"><b>${esc(m.name||m.email)}${m.uid===ME.uid?" (toi)":""}</b><span class="tiny muted">${esc(m.email)}${m.role==="responsable"&&(m.modules||[]).length?" · "+esc(m.modules.map(k=>(DELEGABLE.find(d=>d[0]===k)||[k,k])[1]).join(", ")):""}</span></div><span class="pill ${m.role==="admin"?"bad":m.role==="benevole"?"neutral":"info"}">${esc(ROLES[m.role]?.l||m.role)}</span></div>`).join("")}</div>
  <details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:800">Qui peut faire quoi ?</summary><dl class="kv small" style="margin-top:8px">${Object.entries(ROLES).map(([k,r])=>`<dt>${esc(r.l)}</dt><dd>${esc(r.d)}</dd>`).join("")}</dl></details></div>`;
}
function memberSheet(uidM,preset){
  const m=uidM?(TEAM.get(uidM)||{uid:uidM,...(preset||{})}):{role:"comite",modules:[]};const existing=!!(uidM&&TEAM.has(uidM));const self=uidM===ME.uid;
  openSheet(sheetHead(existing?esc(m.name||m.email):uidM?"Donner un rôle":"Ajouter une personne","piccolo")+
  `<form data-submit="member" data-id="${uidM||""}"><div class="fields">
    <div class="f"><label for="mName">Prénom et nom</label><input id="mName" name="name" required value="${esc(m.name||"")}"></div>
    <div class="f"><label for="mMail">E-mail</label><input id="mMail" name="email" type="email" required value="${esc(m.email||"")}" ${uidM?"readonly":""}></div>
    <div class="f wide"><label for="mRole">Rôle</label><select id="mRole" name="role" ${self?"disabled":""}>${Object.entries(ROLES).map(([k,r])=>opt(k,r.l+" – "+r.d,m.role)).join("")}</select>${self?`<span class="tiny muted">Tu ne peux pas changer ton propre rôle.</span>`:""}</div>
    <div class="f wide"><span>Modules confiés (pour un·e responsable de pôle)</span><div class="checks">${DELEGABLE.map(([k,l])=>`<label class="check"><input type="checkbox" name="modules" value="${k}" ${(m.modules||[]).includes(k)?"checked":""}> ${esc(l)}</label>`).join("")}</div></div>
  </div>${uidM?"":`<p class="small muted" style="margin:12px 0 0">Un compte est créé pour cette personne et elle reçoit un e-mail pour choisir son mot de passe.</p>`}
  <div class="formfoot">${existing&&!self?`<button type="button" class="btn danger" data-act="removeMember" data-id="${uidM}" data-confirm="Oui, retirer l’accès">Retirer l’accès</button>`:"<span></span>"}<button class="btn primary">${uidM?"Enregistrer":"Créer le compte"}</button></div></form>`);
}
async function saveMember(form){
  const fd=new FormData(form),uidM=form.dataset.id;
  const o={name:String(fd.get("name")).trim(),email:String(fd.get("email")).trim(),role:fd.get("role")||(TEAM.get(uidM)||{}).role,modules:fd.getAll("modules")};
  const btn=form.querySelector(".btn.primary");btn.disabled=true;
  try{
    if(uidM){await DB.doc("users/"+uidM).set(o);DB.doc("requests/"+uidM).delete().catch(()=>{});toast("Rôle enregistré.","piccolo")}
    else{await createMember(o);toast(`Compte créé : ${o.email} va recevoir un e-mail.`,"piccolo")}
    closeSheet();
  }catch(e){
    btn.disabled=false;
    const msg=e&&e.code==="auth/email-already-in-use"?"Ce compte existe déjà. Demande à la personne de se connecter une fois : elle apparaîtra ici dans « attend un rôle ».":
      e&&e.code==="auth/invalid-email"?"Cette adresse e-mail n’est pas valide.":e&&e.code==="permission-denied"?"Seul·e un·e administrateur·rice peut gérer l’équipe.":"Impossible de créer le compte pour l’instant.";
    toast(msg,"freezer");
  }
}

VIEWS.reglages=()=>head("Réglages","L’association, l’équipe et les sauvegardes.","","bulma")+`<div class="grid g2">
  <div class="card"><h2>L’association</h2><form data-submit="settings" class="stack" style="gap:12px"><fieldset style="border:0;padding:0;margin:0" ${isAdmin()?"":"disabled"} class="stack">
    <div class="f"><label for="cName">Nom</label><input id="cName" name="assoName" value="${esc(CFG.assoName)}"></div>
    <div class="f"><label for="cAddr">Adresse</label><textarea id="cAddr" name="assoAddress">${esc(CFG.assoAddress)}</textarea></div>
    <div class="f"><label for="cWeb">Site internet</label><input id="cWeb" name="website" type="url" value="${esc(CFG.website)}"></div>
    ${isAdmin()?`<div><button class="btn primary">Enregistrer</button></div>`:""}</fieldset></form></div>
  ${isAdmin()?teamCard():""}
  ${STAFF.includes(ME.role)?`<div class="card"><h2>Sauvegarde</h2><p class="small muted" style="margin-top:0">${modeLabel()} Exporte une sauvegarde de temps en temps pour la garder au chaud.</p>
    <div class="row"><button class="btn" data-act="exportJson">${ic("down")}Sauvegarde complète</button><button class="btn" data-act="exportContacts">${ic("down")}Contacts (CSV)</button></div>
    ${isAdmin()?`<div class="f" style="margin-top:14px"><label for="importFile">Restaurer une sauvegarde (.json)</label><input id="importFile" type="file" accept=".json,application/json" data-change="import"></div>`:""}</div>`:""}
  ${isAdmin()?`<div class="card"><h2>Données d’exemple</h2><p class="small muted" style="margin-top:0">Des contacts et des tâches fictifs pour découvrir l’application. Ils sont marqués et s’effacent d’un clic sans toucher aux vraies données.</p>
    <div class="row">${hasDemo()?`<button class="btn danger" data-act="clearDemo" data-confirm="Oui, effacer">Effacer les exemples</button>`:`<button class="btn" data-act="loadDemo">Charger les exemples</button>`}</div></div>`:""}
  <div class="card"><h2>Mon compte</h2>${MODE==="cloud"?`<p class="small muted" style="margin-top:0">Connecté·e avec ${esc(ME.email)} · ${esc(ROLES[ME.role].l)}</p><button class="btn" data-act="logout">Se déconnecter</button>`:`<p class="small muted" style="margin:0">Mode essai : pas de compte, toutes les données restent dans ce navigateur.</p>`}</div>
  </div>`;

/* ---------- Données d'exemple (fictives) ---------- */
function hasDemo(){return Object.keys(COLS).some(c=>all(c).some(o=>o.demo))}
function loadDemo(){
  let ed=currentEdition();
  if(!ed)ed=put("editions",{...EDITION_2027,capacity:1500,goal:1200});
  pickEdition(ed.id);
  const t=today();
  [["Studio Kamé Doublage","Invité","Agence de comédiens de doublage","contact@exemple.ch"],["Atelier Capsule","Artiste","Illustratrice, table d’artiste",""],["Figurines du Lac","Exposant","Boutique de figurines","info@exemple.ch"],
   ["Garage Namek SA","Sponsor","Sponsor or 2026","sponsoring@exemple.ch"],["Club Manga Yverdon","Partenaire","Association partenaire",""],["Son & Lumière Léman","Fournisseur","Sono de la grande scène","devis@exemple.ch"],
   ["Imprimerie du Nord","Fournisseur","Affiches et flyers",""],["Radio Bulles","Presse","Émission culture geek",""]].forEach(([name,cat,org,email])=>put("contacts",{name,cat,org,email,lang:"Français",demo:true}));
  [["Signer le contrat de l’invité principal","Invités",-5,"En cours",true],["Réserver les chambres d’hôtel des invités","Logistique",6,"À faire",true],["Envoyer le dossier de sponsoring","Partenaires & sponsors",12,"À faire",false],
   ["Valider l’affiche avec l’illustrateur","Communication",-20,"Fait",false],["Ouvrir la billetterie sur Infomaniak","Billetterie",30,"À faire",true],["Lancer l’appel aux bénévoles","Bénévoles",45,"À faire",false],
   ["Demander l’autorisation de manifestation à la commune","Général",20,"À faire",false],["Commander les t-shirts staff","Bénévoles",90,"À faire",false],["Établir le budget prévisionnel","Finances",-30,"Fait",false]]
   .forEach(([title,pole,dd,status,high])=>put("tasks",{title,pole,due:addDays(t,dd),status,high,editionId:ed.id,doneAt:status==="Fait"?addDays(t,dd):undefined,demo:true}));
  toast("Exemples chargés. Explore sans crainte !");
}
function clearDemo(){Object.keys(COLS).forEach(c=>all(c).filter(o=>o.demo).forEach(o=>del(c,o.id)));toast("Exemples effacés. À toi de jouer !")}
