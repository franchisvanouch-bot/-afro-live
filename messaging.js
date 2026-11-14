/* =========================================================
   AFRO LIVE — messaging.js (v4 : chat clair, médias, vocal, réponse par glissement, infos)
   Dépend de : db, currentUser, currentProfile, message(), guestToAuth(), openProfile()
   Migration : messagerie_v1 + messagerie_medias
   ========================================================= */
(()=>{
"use strict";
if(window.__afroMsgV4)return;
window.__afroMsgV4=true;

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(t,ok=false)=>{if(typeof message==="function")message(t,ok)};
const me=()=>currentUser?.id;
const EMOJIS=["❤️","😂","😭","👍","😡","🤔","😮"];
const ERR={
 blocked:"Impossible : un des deux comptes a bloqué l'autre.",
 rate_limited:"Tu envoies trop vite. Réessaie dans une minute.",
 invalid_body:"Message vide ou trop long (2000 caractères max).",
 cannot_edit:"Modification impossible (15 minutes maximum).",
 cannot_delete:"Suppression impossible.",
 not_member:"Cette conversation n'est plus accessible.",
 recipient_not_found:"Utilisateur introuvable.",
 invalid_recipient:"Destinataire invalide.",
 not_authenticated:"Connecte-toi d'abord."
};
const frErr=e=>{const m=e?.message||"";const k=Object.keys(ERR).find(k=>m.includes(k));return k?ERR[k]:(m||"Erreur inconnue.")};
const hm=d=>new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
const dayLabel=d=>{
 const x=new Date(d),t=new Date(),y=new Date();y.setDate(t.getDate()-1);
 if(x.toDateString()===t.toDateString())return "Aujourd'hui "+hm(d);
 if(x.toDateString()===y.toDateString())return "Hier "+hm(d);
 return x.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" "+hm(d);
};
const mediaUrl=p=>db.storage.from("msg-media").getPublicUrl(p).data.publicUrl;
const avatarHTML=(url,name,cls="mx-av")=>url
 ?`<img class="${cls}" src="${esc(url)}" alt="">`
 :`<span class="${cls} mx-av-t">${esc((name||"?").trim().charAt(0).toUpperCase()||"?")}</span>`;
const store=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def}catch(_){return def}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

const S={
 list:[],showArch:false,conv:null,other:null,otherName:"",otherUser:"",
 msgs:[],reacts:new Map(),reads:{},reply:null,edit:null,
 chan:null,listChan:null,typingTimer:null,typingAt:0,sending:false,firstLoad:true,
 plainSet:store("afroMsgPlain",{}),bubbleMode:store("afroMsgBubbleMode","bubble"),
 mute:store("afroMsgMute",{}),
 rec:null,recChunks:[],recStart:0,recTimer:null,recCancel:false,recStream:null
};

/* ---------- STYLE ---------- */
function css(){
 if($("mxStyle"))return;
 const s=document.createElement("style");
 s.id="mxStyle";
 s.textContent=`
 .mx-page{background:#fff;color:#111;min-height:70vh;border-radius:18px 18px 0 0;padding:4px 0 96px}
 .mx-top{text-align:center;padding:14px 14px 8px;font-weight:700;font-size:18px;color:#111}
 .mx-search{display:flex;gap:8px;padding:4px 12px 10px}
 .mx-search input{flex:1;min-width:0;border:0;border-radius:20px;background:#f0f1f4;padding:10px 14px;font-size:15px;margin:0;color:#111}
 .mx-search button{border:0;border-radius:20px;background:#f0f1f4;padding:9px 12px;font-size:13px;color:#111;font-weight:600;white-space:nowrap}
 .mx-row{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;padding:10px 14px;text-align:left;color:#111}
 .mx-row-t{min-width:0;flex:1}
 .mx-row b{display:block;font-size:15px;color:#111}
 .mx-row small{display:block;color:#777;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .mx-row-side{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex:0 0 auto}
 .mx-row-side span{color:#999;font-size:12px}
 .mx-badge{background:#3a6bff;color:#fff;border-radius:999px;font-size:11px;padding:2px 7px;font-weight:700}
 .mx-av{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:0 0 46px;background:#e5e5ea}
 .mx-av-t{display:grid;place-items:center;color:#fff;font-weight:700;background:linear-gradient(135deg,#3a6bff,#8a4dff)}
 .mx-empty{color:#888;text-align:center;padding:40px 20px;font-size:14px}

 .mx-chat{position:fixed;inset:0;z-index:2147483100;background:#fff;color:#111;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)}
 .mx-chat[hidden],.mx-info[hidden],.mx-menu-bg[hidden]{display:none!important}
 .mx-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #eee}
 .mx-back{border:0;background:none;font-size:34px;color:#3a6bff;padding:0 8px;line-height:1}
 .mx-title{flex:1;min-width:0;display:flex;align-items:center;gap:10px;background:none;border:0;text-align:left;padding:0}
 .mx-title .mx-av{width:36px;height:36px;flex:0 0 36px}
 .mx-title b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#111}
 .mx-more{border:0;background:none;font-size:22px;color:#111;padding:0 8px;letter-spacing:2px}
 .mx-thread{flex:1;overflow-y:auto;padding:12px 12px;display:flex;flex-direction:column;gap:2px;background:#fff;-webkit-overflow-scrolling:touch}
 .mx-day{align-self:center;color:#8e8e93;font-size:12px;margin:14px 0 8px}
 .mx-line{display:flex;flex-direction:column;max-width:82%;position:relative;margin-bottom:6px;transition:transform .12s}
 .mx-line.mine{align-self:flex-end;align-items:flex-end}
 .mx-line.theirs{align-self:flex-start;align-items:flex-start}
 .mx-group{display:flex;align-items:flex-end;gap:6px}
 .mx-group .mx-av{width:28px;height:28px;flex:0 0 28px}
 .mx-av-slot{width:28px;flex:0 0 28px}
 .mx-bub{position:relative;padding:10px 14px;border-radius:20px;font-size:15px;line-height:1.35;background:#eef0f4;color:#111;white-space:pre-wrap;word-break:break-word;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
 .mx-line.mine .mx-bub{background:linear-gradient(120deg,#3a6bff,#7a4dff);color:#fff;border-bottom-right-radius:6px}
 .mx-line.theirs .mx-bub{border-bottom-left-radius:6px}
 .mx-bub.plain{background:transparent!important;color:#111!important;padding:4px 2px}
 .mx-bub.media{padding:4px;background:#eef0f4}
 .mx-bub.media img,.mx-bub.media video{display:block;max-width:220px;max-height:280px;border-radius:16px;object-fit:cover}
 .mx-bub.media audio{display:block;width:230px;max-width:100%}
 .mx-bub.media .mx-cap{padding:6px 10px 4px;font-size:15px}
 .mx-bub.del{background:none;border:1px dashed #ccc;color:#999;font-style:italic}
 .mx-quote{border-left:3px solid rgba(0,0,0,.25);padding:2px 8px;margin-bottom:6px;font-size:12px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
 .mx-react{position:absolute;bottom:-12px;right:8px;background:#fff;border:1px solid #e5e5ea;border-radius:999px;padding:1px 7px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.12)}
 .mx-meta{font-size:11px;color:#8e8e93;margin-top:4px;padding:0 4px}
 .mx-seen{font-size:11px;color:#8e8e93;margin-top:3px;align-self:flex-end;padding-right:4px}
 .mx-typing{font-size:12px;color:#8e8e93;padding:0 16px 4px;min-height:16px}
 .mx-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 12px 6px;padding:8px 12px;background:#f3f4f7;border-left:3px solid #3a6bff;border-radius:10px;font-size:13px;color:#333}
 .mx-bar.rec{border-left-color:#e5484d;color:#e5484d;font-weight:600}
 .mx-bar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .mx-bar button{border:0;background:none;font-size:20px;color:#555}
 .mx-foot{display:flex;align-items:center;gap:6px;padding:8px 10px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #eee;background:#fff}
 .mx-foot input{flex:1;min-width:0;border:0;border-radius:24px;background:#f0f1f4;padding:12px 16px;font-size:16px;color:#111;margin:0}
 .mx-tool{width:36px;height:36px;border:0;background:none;color:#3a6bff;font-size:22px;display:grid;place-items:center;flex:0 0 36px;padding:0}
 .mx-tool.rec{color:#e5484d}
 .mx-send{width:40px;height:40px;border-radius:50%;border:0;background:#3a6bff;color:#fff;font-size:18px;flex:0 0 40px;display:grid;place-items:center}
 .mx-send[hidden]{display:none}

 .mx-info{position:fixed;inset:0;z-index:2147483150;background:#fff;color:#111;overflow-y:auto;padding:env(safe-area-inset-top) 0 40px}
 .mx-info-top{display:flex;justify-content:space-between;align-items:center;padding:8px 12px}
 .mx-info-top button{border:0;background:none;font-size:30px;color:#111;padding:0 8px;line-height:1}
 .mx-info-hero{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 16px 18px}
 .mx-info-hero .mx-av{width:110px;height:110px;flex:0 0 110px;font-size:40px}
 .mx-info-hero b{font-size:20px;text-align:center}
 .mx-info-hero small{color:#8e8e93;font-size:14px}
 .mx-quick{display:flex;justify-content:space-around;padding:6px 14px 14px}
 .mx-quick button{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;color:#111;width:33%}
 .mx-quick button i{width:56px;height:56px;border-radius:50%;background:#f0f1f4;display:grid;place-items:center;font-size:24px;color:#111}
 .mx-opt{display:flex;align-items:center;gap:14px;width:100%;border:0;background:none;padding:15px 18px;font-size:16px;color:#111;text-align:left;border-top:1px solid #f0f0f0}
 .mx-opt i{width:24px;text-align:center;font-size:21px;color:#444}
 .mx-opt .mx-ch{margin-left:auto;color:#c7c7cc}
 .mx-opt.danger,.mx-opt.danger i{color:#e5484d}
 .mx-opt.soon{color:#8e8e93}
 .mx-switch{margin-left:auto;width:50px;height:30px;border-radius:999px;background:#e5e5ea;position:relative;flex:0 0 50px}
 .mx-switch:after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
 .mx-switch.on{background:#34c759}
 .mx-switch.on:after{left:23px}

 .mx-menu-bg{position:fixed;inset:0;z-index:2147483200;background:rgba(255,255,255,.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
 .mx-menu{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(340px,calc(100vw - 24px));background:#fff;border-radius:24px;box-shadow:0 14px 40px rgba(0,0,0,.2);overflow:hidden;color:#111;padding-bottom:6px}
 .mx-emojis{display:flex;justify-content:space-around;align-items:center;padding:12px 8px;border-bottom:1px solid #f0f0f0}
 .mx-emojis button{border:0;background:none;font-size:26px;padding:2px;line-height:1}
 .mx-item{display:flex;align-items:center;gap:14px;width:100%;border:0;background:none;padding:14px 18px;font-size:15px;color:#111;text-align:left;border-top:1px solid #f4f4f6}
 .mx-item i{width:20px;text-align:center;font-size:19px;color:#444}
 .mx-item.danger,.mx-item.danger i{color:#e5484d}
 .mx-imgview{position:fixed;inset:0;z-index:2147483300;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center}
 .mx-imgview img{max-width:100vw;max-height:100vh;object-fit:contain}
 `;
 document.head.appendChild(s);
}

/* ---------- MENUS GÉNÉRIQUES ---------- */
function sheet(html,onPick){
 const bg=document.createElement("div");
 bg.className="mx-menu-bg";
 bg.innerHTML='<div class="mx-menu">'+html+'</div>';
 document.body.appendChild(bg);
 bg.addEventListener("click",e=>{
  if(e.target===bg){bg.remove();return}
  const it=e.target.closest("[data-mx]");
  if(!it)return;
  bg.remove();
  onPick(it.dataset.mx,it.dataset.id,it.dataset.emoji);
 });
}
const item=(a,id,icon,label,cls="")=>`<button class="mx-item ${cls}" data-mx="${a}" data-id="${esc(id||"")}"><i class="ti ${icon}"></i>${label}</button>`;

/* ---------- LISTE ---------- */
function ensureList(){
 css();
 const host=$("notifsList");
 if(!host||$("mxRows"))return;
 host.innerHTML=`<div class="mx-page">
  <div class="mx-top">Messages</div>
  <div class="mx-search">
   <input id="mxSearch" type="search" placeholder="Rechercher une conversation" autocomplete="off">
   <button id="mxArch" type="button">Archivées</button>
  </div>
  <div id="mxRows"></div>
 </div>`;
 $("mxSearch").addEventListener("input",renderList);
 $("mxArch").addEventListener("click",()=>{S.showArch=!S.showArch;renderList()});
 host.addEventListener("click",e=>{
  const row=e.target.closest("[data-conv]");
  if(!row)return;
  openConv(row.dataset.conv,row.dataset.other,row.dataset.name);
 });
}
async function loadList(){
 if(!currentUser)return;
 const {data,error}=await db.rpc("msg_list_conversations");
 if(error){if($("mxRows"))$("mxRows").innerHTML=`<div class="mx-empty">${esc(frErr(error))}</div>`;return}
 S.list=data||[];
 renderList();
 updateBadge();
}
function renderList(){
 const rows=$("mxRows");
 if(!rows)return;
 const q=($("mxSearch")?.value||"").trim().toLowerCase();
 $("mxArch").textContent=S.showArch?"Conversations":"Archivées";
 const shown=S.list
  .filter(c=>c.archived===S.showArch)
  .filter(c=>!q||`${c.other_username} ${c.other_name||""}`.toLowerCase().includes(q));
 rows.innerHTML=shown.length?shown.map(c=>{
  const name=c.other_name||c.other_username||"Membre";
  let last="Dis bonjour 👋";
  if(c.last_deleted)last="Message supprimé";
  else if(c.last_body)last=(c.last_sender_id===me()?"Toi : ":"")+c.last_body;
  return `<button class="mx-row" data-conv="${esc(c.conversation_id)}" data-other="${esc(c.other_id)}" data-name="${esc(name)}">
   ${avatarHTML(c.other_avatar,name)}
   <span class="mx-row-t"><b>${esc(name)}</b><small>${esc(last)}</small></span>
   <span class="mx-row-side"><span>${hm(c.last_at)}</span>${c.unread?`<i class="mx-badge">${c.unread}</i>`:""}</span>
  </button>`;
 }).join(""):`<div class="mx-empty">${S.showArch?"Aucune conversation archivée.":"Aucune conversation. Ouvre le profil d'un créateur et appuie sur Message."}</div>`;
}
function updateBadge(){
 const total=S.list.filter(c=>!c.archived).reduce((n,c)=>n+Number(c.unread||0),0);
 document.querySelectorAll('#navigation button[data-page="notifs"] .navdot').forEach(d=>{
  d.hidden=!total;
  d.textContent=total>99?"99+":String(total||"");
 });
}
function subscribeList(){
 if(S.listChan||!currentUser)return;
 let t=null;
 const refresh=()=>{clearTimeout(t);t=setTimeout(loadList,300)};
 S.listChan=db.channel("mx-list-"+me())
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"msg_messages"},refresh)
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"msg_members"},refresh)
  .subscribe();
}

