/* =========================================================
   AFRO LIVE — social.js
   Fonctions sociales : publications enregistrées, blocage,
   signalements, commentaires (réponses, j'aime), modération.
   La messagerie privée est dans messaging.js (ne pas la mettre ici).
   ========================================================= */
(()=>{
"use strict";
if(window.__afroSocialLoaded)return;
window.__afroSocialLoaded=true;

const S={saved:new Set(),blocked:new Set(),replyTo:null};
const REPORT_REASONS=["spam","harassment","hate","nudity","violence","scam","other"];
const el=id=>document.getElementById(id);
const esc=v=>typeof escapeHTML==="function"?escapeHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(t,ok=false)=>{if(typeof message==="function")message(t,ok)};
const signed=()=>typeof currentUser!=="undefined"&&!!currentUser?.id;

/* ---------- STYLES ---------- */
function addStyles(){
 if(el("afroSocialStyles"))return;
 const st=document.createElement("style");
 st.id="afroSocialStyles";
 st.textContent=`
 .afro-social-overlay{position:fixed;inset:0;z-index:2147483000;background:#09090b;color:#fff;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
 .afro-social-overlay[hidden]{display:none!important}
 .afro-social-head{height:56px;flex:0 0 56px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid #29292e}
 .afro-social-head strong{flex:1;font-size:17px}
 .afro-social-head button{border:0;background:#242429;color:#fff;border-radius:50%;width:38px;height:38px;padding:0;font-size:20px}
 .afro-list{overflow:auto;flex:1;padding:8px 12px}
 .afro-list-row{display:flex;align-items:center;gap:11px;padding:13px 5px;border-bottom:1px solid #242429;color:#fff;background:none;width:100%;text-align:left}
 .afro-list-avatar{width:46px;height:46px;border-radius:50%;background:#29292e;display:grid;place-items:center;flex:0 0 46px;font-size:18px}
 .afro-list-copy{min-width:0;flex:1}
 .afro-list-copy b{display:block;font-size:14px}
 .afro-list-copy small{display:block;color:#aaa;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .afro-social-empty{color:#999;text-align:center;padding:35px 18px;font-size:14px}
 .afro-report-card{display:block;padding:14px 5px;border-bottom:1px solid #242429}
 .afro-report-card p{margin:5px 0;color:#bbb;font-size:12px}
 .afro-report-actions{display:flex;gap:8px;margin-top:8px}
 .afro-comment-row{display:flex;gap:9px;padding:10px 0}
 .afro-comment-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;font-size:13px;overflow-wrap:anywhere}
 .afro-comment-text b{font-size:12px}
 .afro-comment-text small{color:#888;font-size:10px}
 .afro-comment-actions{display:flex;align-items:center;gap:14px;margin-top:7px;flex-wrap:wrap}
 .afro-comment-actions button{padding:2px 0;background:none;color:#aaa;font-size:11px;font-weight:500;border:0}
 .afro-comment-actions button.liked{color:#ff526b}
 .afro-comment-reply{margin:8px 0 0 34px;padding-left:10px;border-left:2px solid #38383e}
 .afro-replying{display:none;padding:6px 12px;color:#ffb47c;font-size:12px;cursor:pointer}
 .afro-replying.on{display:block}
 `;
 document.head.appendChild(st);
}

function ensureOverlays(){
 if(!el("afroSavedOverlay")){
  const w=document.createElement("section");
  w.id="afroSavedOverlay";w.className="afro-social-overlay";w.hidden=true;
  w.innerHTML='<div class="afro-social-head"><button type="button" data-saved-close aria-label="Retour">‹</button><strong>Publications enregistrées</strong></div><div id="afroSavedBody" class="afro-list"></div>';
  document.body.appendChild(w);
 }
 if(!el("afroReportsOverlay")){
  const w=document.createElement("section");
  w.id="afroReportsOverlay";w.className="afro-social-overlay";w.hidden=true;
  w.innerHTML='<div class="afro-social-head"><button type="button" data-reports-close aria-label="Retour">‹</button><strong>Signalements</strong></div><div id="afroReportsBody" class="afro-list"></div>';
  document.body.appendChild(w);
 }
}

/* ---------- MODÉRATION (admin) ---------- */
function addTestCreatorButton(){
 if(typeof currentProfile==="undefined"||currentProfile?.role!=="admin")return;
 const host=el("admin");
 if(!host||el("afroCreateTestCreators"))return;
 const b=document.createElement("button");
 b.id="afroCreateTestCreators";b.type="button";b.className="soft";
 b.style.cssText="width:100%;margin:10px 0;border:1px solid #ff8a32";
 b.textContent="Créer les 50 créateurs de démonstration";
 b.addEventListener("click",async()=>{
  if(currentProfile?.role!=="admin"||!signed())return say("Connexion administrateur nécessaire.");
  if(!confirm("Créer les comptes créateurs de démonstration AFRO LIVE ? Les comptes déjà présents seront ignorés."))return;
  b.disabled=true;b.textContent="Création des comptes en cours...";
  const old=el("afroTestCreatorResult");if(old)old.remove();
  try{
   const {data,error}=await db.functions.invoke("create-test-creators",{body:{}});
   if(error)throw error;
   const result=document.createElement("div");
   result.id="afroTestCreatorResult";result.className="notice";
   const count=Number(data?.created_count||0), skipped=Number(data?.skipped_count||0);
   const errors=Array.isArray(data?.errors)?data.errors:[];
   result.textContent="Créés : "+count+" · Déjà présents : "+skipped+" · Erreurs : "+errors.length;
   if(Array.isArray(data?.credentials)&&data.credentials.length){
    const details=document.createElement("details");
    const summary=document.createElement("summary");summary.textContent="Afficher les identifiants créés (à conserver en lieu sûr)";
    const pre=document.createElement("pre");pre.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px";
    pre.textContent=data.credentials.map(x=>x.email+" | "+x.password).join("\n");
    const copy=document.createElement("button");copy.type="button";copy.className="soft";copy.textContent="Copier les identifiants";
    copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(pre.textContent);say("Identifiants copiés.",true)}catch{say("La copie automatique n'est pas disponible.")}});
    details.append(summary,pre,copy);result.appendChild(details);
   }
   if(errors.length){const list=document.createElement("pre");list.style.cssText="white-space:pre-wrap;font-size:11px";list.textContent=errors.map(x=>x.email+": "+x.error).join("\n");result.appendChild(list)}
   host.prepend(result);say("Création terminée : "+count+" comptes créés.",true);
  }catch(err){say("Création impossible : "+(err?.message||String(err)))}
  finally{b.disabled=false;b.textContent="Créer les 50 créateurs de démonstration"}
 });
 host.prepend(b);
}
function addTestSpectatorButton(){
 if(typeof currentProfile==="undefined"||currentProfile?.role!=="admin")return;
 const host=el("admin");
 if(!host||el("afroCreateTestSpectators"))return;
 const b=document.createElement("button");
 b.id="afroCreateTestSpectators";b.type="button";b.className="soft";
 b.style.cssText="width:100%;margin:10px 0;border:1px solid #ff8a32";
 b.textContent="Créer 1 000 spectateurs de démonstration";
 b.addEventListener("click",async()=>{
  if(currentProfile?.role!=="admin"||!signed())return say("Connexion administrateur nécessaire.");
  if(!confirm("Créer jusqu'à 1 000 comptes spectateurs de démonstration, puis répartir abonnements, likes et commentaires ? Les comptes existants seront conservés."))return;
  b.disabled=true;b.textContent="Création et remplissage en cours…";
  const old=el("afroTestSpectatorResult");if(old)old.remove();
  try{
   const {data,error}=await db.functions.invoke("create-test-spectators",{body:{}});
   if(error)throw error;
   const result=document.createElement("div");result.id="afroTestSpectatorResult";result.className="notice";
   result.textContent="Comptes créés : "+Number(data?.created_count||0)
    +" · Audience test : "+Number(data?.audience_count||0)
    +" · Abonnements test : "+Number(data?.follows_inserted_or_existing||0)
    +" · Likes test : "+Number(data?.likes_inserted_or_existing||0)
    +" · Commentaires créés : "+Number(data?.comments_created||0)
    +" · Erreurs : "+(Array.isArray(data?.errors)?data.errors.length:0);
   if(Array.isArray(data?.errors)&&data.errors.length){
    const details=document.createElement("details");const summary=document.createElement("summary");
    summary.textContent="Voir les erreurs";const pre=document.createElement("pre");
    pre.style.cssText="white-space:pre-wrap;font-size:11px";pre.textContent=data.errors.map(x=>(x.email||x.area||"Erreur")+": "+(x.message||x.error||"Échec")).join("\n");
    details.append(summary,pre);result.appendChild(details);
   }
   host.prepend(result);
   say("Données de démonstration traitées.",true);
  }catch(err){say("Création impossible : "+(err?.message||String(err)))}
  finally{b.disabled=false;b.textContent="Créer 1 000 spectateurs de démonstration"}
 });
 host.prepend(b);
}
function addDemoPostsImport(){
 if(typeof currentProfile==="undefined"||currentProfile?.role!=="admin")return;
 const host=el("admin");
 if(!host||el("afroImportDemoPosts"))return;
 const b=document.createElement("button");
 b.id="afroImportDemoPosts";b.type="button";b.className="soft";
 b.style.cssText="width:100%;margin:10px 0;border:1px solid #ff8a32";
 b.textContent="Importer le pack de contenu · 53 créateurs";
 const input=document.createElement("input");
 input.type="file";input.accept=".zip,application/zip";input.hidden=true;
 input.id="afroImportDemoPostsFile";
 input.addEventListener("change",async()=>{
  const file=input.files?.[0];if(!file)return;
  if(!file.name.toLowerCase().endsWith(".zip")){say("Choisis le fichier ZIP du pack.");input.value="";return}
  if(!confirm("Importer les photos et clips du pack, puis compléter chaque créateur jusqu’à 10 publications minimum ? Les publications existantes seront conservées.")){input.value="";return}
  b.disabled=true;b.textContent="Importation des médias et publications…";
  const old=el("afroDemoPostsImportResult");if(old)old.remove();
  try{
   const body=new FormData();body.append("archive",file,file.name);
   const {data,error}=await db.functions.invoke("import-demo-posts",{body});
   if(error)throw error;
   const result=document.createElement("div");result.id="afroDemoPostsImportResult";result.className="notice";
   result.textContent="Créateurs : "+Number(data?.creators||0)
    +" · Médias importés : "+Number(data?.media_uploaded||0)
    +" · Publications ajoutées : "+Number(data?.posts_created||0)
    +" · Minimum : "+Number(data?.minimum_posts_per_creator||0)+" par créateur.";
   host.prepend(result);say("Importation terminée.",true);
  }catch(err){say("Importation impossible : "+(err?.message||String(err)))}
  finally{b.disabled=false;b.textContent="Importer le pack de contenu · 53 créateurs";input.value=""}
 });
 b.addEventListener("click",()=>input.click());
 host.prepend(input);host.prepend(b);
}
function addAdminModeration(){
 if(typeof currentProfile==="undefined"||currentProfile?.role!=="admin")return;
 addTestCreatorButton();
 addTestSpectatorButton();
 addDemoPostsImport();
 const host=el("admin");
 if(!host||el("afroOpenReports"))return;
 const b=document.createElement("button");
 b.id="afroOpenReports";b.type="button";b.className="soft";b.style.cssText="width:100%;margin:10px 0";
 b.innerHTML='<i class="ti ti-shield-check"></i> Modération · Signalements';
 b.addEventListener("click",openReports);
 host.prepend(b);
}
async function openReports(){
 if(currentProfile?.role!=="admin")return;
 ensureOverlays();addStyles();
 el("afroReportsOverlay").hidden=false;
 const box=el("afroReportsBody");
 box.innerHTML='<div class="afro-social-empty">Chargement...</div>';
 const {data,error}=await db.from("social_reports").select("*").order("created_at",{ascending:false}).limit(100);
 if(error){box.innerHTML='<div class="afro-social-empty">'+esc(error.message)+'</div>';return}
 if(!data?.length){box.innerHTML='<div class="afro-social-empty">Aucun signalement pour le moment.</div>';return}
 const ids=[...new Set(data.flatMap(r=>[r.reporter_id,r.reported_user_id].filter(Boolean)))];
 const {data:profiles}=await db.from("profiles").select("id,username,display_name").in("id",ids);
 const pm={};(profiles||[]).forEach(p=>pm[p.id]=p);
 box.innerHTML=data.map(r=>{
  const reporter=pm[r.reporter_id]?.username||"membre";
  const target=r.reported_user_id?(pm[r.reported_user_id]?.username||"compte"):r.post_id?"publication":"commentaire";
  return '<article class="afro-report-card"><b>'+esc(r.reason)+' · '+esc(r.status)+'</b>'
   +'<p>Par @'+esc(reporter)+' · Cible : '+esc(target)+' · '+new Date(r.created_at).toLocaleString("fr-FR")+'</p>'
   +'<p>'+esc(r.details||"Aucun détail")+'</p>'
   +'<div class="afro-report-actions"><button type="button" class="soft" data-report-status="reviewed" data-report-id="'+esc(r.id)+'">Marquer examiné</button>'
   +'<button type="button" class="danger" data-report-status="actioned" data-report-id="'+esc(r.id)+'">Action prise</button></div></article>';
 }).join("");
}
async function setReportStatus(id,status){
 if(currentProfile?.role!=="admin")return;
 const {error}=await db.from("social_reports").update({status}).eq("id",id);
 if(error)return say(error.message);
 await openReports();
 say("Signalement mis à jour.",true);
}

