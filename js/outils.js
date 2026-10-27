"use strict";
/* ---------- Petits outils partagés par tous les modules ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fCHF=new Intl.NumberFormat("fr-CH",{style:"currency",currency:"CHF"});
const chf=n=>fCHF.format(Math.round((+n||0)*100)/100);
const num=(n,d=0)=>new Intl.NumberFormat("fr-CH",{maximumFractionDigits:d}).format(+n||0);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>iso(new Date());
const addDays=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return iso(d)};
const daysTo=s=>Math.round((new Date(s+"T12:00:00")-new Date(today()+"T12:00:00"))/864e5);
const fDate=s=>s?new Date(s+"T12:00:00").toLocaleDateString("fr-CH",{day:"numeric",month:"short",year:"numeric"}):"–";
const fLong=s=>s?new Date(s+"T12:00:00").toLocaleDateString("fr-CH",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"–";
const fDay=s=>s?new Date(s+"T12:00:00").toLocaleDateString("fr-CH",{weekday:"short",day:"numeric",month:"short"}):"–";
const sum=(a,f=x=>x)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const initials=s=>String(s||"?").split(/[\s-]+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
const plural=(n,a,b)=>n+" "+(n>1?(b||a+"s"):a);
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}

/* Les personnages dessinés par Lolo : chacun accompagne un module. */
const IMG={logo:"img/logo.webp",goku:"img/goku.webp",saiyaman:"img/saiyaman.webp",bulma:"img/bulma.webp",chichi:"img/chichi.webp",piccolo:"img/piccolo.webp",trunks:"img/trunks.webp",freezer:"img/freezer.webp"};

const ICON={
 home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
 check:'<path d="m4.5 12.5 4.5 4.5 10.5-11"/>',
 list:'<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="m7 9 1.5 1.5L11 8M7 15l1.5 1.5L11 14M13.5 9.5h4M13.5 15.5h4"/>',
 people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6-.2 4.4 1.4 5 4.4"/>',
 star:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
 more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 down:'<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
 mail:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
 phone:'<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 cal:'<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};
const ic=(n,extra="")=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICON[n]}</svg>`;

/* Une boule de cristal à n étoiles (1 à 7), allumée ou éteinte. */
function dragonBall(n,lit){
  const pos={1:[[12,12]],2:[[9,12],[15,12]],3:[[12,8.6],[8.9,14],[15.1,14]],4:[[9,9],[15,9],[9,15],[15,15]],5:[[12,7.6],[7.8,11],[16.2,11],[9.4,16],[14.6,16]],
    6:[[9,8],[15,8],[7.6,12.4],[16.4,12.4],[9.4,16.6],[14.6,16.6]],7:[[12,7.2],[8,9.6],[16,9.6],[12,12],[8,14.4],[16,14.4],[12,16.8]]}[n];
  const r=n<=2?3.2:n<=4?2.5:2.1;
  const star=(x,y)=>{let p="";for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;p+=(i?"L":"M")+(x+rr*Math.cos(a)).toFixed(2)+" "+(y+rr*Math.sin(a)).toFixed(2)}return `<path d="${p}Z"/>`};
  const id="db"+n+(lit?"a":"b");
  return `<svg viewBox="0 0 24 24" role="img" aria-label="Boule à ${n} étoile${n>1?"s":""}${lit?"":", pas encore trouvée"}"><defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${lit?"#FFF2A8":"#E9E4DC"}"/><stop offset=".45" stop-color="${lit?"#FFB000":"#CFC8BD"}"/><stop offset="1" stop-color="${lit?"#E86A00":"#A9A196"}"/></radialGradient></defs>
    <circle cx="12" cy="12" r="10.6" fill="url(#${id})" stroke="#2A2A2A" stroke-width="1.4"/><g fill="${lit?"#D10F0F":"#8E877D"}">${pos.map(([x,y])=>star(x,y)).join("")}</g>
    <ellipse cx="8.4" cy="6.8" rx="2.6" ry="1.5" fill="#fff" opacity=".45" transform="rotate(-30 8.4 6.8)"/></svg>`;
}

const head=(t,sub,actions="",img="")=>`<div class="page-head"><div class="row" style="gap:12px;flex-wrap:nowrap">${img?`<img class="who-img" alt="" src="${IMG[img]}">`:""}<div><h1>${t}</h1>${sub?`<p>${sub}</p>`:""}</div></div><div class="row">${actions}</div></div>`;
const emptyBox=(img,title,text,btn="")=>`<div class="empty"><img alt="" src="${IMG[img]}"><b style="color:var(--ink)">${title}</b><span class="small">${text}</span>${btn}</div>`;
const opt=(v,l,sel)=>`<option value="${esc(v)}" ${v===sel?"selected":""}>${esc(l)}</option>`;

let toastT;
function toast(msg,img="goku"){clearTimeout(toastT);$("#toastRoot").innerHTML=`<div class="toast" role="status"><img alt="" src="${IMG[img]}">${esc(msg)}</div>`;toastT=setTimeout(()=>{$("#toastRoot").innerHTML=""},3400)}

function openSheet(html){$("#sheetRoot").innerHTML=`<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;document.body.style.overflow="hidden";const f=$("#sheetRoot input:not([type=hidden]):not([type=checkbox]),#sheetRoot select");if(f&&window.innerWidth>700)f.focus()}
function closeSheet(){$("#sheetRoot").innerHTML="";document.body.style.overflow=""}
const sheetHead=(title,img)=>`<div class="sheet-head"><div class="row" style="flex-wrap:nowrap">${img?`<img alt="" src="${IMG[img]}">`:""}<h2>${title}</h2></div><button type="button" class="x" data-act="close" aria-label="Fermer">×</button></div>`;

const csv=rows=>"﻿"+rows.map(r=>r.map(v=>{v=String(v??"");return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(";")).join("\r\n");
function saveFile(filename,data){
  try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:filename.endsWith(".json")?"application/json":"text/csv"}));a.download=filename;document.body.appendChild(a);a.click();a.remove();toast("Fichier enregistré.")}
  catch(e){toast("Le téléchargement n’a pas fonctionné.","freezer")}
}
