/* Graham Value — phone app logic. No build step, no dependencies. */
"use strict";

const APP_VERSION = "1.0.0";

/* ---------- Pure calculation (also used by tests) ---------- */
const TYPES = {
  MY: [
    ["General", "", ""],
    ["Bank", "Bank: also check P/B and ROE.", "The formula is a rough guide for banks. Check price-to-book and ROE too. A bank below 1× book with weak ROE is not automatically cheap."],
    ["Cyclical", "Cyclical: use cycle-average EPS.", "O&G services, plantations, gloves and steel swing with prices. Use average EPS across a full cycle (5–7 years) and keep g low."],
    ["REIT", "REIT: formula not suitable.", "REITs are priced on distribution yield, and their EPS includes fair-value swings. Compare DPU yield with the MGS yield instead."],
    ["Property", "Property: normalise EPS, check RNAV.", "Developer earnings depend on project recognition and land sales. Use normalised EPS and cross-check with RNAV."],
    ["Utility", "Utility: keep g modest.", "Utilities, telcos and infrastructure have low, regulated growth. Tariff resets matter more than the formula."]
  ],
  INTL: [
    ["General", "", ""],
    ["Tech / high growth", "High growth: g drives the answer.", "At high g the original formula gives very large multiples (19% growth gives 46.9×). Cap g, lean on the conservative value, and check stock-based pay, which adjusted EPS can leave out."],
    ["Bank", "Bank: also check P/B and ROE.", "Use the formula as a rough guide only. Check price-to-book and ROE."],
    ["Cyclical", "Cyclical: use cycle-average EPS.", "Energy, materials, autos and semiconductors swing with the cycle. Use average EPS across a full cycle and keep g low."],
    ["REIT", "REIT: formula not suitable.", "Value REITs on FFO/AFFO or distribution yield instead."],
    ["Utility", "Utility: keep g modest.", "Low, regulated growth. Rates and regulation matter more than the formula."]
  ]
};

const DEFAULT_SETTINGS = {
  bench: 4.4, mos: 33, gMax: 15, basis: "cons",
  yields: [
    { ccy: "MYR", y: 4.36, asof: "20 Oct 2026" },
    { ccy: "USD", y: 6.11, asof: "19 Oct 2026" },
    { ccy: "EUR", y: null, asof: "" },
    { ccy: "GBP", y: null, asof: "" },
    { ccy: "SGD", y: null, asof: "" },
    { ccy: "HKD", y: null, asof: "" },
    { ccy: "JPY", y: null, asof: "" },
    { ccy: "AUD", y: null, asof: "" }
  ]
};

const EXAMPLES = [
  { id: "ex-mbb", example: true, market: "MY", name: "Maybank (1155)", type: "Bank", ccy: "MYR", eps: 87, unit: "sen", g: 5, price: 10.02, bvps: null, yo: null, added: 1 },
  { id: "ex-goog", example: true, market: "INTL", name: "Alphabet (GOOGL)", type: "Tech / high growth", ccy: "USD", eps: 11.30, unit: "main", g: 19.21, price: 340.59, bvps: null, yo: null, added: 0 }
];

const isNum = v => typeof v === "number" && isFinite(v);

function yieldFor(item, settings) {
  if (isNum(item.yo) && item.yo > 0) return item.yo;
  const ccy = item.market === "MY" ? "MYR" : item.ccy;
  const row = settings.yields.find(r => r.ccy === ccy);
  return row && isNum(row.y) && row.y > 0 ? row.y : NaN;
}

