"use strict";
/* ---------- Programme et activités : grille salles × horaires ---------- */
const ACTIVITY_KINDS=["Conférence","Concert","Dédicaces","Concours cosplay","Quiz / jeu","Atelier","Projection","Tournoi","Animation","Autre"];
const DEFAULT_ROOMS=["Grande scène","Salle de conférence","Espace dédicaces","Atelier"];
const roomsOf=ed=>{const r=String((ed&&ed.rooms)||"").split("\n").map(s=>s.trim()).filter(Boolean);return r.length?r:DEFAULT_ROOMS};
const edDays=ed=>{if(!ed||!ed.date)return [];const d=[ed.date];if(ed.dateEnd)while(d[d.length-1]<ed.dateEnd&&d.length<10)d.push(addDays(d[d.length-1],1));return d};
defineMod({
  key:"activities",col:"activities",label:"Programme",one:"activité",img:"trunks",newLabel:"Nouvelle activité",added:"Activité ajoutée au programme.",
  titleOf:o=>esc(o.title),
  fields:[
    {k:"title",l:"Titre",req:true,wide:true,ph:"ex. Concert de Bernard Minet"},
    {k:"kind",l:"Type",type:"select",options:ACTIVITY_KINDS,def:"Animation"},
    {k:"room",l:"Lieu",type:"select",options:()=>roomsOf(currentEdition())},
    {k:"day",l:"Jour",type:"select",options:()=>edDays(currentEdition()).map(d=>[d,fLong(d)])},
    {k:"start",l:"Début",type:"time",req:true},
    {k:"end",l:"Fin",type:"time",req:true},
    {k:"guestId",l:"Invité concerné",type:"select",blank:"Aucun",options:refOpts("guests")},
    {k:"owner",l:"Responsable",type:"member"},
    {k:"cost",l:"Coût (matériel, lots…)",type:"money"},
    {k:"published",l:"Publié sur le site",type:"check"},
    {k:"desc",l:"Description pour le public",type:"textarea",wide:true},
    {k:"notes",l:"Notes pour l’équipe",type:"textarea",wide:true,ph:"Matériel, installation, micros…"},
  ],
  beforeSave:o=>{if(!o.day){const e=currentEdition();o.day=e&&e.date}if(hm(o.end)<=hm(o.start))o.end=fHM(hm(o.start)+30);return o},
});
// Conflits : deux activités qui se chevauchent dans le même lieu, ou un invité attendu à deux endroits.
function conflicts(xs){
  const out=[];
  for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++){
    const a=xs[i],b=xs[j];if(a.day!==b.day||!(hm(a.start)<hm(b.end)&&hm(b.start)<hm(a.end)))continue;
    if(a.room&&a.room===b.room)out.push([a,b,"même lieu : "+a.room]);
    else if(a.guestId&&a.guestId===b.guestId)out.push([a,b,refName("guests",a.guestId)+" est attendu aux deux"]);
  }
  return out;
}
const KIND_TONE={"Concert":"var(--red)","Conférence":"var(--info)","Dédicaces":"var(--orange)","Concours cosplay":"#8E44AD","Tournoi":"var(--good)"};
VIEWS.programme=()=>{
  const ed=currentEdition();if(!ed)return noEdition("Programme","trunks");
  const days=edDays(ed);if(!days.includes(UI.day))UI.day=days[0];
  const allx=inEdition("activities");
  const xs=allx.filter(a=>a.day===UI.day).sort((a,b)=>hm(a.start)-hm(b.start));
  const rooms=[...roomsOf(ed)];xs.forEach(a=>{if(a.room&&!rooms.includes(a.room))rooms.push(a.room)});
  const cf=conflicts(allx),bad=new Set(cf.flatMap(c=>[c[0].id,c[1].id]));
  const can=canWrite("activities");
  let grid;
  if(xs.length){
    const t0=Math.min(...xs.map(a=>hm(a.start)),9*60),t1=Math.max(...xs.map(a=>hm(a.end)),18*60);
    const from=Math.floor(t0/60)*60,to=Math.ceil(t1/60)*60,k=1.3,H=(to-from)*k;
    const hours=[];for(let t=from;t<=to;t+=60)hours.push(t);
    grid=`<div class="pgrid-wrap"><div class="pgrid" style="grid-template-columns:52px repeat(${rooms.length},minmax(150px,1fr))">
      <div></div>${rooms.map(r=>`<div class="pg-room">${esc(r)}</div>`).join("")}
      <div class="pg-hours" style="height:${H}px">${hours.map(t=>`<span style="top:${(t-from)*k}px">${fHM(t)}</span>`).join("")}</div>
      ${rooms.map(r=>`<div class="pg-col" style="height:${H}px;background-size:100% ${60*k}px">${xs.filter(a=>(a.room||rooms[0])===r).map(a=>{
        const top=(hm(a.start)-from)*k,h=Math.max(22,(hm(a.end)-hm(a.start))*k-2);
        return `<button class="pg-act ${bad.has(a.id)?"conflict":""} ${h<48?"short":""}" title="${esc(a.title+" · "+a.start+"–"+a.end)}" style="top:${top}px;height:${h}px;--tone:${KIND_TONE[a.kind]||"var(--accent)"}" data-act="openRecord" data-mod="activities" data-id="${a.id}"><b>${esc(a.title)}</b><span>${esc(a.start)}–${esc(a.end)}${a.guestId?" · "+esc(refName("guests",a.guestId)):""}</span></button>`}).join("")}</div>`).join("")}
    </div></div>`;
  }else grid=emptyBox("trunks","Rien de prévu ce jour-là","Ajoute les concerts, conférences, dédicaces et concours : la grille se construit toute seule.",can?addBtn("activities","Première activité"):"");
  return head("Programme",`${esc(ed.name)} · ${plural(allx.length,"activité")}`,addBtn("activities","Activité")+`<button class="btn" data-act="exportProgramme">${ic("down")}CSV</button><button class="btn" data-act="print">Imprimer</button>`,"trunks")+
  `<div class="stack">${cf.length?`<div class="banner" style="margin:0;background:var(--bad-bg)"><img alt="" src="${IMG.trunks}"><div class="grow small"><b style="color:var(--bad)">${plural(cf.length,"conflit")} dans le programme</b>${cf.map(([a,b,why])=>`<div>${esc(a.title)} et ${esc(b.title)} (${fDay(a.day)}, ${esc(why)})</div>`).join("")}</div></div>`:""}
  <div class="card">${days.length>1?`<div class="seg" style="margin-bottom:12px">${days.map(d=>`<button class="${UI.day===d?"on":""}" data-act="day" data-v="${d}">${fDay(d)}</button>`).join("")}</div>`:`<p class="small muted" style="margin:0 0 12px">${fLong(UI.day)}${ed.place?" · "+esc(ed.place):""}</p>`}
  ${grid}
  ${canWrite("editions")?`<p class="tiny muted" style="margin:12px 0 0">Les lieux (${esc(rooms.join(", "))}) se modifient dans la fiche de l’édition.</p>`:""}</div>
  ${xs.length?`<div class="card"><h2>Déroulé du jour</h2><div class="list">${xs.map(a=>`<div class="item click" data-act="openRecord" data-mod="activities" data-id="${a.id}"><span class="pill neutral" style="min-width:96px;justify-content:center">${esc(a.start)}–${esc(a.end)}</span><div class="main"><b>${esc(a.title)}</b><span class="small muted">${esc([a.room,a.kind,memberName(a.owner)].filter(Boolean).join(" · "))}</span></div>${a.published?`<span class="pill good">Publié</span>`:""}</div>`).join("")}</div></div>`:""}</div>`;
};
