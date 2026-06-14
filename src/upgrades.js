"use strict";
/* ---------------- Persistent session data ---------------- */
const meta = { voidcores: 0 };
const TALENTS = [
  {id:'brut', path:'blade', tier:1, nm:'Brutality',  ds:'+10% weapon damage per rank.',        max:3, cost:1, ic:'🗡'},
  {id:'rage', path:'blade', tier:2, req:[{id:'brut', rank:2}], nm:'Giant Blades', ds:'+18% sword reach. The cleave grows hungrier.', max:1, cost:2, ic:'⚔'},
  {id:'wolf', path:'blade', tier:3, req:[{id:'rage', rank:1}], nm:'Wolf Companion', ds:'Rank 1: summons a wolf that hunts ranged enemies. Rank 2-3: +damage and +range.', max:3, cost:2, ic:'🐺'},
  {id:'vita', path:'endurance', tier:1, nm:'Vitality',   ds:'+15% maximum health per rank.',       max:3, cost:1, ic:'❤'},
  {id:'focs', path:'endurance', tier:2, req:[{id:'vita', rank:2}], nm:'Focus',      ds:'-10% ability cooldowns per rank.',    max:2, cost:1, ic:'⏳'},
  {id:'swft', path:'endurance', tier:3, req:[{id:'focs', rank:1}], nm:'Swiftness',  ds:'+8% movement speed per rank.',        max:2, cost:1, ic:'👟'},
  {id:'pull', path:'hunt', tier:1, nm:'Graviton Pull', ds:'+20 pickup radius per rank.',               max:4, cost:1, ic:'🧲'},
  {id:'gred', path:'hunt', tier:2, req:[{id:'pull', rank:2}], nm:'Greed',      ds:'+15% experience gained per rank.',    max:2, cost:1, ic:'✦'},
];
const TALENT_PATHS = [
  {id:'blade', nm:'Blade', ds:'Damage, reach, and companion pressure.'},
  {id:'endurance', nm:'Endurance', ds:'Health, cooldown control, and movement.'},
  {id:'hunt', nm:'Hunt', ds:'Pickup control and faster long-term scaling.'},
];
const talentRanks = {}; TALENTS.forEach(t=>talentRanks[t.id]=0);
const tval = id => talentRanks[id];

/* ---- Class tag helpers ---- */
// --- `for` (who can receive it) ---
// 'all'      = any character
// 'melee'    = melee classes (skeleton etc.)
// 'ranged'   = ranged classes (warlock etc.)
// 'skeleton' = skeleton-only
// 'warlock'  = warlock-only
//
// --- `tags` (what it does / thematic school) ---
// School:   'shadow' | 'fire' | 'frost' | 'lightning' | 'blood'
// Mechanic: 'dot' | 'cdr' | 'mobility' | 'defensive' | 'crit' | 'aoe' | 'summon'
// Synergi:  'soul' | 'curse' | 'sigil'   (booster specifikke mekanikker)
//
// Bruges til: filtrering, synergier, fremtidige set-bonusser
function charTags(cls){
  if(cls==='skeleton') return new Set(['all','melee','skeleton']);
  if(cls==='warlock')  return new Set(['all','ranged','warlock']);
  return new Set(['all']);
}
function compatibleFor(def, cls){
  if(!def.for) return true;
  const tags = charTags(cls || 'skeleton');
  return def.for.some(t=>tags.has(t));
}
// Tjek om et item/powerup har ét eller flere tags
function hasTags(def, ...check){
  if(!def.tags) return false;
  return check.every(t=>def.tags.includes(t));
}
// Tæl hvor mange items+powerups spilleren har med et givent tag
function countPlayerTag(tag){
  if(!G) return 0;
  const itemCount = G.items.filter(i=>{ const d=getItemDef(i.id); return d&&hasTags(d,tag); }).length;
  const pwCount = Object.entries(G.powerCounts||{}).filter(([id,n])=>n>0&&hasTags(POWERUPS.find(p=>p.id===id)||{},tag)).length;
  return itemCount + pwCount;
}

