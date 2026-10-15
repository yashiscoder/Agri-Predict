/* AgriPredict – app script */
(() => {
  'use strict';

  const API = /localhost|127\.0\.0\.1/.test(location.hostname) ? '' : 'https://agri-predict-n3fa.onrender.com';
  const HIST_KEY = 'agripredict_history';
  const THEME_KEY = 'agripredict_theme';
  const MAX_HISTORY = 30;

  const FIELDS = [
    { id: 'N', label: 'Nitrogen (N)', unit: 'mg/kg', min: 0, max: 140, step: 1, def: 80, group: 'soil' },
    { id: 'P', label: 'Phosphorus (P)', unit: 'mg/kg', min: 0, max: 145, step: 1, def: 40, group: 'soil' },
    { id: 'K', label: 'Potassium (K)', unit: 'mg/kg', min: 0, max: 205, step: 1, def: 40, group: 'soil' },
    { id: 'pH', label: 'Soil pH', unit: '', min: 0, max: 14, step: 0.1, def: 6.5, group: 'soil' },
    { id: 'temp', label: 'Temperature', unit: '°C', min: 0, max: 50, step: 1, def: 24, group: 'env' },
    { id: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, step: 1, def: 82, group: 'env' },
    { id: 'rainfall', label: 'Rainfall', unit: 'mm', min: 0, max: 300, step: 1, def: 230, group: 'env' },
  ];
  const PRESETS = {
    paddy: { N: 80, P: 40, K: 40, pH: 6.5, temp: 24, humidity: 82, rainfall: 230 },
    arid: { N: 40, P: 68, K: 80, pH: 7.3, temp: 19, humidity: 17, rainfall: 80 },
    fruit: { N: 23, P: 133, K: 200, pH: 6.0, temp: 24, humidity: 82, rainfall: 70 },
    coffee: { N: 101, P: 28, K: 30, pH: 6.8, temp: 25, humidity: 58, rainfall: 158 },
  };
  const TITLES = { dashboard: 'Predictor', analytics: 'Soil analytics', history: 'History', guide: 'Crop catalog' };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const title = (s) => String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  let cropDataset = [];
  let current = null;
  let history = [];
  try { history = JSON.parse(store.get(HIST_KEY) || '[]'); if (!Array.isArray(history)) history = []; } catch { history = []; }

  /* ---------- network ---------- */
  async function http(path, opts = {}, ms = 20000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(API + path, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
  }

  function setStatus(state, text) { $('status').dataset.state = state; $('status-text').textContent = text; }

  let checking = false;
  async function checkServer() {
    if (checking) return;
    checking = true;
    setStatus('wait', 'Waking up server…');
    try {
      for (let i = 0; i < 3; i++) {
        try {
          const res = await http('/api/status', {}, 25000);
          if (res.ok) {
            const d = await res.json().catch(() => ({}));
            setStatus('ok', d.model_file && d.model_file !== 'None' ? `Connected · ${d.model_file}` : 'Connected');
            if (!cropDataset.length) loadCrops();
            return;
          }
        } catch { /* retry */ }
      }
      setStatus('err', 'Server unreachable · retry');
    } finally { checking = false; }
  }

  async function loadCrops() {
    try {
      const res = await http('/api/crops', {}, 30000);
      if (res.ok) { cropDataset = await res.json(); renderCatalog(); }
    } catch { renderCatalog(); }
  }

  /* ---------- toast ---------- */
  function toast(msg, warn = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (warn ? ' warn' : '');
    t.textContent = msg;
    $('toastContainer').append(t);
    setTimeout(() => t.remove(), 3500);
  }

  /* ---------- fields ---------- */
  function buildFields() {
    for (const f of FIELDS) {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      wrap.innerHTML = `<div class="lab"><label for="in-${f.id}">${f.label}</label><output for="in-${f.id}" id="out-${f.id}"></output></div>
        <input type="range" id="in-${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.def}">`;
      $(`fields-${f.group}`).append(wrap);
      $(`in-${f.id}`).addEventListener('input', () => { syncField(f); updateTip(); });
      syncField(f);
    }
  }
  function syncField(f) {
    const el = $(`in-${f.id}`);
    const v = Number(el.value);
    el.style.setProperty('--p', `${((v - f.min) / (f.max - f.min)) * 100}%`);
    $(`out-${f.id}`).innerHTML = `${f.step < 1 ? v.toFixed(1) : v}${f.unit ? `<small>${f.unit}</small>` : ''}`;
  }
  function setValues(vals) { for (const f of FIELDS) { $(`in-${f.id}`).value = vals[f.id]; syncField(f); } updateTip(); }
  function getValues() { const o = {}; for (const f of FIELDS) o[f.id] = Number($(`in-${f.id}`).value); return o; }

  /* ---------- prediction ---------- */
  function setBusy(b) {
    const btn = $('recommend-btn');
    btn.disabled = b; btn.setAttribute('aria-busy', b);
    $('btn-text').textContent = b ? 'Finding the best crop…' : 'Recommend crop';
  }

  async function recommend() {
    if ($('recommend-btn').disabled) return;
    const inputs = getValues();
    setBusy(true);
    try {
      const res = await http('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputs) }, 60000);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.crop) throw new Error(data.error || `Server returned ${res.status}`);

      const profile = data.crop_profile || cropDataset.find((c) => c.name.toLowerCase() === data.crop.toLowerCase()) || {};
      const crop = { ...profile, name: profile.name || data.crop };
      const conf = parseFloat(data.confidenceScore);
      current = {
        crop, inputs, conf: Number.isFinite(conf) ? conf : null,
        source: data.model_source,
        alts: (data.alternatives || []).map((a) => ({ ...a, conf: parseFloat(a.confidenceScore) })),
      };
      showResult();
      saveHistory(inputs, crop.name, current.conf);
      setStatus('ok', `Connected${data.model_source ? ` · ${data.model_source}` : ''}`);
    } catch (e) {
      toast(e.name === 'AbortError' ? 'The server took too long. It may be waking up, so try again in a few seconds.' : (e.message || 'Could not reach the server.'), true);
      setStatus('err', 'Server unreachable · retry');
    } finally { setBusy(false); }
  }

  function showResult() {
    const { crop, conf, source, alts } = current;
    $('results-placeholder').hidden = true;
    $('results-card').hidden = false;
    $('crop-name').textContent = title(crop.name);
    $('cropDescription').textContent = crop.description || `Recommended by the ${source || 'prediction'} model for these conditions.`;
    $('confidenceScore').textContent = conf == null ? '–' : `${conf.toFixed(1)}%`;
    $('confidenceBar').style.width = `${conf ?? 0}%`;
    $('categoryBadge').textContent = crop.category || '';
    $('cropSeason').textContent = crop.season || '–';
    $('cropSoil').textContent = crop.soilType || '–';
    $('cropMarketTrend').textContent = crop.marketTrend || '–';
    $('predictionModelTag').textContent = source ? `Model: ${source}` : '';

    $('alternativesSection').hidden = !alts.length;
    $('alternativesList').innerHTML = alts.map((a) => `
      <div class="alt"><b>${Number.isFinite(a.conf) ? Math.round(a.conf) + '%' : '–'}</b>
        <div><strong>${esc(title(a.name))}</strong><span class="muted small">${esc([a.category, a.season].filter(Boolean).join(' · '))}</span></div></div>`).join('');

    updateTip();
    $('results-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateTip() {
    const { pH } = getValues();
    const name = current ? title(current.crop.name) : 'your crop';
    $('proTipText').textContent =
      pH < 6 ? `A pH of ${pH.toFixed(1)} is acidic. Agricultural lime can improve nitrogen and phosphorus uptake for ${name}.`
      : pH > 7.5 ? `A pH of ${pH.toFixed(1)} is alkaline. Organic compost or sulfur can improve micronutrient availability for ${name}.`
      : `A pH of ${pH.toFixed(1)} is in the neutral range, where nitrogen and potassium are taken up most efficiently.`;
  }

  function resetForm() {
    setValues(Object.fromEntries(FIELDS.map((f) => [f.id, f.def])));
    current = null;
    $('results-card').hidden = true; $('results-placeholder').hidden = false; $('alternativesSection').hidden = true;
    switchTab('dashboard');
    toast('Inputs reset to defaults.');
  }

  /* ---------- analytics (no chart library needed) ---------- */
  function renderAnalytics() {
    const box = $('compareList');
    const ideal = current && (current.crop.ideal || cropDataset.find((c) => c.name.toLowerCase() === current.crop.name.toLowerCase())?.ideal);
    const vals = getValues();
    $('analyticsLede').textContent = ideal
      ? `Your current inputs compared with ideal conditions for ${title(current.crop.name)}.`
      : 'Run a recommendation to compare your inputs with a crop’s ideal conditions. Until then, bars show where your inputs sit in each range.';

    box.innerHTML = FIELDS.map((f) => {
      const v = vals[f.id], span = f.max - f.min;
      const pct = (x) => Math.min(100, Math.max(0, ((x - f.min) / span) * 100));
      const fmt = (x) => `${f.step < 1 ? Number(x).toFixed(1) : Math.round(x)}${f.unit ? ' ' + f.unit : ''}`;
      let state = '', marker = '', vs = `Yours ${fmt(v)}`;
      if (ideal && ideal[f.id] != null) {
        const d = v - ideal[f.id], tol = span * 0.12;
        const k = Math.abs(d) <= tol ? 'ok' : d < 0 ? 'low' : 'high';
        state = `<span class="state ${k}">${{ ok: 'On target', low: 'Too low', high: 'Too high' }[k]}</span>`;
        marker = `<em style="left:calc(${pct(ideal[f.id])}% - 1px)" title="Ideal ${fmt(ideal[f.id])}"></em>`;
        vs += ` · Ideal ${fmt(ideal[f.id])}`;
      }
      return `<div class="cmp"><div class="lab"><span>${f.label} ${state}</span><span class="vals">${vs}</span></div>
        <div class="track" role="img" aria-label="${f.label}: ${fmt(v)}"><i style="width:${pct(v)}%"></i>${marker}</div></div>`;
    }).join('') + (ideal ? '<p class="legend">The dark marker shows the ideal value. “On target” means within about 12% of the range.</p>' : '');
  }

  /* ---------- history ---------- */
  const when = (ms) => new Date(ms).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function saveHistory(inputs, crop, conf) {
    history.unshift({ id: Date.now(), time: Date.now(), inputs, crop, confidence: conf });
    history = history.slice(0, MAX_HISTORY);
    store.set(HIST_KEY, JSON.stringify(history));
  }

  function renderHistory() {
    $('btnExportCSV').disabled = $('btnClearHistory').disabled = !history.length;
    $('histCount').textContent = history.length ? `${history.length} saved in this browser (latest ${MAX_HISTORY}).` : 'Past recommendations from this browser.';
    $('historyTableBody').innerHTML = history.length ? history.map((h) => {
      const i = h.inputs || {};
      return `<tr><td>${when(h.time || h.id)}</td><td class="cn">${esc(title(h.crop))}</td>
        <td>${h.confidence == null ? '–' : parseFloat(h.confidence).toFixed(1) + '%'}</td>
        <td>${esc(i.N)}-${esc(i.P)}-${esc(i.K)}</td><td>${esc(i.pH)}</td><td>${esc(i.temp)}°C / ${esc(i.humidity)}% / ${esc(i.rainfall)} mm</td></tr>`;
    }).join('') : '<tr><td class="empty" colspan="6">Nothing here yet. Run a recommendation on the Predictor tab.</td></tr>';
  }

  function exportCSV() {
    const lines = ['Time,Crop,Match (%),N,P,K,pH,Temp (C),Humidity (%),Rainfall (mm)'];
    for (const h of history) {
      const i = h.inputs || {};
      lines.push([new Date(h.time || h.id).toISOString(), `"${String(h.crop).replace(/"/g, '""')}"`, h.confidence ?? '', i.N, i.P, i.K, i.pH, i.temp, i.humidity, i.rainfall].join(','));
    }
    const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `agripredict_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('History exported.');
  }

  /* ---------- catalog ---------- */
  function renderCatalog() {
    const q = $('cropSearchInput').value.toLowerCase().trim();
    const list = cropDataset.filter((c) => [c.name, c.category, c.soilType].some((x) => String(x || '').toLowerCase().includes(q)));
    $('catalogCount').textContent = cropDataset.length ? `Ideal growing conditions for ${cropDataset.length} crops.` : 'Ideal growing conditions for each supported crop.';
    $('cropCatalogGrid').innerHTML = list.length ? list.map((c) => {
      const i = c.ideal || {};
      return `<article class="crop"><div class="row between"><h4>${esc(title(c.name))}</h4><span class="tag">${esc(c.category)}</span></div>
        <p>${esc(c.description)}</p>
        <dl class="specs"><div><dt>N-P-K</dt><dd>${esc(i.N)}-${esc(i.P)}-${esc(i.K)}</dd></div><div><dt>pH</dt><dd>${esc(i.pH)}</dd></div>
        <div><dt>Temp / Humidity</dt><dd>${esc(i.temp)}°C / ${esc(i.humidity)}%</dd></div><div><dt>Rainfall</dt><dd>${esc(i.rainfall)} mm</dd></div></dl>
        <footer><span class="muted">${esc(c.soilType)}</span><b>${esc(c.season)}</b></footer></article>`;
    }).join('') : `<p class="emptyblock">${cropDataset.length ? 'No crops match that filter.' : 'The catalog loads once the server is connected.'}</p>`;
  }

  /* ---------- tabs & theme ---------- */
  function switchTab(name) {
    document.querySelectorAll('[data-tab]').forEach((b) => b.toggleAttribute('aria-current', b.dataset.tab === name));
    document.querySelectorAll('.tab').forEach((s) => {
      const on = s.id === `${name}Tab`;
      s.hidden = !on; s.classList.toggle('active', on);
    });
    $('headerTitle').textContent = TITLES[name];
    document.title = `AgriPredict – ${TITLES[name]}`;
    if (name === 'analytics') renderAnalytics();
    if (name === 'history') renderHistory();
    if (name === 'guide') renderCatalog();
    window.scrollTo({ top: 0 });
  }

  function applyTheme(dark, save) {
    document.documentElement.classList.toggle('dark', dark);
    const b = $('themeToggleBtn');
    b.innerHTML = `<svg class="ic"><use href="#${dark ? 'i-sun' : 'i-moon'}"/></svg>`;
    b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    if (save) store.set(THEME_KEY, dark ? 'dark' : 'light');
  }

  /* ---------- init ---------- */
  buildFields();
  updateTip();
  renderHistory();
  applyTheme(document.documentElement.classList.contains('dark'), false);

  $('recommend-btn').addEventListener('click', recommend);
  $('btnNewAnalysis').addEventListener('click', resetForm);
  $('btnCompareTab').addEventListener('click', () => switchTab('analytics'));
  $('status').addEventListener('click', checkServer);
  $('themeToggleBtn').addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('dark'), true));
  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    setValues(PRESETS[b.dataset.preset]);
    toast(`Loaded example: ${b.textContent.trim()}`);
    recommend();
  }));
  $('btnExportCSV').addEventListener('click', exportCSV);
  $('btnClearHistory').addEventListener('click', () => {
    if (!confirm('Delete all saved recommendations? This cannot be undone.')) return;
    history = []; store.set(HIST_KEY, '[]'); renderHistory();
  });
  $('cropSearchInput').addEventListener('input', renderCatalog);
  $('globalSearchInput').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    $('cropSearchInput').value = e.target.value.trim();
    switchTab('guide');
    e.target.value = '';
  });

  checkServer();
})();
