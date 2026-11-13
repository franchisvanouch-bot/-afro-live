/* AFRO LIVE — social extensions inspired by VYBE's feature set.
   Written for AFRO LIVE's existing vanilla JS + Supabase schema; no Expo/VYBE runtime copied. */
(()=>{
"use strict";
const S={saved:new Set(),blocked:new Set(),replyTo:null,dmChannel:null,dmConversation:null,dmOther:null,dmOtherLastReadAt:null,dmBadgeChannel:null,dmBadgeTimer:null,dmPendingFile:null,dmPendingType:null,dmReplyTo:null,dmMessageMap:{},dmReactions:{}};
const esc=v=>typeof escapeHTML==="function"?escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const el=id=>document.getElementById(id);
const say=(t,ok=false)=>{if(typeof message==="function")message(t,ok);};
const signed=()=>typeof currentUser!=="undefined"&&currentUser?.id;
function addStyles(){
 if(el("afroSocialStyles"))return;
 const st=document.createElement("style");st.id="afroSocialStyles";
 st.textContent=`
 #homeFeed .vitem{touch-action:pan-y}
 .afro-social-overlay{position:fixed;inset:0;z-index:2147483000;background:#09090b;color:#fff;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
 .afro-social-head{height:56px;flex:0 0 56px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid #29292e}
 .afro-social-head strong{flex:1;font-size:17px}.afro-social-close,.afro-social-back{border:0;background:#242429;color:#fff;border-radius:50%;width:38px;height:38px;padding:0;font-size:20px}
 .afro-dm-list{overflow:auto;flex:1;padding:8px 12px}.afro-dm-row{display:flex;align-items:center;gap:11px;padding:13px 5px;border-bottom:1px solid #242429;color:#fff;background:none;border-radius:0;width:100%;text-align:left}
 .afro-dm-avatar{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#29292e;display:grid;place-items:center;flex:0 0 46px;font-weight:700}
 .afro-dm-copy{min-width:0;flex:1}.afro-dm-copy b{display:block;font-size:14px}.afro-dm-copy small{display:block;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}
 .afro-dm-unread{background:#ff6a00;border-radius:99px;padding:3px 7px;font-size:11px}
 #afroDmUnreadDock{position:fixed;left:10px;right:10px;bottom:calc(62px + env(safe-area-inset-bottom));z-index:58;display:flex;gap:8px;overflow-x:auto;padding:8px 2px;scrollbar-width:none;pointer-events:auto;mask-image:linear-gradient(90deg,#000 0%,#000 94%,transparent)}
 #afroDmUnreadDock{display:none!important}
 #afroDmUnreadDock[hidden]{display:none!important}
 .afro-dock-row{flex:0 0 auto;max-width:210px;min-width:150px;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.13);border-radius:15px;background:rgba(18,18,21,.94);color:#fff;text-align:left;box-shadow:0 5px 18px #0007;backdrop-filter:blur(14px)}
 .afro-dock-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#303036;flex:0 0 34px}
 .afro-dock-copy{min-width:0;flex:1}.afro-dock-copy b{display:block;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
 .afro-dock-copy small{display:block;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#aaa;font-size:10px;margin-top:2px}
 .afro-dock-status{width:8px;height:8px;flex:0 0 8px;border-radius:50%;background:#25d366;box-shadow:0 0 7px #25d36699}
 .afro-dock-count{min-width:19px;height:19px;padding:0 5px;border-radius:20px;background:#ff7a18;color:#111;display:grid;place-items:center;font-size:10px;font-weight:900}
 body:has(#afroDmOverlay:not([hidden])) #afroDmUnreadDock{display:none!important}
 @media(min-width:700px){#afroDmUnreadDock{left:auto;right:18px;max-width:390px;bottom:calc(70px + env(safe-area-inset-bottom));flex-direction:column;align-items:flex-end}.afro-dock-row{max-width:260px;width:100%}}
 .afro-dm-search{padding:12px;border-bottom:1px solid #29292e}.afro-dm-search input,.afro-dm-compose input{margin:0;background:#202024;color:#fff;border:1px solid #34343a;border-radius:22px;padding:12px 14px}
 .afro-dm-chat{display:flex;flex-direction:column;flex:1;min-height:0}.afro-dm-messages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
 .afro-dm-bubble{max-width:82%;padding:10px 13px;border-radius:16px;background:#242429;align-self:flex-start;overflow-wrap:anywhere;font-size:14px;line-height:1.4}
 .afro-dm-bubble.mine{align-self:flex-end;background:#ff6a00;color:white}.afro-dm-bubble.text-only{background:transparent!important;padding:2px 0!important;border-radius:0!important;max-width:90%;color:#f4f4f5}.afro-dm-bubble.mine.text-only{background:transparent!important;color:#f4f4f5}.afro-dm-bubble.text-only .afro-dm-time{opacity:.55}.afro-dm-time{display:block;font-size:10px;opacity:.7;margin-top:4px}
 .afro-dm-compose{display:flex;align-items:center;gap:7px;padding:10px 9px;border-top:1px solid #29292e;background:#09090b}.afro-dm-compose input{flex:1;min-width:0}.afro-dm-compose button{flex:0 0 42px}.afro-dm-tool{background:#242429;color:#fff;border-radius:50%;width:40px!important;height:40px!important;padding:0!important}.afro-dm-tool.recording{background:#d22;color:#fff}.afro-dm-media{display:block;max-width:100%;max-height:360px;border-radius:13px;object-fit:contain}.afro-dm-audio{max-width:230px;width:100%}.afro-dm-caption{margin-top:6px}.afro-dm-ticks{color:#b9b9bf;letter-spacing:-3px;margin-left:5px;font-size:12px}.afro-dm-ticks.read{color:#45a7ff}.afro-dm-share{min-width:180px;display:grid;gap:5px}.afro-dm-share i{font-size:24px}.afro-dm-share small{opacity:.75}.afro-dm-record-status{padding:7px 14px;color:#ff9b57;font-size:12px}.afro-dm-bubble{border-radius:20px 20px 20px 5px}.afro-dm-bubble.mine{border-radius:20px 20px 5px 20px}.afro-dm-compose input{flex:1;min-width:0}.afro-dm-compose button{border-radius:50%;width:44px;height:44px;padding:0}
 .afro-dm-attachment-preview{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 14px;background:#202024;color:#fff;font-size:12px}.afro-dm-attachment-preview[hidden]{display:none}.afro-dm-attachment-preview button{border:0;border-radius:50%;width:28px;height:28px;background:#393940;color:#fff;font-size:19px}#navigation button.afro-has-unread{position:relative}#navigation button.afro-has-unread .navdot{display:flex!important;align-items:center;justify-content:center;position:absolute;top:0;right:calc(50% - 20px);min-width:19px;height:19px;padding:0 5px;border:0;border-radius:50%;background:#22c55e;color:#fff;font-size:10px;font-weight:800;line-height:1;box-shadow:0 0 0 2px var(--bg,#09090b)}.afro-dm-row-message .afro-dm-bubble{border:0!important;box-shadow:none!important;outline:0!important}.afro-dm-row-message{display:flex;flex-direction:column;align-items:flex-start;max-width:84%;margin:8px 0;position:relative}.afro-dm-row-message.mine{margin-left:auto;align-items:flex-end}.afro-dm-image-open{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;max-width:190px;max-height:230px;overflow:hidden;border-radius:12px}.afro-dm-media{display:block;max-width:190px;max-height:230px;width:auto;height:auto;object-fit:contain;border-radius:12px}.afro-dm-audio-wrap audio{max-width:210px;width:100%}.afro-dm-message-tools{display:flex;gap:7px;align-items:center}.afro-dm-message-tools{display:none!important}.afro-dm-context-backdrop{position:fixed;inset:0;z-index:2147483645;background:rgba(245,245,245,.18);backdrop-filter:blur(18px) saturate(125%);-webkit-backdrop-filter:blur(18px) saturate(125%)}.afro-dm-context-menu{position:fixed;z-index:2147483646;width:min(430px,calc(100vw - 28px));padding:10px 0;background:#fff;color:#080808;border-radius:27px;box-shadow:0 16px 48px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:0;overflow:hidden}.afro-dm-context-menu>button{display:flex;align-items:center;gap:18px;width:100%;min-height:68px;border:0;background:transparent;color:#080808;text-align:left;padding:12px 24px;font-size:clamp(16px,4.4vw,21px);font-weight:500}.afro-dm-context-menu>button:active{background:#f0f0f0}.afro-dm-context-menu>button span{width:28px;flex:0 0 28px;font-size:25px;text-align:center}.afro-dm-context-menu>button.danger{color:#ff493e}.afro-dm-context-reactions{display:flex;justify-content:space-around;align-items:center;gap:4px;padding:13px 10px 17px;border-bottom:0;margin-bottom:3px;background:#fff}.afro-dm-context-reactions button{border:0;background:transparent;font-size:clamp(27px,7vw,36px);padding:3px;line-height:1}.afro-dm-message-tools button{border:0;background:transparent;color:#aaa;padding:3px 6px}.afro-dm-reaction-picker{display:flex;gap:4px;padding:5px;background:#333;border-radius:20px}.afro-dm-reaction-picker[hidden]{display:none}.afro-dm-reaction-picker button{border:0;background:transparent;font-size:20px}.afro-dm-reaction{font-size:16px}.afro-dm-reply-preview{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background:#202024;border-left:3px solid #ff8a24;color:#ddd;font-size:12px}.afro-dm-reply-preview button{border:0;background:transparent;color:#fff;font-size:18px}.afro-dm-quoted{font-size:12px;border-left:3px solid #ff8a24;padding:4px 7px;margin-bottom:6px;background:#0002}.afro-dm-attachment-preview{background:transparent!important;border:0!important}.afro-dm-attachment-preview img{width:52px;height:52px;object-fit:cover;border-radius:8px}.afro-dm-reply-preview{padding:7px 12px;background:#222;border-left:3px solid #ff8a24;color:#ddd;font-size:12px}.afro-dm-image-modal{position:fixed;inset:0;z-index:99999;background:#050505f5;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px}.afro-dm-image-modal[hidden]{display:none}.afro-dm-image-modal>img{max-width:96vw;max-height:78vh;width:auto;height:auto;object-fit:contain}.afro-dm-modal-close{position:absolute;top:20px;right:18px;border:0;border-radius:50%;background:#333;color:#fff;width:42px;height:42px;font-size:25px}.afro-dm-image-actions{display:flex;gap:12px;margin-top:16px}.afro-dm-image-actions a,.afro-dm-image-actions button{border:0;border-radius:20px;background:#28282c;color:#fff;padding:10px 14px;text-decoration:none}.afro-social-empty{color:#999;text-align:center;padding:35px 18px;font-size:14px}
 .afro-comment-actions{display:flex;align-items:center;gap:14px;margin-top:7px}.afro-comment-actions button{padding:2px 0;background:none;color:#aaa;font-size:11px;font-weight:500}.afro-comment-actions button.liked{color:#ff526b}
 .afro-comment-reply{margin:8px 0 0 34px;padding-left:10px;border-left:2px solid #38383e}.afro-comment-row{display:flex;gap:9px;padding:10px 0}.afro-comment-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;font-size:13px;overflow-wrap:anywhere}.afro-comment-text b{font-size:12px}.afro-comment-text small{color:#888;font-size:10px}
 .afro-replying{display:none;padding:6px 12px;color:#ffb47c;font-size:12px}.afro-replying.on{display:block}
 .afro-social-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid #3b3b42;border-radius:20px;padding:8px 11px;background:#202024;color:#fff;font-size:12px}
 #afroDmOverlay[hidden],#afroSavedOverlay[hidden]{display:none!important}
 `;
 document.head.appendChild(st);
}
function avatar(p){const u=p?.avatar_url;return u?'<img class="afro-dm-avatar" src="'+esc(u)+'" alt="">':'<span class="afro-dm-avatar">'+esc((p?.display_name||p?.username||"?").slice(0,1).toUpperCase())+'</span>';}
function ensureOverlays(){
 if(!el("afroDmOverlay")){
  const wrap=document.createElement("section");wrap.id="afroDmOverlay";wrap.className="afro-social-overlay";wrap.hidden=true;
  wrap.innerHTML='<div class="afro-social-head"><button class="afro-social-close" data-dm-close aria-label="Retour">‹</button><strong id="afroDmTitle">Messages</strong><button class="afro-social-close" id="afroDmDeleteConversation" data-dm-delete-conversation aria-label="Supprimer toute la conversation" hidden>🗑</button><button class="afro-social-close" data-dm-new aria-label="Nouveau message">＋</button></div><div id="afroDmSearch" class="afro-dm-search" hidden><input id="afroDmSearchInput" type="search" placeholder="Rechercher un utilisateur"></div><div id="afroDmBody" class="afro-dm-list"><div class="afro-social-empty">Chargement...</div></div>';
  document.body.appendChild(wrap);
 }
 if(!el("afroSavedOverlay")){
  const wrap=document.createElement("section");wrap.id="afroSavedOverlay";wrap.className="afro-social-overlay";wrap.hidden=true;
  wrap.innerHTML='<div class="afro-social-head"><button class="afro-social-close" data-saved-close>‹</button><strong>Publications enregistrées</strong><span></span></div><div id="afroSavedBody" class="afro-dm-list"></div>';
  document.body.appendChild(wrap);
 }
 if(!el("afroReportsOverlay")){
  const wrap=document.createElement("section");wrap.id="afroReportsOverlay";wrap.className="afro-social-overlay";wrap.hidden=true;
  wrap.innerHTML='<div class="afro-social-head"><button class="afro-social-close" data-reports-close>‹</button><strong>Signalements</strong><span></span></div><div id="afroReportsBody" class="afro-dm-list"></div>';
  document.body.appendChild(wrap);
 }
}
function addAdminModeration(){
 if(currentProfile?.role!=="admin")return;
 const host=el("admin");if(!host||el("afroOpenReports"))return;
 const b=document.createElement("button");b.id="afroOpenReports";b.type="button";b.className="soft";b.style.cssText="width:100%;margin:10px 0";b.innerHTML='<i class="ti ti-shield-check"></i> Modération · Signalements';
 b.addEventListener("click",openReports);host.prepend(b);
}
async function openReports(){
 if(currentProfile?.role!=="admin")return;
 ensureOverlays();addStyles();el("afroReportsOverlay").hidden=false;
 const box=el("afroReportsBody");box.innerHTML='<div class="afro-social-empty">Chargement...</div>';
 const {data,error}=await db.from("social_reports").select("*").order("created_at",{ascending:false}).limit(100);
 if(error){box.innerHTML='<div class="afro-social-empty">'+esc(error.message)+'</div>';return;}
 if(!data?.length){box.innerHTML='<div class="afro-social-empty">Aucun signalement pour le moment.</div>';return;}
 const ids=[...new Set(data.flatMap(r=>[r.reporter_id,r.reported_user_id].filter(Boolean)))];
 const {data:profiles}=await db.from("profiles").select("id,username,display_name").in("id",ids);
 const pm={};(profiles||[]).forEach(p=>pm[p.id]=p);
 box.innerHTML=data.map(r=>{
  const reporter=pm[r.reporter_id]?.username||"membre";
  const target=r.reported_user_id?(pm[r.reported_user_id]?.username||"compte"):r.post_id?"publication":"commentaire";
  return '<article class="afro-dm-row" style="display:block"><b>'+esc(r.reason)+' · '+esc(r.status)+'</b><p style="margin:5px 0;color:#bbb;font-size:12px">Par @'+esc(reporter)+' · Cible : '+esc(target)+' · '+new Date(r.created_at).toLocaleString("fr-FR")+'</p><p style="margin:5px 0;font-size:13px">'+esc(r.details||"Aucun détail")+'</p><div style="display:flex;gap:8px;margin-top:8px"><button class="soft" data-report-status="reviewed" data-report-id="'+esc(r.id)+'">Marquer examiné</button><button class="danger" data-report-status="actioned" data-report-id="'+esc(r.id)+'">Action prise</button></div></article>';
 }).join("");
}
async function setReportStatus(id,status){
 if(currentProfile?.role!=="admin")return;
 const {error}=await db.from("social_reports").update({status}).eq("id",id);
 if(error){say(error.message);return;}
 await openReports();say("Signalement mis à jour.",true);
}
function addMenuOptions(){
 const sheet=document.querySelector("#menuSheet .sheet");if(!sheet||sheet.querySelector("[data-afro-menu]"))return;
 const anchor=sheet.querySelector(".sheet-grab");
 const box=document.createElement("div");box.dataset.afroMenu="1";
 box.innerHTML='<button class="sheet-opt" type="button" data-afro-open-dm><i class="ti ti-message-circle"></i><span>Messages privés<small>Discuter avec les membres</small></span></button><button class="sheet-opt" type="button" data-afro-open-saved><i class="ti ti-bookmark"></i><span>Publications enregistrées</span></button>';
 anchor?.after(box);
}
async function openDM(){
 if(el("afroDmDeleteConversation"))el("afroDmDeleteConversation").hidden=true;
 if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return;}
 ensureOverlays();addStyles();
 el("afroDmOverlay").hidden=false;el("afroDmSearch").hidden=true;el("afroDmTitle").textContent="Messages";
 el("afroDmBody").className="afro-dm-list";el("afroDmBody").innerHTML='<div class="afro-social-empty">Chargement des conversations...</div>';
 await renderInbox();
}
function closeDM(){
 if(el("afroDmOverlay"))el("afroDmOverlay").hidden=true;
 if(S.dmChannel){db.removeChannel(S.dmChannel);S.dmChannel=null;}
 S.dmConversation=null;S.dmOther=null;
 refreshDMUnread();
}
async function renderInbox(){
 const body=el("afroDmBody");if(!body||!signed())return;
 const {data,error}=await db.from("afro_my_conversations").select("*").order("last_message_at",{ascending:false}).limit(80);
 if(error){body.innerHTML='<div class="afro-social-empty">La messagerie n’est pas disponible : '+esc(error.message)+'</div>';return;}
 if(!data?.length){body.innerHTML='<div class="afro-social-empty">Aucune conversation pour le moment.<br>Appuie sur ＋ pour écrire à quelqu’un.</div>';return;}
 body.innerHTML=data.map(c=>'<button class="afro-dm-row" data-dm-conversation="'+esc(c.id)+'" data-dm-other="'+esc(c.other_id)+'" data-dm-name="'+esc(c.other_display_name||c.other_username)+'">'+avatar({avatar_url:c.other_avatar_url,username:c.other_username,display_name:c.other_display_name})+'<span class="afro-dm-copy"><b>'+esc(c.other_display_name||c.other_username||"Membre")+' · @'+esc(c.other_username||"")+'</b><small>'+esc(c.last_message_preview||"Démarrer la conversation")+'</small></span>'+(Number(c.unread_count)>0?'<span class="afro-dm-unread">'+Number(c.unread_count)+'</span>':'')+'</button>').join("");
}
function showNewDM(){
 el("afroDmSearch").hidden=false;el("afroDmTitle").textContent="Nouveau message";
 el("afroDmBody").className="afro-dm-list";el("afroDmBody").innerHTML='<div class="afro-social-empty">Recherche un pseudo ou un nom.</div>';
 el("afroDmSearchInput").value="";el("afroDmSearchInput").focus();
}
let searchTimer=null;
async function searchDMUsers(){
 const q=el("afroDmSearchInput")?.value.trim().replace(/[(),%_]/g,"").slice(0,32)||"";
 const body=el("afroDmBody");if(!q){body.innerHTML='<div class="afro-social-empty">Recherche un pseudo ou un nom.</div>';return;}
 const {data,error}=await db.from("profiles").select("id,username,display_name,avatar_url").neq("id",currentUser.id).or("username.ilike.%"+q+"%,display_name.ilike.%"+q+"%").limit(20);
 if(error){body.innerHTML='<div class="afro-social-empty">Recherche impossible.</div>';return;}
 if(!data?.length){body.innerHTML='<div class="afro-social-empty">Aucun membre trouvé.</div>';return;}
 body.innerHTML=data.map(p=>'<button class="afro-dm-row" data-dm-start="'+esc(p.id)+'" data-dm-name="'+esc(p.display_name||p.username)+'">'+avatar(p)+'<span class="afro-dm-copy"><b>'+esc(p.display_name||p.username)+'</b><small>@'+esc(p.username)+'</small></span></button>').join("");
}
async function startDM(userId,name){
 const {data,error}=await db.rpc("afro_start_conversation",{p_other:userId});
 if(error){say(error.message);return;}
 el("afroDmSearch").hidden=true;
 await openConversation(data,userId,name);
}
async function openConversation(conversationId,otherId,name){
 if(el("afroDmDeleteConversation"))el("afroDmDeleteConversation").hidden=false;
 if(S.dmChannel){db.removeChannel(S.dmChannel);S.dmChannel=null;}
 S.dmConversation=conversationId;S.dmOther=otherId;
 const receipt=await db.from("afro_my_conversations").select("other_last_read_at").eq("id",conversationId).maybeSingle();S.dmOtherLastReadAt=receipt.data?.other_last_read_at||null;
 el("afroDmTitle").textContent=name||"Conversation";
 el("afroDmSearch").hidden=true;
 const body=el("afroDmBody");body.className="afro-dm-chat";
 body.innerHTML='<div id="afroDmMessages" class="afro-dm-messages"><div class="afro-social-empty">Chargement...</div></div><div id="afroDmAttachmentPreview" class="afro-dm-attachment-preview" hidden></div><form id="afroDmForm" class="afro-dm-compose"><input id="afroDmFile" type="file" accept="image/*,video/*" hidden><button type="button" class="afro-dm-tool" data-dm-photo aria-label="Photo ou vidéo"><i class="ti ti-photo"></i></button><input id="afroDmInput" maxlength="2000" placeholder="Message..." autocomplete="off"><button type="button" class="afro-dm-tool" data-dm-record aria-label="Note vocale"><i class="ti ti-microphone"></i></button><button type="submit" aria-label="Envoyer"><i class="ti ti-send"></i></button></form><div id="afroDmRecordStatus" class="afro-dm-record-status" hidden></div>';
 await loadDMMessages();
 await db.rpc("afro_mark_conversation_read",{p_conversation:conversationId});
 S.dmChannel=db.channel("afro-dm-"+conversationId).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:"conversation_id=eq."+conversationId},async payload=>{
  if(payload.new?.sender_id!==currentUser.id){await loadDMMessages();await db.rpc("afro_mark_conversation_read",{p_conversation:conversationId});}
  await refreshDMUnread();
 }).on("postgres_changes",{event:"UPDATE",schema:"public",table:"direct_messages",filter:"conversation_id=eq."+conversationId},loadDMMessages).on("postgres_changes",{event:"DELETE",schema:"public",table:"direct_messages"},async payload=>{if(payload.old?.conversation_id!==conversationId)return;const check=await db.from("afro_my_conversations").select("id").eq("id",conversationId).maybeSingle();if(!check.data&&S.dmConversation===conversationId){if(S.dmChannel){db.removeChannel(S.dmChannel);S.dmChannel=null;}S.dmConversation=null;S.dmOther=null;if(el("afroDmDeleteConversation"))el("afroDmDeleteConversation").hidden=true;el("afroDmTitle").textContent="Messages";el("afroDmBody").className="afro-dm-list";await renderInbox();}else await loadDMMessages();await refreshDMUnread();}).subscribe();
}
function dmPublicUrl(path){return db.storage.from("creator-media").getPublicUrl(path).data.publicUrl;}
function renderDMMessage(m){
 const mine=m.sender_id===currentUser.id;
 let content="";
 const url=m.media_path?dmPublicUrl(m.media_path):"";
 if(m.message_type==="image")content='<button class="afro-dm-image-open" data-dm-image="'+esc(m.id)+'"><img class="afro-dm-media" src="'+esc(url)+'" alt="Photo" loading="lazy"></button>';
 else if(m.message_type==="video")content='<video class="afro-dm-media" src="'+esc(url)+'" controls playsinline preload="metadata"></video>';
 else if(m.message_type==="audio")content='<div class="afro-dm-audio-wrap">🎤 <audio controls preload="metadata" src="'+esc(url)+'"></audio></div>';
 else if(m.message_type==="post")content='<div class="afro-dm-share"><b>Publication partagée</b></div>';
 else if(m.message_type==="live")content='<div class="afro-dm-share"><b>Direct partagé</b></div>';
 else content=esc(m.body||"");
 const parent=m.reply_to_id?S.dmMessageMap?.[m.reply_to_id]:null;
 const quote=parent?'<div class="afro-dm-quoted">↪ '+esc(parent.body|| (parent.message_type==="image"?"Photo":parent.message_type==="audio"?"Note vocale":"Message"))+'</div>':"";
 const isText=m.message_type==="text",bubbleOverride=localStorage.getItem("afroDmBubbleStyle:"+m.id),textOnly=bubbleOverride?bubbleOverride==="text":isText;
 const read=mine&&S.dmOtherLastReadAt&&new Date(S.dmOtherLastReadAt)>=new Date(m.created_at);
 const ticks=mine?'<span class="afro-dm-ticks'+(read?" read":"")+'>✓✓</span>':"";
 const reactions=(S.dmReactions?.[m.id]||[]).map(x=>'<span class="afro-dm-reaction">'+esc(x.emoji)+'</span>').join("");
 return '<div class="afro-dm-row-message'+(mine?" mine":"") +'" data-dm-message="'+esc(m.id)+'"><div class="afro-dm-bubble'+(mine?" mine":"")+(textOnly?" text-only":"") +'">'+quote+content+(m.body&&["image","video","audio"].includes(m.message_type)?'<div class="afro-dm-caption">'+esc(m.body)+'</div>':"")+'<small class="afro-dm-time">'+new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+(m.edited_at?" · modifié":"")+" "+ticks+'</small></div><div class="afro-dm-reactions-inline">'+reactions+'</div></div>';
}
async function loadDMMessages(){
 const box=el("afroDmMessages");if(!box||!S.dmConversation)return;
 const {data:all,error}=await db.from("direct_messages").select("id,sender_id,body,shared_post_id,shared_live_session_id,message_type,media_path,media_mime,duration_seconds,reply_to_id,created_at,edited_at").eq("conversation_id",S.dmConversation).order("created_at",{ascending:true}).limit(250);
 if(error){box.innerHTML='<div class="afro-social-empty">'+esc(error.message)+'</div>';return;}
 const {data:hidden,error:hiddenError}=await db.from("direct_message_hidden_for_user").select("message_id").eq("user_id",currentUser.id);
 if(hiddenError){box.innerHTML='<div class="afro-social-empty">Impossible de charger les messages masqués : '+esc(hiddenError.message)+'</div>';return;}
 const hiddenIds=new Set((hidden||[]).map(x=>x.message_id)),data=(all||[]).filter(m=>!hiddenIds.has(m.id));
 S.dmMessageMap=Object.fromEntries(data.map(m=>[m.id,m]));S.dmReactions={};
 const ids=data.map(m=>m.id);if(ids.length){const rr=await db.from("direct_message_reactions").select("message_id,user_id,emoji").in("message_id",ids);if(!rr.error)(rr.data||[]).forEach(x=>(S.dmReactions[x.message_id]??=[]).push(x));}
 box.innerHTML=data.map(renderDMMessage).join("")||'<div class="afro-social-empty">Démarre la conversation.</div>';box.scrollTop=box.scrollHeight;
}
async function uploadDMFile(file,type,caption=""){
 if(!file||!S.dmConversation||!signed())return false;
 const status=el("afroDmRecordStatus");if(status){status.hidden=false;status.textContent="Envoi en cours…";}
 const ext=(file.type.split("/")[1]||file.name.split(".").pop()||"bin").split(";")[0].replace(/[^a-z0-9]/gi,"").slice(0,8)||"bin";
 const path=currentUser.id+"/dm/"+S.dmConversation+"/"+Date.now()+"."+ext;
 try{
  const {error}=await db.storage.from("creator-media").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});
  if(error)throw error;
  const {error:insertError}=await db.from("direct_messages").insert({conversation_id:S.dmConversation,sender_id:currentUser.id,message_type:type,media_path:path,media_mime:file.type||null,body:caption||""});
  if(insertError)throw insertError;
  if(status){status.textContent="Envoyé";setTimeout(()=>{if(status)status.hidden=true;},1200);}
  await loadDMMessages();await refreshDMUnread();return true;
 }catch(error){
  if(status){status.hidden=false;status.textContent="Échec : "+(error.message||"envoi impossible");}
  say("Impossible d’envoyer le fichier : "+(error.message||"vérifie ta connexion et réessaie."));
  return false;
 }
}
function showDMPendingFile(file,type){
 S.dmPendingFile=file;S.dmPendingType=type;
 const p=el("afroDmAttachmentPreview");if(!p)return;
 p.hidden=false;
 p.innerHTML=(type==="image"?'<img src="'+URL.createObjectURL(file)+'" alt="Aperçu">':'<span>🎬</span>')+'<span>Prêt à envoyer</span><button type="button" data-dm-cancel-file aria-label="Retirer">×</button>';
}
async function toggleDMRecording(){
 const status=el("afroDmRecordStatus");
 if(dmRecorder?.state==="recording"){dmRecorder.requestData?.();dmRecorder.stop();return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say("Les notes vocales ne sont pas prises en charge sur cet appareil.");return;}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  dmChunks=[];const mime=["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(t=>MediaRecorder.isTypeSupported?.(t));
  dmRecorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
  dmRecorder.ondataavailable=e=>{if(e.data.size)dmChunks.push(e.data);};
  dmRecorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());if(status){status.hidden=false;status.textContent="Erreur pendant l’enregistrement";}};
  dmRecorder.onstop=async()=>{
   stream.getTracks().forEach(t=>t.stop());
   const blob=new Blob(dmChunks,{type:dmRecorder.mimeType||"audio/mp4"});
   const ext=blob.type.includes("mp4")?"m4a":"webm";
   await uploadDMFile(new File([blob],"note-vocale."+ext,{type:blob.type}),"audio");
   if(status)status.hidden=true;
   document.querySelector("[data-dm-record]")?.classList.remove("recording");
  };
  dmRecorder.start(250);if(status){status.textContent="Enregistrement… touche le micro pour terminer";status.hidden=false;}
  document.querySelector("[data-dm-record]")?.classList.add("recording");
 }catch(error){if(status){status.hidden=false;status.textContent="Micro indisponible : "+(error.message||"autorisation requise");}say("Impossible de démarrer le micro : "+(error.message||"vérifie les autorisations"));}
}
async function sendDM(e){
 e.preventDefault();if(!S.dmConversation)return;
 const input=el("afroDmInput"),body=input?.value.trim()||"";
 if(S.dmPendingFile){
  const file=S.dmPendingFile,type=S.dmPendingType;
  const ok=await uploadDMFile(file,type,body);
  if(ok){S.dmPendingFile=null;S.dmPendingType=null;if(input)input.value="";const p=el("afroDmAttachmentPreview");if(p){p.hidden=true;p.innerHTML="";}}
  return;
 }
 if(!body)return;
 input.disabled=true;
 const {error}=await db.from("direct_messages").insert({conversation_id:S.dmConversation,sender_id:currentUser.id,body,message_type:"text",reply_to_id:S.dmReplyTo||null});
 input.disabled=false;
 if(error){say("Message non envoyé : "+error.message);return;}
 input.value="";S.dmReplyTo=null;el("afroDmReplyPreview")?.remove();await loadDMMessages();await refreshDMUnread();await appendDMInboxToMessagesPage();
}
function ensureDMUnreadDock(){
 if(el("afroDmUnreadDock"))return el("afroDmUnreadDock");
 const dock=document.createElement("div");dock.id="afroDmUnreadDock";dock.hidden=true;dock.setAttribute("aria-label","Conversations avec messages non lus");document.body.appendChild(dock);return dock;
}
async function refreshDMUnread(){
 if(!signed())return;
 const {data,error}=await db.from("afro_my_conversations").select("*").order("last_message_at",{ascending:false}).limit(80);
 if(error){console.error("[AFRO LIVE] compteur messages: lecture de afro_my_conversations impossible",error);return;}
 const rows=data||[],count=rows.reduce((n,c)=>n+Number(c.unread_count||0),0);
 const nav=document.querySelector('#navigation button[data-page="notifs"] .navdot');
 if(nav){nav.hidden=count===0;nav.textContent=count>99?"99+":String(count);nav.classList.toggle("has-count",count>0);nav.setAttribute("aria-label",count?count+" messages non lus":"Messages");const button=nav.closest("button");if(button)button.classList.toggle("afro-has-unread",count>0);}
 const title=document.querySelector('#navigation button[data-page="notifs"] span');if(title)title.textContent="Messages";
 const dock=ensureDMUnreadDock(),unread=rows.filter(c=>Number(c.unread_count)>0).slice(0,8);
 dock.innerHTML=unread.map(c=>'<button type="button" class="afro-dock-row" data-dm-conversation="'+esc(c.id)+'" data-dm-other="'+esc(c.other_id)+'" data-dm-name="'+esc(c.other_display_name||c.other_username||"Membre")+'">'+(c.other_avatar_url?'<img class="afro-dock-avatar" src="'+esc(c.other_avatar_url)+'" alt="">':'<span class="afro-dock-avatar" style="display:grid;place-items:center">'+esc((c.other_display_name||c.other_username||"?").slice(0,1).toUpperCase())+'</span>')+'<span class="afro-dock-copy"><b>'+esc(c.other_display_name||c.other_username||"Membre")+'</b><small>'+esc(c.last_message_preview||"Nouveau message")+'</small></span><i class="afro-dock-status" aria-label="Non lu"></i><span class="afro-dock-count">'+Number(c.unread_count)+'</span></button>').join("");
 dock.hidden=!unread.length||!!el("afroDmOverlay")&&!el("afroDmOverlay").hidden;
}
function subscribeDMNotifications(){
 if(!signed()||S.dmBadgeChannel)return;
 S.dmBadgeChannel=db.channel("afro-dm-badge-"+currentUser.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages"},async payload=>{
  await refreshDMUnread();
  if(!el("afroDmOverlay")?.hidden&&!S.dmConversation)await renderInbox();
  if(el("notifsPage")&&!el("notifsPage").classList.contains("hidden"))await appendDMInboxToMessagesPage();
  if(payload.new?.sender_id!==currentUser.id&&S.dmConversation&&payload.new?.conversation_id===S.dmConversation){
   await loadDMMessages();
   await db.rpc("afro_mark_conversation_read",{p_conversation:S.dmConversation});
   await refreshDMUnread();
   if(el("notifsPage")&&!el("notifsPage").classList.contains("hidden"))await appendDMInboxToMessagesPage();
  }
 }).subscribe((status,error)=>{if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){console.error("[AFRO LIVE] temps réel messagerie:",status,error||"");S.dmBadgeChannel=null;}});
}
async function openDMSharePicker(kind,id){
 if(!signed())return;
 S.dmShare={kind,id};await openDM();
 const box=el("afroDmBody");if(!box)return;
 const note=document.createElement("p");note.className="afro-social-empty";note.textContent="Choisis la conversation où partager "+(kind==="live"?"ce direct":"cette publication")+".";
 box.prepend(note);
 box.querySelectorAll("[data-dm-conversation]").forEach(row=>{
  row.dataset.dmShareKind=kind;row.dataset.dmShareId=id;
  row.insertAdjacentHTML("beforeend",'<span class="afro-dm-share-action">Partager</span>');
 });
}
async function sendDMShare(conversationId,kind,id){
 const payload={conversation_id:conversationId,sender_id:currentUser.id,body:"",message_type:kind,shared_post_id:kind==="post"?id:null,shared_live_session_id:kind==="live"?id:null};
 const {error}=await db.from("direct_messages").insert(payload);
 if(error){say("Partage impossible : "+error.message);return;}
 S.dmShare=null;await openConversation(conversationId,null,"Conversation");await refreshDMUnread();
}
window.afroShareLiveToDM=id=>openDMSharePicker("live",id);
function setDMReply(id){const m=S.dmMessageMap?.[id];if(!m)return;S.dmReplyTo=id;let p=el("afroDmReplyPreview");if(!p){p=document.createElement("div");p.id="afroDmReplyPreview";el("afroDmForm")?.before(p);}p.className="afro-dm-reply-preview";p.innerHTML='Réponse à : '+esc(m.body||(m.message_type==="image"?"Photo":m.message_type==="audio"?"Note vocale":"Message"))+' <button data-dm-cancel-reply>×</button>';el("afroDmInput")?.focus();}
async function reactDMMessage(id,emoji){const old=(S.dmReactions?.[id]||[]).find(x=>x.user_id===currentUser.id);if(old){const d=await db.from("direct_message_reactions").delete().eq("message_id",id).eq("user_id",currentUser.id);if(d.error){say("Réaction impossible : "+d.error.message);return;}if(old.emoji===emoji){await loadDMMessages();return;}}const {error}=await db.from("direct_message_reactions").insert({message_id:id,conversation_id:S.dmConversation,user_id:currentUser.id,emoji});if(error){say("Réaction impossible : "+error.message);return;}await loadDMMessages();}
function openDMImage(id){const m=S.dmMessageMap?.[id];if(!m?.media_path)return;const url=dmPublicUrl(m.media_path);let modal=el("afroDmImageModal");if(!modal){modal=document.createElement("div");modal.id="afroDmImageModal";modal.className="afro-dm-image-modal";document.body.appendChild(modal);}modal.innerHTML='<button class="afro-dm-modal-close" data-dm-image-close>×</button><img src="'+esc(url)+'" alt="Photo originale"><div class="afro-dm-image-actions"><a href="'+esc(url)+'" download="afro-live-photo">Télécharger</a><button data-dm-image-share="'+esc(id)+'">Partager</button>'+(m.sender_id===currentUser.id?'<button data-dm-image-delete="'+esc(id)+'">Supprimer</button>':"") +'</div>';modal.hidden=false;}
async function shareDMImage(id){const m=S.dmMessageMap?.[id];if(!m?.media_path)return;const url=dmPublicUrl(m.media_path);try{if(navigator.share){const response=await fetch(url);const blob=await response.blob();const file=new File([blob],"afro-live-photo",{type:blob.type});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file]});else await navigator.share({url});}else{await navigator.clipboard.writeText(url);say("Lien de la photo copié.");}}catch(e){if(e.name!=="AbortError")say("Partage indisponible.");}}
async function editDMMessage(id){
 const m=S.dmMessageMap?.[id];
 if(!m||m.sender_id!==currentUser.id||m.message_type!=="text")return;
 const next=prompt("Modifier ton message :",m.body||"");
 if(next===null)return;
 if(!next.trim()||next.length>2000){say("Le message doit contenir entre 1 et 2000 caractères.");return;}
 const {error}=await db.rpc("afro_edit_direct_message",{p_message:id,p_body:next.trim()});
 if(error){say("Modification impossible : "+error.message);return;}
 await loadDMMessages();await refreshDMUnread();await appendDMInboxToMessagesPage();say("Message modifié.",true);
}
async function deleteDMMessage(id){
 const m=S.dmMessageMap?.[id];
 if(!m||m.sender_id!==currentUser.id||!confirm("Supprimer ce message pour toi et l’autre personne ?"))return;
 const {error}=await db.rpc("afro_delete_direct_message_for_all",{p_message:id});
 if(error){say("Suppression impossible : "+error.message);return;}
 if(m.media_path)await db.storage.from("creator-media").remove([m.media_path]);
 if(el("afroDmImageModal"))el("afroDmImageModal").hidden=true;
 await loadDMMessages();await refreshDMUnread();await appendDMInboxToMessagesPage();say("Message supprimé chez les deux personnes.",true);
}
async function deleteDMConversation(){
 const id=S.dmConversation;
 if(!id)return;
 if(!confirm("Supprimer définitivement cette conversation et tous ses messages chez toi et chez l’autre personne ?"))return;
 const {error}=await db.rpc("afro_delete_conversation_for_all",{p_conversation:id});
 if(error){say("Suppression impossible : "+error.message);return;}
 if(S.dmChannel){db.removeChannel(S.dmChannel);S.dmChannel=null;}
 S.dmConversation=null;S.dmOther=null;
 if(el("afroDmDeleteConversation"))el("afroDmDeleteConversation").hidden=true;
 el("afroDmTitle").textContent="Messages";el("afroDmBody").className="afro-dm-list";
 await renderInbox();await refreshDMUnread();await appendDMInboxToMessagesPage();say("Conversation supprimée chez les deux personnes.",true);
}
async 
function hideDMContextMenu(){el("afroDmContextBackdrop")?.remove();el("afroDmContextMenu")?.remove();}
function showDMContextMenu(id,x,y){
 const m=S.dmMessageMap?.[id];if(!m)return;hideDMContextMenu();
 const mine=m.sender_id===currentUser.id,back=document.createElement("div");back.id="afroDmContextBackdrop";back.className="afro-dm-context-backdrop";back.addEventListener("click",hideDMContextMenu);document.body.appendChild(back);
 const menu=document.createElement("div");menu.id="afroDmContextMenu";menu.className="afro-dm-context-menu";
 menu.innerHTML='<div class="afro-dm-context-reactions">'+["❤️","😂","😭","👍","😡","🤔","😮"].map(e=>'<button data-dm-context-emoji="'+e+'" data-dm-context-id="'+esc(id)+'">'+e+'</button>').join("")+'</div><button data-dm-context-reply="'+esc(id)+'"><span>↶</span> Répondre</button><button data-dm-context-forward="'+esc(id)+'"><span>➦</span> Transférer</button><button data-dm-context-copy="'+esc(id)+'"><span>▢</span> Copier</button><button data-dm-context-translate="'+esc(id)+'"><span>文A</span> Traduire</button><button data-dm-context-style="'+esc(id)+'"><span>◉</span> Style de bulle</button><button data-dm-context-hide="'+esc(id)+'"><span>♜</span> Supprimer pour moi</button>'+(mine?'<button class="danger" data-dm-context-delete="'+esc(id)+'"><span>⟲</span> Retirer le message</button>':"")+(mine&&m.message_type==="text"?'<button data-dm-context-edit="'+esc(id)+'"><span>✎</span> Modifier</button>':"");
 document.body.appendChild(menu);
 const w=Math.min(430,window.innerWidth-28),left=Math.max(14,Math.min(x-w/2,window.innerWidth-w-14));
 menu.style.left=left+"px";menu.style.top=Math.max(16,Math.min(y-30,window.innerHeight-menu.offsetHeight-18))+"px";
}
async function hideDMMessageForMe(id){
 const m=S.dmMessageMap?.[id];if(!m)return;
 if(!confirm("Supprimer ce message uniquement de ta messagerie ? L’autre personne le conservera."))return;
 const {error}=await db.from("direct_message_hidden_for_user").upsert({user_id:currentUser.id,message_id:id},{onConflict:"user_id,message_id"});
 if(error){say("Suppression pour moi impossible : "+error.message);return;}
 await loadDMMessages();await refreshDMUnread();say("Message supprimé uniquement chez toi.",true);
}
async function forwardDMMessage(id){
 const m=S.dmMessageMap?.[id];if(!m)return;
 const payload=m.message_type==="text"?(m.body||""):(m.body||({image:"[Photo]",video:"[Vidéo]",audio:"[Note vocale]",post:"[Publication]",live:"[Direct]"}[m.message_type]||"[Message]"));
 if(navigator.share){try{await navigator.share({title:"AFRO LIVE",text:payload});}catch(e){if(e.name!=="AbortError")say("Transfert impossible.");}}
 else{try{await navigator.clipboard.writeText(payload);say("Contenu copié pour le transférer.",true);}catch(_){say("Transfert impossible sur cet appareil.");}}
}
function toggleDMBubbleStyle(id){
 const m=S.dmMessageMap?.[id],row=document.querySelector('[data-dm-message="'+CSS.escape(id)+'"] .afro-dm-bubble');if(!m||!row)return;
 const textOnly=!row.classList.contains("text-only");row.classList.toggle("text-only",textOnly);localStorage.setItem("afroDmBubbleStyle:"+id,textOnly?"text":"bubble");say("Style de bulle enregistré sur cet appareil.",true);
}
async function copyDMMessage(id){const m=S.dmMessageMap?.[id];if(!m)return;try{await navigator.clipboard.writeText(m.body||"");say("Message copié.",true);}catch(_){say("Copie impossible sur cet appareil.");}}

