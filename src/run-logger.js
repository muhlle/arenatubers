"use strict";
/* =========================================================
   RUN LOGGER
   Live "Details"-style stats for the pause screen, plus optional
   file persistence through server.js when the game is served locally.
========================================================= */

const RUN_LOG_LOCAL_KEY = 'grukk_run_logs';
const RUN_LOG_SESSION_KEY = 'grukk_session';

const RUN_LOG_SOURCE_NAMES = {
  'skeleton.slash': 'Slash',
  'skeleton.cleave': 'Cleave',
  'skeleton.whirlwind': 'Whirlwind',
  'skeleton.ground_slam': 'Ground Slam',
  'skeleton.charge': 'Charge',
  'warlock.shadow_bolt': 'Shadow Bolt',
  'warlock.curse_explosion': 'Curse Explosion',
  'warlock.burning_dot': 'Burning',
  'warlock.burning_sigil': 'Burning Sigil',
  'warlock.sigil_explosion': 'Sigil Explosion',
  'warlock.bone_shield': 'Bone Shield',
  'item.ember_sigil': 'Ember Sigil',
  'item.void_chain': 'Void Chain',
  'item.eye_of_ruin': 'Eye of Ruin',
  'item.felbrand': 'Fel Brand',
  'talent.wolf': 'Wolf Companion',
  'pickup.bomb': 'Bomb',
  'environment.explosion': 'Explosion',
  unknown: 'Unknown'
};

const RUN_LOG_SOURCE_ITEMS = {
  'item.ember_sigil': 'ember',
  'item.eye_of_ruin': 'eyeofruin',
  'item.felbrand': 'felbrand'
};