function compute(item, settings) {
  const eps = item.market === "MY" && item.unit === "sen" ? item.eps / 100 : item.eps;
  const g = item.g, y = yieldFor(item, settings), b = settings.bench;
  const adj = isNum(y) && isNum(b) && y > 0 ? b / y : NaN;
  const ready = isNum(eps) && isNum(g) && isNum(adj);
  const pos = ready && eps > 0;
  const cons = pos ? eps * (7 + g) * adj : NaN;
  const orig = pos ? eps * (8.5 + 2 * g) * adj : NaN;
  const v = settings.basis === "orig" ? orig : cons;
  const mos = Math.min(Math.max(isNum(settings.mos) ? settings.mos : 0, 0), 90) / 100;
  const buy = isNum(v) ? v * (1 - mos) : NaN;
  const p = item.price;
  const up = isNum(v) && isNum(p) && p > 0 ? v / p - 1 : NaN;
  const pe = isNum(eps) && eps > 0 && isNum(p) ? p / eps : NaN;
  const gn = isNum(eps) && eps > 0 && isNum(item.bvps) && item.bvps > 0 ? Math.sqrt(22.5 * eps * item.bvps) : NaN;
  let verdict, tone;
  if (ready && !pos) { verdict = "Needs positive EPS"; tone = "na"; }
  else if (!isNum(y)) { verdict = "Add bond yield"; tone = "na"; }
  else if (!ready) { verdict = "Fill in inputs"; tone = "na"; }
  else if (!isNum(p) || p <= 0) { verdict = "Add price"; tone = "na"; }
  else if (p <= buy) { verdict = "Below buy price"; tone = "good"; }
  else if (p <= v) { verdict = "Under value, thin margin"; tone = "warn"; }
  else { verdict = "Above value"; tone = "bad"; }
  const flags = [];
  if (isNum(g) && g > settings.gMax) flags.push("g above " + settings.gMax + "%.");
  if (isNum(g) && g < 0) flags.push("Negative g.");
  if (!isNum(y)) flags.push("No bond yield for " + (item.market === "MY" ? "MYR" : item.ccy || "this currency") + ".");
  const t = (TYPES[item.market] || []).find(r => r[0] === item.type);
  if (t && t[1]) flags.push(t[1]);
  return { eps, y, adj, cons, orig, v, buy, up, pe, gn, verdict, tone, flags, caution: t ? t[2] : "" };
}

if (typeof module !== "undefined") { module.exports = { compute, DEFAULT_SETTINGS, EXAMPLES, TYPES }; }

