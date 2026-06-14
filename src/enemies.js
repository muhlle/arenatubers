"use strict";
/* =========================================================
   enemies.js – enemy definitions, wave director, spawning, AI
   ========================================================= */

// ---- ENEMY TYPE REGISTRY ---------------------------------
const ETYPES = {
  // role: encounter identity. threatCost: future threat-budget value.
  // minWave: earliest wave this enemy may naturally appear. maxShare: soft max share of a wave.
  imp:            { hp:22,  dmg:6,  spd:140, r:16, exp:4,  role:'swarm',          threatCost:1,  minWave:1,  maxShare:0.45, tags:['mob','fast'],                    col:'#e01020' },
  grunt:          { hp:55,  dmg:12, spd:100, r:22, exp:8,  role:'melee',          threatCost:2,  minWave:1,  maxShare:0.40, tags:['mob','melee'],                   col:'#8B5E3C' },
  shaman:         { hp:40,  dmg:10, spd:80,  r:20, exp:10, role:'caster',         threatCost:4,  minWave:3,  maxShare:0.16, tags:['mob','caster'],                  col:'#6a3fa0' },
  brute:          { hp:160, dmg:22, spd:65,  r:36, exp:20, role:'heavy',          threatCost:7,  minWave:4,  maxShare:0.18, tags:['mob','heavy','melee'],            col:'#5a3020' },
  bomber:         { hp:35,  dmg:28, spd:155, r:18, exp:8,  role:'suicide',        threatCost:3,  minWave:5,  maxShare:0.10, tags:['mob','fast','explode'],           col:'#c09020' },
  plague_crawler: { hp:45,  dmg:8,  spd:90,  r:19, exp:9,  role:'hazard',         threatCost:3,  minWave:6,  maxShare:0.12, tags:['mob','poison'],                  col:'#507030' },
  pit_runner:     { hp:28,  dmg:9,  spd:190, r:15, exp:7,  role:'chaser',         threatCost:2,  minWave:2,  maxShare:0.30, tags:['mob','fast'],                    col:'#b06030' },
  chain_brute:    { hp:200, dmg:28, spd:55,  r:40, exp:25, role:'heavy_control',  threatCost:9,  minWave:8,  maxShare:0.12, tags:['mob','heavy','melee'],            col:'#404840' },
  spear_dancer:   { hp:50,  dmg:14, spd:120, r:20, exp:12, role:'ranged',         threatCost:4,  minWave:4,  maxShare:0.16, tags:['mob','ranged','fast'],            col:'#8090a0' },
  gore_leaper:    { hp:70,  dmg:16, spd:110, r:24, exp:15, role:'leaper',         threatCost:5,  minWave:7,  maxShare:0.14, tags:['mob','leap'],                    col:'#902040' },
  bell_ringer:    { hp:80,  dmg:12, spd:70,  r:28, exp:18, role:'support_summon', threatCost:7,  minWave:8,  maxShare:0.10, tags:['mob','support'],                 col:'#9060c0' },
  totem_carrier:  { hp:90,  dmg:10, spd:75,  r:30, exp:18, role:'support_aura',   threatCost:7,  minWave:9,  maxShare:0.10, tags:['mob','support','aura'],          col:'#704020' },
  mirror_shade:   { hp:55,  dmg:14, spd:100, r:22, exp:14, role:'ambusher',       threatCost:5,  minWave:7,  maxShare:0.12, tags:['mob','tele','fast'],             col:'#5060b0' },
  goldgut:        { hp:60,  dmg:0,  spd:130, r:24, exp:30, role:'treasure',       threatCost:6,  minWave:6,  maxShare:0.06, tags:['mob','flee','elite'],            col:'#d4a820' },
  rift_maw:       { hp:100, dmg:12, spd:0,   r:32, exp:22, role:'turret_spawner', threatCost:9,  minWave:9,  maxShare:0.06, tags:['mob','turret','spawn'],          col:'#601090' },
  spiderling:     { hp:18,  dmg:5,  spd:175, r:12, exp:4,  role:'swarm',          threatCost:1,  minWave:1,  maxShare:0.45, tags:['mob','fast','spider'],           col:'#806040', mapOnly:'darklands' },
  venom_spitter:  { hp:38,  dmg:9,  spd:85,  r:18, exp:10, role:'ranged_poison',  threatCost:4,  minWave:3,  maxShare:0.16, tags:['mob','ranged','spider','poison'],col:'#407830', mapOnly:'darklands' },
  dart_spider:    { hp:25,  dmg:8,  spd:200, r:14, exp:8,  role:'chaser',         threatCost:2,  minWave:2,  maxShare:0.30, tags:['mob','fast','spider'],           col:'#708090', mapOnly:'darklands' },
  cobweb_crawler: { hp:55,  dmg:11, spd:70,  r:22, exp:12, role:'control',        threatCost:4,  minWave:4,  maxShare:0.18, tags:['mob','spider','slow'],           col:'#60504a', mapOnly:'darklands' },
  blood_stalker:  { hp:65,  dmg:15, spd:125, r:20, exp:15, role:'leaper',         threatCost:5,  minWave:6,  maxShare:0.14, tags:['mob','spider','leap'],           col:'#901020', mapOnly:'darklands' },
  carapace_guard: { hp:130, dmg:20, spd:55,  r:32, exp:22, role:'heavy',          threatCost:7,  minWave:8,  maxShare:0.14, tags:['mob','spider','heavy'],          col:'#403060', mapOnly:'darklands' },
  jade_widow:     { hp:80,  dmg:14, spd:80,  r:26, exp:18, role:'hazard',         threatCost:5,  minWave:7,  maxShare:0.14, tags:['mob','spider','poison'],         col:'#306030', mapOnly:'darklands' },
  phase_stalker:  { hp:50,  dmg:13, spd:110, r:19, exp:14, role:'ambusher',       threatCost:5,  minWave:9,  maxShare:0.12, tags:['mob','spider','tele'],           col:'#502080', mapOnly:'darklands' },
  brood_mother:   { hp:200, dmg:18, spd:45,  r:42, exp:28, role:'spawner',        threatCost:10, minWave:12, maxShare:0.08, tags:['mob','spider','heavy','spawn'],  col:'#802060', mapOnly:'darklands' },
  void_weaver:    { hp:110, dmg:16, spd:60,  r:30, exp:20, role:'caster',         threatCost:8,  minWave:10, maxShare:0.10, tags:['mob','spider','caster'],         col:'#401090', mapOnly:'darklands' },
};

const DIRECTOR_TAG_CAPS = {
  heavy:0.35, elite:0.25, support:0.30, poison:0.40, fast:0.55, spawn:0.20, turret:0.15,
};

const DIRECTOR_TYPE_CAPS = {
  brute:5, chain_brute:3, bell_ringer:3, totem_carrier:3, goldgut:2,
  rift_maw:2, gore_leaper:4, brood_mother:2, void_weaver:3, carapace_guard:3,
};

const DIRECTOR_ROLE_CAPS = {
  caster:0.16, ranged:0.16, ranged_poison:0.16,
  heavy:0.20, heavy_control:0.10,
  support_summon:0.08, support_aura:0.08,
  turret_spawner:0.06, spawner:0.07,
  suicide:0.10, hazard:0.14, control:0.16,
  leaper:0.14, ambusher:0.12, treasure:0.04,
};

