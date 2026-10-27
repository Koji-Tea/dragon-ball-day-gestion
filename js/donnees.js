"use strict";
/* ---------- Rôles et droits ----------
   Les mêmes règles sont appliquées côté serveur dans firestore.rules : garder les deux fichiers d'accord. */
const ROLES={
  admin:{l:"Administrateur·rice",d:"Tout, y compris l’équipe et les réglages."},
  comite:{l:"Comité",d:"Tous les modules, sans la gestion de l’équipe."},
  tresorier:{l:"Trésorier·ère",d:"Consulte tout, gère le budget, la billetterie, les cotisations et ses tâches."},
  responsable:{l:"Responsable de pôle",d:"Consulte tout, gère les modules qui lui sont confiés."},
  benevole:{l:"Bénévole",d:"Voit son planning et le programme de l’édition."},
};
const ALL_ROLES=Object.keys(ROLES);
const STAFF=["admin","comite","tresorier","responsable"];
const BOARD=["admin","comite"],MONEY=["admin","comite","tresorier"];
/* Collections de données.
   module : pôle qu'on peut confier à un·e responsable. perEdition : chaque fiche appartient à une édition.
   own : champ (liste d'e-mails) qui permet à un·e bénévole de lire seulement ses propres fiches. */
const COLS={
  editions:{read:ALL_ROLES,write:BOARD},
  contacts:{read:STAFF,write:BOARD,module:"contacts"},
  tasks:{read:STAFF,write:STAFF,perEdition:true},
  guests:{read:STAFF,write:BOARD,module:"invites",perEdition:true},
  exhibitors:{read:STAFF,write:BOARD,module:"invites",perEdition:true},
  lodging:{read:STAFF,write:BOARD,module:"logistique",perEdition:true},
  transport:{read:STAFF,write:BOARD,module:"logistique",perEdition:true},
  activities:{read:ALL_ROLES,write:BOARD,module:"programme",perEdition:true},
  volunteers:{read:STAFF,write:BOARD,module:"benevoles",perEdition:true},
  shifts:{read:ALL_ROLES,write:BOARD,module:"benevoles",perEdition:true,own:"emails"},
  sponsors:{read:STAFF,write:BOARD,module:"sponsors",perEdition:true},
  suppliers:{read:STAFF,write:BOARD,module:"fournisseurs",perEdition:true},
  members:{read:STAFF,write:MONEY,module:"membres"},
  budget:{read:STAFF,write:MONEY,module:"finances",perEdition:true},
  entries:{read:STAFF,write:MONEY,module:"finances",perEdition:true},
  ticketing:{read:STAFF,write:MONEY,module:"finances",perEdition:true},
};
/* Modules qu'on peut confier à un·e responsable de pôle. */
const DELEGABLE=[["invites","Invités & exposants"],["logistique","Logement & transport"],["programme","Programme & activités"],["benevoles","Bénévoles"],
  ["sponsors","Sponsors & partenaires"],["fournisseurs","Fournisseurs"],["contacts","Contacts"],["finances","Budget & billetterie"],["membres","Membres & cotisations"]];

let ME={uid:"local",name:"",email:"",role:"admin",modules:[]};
const canRead=c=>COLS[c].read.includes(ME.role);
const canWrite=c=>COLS[c].write.includes(ME.role)||(ME.role==="responsable"&&COLS[c].module&&(ME.modules||[]).includes(COLS[c].module));
const isStaff=()=>STAFF.includes(ME.role);
const isAdmin=()=>ME.role==="admin";

/* ---------- Stockage ----------
   Mode « cloud » : Firebase (données partagées par toute l'équipe, disponibles hors connexion).
   Mode « local » : sans configuration Firebase, tout reste dans ce navigateur (pratique pour essayer). */
