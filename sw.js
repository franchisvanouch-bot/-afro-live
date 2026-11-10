/* AFRO LIVE service worker — réseau prioritaire, sans cache obsolète */
self.addEventListener("install",event=>{
 event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==="navigate"){
  event.respondWith(fetch(new Request(req,{cache:"no-store"})));
 }
});