const DIRECTOR_TAG_SHARE_CAPS = {
  ranged:0.22, heavy:0.26, support:0.16, poison:0.24,
  spawn:0.12, turret:0.08, elite:0.06,
};

const TYPE_WAVE_CAPS = {
  brute:4, chain_brute:3, bell_ringer:2, totem_carrier:2,
  rift_maw:2, brood_mother:2, void_weaver:2, carapace_guard:3,
};

const WAVE_PACKS = {
  fodder: {
    nm:'Fodder Rush', weight:12, minWave:1, maxSize:9,
    slots:[
      { roles:['swarm'], count:[4,7] },
      { roles:['melee'], count:[1,3], chance:0.70 },
    ],
  },
  meleeLine: {
    nm:'Melee Line', weight:9, minWave:1, maxSize:8,
    slots:[
      { roles:['melee'], count:[3,5] },
      { roles:['swarm','chaser'], count:[2,3], chance:0.78 },
    ],
  },
  runnerFlank: {
    nm:'Runner Flank', weight:8, minWave:2, maxSize:8,
    slots:[
      { roles:['chaser'], count:[3,5] },
      { roles:['swarm'], count:[2,3], chance:0.75 },
    ],
  },
  rangedEscort: {
    nm:'Ranged Escort', weight:7, minWave:3, maxSize:7,
    slots:[
      { roles:['caster','ranged','ranged_poison'], count:[1,2] },
      { roles:['swarm','melee'], count:[3,5] },
    ],
  },
  bruiserGuard: {
    nm:'Bruiser Guard', weight:6, minWave:4, maxSize:7,
    slots:[
      { roles:['heavy','heavy_control'], count:[1,1] },
      { roles:['melee','swarm'], count:[3,6] },
    ],
  },
  volatileRush: {
    nm:'Volatile Rush', weight:4, minWave:5, maxSize:7,
    slots:[
      { roles:['suicide'], count:[1,2] },
      { roles:['chaser','swarm'], count:[3,5] },
    ],
  },
  hazardTrail: {
    nm:'Hazard Trail', weight:5, minWave:6, maxSize:7,
    slots:[
      { roles:['hazard','control'], count:[1,2] },
      { roles:['melee','swarm'], count:[3,5] },
    ],
  },
  supportGuard: {
    nm:'Support Guard', weight:4, minWave:8, maxSize:7,
    slots:[
      { roles:['support_summon','support_aura'], count:[1,1] },
      { roles:['melee','heavy'], count:[2,3] },
      { roles:['swarm'], count:[2,3], chance:0.65 },
    ],
  },
  ambushPack: {
    nm:'Ambush Pack', weight:5, minWave:7, maxSize:7,
    slots:[
      { roles:['leaper','ambusher'], count:[1,2] },
      { roles:['chaser','swarm'], count:[3,5] },
    ],
  },
  riftNest: {
    nm:'Rift Nest', weight:3, minWave:9, maxSize:7,
    slots:[
      { roles:['turret_spawner'], count:[1,1] },
      { roles:['swarm','melee'], count:[3,5] },
      { roles:['caster','ranged'], count:[1,2], chance:0.45 },
    ],
  },
  treasureRunner: {
    nm:'Treasure Runner', weight:1, minWave:6, maxSize:1,
    slots:[
      { roles:['treasure'], count:[1,1] },
    ],
  },
  spiderSwarm: {
    nm:'Spider Swarm', weight:12, minWave:1, mapOnly:'darklands', maxSize:10,
    slots:[
      { roles:['swarm','chaser'], tags:['spider'], count:[5,8] },
      { roles:['control'], tags:['spider'], count:[1,1], chance:0.35 },
    ],
  },
  venomWeb: {
    nm:'Venom Web', weight:7, minWave:3, mapOnly:'darklands', maxSize:8,
    slots:[
      { roles:['ranged_poison','hazard','control'], tags:['spider'], count:[1,3] },
      { roles:['swarm','chaser'], tags:['spider'], count:[3,5] },
    ],
  },
  broodGuard: {
    nm:'Brood Guard', weight:4, minWave:12, mapOnly:'darklands', maxSize:8,
    slots:[
      { roles:['spawner'], tags:['spider'], count:[1,1] },
      { roles:['swarm','control'], tags:['spider'], count:[4,7] },
    ],
  },
  shadowWeb: {
    nm:'Shadow Web', weight:4, minWave:9, mapOnly:'darklands', maxSize:7,
    slots:[
      { roles:['ambusher','caster'], tags:['spider'], count:[1,2] },
      { roles:['control','heavy'], tags:['spider'], count:[1,2] },
      { roles:['swarm'], tags:['spider'], count:[1,2], chance:0.60 },
    ],
  },
};

const WAVE_RECIPES = [
  {
    id:'pit_skirmish', nm:'Pit Skirmish', weight:12, minWave:1, maxWave:5,
    packs:['fodder','meleeLine','runnerFlank'],
    roleCaps:{ caster:0.08, ranged:0.08, heavy:0.08, suicide:0.04 },
  },
  {
    id:'meat_grinder', nm:'Meat Grinder', weight:10, minWave:2,
    packs:['fodder','meleeLine','runnerFlank','volatileRush','treasureRunner'],
    roleCaps:{ caster:0.10, ranged:0.10, suicide:0.08 },
  },
  {
    id:'crossfire', nm:'Crossfire', weight:7, minWave:3,
    packs:['rangedEscort','fodder','runnerFlank','treasureRunner'],
    roleCaps:{ caster:0.14, ranged:0.14, ranged_poison:0.14, heavy:0.12 },
  },
  {
    id:'bruiser_wall', nm:'Bruiser Wall', weight:6, minWave:4,
    packs:['bruiserGuard','meleeLine','fodder','treasureRunner'],
    roleCaps:{ heavy:0.18, heavy_control:0.08, caster:0.08, ranged:0.08 },
  },
  {
    id:'cursed_ground', nm:'Cursed Ground', weight:6, minWave:6,
    packs:['hazardTrail','rangedEscort','meleeLine','volatileRush','treasureRunner'],
    roleCaps:{ hazard:0.13, control:0.13, caster:0.12, ranged:0.12 },
  },
  {
    id:'warband', nm:'Warband', weight:5, minWave:8,
    packs:['supportGuard','bruiserGuard','ambushPack','rangedEscort','fodder','treasureRunner'],
    roleCaps:{ support_summon:0.07, support_aura:0.07, heavy:0.16, caster:0.12, ranged:0.12 },
  },
  {
    id:'rift_pressure', nm:'Rift Pressure', weight:4, minWave:9,
    packs:['riftNest','ambushPack','rangedEscort','hazardTrail','fodder','treasureRunner'],
    roleCaps:{ turret_spawner:0.05, caster:0.13, ranged:0.12, ambusher:0.10 },
  },
  {
    id:'spider_nest', nm:'Spider Nest', weight:13, minWave:1, mapOnly:'darklands',
    packs:['spiderSwarm','venomWeb','treasureRunner'],
    tagCaps:{ spider:0.85 },
  },
  {
    id:'venom_nest', nm:'Venom Nest', weight:8, minWave:3, mapOnly:'darklands',
    packs:['venomWeb','spiderSwarm','hazardTrail','treasureRunner'],
    roleCaps:{ ranged_poison:0.14, hazard:0.14, control:0.16 },
    tagCaps:{ spider:0.90, poison:0.25 },
  },
  {
    id:'shadow_brood', nm:'Shadow Brood', weight:5, minWave:9, mapOnly:'darklands',
    packs:['shadowWeb','venomWeb','broodGuard','spiderSwarm','treasureRunner'],
    roleCaps:{ caster:0.12, ambusher:0.12, spawner:0.06, heavy:0.12 },
    tagCaps:{ spider:0.90, spawn:0.10 },
  },
];
Object.keys(WAVE_PACKS).forEach(id=>{ WAVE_PACKS[id].id=id; });