/* ---------- CHAT : STRUCTURE ---------- */
function ensureChat(){
 css();
 if($("mxChat"))return;
 const wrap=document.createElement("section");
 wrap.id="mxChat";wrap.className="mx-chat";wrap.hidden=true;
 wrap.innerHTML=`
  <div class="mx-head">
   <button class="mx-back" id="mxBack" type="button" aria-label="Retour">‹</button>
   <button class="mx-title" id="mxTitle" type="button" aria-label="Infos"></button>
   <button class="mx-more" id="mxMore" type="button" aria-label="Informations">•••</button>
  </div>
  <div id="mxThread" class="mx-thread"></div>
  <div id="mxTyping" class="mx-typing"></div>
  <div id="mxBar" class="mx-bar" hidden></div>
  <form id="mxForm" class="mx-foot">
   <button type="button" class="mx-tool" id="mxCam" aria-label="Appareil photo"><i class="ti ti-camera"></i></button>
   <input id="mxInput" maxlength="2000" placeholder="Message..." autocomplete="off">
   <button type="button" class="mx-tool" id="mxMic" aria-label="Note vocale"><i class="ti ti-microphone"></i></button>
   <button type="button" class="mx-tool" id="mxGal" aria-label="Galerie"><i class="ti ti-photo"></i></button>
   <button id="mxSend" class="mx-send" type="submit" aria-label="Envoyer" hidden><i class="ti ti-arrow-up"></i></button>
  </form>
  <input id="mxFileGal" type="file" accept="image/*,video/*" multiple hidden>
  <input id="mxFileCam" type="file" accept="image/*,video/*" capture="environment" hidden>`;
 document.body.appendChild(wrap);

 $("mxBack").addEventListener("click",closeChat);
 $("mxTitle").addEventListener("click",openInfo);
 $("mxMore").addEventListener("click",openInfo);
 $("mxForm").addEventListener("submit",sendText);
 $("mxInput").addEventListener("input",()=>{typingPing();syncComposer()});
 $("mxGal").addEventListener("click",()=>$("mxFileGal").click());
 $("mxCam").addEventListener("click",()=>$("mxFileCam").click());
 $("mxMic").addEventListener("click",toggleRec);
 $("mxFileGal").addEventListener("change",e=>handleFiles(e));
 $("mxFileCam").addEventListener("change",e=>handleFiles(e));

 const th=$("mxThread");
 let lpTimer=null,sx=0,sy=0,dx=0,swipeEl=null,swipeId=null;
 th.addEventListener("touchstart",e=>{
  const line=e.target.closest(".mx-line");
  if(!line||e.touches.length!==1){swipeEl=null;return}
  sx=e.touches[0].clientX;sy=e.touches[0].clientY;dx=0;
  swipeEl=line;swipeId=line.dataset.id;
  clearTimeout(lpTimer);
  lpTimer=setTimeout(()=>{lpTimer=null;swipeEl=null;msgMenu(swipeId||line.dataset.id)},450);
 },{passive:true});
 th.addEventListener("touchmove",e=>{
  if(!swipeEl)return;
  const t=e.touches[0];
  const mx=t.clientX-sx,my=t.clientY-sy;
  if(Math.abs(mx)>10||Math.abs(my)>10)clearTimeout(lpTimer),lpTimer=null;
  if(Math.abs(my)>Math.abs(mx))return;
  if(mx>0){dx=Math.min(mx,70);swipeEl.style.transform=`translateX(${dx}px)`}
 },{passive:true});
 th.addEventListener("touchend",()=>{
  clearTimeout(lpTimer);lpTimer=null;
  if(!swipeEl)return;
  const id=swipeId,fire=dx>50;
  swipeEl.style.transform="";swipeEl=null;dx=0;
  if(fire&&id)replyTo(id);
 });
 th.addEventListener("contextmenu",e=>{
  const line=e.target.closest(".mx-line");
  if(!line)return;
  e.preventDefault();
  msgMenu(line.dataset.id);
 });
 th.addEventListener("click",e=>{
  const img=e.target.closest("[data-mx-img]");
  if(img)viewImage(img.dataset.mxImg);
 });
}

