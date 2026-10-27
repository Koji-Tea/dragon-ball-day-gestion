"use strict";
/* ---------- Demandes de modification des comptes à accès limité ----------
   Un accès limité ne modifie rien directement : son formulaire crée une demande (collection proposals)
   avec seulement les champs changés. Un·e admin la valide (le changement est appliqué) ou la refuse. */
const PROP_ACTIONS={create:"Ajout",update:"Modification",delete:"Suppression"};
const modOfCol=col=>Object.values(MODS).find(m=>m.col===col);
const pending=()=>[...PROPOSALS.values()].filter(p=>p.status==="pending").sort((a,b)=>a.at<b.at?-1:1);

// Valeur lisible d'un champ, pour comparer avant / après.
function fieldText(f,v){
  if(v==null||v===""||(Array.isArray(v)&&!v.length))return "–";
  if(f.type==="check")return v?"oui":"non";
  if(f.type==="member")return memberName(v);
  if(f.type==="ref")return refName(f.col,v)||v;
  if(f.type==="file")return v.name||"document";
  if(f.type==="photo")return "photo";
  if(f.type==="money")return chf(v);
  if(f.type==="date")return fDate(v);
  const op=f.options&&(typeof f.options==="function"?f.options():f.options);
  if(op&&Array.isArray(op[0])){const pick=k=>(op.find(x=>x[0]===k)||[k,k])[1];return Array.isArray(v)?v.map(pick).join(", "):pick(v)}
  return Array.isArray(v)?v.join(", "):String(v);
}
// Vide, non coché ou absent comptent pour pareil ; une valeur par défaut ajoutée par le formulaire n'est pas un changement.
const blank=v=>v==null||v===""||v===false||(Array.isArray(v)&&!v.length);
const same=(a,b)=>blank(a)&&blank(b)||JSON.stringify(a??null)===JSON.stringify(b??null);

function sendProposal(p){
  const id=uid(),doc=clean({...p,module:COLS[p.col].module,by:ME.uid,byName:ME.name||ME.email,at:new Date().toISOString(),status:"pending"});
  PROPOSALS.set(id,{...doc,id});changed();
  DB.doc("proposals/"+id).set(doc).then(()=>toast("Demande envoyée. Tu verras sur l’accueil quand elle est validée.","piccolo"))
    .catch(()=>{PROPOSALS.delete(id);changed();toast("La demande n’a pas pu être envoyée. Vérifie la connexion puis réessaie.","freezer")});
}
function proposeRecord(mod,o,old){
  storeFiles(mod,o,old,true); // les nouveaux documents partent tout de suite ; l'ancien reste jusqu'à la validation
  if(!old){const id=o.id||uid();sendProposal({col:mod.col,recId:id,action:"create",title:o.name||o.title||o.label||o.item||"",changes:{...o,id}});return}
  const changes={};mod.fields.forEach(f=>{if(!same(o[f.k],old[f.k])&&!(old[f.k]===undefined&&o[f.k]===f.def))changes[f.k]=o[f.k]??null});
  if(!Object.keys(changes).length){toast("Aucun changement à envoyer.","piccolo");return}
  sendProposal({col:mod.col,recId:old.id,action:"update",title:old.name||old.title||old.label||old.item||"",changes,before:Object.fromEntries(Object.keys(changes).map(k=>[k,old[k]??null]))});
}
function proposeDelete(mod,id){
  const o=get(mod.col,id);if(!o)return;
  sendProposal({col:mod.col,recId:id,action:"delete",title:o.name||o.title||o.label||o.item||"",changes:{}});
}

function approveProposal(id){
  const p=PROPOSALS.get(id),mod=p&&modOfCol(p.col);if(!p||!mod)return;
  const cur=get(p.col,p.recId);
  if(p.action==="delete"){if(cur)del(p.col,p.recId)}
  else if(p.action==="update"&&!cur){toast("Cette fiche a été supprimée entre-temps : la demande ne peut plus s’appliquer.","freezer");return}
  else{
    // Document remplacé ou retiré par la demande : l'ancien fichier n'est plus utile.
    Object.entries(p.before||{}).forEach(([k,v])=>{if(v&&v.fileId&&(!p.changes[k]||p.changes[k].fileId!==v.fileId))dropAttachment(v.fileId)});
    put(p.col,{...(cur||{}),...p.changes,id:p.recId});
  }
  DB.doc("proposals/"+id).update({status:"approved",doneAt:new Date().toISOString(),doneBy:ME.name||ME.email}).catch(dbErr);
  closeSheet();toast("Demande validée et appliquée.","goku");
}
function refuseProposal(id){
  const p=PROPOSALS.get(id);if(!p)return;
  // Les documents envoyés avec la demande ne servent plus.
  filesOf(p.changes).forEach(f=>{if(!filesOf(get(p.col,p.recId)).some(x=>x.fileId===f.fileId))dropAttachment(f.fileId)});
  DB.doc("proposals/"+id).update({status:"refused",doneAt:new Date().toISOString(),doneBy:ME.name||ME.email}).catch(dbErr);
  closeSheet();toast("Demande refusée.","freezer");
}
function dismissProposal(id){PROPOSALS.delete(id);changed();DB.doc("proposals/"+id).delete().catch(()=>{})}