const ACT_PROFILES = {
  early: {
    id:'early', nm:'Early Act', threatMul:0.88, packSizeMul:0.95,
    roleCaps:{
      caster:0.08, ranged:0.08, ranged_poison:0.08,
      heavy:0.10, heavy_control:0.04,
      support_summon:0.04, support_aura:0.04,
      turret_spawner:0.03, spawner:0.03,
      suicide:0.06, hazard:0.08, control:0.10, leaper:0.08, ambusher:0.07,
    },
    tagCaps:{ ranged:0.16, heavy:0.15, support:0.08, poison:0.14, spawn:0.05, turret:0.04 },
    recipeWeights:{
      pit_skirmish:2.0, meat_grinder:1.2, spider_nest:1.8,
      crossfire:0.75, bruiser_wall:0.65, venom_nest:0.70,
      cursed_ground:0.45, warband:0.20, rift_pressure:0.12, shadow_brood:0.12,
    },
    packWeights:{
      fodder:1.55, meleeLine:1.30, runnerFlank:1.10, spiderSwarm:1.45,
      rangedEscort:0.55, bruiserGuard:0.45, volatileRush:0.55, venomWeb:0.60,
      hazardTrail:0.45, supportGuard:0.20, ambushPack:0.30, riftNest:0.10,
      broodGuard:0.10, shadowWeb:0.10, treasureRunner:0.65,
    },
  },
  mid: {
    id:'mid', nm:'Mid Act', threatMul:1.0, packSizeMul:1.15,
    roleCaps:{
      caster:0.12, ranged:0.12, ranged_poison:0.12,
      heavy:0.16, heavy_control:0.07,
      support_summon:0.06, support_aura:0.06,
      turret_spawner:0.04, spawner:0.05,
      suicide:0.09, hazard:0.12, control:0.14, leaper:0.12, ambusher:0.10,
    },
    tagCaps:{ ranged:0.20, heavy:0.22, support:0.12, poison:0.22, spawn:0.09, turret:0.06 },
    recipeWeights:{
      pit_skirmish:0.45, meat_grinder:1.25, crossfire:1.35, bruiser_wall:1.20,
      cursed_ground:1.25, warband:0.90, rift_pressure:0.65,
      spider_nest:1.0, venom_nest:1.35, shadow_brood:0.70,
    },
    packWeights:{
      fodder:0.95, meleeLine:1.05, runnerFlank:1.05, rangedEscort:1.20,
      bruiserGuard:1.15, volatileRush:0.95, hazardTrail:1.15,
      supportGuard:0.85, ambushPack:0.95, riftNest:0.60,
      spiderSwarm:1.0, venomWeb:1.20, broodGuard:0.55, shadowWeb:0.70, treasureRunner:0.85,
    },
  },
  late: {
    id:'late', nm:'Late Act', threatMul:1.12, packSizeMul:1.28,
    roleCaps:{
      caster:0.16, ranged:0.16, ranged_poison:0.16,
      heavy:0.20, heavy_control:0.10,
      support_summon:0.08, support_aura:0.08,
      turret_spawner:0.06, spawner:0.07,
      suicide:0.10, hazard:0.14, control:0.16, leaper:0.14, ambusher:0.12,
    },
    tagCaps:{ ranged:0.22, heavy:0.26, support:0.16, poison:0.24, spawn:0.12, turret:0.08 },
    recipeWeights:{
      pit_skirmish:0.15, meat_grinder:0.85, crossfire:0.95, bruiser_wall:1.15,
      cursed_ground:1.15, warband:1.55, rift_pressure:1.55,
      spider_nest:0.75, venom_nest:1.05, shadow_brood:1.65,
    },
    packWeights:{
      fodder:0.75, meleeLine:0.90, runnerFlank:0.90, rangedEscort:1.05,
      bruiserGuard:1.20, volatileRush:0.95, hazardTrail:1.10,
      supportGuard:1.25, ambushPack:1.20, riftNest:1.35,
      spiderSwarm:0.90, venomWeb:1.05, broodGuard:1.25, shadowWeb:1.35, treasureRunner:0.80,
    },
  },
};

// ---- HELPERS --------------------------------------------
function mobTags(type){ return (ETYPES[type]||{}).tags||[]; }
function mobRole(type){ return (ETYPES[type]||{}).role || 'unknown'; }
function mobThreatCost(type){ return (ETYPES[type]||{}).threatCost || 1; }
function mobMinWave(type){ return (ETYPES[type]||{}).minWave || 1; }
function mobMaxShare(type){ return (ETYPES[type]||{}).maxShare || 1; }
function mobHasTag(type,tag){ return mobTags(type).includes(tag); }
function mobHasAnyTag(type,tags){ return tags.some(t=>mobHasTag(type,t)); }

function mobUnlocked(type){
  const def=ETYPES[type];
  if(!def) return false;
  if(def.mapOnly && def.mapOnly!==(G&&G.mapId)) return false;
  if((G&&G.wave||1) < mobMinWave(type)) return false;
  return true;
}

function eliteWaveChance(){ return Math.min(0.35, 0.10+(G.wave||1)*0.008); }

function randInt(min,max){ return min+Math.floor(Math.random()*(max-min+1)); }

function chooseWeighted(items,weightFn){
  let total=0;
  const weighted=[];
  for(const it of items){
    const w=Math.max(0,weightFn(it)||0);
    if(w<=0) continue;
    total+=w;
    weighted.push({it,w});
  }
  if(!weighted.length) return null;
  let roll=Math.random()*total;
  for(const entry of weighted){
    roll-=entry.w;
    if(roll<=0) return entry.it;
  }
  return weighted[weighted.length-1].it;
}

function directorTargetSpawns(d){
  return Math.max(1,(d&&d.targetSpawns)||G.toSpawn||30);
}

function directorFinalWave(){
  if(typeof getFinalWave === 'function') return getFinalWave();
  if(typeof G !== 'undefined' && G && G.mapId && typeof MAP_CONFIGS !== 'undefined' && MAP_CONFIGS[G.mapId] && MAP_CONFIGS[G.mapId].finalWave)
    return MAP_CONFIGS[G.mapId].finalWave;
  return 30;
}

function actIdForWave(wave){
  const finalWave=Math.max(1,directorFinalWave());
  const earlyEnd=Math.max(1,Math.ceil(finalWave*0.34));
  const midEnd=Math.max(earlyEnd+1,Math.ceil(finalWave*0.67));
  if(wave<=earlyEnd) return 'early';
  if(wave<=midEnd) return 'mid';
  return 'late';
}

function getActProfile(wave){
  return ACT_PROFILES[actIdForWave(wave)] || ACT_PROFILES.early;
}

function mergeCapProfiles(base,extra){
  const merged=Object.assign({},base||{});
  for(const key in (extra||{})){
    merged[key]=merged[key]===undefined ? extra[key] : Math.min(merged[key],extra[key]);
  }
  return merged;
}