/* ---------- UI ---------- */
if (typeof document !== "undefined") (function () {
  const $ = id => document.getElementById(id);
  const K = { set: "gv_settings_v1", watch: "gv_watch_v1", cur: "gv_current_v1", view: "gv_view_v1" };
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const clone = o => JSON.parse(JSON.stringify(o));

  let S = Object.assign(clone(DEFAULT_SETTINGS), load(K.set, {}));
  if (!Array.isArray(S.yields)) S.yields = clone(DEFAULT_SETTINGS.yields);
  let W = load(K.watch, null);
  if (!Array.isArray(W)) { W = clone(EXAMPLES); save(K.watch, W); }
  let C = load(K.cur, null) || clone(EXAMPLES[0]);
  let filter = "all";

  const n = v => { const x = parseFloat(v); return isFinite(x) ? x : null; };
  const money = (v, item) => isNum(v) ? (item.market === "MY" ? "RM" : (item.ccy ? item.ccy + " " : "")) + v.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "–";
  const pct = v => isNum(v) ? (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%" : "–";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 1800); }

  /* ---- views ---- */
  function show(v) {
    document.querySelectorAll(".view").forEach(s => s.hidden = s.id !== "v-" + v);
    document.querySelectorAll("nav.tabs button").forEach(b => { if (b.dataset.v === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    save(K.view, v); window.scrollTo(0, 0);
    if (v === "watch") renderWatch();
    if (v === "set") renderSettings();
  }
  document.querySelectorAll("nav.tabs button").forEach(b => b.addEventListener("click", () => show(b.dataset.v)));

  /* ---- calculator form ---- */
  function fillTypes() {
    $("iType").innerHTML = TYPES[C.market].map(t => `<option>${esc(t[0])}</option>`).join("");
    if (!TYPES[C.market].some(t => t[0] === C.type)) C.type = "General";
    $("iType").value = C.type;
    $("iCcy").innerHTML = S.yields.filter(r => r.ccy).map(r => `<option>${esc(r.ccy)}</option>`).join("");
    if (C.market === "INTL" && !S.yields.some(r => r.ccy === C.ccy)) C.ccy = "USD";
    $("iCcy").value = C.ccy || "USD";
  }
  function formFromC() {
    const my = C.market === "MY";
    $("mMY").setAttribute("aria-pressed", my); $("mIN").setAttribute("aria-pressed", !my);
    fillTypes();
    $("fCcy").hidden = my; $("fPad").hidden = true;
    $("unitSeg").hidden = !my;
    $("uSen").setAttribute("aria-pressed", C.unit === "sen"); $("uMain").setAttribute("aria-pressed", C.unit !== "sen");
    $("epsHint").textContent = my ? "Bursa reports EPS in sen. Use core EPS without one-off gains or losses." : "In the reporting currency, per share. Use EPS without one-off gains.";
    $("lPrice").textContent = my ? "Price (RM)" : "Price (same currency as EPS)";
    $("lBv").textContent = my ? "Book value / share (RM)" : "Book value / share";
    $("iName").value = C.name || ""; $("iEps").value = C.eps ?? ""; $("iG").value = C.g ?? "";
    $("iPrice").value = C.price ?? ""; $("iBv").value = C.bvps ?? ""; $("iYo").value = C.yo ?? "";
    ["q1", "q2", "q3", "q4"].forEach(q => $(q).value = "");
    $("qTot").textContent = "–";
    calc();
  }
  function cFromForm() {
    C.name = $("iName").value.trim(); C.type = $("iType").value;
    if (C.market === "INTL") C.ccy = $("iCcy").value; else C.ccy = "MYR";
    C.eps = n($("iEps").value); C.g = n($("iG").value); C.price = n($("iPrice").value);
    C.bvps = n($("iBv").value); C.yo = n($("iYo").value);
  }

  function calc() {
    const r = compute(C, S);
    save(K.cur, C);
    $("rLabel").textContent = (S.basis === "orig" ? "Graham original value" : "Conservative value") + (C.name ? " · " + C.name : "");
    const unit = C.market === "MY" ? "RM" : (C.ccy || "");
    $("rBig").innerHTML = `<small>${esc(unit)}</small>` + (isNum(r.v) ? r.v.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "–");
    const vd = $("rVerdict"); vd.className = "pill " + r.tone; vd.textContent = r.verdict;
    $("bCons").setAttribute("aria-pressed", S.basis !== "orig"); $("bOrig").setAttribute("aria-pressed", S.basis === "orig");
    $("vCons").textContent = money(r.cons, C); $("vOrig").textContent = money(r.orig, C);
    const upC = isNum(r.cons) && C.price > 0 ? r.cons / C.price - 1 : NaN, upO = isNum(r.orig) && C.price > 0 ? r.orig / C.price - 1 : NaN;
    $("sCons").textContent = isNum(upC) ? pct(upC) + " vs price" : (isNum(C.g) ? "P/E " + (7 + C.g).toFixed(1) + "×" : "–");
    $("sOrig").textContent = isNum(upO) ? pct(upO) + " vs price" : (isNum(C.g) ? "P/E " + (8.5 + 2 * C.g).toFixed(1) + "×" : "–");
    $("sBuy").textContent = money(r.buy, C);
    const su = $("sUp"); su.textContent = pct(r.up); su.className = "v " + (isNum(r.up) ? (r.up >= 0 ? "up" : "down") : "");
    $("sPE").textContent = isNum(r.pe) ? r.pe.toFixed(1) + "×" : "–";
    $("sAdj").textContent = isNum(r.adj) ? r.adj.toFixed(3) : "–";
    $("sY").textContent = isNum(r.y) ? r.y.toFixed(2) + "%" : "–";
    $("sGN").textContent = isNum(r.gn) ? money(r.gn, C) : (isNum(C.bvps) ? "n/m" : "add BV");
    if (isNum(r.v)) {
      const orig = S.basis === "orig";
      $("rFormula").textContent = `${r.eps.toFixed(3)} × (${orig ? "8.5 + 2" : "7 + 1"} × ${C.g}) × ${S.bench} / ${r.y} = ${money(r.v, C)}`;
    } else $("rFormula").textContent = "EPS × (8.5 + 2g) × 4.4 / Y";
    // bar
    const bar = $("rBar");
    if (isNum(r.v) && C.price > 0) {
      const max = Math.max(r.v, C.price) * 1.25;
      bar.style.setProperty("--mos", (r.buy / max * 100) + "%"); bar.style.setProperty("--val", (r.v / max * 100) + "%");
      const pos = C.price / max * 100, m = $("rMark");
      m.style.left = pos + "%"; m.className = "mark" + (pos > 65 ? " right" : "");
      $("rMarkL").textContent = "Price " + money(C.price, C); bar.hidden = false;
    } else bar.hidden = true;
    // notes
    const notes = [];
    if (isNum(C.g) && C.g > S.gMax) notes.push(`g is above ${S.gMax}%. The original formula overstates value at high growth; lean on the conservative value.`);
    if (isNum(C.g) && C.g < 0) notes.push("Negative g: the formula isn't built for shrinking earnings.");
    if (!isNum(r.y)) notes.push(`No bond yield set for ${C.market === "MY" ? "MYR" : C.ccy}. Add it in Settings or type a Y override.`);
    if (C.market === "MY" && C.unit === "sen" && isNum(C.eps) && C.eps > 0 && C.eps < 1.5) notes.push("EPS looks like ringgit, but the unit is set to sen. Switch the unit to RM if you typed ringgit.");
    if (r.caution) notes.push(r.caution);
    $("rNote").innerHTML = notes.map(esc).join("<br><br>"); $("rNote").hidden = !notes.length;
    $("gHint").textContent = isNum(C.g) && C.g > S.gMax ? "Above the warning level." : "Next 5 years.";
    $("gHint").className = "hint" + (isNum(C.g) && C.g > S.gMax ? " warn" : "");
    sens(r);
  }

  function sens(r) {
    const gs = [0, 3, 5, 8, 10, 15, 20];
    if (isNum(C.g) && !gs.includes(C.g)) { gs.push(C.g); gs.sort((a, b) => a - b); }
    let h = "<thead><tr><th>g</th><th>Conserv.</th><th>Original</th><th>P/E orig</th><th>vs price</th></tr></thead><tbody>";
    gs.forEach(g => {
      const x = compute(Object.assign({}, C, { g }), Object.assign({}, S, { basis: "orig" }));
      h += `<tr class="${g === C.g ? "cur" : ""}"><td>${g}%</td><td>${money(x.cons, C)}</td><td>${money(x.orig, C)}</td><td>${(8.5 + 2 * g).toFixed(1)}×</td><td class="${isNum(x.up) ? (x.up >= 0 ? "up" : "down") : ""}">${pct(x.up)}</td></tr>`;
    });
    $("sens").innerHTML = h + "</tbody>";
  }

  ["iName", "iType", "iCcy", "iEps", "iG", "iPrice", "iBv", "iYo"].forEach(id => $(id).addEventListener("input", () => { cFromForm(); calc(); }));
  $("mMY").addEventListener("click", () => { if (C.market !== "MY") { C.market = "MY"; C.ccy = "MYR"; C.unit = "sen"; C.type = "General"; formFromC(); } });
  $("mIN").addEventListener("click", () => { if (C.market !== "INTL") { C.market = "INTL"; C.ccy = "USD"; C.unit = "main"; C.type = "General"; if (isNum(C.eps)) C.eps = null; formFromC(); } });
  $("uSen").addEventListener("click", () => { if (C.unit !== "sen") { if (isNum(C.eps)) C.eps = +(C.eps * 100).toFixed(4); C.unit = "sen"; formFromC(); } });
  $("uMain").addEventListener("click", () => { if (C.unit === "sen") { if (isNum(C.eps)) C.eps = +(C.eps / 100).toFixed(6); C.unit = "main"; formFromC(); } });
  $("bCons").addEventListener("click", () => { S.basis = "cons"; save(K.set, S); calc(); });
  $("bOrig").addEventListener("click", () => { S.basis = "orig"; save(K.set, S); calc(); });

  function qTotal() { const v = ["q1", "q2", "q3", "q4"].map(q => n($(q).value)); const ok = v.every(isNum); const t = ok ? v.reduce((a, b) => a + b, 0) : NaN; $("qTot").textContent = ok ? t.toFixed(2) + (C.market === "MY" && C.unit === "sen" ? " sen" : "") : "–"; return t; }
  ["q1", "q2", "q3", "q4"].forEach(q => $(q).addEventListener("input", qTotal));
  $("qUse").addEventListener("click", () => { const t = qTotal(); if (isNum(t)) { $("iEps").value = +t.toFixed(4); cFromForm(); calc(); toast("EPS updated"); } });

  $("saveBtn").addEventListener("click", () => {
    cFromForm();
    if (!C.name) { toast("Add a stock name first"); $("iName").focus(); return; }
    if (!isNum(C.eps) || !isNum(C.g)) { toast("Add EPS and growth first"); return; }
    const item = clone(C); item.example = false; item.added = Date.now();
    const i = W.findIndex(w => !w.example && w.name.toLowerCase() === item.name.toLowerCase() && w.market === item.market);
    if (i >= 0) { item.id = W[i].id; W[i] = item; toast("Updated in watchlist"); }
    else { item.id = "w" + Date.now(); W.push(item); toast("Saved to watchlist"); }
    save(K.watch, W);
  });
  $("clearBtn").addEventListener("click", () => {
    C = { market: C.market, name: "", type: "General", ccy: C.market === "MY" ? "MYR" : "USD", eps: null, unit: C.market === "MY" ? "sen" : "main", g: null, price: null, bvps: null, yo: null };
    formFromC();
  });

  /* ---- watchlist ---- */
  const VORDER = { "Below buy price": 0, "Under value, thin margin": 1, "Above value": 2 };
  function renderWatch() {
    document.querySelectorAll("#v-watch .seg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
    let rows = W.map(w => ({ w, r: compute(w, S) })).filter(x => filter === "all" || x.w.market === filter);
    const sort = $("wSort").value;
    rows.sort((a, b) => {
      if (sort === "name") return a.w.name.localeCompare(b.w.name);
      if (sort === "added") return (b.w.added || 0) - (a.w.added || 0);
      if (sort === "verdict") return (VORDER[a.r.verdict] ?? 9) - (VORDER[b.r.verdict] ?? 9);
      return (isNum(b.r.up) ? b.r.up : -1e9) - (isNum(a.r.up) ? a.r.up : -1e9);
    });
    if (!rows.length) { $("wList").innerHTML = `<div class="empty">Nothing saved here yet.<br>Fill in a stock on the Calculator tab and tap Save to watchlist.</div>`; return; }
    $("wList").innerHTML = rows.map(({ w, r }) => `
      <div class="wi">
        <div class="wi-top">
          <div style="min-width:0"><div class="wi-name">${esc(w.name)}${w.example ? '<span class="tag">example</span>' : ""}</div>
          <div class="small muted">${w.market === "MY" ? "Bursa" : esc(w.ccy)} · ${esc(w.type)} · price ${money(w.price, w)}</div></div>
          <span class="pill ${r.tone}">${esc(r.verdict)}</span>
        </div>
        <div class="stats">
          <div class="stat"><span class="l">${S.basis === "orig" ? "Original" : "Conservative"}</span><span class="v">${money(r.v, w)}</span></div>
          <div class="stat"><span class="l">Upside</span><span class="v ${isNum(r.up) ? (r.up >= 0 ? "up" : "down") : ""}">${pct(r.up)}</span></div>
          <div class="stat"><span class="l">Buy below</span><span class="v">${money(r.buy, w)}</span></div>
        </div>
        ${r.flags.length ? `<div class="wi-flags">${esc(r.flags.join(" "))}</div>` : ""}
        <div class="wi-act"><button type="button" class="btn small ghost" data-open="${esc(w.id)}">Open</button><button type="button" class="btn small danger" data-del="${esc(w.id)}">Remove</button></div>
      </div>`).join("");
  }
  document.querySelectorAll("#v-watch .seg button").forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; renderWatch(); }));
  $("wSort").addEventListener("change", renderWatch);
  $("wList").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.del) {
      if (b.dataset.armed) { W = W.filter(w => w.id !== b.dataset.del); save(K.watch, W); renderWatch(); toast("Removed"); }
      else { b.dataset.armed = "1"; b.textContent = "Tap again"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Remove"; } }, 2500); }
    } else if (b.dataset.open) {
      const w = W.find(x => x.id === b.dataset.open); if (!w) return;
      C = clone(w); formFromC(); show("calc");
    }
  });

  /* ---- export / import ---- */
  async function shareFile(name, text, type) {
    const blob = new Blob([text], { type });
    try {
      const file = new File([blob], name, { type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  $("expJson").addEventListener("click", () => shareFile(`graham-value-backup-${stamp()}.json`, JSON.stringify({ app: "graham-value", version: APP_VERSION, settings: S, watchlist: W }, null, 2), "application/json"));
  $("expCsv").addEventListener("click", () => {
    const head = ["Stock", "Market", "Type", "Currency", "EPS", "EPS unit", "g %", "Price", "BVPS", "Y %", "Conservative", "Original", "Value used", "Buy below", "Upside %", "Graham Number", "Verdict", "Flags"];
    const q = v => { const s = v == null || (typeof v === "number" && !isFinite(v)) ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const r2 = v => isNum(v) ? +v.toFixed(4) : "";
    const lines = [head.join(",")].concat(W.map(w => { const r = compute(w, S); return [w.name, w.market === "MY" ? "Bursa" : "International", w.type, w.market === "MY" ? "MYR" : w.ccy, w.eps, w.market === "MY" ? w.unit : "main", w.g, w.price, w.bvps, r2(r.y), r2(r.cons), r2(r.orig), r2(r.v), r2(r.buy), isNum(r.up) ? +(r.up * 100).toFixed(2) : "", r2(r.gn), r.verdict, r.flags.join(" ")].map(q).join(","); }));
    shareFile(`graham-value-watchlist-${stamp()}.csv`, lines.join("\n"), "text/csv");
  });
  $("impBtn").addEventListener("click", () => $("impFile").click());
  $("impFile").addEventListener("change", async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || d.app !== "graham-value" || !Array.isArray(d.watchlist)) throw new Error("bad");
      W = d.watchlist; save(K.watch, W);
      if (d.settings) { S = Object.assign(clone(DEFAULT_SETTINGS), d.settings); save(K.set, S); }
      renderWatch(); toast(`Imported ${W.length} stocks`);
    } catch (err) { toast("That file isn't a Graham Value backup"); }
    e.target.value = "";
  });

  /* ---- settings ---- */
  function renderSettings() {
    $("sBench").value = S.bench; $("sMos").value = S.mos; $("sGmax").value = S.gMax; $("sBasis").value = S.basis;
    $("ver").textContent = APP_VERSION;
    $("yTab").innerHTML = `<span class="h">Currency</span><span class="h">Yield %</span><span class="h">As of</span>` +
      S.yields.map((r, i) => `<input id="yc${i}" data-i="${i}" data-k="ccy" value="${esc(r.ccy)}" aria-label="Currency ${i + 1}" maxlength="4" autocapitalize="characters">
        <input id="yy${i}" data-i="${i}" data-k="y" type="number" inputmode="decimal" step="any" value="${r.y ?? ""}" placeholder="fill in" aria-label="Yield for ${esc(r.ccy)}">
        <input id="ya${i}" data-i="${i}" data-k="asof" value="${esc(r.asof || "")}" placeholder="date" aria-label="Date for ${esc(r.ccy)}">`).join("");
  }
  $("yTab").addEventListener("input", e => {
    const t = e.target, i = +t.dataset.i, k = t.dataset.k; if (!S.yields[i]) return;
    S.yields[i][k] = k === "y" ? n(t.value) : (k === "ccy" ? t.value.trim().toUpperCase() : t.value);
    save(K.set, S);
  });
  $("yAdd").addEventListener("click", () => { S.yields.push({ ccy: "", y: null, asof: "" }); save(K.set, S); renderSettings(); });
  [["sBench", "bench"], ["sMos", "mos"], ["sGmax", "gMax"]].forEach(([id, k]) => $(id).addEventListener("input", () => { const v = n($(id).value); if (isNum(v)) { S[k] = v; save(K.set, S); } }));
  $("sBasis").addEventListener("change", () => { S.basis = $("sBasis").value; save(K.set, S); });
  $("resetSet").addEventListener("click", () => { S = clone(DEFAULT_SETTINGS); save(K.set, S); renderSettings(); toast("Settings reset"); });
  $("resetAll").addEventListener("click", e => {
    const b = e.currentTarget;
    if (b.dataset.armed) { W = []; save(K.watch, W); delete b.dataset.armed; b.textContent = "Erase watchlist"; toast("Watchlist erased"); }
    else { b.dataset.armed = "1"; b.textContent = "Tap again to erase"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Erase watchlist"; }, 3000); }
  });

  // re-render calculator whenever settings change and user returns
  document.querySelectorAll('nav.tabs button[data-v="calc"]').forEach(b => b.addEventListener("click", formFromC));

  /* ---- start ---- */
  formFromC();
  show(load(K.view, "calc"));

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw && nw.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Updated. Reopen the app to use the new version."); });
      });
    }).catch(() => { });
  }
})();
