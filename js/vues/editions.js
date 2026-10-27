"use strict";
/* ---------- Éditions de la convention (2027, 2028…) ---------- */
defineMod({
  key:"editions",col:"editions",label:"Éditions",one:"édition",img:"goku",newLabel:"Nouvelle édition",added:"Édition créée. C’est parti !",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Nom",req:true,wide:true,ph:"ex. Dragon Ball Day 2027"},
    {k:"date",l:"Date (premier jour)",type:"date",req:true},
    {k:"dateEnd",l:"Dernier jour (si plusieurs jours)",type:"date"},
    {k:"place",l:"Lieu",ph:"ex. La Marive"},
    {k:"city",l:"Ville",ph:"ex. Yverdon-les-Bains"},
    {k:"capacity",l:"Jauge (visiteurs)",type:"number"},
    {k:"goal",l:"Objectif de visiteurs",type:"number"},
    {k:"budget",l:"Budget prévu",type:"money"},
    {k:"ticketFeePct",l:"Frais de billetterie Infomaniak (%)",type:"number",help:"Pour estimer la recette nette (voir ton contrat Infomaniak)."},
    {k:"rooms",l:"Lieux du programme (un par ligne)",type:"textarea",ph:DEFAULT_ROOMS.join("\n")},
    docField("venueContract","Contrat de location de la salle"),
    {k:"notes",l:"Notes",type:"textarea",ph:"Thème, affiche, idées…"},
  ],
  afterSave:(o,old)=>{if(!old)pickEdition(o.id)},
});
const EDITION_2027={name:"Dragon Ball Day 2027",date:"2027-06-06",place:"La Marive",city:"Yverdon-les-Bains"};
const edWhen=e=>e.dateEnd&&e.dateEnd!==e.date?`${fDate(e.date)} – ${fDate(e.dateEnd)}`:fLong(e.date);

VIEWS.editions=()=>{
  const eds=editions().slice().reverse(),cur=currentEdition(),can=canWrite("editions");
  return head("Éditions","Chaque édition a ses tâches, invités, programme, bénévoles et budget. Les contacts et les membres restent partagés.",can?`<button class="btn primary" data-act="newRecord" data-mod="editions">${ic("plus")}Édition</button>`:"","goku")+
  `<div class="card">${eds.length?`<div class="list">${eds.map(e=>{const d=daysTo(e.date);const n=all("tasks").filter(t=>t.editionId===e.id).length,na=canRead("activities")?all("activities").filter(a=>a.editionId===e.id).length:0;
    return `<div class="item"><div class="main click" style="cursor:pointer" data-act="openRecord" data-mod="editions" data-id="${e.id}"><b>${esc(e.name)}</b><span class="small muted">${edWhen(e)}${e.place?" · "+esc(e.place):""}${e.city?", "+esc(e.city):""} · ${plural(n,"tâche")}${na?" · "+plural(na,"activité"):""}</span></div>
    <div class="end row">${d>=0?`<span class="pill info">J-${d}</span>`:`<span class="pill neutral">Passée</span>`}${cur&&cur.id===e.id?`<span class="pill good">Affichée</span>`:`<button class="btn sm" data-act="pickEdition" data-id="${e.id}">Afficher</button>`}</div></div>`}).join("")}</div>`
  :emptyBox("goku","Aucune édition","Commence par l’édition du 6 juin 2027 à La Marive.",can?`<button class="btn primary" data-act="newEdition2027">Créer Dragon Ball Day 2027</button>`:"")}</div>`;
};