function waveThreatBudget(wave,checkpoint,targetSpawns,actProfile){
  const avg=clamp(1.25+wave*0.055,1.35,3.15);
  const checkpointMul=checkpoint ? 0.86 : 1;
  const actMul=(actProfile&&actProfile.threatMul)||1;
  return Math.round(targetSpawns*avg*checkpointMul*actMul);
}

function countMap(d,sim,key){
  if(sim&&sim[key]) return sim[key];
  if(d&&d[key]) return d[key];
  return {};
}

function threatSpent(d,sim){
  return sim&&sim.threatSpent!==undefined ? sim.threatSpent : ((d&&d.threatSpent)||0);
}

function typeWaveCap(type,d){
  if(!d) return 999;
  const shareCap=Math.max(1,Math.floor(directorTargetSpawns(d)*mobMaxShare(type)));
  return Math.min(TYPE_WAVE_CAPS[type]||999,shareCap);
}

function roleWaveCap(role,d){
  if(!d) return 999;
  const caps=Object.assign({},DIRECTOR_ROLE_CAPS,d.roleCaps||{});
  if(caps[role]===undefined) return 999;
  return Math.max(1,Math.floor(directorTargetSpawns(d)*caps[role]));
}

function tagWaveCap(tag,d){
  if(!d) return 999;
  const caps=Object.assign({},DIRECTOR_TAG_SHARE_CAPS,d.tagCaps||{});
  if(caps[tag]===undefined) return 999;
  return Math.max(1,Math.floor(directorTargetSpawns(d)*caps[tag]));
}

function checkpointRecipeWeight(recipe,checkpoint){
  if(!checkpoint) return 1;
  if(checkpoint==='elite'||checkpoint==='elitePack') return recipe.id==='bruiser_wall'||recipe.id==='warband' ? 1.7 : 0.95;
  if(checkpoint==='miniBoss'||checkpoint==='boss'||checkpoint==='final') return recipe.id==='meat_grinder'||recipe.id==='cursed_ground' ? 1.35 : 0.85;
  if(checkpoint==='champion') return recipe.id==='warband'||recipe.id==='rift_pressure'||recipe.id==='shadow_brood' ? 1.6 : 0.9;
  return 1;
}

function actRecipeWeight(recipe,d){
  const weights=d&&d.actProfile&&d.actProfile.recipeWeights;
  return weights&&weights[recipe.id]!==undefined ? weights[recipe.id] : 1;
}

function actPackWeight(pack,d){
  const weights=d&&d.actProfile&&d.actProfile.packWeights;
  return weights&&weights[pack.id]!==undefined ? weights[pack.id] : 1;
}

function packUnlocked(pack,wave){
  if(!pack) return false;
  if(pack.mapOnly && pack.mapOnly!==(G&&G.mapId)) return false;
  if(wave<(pack.minWave||1)) return false;
  if(pack.maxWave && wave>pack.maxWave) return false;
  return true;
}

function typeMatchesPackSlot(type,slot){
  if(slot.types && !slot.types.includes(type)) return false;
  if(slot.roles && !slot.roles.includes(mobRole(type))) return false;
  if(slot.tags && !slot.tags.every(tag=>mobHasTag(type,tag))) return false;
  if(slot.anyTags && !mobHasAnyTag(type,slot.anyTags)) return false;
  if(slot.notTags && slot.notTags.some(tag=>mobHasTag(type,tag))) return false;
  return true;
}

function typeAllowedByWaveDirector(type,d,sim,opts){
  if(!d) return mobUnlocked(type);
  if(!mobUnlocked(type)) return false;
  if(hardTypeCapReached(type)) return false;
  const spawnCounts=countMap(d,sim,'spawnCounts');
  const roleCounts=countMap(d,sim,'roleCounts');
  const tagCounts=countMap(d,sim,'tagCounts');
  if((spawnCounts[type]||0)>=typeWaveCap(type,d)) return false;
  const role=mobRole(type);
  if((roleCounts[role]||0)>=roleWaveCap(role,d)) return false;
  for(const tag of mobTags(type)){
    if(DIRECTOR_TAG_CAPS[tag]!==undefined && activeEnemyTagCount(tag)>=tagActiveCap(tag)) return false;
    if((tagCounts[tag]||0)>=tagWaveCap(tag,d)) return false;
  }
  if(!(opts&&opts.ignoreThreat) && d.threatBudget && threatSpent(d,sim)+mobThreatCost(type)>d.threatBudget) return false;
  return true;
}

function packSlotCandidates(slot,d,sim,opts){
  return Object.keys(ETYPES).filter(t=>
    typeMatchesPackSlot(t,slot) && typeAllowedByWaveDirector(t,d,sim,opts)
  );
}

function packAvailable(packId,wave,d){
  const pack=WAVE_PACKS[packId];
  if(!packUnlocked(pack,wave)) return false;
  for(const slot of pack.slots||[]){
    if(slot.chance!==undefined && slot.chance<1) continue;
    if(!packSlotCandidates(slot,d,null,{ignoreThreat:true}).length) return false;
  }
  return true;
}

function recipeAvailable(recipe,d){
  const wave=d.wave||1;
  if(recipe.mapOnly && recipe.mapOnly!==(G&&G.mapId)) return false;
  if(wave<(recipe.minWave||1)) return false;
  if(recipe.maxWave && wave>recipe.maxWave) return false;
  return (recipe.packs||[]).some(id=>packAvailable(id,wave,d));
}

function chooseWaveRecipe(d){
  const pool=WAVE_RECIPES.filter(r=>recipeAvailable(r,d));
  const chosen=chooseWeighted(pool,r=>(r.weight||1)*checkpointRecipeWeight(r,d.checkpoint)*actRecipeWeight(r,d));
  return chosen || WAVE_RECIPES[0];
}

function buildWaveDirector(wave,checkpoint){
  const targetSpawns=Math.max(1,G.toSpawn||30);
  const actProfile=getActProfile(wave);
  const d={
    wave, checkpoint:checkpoint||'',
    act:actProfile.id, actProfile,
    targetSpawns,
    threatBudget:waveThreatBudget(wave,checkpoint,targetSpawns,actProfile),
    threatSpent:0,
    spawnCounts:{}, roleCounts:{}, tagCounts:{},
    packQueue:[], packSeq:0, recentPacks:[],
    recipe:null, recipes:[],
    roleCaps:{}, tagCaps:{},
  };
  d.recipe=chooseWaveRecipe(d);
  d.recipes=[d.recipe];
  d.roleCaps=mergeCapProfiles(actProfile.roleCaps,d.recipe&&d.recipe.roleCaps);
  d.tagCaps=mergeCapProfiles(actProfile.tagCaps,d.recipe&&d.recipe.tagCaps);
  return d;
}

function activeEnemyTypeCount(type){ return G.enemies.filter(e=>e.type===type).length; }
function activeEnemyTagCount(tag){   return G.enemies.filter(e=>mobHasTag(e.type,tag)).length; }
function typeActiveCap(type){ return DIRECTOR_TYPE_CAPS[type]||99; }
function tagActiveCap(tag){ return Math.max(3,Math.floor(G.maxEnemies*(DIRECTOR_TAG_CAPS[tag]||1))); }
function hardTypeCapReached(type){ return activeEnemyTypeCount(type)>=typeActiveCap(type); }

