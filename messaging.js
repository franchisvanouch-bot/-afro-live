/* =========================================================
   AFRO LIVE — messaging.js (v3 : interface de chat claire)
   Dépend de : db, currentUser, currentProfile, message(), guestToAuth()
   Tables/fonctions : msg_* (migration messagerie_v1)
   ========================================================= */
(()=>{
"use strict";
if(window.__afroMsgV3)return;
window.__afroMsgV3=true;

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
const avatarHTML=(url,name,cls="mx-av")=>url
 ?`<img class="${cls}" src="${esc(url)}" alt="">`
 :`<span class="${cls} mx-av-t">${esc((name||"?").trim().charAt(0).toUpperCase()||"?")}</span>`;

const S={
 list:[],showArch:false,conv:null,other:null,otherName:"",
 msgs:[],reacts:new Map(),reads:{},reply:null,edit:null,
 chan:null,listChan:null,typingTimer:null,typingAt:0,sending:false,firstLoad:true,
 bubble:JSON.parse(localStorage.getItem("afroMsgBubble")||"{}")
};

/* ---------- STYLE ---------- */
function css(){
 if($("mxStyle"))return;
 const s=document.createElement("style");
 s.id="mxStyle";
 s.textContent=`
 .mx-page{background:#fff;color:#111;min-height:70vh;border-radius:18px 18px 0 0;padding:4px 0 96px}
 .mx-top{display:flex;align-items:center;justify-content:center;padding:14px 14px 8px;font-weight:700;font-size:18px;color:#111}
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
 .mx-chat[hidden]{display:none!important}
 .mx-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #eee}
 .mx-back{border:0;background:none;font-size:34px;color:#3a6bff;padding:0 8px;line-height:1}
 .mx-title{flex:1;min-width:0;display:flex;align-items:center;gap:10px}
 .mx-title .mx-av{width:36px;height:36px;flex:0 0 36px}
 .mx-title b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#111}
 .mx-more{border:0;background:none;font-size:22px;color:#111;padding:0 8px;letter-spacing:2px}
 .mx-thread{flex:1;overflow-y:auto;padding:12px 12px;display:flex;flex-direction:column;gap:2px;background:#fff;-webkit-overflow-scrolling:touch}
 .mx-day{align-self:center;color:#8e8e93;font-size:12px;margin:14px 0 8px}
 .mx-line{display:flex;flex-direction:column;max-width:82%;position:relative;margin-bottom:6px}
 .mx-line.mine{align-self:flex-end;align-items:flex-end}
 .mx-line.theirs{align-self:flex-start;align-items:flex-start}
 .mx-group{display:flex;align-items:flex-end;gap:6px}
 .mx-group .mx-av{width:28px;height:28px;flex:0 0 28px}
 .mx-av-slot{width:28px;flex:0 0 28px}
 .mx-bub{position:relative;padding:10px 14px;border-radius:20px;font-size:15px;line-height:1.35;background:#eef0f4;color:#111;white-space:pre-wrap;word-break:break-word;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
 .mx-line.mine .mx-bub{background:linear-gradient(120deg,#3a6bff,#7a4dff);color:#fff;border-bottom-right-radius:6px}
 .mx-line.theirs .mx-bub{border-bottom-left-radius:6px}
 .mx-bub.plain{background:transparent!important;color:#111!important;padding:4px 2px}
 .mx-bub.del{background:none;border:1px dashed #ccc;color:#999;font-style:italic}
 .mx-quote{border-left:3px solid rgba(0,0,0,.25);padding:2px 8px;margin-bottom:6px;font-size:12px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
 .mx-react{position:absolute;bottom:-12px;right:8px;background:#fff;border:1px solid #e5e5ea;border-radius:999px;padding:1px 7px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.12)}
 .mx-meta{font-size:11px;color:#8e8e93;margin-top:4px;padding:0 4px}
 .mx-seen{font-size:11px;color:#8e8e93;margin-top:3px;align-self:flex-end;padding-right:4px}
 .mx-typing{font-size:12px;color:#8e8e93;padding:0 16px 4px;min-height:16px}
 .mx-replybar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 12px 6px;padding:8px 12px;background:#f3f4f7;border-left:3px solid #3a6bff;border-radius:10px;font-size:13px;color:#333}
 .mx-replybar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .mx-replybar button{border:0;background:none;font-size:20px;color:#555}
 .mx-foot{display:flex;align-items:center;gap:8px;padding:8px 10px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #eee;background:#fff}
 .mx-foot input{flex:1;min-width:0;border:0;border-radius:24px;background:#f0f1f4;padding:12px 16px;font-size:16px;color:#111;margin:0}
 .mx-send{width:42px;height:42px;border-radius:50%;border:0;background:#3a6bff;color:#fff;font-size:18px;flex:0 0 42px;display:grid;place-items:center}
 .mx-send:disabled{opacity:.4}

 .mx-menu-bg{position:fixed;inset:0;z-index:2147483200;background:rgba(255,255,255,.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
 .mx-menu{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(340px,calc(100vw - 24px));background:#fff;border-radius:24px;box-shadow:0 14px 40px rgba(0,0,0,.2);overflow:hidden;color:#111;padding-bottom:6px}
 .mx-emojis{display:flex;justify-content:space-around;align-items:center;padding:12px 8px;border-bottom:1px solid #f0f0f0}
 .mx-emojis button{border:0;background:none;font-size:26px;padding:2px;line-height:1}
 .mx-item{display:flex;align-items:center;gap:14px;width:100%;border:0;background:none;padding:14px 18px;font-size:15px;color:#111;text-align:left;border-top:1px solid #f4f4f6}
 .mx-item i{width:20px;text-align:center;font-size:19px;color:#444}
 .mx-item.danger,.mx-item.danger i{color:#e5484d}
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

/* ---------- CHAT ---------- */
function ensureChat(){
 css();
 if($("mxChat"))return;
 const wrap=document.createElement("section");
 wrap.id="mxChat";wrap.className="mx-chat";wrap.hidden=true;
 wrap.innerHTML=`
  <div class="mx-head">
   <button class="mx-back" id="mxBack" type="button" aria-label="Retour">‹</button>
   <div class="mx-title" id="mxTitle"></div>
   <button class="mx-more" id="mxMore" type="button" aria-label="Options">•••</button>
  </div>
  <div id="mxThread" class="mx-thread"></div>
  <div id="mxTyping" class="mx-typing"></div>
  <div id="mxReply" class="mx-replybar" hidden></div>
  <form id="mxForm" class="mx-foot">
   <input id="mxInput" maxlength="2000" placeholder="Message..." autocomplete="off">
   <button id="mxSend" class="mx-send" type="submit" aria-label="Envoyer">➤</button>
  </form>`;
 document.body.appendChild(wrap);

 $("mxBack").addEventListener("click",closeChat);
 $("mxMore").addEventListener("click",chatMenu);
 $("mxForm").addEventListener("submit",sendMessage);
 $("mxInput").addEventListener("input",typingPing);

 const th=$("mxThread");
 let lpTimer=null,lpX=0,lpY=0;
 th.addEventListener("touchstart",e=>{
  const line=e.target.closest(".mx-line");
  if(!line||e.touches.length!==1)return;
  lpX=e.touches[0].clientX;lpY=e.touches[0].clientY;
  clearTimeout(lpTimer);
  lpTimer=setTimeout(()=>{lpTimer=null;msgMenu(line.dataset.id)},450);
 },{passive:true});
 th.addEventListener("touchmove",e=>{
  if(!lpTimer)return;
  const t=e.touches[0];
  if(Math.abs(t.clientX-lpX)>10||Math.abs(t.clientY-lpY)>10){clearTimeout(lpTimer);lpTimer=null}
 },{passive:true});
 th.addEventListener("touchend",()=>{clearTimeout(lpTimer);lpTimer=null});
 th.addEventListener("contextmenu",e=>{
  const line=e.target.closest(".mx-line");
  if(!line)return;
  e.preventDefault();
  msgMenu(line.dataset.id);
 });
}

async function openConv(convId,otherId,name){
 if(!currentUser)return;
 ensureChat();
 S.conv=convId;S.other=otherId;S.otherName=name||"";
 S.reply=null;S.edit=null;S.firstLoad=true;setBar(null);
 const row=S.list.find(c=>c.conversation_id===convId);
 const shown=row?.other_name||row?.other_username||name||"Membre";
 S.otherName=shown;
 $("mxTitle").innerHTML=avatarHTML(row?.other_avatar,shown)+`<b>${esc(shown)}</b>`;
 $("mxChat").hidden=false;
 $("mxThread").innerHTML='<div class="mx-empty">Chargement...</div>';
 subscribeConv(convId);
 await markRead();
 await fetchAll();
}

function closeChat(){
 leaveConv();
 S.conv=null;S.other=null;
 if($("mxChat"))$("mxChat").hidden=true;
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

async function fetchAll(){
 const convId=S.conv;
 if(!convId)return;
 const [mRes,memRes]=await Promise.all([
  db.from("msg_messages").select("id,sender_id,body,reply_to,created_at,edited_at,deleted_for_all")
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

function renderThread(){
 const box=$("mxThread");
 if(!box)return;
 const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<90;
 const byId=new Map(S.msgs.map(m=>[m.id,m]));
 const otherRead=S.reads[S.other]?new Date(S.reads[S.other]):null;
 let lastMine=-1;
 S.msgs.forEach((m,i)=>{if(m.sender_id===me())lastMine=i});

 let html="",prev=null;
 S.msgs.forEach((m,i)=>{
  const mine=m.sender_id===me();
  const gap=prev?(new Date(m.created_at)-new Date(prev.created_at)):Infinity;
  if(!prev||gap>30*60*1000){
   html+=`<div class="mx-day">${esc(dayLabel(m.created_at))}</div>`;
  }
  const next=S.msgs[i+1];
  const lastOfGroup=!next||next.sender_id!==m.sender_id;
  const quoted=m.reply_to&&byId.get(m.reply_to);
  const reacts=S.reacts.get(m.id)||[];
  const counts={};reacts.forEach(r=>counts[r.emoji]=(counts[r.emoji]||0)+1);
  const reactHtml=Object.keys(counts).length
   ?`<span class="mx-react">${Object.entries(counts).map(([e,n])=>e+(n>1?" "+n:"")).join(" ")}</span>`:"";
  const plain=S.bubble[m.id]==="plain";
  const seen=mine&&i===lastMine&&otherRead&&otherRead>=new Date(m.created_at);
  const bubbleText=m.deleted_for_all?"Message supprimé":esc(m.body||"");
  const bubbleCls=["mx-bub",plain?"plain":"",m.deleted_for_all?"del":""].join(" ").trim();
  const bubble=`<div class="${bubbleCls}">${quoted?`<div class="mx-quote">${esc(quoted.deleted_for_all?"Message supprimé":quoted.body)}</div>`:""}${bubbleText}${reactHtml}</div>`;
  const avatar=!mine?(lastOfGroup?avatarHTML(null,S.otherName,"mx-av"):'<span class="mx-av-slot"></span>'):"";
  html+=`<div class="mx-line ${mine?"mine":"theirs"}" data-id="${esc(m.id)}">
   ${mine?bubble:`<div class="mx-group">${avatar}${bubble}</div>`}
   ${!m.deleted_for_all&&m.edited_at?'<div class="mx-meta">modifié</div>':""}
   ${seen?'<div class="mx-seen">Vu</div>':""}
  </div>`;
  prev=m;
 });
 box.innerHTML=html||'<div class="mx-empty">Pas encore de message. Dis bonjour 👋</div>';
 if(atBottom||S.firstLoad){box.scrollTop=box.scrollHeight;S.firstLoad=false}
}

/* ---------- ENVOI / MODIFICATION ---------- */
function setBar(m,editing=false){
 const bar=$("mxReply");
 if(!bar)return;
 if(!m){bar.hidden=true;bar.innerHTML="";return}
 bar.hidden=false;
 bar.innerHTML=`<span>${editing?"✏️ Modifier le message":"↩︎ "+esc((m.body||"").slice(0,80))}</span><button type="button" id="mxCancel" aria-label="Annuler">×</button>`;
 $("mxCancel").onclick=()=>{S.reply=null;S.edit=null;$("mxInput").value="";setBar(null)};
}

async function sendMessage(e){
 e.preventDefault();
 const input=$("mxInput"),text=input.value.trim();
 if(!text||!S.conv||S.sending)return;
 S.sending=true;$("mxSend").disabled=true;
 const res=S.edit
  ?await db.rpc("msg_edit",{p_message:S.edit.id,p_body:text})
  :await db.rpc("msg_send",{p_conv:S.conv,p_body:text,p_reply:S.reply?.id||null});
 S.sending=false;$("mxSend").disabled=false;
 if(res.error)return say(frErr(res.error));
 input.value="";S.reply=null;S.edit=null;setBar(null);
 fetchAll();
 input.focus();
}

/* ---------- ACTIONS SUR UN MESSAGE ---------- */
function msgMenu(id){
 const m=S.msgs.find(x=>x.id===id);
 if(!m)return;
 const mine=m.sender_id===me();
 const canEdit=mine&&!m.deleted_for_all&&m.body&&Date.now()-new Date(m.created_at).getTime()<15*60*1000;
 const emojis=`<div class="mx-emojis">${EMOJIS.map(em=>`<button type="button" data-mx="react" data-id="${esc(id)}" data-emoji="${em}">${em}</button>`).join("")}</div>`;
 const items=
  item("reply",id,"ti-arrow-back-up","Répondre")+
  item("forward",id,"ti-share-3","Transférer")+
  item("copy",id,"ti-copy","Copier")+
  item("translate",id,"ti-language","Traduire")+
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
 if(a==="reply"){S.reply=m;S.edit=null;setBar(m);$("mxInput").focus();return}
 if(a==="edit"){S.edit=m;S.reply=null;$("mxInput").value=m.body||"";setBar(m,true);$("mxInput").focus();return}
 if(a==="copy"){
  try{await navigator.clipboard.writeText(m.body||"");say("Message copié.",true)}catch(_){say("Copie impossible sur cet appareil.")}
  return;
 }
 if(a==="forward"){
  const t=m.body||"";
  if(navigator.share){try{await navigator.share({text:t})}catch(_){}}
  else{try{await navigator.clipboard.writeText(t);say("Message copié pour le transférer.",true)}catch(_){}}
  return;
 }
 if(a==="translate"){
  if(m.body)window.open("https://translate.google.com/?sl=auto&tl=fr&text="+encodeURIComponent(m.body),"_blank","noopener");
  return;
 }
 if(a==="style"){
  if(S.bubble[id]==="plain")delete S.bubble[id];else S.bubble[id]="plain";
  localStorage.setItem("afroMsgBubble",JSON.stringify(S.bubble));
  renderThread();
  return;
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

/* ---------- OPTIONS DE LA CONVERSATION ---------- */
function chatMenu(){
 if(!S.conv)return;
 sheet(
  item("archive",S.conv,"ti-archive","Archiver la conversation")+
  item("report",S.conv,"ti-flag","Signaler")+
  item("block",S.conv,"ti-ban","Bloquer","danger"),
  async a=>{
   if(a==="archive"){
    await db.from("msg_members").update({archived:true}).eq("conversation_id",S.conv).eq("user_id",me());
    say("Conversation archivée.",true);
    closeChat();
   }
   if(a==="block"){
    if(!confirm(`Bloquer ${S.otherName} ? Vous ne pourrez plus échanger de messages.`))return;
    const {error}=await db.from("user_blocks").insert({blocker_id:me(),blocked_id:S.other});
    if(error&&!/duplicate/i.test(error.message))return say(error.message);
    say("Utilisateur bloqué.",true);
    closeChat();
   }
   if(a==="report"){
    const reason=prompt("Motif : spam, harassment, hate, nudity, violence, scam, other","other");
    if(!reason)return;
    const {error}=await db.from("social_reports").insert({reporter_id:me(),reported_user_id:S.other,reason:reason.toLowerCase().trim(),status:"pending"});
    say(error?error.message:"Signalement envoyé.",!error);
   }
  }
 );
}

/* ---------- NOUVELLE CONVERSATION (depuis un profil) ---------- */
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
}

window.openAfroCreatorConversation=startWith;
window.afroLoadMessagesPage=async function(){
 ensureList();
 subscribeList();
 await loadList();
};
window.afroRefreshDMUnread=async function(){
 if(!currentUser)return;
 subscribeList();
 await loadList();
};
window.msgInit=window.afroRefreshDMUnread;
window.msgOpen=window.afroLoadMessagesPage;
window.msgReset=reset;
window.msgFromProfile=(id,name)=>startWith(id,name);

if(typeof db!=="undefined"&&db.auth?.onAuthStateChange){
 db.auth.onAuthStateChange((event,session)=>{if(!session?.user)reset()});
}
})();
