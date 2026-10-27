"use strict";
/* ---------- Moteur de modules ----------
   Un module se décrit par ses champs ; le formulaire, l'enregistrement et la suppression sont générés.
   Les modules des étapes suivantes (invités, sponsors, bénévoles…) se branchent de la même façon. */
const MODS={};
const VIEWS={};
const UI={edition:ls("dbday-edition")||"",q:"",filter:"",taskTab:"ouvertes",taskPole:"",tab:{},day:""};
function defineMod(m){MODS[m.key]=m;return m}

/* Édition affichée : celle choisie, sinon la prochaine à venir, sinon la plus récente. */
function editions(){return memo("editions",()=>all("editions").sort((a,b)=>(a.date||"")<(b.date||"")?-1:1))}
function currentEdition(){
  const eds=editions();if(!eds.length)return null;
  return eds.find(e=>e.id===UI.edition)||eds.find(e=>(e.date||"")>=today())||eds[eds.length-1];
}
function inEdition(col){const e=currentEdition();return all(col).filter(o=>e&&o.editionId===e.id)}

function fieldHTML(f,o){
  const v=o[f.k]??f.def??"",id="f_"+f.k,req=f.req?"required":"",cls=f.wide||f.type==="textarea"||f.type==="checks"?"f wide":"f";
  let input;
  switch(f.type){
    case "textarea":input=`<textarea id="${id}" name="${f.k}" ${req} placeholder="${esc(f.ph||"")}">${esc(v)}</textarea>`;break;
    case "select":input=`<select id="${id}" name="${f.k}" ${req}>${f.blank?`<option value="">${esc(f.blank)}</option>`:""}${(typeof f.options==="function"?f.options():f.options).map(x=>Array.isArray(x)?opt(x[0],x[1],v):opt(x,x,v)).join("")}</select>`;break;
    // Un nom libre, ou un membre de l'équipe proposé dans la liste (on garde alors son identifiant).
    case "member":input=`<input id="${id}" name="${f.k}" list="${id}_l" value="${esc(memberName(v))}" placeholder="Nom de la personne" autocomplete="off"><datalist id="${id}_l">${[...TEAM.values()].sort((a,b)=>(a.name||"").localeCompare(b.name||"")).map(m=>`<option value="${esc(m.name||m.email)}">`).join("")}</datalist>`;break;
    case "ref":input=`<input id="${id}" name="${f.k}" list="${id}_l" value="${esc(refName(f.col,v)||v)}" placeholder="${esc(f.ph||"Nom")}" autocomplete="off"><datalist id="${id}_l">${(COLS[f.col].perEdition?inEdition(f.col):all(f.col)).map(x=>x.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,"fr")).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`;break;
    case "file":return `<div class="f wide"><span>${esc(f.l)}</span><div id="${id}_box">${fileBox(id,f,v&&v.fileId?v:null)}</div>${f.help?`<span class="tiny muted" style="font-weight:600">${esc(f.help)}</span>`:""}</div>`;
    case "photo":return `<div class="f wide"><span>${esc(f.l)}</span><div class="photo-field"><img id="${id}_img" class="photo-prev" alt="" src="${esc(v)}" ${v?"":"hidden"}><span id="${id}_none" class="avatar photo-none" ${v?"hidden":""}>${ic("people")}</span>
      <input type="hidden" id="${id}" name="${f.k}" value="${esc(v)}"><div class="row"><label class="btn sm" for="${id}_file">${ic("upload")}${v?"Changer":"Choisir une photo"}</label><input id="${id}_file" type="file" accept="image/*" data-change="photo" data-target="${id}" hidden>
      <button type="button" class="btn sm ghost" data-act="photoClear" data-target="${id}" ${v?"":"hidden"}>Retirer</button></div></div>${f.help?`<span class="tiny muted" style="font-weight:600">${esc(f.help)}</span>`:""}</div>`;
    case "check":return `<label class="check ${f.wide?"wide":""}"><input type="checkbox" name="${f.k}" ${v?"checked":""}> ${esc(f.l)}</label>`;
    case "checks":return `<div class="${cls}"><span>${esc(f.l)}</span><div class="checks">${(typeof f.options==="function"?f.options():f.options).map(([k,l])=>`<label class="check"><input type="checkbox" name="${f.k}" value="${esc(k)}" ${(v||[]).includes(k)?"checked":""}> ${esc(l)}</label>`).join("")}</div></div>`;
    case "money":input=`<input id="${id}" name="${f.k}" type="number" step="0.05" inputmode="decimal" value="${esc(v)}" ${req} placeholder="CHF">`;break;
    case "number":input=`<input id="${id}" name="${f.k}" type="number" step="any" inputmode="decimal" value="${esc(v)}" ${req}>`;break;
    default:input=`<input id="${id}" name="${f.k}" type="${f.type||"text"}" value="${esc(v)}" ${req} placeholder="${esc(f.ph||"")}" ${f.type==="email"?'autocomplete="off"':""}>`;
  }
  return `<div class="${cls}"><label for="${id}">${esc(f.l)}</label>${input}${f.help?`<span class="tiny muted" style="font-weight:600">${esc(f.help)}</span>`:""}</div>`;
}
function readForm(mod,form){
  const fd=new FormData(form),o={};
  mod.fields.forEach(f=>{
    if(f.type==="check")o[f.k]=fd.has(f.k);
    else if(f.type==="checks")o[f.k]=fd.getAll(f.k);
    else if(f.type==="member"){const v=String(fd.get(f.k)||"").trim(),m=[...TEAM.values()].find(m=>norm(m.name||m.email)===norm(v));o[f.k]=m?m.uid:v}
    else if(f.type==="ref"){const v=String(fd.get(f.k)||"").trim(),x=v&&all(f.col).find(x=>norm(x.name)===norm(v));o[f.k]=x?x.id:v}
    else if(f.type==="file"){const v=fd.get(f.k);o[f.k]=v?JSON.parse(v):null}
    else if(f.type==="money"||f.type==="number"){const v=fd.get(f.k);o[f.k]=v===""||v==null?null:+v}
    else o[f.k]=String(fd.get(f.k)??"").trim();
  });
  return o;
}
function recordSheet(key,id,preset={}){
  const mod=MODS[key];const o=id?get(mod.col,id):{...preset};if(id&&!o)return;
  const ro=!canWrite(mod.col)&&!canPropose(mod.col),ask=!canWrite(mod.col)&&!ro;
  openSheet(sheetHead(id?(mod.titleOf?mod.titleOf(o):esc(o.name||mod.one)):mod.newLabel,mod.img)+
    (mod.sheetTop&&id?mod.sheetTop(o):"")+
    (ask?`<div class="banner" style="margin:0 0 14px"><img alt="" src="${IMG.piccolo}"><div class="grow small">Tes changements seront envoyés à l’administrateur·rice, qui les validera avant qu’ils apparaissent.</div></div>`:"")+
    `<form data-submit="record" data-mod="${key}" data-id="${id||""}"><fieldset style="border:0;padding:0;margin:0" ${ro?"disabled":""}><div class="fields">${mod.fields.map(f=>fieldHTML(f,o)).join("")}</div></fieldset>
    ${o.updatedAt?`<p class="tiny muted" style="margin:12px 0 0">Modifié le ${fDate(o.updatedAt.slice(0,10))}${o.updatedBy?" par "+esc(o.updatedBy):""}</p>`:""}
    <div class="formfoot">${id&&!ro?`<button type="button" class="btn danger" data-act="delRecord" data-mod="${key}" data-id="${id}" data-confirm="${ask?"Oui, demander":"Oui, supprimer"}">${ask?"Demander la suppression":"Supprimer"}</button>`:"<span></span>"}${ro?`<span class="small muted">Lecture seule pour ton rôle.</span>`:`<button class="btn primary">${ask?"Envoyer pour validation":"Enregistrer"}</button>`}</div></form>`);
}
function saveRecord(key,form){
  const mod=MODS[key];const id=form.dataset.id||undefined;const old=id?get(mod.col,id):null;
  let o={...(old||{}),...readForm(mod,form),id,demo:false};
  if(COLS[mod.col].perEdition&&!o.editionId){const e=currentEdition();if(!e){toast("Crée d’abord une édition de la convention.","freezer");return}o.editionId=e.id}
  if(mod.beforeSave)o=mod.beforeSave(o,old);
  if(!canWrite(mod.col)){proposeRecord(mod,o,old);closeSheet();return}
  storeFiles(mod,o,old);
  const saved=put(mod.col,o);if(mod.afterSave)mod.afterSave(saved,old);closeSheet();toast(old?"Modifications enregistrées.":mod.added||"Enregistré !",mod.img);
}

