"use strict";
/* =========================================================
   Local GRUKK server
   - Serves the static game.
   - Persists run logs posted to /api/run-log into run-database/.
========================================================= */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const DB_ROOT = path.join(ROOT, 'run-database');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.csv':'text/csv; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon'
};

function sanitizeSegment(value){
  const clean = String(value || 'unknown')
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return clean || 'unknown';
}

function escapeHtml(value){
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[ch]);
}

function csvCell(value){
  const text = String(value == null ? '' : value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function writeCsv(filePath, headers, rows){
  const out = [headers.map(csvCell).join(',')];
  for(const row of rows) out.push(headers.map(h => csvCell(row[h])).join(','));
  fs.writeFileSync(filePath, out.join('\n'), 'utf8');
}

function listRows(map){
  return Object.values(map || {});
}

function runSummary(log, runDir){
  return {
    runId: log.runId || path.basename(runDir),
    playerName: log.playerName || 'unknown',
    characterId: log.characterId || 'unknown',
    mapId: log.mapId || 'unknown',
    mapName: log.mapName || log.mapId || 'unknown',
    startedAt: log.startedAt || '',
    endedAt: log.endedAt || '',
    durationSec: log.durationSec || 0,
    result: log.result || 'ended',
    waveReached: log.waveReached || 0,
    finalWave: log.finalWave || 0,
    levelReached: log.levelReached || 0,
    damageDone: log.totals && log.totals.damageDone || 0,
    damageTaken: log.totals && log.totals.damageTaken || 0,
    hitsTaken: log.totals && log.totals.hitsTaken || Object.values(log.damageTaken || {}).reduce((sum,row)=>sum+(row.hits||0),0),
    kills: log.totals && log.totals.kills || 0,
    powerups: log.totals && log.totals.powerups || 0,
    items: log.totals && log.totals.items || 0,
    xpGained: log.totals && log.totals.xpGained || 0,
    folder: path.relative(DB_ROOT, runDir).replace(/\\/g, '/')
  };
}

function damageDoneRows(log){
  return listRows(log.damageDone).sort((a,b)=>b.total-a.total).map(row => ({
    source: row.name || row.id,
    id: row.id,
    kind: row.kind || '',
    damage: Math.round(row.total || 0),
    hits: row.hits || 0,
    crits: row.crits || 0,
    avg: Math.round((row.total || 0) / Math.max(1, row.hits || 0)),
    max: Math.round(row.max || 0),
    damageType: row.dmgType || '',
    targets: JSON.stringify(row.targets || {})
  }));
}

function damageTakenRows(log){
  return listRows(log.damageTaken).sort((a,b)=>b.total-a.total).map(row => ({
    enemy: row.enemyName || row.enemyType,
    enemyType: row.enemyType,
    attack: row.attack || '',
    damage: Math.round(row.total || 0),
    hits: row.hits || 0,
    avg: Math.round((row.total || 0) / Math.max(1, row.hits || 0)),
    max: Math.round(row.max || 0)
  }));
}

function killRows(log){
  return listRows(log.kills).sort((a,b)=>b.count-a.count).map(row => ({
    enemy: row.name || row.id,
    enemyType: row.id,
    kills: row.count || 0,
    elites: row.elites || 0,
    bosses: row.bosses || 0,
    exp: Math.round(row.exp || 0)
  }));
}

function choiceRows(log){
  return (log.choices || []).map(row => ({
    time: row.t,
    wave: row.wave,
    level: row.level,
    kind: row.kind,
    id: row.id,
    name: row.name,
    rank: row.rank,
    tags: (row.tags || []).join('|')
  }));
}

function tableHtml(headers, rows){
  const head = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.map(row => `<tr>${headers.map(h => `<td>${escapeHtml(row[h])}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">No rows.</td></tr>`}</tbody></table>`;
}

function overviewHtml(log, summary){
  const done = damageDoneRows(log);
  const taken = damageTakenRows(log);
  const kills = killRows(log);
  const choices = choiceRows(log);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GRUKK Run ${escapeHtml(summary.runId)}</title>
<style>
body{margin:0;background:#0b0d08;color:#e8e0d0;font-family:Verdana,Arial,sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px}
h1,h2{font-family:Impact,Arial Black,sans-serif;letter-spacing:2px;color:#e8b64c}
.kpis{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin:18px 0}
.kpis div{background:#181512;border:1px solid #5a4d33;border-radius:6px;padding:12px}
.kpis span{display:block;color:#8d8270;font-size:11px;text-transform:uppercase;letter-spacing:1px}
.kpis b{display:block;color:#ffd75c;font:24px Impact,Arial Black;margin-top:4px}
section{margin-top:28px}
table{width:100%;border-collapse:collapse;background:#15110c;border:1px solid #5a4d33}
th,td{padding:8px 10px;border-bottom:1px solid #342919;text-align:right;font-size:13px}
th:first-child,td:first-child{text-align:left}
th{color:#9a7a36;text-transform:uppercase;font:12px Impact,Arial Black;letter-spacing:1px}
a{color:#7cc4ff}
@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<main>
<h1>GRUKK Run Log</h1>
<p>${escapeHtml(summary.playerName)} / ${escapeHtml(summary.characterId)} / ${escapeHtml(summary.mapName)} / ${escapeHtml(summary.result)}</p>
<div class="kpis">
<div><span>Wave</span><b>${summary.waveReached}/${summary.finalWave}</b></div>
<div><span>Level</span><b>${summary.levelReached}</b></div>
<div><span>Damage Done</span><b>${Math.round(summary.damageDone)}</b></div>
<div><span>Damage Taken</span><b>${Math.round(summary.damageTaken)}</b></div>
<div><span>Hits Taken</span><b>${summary.hitsTaken}</b></div>
<div><span>Kills</span><b>${summary.kills}</b></div>
<div><span>Duration</span><b>${Math.round(summary.durationSec)}s</b></div>
</div>
<p><a href="run.json">run.json</a> / <a href="damage-done.csv">damage-done.csv</a> / <a href="damage-taken.csv">damage-taken.csv</a> / <a href="kills.csv">kills.csv</a> / <a href="choices.csv">choices.csv</a></p>
<section><h2>Damage Done</h2>${tableHtml(['source','damage','hits','crits','avg','max','damageType'], done)}</section>
<section><h2>Damage Taken</h2>${tableHtml(['enemy','attack','damage','hits','avg','max'], taken)}</section>
<section><h2>Kills</h2>${tableHtml(['enemy','kills','elites','bosses','exp'], kills)}</section>
<section><h2>Choices</h2>${tableHtml(['time','wave','level','kind','name','rank','tags'], choices)}</section>
</main>
</body>
</html>`;
}

function saveRunLog(log){
  const ended = log.endedAt || new Date().toISOString();
  const stamp = ended.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const player = sanitizeSegment(log.playerName || 'guest');
  const level = sanitizeSegment(log.mapId || log.mapName || 'level');
  const runName = `${stamp}_wave-${sanitizeSegment(log.waveReached || 0)}_${sanitizeSegment(log.result || 'ended')}`;
  const runDir = path.join(DB_ROOT, player, level, runName);
  fs.mkdirSync(runDir, {recursive:true});

  const summary = runSummary(log, runDir);
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(log, null, 2), 'utf8');
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(runDir, 'events.json'), JSON.stringify(log.events || [], null, 2), 'utf8');
  writeCsv(path.join(runDir, 'damage-done.csv'), ['source','id','kind','damage','hits','crits','avg','max','damageType','targets'], damageDoneRows(log));
  writeCsv(path.join(runDir, 'damage-taken.csv'), ['enemy','enemyType','attack','damage','hits','avg','max'], damageTakenRows(log));
  writeCsv(path.join(runDir, 'kills.csv'), ['enemy','enemyType','kills','elites','bosses','exp'], killRows(log));
  writeCsv(path.join(runDir, 'choices.csv'), ['time','wave','level','kind','id','name','rank','tags'], choiceRows(log));
  fs.writeFileSync(path.join(runDir, 'overview.html'), overviewHtml(log, summary), 'utf8');
  rebuildDatabaseIndex();
  return summary;
}

function collectSummaries(dir, out){
  if(!fs.existsSync(dir)) return;
  for(const entry of fs.readdirSync(dir, {withFileTypes:true})){
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) collectSummaries(full, out);
    else if(entry.isFile() && entry.name === 'summary.json'){
      try { out.push(JSON.parse(fs.readFileSync(full, 'utf8'))); } catch(e){}
    }
  }
}

function rebuildDatabaseIndex(){
  fs.mkdirSync(DB_ROOT, {recursive:true});
  const summaries = [];
  collectSummaries(DB_ROOT, summaries);
  summaries.sort((a,b)=>String(b.endedAt).localeCompare(String(a.endedAt)));
  const rows = summaries.map(s => {
    const href = `${s.folder}/overview.html`;
    return `<tr><td><a href="${escapeHtml(href)}">${escapeHtml(s.endedAt)}</a></td><td>${escapeHtml(s.playerName)}</td><td>${escapeHtml(s.mapName)}</td><td>${escapeHtml(s.characterId)}</td><td>${escapeHtml(s.result)}</td><td>${s.waveReached}</td><td>${s.levelReached}</td><td>${Math.round(s.damageDone)}</td><td>${Math.round(s.damageTaken)}</td><td>${s.hitsTaken || 0}</td><td>${s.kills}</td></tr>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>GRUKK Run Database</title><style>
body{margin:0;background:#0b0d08;color:#e8e0d0;font-family:Verdana,Arial,sans-serif}main{max-width:1180px;margin:0 auto;padding:28px}h1{font:36px Impact,Arial Black;color:#e8b64c;letter-spacing:2px}table{width:100%;border-collapse:collapse;background:#15110c;border:1px solid #5a4d33}th,td{padding:8px 10px;border-bottom:1px solid #342919;text-align:right;font-size:13px}th:first-child,td:first-child,th:nth-child(2),td:nth-child(2),th:nth-child(3),td:nth-child(3){text-align:left}th{color:#9a7a36;text-transform:uppercase;font:12px Impact,Arial Black;letter-spacing:1px}a{color:#7cc4ff}</style></head><body><main><h1>GRUKK Run Database</h1><table><thead><tr><th>Date</th><th>Player</th><th>Map</th><th>Class</th><th>Result</th><th>Wave</th><th>Level</th><th>Dmg Done</th><th>Dmg Taken</th><th>Hits Taken</th><th>Kills</th></tr></thead><tbody>${rows || '<tr><td colspan="11">No runs logged yet.</td></tr>'}</tbody></table></main></body></html>`;
  fs.writeFileSync(path.join(DB_ROOT, 'index.html'), html, 'utf8');
}

function send(res, status, body, type){
  res.writeHead(status, {'Content-Type': type || 'text/plain; charset=utf-8'});
  res.end(body);
}

function readBody(req, limit, cb){
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if(body.length > limit){
      req.destroy();
    }
  });
  req.on('end', () => cb(body));
}

function safeStaticPath(urlPath){
  let pathname = decodeURIComponent(urlPath);
  if(pathname === '/') pathname = '/index.html';
  if(pathname === '/logs') pathname = '/run-database/index.html';
  const full = path.resolve(ROOT, '.' + pathname);
  const rel = path.relative(ROOT, full);
  if(rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
}

function serveStatic(req, res, pathname){
  const filePath = safeStaticPath(pathname);
  if(!filePath) return send(res, 403, 'Forbidden');
  fs.stat(filePath, (err, stat) => {
    if(err) return send(res, 404, 'Not found');
    let target = filePath;
    if(stat.isDirectory()) target = path.join(filePath, 'index.html');
    fs.readFile(target, (readErr, data) => {
      if(readErr) return send(res, 404, 'Not found');
      send(res, 200, data, MIME[path.extname(target).toLowerCase()] || 'application/octet-stream');
    });
  });
}

fs.mkdirSync(DB_ROOT, {recursive:true});
rebuildDatabaseIndex();

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if(req.method === 'POST' && url.pathname === '/api/run-log'){
    return readBody(req, 10 * 1024 * 1024, body => {
      try {
        const log = JSON.parse(body || '{}');
        const summary = saveRunLog(log);
        send(res, 200, JSON.stringify({ok:true, summary}), 'application/json; charset=utf-8');
      } catch(err){
        send(res, 400, JSON.stringify({ok:false, error:err.message}), 'application/json; charset=utf-8');
      }
    });
  }
  if(req.method === 'GET' && url.pathname === '/api/logs'){
    const summaries = [];
    collectSummaries(DB_ROOT, summaries);
    summaries.sort((a,b)=>String(b.endedAt).localeCompare(String(a.endedAt)));
    return send(res, 200, JSON.stringify(summaries), 'application/json; charset=utf-8');
  }
  if(req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  serveStatic(req, res, url.pathname);
}).listen(PORT, () => {
  console.log(`GRUKK server running at http://localhost:${PORT}`);
  console.log(`Run database index: http://localhost:${PORT}/logs`);
});