/* ---------- PUBLICATIONS ENREGISTRÉES ---------- */
async function refreshSaved(){
 if(!signed())return;
 const {data,error}=await db.from("post_saves").select("post_id").eq("user_id",currentUser.id).limit(500);
 if(error)return;
 S.saved=new Set((data||[]).map(x=>x.post_id));
 document.querySelectorAll('[data-action="afro-save"]').forEach(paintSave);
}
function paintSave(btn){
 const on=S.saved.has(btn.dataset.post);
 btn.classList.toggle("on",on);
 btn.innerHTML='<i class="ti '+(on?"ti-bookmark-filled":"ti-bookmark")+'"></i><span class="vcount">'+(on?"Enregistré":"Enregistrer")+'</span>';
}
async function toggleSave(btn){
 if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return}
 const id=btn.dataset.post;
 if(!id)return;
 btn.disabled=true;
 const was=S.saved.has(id);
 const res=was
  ?await db.from("post_saves").delete().eq("user_id",currentUser.id).eq("post_id",id)
  :await db.from("post_saves").insert({user_id:currentUser.id,post_id:id});
 btn.disabled=false;
 if(res.error)return say(res.error.message);
 if(was)S.saved.delete(id);else S.saved.add(id);
 paintSave(btn);
}
async function openSaved(){
 if(!signed())return;
 ensureOverlays();addStyles();
 el("afroSavedOverlay").hidden=false;
 const box=el("afroSavedBody");
 box.innerHTML='<div class="afro-social-empty">Chargement...</div>';
 const {data,error}=await db.from("post_saves").select("post_id,created_at").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(100);
 if(error){box.innerHTML='<div class="afro-social-empty">'+esc(error.message)+'</div>';return}
 if(!data?.length){box.innerHTML='<div class="afro-social-empty">Tu n’as encore rien enregistré.</div>';return}
 const ids=data.map(x=>x.post_id);
 const {data:posts}=await db.from("posts").select("id,creator_id,kind,media_path,caption,created_at").in("id",ids);
 const owners=[...new Set((posts||[]).map(p=>p.creator_id))];
 const {data:prof}=owners.length?await db.from("profiles").select("id,username,display_name").in("id",owners):{data:[]};
 const pm={};(prof||[]).forEach(p=>pm[p.id]=p);
 const map={};(posts||[]).forEach(p=>map[p.id]=p);
 const ordered=ids.map(id=>map[id]).filter(Boolean).map(p=>({...p,username:pm[p.creator_id]?.username||"membre"}));
 feedSources.afroSaved=ordered;
 box.innerHTML=ordered.map((p,i)=>
  '<button type="button" class="afro-list-row" data-afro-saved-open="'+i+'">'
  +'<span class="afro-list-avatar"><i class="ti '+(p.kind==="video"?"ti-player-play":"ti-photo")+'"></i></span>'
  +'<span class="afro-list-copy"><b>@'+esc(p.username)+'</b><small>'+esc(p.caption||"Publication")+'</small></span></button>'
 ).join("")||'<div class="afro-social-empty">Ces publications ne sont plus disponibles.</div>';
}