function proposalSheet(id){
  const p=PROPOSALS.get(id),mod=p&&modOfCol(p.col);if(!p||!mod)return;
  const cur=get(p.col,p.recId)||{};
  const rows=p.action==="delete"?`<p class="small">${esc(p.byName)} demande de <b>supprimer</b> cette fiche.</p>`
    :`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Champ</th>${p.action==="update"?"<th>Avant</th>":""}<th>${p.action==="update"?"Après":"Valeur"}</th></tr></thead><tbody>${
      mod.fields.filter(f=>p.changes[f.k]!==undefined&&!(p.action==="create"&&fieldText(f,p.changes[f.k])==="–")).map(f=>`<tr><td><b>${esc(f.l)}</b></td>${p.action==="update"?`<td class="muted">${esc(fieldText(f,(p.before||{})[f.k]))}</td>`:""}<td>${esc(fieldText(f,p.changes[f.k]))}${f.type==="file"&&p.changes[f.k]?` <button type="button" class="btn sm ghost" data-act="openFile" data-file="${esc(p.changes[f.k].fileId)}" data-type="${esc(p.changes[f.k].type||"")}">Ouvrir</button>`:""}</td></tr>`).join("")}</tbody></table></div>`;
  const stale=p.action!=="create"&&!get(p.col,p.recId);
  openSheet(sheetHead(`${PROP_ACTIONS[p.action]} · ${esc(mod.label)}`,mod.img)+
    `<p class="small muted" style="margin-top:0">Demandé par <b>${esc(p.byName)}</b> le ${fDate(p.at.slice(0,10))}${p.title||cur.name?` · fiche « ${esc(p.title||cur.name)} »`:""}</p>${rows}
    ${stale?`<p class="small" style="color:var(--bad)">Cette fiche n’existe plus.</p>`:""}
    ${p.status==="pending"&&isAdmin()?`<div class="formfoot"><button type="button" class="btn danger" data-act="refuseProposal" data-id="${p.id}">Refuser</button><button type="button" class="btn primary" data-act="approveProposal" data-id="${p.id}" ${stale?"disabled":""}>Valider</button></div>`
    :`<p class="small muted">${p.status==="approved"?"Validée":p.status==="refused"?"Refusée":"En attente de validation"}${p.doneBy?" par "+esc(p.doneBy):""}.</p>`}`);
}

// Carte de l'accueil : demandes à valider (admin) ou mes demandes (accès limité).
function proposalsCard(){
  if(isAdmin()){const xs=pending();if(!xs.length)return "";
    return `<div class="card"><h2>Demandes à valider · ${xs.length}</h2><div class="list">${xs.map(p=>{const m=modOfCol(p.col);return `<div class="item click" data-act="openProposal" data-id="${p.id}"><span class="ic-w">${ic("alert")}</span><div class="main"><b>${esc(PROP_ACTIONS[p.action])} · ${esc(m?m.label:p.col)}${p.title?" · "+esc(p.title):""}</b><span class="small muted">${esc(p.byName)} · ${fDate(p.at.slice(0,10))}</span></div><span class="pill warn">À valider</span></div>`}).join("")}</div></div>`}
  if(ME.role!=="responsable")return "";
  const xs=[...PROPOSALS.values()].sort((a,b)=>a.at<b.at?1:-1);if(!xs.length)return "";
  return `<div class="card"><h2>Mes demandes</h2><div class="list">${xs.map(p=>{const m=modOfCol(p.col);return `<div class="item"><div class="main click" data-act="openProposal" data-id="${p.id}"><b>${esc(PROP_ACTIONS[p.action])} · ${esc(m?m.label:p.col)}${p.title?" · "+esc(p.title):""}</b><span class="small muted">${fDate(p.at.slice(0,10))}</span></div>${p.status==="pending"?`<span class="pill warn">En attente</span>`:`<span class="pill ${p.status==="approved"?"good":"bad"}">${p.status==="approved"?"Validée":"Refusée"}</span><button type="button" class="btn sm ghost" data-act="dismissProposal" data-id="${p.id}" aria-label="Retirer de la liste">×</button>`}</div>`}).join("")}</div></div>`;
}