function syncComposer(){
 const has=!!$("mxInput").value.trim();
 $("mxSend").hidden=!has;
 $("mxMic").hidden=has;
 $("mxGal").hidden=has;
 $("mxCam").hidden=has;
}

function viewImage(url){
 const v=document.createElement("div");
 v.className="mx-imgview";
 v.innerHTML=`<img src="${esc(url)}" alt="">`;
 v.addEventListener("click",()=>v.remove());
 document.body.appendChild(v);
}

/* ---------- OUVERTURE / FERMETURE ---------- */
async function openConv(convId,otherId,name){
 if(!currentUser)return;
 ensureChat();
 S.conv=convId;S.other=otherId;S.otherName=name||"";
 S.reply=null;S.edit=null;S.firstLoad=true;setBar(null);
 const row=S.list.find(c=>c.conversation_id===convId);
 S.otherName=row?.other_name||row?.other_username||name||"Membre";
 S.otherUser=row?.other_username||"";
 S.otherAvatar=row?.other_avatar||null;
 $("mxTitle").innerHTML=avatarHTML(S.otherAvatar,S.otherName)+`<b>${esc(S.otherName)}</b>`;
 $("mxChat").hidden=false;
 $("mxThread").innerHTML='<div class="mx-empty">Chargement...</div>';
 syncComposer();
 subscribeConv(convId);
 await markRead();
 await fetchAll();
}
function closeChat(){
 leaveConv();
 if(S.rec)stopRec(true);
 S.conv=null;S.other=null;
 if($("mxChat"))$("mxChat").hidden=true;
 if($("mxInfo"))$("mxInfo").hidden=true;
 loadList();
}
function leaveConv(){
 if(S.chan){db.removeChannel(S.chan);S.chan=null}
}
async function markRead(){
 if(!S.conv||!currentUser)return;
 await db.from("msg_members").update({last_read_at:new Date().toISOString()})
  .eq("conversation_id",S.conv).eq("user_id",me());
}