/* ---------------- Level ups / powerups ---------------- */
const POWERUPS = [
  // ── Universal ──
  {id:'steel',    for:['all'],      tags:['damage'],              max:5, ic:'⚔', nm:'Sharpened Edge',    ds:'+12% base damage.',                                 f:p=>p.baseDmg*=1.12},
  {id:'frenzy',   for:['all'],      tags:['attack-speed'],        max:5, ic:'⚡', nm:'Frenzy',             ds:'+10% attack speed.',                                f:p=>p.atkSpd*=1.10},
  {id:'stride',   for:['all'],      tags:['mobility'],            max:5, ic:'👟', nm:'War Stride',         ds:'+8% movement speed.',                               f:p=>p.speed*=1.08},
  {id:'hide',     for:['all'],      tags:['defensive'],           max:5, ic:'❤', nm:'Thick Hide',         ds:'+20 max health and heal 30.',                       f:p=>{p.maxhp+=20;p.hp=Math.min(p.maxhp,p.hp+30);}},
  {id:'crit',     for:['all'],      tags:['crit'],                max:5, ic:'🎯', nm:'Killer Instinct',    ds:'+8% critical strike chance.',                       f:p=>p.crit+=0.08},
  {id:'leech',    for:['all'],      tags:['blood'],               max:5, ic:'🩸', nm:'Life Leech',         ds:'+1% lifesteal on all hits.',                        f:p=>p.lifesteal+=0.01},
  {id:'multiproj',for:['all'],      tags:['projectile'],          max:5, ic:'🔱', nm:'Multishot',          ds:'+1 projectile. Warlock: extra Shadow Bolt and Bone Shield shard.', f:p=>p.extraProjectiles=(p.extraProjectiles||0)+1},
  // ── Skeleton ──
  {id:'spins',    for:['skeleton'], tags:['physical','aoe','spin'],      max:5, ic:'🌪', nm:'Whirlwind Spins',  ds:'+1 Whirlwind spin.',                          f:p=>p.ww.spins++},
  {id:'skcdr',    for:['skeleton'], tags:['cdr'],                        max:5, ic:'⏳', nm:'Relentless',       ds:'-20% all ability cooldowns.',                  f:p=>{p.ww.cdMax*=0.8;p.dash.cdMax*=0.8;p.fury.cdMax*=0.8;p.slam.cdMax*=0.8;}},
  {id:'reach',    for:['skeleton'], tags:['physical','combo'],           max:5, ic:'🗡', nm:'Longer Blades',    ds:'+12% sword reach.',                            f:p=>p.reach*=1.12},
  {id:'impactchg',for:['skeleton'], tags:['mobility','physical'],        max:1, ic:'💨', nm:'Crushing Charge',  ds:'Charge deals damage and grants brief iframes on impact.', f:p=>p.chargeImpact=true},
  // ── Warlock ──
  {id:'wlcdr',    for:['warlock'],  tags:['cdr'],                        max:5, ic:'⏳', nm:'Dark Covenant',    ds:'-20% all ability cooldowns.',                  f:p=>{if(p.boneShield)p.boneShield.cdMax*=0.8;if(p.wlQ)p.wlQ.cdMax*=0.8;if(p.wlE)p.wlE.cdMax*=0.8;p.dash.cdMax*=0.8;}},
  {id:'souldbl',  for:['warlock'],  tags:['soul','dot'],                 max:1, ic:'💀', nm:'Soul Glutton',     ds:'Soul Fragments grant +2% DoT instead of +1%.',  f:p=>p.soulDoubleDot=true},
  {id:'cursedur', for:['warlock'],  tags:['curse','shadow'],             max:5, ic:'🔮', nm:'Lingering Curse',  ds:'Curse lasts 3 seconds longer.',                f:p=>p.curseBonusDur=(p.curseBonusDur||0)+3},
];