/* ---------- BLOCAGE ET SIGNALEMENTS ---------- */
async function loadBlocked(){
 if(!signed())return;
 const {data}=await db.from("user_blocks").select("blocked_id").eq("blocker_id",currentUser.id);
 S.blocked=new Set((data||[]).map(x=>x.blocked_id));
}
async function blockProfile(id,name){
 if(!signed()||id===currentUser.id)return;
 if(!confirm("Bloquer "+(name||"ce membre")+" ? Vous ne pourrez plus échanger de messages ni voir vos contenus respectifs."))return;
 const {error}=await db.from("user_blocks").insert({blocker_id:currentUser.id,blocked_id:id});
 if(error&&!/duplicate/i.test(error.message))return say("Blocage impossible : "+error.message);
 S.blocked.add(id);
 say("Compte bloqué.",true);
 if(typeof closeProfile==="function")closeProfile();
}
async function reportTarget(fields){
 if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return}
 const reason=(prompt("Motif : "+REPORT_REASONS.join(", "),"other")||"").toLowerCase().trim();
 if(!reason)return;
 if(!REPORT_REASONS.includes(reason))return say("Choisis un motif proposé.");
 const details=(prompt("Détails (facultatif, 500 caractères maximum)","")||"").slice(0,500);
 const {error}=await db.from("social_reports").insert({reporter_id:currentUser.id,reason,details,status:"pending",...fields});
 if(error)return say("Signalement impossible : "+error.message);
 say("Signalement envoyé à l’équipe de modération.",true);
}

