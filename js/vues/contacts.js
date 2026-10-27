"use strict";
/* ---------- Contacts : un seul carnet d'adresses, réutilisé d'une édition à l'autre ---------- */
const CONTACT_CATS=["Invité","Artiste","Exposant","Sponsor","Partenaire","Fournisseur","Bénévole","Presse","Institution","Autre"];
defineMod({
  key:"contacts",col:"contacts",label:"Contacts",one:"contact",img:"chichi",newLabel:"Nouveau contact",added:"Contact ajouté au carnet.",
  titleOf:o=>esc(o.name),
  fields:[
    {k:"name",l:"Nom (personne ou organisation)",req:true,wide:true},
    {k:"cat",l:"Catégorie",type:"select",options:CONTACT_CATS,def:"Autre"},
    {k:"org",l:"Organisation / rôle",ph:"ex. Agent, Boutique, Commune"},
    {k:"email",l:"E-mail",type:"email"},
    {k:"phone",l:"Téléphone",type:"tel"},
    {k:"website",l:"Site ou réseau social",type:"url",ph:"https://"},
    {k:"lang",l:"Langue",type:"select",options:["Français","Allemand","Italien","Anglais","Japonais","Autre"],def:"Français"},
    {k:"address",l:"Adresse",type:"textarea",wide:true},
    {k:"notes",l:"Notes",type:"textarea",wide:true,ph:"Historique, préférences, qui l’a rencontré…"},
  ],
  sheetTop:o=>{
    const links=[o.email&&`<a class="btn sm" href="mailto:${esc(o.email)}">${ic("mail")}E-mail</a>`,o.phone&&`<a class="btn sm" href="tel:${esc(o.phone.replace(/\s/g,""))}">${ic("phone")}Appeler</a>`,
      o.website&&/^https?:\/\//.test(o.website)&&`<a class="btn sm" href="${esc(o.website)}" target="_blank" rel="noopener">${ic("link")}Site</a>`].filter(Boolean);
    return links.length?`<div class="row" style="margin-bottom:14px">${links.join("")}</div>`:"";
  },
});

VIEWS.contacts=()=>{
  const q=norm(UI.q);
  const xs=all("contacts").filter(c=>(!UI.filter||c.cat===UI.filter)&&(!q||norm([c.name,c.org,c.email,c.phone,c.notes].join(" ")).includes(q))).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
  const counts={};all("contacts").forEach(c=>counts[c.cat]=(counts[c.cat]||0)+1);
  return head("Contacts","Invités, artistes, sponsors, fournisseurs, presse : tout le carnet de l’association.",canWrite("contacts")?`<button class="btn primary" data-act="newRecord" data-mod="contacts">${ic("plus")}Contact</button>`:"","chichi")+
  `<div class="card"><div class="row" style="margin-bottom:12px"><input class="search" type="search" id="q" data-input="search" placeholder="Rechercher un nom, un e-mail…" value="${esc(UI.q)}" aria-label="Rechercher"></div>
  <div class="chips" style="margin-bottom:10px"><button class="chip ${!UI.filter?"on":""}" data-act="filter" data-v="">Tous · ${all("contacts").length}</button>${CONTACT_CATS.filter(c=>counts[c]).map(c=>`<button class="chip ${UI.filter===c?"on":""}" data-act="filter" data-v="${esc(c)}">${esc(c)} · ${counts[c]}</button>`).join("")}</div>
  ${xs.length?`<div class="list">${xs.map(c=>`<div class="item click" data-act="openRecord" data-mod="contacts" data-id="${c.id}"><span class="avatar">${esc(initials(c.name))}</span><div class="main"><b>${esc(c.name)}</b><span class="small muted">${esc([c.org,c.email||c.phone].filter(Boolean).join(" · "))}</span></div><span class="pill neutral">${esc(c.cat)}</span></div>`).join("")}</div>`
    :all("contacts").length?emptyBox("chichi","Personne ne correspond","Essaie un autre mot ou une autre catégorie.")
    :emptyBox("chichi","Le carnet est vide","Ajoute les invités, sponsors et fournisseurs avec qui l’association travaille.",canWrite("contacts")?`<button class="btn primary" data-act="newRecord" data-mod="contacts">${ic("plus")}Premier contact</button>`:"")}</div>`;
};
