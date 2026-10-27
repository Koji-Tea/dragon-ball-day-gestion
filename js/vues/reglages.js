"use strict";
/* ---------- Réglages : association, équipe et rôles, sauvegardes ---------- */
function teamCard(){
  if(MODE!=="cloud")return `<div class="card"><h2>Équipe et rôles</h2><p class="small muted" style="margin:0">Disponible dès que l’application est reliée à Firebase : chaque membre aura alors son propre compte et son rôle. Pour l’instant, les données restent sur cet appareil.</p></div>`;
  const members=[...TEAM.values()].sort((a,b)=>(a.name||a.email).localeCompare(b.name||b.email,"fr"));
  const reqs=[...REQUESTS.values()].filter(r=>!TEAM.has(r.uid));
  return `<div class="card"><div class="card-head"><h2>Équipe et rôles</h2><button class="btn primary sm" data-act="newMember">${ic("plus")}Ajouter une personne</button></div>
  ${reqs.length?`<div class="banner" style="margin-bottom:10px"><img alt="" src="${IMG.piccolo}"><div class="grow small"><b>${plural(reqs.length,"personne attend","personnes attendent")} un rôle</b>${reqs.map(r=>`<div class="row" style="margin-top:6px"><span class="grow">${esc(r.email)}</span><button class="btn sm" data-act="grantRequest" data-id="${r.uid}">Donner un rôle</button></div>`).join("")}</div></div>`:""}
  <div class="list">${members.map(m=>`<div class="item click" data-act="editMember" data-id="${m.uid}"><span class="avatar">${esc(initials(m.name||m.email))}</span><div class="main"><b>${esc(m.name||m.email)}${m.uid===ME.uid?" (toi)":""}</b><span class="tiny muted">${esc(m.email)}${m.role==="responsable"?" · "+((m.modules||[]).length?"":"aucun menu")+esc(m.modules.map(k=>(DELEGABLE.find(d=>d[0]===k)||[k,k])[1]).join(", ")):""}</span></div><span class="pill ${m.role==="admin"?"bad":m.role==="benevole"?"neutral":"info"}">${esc(ROLES[m.role]?.l||m.role)}</span></div>`).join("")}</div>
  <details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:800">Qui peut faire quoi ?</summary><dl class="kv small" style="margin-top:8px">${Object.entries(ROLES).map(([k,r])=>`<dt>${esc(r.l)}</dt><dd>${esc(r.d)}</dd>`).join("")}</dl></details></div>`;
}
function memberSheet(uidM,preset){
  const m=uidM?(TEAM.get(uidM)||{uid:uidM,...(preset||{})}):{role:"comite",modules:[]};const existing=!!(uidM&&TEAM.has(uidM));const self=uidM===ME.uid;
  openSheet(sheetHead(existing?esc(m.name||m.email):uidM?"Donner un rôle":"Ajouter une personne","piccolo")+
  `<form data-submit="member" data-id="${uidM||""}"><div class="fields">
    <div class="f"><label for="mName">Prénom et nom</label><input id="mName" name="name" required value="${esc(m.name||"")}"></div>
    <div class="f"><label for="mMail">E-mail</label><input id="mMail" name="email" type="email" required value="${esc(m.email||"")}" ${uidM?"readonly":""}></div>
    <div class="f wide"><label for="mRole">Rôle</label><select id="mRole" name="role" ${self?"disabled":""}>${Object.entries(ROLES).map(([k,r])=>opt(k,r.l+" – "+r.d,m.role)).join("")}</select>${self?`<span class="tiny muted">Tu ne peux pas changer ton propre rôle.</span>`:""}</div>
    <div class="f wide"><span>Menus accessibles (pour un accès limité)</span><span class="tiny muted" style="font-weight:600">Choisis le rôle « Accès limité », puis coche les menus que cette personne peut voir et modifier.</span><div class="checks">${DELEGABLE.map(([k,l])=>`<label class="check"><input type="checkbox" name="modules" value="${k}" ${(m.modules||[]).includes(k)?"checked":""}> ${esc(l)}</label>`).join("")}</div></div>
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
    <div class="f"><label for="cFee">Cotisation annuelle des Guerriers Z (CHF)</label><input id="cFee" name="memberFee" type="number" step="0.05" value="${esc(CFG.memberFee)}"></div>
    ${isAdmin()?`<div><button class="btn primary">Enregistrer</button></div>`:""}</fieldset></form></div>
  ${isAdmin()?teamCard():""}
  ${STAFF.includes(ME.role)?`<div class="card"><h2>Sauvegarde</h2><p class="small muted" style="margin-top:0">${modeLabel()} Exporte une sauvegarde de temps en temps pour la garder au chaud.</p>
    <div class="row"><button class="btn" data-act="exportJson">${ic("down")}Sauvegarde complète</button><button class="btn" data-act="exportContacts">${ic("down")}Contacts (CSV)</button></div>
    ${isAdmin()?`<div class="f" style="margin-top:14px"><label for="importFile">Restaurer une sauvegarde (.json)</label><input id="importFile" type="file" accept=".json,application/json" data-change="import"></div>`:""}</div>`:""}
  ${isAdmin()?`<div class="card"><h2>Données d’exemple</h2><p class="small muted" style="margin-top:0">Des invités, sponsors, bénévoles, ventes et tâches fictifs pour découvrir l’application. Ils sont marqués et s’effacent d’un clic sans toucher aux vraies données.</p>
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
  const E=o=>({...o,editionId:ed.id,demo:true}),D=ed.date;
  const g1=put("guests",E({name:"Kenji Exemple",kind:"Comédien·ne de doublage",status:"Confirmé",travel:"Train",arrival:addDays(D,-1),departure:addDays(D,1),fee:1800,contract:true,announced:true,people:1,rider:"Eau plate, loge calme, pas de photos pendant le repas.",signing:"2 sessions de 45 min, 10 CHF la dédicace."}));
  const g2=put("guests",E({name:"Aiko Capsule",kind:"Mangaka / illustrateur·rice",status:"Confirmé",arrival:D,departure:addDays(D,1),fee:900,contract:false,announced:false}));
  const g3=put("guests",E({name:"Groupe Kaméha",kind:"Chanteur·euse",status:"En discussion",fee:2500}));
  put("guests",E({name:"Team Cosplay Namek",kind:"Cosplayeur·euse",status:"Idée"}));
  [["Atelier Capsule","Artiste","Accepté",1,60,"A3"],["Figurines du Lac","Exposant","Payé",3,240,"B1"],["Club Manga Yverdon","Association","Accepté",2,0,"C2"],["Ramen Saiyan","Restauration","Candidature",2,150,""]]
    .forEach(([name,kind,status,tables,fee,spot])=>put("exhibitors",E({name,kind,status,tables,fee,spot,power:kind==="Restauration"})));
  put("lodging",E({guestId:g1.id,hotel:"Hôtel du Lac (exemple)",status:"Confirmé",checkIn:addDays(D,-1),checkOut:addDays(D,1),rooms:1,price:140,paid:false}));
  put("lodging",E({guestId:g2.id,hotel:"Hôtel du Lac (exemple)",status:"Option",checkIn:D,checkOut:addDays(D,1),rooms:1,price:140}));
  put("transport",E({guestId:g1.id,kind:"Train",date:addDays(D,-1),time:"16:42",from:"Genève Aéroport",to:"Yverdon-les-Bains",cost:42,booked:true}));
  put("transport",E({guestId:g1.id,kind:"Navette de l’équipe",date:addDays(D,-1),time:"17:50",from:"Gare d’Yverdon",to:"Hôtel du Lac",booked:true}));
  [["Garage Namek SA","Sponsor","Pack Goku","Signé",3000,500],["Banque Capsule","Sponsor","Pack Vegeta","En discussion",1500,0],["Radio Bulles","Média","Pack Bulma","Payé",0,800],["Ville d’Yverdon-les-Bains","Institution / subvention","","Contacté",5000,0]]
    .forEach(([name,kind,level,status,amount,inKindValue],i)=>put("sponsors",E({name,kind,level,status,amount,inKindValue,logo:status==="Signé",next:i===1?addDays(t,3):""})));
  [["Son & Lumière Léman","Sono de la grande scène","Sono & lumière","Commandé",2400,800,addDays(D,-1)],["Imprimerie du Nord","Affiches et flyers","Impression & communication","Payé",650,0,addDays(t,20)],
   ["Location Tables SA","120 tables et 300 chaises","Location de matériel","Devis reçu",900,0,addDays(D,-1)],["Sécurité Plus","4 agents de sécurité","Sécurité","Devis demandé",0,0,D]]
    .forEach(([name,item,cat,status,amount,deposit,delivery])=>put("suppliers",E({name,item,cat,status,amount,deposit,delivery})));
  [["Ouverture des portes","Animation","Grande scène","09:30","10:00"],["Concert d’ouverture","Concert","Grande scène","10:00","10:45",g3.id],["Doublage : les coulisses","Conférence","Salle de conférence","11:00","12:00",g1.id],
   ["Dédicaces","Dédicaces","Espace dédicaces","13:30","15:00",g1.id],["Atelier dessin manga","Atelier","Atelier","14:00","15:30",g2.id],["Dédicaces Aiko","Dédicaces","Espace dédicaces","15:30","17:00",g2.id],
   ["Concours cosplay","Concours cosplay","Grande scène","15:00","16:30"],["Quiz Dragon Ball","Quiz / jeu","Salle de conférence","16:00","17:00"],["Remise des prix","Animation","Grande scène","16:15","17:00"]]
    .forEach(([title,kind,room,start,end,guestId])=>put("activities",E({title,kind,room,day:D,start,end,guestId:guestId||"",cost:kind==="Concours cosplay"?300:0,published:true})));
  const vols=[["Léa Exemple","lea@exemple.ch","M"],["Noah Exemple","noah@exemple.ch","L"],["Mia Exemple","mia@exemple.ch","S"],["Luca Exemple","luca@exemple.ch","XL"],["Emma Exemple","emma@exemple.ch","M"]]
    .map(([name,email,size],i)=>put("volunteers",E({name,email,size,status:i<4?"Confirmé·e":"Inscrit·e"})));
  [["Montage",addDays(D,-1),"14:00","19:00",4,[0,1,3]],["Accueil & billetterie",D,"09:00","13:00",3,[0,2]],["Accueil & billetterie",D,"13:00","17:30",3,[4]],["Bar & restauration",D,"10:00","14:00",2,[1,2]],["Sécurité",D,"09:00","17:30",2,[3]]]
    .forEach(([post,day,start,end,needed,ix])=>{const ids=ix.map(i=>vols[i].id);put("shifts",E({post,day,start,end,needed,volunteerIds:ids,emails:ids.map(id=>get("volunteers",id).email)}))});
  const y=String(new Date().getFullYear());
  [["Présidente Exemple","Président·e"],["Trésorier Exemple","Trésorier·ère"],["Secrétaire Exemple","Secrétaire"],["Membre Exemple","Membre"]]
    .forEach(([name,assoRole])=>put("members",{name,assoRole,status:"Actif",demo:true}));
  [["Goku Exemple",[y]],["Krilin Exemple",[y]],["Yamcha Exemple",[String(+y-1)]]]
    .forEach(([name,paid])=>put("warriors",{name,paid,status:"Actif",demo:true}));
  [["Invités & cachets",5000],["Logement",1200],["Transport",400],["Salle & technique",6000],["Fournisseurs & matériel",1500],["Communication",1000],["Programme & activités",800],["Assurances & autorisations",600],
   ["Billetterie",18000],["Sponsors & partenaires",6000],["Stands & exposants",1200],["Bar & restauration",3000]].forEach(([cat,planned])=>put("budget",E({cat,planned})));
  [["Location de La Marive (acompte)","Salle & technique",2000,true],["Assurance RC manifestation","Assurances & autorisations",480,true],["Recette bar (estimation)","Bar & restauration",2500,false]]
    .forEach(([label,cat,amount,paid])=>put("entries",E({label,cat,amount,paid,date:t})));
  const rows=[];[-70,-63,-56,-49,-42,-35,-28,-21,-14,-7].forEach((dd,i)=>{const d=addDays(t,dd);rows.push({d,t:"Entrée adulte",q:20+i*9,a:(20+i*9)*25},{d,t:"Entrée enfant",q:5+i*3,a:(5+i*3)*12},{d,t:"Pass VIP",q:i%3?1:3,a:(i%3?1:3)*60})});
  put("ticketing",E({source:"Import",label:"ventes-exemple.csv",rows}));
  if(!ed.ticketFeePct)put("editions",{...get("editions",ed.id),ticketFeePct:4.5});
  toast("Exemples chargés. Explore sans crainte !");
}
function clearDemo(){Object.keys(COLS).forEach(c=>all(c).filter(o=>o.demo).forEach(o=>del(c,o.id)));toast("Exemples effacés. À toi de jouer !")}