let S=Object.fromEntries(Object.keys(COLS).map(c=>[c,new Map()]));
let TEAM=new Map(),REQUESTS=new Map();
let CFG={assoName:"Association Dragon Ball Day",assoAddress:"",website:"https://www.dragonballdays.ch",memberFee:30};
let MODE="loading",DB=null,LOADED=new Set(),WAIT=[];
const LSKEY="dbday-data-v1";
const all=c=>[...S[c].values()];
const get=(c,id)=>S[c].get(id);
let CACHE={};
const memo=(k,f)=>k in CACHE?CACHE[k]:(CACHE[k]=f());
function changed(){CACHE={};scheduleRender()}
const chains=new Map();
function enqueue(key,fn){const p=(chains.get(key)||Promise.resolve()).then(fn);chains.set(key,p.catch(()=>{}));return p}
const clean=o=>JSON.parse(JSON.stringify(o));
function dbErr(e){
  if(e&&e.code==="permission-denied")toast("Ton rôle ne permet pas cette modification.","freezer");
  else toast("Enregistrement impossible pour l’instant. Vérifie la connexion puis réessaie.","freezer");
}
function cloudWrite(col,id,data){
  return enqueue(col+"/"+id,async()=>{
    const ref=DB.collection(col).doc(id);
    try{data?await ref.set(data):await ref.delete()}catch(e){dbErr(e)}
  });
}
function put(col,o){
  o=clean({...o});if(!o.id)o.id=uid();if(!o.createdAt)o.createdAt=new Date().toISOString();o.updatedAt=new Date().toISOString();o.updatedBy=ME.name||ME.email||"";
  S[col].set(o.id,o);changed();
  if(MODE==="cloud")cloudWrite(col,o.id,o);else saveLocal();
  return o;
}
function del(col,id){S[col].delete(id);changed();if(MODE==="cloud")cloudWrite(col,id,null);else saveLocal()}
function putCfg(p){CFG={...CFG,...p};changed();if(MODE==="cloud")enqueue("config/main",()=>DB.doc("config/main").set(clean(CFG)).catch(dbErr));else saveLocal()}
let saveT;
function saveLocal(){clearTimeout(saveT);saveT=setTimeout(()=>{ls(LSKEY,JSON.stringify({cfg:CFG,data:Object.fromEntries(Object.keys(COLS).map(c=>[c,all(c)]))}))},150)}
function loadLocal(){try{const j=JSON.parse(ls(LSKEY)||"null");if(!j)return;CFG={...CFG,...j.cfg};Object.keys(COLS).forEach(c=>{S[c]=new Map((j.data[c]||[]).map(o=>[o.id,o]))})}catch(e){}}

/* ---------- Connexion Firebase ---------- */
// Pour les tests : window.DBD_EMULATEUR=true branche l'app sur les émulateurs Firebase locaux.
function useEmulator(app){app.auth().useEmulator("http://localhost:9099");app.firestore().useEmulator("localhost",8080)}
function showLogin(on){$("#login").hidden=!on}
function loginScreen(html){showLogin(true);$("#loginForm").innerHTML=`<img class="logo" alt="Dragon Ball Day" src="img/logo.webp">`+html}
async function connect(){
  const conf=window.DBD_FIREBASE_CONFIG;
  if(!conf)return null;
  if(!window.firebase){loginScreen(`<img class="goku" alt="" src="img/freezer.webp"><h2 style="text-align:center">Connexion impossible</h2><p class="small" style="text-align:center">Vérifie la connexion internet, puis recharge la page.</p>`);return new Promise(()=>{})}
  firebase.initializeApp(conf);
  const db=firebase.firestore();
  if(window.DBD_EMULATEUR)useEmulator(firebase.app());
  db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  const form=$("#loginForm");
  form.addEventListener("submit",e=>{
    e.preventDefault();e.stopImmediatePropagation();const err=$("#lgErr");err.hidden=true;
    firebase.auth().signInWithEmailAndPassword($("#lgMail").value.trim(),$("#lgPass").value)
      .catch(()=>{err.textContent="E-mail ou mot de passe incorrect.";err.hidden=false});
  },true);
  $("#lgForgot").addEventListener("click",()=>{
    const m=$("#lgMail").value.trim(),err=$("#lgErr");
    if(!m){err.textContent="Écris d’abord ton e-mail ci-dessus.";err.hidden=false;return}
    firebase.auth().sendPasswordResetEmail(m).finally(()=>{err.style.color="var(--good)";err.textContent="Si ce compte existe, un e-mail pour choisir un nouveau mot de passe vient d’être envoyé.";err.hidden=false});
  });
  const user=await new Promise(res=>{firebase.auth().onAuthStateChanged(u=>{if(u)res(u);else showLogin(true)})});
  showLogin(false);
  const profRef=db.doc("users/"+user.uid);
  let prof=null;
  try{const s=await profRef.get();prof=s.exists?s.data():null}catch(e){prof=null}
  if(!prof){
    // Le tout premier compte qui se connecte devient administrateur ; les suivants attendent qu'on leur donne un rôle.
    let setup=true,denied=false;try{setup=(await db.doc("config/setup").get({source:"server"})).exists}catch(e){denied=e&&e.code==="permission-denied"}
    // La base refuse même cette lecture : les règles de firestore.rules ne sont pas (encore) publiées dans la console.
    if(denied){
      loginScreen(`<img class="goku" alt="" src="img/freezer.webp"><h2 style="text-align:center">La base refuse l’accès</h2><p class="small" style="text-align:center">Ton compte <b>${esc(user.email)}</b> est bien connecté, mais la base de données n’accepte encore aucune lecture. Publie les règles : Console Firebase &gt; Firestore Database &gt; Règles, colle le contenu du fichier <b>firestore.rules</b> du dépôt, puis Publier. Recharge ensuite cette page.</p><button type="button" class="btn" id="lgOut">Se déconnecter</button>`);
      $("#lgOut").onclick=()=>firebase.auth().signOut().then(()=>location.reload());
      return new Promise(()=>{});
    }
    const name=(user.email||"").split("@")[0];
    if(!setup){
      prof={email:user.email,name,role:"admin",modules:[]};
      const b=db.batch();b.set(profRef,prof);b.set(db.doc("config/setup"),{admin:user.uid,at:new Date().toISOString()});
      try{await b.commit()}catch(e){prof=null}
    }
    if(!prof){
      db.doc("requests/"+user.uid).set({email:user.email,name,at:new Date().toISOString()}).catch(()=>{});
      loginScreen(`<img class="goku" alt="" src="img/piccolo.webp"><h2 style="text-align:center">Presque prêt !</h2><p class="small" style="text-align:center">Ton compte <b>${esc(user.email)}</b> est bien connecté, mais il n’a pas encore de rôle. Demande à un·e administrateur·rice de l’association de t’en donner un, puis recharge la page.</p><button type="button" class="btn" id="lgOut">Se déconnecter</button>`);
      $("#lgOut").onclick=()=>firebase.auth().signOut().then(()=>location.reload());
      profRef.onSnapshot(s=>{if(s.exists)location.reload()},()=>{});
      return new Promise(()=>{});
    }
  }
  ME={uid:user.uid,email:user.email,...prof,modules:prof.modules||[]};
  // Si un·e admin change ce rôle pendant que l'app est ouverte, on recharge pour appliquer les nouveaux droits.
  profRef.onSnapshot(s=>{if(s.metadata.fromCache||s.metadata.hasPendingWrites)return;if(!s.exists){location.reload();return}const p=s.data();if(p.role!==ME.role||String(p.modules||[])!==String(ME.modules)){location.reload();return}ME={...ME,name:p.name};changed()},()=>{});
  return db;
}