/* ---------- FIL D'ACCUEIL : bouton Enregistrer, comptes bloqués masqués ---------- */
function patchFeed(){
 if(typeof vitemHTML==="function"&&!vitemHTML.__afroPatched){
  const old=vitemHTML;
  const patched=function(p){
   const html=old(p);
   const save='<button class="vbtn" data-action="afro-save" data-post="'+esc(p.id)+'" aria-label="Enregistrer"><i class="ti ti-bookmark"></i><span class="vcount">Enregistrer</span></button>';
   return html.includes('class="vbtn vcomments"')
    ? html.replace('<button class="vbtn vcomments"',save+'<button class="vbtn vcomments"')
    : html;
  };
  patched.__afroPatched=true;
  vitemHTML=patched;
 }
 if(typeof loadHomeFeed==="function"&&!loadHomeFeed.__afroPatched){
  const old=loadHomeFeed;
  const patched=async function(){
   await old();
   document.querySelectorAll("#homeFeed .vitem[data-creator]").forEach(n=>{
    if(S.blocked.has(n.dataset.creator))n.remove();
   });
   await refreshSaved();
  };
  patched.__afroPatched=true;
  loadHomeFeed=patched;
 }
}

/* ---------- COMMENTAIRES : réponses, j'aime, signalement ---------- */
async function enhancedComments(){
 const postId=cmPostId;
 if(!postId)return;
 const list=el("cmList");
 const {data:post,error:pe}=await db.from("posts").select("creator_id").eq("id",postId).maybeSingle();
 if(pe){list.innerHTML='<div class="cm-empty">Impossible de charger les commentaires.</div>';return}
 cmPostOwnerId=post?.creator_id||null;
 const {data:rows,error}=await db.from("post_comments")
  .select("id,post_id,user_id,body,created_at,parent_id,likes_count")
  .eq("post_id",postId).order("created_at",{ascending:true}).limit(250);
 if(error){list.innerHTML='<div class="cm-empty">'+esc(error.message)+'</div>';return}
 if(!rows?.length){list.innerHTML='<div class="cm-empty">Aucun commentaire pour le moment. Sois le premier !</div>';return}
 const ids=[...new Set(rows.map(r=>r.user_id))];
 const [{data:profiles},{data:likes}]=await Promise.all([
  db.from("profiles").select("id,username,display_name,avatar_url").in("id",ids),
  signed()?db.from("post_comment_likes").select("comment_id").eq("user_id",currentUser.id).in("comment_id",rows.map(r=>r.id)):Promise.resolve({data:[]})
 ]);
 const pm={};(profiles||[]).forEach(p=>pm[p.id]=p);
 const liked=new Set((likes||[]).map(x=>x.comment_id));
 const roots=rows.filter(r=>!r.parent_id);
 const children={};
 rows.filter(r=>r.parent_id).forEach(r=>(children[r.parent_id]??=[]).push(r));
 const row=r=>{
  const p=pm[r.user_id]||{};
  const own=signed()&&(currentUser.id===r.user_id||currentUser.id===cmPostOwnerId);
  const when=new Date(r.created_at).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  const avatarHtml=typeof cmAvatar==="function"?cmAvatar(p):"";
  return '<div class="afro-comment-row">'+avatarHtml
   +'<div class="afro-comment-text"><b>'+esc(p.display_name||p.username||"Membre")+' <small>@'+esc(p.username||"membre")+'</small></b>'
   +'<span>'+esc(r.body)+'</span><small>'+esc(when)+'</small>'
   +'<div class="afro-comment-actions">'
   +'<button type="button" class="'+(liked.has(r.id)?"liked":"")+'" data-afro-comment-like="'+esc(r.id)+'">♥ '+Number(r.likes_count||0)+'</button>'
   +'<button type="button" data-afro-reply="'+esc(r.id)+'">Répondre</button>'
   +'<button type="button" data-afro-report-comment="'+esc(r.id)+'">Signaler</button>'
   +(own?'<button type="button" data-delete-comment="'+esc(r.id)+'">Supprimer</button>':"")
   +'</div></div></div>';
 };
 list.innerHTML=roots.map(r=>row(r)+(children[r.id]?.length?'<div class="afro-comment-reply">'+children[r.id].map(row).join("")+'</div>':"")).join("");
 list.scrollTop=list.scrollHeight;
}
async function toggleCommentLike(id,btn){
 if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return}
 const was=btn.classList.contains("liked");
 const {error}=was
  ?await db.from("post_comment_likes").delete().eq("comment_id",id).eq("user_id",currentUser.id)
  :await db.from("post_comment_likes").insert({comment_id:id,user_id:currentUser.id});
 if(error)return say(error.message);
 await enhancedComments();
}
async function submitEnhancedComment(e){
 e.preventDefault();
 e.stopImmediatePropagation();
 if(!signed()){if(typeof guestToAuth==="function")guestToAuth();return}
 const input=el("cmInput");
 const text=input.value.trim().slice(0,500);
 if(!text||!cmPostId||cmBusy)return;
 cmBusy=true;
 el("cmSend").disabled=true;
 const row={post_id:cmPostId,user_id:currentUser.id,body:text};
 if(S.replyTo)row.parent_id=S.replyTo;
 const {error}=await db.from("post_comments").insert(row);
 cmBusy=false;
 el("cmSend").disabled=false;
 if(error)return say("Commentaire non envoyé : "+error.message);
 input.value="";
 S.replyTo=null;
 updateReplyLabel();
 await enhancedComments();
}
function updateReplyLabel(){
 const label=el("afroReplying");
 if(!label)return;
 label.textContent=S.replyTo?"Réponse à un commentaire · Annuler":"";
 label.classList.toggle("on",!!S.replyTo);
}
function setReply(id){
 S.replyTo=id;
 updateReplyLabel();
 el("cmInput")?.focus();
}
function wrapComments(){
 if(typeof loadComments==="function"&&!loadComments.__afroPatched){
  const patched=async function(){return enhancedComments()};
  patched.__afroPatched=true;
  loadComments=patched;
 }
}