/* ---------- DONNÉES ---------- */
async function fetchAll(){
 const convId=S.conv;
 if(!convId)return;
 const [mRes,memRes]=await Promise.all([
  db.from("msg_messages").select("id,sender_id,body,reply_to,created_at,edited_at,deleted_for_all,message_type,media_path,media_duration")
   .eq("conversation_id",convId).order("created_at",{ascending:true}).limit(150),
  db.from("msg_members").select("user_id,last_read_at").eq("conversation_id",convId)
 ]);
 if(convId!==S.conv)return;
 if(mRes.error){$("mxThread").innerHTML=`<div class="mx-empty">${esc(frErr(mRes.error))}</div>`;return}
 S.msgs=mRes.data||[];
 S.reads=Object.fromEntries((memRes.data||[]).map(r=>[r.user_id,r.last_read_at]));
 S.reacts=new Map();
 const ids=S.msgs.map(m=>m.id);
 if(ids.length){
  const {data:rs}=await db.from("msg_reactions").select("message_id,user_id,emoji").in("message_id",ids);
  if(convId!==S.conv)return;
  (rs||[]).forEach(r=>{const a=S.reacts.get(r.message_id)||[];a.push(r);S.reacts.set(r.message_id,a)});
 }
 if(convId!==S.conv)return;
 renderThread();
}
function subscribeConv(convId){
 leaveConv();
 S.chan=db.channel("mx-conv-"+convId)
  .on("postgres_changes",{event:"*",schema:"public",table:"msg_messages",filter:"conversation_id=eq."+convId},async p=>{
   if(p.eventType==="INSERT"&&p.new.sender_id!==me())await markRead();
   fetchAll();
  })
  .on("postgres_changes",{event:"*",schema:"public",table:"msg_reactions"},()=>fetchAll())
  .on("postgres_changes",{event:"*",schema:"public",table:"msg_members",filter:"conversation_id=eq."+convId},()=>fetchAll())
  .on("broadcast",{event:"typing"},({payload})=>{if(payload.uid!==me())showTyping(payload.name)})
  .subscribe();
}
function typingPing(){
 if(!S.chan||Date.now()-S.typingAt<1500)return;
 S.typingAt=Date.now();
 S.chan.send({type:"broadcast",event:"typing",payload:{uid:me(),name:currentProfile?.display_name||currentProfile?.username||""}});
}
function showTyping(name){
 const el=$("mxTyping");
 if(!el)return;
 el.textContent=`${name||"Quelqu'un"} est en train d'écrire…`;
 clearTimeout(S.typingTimer);
 S.typingTimer=setTimeout(()=>{el.textContent=""},2500);
}