async function initStore(){
  let db=null;
  try{db=await connect()}catch(e){db=null}
  const cols=Object.keys(COLS).filter(canRead);
  WAIT=[...cols,"config"];
  if(db){
    DB=db;MODE="cloud";
    // Un·e bénévole ne lit que ses propres créneaux (la base le vérifie aussi).
    const src=c=>COLS[c].own&&!isStaff()?DB.collection(c).where(COLS[c].own,"array-contains",(ME.email||"").toLowerCase()):DB.collection(c);
    cols.forEach(c=>src(c).onSnapshot(snap=>{S[c]=new Map(snap.docs.map(d=>[d.id,{...d.data(),id:d.id}]));LOADED.add(c);changed()},()=>{LOADED.add(c);changed()}));
    DB.doc("config/main").onSnapshot(s=>{if(s.exists)CFG={...CFG,...s.data()};LOADED.add("config");changed()},()=>{LOADED.add("config");changed()});
    DB.collection("users").onSnapshot(s=>{TEAM=new Map(s.docs.map(d=>[d.id,{...d.data(),uid:d.id}]));changed()},()=>{});
    if(isAdmin())DB.collection("requests").onSnapshot(s=>{REQUESTS=new Map(s.docs.map(d=>[d.id,{...d.data(),uid:d.id}]));changed()},()=>{});
    setTimeout(()=>{WAIT.forEach(c=>LOADED.add(c));changed()},8000);
  }else{
    MODE="local";loadLocal();WAIT.forEach(c=>LOADED.add(c));changed();
  }
}
const ready=()=>MODE!=="loading"&&WAIT.every(c=>LOADED.has(c));

/* ---------- Équipe (administrateur·rice) ---------- */
// Crée le compte de connexion sans déconnecter l'admin : on passe par une deuxième instance Firebase.
async function createMember({email,name,role,modules}){
  const second=firebase.apps.find(a=>a.name==="ajout")||firebase.initializeApp(window.DBD_FIREBASE_CONFIG,"ajout");
  if(window.DBD_EMULATEUR&&!second._emu){second.auth().useEmulator("http://localhost:9099");second._emu=true}
  const auth2=second.auth();
  let uidNew=null;
  try{
    const tmp=Array.from(crypto.getRandomValues(new Uint8Array(18)),b=>b.toString(36)).join("")+"A1!";
    const cred=await auth2.createUserWithEmailAndPassword(email,tmp);uidNew=cred.user.uid;
    await auth2.sendPasswordResetEmail(email);
  }finally{await auth2.signOut().catch(()=>{})}
  await DB.doc("users/"+uidNew).set({email,name,role,modules:modules||[]});
  return uidNew;
}
// Un membre de l'équipe (identifiant) ou un nom écrit à la main.
const memberName=u=>{if(!u)return "";const m=TEAM.get(u);return m?(m.name||m.email):u};