async function deleteDMImage(id){await deleteDMMessage(id);}
async function refreshSaved(){
 if(!signed())return;
 const {data,error}=await db.from("post_saves").select("post_id").eq("user_id",currentUser.id).limit(500);
 if(error)return;
 S.saved=new Set((data||[]).map(x=>x.post_id));
 document.querySelectorAll('[data-action="afro-save"]').forEach(b=>paintSave(b));
}
function paintSave(btn){const yes=S.saved.has(btn.dataset.post);btn.classList.toggle("on",yes);btn.innerHTML='<i class="ti '+(yes?"ti-bookmark-filled":"ti-bookmark")+'"></i><span class="vcount">'+(yes?"Enregistré":"Enregistrer")+'</span>';}
async function toggleSave(btn){
 if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return;}
 const id=btn.dataset.post;if(!id)return;btn.disabled=true;
 const was=S.saved.has(id);
 const res=was?await db.from("post_saves").delete().eq("user_id",currentUser.id).eq("post_id",id):await db.from("post_saves").insert({user_id:currentUser.id,post_id:id});
 btn.disabled=false;
 if(res.error){say(res.error.message);return;}
 was?S.saved.delete(id):S.saved.add(id);paintSave(btn);
}
async function openSaved(){
 if(!signed())return;
 ensureOverlays();addStyles();el("afroSavedOverlay").hidden=false;
 const box=el("afroSavedBody");box.innerHTML='<div class="afro-social-empty">Chargement...</div>';
 const {data,error}=await db.from("post_saves").select("post_id,created_at").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(100);
 if(error){box.innerHTML='<div class="afro-social-empty">'+esc(error.message)+'</div>';return;}
 if(!data?.length){box.innerHTML='<div class="afro-social-empty">Tu n’as encore rien enregistré.</div>';return;}
 const ids=data.map(x=>x.post_id);
 const {data:posts}=await db.from("posts").select("id,creator_id,kind,media_path,caption,created_at").in("id",ids);
 const ownerIds=[...new Set((posts||[]).map(p=>p.creator_id))];
 const prof=ownerIds.length?(await db.from("profiles").select("id,username,display_name").in("id",ownerIds)).data||[]:[];
 const pm={};prof.forEach(p=>pm[p.id]=p);
 const map={};(posts||[]).forEach(p=>map[p.id]=p);
 const ordered=ids.map(id=>map[id]).filter(Boolean).map(p=>({...p,username:pm[p.creator_id]?.username||"membre",display_name:pm[p.creator_id]?.display_name||"",creator_id:p.creator_id}));
 feedSources.afroSaved=ordered;
 box.innerHTML=ordered.map((p,i)=>'<button class="afro-dm-row" data-afro-saved-open="'+i+'"><span class="afro-dm-avatar"><i class="ti '+(p.kind==="video"?"ti-player-play":"ti-photo")+'"></i></span><span class="afro-dm-copy"><b>@'+esc(p.username)+'</b><small>'+esc(p.caption||"Publication")+'</small></span></button>').join("");
}
async function loadBlocked(){
 if(!signed())return;
 const {data}=await db.from("user_blocks").select("blocked_id").eq("blocker_id",currentUser.id);
 S.blocked=new Set((data||[]).map(x=>x.blocked_id));
}
async function blockProfile(id,name){
 if(!signed()||id===currentUser.id)return;
 if(!confirm("Bloquer "+(name||"ce membre")+" ? Ses contenus et messages ne seront plus accessibles."))return;
 const {error}=await db.rpc("afro_block_user",{p_user:id});
 if(error){say("Blocage impossible : "+error.message);return;}
 S.blocked.add(id);say("Compte bloqué.",true);
 if(typeof closeProfile==="function")closeProfile();
}
async function reportTarget(fields){
 if(!signed())return;
 const reason=prompt("Motif : spam, harassment, hate, nudity, violence, scam ou other","other");
 if(!reason)return;
 const allowed=["spam","harassment","hate","nudity","violence","scam","other"];
 const normalized=reason.toLowerCase().trim();
 if(!allowed.includes(normalized)){say("Choisis un motif proposé.");return;}
 const details=prompt("Détails (facultatif, 500 caractères maximum)","")||"";
 const {error}=await db.from("social_reports").insert({reporter_id:currentUser.id,reason:normalized,details:details.slice(0,500),...fields});
 if(error){say("Signalement impossible : "+error.message);return;}
 say("Signalement envoyé à l’équipe de modération.",true);
}
function patchFeed(){
 if(typeof vitemHTML==="function"&&!vitemHTML.__afroPatched){
  const old=vitemHTML;
  const patched=function(p){
   let html=old(p);
   const save='<button class="vbtn" data-action="afro-save" data-post="'+esc(p.id)+'" aria-label="Enregistrer"><i class="ti ti-bookmark"></i><span class="vcount">Enregistrer</span></button>';
   const share='<button class="vbtn" data-action="afro-share-dm" data-post="'+esc(p.id)+'" aria-label="Partager en message"><i class="ti ti-send"></i><span class="vcount">Envoyer</span></button>';
   html=html.replace(save,save+share);
   html=html.replace('<button class="vbtn'+(p.liked?' on':'')+'" data-action="like"',save+'<button class="vbtn'+(p.liked?' on':'')+'" data-action="like"');
   html=html.replace('class="vitem" data-post="','class="vitem" data-creator="'+esc(p.creator_id)+'" data-post="');
   return html;
  };
  patched.__afroPatched=true;vitemHTML=patched;
 }
 if(typeof loadHomeFeed==="function"&&!loadHomeFeed.__afroPatched){
  const old=loadHomeFeed;
  const patched=async function(){await old();await refreshSaved();document.querySelectorAll("#homeFeed .vitem[data-creator]").forEach(n=>{if(S.blocked.has(n.dataset.creator))n.remove();});};
  patched.__afroPatched=true;loadHomeFeed=patched;
 }
}
async function enhancedComments(){
 const postId=cmPostId;if(!postId)return;
 const {data:post,error:pe}=await db.from("posts").select("creator_id").eq("id",postId).maybeSingle();
 if(pe){el("cmList").innerHTML='<div class="cm-empty">Impossible de charger les commentaires.</div>';return;}
 cmPostOwnerId=post?.creator_id||null;
 const {data:rows,error}=await db.from("post_comments").select("id,post_id,user_id,body,created_at,parent_id,likes_count,replies_count").eq("post_id",postId).order("created_at",{ascending:true}).limit(250);
 if(error){el("cmList").innerHTML='<div class="cm-empty">'+esc(error.message)+'</div>';return;}
 if(!rows?.length){el("cmList").innerHTML='<div class="cm-empty">Aucun commentaire pour le moment. Sois le premier !</div>';return;}
 const ids=[...new Set(rows.map(r=>r.user_id))];
 const [{data:profiles},{data:likes}]=await Promise.all([
  db.from("profiles").select("id,username,display_name,avatar_url").in("id",ids),
  signed()?db.from("post_comment_likes").select("comment_id").eq("user_id",currentUser.id).in("comment_id",rows.map(r=>r.id)):Promise.resolve({data:[]})
 ]);
 const pm={};(profiles||[]).forEach(p=>pm[p.id]=p);const mine=new Set((likes||[]).map(x=>x.comment_id));
 const roots=rows.filter(r=>!r.parent_id),children={};rows.filter(r=>r.parent_id).forEach(r=>(children[r.parent_id]??=[]).push(r));
 const rowHTML=r=>{
  const p=pm[r.user_id]||{},own=signed()&&(currentUser.id===r.user_id||currentUser.id===cmPostOwnerId);
  const when=new Date(r.created_at).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  return '<div class="afro-comment-row" data-comment="'+esc(r.id)+'">'+(typeof cmAvatar==="function"?cmAvatar(p):avatar(p))+'<div class="afro-comment-text"><b>'+esc(p.display_name||p.username||"Membre")+' <small>@'+esc(p.username||"membre")+'</small></b><span>'+esc(r.body)+'</span><small>'+esc(when)+'</small><div class="afro-comment-actions"><button type="button" data-afro-comment-like="'+esc(r.id)+'" class="'+(mine.has(r.id)?"liked":"")+'">♥ '+Number(r.likes_count||0)+'</button><button type="button" data-afro-reply="'+esc(r.id)+'">Répondre</button><button type="button" data-afro-report-comment="'+esc(r.id)+'">Signaler</button>'+(own?'<button type="button" data-delete-comment="'+esc(r.id)+'">Supprimer</button>':'')+'</div></div></div>';
 };
 el("cmList").innerHTML=roots.map(r=>rowHTML(r)+(children[r.id]?.length?'<div class="afro-comment-reply">'+children[r.id].map(rowHTML).join("")+'</div>':"")).join("");
 el("cmList").scrollTop=el("cmList").scrollHeight;
}
async function toggleCommentLike(id,btn){
 if(!signed())return;
 const was=btn.classList.contains("liked");
 const req=was?db.from("post_comment_likes").delete().eq("comment_id",id).eq("user_id",currentUser.id):db.from("post_comment_likes").insert({comment_id:id,user_id:currentUser.id});
 const {error}=await req;if(error){say(error.message);return;}
 await enhancedComments();
}
async function submitEnhancedComment(e){
 e.preventDefault();e.stopImmediatePropagation();if(!signed())return guestToAuth();
 const text=el("cmInput").value.trim().slice(0,500);if(!text||!cmPostId||cmBusy)return;
 cmBusy=true;el("cmSend").disabled=true;
 const row={post_id:cmPostId,user_id:currentUser.id,body:text};
 if(S.replyTo)row.parent_id=S.replyTo;
 const {error}=await db.from("post_comments").insert(row);
 cmBusy=false;el("cmSend").disabled=false;
 if(error){say("Commentaire non envoyé : "+error.message);return;}
 el("cmInput").value="";S.replyTo=null;updateReplyLabel();await enhancedComments();
}
function updateReplyLabel(){
 let label=el("afroReplying");if(!label)return;
 if(S.replyTo){label.textContent="Réponse à un commentaire · Annuler";label.classList.add("on");}
 else{label.textContent="";label.classList.remove("on");}
}
function setReply(id){
 S.replyTo=id;updateReplyLabel();el("cmInput").focus();
}
function patchProfile(){
 if(typeof openProfile!=="function"||openProfile.__afroPatched)return;
 const old=openProfile;
 const patched=async function(id){
  await old(id);
  if(!id||!el("pfActions")||id===currentUser?.id)return;
  const actions=el("pfActions");
  const profile=el("publicProfile");
  if(profile)profile.dataset.afroCreatorId=id;
  const pName=profile?.querySelector(".ig-name")?.textContent||"ce membre";
  const username=profile?.querySelector(".ig-user b")?.textContent||"";
  const messageProfile=async()=>{
   if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return;}
   if(typeof window.openAfroCreatorConversation!=="function"){say("La messagerie n’est pas encore prête.");return;}
   if(typeof showPage==="function")showPage("notifs");
   await window.openAfroCreatorConversation(id,pName);
  };
  const top=profile?.querySelector(".ig-top");
  if(top&&!top.querySelector("[data-afro-profile-message]")){
   const b=document.createElement("button");b.type="button";b.className="ig-icon";b.dataset.afroProfileMessage="1";b.setAttribute("aria-label","Messagerie");b.innerHTML='<i class="ti ti-message-circle"></i>';b.addEventListener("click",messageProfile);top.insertBefore(b,top.querySelector("#pfMenu"));
  }
  const menu=top?.querySelector("#pfMenu");
  if(menu){
   menu.setAttribute("aria-label","Options du profil");
   menu.type="button";
   menu.onclick=(event)=>{
    event?.preventDefault?.();
    event?.stopPropagation?.();
    let sheet=el("afroProfileOptions");
    if(!sheet){
     sheet=document.createElement("div");sheet.id="afroProfileOptions";
     sheet.style.cssText="position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.58);display:none;align-items:flex-end";
     sheet.innerHTML='<div data-profile-options-panel style="width:100%;background:#17171b;border-radius:20px 20px 0 0;padding:12px 16px calc(18px + env(safe-area-inset-bottom));border-top:1px solid #333"><div style="width:38px;height:4px;border-radius:9px;background:#555;margin:0 auto 15px"></div><button type="button" data-profile-option="share" style="display:flex;align-items:center;gap:13px;width:100%;padding:15px 4px;background:none;border:0;color:#fff;text-align:left;font-size:15px"><i class="ti ti-share-3"></i>Partager le profil</button><button type="button" data-profile-option="report" style="display:flex;align-items:center;gap:13px;width:100%;padding:15px 4px;background:none;border:0;border-top:1px solid #303036;color:#fff;text-align:left;font-size:15px"><i class="ti ti-flag"></i>Signaler</button><button type="button" data-profile-option="block" style="display:flex;align-items:center;gap:13px;width:100%;padding:15px 4px;background:none;border:0;border-top:1px solid #303036;color:#ff7777;text-align:left;font-size:15px"><i class="ti ti-ban"></i>Bloquer</button><button type="button" data-profile-option="cancel" style="width:100%;padding:13px;margin-top:8px;background:#29292f;border:0;border-radius:12px;color:#fff;font-weight:700">Annuler</button></div>';
     document.body.appendChild(sheet);
     sheet.addEventListener("click",e=>{
      if(e.target===sheet||e.target.closest('[data-profile-option="cancel"]'))sheet.style.display="none";
      const action=e.target.closest("[data-profile-option]")?.dataset.profileOption;
      if(!action||action==="cancel")return;
      sheet.style.display="none";
      if(action==="share"){if(typeof shareCreator==="function")shareCreator(username,pName);}
      if(action==="report")reportTarget({reported_user_id:id});
      if(action==="block")blockProfile(id,pName);
     });
    }
    sheet.style.display="flex";
   };
  }
 };
 patched.__afroPatched=true;openProfile=patched;
}
function patchAccount(){
 if(typeof loadAccount!=="function"||loadAccount.__afroPatched)return;
 const old=loadAccount;
 const patched=async function(){await old();if(signed()){await loadBlocked();await refreshSaved();}};
 patched.__afroPatched=true;loadAccount=patched;
}
function patchView(){
 if(typeof renderView!=="function"||renderView.__afroPatched)return;
 const old=renderView;
 const patched=function(){old();addAdminModeration();const b=el("navigation")?.querySelector('[data-page="notifs"] span');if(b)b.textContent="Messages";};
 patched.__afroPatched=true;renderView=patched;
}
function bind(){
 try{addStyles()}catch(e){console.error("[AFRO LIVE] styles",e)}
 try{ensureOverlays()}catch(e){console.error("[AFRO LIVE] overlays",e)}
 try{ensureDMUnreadDock()}catch(e){console.error("[AFRO LIVE] unread dock",e)}
 try{addMenuOptions()}catch(e){console.error("[AFRO LIVE] menu",e)}
 try{patchFeed()}catch(e){console.error("[AFRO LIVE] feed patch",e)}
 try{patchProfile()}catch(e){console.error("[AFRO LIVE] profile patch",e)}
 try{patchAccount()}catch(e){console.error("[AFRO LIVE] account patch",e)}
 try{patchView()}catch(e){console.error("[AFRO LIVE] view patch",e)}
 try{refreshDMUnread()}catch(e){console.error("[AFRO LIVE] unread refresh",e)}
 const admin=el("admin");if(admin&&!admin.__afroObserver){new MutationObserver(()=>setTimeout(addAdminModeration,0)).observe(admin,{childList:true,subtree:true});admin.__afroObserver=true;}
 const nav=el("navigation");
 if(nav&&!nav.__afroObserver){new MutationObserver(()=>{addMenuOptions();}).observe(nav,{childList:true,subtree:true});nav.__afroObserver=true;}
 const home=el("homeFeed");
 if(home&&!home.__afroSwipeBound){
  let start=null;
  home.addEventListener("pointerdown",e=>{
   if(e.pointerType==="mouse"||e.target.closest("button,a,input,textarea,[contenteditable='true']")){start=null;return;}
   const card=e.target.closest(".vitem[data-creator]");
   start=card?{x:e.clientX,y:e.clientY,id:card.dataset.creator}:null;
  },{passive:true});
  home.addEventListener("pointerup",e=>{
   if(!start)return;
   const dx=e.clientX-start.x,dy=e.clientY-start.y,id=start.id;start=null;
   if(Math.abs(dx)>85 && Math.abs(dx)>Math.abs(dy)*1.35 && id && typeof openProfile==="function"){
    e.preventDefault();openProfile(id);
   }
  });
  home.addEventListener("pointercancel",()=>{start=null;},{passive:true});
  // Secours tactile iOS/Android : le balayage horizontal vers la gauche ouvre le profil.
  let touchStart=null;
  home.addEventListener("touchstart",e=>{
   if(e.touches.length!==1||e.target.closest("button,a,input,textarea,[contenteditable='true']")){touchStart=null;return;}
   const card=e.target.closest(".vitem[data-creator]");
   touchStart=card?{x:e.touches[0].clientX,y:e.touches[0].clientY,id:card.dataset.creator}:null;
  },{passive:true});
  home.addEventListener("touchend",e=>{
   if(!touchStart)return;
   const dx=e.changedTouches[0].clientX-touchStart.x;
   const dy=e.changedTouches[0].clientY-touchStart.y;
   const id=touchStart.id;touchStart=null;
   if(dx < -65 && Math.abs(dx)>Math.abs(dy)*1.25 && id && typeof openProfile==="function"){
    e.preventDefault();openProfile(id);
   }
  },{passive:false});
  home.addEventListener("touchcancel",()=>{touchStart=null;},{passive:true});
  home.__afroSwipeBound=true;
 }
 const cmForm=el("cmForm");
 if(cmForm&&!cmForm.__afroSubmit){cmForm.addEventListener("submit",submitEnhancedComment,true);cmForm.__afroSubmit=true;}
 const cmHead=el("cmHead");
 if(!el("afroReplying")&&cmForm){const x=document.createElement("div");x.id="afroReplying";x.className="afro-replying";x.addEventListener("click",()=>{S.replyTo=null;updateReplyLabel();});cmForm.before(x);}
 document.addEventListener("click",async e=>{
  const t=e.target.closest("button");if(!t)return;
  // Intercepte les boutons du profil avant les anciens gestionnaires.
  if(t.id==="pfMenu"){
   e.preventDefault();e.stopImmediatePropagation();
   if(typeof t.onclick==="function")t.onclick.call(t,e);
   return;
  }
  if(t.matches(".ig-message-entry,[data-afro-profile-message]")){
   e.preventDefault();e.stopImmediatePropagation();
   const profile=el("publicProfile");
   const id=profile?.dataset.afroCreatorId;
   const name=profile?.querySelector(".ig-name")?.textContent||"Conversation";
   if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return;}
   if(id&&typeof window.openAfroCreatorConversation==="function"){
    if(typeof showPage==="function")showPage("notifs");
    await window.openAfroCreatorConversation(id,name);
   }else{
    say("La messagerie n’est pas encore prête. Réessaie dans un instant.");
   }
   return;
  }
  if(t.matches("[data-afro-open-dm]")){openDM();return;}
  if(t.matches("[data-afro-open-saved]")){openSaved();return;}
  if(t.matches("[data-dm-close]")){if(S.dmConversation){if(S.dmChannel){db.removeChannel(S.dmChannel);S.dmChannel=null;}S.dmConversation=null;S.dmOther=null;if(el("afroDmDeleteConversation"))el("afroDmDeleteConversation").hidden=true;el("afroDmTitle").textContent="Messages";el("afroDmBody").className="afro-dm-list";renderInbox();}else closeDM();return;}
  if(t.matches("[data-dm-new]")){showNewDM();return;}
  if(t.matches("[data-dm-photo]")){el("afroDmFile")?.click();return;}
  if(t.matches("[data-dm-cancel-file]")){S.dmPendingFile=null;S.dmPendingType=null;const p=el("afroDmAttachmentPreview");if(p){p.hidden=true;p.innerHTML="";}return;}
  if(t.matches("[data-dm-cancel-reply]")){S.dmReplyTo=null;el("afroDmReplyPreview")?.remove();return;}
  if(t.matches("[data-dm-image]")){openDMImage(t.dataset.dmImage);return;}
  if(t.matches("[data-dm-image-close]")){el("afroDmImageModal").hidden=true;return;}
  if(t.matches("[data-dm-image-share]")){shareDMImage(t.dataset.dmImageShare);return;}
  if(t.matches("[data-dm-image-delete]")){deleteDMImage(t.dataset.dmImageDelete);return;}
  
if(t.matches("[data-dm-context-forward]")){const id=t.dataset.dmContextForward;hideDMContextMenu();forwardDMMessage(id);return;}
if(t.matches("[data-dm-context-translate]")){const m=S.dmMessageMap?.[t.dataset.dmContextTranslate];hideDMContextMenu();if(m?.body)window.open("https://translate.google.com/?sl=auto&tl=fr&text="+encodeURIComponent(m.body),"_blank","noopener");else say("Aucun texte à traduire.");return;}
if(t.matches("[data-dm-context-style]")){const id=t.dataset.dmContextStyle;hideDMContextMenu();toggleDMBubbleStyle(id);return;}
if(t.matches("[data-dm-context-hide]")){const id=t.dataset.dmContextHide;hideDMContextMenu();hideDMMessageForMe(id);return;}
if(t.matches("[data-dm-context-reply]")){const id=t.dataset.dmContextReply;hideDMContextMenu();setDMReply(id);return;}
if(t.matches("[data-dm-context-copy]")){const id=t.dataset.dmContextCopy;hideDMContextMenu();copyDMMessage(id);return;}
if(t.matches("[data-dm-context-edit]")){const id=t.dataset.dmContextEdit;hideDMContextMenu();editDMMessage(id);return;}
if(t.matches("[data-dm-context-delete]")){const id=t.dataset.dmContextDelete;hideDMContextMenu();deleteDMMessage(id);return;}
if(t.matches("[data-dm-context-emoji]")){const id=t.dataset.dmContextId,emoji=t.dataset.dmContextEmoji;hideDMContextMenu();reactDMMessage(id,emoji);return;}
if(t.matches("[data-dm-edit]")){editDMMessage(t.dataset.dmEdit);return;}
  if(t.matches("[data-dm-delete-message]")){deleteDMMessage(t.dataset.dmDeleteMessage);return;}
  if(t.matches("[data-dm-delete-conversation]")){deleteDMConversation();return;}
  if(t.matches("[data-dm-reply]")){setDMReply(t.dataset.dmReply);return;}
  if(t.matches("[data-dm-react]")){const p=document.querySelector('[data-dm-picker="'+t.dataset.dmReact+'"]');if(p)p.hidden=!p.hidden;return;}
  if(t.matches("[data-dm-emoji]")){reactDMMessage(t.dataset.dmMessageId,t.dataset.dmEmoji);return;}
  if(t.matches("[data-dm-record]")){toggleDMRecording();return;}
  if(t.matches("[data-dm-conversation]")){if(t.dataset.dmShareKind){await sendDMShare(t.dataset.dmConversation,t.dataset.dmShareKind,t.dataset.dmShareId);return;}if(el("afroDmOverlay")?.hidden)await openDM();await openConversation(t.dataset.dmConversation,t.dataset.dmOther,t.dataset.dmName);return;}
  if(t.matches("[data-dm-start]")){startDM(t.dataset.dmStart,t.dataset.dmName);return;}
  if(t.matches("[data-saved-close]")){el("afroSavedOverlay").hidden=true;return;}
  if(t.matches("[data-reports-close]")){el("afroReportsOverlay").hidden=true;return;}
  if(t.matches("[data-report-status]")){setReportStatus(t.dataset.reportId,t.dataset.reportStatus);return;}
  if(t.matches("[data-afro-saved-open]")){const i=Number(t.dataset.afroSavedOpen);if(typeof openFeedFrom==="function")openFeedFrom("afroSaved",i);el("afroSavedOverlay").hidden=true;return;}
  if(t.matches('[data-action="afro-save"]')){e.preventDefault();e.stopImmediatePropagation();toggleSave(t);return;}
  if(t.matches('[data-action="afro-share-dm"]')){e.preventDefault();e.stopImmediatePropagation();openDMSharePicker("post",t.dataset.post);return;}
  if(t.matches('[data-action="afro-report"]')){e.preventDefault();e.stopImmediatePropagation();reportTarget({post_id:t.dataset.post});return;}
  if(t.matches("[data-afro-reply]")){setReply(t.dataset.afroReply);return;}
  if(t.matches("[data-afro-comment-like]")){toggleCommentLike(t.dataset.afroCommentLike,t);return;}
  if(t.matches("[data-afro-report-comment]")){reportTarget({comment_id:t.dataset.afroReportComment});return;}
  if(t.matches("[data-delete-comment]")){e.preventDefault();e.stopImmediatePropagation();if(typeof deleteComment==="function")deleteComment(t.dataset.deleteComment);return;}
 },true);
 document.addEventListener("submit",e=>{if(e.target?.id==="afroDmForm"){sendDM(e);}},true);
 el("afroDmSearchInput")?.addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(searchDMUsers,250);});let dmTouch=null;let dmLongPressTimer=null,dmLongPressPoint=null;