const multishotPower = POWERUPS.find(p=>p.id==='multiproj');
if(multishotPower) multishotPower.for = ['ranged'];
POWERUPS.push(
  {id:'pickup',   for:['all'],    tags:['pickup','xp'],                  max:5, ic:'+',  nm:'Soul Magnet',       ds:'+18 pickup radius.',                         f:p=>{p.pickupRange=(p.pickupRange||18)+18;p.xpPickupRange=p.pickupRange;}},
  {id:'projspd',  for:['ranged'], tags:['projectile','projectile-speed'], max:5, ic:'>>', nm:'Quickened Bolts',   ds:'+12% projectile speed.',                     f:p=>p.projectileSpeed=(p.projectileSpeed||1)*1.12}
);
const POWERUP_RARITY = {
  steel:'blue', frenzy:'blue', stride:'blue', hide:'blue', pickup:'blue', projspd:'blue',
  crit:'yellow', leech:'yellow', multiproj:'yellow', reach:'yellow', spins:'yellow', cursedur:'yellow',
  skcdr:'purple', wlcdr:'purple', impactchg:'purple', souldbl:'purple'
};
const RARITY_META = {
  blue:   {label:'Uncommon', weight:0.65},
  yellow: {label:'Rare',     weight:0.25},
  purple: {label:'Epic',     weight:0.10}
};
const XP_LEVEL_EXPONENT = 1.55;

function pctMult(base, stacks){
  return Math.round((Math.pow(base, stacks)-1)*100);
}
function pctReduction(base, stacks){
  return Math.round((1-Math.pow(base, stacks))*100);
}
function signedPct(n){ return (n>=0?'+':'') + n + '%'; }

const POWERUP_DETAILS = {
  steel:{
    current:c=>`${signedPct(pctMult(1.12,c))} base damage`,
    next:c=>`${signedPct(pctMult(1.12,c+1))} base damage`,
    scale:'Multiplicative +12% base damage per stack.',
    syn:'Scales weapon and ability damage that is based on your character base damage.'
  },
  frenzy:{
    current:c=>`${signedPct(pctMult(1.10,c))} attack speed`,
    next:c=>`${signedPct(pctMult(1.10,c+1))} attack speed`,
    scale:'Multiplicative +10% attack speed per stack.',
    syn:'Speeds up autoattacks and compresses Whirlwind spin timing.'
  },
  stride:{
    current:c=>`${signedPct(pctMult(1.08,c))} movement speed`,
    next:c=>`${signedPct(pctMult(1.08,c+1))} movement speed`,
    scale:'Multiplicative +8% movement speed per stack.',
    syn:'Helps kite while collecting XP and makes Battle Fury feel stronger.'
  },
  hide:{
    current:c=>`+${c*20} max HP gained from stacks`,
    next:c=>`+${(c+1)*20} max HP total and +30 instant heal on pickup`,
    scale:'+20 max HP per stack; heals 30 when selected.',
    syn:'Reliable survival pick for late waves and ranged pressure.'
  },
  crit:{
    current:c=>`+${c*8}% crit chance`,
    next:c=>`+${(c+1)*8}% crit chance`,
    scale:'+8 percentage points crit chance per stack. Critical hits deal 140% total damage.',
    syn:'Great with high-hit builds: Whirlwind, Multishot bolts, Bone Shield and cleaves.'
  },
  leech:{
    current:c=>`+${c}% lifesteal on all hits`,
    next:c=>`+${c+1}% lifesteal on all hits`,
    scale:'+1 percentage point lifesteal per stack.',
    syn:'Strong with fast multi-hit builds, especially Whirlwind and Bone Shield.'
  },
  multiproj:{
    current:c=>`+${c} extra projectile${c===1?'':'s'} / Bone Shield shard${c===1?'':'s'}`,
    next:c=>`+${c+1} extra projectile${c+1===1?'':'s'} / Bone Shield shard${c+1===1?'':'s'}`,
    scale:'+1 projectile per stack. For Bone Shield: +1 orbiting shard per stack.',
    syn:'Warlock projectile scaler: adds Shadow Bolt projectiles and extra Bone Shield shards.'
  },
  spins:{
    current:c=>`+${c} Whirlwind spin${c===1?'':'s'}`,
    next:c=>`+${c+1} Whirlwind spin${c+1===1?'':'s'}`,
    scale:'+1 spin per stack; each spin is another hit window.',
    syn:'Core Whirlwind build pick; adds more Eye of Ruin proc chances.'
  },
  skcdr:{
    current:c=>`${pctReduction(0.8,c)}% lower Skeleton ability cooldowns`,
    next:c=>`${pctReduction(0.8,c+1)}% lower Skeleton ability cooldowns`,
    scale:'Multiplicative -20% cooldown per stack.',
    syn:'More Whirlwinds, Slams, Charges and Battle Fury uptime.'
  },
  reach:{
    current:c=>`${signedPct(pctMult(1.12,c))} sword reach`,
    next:c=>`${signedPct(pctMult(1.12,c+1))} sword reach`,
    scale:'Multiplicative +12% sword reach per stack.',
    syn:'Expands autoattack arcs, Ground Slam radius and Whirlwind coverage.'
  },
  impactchg:{
    current:c=>c?'Charge impact damage unlocked':'Not unlocked yet',
    next:()=>`Charge deals 2.0x weapon damage on first stun contact and grants brief iframes`,
    scale:'One-time unlock.',
    syn:'Turns Charge from pure mobility/control into a burst engage tool.'
  },
  wlcdr:{
    current:c=>`${pctReduction(0.8,c)}% lower Warlock ability cooldowns`,
    next:c=>`${pctReduction(0.8,c+1)}% lower Warlock ability cooldowns`,
    scale:'Multiplicative -20% cooldown per stack.',
    syn:'More Curse, Sigil, Bone Shield and Shadow Step uptime.'
  },
  souldbl:{
    current:c=>c?'Soul stacks grant +2% each':'Soul stacks grant +1% each',
    next:()=>`Soul stacks grant +2% spell pressure each instead of +1%`,
    scale:'One-time soul scaling upgrade.',
    syn:'Best when you already have reliable Curse/Sigil soul generation.'
  },
  cursedur:{
    current:c=>`+${c*3}s Curse duration`,
    next:c=>`+${(c+1)*3}s Curse duration`,
    scale:'+3s Curse duration per stack.',
    syn:'Keeps enemies vulnerable longer for Bone Shield, Shadow Bolt and Soul Harvest.'
  },
  pickup:{
    current:c=>`+${c*18} pickup radius`,
    next:c=>`+${(c+1)*18} pickup radius`,
    scale:'+18 pickup radius per stack.',
    syn:'Solves the kite-vs-XP problem and makes permanent XP drops easier to collect.'
  },
  projspd:{
    current:c=>`${signedPct(pctMult(1.12,c))} projectile speed`,
    next:c=>`${signedPct(pctMult(1.12,c+1))} projectile speed`,
    scale:'Multiplicative +12% projectile speed per stack.',
    syn:'Warlock bolts connect faster, and Bone Shield orbits faster for better shard coverage.'
  },
};