/* ---------- Briques communes aux écrans de modules ---------- */
// Options d'un menu qui pointe vers une autre fiche (ex. l'invité d'une réservation d'hôtel).
const refOpts=(col,label=o=>o.name)=>()=>(COLS[col].perEdition?inEdition(col):all(col)).slice().sort((a,b)=>String(label(a)).localeCompare(String(label(b)),"fr")).map(o=>[o.id,label(o)]);
const refName=(col,id)=>{const o=id&&get(col,id);return o?(o.name||o.title||""):""};
const addBtn=(key,label,cls="primary")=>canWrite(MODS[key].col)||canPropose(MODS[key].col)?`<button class="btn ${cls}" data-act="newRecord" data-mod="${key}">${ic("plus")}${label}</button>`:"";
// Onglets d'un écran : l'onglet choisi est retenu par écran.
const tabOf=(view,def)=>UI.tab[view]||def;
const segTabs=(view,tabs,def)=>`<div class="seg">${tabs.map(([k,l])=>`<button class="${tabOf(view,def)===k?"on":""}" data-act="tab" data-view="${view}" data-v="${k}">${l}</button>`).join("")}</div>`;
const rowItem=(key,o,{title,sub="",end="",av})=>`<div class="item click" data-act="openRecord" data-mod="${key}" data-id="${o.id}">${av===false?"":o.photo?`<img class="avatar" alt="" src="${esc(o.photo)}">`:`<span class="avatar">${esc(av||initials(title))}</span>`}<div class="main"><b>${esc(title)}</b>${sub?`<span class="small muted">${sub}</span>`:""}</div>${end?`<div class="end">${end}</div>`:""}</div>`;
// Recherche simple sur quelques champs.
const matchQ=(o,keys)=>{const q=norm(UI.q);return !q||norm(keys.map(k=>o[k]).join(" ")).includes(q)};
const searchBox=ph=>`<input class="search" type="search" id="q" data-input="search" placeholder="${esc(ph)}" value="${esc(UI.q)}" aria-label="Rechercher">`;
const statusPill=(v,map)=>v?`<span class="pill ${map[v]||"neutral"}">${esc(v)}</span>`:"";
// Écran « pas encore d'édition », commun aux modules rangés par édition.
const noEdition=(t,img)=>head(t,"","",img)+`<div class="card">${emptyBox(img,"Pas encore d’édition","Ces informations sont rangées par édition de la convention. Crée d’abord l’édition.",`<a class="btn primary" href="#editions">Créer l’édition</a>`)}</div>`;
// Export CSV générique : une colonne par champ du module.
function exportMod(key,xs,name){
  const m=MODS[key];
  const val=(f,o)=>{const v=o[f.k];if(f.type==="check")return v?"oui":"";if(f.type==="member")return memberName(v)||"";if(f.type==="ref")return refName(f.col,v)||v||"";if(f.type==="file")return v&&v.name||"";if(f.type==="photo")return v?"oui":"";
    if(f.type==="checks"){const op=typeof f.options==="function"?f.options():f.options;return (v||[]).map(k=>(op.find(x=>x[0]===k)||[k,k])[1]).join(", ")}
    if(f.type==="select"&&f.options&&typeof f.options==="function"){const x=f.options().find(x=>Array.isArray(x)&&x[0]===v);return x?x[1]:v||""}
    return v??""};
  saveFile(`dragon-ball-day-${name}-${today()}.csv`,csv([m.fields.map(f=>f.l),...xs.map(o=>m.fields.map(f=>val(f,o)))]));
}

