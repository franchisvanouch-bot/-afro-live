/* =========================================================
   MESSAGERIE AFRO LIVE — messaging.js
   Dépend des globales de index.html : db, currentUser,
   currentProfile, message(), showPage()
   ========================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hhmm = d => new Date(d).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"});
  const dayLabel = d => {
    const x = new Date(d), t = new Date();
    return x.toDateString() === t.toDateString()
      ? "Aujourd'hui"
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
    const key = Object.keys(ERRORS).find(k => m.includes(k));
    return key ? ERRORS[key] : (m || "Erreur inconnue.");
  };
  const me = () => currentUser?.id;
  const avatarHTML = (url, name) => url
    ? `<img class="msg-av" src="${esc(url)}" alt="">`
    : `<span class="msg-av msg-av-txt">${esc((name || "?").trim().charAt(0).toUpperCase() || "?")}</span>`;

  const S = {
    conv: null, other: null, otherName: "", list: [], showArch: false,
    msgs: [], reacts: new Map(), reads: {}, reply: null, edit: null,
    chan: null, listChan: null, typingAt: 0, typingTimer: null,
    sending: false, firstLoad: true
  };

  /* ---------- LISTE DES CONVERSATIONS ---------- */
  async function loadList() {
    if (!currentUser) return;
    const {data, error} = await db.rpc("msg_list_conversations");
    if (error) { $("msgList").innerHTML = `<div class="notice">${esc(frErr(error))}</div>`; return; }
    S.list = data || [];
    renderList();
    updateBadge();
  }

  function renderList() {
    const q = ($("msgSearch").value || "").trim().toLowerCase();
    const rows = S.list
      .filter(c => c.archived === S.showArch)
      .filter(c => !q || `${c.other_username} ${c.other_name || ""}`.toLowerCase().includes(q));
    $("msgArchToggle").textContent = S.showArch ? "Conversations" : "Archivées";
    $("msgList").innerHTML = rows.length ? rows.map(c => {
      const name = c.other_name || c.other_username;
      let last = "Dis bonjour 👋";
      if (c.last_deleted) last = "Message supprimé";
      else if (c.last_body) last = (c.last_sender_id === me() ? "Toi : " : "") + c.last_body;
      return `<button class="msg-row${c.unread ? " unread" : ""}"
                data-conv="${c.conversation_id}" data-other="${c.other_id}" data-name="${esc(name)}">
        ${avatarHTML(c.other_avatar, name)}
        <span class="msg-row-txt"><b>${esc(name)}</b><small>${esc(last)}</small></span>
        <span class="msg-row-side"><small>${hhmm(c.last_at)}</small>
          ${c.unread ? `<i class="msg-badge">${c.unread}</i>` : ""}</span>
      </button>`;
    }).join("") : `<p class="empty">${S.showArch
      ? "Aucune conversation archivée."
      : "Aucune conversation. Appuie sur « Nouveau » pour écrire à quelqu'un."}</p>`;
  }

  function updateBadge() {
    const total = S.list.filter(c => !c.archived).reduce((n, c) => n + Number(c.unread || 0), 0);
    document.querySelectorAll(".msg-navdot").forEach(d => d.hidden = !total);
  }

  function subscribeList() {
    if (S.listChan || !currentUser) return;
    let t = null;
    const refresh = () => { clearTimeout(t); t = setTimeout(loadList, 300); };
    S.listChan = db.channel("msg-list-" + me())
      .on("postgres_changes", {event:"INSERT", schema:"public", table:"msg_messages"}, refresh)
      .on("postgres_changes", {event:"UPDATE", schema:"public", table:"msg_members"}, refresh)
      .subscribe();
  }

  /* ---------- CONVERSATION ---------- */
  async function openConv(convId, otherId, otherName) {
    if (!currentUser) return;
    S.conv = convId; S.other = otherId; S.reply = null; S.edit = null; S.firstLoad = true;
    setReplyBar(null);
    const row = S.list.find(c => c.conversation_id === convId);
    const name = row?.other_name || row?.other_username || otherName || "";
    S.otherName = name;
    $("msgChatTitle").innerHTML = `${avatarHTML(row?.other_avatar, name)}
      <span class="msg-head-name"><b>${esc(name)}</b><small>@${esc(row?.other_username || "")}</small></span>`;
    $("msgListView").classList.add("hidden");
    $("msgChatView").classList.remove("hidden");
    $("msgThread").innerHTML = "<p class='small'>Chargement...</p>";
    subscribeConv(convId);
    await markRead();
    await fetchAll();
  }

  function leaveConv() {
    if (S.chan) { db.removeChannel(S.chan); S.chan = null; }
  }

  function backToList() {
    leaveConv();
    S.conv = null; S.other = null;
    $("msgMenu").classList.add("hidden");
    $("msgChatView").classList.add("hidden");
    $("msgListView").classList.remove("hidden");
    loadList();
  }

  async function markRead() {
    if (!S.conv || !currentUser) return;
    await db.from("msg_members")
      .update({last_read_at: new Date().toISOString()})
      .eq("conversation_id", S.conv).eq("user_id", me());
  }

  // Lecture seule : ne déclenche aucune écriture (évite les boucles temps réel)
  async function fetchAll() {
    const convId = S.conv;
    if (!convId) return;
    const [msgsRes, memRes] = await Promise.all([
      db.from("msg_messages")
        .select("id,sender_id,body,reply_to,created_at,edited_at,deleted_for_all")
        .eq("conversation_id", convId)
        .order("created_at", {ascending: true})
        .limit(100),
      db.from("msg_members").select("user_id,last_read_at").eq("conversation_id", convId)
    ]);
    if (convId !== S.conv) return;
    if (msgsRes.error) {
      $("msgThread").innerHTML = `<div class="notice">${esc(frErr(msgsRes.error))}</div>`;
      return;
    }
    S.msgs = msgsRes.data || [];
    S.reads = Object.fromEntries((memRes.data || []).map(r => [r.user_id, r.last_read_at]));
    S.reacts = new Map();
    const ids = S.msgs.map(m => m.id);
    if (ids.length) {
      const {data: rs} = await db.from("msg_reactions")
        .select("message_id,user_id,emoji").in("message_id", ids);
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
      .on("postgres_changes", {event:"*", schema:"public", table:"msg_messages",
          filter:"conversation_id=eq." + convId}, async p => {
        if (p.eventType === "INSERT" && p.new.sender_id !== me()) await markRead();
        fetchAll();
      })
      .on("postgres_changes", {event:"*", schema:"public", table:"msg_reactions"}, () => fetchAll())
      .on("postgres_changes", {event:"*", schema:"public", table:"msg_members",
          filter:"conversation_id=eq." + convId}, () => fetchAll())
      .on("broadcast", {event:"typing"}, ({payload}) => {
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
        <div class="msg-actions hidden">
          ${EMOJIS.map(e => `<button data-act="react" data-emoji="${e}">${e}</button>`).join("")}
          ${m.deleted_for_all ? "" : `<button data-act="reply">↩︎ Répondre</button>`}
          ${canEdit ? `<button data-act="edit">✏️ Modifier</button>` : ""}
          <button data-act="hide">Supprimer pour moi</button>
          ${mine && !m.deleted_for_all ? `<button data-act="all" class="danger">Supprimer pour tous</button>` : ""}
        </div>
      </div>`;
    });

    box.innerHTML = html || "<p class='empty'>Pas encore de message. Dis bonjour 👋</p>";
    if (atBottom || S.firstLoad) { box.scrollTop = box.scrollHeight; S.firstLoad = false; }
  }

  async function action(id, act, emoji) {
    const m = S.msgs.find(x => x.id === id);
    if (!m) return;
    document.querySelectorAll("#msgThread .msg-actions").forEach(p => p.classList.add("hidden"));
    let res;
    if (act === "reply") { S.reply = m; S.edit = null; setReplyBar(m); $("msgInput").focus(); return; }
    if (act === "edit") { S.edit = m; S.reply = null; $("msgInput").value = m.body; setReplyBar(m, true); $("msgInput").focus(); return; }
    if (act === "react") res = await db.rpc("msg_toggle_reaction", {p_message: id, p_emoji: emoji});
    if (act === "hide") res = await db.rpc("msg_delete", {p_message: id, p_for_all: false});
    if (act === "all") {
      if (!confirm("Supprimer ce message pour tout le monde ?")) return;
      res = await db.rpc("msg_delete", {p_message: id, p_for_all: true});
    }
    if (res?.error) return message(frErr(res.error));
    fetchAll();
  }

  function setReplyBar(m, editing = false) {
    const bar = $("msgReplyBar");
    if (!m) { bar.classList.add("hidden"); bar.innerHTML = ""; return; }
    bar.classList.remove("hidden");
    bar.innerHTML = `<span>${editing ? "✏️ Modifier le message" : "↩︎ " + esc((m.body || "").slice(0, 80))}</span>
      <button type="button" id="msgCancelReply" aria-label="Annuler">×</button>`;
    $("msgCancelReply").onclick = () => {
      S.reply = null; S.edit = null; $("msgInput").value = ""; setReplyBar(null);
    };
  }

  /* ---------- NOUVELLE CONVERSATION ---------- */
  async function startWith(otherId, name) {
    const {data: convId, error} = await db.rpc("msg_start_conversation", {p_other: otherId});
    if (error) return message(frErr(error));
    $("msgNewBox").classList.add("hidden");
    await loadList();
    await openConv(convId, otherId, name);
  }

  let userTimer = null;
  async function searchUsers() {
    const q = $("msgUserSearch").value.trim().toLowerCase();
    const box = $("msgUserResults");
    if (q.length < 2) { box.innerHTML = ""; return; }
    const {data} = await db.from("profiles")
      .select("id,username,display_name,avatar_url")
      .ilike("username", q + "%").neq("id", me()).limit(8);
    box.innerHTML = (data || []).map(p => {
      const name = p.display_name || p.username;
      return `<button class="msg-row" data-start="${p.id}" data-name="${esc(name)}">
        ${avatarHTML(p.avatar_url, name)}
        <span class="msg-row-txt"><b>${esc(name)}</b><small>@${esc(p.username)}</small></span>
      </button>`;
    }).join("") || "<p class='small'>Aucun utilisateur trouvé.</p>";
  }

  /* ---------- ÉVÉNEMENTS ---------- */
  $("msgNewBtn").addEventListener("click", () => {
    const box = $("msgNewBox");
    box.classList.toggle("hidden");
    if (!box.classList.contains("hidden")) $("msgUserSearch").focus();
  });
  $("msgUserSearch").addEventListener("input", () => { clearTimeout(userTimer); userTimer = setTimeout(searchUsers, 300); });
  $("msgUserResults").addEventListener("click", e => {
    const b = e.target.closest("[data-start]"); if (!b) return;
    startWith(b.dataset.start, b.dataset.name);
  });
  $("msgSearch").addEventListener("input", renderList);
  $("msgArchToggle").addEventListener("click", () => { S.showArch = !S.showArch; renderList(); });
  $("msgList").addEventListener("click", e => {
    const row = e.target.closest(".msg-row"); if (!row) return;
    openConv(row.dataset.conv, row.dataset.other, row.dataset.name);
  });
  $("msgBack").addEventListener("click", backToList);

  $("msgThread").addEventListener("click", e => {
    const line = e.target.closest(".msg-line"); if (!line) return;
    const btn = e.target.closest("[data-act]");
    if (btn) return action(line.dataset.id, btn.dataset.act, btn.dataset.emoji);
    const panel = line.querySelector(".msg-actions");
    const wasOpen = !panel.classList.contains("hidden");
    document.querySelectorAll("#msgThread .msg-actions").forEach(p => p.classList.add("hidden"));
    if (!wasOpen) panel.classList.remove("hidden");
  });

  $("msgMenuBtn").addEventListener("click", () => $("msgMenu").classList.toggle("hidden"));
  $("msgMenu").addEventListener("click", async e => {
    const b = e.target.closest("[data-m]"); if (!b) return;
    $("msgMenu").classList.add("hidden");
    if (b.dataset.m === "archive") {
      await db.from("msg_members").update({archived: true})
        .eq("conversation_id", S.conv).eq("user_id", me());
      message("Conversation archivée.", true);
      backToList();
    }
    if (b.dataset.m === "block") {
      if (!confirm(`Bloquer ${S.otherName} ? Vous ne pourrez plus échanger de messages.`)) return;
      const {error} = await db.from("user_blocks").insert({blocker_id: me(), blocked_id: S.other});
      if (error) return message(frErr(error));
      message("Utilisateur bloqué.", true);
      backToList();
    }
    if (b.dataset.m === "report") {
      const reason = prompt("Motif du signalement (spam, harcèlement, contenu interdit…) :");
      if (!reason || !reason.trim()) return;
      const {error} = await db.from("social_reports").insert({
        reporter_id: me(), reported_user_id: S.other,
        reason: reason.trim().slice(0, 200), status: "pending"
      });
      message(error ? frErr(error) : "Signalement envoyé. Merci.", !error);
    }
  });

  let lastTypingSent = 0;
  $("msgInput").addEventListener("input", () => {
    if (!S.chan || Date.now() - lastTypingSent < 1500) return;
    lastTypingSent = Date.now();
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
    if (res.error) return message(frErr(res.error));
    input.value = ""; S.reply = null; S.edit = null; setReplyBar(null);
    fetchAll();
    input.focus();
  });

  /* ---------- API PUBLIQUE (appelée depuis index.html) ---------- */
  function open() {
    leaveConv();
    $("msgListView").classList.remove("hidden");
    $("msgChatView").classList.add("hidden");
    loadList();
  }

  function reset() {
    leaveConv();
    if (S.listChan) { db.removeChannel(S.listChan); S.listChan = null; }
    Object.assign(S, {conv: null, other: null, list: [], msgs: [], reacts: new Map(),
      reads: {}, reply: null, edit: null});
  }

  window.msgInit = () => { subscribeList(); loadList(); };
  window.msgOpen = open;
  window.msgReset = reset;
  window.msgFromProfile = async (id, name) => {
    $("publicProfile").classList.add("hidden");
    $("spectator").classList.remove("hidden");
    document.body.classList.add("spectator");
    showPage("messages");
    await startWith(id, name);
  };
})();
