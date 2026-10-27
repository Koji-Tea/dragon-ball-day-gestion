"use strict";
/* ---------- Tâches et rétro-planning de l'édition ---------- */
const POLES=["Général","Invités","Artistes & exposants","Partenaires & sponsors","Programme & activités","Logistique","Bénévoles","Communication","Finances","Billetterie"];
const TASK_STATES=["À faire","En cours","Fait"];
defineMod({
  key:"tasks",col:"tasks",label:"Tâches",one:"tâche",img:"trunks",newLabel:"Nouvelle tâche",added:"Tâche ajoutée. Trunks veille sur l’échéance !",
  titleOf:o=>esc(o.title),
  fields:[
    {k:"title",l:"Que faut-il faire ?",req:true,wide:true,ph:"ex. Envoyer le contrat à l’invité"},
    {k:"pole",l:"Pôle",type:"select",options:POLES,def:"Général"},
    {k:"owner",l:"Responsable",type:"member"},
    {k:"due",l:"Échéance",type:"date"},
    {k:"status",l:"Statut",type:"select",options:TASK_STATES,def:"À faire"},
    {k:"high",l:"Prioritaire",type:"check"},
    {k:"notes",l:"Notes",type:"textarea"},
  ],
  beforeSave:(o,old)=>{if(o.status==="Fait"&&(!old||old.status!=="Fait"))o.doneAt=today();if(o.status!=="Fait")delete o.doneAt;return o},
});
function taskStats(){return memo("taskStats",()=>{
  const xs=inEdition("tasks"),open=xs.filter(t=>t.status!=="Fait");
  return {all:xs,open,done:xs.length-open.length,late:open.filter(t=>t.due&&t.due<today()),soon:open.filter(t=>t.due&&t.due>=today()&&t.due<=addDays(today(),14))};
})}
const dueLabel=t=>{if(!t.due)return "";const d=daysTo(t.due);if(t.status==="Fait")return `<span class="tiny muted">${fDate(t.due)}</span>`;
  return d<0?`<span class="pill bad">En retard de ${plural(-d,"jour")}</span>`:d===0?`<span class="pill warn">Aujourd’hui</span>`:d<=7?`<span class="pill warn">${fDay(t.due)}</span>`:`<span class="pill neutral">${fDate(t.due)}</span>`};
function taskItem(t){
  const can=canWrite("tasks"),done=t.status==="Fait";
  return `<div class="item ${done?"done":""}"><button class="tick ${done?"on":""}" ${can?"":"disabled"} data-act="toggleTask" data-id="${t.id}" aria-label="${done?"Marquer à faire":"Marquer comme fait"}">${ic("check")}</button>
    <div class="main click" style="cursor:pointer" data-act="openRecord" data-mod="tasks" data-id="${t.id}"><b>${esc(t.title)}</b><span class="tiny muted">${t.high&&!done?`<b style="display:inline;color:var(--bad)">Prioritaire</b> · `:""}${esc([t.pole,memberName(t.owner),t.status==="En cours"?"en cours":""].filter(Boolean).join(" · "))}</span></div>
    <div class="end">${dueLabel(t)}</div></div>`;
}
VIEWS.taches=()=>{
  const ed=currentEdition();
  if(!ed)return head("Tâches","",``,"trunks")+`<div class="card">${emptyBox("trunks","Pas encore d’édition","Les tâches sont rangées par édition de la convention. Crée d’abord l’édition.",`<a class="btn primary" href="#editions">Créer l’édition</a>`)}</div>`;
  const st=taskStats();
  let xs=st.all.filter(t=>!UI.taskPole||t.pole===UI.taskPole);
  const sortDue=(a,b)=>(a.due||"9999")<(b.due||"9999")?-1:(a.due||"9999")>(b.due||"9999")?1:(b.high?1:0)-(a.high?1:0);
  let body;
  if(UI.taskTab==="faites"){xs=xs.filter(t=>t.status==="Fait").sort((a,b)=>(a.doneAt||"")<(b.doneAt||"")?1:-1);body=xs.length?`<div class="list">${xs.map(taskItem).join("")}</div>`:emptyBox("trunks","Rien de terminé pour l’instant","Coche une tâche quand elle est faite.")}
  else{
    xs=xs.filter(t=>t.status!=="Fait").sort(sortDue);
    const g=[["En retard",xs.filter(t=>t.due&&t.due<today())],["Ces 14 prochains jours",xs.filter(t=>t.due&&t.due>=today()&&t.due<=addDays(today(),14))],["Plus tard",xs.filter(t=>t.due&&t.due>addDays(today(),14))],["Sans échéance",xs.filter(t=>!t.due)]].filter(x=>x[1].length);
    body=g.length?g.map(([l,ts])=>`<h3 class="group-title">${l} <span class="muted small">· ${ts.length}</span></h3><div class="list">${ts.map(taskItem).join("")}</div>`).join("")
      :emptyBox("trunks",st.all.length?"Tout est fait !":"Aucune tâche pour l’instant",st.all.length?"Bravo, l’équipe est au niveau d’un Super Saiyan.":"Note ici tout ce qu’il faut préparer avant la convention, avec une échéance.",canWrite("tasks")?`<button class="btn primary" data-act="newRecord" data-mod="tasks">${ic("plus")}Ajouter une tâche</button>`:"");
  }
  const poles=POLES.filter(p=>st.all.some(t=>t.pole===p));
  return head("Tâches",`${esc(ed.name)} · ${plural(st.open.length,"tâche ouverte","tâches ouvertes")}${st.late.length?`, dont <b style="color:var(--bad)">${st.late.length} en retard</b>`:""}`,canWrite("tasks")?`<button class="btn primary" data-act="newRecord" data-mod="tasks">${ic("plus")}Tâche</button>`:"","trunks")+
  `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="seg"><button class="${UI.taskTab!=="faites"?"on":""}" data-act="taskTab" data-v="ouvertes">À faire · ${st.open.length}</button><button class="${UI.taskTab==="faites"?"on":""}" data-act="taskTab" data-v="faites">Faites · ${st.done}</button></div>
  ${poles.length>1?`<select style="width:auto" data-change="taskPole" aria-label="Filtrer par pôle"><option value="">Tous les pôles</option>${poles.map(p=>opt(p,p,UI.taskPole)).join("")}</select>`:""}</div>${body}</div>`;
};
