"use strict";
/* =========================================================
   WAVE DIRECTOR + RUN SETUP
   Arena building moved to rendering-arena.js (buildCurrentArena).
   ARENA_R is now per-map: MAP_CONFIGS[G.mapId].arenaR
========================================================= */
// Compatibility shim — ARENA_R still used in some spawn math
// resolved at runtime from active map config
function getArenaR(){ return (typeof G!=='undefined'&&G&&G.mapId&&MAP_CONFIGS[G.mapId]) ? MAP_CONFIGS[G.mapId].arenaR : 2300; }

/* =========================================================
   WAVE DIRECTOR
========================================================= */
const FINAL_WAVE = 30; // fallback; runtime uses getFinalWave()
function getFinalWave(){
  if(typeof G!=='undefined'&&G&&G.mapId&&MAP_CONFIGS[G.mapId]&&MAP_CONFIGS[G.mapId].finalWave)
    return MAP_CONFIGS[G.mapId].finalWave;
  return FINAL_WAVE;
}
const EARLY_CLEAR_MIN = 20;

function waveDuration(w){
  if(w>=getFinalWave()) return 90;
  return w>=21 ? 30 : 35;
}
function waveCap(w){
  const cap = Math.round(clamp(25 + w*4, 40, 150));
  if(w%5===0) return Math.round(clamp(45 + w*2, 55, 110));
  return cap;
}
function waveSpawnInterval(w){
  return Math.max(0.11, 0.72 - w*0.022);
}
function waveSpawnBurstCount(w){
  if(w>=21) return 4;
  if(w>=10) return 3;
  return 2;
}
function checkpointType(w){
  if(w===getFinalWave()) return 'final';
  if(w===25) return 'champion';
  if(w===20) return 'boss';
  if(w===15) return 'elitePack';
  if(w===10) return 'miniBoss';
  if(w===5) return 'elite';
  return '';
}
function waveBudget(w){
  const dur = waveDuration(w);
  const rate = waveSpawnInterval(w);
  const base = Math.ceil(dur / rate);
  const bonus = w%5===0 ? Math.floor(w*1.5) : Math.floor(w*2.2);
  return Math.max(20, base + bonus);
}
function startWave(w){
  G.wave = w;
  G.waveState = 'spawn';
  G.waveT = waveDuration(w);
  G.waveMaxT = G.waveT;
  G.waveElapsed = 0;
  G.maxEnemies = waveCap(w);
  G.toSpawn = waveBudget(w);
  G.spawnT = 0;
  G.waveDrops = {magnet:0, bomb:0};
  G.checkpoint = checkpointType(w);
  G.waveDirector = typeof buildWaveDirector === 'function' ? buildWaveDirector(w, G.checkpoint) : null;
  G.waveAct = G.waveDirector && G.waveDirector.act ? G.waveDirector.act : '';
  G.waveTheme = G.waveDirector && G.waveDirector.recipe ? G.waveDirector.recipe : null;
  G.waveThemes = G.waveDirector && G.waveDirector.recipes ? G.waveDirector.recipes : (G.waveTheme ? [G.waveTheme] : []);
  if(typeof runLogWaveStart === 'function') runLogWaveStart(w);
  if(w>1) announce(checkpointTitle(w, G.checkpoint), checkpointSubtitle(G.checkpoint, G.waveTheme));
  startCheckpoint(w, G.checkpoint);
}
function checkpointTitle(w,type){
  if(type==='final') return 'FINAL WAVE';
  if(type==='boss') return 'BOSS WAVE';
  if(type==='miniBoss') return 'MINI-BOSS';
  if(type==='elitePack') return 'ELITE PACK';
  if(type==='champion') return 'CHAMPION WAVE';
  if(type==='elite') return 'ELITE WAVE';
  return 'WAVE '+w;
}
function checkpointSubtitle(type, theme){
  const themeName = theme && theme.nm ? theme.nm : '';
  if(type==='elite') return themeName ? 'elite enters the arena - '+themeName : 'elite enters the arena';
  if(type==='miniBoss') return themeName ? 'mini-boss - '+themeName : 'mini-boss';
  if(type==='elitePack') return themeName ? 'elite pack - '+themeName : 'elite pack';
  if(type==='boss') return themeName ? 'boss wave - '+themeName : 'boss wave';
  if(type==='champion') return themeName ? 'champion wave - '+themeName : 'champion wave';
  if(type==='final') return themeName ? 'final boss - '+themeName : 'final boss';
  return themeName;
}
function startCheckpoint(w,type){
  if(type==='elite') setTimeout(()=>{
    if(G&&state!==ST.MENU){
      spawnEnemy('brute', true);
      if(typeof recordDirectedWaveSpawn === 'function') recordDirectedWaveSpawn('brute', G.waveDirector);
    }
  }, 650);
  else if(type==='miniBoss' || type==='boss' || type==='final') setTimeout(()=>{
    if(!G||state===ST.MENU) return;
    const b = spawnBoss(type);
    if(type==='final') G.finalBossSpawned = true;
    return b;
  }, 900);
  else if(type==='elitePack') setTimeout(()=>{
    if(!G||state===ST.MENU) return;
    for(let i=0;i<3;i++){
      const type = pick(['grunt','shaman','brute']);
      spawnEnemy(type, true);
      if(typeof recordDirectedWaveSpawn === 'function') recordDirectedWaveSpawn(type, G.waveDirector);
    }
  }, 650);
  else if(type==='champion') setTimeout(()=>{
    if(!G||state===ST.MENU) return;
    for(let i=0;i<4;i++){
      const type = pick(['brute','shaman','bomber']);
      spawnEnemy(type, true);
      if(typeof recordDirectedWaveSpawn === 'function') recordDirectedWaveSpawn(type, G.waveDirector);
    }
  }, 650);
}
function waveComplete(){
  return G.wave>=getFinalWave() && G.finalBossSpawned && G.boss===null && G.toSpawn<=0 && G.enemies.length===0;
}