/* ---------- COMPTE ET VUE ---------- */
function patchAccount(){
 if(typeof loadAccount!=="function"||loadAccount.__afroPatched)return;
 const old=loadAccount;
 const patched=async function(){
  await old();
  if(signed()){await loadBlocked();await refreshSaved()}
 };
 patched.__afroPatched=true;
 loadAccount=patched;
}
function patchView(){
 if(typeof renderView!=="function"||renderView.__afroPatched)return;
 const old=renderView;
 const patched=function(){old();addAdminModeration()};
 patched.__afroPatched=true;
 renderView=patched;
}
function addMenuOptions(){
 const sheet=document.querySelector("#menuSheet .sheet");
 if(!sheet||sheet.querySelector("[data-afro-saved]"))return;
 const b=document.createElement("button");
 b.type="button";b.className="sheet-opt";b.dataset.afroSaved="1";
 b.innerHTML='<i class="ti ti-bookmark"></i><span>Publications enregistrées</span>';
 b.addEventListener("click",()=>{
  if(typeof closeMenuSheet==="function")closeMenuSheet();
  openSaved();
 });
 sheet.querySelector(".sheet-grab")?.after(b);
}

/* ---------- ÉVÉNEMENTS ---------- */
function bindEvents(){
 document.addEventListener("click",e=>{
  const t=e.target.closest("button");
  if(!t)return;
  if(t.matches("[data-saved-close]")){el("afroSavedOverlay").hidden=true;return}
  if(t.matches("[data-reports-close]")){el("afroReportsOverlay").hidden=true;return}
  if(t.matches("[data-report-status]")){setReportStatus(t.dataset.reportId,t.dataset.reportStatus);return}
  if(t.matches("[data-afro-saved-open]")){
   const i=Number(t.dataset.afroSavedOpen);
   if(typeof openFeedFrom==="function")openFeedFrom("afroSaved",i);
   el("afroSavedOverlay").hidden=true;
   return;
  }
  if(t.matches('[data-action="afro-save"]')){toggleSave(t);return}
  if(t.matches("[data-afro-reply]")){setReply(t.dataset.afroReply);return}
  if(t.matches("[data-afro-comment-like]")){toggleCommentLike(t.dataset.afroCommentLike,t);return}
  if(t.matches("[data-afro-report-comment]")){reportTarget({comment_id:t.dataset.afroReportComment});return}
 });
}

