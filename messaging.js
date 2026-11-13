/* AFRO LIVE — messagerie neuve v2 */
(()=>{
"use strict";
const $=id=>document.getElementById(id), state={conversation:null,channel:null,inboxChannel:null,busy:false};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const me=()=>typeof currentUser!=="undefined"&&currentUser?.id?currentUser:null;
const say=t=>{if(typeof message==="function")message(t)};
const avatar=p=>p?.avatar_url?'<img class="afro-v2-avatar" src="'+esc(p.avatar_url)+'" alt="">':'<span class="afro-v2-avatar">'+esc((p?.display_name||p?.username||"?").slice(0,1).toUpperCase())+'</span>';
function ensure(){
 if(!$("afroMessengerV2Styles")){
  const st=document.createElement("style");st.id="afroMessengerV2Styles";
  st.textContent=`
  #afroMessengerV2{position:fixed;inset:0;z-index:2147483600;background:#08090c;color:#f7f7f8;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);font-family:inherit}
  #afroMessengerV2[hidden]{display:none!important}
  #afroMessengerV2 .v2-head{height:58px;flex:0 0 58px;display:flex;align-items:center;gap:12px;padding:0 15px;border-bottom:1px solid #24252b}
  #afroMessengerV2 .v2-head strong{flex:1;font-size:18px}
  #afroMessengerV2 button{font:inherit;cursor:pointer}
  #afroMessengerV2 .v2-icon{width:40px;height:40px;border:0;border-radius:50%;background:#202127;color:#fff;font-size:22px}
  #afroMessengerV2 .v2-list{flex:1;overflow:auto;padding:8px 14px}
  #afroMessengerV2 .v2-row{display:flex;align-items:center;gap:12px;width:100%;padding:13px 4px;background:transparent;color:#fff;border:0;border-bottom:1px solid #24252b;text-align:left}
  #afroMessengerV2 .afro-v2-avatar{width:48px;height:48px;border-radius:50%;background:#292b32;object-fit:cover;display:grid;place-items:center;flex:0 0 48px;font-weight:700}
  #afroMessengerV2 .v2-copy{min-width:0;flex:1}
  #afroMessengerV2 .v2-copy b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #afroMessengerV2 .v2-copy small{display:block;color:#a4a5ad;font-size:12px;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #afroMessengerV2 .v2-unread{background:#ff861c;color:#111;border-radius:18px;min-width:20px;height:20px;display:grid;place-items:center;padding:0 5px;font-size:11px;font-weight:800}
  #afroMessengerV2 .v2-empty{color:#a3a4aa;text-align:center;padding:42px 18px;font-size:14px;line-height:1.6}
  #afroMessengerV2 .v2-search{padding:12px 14px;border-bottom:1px solid #24252b}
  #afroMessengerV2 .v2-search input,#afroMessengerV2 .v2-compose input{width:100%;min-width:0;box-sizing:border-box;border:0;outline:0;border-radius:24px;background:#202127;color:#fff;padding:13px 16px;font-size:15px}
  #afroMessengerV2 .v2-chat{flex:1;min-height:0;display:flex;flex-direction:column}
  #afroMessengerV2 .v2-messages{flex:1;overflow:auto;padding:14px 13px;display:flex;flex-direction:column;gap:10px}
  #afroMessengerV2 .v2-msg{max-width:84%;display:flex;flex-direction:column;align-self:flex-start;gap:4px}
  #afroMessengerV2 .v2-msg.mine{align-self:flex-end;align-items:flex-end}
  #afroMessengerV2 .v2-bubble{background:#22242b;color:#f7f7f8;padding:11px 14px;border-radius:19px 19px 19px 5px;overflow-wrap:anywhere;white-space:pre-wrap;font-size:15px;line-height:1.4}
  #afroMessengerV2 .v2-msg.mine .v2-bubble{background:#ff7818;color:#111;border-radius:19px 19px 5px 19px}
  #afroMessengerV2 .v2-meta{font-size:10px;color:#92939b;padding:0 5px}
  #afroMessengerV2 .v2-actions{display:flex;gap:8px}
  #afroMessengerV2 .v2-actions button{border:0;background:transparent;color:#aaa;font-size:11px;padding:3px}
  #afroMessengerV2 .v2-compose{display:flex;align-items:center;gap:8px;padding:10px;border-top:1px solid #24252b;background:#0b0c10}
  #afroMessengerV2 .v2-compose input{flex:1}
  #afroMessengerV2 .v2-send{width:46px;height:46px;border:0;border-radius:50%;background:#ff7818;color:#111;font-size:20px;font-weight:800}
  #afroMessengerV2 .v2-send:disabled{opacity:.5}
  `;
  document.head.appendChild(st);
 }
 if($("afroMessengerV2"))return $("afroMessengerV2");
 const root=document.createElement("section");root.id="afroMessengerV2";root.hidden=true;
 root.innerHTML=`
 <header class="v2-head"><button class="v2-icon" type="button" data-v2-back>‹</button><strong id="afroV2Title">Messages</strong><button class="v2-icon" type="button" data-v2-new>＋</button></header>
 <div id="afroV2Search" class="v2-search" hidden><input id="afroV2SearchInput" type="search" placeholder="Rechercher un nom ou un pseudo" autocomplete="off"></div>
 <main id="afroV2Body" class="v2-list"><div class="v2-empty">Tes conversations apparaîtront ici.</div></main>`;
 document.body.appendChild(root);root.addEventListener("click",click);root.addEventListener("keydown",key);
 $("afroV2SearchInput").addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(searchUsers,250)});
 return root;
}
let searchTimer=null;
function close(){if(state.channel){db.removeChannel(state.channel);state.channel=null;}if(state.inboxChannel){db.removeChannel(state.inboxChannel);state.inboxChannel=null;}state.conversation=null;$("afroMessengerV2")?.setAttribute("hidden","");}
async function openInbox(){
 if(!me()){if(typeof guestToAuth==="function")guestToAuth();return;}
 ensure();$("afroDmOverlay")?.setAttribute("hidden","");
 $("afroMessengerV2").hidden=false;$("afroV2Search").hidden=true;$("afroV2Title").textContent="Messages";
 if(state.inboxChannel)db.removeChannel(state.inboxChannel);
 state.inboxChannel=db.channel("afro-dm-inbox-"+me().id).on("postgres_changes",{event:"INSERT",schema:"public",table:"dm_messages"},async payload=>{if(!$("afroMessengerV2")?.hidden&&!state.conversation)await inbox();}).subscribe();
 $("afroV2Body").className="v2-list";await inbox();
}
async function inbox(){
 const body=$("afroV2Body"),uid=me().id;body.innerHTML='<div class="v2-empty">Chargement…</div>';
 const a=await db.from("dm_members").select("conversation_id,last_read_at").eq("user_id",uid);
 if(a.error){body.innerHTML='<div class="v2-empty">'+esc(a.error.message)+'</div>';return;}
 const ids=(a.data||[]).map(x=>x.conversation_id);
 if(!ids.length){body.innerHTML='<div class="v2-empty">Aucune conversation pour le moment.<br>Appuie sur ＋ pour commencer.</div>';badge(0);return;}
 const [cs,ms]=await Promise.all([db.from("dm_conversations").select("id,last_message_at,last_message_preview").in("id",ids).order("last_message_at",{ascending:false}),db.from("dm_members").select("conversation_id,user_id").in("conversation_id",ids).neq("user_id",uid)]);
 if(cs.error||ms.error){body.innerHTML='<div class="v2-empty">Impossible de charger les conversations.</div>';return;}
 const otherIds=[...new Set((ms.data||[]).map(x=>x.user_id))],pr=otherIds.length?await db.from("profiles").select("id,username,display_name,avatar_url").in("id",otherIds):{data:[]};
 const pm=Object.fromEntries((pr.data||[]).map(p=>[p.id,p])),om=Object.fromEntries((ms.data||[]).map(x=>[x.conversation_id,x.user_id])),reads=Object.fromEntries((a.data||[]).map(x=>[x.conversation_id,x.last_read_at]));
 let total=0,html="";
 for(const c of cs.data||[]){
  const p=pm[om[c.id]]||{username:"membre",display_name:"Membre"};
  const un=await db.from("dm_messages").select("id",{count:"exact",head:true}).eq("conversation_id",c.id).neq("sender_id",uid).gt("created_at",reads[c.id]||"1970-01-01");
  const n=un.count||0;total+=n;
  html+='<button type="button" class="v2-row" data-v2-open="'+esc(c.id)+'" data-v2-other="'+esc(om[c.id]||"")+'" data-v2-name="'+esc(p.display_name||p.username)+'">'+avatar(p)+'<span class="v2-copy"><b>'+esc(p.display_name||p.username)+' · @'+esc(p.username)+'</b><small>'+esc(c.last_message_preview||"Nouvelle conversation")+'</small></span>'+(n?'<span class="v2-unread">'+n+'</span>':'')+'</button>';
 }
 body.innerHTML=html||'<div class="v2-empty">Aucune conversation.</div>';badge(total);
}
function badge(n){const b=$("navigation")?.querySelector('button[data-page="notifs"]');if(!b)return;let d=b.querySelector(".navdot");if(!d){d=document.createElement("i");d.className="navdot";b.appendChild(d);}d.hidden=!(n>0);d.textContent=n?(n>99?"99+":String(n)):"";}
async function start(other,name){
 if(!me()){if(typeof guestToAuth==="function")guestToAuth();return;}
 if(!other||other===me().id)return;
 ensure();$("afroMessengerV2").hidden=false;
 const r=await db.rpc("dm_start_conversation",{p_other:other});
 if(r.error){$("afroV2Body").innerHTML='<div class="v2-empty">'+esc(r.error.message)+'</div>';return;}
 await openConversation(r.data,other,name||"Conversation");
}
async function openConversation(id,other,name){
 if(state.channel){db.removeChannel(state.channel);state.channel=null;}
 state.conversation=id;$("afroV2Title").textContent=name||"Conversation";$("afroV2Search").hidden=true;
 const body=$("afroV2Body");body.className="v2-chat";
 body.innerHTML='<div id="afroV2Messages" class="v2-messages"><div class="v2-empty">Chargement des messages…</div></div><div class="v2-compose"><input id="afroV2Input" maxlength="2000" placeholder="Message…" autocomplete="off"><button type="button" class="v2-send" data-v2-send>➤</button></div>';
 await loadMessages();await db.rpc("dm_mark_read",{p_conversation:id});
 state.channel=db.channel("afro-dm-v2-"+id).on("postgres_changes",{event:"*",schema:"public",table:"dm_messages",filter:"conversation_id=eq."+id},async()=>{await loadMessages();await db.rpc("dm_mark_read",{p_conversation:id});}).subscribe();
}
async function loadMessages(){
 const box=$("afroV2Messages");if(!box||!state.conversation)return;
 const r=await db.from("dm_messages").select("id,sender_id,body,created_at,edited_at").eq("conversation_id",state.conversation).order("created_at",{ascending:true}).limit(300);
 if(r.error){box.innerHTML='<div class="v2-empty">'+esc(r.error.message)+'</div>';return;}
 box.innerHTML=(r.data||[]).map(m=>{const mine=m.sender_id===me().id;return '<article class="v2-msg'+(mine?' mine':'')+'"><div class="v2-bubble">'+esc(m.body)+'</div><small class="v2-meta">'+new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+(m.edited_at?" · modifié":"")+'</small>'+(mine?'<div class="v2-actions"><button type="button" data-v2-edit="'+m.id+'">Modifier</button><button type="button" data-v2-delete="'+m.id+'">Supprimer pour tous</button></div>':'')+'</article>';}).join("")||'<div class="v2-empty">Démarre la conversation 👋</div>';
 box.scrollTop=box.scrollHeight;
}
async function send(){
 if(state.busy||!state.conversation||!me())return;
 const input=$("afroV2Input"),body=input?.value.trim()||"";if(!body)return;
 state.busy=true;const btn=$("afroMessengerV2")?.querySelector("[data-v2-send]");if(btn)btn.disabled=true;
 const r=await db.from("dm_messages").insert({conversation_id:state.conversation,sender_id:me().id,body});
 state.busy=false;if(btn)btn.disabled=false;
 if(r.error){say("Message non envoyé : "+r.error.message);return;}
 input.value="";await loadMessages();await db.rpc("dm_mark_read",{p_conversation:state.conversation});
}
async function searchUsers(){
 const q=$("afroV2SearchInput").value.trim().replace(/[%_,().]/g,"").slice(0,32),body=$("afroV2Body");
 if(!q){body.innerHTML='<div class="v2-empty">Recherche un pseudo ou un nom.</div>';return;}
 body.innerHTML='<div class="v2-empty">Recherche…</div>';
 const [a,b]=await Promise.all([db.from("profiles").select("id,username,display_name,avatar_url").ilike("username","%"+q+"%").neq("id",me().id).limit(12),db.from("profiles").select("id,username,display_name,avatar_url").ilike("display_name","%"+q+"%").neq("id",me().id).limit(12)]);
 if(a.error||b.error){body.innerHTML='<div class="v2-empty">Recherche indisponible.</div>';return;}
 const map=new Map();[...(a.data||[]),...(b.data||[])].forEach(p=>map.set(p.id,p));
 body.innerHTML=[...map.values()].map(p=>'<button type="button" class="v2-row" data-v2-start="'+p.id+'" data-v2-name="'+esc(p.display_name||p.username)+'">'+avatar(p)+'<span class="v2-copy"><b>'+esc(p.display_name||p.username)+'</b><small>@'+esc(p.username)+'</small></span></button>').join("")||'<div class="v2-empty">Aucun membre trouvé.</div>';
}
async function click(e){
 const t=e.target.closest("button");if(!t)return;
 if(t.hasAttribute("data-v2-back")){if(state.conversation){if(state.channel){db.removeChannel(state.channel);state.channel=null;}state.conversation=null;$("afroV2Title").textContent="Messages";$("afroV2Body").className="v2-list";$("afroV2Search").hidden=true;await inbox();}else close();return;}
 if(t.hasAttribute("data-v2-new")){$("afroV2Search").hidden=false;$("afroV2Title").textContent="Nouveau message";$("afroV2Body").className="v2-list";$("afroV2Body").innerHTML='<div class="v2-empty">Recherche un pseudo ou un nom.</div>';$("afroV2SearchInput").value="";$("afroV2SearchInput").focus();return;}
 if(t.hasAttribute("data-v2-send")){e.preventDefault();await send();return;}
 if(t.dataset.v2Open){await openConversation(t.dataset.v2Open,t.dataset.v2Other,t.dataset.v2Name);return;}
 if(t.dataset.v2Start){await start(t.dataset.v2Start,t.dataset.v2Name);return;}
 if(t.dataset.v2Edit){const old=t.closest(".v2-msg")?.querySelector(".v2-bubble")?.textContent||"",v=prompt("Modifier le message :",old);if(v===null)return;if(!v.trim()||v.length>2000)return say("Message invalide.");const r=await db.from("dm_messages").update({body:v.trim(),edited_at:new Date().toISOString()}).eq("id",t.dataset.v2Edit).eq("sender_id",me().id);if(r.error)say("Modification impossible : "+r.error.message);else await loadMessages();return;}
 if(t.dataset.v2Delete){if(!confirm("Supprimer définitivement ce message pour les deux personnes ?"))return;const r=await db.from("dm_messages").delete().eq("id",t.dataset.v2Delete).eq("sender_id",me().id);if(r.error)say("Suppression impossible : "+r.error.message);else await loadMessages();return;}
}
function key(e){if(e.target?.id==="afroV2Input"&&e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.stopPropagation();send();}}
async function refreshUnreadBadge(){if(!me())return;const r=await db.from("dm_members").select("conversation_id,last_read_at").eq("user_id",me().id);let total=0;for(const x of r.data||[]){const q=await db.from("dm_messages").select("id",{count:"exact",head:true}).eq("conversation_id",x.conversation_id).neq("sender_id",me().id).gt("created_at",x.last_read_at);total+=q.count||0;}badge(total);}
function init(){
 ensure();window.openAfroCreatorConversation=start;window.openAfroMessages=openInbox;window.afroLoadMessagesPage=openInbox;window.afroRefreshDMUnread=refreshUnreadBadge;
 document.addEventListener("click",e=>{if(e.target.closest("[data-afro-open-dm]")){e.preventDefault();openInbox();}},false);
 if(typeof db!=="undefined"&&db.auth?.onAuthStateChange)db.auth.onAuthStateChange((event,session)=>{if(!session?.user)close();else setTimeout(refreshUnreadBadge,500);});
 setTimeout(refreshUnreadBadge,700);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();