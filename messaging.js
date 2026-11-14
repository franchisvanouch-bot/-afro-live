/* =========================================================
   AFRO LIVE — messaging.js (v7 : feuille d'envoi)
   Chat clair, médias, vocal, réponse par glissement,
   page d'infos complète : fonds, bulles, sonneries, groupes,
   recherche, médias partagés, épingle, sourdines.
   Dépend de : db, currentUser, currentProfile, message(), guestToAuth(), openProfile()
   Migrations : messagerie_v1, messagerie_medias, messagerie_groupes
   ========================================================= */
(()=>{
"use strict";
if(window.__afroMsgV7)return;
window.__afroMsgV7=true;

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(t,ok=false)=>{if(typeof message==="function")message(t,ok)};
const me=()=>currentUser?.id;
const EMOJIS=["❤️","😂","😭","👍","😡","🤔","😮"];
const ERR={
 blocked:"Impossible : un des deux comptes a bloqué l'autre.",
 rate_limited:"Tu envoies trop vite. Réessaie dans une minute.",
 invalid_body:"Contenu vide ou trop long.",
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
const store=(k,def)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??def}catch(_){return def}};
const persist=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};

/* ---------- CATALOGUES ---------- */
const BACKGROUNDS=[
 {id:"blanc",css:"#ffffff",dark:false},{id:"noir",css:"#0b0b0c",dark:true},
 {id:"g1",css:"linear-gradient(135deg,#667eea,#764ba2)",dark:true},
 {id:"g2",css:"linear-gradient(135deg,#f093fb,#f5576c)",dark:true},
 {id:"g3",css:"linear-gradient(135deg,#4facfe,#00f2fe)",dark:false},
 {id:"g4",css:"linear-gradient(135deg,#43e97b,#38f9d7)",dark:false},
 {id:"g5",css:"linear-gradient(135deg,#fa709a,#fee140)",dark:false},
 {id:"g6",css:"linear-gradient(135deg,#30cfd0,#330867)",dark:true},
 {id:"g7",css:"linear-gradient(135deg,#a8edea,#fed6e3)",dark:false},
 {id:"g8",css:"linear-gradient(135deg,#ff9a9e,#fecfef)",dark:false},
 {id:"g9",css:"linear-gradient(135deg,#ffecd2,#fcb69f)",dark:false},
 {id:"g10",css:"linear-gradient(135deg,#c471f5,#fa71cd)",dark:true},
 {id:"g11",css:"linear-gradient(135deg,#f6d365,#fda085)",dark:false},
 {id:"g12",css:"linear-gradient(135deg,#84fab0,#8fd3f4)",dark:false},
 {id:"g13",css:"linear-gradient(135deg,#2c3e50,#4ca1af)",dark:true},
 {id:"g14",css:"linear-gradient(135deg,#141e30,#243b55)",dark:true},
 {id:"g15",css:"linear-gradient(135deg,#0f2027,#203a43,#2c5364)",dark:true},
 {id:"g16",css:"linear-gradient(180deg,#ff512f,#dd2476)",dark:true},
 {id:"g17",css:"linear-gradient(180deg,#1d976c,#93f9b9)",dark:false},
 {id:"g18",css:"linear-gradient(180deg,#654ea3,#eaafc8)",dark:true},
 {id:"g19",css:"radial-gradient(circle at 20% 20%,#ffb347,#ffcc33 40%,#1a1a2e 90%)",dark:true},
 {id:"g20",css:"radial-gradient(circle at 80% 10%,#8e2de2,#4a00e0 60%,#0c0c1d)",dark:true},
 {id:"g21",css:"repeating-linear-gradient(45deg,#f5f5f5 0 12px,#e9e9ef 12px 24px)",dark:false},
 {id:"g22",css:"repeating-radial-gradient(circle at 0 0,#fff7e6 0 14px,#ffe0b2 14px 28px)",dark:false},
 {id:"g23",css:"linear-gradient(135deg,#ff6a00,#ee0979)",dark:true},
 {id:"g24",css:"linear-gradient(135deg,#0ba360,#3cba92)",dark:true}
];
const BUBBLES=[
 {id:"bleu",g:"linear-gradient(120deg,#3a6bff,#7a4dff)",c:"#3a6bff"},
 {id:"orange",g:"linear-gradient(120deg,#ff6a00,#ff9a35)",c:"#ff6a00"},
 {id:"vert",g:"linear-gradient(120deg,#22c55e,#16a34a)",c:"#22c55e"},
 {id:"rouge",g:"linear-gradient(120deg,#e5484d,#b91c1c)",c:"#e5484d"},
 {id:"violet",g:"linear-gradient(120deg,#8a4dff,#c471f5)",c:"#8a4dff"},
 {id:"turquoise",g:"linear-gradient(120deg,#14b8a6,#0d9488)",c:"#14b8a6"},
 {id:"rose",g:"linear-gradient(120deg,#ec4899,#be185d)",c:"#ec4899"},
 {id:"ardoise",g:"linear-gradient(120deg,#111827,#374151)",c:"#111827"}
];
const TONES={
 none:{name:"Aucune",notes:[]},
 carillon:{name:"Carillon",notes:[[784,.25],[988,.25],[1175,.25],[1568,.5]]},
 tamtam:{name:"Tam-tam",notes:[[196,.12],[196,.12],[147,.2],[196,.12],[220,.3]]},
 kora:{name:"Kora",notes:[[523,.18],[659,.18],[784,.18],[659,.18],[1046,.4]]},
 balafon:{name:"Balafon",notes:[[1319,.1],[1047,.1],[1319,.1],[880,.2]]},
 sanza:{name:"Sanza",notes:[[880,.12],[1175,.12],[988,.12],[1318,.25]]},
 djembe:{name:"Djembé",notes:[[110,.15],[110,.15],[165,.3]]},
 sonar:{name:"Sonar",notes:[[1760,.35],[1760,.35]]},
 pulsation:{name:"Pulsation",notes:[[440,.1],[440,.1],[660,.1],[660,.1],[880,.3]]}
};

