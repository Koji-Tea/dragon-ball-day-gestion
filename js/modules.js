"use strict";
/* ---------- Moteur de modules ----------
   Un module se décrit par ses champs ; le formulaire, l'enregistrement et la suppression sont générés.
   Les modules des étapes suivantes (invités, sponsors, bénévoles…) se branchent de la même façon. */
const MODS={};
const VIEWS={};
const UI={edition:ls("dbday-edition")||"",q:"",filter:"",taskTab:"ouvertes",taskPole:""};
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
    case "member":input=`<select id="${id}" name="${f.k}"><option value="">Personne</option>${[...TEAM.values()].sort((a,b)=>(a.name||"").localeCompare(b.name||"")).map(m=>opt(m.uid,m.name||m.email,v)).join("")}${v&&!TEAM.has(v)?opt(v,v,v):""}</select>`;break;
    case "check":return `<label class="check ${f.wide?"wide":""}"><input type="checkbox" name="${f.k}" ${v?"checked":""}> ${esc(f.l)}</label>`;
    case "checks":return `<div class="${cls}"><span>${esc(f.l)}</span><div class="checks">${f.options.map(([k,l])=>`<label class="check"><input type="checkbox" name="${f.k}" value="${esc(k)}" ${(v||[]).includes(k)?"checked":""}> ${esc(l)}</label>`).join("")}</div></div>`;
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
    else if(f.type==="money"||f.type==="number"){const v=fd.get(f.k);o[f.k]=v===""||v==null?null:+v}
    else o[f.k]=String(fd.get(f.k)??"").trim();
  });
  return o;
}
function recordSheet(key,id,preset={}){
  const mod=MODS[key];const o=id?get(mod.col,id):{...preset};if(id&&!o)return;
  const ro=!canWrite(mod.col);
  openSheet(sheetHead(id?(mod.titleOf?mod.titleOf(o):esc(o.name||mod.one)):mod.newLabel,mod.img)+
    (mod.sheetTop&&id?mod.sheetTop(o):"")+
    `<form data-submit="record" data-mod="${key}" data-id="${id||""}"><fieldset style="border:0;padding:0;margin:0" ${ro?"disabled":""}><div class="fields">${mod.fields.map(f=>fieldHTML(f,o)).join("")}</div></fieldset>
    ${o.updatedAt?`<p class="tiny muted" style="margin:12px 0 0">Modifié le ${fDate(o.updatedAt.slice(0,10))}${o.updatedBy?" par "+esc(o.updatedBy):""}</p>`:""}
    <div class="formfoot">${id&&!ro?`<button type="button" class="btn danger" data-act="delRecord" data-mod="${key}" data-id="${id}" data-confirm="Oui, supprimer">Supprimer</button>`:"<span></span>"}${ro?`<span class="small muted">Lecture seule pour ton rôle.</span>`:`<button class="btn primary">Enregistrer</button>`}</div></form>`);
}
function saveRecord(key,form){
  const mod=MODS[key];const id=form.dataset.id||undefined;const old=id?get(mod.col,id):null;
  let o={...(old||{}),...readForm(mod,form),id,demo:false};
  if(COLS[mod.col].perEdition&&!o.editionId){const e=currentEdition();if(!e){toast("Crée d’abord une édition de la convention.","freezer");return}o.editionId=e.id}
  if(mod.beforeSave)o=mod.beforeSave(o,old);
  const saved=put(mod.col,o);if(mod.afterSave)mod.afterSave(saved,old);closeSheet();toast(old?"Modifications enregistrées.":mod.added||"Enregistré !",mod.img);
}