function bind(){
 addStyles();
 ensureOverlays();
 addMenuOptions();
 patchFeed();
 patchAccount();
 patchView();
 wrapComments();
 bindEvents();

 const admin=el("admin");
 if(admin&&!admin.__afroObserver){
  new MutationObserver(()=>setTimeout(addAdminModeration,0)).observe(admin,{childList:true,subtree:true});
  admin.__afroObserver=true;
 }
 const cmForm=el("cmForm");
 if(cmForm&&!cmForm.__afroSubmit){
  cmForm.addEventListener("submit",submitEnhancedComment,true);
  cmForm.__afroSubmit=true;
 }
 if(cmForm&&!el("afroReplying")){
  const x=document.createElement("div");
  x.id="afroReplying";x.className="afro-replying";
  x.addEventListener("click",()=>{S.replyTo=null;updateReplyLabel()});
  cmForm.before(x);
 }
 if(signed()){loadBlocked().then(refreshSaved)}
}

if(typeof db!=="undefined"&&db.auth?.onAuthStateChange){
 db.auth.onAuthStateChange((event,session)=>{
  if(!session?.user){S.saved.clear();S.blocked.clear()}
  else if(signed()){loadBlocked().then(refreshSaved)}
 });
}

window.afroBlockProfile=blockProfile;
window.afroReportProfile=reportTarget;
window.afroOpenSaved=openSaved;

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
else bind();
})();
