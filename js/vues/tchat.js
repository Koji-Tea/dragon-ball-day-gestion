"use strict";
/* ---------- Tchat : sujets de discussion entre les comptes de l'équipe ----------
   Un sujet (threads/{id}) réunit des participant·es ; ses messages sont dans threads/{id}/messages.
   Ce que chacun·e a déjà lu est noté dans reads/{uid} : ça donne le nombre de notifications (la capsule sur l'enveloppe).
   Sans serveur (offre Firebase gratuite), les notifications arrivent quand l'app est ouverte, même en arrière-plan. */
const CHAT={threads:new Map(),msgs:new Map(),reads:{},subs:new Map(),boot:new Set()};
const CHAT_LS="dbday-chat";
const chatName=u=>u===ME.uid?(ME.name||ME.email||"Moi"):(TEAM.get(u)?memberName(u):"Ancien compte");
// Vignette : la photo de la fiche membre qui a le même e-mail, sinon les initiales.
function chatPhoto(u){
  const t=u===ME.uid?ME:TEAM.get(u),mail=t&&t.email;
  if(!mail||!canRead("members"))return "";
  const m=all("members").find(m=>m.photo&&m.email&&norm(m.email)===norm(mail));return m?m.photo:"";
}
const chatAvatar=(u,cls="")=>{const p=chatPhoto(u);return p?`<img class="avatar ${cls}" alt="" src="${esc(p)}">`:`<span class="avatar ${cls}">${esc(initials(chatName(u)))}</span>`};
const chatThreads=()=>[...CHAT.threads.values()].sort((a,b)=>(b.lastAt||b.createdAt||"").localeCompare(a.lastAt||a.createdAt||""));
const chatMsgs=id=>CHAT.msgs.get(id)||[];
const unreadIn=id=>chatMsgs(id).filter(m=>m.by!==ME.uid&&m.at>(CHAT.reads[id]||"")).length;
const unreadTotal=()=>[...CHAT.threads.keys()].reduce((n,id)=>n+unreadIn(id),0);
const capsule=n=>n?`<span class="capsule" aria-label="${plural(n,"nouveau message","nouveaux messages")}">${n>99?"99+":n}</span>`:"";
const chatTime=iso=>{if(!iso)return "";const d=new Date(iso),t=new Date();return d.toDateString()===t.toDateString()?d.toLocaleTimeString("fr-CH",{hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString("fr-CH",{day:"numeric",month:"short"})};
// L'enveloppe en haut de l'écran, avec la capsule du nombre de notifications.
const inboxBtn=()=>{const n=unreadTotal();return `<a href="#tchat" class="inbox" data-act="chatHome" aria-label="Messagerie${n?" · "+plural(n,"notification"):""}">${ic("mail")}${capsule(n)}</a>`};

/* ---------- Écoute ---------- */
function chatStart(){
  if(MODE!=="cloud"){chatLoadLocal();return}
  DB.doc("reads/"+ME.uid).onSnapshot(s=>{CHAT.reads=s.exists?s.data():{};changed()},()=>{});
  DB.collection("threads").where("members","array-contains",ME.uid).onSnapshot({includeMetadataChanges:true},s=>{
    CHAT.threads=new Map(s.docs.map(d=>[d.id,{...d.data(),id:d.id}]));
    CHAT.subs.forEach((off,id)=>{if(!CHAT.threads.has(id)){off();CHAT.subs.delete(id);CHAT.msgs.delete(id)}});
    // Un sujet qu'on vient de créer n'est lisible qu'une fois enregistré sur le serveur : on attend avant d'écouter ses messages.
    s.docs.forEach(d=>{if(!d.metadata.hasPendingWrites)chatSub(d.id)});
    changed();
  },()=>{});
}
function chatSub(id){
  if(CHAT.subs.has(id))return;
  CHAT.subs.set(id,DB.collection(`threads/${id}/messages`).orderBy("at").limitToLast(300).onSnapshot(ms=>{
    // Au premier chargement, rien à annoncer : seuls les messages arrivés ensuite font une notification.
    if(CHAT.boot.has(id))ms.docChanges().forEach(c=>{if(c.type==="added")chatNotify(id,c.doc.data())});
    CHAT.boot.add(id);CHAT.msgs.set(id,ms.docs.map(d=>({...d.data(),id:d.id})));changed();
  },()=>{CHAT.subs.delete(id);setTimeout(()=>{if(CHAT.threads.has(id))chatSub(id)},3000)}));
}
function chatLoadLocal(){
  try{const j=JSON.parse(ls(CHAT_LS)||"null");if(j){CHAT.threads=new Map(j.threads.map(t=>[t.id,t]));CHAT.msgs=new Map(Object.entries(j.msgs||{}));CHAT.reads=j.reads||{}}}catch(e){}
  changed();
}
const chatSaveLocal=()=>ls(CHAT_LS,JSON.stringify({threads:[...CHAT.threads.values()],msgs:Object.fromEntries(CHAT.msgs),reads:CHAT.reads}));
function chatNotify(id,m){
  if(m.by===ME.uid)return;
  const t=CHAT.threads.get(id);if(!t)return;
  if(route==="tchat"&&UI.chat===id&&!document.hidden)return;
  const title=`${chatName(m.by)} · ${t.title}`,body=String(m.text||"").slice(0,120);
  toast(`${title} : ${body.slice(0,60)}`,"bulma");
  if(document.hidden&&"Notification" in window&&Notification.permission==="granted"){
    const o={body,icon:"icon-192.png",tag:"dbday-"+id};
    navigator.serviceWorker&&navigator.serviceWorker.ready?navigator.serviceWorker.ready.then(r=>r.showNotification(title,o)).catch(()=>{try{new Notification(title,o)}catch(e){}}):(()=>{try{new Notification(title,o)}catch(e){}})();
  }
}
function chatMarkRead(id){
  const ms=chatMsgs(id),last=ms.length?ms[ms.length-1].at:"";
  if(!last||(CHAT.reads[id]||"")>=last)return;
  CHAT.reads={...CHAT.reads,[id]:last};
  if(MODE==="cloud")DB.doc("reads/"+ME.uid).set({[id]:last},{merge:true}).catch(()=>{});else chatSaveLocal();
}

/* ---------- Écriture ---------- */
function chatSend(f){
  const id=UI.chat,t=CHAT.threads.get(id),text=String(new FormData(f).get("text")||"").trim();
  if(!t||!text)return;
  const m={by:ME.uid,text:text.slice(0,4000),at:new Date().toISOString()},last={lastAt:m.at,lastText:m.text.slice(0,140),lastBy:ME.uid};
  UI.draft="";
  if(MODE==="cloud"){
    const ref=DB.collection(`threads/${id}/messages`).doc();
    ref.set(m).then(()=>DB.doc("threads/"+id).update(last)).catch(dbErr);
  }else{CHAT.msgs.set(id,[...chatMsgs(id),{...m,id:uid()}]);CHAT.threads.set(id,{...t,...last});chatSaveLocal();changed()}
  CHAT.reads={...CHAT.reads,[id]:m.at};
  if(MODE==="cloud")DB.doc("reads/"+ME.uid).set({[id]:m.at},{merge:true}).catch(()=>{});
  render();setTimeout(()=>{const i=$("#chatText");if(i)i.focus()},0);
}
const chatCanManage=t=>t&&(t.createdBy===ME.uid||isAdmin());
function threadSheet(id){
  const t=id?CHAT.threads.get(id):null;if(id&&!chatCanManage(t))return;
  const people=[...TEAM.values()].filter(u=>u.uid!==ME.uid).sort((a,b)=>chatName(a.uid).localeCompare(chatName(b.uid),"fr"));
  const sel=new Set(t?t.members:[]);
  openSheet(sheetHead(t?"Modifier le sujet":"Nouveau sujet","bulma")+`<form data-submit="chatThread" data-id="${id||""}"><div class="fields">
    <div class="f wide"><label for="thTitle">Sujet</label><input id="thTitle" name="title" required maxlength="80" value="${esc(t?t.title:"")}" placeholder="ex. Stand Polymanga, Déco de la salle…"></div>
    <div class="f wide"><span>Participant·es</span>${people.length?`<div class="row" style="margin-bottom:6px"><button type="button" class="btn sm" data-act="chatAll">Tout le monde</button></div>
      <div class="checks">${people.map(u=>`<label class="check">${chatAvatar(u.uid,"sm")}<input type="checkbox" name="members" value="${esc(u.uid)}" ${sel.has(u.uid)?"checked":""}> ${esc(chatName(u.uid))}</label>`).join("")}</div>`
      :`<span class="small muted">${MODE==="cloud"?"Personne d’autre n’a encore de compte. Ajoute des membres dans Réglages.":"En mode essai, tu es seul·e : les autres comptes apparaissent quand l’app est reliée à Firebase."}</span>`}</div>
    ${t?"":`<div class="f wide"><label for="thFirst">Premier message</label><textarea id="thFirst" name="first" placeholder="Lance la discussion…"></textarea></div>`}
  </div><div class="formfoot">${t?`<button type="button" class="btn danger" data-act="chatDelete" data-id="${id}" data-confirm="Oui, supprimer">Supprimer le sujet</button>`:"<span></span>"}<button class="btn primary">${t?"Enregistrer":"Créer le sujet"}</button></div></form>`);
}
function saveThread(f){
  const id=f.dataset.id,fd=new FormData(f),title=String(fd.get("title")||"").trim(),first=String(fd.get("first")||"").trim();
  if(!title)return;
  const members=[...new Set([ME.uid,...fd.getAll("members")])],now=new Date().toISOString();
  if(id){
    const t=CHAT.threads.get(id);if(!chatCanManage(t))return;
    // L'admin qui modifie un sujet sans y participer n'est pas ajouté·e d'office.
    const mem=t.members.includes(ME.uid)||!isAdmin()?members:members.filter(u=>u!==ME.uid);
    if(MODE==="cloud")DB.doc("threads/"+id).update({title,members:mem}).catch(dbErr);else{CHAT.threads.set(id,{...t,title,members:mem});chatSaveLocal();changed()}
    closeSheet();toast("Sujet mis à jour.","bulma");return;
  }
  const t={title,members,createdBy:ME.uid,createdAt:now,lastAt:first?now:"",lastText:first.slice(0,140),lastBy:first?ME.uid:""};
  if(MODE==="cloud"){
    const ref=DB.collection("threads").doc();
    ref.set(t).then(()=>first&&ref.collection("messages").doc().set({by:ME.uid,text:first.slice(0,4000),at:now})).catch(dbErr);
    UI.chat=ref.id;
  }else{const nid=uid();CHAT.threads.set(nid,{...t,id:nid});CHAT.msgs.set(nid,first?[{id:uid(),by:ME.uid,text:first,at:now}]:[]);chatSaveLocal();UI.chat=nid;changed()}
  if(first)CHAT.reads={...CHAT.reads,[UI.chat]:now};
  closeSheet();toast("Sujet créé ! Les participant·es le voient tout de suite.","bulma");
  if(location.hash!=="#tchat")location.hash="#tchat";else render();
}
async function chatDelete(id){
  const t=CHAT.threads.get(id);if(!chatCanManage(t))return;
  closeSheet();UI.chat="";
  if(MODE==="cloud"){
    try{const ms=await DB.collection(`threads/${id}/messages`).get();await Promise.all(ms.docs.map(d=>d.ref.delete()));await DB.doc("threads/"+id).delete()}catch(e){dbErr(e)}
  }else{CHAT.threads.delete(id);CHAT.msgs.delete(id);chatSaveLocal();changed()}
  toast("Sujet supprimé.","bulma");
}
async function chatNotifPerm(){
  if(!("Notification" in window))return;
  const p=await Notification.requestPermission().catch(()=>"denied");
  toast(p==="granted"?"Notifications activées sur cet appareil.":"Notifications refusées : tu peux les autoriser dans les réglages du navigateur.","bulma");render();
}

/* ---------- Écrans ---------- */
VIEWS.tchat=()=>UI.chat&&CHAT.threads.has(UI.chat)?chatThreadView(UI.chat):chatListView();
function chatListView(){
  const ts=chatThreads(),news=ts.filter(t=>unreadIn(t.id));
  const perm="Notification" in window&&Notification.permission==="default"&&MODE==="cloud";
  return head("Tchat","Les discussions de l’équipe",`<button class="btn primary" data-act="chatNew">${ic("plus")}Nouveau sujet</button>`,"bulma")+
  `<div class="stack">
  ${perm?`<div class="banner" style="margin:0"><img alt="" src="${IMG.bulma}"><div class="grow small"><b>Reçois une notification</b><div class="muted">Quand un message arrive alors que l’app est ouverte en arrière-plan.</div></div><button class="btn sm" data-act="chatNotif">Activer</button></div>`:""}
  ${news.length?`<div class="card"><h2 style="margin:0 0 8px">Notifications</h2><div class="list">${news.map(t=>{const ms=chatMsgs(t.id).filter(m=>m.by!==ME.uid),m=ms[ms.length-1];
    return `<div class="item click" data-act="chatOpen" data-id="${t.id}">${chatAvatar(m.by)}<div class="main"><b>${esc(plural(unreadIn(t.id),"nouveau message","nouveaux messages"))} dans « ${esc(t.title)} »</b><span class="small muted">${esc(chatName(m.by))} : ${esc(String(m.text).slice(0,90))}</span></div><div class="end"><span class="tiny muted">${chatTime(m.at)}</span></div></div>`}).join("")}</div></div>`:""}
  <div class="card"><h2 style="margin:0 0 8px">Mes discussions</h2>
  ${ts.length?`<div class="list">${ts.map(t=>{const n=unreadIn(t.id);
    return `<div class="item click" data-act="chatOpen" data-id="${t.id}"><span class="avatar">${ic("chat")}</span><div class="main"><b>${esc(t.title)}</b><span class="small muted">${t.lastAt?`${esc(t.lastBy===ME.uid?"Toi":chatName(t.lastBy))} : ${esc(t.lastText||"")}`:"Pas encore de message"} · ${plural(t.members.length,"participant·e")}</span></div><div class="end"><span class="tiny muted">${chatTime(t.lastAt||t.createdAt)}</span>${n?"<br>"+capsule(n):""}</div></div>`}).join("")}</div>`
  :emptyBox("bulma","Pas encore de discussion","Crée un sujet, choisis qui y participe, et discutez comme dans un groupe WhatsApp.",`<button class="btn primary" data-act="chatNew">${ic("plus")}Premier sujet</button>`)}</div></div>`;
}
function chatThreadView(id){
  const t=CHAT.threads.get(id),ms=chatMsgs(id);chatMarkRead(id);
  let day="";
  const rows=ms.map((m,i)=>{
    const d=new Date(m.at).toLocaleDateString("fr-CH",{weekday:"long",day:"numeric",month:"long"}),mine=m.by===ME.uid,prev=ms[i-1];
    const sep=d!==day?`<div class="chat-day">${esc(day=d)}</div>`:"",cont=!sep&&prev&&prev.by===m.by;
    return sep+`<div class="msg ${mine?"me":""} ${cont?"cont":""}">${mine?"":cont?`<span class="avatar sm ghost"></span>`:chatAvatar(m.by,"sm")}<div class="bubble">${mine||cont?"":`<b class="who">${esc(chatName(m.by))}</b>`}<div class="txt">${esc(m.text)}</div><span class="time">${new Date(m.at).toLocaleTimeString("fr-CH",{hour:"2-digit",minute:"2-digit"})}</span></div></div>`}).join("");
  return `<div class="chat">
    <div class="chat-head"><button class="btn sm ghost" data-act="chatBack" aria-label="Retour aux discussions">←</button>
      <div class="grow" style="min-width:0"><h1 style="font-size:1.25rem;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</h1><span class="tiny muted">${esc(t.members.map(chatName).join(", "))}</span></div>
      <div class="faces">${t.members.slice(0,5).map(u=>chatAvatar(u,"sm")).join("")}</div>
      ${chatCanManage(t)?`<button class="btn sm" data-act="chatEdit" data-id="${id}">${ic("gear")}</button>`:""}</div>
    <div class="chat-list" id="chatList">${rows||`<p class="small muted" style="text-align:center;margin:30px 0">Pas encore de message. Écris le premier !</p>`}</div>
    <form class="chat-send" data-submit="chatSend"><input id="chatText" name="text" data-input="chatDraft" value="${esc(UI.draft||"")}" placeholder="Écrire un message…" autocomplete="off" maxlength="4000" aria-label="Message"><button class="btn primary" aria-label="Envoyer">${ic("send")}</button></form>
  </div>`;
}
// Après chaque affichage : la conversation reste en bas, sauf si on remontait lire l'historique.
function chatAfterRender(k){
  const cl=$("#chatList");if(!cl)return;
  if(!k||k.id!==UI.chat||k.bottom)cl.scrollTop=cl.scrollHeight;else cl.scrollTop=k.top;
}