document.addEventListener("touchstart",e=>{const row=e.target.closest("[data-dm-message]");if(!row||e.touches.length!==1)return;const p=e.touches[0];dmLongPressPoint={id:row.dataset.dmMessage,x:p.clientX,y:p.clientY};clearTimeout(dmLongPressTimer);dmLongPressTimer=setTimeout(()=>{if(dmLongPressPoint)showDMContextMenu(dmLongPressPoint.id,dmLongPressPoint.x,dmLongPressPoint.y);},520);},{passive:true});
document.addEventListener("touchmove",e=>{if(!dmLongPressPoint)return;const p=e.touches[0];if(Math.abs(p.clientX-dmLongPressPoint.x)>12||Math.abs(p.clientY-dmLongPressPoint.y)>12){clearTimeout(dmLongPressTimer);dmLongPressPoint=null;}},{passive:true});
document.addEventListener("touchend",()=>{clearTimeout(dmLongPressTimer);dmLongPressPoint=null;},{passive:true});
document.addEventListener("contextmenu",e=>{const row=e.target.closest("[data-dm-message]");if(!row)return;e.preventDefault();showDMContextMenu(row.dataset.dmMessage,e.clientX,e.clientY);});
document.addEventListener("click",e=>{if(!e.target.closest("#afroDmContextMenu")&&!e.target.closest("#afroDmContextBackdrop"))hideDMContextMenu();},true);
document.addEventListener("touchend",e=>{if(!dmTouch)return;const dx=e.changedTouches[0].clientX-dmTouch.x,dy=e.changedTouches[0].clientY-dmTouch.y;const id=dmTouch.id;dmTouch=null;if(dx>65&&Math.abs(dx)>Math.abs(dy)*1.3)setDMReply(id);},{passive:true});
 document.addEventListener("change",e=>{if(e.target?.id!=="afroDmFile")return;const f=e.target.files?.[0];if(!f)return;const type=f.type.startsWith("video/")?"video":f.type.startsWith("image/")?"image":null;if(!type){say("Choisis une photo ou une vidéo.");return;}showDMPendingFile(f,type);e.target.value="";});
}
async function appendDMInboxToMessagesPage(){
 const box=el("notifsList");if(!box||!signed())return;
 const previous=el("afroDmInboxSection");
 const {data,error}=await db.from("afro_my_conversations").select("*").order("last_message_at",{ascending:false}).limit(80);
 const section=document.createElement("section");
 section.id="afroDmInboxSection";section.className="afro-dm-page-section";
 section.innerHTML='<h3 style="margin:18px 12px 8px;font-size:15px">Conversations</h3>';
 if(error){
  section.insertAdjacentHTML("beforeend",'<p class="empty" style="padding:10px 14px">Conversations temporairement indisponibles.</p>');
 }else if(!data?.length){
  section.insertAdjacentHTML("beforeend",'<p class="empty" style="padding:10px 14px">Aucune conversation pour le moment.</p>');
 }else{
  section.insertAdjacentHTML("beforeend",data.map(c=>'<button class="afro-dm-row" style="width:100%;padding:12px 14px" data-dm-conversation="'+esc(c.id)+'" data-dm-other="'+esc(c.other_id)+'" data-dm-name="'+esc(c.other_display_name||c.other_username||"Membre")+'">'+avatar({avatar_url:c.other_avatar_url,username:c.other_username,display_name:c.other_display_name})+'<span class="afro-dm-copy"><b>'+esc(c.other_display_name||c.other_username||"Membre")+'</b><small>'+esc(c.last_message_preview||"Démarrer la conversation")+'</small></span>'+(Number(c.unread_count)>0?'<span class="afro-dm-unread">'+Number(c.unread_count)+'</span>':'')+'</button>').join(""));
 }
 if(previous)previous.remove();
 box.prepend(section);
}
function wrapFunctions(){
 if(typeof loadComments==="function"&&!loadComments.__afroPatched){const f=loadComments;const w=async function(){return enhancedComments();};w.__afroPatched=true;loadComments=w;}
 if(typeof loadHomeFeed==="function"&&!loadHomeFeed.__afroPatched){patchFeed();}
 if(typeof openProfile==="function"&&!openProfile.__afroPatched)patchProfile();
}
document.addEventListener("DOMContentLoaded",bind,{once:true});
if(document.readyState!=="loading")bind();
const start=()=>{if(!signed())return;wrapFunctions();subscribeDMNotifications();loadBlocked().then(()=>{patchFeed();refreshSaved();refreshDMUnread();});if(!S.dmBadgeTimer)S.dmBadgeTimer=setInterval(()=>{if(!signed()||document.visibilityState!=="visible")return;refreshDMUnread();if(el("notifsPage")&&!el("notifsPage").classList.contains("hidden"))appendDMInboxToMessagesPage();if(el("afroDmOverlay")&&!el("afroDmOverlay").hidden&&!S.dmConversation)renderInbox();},10000);};
setTimeout(start,0);
if(typeof db!=="undefined"&&db.auth?.onAuthStateChange)db.auth.onAuthStateChange((event,session)=>{if(session?.user){setTimeout(start,0);}else{S.saved.clear();S.blocked.clear();closeDM();if(el("afroDmUnreadDock"))el("afroDmUnreadDock").hidden=true;}});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&signed()){refreshDMUnread();subscribeDMNotifications();}});
window.addEventListener("pageshow",()=>{if(signed())refreshDMUnread();});
document.addEventListener("click",e=>{
 const like=e.target.closest('#homeFeed [data-action="like"]');
 if(like){e.preventDefault();e.stopImmediatePropagation();toggleLike(like);return;}
},true);
try{patchProfile();}catch(e){console.error("[AFRO LIVE] profile init",e);}
window.afroRefreshDMUnread=refreshDMUnread;
window.afroLoadMessagesPage=async function(){await loadNotifications();await appendDMInboxToMessagesPage();};
window.openAfroMessages=openDM;
window.openAfroCreatorConversation=async function(creatorId,creatorName){
 const showFailure=(detail)=>{
  try{
   ensureOverlays();addStyles();
   const overlay=el("afroDmOverlay"),body=el("afroDmBody");
   if(overlay)overlay.hidden=false;
   if(body){body.className="afro-dm-list";body.innerHTML='<div class="afro-social-empty">Impossible d’ouvrir cette discussion. '+esc(detail||"Réessaie dans un instant.")+'</div>';}
  }catch(_){}
 };
 try{
  if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return;}
  if(!creatorId||creatorId===currentUser?.id){showFailure("Ce profil ne peut pas être contacté.");return;}
  ensureOverlays();addStyles();
  const overlay=el("afroDmOverlay"),body=el("afroDmBody");
  if(!overlay||!body){showFailure("La fenêtre de messagerie n’a pas pu être créée.");return;}
  overlay.hidden=false;el("afroDmSearch").hidden=true;el("afroDmTitle").textContent=creatorName||"Conversation";
  body.className="afro-dm-chat";body.innerHTML='<div class="afro-social-empty">Ouverture de la discussion...</div>';
  const {data,error}=await db.rpc("afro_start_conversation",{p_other:creatorId});
  if(error)throw error;
  const conversationId=typeof data==="string"?data:(data?.id||data?.conversation_id||data?.[0]?.id||data?.[0]);
  if(!conversationId)throw new Error("La conversation n’a pas reçu d’identifiant.");
  await openConversation(conversationId,creatorId,creatorName||"Conversation");
 }catch(error){
  console.error("[AFRO LIVE] ouverture messagerie:",error);
  showFailure(error?.message||"Erreur inattendue.");
 }
};
})();