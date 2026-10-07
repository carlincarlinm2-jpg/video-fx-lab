// Video FX Lab: unir quizzes en un solo video con transiciones y final de "like y suscríbete",
// y guardar en Fotos (iPhone).
(function () {
  const isPhone = () => matchMedia("(pointer: coarse)").matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  window.fxIsPhone = isPhone;

  // En teléfono, por defecto MP4 (Fotos de iPhone no acepta WebM)
  document.addEventListener("DOMContentLoaded", () => {
    const sel = document.querySelector("#outFormat");
    if (sel && isPhone()) { sel.value = "mp4"; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  });

  const css = `
  .clipsheet{position:fixed;inset:0;z-index:9999;background:#000a;display:flex;align-items:flex-end;justify-content:center}
  .clipsheet[hidden]{display:none!important}
  .clipsheet .box{background:#151922;color:#f4f7fb;width:min(560px,100%);max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));font-family:Outfit,system-ui,sans-serif;box-shadow:0 -10px 40px #0008}
  @media(min-width:700px){.clipsheet{align-items:center}.clipsheet .box{border-radius:18px}}
  .clipsheet h3{margin:0 0 4px;font-size:1.25rem}
  .clipsheet p{margin:0 0 12px;color:#b6bfcc;font-size:.92rem;line-height:1.4}
  .clipsheet .row{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #262b36}
  .clipsheet .row video{width:56px;height:56px;object-fit:cover;border-radius:8px;background:#000;flex:none}
  .clipsheet .nm{flex:1;min-width:0;font-weight:600;font-size:.92rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .clipsheet button,.clipsheet select,.clipsheet input[type=text]{font:inherit;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
  .clipsheet input[type=text]{background:#262b36;color:#fff;font-weight:600;cursor:text}
  .clipsheet .pri{background:#ffd60a;color:#111}
  .clipsheet .sec{background:#262b36;color:#f4f7fb}
  .clipsheet .big{width:100%;margin-top:10px;padding:14px;font-size:1.05rem}
  .clipsheet .join{margin-top:6px;padding:12px;border-radius:12px;background:#0f1218;border:1px solid #333b4c;display:grid;gap:10px}
  .clipsheet .join label{display:grid;gap:4px;font-size:.85rem;color:#b6bfcc}
  .clipsheet .join label.ck{display:flex;align-items:center;gap:8px;color:#f4f7fb;font-weight:600}
  .clipsheet select{background:#262b36;color:#fff;font-weight:600}
  .clipsheet .bar{height:10px;border-radius:5px;background:#262b36;overflow:hidden}
  .clipsheet .bar span{display:block;height:100%;width:0;background:#ffd60a;transition:width .2s}
  .clipsheet .close{position:sticky;top:0;float:right;background:#262b36;color:#fff;border-radius:50%;width:36px;height:36px;padding:0}
  .clipsheet .result video{width:100%;height:auto;max-height:55vh;border-radius:12px;background:#000}
  .clipsheet details{margin-top:12px}
  .clipsheet summary{cursor:pointer;color:#b6bfcc;font-weight:600}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const sheet = document.createElement("div");
  sheet.className = "clipsheet"; sheet.hidden = true;
  sheet.innerHTML = `<div class="box"><button class="close" aria-label="Cerrar">✕</button><div class="body"></div></div>`;
  sheet.querySelector(".close").onclick = () => { sheet.hidden = true; };
  const attach = () => { if (!sheet.isConnected && document.body) document.body.appendChild(sheet); };
  document.addEventListener("DOMContentLoaded", attach); attach();

  const toFile = (c) => new File([c.blob], c.name.replace(/\.\w+$/, "") + "." + (c.blob.type.includes("mp4") ? "mp4" : (c.name.split(".").pop() || "mp4")), { type: c.blob.type || "video/mp4" });

  async function saveFiles(list, btn) {
    const files = list.map(toFile);
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files }); if (btn) btn.textContent = "✓ Listo"; }
      catch (e) { if (e.name !== "AbortError") alert("No se pudo abrir Compartir: " + e.message); }
      return;
    }
    files.forEach((f, i) => setTimeout(() => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
    }, i * 400));
  }

  const JOIN_DEFAULTS = { tr: "fade", td: 0.7, outro: true, outroText: "¡Dale like y suscríbete para más quizzes!" };

  function joinControlsHtml(o) {
    const opt = (v, l, cur) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${l}</option>`;
    return `<label>Transición<select class="tr">
        ${opt("fade", "Fundido cruzado", o.tr)}${opt("black", "Fundido a negro", o.tr)}${opt("slide", "Deslizar", o.tr)}
        ${opt("zoom", "Zoom", o.tr)}${opt("flash", "Destello blanco", o.tr)}${opt("cut", "Sin transición (corte)", o.tr)}
      </select></label>
      <label>Duración de la transición<select class="td">
        ${opt(0.4, "0.4 s (rápida)", o.td)}${opt(0.7, "0.7 s", o.td)}${opt(1, "1 s (suave)", o.td)}
      </select></label>
      <label class="ck"><input type="checkbox" class="oc"${o.outro ? " checked" : ""}/> Agregar final de like y suscríbete (4 s)</label>
      <label>Texto del final<input type="text" class="ot" value="${o.outroText.replace(/"/g, "&quot;")}"/></label>`;
  }
  const readControls = (root) => ({
    tr: root.querySelector(".tr").value,
    td: Number(root.querySelector(".td").value),
    outro: root.querySelector(".oc").checked,
    outroText: root.querySelector(".ot").value.trim() || JOIN_DEFAULTS.outroText,
  });

  // Muestra el panel. opts.autoJoin = {ac, ...ajustes} une de inmediato.
  function show(clips, opts = {}) {
    attach();
    const body = sheet.querySelector(".body");
    const n = clips.length;
    const auto = opts.autoJoin;
    const cfg = { ...JOIN_DEFAULTS, ...(auto || {}) };
    body.innerHTML = auto
      ? `<h3>Creando tu video</h3><p>Se están uniendo las ${n} preguntas${cfg.outro ? " y el final" : ""}. Se graba en tiempo real: <b>no cierres la app ni apagues la pantalla</b>.</p>`
      : `<h3>${n === 1 ? "Tu video está listo" : `${n} videos`}</h3><p>${isPhone() ? "Toca <b>Guardar</b> y elige <b>Guardar video</b> para que quede en Fotos." : ""}</p>`;

    const j = document.createElement("div"); j.className = "join";
    j.innerHTML = `${n > 1 || auto ? `<b>Unir en un solo video</b>${joinControlsHtml(cfg)}<button class="pri big go">Crear video unido</button>` : ""}
      <div class="bar" hidden><span></span></div><p class="msg" style="margin:0"></p><div class="result"></div>`;
    if (n > 1 || auto) body.appendChild(j);

    const sep = document.createElement("details");
    sep.innerHTML = `<summary>${auto ? "Ver o guardar cada pregunta por separado" : "Videos por separado"}</summary>`;
    clips.forEach((c) => {
      const row = document.createElement("div"); row.className = "row";
      const v = document.createElement("video"); v.src = URL.createObjectURL(c.blob); v.muted = true; v.playsInline = true; v.preload = "metadata";
      const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = c.name;
      const b = document.createElement("button"); b.className = "sec"; b.textContent = "Guardar";
      b.onclick = () => saveFiles([c], b);
      row.append(v, nm, b); sep.appendChild(row);
    });
    if (n > 1) {
      const all = document.createElement("button"); all.className = "sec big"; all.textContent = `Guardar los ${n} por separado`;
      all.onclick = () => saveFiles(clips, all); sep.appendChild(all);
    }
    if (n === 1 && !auto) { sep.open = true; sep.querySelector("summary").hidden = true; }
    body.appendChild(sep);
    if (n === 1 && !auto) body.appendChild(j);

    const go = j.querySelector(".go");
    async function run(ac) {
      const c = readControls(j);
      go.disabled = true; go.textContent = "Creando video...";
      const bar = j.querySelector(".bar"); bar.hidden = false; bar.firstElementChild.style.width = "0";
      const msg = j.querySelector(".msg"); msg.textContent = "No cierres la app mientras se crea.";
      j.querySelector(".result").innerHTML = "";
      try {
        const blob = await joinClips(clips.map((x) => x.blob), c.tr, c.td, ac,
          (p) => { bar.firstElementChild.style.width = Math.round(p * 100) + "%"; }, c.outro ? { text: c.outroText, seconds: 4 } : null);
        const name = `quiz-completo-${n}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
        const res = j.querySelector(".result");
        const v = document.createElement("video"); v.src = URL.createObjectURL(blob); v.controls = true; v.playsInline = true;
        const sb = document.createElement("button"); sb.className = "pri big"; sb.textContent = isPhone() ? "📲 Guardar en Fotos" : "⬇ Descargar video";
        sb.onclick = () => saveFiles([{ name, blob }], sb);
        res.append(v, sb);
        bar.hidden = true;
        msg.textContent = `¡Listo! ${Math.round(v.duration || 0) ? "" : ""}Toca el botón para guardarlo.`;
        body.querySelector("h3").textContent = "Tu video está listo"; const p0 = body.querySelector("p"); if (p0) p0.textContent = "Revísalo abajo y guárdalo.";
      } catch (e) {
        console.error(e); msg.textContent = "No se pudo unir: " + e.message;
      } finally {
        go.disabled = false; go.textContent = "Crear otra vez con otros ajustes"; ac.close?.().catch(() => {});
      }
    }
    if (go) go.onclick = () => { const ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); run(ac); };
    sheet.hidden = false;
    if (auto && go) run(auto.ac);
  }
  window.showClipResults = show;
  window.fxJoinDefaults = JOIN_DEFAULTS;
  window.fxJoinControlsHtml = joinControlsHtml;
  window.fxReadJoinControls = readControls;

  function pickMime() {
    const l = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
    return l.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  }

  function loadVideo(blob) {
    return new Promise((ok, bad) => {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = URL.createObjectURL(blob);
      v.onloadeddata = () => ok(v); v.onerror = () => bad(new Error("no se pudo leer un video"));
      v.load();
    });
  }

  // ---------- Final animado: like y suscríbete ----------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const pop = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2));
  function wrap(ctx, text, maxW) {
    const words = text.split(/\s+/); const lines = []; let cur = "";
    words.forEach((w) => { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function drawOutro(ctx, W, H, t, text) {
    const u = Math.min(W, H);
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#2a0a5e"); g.addColorStop(1, "#0b1030");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // destellos
    for (let i = 0; i < 26; i++) {
      const a = (i * 137.5) % 360, r = ((i * 53) % 100) / 100;
      const x = W * (0.5 + 0.48 * Math.cos(a + t * 0.4) * r), y = H * (0.5 + 0.48 * Math.sin(a * 1.3 + t * 0.3) * r);
      ctx.fillStyle = `rgba(255,214,10,${0.25 + 0.25 * Math.sin(t * 3 + i)})`;
      ctx.beginPath(); ctx.arc(x, y, u * 0.006, 0, 7); ctx.fill();
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // titular
    const s1 = pop(t / 0.5);
    ctx.save(); ctx.translate(W / 2, H * 0.27); ctx.scale(s1, s1);
    ctx.font = `900 ${u * 0.085}px "Luckiest Guy", Outfit, system-ui`;
    ctx.lineWidth = u * 0.014; ctx.strokeStyle = "#000"; ctx.fillStyle = "#ffd60a";
    ctx.strokeText("¿CUÁNTAS", 0, -u * 0.055); ctx.fillText("¿CUÁNTAS", 0, -u * 0.055);
    ctx.strokeText("ACERTASTE?", 0, u * 0.045); ctx.fillText("ACERTASTE?", 0, u * 0.045);
    ctx.restore();
    // botones
    const bw = u * 0.62, bh = u * 0.13, cx = W / 2;
    const likeY = H * 0.5, subY = likeY + bh * 1.35;
    const liked = t > 1.6, subbed = t > 2.6;
    [[likeY, 0.7, liked, liked ? "#3ea6ff" : "#ffffff", liked ? "#ffffff" : "#111", "👍  ME GUSTA"], [subY, 1.0, subbed, subbed ? "#3a3a3e" : "#e8112d", "#ffffff", subbed ? "✓  SUSCRITO" : "SUSCRÍBETE"]].forEach(([y, at, on, bg, fg, label]) => {
      const s = pop((t - at) / 0.45); if (s <= 0) return;
      const tap = on ? 1 : 1 - 0.08 * Math.max(0, 1 - Math.abs(t - (at + 0.9)) * 6);
      ctx.save(); ctx.translate(cx, y); ctx.scale(s * tap, s * tap);
      ctx.shadowColor = "#0008"; ctx.shadowBlur = u * 0.03;
      rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fillStyle = bg; ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = fg; ctx.font = `800 ${bh * 0.42}px Outfit, system-ui`;
      ctx.fillText(label, 0, 2); ctx.restore();
    });
    // dedo que toca
    const handPath = [[0.9, likeY], [1.6, likeY], [2.2, subY], [2.6, subY], [3.2, subY + bh * 2]];
    if (t > 0.9 && t < 3.4) {
      let hx = cx + bw * 0.28, hy = likeY;
      for (let i = 0; i < handPath.length - 1; i++) {
        const [t0, y0] = handPath[i], [t1, y1] = handPath[i + 1];
        if (t >= t0 && t <= t1) { const k = (t - t0) / (t1 - t0); hy = y0 + (y1 - y0) * k * k * (3 - 2 * k); }
      }
      if (t > 3.2) hy = handPath[4][1];
      ctx.font = `${u * 0.1}px system-ui`; ctx.fillText("👆", hx, hy + bh * 0.55);
    }
    // texto inferior
    const s3 = Math.min(1, Math.max(0, (t - 1.4) / 0.5));
    ctx.globalAlpha = s3;
    ctx.font = `800 ${u * 0.055}px Outfit, system-ui`; ctx.fillStyle = "#fff"; ctx.lineWidth = u * 0.008; ctx.strokeStyle = "#000";
    const lines = wrap(ctx, text, W * 0.86);
    lines.forEach((l, i) => { const y = H * 0.8 + (i - (lines.length - 1) / 2) * u * 0.07; ctx.strokeText(l, W / 2, y); ctx.fillText(l, W / 2, y); });
    ctx.globalAlpha = 1;
  }
  function outroSounds(ac, dest, t0) {
    const blip = (at, f) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(f, at);
      o.frequency.exponentialRampToValueAtTime(f * 1.6, at + 0.08);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.4, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      o.connect(g).connect(dest); o.start(at); o.stop(at + 0.2);
    };
    blip(t0 + 0.05, 520); blip(t0 + 0.7, 660); blip(t0 + 1.0, 660); blip(t0 + 1.6, 880); blip(t0 + 2.6, 990);
  }

  async function joinClips(blobs, tr, T, ac, onProgress, outro) {
    if (tr === "cut") T = 0;
    const vids = await Promise.all(blobs.map(loadVideo));
    const bufs = new Array(blobs.length).fill(null);
    for (let i = 0; i < blobs.length; i++) {
      try { bufs[i] = await ac.decodeAudioData(await blobs[i].arrayBuffer()); } catch { bufs[i] = null; }
    }
    const dur = vids.map((v, i) => (isFinite(v.duration) && v.duration > 0 ? v.duration : bufs[i]?.duration || 6));
    const W = vids[0].videoWidth || 1080, H = vids[0].videoHeight || 1920;
    // la lista de "pistas": videos + final opcional
    const items = vids.map((v, i) => ({ v, dur: dur[i] }));
    let outroCanvas = null;
    if (outro) {
      outroCanvas = document.createElement("canvas"); outroCanvas.width = W; outroCanvas.height = H;
      items.push({ outro: true, dur: outro.seconds || 4 });
    }
    T = Math.min(T, ...items.map((x) => x.dur / 2));
    const start = []; let acc = 0;
    items.forEach((x, i) => { start.push(acc); acc += x.dur - (i < items.length - 1 ? T : 0); });
    const total = acc;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const stream = cv.captureStream(0);
    const vtrack = stream.getVideoTracks()[0];
    const dest = ac.createMediaStreamDestination();
    if (bufs.some(Boolean) || outro) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const mime = pickMime();
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 10_000_000 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((ok) => { rec.onstop = ok; });

    await ac.resume();
    const base = ac.currentTime + 0.25;
    bufs.forEach((b, i) => {
      if (!b) return;
      const s = ac.createBufferSource(); s.buffer = b;
      const g = ac.createGain(); s.connect(g).connect(dest);
      const t0 = base + start[i], t1 = t0 + dur[i];
      g.gain.setValueAtTime(T && i > 0 ? 0 : 1, t0);
      if (T && i > 0) g.gain.linearRampToValueAtTime(1, t0 + T);
      if (T && i < items.length - 1) { g.gain.setValueAtTime(1, t1 - T); g.gain.linearRampToValueAtTime(0, t1); }
      s.start(t0, 0, dur[i]);
    });
    if (outro) outroSounds(ac, dest, base + start[items.length - 1]);
    rec.start(250);
    const started = new Set();

    const draw = (i, t, alpha = 1, dx = 0, scale = 1) => {
      if (alpha <= 0) return;
      const it = items[i];
      let src;
      if (it.outro) { drawOutro(outroCanvas.getContext("2d"), W, H, Math.max(0, t - start[i]), outro.text); src = outroCanvas; }
      else { src = it.v; if (src.readyState < 2) return; }
      const vw = src.videoWidth || src.width || W, vh = src.videoHeight || src.height || H;
      const k = Math.max(W / vw, H / vh) * scale, w = vw * k, h = vh * k;
      ctx.globalAlpha = alpha;
      ctx.drawImage(src, (W - w) / 2 + dx, (H - h) / 2, w, h);
      ctx.globalAlpha = 1;
    };

    await new Promise((finish) => {
      const tick = () => {
        const t = ac.currentTime - base;
        vids.forEach((v, i) => {
          if (!started.has(i) && t >= start[i] - 0.03) { started.add(i); v.currentTime = Math.max(0, t - start[i]); v.play().catch(() => {}); }
          if (t > start[i] + dur[i] + 0.1 && !v.paused) v.pause();
        });
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        const act = [];
        for (let i = 0; i < items.length; i++) if (t >= start[i] && t < start[i] + items[i].dur) act.push(i);
        if (act.length === 1 || (act.length === 2 && !T)) draw(act[act.length - 1], t);
        else if (act.length >= 2) {
          const a = act[0], b = act[1];
          const p = Math.min(1, Math.max(0, (t - start[b]) / T));
          const e = p * p * (3 - 2 * p);
          if (tr === "fade") { draw(a, t); draw(b, t, e); }
          else if (tr === "black") { if (p < 0.5) draw(a, t, 1 - p * 2); else draw(b, t, (p - 0.5) * 2); }
          else if (tr === "slide") { draw(a, t, 1, -W * e); draw(b, t, 1, W * (1 - e)); }
          else if (tr === "zoom") { draw(a, t, 1 - e, 0, 1 + e * 0.6); draw(b, t, e, 0, 1.4 - 0.4 * e); }
          else if (tr === "flash") { draw(p < 0.5 ? a : b, t); ctx.fillStyle = `rgba(255,255,255,${1 - Math.abs(p - 0.5) * 2})`; ctx.fillRect(0, 0, W, H); }
        } else if (outro && t >= start[items.length - 1]) draw(items.length - 1, t);
        vtrack.requestFrame?.();
        onProgress?.(Math.min(1, Math.max(0, t / total)));
        if (t >= total) { finish(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    rec.stop();
    await done;
    vids.forEach((v) => { v.pause(); URL.revokeObjectURL(v.src); });
    return new Blob(chunks, { type: (rec.mimeType || mime || "video/mp4").split(";")[0] });
  }
  window.fxJoinClips = joinClips;
})();

// Botón visible: elegir videos (del teléfono o recién exportados) para unirlos o guardarlos
(function () {
  const exported = [];
  window.__fxExported = exported;
  const origShow = window.showClipResults;
  window.showClipResults = (clips, o) => { clips.forEach((c) => exported.push(c)); origShow(clips, o); };
  function addButton() {
    const actions = document.querySelector(".actions");
    if (!actions || document.querySelector("#fxJoinBtn")) return;
    const b = document.createElement("button");
    b.id = "fxJoinBtn"; b.type = "button"; b.textContent = "🎬 Unir videos de mi galería";
    b.style.cssText = "background:#ffd60a;color:#111;font-weight:800";
    const input = document.createElement("input");
    input.type = "file"; input.accept = "video/*"; input.multiple = true; input.hidden = true;
    input.onchange = () => {
      const files = [...input.files];
      input.value = "";
      if (files.length) origShow(files.map((f) => ({ name: f.name, blob: f })));
    };
    b.onclick = () => input.click();
    actions.prepend(b); actions.append(input);
    const ver = document.createElement("div");
    ver.textContent = "Versión 4 · quiz completo en un solo video";
    ver.style.cssText = "font:600 12px Outfit,system-ui;color:#8ab4f8;margin:6px 0";
    actions.after(ver);
  }
  // Opciones dentro de "Varios quizzes a la vez"
  function addBatchOptions() {
    const zip = document.querySelector("#qbZip");
    if (!zip || document.querySelector("#qbJoinBox")) return;
    const box = document.createElement("div");
    box.id = "qbJoinBox";
    box.className = "clipsheet-inline";
    box.style.cssText = "display:grid;gap:8px;padding:10px;border:1px solid #ffd60a66;border-radius:10px;margin:6px 0";
    box.innerHTML = `<label class="check"><input id="qbJoin" type="checkbox" checked /><span><b>Un solo video con todas las preguntas</b> (con transiciones)</span></label>
      <div class="qbj" style="display:grid;gap:8px">${window.fxJoinControlsHtml(window.fxJoinDefaults)}</div>`;
    box.querySelectorAll("select,input[type=text]").forEach((el) => { el.style.cssText = "background:#0f1218;color:#fff;border:1px solid #333b4c;border-radius:8px;padding:8px;font:inherit"; });
    box.querySelectorAll(".qbj label").forEach((l) => { l.style.cssText = "display:grid;gap:4px;font-size:.85rem"; });
    box.querySelector(".ck").style.cssText = "display:flex;gap:8px;align-items:center;font-size:.9rem";
    const zipLabel = zip.closest("label");
    zipLabel.before(box);
    const sync = () => {
      const on = box.querySelector("#qbJoin").checked;
      box.querySelector(".qbj").style.display = on ? "grid" : "none";
      if (on) zip.checked = false;
      zipLabel.style.display = on ? "none" : "";
    };
    box.querySelector("#qbJoin").onchange = sync; sync();
    // Al tocar "Exportar" se crea el audio en ese momento (iPhone lo exige)
    document.querySelector("#qbExport")?.addEventListener("click", () => {
      if (!box.querySelector("#qbJoin").checked) { window.__fxBatchJoin = null; return; }
      const ac = new (window.AudioContext || window.webkitAudioContext)(); ac.resume();
      window.__fxBatchJoin = { ac, ...window.fxReadJoinControls(box) };
    }, true);
  }
  const init = () => { addButton(); addBatchOptions(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
