// Video FX Lab — extras: chats de teléfono, notificación, llamada entrante y más diseños de quiz.
(function () {
  if (typeof registerFx !== "function") return;
  const PHONE_KEYS = ["phoneChat", "phoneNotif", "phoneCall"];

  // ------------------------------------------------------------------
  // Estado y panel
  // ------------------------------------------------------------------
  const chat = {
    name: "Mamá",
    style: "green",
    text: "Hola hijo, ¿ya comiste? 🍲\n> Sí ma, ya comí\nNo te creo 🤨\nMándame foto\n> 😅😅\n> Bueno no he comido\nLo sabía 😂",
    hold: 2,
  };
  try { Object.assign(chat, JSON.parse(localStorage.getItem("fxChat") || "{}")); } catch {}
  const saveChat = () => { try { localStorage.setItem("fxChat", JSON.stringify(chat)); } catch {} };

  function parseChat() {
    const msgs = [];
    chat.text.split(/\n/).forEach((raw) => {
      let line = raw.trim();
      if (!line) return;
      let me = false;
      if (/^(>|yo\s*:)/i.test(line)) { me = true; line = line.replace(/^(>|yo\s*:)\s*/i, ""); }
      else line = line.replace(/^(<|[ée]l\s*:|ella\s*:)\s*/i, "");
      if (line) msgs.push({ me, text: line });
    });
    return msgs.length ? msgs : [{ me: false, text: "Hola 👋" }];
  }

  // Tiempos de cada mensaje
  function chatTimeline() {
    const msgs = parseChat();
    let t = 0.5;
    msgs.forEach((m, i) => {
      const typing = m.me ? Math.min(1.4, 0.5 + m.text.length * 0.035) : Math.min(1.6, 0.7 + m.text.length * 0.02);
      if (i > 0) t += typing;
      m.typeStart = t - typing;
      m.at = t;
      t += Math.min(1.4, 0.45 + m.text.length * 0.022);
    });
    return { msgs, end: msgs[msgs.length - 1].at + chat.hold };
  }

  function syncDuration() {
    if (!PHONE_KEYS.includes(currentPreset)) return;
    let d = 4;
    if (currentPreset === "phoneChat") d = Math.ceil(chatTimeline().end * 10) / 10;
    if (currentPreset === "phoneNotif") d = 4;
    if (currentPreset === "phoneCall") d = 5;
    if (controls?.duration) {
      controls.duration.max = Math.max(Number(controls.duration.max) || 0, d);
      controls.duration.value = d;
    }
  }

  function buildPanel() {
    if (document.querySelector("#phonePanel")) return;
    const anchor = document.querySelector("#titleText")?.closest("label");
    if (!anchor) return;
    const box = document.createElement("div");
    box.id = "phonePanel";
    box.hidden = true;
    box.style.cssText = "grid-column:1/-1;display:grid;gap:10px;padding:12px;border:1px solid #ffd60a66;border-radius:10px;background:#0f1218";
    box.innerHTML = `
      <b style="color:#ffd60a">📱 Teléfono</b>
      <label>Nombre del contacto<input id="phName" type="text" /></label>
      <label class="ph-chat">Estilo del chat
        <select id="phStyle">
          <option value="green">Verde (fondo claro)</option>
          <option value="blue">Azul (burbujas azules)</option>
          <option value="dark">Oscuro</option>
          <option value="pink">Rosa</option>
        </select></label>
      <label><span class="ph-lab">Mensajes</span>
        <textarea id="phText" rows="8" spellcheck="false"></textarea></label>
      <p class="hint ph-chat" style="margin:0;color:#b6bfcc;font-size:.85rem">Un mensaje por renglón. Los que empiezan con <b>&gt;</b> (o <b>yo:</b>) son tuyos y salen a la derecha; los demás son del contacto. Puedes usar emojis.</p>
      <label class="ph-chat">Segundos al final<input id="phHold" type="number" min="0" max="10" step="0.5" /></label>`;
    box.querySelectorAll("input,select,textarea").forEach((el) => {
      if (el.tagName !== "TEXTAREA") el.style.cssText = "background:#0f1218;color:#fff;border:1px solid #333b4c;border-radius:8px;padding:8px;font:inherit;width:100%";
      else el.style.cssText = "background:#0f1218;color:#fff;border:1px solid #333b4c;border-radius:8px;padding:10px;font:500 .95rem/1.5 Outfit,system-ui;width:100%;resize:vertical";
    });
    box.querySelectorAll("label").forEach((l) => { l.style.cssText = "display:grid;gap:4px"; });
    anchor.before(box);
    const $ = (id) => box.querySelector(id);
    $("#phName").value = chat.name; $("#phStyle").value = chat.style; $("#phText").value = chat.text; $("#phHold").value = chat.hold;
    const upd = () => {
      chat.name = $("#phName").value || "Contacto";
      chat.style = $("#phStyle").value;
      chat.text = $("#phText").value;
      chat.hold = Math.max(0, Number($("#phHold").value) || 0);
      saveChat(); syncDuration();
      try { updateOutputs(); redrawIdle(); } catch {}
    };
    box.addEventListener("input", upd);
    box.addEventListener("change", upd);
  }

  function refreshPanel() {
    buildPanel();
    const box = document.querySelector("#phonePanel");
    if (!box) return;
    const on = PHONE_KEYS.includes(currentPreset);
    box.hidden = !on;
    if (!on) return;
    const isChat = currentPreset === "phoneChat";
    box.querySelectorAll(".ph-chat").forEach((el) => { el.hidden = !isChat; });
    box.querySelector(".ph-lab").textContent = isChat ? "Mensajes" : currentPreset === "phoneNotif" ? "Mensaje de la notificación (primer renglón)" : "Texto debajo del nombre (primer renglón, opcional)";
    syncDuration();
  }

  const origApply = window.applyPreset;
  if (typeof origApply === "function") {
    window.applyPreset = function (key) {
      const r = origApply.apply(this, arguments);
      refreshPanel();
      if (key === "phoneChat" || key === "phoneCall") { const of = document.querySelector("#outFormat"); if (of) { of.value = "mp4"; } }
      if (PHONE_KEYS.includes(key)) { syncDuration(); try { updateOutputs(); redrawIdle(); } catch {} }
      return r;
    };
  }

  // ------------------------------------------------------------------
  // Utilidades de dibujo
  // ------------------------------------------------------------------
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrapLines(text, maxW) {
    const out = [];
    text.split(/\n/).forEach((para) => {
      let line = "";
      para.split(/\s+/).forEach((word) => {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
        else line = test;
      });
      out.push(line);
    });
    return out;
  }
  const easeBack = (t) => { t = clamp(t, 0, 1); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const FONT = 'Outfit, -apple-system, "Segoe UI", system-ui, sans-serif';

  const CHAT_THEMES = {
    green: { bg: "#ece5dd", head: "#1f7a5c", headText: "#ffffff", sub: "#cdeee2", me: "#d9fdd3", meText: "#111b21", them: "#ffffff", themText: "#111b21", meta: "#667781", tick: "#34b7f1", bar: "#f0f2f5", field: "#ffffff", status: "#ffffff", statusBg: "#1a6a50", pattern: "rgba(0,0,0,0.035)" },
    blue: { bg: "#ffffff", head: "#f7f7f8", headText: "#111111", sub: "#8a8a8e", me: "#1f8bff", meText: "#ffffff", them: "#e9e9eb", themText: "#111111", meta: "#8a8a8e", tick: "#8a8a8e", bar: "#ffffff", field: "#f2f2f4", status: "#111111", statusBg: "#f7f7f8", pattern: null },
    dark: { bg: "#0b0b0d", head: "#1c1c1e", headText: "#ffffff", sub: "#8e8e93", me: "#2f6df6", meText: "#ffffff", them: "#262628", themText: "#ffffff", meta: "#8e8e93", tick: "#5ac8fa", bar: "#1c1c1e", field: "#2c2c2e", status: "#ffffff", statusBg: "#1c1c1e", pattern: null },
    pink: { bg: "#fff0f6", head: "#ff4f9a", headText: "#ffffff", sub: "#ffe0ee", me: "#ff4f9a", meText: "#ffffff", them: "#ffffff", themText: "#3a1030", meta: "#b07a95", tick: "#ffffff", bar: "#ffe3ef", field: "#ffffff", status: "#ffffff", statusBg: "#ff3f8e", pattern: "rgba(255,79,154,0.06)" },
  };

  function drawStatusBar(x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `700 ${h * 0.5}px ${FONT}`;
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillText("9:41", x + w * 0.07, y + h / 2);
    // señal
    const bx = x + w * 0.72, by = y + h * 0.68;
    for (let i = 0; i < 4; i++) { const bh = h * (0.16 + i * 0.09); ctx.fillRect(bx + i * h * 0.17, by - bh, h * 0.11, bh); }
    // wifi
    ctx.lineWidth = h * 0.07; ctx.strokeStyle = color; ctx.lineCap = "round";
    const wx = x + w * 0.83, wy = y + h * 0.66;
    [0.38, 0.26, 0.14].forEach((r) => { ctx.beginPath(); ctx.arc(wx, wy, h * r, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); });
    // batería
    const tx = x + w * 0.88, ty = y + h * 0.33, tw = h * 0.85, th = h * 0.36;
    ctx.lineWidth = h * 0.05; rr(tx, ty, tw, th, th * 0.25); ctx.stroke();
    rr(tx + h * 0.06, ty + h * 0.06, (tw - h * 0.12) * 0.8, th - h * 0.12, th * 0.15); ctx.fill();
    ctx.fillRect(tx + tw + h * 0.03, ty + th * 0.3, h * 0.05, th * 0.4);
    ctx.restore();
  }

  function drawAvatar(cx, cy, r, name, color) {
    ctx.save();
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, color || "#8e9aaf"); g.addColorStop(1, "#5b6478");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `700 ${r * 1.0}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((name.trim()[0] || "?").toUpperCase(), cx, cy + r * 0.05);
    ctx.restore();
  }

  // Pantalla completa del chat dentro del rectángulo (x, y, w, h)
  function drawChatScreen(x, y, w, h, el) {
    const th = CHAT_THEMES[chat.style] || CHAT_THEMES.green;
    const { msgs } = chatTimeline();
    const u = w;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = th.bg; ctx.fillRect(x, y, w, h);
    if (th.pattern) {
      ctx.fillStyle = th.pattern;
      const step = u * 0.07;
      for (let yy = y; yy < y + h; yy += step) for (let xx = x + ((yy / step) % 2) * step / 2; xx < x + w; xx += step) { ctx.beginPath(); ctx.arc(xx, yy, u * 0.008, 0, 7); ctx.fill(); }
    }
    const statusH = u * 0.075, headH = u * 0.16, barH = u * 0.15;
    // área de mensajes
    const top = y + statusH + headH, bottom = y + h - barH;
    const fs = u * 0.054, pad = u * 0.032, maxW = w * 0.72, gap = u * 0.018;
    ctx.font = `500 ${fs}px ${FONT}`;
    // armar burbujas visibles
    const items = [];
    let typingWho = null;
    msgs.forEach((m) => {
      if (el >= m.at) items.push({ ...m, k: clamp((el - m.at) / 0.28, 0, 1) });
      else if (!m.me && el >= m.typeStart && !typingWho) typingWho = { typing: true, k: clamp((el - m.typeStart) / 0.2, 0, 1) };
    });
    if (typingWho) items.push(typingWho);
    items.forEach((it) => {
      if (it.typing) { it.bw = u * 0.2; it.bh = fs * 1.9; it.lines = []; return; }
      ctx.font = `500 ${fs}px ${FONT}`;
      it.lines = wrapLines(it.text, maxW - pad * 2);
      const tw = Math.max(...it.lines.map((l) => ctx.measureText(l).width));
      const meta = u * (it.me ? 0.13 : 0.09);
      const lastW = ctx.measureText(it.lines[it.lines.length - 1]).width;
      const extraLine = lastW + meta > maxW - pad * 2;
      it.bw = Math.min(maxW, Math.max(tw, lastW + meta) + pad * 2);
      it.bh = it.lines.length * fs * 1.28 + pad * 1.4 + (extraLine ? fs * 0.9 : 0);
    });
    const contentH = items.reduce((a, it) => a + (it.bh + gap) * easeBack(it.k), 0);
    const avail = bottom - top - u * 0.04;
    let cy = top + u * 0.03 - Math.max(0, contentH - avail);
    items.forEach((it) => {
      const sc = easeBack(it.k);
      const right = !!it.me;
      const bx = right ? x + w - u * 0.035 - it.bw : x + u * 0.035;
      const by = cy;
      cy += (it.bh + gap) * sc;
      if (by + it.bh < top - 2) return;
      ctx.save();
      const ox = right ? bx + it.bw : bx, oy = by + it.bh;
      ctx.translate(ox, oy); ctx.scale(sc, sc); ctx.translate(-ox, -oy);
      ctx.globalAlpha = clamp(it.k * 2, 0, 1);
      ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = u * 0.006; ctx.shadowOffsetY = u * 0.003;
      ctx.fillStyle = right ? th.me : th.them;
      rr(bx, by, it.bw, it.bh, u * 0.035); ctx.fill();
      // colita
      ctx.beginPath();
      if (right) { ctx.moveTo(bx + it.bw - u * 0.03, by + it.bh); ctx.quadraticCurveTo(bx + it.bw + u * 0.012, by + it.bh + u * 0.004, bx + it.bw + u * 0.016, by + it.bh - u * 0.03); ctx.lineTo(bx + it.bw - u * 0.01, by + it.bh - u * 0.04); }
      else { ctx.moveTo(bx + u * 0.03, by + it.bh); ctx.quadraticCurveTo(bx - u * 0.012, by + it.bh + u * 0.004, bx - u * 0.016, by + it.bh - u * 0.03); ctx.lineTo(bx + u * 0.01, by + it.bh - u * 0.04); }
      ctx.fill();
      ctx.shadowColor = "transparent";
      if (it.typing) {
        for (let d = 0; d < 3; d++) {
          const bounce = Math.sin(el * 9 - d * 0.9) * 0.5 + 0.5;
          ctx.fillStyle = th.meta; ctx.globalAlpha = 0.5 + bounce * 0.5;
          ctx.beginPath(); ctx.arc(bx + it.bw * (0.3 + d * 0.2), by + it.bh / 2 - bounce * fs * 0.18, fs * 0.17, 0, 7); ctx.fill();
        }
      } else {
        ctx.fillStyle = right ? th.meText : th.themText;
        ctx.font = `500 ${fs}px ${FONT}`; ctx.textBaseline = "top"; ctx.textAlign = "left";
        it.lines.forEach((l, li) => ctx.fillText(l, bx + pad, by + pad * 0.75 + li * fs * 1.28));
        ctx.font = `500 ${fs * 0.55}px ${FONT}`; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillStyle = right && (chat.style === "blue" || chat.style === "pink" || chat.style === "dark") ? "rgba(255,255,255,0.75)" : th.meta;
        const mx = bx + it.bw - pad * 0.7, my = by + it.bh - pad * 0.35;
        if (right) {
          ctx.fillStyle = el > it.at + 0.9 ? th.tick : (chat.style === "green" ? th.meta : "rgba(255,255,255,0.75)");
          ctx.fillText("✓✓", mx, my);
          ctx.fillStyle = chat.style === "green" ? th.meta : "rgba(255,255,255,0.75)";
          ctx.fillText("9:41", mx - fs * 0.95, my);
        } else ctx.fillText("9:41", mx, my);
      }
      ctx.restore();
    });
    // cabecera
    ctx.fillStyle = th.statusBg; ctx.fillRect(x, y, w, statusH);
    drawStatusBar(x, y, w, statusH, th.status);
    ctx.fillStyle = th.head; ctx.fillRect(x, y + statusH, w, headH);
    ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(x, y + statusH + headH - 2, w, 2);
    const hy = y + statusH + headH / 2;
    ctx.fillStyle = chat.style === "blue" ? "#1f8bff" : th.headText;
    ctx.font = `400 ${headH * 0.5}px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("‹", x + w * 0.03, hy - headH * 0.04);
    drawAvatar(x + w * 0.16, hy, headH * 0.32, chat.name, chat.style === "pink" ? "#ff9cc6" : undefined);
    ctx.fillStyle = th.headText; ctx.font = `700 ${headH * 0.27}px ${FONT}`;
    ctx.fillText(chat.name, x + w * 0.24, hy - headH * 0.13);
    const typingNow = !!typingWho;
    ctx.fillStyle = typingNow ? (chat.style === "blue" || chat.style === "dark" ? "#34c759" : th.sub) : th.sub;
    ctx.font = `500 ${headH * 0.19}px ${FONT}`;
    ctx.fillText(typingNow ? "escribiendo..." : "en línea", x + w * 0.24, hy + headH * 0.18);
    // íconos llamada y video
    ctx.strokeStyle = chat.style === "blue" ? "#1f8bff" : th.headText; ctx.lineWidth = u * 0.006; ctx.lineJoin = "round";
    const vx = x + w * 0.78, vy = hy;
    rr(vx - u * 0.03, vy - u * 0.02, u * 0.045, u * 0.04, u * 0.008); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vx + u * 0.017, vy - u * 0.004); ctx.lineTo(vx + u * 0.035, vy - u * 0.016); ctx.lineTo(vx + u * 0.035, vy + u * 0.016); ctx.lineTo(vx + u * 0.017, vy + u * 0.004); ctx.stroke();
    ctx.save(); ctx.translate(x + w * 0.9, hy); ctx.rotate(-0.5);
    ctx.beginPath(); ctx.moveTo(-u * 0.018, -u * 0.022); ctx.quadraticCurveTo(-u * 0.03, u * 0.012, u * 0.012, u * 0.03); ctx.lineTo(u * 0.022, u * 0.02); ctx.lineTo(u * 0.008, u * 0.006); ctx.lineTo(-u * 0.004, u * 0.012); ctx.quadraticCurveTo(-u * 0.016, 0, -u * 0.01, -u * 0.012); ctx.lineTo(-u * 0.002, -u * 0.022); ctx.closePath(); ctx.stroke();
    ctx.restore();
    // barra inferior: campo de texto (escribe tus mensajes antes de enviarlos)
    ctx.fillStyle = th.bar; ctx.fillRect(x, bottom, w, barH);
    const fx = x + w * 0.04, fy = bottom + barH * 0.17, fw = w * 0.76, fh = barH * 0.46;
    ctx.fillStyle = th.field; rr(fx, fy, fw, fh, fh / 2); ctx.fill();
    let draft = "";
    msgs.forEach((m) => { if (m.me && el >= m.typeStart && el < m.at) draft = m.text.slice(0, Math.ceil(m.text.length * clamp((el - m.typeStart) / Math.max(0.2, m.at - m.typeStart - 0.15), 0, 1))); });
    ctx.font = `500 ${fh * 0.42}px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = draft ? (chat.style === "dark" ? "#fff" : "#111") : th.meta;
    let shown = draft || "Mensaje";
    while (ctx.measureText(shown).width > fw * 0.86 && shown.length > 1) shown = shown.slice(1);
    ctx.fillText(shown, fx + fh * 0.45, fy + fh / 2);
    if (draft && Math.floor(el * 2.5) % 2 === 0) { const cw = ctx.measureText(shown).width; ctx.fillRect(fx + fh * 0.45 + cw + 2, fy + fh * 0.25, u * 0.004, fh * 0.5); }
    const sx = x + w * 0.9, sy = fy + fh / 2, sr = fh * 0.5;
    ctx.fillStyle = chat.style === "green" ? "#1f7a5c" : chat.style === "pink" ? "#ff4f9a" : "#1f8bff";
    const sendPulse = msgs.some((m) => m.me && el >= m.at - 0.12 && el < m.at + 0.1) ? 0.85 : 1;
    ctx.beginPath(); ctx.arc(sx, sy, sr * sendPulse, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath();
    ctx.moveTo(sx - sr * 0.38, sy - sr * 0.42); ctx.lineTo(sx + sr * 0.48, sy); ctx.lineTo(sx - sr * 0.38, sy + sr * 0.42); ctx.lineTo(sx - sr * 0.22, sy); ctx.closePath(); ctx.fill();
    // indicador de inicio (home)
    ctx.fillStyle = chat.style === "dark" ? "#fff" : "#111"; ctx.globalAlpha = 0.85;
    rr(x + w * 0.35, y + h - barH * 0.16, w * 0.3, u * 0.011, u * 0.006); ctx.fill();
    ctx.restore();
  }

  // Marco de teléfono (para formato horizontal o cuando el fondo es tu video)
  function phoneRect(W, H) {
    if (H >= W * 1.5) return { x: 0, y: 0, w: W, h: H, frame: false };
    const h = H * 0.92, w = h * 0.47;
    return { x: (W - w) / 2, y: (H - h) / 2, w, h, frame: true };
  }
  function drawPhoneFrame(r) {
    if (!r.frame) return;
    const b = r.w * 0.035;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = r.w * 0.08; ctx.shadowOffsetY = r.w * 0.03;
    ctx.fillStyle = "#111"; rr(r.x - b, r.y - b, r.w + b * 2, r.h + b * 2, r.w * 0.13); ctx.fill();
    ctx.restore();
  }
  function drawNotch(r) {
    ctx.save(); ctx.fillStyle = "#000";
    rr(r.x + r.w * 0.36, r.y + r.w * 0.018, r.w * 0.28, r.w * 0.06, r.w * 0.03); ctx.fill(); ctx.restore();
  }
  function clipPhone(r) { ctx.beginPath(); if (r.frame) rr(r.x, r.y, r.w, r.h, r.w * 0.11); else ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); }

  // ------------------------------------------------------------------
  // Efecto: Chat de teléfono
  // ------------------------------------------------------------------
  registerFx("phoneChat", {
    preset: fx2Base({ name: "Chat de teléfono", duration: 12, primary: "#1f7a5c", fx: { format: "vertical" } }),
    idle: 0.75,
    fields: [],
    draw(s, el) {
      const W = canvas.width, H = canvas.height;
      const r = phoneRect(W, H);
      if (r.frame && !(s.bgMode === "media")) { ctx.fillStyle = "#1a1f2b"; ctx.fillRect(0, 0, W, H); }
      drawPhoneFrame(r);
      ctx.save(); clipPhone(r);
      drawChatScreen(r.x, r.y, r.w, r.h, el);
      ctx.restore();
      if (r.frame) drawNotch(r);
    },
    sound(ac, dest, start) {
      chatTimeline().msgs.forEach((m) => {
        if (m.me) { sfxWhoosh(ac, dest, start + m.at - 0.05, 0.12, 0.08); sfxPop(ac, dest, start + m.at, 0.25); }
        else { sfxBlip(ac, dest, start + m.at, 1180, 0.16); sfxBlip(ac, dest, start + m.at + 0.09, 1560, 0.12); }
      });
    },
    accentAt: () => 0.5,
  });

  // ------------------------------------------------------------------
  // Efecto: Notificación de mensaje (encima de tu video)
  // ------------------------------------------------------------------
  const firstLine = () => (chat.text.split(/\n/).map((l) => l.replace(/^(>|yo\s*:|<|[ée]l\s*:|ella\s*:)\s*/i, "").trim()).find(Boolean) || "");
  registerFx("phoneNotif", {
    preset: fx2Base({ name: "Notificación de mensaje", duration: 4, primary: "#34c759", fx: { format: "vertical" } }),
    idle: 0.5,
    fields: [],
    draw(s, el) {
      const W = canvas.width, H = canvas.height, u = Math.min(W, H);
      const inK = easeBack(el / 0.45), out = clamp((s.duration - el) / 0.35, 0, 1);
      const k = Math.min(inK, out < 1 ? out : 1);
      const bw = Math.min(W * 0.92, u * 0.95), bh = u * 0.2;
      const bx = (W - bw) / 2, by = -bh - u * 0.05 + (u * 0.06 + bh + u * 0.05) * k;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = u * 0.04; ctx.shadowOffsetY = u * 0.01;
      ctx.fillStyle = "rgba(245,245,247,0.96)"; rr(bx, by, bw, bh, u * 0.05); ctx.fill();
      ctx.shadowColor = "transparent";
      const ix = bx + u * 0.035, iy = by + u * 0.035, is = u * 0.085;
      const g = ctx.createLinearGradient(ix, iy, ix, iy + is); g.addColorStop(0, "#5df57c"); g.addColorStop(1, "#1fbf45");
      ctx.fillStyle = g; rr(ix, iy, is, is, is * 0.24); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(ix + is / 2, iy + is * 0.47, is * 0.32, is * 0.26, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ix + is * 0.3, iy + is * 0.62); ctx.lineTo(ix + is * 0.24, iy + is * 0.8); ctx.lineTo(ix + is * 0.45, iy + is * 0.68); ctx.fill();
      const tx = ix + is + u * 0.03;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = "#6b6b70"; ctx.font = `600 ${u * 0.03}px ${FONT}`;
      ctx.fillText("MENSAJES", tx, iy);
      ctx.textAlign = "right"; ctx.fillText("ahora", bx + bw - u * 0.04, iy); ctx.textAlign = "left";
      ctx.fillStyle = "#111"; ctx.font = `700 ${u * 0.04}px ${FONT}`;
      ctx.fillText(chat.name, tx, iy + u * 0.045);
      ctx.font = `500 ${u * 0.037}px ${FONT}`;
      let msg = firstLine();
      while (ctx.measureText(msg).width > bw - (tx - bx) - u * 0.05 && msg.length > 2) msg = msg.slice(0, -2) + "…";
      ctx.fillText(msg, tx, iy + u * 0.095);
      ctx.restore();
    },
    sound(ac, dest, start) { sfxBlip(ac, dest, start + 0.15, 1320, 0.22); sfxBlip(ac, dest, start + 0.3, 1760, 0.18); },
    accentAt: () => 0.15,
  });

  // ------------------------------------------------------------------
  // Efecto: Llamada entrante
  // ------------------------------------------------------------------
  registerFx("phoneCall", {
    preset: fx2Base({ name: "Llamada entrante", duration: 5, primary: "#34c759", fx: { format: "vertical" } }),
    idle: 0.6,
    fields: [],
    draw(s, el) {
      const W = canvas.width, H = canvas.height;
      const r = phoneRect(W, H);
      if (r.frame && s.bgMode !== "media") { ctx.fillStyle = "#1a1f2b"; ctx.fillRect(0, 0, W, H); }
      drawPhoneFrame(r);
      ctx.save(); clipPhone(r);
      const { x, y, w, h } = r, u = w;
      const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
      g.addColorStop(0, "#3b3f58"); g.addColorStop(0.5, "#1d2033"); g.addColorStop(1, "#0b0c14");
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      drawStatusBar(x, y, w, u * 0.075, "#fff");
      const fade = clamp(el / 0.4, 0, 1);
      ctx.globalAlpha = fade;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
      ctx.font = `700 ${u * 0.1}px ${FONT}`;
      let nm = chat.name; while (ctx.measureText(nm).width > w * 0.9 && nm.length > 2) nm = nm.slice(0, -1);
      ctx.fillText(nm, x + w / 2, y + h * 0.17);
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = `500 ${u * 0.045}px ${FONT}`;
      const sub = currentPreset === "phoneCall" && chat.text.trim() ? firstLine() : "";
      ctx.fillText(sub || "llamada de celular…", x + w / 2, y + h * 0.235);
      // avatar con pulsos
      const ay = y + h * 0.43, ar = u * 0.18;
      for (let i = 0; i < 3; i++) {
        const p = ((el * 0.9 + i / 3) % 1);
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - p)})`; ctx.lineWidth = u * 0.008;
        ctx.beginPath(); ctx.arc(x + w / 2, ay, ar * (1 + p * 0.8), 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = fade;
      drawAvatar(x + w / 2, ay, ar, chat.name, "#7a86a8");
      // botones
      const by = y + h * 0.8, br = u * 0.09;
      [[x + w * 0.27, "#ff3b30", "Rechazar", Math.PI * 0.75], [x + w * 0.73, "#34c759", "Contestar", 0]].forEach(([bx, col, label, rot], i) => {
        const wob = i === 1 ? Math.sin(el * 14) * 0.18 * (Math.sin(el * 3) > 0 ? 1 : 0) : 0;
        ctx.save(); ctx.translate(bx, by);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, br, 0, 7); ctx.fill();
        ctx.rotate(rot + wob); ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.ellipse(0, 0, br * 0.55, br * 0.2, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(-br * 0.55, -br * 0.02, br * 0.24, br * 0.2); ctx.fillRect(br * 0.31, -br * 0.02, br * 0.24, br * 0.2);
        ctx.restore();
        ctx.fillStyle = "#fff"; ctx.font = `500 ${u * 0.038}px ${FONT}`; ctx.fillText(label, bx, by + br * 1.55);
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff"; rr(x + w * 0.35, y + h - u * 0.035, w * 0.3, u * 0.011, u * 0.006); ctx.fill();
      ctx.restore();
      if (r.frame) drawNotch(r);
    },
    sound(ac, dest, start, s) {
      for (let t = 0.3; t < (s?.duration || 5) - 0.4; t += 2) {
        for (let k = 0; k < 6; k++) { sfxBlip(ac, dest, start + t + k * 0.09, k % 2 ? 1046 : 1318, 0.12); }
      }
    },
    accentAt: () => 0.3,
  });

  // los presets nuevos también deben estar en la lista general
  if (typeof presets === "object" && typeof fxPresets === "object") PHONE_KEYS.forEach((k) => { presets[k] = fxPresets[k]; });

  // ------------------------------------------------------------------
  // Más diseños de quiz
  // ------------------------------------------------------------------
  if (typeof QUIZ_THEMES === "object") {
    const more = {
      ocean: { name: "Océano", bg1: "#022c4a", bg2: "#0a7fb5", card: "#ffffff", cardText: "#06324d", accent: "#3fe0ff", opt: "#064569", optText: "#ffffff", border: "#3fe0ff", deco: "dots" },
      jungle: { name: "Selva", bg1: "#0b3d1e", bg2: "#2f8f3a", card: "#fffbe6", cardText: "#173b12", accent: "#ffd23f", opt: "#14532d", optText: "#ffffff", border: "#ffd23f", deco: "rays" },
      fire: { name: "Fuego", bg1: "#3b0606", bg2: "#e8530f", card: "#fff4e5", cardText: "#3b0a00", accent: "#ffcf2e", opt: "#5c1206", optText: "#ffffff", border: "#ffcf2e", deco: "rays" },
      space: { name: "Espacio", bg1: "#04030f", bg2: "#2a1b6b", card: "#120f33", cardText: "#ffffff", accent: "#b78bff", opt: "#1b1650", optText: "#ffffff", border: "#b78bff", deco: "dots" },
      gold: { name: "Negro y oro (lujo)", bg1: "#050505", bg2: "#2b2312", card: "#111111", cardText: "#ffe7a3", accent: "#e8b923", opt: "#1a1a1a", optText: "#ffe7a3", border: "#e8b923", deco: "rays" },
      retro: { name: "Retro arcade", bg1: "#1a0033", bg2: "#ff2e88", card: "#12002b", cardText: "#ffffff", accent: "#ffe600", opt: "#2b0057", optText: "#ffffff", border: "#00f0ff", deco: "grid" },
      horror: { name: "Terror (Halloween)", bg1: "#0a0a0a", bg2: "#4a1302", card: "#1a0d05", cardText: "#ff9a1f", accent: "#ff6a00", opt: "#1f0f06", optText: "#ffe1c4", border: "#ff6a00", deco: "none" },
      xmas: { name: "Navidad", bg1: "#7a0b16", bg2: "#d42a2a", card: "#ffffff", cardText: "#14532d", accent: "#22c55e", opt: "#14532d", optText: "#ffffff", border: "#ffffff", deco: "dots" },
      school: { name: "Escuela (pizarrón)", bg1: "#14382a", bg2: "#1f5a43", card: "#fffdf2", cardText: "#1e293b", accent: "#facc15", opt: "#1a4434", optText: "#ffffff", border: "#e2e8f0", deco: "none" },
      sky: { name: "Cielo (claro)", bg1: "#bfe6ff", bg2: "#7cc4ff", card: "#ffffff", cardText: "#0b3a5b", accent: "#ff7a1a", opt: "#ffffff", optText: "#0b3a5b", border: "#ffffff", deco: "dots" },
      mint: { name: "Menta", bg1: "#c9f7e4", bg2: "#5fd6b0", card: "#ffffff", cardText: "#0f3d33", accent: "#0f9b74", opt: "#ffffff", optText: "#0f3d33", border: "#ffffff", deco: "dots" },
    };
    Object.assign(QUIZ_THEMES, more);
    document.querySelectorAll("select#qTheme, select[id$='Theme'][id^='q']").forEach((sel) => {
      Object.entries(more).forEach(([k, t]) => {
        if (sel.querySelector(`option[value="${k}"]`)) return;
        const o = document.createElement("option"); o.value = k; o.textContent = t.name; sel.appendChild(o);
      });
    });
  }

  // ------------------------------------------------------------------
  // Botones en la barra lateral
  // ------------------------------------------------------------------
  function addSidebarGroup() {
    if (document.querySelector("#phoneGroup")) return;
    const ref = document.querySelector('.preset[data-preset="subscribe"]')?.closest("details.group");
    if (!ref) return;
    const g = document.createElement("details");
    g.className = "group"; g.id = "phoneGroup"; g.open = true;
    g.innerHTML = `<summary class="group-title">Teléfono y chats 🆕 <span class="count">3</span></summary>
      <div class="preset-list">
        <button class="preset" data-preset="phoneChat">Chat de teléfono</button>
        <button class="preset" data-preset="phoneNotif">Notificación de mensaje</button>
        <button class="preset" data-preset="phoneCall">Llamada entrante</button>
      </div>`;
    ref.before(g);
    g.querySelectorAll(".preset").forEach((b) => b.addEventListener("click", () => window.applyPreset(b.dataset.preset)));
  }

  const init = () => { addSidebarGroup(); buildPanel(); refreshPanel(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