/* =========================================================
   RUN SETUP
========================================================= */
function startRun(mapId){
  mapId = mapId || selectedMap || 'pit';
  const cdr = 1 - 0.10*tval('focs');
  const pickupRange = 34 + 20*tval('pull');
  G = {
    t:0, kills:0, coresThisRun:0, killStreak:0, lastKillT:0,
    player:{
      x:0, y:0, r:26, facing:0,
      hp:0, maxhp: Math.round(100*(1+0.15*tval('vita'))),
      speed: 250*(1+0.08*tval('swft')),
      baseDmg: 12, armor: 0.08,
      level:1, xp:0, xpNext:28,
      dmgMul: 1+0.10*tval('brut'), atkSpd:1, reach: 1+(tval('rage')?0.18:0),
      crit:0.05, lifesteal:0, xpMul:1+0.15*tval('gred'), pickupRange, xpPickupRange:pickupRange, projectileSpeed:1,
      itemStats:{ember:0, void:0, ruin:0, ruinHits:0, guard:0, slamRadius:1},
      // combat state
      combo:0, comboReset:0, swing:null, swingCd:0,
      ww:{active:0, tick:0, tickMax:0.18, spins:4, cd:0, cdMax:9*cdr},
      dash:{active:0, cd:0, cdMax:3*cdr, dx:0, dy:0},
      fury:{active:0, cd:0, cdMax:16*cdr},
      slam:{wind:0, cd:0, cdMax:8*cdr},
      iframes:0, hurtT:0, trails:[], step:0, swordTrail:[],
    },
    cam:{x:0,y:0},
    wave:0, waveState:'inter', interT:2.2, waveT:0, waveMaxT:0, waveElapsed:0,
    toSpawn:0, spawnT:0, maxEnemies:0, checkpoint:'', waveTheme:null, waveThemes:[], waveDirector:null,
    waveAct:'',
    pendingLevels:0, lvlAnim:0, items:[], itemsDirty:true, powerCounts:{},
    enemies:[], projectiles:[], playerBolts:[], texts:[], parts:[], gibs:[], zones:[], zaps:[], ruinSlashes:[], pickups:[], rings:[], afterimages:[], killNotifs:[], flames:[],
    waveDrops:{magnet:0, bomb:0}, novas:[], sigils:[],
    screenFx:{nukeGray:0},
    boss:null, finalBossSpawned:false,
    eventQueue:[], activeEvent:null,
    pet: tval('wolf')>=1 ? {
      x:80, y:0, angle:0, t:0,
      atkCd:0,
      target:null, state:'follow',
      dmg:   12 + 8*tval('wolf'),
      range: 360 + 60*tval('wolf'),
      cleavR:90 + 20*tval('wolf'),
      atkCdMax: 2.2 - 0.3*tval('wolf'),
      spd: 320,
    } : null,
  };
  G.charClass = selectedChar;
  G.mapId = mapId;
  buildCurrentArena(mapId);
  if(typeof updateAbilityIcons === 'function') updateAbilityIcons(selectedChar);
  if(selectedChar==='warlock') warlockInitPlayer(G.player, G.player.cdr);
  else if(selectedChar==='skeleton') skeletonInitPlayer(G.player, G.player.cdr);
  if(typeof runLogStart === 'function') runLogStart(mapId);
  startWave(1);
  closeScreens(); showHUD(true); state = ST.PLAY; lastT = performance.now();
  announce('WAVE 1','steel yourself');
}