function canBeRandomElite(type){
  return !mobHasTag(type,'elite')&&!mobHasTag(type,'flee')&&!mobHasTag(type,'turret');
}

function rollDirectedElite(){
  if(Math.random()>eliteWaveChance()) return null;
  const pool=Object.keys(ETYPES).filter(t=>mobUnlocked(t)&&canBeRandomElite(t)&&!hardTypeCapReached(t));
  if(!pool.length) return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

function filterWavePoolByDirector(pool,d){ return pool.filter(t=>typeAllowedByWaveDirector(t,d)); }

function slotCount(slot){
  if(Array.isArray(slot.count)) return randInt(slot.count[0],slot.count[1]);
  return slot.count||1;
}

function recordTypeInCounts(type,counts){
  counts.spawnCounts[type]=(counts.spawnCounts[type]||0)+1;
  const role=mobRole(type);
  counts.roleCounts[role]=(counts.roleCounts[role]||0)+1;
  for(const tag of mobTags(type)) counts.tagCounts[tag]=(counts.tagCounts[tag]||0)+1;
  counts.threatSpent=(counts.threatSpent||0)+mobThreatCost(type);
}

function chooseTypeForPackSlot(slot,d,sim){
  let pool=packSlotCandidates(slot,d,sim);
  let ignoreThreat=false;
  if(!pool.length){
    ignoreThreat=true;
    pool=packSlotCandidates(slot,d,sim,{ignoreThreat:true});
  }
  if(!pool.length) return null;
  return chooseWeighted(pool,type=>{
    let w=1;
    const remaining=Math.max(1,typeWaveCap(type,d)-((sim.spawnCounts[type]||0)));
    w*=Math.min(5,remaining);
    w*=1/(0.75+mobThreatCost(type)*0.18);
    if(ignoreThreat && mobThreatCost(type)<=2) w*=2;
    return w;
  });
}

function chooseRecipePack(d){
  const recipe=d&&d.recipe;
  const ids=(recipe&&recipe.packs)||['fodder'];
  const wave=d.wave||1;
  const pool=ids.map(id=>WAVE_PACKS[id]).filter(pack=>pack&&packAvailable(pack.id,wave,d));
  if(!pool.length) return null;
  return chooseWeighted(pool,pack=>{
    let w=pack.weight||1;
    w*=actPackWeight(pack,d);
    if(d.recentPacks&&d.recentPacks.includes(pack.id)) w*=0.45;
    if(pack.id==='treasureRunner') w*=Math.min(0.6,0.06+(d.wave||1)*0.015);
    return w;
  });
}

function packIdOf(pack){
  return pack&&pack.id||'';
}

function buildPackSpawnPlans(pack,d){
  const room=Math.max(1,(G.maxEnemies||1)-(G.enemies?G.enemies.length:0));
  const actSizeMul=(d&&d.actProfile&&d.actProfile.packSizeMul)||1;
  const packMax=Math.max(1,Math.round((pack.maxSize||6)*actSizeMul));
  const limit=Math.max(1,Math.min(packMax,G.toSpawn||packMax,room));
  const sim={
    spawnCounts:Object.assign({},d.spawnCounts),
    roleCounts:Object.assign({},d.roleCounts),
    tagCounts:Object.assign({},d.tagCounts),
    threatSpent:d.threatSpent||0,
  };
  const plans=[];
  const angle=biasedSpawnAngle();
  const packId=packIdOf(pack);
  for(const slot of pack.slots||[]){
    if(plans.length>=limit) break;
    if(slot.chance!==undefined && Math.random()>slot.chance) continue;
    const count=slotCount(slot);
    for(let i=0;i<count&&plans.length<limit;i++){
      const type=chooseTypeForPackSlot(slot,d,sim);
      if(!type) break;
      recordTypeInCounts(type,sim);
      plans.push({
        type,
        elite:false,
        packId,
        packName:pack.nm,
        spawnAngle:angle+rand(-0.14,0.14),
        spawnDepth:rand(0,180),
      });
    }
  }
  if(!plans.length){
    const fallback=chooseSingleFallback(d,true);
    if(fallback) plans.push(Object.assign(fallback,{packId,packName:pack.nm,spawnAngle:angle,spawnDepth:0}));
  }
  return plans;
}

function popQueuedPackSpawn(d){
  while(d.packQueue&&d.packQueue.length){
    const plan=d.packQueue.shift();
    if(typeAllowedByWaveDirector(plan.type,d,null,{ignoreThreat:true})) return plan;
  }
  return null;
}

function chooseSingleFallback(d,ignoreThreat){
  const pool=Object.keys(ETYPES).filter(t=>typeAllowedByWaveDirector(t,d,null,ignoreThreat?{ignoreThreat:true}:null));
  if(!pool.length) return null;
  const type=chooseWeighted(pool,t=>1/(0.75+mobThreatCost(t)*0.25)) || pool[Math.floor(Math.random()*pool.length)];
  return {type,elite:false,packId:'fallback'};
}

function chooseDirectedWaveSpawn(d){
  if(!d) return null;
  const queued=popQueuedPackSpawn(d);
  if(queued) return queued;
  for(let attempt=0;attempt<8;attempt++){
    const pack=chooseRecipePack(d);
    if(!pack) break;
    const plans=buildPackSpawnPlans(pack,d);
    if(plans.length){
      d.packQueue.push(...plans);
      const id=packIdOf(pack);
      if(id){
        d.recentPacks.push(id);
        if(d.recentPacks.length>4) d.recentPacks.shift();
      }
      return popQueuedPackSpawn(d);
    }
  }
  return chooseSingleFallback(d,false) || chooseSingleFallback(d,true);
}

function recordDirectedWaveSpawn(type,d){
  if(!d) return;
  d.spawnCounts[type]=(d.spawnCounts[type]||0)+1;
  const role=mobRole(type);
  d.roleCounts[role]=(d.roleCounts[role]||0)+1;
  for(const tag of mobTags(type)) d.tagCounts[tag]=(d.tagCounts[tag]||0)+1;
  d.threatSpent=(d.threatSpent||0)+mobThreatCost(type);
}

// ---- SPAWN -----------------------------------------------
const SPAWN_BEHIND_CHANCE = 0.75;
const SPAWN_FORWARD_CHANCE = 0.15;
const SPAWN_BEHIND_SPREAD = 0.55;
const SPAWN_FORWARD_SPREAD = 0.45;
const SPAWN_SAFE_ARC_SPREAD = 1.35;
const ADAPTIVE_SPAWN_ARENA_R = 4000;
const ADAPTIVE_SPAWN_EDGE_LERP = 0.50;
const ADAPTIVE_SPAWN_MIN_PLAYER_DIST = 1050;

function spawnAngleBehindPlayer(spread){
  const p = (typeof G!=='undefined' && G) ? G.player : null;
  if(!p) return Math.random()*TAU;
  const moveA = (typeof p.moveAngle==='number') ? p.moveAngle : (p.facing||0);
  const r = getArenaR();
  const bx = p.x + Math.cos(moveA+Math.PI)*r;
  const by = p.y + Math.sin(moveA+Math.PI)*r;
  return Math.atan2(by, bx) + rand(-spread, spread);
}

function spawnAngleAheadOfPlayer(spread){
  const p = (typeof G!=='undefined' && G) ? G.player : null;
  if(!p) return Math.random()*TAU;
  const moveA = (typeof p.moveAngle==='number') ? p.moveAngle : (p.facing||0);
  const r = getArenaR();
  const fx = p.x + Math.cos(moveA)*r;
  const fy = p.y + Math.sin(moveA)*r;
  return Math.atan2(fy, fx) + rand(-spread, spread);
}

/* Directional spawn bias.
   Most spawns appear on the side the player is moving AWAY from. A small share
   appears ahead of the player to keep long kites from becoming completely free,
   and the remainder uses a wider back/side arc. */
function biasedSpawnAngle(){
  const roll = Math.random();
  if(roll < SPAWN_BEHIND_CHANCE) return spawnAngleBehindPlayer(SPAWN_BEHIND_SPREAD);
  if(roll < SPAWN_BEHIND_CHANCE + SPAWN_FORWARD_CHANCE) return spawnAngleAheadOfPlayer(SPAWN_FORWARD_SPREAD);
  return spawnAngleBehindPlayer(SPAWN_SAFE_ARC_SPREAD);
}

function adaptiveSpawnRadius(angle, def, spawnDepth){
  const arenaR = getArenaR();
  const rimR = arenaR - def.r - 12 - spawnDepth;
  const p = (typeof G!=='undefined' && G) ? G.player : null;
  if(!p || arenaR < ADAPTIVE_SPAWN_ARENA_R) return rimR;

  const playerR = Math.hypot(p.x, p.y);
  let spawnR = playerR + (rimR - playerR) * ADAPTIVE_SPAWN_EDGE_LERP;
  spawnR = clamp(spawnR, Math.min(rimR, playerR + 900), rimR);

  for(let i=0;i<6;i++){
    const sx = Math.cos(angle) * spawnR;
    const sy = Math.sin(angle) * spawnR;
    const d = Math.hypot(sx - p.x, sy - p.y);
    if(d >= ADAPTIVE_SPAWN_MIN_PLAYER_DIST) break;
    spawnR = Math.min(rimR, spawnR + (ADAPTIVE_SPAWN_MIN_PLAYER_DIST - d) + 80);
    if(spawnR >= rimR) break;
  }
  return spawnR;
}

/* True when an enemy is well outside the player's visible screen
   (view rectangle + a small margin). Used to slow distant off-screen mobs. */
function enemyOffscreen(e){
  if(typeof G==='undefined' || !G || !G.cam || typeof W!=='number' || typeof H!=='number') return false;
  const m = 140; // a few "yards" beyond the visible edge
  return e.x < G.cam.x - m || e.x > G.cam.x + W + m
      || e.y < G.cam.y - m || e.y > G.cam.y + H + m;
}

function spawnEnemy(type,isElite,opts){
  const def=ETYPES[type];
  if(!def) return null;
  opts=opts||{};
  const angle=(Number.isFinite(opts.spawnAngle)?opts.spawnAngle:biasedSpawnAngle());
  const spawnDepth=Number.isFinite(opts.spawnDepth)?opts.spawnDepth:0;
  const spawnR=adaptiveSpawnRadius(angle, def, spawnDepth);
  const ws=1+(G.wave-1)*0.07;
  const e={
    type,boss:false,elite:!!(isElite),
    x:Math.cos(angle)*spawnR,
    y:Math.sin(angle)*spawnR,
    r:def.r,
    hp:   def.hp *ws*(isElite?2.5:1),
    maxHp:def.hp *ws*(isElite?2.5:1),
    dmg:  def.dmg*ws*(isElite?1.5:1),
    spd:  def.spd*(1+(G.wave-1)*0.018),
    exp:  def.exp*(isElite?3:1),
    role:def.role, threatCost:def.threatCost, minWave:def.minWave, maxShare:def.maxShare,
    col:def.col, tags:def.tags||[],
    atkCd:0, facingX:0, facingY:1,
    kb:{x:0,y:0}, hitFlash:0, slow:0, slowT:0, stun:0, t:0,
  };
  G.enemies.push(e);
  return e;
}

function spawnBoss(){
  const arenaR=getArenaR(), wave=G.wave||1;
  const angle=Math.random()*TAU;
  const e={
    type:'boss',boss:true,elite:false,
    x:Math.cos(angle)*(arenaR*0.55),
    y:Math.sin(angle)*(arenaR*0.55),
    r:52,
    hp:800+wave*220, maxHp:800+wave*220,
    dmg:30+wave*4, spd:68, exp:80+wave*22,
    role:'boss', threatCost:40, minWave:wave, maxShare:0.04,
    col:'#ff2040', tags:['boss','heavy'],
    atkCd:0, slamCd:0, ringCd:0, summonCd:0,
    facingX:0, facingY:1,
    kb:{x:0,y:0}, hitFlash:0, slow:0, slowT:0, stun:0, t:0,
  };
  G.enemies.push(e);
  G.boss = e;
  if(typeof $ === 'function'){
    const bb = $('bossbar');
    if(bb) bb.style.display = 'block';
    const bn = $('bossname');
    if(bn) bn.textContent = wave>=directorFinalWave() ? 'VORGUL THE UNMAKER' : 'ARENA CHAMPION';
  }
  return e;
}

// ---- BOSS AI --------------------------------------------
function updateBoss(e,p,dt){
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.sqrt(dx*dx+dy*dy)||1;
  const totem=(e.totemBuffT||0)>0?1.2:1;
  e.slamCd-=dt; e.ringCd-=dt;
  e.summonCd=(e.summonCd||0)-dt;
  e.atkCd-=dt;
  if(e.tele>0){
    e.tele-=dt;
    if(e.tele<=0&&d<e.r+p.r+110) damageFromEnemy(e, e.dmg*1.5, 'crush');
  } else {
    if(d>e.r+p.r+50){ e.x+=dx/d*e.spd*totem*dt; e.y+=dy/d*e.spd*totem*dt; }
    else if(e.atkCd<=0){ e.tele=0.45; e.atkCd=1.8; ftext(e.x,e.y-e.r-22,'CRUSH','#ff7070',14,0.55); }
  }
  if(e.slamCd<=0){
    e.slamCd=5.5+Math.random()*1.5;
    ftext(e.x,e.y-e.r-32,'SLAM','#ff5050',17,0.9);
    for(let i=0;i<10;i++){
      const a=(TAU/10)*i;
      G.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,r:16,dmg:e.dmg*0.8,life:3.5,color:'#ff4040',sourceType:e.type,sourceAttack:'slam orb'});
    }
    burst(e.x,e.y,'#ff4040',18,210,0.65,7);
  }
  if(e.ringCd<=0){
    e.ringCd=9.0+Math.random()*2;
    ftext(e.x,e.y-e.r-48,'VOID RING','#c040ff',14,1.3);
    G.zones.push({x:e.x,y:e.y,r:170,life:4.0,maxlife:4.0,color:'100,0,180',type:'ring',dmgPerSec:e.dmg*0.35,sourceType:e.type,sourceAttack:'void ring'});
  }
  if(e.summonCd<=0&&G.enemies.filter(en=>!en.boss).length<G.maxEnemies){
    e.summonCd=14.0;
    ftext(e.x,e.y-e.r-64,'SUMMON','#ff90ff',13,1.1);
    const st=(G.mapId==='darklands')?'spiderling':'grunt';
    for(let i=0;i<3;i++) spawnEnemy(st,false);
  }
  e.facingX=dx/d; e.facingY=dy/d;
}