/* ---------- AFFICHAGE ---------- */
function bodyOf(m){
 if(m.deleted_for_all)return "Message supprimé";
 if(m.message_type==="image")return "📷 Photo";
 if(m.message_type==="video")return "🎬 Vidéo";
 if(m.message_type==="audio")return "🎤 Vocal";
 return m.body||"";
}
function contentHTML(m){
 if(m.deleted_for_all)return `<div class="mx-bub del">Message supprimé</div>`;
 const isMedia=["image","video","audio"].includes(m.message_type)&&m.media_path;
 const plain=S.plainSet[m.id]||S.bubbleMode==="plain";
 if(!isMedia){
  return `<div class="mx-bub${plain&&m.message_type==="text"?" plain":""}">${replyHTML(m)}${esc(m.body||"")}</div>`;
 }
 const url=mediaUrl(m.media_path);
 let inner="";
 if(m.message_type==="image")inner=`<img src="${esc(url)}" alt="" data-mx-img="${esc(url)}" loading="lazy">`;
 if(m.message_type==="video")inner=`<video src="${esc(url)}" controls playsinline preload="metadata"></video>`;
 if(m.message_type==="audio")inner=`<audio src="${esc(url)}" controls preload="metadata"></audio>`;
 const cap=m.body?`<div class="mx-cap">${esc(m.body)}</div>`:"";
 return `<div class="mx-bub media">${replyHTML(m)}${inner}${cap}</div>`;
}
function replyHTML(m){
 if(!m.reply_to)return "";
 const p=S.msgs.find(x=>x.id===m.reply_to);
 if(!p)return "";
 return `<div class="mx-quote">${esc(bodyOf(p))}</div>`;
}
function renderThread(){
 const box=$("mxThread");
 if(!box)return;
 const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<90;
 const otherRead=S.reads[S.other]?new Date(S.reads[S.other]):null;
 let lastMine=-1;
 S.msgs.forEach((m,i)=>{if(m.sender_id===me())lastMine=i});
 let html="",prev=null;
 S.msgs.forEach((m,i)=>{
  const mine=m.sender_id===me();
  const gap=prev?(new Date(m.created_at)-new Date(prev.created_at)):Infinity;
  if(!prev||gap>30*60*1000)html+=`<div class="mx-day">${esc(dayLabel(m.created_at))}</div>`;
  const next=S.msgs[i+1];
  const lastOfGroup=!next||next.sender_id!==m.sender_id;
  const reacts=S.reacts.get(m.id)||[];
  const counts={};reacts.forEach(r=>counts[r.emoji]=(counts[r.emoji]||0)+1);
  const reactHtml=Object.keys(counts).length
   ?`<span class="mx-react">${Object.entries(counts).map(([e,n])=>e+(n>1?" "+n:"")).join(" ")}</span>`:"";
  const seen=mine&&i===lastMine&&otherRead&&otherRead>=new Date(m.created_at);
  const content=contentHTML(m).replace(/<\/div>$/,reactHtml+"</div>");
  const avatar=!mine?(lastOfGroup?avatarHTML(S.otherAvatar,S.otherName):'<span class="mx-av-slot"></span>'):"";
  html+=`<div class="mx-line ${mine?"mine":"theirs"}" data-id="${esc(m.id)}">
   ${mine?content:`<div class="mx-group">${avatar}${content}</div>`}
   ${!m.deleted_for_all&&m.edited_at?'<div class="mx-meta">modifié</div>':""}
   ${seen?'<div class="mx-seen">Vu</div>':""}
  </div>`;
  prev=m;
 });
 box.innerHTML=html||'<div class="mx-empty">Pas encore de message. Dis bonjour 👋</div>';
 if(atBottom||S.firstLoad){box.scrollTop=box.scrollHeight;S.firstLoad=false}
}