const ITEM_MAX = 3;
const ITEM_SLOTS = 3;
const RARE_ITEM_CHANCE = 0.34;
const ITEMS = [
  // ── Skeleton ──
  {
    id:'ember', for:['skeleton'], tags:['fire','aoe','combo'],
    nm:'Ember Sigil', hue:'#ff8a3d',
    ds:'Every 3rd cleave hit triggers a fire burst around the enemy.',
    scale:'Scales: burst radius and damage per rank.',
    f:p=>p.itemStats.ember=(p.itemStats.ember||0)+1,
    svg:`<svg viewBox="0 0 48 48"><defs><radialGradient id="gEmb" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fff6a6"/><stop offset=".5" stop-color="#ff8a3d"/><stop offset="1" stop-color="#7d1712"/></radialGradient></defs><path d="M24 5c9 8 15 16 15 25 0 8-6 14-15 14S9 38 9 30c0-6 4-11 8-16-1 7 2 10 6 12 4-5 2-12 1-21z" fill="url(#gEmb)" stroke="#ffd28c" stroke-width="2"/><circle cx="24" cy="30" r="6" fill="#fff4b8"/></svg>`
  },
  {
    id:'stormcoil', for:['skeleton'], tags:['physical','aoe','spin','cdr'],
    nm:'Storm Coil', hue:'#7cf5ff',
    ds:'+1 Whirlwind spin and -6% ability cooldowns per rank.',
    scale:'Scales: Whirlwind spins and cooldown reduction.',
    f:p=>{p.ww.spins++;p.ww.cdMax*=0.94;p.dash.cdMax*=0.94;p.fury.cdMax*=0.94;p.slam.cdMax*=0.94;},
    svg:`<svg viewBox="0 0 48 48"><defs><radialGradient id="gSC" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#7cf5ff"/><stop offset="1" stop-color="#155d85"/></radialGradient></defs><path d="M30 3L12 27h11l-5 18 18-25H25z" fill="url(#gSC)" stroke="#e3fdff" stroke-width="2"/></svg>`
  },
  {
    id:'eyeofruin', for:['skeleton'], tags:['shadow','physical','aoe','spin'],
    nm:'Eye of Ruin', hue:'#b94aff',
    ds:'Every 4th Whirlwind hit releases a short-range void slash.',
    scale:'Scales: slash damage, range and width per rank.',
    f:p=>p.itemStats.ruin=(p.itemStats.ruin||0)+1,
    svg:`<svg viewBox="0 0 48 48"><defs><radialGradient id="gER" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c840ff"/><stop offset="1" stop-color="#16001f"/></radialGradient></defs><circle cx="24" cy="24" r="17" fill="url(#gER)" stroke="#e8a0ff" stroke-width="2"/><path d="M7 24c7-10 27-10 34 0-7 10-27 10-34 0z" fill="none" stroke="#1a0828" stroke-width="4"/><circle cx="24" cy="24" r="6" fill="#12051d" stroke="#ffffff" stroke-width="2"/><path d="M24 6l3 8-3 5-3-5zM24 42l-3-8 3-5 3 5z" fill="#c840ff" opacity=".85"/></svg>`
  },
  {
    id:'titanidol', for:['skeleton'], tags:['defensive','physical','aoe'],
    nm:'Titan Idol', hue:'#d9c38a',
    ds:'Take 7% less damage and +9% slam radius per rank.',
    scale:'Scales: damage reduction and slam area.',
    f:p=>{p.itemStats.guard=(p.itemStats.guard||0)+0.07;p.itemStats.slamRadius=(p.itemStats.slamRadius||1)*1.09;},
    svg:`<svg viewBox="0 0 48 48"><defs><linearGradient id="gTI" x1="12" y1="4" x2="36" y2="44"><stop offset="0" stop-color="#fff0bd"/><stop offset=".5" stop-color="#b99a55"/><stop offset="1" stop-color="#4e3920"/></linearGradient></defs><path d="M15 7h18l6 11-5 23H14L9 18z" fill="url(#gTI)" stroke="#fff0bd" stroke-width="2"/><path d="M18 21h12M20 29h8" stroke="#2a2014" stroke-width="3" stroke-linecap="round"/></svg>`
  },
  // ── Warlock ──
  {
    id:'shadowpact', for:['warlock'], tags:['shadow','projectile'],
    nm:'Shadow Pact', hue:'#9b59f5',
    ds:'Shadow Bolt pierces through enemies, hitting all in its path.',
    scale:'Scales: pierce count per rank.',
    f:p=>p.shadowPierce=(p.shadowPierce||0)+1,
    svg:`<svg viewBox="0 0 48 48"><defs><linearGradient id="gSP" x1="4" y1="24" x2="44" y2="24"><stop offset="0" stop-color="#f0dcff"/><stop offset=".5" stop-color="#9b59f5"/><stop offset="1" stop-color="#1a0033"/></linearGradient></defs><path d="M4 24l14-6v4h22v4H18v4z" fill="url(#gSP)" stroke="#d4a8ff" stroke-width="1.5"/><circle cx="40" cy="24" r="5" fill="#c840ff" stroke="#f0dcff" stroke-width="1.5"/></svg>`
  },
  {
    id:'felbrand', for:['warlock'], tags:['fire','dot','aoe'],
    nm:'Fel Brand', hue:'#ff5020',
    ds:'Burning enemies explode on death, dealing fire damage nearby.',
    scale:'Scales: explosion radius and damage per rank.',
    f:p=>p.felBrand=(p.felBrand||0)+1,
    svg:`<svg viewBox="0 0 48 48"><defs><radialGradient id="gFB" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fff6a0"/><stop offset=".45" stop-color="#ff5020"/><stop offset="1" stop-color="#1a0800"/></radialGradient></defs><circle cx="24" cy="24" r="18" fill="url(#gFB)" stroke="#ff9060" stroke-width="2"/><path d="M24 10c6 5 10 10 10 16 0 4-3 7-7 8 2-4 0-8-3-10-1 5-3 8-6 10-3-3-4-7-3-11-3 3-4 7-3 11-3-2-5-6-5-10 0-7 7-14 17-14z" fill="#fff6a0" opacity=".9"/></svg>`
  },
  {
    id:'soulstone', for:['warlock'], tags:['soul','shadow','fire'],
    nm:'Soulstone', hue:'#c840ff',
    ds:'+1% spell damage per Soul Fragment stack (stacks with your souls).',
    scale:'Scales: bonus multiplied per rank.',
    f:p=>p.soulstone=(p.soulstone||0)+1,
    svg:`<svg viewBox="0 0 48 48"><defs><radialGradient id="gSS" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#c840ff"/><stop offset="1" stop-color="#16001f"/></radialGradient></defs><path d="M24 4l8 14 14 3-10 10 2 14-14-8-14 8 2-14L2 21l14-3z" fill="url(#gSS)" stroke="#e8a0ff" stroke-width="1.5"/></svg>`
  },
];
function itemRank(id){
  const it = G && G.items.find(i=>i.id===id);
  return it ? it.rank : 0;
}
function getItemDef(id){ return ITEMS.find(i=>i.id===id); }
function itemValueText(def, rank){
  if(def.id==='ember')     return `Current: burst deals ${10+rank*8} fire damage in a ${80+rank*25} radius.`;
  if(def.id==='stormcoil') return `Current: +${rank} Whirlwind spin${rank>1?'s':''} and -${Math.round((1-Math.pow(0.94,rank))*100)}% cooldowns.`;
  if(def.id==='eyeofruin') return `Current: every 4th Whirlwind hit fires a ${180+rank*20} range void slash for ${18+rank*10} damage.`;
  if(def.id==='titanidol') return `Current: ${7*rank}% less damage taken and +${Math.round((Math.pow(1.09,rank)-1)*100)}% slam radius.`;
  if(def.id==='shadowpact') return `Current: bolts pierce up to ${rank+1} enemies.`;
  if(def.id==='felbrand')  return `Current: explosion deals ${15+rank*12} damage in a ${90+rank*30} radius.`;
  if(def.id==='soulstone') return `Current: +${rank}% spell damage per soul stack (up to +${rank*30}% at max stacks).`;
  return def.ds;
}
function itemNextText(def, rank){
  if(rank>=ITEM_MAX) return 'Max rank reached.';
  const next = rank + 1;
  return itemValueText(def, next).replace('Current:', 'Next:');
}
function itemSynergyText(def){
  const syn = {
    ember:'Best with attack speed and crit because more cleaves mean more fire bursts.',
    stormcoil:'Core Whirlwind support item: more spins, more Eye of Ruin chances, lower cooldowns.',
    eyeofruin:'Whirlwind build payoff: extra spins and attack speed create more void slashes.',
    titanidol:'Defensive Slam item; pairs with Longer Blades and Relentless for safer AoE control.',
    shadowpact:'Pairs with Multishot, Quickened Bolts and Curse for stronger ranged clear.',
    felbrand:'Pairs with Burning Sigil and Curse; burning deaths chain into fire explosions.',
    soulstone:'Pairs with Soul Harvest and Soul Glutton; more souls make every spell scale harder.',
  };
  return syn[def.id] || 'No special synergy.';
}
function itemTooltipHtml(def, rank, preview){
  const shownRank = preview ? Math.min(ITEM_MAX, rank+1) : rank;
  const label = preview ? (rank ? `LV ${rank} > ${shownRank}` : 'NEW ITEM') : `LV ${rank}`;
  const currentLabel = preview ? 'After Pick' : 'Current';
  const next = !preview && rank<ITEM_MAX ? `<div class="tnext">${itemNextText(def, rank)}</div>` : '';
  return `<div class="tnm">${def.nm}<span class="tlv">${label}</span></div>` +
    `<div class="tds">${def.ds}</div>` +
    `<div class="tcur"><span class="tlabel">${currentLabel}</span>${itemValueText(def, shownRank).replace('Current: ','')}</div>` +
    next +
    `<div class="tsc"><span class="tlabel">Scales</span>${def.scale}</div>` +
    `<div class="tsy"><span class="tlabel">Synergy</span><div>${itemSynergyText(def)}</div></div>` +
    `<div class="ttags">${(def.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>`;
}
function powerupShortScale(def){
  const info = POWERUP_DETAILS[def.id];
  return info ? info.scale : (def.tags ? 'Tags: '+def.tags.join(', ') : '');
}
function powerupTooltipHtml(def, preview){
  const count = powerCount(def.id);
  const max = def.max || 5;
  const shownCount = preview ? Math.min(max, count+1) : count;
  const info = POWERUP_DETAILS[def.id] || {};
  const rarity = powerupRarity(def);
  const rarityLabel = RARITY_META[rarity] ? RARITY_META[rarity].label : rarity;
  const current = info.current ? info.current(shownCount) : def.ds;
  const nextBase = preview ? shownCount : count;
  const next = nextBase>=max ? 'Max rank reached.' : (info.next ? info.next(nextBase) : def.ds);
  const currentLabel = preview ? 'After Pick' : 'Current';
  return `<div class="tnm">${def.nm}<span class="tlv">${rarityLabel} ${count}/${max}</span></div>` +
    `<div class="tds">${def.ds}</div>` +
    `<div class="tcur"><span class="tlabel">${currentLabel}</span>${current}</div>` +
    `<div class="tnext"><span class="tlabel">Next</span>${next}</div>` +
    `<div class="tsc"><span class="tlabel">Scales</span>${info.scale || 'Direct stat increase.'}</div>` +
    `<div class="tsy"><span class="tlabel">Synergy</span><div>${info.syn || 'General build support.'}</div></div>` +
    `<div class="ttags">${(def.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>`;
}
function itemChoices(){
  const owned = G.items.map(i=>i.id);
  const cls = G && G.charClass;
  return ITEMS.filter(i=>
    compatibleFor(i, cls) &&
    (owned.includes(i.id) ? itemRank(i.id)<ITEM_MAX : G.items.length<ITEM_SLOTS)
  );
}
function takeItem(def){
  const found = G.items.find(i=>i.id===def.id);
  if(found) found.rank++;
  else G.items.push({id:def.id, rank:1});
  def.f(G.player);
  if(typeof runLogChoice === 'function') runLogChoice('item', def, itemRank(def.id));
  G.itemsDirty = true;
  burst(G.player.x,G.player.y,def.hue,24,260,0.8,4);
  ftext(G.player.x,G.player.y-66,def.nm+' LV '+itemRank(def.id),def.hue,16,1.4);
}
function powerCount(id){ return G && G.powerCounts ? (G.powerCounts[id] || 0) : 0; }
function takePowerup(def){
  def.f(G.player);
  G.powerCounts[def.id] = powerCount(def.id) + 1;
  if(typeof runLogChoice === 'function') runLogChoice('powerup', def, G.powerCounts[def.id]);
  G.itemsDirty = true;
}
function powerupRarity(def){ return def.rarity || POWERUP_RARITY[def.id] || 'blue'; }
function rollPowerupRarity(){
  const r = Math.random();
  if(r < RARITY_META.blue.weight) return 'blue';
  if(r < RARITY_META.blue.weight + RARITY_META.yellow.weight) return 'yellow';
  return 'purple';
}
function pickPowerupByRarity(pool, used){
  const wanted = rollPowerupRarity();
  const unused = def => !used.has(def.id);
  let candidates = pool.filter(def=>unused(def) && powerupRarity(def)===wanted);
  if(!candidates.length) candidates = pool.filter(unused);
  if(!candidates.length) return null;
  return pick(candidates);
}
function powerupChoices(pool, count){
  const used = new Set();
  const choices = [];
  for(let i=0;i<count;i++){
    const def = pickPowerupByRarity(pool, used);
    if(!def) break;
    used.add(def.id);
    choices.push(def);
  }
  return choices;
}
function queueLevelUp(){
  const p = G.player;
  p.level++; p.xpNext = Math.round(28*Math.pow(p.level,XP_LEVEL_EXPONENT));
  if(typeof runLogLevelUp === 'function') runLogLevelUp();
  G.pendingLevels++;
  burst(p.x,p.y,'#5ab4ff',26,300,0.9,4);
  burst(p.x,p.y,'#ffd75c',14,220,0.8,3);
  ftext(p.x,p.y-50,'LEVEL UP!','#7cc4ff',20,1.4);
  if(G.lvlAnim<=0){
    G.lvlAnim = 0.55;                       // the half-second flourish
    p.iframes = Math.max(p.iframes, 0.7);   // don't get chunked mid-celebration
  }
}
function classLabel(forArr){
  if(!forArr || forArr.includes('all')) return '';
  if(forArr.includes('warlock'))  return '<span class="classtag warlock">WARLOCK</span>';
  if(forArr.includes('skeleton')) return '<span class="classtag skeleton">MELEE</span>';
  if(forArr.includes('melee'))    return '<span class="classtag melee">MELEE</span>';
  if(forArr.includes('ranged'))   return '<span class="classtag ranged">RANGED</span>';
  return '';
}
function openPowerupSelection(){
  const p = G.player;
  const cls = G.charClass;
  const eligible = POWERUPS.filter(pw=>compatibleFor(pw, cls) && powerCount(pw.id) < (pw.max||5));
  const opts = powerupChoices(eligible, 3).map(o=>({kind:'power', data:o}));
  const rares = itemChoices();
  if(rares.length && opts.length && Math.random()<RARE_ITEM_CHANCE){
    opts[randi(0,opts.length-1)] = {kind:'item', data:pick(rares)};
  } else if(!opts.length && rares.length){
    opts.push({kind:'item', data:pick(rares)});
  }
  const row = $('cardrow'); row.innerHTML='';
  opts.forEach(o=>{
    const c = document.createElement('div');
    const rarity = o.kind==='power' ? powerupRarity(o.data) : '';
    c.className='card' + (o.kind==='item'?' item':'') + (rarity ? ' rarity-'+rarity : '');
    if(o.kind==='item'){
      const rank = itemRank(o.data.id);
      const label = rank ? `LEVEL ${rank+1}` : 'NEW ITEM';
      c.innerHTML = `<div class="badge">RARE ${label}</div>${classLabel(o.data.for)}<div class="item-art">${o.data.svg}</div><div class="nm">${o.data.nm}</div><div class="ds">${o.data.ds}</div><div class="sc">${o.data.scale}</div>`;
      c.onmouseenter = ()=>showTooltip(itemTooltipHtml(o.data, rank, true));
    } else {
      const count = powerCount(o.data.id);
      c.innerHTML = `<div class="stack">${count}/${o.data.max||5}</div><div class="badge rarity ${rarity}">${RARITY_META[rarity].label}</div><div class="ic">${o.data.ic}</div>${classLabel(o.data.for)}<div class="nm">${o.data.nm}</div><div class="ds">${o.data.ds}</div><div class="sc">${powerupShortScale(o.data)}</div>`;
      c.onmouseenter = ()=>showTooltip(powerupTooltipHtml(o.data, true));
    }
    c.onmousemove = moveTooltip;
    c.onmouseleave = hideTooltip;
    c.onclick = ()=>{
      const row2=$('cardrow'); if(row2 && row2.classList.contains('locked')) return;
      if(o.kind==='item') takeItem(o.data);
      else takePowerup(o.data);
      G.pendingLevels--;
      if(G.pendingLevels>0){ openPowerupSelection(); }
      else { closeScreens(); updateItemsHUD(); setTimeout(()=>{ state=ST.PLAY; lastT=performance.now(); }, 200); }
    };
    row.appendChild(c);
  });
  openScreen('levelup'); state = ST.LEVELUP;
  const rowEl = $('cardrow');
    rowEl.classList.remove('animating');
  void rowEl.offsetHeight;
  rowEl.classList.add('animating', 'locked');
  setTimeout(()=>{ rowEl.classList.remove('locked'); }, 500);
  setTimeout(()=>{ rowEl.classList.remove('animating'); }, 700);
}
