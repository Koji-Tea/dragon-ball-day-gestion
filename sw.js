// Garde l'application disponible hors connexion (les données passent par le cache de Firestore).
// Changer le numéro de version à chaque mise en ligne pour forcer la mise à jour sur les téléphones.
const C="dbday-v1";
const FILES=["./","index.html","css/app.css","firebase-config.js","manifest.webmanifest","icon-192.png","apple-touch-icon.png",
  "js/outils.js","js/donnees.js","js/modules.js","js/vues/accueil.js","js/vues/taches.js","js/vues/contacts.js","js/vues/editions.js","js/vues/reglages.js","js/app.js",
  "img/logo.webp","img/favicon.png","img/goku.webp","img/saiyaman.webp","img/bulma.webp","img/chichi.webp","img/piccolo.webp","img/trunks.webp","img/freezer.webp",
  "vendor/firebase-app-compat.js","vendor/firebase-auth-compat.js","vendor/firebase-firestore-compat.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// Réseau d'abord (toujours la dernière version), cache en secours quand il n'y a pas de connexion.
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;const u=new URL(e.request.url);
  if(u.origin!==location.origin&&u.host!=="fonts.googleapis.com"&&u.host!=="fonts.gstatic.com")return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)));
});
