// Panel de resultados: guardar en Fotos (iPhone) y unir videos con transiciones.
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
  .clipsheet video{width:64px;height:64px;object-fit:cover;border-radius:8px;background:#000;flex:none}
  .clipsheet .nm{flex:1;min-width:0;font-weight:600;font-size:.92rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .clipsheet button,.clipsheet select{font:inherit;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
  .clipsheet .pri{background:#8ab4f8;color:#0b0d12}
  .clipsheet .sec{background:#262b36;color:#f4f7fb}
  .clipsheet .big{width:100%;margin-top:10px;padding:14px}
  .clipsheet .join{margin-top:14px;padding:12px;border-radius:12px;background:#0f1218;border:1px solid #333b4c;display:grid;gap:10px}
  .clipsheet .join label{display:grid;gap:4px;font-size:.85rem;color:#b6bfcc}
  .clipsheet select{background:#262b36;color:#fff;font-weight:600}
  .clipsheet .bar{height:8px;border-radius:4px;background:#262b36;overflow:hidden}
  .clipsheet .bar span{display:block;height:100%;width:0;background:#8ab4f8;transition:width .2s}
  .clipsheet .close{position:sticky;top:0;float:right;background:#262b36;color:#fff;border-radius:50%;width:36px;height:36px;padding:0}
  .clipsheet .result{margin-top:12px}
  .clipsheet .result video{width:100%;height:auto;max-height:50vh;border-radius:12px}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const sheet = document.createElement("div");
  sheet.className = "clipsheet"; sheet.hidden = true;
  sheet.innerHTML = `<div class="box"><button class="close" aria-label="Cerrar">✕</button><div class="body"></div></div>`;
  sheet.querySelector(".close").onclick = () => { sheet.hidden = true; };
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(sheet));
  if (document.body) document.body.appendChild(sheet);

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

  function show(clips, opts = {}) {
    const body = sheet.querySelector(".body");
    const n = clips.length;
    const phone = isPhone();
    const tip = phone ? "Toca <b>Guardar</b> y en el menú elige <b>Guardar video</b> para que quede en Fotos." : "";
    body.innerHTML = `<h3>${n === 1 ? "Tu video está listo" : `${n} videos listos`}</h3><p>${tip}</p><div class="list"></div>`;
    const list = body.querySelector(".list");
    clips.forEach((c) => {
      const row = document.createElement("div"); row.className = "row";
      const v = document.createElement("video"); v.src = URL.createObjectURL(c.blob); v.muted = true; v.playsInline = true; v.preload = "metadata";
      const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = c.name;
      const b = document.createElement("button"); b.className = "pri"; b.textContent = "Guardar";
      b.onclick = () => saveFiles([c], b);
      row.append(v, nm, b); list.appendChild(row);
    });
    if (n > 1) {
      const all = document.createElement("button"); all.className = "sec big"; all.textContent = `Guardar los ${n} videos`;
      all.onclick = () => saveFiles(clips, all);
      body.appendChild(all);
      const j = document.createElement("div"); j.className = "join";
      j.innerHTML = `<b>Unir en un solo video</b>
        <label>Transición<select class="tr">
          <option value="fade">Fundido cruzado</option>
          <option value="black">Fundido a negro</option>
          <option value="slide">Deslizar</option>
          <option value="zoom">Zoom</option>
          <option value="flash">Destello blanco</option>
          <option value="cut">Sin transición (corte)</option>
        </select></label>
        <label>Duración de la transición<select class="td">
          <option value="0.4">0.4 s (rápida)</option><option value="0.7" selected>0.7 s</option><option value="1">1 s (suave)</option>
        </select></label>
        <div class="bar" hidden><span></span></div>
        <button class="pri go">Unir ${n} videos</button>
        <p class="msg" style="margin:0"></p>
        <div class="result"></div>`;
      body.appendChild(j);
      const go = j.querySelector(".go");
      go.onclick = async () => {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        ac.resume();
        go.disabled = true; go.textContent = "Uniendo...";
        const bar = j.querySelector(".bar"); bar.hidden = false;
        const msg = j.querySelector(".msg"); msg.textContent = "Se arma en tiempo real: no cierres ni cambies de app.";
        try {
          const blob = await joinClips(clips.map((c) => c.blob), j.querySelector(".tr").value, Number(j.querySelector(".td").value), ac,
            (p) => { bar.firstElementChild.style.width = Math.round(p * 100) + "%"; });
          const name = `video-unido-${n}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
          const res = j.querySelector(".result"); res.innerHTML = "";
          const v = document.createElement("video"); v.src = URL.createObjectURL(blob); v.controls = true; v.playsInline = true;
          const sb = document.createElement("button"); sb.className = "pri big"; sb.textContent = "Guardar video unido";
          sb.onclick = () => saveFiles([{ name, blob }], sb);
          res.append(v, sb);
          msg.textContent = "¡Listo!";
        } catch (e) {
          console.error(e); msg.textContent = "No se pudo unir: " + e.message;
        } finally {
          go.disabled = false; go.textContent = `Unir ${n} videos otra vez`; ac.close().catch(() => {});
        }
      };
    }
    sheet.hidden = false;
  }
  window.showClipResults = show;

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

  async function joinClips(blobs, tr, T, ac, onProgress) {
    if (tr === "cut") T = 0;
    const vids = await Promise.all(blobs.map(loadVideo));
    const bufs = new Array(blobs.length).fill(null);
    for (let i = 0; i < blobs.length; i++) {
      try { bufs[i] = await ac.decodeAudioData(await blobs[i].arrayBuffer()); } catch { bufs[i] = null; }
    }
    const dur = vids.map((v, i) => (isFinite(v.duration) && v.duration > 0 ? v.duration : bufs[i]?.duration || 6));
    T = Math.min(T, ...dur.map((d) => d / 2));
    const start = []; let acc = 0;
    dur.forEach((d, i) => { start.push(acc); acc += d - (i < dur.length - 1 ? T : 0); });
    const total = acc;
    const W = vids[0].videoWidth || 1080, H = vids[0].videoHeight || 1920;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const stream = cv.captureStream(0);
    const vtrack = stream.getVideoTracks()[0];
    const dest = ac.createMediaStreamDestination();
    if (bufs.some(Boolean)) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
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
      if (T && i < bufs.length - 1) { g.gain.setValueAtTime(1, t1 - T); g.gain.linearRampToValueAtTime(0, t1); }
      s.start(t0, 0, dur[i]);
    });
    rec.start(250);
    const started = new Set();

    const draw = (v, alpha = 1, dx = 0, scale = 1) => {
      if (alpha <= 0 || v.readyState < 2) return;
      const vw = v.videoWidth || W, vh = v.videoHeight || H;
      const k = Math.max(W / vw, H / vh) * scale, w = vw * k, h = vh * k;
      ctx.globalAlpha = alpha;
      ctx.drawImage(v, (W - w) / 2 + dx, (H - h) / 2, w, h);
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
        for (let i = 0; i < vids.length; i++) if (t >= start[i] && t < start[i] + dur[i]) act.push(i);
        if (act.length === 1 || (act.length === 2 && !T)) draw(vids[act[act.length - 1]]);
        else if (act.length >= 2) {
          const a = vids[act[0]], b = vids[act[1]];
          const p = Math.min(1, Math.max(0, (t - start[act[1]]) / T));
          const e = p * p * (3 - 2 * p);
          if (tr === "fade") { draw(a); draw(b, e); }
          else if (tr === "black") { if (p < 0.5) draw(a, 1 - p * 2); else draw(b, (p - 0.5) * 2); }
          else if (tr === "slide") { draw(a, 1, -W * e); draw(b, 1, W * (1 - e)); }
          else if (tr === "zoom") { draw(a, 1 - e, 0, 1 + e * 0.6); draw(b, e, 0, 1.4 - 0.4 * e); }
          else if (tr === "flash") { draw(p < 0.5 ? a : b); ctx.fillStyle = `rgba(255,255,255,${1 - Math.abs(p - 0.5) * 2})`; ctx.fillRect(0, 0, W, H); }
        }
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
