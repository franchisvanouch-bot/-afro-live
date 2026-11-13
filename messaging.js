/* =========================================================
   AFRO LIVE — messaging.js
   Messagerie privée. Le style est intégré à ce fichier.
   Hooks utilisés par index.html :
   afroLoadMessagesPage, afroRefreshDMUnread,
   openAfroCreatorConversation, afroReportProfile, afroBlockProfile
   ========================================================= */
(() => {
  if (window.__afroMsgLoaded) return;
  window.__afroMsgLoaded = true;

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hhmm = d => new Date(d).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"});
  const dayLabel = d => {
    const x = new Date(d), t = new Date();
    return x.toDateString() === t.toDateString() ? "Aujourd'hui"
      : x.toLocaleDateString("fr-FR", {day:"numeric", month:"long"});
  };
  const EMOJIS = ["❤️","😂","😮","😢","🔥","👏"];
  const ERRORS = {
    not_authenticated: "Connecte-toi d'abord.",
    invalid_recipient: "Destinataire invalide.",
    recipient_not_found: "Utilisateur introuvable.",
    blocked: "Impossible : un des deux comptes a bloqué l'autre.",
    not_member: "Cette conversation n'est plus accessible.",
    invalid_body: "Message vide ou trop long (2000 caractères max).",
    rate_limited: "Tu envoies trop vite. Réessaie dans une minute.",
    cannot_edit: "Modification impossible (15 minutes maximum).",
    cannot_delete: "Suppression impossible."
  };
  const frErr = e => {
    const m = e?.message || "";
    const k = Object.keys(ERRORS).find(k => m.includes(k));
    return k ? ERRORS[k] : (m || "Erreur inconnue.");
  };
  const me = () => currentUser?.id;
  const toast = (t, ok = false) => { if (typeof message === "function") message(t, ok); };
  const avatar = (url, name) => url
    ? `<img class="msg-av" src="${esc(url)}" alt="">`
    : `<span class="msg-av msg-av-txt">${esc((name || "?").trim().charAt(0).toUpperCase() || "?")}</span>`;

  const S = {
    built: false, conv: null, other: null, otherName: "", list: [], showArch: false,
    msgs: [], reacts: new Map(), reads: {}, reply: null, edit: null,
    chan: null, listChan: null, listUser: null,
    typingTimer: null, typingAt: 0, sending: false, firstLoad: true
  };

  /* ---------- STYLE ---------- */
  const CSS = `
#msgRoot{padding-bottom:96px;color:#fff}
#msgRoot input{margin:0;width:100%;border-radius:999px;padding:11px 14px}
#msgRoot .msg-bar{display:flex;gap:8px;align-items:center;margin:4px 0 10px}
#msgRoot .msg-btn{background:#222226;color:#fff;border:0;border-radius:999px;padding:9px 13px;font-size:13px;font-weight:700;white-space:nowrap}
#msgRoot .msg-row{display:flex;align-items:center;gap:12px;width:100%;background:none;color:#fff;border:0;border-bottom:1px solid #1f1f23;padding:11px 2px;text-align:left;border-radius:0;font-weight:400}
#msgRoot .msg-row b{display:block;font-size:15px}
#msgRoot .msg-row small{display:block;color:#9a9aa2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}
#msgRoot .msg-row.unread b,#msgRoot .msg-row.unread small{color:#fff;font-weight:700}
#msgRoot .msg-txt{flex:1;min-width:0}
#msgRoot .msg-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px;font-size:11px;color:#9a9aa2}
#msgRoot .msg-badge{background:#ff7900;color:#111;border-radius:999px;padding:2px 7px;font-size:11px;font-weight:800;font-style:normal}
#msgRoot .msg-av{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:#222226}
#msgRoot .msg-av-txt{display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;color:#fff}
#msgRoot #msgChatView{display:flex;flex-direction:column;height:calc(100dvh - 205px);min-height:360px}
#msgRoot .msg-chead{display:flex;align-items:center;gap:10px;padding-bottom:9px;border-bottom:1px solid #222226;position:relative}
#msgRoot .msg-chead>button{background:none;color:#fff;border:0;font-size:20px;padding:4px 8px}
#msgRoot #msgTitle{flex:1;min-width:0;display:flex;align-items:center;gap:10px}
#msgRoot .msg-hn{display:flex;flex-direction:column;min-width:0}
#msgRoot .msg-hn b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#msgRoot .msg-hn small{color:#9a9aa2}
#msgRoot #msgMenu{position:absolute;right:0;top:46px;z-index:5;background:#222226;border-radius:12px;padding:6px;min-width:210px;display:flex;flex-direction:column;box-shadow:0 10px 30px #000a}
#msgRoot #msgMenu button{background:none;color:#fff;border:0;text-align:left;padding:11px 10px;font-size:14px}
#msgRoot #msgMenu .danger{color:#ff8a8a}
#msgRoot #msgThread{flex:1;overflow-y:auto;padding:10px 2px;display:flex;flex-direction:column;gap:2px;-webkit-overflow-scrolling:touch}
#msgRoot .msg-day{align-self:center;color:#9a9aa2;font-size:12px;margin:12px 0 6px}
#msgRoot .msg-line{display:flex;flex-direction:column;max-width:82%;margin:2px 0;cursor:pointer}
#msgRoot .msg-line.mine{align-self:flex-end;align-items:flex-end}
#msgRoot .msg-line.theirs{align-self:flex-start;align-items:flex-start}
#msgRoot .msg-bubble{background:#1f1f24;border-radius:16px;padding:8px 12px;max-width:100%}
#msgRoot .msg-line.mine .msg-bubble{background:linear-gradient(135deg,#ff9a35,#ff5a00)}
#msgRoot .msg-bubble.deleted{background:transparent;border:1px dashed #2a2a2e;color:#9a9aa2;font-style:italic}
#msgRoot .msg-text{white-space:pre-wrap;word-break:break-word;font-size:15px;line-height:1.35}
#msgRoot .msg-meta{font-size:10px;opacity:.75;text-align:right;margin-top:3px}
#msgRoot .msg-quote{border-left:3px solid rgba(255,255,255,.6);padding:2px 8px;margin-bottom:6px;font-size:12px;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px}
#msgRoot .msg-reacts{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap}
#msgRoot .msg-reacts span{background:rgba(0,0,0,.45);border-radius:999px;padding:1px 7px;font-size:12px}
#msgRoot .msg-reacts span.on{background:rgba(255,121,0,.6)}
#msgRoot .msg-seen{font-size:11px;color:#9a9aa2;margin-top:2px}
#msgRoot .msg-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;background:#222226;padding:8px;border-radius:12px;max-width:300px}
#msgRoot .msg-actions button{background:#2c2c32;color:#fff;border:0;padding:6px 9px;font-size:13px;border-radius:9px}
#msgRoot .msg-actions .danger{background:#8b1d1d}
#msgRoot #msgTyping{font-size:12px;color:#9a9aa2;min-height:18px;padding:4px 6px 0}
#msgRoot #msgReply{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#222226;padding:8px 12px;border-radius:10px;font-size:13px;margin:4px 0;color:#ddd}
#msgRoot #msgReply span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#msgRoot #msgReply button{background:none;color:#fff;border:0;font-size:20px}
#msgRoot #msgForm{display:flex;gap:8px;align-items:center;padding-top:6px}
#msgRoot #msgForm input{flex:1}
#msgRoot #msgForm button{border-radius:999px;padding:11px 16px;background:#ff7900;color:#111;border:0;font-weight:800}
#msgRoot .msg-empty{color:#9a9aa2;text-align:center;padding:24px 10px;font-size:14px}
`;
  function injectCss() {
    if (document.getElementById("msg-style")) return;
    const s = document.createElement("style");
    s.id = "msg-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- STRUCTURE ---------- */
  function ensureShell() {
    if (S.built) return;
    S.built = true;
    injectCss();
    $("notifsList").innerHTML = `
<div id="msgRoot">
  <div id="msgListView">
    <div class="msg-bar">
      <input id="msgSearch" placeholder="Rechercher une conversation" autocomplete="off">
      <button class="msg-btn" id="msgArch" type="button">Archivées</button>
      <button class="msg-btn" id="msgNew" type="button">Nouveau</button>
    </div>
    <div id="msgNewBox" hidden>
      <input id="msgUserQ" placeholder="Nom d'utilisateur (2 lettres min.)" autocomplete="off">
      <div id="msgUserRes"></div>
    </div>
    <div id="msgList"></div>
  </div>
  <div id="msgChatView" hidden>
    <div class="msg-chead">
      <button id="msgBack" type="button" aria-label="Retour">←</button>
      <div id="msgTitle"></div>
      <button id="msgMenuBtn" type="button" aria-label="Options">⋯</button>
      <div id="msgMenu" hidden>
        <button type="button" data-m="archive">Archiver la conversation</button>
        <button type="button" data-m="report">Signaler</button>
        <button type="button" data-m="block" class="danger">Bloquer</button>
      </div>
    </div>
    <div id="msgThread"></div>
    <div id="msgTyping"></div>
    <div id="msgReply" hidden></div>
    <form id="msgForm">
      <input id="msgInput" maxlength="2000" autocomplete="off" placeholder="Écris un message...">
      <button id="msgSend" type="submit">Envoyer</button>
    </form>
  </div>
</div>`;
    bind();
  }

  function showChat(on) {
    $("msgListView").hidden = on;
    $("msgChatView").hidden = !on;
  }

  /* ---------- LISTE ---------- */
  async function loadList() {
    if (!currentUser) return;
    const {data, error} = await db.rpc("msg_list_conversations");
    if (error) { $("msgList").innerHTML = `<div class="msg-empty">${esc(frErr(error))}</div>`; return; }
    S.list = data || [];
    renderList();
    updateBadge();
  }

  function renderList() {
    const q = ($("msgSearch").value || "").trim().toLowerCase();
    const rows = S.list
      .filter(c => c.archived === S.showArch)
      .filter(c => !q || `${c.other_username} ${c.other_name || ""}`.toLowerCase().includes(q));
    $("msgArch").textContent = S.showArch ? "Conversations" : "Archivées";
    $("msgList").innerHTML = rows.length ? rows.map(c => {
      const name = c.other_name || c.other_username;
      let last = "Dis bonjour 👋";
      if (c.last_deleted) last = "Message supprimé";
      else if (c.last_body) last = (c.last_sender_id === me() ? "Toi : " : "") + c.last_body;
      return `<button class="msg-row${c.unread ? " unread" : ""}" type="button"
        data-conv="${c.conversation_id}" data-other="${c.other_id}" data-name="${esc(name)}">
        ${avatar(c.other_avatar, name)}
        <span class="msg-txt"><b>${esc(name)}</b><small>${esc(last)}</small></span>
        <span class="msg-side"><small>${hhmm(c.last_at)}</small>
          ${c.unread ? `<i class="msg-badge">${c.unread}</i>` : ""}</span>
      </button>`;
    }).join("") : `<div class="msg-empty">${S.showArch
      ? "Aucune conversation archivée."
      : "Aucune conversation. Appuie sur « Nouveau » pour écrire à quelqu'un."}</div>`;
  }

  function updateBadge() {
    const total = S.list.filter(c => !c.archived).reduce((n, c) => n + Number(c.unread || 0), 0);
    const dot = document.querySelector('#navigation button[data-page="notifs"] .navdot');
    if (dot) dot.hidden = !total;
  }

  function subscribeList() {
    if (!currentUser) return;
    if (S.listChan && S.listUser === me()) return;
    if (S.listChan) { db.removeChannel(S.listChan); S.listChan = null; }
    S.listUser = me();
    let t = null;
    const refresh = () => { clearTimeout(t); t = setTimeout(loadList, 300); };
    S.listChan = db.channel("msg-list-" + me())
      .on("postgres_changes", {event: "INSERT", schema: "public", table: "msg_messages"}, refresh)
      .on("postgres_changes", {event: "UPDATE", schema: "public", table: "msg_members"}, refresh)
      .subscribe();
  }

  function backToList() {
    leaveConv();
    S.conv = null; S.other = null;
    $("msgMenu").hidden = true;
    setReply(null);
    showChat(false);
    loadList();
  }

  /* ---------- CONVERSATION ---------- */
  async function openConv(convId, otherId, name) {
    if (!currentUser) return;
    S.conv = convId; S.other = otherId; S.reply = null; S.edit = null; S.firstLoad = true;
    setReply(null);
    $("msgNewBox").hidden = true;
    const row = S.list.find(c => c.conversation_id === convId);
    const shown = row?.other_name || row?.other_username || name || "";
    S.otherName = shown;
    $("msgTitle").innerHTML = `${avatar(row?.other_avatar, shown)}
      <span class="msg-hn"><b>${esc(shown)}</b><small>@${esc(row?.other_username || "")}</small></span>`;
    showChat(true);
    $("msgThread").innerHTML = "<div class='msg-empty'>Chargement...</div>";
    subscribeConv(convId);
    await markRead();
    await fetchAll();
  }

  function leaveConv() {
    if (S.chan) { db.removeChannel(S.chan); S.chan = null; }
  }

  async function markRead() {
    if (!S.conv || !currentUser) return;
    await db.from("msg_members")
      .update({last_read_at: new Date().toISOString()})
      .eq("conversation_id", S.conv).eq("user_id", me());
  }

  // Lecture seule : aucune écriture ici, pour éviter les boucles temps réel
  async function fetchAll() {
    const convId = S.conv;
    if (!convId) return;
    const [msgsRes, memRes] = await Promise.all([
      db.from("msg_messages")
        .select("id,sender_id,body,reply_to,created_at,edited_at,deleted_for_all")
        .eq("conversation_id", convId).order("created_at", {ascending: true}).limit(100),
      db.from("msg_members").select("user_id,last_read_at").eq("conversation_id", convId)
    ]);
    if (convId !== S.conv) return;
    if (msgsRes.error) { $("msgThread").innerHTML = `<div class="msg-empty">${esc(frErr(msgsRes.error))}</div>`; return; }
    S.msgs = msgsRes.data || [];
    S.reads = Object.fromEntries((memRes.data || []).map(r => [r.user_id, r.last_read_at]));
    S.reacts = new Map();
    const ids = S.msgs.map(m => m.id);
    if (ids.length) {
      const {data: rs} = await db.from("msg_reactions").select("message_id,user_id,emoji").in("message_id", ids);
      if (convId !== S.conv) return;
      (rs || []).forEach(r => {
        const a = S.reacts.get(r.message_id) || [];
        a.push(r);
        S.reacts.set(r.message_id, a);
      });
    }
    if (convId !== S.conv) return;
    renderThread();
  }

  function subscribeConv(convId) {
    leaveConv();
    S.chan = db.channel("msg-conv-" + convId)
      .on("postgres_changes", {event: "*", schema: "public", table: "msg_messages",
        filter: "conversation_id=eq." + convId}, async p => {
        if (p.eventType === "INSERT" && p.new.sender_id !== me()) await markRead();
        fetchAll();
      })
      .on("postgres_changes", {event: "*", schema: "public", table: "msg_reactions"}, () => fetchAll())
      .on("postgres_changes", {event: "*", schema: "public", table: "msg_members",
        filter: "conversation_id=eq." + convId}, () => fetchAll())
      .on("broadcast", {event: "typing"}, ({payload}) => {
        if (payload.uid !== me()) showTyping(payload.name);
      })
      .subscribe();
  }

  function showTyping(name) {
    const el = $("msgTyping");
    el.textContent = `${name || "Quelqu'un"} est en train d'écrire…`;
    clearTimeout(S.typingTimer);
    S.typingTimer = setTimeout(() => el.textContent = "", 2500);
  }

  function renderThread() {
    const box = $("msgThread");
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    const byId = new Map(S.msgs.map(m => [m.id, m]));
    const otherRead = S.reads[S.other] ? new Date(S.reads[S.other]) : null;
    let lastMine = -1;
    S.msgs.forEach((m, i) => { if (m.sender_id === me()) lastMine = i; });

    let html = "", lastDay = "";
    S.msgs.forEach((m, i) => {
      const day = dayLabel(m.created_at);
      if (day !== lastDay) { html += `<div class="msg-day">${day}</div>`; lastDay = day; }
      const mine = m.sender_id === me();
      const quoted = m.reply_to && byId.get(m.reply_to);
      const reacts = S.reacts.get(m.id) || [];
      const counts = {};
      reacts.forEach(r => counts[r.emoji] = (counts[r.emoji] || 0) + 1);
      const mineReacts = new Set(reacts.filter(r => r.user_id === me()).map(r => r.emoji));
      const canEdit = mine && !m.deleted_for_all &&
        Date.now() - new Date(m.created_at).getTime() < 15 * 60 * 1000;
      const seen = mine && i === lastMine && otherRead && otherRead >= new Date(m.created_at);

      html += `<div class="msg-line ${mine ? "mine" : "theirs"}" data-id="${m.id}">
        <div class="msg-bubble${m.deleted_for_all ? " deleted" : ""}">
          ${quoted ? `<div class="msg-quote">${esc(quoted.deleted_for_all ? "Message supprimé" : quoted.body)}</div>` : ""}
          <div class="msg-text">${m.deleted_for_all ? "Message supprimé" : esc(m.body)}</div>
          <div class="msg-meta">${m.edited_at && !m.deleted_for_all ? "modifié · " : ""}${hhmm(m.created_at)}</div>
          ${Object.keys(counts).length ? `<div class="msg-reacts">${
            Object.entries(counts).map(([e, n]) =>
              `<span class="${mineReacts.has(e) ? "on" : ""}">${e} ${n}</span>`).join("")}</div>` : ""}
        </div>
        ${seen ? `<div class="msg-seen">Vu</div>` : ""}
        <div class="msg-actions" hidden>
          ${EMOJIS.map(e => `<button type="button" data-act="react" data-emoji="${e}">${e}</button>`).join("")}
          ${m.deleted_for_all ? "" : `<button type="button" data-act="reply">↩︎ Répondre</button>`}
          ${canEdit ? `<button type="button" data-act="edit">✏️ Modifier</button>` : ""}
          <button type="button" data-act="hide">Supprimer pour moi</button>
          ${mine && !m.deleted_for_all ? `<button type="button" data-act="all" class="danger">Supprimer pour tous</button>` : ""}
        </div>
      </div>`;
    });

    box.innerHTML = html || "<div class='msg-empty'>Pas encore de message. Dis bonjour 👋</div>";
    if (atBottom || S.firstLoad) { box.scrollTop = box.scrollHeight; S.firstLoad = false; }
  }

  async function action(id, act, emoji) {
    const m = S.msgs.find(x => x.id === id);
    if (!m) return;
    document.querySelectorAll("#msgThread .msg-actions").forEach(p => p.hidden = true);
    if (act === "reply") { S.reply = m; S.edit = null; setReply(m); $("msgInput").focus(); return; }
    if (act === "edit") { S.edit = m; S.reply = null; $("msgInput").value = m.body; setReply(m, true); $("msgInput").focus(); return; }
    let res;
    if (act === "react") res = await db.rpc("msg_toggle_reaction", {p_message: id, p_emoji: emoji});
    if (act === "hide") res = await db.rpc("msg_delete", {p_message: id, p_for_all: false});
    if (act === "all") {
      if (!confirm("Supprimer ce message pour tout le monde ?")) return;
      res = await db.rpc("msg_delete", {p_message: id, p_for_all: true});
    }
    if (res?.error) return toast(frErr(res.error));
    fetchAll();
  }

  function setReply(m, editing = false) {
    const bar = $("msgReply");
    if (!m) { bar.hidden = true; bar.innerHTML = ""; return; }
    bar.hidden = false;
    bar.innerHTML = `<span>${editing ? "✏️ Modifier le message" : "↩︎ " + esc((m.body || "").slice(0, 80))}</span>
      <button type="button" id="msgCancelReply" aria-label="Annuler">×</button>`;
    $("msgCancelReply").onclick = () => {
      S.reply = null; S.edit = null; $("msgInput").value = ""; setReply(null);
    };
  }

  /* ---------- NOUVELLE CONVERSATION ---------- */
  async function openFromProfile(id, name) {
    if (!currentUser) return;
    ensureShell(); subscribeList();
    const {data: convId, error} = await db.rpc("msg_start_conversation", {p_other: id});
    if (error) return toast(frErr(error));
    showPage("notifs"); // ouvre la page Messages (appelle afroLoadMessagesPage)
    await loadList();
    await openConv(convId, id, name);
  }

  let userTimer = null;
  async function searchUsers() {
    const q = $("msgUserQ").value.trim().toLowerCase();
    const box = $("msgUserRes");
    if (q.length < 2) { box.innerHTML = ""; return; }
    const {data} = await db.from("profiles").select("id,username,display_name,avatar_url")
      .ilike("username", q + "%").neq("id", me()).limit(8);
    box.innerHTML = (data || []).map(p => {
      const name = p.display_name || p.username;
      return `<button class="msg-row" type="button" data-start="${p.id}" data-name="${esc(name)}">
        ${avatar(p.avatar_url, name)}
        <span class="msg-txt"><b>${esc(name)}</b><small>@${esc(p.username)}</small></span></button>`;
    }).join("") || "<div class='msg-empty'>Aucun utilisateur trouvé.</div>";
  }

  /* ---------- ÉVÉNEMENTS ---------- */
  function bind() {
    $("msgNew").onclick = () => {
      $("msgNewBox").hidden = !$("msgNewBox").hidden;
      if (!$("msgNewBox").hidden) $("msgUserQ").focus();
    };
    $("msgUserQ").addEventListener("input", () => { clearTimeout(userTimer); userTimer = setTimeout(searchUsers, 300); });
    $("msgUserRes").addEventListener("click", e => {
      const b = e.target.closest("[data-start]"); if (!b) return;
      openFromProfile(b.dataset.start, b.dataset.name);
    });
    $("msgSearch").addEventListener("input", renderList);
    $("msgArch").onclick = () => { S.showArch = !S.showArch; renderList(); };
    $("msgList").addEventListener("click", e => {
      const row = e.target.closest(".msg-row"); if (!row) return;
      openConv(row.dataset.conv, row.dataset.other, row.dataset.name);
    });
    $("msgBack").onclick = backToList;

    $("msgThread").addEventListener("click", e => {
      const line = e.target.closest(".msg-line"); if (!line) return;
      const btn = e.target.closest("[data-act]");
      if (btn) return action(line.dataset.id, btn.dataset.act, btn.dataset.emoji);
      const panel = line.querySelector(".msg-actions");
      const wasOpen = !panel.hidden;
      document.querySelectorAll("#msgThread .msg-actions").forEach(p => p.hidden = true);
      panel.hidden = wasOpen;
    });

    $("msgMenuBtn").onclick = () => { $("msgMenu").hidden = !$("msgMenu").hidden; };
    $("msgMenu").addEventListener("click", async e => {
      const b = e.target.closest("[data-m]"); if (!b) return;
      $("msgMenu").hidden = true;
      if (b.dataset.m === "archive") {
        await db.from("msg_members").update({archived: true}).eq("conversation_id", S.conv).eq("user_id", me());
        toast("Conversation archivée.", true);
        backToList();
      }
      if (b.dataset.m === "block") {
        if (!confirm(`Bloquer ${S.otherName} ? Vous ne pourrez plus échanger de messages.`)) return;
        const {error} = await db.from("user_blocks").insert({blocker_id: me(), blocked_id: S.other});
        if (error) return toast(frErr(error));
        toast("Utilisateur bloqué.", true);
        backToList();
      }
      if (b.dataset.m === "report") await reportUser(S.other);
    });

    let lastTyping = 0;
    $("msgInput").addEventListener("input", () => {
      if (!S.chan || Date.now() - lastTyping < 1500) return;
      lastTyping = Date.now();
      S.chan.send({type: "broadcast", event: "typing",
        payload: {uid: me(), name: currentProfile?.display_name || currentProfile?.username || ""}});
    });

    $("msgForm").addEventListener("submit", async e => {
      e.preventDefault();
      const input = $("msgInput"), text = input.value.trim();
      if (!text || !S.conv || S.sending) return;
      S.sending = true; $("msgSend").disabled = true;
      const res = S.edit
        ? await db.rpc("msg_edit", {p_message: S.edit.id, p_body: text})
        : await db.rpc("msg_send", {p_conv: S.conv, p_body: text, p_reply: S.reply?.id || null});
      S.sending = false; $("msgSend").disabled = false;
      if (res.error) return toast(frErr(res.error));
      input.value = ""; S.reply = null; S.edit = null; setReply(null);
      fetchAll();
      input.focus();
    });
  }

  async function reportUser(userId) {
    const reason = prompt("Motif du signalement (spam, harcèlement, contenu interdit…) :");
    if (!reason || !reason.trim()) return;
    const {error} = await db.from("social_reports").insert({
      reporter_id: me(), reported_user_id: userId,
      reason: reason.trim().slice(0, 200), status: "pending"
    });
    toast(error ? frErr(error) : "Signalement envoyé. Merci.", !error);
  }

  /* ---------- HOOKS UTILISÉS PAR index.html ---------- */
  window.afroLoadMessagesPage = () => { ensureShell(); subscribeList(); backToList(); };
  window.afroRefreshDMUnread = async () => { if (!currentUser) return; ensureShell(); subscribeList(); await loadList(); };
  window.openAfroCreatorConversation = (id, name) => openFromProfile(id, name);
  window.afroReportProfile = async ({reported_user_id}) => { if (currentUser) await reportUser(reported_user_id); };
  window.afroBlockProfile = async (id, name) => {
    if (!currentUser) return;
    if (!confirm(`Bloquer ${name || "cet utilisateur"} ? Vous ne pourrez plus échanger de messages.`)) return;
    const {error} = await db.from("user_blocks").insert({blocker_id: me(), blocked_id: id});
    toast(error ? frErr(error) : "Utilisateur bloqué.", !error);
  };
})();