// ---- ENEMY AI -------------------------------------------
function updateEnemyBehavior(e,p,dt){
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.sqrt(dx*dx+dy*dy)||1;
  const slow =(e.slowT||0)>0  ?0.45:1;
  const totem=(e.totemBuffT||0)>0?1.25:1;
  // Mobs well outside the player's view crawl at half speed until they near the screen
  const viewMul = enemyOffscreen(e) ? 0.5 : 1;
  const eff=e.spd*slow*totem*viewMul;
  e.atkCd=(e.atkCd||0)-dt;
  e.facingX=dx/d; e.facingY=dy/d;

  if(e.boss){ updateBoss(e,p,dt); return; }

  if(e.type==='shaman'){
    if(d>155){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(d<85){ e.x-=dx/d*eff*dt*0.5; e.y-=dy/d*eff*dt*0.5; }
    e.fireCd=(e.fireCd||0)-dt;
    if(e.fireCd<=0){
      e.fireCd=2.0+Math.random()*0.6;
      const a=Math.atan2(dy,dx);
      G.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*185,vy:Math.sin(a)*185,r:10,dmg:e.dmg,life:3,color:'#c040ff',sourceType:e.type,sourceAttack:'shadow bolt'});
    }
  }
  else if(e.type==='bomber'){
    e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt;
    if(d<e.r+p.r+12){
      damageFromEnemy(e, e.dmg*2, 'explosion');
      burst(e.x,e.y,'#e0c020',20,260,0.75,6);
      G.zones.push({x:e.x,y:e.y,r:130,life:0.4,maxlife:0.4,color:'200,160,0',type:'flash'});
      e.hp=0;
    }
  }
  else if(e.type==='plague_crawler'){
    if(d>e.r+p.r+20){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'bite'); e.atkCd=1.0; }
    e.trailCd=(e.trailCd||0)-dt;
    if(e.trailCd<=0){
      e.trailCd=0.9;
      G.zones.push({x:e.x,y:e.y,r:55,life:3.5,maxlife:3.5,color:'60,100,30',type:'poison',dmgPerSec:e.dmg*0.25,sourceType:e.type,sourceAttack:'poison trail'});
    }
  }
  else if(e.type==='pit_runner'){
    e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt;
    if(d<e.r+p.r+8&&e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'stab'); e.atkCd=0.55; }
  }
  else if(e.type==='chain_brute'){
    if(d>e.r+p.r+35){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'slam'); e.atkCd=1.6; }
    e.chainCd=(e.chainCd||0)-dt;
    if(e.chainCd<=0&&d<240){
      e.chainCd=5.5;
      ftext(e.x,e.y-e.r-22,'CHAIN','#80a0c0',13,0.75);
      const pa=Math.atan2(e.y-p.y,e.x-p.x);
      const pull=Math.min(d*0.45,180);
      p.x+=Math.cos(pa)*pull; p.y+=Math.sin(pa)*pull;
    }
  }
  else if(e.type==='spear_dancer'){
    if(d>210){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(d<95){ e.x-=dx/d*eff*dt*0.7; e.y-=dy/d*eff*dt*0.7; }
    e.spearCd=(e.spearCd||0)-dt;
    if(e.spearCd<=0){
      e.spearCd=1.8+Math.random()*0.5;
      const a=Math.atan2(dy,dx);
      G.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*265,vy:Math.sin(a)*265,r:9,dmg:e.dmg,life:2.5,color:'#9ab8d0',sourceType:e.type,sourceAttack:'spear'});
    }
  }
  else if(e.type==='gore_leaper'){
    e.leapCd  =(e.leapCd||0)  -dt;
    e.leapWind=(e.leapWind||0)-dt;
    if(e.leapWind>0){
      if(e.leapWind<=0.05){
        const lx=e.leapTarget.x,ly=e.leapTarget.y;
        e.x=lx; e.y=ly;
        G.zones.push({x:lx,y:ly,r:100,life:0.3,maxlife:0.3,color:'160,20,20',type:'flash'});
        burst(lx,ly,'#cc2020',14,180,0.5,4);
        if(dist2(lx,ly,p.x,p.y)<(100+p.r)**2) damageFromEnemy(e, e.dmg*1.4, 'leap');
        e.leapCd=4.0+Math.random()*2;
      }
    } else {
      if(d>e.r+p.r+40){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
      else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg*0.7, 'claw'); e.atkCd=1.0; }
      if(e.leapCd<=0){
        e.leapWind=0.65;
        e.leapTarget={x:p.x+Math.cos(p.facing)*60,y:p.y+Math.sin(p.facing)*60};
        ftext(e.x,e.y-e.r-18,'LEAP','#ff4040',12,0.6);
      }
    }
  }
  else if(e.type==='bell_ringer'){
    if(d>280){ e.x+=dx/d*eff*dt*0.7; e.y+=dy/d*eff*dt*0.7; }
    e.bellCd=(e.bellCd||0)-dt;
    if(e.bellCd<=0){
      e.bellCd=4.5+Math.random();
      ftext(e.x,e.y-e.r-20,'DING','#c0a0ff',13,1.0);
      burst(e.x,e.y,'#b94aff',10,180,0.5,3);
      for(let i=0;i<2;i++) spawnEnemy('imp',false);
    }
    if(d<e.r+p.r+40&&e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'bell strike'); e.atkCd=1.4; }
  }
  else if(e.type==='totem_carrier'){
    if(d>e.r+p.r+30){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'totem bash'); e.atkCd=1.5; }
    e.auraCd=(e.auraCd||0)-dt;
    if(e.auraCd<=0){
      e.auraCd=0.5;
      for(const nb of G.enemies){
        if(nb===e) continue;
        if(dist2(e.x,e.y,nb.x,nb.y)<(140+nb.r)**2) nb.totemBuffT=0.6;
      }
    }
  }
  else if(e.type==='mirror_shade'){
    if(e.tele>0){
      e.tele-=dt;
      if(e.tele<=0&&d<e.r+p.r+78) damageFromEnemy(e, e.dmg, 'shade strike');
    } else {
      if(d>e.r+p.r+34){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
      else if(e.atkCd<=0){ e.tele=0.28; e.atkCd=1.2;
        e.echoPending={x:e.x,y:e.y,delay:0.55,dmg:e.dmg*0.7};
      }
    }
    if(e.echoPending){
      e.echoPending.delay-=dt;
      if(e.echoPending.delay<=0){
        burst(e.echoPending.x,e.echoPending.y,'#8080ff',8,140,0.4,3);
        if(dist2(e.echoPending.x,e.echoPending.y,p.x,p.y)<(80+p.r)**2) damageFromEnemy(e, e.echoPending.dmg, 'echo');
        e.echoPending=null;
      }
    }
  }
  else if(e.type==='goldgut'){
    if(d<380){ e.x-=dx/d*eff*dt; e.y-=dy/d*eff*dt; }
    else { e.x+=dx/d*eff*0.2*dt; e.y+=dy/d*eff*0.2*dt; }
    e.xpDropCd=(e.xpDropCd||0)-dt;
    if(e.xpDropCd<=0){
      e.xpDropCd=1.8;
      G.pickups.push({type:'xp',x:e.x+rand(-10,10),y:e.y+rand(-10,10),baseExp:4,t:0,life:8,collectDelay:0.35});
    }
  }
  else if(e.type==='rift_maw'){
    e.riftSpawnCd=(e.riftSpawnCd||0)-dt;
    e.riftOrbCd  =(e.riftOrbCd||0)  -dt;
    if(e.riftSpawnCd<=0&&G.enemies.length<G.maxEnemies){
      e.riftSpawnCd=3.0; spawnEnemy('imp',false);
    }
    if(e.riftOrbCd<=0){
      e.riftOrbCd=3.8;
      const a=Math.atan2(dy,dx);
      G.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*140,vy:Math.sin(a)*140,r:14,dmg:e.dmg,life:5,color:'#8020c0',sourceType:e.type,sourceAttack:'rift orb'});
    }
  }
  // -- Spider types ----------------------------------------------------------
  else if(e.type==='spiderling'||e.type==='dart_spider'){
    if(d>e.r+p.r+8){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'bite'); e.atkCd=0.7; }
  }
  else if(e.type==='venom_spitter'){
    if(d>220){ e.x+=dx/d*eff*dt*0.6; e.y+=dy/d*eff*dt*0.6; }
    else if(d<120){ e.x-=dx/d*eff*dt*0.5; e.y-=dy/d*eff*dt*0.5; }
    e.riftOrbCd=(e.riftOrbCd||0)-dt;
    if(e.riftOrbCd<=0){
      e.riftOrbCd=2.5+Math.random()*0.5;
      const a=Math.atan2(dy,dx);
      G.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,r:8,dmg:e.dmg,life:4,color:'#40aa30',sourceType:e.type,sourceAttack:'venom spit'});
    }
  }
  else if(e.type==='cobweb_crawler'){
    if(d>e.r+p.r+20){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'web bite'); e.atkCd=1.2; }
    e.webCd=(e.webCd||0)-dt;
    if(e.webCd<=0){
      e.webCd=2.8;
      G.zones.push({x:e.x,y:e.y,r:70,life:4.0,maxlife:4.0,color:'100,130,60',type:'web',slow:0.45});
    }
  }
  else if(e.type==='blood_stalker'){
    e.leapCd  =(e.leapCd||0)  -dt;
    e.leapWind=(e.leapWind||0)-dt;
    if(e.leapWind>0){
      if(e.leapWind<=0.05){
        const lx=e.leapTarget.x,ly=e.leapTarget.y;
        e.x=lx; e.y=ly;
        G.zones.push({x:lx,y:ly,r:80,life:0.25,maxlife:0.25,color:'120,10,10',type:'flash'});
        burst(lx,ly,'#cc1010',10,160,0.45,4);
        if(dist2(lx,ly,p.x,p.y)<(90+p.r)**2) damageFromEnemy(e, e.dmg*1.3, 'pounce');
        e.leapCd=3.0+Math.random()*1.5;
      }
    } else {
      if(d>e.r+p.r+30){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
      else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg*0.65, 'claw'); e.atkCd=0.9; }
      if(e.leapCd<=0){
        e.leapWind=0.5;
        e.leapTarget={x:p.x+Math.cos(p.facing)*40,y:p.y+Math.sin(p.facing)*40};
        ftext(e.x,e.y-e.r-16,'POUNCE','#ff2020',11,0.6);
      }
    }
  }
  else if(e.type==='jade_widow'){
    if(d>e.r+p.r+20){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'poison bite'); e.atkCd=1.3; }
    e.poisonCd=(e.poisonCd||0)-dt;
    if(e.poisonCd<=0){
      e.poisonCd=3.2;
      G.zones.push({x:e.x,y:e.y,r:90,life:5.0,maxlife:5.0,color:'30,100,30',type:'poison',dmgPerSec:e.dmg*0.3,sourceType:e.type,sourceAttack:'poison pool'});
    }
  }
  else if(e.type==='carapace_guard'){
    if(e.tele>0){
      e.tele-=dt;
      if(e.tele<=0){
        if(d<e.r+p.r+100) damageFromEnemy(e, e.dmg*1.5, 'carapace crush');
        G.zones.push({x:e.x,y:e.y,r:100,life:0.3,maxlife:0.3,color:'40,20,80',type:'flash'});
        burst(e.x,e.y,'#604090',10,140,0.5,5);
        e.atkCd=2.2;
      }
    } else {
      if(d>e.r+p.r+30){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
      else if(e.atkCd<=0){ e.tele=0.7; ftext(e.x,e.y-e.r-20,'CRUSH','#8040cc',12,0.7); }
    }
  }
  else if(e.type==='phase_stalker'){
    if(e.tele>0){
      e.tele-=dt;
      if(e.tele<=0&&d<e.r+p.r+90) damageFromEnemy(e, e.dmg, 'phase strike');
    } else {
      if(d>e.r+p.r+30){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
      else if(e.atkCd<=0){ e.tele=0.22; e.atkCd=1.1;
        e.echoPending={x:e.x,y:e.y,delay:0.5,dmg:e.dmg*0.8};
      }
    }
    if(e.echoPending){
      e.echoPending.delay-=dt;
      if(e.echoPending.delay<=0){
        burst(e.echoPending.x,e.echoPending.y,'#6020a0',8,130,0.4,3);
        if(dist2(e.echoPending.x,e.echoPending.y,p.x,p.y)<(75+p.r)**2) damageFromEnemy(e, e.echoPending.dmg, 'phase echo');
        e.echoPending=null;
      }
    }
  }
  else if(e.type==='brood_mother'){
    if(d>e.r+p.r+30){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'brood bite'); e.atkCd=1.8; }
    e.broodCd=(e.broodCd||0)-dt;
    if(e.broodCd<=0&&G.enemies.length<G.maxEnemies+4){
      e.broodCd=3.5+Math.random()*1.0;
      ftext(e.x,e.y-e.r-22,'SPAWN','#c040a0',11,0.8);
      for(let i=0;i<2;i++) spawnEnemy('spiderling',false);
    }
  }
  else if(e.type==='void_weaver'){
    if(d>e.r+p.r+40){ e.x+=dx/d*eff*dt*0.7; e.y+=dy/d*eff*dt*0.7; }
    else if(e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'void strike'); e.atkCd=2.0; }
    e.riftOrbCd=(e.riftOrbCd||0)-dt;
    if(e.riftOrbCd<=0){
      e.riftOrbCd=4.5;
      for(let i=0;i<3;i++){
        const ba=Math.atan2(dy,dx)+rand(-0.25,0.25);
        G.projectiles.push({x:e.x,y:e.y,vx:Math.cos(ba)*120,vy:Math.sin(ba)*120,r:12,dmg:e.dmg*0.5,life:6,color:'#6010b0'});
      }
    }
  }
  else {
    if(e.tele>0){
      e.tele-=dt;
      if(e.tele<=0){
        if(d<e.r+p.r+78) damageFromEnemy(e, e.dmg, 'melee lunge');
        e.atkCd=e.type==='brute'?1.6:1.0;
      }
    } else {
      if(d>e.r+p.r+34){ e.x+=dx/d*eff*dt; e.y+=dy/d*eff*dt; }
      else if(e.atkCd<=0){ e.tele=e.type==='brute'?0.55:0.32; }
    }
    if(e.type==='imp'&&d<e.r+p.r+2&&e.atkCd<=0){ damageFromEnemy(e, e.dmg, 'imp bite'); e.atkCd=0.8; }
  }
}
