// Simple Synclify demo logic (pure front-end, no backend)
// Save accounts and metrics in localStorage so you can refresh the page.

const storage = {
  accounts: JSON.parse(localStorage.getItem('syn_accounts') || '[]'),
  metrics: JSON.parse(localStorage.getItem('syn_metrics') || '[]'), // entries: {id, accountId, impressions, likes, hour, ts}
  briefs: JSON.parse(localStorage.getItem('syn_briefs') || '[]'),
  alerts: JSON.parse(localStorage.getItem('syn_alerts') || '[]'),
};

function persist(){
  localStorage.setItem('syn_accounts', JSON.stringify(storage.accounts));
  localStorage.setItem('syn_metrics', JSON.stringify(storage.metrics));
  localStorage.setItem('syn_briefs', JSON.stringify(storage.briefs));
  localStorage.setItem('syn_alerts', JSON.stringify(storage.alerts));
}

// Utils
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9) }
function now(){ return new Date().toISOString(); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// UI elements
const connectInst = document.getElementById('connect-inst');
const connectYt = document.getElementById('connect-yt');
const connectTw = document.getElementById('connect-tw');
const connectedList = document.getElementById('connected-list');
const accountSelect = document.getElementById('account-select');
const ingestBtn = document.getElementById('btn-ingest');
const inpImpr = document.getElementById('inp-impr');
const inpLikes = document.getElementById('inp-likes');
const inpHour = document.getElementById('inp-hour');
const metricsList = document.getElementById('metrics-list');
const keywordsInput = document.getElementById('keywords');
const predictBtn = document.getElementById('btn-predict');
const predictResult = document.getElementById('predict-result');
const btnScan = document.getElementById('btn-scan');
const alertsBox = document.getElementById('alerts');
const briefsBox = document.getElementById('briefs');
const dropThresh = document.getElementById('drop-thresh');

// init UI
renderConnected();
renderAccountSelect();
renderMetrics();
renderAlerts();
renderBriefs();

// Connect mock accounts
connectInst.onclick = ()=> mockConnect('instagram');
connectYt.onclick = ()=> mockConnect('youtube');
connectTw.onclick = ()=> mockConnect('twitter');

function mockConnect(provider){
  const acc = {
    id: uid('acc'),
    provider,
    provider_account_id: provider + '_fake_' + Date.now(),
    display_name: provider[0].toUpperCase() + provider.slice(1) + ' Demo',
    connected_at: now()
  };
  storage.accounts.push(acc); persist(); renderConnected(); renderAccountSelect();
  alert(provider + ' connected (mock).');
}

function renderConnected(){
  if(storage.accounts.length === 0){
    connectedList.innerHTML = '<i>No accounts connected</i>';
    return;
  }
  connectedList.innerHTML = storage.accounts.map(a=>`<div><b>${a.display_name}</b> • <span class="muted">${a.provider}</span></div>`).join('');
}

function renderAccountSelect(){
  accountSelect.innerHTML = '';
  if(storage.accounts.length === 0){
    accountSelect.innerHTML = '<option value="">-- no account --</option>';
    return;
  }
  accountSelect.innerHTML = storage.accounts.map(a=>`<option value="${a.id}">${a.display_name} (${a.provider})</option>`).join('');
}

// Ingest mock metric as a "post metric"
ingestBtn.onclick = ()=>{
  const accId = accountSelect.value;
  if(!accId){ alert('Connect an account first'); return; }
  const impressions = clamp(parseInt(inpImpr.value||0), 0, 10000000);
  const likes = clamp(parseInt(inpLikes.value||0), 0, impressions);
  const hour = clamp(parseInt(inpHour.value||0), 0, 23);
  const m = { id: uid('m'), accountId: accId, impressions, likes, hour, ts: now() };
  storage.metrics.push(m); persist(); renderMetrics();
};

// Show list of metrics
function renderMetrics(){
  if(storage.metrics.length === 0){
    metricsList.innerHTML = '<i>No metrics ingested yet</i>';
    return;
  }
  // show last 10
  const recent = storage.metrics.slice(-10).reverse();
  metricsList.innerHTML = recent.map(m=>{
    const acc = storage.accounts.find(a=>a.id===m.accountId);
    return `<div><b>${acc ? acc.display_name : m.accountId}</b> — ${m.impressions} impressions • ${m.likes} likes • hour:${m.hour} • <small>${m.ts}</small></div>`;
  }).join('');
}

// Simple predictions logic: score by random + small boost if keyword appears in mock high-volume metrics
predictBtn.onclick = ()=>{
  const raw = keywordsInput.value.trim();
  if(!raw){ alert('Enter some keywords (comma separated)'); return; }
  const keywords = raw.split(',').map(s=>s.trim()).filter(Boolean);
  const out = simulatePredictions(keywords);
  showPredictions(out);
};

function simulatePredictions(keywords){
  // compute global avg impressions to bias scores
  const avgImpr = storage.metrics.length ? Math.round(storage.metrics.reduce((s,m)=>s+m.impressions,0)/storage.metrics.length) : 300;
  const nowHour = new Date().getHours();
  return keywords.map(k=>{
    // base random score
    let score = Math.random();
    // boost if keyword length small (toy rule) or if 'ai' present etc.
    if(k.toLowerCase().includes('ai')) score += 0.25;
    // small bias: if many high-impr posts exist, boost score
    if(avgImpr > 400) score += 0.15;
    // random predicted growth
    const predicted_growth_pct = Math.round((score * 100) * 10)/10;
    // best hour: choose hour near current hour + some noise, or analyze historic engagement per hour
    const best_post_hour = estimateBestHour();
    return { keyword: k, score: Math.round(score*100)/100, predicted_growth_pct, best_post_hour };
  }).sort((a,b)=>b.score-a.score);
}

function estimateBestHour(){
  // look at metrics hours and pick the hour with max impressions sum
  if(storage.metrics.length){
    const sums = Array(24).fill(0);
    storage.metrics.forEach(m=> sums[m.hour || 0] += m.impressions);
    let idx = 0; let best = sums[0];
    for(let i=1;i<24;i++){ if(sums[i] > best){ best = sums[i]; idx = i; } }
    // if best is 0 (no variation) return current hour
    if(best === 0) return new Date().getHours();
    return idx;
  }
  return (new Date().getHours() + Math.floor(Math.random()*4) - 2 + 24) % 24;
}

function showPredictions(items){
  if(!items || items.length===0){ predictResult.innerHTML = '<i>No predictions</i>'; return; }
  predictResult.innerHTML = items.map(it=>{
    return `<div class="pred-item"><b>${it.keyword}</b> — score: ${it.score} — growth: ${it.predicted_growth_pct}% — best hour: ${it.best_post_hour}:00</div>`;
  }).join('');
}

// Alerting & AI-brief generation
btnScan.onclick = ()=> scanForDrops();

function scanForDrops(){
  // For each account, compare latest impressions to baseline (mean of last 5)
  storage.alerts = []; // reset for demo
  storage.accounts.forEach(acc=>{
    const accMetrics = storage.metrics.filter(m=>m.accountId===acc.id);
    if(accMetrics.length < 2) return; // not enough data
    // baseline: mean of last N except last
    const last = accMetrics[accMetrics.length-1];
    const prev = accMetrics.slice(0,-1).slice(-5);
    const baseline = prev.reduce((s,m)=>s+m.impressions,0) / prev.length;
    const pct = baseline? Math.round((1 - (last.impressions / baseline)) * 100) : 0;
    const threshold = parseInt(dropThresh.value||40);
    if(pct >= threshold){
      const alert = {
        id: uid('alert'),
        user: 'demo',
        accountId: acc.id,
        type: 'performance_drop',
        drop_pct: pct,
        last_impressions: last.impressions,
        baseline: Math.round(baseline),
        ts: now()
      };
      storage.alerts.push(alert);
      // generate AI brief immediately
      const brief = generateAIBrief(acc, alert);
      storage.briefs.push(brief);
    }
  });
  persist();
  renderAlerts(); renderBriefs();
  if(storage.alerts.length===0) alert('No drops detected.');
}

// Very simple AI brief generator (template-based)
function generateAIBrief(account, alert){
  // pick last 3 posts (if present)
  const posts = storage.metrics.filter(m=>m.accountId===account.id).slice(-3).reverse();
  const recent = posts.map(p=>`${p.impressions} impressions • ${p.likes} likes • hour:${p.hour}`).join('; ') || 'No recent posts';
  const topKeywords = (document.getElementById('keywords').value || 'ai,trend').split(',').slice(0,3).map(s=>s.trim()).join(', ');
  const suggested_time = estimateBestHour();
  const prompt = `Account: ${account.display_name}\nDrop: ${alert.drop_pct}% below baseline (${alert.baseline} -> ${alert.last_impressions})\nRecent: ${recent}\nKeywords: ${topKeywords}\n\nPlease give: diagnosis (1 line); 3 post ideas (title + caption + 2 hashtags); 1 quick test; suggested post time.`;
  // simple deterministic "AI" reply by templating
  const briefText = `Diagnosis: Engagement dropped ${alert.drop_pct}% likely due to lower impressions or poor timing.\n\nPost Ideas:\n1) Title: Quick Repost Highlight\n   Caption: Re-share your top-performing clip with fresh opening line. Add context and CTA. Hashtags: #${topKeywords.split(',')[0].replace(/\s/g,'')} #repost\n2) Title: Trending Take\n   Caption: Share a 30s reaction to a trending topic. Ask a question to drive comments. Hashtags: #trend #${topKeywords.split(',')[1]||'viral'}\n3) Title: Community Poll\n   Caption: Use poll sticker or question to boost interactions; follow up with a reply video. Hashtags: #poll #engage\n\nQuick Test: Boost one recent post for 24 hours with small budget or pin it to top to test uplift.\nSuggested time: ${suggested_time}:00 (based on past engagement)\n\nPrompt-used:\n${prompt}`;

  return { id: uid('brief'), alertId: alert.id, accountId: account.id, brief: briefText, prompt, ts: now() };
}

function renderAlerts(){
  if(storage.alerts.length === 0){ alertsBox.innerHTML = '<i>No alerts</i>'; return; }
  alertsBox.innerHTML = storage.alerts.map(a=>{
    const acc = storage.accounts.find(x=>x.id===a.accountId);
    return `<div class="alert"><b>${acc ? acc.display_name : a.accountId}</b> — Drop: ${a.drop_pct}% • baseline:${a.baseline} • last:${a.last_impressions} • <small>${a.ts}</small></div>`;
  }).join('');
}

function renderBriefs(){
  if(storage.briefs.length === 0){ briefsBox.innerHTML = '<i>No briefs generated</i>'; return; }
  briefsBox.innerHTML = storage.briefs.slice().reverse().map(b=>{
    const acc = storage.accounts.find(x=>x.id===b.accountId);
    return `<div class="brief"><b>${acc ? acc.display_name : b.accountId}</b> • ${b.ts}<pre style="white-space:pre-wrap;margin:8px 0 0 0">${b.brief}</pre></div>`;
  }).join('');
}

// Optional: auto-scan every X seconds (demo)
let autoScanInterval = null;
function startAutoScan(seconds=0){
  if(autoScanInterval) clearInterval(autoScanInterval);
  if(seconds>0) autoScanInterval = setInterval(()=>scanForDrops(), seconds*1000);
}
// startAutoScan(60); // uncomment to auto-scan every 60s