/* ---------- BARRE : RÉPONSE / MODIFICATION / ENREGISTREMENT ---------- */
function setBar(m,editing=false){
 const bar=$("mxBar");
 if(!bar)return;
 if(!m){bar.hidden=true;bar.className="mx-bar";bar.innerHTML="";return}
 bar.hidden=false;bar.className="mx-bar";
 bar.innerHTML=`<span>${editing?"✏️ Modifier le message":"↩︎ "+esc(bodyOf(m).slice(0,80))}</span><button type="button" id="mxCancel" aria-label="Annuler">×</button>`;
 $("mxCancel").onclick=()=>{S.reply=null;S.edit=null;$("mxInput").value="";setBar(null);syncComposer()};
}
function replyTo(id){
 const m=S.msgs.find(x=>x.id===id);
 if(!m)return;
 S.reply=m;S.edit=null;setBar(m);$("mxInput").focus();
}

/* ---------- ENVOI TEXTE / MODIFICATION ---------- */
async function sendText(e){
 e.preventDefault();
 const input=$("mxInput"),text=input.value.trim();
 if(!text||!S.conv||S.sending)return;
 S.sending=true;$("mxSend").disabled=true;
 const res=S.edit
  ?await db.rpc("msg_edit",{p_message:S.edit.id,p_body:text})
  :await db.rpc("msg_send",{p_conv:S.conv,p_body:text,p_reply:S.reply?.id||null});
 S.sending=false;$("mxSend").disabled=false;
 if(res.error)return say(frErr(res.error));
 input.value="";S.reply=null;S.edit=null;setBar(null);syncComposer();
 fetchAll();
 input.focus();
}