/* Photo d'une fiche : recadrée en carré et compressée dans le navigateur, puis gardée dans la fiche elle-même
   (quelques dizaines de Ko). Pas besoin de Firebase Storage, qui n'est pas inclus dans l'offre gratuite. */
function loadPhoto(file,target){
  if(!/^image\//.test(file.type)){toast("Choisis un fichier image (JPG, PNG…).","freezer");return}
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
    const S=320,c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d");
    const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
    g.fillStyle="#fff";g.fillRect(0,0,S,S);g.drawImage(img,sx,sy,side,side,0,0,S,S);URL.revokeObjectURL(url);
    setPhoto(target,c.toDataURL("image/jpeg",0.82));
  };
  img.onerror=()=>{URL.revokeObjectURL(url);toast("Cette image n’a pas pu être lue. Essaie en JPG ou PNG.","freezer")};
  img.src=url;
}
function setPhoto(target,data){
  const h=document.getElementById(target);if(!h)return;h.value=data;
  const im=document.getElementById(target+"_img"),no=document.getElementById(target+"_none"),rm=h.parentNode.querySelector("[data-act=photoClear]"),lb=h.parentNode.querySelector("label.btn");
  im.src=data;im.hidden=!data;no.hidden=!!data;rm.hidden=!data;lb.lastChild.textContent=data?"Changer":"Choisir une photo";
}

/* Pièce jointe d'une fiche (ex. facture PDF). Le fichier choisi attend dans PENDING_FILES jusqu'à l'enregistrement de la fiche,
   puis part dans son propre document (voir saveAttachment) : la fiche ne garde que le nom, la taille et l'identifiant. */