const RUN_LOG_SOURCE_ICON_META = {
  'skeleton.slash': {tone:'#e8dcc8', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M17.8 2.8L21 6l-9.9 10.1-4.8 1.6 1.6-4.8L17.8 2.8z" fill="#e8dcc8" stroke="#fff2cc" stroke-width="1.1"/><path d="M5 19l10-3" stroke="#ff9a5c" stroke-width="2" stroke-linecap="round"/></svg>`},
  'skeleton.cleave': {tone:'#ffd75c', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M4 17c5.3-8.4 12.1-11.5 16.5-9.6" stroke="#ffd75c" stroke-width="2.1" stroke-linecap="round"/><path d="M7 19c2.6-2.9 5.9-4.7 10-5.4" stroke="#e8dcc8" stroke-width="1.5" stroke-linecap="round"/><path d="M17.5 6.7l2.7.5-.7 2.6" stroke="#ff9a5c" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`},
  'skeleton.whirlwind': {tone:'#9adcff', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M6.1 8.8A7.4 7.4 0 0118.6 7" stroke="#9adcff" stroke-width="2" stroke-linecap="round"/><path d="M17.7 4.1l1.4 3.4-3.5 1.1" stroke="#e8f7ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.9 15.2A7.4 7.4 0 015.4 17" stroke="#ffd75c" stroke-width="2" stroke-linecap="round"/><path d="M6.3 19.9l-1.4-3.4 3.5-1.1" stroke="#fff2cc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`},
  'skeleton.ground_slam': {tone:'#ffd75c', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.8l2.6 6.1 6.6.5-5 4.2 1.6 6.4-5.8-3.4L6.2 20l1.6-6.4-5-4.2 6.6-.5L12 2.8z" fill="#ffd75c" stroke="#fff2c0" stroke-width="1.1"/><path d="M5.2 21l2.5-2M18.8 21l-2.5-2M12 21v-3" stroke="#8a5a20" stroke-width="1.4" stroke-linecap="round"/></svg>`},
  'skeleton.charge': {tone:'#b8ffb0', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M3.2 12h11.4" stroke="#b8ffb0" stroke-width="2.3" stroke-linecap="round"/><path d="M10.8 6.1l6.8 5.9-6.8 5.9" stroke="#e8ffe4" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.6 5.1l4.2 6.9-4.2 6.9" stroke="#7cf5ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`},
  'warlock.shadow_bolt': {tone:'#c840ff', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M3.2 12l7.3-4.1v2.6h7.9l2.4 1.5-2.4 1.5h-7.9v2.6L3.2 12z" fill="#9b59f5" stroke="#f0dcff" stroke-width="1.1"/><circle cx="18.4" cy="12" r="2.6" fill="#c840ff" stroke="#f5d8ff" stroke-width="1"/><path d="M5.1 8.4l2.8 1M5.1 15.6l2.8-1" stroke="#ff6020" stroke-width="1.1" stroke-linecap="round"/></svg>`},
  'warlock.curse_explosion': {tone:'#c840ff', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.1l7.1 4.1v8.2L12 19.5l-7.1-4.1V7.2L12 3.1z" fill="#3a104a" stroke="#e8a0ff" stroke-width="1.1"/><path d="M5.7 12c2.8-3.8 9.8-3.8 12.6 0-2.8 3.8-9.8 3.8-12.6 0z" fill="#13001d" stroke="#ffc8ff" stroke-width="1.1"/><circle cx="12" cy="12" r="2.6" fill="#c840ff"/><path d="M12 1.6v2.4M12 20v2.4M2.6 6.4l2.1 1.2M19.3 16.4l2.1 1.2M21.4 6.4l-2.1 1.2M4.7 16.4l-2.1 1.2" stroke="#ff80ff" stroke-width="1" stroke-linecap="round"/></svg>`},
  'warlock.burning_dot': {tone:'#ff6020', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.4" fill="#3a1205" stroke="#ff9060" stroke-width="1.1"/><path d="M12 5.3c2.8 2.4 4.5 4.7 4.5 7.3 0 3-2 5.1-4.5 5.1s-4.5-2.1-4.5-5.1c0-1.8 1.1-3.2 2.5-4.6-.1 2 .6 3.3 2 3.8.9-1.7.6-3.6 0-6.5z" fill="#ff6020" stroke="#fff0a0" stroke-width=".9"/></svg>`},
  'warlock.burning_sigil': {tone:'#ff6020', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.7" fill="#571400" stroke="#ffd75c" stroke-width="1.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#2b0800" stroke-width="1.5"/><path d="M12 4.5v4M12 15.5v4M4.5 12h4M15.5 12h4M6.8 6.8l2.8 2.8M14.4 14.4l2.8 2.8M17.2 6.8l-2.8 2.8M9.6 14.4l-2.8 2.8" stroke="#fff0a0" stroke-width="1" stroke-linecap="round"/></svg>`},
  'warlock.sigil_explosion': {tone:'#ff6020', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5.4" fill="#ff6020" stroke="#fff0a0" stroke-width="1.1"/><path d="M12 1.9l1.2 5.1M12 17l-1.2 5.1M22.1 12L17 13.2M7 10.8L1.9 12M19.1 4.9l-3.6 4M8.5 15.1l-3.6 4M19.1 19.1l-4-3.6M8.9 8.5l-4-3.6" stroke="#ffd75c" stroke-width="1.4" stroke-linecap="round"/></svg>`},
  'warlock.bone_shield': {tone:'#d8d0ba', kind:'ability', svg:`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.3" fill="#1d1722" stroke="#9adcff" stroke-width="1.1" stroke-dasharray="2.1 1.7"/><path d="M12 4.9l1.4 3.1-1.4 2.5L10.6 8 12 4.9zM19 12l-3.1 1.4-2.5-1.4 2.5-1.4L19 12zM12 19.1L10.6 16l1.4-2.5 1.4 2.5-1.4 3.1zM5 12l3.1-1.4 2.5 1.4-2.5 1.4L5 12z" fill="#d8d0ba" stroke="#fff3d0" stroke-width=".72"/><path d="M10.3 11.2h.01M13.7 11.2h.01M10.8 13.3h2.4" stroke="#d8d0ba" stroke-width="1.2" stroke-linecap="round"/></svg>`},
  'item.void_chain': {tone:'#b94aff', kind:'item', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M8.7 9.1l-2.1 2.1a3.3 3.3 0 004.7 4.7l2.1-2.1M10.6 12.9l2.8-2.8M15.3 14.9l2.1-2.1a3.3 3.3 0 00-4.7-4.7l-2.1 2.1" stroke="#d8a8ff" stroke-width="1.8" stroke-linecap="round"/><path d="M5 19l14-14" stroke="#c840ff" stroke-width="1.1" stroke-linecap="round"/></svg>`},
  'talent.wolf': {tone:'#9adcff', kind:'talent', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M5 15.8l2.2-8 3.1 2.4 3.4-.1L17 7.4l2.1 8.4-3.8 3.2H8.7L5 15.8z" fill="#1c2630" stroke="#c8e0ff" stroke-width="1.1"/><path d="M8.8 13h.01M15.2 13h.01M10 17h4" stroke="#e8f7ff" stroke-width="1.3" stroke-linecap="round"/></svg>`},
  'pickup.bomb': {tone:'#ff6020', kind:'pickup', svg:`<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="14" r="6.8" fill="#2b2520" stroke="#f0d0a0" stroke-width="1.2"/><path d="M15.7 8.9l2.1-2.4M17.1 5.2l3.2-2.4M18.4 7.7l3.1-.2" stroke="#ffd75c" stroke-width="1.4" stroke-linecap="round"/><path d="M8.5 11.2c1.2-1.2 3.1-1.2 4.3 0" stroke="#fff2cc" stroke-width="1.1" stroke-linecap="round"/></svg>`},
  'environment.explosion': {tone:'#ff9a3c', kind:'environment', svg:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5l1.8 6 5.9-2.1-3 5.5 5.1 3.5-6.2.9.4 6.2-4-4.8-4 4.8.4-6.2-6.2-.9 5.1-3.5-3-5.5 5.9 2.1L12 2.5z" fill="#ff9a3c" stroke="#fff0a0" stroke-width="1.1"/></svg>`}
};

function runLogNow(){ return new Date().toISOString(); }
function runLogPlayerName(){
  try { return localStorage.getItem(RUN_LOG_SESSION_KEY) || 'guest'; }
  catch(e){ return 'guest'; }
}
function runLogEscape(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[ch]);
}
function runLogNum(v){ return Math.round((Number(v) || 0) * 10) / 10; }
function runLogInt(v){ return Math.round(Number(v) || 0); }
function runLogLabel(id){
  if(RUN_LOG_SOURCE_NAMES[id]) return RUN_LOG_SOURCE_NAMES[id];
  return String(id || 'unknown').replace(/^[^.]+\./,'').replace(/_/g,' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
function runLogMobName(type){
  if(type === 'boss') return 'Boss';
  return String(type || 'unknown').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}
function runLogClone(obj){
  return JSON.parse(JSON.stringify(obj));
}
function runLogBucket(map, id, seed){
  id = id || 'unknown';
  if(!map[id]) map[id] = Object.assign({id}, seed || {});
  return map[id];
}
function runLogSourceId(source){
  if(typeof source === 'string') return source || 'unknown';
  if(source && source.id) return source.id;
  return 'unknown';
}
function runLogSourceKind(source){
  if(source && source.kind) return source.kind;
  const id = runLogSourceId(source);
  return id.indexOf('.') > 0 ? id.split('.')[0] : 'unknown';
}

function runLogItemSourceIcon(id){
  const itemId = RUN_LOG_SOURCE_ITEMS[id];
  if(!itemId || typeof getItemDef !== 'function') return '';
  const def = getItemDef(itemId);
  if(!def || !def.svg) return '';
  const hue = def.hue || '#b98aff';
  return `<span class="run-source-icon item" style="--src:${runLogEscape(hue)}">${def.svg}</span>`;
}

function runLogSourceIcon(row){
  const id = row && row.id ? row.id : runLogSourceId(row);
  const itemIcon = runLogItemSourceIcon(id);
  if(itemIcon) return itemIcon;
  const meta = RUN_LOG_SOURCE_ICON_META[id] || null;
  const kind = meta ? meta.kind : runLogSourceKind(row);
  const tone = meta && meta.tone ? meta.tone : (row && row.dmgType && typeof DMG_COLORS !== 'undefined' && DMG_COLORS[row.dmgType] ? DMG_COLORS[row.dmgType] : '#8d8270');
  const svg = meta && meta.svg ? meta.svg : `<span class="run-source-letter">${runLogEscape(runLogLabel(id).slice(0, 1))}</span>`;
  return `<span class="run-source-icon ${runLogEscape(kind || 'unknown')}" style="--src:${runLogEscape(tone)}">${svg}</span>`;
}

function runLogSourceCell(row){
  const label = row && (row.name || row.source || row.id) ? (row.name || row.source || row.id) : 'Unknown';
  return `<span class="run-source-cell">${runLogSourceIcon(row)}<span>${runLogEscape(label)}</span></span>`;
}

function runLogEnemyType(source){
  if(source && source.enemyType) return source.enemyType;
  if(source && source.type) return source.type;
  return 'unknown';
}
function runLogEvent(type, data){
  if(!G || !G.runLog) return;
  G.runLog.events.push({
    t: runLogNum(G.t || 0),
    wave: G.wave || 0,
    level: G.player ? G.player.level : 0,
    type,
    data: data || {}
  });
}

function runLogStart(mapId){
  if(!G || !G.player) return;
  const cfg = (typeof MAP_CONFIGS !== 'undefined' && MAP_CONFIGS[mapId]) ? MAP_CONFIGS[mapId] : null;
  const p = G.player;
  const startedAt = runLogNow();
  G.runLog = {
    version: 1,
    runId: startedAt.replace(/[:.]/g,'-') + '-' + Math.random().toString(36).slice(2, 8),
    playerName: runLogPlayerName(),
    characterId: G.charClass || (typeof selectedChar !== 'undefined' ? selectedChar : 'unknown'),
    mapId: mapId || G.mapId || 'pit',
    mapName: cfg ? cfg.name : (mapId || 'Unknown Map'),
    startedAt,
    endedAt: null,
    durationSec: 0,
    result: 'running',
    waveReached: G.wave || 1,
    finalWave: typeof getFinalWave === 'function' ? getFinalWave() : 0,
    levelReached: p.level || 1,
    playerStart: {
      maxhp: p.maxhp, baseDmg: p.baseDmg, speed: p.speed,
      armor: p.armor, crit: p.crit, reach: p.reach, atkSpd: p.atkSpd
    },
    totals: { damageDone:0, damageTaken:0, hitsTaken:0, kills:0, powerups:0, items:0, xpGained:0 },
    damageDone: {},
    damageTaken: {},
    kills: {},
    choices: [],
    levelUps: [],
    waves: [],
    events: []
  };
  runLogEvent('run_start', {mapId:G.runLog.mapId, characterId:G.runLog.characterId});
}

function runLogWaveStart(wave){
  if(!G || !G.runLog) return;
  G.runLog.waveReached = Math.max(G.runLog.waveReached || 0, wave || 0);
  G.runLog.waves.push({
    wave,
    t: runLogNum(G.t || 0),
    checkpoint: G.checkpoint || '',
    theme: G.waveTheme && G.waveTheme.nm ? G.waveTheme.nm : '',
    budget: G.toSpawn || 0,
    cap: G.maxEnemies || 0
  });
}

function runLogDamageDone(target, amount, crit, dmgType, source){
  if(!G || !G.runLog || !target) return;
  const dmg = Math.max(0, Number(amount) || 0);
  const id = runLogSourceId(source);
  const type = target.boss ? 'boss' : (target.type || 'unknown');
  const bucket = runLogBucket(G.runLog.damageDone, id, {
    name: runLogLabel(id),
    kind: runLogSourceKind(source),
    total:0, hits:0, crits:0, max:0, dmgType:dmgType || 'unknown',
    targets:{}
  });
  bucket.total += dmg;
  bucket.hits++;
  bucket.crits += crit ? 1 : 0;
  bucket.max = Math.max(bucket.max || 0, dmg);
  const tb = runLogBucket(bucket.targets, type, {
    name: runLogMobName(type), total:0, hits:0, crits:0, max:0
  });
  tb.total += dmg;
  tb.hits++;
  tb.crits += crit ? 1 : 0;
  tb.max = Math.max(tb.max || 0, dmg);
  G.runLog.totals.damageDone += dmg;
}

function runLogDamageTaken(amount, source){
  if(!G || !G.runLog) return;
  const dmg = Math.max(0, Number(amount) || 0);
  const enemyType = runLogEnemyType(source);
  const attack = source && source.attack ? source.attack : 'hit';
  const id = enemyType + ':' + attack;
  const bucket = runLogBucket(G.runLog.damageTaken, id, {
    enemyType,
    enemyName: runLogMobName(enemyType),
    attack,
    total:0, hits:0, max:0
  });
  bucket.total += dmg;
  bucket.hits++;
  bucket.max = Math.max(bucket.max || 0, dmg);
  G.runLog.totals.damageTaken += dmg;
  G.runLog.totals.hitsTaken = (G.runLog.totals.hitsTaken || 0) + 1;
}

function runLogKill(enemy){
  if(!G || !G.runLog || !enemy) return;
  const type = enemy.boss ? 'boss' : (enemy.type || 'unknown');
  const bucket = runLogBucket(G.runLog.kills, type, {
    name: runLogMobName(type), count:0, elites:0, bosses:0, exp:0
  });
  bucket.count++;
  bucket.elites += enemy.elite ? 1 : 0;
  bucket.bosses += enemy.boss ? 1 : 0;
  bucket.exp += Math.round(enemy.exp || 0);
  G.runLog.totals.kills++;
}

function runLogChoice(kind, def, rank){
  if(!G || !G.runLog || !def) return;
  G.runLog.choices.push({
    t: runLogNum(G.t || 0),
    wave: G.wave || 0,
    level: G.player ? G.player.level : 0,
    kind,
    id: def.id || '',
    name: def.nm || def.name || def.id || '',
    rank: rank || 1,
    tags: def.tags || []
  });
  if(kind === 'item') G.runLog.totals.items++;
  if(kind === 'powerup') G.runLog.totals.powerups++;
}

function runLogLevelUp(){
  if(!G || !G.runLog || !G.player) return;
  G.runLog.levelReached = Math.max(G.runLog.levelReached || 1, G.player.level || 1);
  G.runLog.levelUps.push({
    t: runLogNum(G.t || 0),
    wave: G.wave || 0,
    level: G.player.level || 1,
    xpNext: G.player.xpNext || 0
  });
}

function runLogFinish(result){
  if(!G || !G.runLog || G.runLog.endedAt) return;
  const log = G.runLog;
  log.endedAt = runLogNow();
  log.result = result || 'ended';
  log.durationSec = runLogNum((new Date(log.endedAt) - new Date(log.startedAt)) / 1000);
  log.waveReached = Math.max(log.waveReached || 0, G.wave || 0);
  log.levelReached = Math.max(log.levelReached || 1, G.player ? G.player.level : 1);
  log.totals.damageDone = runLogInt(log.totals.damageDone);
  log.totals.damageTaken = runLogInt(log.totals.damageTaken);
  runLogEvent('run_end', {result:log.result, waveReached:log.waveReached, levelReached:log.levelReached});
  runLogStoreLocal(log);
  runLogPostToServer(log);
}

function runLogStoreLocal(log){
  try {
    const list = JSON.parse(localStorage.getItem(RUN_LOG_LOCAL_KEY) || '[]');
    list.unshift(runLogClone(log));
    localStorage.setItem(RUN_LOG_LOCAL_KEY, JSON.stringify(list.slice(0, 30)));
  } catch(e){}
}

function runLogPostToServer(log){
  if(typeof fetch !== 'function' || location.protocol === 'file:') return;
  fetch('/api/run-log', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(runLogClone(log))
  }).catch(()=>{});
}

function runLogEnemySource(enemy, attack){
  return {
    kind:'enemy',
    enemyType: enemy && enemy.type ? enemy.type : 'unknown',
    enemyRole: enemy && enemy.role ? enemy.role : '',
    attack: attack || 'hit'
  };
}

function damageFromEnemy(enemy, amount, attack){
  damagePlayer(amount, runLogEnemySource(enemy, attack));
}

function runLogTipAttr(html){
  return encodeURIComponent(html);
}
function runLogSourceTip(row){
  const targets = Object.values(row.targets || {}).sort((a,b)=>b.total-a.total).slice(0, 8);
  const lines = targets.map(t =>
    `<tr><td>${runLogEscape(t.name)}</td><td>${runLogInt(t.total)}</td><td>${t.hits}</td><td>${t.crits}</td><td>${runLogInt(t.total / Math.max(1, t.hits))}</td></tr>`
  ).join('');
  return `<div class="tnm">${runLogSourceCell(row)}<span class="tlv">${runLogEscape(row.dmgType || '')}</span></div>` +
    `<div class="tds">Hits ${row.hits}, crits ${row.crits}, max hit ${runLogInt(row.max)}, average ${runLogInt(row.total / Math.max(1, row.hits))}.</div>` +
    `<table class="tiptable"><tr><th>Target</th><th>Dmg</th><th>Hits</th><th>Crit</th><th>Avg</th></tr>${lines}</table>`;
}
function runLogMobTip(type){
  if(!G || !G.runLog) return '';
  const kill = G.runLog.kills[type] || {name:runLogMobName(type), count:0, elites:0, exp:0};
  const takenRows = Object.values(G.runLog.damageTaken).filter(r => r.enemyType === type);
  const totalTaken = takenRows.reduce((s,r)=>s+r.total,0);
  const hits = takenRows.reduce((s,r)=>s+r.hits,0);
  const max = takenRows.reduce((s,r)=>Math.max(s,r.max || 0),0);
  const attacks = takenRows.sort((a,b)=>b.total-a.total).map(r =>
    `<tr><td>${runLogEscape(r.attack)}</td><td>${runLogInt(r.total)}</td><td>${r.hits}</td><td>${runLogInt(r.total / Math.max(1, r.hits))}</td><td>${runLogInt(r.max)}</td></tr>`
  ).join('');
  return `<div class="tnm">${runLogEscape(kill.name)}<span class="tlv">${type}</span></div>` +
    `<div class="tds">Kills ${kill.count}, elites ${kill.elites}, XP dropped ${runLogInt(kill.exp)}.</div>` +
    `<div class="tcur"><span class="tlabel">Damage Taken</span>${runLogInt(totalTaken)} total, ${hits} hits, ${runLogInt(totalTaken / Math.max(1, hits))} average, ${runLogInt(max)} max.</div>` +
    `<table class="tiptable"><tr><th>Attack</th><th>Dmg</th><th>Hits</th><th>Avg</th><th>Max</th></tr>${attacks || '<tr><td colspan="5">No hits taken.</td></tr>'}</table>`;
}
function runLogKillTip(type){
  if(!G || !G.runLog) return '';
  const kill = G.runLog.kills[type] || {name:runLogMobName(type), count:0, elites:0, bosses:0, exp:0};
  const targetRows = [];
  for(const src of Object.values(G.runLog.damageDone || {})){
    const target = src.targets && src.targets[type];
    if(!target) continue;
    targetRows.push({
      id: src.id || '',
      source: src.name || runLogLabel(src.id),
      total: target.total || 0,
      hits: target.hits || 0,
      crits: target.crits || 0,
      max: target.max || 0
    });
  }
  targetRows.sort((a,b)=>b.total-a.total);
  const totalDamage = targetRows.reduce((sum,row)=>sum+row.total,0);
  const totalHits = targetRows.reduce((sum,row)=>sum+row.hits,0);
  const totalCrits = targetRows.reduce((sum,row)=>sum+row.crits,0);
  const maxHit = targetRows.reduce((max,row)=>Math.max(max,row.max || 0),0);
  const kills = Math.max(1, kill.count || 0);
  const rows = targetRows.slice(0, 8).map(row =>
    `<tr><td>${runLogSourceCell(row)}</td><td>${runLogInt(row.total)}</td><td>${row.hits}</td><td>${row.crits}</td><td>${runLogInt(row.hits / kills)}</td></tr>`
  ).join('');
  return `<div class="tnm">${runLogEscape(kill.name)}<span class="tlv">KILLS</span></div>` +
    `<div class="tds">Killed ${kill.count || 0}, elites ${kill.elites || 0}, XP dropped ${runLogInt(kill.exp)}.</div>` +
    `<div class="tcur"><span class="tlabel">Average Hits Per Kill</span>${runLogInt(totalHits / kills)} hits / kill, ${runLogInt(totalDamage / kills)} damage / kill, ${totalCrits} crits total, max hit ${runLogInt(maxHit)}.</div>` +
    `<table class="tiptable"><tr><th>Source</th><th>Dmg</th><th>Hits</th><th>Crit</th><th>Hit/Kill</th></tr>${rows || '<tr><td colspan="5">No damage breakdown yet.</td></tr>'}</table>`;
}
const MOB_SVG_ICONS = {
  // ── Classic pit mobs ──
  imp: (_c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="11" r="7" fill="#e01020" stroke="#8a0010" stroke-width="1.4"/>
    <path d="M6.5 5.5L4 2M13.5 5.5L16 2" stroke="#ff3040" stroke-width="2" stroke-linecap="round"/>
    <circle cx="7.5" cy="10" r="1.4" fill="#ffe26a"/><circle cx="12.5" cy="10" r="1.4" fill="#ffe26a"/>
    <path d="M8 14c.6.8 3.4.8 4 0" stroke="#8a0010" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`,

  grunt: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="11" r="7.5" fill="${c}" stroke="#2c3a18" stroke-width="1.5"/>
    <rect x="3.5" y="8" width="13" height="3.5" rx="1" fill="#a82a1e"/>
    <circle cx="7.5" cy="10.5" r="1.2" fill="#ffd75c"/><circle cx="12.5" cy="10.5" r="1.2" fill="#ffd75c"/>
    <path d="M15.5 7L18 4.5" stroke="#aab2bc" stroke-width="2" stroke-linecap="round"/>
    <path d="M17.5 4l1.5-.5-.5 1.5" fill="#aab2bc"/>
  </svg>`,

  shaman: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2.5L17 16H3L10 2.5z" fill="${c}" stroke="#3a1d52" stroke-width="1.4"/>
    <rect x="7.5" y="0.5" width="5" height="4" rx="1" fill="#caa3ff"/>
    <circle cx="15" cy="4" r="2.5" fill="#c06aff" stroke="#e0b0ff" stroke-width="0.8"/>
    <circle cx="7.5" cy="10.5" r="1.1" fill="#e0c0ff"/><circle cx="12.5" cy="10.5" r="1.1" fill="#e0c0ff"/>
  </svg>`,

  brute: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="11" r="8" fill="${c}" stroke="#352a20" stroke-width="2"/>
    <path d="M2.5 7L5.5 10M17.5 7L14.5 10" stroke="#ded3b8" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M3 11.5c2-3.5 12-3.5 14 0" fill="#4d4339"/>
    <circle cx="7.5" cy="11" r="1.5" fill="#ff6a4a"/><circle cx="12.5" cy="11" r="1.5" fill="#ff6a4a"/>
  </svg>`,

  bomber: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9.5" cy="12" r="6.5" fill="${c}" stroke="#15171c" stroke-width="1.5"/>
    <path d="M12 6.5Q15 2 17 3" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/>
    <circle cx="17" cy="3" r="2" fill="#ffd75c"/>
    <circle cx="8" cy="11" r="1.2" fill="#ff9a5c"/><circle cx="11" cy="11" r="1.2" fill="#ff9a5c"/>
  </svg>`,

  pit_runner: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="10" cy="11" rx="5.5" ry="7" fill="${c}" stroke="#3a0808" stroke-width="1.3"/>
    <ellipse cx="10" cy="14" rx="4" ry="2.5" fill="#8b1a1a"/>
    <path d="M6.5 14.5L4.5 17M13.5 14.5L15.5 17" stroke="#666060" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="7.5" cy="9.5" r="1.1" fill="#ffee00"/><circle cx="12.5" cy="9.5" r="1.1" fill="#ffee00"/>
  </svg>`,

  chain_brute: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="11" r="7.5" fill="${c}" stroke="#2a2018" stroke-width="2.5"/>
    <path d="M10 11L17.5 5" stroke="#5a5040" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="18" cy="4.5" r="2.5" fill="#3a3028" stroke="#6a5a40" stroke-width="1.2"/>
    <path d="M3.5 9.5c2-2.5 11-2.5 13 0" fill="#6a5a48"/>
    <circle cx="7.5" cy="11.5" r="1.5" fill="#ff9a4a"/><circle cx="12.5" cy="11.5" r="1.5" fill="#ff9a4a"/>
  </svg>`,

  gore_leaper: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="10" cy="13" rx="6" ry="5" fill="${c}" stroke="#2a0a0a" stroke-width="1.4"/>
    <path d="M6 10L3 5M14 10L17 5" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <path d="M5 5.5L3 3M15 5.5L17 3" stroke="#ff2030" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="8" cy="12" r="1.2" fill="#ff3040"/><circle cx="12" cy="12" r="1.2" fill="#ff3040"/>
  </svg>`,

  totem: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7.5" y="5" width="5" height="13" rx="1" fill="${c}" stroke="#2a1a0a" stroke-width="1.3"/>
    <path d="M5.5 8h9M5.5 13h9" stroke="#2a1a0a" stroke-width="1"/>
    <circle cx="10" cy="5" r="3" fill="#ffd75c" stroke="#c0870a" stroke-width="1"/>
    <circle cx="10" cy="5" r="1.5" fill="#ff6020"/>
  </svg>`,

  arrow_sniper: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6.5" fill="${c}" stroke="#1a2010" stroke-width="1.3"/>
    <path d="M5 10h10" stroke="#4a3010" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M13 7l3 3-3 3" stroke="#9ab050" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 10l4-2v4z" fill="#c0a060"/>
  </svg>`,

  vine_shaman: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2L17.5 16H2.5L10 2z" fill="${c}" stroke="#1a3a10" stroke-width="1.4"/>
    <path d="M7 14Q5 10 8 7M13 14Q15 10 12 7" stroke="#2a6a10" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="10" cy="4" r="2.5" fill="#40a020" stroke="#a0e050" stroke-width="0.8"/>
  </svg>`,

  hex_witch: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L18 17H2L10 3z" fill="${c}" stroke="#301050" stroke-width="1.4"/>
    <path d="M6.5 3.5L10 0.5L13.5 3.5" fill="#2a0050" stroke="#c040ff" stroke-width="1.1"/>
    <circle cx="8" cy="11" r="1.2" fill="#ff40ff"/><circle cx="12" cy="11" r="1.2" fill="#ff40ff"/>
    <path d="M7 15c1 1.5 5 1.5 6 0" stroke="#c040ff" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  stalker: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="10" cy="11" rx="6" ry="7.5" fill="${c}" stroke="#0a0a18" stroke-width="1.3" opacity="0.85"/>
    <path d="M7.5 6.5L5 4M12.5 6.5L15 4" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="8" cy="10" r="1.3" fill="#60d0ff"/><circle cx="12" cy="10" r="1.3" fill="#60d0ff"/>
  </svg>`,

  // ── Spider types (darklands) — shared spider template ──
  _spider: (c, opts={}) => {
    const legC = opts.legCol || c;
    const bodyR = opts.large ? 5.5 : 4;
    const headR = opts.large ? 3 : 2.2;
    const cx = 10, by = opts.large ? 13 : 12, hy = by - bodyR - headR + 1;
    const extra = opts.extra || '';
    return `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="${cx-bodyR}" y1="${by-1}" x2="${cx-bodyR-4}" y2="${by-4}" stroke="${legC}" stroke-width="1.3"/>
      <line x1="${cx-bodyR}" y1="${by}" x2="${cx-bodyR-5}" y2="${by+1}" stroke="${legC}" stroke-width="1.3"/>
      <line x1="${cx-bodyR}" y1="${by+1}" x2="${cx-bodyR-4}" y2="${by+5}" stroke="${legC}" stroke-width="1.3"/>
      <line x1="${cx+bodyR}" y1="${by-1}" x2="${cx+bodyR+4}" y2="${by-4}" stroke="${legC}" stroke-width="1.3"/>
      <line x1="${cx+bodyR}" y1="${by}" x2="${cx+bodyR+5}" y2="${by+1}" stroke="${legC}" stroke-width="1.3"/>
      <line x1="${cx+bodyR}" y1="${by+1}" x2="${cx+bodyR+4}" y2="${by+5}" stroke="${legC}" stroke-width="1.3"/>
      <ellipse cx="${cx}" cy="${by}" rx="${bodyR}" ry="${bodyR*0.85}" fill="${c}" stroke="#0a0810" stroke-width="1"/>
      <circle cx="${cx}" cy="${hy}" r="${headR}" fill="${c}" stroke="#0a0810" stroke-width="0.9"/>
      <circle cx="${cx-headR*0.5}" cy="${hy}" r="${headR*0.35}" fill="#ff2020"/>
      <circle cx="${cx+headR*0.5}" cy="${hy}" r="${headR*0.35}" fill="#ff2020"/>
      ${extra}
    </svg>`;
  },

  spiderling: (c) => MOB_SVG_ICONS._spider(c, {legCol:'#604030'}),
  venom_spitter: (c) => MOB_SVG_ICONS._spider(c, {extra:'<circle cx="10" cy="17" r="1.5" fill="#40c020" opacity="0.8"/>'}),
  dart_spider: (c) => MOB_SVG_ICONS._spider(c, {legCol:'#506070', extra:'<path d="M10 2l1 3h-2z" fill="#90a0b0"/>'}),
  cobweb_crawler: (c) => MOB_SVG_ICONS._spider(c, {extra:'<path d="M2 5Q10 10 18 5M2 10h16M2 15Q10 10 18 15" stroke="#a0907a" stroke-width="0.7" opacity="0.5"/>'}),
  blood_stalker: (c) => MOB_SVG_ICONS._spider(c, {legCol:'#700010', extra:'<path d="M7 12l3 2 3-2" stroke="#ff0020" stroke-width="1.2" stroke-linecap="round"/>'}),
  carapace_guard: (c) => MOB_SVG_ICONS._spider(c, {large:true, legCol:'#302050', extra:'<ellipse cx="10" cy="13" rx="4.5" ry="3.5" fill="none" stroke="#b090e0" stroke-width="1.5"/>'}),
  jade_widow: (c) => MOB_SVG_ICONS._spider(c, {legCol:'#205020', extra:'<path d="M8.5 11.5h3v2h-3z" fill="#e8ffe0"/>'}),
  phase_stalker: (c) => MOB_SVG_ICONS._spider(c, {extra:'<circle cx="10" cy="12" r="5" fill="none" stroke="#8040ff" stroke-width="1" opacity="0.6" stroke-dasharray="2 1.5"/>'}),
  brood_mother: (c) => MOB_SVG_ICONS._spider(c, {large:true, extra:'<circle cx="4.5" cy="17" r="1.5" fill="#c03060"/><circle cx="10" cy="18.5" r="1.5" fill="#c03060"/><circle cx="15.5" cy="17" r="1.5" fill="#c03060"/>'}),
  void_weaver: (c) => MOB_SVG_ICONS._spider(c, {large:true, legCol:'#200a50', extra:'<circle cx="10" cy="12" r="3" fill="none" stroke="#8000ff" stroke-width="1.5"/><circle cx="10" cy="12" r="1.2" fill="#c040ff"/>'}),

  // ── Boss fallback ──
  boss: (c) => `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 1l2.2 6.5H19l-5.5 4 2.1 6.5L10 14l-5.6 4 2.1-6.5L1 7.5h6.8L10 1z" fill="${c}" stroke="#fff0a0" stroke-width="1"/>
    <circle cx="8" cy="10" r="1.2" fill="#fff"/><circle cx="12" cy="10" r="1.2" fill="#fff"/>
  </svg>`,
};

function runLogMobIcon(type){
  const def = typeof ETYPES !== 'undefined' ? ETYPES[type] : null;
  const col = def && def.col ? def.col : (type === 'boss' ? '#ff2040' : '#786a50');
  const svgFn = MOB_SVG_ICONS[type] || MOB_SVG_ICONS.boss;
  const svg = svgFn(col);
  return `<span class="run-mob-icon" style="--mob:${runLogEscape(col)}">${svg}</span>`;
}


function renderRunStats(targetId){
  const el = $(targetId);
  if(!el) return;
  if(!G || !G.runLog){
    el.innerHTML = '<div class="runlog-empty">No active run log yet.</div>';
    return;
  }
  const log = G.runLog;
  log.waveReached = Math.max(log.waveReached || 0, G.wave || 0);
  log.levelReached = Math.max(log.levelReached || 1, G.player ? G.player.level : 1);
  const hitsTaken = log.totals.hitsTaken || Object.values(log.damageTaken).reduce((sum,row)=>sum+(row.hits||0),0);
  const done = Object.values(log.damageDone).sort((a,b)=>b.total-a.total).slice(0, 7);
  const kills = Object.values(log.kills).sort((a,b)=>b.count-a.count || b.exp-a.exp).slice(0, 7);
  const takenByMob = {};
  for(const r of Object.values(log.damageTaken)){
    const m = runLogBucket(takenByMob, r.enemyType, {
      name: runLogMobName(r.enemyType), total:0, hits:0, max:0
    });
    m.total += r.total; m.hits += r.hits; m.max = Math.max(m.max, r.max || 0);
  }
  const mobs = Object.assign({}, takenByMob);
  for(const k of Object.values(log.kills)){
    const m = runLogBucket(mobs, k.id, {name:k.name, total:0, hits:0, max:0});
    m.kills = k.count;
    m.elites = k.elites;
  }
  const mobRows = Object.entries(mobs).map(([type,row])=>Object.assign({type},row))
    .sort((a,b)=>(b.kills||0)-(a.kills||0) || b.total-a.total).slice(0, 8);

  const doneRows = done.map(r => {
    const avg = r.total / Math.max(1, r.hits);
    return `<tr class="run-tip" data-runtip="${runLogTipAttr(runLogSourceTip(r))}">
      <td>${runLogSourceCell(r)}</td><td>${runLogInt(r.total)}</td><td>${r.hits}</td><td>${r.crits}</td><td>${runLogInt(avg)}</td>
    </tr>`;
  }).join('');
  const killRows = kills.map(k => `<tr class="run-tip" data-runtip="${runLogTipAttr(runLogKillTip(k.id))}">
    <td>${runLogMobIcon(k.id)}${runLogEscape(k.name)}</td><td>${k.count}</td><td>${k.elites}</td><td>${runLogInt(k.exp)}</td>
  </tr>`).join('');
  const mobTakenRows = mobRows.map(m => `<tr class="run-tip" data-runtip="${runLogTipAttr(runLogMobTip(m.type))}">
    <td>${runLogMobIcon(m.type)}${runLogEscape(m.name)}</td><td>${m.kills || 0}</td><td>${runLogInt(m.total)}</td><td>${m.hits || 0}</td><td>${runLogInt(m.total / Math.max(1, m.hits || 0))}</td>
  </tr>`).join('');

  el.innerHTML = `
    <div class="runlog-head">
      <div><b class="runlog-title">Damage breakdown</b><span>${runLogEscape(log.characterId)} / ${runLogEscape(log.mapName)}</span></div>
      <div class="runlog-pill">Wave ${log.waveReached} / Lv ${log.levelReached}</div>
    </div>
    <div class="runlog-kpis">
      <div><span>Damage Done</span><b>${runLogInt(log.totals.damageDone)}</b></div>
      <div><span>Damage Taken</span><b>${runLogInt(log.totals.damageTaken)}</b></div>
      <div><span>Hits Taken</span><b>${hitsTaken}</b></div>
      <div><span>Kills</span><b>${log.totals.kills}</b></div>
      <div><span>Power ups</span><b>${log.totals.powerups + log.totals.items}</b></div>
    </div>
    <div class="runlog-grid">
      <section><h3>Damage Done</h3><table><tr><th>Source</th><th>Dmg</th><th>Hits</th><th>Crit</th><th>Avg</th></tr>${doneRows || '<tr><td colspan="5">No damage yet.</td></tr>'}</table></section>
      <section><h3>Kills</h3><table><tr><th>Mob</th><th>Kills</th><th>Elite</th><th>XP</th></tr>${killRows || '<tr><td colspan="4">No kills yet.</td></tr>'}</table></section>
      <section class="wide"><h3>Mobs & Damage Taken</h3><table><tr><th>Mob</th><th>Kills</th><th>DMG Taken</th><th>Hits</th><th>Avg</th></tr>${mobTakenRows || '<tr><td colspan="5">No mob stats yet.</td></tr>'}</table></section>
    </div>`;
  el.querySelectorAll('.run-tip').forEach(row => {
    row.onmouseenter = () => showTooltip(decodeURIComponent(row.dataset.runtip || ''));
    row.onmousemove = moveTooltip;
    row.onmouseleave = hideTooltip;
  });
  setupRunStatsPanelDrag(el);
}

const RUN_STATS_PANEL_STORAGE_PREFIX = 'grukkRunStatsPanelLayout:';

function runStatsPanelStorageKey(el){
  return RUN_STATS_PANEL_STORAGE_PREFIX + (el.id || 'panel');
}

function readRunStatsPanelLayout(el){
  try {
    return JSON.parse(localStorage.getItem(runStatsPanelStorageKey(el)) || 'null');
  } catch (_) {
    return null;
  }
}

function writeRunStatsPanelLayout(el){
  if(!el) return;
  const r = el.getBoundingClientRect();
  try {
    localStorage.setItem(runStatsPanelStorageKey(el), JSON.stringify({
      x: Math.round(r.left),
      y: Math.round(r.top)
    }));
  } catch (_) {}
}

function clampRunStatsPanelPosition(el, x, y){
  const r = el.getBoundingClientRect();
  const pad = 10;
  return {
    x: clamp(x, pad, Math.max(pad, innerWidth - r.width - pad)),
    y: clamp(y, pad, Math.max(pad, innerHeight - r.height - pad))
  };
}

function applyRunStatsPanelLayout(el, layout){
  if(!el || !layout) return;
  const next = clampRunStatsPanelPosition(el, layout.x, layout.y);
  el.style.left = next.x + 'px';
  el.style.top = next.y + 'px';
  el.style.bottom = 'auto';
}

function setupRunStatsPanelDrag(el){
  if(!el || el.dataset.dragReady) return;
  el.dataset.dragReady = '1';
  applyRunStatsPanelLayout(el, readRunStatsPanelLayout(el));

  let drag = null;
  function stopDragEvent(e){
    e.preventDefault();
    e.stopPropagation();
  }
  function beginDrag(e){
    if(!e.target.closest('.runlog-head')) return;
    stopDragEvent(e);
    const r = el.getBoundingClientRect();
    drag = {
      startX: e.clientX,
      startY: e.clientY,
      x: r.left,
      y: r.top
    };
    if(e.pointerId != null && el.setPointerCapture) el.setPointerCapture(e.pointerId);
  }
  function moveDrag(e){
    if(!drag) return;
    stopDragEvent(e);
    const next = clampRunStatsPanelPosition(el, drag.x + e.clientX - drag.startX, drag.y + e.clientY - drag.startY);
    el.style.left = next.x + 'px';
    el.style.top = next.y + 'px';
    el.style.bottom = 'auto';
  }
  function endDrag(e){
    if(!drag) return;
    stopDragEvent(e);
    drag = null;
    writeRunStatsPanelLayout(el);
  }

  el.addEventListener('mousedown', e=>{
    if(drag){ stopDragEvent(e); return; }
    beginDrag(e);
  });
  addEventListener('mousemove', moveDrag);
  addEventListener('mouseup', endDrag);
  el.addEventListener('pointerdown', beginDrag);
  el.addEventListener('pointermove', moveDrag);
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);
  addEventListener('resize', ()=>{
    const r = el.getBoundingClientRect();
    applyRunStatsPanelLayout(el, {x:r.left, y:r.top});
    writeRunStatsPanelLayout(el);
  });
}

function renderPauseRunStats(){
  renderRunStats('pauseStats');
}

function renderEndRunStats(targetId){
  renderRunStats(targetId);
}