/* ---------- ENVOI MÉDIA ---------- */
function setBusy(on,label){
 const btn=$("mxSend");
 if(!btn)return;
 btn.disabled=on;
 if(on)say(label||"Envoi…",true);
}
async function sendMedia(file,type,duration=null){
 if(!S.conv||!currentUser)return;
 const ext=((file.type||"").split("/")[1]||"bin").split(";")[0].replace(/[^a-z0-9]/gi,"").slice(0,6)||"bin";
 const path=`${me()}/${S.conv}/${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;
 setBusy(true,"Envoi en cours…");
 const up=await db.storage.from("msg-media").upload(path,file,{contentType:file.type||undefined,upsert:false});
 if(up.error){setBusy(false);return say("Envoi impossible : "+up.error.message)}
 const caption=type==="audio"?"":$("mxInput").value.trim();
 const {error}=await db.rpc("msg_send_media",{p_conv:S.conv,p_type:type,p_path:path,p_body:caption,p_reply:S.reply?.id||null,p_duration:duration});
 setBusy(false);
 if(error)return say(frErr(error));
 if(type!=="audio")$("mxInput").value="";
 S.reply=null;S.edit=null;setBar(null);syncComposer();
 fetchAll();
}
function handleFiles(e){
 const files=[...(e.target.files||[])];
 e.target.value="";
 files.forEach(f=>{
  const type=f.type.startsWith("video/")?"video":f.type.startsWith("image/")?"image":null;
  if(!type)return say("Choisis une photo ou une vidéo.");
  if(f.size>200*1024*1024)return say("Fichier trop lourd (200 Mo max).");
  sendMedia(f,type);
 });
}

/* ---------- VOCAL ---------- */
function recBar(){
 const bar=$("mxBar");
 const secs=Math.floor((Date.now()-S.recStart)/1000);
 bar.hidden=false;bar.className="mx-bar rec";
 bar.innerHTML=`<span>● Enregistrement ${Math.floor(secs/60)}:${String(secs%60).padStart(2,"0")} · touche le micro pour envoyer</span><button type="button" id="mxRecCancel" aria-label="Annuler">×</button>`;
 $("mxRecCancel").onclick=()=>stopRec(true);
}
async function toggleRec(){
 if(S.rec){stopRec(false);return}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say("Vocal non disponible sur cet appareil.");return}
 try{S.recStream=await navigator.mediaDevices.getUserMedia({audio:true})}
 catch(_){say("Autorise le micro pour envoyer un vocal.");return}
 const mime=["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(t=>MediaRecorder.isTypeSupported?.(t))||"";
 S.recChunks=[];S.recCancel=false;
 S.rec=new MediaRecorder(S.recStream,mime?{mimeType:mime}:undefined);
 S.rec.ondataavailable=ev=>{if(ev.data.size)S.recChunks.push(ev.data)};
 S.rec.onstop=()=>{
  const dur=Math.max(1,Math.round((Date.now()-S.recStart)/1000));
  S.recStream?.getTracks().forEach(t=>t.stop());
  clearInterval(S.recTimer);S.recStream=null;
  const type=S.rec.mimeType||mime||"audio/mp4";
  const blob=new Blob(S.recChunks,{type:type.split(";")[0]});
  S.rec=null;
  $("mxMic").classList.remove("rec");
  setBar(null);
  if(!S.recCancel&&blob.size>0){
   const file=new File([blob],"vocal."+(type.includes("mp4")?"m4a":"webm"),{type:blob.type});
   sendMedia(file,"audio",dur);
  }
 };
 S.rec.start(250);S.recStart=Date.now();
 $("mxMic").classList.add("rec");
 recBar();
 S.recTimer=setInterval(recBar,500);
}
function stopRec(cancel){
 if(!S.rec)return;
 S.recCancel=!!cancel;
 if(S.rec.state!=="inactive")S.rec.stop();
}

/* ---------- ACTIONS SUR UN MESSAGE ---------- */
function msgMenu(id){
 const m=S.msgs.find(x=>x.id===id);
 if(!m)return;
 const mine=m.sender_id===me();
 const canEdit=mine&&!m.deleted_for_all&&m.message_type==="text"&&Date.now()-new Date(m.created_at).getTime()<15*60*1000;
 const emojis=`<div class="mx-emojis">${EMOJIS.map(em=>`<button type="button" data-mx="react" data-id="${esc(id)}" data-emoji="${em}">${em}</button>`).join("")}</div>`;
 const isText=m.message_type==="text";
 const items=
  item("reply",id,"ti-arrow-back-up","Répondre")+
  item("forward",id,"ti-share-3","Transférer")+
  (isText?item("copy",id,"ti-copy","Copier"):"")+
  (isText?item("translate",id,"ti-language","Traduire"):"")+
  item("style",id,"ti-palette","Style de bulle")+
  (canEdit?item("edit",id,"ti-pencil","Modifier"):"")+
  item("hide",id,"ti-trash","Supprimer pour moi","danger")+
  (mine&&!m.deleted_for_all?item("all",id,"ti-trash-x","Supprimer pour tous","danger"):"");
 sheet(emojis+items,msgAction);
}
async function msgAction(a,id,emoji){
 if(a==="react"){
  const r=await db.rpc("msg_toggle_reaction",{p_message:id,p_emoji:emoji});
  if(r.error)return say(frErr(r.error));
  return fetchAll();
 }
 const m=S.msgs.find(x=>x.id===id);
 if(!m)return;
 if(a==="reply")return replyTo(id);
 if(a==="edit"){S.edit=m;S.reply=null;$("mxInput").value=m.body||"";setBar(m,true);syncComposer();$("mxInput").focus();return}
 if(a==="copy"){try{await navigator.clipboard.writeText(m.body||"");say("Message copié.",true)}catch(_){say("Copie impossible sur cet appareil.")}return}
 if(a==="forward"){
  const t=bodyOf(m);
  if(navigator.share){try{await navigator.share({text:t})}catch(_){}}
  else{try{await navigator.clipboard.writeText(t);say("Copié pour le transférer.",true)}catch(_){}}
  return;
 }
 if(a==="translate"){if(m.body)window.open("https://translate.google.com/?sl=auto&tl=fr&text="+encodeURIComponent(m.body),"_blank","noopener");return}
 if(a==="style"){
  if(S.plainSet[id])delete S.plainSet[id];else S.plainSet[id]=true;
  save("afroMsgPlain",S.plainSet);renderThread();return;
 }
 if(a==="hide"){
  const r=await db.rpc("msg_delete",{p_message:id,p_for_all:false});
  if(r.error)return say(frErr(r.error));
  return fetchAll();
 }
 if(a==="all"){
  if(!confirm("Supprimer ce message pour tout le monde ?"))return;
  const r=await db.rpc("msg_delete",{p_message:id,p_for_all:true});
  if(r.error)return say(frErr(r.error));
  return fetchAll();
 }
}

/* ---------- PAGE D'INFORMATIONS ---------- */
function ensureInfo(){
 if($("mxInfo"))return;
 const sec=document.createElement("section");
 sec.id="mxInfo";sec.className="mx-info";sec.hidden=true;
 document.body.appendChild(sec);
 sec.addEventListener("click",e=>{
  if(e.target.closest("#mxInfoBack")){sec.hidden=true;return}
  const q=e.target.closest("[data-q]");
  if(q){
   const k=q.dataset.q;
   if(k==="profile"){closeChat();if(typeof openProfile==="function")openProfile(S.other);return}
   if(k==="search"){say("La recherche dans la conversation arrive bientôt.");return}
   if(k==="group"){say("Les groupes arrivent bientôt.");return}
  }
  const o=e.target.closest("[data-o]");
  if(!o)return;
  const k=o.dataset.o;
  if(k==="bubble"){S.bubbleMode=S.bubbleMode==="plain"?"bubble":"plain";save("afroMsgBubbleMode",S.bubbleMode);renderInfo();renderThread();return}
  if(k==="mute"){S.mute[S.conv]=!S.mute[S.conv];save("afroMsgMute",S.mute);renderInfo();return}
  if(k==="archive"){archiveConv();return}
  if(k==="report"){reportConv();return}
  if(k==="block"){blockConv();return}
  if(k==="soon"){say("Bientôt disponible.");return}
 });
}
function openInfo(){
 if(!S.conv)return;
 ensureInfo();
 renderInfo();
 $("mxInfo").hidden=false;
}
function renderInfo(){
 const sec=$("mxInfo");
 if(!sec||!S.conv)return;
 const muted=!!S.mute[S.conv];
 const opt=(k,icon,label,extra="",cls="")=>`<button class="mx-opt ${cls}" data-o="${k}"><i class="ti ${icon}"></i><span>${label}</span>${extra}</button>`;
 sec.innerHTML=`
  <div class="mx-info-top"><button id="mxInfoBack" type="button" aria-label="Retour">‹</button><span></span></div>
  <div class="mx-info-hero">
   ${avatarHTML(S.otherAvatar,S.otherName)}
   <b>${esc(S.otherName)}</b>
   ${S.otherUser?`<small>@${esc(S.otherUser)}</small>`:""}
  </div>
  <div class="mx-quick">
   <button type="button" data-q="group"><i class="ti ti-users-plus"></i>Créer un groupe</button>
   <button type="button" data-q="profile"><i class="ti ti-user"></i>Voir le profil</button>
   <button type="button" data-q="search"><i class="ti ti-search"></i>Rechercher</button>
  </div>
  ${opt("bubble","ti-palette","Bulle de chat",`<i class="ti ti-chevron-right mx-ch"></i>`)}
  ${opt("soon","ti-photo","Fond d'écran",`<i class="ti ti-chevron-right mx-ch"></i>`,"soon")}
  ${opt("soon","ti-music","Sonneries d'alerte",`<i class="ti ti-chevron-right mx-ch"></i>`,"soon")}
  ${opt("mute","ti-bell-off","Mettre en sourdine",`<span class="mx-switch ${muted?"on":""}"></span>`)}
  ${opt("archive","ti-archive","Archiver la conversation")}
  ${opt("report","ti-flag","Signaler")}
  ${opt("block","ti-ban","Bloquer",``,"danger")}
  <div style="height:24px"></div>`;
 sec.querySelector('[data-o="bubble"]').insertAdjacentHTML("beforeend","");
}

async function archiveConv(){
 await db.from("msg_members").update({archived:true}).eq("conversation_id",S.conv).eq("user_id",me());
 say("Conversation archivée.",true);
 closeChat();
}
async function reportConv(){
 const reason=prompt("Motif : spam, harassment, hate, nudity, violence, scam, other","other");
 if(!reason)return;
 const {error}=await db.from("social_reports").insert({reporter_id:me(),reported_user_id:S.other,reason:reason.toLowerCase().trim(),status:"pending"});
 say(error?error.message:"Signalement envoyé.",!error);
}
async function blockConv(){
 if(!confirm(`Bloquer ${S.otherName} ? Vous ne pourrez plus échanger de messages.`))return;
 const {error}=await db.from("user_blocks").insert({blocker_id:me(),blocked_id:S.other});
 if(error&&!/duplicate/i.test(error.message))return say(error.message);
 say("Utilisateur bloqué.",true);
 closeChat();
}

/* ---------- NOUVELLE CONVERSATION ---------- */
async function startWith(otherId,name){
 if(!currentUser){if(typeof guestToAuth==="function")guestToAuth();return}
 const {data:convId,error}=await db.rpc("msg_start_conversation",{p_other:otherId});
 if(error)return say(frErr(error));
 await loadList();
 await openConv(convId,otherId,name);
}

/* ---------- CYCLE DE VIE ---------- */
function reset(){
 leaveConv();
 if(S.listChan){db.removeChannel(S.listChan);S.listChan=null}
 Object.assign(S,{list:[],conv:null,other:null,msgs:[],reacts:new Map(),reads:{}});
 if($("mxChat"))$("mxChat").hidden=true;
 if($("mxInfo"))$("mxInfo").hidden=true;
}

window.openAfroCreatorConversation=startWith;
window.afroLoadMessagesPage=async function(){ensureList();subscribeList();await loadList()};
window.afroRefreshDMUnread=async function(){if(!currentUser)return;subscribeList();await loadList()};
window.msgInit=window.afroRefreshDMUnread;
window.msgOpen=window.afroLoadMessagesPage;
window.msgReset=reset;
window.msgFromProfile=(id,name)=>startWith(id,name);

if(typeof db!=="undefined"&&db.auth?.onAuthStateChange){
 db.auth.onAuthStateChange((event,session)=>{if(!session?.user)reset()});
}
})();