/* ---------- ÉTAT ---------- */
const S={
 list:[],showArch:false,conv:null,other:null,otherName:"",otherUser:"",otherAvatar:null,isGroup:false,
 msgs:[],reacts:new Map(),reads:{},reply:null,edit:null,
 chan:null,listChan:null,typingTimer:null,typingAt:0,sending:false,firstLoad:true,
 rec:null,recChunks:[],recStart:0,recTimer:null,recCancel:false,recStream:null,actx:null,
 prefs:store("afroMsgPrefs",{}),           // par conversation : {mute,muteCalls,pin,bg,bubble}
 plain:store("afroMsgPlain",{}),           // style de bulle par message
 ringtone:store("afroRingtone","carillon")
};
const P=id=>S.prefs[id]||{};
const setP=(id,k,v)=>{S.prefs[id]={...P(id),[k]:v};persist("afroMsgPrefs",S.prefs)};

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
 .mx-pin{color:#999;font-size:12px}
 .mx-av{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:0 0 46px;background:#e5e5ea}
 .mx-av-t{display:grid;place-items:center;color:#fff;font-weight:700;background:linear-gradient(135deg,#3a6bff,#8a4dff)}
 .mx-empty{color:#888;text-align:center;padding:40px 20px;font-size:14px}

 .mx-chat{position:fixed;inset:0;z-index:2147483100;background:#fff;color:#111;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)}
 .mx-chat.dark{color:#fff}
 .mx-chat[hidden],.mx-info[hidden],.mx-pg[hidden],.mx-menu-bg[hidden]{display:none!important}
 .mx-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(0,0,0,.08);background:inherit}
 .mx-back{border:0;background:none;font-size:34px;color:#3a6bff;padding:0 8px;line-height:1}
 .mx-title{flex:1;min-width:0;display:flex;align-items:center;gap:10px;background:none;border:0;text-align:left;padding:0;color:inherit}
 .mx-title .mx-av{width:36px;height:36px;flex:0 0 36px}
 .mx-title b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:inherit}
 .mx-more{border:0;background:none;font-size:22px;color:inherit;padding:0 8px;letter-spacing:2px}
 .mx-thread{flex:1;overflow-y:auto;padding:12px 12px;display:flex;flex-direction:column;gap:2px;background:#fff;-webkit-overflow-scrolling:touch}
 .mx-day{align-self:center;opacity:.6;font-size:12px;margin:14px 0 8px}
 .mx-line{display:flex;flex-direction:column;max-width:82%;position:relative;margin-bottom:6px;transition:transform .12s}
 .mx-line.mine{align-self:flex-end;align-items:flex-end}
 .mx-line.theirs{align-self:flex-start;align-items:flex-start}
 .mx-line.hl .mx-bub{box-shadow:0 0 0 3px #ffd166}
 .mx-group{display:flex;align-items:flex-end;gap:6px}
 .mx-group .mx-av{width:28px;height:28px;flex:0 0 28px}
 .mx-av-slot{width:28px;flex:0 0 28px}
 .mx-bub{position:relative;padding:10px 14px;border-radius:20px;font-size:15px;line-height:1.35;background:#eef0f4;color:#111;white-space:pre-wrap;word-break:break-word;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
 .mx-line.mine .mx-bub{background:var(--mxmine,linear-gradient(120deg,#3a6bff,#7a4dff));color:#fff;border-bottom-right-radius:6px}
 .mx-line.theirs .mx-bub{border-bottom-left-radius:6px}
 .mx-bub.plain{background:transparent!important;color:inherit!important;padding:4px 2px}
 .mx-bub.media{padding:4px;background:#eef0f4}
 .mx-bub.media img,.mx-bub.media video{display:block;max-width:220px;max-height:280px;border-radius:16px;object-fit:cover}
 .mx-bub.media audio{display:block;width:230px;max-width:100%}
 .mx-bub.media .mx-cap{padding:6px 10px 4px;font-size:15px;color:inherit}
 .mx-bub.del{background:none;border:1px dashed #ccc;color:#999;font-style:italic}
 .mx-quote{border-left:3px solid rgba(127,127,127,.6);padding:2px 8px;margin-bottom:6px;font-size:12px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
 .mx-react{position:absolute;bottom:-12px;right:8px;background:#fff;color:#111;border:1px solid #e5e5ea;border-radius:999px;padding:1px 7px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.12)}
 .mx-meta{font-size:11px;opacity:.6;margin-top:4px;padding:0 4px}
 .mx-seen{font-size:11px;opacity:.6;margin-top:3px;align-self:flex-end;padding-right:4px}
 .mx-typing{font-size:12px;opacity:.6;padding:0 16px 4px;min-height:16px}
 .mx-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 12px 6px;padding:8px 12px;background:#f3f4f7;color:#333;border-left:3px solid #3a6bff;border-radius:10px;font-size:13px}
 .mx-bar.rec{border-left-color:#e5484d;color:#e5484d;font-weight:600}
 .mx-bar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .mx-bar button{border:0;background:none;font-size:20px;color:#555}
 .mx-foot{display:flex;align-items:center;gap:6px;padding:8px 10px calc(10px + env(safe-area-inset-bottom));border-top:1px solid rgba(0,0,0,.08);background:#fff}
 .mx-foot input{flex:1;min-width:0;border:0;border-radius:24px;background:#f0f1f4;padding:12px 16px;font-size:16px;color:#111;margin:0}
 .mx-tool{width:36px;height:36px;border:0;background:none;color:#3a6bff;font-size:22px;display:grid;place-items:center;flex:0 0 36px;padding:0}
 .mx-tool.rec{color:#e5484d}
 .mx-send{width:40px;height:40px;border-radius:50%;border:0;background:#3a6bff;color:#fff;font-size:18px;flex:0 0 40px;display:grid;place-items:center}
 .mx-send[hidden]{display:none}
 .mx-chat.dark .mx-foot{background:#111;border-color:rgba(255,255,255,.1)}
 .mx-chat.dark .mx-foot input{background:#22222a;color:#fff}

 .mx-info{position:fixed;inset:0;z-index:2147483150;background:#fff;color:#111;overflow-y:auto;padding:env(safe-area-inset-top) 0 calc(20px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}
 .mx-info-top{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;position:sticky;top:0;background:#fff;z-index:2}
 .mx-info-top button{border:0;background:none;font-size:30px;color:#111;padding:0 8px;line-height:1}
 .mx-hero{display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px 16px 16px}
 .mx-hero .mx-av{width:150px;height:150px;flex:0 0 150px;font-size:54px}
 .mx-hero b{font-size:22px;text-align:center;margin-top:6px}
 .mx-hero small{color:#8e8e93;font-size:15px}
 .mx-quick{display:flex;justify-content:space-around;padding:14px 10px 18px}
 .mx-quick button{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;color:#111;width:33%;text-align:center}
 .mx-quick button i{width:62px;height:62px;border-radius:50%;background:#f0f1f4;display:grid;place-items:center;font-size:26px;color:#111}
 .mx-opt{display:flex;align-items:center;gap:16px;width:100%;border:0;background:none;padding:16px 18px;font-size:16px;color:#111;text-align:left;border-top:1px solid #f0f0f0}
 .mx-opt i.ic{width:26px;text-align:center;font-size:23px;color:#111}
 .mx-opt .mx-ch{margin-left:auto;color:#c7c7cc;font-size:18px}
 .mx-opt.danger,.mx-opt.danger i{color:#fff}
 .mx-opt.danger{background:#8b1d1d;color:#ffb3b3;margin-top:12px;border-top:0}
 .mx-opt.danger i{color:#ffb3b3}
 .mx-switch{margin-left:auto;width:52px;height:32px;border-radius:999px;background:#e5e5ea;position:relative;flex:0 0 52px}
 .mx-switch:after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}
 .mx-switch.on{background:#34c759}
 .mx-switch.on:after{left:23px}
 .mx-tabs{display:flex;justify-content:space-around;border-top:1px solid #e5e5ea;margin-top:20px}
 .mx-tabs button{flex:1;border:0;background:none;padding:14px 0;font-size:22px;color:#8e8e93;border-bottom:2px solid transparent}
 .mx-tabs button.on{color:#111;border-bottom-color:#111}
 .mx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px}
 .mx-grid button{position:relative;border:0;background:#eee;padding:0;aspect-ratio:1/1;overflow:hidden}
 .mx-grid img,.mx-grid video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
 .mx-grid .aud{display:grid;place-items:center;height:100%;font-size:30px;color:#3a6bff;background:#eef0f4}
 .mx-grid .vd{position:absolute;right:6px;bottom:6px;color:#fff;font-size:14px;text-shadow:0 1px 3px #000}
 .mx-tab-empty{color:#8e8e93;text-align:center;padding:30px 16px;font-size:14px}

 .mx-pg{position:fixed;inset:0;z-index:2147483160;background:#fff;color:#111;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)}
 .mx-pg-top{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #eee}
 .mx-pg-top button{border:0;background:none;font-size:30px;color:#3a6bff;padding:0 6px;line-height:1}
 .mx-pg-top b{flex:1;font-size:17px}
 .mx-pg-top .ok{font-size:15px;font-weight:700;color:#3a6bff}
 .mx-pg-body{flex:1;overflow-y:auto;padding:14px;-webkit-overflow-scrolling:touch}
 .mx-sw-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
 .mx-sw{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;color:#111}
 .mx-sw span{width:64px;height:90px;border-radius:14px;display:block;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
 .mx-sw.on span{box-shadow:0 0 0 3px #3a6bff}
 .mx-dot{width:44px;height:44px;border-radius:50%;display:block;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
 .mx-pick{display:flex;align-items:center;gap:14px;width:100%;border:0;background:none;padding:14px 4px;font-size:16px;color:#111;text-align:left;border-top:1px solid #f0f0f0}
 .mx-pick .ck{margin-left:auto;color:#3a6bff;font-size:20px}
 .mx-pick .pl{width:40px;height:40px;border-radius:50%;border:0;background:#f0f1f4;color:#3a6bff;font-size:16px}
 .mx-input{width:100%;border:0;border-radius:14px;background:#f0f1f4;padding:12px 14px;font-size:16px;color:#111;margin:0 0 12px}
 .mx-user{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;padding:10px 2px;text-align:left;color:#111;border-top:1px solid #f0f0f0}
 .mx-user .ck{margin-left:auto;width:24px;height:24px;border-radius:50%;border:2px solid #c7c7cc;display:grid;place-items:center;font-size:14px;color:#fff}
 .mx-user.on .ck{background:#3a6bff;border-color:#3a6bff}
 .mx-cta{width:100%;border:0;border-radius:14px;background:#3a6bff;color:#fff;padding:14px;font-size:16px;font-weight:700;margin-top:14px}
 .mx-found{display:block;width:100%;border:0;background:none;text-align:left;padding:12px 2px;border-top:1px solid #f0f0f0;color:#111;font-size:15px}
 .mx-found small{display:block;color:#8e8e93;margin-top:3px;font-size:12px}

 .mx-menu-bg{position:fixed;inset:0;z-index:2147483200;background:rgba(255,255,255,.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
 .mx-menu{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(340px,calc(100vw - 24px));background:#fff;border-radius:24px;box-shadow:0 14px 40px rgba(0,0,0,.2);overflow:hidden;color:#111;padding-bottom:6px}
 .mx-emojis{display:flex;justify-content:space-around;align-items:center;padding:12px 8px;border-bottom:1px solid #f0f0f0}
 .mx-emojis button{border:0;background:none;font-size:26px;padding:2px;line-height:1}
 .mx-item{display:flex;align-items:center;gap:14px;width:100%;border:0;background:none;padding:14px 18px;font-size:15px;color:#111;text-align:left;border-top:1px solid #f4f4f6}
 .mx-item i{width:20px;text-align:center;font-size:19px;color:#444}
 .mx-item.danger,.mx-item.danger i{color:#e5484d}
 .mx-postcard{padding:4px;background:#eef0f4}
 .mx-pc{position:relative;width:220px;height:300px;border-radius:16px;overflow:hidden;background:#000}
 .mx-pc img,.mx-pc video{width:100%;height:100%;object-fit:cover;display:block}
 .mx-pc-who{position:absolute;left:10px;bottom:10px;color:#fff;font-weight:700;font-size:14px;text-shadow:0 1px 4px #000}
 .mx-pc-play{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:40px;text-shadow:0 2px 8px #000;opacity:.9;pointer-events:none}
 .mx-imgview{position:fixed;inset:0;z-index:2147483300;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center}
 .mx-imgview img,.mx-imgview video{max-width:100vw;max-height:100vh;object-fit:contain}
 .mx-imgview-tools{position:absolute;top:calc(env(safe-area-inset-top) + 12px);right:14px;display:flex;gap:10px;z-index:2}
 .mx-imgview-tools button{width:44px;height:44px;border:1px solid rgba(255,255,255,.22);border-radius:50%;background:rgba(25,25,25,.72);color:#fff;font-size:24px;display:grid;place-items:center}
 .mx-imgview-tools button:active{background:#ff7900}
 .mx-imgview-tools .mx-img-close{font-size:30px}
 `;
 document.head.appendChild(s);
}

/* ---------- MENUS ET PAGES ---------- */
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

/* Page plein écran générique (fonds, bulles, sonneries, groupe, recherche, médias) */
function openPage(title,body,opts={}){
 css();
 let pg=$("mxPg");
 if(!pg){
  pg=document.createElement("section");
  pg.id="mxPg";pg.className="mx-pg";pg.hidden=true;
  document.body.appendChild(pg);
 }
 pg.innerHTML=`<div class="mx-pg-top"><button type="button" data-pg-back aria-label="Retour">‹</button><b>${esc(title)}</b>${opts.action?`<button type="button" class="ok" data-pg-action>${esc(opts.action)}</button>`:"<span></span>"}</div><div class="mx-pg-body">${body}</div>`;
 pg.hidden=false;
 pg.querySelector("[data-pg-back]").onclick=()=>{pg.hidden=true;if(opts.onClose)opts.onClose()};
 const act=pg.querySelector("[data-pg-action]");
 if(act&&opts.onAction)act.onclick=()=>opts.onAction(pg);
 if(opts.bind)opts.bind(pg.querySelector(".mx-pg-body"),pg);
 return pg;
}
function closePage(){if($("mxPg"))$("mxPg").hidden=true}

/* ---------- LISTE ---------- */
function ensureList(){
 css();
 const host=$("notifsList");
 if(!host)return;
 // Le conteneur est partagé avec les notifications classiques : si son contenu
 // a été remplacé, on réaffiche la cloche sans reconstruire la messagerie.
 if($("mxRows")){
  if(!host.querySelector("#enablePushNotifications")&&window.afroPushSetupMarkup){
   host.insertAdjacentHTML("afterbegin",window.afroPushSetupMarkup());
  }
  return;
 }
 host.innerHTML=`<div class="mx-page">
  ${window.afroPushSetupMarkup?window.afroPushSetupMarkup():""}
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
  openConv(row.dataset.conv,row.dataset.other||null,row.dataset.name,row.dataset.group==="1");
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
  .filter(c=>!q||`${c.other_username||""} ${c.other_name||""}`.toLowerCase().includes(q))
  .sort((a,b)=>(P(b.conversation_id).pin?1:0)-(P(a.conversation_id).pin?1:0));
 rows.innerHTML=shown.length?shown.map(c=>{
  const group=!c.other_id;
  const name=c.other_name||c.other_username||"Membre";
  let last="Dis bonjour 👋";
  if(c.last_deleted)last="Message supprimé";
  else if(c.last_body)last=(c.last_sender_id===me()?"Toi : ":"")+c.last_body;
  return `<button class="mx-row" data-conv="${esc(c.conversation_id)}" data-other="${esc(c.other_id||"")}" data-name="${esc(name)}" data-group="${group?"1":"0"}">
   ${group?`<span class="mx-av mx-av-t">👥</span>`:avatarHTML(c.other_avatar,name)}
   <span class="mx-row-t"><b>${esc(name)}</b><small>${esc(last)}</small></span>
   <span class="mx-row-side">${P(c.conversation_id).pin?'<span class="mx-pin"><i class="ti ti-pin"></i></span>':""}<span>${hm(c.last_at)}</span>${c.unread&&!P(c.conversation_id).mute?`<i class="mx-badge">${c.unread}</i>`:""}</span>
  </button>`;
 }).join(""):`<div class="mx-empty">${S.showArch?"Aucune conversation archivée.":"Aucune conversation. Ouvre le profil d'un créateur et appuie sur Message."}</div>`;
}
function updateBadge(){
 const total=S.list.filter(c=>!c.archived&&!P(c.conversation_id).mute).reduce((n,c)=>n+Number(c.unread||0),0);
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
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"msg_messages"},p=>{
   const row=p.new||{};
   if(row.sender_id&&row.sender_id!==me()&&!P(row.conversation_id).mute)playTone(S.ringtone);
   refresh();
  })
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"msg_members"},refresh)
  .subscribe();
}

/* ---------- SONS ---------- */
function playTone(key){
 const t=TONES[key];
 if(!t||!t.notes.length)return;
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return;
 const ctx=S.actx||(S.actx=new AC());
 if(ctx.state==="suspended")ctx.resume().catch(()=>{});
 let when=ctx.currentTime+0.02;
 t.notes.forEach(([f,d])=>{
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type="triangle";o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,when);
  g.gain.exponentialRampToValueAtTime(0.25,when+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,when+d);
  o.connect(g);g.connect(ctx.destination);
  o.start(when);o.stop(when+d+0.02);
  when+=d;
 });
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
 $("mxFileGal").addEventListener("change",handleFiles);
 $("mxFileCam").addEventListener("change",handleFiles);

 const th=$("mxThread");
 let lpTimer=null,sx=0,sy=0,dx=0,swipeEl=null,swipeId=null;
 th.addEventListener("touchstart",e=>{
  const line=e.target.closest(".mx-line");
  if(!line||e.touches.length!==1){swipeEl=null;return}
  sx=e.touches[0].clientX;sy=e.touches[0].clientY;dx=0;
  swipeEl=line;swipeId=line.dataset.id;
  clearTimeout(lpTimer);
  lpTimer=setTimeout(()=>{lpTimer=null;const id=swipeId;swipeEl=null;if(id)msgMenu(id)},450);
 },{passive:true});
 th.addEventListener("touchmove",e=>{
  if(!swipeEl)return;
  const t=e.touches[0],mx=t.clientX-sx,my=t.clientY-sy;
  if(Math.abs(mx)>10||Math.abs(my)>10){clearTimeout(lpTimer);lpTimer=null}
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
  if(img)viewMedia("image",img.dataset.mxImg,img.closest(".mx-line")?.dataset.id);
  const vid=e.target.closest("[data-mx-vid]");
  if(vid)viewMedia("video",vid.dataset.mxVid,vid.closest(".mx-line")?.dataset.id);
  const pc=e.target.closest("[data-mx-post]");
  if(pc)openSharedPost(pc.dataset.mxPost,pc.dataset.creator);
 });
}
function syncComposer(){
 const has=!!$("mxInput").value.trim();
 $("mxSend").hidden=!has;
 $("mxMic").hidden=has;$("mxGal").hidden=has;$("mxCam").hidden=has;
}
function viewMedia(kind,url,messageId){
 const v=document.createElement("div");v.className="mx-imgview";
 const media=kind==="video"?`<video src="${esc(url)}" controls autoplay playsinline></video>`:kind==="audio"?`<audio src="${esc(url)}" controls autoplay style="width:min(90vw,360px)"></audio>`:`<img src="${esc(url)}" alt="">`;
 v.innerHTML=`${media}<div class="mx-imgview-tools"><button type="button" class="mx-img-close" data-img-close aria-label="Fermer">×</button>${kind==="image"?'<button type="button" data-img-options aria-label="Options de la photo">⋮</button>':""}</div>`;
 const close=()=>{const video=v.querySelector("video");if(video)video.pause();v.remove()};
 v.querySelector("[data-img-close]").addEventListener("click",close);
 v.querySelector("[data-img-options]")?.addEventListener("click",()=>imageMenu(messageId,url,close));
 v.addEventListener("click",e=>{if(e.target===v)close()});document.body.appendChild(v);
}
async function imageMenu(messageId,url,closeViewer){
 const m=S.msgs.find(x=>x.id===messageId);if(!m)return say("Cette photo n'est plus disponible.");
 const mine=m.sender_id===me();
 const options=item("save",messageId,"ti-download","Enregistrer la photo")+(mine?item("delete",messageId,"ti-trash","Supprimer la photo","danger"):item("report",messageId,"ti-flag","Signaler la photo","danger"));
 sheet(options,async(action)=>{
  if(action==="save"){
   try{const response=await fetch(url);if(!response.ok)throw new Error("Téléchargement impossible");
    const blob=await response.blob(),file=new File([blob],"afro-live-photo.jpg",{type:blob.type||"image/jpeg"});
    if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:"Photo AFRO LIVE"});return}
    const objectUrl=URL.createObjectURL(blob),a=document.createElement("a");a.href=objectUrl;a.download="afro-live-photo.jpg";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);say("Photo enregistrée.",true);
   }catch(e){if(e?.name!=="AbortError")say("Impossible d'enregistrer la photo : "+(e.message||"réessaie"))}return;
  }
  if(action==="delete"){
   if(!confirm("Supprimer cette photo pour tout le monde ?"))return;
   const r=await db.rpc("msg_delete",{p_message:messageId,p_for_all:true});if(r.error)return say(frErr(r.error));
   closeViewer();await fetchAll();say("Photo supprimée.",true);return;
  }
  if(action==="report"){
   const reason=prompt("Pourquoi signales-tu cette photo ? (spam, harassment, hate, nudity, violence, scam, other)","other");if(!reason)return;
   const {error}=await db.from("social_reports").insert({reporter_id:me(),reported_user_id:m.sender_id,reason:reason.toLowerCase().trim(),status:"pending",details:"Photo dans la messagerie · message "+messageId});
   if(error)return say(error.message);say("Signalement envoyé.",true);
  }
 });
}

/* ---------- APPLIQUER LES RÉGLAGES DE LA CONVERSATION ---------- */
function applyPrefs(){
 const chat=$("mxChat"),th=$("mxThread");
 if(!chat||!th||!S.conv)return;
 const p=P(S.conv);
 const bg=BACKGROUNDS.find(b=>b.id===p.bg)||BACKGROUNDS[0];
 chat.style.background=bg.css;
 chat.classList.toggle("dark",!!bg.dark);
 const bub=BUBBLES.find(b=>b.id===p.bubble)||BUBBLES[0];
 th.style.setProperty("--mxmine",bub.g);
 th.style.background="transparent";
}

/* ---------- OUVERTURE / FERMETURE ---------- */
async function openConv(convId,otherId,name,isGroup=false){
 if(!currentUser)return;
 ensureChat();
 const row=S.list.find(c=>c.conversation_id===convId);
 S.conv=convId;S.other=otherId||null;S.isGroup=!!(isGroup||row&&!row.other_id);
 S.otherName=row?.other_name||row?.other_username||name||(S.isGroup?"Groupe":"Membre");
 S.otherUser=row?.other_username||"";
 S.otherAvatar=row?.other_avatar||null;
 S.reply=null;S.edit=null;S.firstLoad=true;setBar(null);
 $("mxTitle").innerHTML=(S.isGroup?'<span class="mx-av mx-av-t">👥</span>':avatarHTML(S.otherAvatar,S.otherName))+`<b>${esc(S.otherName)}</b>`;
 $("mxChat").hidden=false;
 applyPrefs();
 $("mxThread").innerHTML='<div class="mx-empty">Chargement...</div>';
 syncComposer();
 subscribeConv(convId);
 await markRead();
 await fetchAll();
}
function closeChat(){
 leaveConv();
 if(S.rec)stopRec(true);
 S.conv=null;S.other=null;S.isGroup=false;
 if($("mxChat"))$("mxChat").hidden=true;
 if($("mxInfo"))$("mxInfo").hidden=true;
 closePage();
 loadList();
}
function leaveConv(){if(S.chan){db.removeChannel(S.chan);S.chan=null}}
async function markRead(){
 if(!S.conv||!currentUser)return;
 await db.from("msg_members").update({last_read_at:new Date().toISOString()}).eq("conversation_id",S.conv).eq("user_id",me());
}

/* ---------- DONNÉES ---------- */
async function fetchAll(){
 const convId=S.conv;
 if(!convId)return;
 const [mRes,memRes]=await Promise.all([
  db.from("msg_messages").select("id,sender_id,body,reply_to,created_at,edited_at,deleted_for_all,message_type,media_path,media_duration,shared_post_id")
   .eq("conversation_id",convId).order("created_at",{ascending:true}).limit(200),
  db.from("msg_members").select("user_id,last_read_at").eq("conversation_id",convId)
 ]);
 if(convId!==S.conv)return;
 if(mRes.error){$("mxThread").innerHTML=`<div class="mx-empty">${esc(frErr(mRes.error))}</div>`;return}
 S.msgs=mRes.data||[];
 S.posts={};S.postUsers={};
 const postIds=[...new Set(S.msgs.map(m=>m.shared_post_id).filter(Boolean))];
 if(postIds.length){
  const {data:ps}=await db.from("posts").select("id,kind,media_path,caption,creator_id").in("id",postIds);
  (ps||[]).forEach(p=>S.posts[p.id]=p);
  const creators=[...new Set((ps||[]).map(p=>p.creator_id))];
  if(creators.length){
   const {data:pr}=await db.from("profiles").select("id,username,display_name").in("id",creators);
   (pr||[]).forEach(p=>S.postUsers[p.id]=p);
  }
 }
 if(convId!==S.conv)return;
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
 if(m.message_type==="post")return "🎬 Publication";
 return m.body||"";
}
function replyHTML(m){
 if(!m.reply_to)return "";
 const p=S.msgs.find(x=>x.id===m.reply_to);
 return p?`<div class="mx-quote">${esc(bodyOf(p))}</div>`:"";
}
function contentHTML(m){
 if(m.deleted_for_all)return `<div class="mx-bub del">Message supprimé</div>`;
 if(m.message_type==="post"){
  const p=S.posts[m.shared_post_id];
  if(!p)return `<div class="mx-bub del">Publication indisponible</div>`;
  const url=mediaUrl(p.media_path);
  const thumb=p.kind==="video"?`<video src="${esc(url)}" muted preload="metadata"></video>`:`<img src="${esc(url)}" alt="" loading="lazy">`;
  const who=S.postUsers[p.creator_id]?.username||"";
  return `<div class="mx-bub media mx-postcard" data-mx-post="${esc(p.id)}" data-creator="${esc(p.creator_id)}">${replyHTML(m)}<div class="mx-pc">${thumb}<span class="mx-pc-who">${esc(who)}</span><span class="mx-pc-play"><i class="ti ti-player-play"></i></span></div>${m.body?`<div class="mx-cap">${esc(m.body)}</div>`:""}</div>`;
 }
 const isMedia=["image","video","audio"].includes(m.message_type)&&m.media_path;
 const plain=S.plain[m.id]||P(S.conv).plain;
 if(!isMedia)return `<div class="mx-bub${plain?" plain":""}">${replyHTML(m)}${esc(m.body||"")}</div>`;
 const url=mediaUrl(m.media_path);
 let inner="";
 if(m.message_type==="image")inner=`<img src="${esc(url)}" alt="" data-mx-img="${esc(url)}" loading="lazy">`;
 if(m.message_type==="video")inner=`<video src="${esc(url)}" controls playsinline preload="metadata" data-mx-vid="${esc(url)}"></video>`;
 if(m.message_type==="audio")inner=`<audio src="${esc(url)}" controls preload="metadata"></audio>`;
 const cap=m.body?`<div class="mx-cap">${esc(m.body)}</div>`:"";
 return `<div class="mx-bub media">${replyHTML(m)}${inner}${cap}</div>`;
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
  const reactHtml=Object.keys(counts).length?`<span class="mx-react">${Object.entries(counts).map(([e,n])=>e+(n>1?" "+n:"")).join(" ")}</span>`:"";
  const seen=mine&&i===lastMine&&otherRead&&otherRead>=new Date(m.created_at)&&!S.isGroup;
  const content=contentHTML(m).replace(/<\/div>$/,reactHtml+"</div>");
  const avatar=!mine?(lastOfGroup?avatarHTML(S.otherAvatar,m.sender_name||S.otherName):'<span class="mx-av-slot"></span>'):"";
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

/* ---------- BARRE ---------- */
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

/* ---------- ENVOI ---------- */
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
function setBusy(on,label){
 $("mxSend").disabled=on;
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
   sendMedia(new File([blob],"vocal."+(type.includes("mp4")?"m4a":"webm"),{type:blob.type}),"audio",dur);
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
 const extra=(m.message_type==="post"?item("open",id,"ti-player-play","Ouvrir la publication"):"")+(!mine?item("report",id,"ti-flag","Signaler","danger"):"");
 sheet(emojis+items+extra,msgAction);
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
 if(a==="open"){if(m.shared_post_id)return openSharedPost(m.shared_post_id,null);return}
 if(a==="report"){
  const reason=prompt("Motif : spam, harassment, hate, nudity, violence, scam, other","other");
  if(!reason)return;
  const row={reporter_id:me(),reported_user_id:m.sender_id,reason:reason.toLowerCase().trim(),status:"pending",details:"Message "+id+(m.shared_post_id?" · publication "+m.shared_post_id:"")};
  if(m.shared_post_id)row.post_id=m.shared_post_id;
  const {error}=await db.from("social_reports").insert(row);
  return say(error?error.message:"Signalement envoyé.",!error);
 }
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
  if(S.plain[id])delete S.plain[id];else S.plain[id]=true;
  persist("afroMsgPlain",S.plain);renderThread();return;
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
 sec.addEventListener("click",e=>onInfoClick(e));
}
function openInfo(){
 if(!S.conv)return;
 ensureInfo();
 renderInfo();
 $("mxInfo").hidden=false;
 $("mxInfo").scrollTop=0;
 loadInfoMedia("all");
}
function renderInfo(){
 const sec=$("mxInfo");
 if(!sec||!S.conv)return;
 const p=P(S.conv);
 const bg=BACKGROUNDS.find(b=>b.id===p.bg);
 const bub=BUBBLES.find(b=>b.id===p.bubble)||BUBBLES[0];
 const ring=TONES[S.ringtone]?.name||"Carillon";
 const opt=(k,icon,label,right="",cls="")=>`<button class="mx-opt ${cls}" data-o="${k}"><i class="ti ${icon} ic"></i><span>${label}</span>${right}</button>`;
 const chev='<i class="ti ti-chevron-right mx-ch"></i>';
 const sw=on=>`<span class="mx-switch ${on?"on":""}"></span>`;
 sec.innerHTML=`
  <div class="mx-info-top"><button type="button" data-o="back" aria-label="Retour">‹</button><button type="button" data-o="more" aria-label="Options" style="font-size:22px;letter-spacing:2px">•••</button></div>
  <div class="mx-hero">
   ${S.isGroup?'<span class="mx-av mx-av-t">👥</span>':avatarHTML(S.otherAvatar,S.otherName)}
   <b>${esc(S.otherName)}</b>
   ${S.isGroup?'<small>Groupe</small>':S.otherUser?`<small>@${esc(S.otherUser)}</small>`:""}
  </div>
  <div class="mx-quick">
   ${S.isGroup?'<button type="button" data-q="members"><i class="ti ti-users"></i>Membres</button>':'<button type="button" data-q="group"><i class="ti ti-users-plus"></i>Créer un groupe</button>'}
   ${S.isGroup?'<button type="button" data-q="rename"><i class="ti ti-pencil"></i>Renommer</button>':'<button type="button" data-q="profile"><i class="ti ti-user"></i>Voir le profil</button>'}
   <button type="button" data-q="search"><i class="ti ti-search"></i>Rechercher</button>
  </div>
  ${opt("bubble","ti-palette","Bulle de chat",`<span class="mx-ch" style="width:18px;height:18px;border-radius:50%;background:${bub.c}"></span>${chev}`)}
  ${opt("bg","ti-photo","Fond d'écran",`<span class="mx-ch" style="width:18px;height:18px;border-radius:5px;background:${bg?bg.css:"#fff"};box-shadow:inset 0 0 0 1px #ccc"></span>${chev}`)}
  ${opt("ring","ti-music","Sonneries d'alerte",`<span class="mx-ch" style="font-size:13px;color:#8e8e93">${esc(ring)}</span>${chev}`)}
  ${opt("mute","ti-bell-off","Mettre les messages en sourdine",sw(p.mute))}
  ${opt("mutecalls","ti-phone-off","Mettre les appels en sourdine",sw(p.muteCalls))}
  ${opt("pin","ti-pin","Épingler en haut",sw(p.pin))}
  ${opt("archive","ti-archive","Archiver la conversation")}
  ${opt("report","ti-flag","Signaler",chev)}
  ${S.isGroup?opt("leave","ti-logout","Quitter le groupe","","danger"):opt("block","ti-ban","Bloquer","","danger")}
  <div class="mx-tabs">
   <button type="button" class="on" data-tab="all" aria-label="Médias"><i class="ti ti-share-3"></i></button>
   <button type="button" data-tab="image" aria-label="Photos"><i class="ti ti-photo"></i></button>
   <button type="button" data-tab="audio" aria-label="Vocaux"><i class="ti ti-bookmark"></i></button>
  </div>
  <div id="mxInfoGrid"></div>`;
}
async function loadInfoMedia(kind){
 const sec=$("mxInfo");
 if(!sec)return;
 sec.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("on",b.dataset.tab===kind));
 const box=$("mxInfoGrid");
 box.innerHTML='<div class="mx-tab-empty">Chargement…</div>';
 let q=db.from("msg_messages").select("id,message_type,media_path,media_duration,created_at").eq("conversation_id",S.conv).in("message_type",["image","video","audio"]).eq("deleted_for_all",false).order("created_at",{ascending:false}).limit(120);
 if(kind!=="all")q=q.eq("message_type",kind);
 const {data,error}=await q;
 if(error){box.innerHTML=`<div class="mx-tab-empty">${esc(frErr(error))}</div>`;return}
 const rows=(data||[]).filter(r=>r.media_path);
 if(!rows.length){box.innerHTML='<div class="mx-tab-empty">Aucun média partagé dans cette conversation.</div>';return}
 box.innerHTML=`<div class="mx-grid">${rows.map(r=>{
  const url=mediaUrl(r.media_path);
  if(r.message_type==="image")return `<button type="button" data-view="image" data-url="${esc(url)}"><img src="${esc(url)}" alt="" loading="lazy"></button>`;
  if(r.message_type==="video")return `<button type="button" data-view="video" data-url="${esc(url)}"><video src="${esc(url)}" muted preload="metadata"></video><span class="vd"><i class="ti ti-player-play"></i></span></button>`;
  return `<button type="button" data-view="audio" data-url="${esc(url)}"><span class="aud"><i class="ti ti-microphone"></i></span></button>`;
 }).join("")}</div>`;
}

async function onInfoClick(e){
 const sec=$("mxInfo");
 const back=e.target.closest('[data-o="back"]');
 if(back){sec.hidden=true;return}
 const more=e.target.closest('[data-o="more"]');
 if(more){
  sheet(item("profile","","ti-user","Voir le profil")+item("report","","ti-flag","Signaler")+item("block","","ti-ban","Bloquer","danger"),
   (a)=>{if(a==="profile")goProfile();if(a==="report")reportConv();if(a==="block")blockConv()});
  return;
 }
 const tab=e.target.closest("[data-tab]");
 if(tab){loadInfoMedia(tab.dataset.tab);return}
 const view=e.target.closest("[data-view]");
 if(view){
  if(view.dataset.view==="audio"){viewMedia("audio",view.dataset.url);return}
  viewMedia(view.dataset.view,view.dataset.url);return;
 }
 const q=e.target.closest("[data-q]");
 if(q){
  const k=q.dataset.q;
  if(k==="profile")return goProfile();
  if(k==="search")return openSearch();
  if(k==="group")return openGroupCreate();
  if(k==="members")return openMembers();
  if(k==="rename")return renameGroup();
  return;
 }
 const o=e.target.closest("[data-o]");
 if(!o)return;
 const k=o.dataset.o;
 if(k==="bubble")return openBubblePicker();
 if(k==="bg")return openBgPicker();
 if(k==="ring")return openRingPicker();
 if(k==="mute"){setP(S.conv,"mute",!P(S.conv).mute);renderInfo();loadInfoMedia("all");updateBadge();renderList();return}
 if(k==="mutecalls"){setP(S.conv,"muteCalls",!P(S.conv).muteCalls);renderInfo();loadInfoMedia("all");return}
 if(k==="pin"){setP(S.conv,"pin",!P(S.conv).pin);renderInfo();loadInfoMedia("all");renderList();return}
 if(k==="archive")return archiveConv();
 if(k==="report")return reportConv();
 if(k==="block")return blockConv();
 if(k==="leave")return leaveGroup();
}
function goProfile(){
 if(!S.other){say("Ce groupe n'a pas de profil.");return}
 const id=S.other;
 closeChat();
 if(typeof openProfile==="function")openProfile(id);
}

/* ---------- FONDS ---------- */
function openBgPicker(){
 const cur=P(S.conv).bg||"blanc";
 const grid=BACKGROUNDS.map(b=>`<button type="button" class="mx-sw ${b.id===cur?"on":""}" data-bg="${b.id}"><span style="background:${b.css}"></span></button>`).join("");
 openPage("Fond d'écran",`<div class="mx-sw-grid">${grid}</div><p style="color:#8e8e93;font-size:13px;margin-top:14px">Le fond s'applique à cette conversation seulement.</p>`,{
  bind:(body,pg)=>body.addEventListener("click",e=>{
   const b=e.target.closest("[data-bg]");if(!b)return;
   setP(S.conv,"bg",b.dataset.bg);
   applyPrefs();
   body.querySelectorAll(".mx-sw").forEach(x=>x.classList.toggle("on",x===b));
   say("Fond d'écran appliqué.",true);
  })
 });
}

/* ---------- BULLES ---------- */
function openBubblePicker(){
 const cur=P(S.conv).bubble||"bleu";
 const rows=BUBBLES.map(b=>`<button type="button" class="mx-pick" data-bub="${b.id}"><span class="mx-dot" style="background:${b.g}"></span><span>${b.id.charAt(0).toUpperCase()+b.id.slice(1)}</span>${b.id===cur?'<i class="ti ti-check ck"></i>':""}</button>`).join("");
 openPage("Bulle de chat",`<p style="color:#8e8e93;font-size:13px;margin:0 0 6px">Couleur de tes messages dans cette conversation.</p>${rows}`,{
  bind:(body)=>body.addEventListener("click",e=>{
   const b=e.target.closest("[data-bub]");if(!b)return;
   setP(S.conv,"bubble",b.dataset.bub);
   applyPrefs();
   openBubblePicker();
  })
 });
}

/* ---------- SONNERIES ---------- */
function openRingPicker(){
 const rows=Object.entries(TONES).map(([k,t])=>`<button type="button" class="mx-pick" data-ring="${k}"><button type="button" class="pl" data-play="${k}" aria-label="Écouter">▶</button><span>${esc(t.name)}</span>${S.ringtone===k?'<i class="ti ti-check ck"></i>':""}</button>`).join("");
 openPage("Sonneries d'alerte",`<p style="color:#8e8e93;font-size:13px;margin:0 0 6px">Joué quand tu reçois un message pendant que l'application est ouverte.</p>${rows}`,{
  bind:(body)=>body.addEventListener("click",e=>{
   const pl=e.target.closest("[data-play]");
   if(pl){playTone(pl.dataset.play);return}
   const r=e.target.closest("[data-ring]");
   if(!r)return;
   S.ringtone=r.dataset.ring;persist("afroRingtone",S.ringtone);
   playTone(S.ringtone);
   openRingPicker();
  })
 });
}

/* ---------- GROUPES ---------- */
function openGroupCreate(){
 const picked=new Map();
 openPage("Nouveau groupe",`
  <input class="mx-input" id="mxGName" maxlength="60" placeholder="Nom du groupe">
  <input class="mx-input" id="mxGSearch" placeholder="Ajouter des membres (pseudo)" autocomplete="off">
  <div id="mxGRes"></div>`,{
  action:"Créer",
  onAction:async()=>{
   const name=($("mxGName").value||"").trim();
   if(!name)return say("Donne un nom au groupe.");
   if(!picked.size)return say("Ajoute au moins un membre.");
   const {data:convId,error}=await db.rpc("msg_create_group",{p_name:name,p_members:[...picked.keys()]});
   if(error)return say(frErr(error));
   closePage();
   await loadList();
   openConv(convId,null,name,true);
  },
  bind:(body)=>{
   let t=null;
   body.querySelector("#mxGSearch").addEventListener("input",e=>{
    clearTimeout(t);
    t=setTimeout(async()=>{
     const q=e.target.value.trim().replace(/[(),%_]/g,"").slice(0,32);
     const res=body.querySelector("#mxGRes");
     if(q.length<2){res.innerHTML="";return}
     const {data}=await db.from("profiles").select("id,username,display_name,avatar_url").neq("id",me()).ilike("username",q+"%").limit(20);
     res.innerHTML=(data||[]).map(p=>{
      const on=picked.has(p.id);
      return `<button type="button" class="mx-user ${on?"on":""}" data-pick="${p.id}" data-name="${esc(p.display_name||p.username)}">${avatarHTML(p.avatar_url,p.display_name||p.username)}<span><b>${esc(p.display_name||p.username)}</b><small style="color:#8e8e93">@${esc(p.username)}</small></span><span class="ck">${on?"✓":""}</span></button>`;
     }).join("")||'<p class="mx-tab-empty">Aucun membre trouvé.</p>';
    },250);
   });
   body.addEventListener("click",e=>{
    const u=e.target.closest("[data-pick]");
    if(!u)return;
    if(picked.has(u.dataset.pick))picked.delete(u.dataset.pick);
    else picked.set(u.dataset.pick,u.dataset.name);
    u.classList.toggle("on",picked.has(u.dataset.pick));
    u.querySelector(".ck").textContent=picked.has(u.dataset.pick)?"✓":"";
   });
  }
 });
}
async function openMembers(){
 const {data}=await db.from("msg_members").select("user_id").eq("conversation_id",S.conv);
 const ids=(data||[]).map(x=>x.user_id);
 const {data:profs}=ids.length?await db.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):{data:[]};
 const rows=(profs||[]).map(p=>`<div class="mx-user">${avatarHTML(p.avatar_url,p.display_name||p.username)}<span><b>${esc(p.display_name||p.username)}</b><small style="color:#8e8e93">@${esc(p.username)}</small></span></div>`).join("");
 openPage(`Membres (${ids.length})`,rows||'<p class="mx-tab-empty">Aucun membre.</p>');
}
async function renameGroup(){
 const name=prompt("Nouveau nom du groupe",S.otherName);
 if(!name||!name.trim())return;
 const {error}=await db.from("msg_conversations").update({group_name:name.trim().slice(0,60)}).eq("id",S.conv);
 if(error)return say(error.message);
 S.otherName=name.trim().slice(0,60);
 $("mxTitle").innerHTML='<span class="mx-av mx-av-t">👥</span><b>'+esc(S.otherName)+'</b>';
 await loadList();renderInfo();
 say("Groupe renommé.",true);
}
async function leaveGroup(){
 if(!confirm("Quitter ce groupe ?"))return;
 const {error}=await db.rpc("msg_leave_group",{p_conv:S.conv});
 if(error)return say(frErr(error));
 say("Tu as quitté le groupe.",true);
 closeChat();
}

/* ---------- RECHERCHE DANS LA CONVERSATION ---------- */
function openSearch(){
 openPage("Rechercher",`<input class="mx-input" id="mxFind" placeholder="Rechercher un message" autocomplete="off"><div id="mxFound"></div>`,{
  bind:(body)=>{
   body.querySelector("#mxFind").addEventListener("input",e=>{
    const q=e.target.value.trim().toLowerCase();
    const out=body.querySelector("#mxFound");
    if(!q){out.innerHTML="";return}
    const hits=S.msgs.filter(m=>!m.deleted_for_all&&(m.body||"").toLowerCase().includes(q)).slice(-40).reverse();
    out.innerHTML=hits.length?hits.map(m=>`<button type="button" class="mx-found" data-goto="${esc(m.id)}">${esc(m.body)}<small>${esc(dayLabel(m.created_at))}</small></button>`).join(""):'<p class="mx-tab-empty">Aucun résultat.</p>';
   });
   body.addEventListener("click",e=>{
    const g=e.target.closest("[data-goto]");
    if(!g)return;
    closePage();
    $("mxInfo").hidden=true;
    const el=document.querySelector(`#mxThread .mx-line[data-id="${CSS.escape(g.dataset.goto)}"]`);
    if(el){el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.add("hl");setTimeout(()=>el.classList.remove("hl"),1800)}
   });
  }
 });
}

/* ---------- ARCHIVER / SIGNALER / BLOQUER ---------- */
async function archiveConv(){
 await db.from("msg_members").update({archived:true}).eq("conversation_id",S.conv).eq("user_id",me());
 say("Conversation archivée.",true);
 closeChat();
}
async function reportConv(){
 const reason=prompt("Motif : spam, harassment, hate, nudity, violence, scam, other","other");
 if(!reason)return;
 const {error}=await db.from("social_reports").insert({reporter_id:me(),reported_user_id:S.other||null,reason:reason.toLowerCase().trim(),status:"pending"});
 say(error?error.message:"Signalement envoyé.",!error);
}
async function blockConv(){
 if(!S.other)return say("Un groupe ne peut pas être bloqué.");
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
 await openConv(convId,otherId,name,false);
}

/* ---------- CYCLE DE VIE ---------- */
function reset(){
 leaveConv();
 if(S.listChan){db.removeChannel(S.listChan);S.listChan=null}
 Object.assign(S,{list:[],conv:null,other:null,msgs:[],reacts:new Map(),reads:{}});
 if($("mxChat"))$("mxChat").hidden=true;
 if($("mxInfo"))$("mxInfo").hidden=true;
 closePage();
}

/* ---------- PUBLICATION : OUVRIR SUR LE COMPTE DU CRÉATEUR ---------- */
async function openSharedPost(postId,creatorId){
 closeChat();
 // Récupère d'abord la publication exacte partagée dans la conversation.
 const {data:post,error}=await db.from("posts")
  .select("id,kind,media_path,caption,creator_id,created_at")
  .eq("id",postId).maybeSingle();
 if(error||!post)return say("Cette publication n'est plus disponible.");
 const ownerId=post.creator_id||creatorId;
 if(!ownerId)return say("Cette publication n'est plus disponible.");
 // Le profil reste derrière la vidéo : fermer la vidéo ramène donc au profil.
 await openProfile(ownerId);
 const profilePosts=(typeof feedSources!=="undefined"&&feedSources.profile)||[];
 const selected=profilePosts.find(p=>p.id===postId);
 if(!selected)return say("La vidéo partagée est introuvable sur ce profil.");
 if(typeof openFeedFrom!=="function")return say("Impossible d'ouvrir cette vidéo pour le moment.");
 // N'affiche que la publication partagée, pas toute la grille du créateur.
 feedSources.sharedMessage=[selected];
 openFeedFrom("sharedMessage",0);
}

/* ---------- ENVOYER UNE PUBLICATION DANS UNE CONVERSATION ---------- */
const SHARE_CSS=`
.mx-share-bg{position:fixed;inset:0;z-index:2147483250;background:rgba(0,0,0,.45);display:flex;align-items:flex-end}
.mx-share{width:100%;max-height:86dvh;overflow-y:auto;background:#fff;color:#111;border-radius:22px 22px 0 0;padding:14px 0 calc(18px + env(safe-area-inset-bottom))}
.mx-share-top{display:flex;align-items:center;justify-content:space-between;padding:0 16px 12px}
.mx-share-top b{font-size:17px}
.mx-share-x,.mx-share-ic{width:40px;height:40px;border-radius:50%;border:0;background:#f0f1f4;display:grid;place-items:center;font-size:20px;color:#111}
.mx-share-q{display:block;box-sizing:border-box;width:calc(100% - 32px);margin:0 16px 14px;border:0;border-radius:14px;background:#f0f1f4;padding:11px 14px;font-size:16px;color:#111}
.mx-share-people{display:flex;gap:14px;overflow-x:auto;padding:0 16px 14px;scrollbar-width:none}
.mx-share-p{flex:0 0 74px;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:6px;color:#111}
.mx-share-av{width:66px;height:66px;border-radius:50%;object-fit:cover;background:#e5e5ea}
.mx-share-p small{font-size:12px;max-width:74px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mx-share-acts{display:flex;gap:14px;overflow-x:auto;padding:14px 16px;border-top:1px solid #eee;scrollbar-width:none}
.mx-share-acts button{flex:0 0 78px;border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px;color:#111;text-align:center}
.mx-share-acts button span{width:58px;height:58px;border-radius:50%;background:#f0f1f4;display:grid;place-items:center;font-size:24px;color:#111}
`;
function closeShareSheet(){const el=$("mxShare");if(el)el.remove()}

async function openSharePicker(postId){
 if(!currentUser){if(typeof guestToAuth==="function")guestToAuth();return}
 const btn=document.querySelector('.vitem [data-action="msg-share"][data-post="'+CSS.escape(postId)+'"]');
 const post={id:postId,username:btn?.dataset.username||"",caption:btn?.dataset.caption||""};
 closeShareSheet();
 if(!$("mxShareCss")){const st=document.createElement("style");st.id="mxShareCss";st.textContent=SHARE_CSS;document.head.appendChild(st)}
 await loadList();
 const direct=S.list.filter(c=>!c.archived&&c.other_id).map(c=>({key:"c:"+c.other_id,id:c.other_id,conv:c.conversation_id,name:c.other_name||c.other_username||"Membre",avatar:c.other_avatar}));
 const followIds=[...(typeof myFollows!=="undefined"?myFollows:[])].filter(id=>id!==me()&&!direct.some(d=>d.id===id)).slice(0,40);
 let extra=[];
 if(followIds.length){
  const {data}=await db.from("profiles").select("id,username,display_name,avatar_url").in("id",followIds);
  extra=(data||[]).map(p=>({key:"p:"+p.id,id:p.id,conv:null,name:p.display_name||p.username,avatar:p.avatar_url}));
 }
 const contacts=[...direct,...extra];
 const wrap=document.createElement("div");
 wrap.id="mxShare";wrap.className="mx-share-bg";
 const actA=[["repub","ti-repeat","Republier","#ffd21f"],["copy","ti-link","Copier le lien","#2f6bff"],["wa","ti-brand-whatsapp","WhatsApp","#25d366"],["wab","ti-brand-whatsapp","WA Business","#25d366"],["status","ti-brand-whatsapp","Status","#25d366"],["snap","ti-brand-snapchat","Snapchat","#fffc00"]];
 const actB=[["report","ti-alert-triangle","Signaler"],["hide","ti-heart-broken","Pas intéressé(e)"],["promo","ti-flame","Promouvoir"],["group","ti-users","Créer un groupe"],["duo","ti-layout-2","Duo"],["collage","ti-layout-grid","Collage"]];
 wrap.innerHTML=`<div class="mx-share">
  <div class="mx-share-top"><span class="mx-share-ic"><i class="ti ti-search"></i></span><b>Envoyer à</b><button type="button" class="mx-share-x" data-x aria-label="Fermer"><i class="ti ti-x"></i></button></div>
  <input class="mx-share-q" id="mxShareQ" placeholder="Rechercher" autocomplete="off">
  <div class="mx-share-people" id="mxSharePeople"></div>
  <div class="mx-share-acts">${actA.map(([k,i,l,c])=>`<button type="button" data-act="${k}"><span style="background:${c};color:${k==="snap"?"#000":"#fff"}"><i class="ti ${i}"></i></span>${l}</button>`).join("")}</div>
  <div class="mx-share-acts">${actB.map(([k,i,l])=>`<button type="button" data-act="${k}"><span><i class="ti ${i}"></i></span>${l}</button>`).join("")}</div>
 </div>`;
 document.body.appendChild(wrap);
 const renderPeople=q=>{
  const list=contacts.filter(c=>!q||c.name.toLowerCase().includes(q));
  $("mxSharePeople").innerHTML=list.length
   ?list.map(c=>`<button type="button" class="mx-share-p" data-person="${esc(c.key)}">${avatarHTML(c.avatar,c.name,"mx-share-av")}<small>${esc(c.name)}</small></button>`).join("")
   :'<div class="mx-empty" style="padding:10px">Personne trouvée</div>';
 };
 renderPeople("");
 $("mxShareQ").addEventListener("input",e=>renderPeople(e.target.value.trim().toLowerCase()));
 wrap.addEventListener("click",async e=>{
  if(e.target===wrap||e.target.closest("[data-x]")){closeShareSheet();return}
  const pb=e.target.closest("[data-person]");
  if(pb){const c=contacts.find(x=>x.key===pb.dataset.person);if(c)await sendPostTo(c,post);return}
  const ab=e.target.closest("[data-act]");
  if(ab)await shareAction(ab.dataset.act,post);
 });
}
async function sendPostTo(c,post){
 let conv=c.conv;
 if(!conv){
  const {data,error}=await db.rpc("msg_start_conversation",{p_other:c.id});
  if(error)return say(frErr(error));
  conv=data;
 }
 const {error}=await db.rpc("msg_send_post",{p_conv:conv,p_post:post.id,p_body:""});
 if(error)return say(frErr(error));
 say("Publication envoyée à "+c.name+".",true);
 closeShareSheet();
}
async function shareAction(act,post){
 const link=post.username?creatorLink(post.username):location.href;
 const text=(post.username?"Regarde la publication de @"+post.username+" sur AFRO LIVE":"AFRO LIVE")+(post.caption?" : "+post.caption:"");
 closeShareSheet();
 if(act==="copy"){try{await navigator.clipboard.writeText(link);say("Lien copié.",true)}catch(_){say("Copie impossible.")}return}
 if(act==="wa"||act==="wab"||act==="status"){window.open("https://wa.me/?text="+encodeURIComponent(text+" "+link),"_blank","noopener");return}
 if(act==="snap"){
  if(navigator.share){try{await navigator.share({title:"AFRO LIVE",text,url:link})}catch(_){}}
  else{try{await navigator.clipboard.writeText(link);say("Lien copié pour Snapchat.",true)}catch(_){}}
  return;
 }
 if(act==="repub"){
  const rb=document.querySelector('.vbtn[data-action="repost"][data-post="'+CSS.escape(post.id)+'"]');
  if(rb&&typeof toggleRepost==="function")return toggleRepost(rb);
  return say("Republication indisponible.");
 }
 if(act==="report"){if(typeof window.afroReportProfile==="function")return window.afroReportProfile({post_id:post.id});return}
 if(act==="hide"){document.querySelector('.vitem[data-post="'+CSS.escape(post.id)+'"]')?.remove();return say("Publication masquée.",true)}
 if(act==="group")return say("Pour créer un groupe, ouvre Messages puis « Nouveau ».");
 say("Bientôt disponible.");
}
function patchFeed(){
 if(typeof vitemHTML!=="function"||vitemHTML.__mxPatched)return;
 const old=vitemHTML;
 const patched=function(p){
  const html=old(p);
  const btn=`<button class="vbtn" data-action="msg-share" data-post="${esc(p.id)}" data-creator="${esc(p.creator_id||"")}" data-username="${esc(p.username||"")}" data-caption="${esc(p.caption||"")}" aria-label="Envoyer en message"><i class="ti ti-send"></i><span class="vcount">Envoyer</span></button>`;
  return html.includes('class="vbtn vcomments"')?html.replace('<button class="vbtn vcomments"',btn+'<button class="vbtn vcomments"'):html;
 };
 patched.__mxPatched=true;
 vitemHTML=patched;
}
document.addEventListener("click",e=>{
 const b=e.target.closest('[data-action="msg-share"]');
 if(!b)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 openSharePicker(b.dataset.post);
},true);
patchFeed();

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
