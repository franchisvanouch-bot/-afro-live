/* AFRO LIVE service worker — Push + réseau prioritaire */
self.addEventListener("install",event=>{
 event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{await self.clients.claim()})());
});

/* Notifications reçues même lorsque l'application est fermée */
self.addEventListener("push",event=>{
 let payload={title:"AFRO LIVE",body:"Tu as une nouvelle notification.",url:"/"};
 try{if(event.data)payload={...payload,...event.data.json()}}catch(_){
  try{if(event.data)payload.body=event.data.text()}catch(__){}
 }
 event.waitUntil(self.registration.showNotification(payload.title||"AFRO LIVE",{
  body:payload.body||"Tu as une nouvelle notification.",
  icon:payload.icon||"/icon-192.png",
  badge:payload.badge||"/icon-192.png",
  data:{url:payload.url||"/"},
  tag:payload.tag||"afro-live",
  renotify:true,
  vibrate:[180,80,180]
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||"/",self.location.origin).href;
 event.waitUntil((async()=>{
  const wins=await clients.matchAll({type:"window",includeUncontrolled:true});
  for(const client of wins){
   if("focus" in client){await client.focus();if("navigate" in client)await client.navigate(target);return;}
  }
  if(clients.openWindow)await clients.openWindow(target);
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==="navigate")event.respondWith(fetch(new Request(req,{cache:"no-store"})));
});