const PENDING_FILES=new Map();
// Champ « document » des fiches : PDF, photo ou fichier bureautique.
const DOC_ACCEPT=".pdf,image/*,.doc,.docx,.odt,.xls,.xlsx,.ods,.txt";
const docField=(k,l)=>({k,l,type:"file",accept:DOC_ACCEPT,wide:true,help:"PDF, photo ou document · 700 Ko au plus (les photos sont réduites automatiquement)."});
const fileBox=(id,f,m)=>`<input type="hidden" id="${id}" name="${f.k}" value="${esc(m?JSON.stringify(m):"")}">
  <div class="row">${m?`<button type="button" class="btn sm" data-act="openFile" data-file="${esc(m.fileId)}" data-type="${esc(m.type||"")}">${ic("clip")}${esc(m.name)}</button><span class="tiny muted">${fSize(m.size)}</span>`:`<span class="small muted">Aucun fichier</span>`}</div>
  <div class="row" style="margin-top:8px"><label class="btn sm" for="${id}_file">${ic("upload")}${m?"Remplacer":"Joindre un fichier"}</label><input id="${id}_file" type="file" accept="${esc(f.accept||"")}" data-change="file" data-target="${id}" data-k="${f.k}" hidden>
  ${m?`<button type="button" class="btn sm ghost" data-act="fileClear" data-target="${id}" data-k="${f.k}">Retirer</button>`:""}</div>`;
function fileField(target,k){const form=document.getElementById(target).form;return MODS[form.dataset.mod].fields.find(f=>f.k===k)}
function setFile(target,k,m){document.getElementById(target+"_box").innerHTML=fileBox(target,fileField(target,k),m)}
function loadFile(file,target,k,shrunk){
  const f=fileField(target,k);
  if(f.accept==="application/pdf"&&file.type!=="application/pdf"&&!/\.pdf$/i.test(file.name)){toast("Choisis un fichier PDF.","freezer");return}
  // Une photo de téléphone dépasse souvent la limite : on la réduit (1600 px, JPEG) avant de l'envoyer.
  if(/^image\/(jpeg|png|webp|heic)/.test(file.type)&&file.size>FILE_MAX/2&&!shrunk){shrinkImage(file).then(sm=>sm?loadFile(sm,target,k,true):toast("Cette photo n’a pas pu être lue. Essaie en JPG.","freezer"));return}
  if(file.size>FILE_MAX){toast(`Ce fichier fait ${fSize(file.size)} : la limite est de ${fSize(FILE_MAX)}. Compresse-le (ex. ilovepdf.com) puis réessaie.`,"freezer");return}
  const r=new FileReader();
  r.onload=()=>{const m={fileId:uid(),name:file.name,size:file.size,type:file.type||"application/pdf"};PENDING_FILES.set(m.fileId,{...m,data:r.result});setFile(target,k,m)};
  r.onerror=()=>toast("Ce fichier n’a pas pu être lu.","freezer");
  r.readAsDataURL(file);
}
function shrinkImage(file){
  return new Promise(res=>{const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{const s=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);
      const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
      c.toBlob(b=>res(b?new File([b],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"}):null),"image/jpeg",0.8)};
    img.onerror=()=>{URL.revokeObjectURL(url);res(null)};img.src=url});
}
// À l'enregistrement : envoie les fichiers choisis, supprime ceux qui ont été remplacés ou retirés.
function storeFiles(mod,o,old,keepOld){
  mod.fields.filter(f=>f.type==="file").forEach(f=>{
    const nw=o[f.k],od=old&&old[f.k],p=nw&&PENDING_FILES.get(nw.fileId);
    if(p)saveAttachment(nw.fileId,{...p,module:COLS[mod.col].module||"",col:mod.col,recId:o.id||""}).catch(()=>toast(`« ${nw.name} » n’a pas pu être enregistré. Réessaie avec un fichier plus léger.`,"freezer"));
    if(!keepOld&&od&&od.fileId&&(!nw||nw.fileId!==od.fileId))dropAttachment(od.fileId);
  });
  PENDING_FILES.clear();
}
async function openFile(id){
  // PDF et images s'ouvrent dans un onglet ; les autres documents se téléchargent sous leur nom.
  const meta=PENDING_FILES.get(id)||document.querySelector(`[data-file="${id}"]`)?.dataset||{};
  const view=/^(application\/pdf|image\/)/.test(meta.type||"application/pdf");
  const w=view?window.open("","_blank"):null;
  try{
    const d=PENDING_FILES.get(id)||await loadAttachment(id);if(!d)throw 0;
    const blob=await (await fetch(d.data)).blob(),url=URL.createObjectURL(blob);
    if(w)w.location.href=url;else{const a=document.createElement("a");a.href=url;a.download=d.name;document.body.appendChild(a);a.click();a.remove()}
  }catch(e){if(w)w.close();toast("Ce fichier n’a pas pu être ouvert. Vérifie la connexion puis réessaie.","freezer")}
}
