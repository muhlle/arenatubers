"use strict";
/* =========================================================
   GRUKK — Arena Survivors
   Canvas survivor game — split into multiple files.
========================================================= */
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let W = 0, H = 0;
function resize(){ W = cv.width = innerWidth; H = cv.height = innerHeight; }
addEventListener('resize', resize); resize();

const TAU = Math.PI*2;
const rand = (a,b)=>a+Math.random()*(b-a);
const randi = (a,b)=>Math.floor(rand(a,b+1));
const clamp = (v,a,b)=>v<a?a:(v>b?b:v);
const dist2 = (ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay;return dx*dx+dy*dy};
const lerp = (a,b,t)=>a+(b-a)*t;
function angDiff(a,b){let d=(b-a)%TAU; if(d>Math.PI)d-=TAU; if(d<-Math.PI)d+=TAU; return d;}
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];

/* =========================================================
   DAMAGE TYPE COLORS — used by hitEnemy for colored numbers
========================================================= */
const DMG_COLORS = {
  physical: '#e8dcc8',   // warm cream — melee
  shadow:   '#c840ff',   // purple — shadow spells / curse
  fire:     '#ff6020',   // orange-red — burning / sigil / firestorm
  poison:   '#40c020',   // green — poison DoT (future)
  bleed:    '#ff2040',   // red — bleed effects (future)
  magic:    '#60a0ff',   // blue — arcane / generic magic
  frost:    '#60d0ff',   // light blue — frost (future)
};

/* ---------------- Game state ---------------- */
const ST = { MENU:0, PLAY:1, PAUSE:2, LEVELUP:3, OVER:4, WIN:5 };
let state = ST.MENU;
let G = null;        // current run
let shakeT = 0, shakeMag = 0;
const devTools = { open:false, godmode:false, speed:1, spawnRate:1 };

/* ---------------- Input ---------------- */
const keys = {};
let mouse = {x:0,y:0,down:false};
addEventListener('keydown', e=>{
  unlockAudio();
  const k = e.key.toLowerCase();
  keys[k] = true;
  if(e.key === 'PageUp'){
    toggleDevTools();
    e.preventDefault();
    return;
  }
  if(k==='escape'){
    if(state===ST.PLAY){
      openScreen('pause');
      state=ST.PAUSE;
      if(typeof renderPauseRunStats === 'function') renderPauseRunStats();
    }
    else if(state===ST.PAUSE){ closeScreens(); state=ST.PLAY; lastT=performance.now(); }
  }
  if([' ','arrowup','arrowdown'].includes(e.key.toLowerCase())) e.preventDefault();
});
addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);
addEventListener('mousemove', e=>{mouse.x=e.clientX; mouse.y=e.clientY; moveTooltip();});
addEventListener('mousedown', e=>{ unlockAudio(); if(e.button===0) mouse.down=true; });
addEventListener('mouseup',   e=>{ if(e.button===0) mouse.down=false; });
addEventListener('contextmenu', e=>e.preventDefault());

/* ---------------- Screens / UI ---------------- */
const $ = id=>document.getElementById(id);
function closeScreens(){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('show')); }
function openScreen(id){ closeScreens(); $(id).classList.add('show'); }
function showHUD(b){ $('hud').classList.toggle('show', b); }

function isAdminUser(){
  try { return localStorage.getItem('grukk_session') === 'admin'; }
  catch (_) { return false; }
}

function syncDevToolsPanel(){
  const panel = $('devtools');
  if(!panel) return;
  panel.classList.toggle('show', devTools.open && isAdminUser());
  panel.setAttribute('aria-hidden', panel.classList.contains('show') ? 'false' : 'true');
  const god = $('devGodmode');
  if(god){
    god.textContent = 'Godmode: ' + (devTools.godmode ? 'on' : 'off');
    god.classList.toggle('on', devTools.godmode);
  }
  const speed = $('devSpeed');
  const speedValue = $('devSpeedValue');
  if(speed && Number(speed.value) !== devTools.speed) speed.value = String(devTools.speed);
  if(speedValue) speedValue.textContent = devTools.speed.toFixed(1) + 'x';
  const spawnRate = $('devSpawnRate');
  const spawnRateValue = $('devSpawnRateValue');
  if(spawnRate && Number(spawnRate.value) !== devTools.spawnRate) spawnRate.value = String(devTools.spawnRate);
  if(spawnRateValue) spawnRateValue.textContent = devTools.spawnRate.toFixed(2).replace(/\.?0+$/, '') + 'x';
}

function toggleDevTools(){
  if(!isAdminUser()) return;
  devTools.open = !devTools.open;
  syncDevToolsPanel();
}

function devLevelUp(){
  if(!G || state===ST.MENU || typeof queueLevelUp !== 'function') return;
  queueLevelUp();
  if(state===ST.PLAY && G.pendingLevels>0 && G.lvlAnim<=0 && typeof openPowerupSelection === 'function') openPowerupSelection();
}

function devFullHeal(){
  if(!G || !G.player) return;
  G.player.hp = G.player.maxhp;
  ftext(G.player.x, G.player.y-G.player.r-18, 'FULL HEAL', '#5ee06a', 15, 0.9);
}

function devClearMobs(){
  if(!G) return;
  G.enemies.length = 0;
  G.boss = null;
  const bb = $('bossbar');
  if(bb) bb.style.display = 'none';
}

function devNextWave(){
  if(!G || state===ST.MENU) return;
  G.enemies.length = 0;
  G.boss = null;
  G.toSpawn = 0;
  G.waveState = 'inter';
  G.interT = 0.2;
}

function bindDevTools(){
  const close = $('devClose');
  if(close) close.onclick = ()=>{ devTools.open=false; syncDevToolsPanel(); };
  const level = $('devLevelUp');
  if(level) level.onclick = devLevelUp;
  const heal = $('devFullHeal');
  if(heal) heal.onclick = devFullHeal;
  const clear = $('devClearMobs');
  if(clear) clear.onclick = devClearMobs;
  const next = $('devNextWave');
  if(next) next.onclick = devNextWave;
  const god = $('devGodmode');
  if(god) god.onclick = ()=>{ devTools.godmode = !devTools.godmode; syncDevToolsPanel(); };
  const speed = $('devSpeed');
  if(speed) speed.oninput = ()=>{
    devTools.speed = clamp(Number(speed.value) || 1, 1, 10);
    syncDevToolsPanel();
  };
  const spawnRate = $('devSpawnRate');
  if(spawnRate) spawnRate.oninput = ()=>{
    devTools.spawnRate = clamp(Number(spawnRate.value) || 1, 0.25, 5);
    syncDevToolsPanel();
  };
  syncDevToolsPanel();
}

const ABILITY_INFO = {
  abQ:{nm:'Battle Fury', key:'Q',
    ds:'Empower yourself for 5 sec: <span style="color:#b0ff9a">+22% movement speed</span>. Synergizes with Whirlwind spin damage.',
    scale:[['Weapon damage','#ff9a5c'],['Movement speed','#bff5b0'],['Duration (5s base)','#7cf5ff']]},
  abE:{nm:'Ground Slam', key:'E',
    ds:'0.28s windup, then crush enemies in a <span style="color:#d9c38a">230 radius</span> for <span style="color:#ff9a5c">2.2× weapon damage</span> and slow them. Titan Idol increases radius.',
    scale:[['Weapon damage (2.2×)','#ff9a5c'],['Sword reach','#ffd75c'],['Slam radius (230 base)','#d9c38a']]},
  abR:{nm:'Whirlwind', key:'R',
    ds:'Spin both blades, hitting enemies in <span style="color:#ffd75c">100 radius</span> for <span style="color:#ff9a5c">1.2× weapon damage</span> per spin. Each spin tick scales with attack speed.',
    scale:[['Weapon damage (1.2× per spin)','#ff9a5c'],['Attack speed','#ffcf6a'],['Spins','#9adcff'],['Sword reach','#ffd75c']]},
  abS:{nm:'Charge', key:'SPACE',
    ds:'Burst forward at high speed, dealing <span style="color:#ff9a5c">1.8× weapon damage</span> and briefly stunning every enemy you pass through.',
    scale:[['Impact damage (1.8×)','#ff9a5c'],['Cooldown reduction','#7cf5ff'],['Stun duration','#ffd75c']]}
};
const WARLOCK_ABILITY_INFO = {
  abQ:{nm:'Curse', key:'Q',
    ds:'Emit a shadow nova (radius <span style="color:#a060ff">780</span>) — all enemies it passes through are <span style="color:#c840ff">Cursed for 6 sec</span>: take 25% more damage from bolts, 35% more from Bone Shield, and explode in shadow on death. Lingering Curse adds 3s per rank.',
    scale:[['Curse radius (780)','#a060ff'],['Bonus damage vs cursed','#c840ff'],['Duration (6s base)','#7cf5ff']]},
  abE:{nm:'Burning Sigil', key:'E',
    ds:'Place a fire circle (radius <span style="color:#9adcff">110</span>) at cursor for <span style="color:#ff6030">5 sec</span>. Deals <span style="color:#ff6030">22 fire DPS</span> × spell power. Cursed enemies inside are slowed. Explodes on expiry for <span style="color:#ffd75c">3× weapon damage</span>.',
    scale:[['Fire DPS (22 base)','#ff6030'],['Expiry explosion (3×)','#ffd75c'],['Radius (110)','#9adcff']]},
  abR:{nm:'Bone Shield', key:'R',
    ds:'Conjure <span style="color:#d4cfc0">7 bone shards</span> orbiting at <span style="color:#9adcff">260 radius</span> for <span style="color:#7cf5ff">8 sec</span>. Each shard strikes on contact for <span style="color:#d4cfc0">1.8× weapon damage</span>. <span style="color:#c840ff">Cursed targets take 35% extra</span>. 0.55s hit cooldown per enemy.',
    scale:[['Impact damage (1.8×)','#d4cfc0'],['Orbit radius (260)','#9adcff'],['Duration (8s)','#7cf5ff']]},
  abS:{nm:'Shadow Step', key:'SPACE',
    ds:'Blink up to <span style="color:#b8ffb0">500 units</span> toward your cursor, leaving a ghostly afterimage. Grants <span style="color:#9adcff">0.25s of iframes</span> on arrival.',
    scale:[['Blink range (500)','#b8ffb0'],['Cooldown reduction','#7cf5ff'],['Iframes on arrival','#9adcff']]}
};
function scaleHtml(rows){
  return rows.map(r=>`<span style="color:${r[1]}">${r[0]}</span>`).join(' / ');
}
const TC = {
  dmg:'#ff9a5c', atk:'#ffcf6a', reach:'#ffd75c', move:'#b0ff9a',
  cd:'#7cf5ff', aoe:'#9adcff', shadow:'#c840ff', fire:'#ff6020',
  phys:'#e8dcc8', heal:'#5ee06a', crit:'#ffd75c', item:'#b98aff'
};
const ABILITY_DETAILS = {
  abQ:{nm:'Battle Fury', key:'Q',
    ds:`Empower yourself for 5 sec with <span style="color:${TC.move}">+22% movement speed</span>. Best used to reposition before Whirlwind or escape stacked ranged mobs.`,
    scale:[['Movement speed bonus',TC.move],['Cooldown reduction',TC.cd],['Duration is fixed at 5s',TC.aoe]],
    syn:[['Whirlwind',TC.aoe,'lets you stay inside packs safely'],['War Stride',TC.move,'pushes the movement burst higher']]},
  abE:{nm:'Ground Slam', key:'E',
    ds:`After a 0.28s windup, crush enemies in a wide area for <span style="color:${TC.dmg}">2.2x weapon damage</span>.`,
    scale:[['Weapon damage',TC.dmg],['Sword reach',TC.reach],['Titan Idol slam radius',TC.item],['Cooldown reduction',TC.cd]],
    syn:[['Longer Blades',TC.reach,'increases the final radius'],['Titan Idol',TC.item,'adds radius and defense']]},
  abR:{nm:'Whirlwind', key:'R',
    ds:`Spin both blades and hit nearby enemies once per spin for <span style="color:${TC.dmg}">1.2x weapon damage</span>. Attack speed makes the spins fire faster.`,
    scale:[['Weapon damage',TC.dmg],['Attack speed',TC.atk],['Whirlwind Spins',TC.aoe],['Sword reach',TC.reach]],
    syn:[['Eye of Ruin',TC.shadow,'fires a void slash every 4th Whirlwind hit'],['Storm Coil',TC.item,'adds spins and lowers cooldowns'],['Frenzy',TC.atk,'compresses the full spin sequence']]},
  abS:{nm:'Charge', key:'SPACE',
    ds:`Dash in your movement direction and <span style="color:${TC.crit}">stun enemies hit for 1s</span>. Crushing Charge adds impact damage and brief iframes.`,
    scale:[['Cooldown reduction',TC.cd],['Crushing Charge weapon damage',TC.dmg],['Stun duration is fixed at 1s',TC.crit]],
    syn:[['Crushing Charge',TC.item,'turns Charge into a damage tool'],['Relentless',TC.cd,'makes the engage/escape loop faster']]}
};
const WARLOCK_ABILITY_DETAILS = {
  abQ:{nm:'Curse', key:'Q',
    ds:`Release a shadow nova in a <span style="color:${TC.shadow}">780 radius</span>. Cursed enemies take bonus damage from Warlock spells and explode on death.`,
    scale:[['Curse duration',TC.cd],['Damage bonus vs cursed',TC.shadow],['Nova radius is fixed at 780',TC.aoe]],
    syn:[['Lingering Curse',TC.shadow,'adds +3s duration per stack'],['Bone Shield',TC.phys,'hits cursed targets 35% harder'],['Burning Sigil',TC.fire,'burns cursed targets harder and slows them']]},
  abE:{nm:'Burning Sigil', key:'E',
    ds:`Place a fire circle at the cursor for <span style="color:${TC.fire}">5s</span>. It deals fire DPS, slows cursed enemies, then explodes for <span style="color:${TC.dmg}">3x weapon damage</span>.`,
    scale:[['Fire DPS',TC.fire],['Spell damage multiplier',TC.shadow],['Expiry explosion',TC.dmg],['Sigil radius is fixed at 110',TC.aoe]],
    syn:[['Curse',TC.shadow,'adds damage and enables the slow'],['Fel Brand',TC.fire,'rewards burning kills'],['Soulstone',TC.item,'scales with Soul Fragment stacks']]},
  abR:{nm:'Bone Shield', key:'R',
    ds:`Conjure <span style="color:${TC.phys}">projectile bone shards</span> orbiting at <span style="color:${TC.aoe}">260 radius</span> for 8s. Each shard hits on contact for <span style="color:${TC.dmg}">1.8x weapon damage</span>.`,
    scale:[['Weapon damage',TC.dmg],['Soul Fragment spell multiplier',TC.shadow],['Projectile count / Multishot',TC.aoe],['Projectile speed / orbit speed',TC.cd],['Cooldown reduction',TC.cd]],
    syn:[['Curse',TC.shadow,'cursed targets take 35% more shard damage'],['Multishot',TC.aoe,'adds extra orbiting bone shards'],['Quickened Bolts',TC.cd,'spins the shield faster'],['Soul Harvest',TC.shadow,'soul stacks increase spell/shard pressure']]},
  abS:{nm:'Shadow Step', key:'SPACE',
    ds:`Blink up to <span style="color:${TC.move}">500 units</span> toward the cursor and gain <span style="color:${TC.aoe}">0.25s iframes</span> on arrival.`,
    scale:[['Blink range fixed at 500',TC.move],['Cooldown reduction',TC.cd],['Iframes fixed at 0.25s',TC.aoe]],
    syn:[['Dark Covenant',TC.cd,'shortens the blink cooldown'],['Ranged builds',TC.shadow,'keeps spacing while bolts and sigils work']]}
};
function synergyHtml(rows){
  if(!rows || !rows.length) return '';
  return `<div class="tsy"><span class="tlabel">Synergy</span>${rows.map(r=>`<div><span style="color:${r[1]}">${r[0]}</span>: ${r[2]}</div>`).join('')}</div>`;
}
function showTooltip(html){
  const tip = $('tooltip');
  tip.innerHTML = html;
  tip.style.display = 'block';
  moveTooltip();
}
function moveTooltip(){
  const tip = $('tooltip');
  if(tip.style.display!=='block') return;
  const pad = 16;
  const x = Math.min(mouse.x + 18, innerWidth - tip.offsetWidth - pad);
  const y = Math.min(mouse.y + 18, innerHeight - tip.offsetHeight - pad);
  tip.style.left = Math.max(pad,x) + 'px';
  tip.style.top = Math.max(pad,y) + 'px';
}
function hideTooltip(){ $('tooltip').style.display = 'none'; }
const WARLOCK_ABILITY_ICONS = {
  abQ:`<svg class="wl-ico wl-curse" viewBox="0 0 24 24" fill="none">
    <defs><radialGradient id="wlCurseG" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#f0c8ff"/><stop offset=".42" stop-color="#c840ff"/><stop offset="1" stop-color="#220030"/></radialGradient></defs>
    <path d="M12 2.4l7.8 4.5v9L12 20.4l-7.8-4.5v-9L12 2.4z" fill="url(#wlCurseG)" stroke="#e8a0ff" stroke-width="1.2"/>
    <path d="M5.2 11.9c3.1-4.3 10.5-4.3 13.6 0-3.1 4.4-10.5 4.4-13.6 0z" fill="#13001d" stroke="#ffc8ff" stroke-width="1.2"/>
    <circle cx="12" cy="12" r="3.1" fill="#c840ff" stroke="#fff0ff" stroke-width="1"/>
    <circle cx="12" cy="12" r="1.25" fill="#08000d"/>
    <path d="M12 4.6v2.2M12 17.2v2.2M4.6 8.5l2 1.1M17.4 14.4l2 1.1M19.4 8.5l-2 1.1M6.6 14.4l-2 1.1" stroke="#ff80ff" stroke-width="1" stroke-linecap="round"/>
  </svg>`,
  abE:`<svg class="wl-ico wl-sigil" viewBox="0 0 24 24" fill="none">
    <defs><radialGradient id="wlSigilG" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#ff6020"/><stop offset="1" stop-color="#250500"/></radialGradient></defs>
    <circle cx="12" cy="12" r="8.8" fill="url(#wlSigilG)" stroke="#ffd75c" stroke-width="1.3"/>
    <circle cx="12" cy="12" r="5.2" fill="none" stroke="#2b0800" stroke-width="1.5"/>
    <path d="M12 4.4v4.2M12 15.4v4.2M4.4 12h4.2M15.4 12h4.2M6.6 6.6l3 3M14.4 14.4l3 3M17.4 6.6l-3 3M9.6 14.4l-3 3" stroke="#fff0a0" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M12 8.5c2 1.7 3.1 3.3 3.1 5.1 0 1.8-1.3 3-3.1 3s-3.1-1.2-3.1-3c0-1.2.8-2.2 1.8-3.2-.1 1.5.4 2.4 1.5 2.8.9-1.2.4-2.8-.2-4.7z" fill="#fff5b8" stroke="#2b0800" stroke-width=".55"/>
  </svg>`,
  abR:`<svg class="wl-ico wl-bones" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8.5" fill="rgba(20,15,24,.55)" stroke="#9adcff" stroke-width="1.1" stroke-dasharray="2.2 1.8"/>
    <path d="M12 5.1l1.4 3.1L12 10.7l-1.4-2.5L12 5.1zM18.8 11.9l-3 1.6-2.5-1.3 2.5-1.5 3 .2zM12 18.9l-1.4-3.1 1.4-2.5 1.4 2.5L12 18.9zM5.2 12.1l3-1.6 2.5 1.3-2.5 1.5-3-.2z" fill="#d8d0ba" stroke="#fff3d0" stroke-width=".75"/>
    <path d="M12 8.6c1.6 0 2.9 1.2 2.9 2.9 0 1.7-1.3 3.1-2.9 3.1s-2.9-1.4-2.9-3.1c0-1.7 1.3-2.9 2.9-2.9z" fill="#2b2530" stroke="#d8d0ba" stroke-width="1"/>
    <path d="M10.4 11.2h.01M13.6 11.2h.01M10.8 13.2h2.4" stroke="#d8d0ba" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  abS:`<svg class="wl-ico wl-step" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="wlStepG" x1="4" y1="12" x2="21" y2="12"><stop offset="0" stop-color="#260035"/><stop offset=".55" stop-color="#b040ff"/><stop offset="1" stop-color="#b8ffb0"/></linearGradient></defs>
    <path d="M4.5 12c0-4.6 3.2-8.3 7.1-8.3 2.5 0 4.8 1.6 6 4.1-1.5-.9-3-.9-4.2-.2-1.9 1.1-2.7 3.9-1.3 6 1 1.5 2.7 2.1 4.4 1.9-1.3 2.9-3.9 4.8-6.8 4.8-2.9 0-5.2-3.7-5.2-8.3z" fill="url(#wlStepG)" stroke="#e8a0ff" stroke-width="1.1"/>
    <path d="M5 12h9.5M11 8l4.5 4-4.5 4M15.2 6.3c2.4.5 4 2.3 4 5.7 0 3.4-1.6 5.2-4 5.7" stroke="#f2d8ff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.2 15.2c-.9.1-1.8.4-2.5.9M9 8.8c-.9-.1-1.7-.4-2.3-.9" stroke="#80ffd8" stroke-width="1" stroke-linecap="round"/>
  </svg>`
};
let _abilityDefaultIcons = null;
function updateAbilityIcons(charId){
  if(!_abilityDefaultIcons){
    _abilityDefaultIcons = {};
    ['abQ','abE','abR','abS'].forEach(id=>{
      const svg = $(id) && $(id).querySelector('svg');
      if(svg) _abilityDefaultIcons[id] = svg.outerHTML;
    });
  }
  const iconSet = charId === 'warlock' ? WARLOCK_ABILITY_ICONS : _abilityDefaultIcons;
  ['abQ','abE','abR','abS'].forEach(id=>{
    const el = $(id);
    const svg = el && el.querySelector('svg');
    if(!el || !svg || !iconSet[id]) return;
    svg.outerHTML = iconSet[id];
    el.classList.toggle('warlock-ab', charId === 'warlock');
  });
}
function bindAbilityTooltips(){
  for(const id in ABILITY_INFO){
    const el = $(id);
    el.onmouseenter = ()=>showTooltip(abilityTooltipHtml(id));
    el.onmousemove = moveTooltip;
    el.onmouseleave = hideTooltip;
  }
  // Passive slot tooltip
  const abP=$('abP');
  if(abP){
    abP.onmouseenter = ()=>showTooltip(
      `<div class="tnm">Soul Harvest<span class="tlv">PASSIVE</span></div>` +
      `<div class="tds">Enemies dying while <span style="color:#ff6020">Burning</span> or <span style="color:#c840ff">Cursed</span> have a 0.8% chance to drop a Soul Fragment. Each stack increases DoT damage by 1%.</div>` +
      `<div class="tsc">Max <span style="color:#ff80ff">30 stacks</span></div>`
    );
    abP.onmouseenter = ()=>showTooltip(passiveTooltipHtml());
    abP.onmousemove = moveTooltip;
    abP.onmouseleave = hideTooltip;
  }
}
function passiveTooltipHtml(){
  const p = G && G.player;
  const stacks = p ? (p.soulStacks||0) : 0;
  const perStack = p && p.soulDoubleDot ? 2 : 1;
  const stone = p && p.soulstone ? p.soulstone : 0;
  const total = stacks * (perStack + stone);
  const current = p ? `<div class="tcur"><span class="tlabel">Current</span>${stacks}/30 souls, +${total}% Warlock spell pressure${stone?` (${stone}% from Soulstone per soul)`:''}</div>` : '';
  return `<div class="tnm">Soul Harvest<span class="tlv">PASSIVE</span></div>` +
    `<div class="tds">Enemies dying while <span style="color:#ff6020">Burning</span> or <span style="color:#c840ff">Cursed</span> can drop Soul Fragments. Souls scale Warlock spell pressure.</div>` +
    current +
    `<div class="tsc"><span class="tlabel">Scales</span><span style="color:#c840ff">Soul stacks</span> / <span style="color:#b98aff">Soulstone</span> / <span style="color:#ff80ff">Soul Glutton</span></div>` +
    `<div class="tsy"><span class="tlabel">Synergy</span><div><span style="color:#c840ff">Curse</span>: enables soul drops from more kills.</div><div><span style="color:#ff6020">Burning Sigil</span>: creates burning kills for Soul Harvest.</div></div>`;
}
function abilityTooltipHtml(id){
  const wl = (selectedChar==='warlock') || (G && G.charClass==='warlock');
  const a = (wl ? WARLOCK_ABILITY_DETAILS : ABILITY_DETAILS)[id] || (wl ? WARLOCK_ABILITY_INFO : ABILITY_INFO)[id];
  if(!a) return '';
  let current = '';
  const p = G && G.player;
  if(p){
    if(!wl){
      if(id==='abR'){
        const tick = whirlwindTickTime(p);
        const spins = p.ww && p.ww.spins ? p.ww.spins : 4;
        const dmg  = Math.round(p.baseDmg*1.2*p.dmgMul);
        current = `<div class="tcur"><span class="tlabel">Current</span><span style="color:#9adcff">${spins} spins</span>, ${dmg} dmg/spin, ${(spins*tick).toFixed(2)}s total, ${tick.toFixed(2)}s per spin, CD <span style="color:#7cf5ff">${p.ww.cdMax.toFixed(1)}s</span></div>`;
      } else if(id==='abE'){
        const slamR = Math.round(230*p.reach*(p.itemStats&&p.itemStats.slamRadius||1));
        const dmg   = Math.round(p.baseDmg*2.2*p.dmgMul);
        current = `<div class="tcur"><span class="tlabel">Current</span><span style="color:#d9c38a">${slamR} radius</span>, <span style="color:#ff9a5c">${dmg} damage</span>, CD <span style="color:#7cf5ff">${p.slam&&p.slam.cdMax?p.slam.cdMax.toFixed(1):7}s</span></div>`;
      } else if(id==='abQ'){
        const left = p.fury&&p.fury.active>0 ? `, <span style="color:#bff5b0">${p.fury.active.toFixed(1)}s active</span>` : '';
        current = `<div class="tcur"><span class="tlabel">Current</span>+22% speed for <span style="color:#bff5b0">5s</span>${left}, CD <span style="color:#7cf5ff">${p.fury&&p.fury.cdMax?p.fury.cdMax.toFixed(1):12}s</span></div>`;
      } else if(id==='abS'){
        const dmg = Math.round(p.baseDmg*2.0*p.dmgMul);
        const impact = p.chargeImpact ? `<span style="color:#ff9a5c">${dmg} impact damage</span>, ` : '';
        current = `<div class="tcur"><span class="tlabel">Current</span>${impact}<span style="color:#ffd75c">1s stun</span>, CD <span style="color:#7cf5ff">${p.dash&&p.dash.cdMax?p.dash.cdMax.toFixed(1):8}s</span></div>`;
      }
    } else {
      if(id==='abQ'){
        const cdur = 6+(p.curseBonusDur||0);
        current = `<div class="tcur"><span class="tlabel">Current</span>radius <span style="color:#a060ff">780</span>, duration <span style="color:#7cf5ff">${cdur}s</span>, +25% bolt/sigil damage, +35% Bone Shield damage, CD <span style="color:#7cf5ff">${p.wlQ&&p.wlQ.cdMax?p.wlQ.cdMax.toFixed(1):10}s</span></div>`;
      } else if(id==='abE'){
        const soulMul = typeof warlockSoulDamageMul === 'function' ? warlockSoulDamageMul(p) : (1+(p.soulStacks||0)*0.01);
        const dps = Math.round(22*p.dmgMul*soulMul);
        const dmg = Math.round(p.baseDmg*3.0*p.dmgMul);
        current = `<div class="tcur"><span class="tlabel">Current</span><span style="color:#ff6030">${dps} fire DPS</span>, explosion <span style="color:#ffd75c">${dmg} dmg</span>, CD <span style="color:#7cf5ff">${p.wlE&&p.wlE.cdMax?p.wlE.cdMax.toFixed(1):8}s</span></div>`;
      } else if(id==='abR'){
        const soulMul = typeof warlockSoulDamageMul === 'function' ? warlockSoulDamageMul(p) : (1+(p.soulStacks||0)*0.01);
        const dmg = Math.round(p.baseDmg*1.8*p.dmgMul*soulMul);
        const shards = typeof boneShieldShardCount === 'function' ? boneShieldShardCount(p) : 7+(p.extraProjectiles||0);
        const orbit = typeof boneShieldOrbitSpeed === 'function' ? boneShieldOrbitSpeed(p) : 1.45*(p.projectileSpeed||1);
        const left = p.boneShield&&p.boneShield.active>0 ? `, <span style="color:#c8c0a0">${p.boneShield.active.toFixed(1)}s left</span>` : '';
        current = `<div class="tcur"><span class="tlabel">Current</span><span style="color:#d4cfc0">${dmg} shard dmg</span>, <span style="color:#9adcff">${shards} projectile shards</span>, orbit <span style="color:#7cf5ff">${orbit.toFixed(2)} rad/s</span>, 0.55s/enemy hit lockout, CD <span style="color:#7cf5ff">${p.boneShield&&p.boneShield.cdMax?p.boneShield.cdMax.toFixed(1):16}s</span>${left}</div>`;
      } else if(id==='abS'){
        current = `<div class="tcur"><span class="tlabel">Current</span>blink range <span style="color:#b8ffb0">500</span>, 0.25s iframes, CD <span style="color:#7cf5ff">${p.dash&&p.dash.cdMax?p.dash.cdMax.toFixed(1):3.5}s</span></div>`;
      }
    }
  }
  return `<div class="tnm">${a.nm}<span class="tlv">${a.key}</span></div><div class="tds">${a.ds}</div>${current}<div class="tsc"><span class="tlabel">Scales</span>${scaleHtml(a.scale)}</div>${synergyHtml(a.syn)}`;
}

function toMenu(){
  if(G && G.runLog && !G.runLog.endedAt && typeof runLogFinish === 'function') runLogFinish('abandoned');
  state=ST.MENU; G=null; showHUD(false); openScreen('menu');
}

function renderTalents(){
  $('talentCores').textContent = `◆ ${meta.voidcores} VOIDCORES`;
  const refund = talentRefundValue();
  const refundEl = $('talentRefund');
  if(refundEl) refundEl.textContent = `Refund: ${refund} Voidcore${refund===1?'':'s'}`;
  const resetBtn = $('btnResetTalents');
  if(resetBtn) resetBtn.classList.toggle('disabled', refund<=0);
  const grid = $('tgrid'); grid.innerHTML='';
  TALENTS.forEach(t=>{
    const rk = talentRanks[t.id];
    const d = document.createElement('div');
    const maxed = rk>=t.max, afford = meta.voidcores>=t.cost;
    d.className = 'talent' + (maxed?' maxed':(!afford?' locked':''));
    d.innerHTML = `<div class="nm">${t.ic} ${t.nm}</div><div class="ds">${t.ds}</div>
      <div class="rk">Rank ${rk} / ${t.max}</div>
      <div class="cost">${maxed?'MAXED':'Cost: '+t.cost+' ◆'}</div>`;
    d.onclick = ()=>{
      if(maxed || !afford) return;
      meta.voidcores -= t.cost; talentRanks[t.id]++;
      renderTalents();
    };
    grid.appendChild(d);
  });
}

function talentRefundValue(){
  return TALENTS.reduce((sum, t)=>sum + (talentRanks[t.id] || 0) * t.cost, 0);
}

function resetTalents(){
  const refund = talentRefundValue();
  if(refund<=0) return;
  const ok = confirm(`Reset all talents and refund ${refund} Voidcore${refund===1?'':'s'}?`);
  if(!ok) return;
  TALENTS.forEach(t=>{ talentRanks[t.id] = 0; });
  meta.voidcores += refund;
  renderTalents();
}

function updateItemsHUD(){
  if(!G) return;
  const p = G.player;
  // Item slots
  const el = $('items');
  if(el){
    el.innerHTML = '';
    for(let i=0;i<ITEM_SLOTS;i++){
      const item = G.items[i];
      const slot = document.createElement('div');
      slot.className = 'islot' + (item?' filled':'');
      if(item){
        const def = getItemDef(item.id);
        if(def){
          slot.innerHTML = `${def.svg}<div class="ilv">${Array.from({length:ITEM_MAX},(_,j)=>`<i class="${j<item.rank?'on':''}"></i>`).join('')}</div>`;
          slot.onmouseenter = ()=>{ showTooltip(itemTooltipHtml(def,item.rank,false)); };
          slot.onmousemove = moveTooltip;
          slot.onmouseleave = hideTooltip;
        } else {
          slot.innerHTML = '<div class="empty">?</div>';
        }
      } else {
        slot.innerHTML = '<div class="empty">+</div>';
      }
      el.appendChild(slot);
    }
  }
  // Stat boxes
  const sv = $('statview');
  if(sv){
    const baseMove = 250;
    const dmg   = Math.round((p.dmgMul - 1)*100);
    const spd   = Math.round((p.atkSpd - 1)*100);
    const reach = Math.round((p.reach  - 1)*100);
    const crit  = Math.round(p.crit*100);
    const move  = Math.round((p.speed/baseMove - 1)*100);
    const ls    = Math.round(p.lifesteal*100);
    const pickR = Math.round(p.pickupRange || p.xpPickupRange || 18);
    const proj  = Math.round(((p.projectileSpeed || 1) - 1)*100);
    const stats = [
      {k:'DMG',   v:(dmg>=0?'+':'')+dmg+'%',   c:dmg>0?'#ff9a5c':'#a99a7c'},
      {k:'A.SPD', v:(spd>=0?'+':'')+spd+'%',   c:spd>0?'#7cc4ff':'#a99a7c'},
      {k:'REACH', v:(reach>=0?'+':'')+reach+'%',c:reach>0?'#ffd75c':'#a99a7c'},
      {k:'CRIT',  v:crit+'%',                   c:crit>5?'#ff5a6e':'#a99a7c'},
      {k:'MOVE',  v:(move>=0?'+':'')+move+'%',  c:move>0?'#b0ff9a':'#a99a7c'},
      {k:'PICK',  v:pickR,                      c:pickR>34?'#7ee6ff':'#a99a7c'},
    ];
    if(proj>0) stats.push({k:'P.SPD', v:'+'+proj+'%', c:'#9adcff'});
    if(ls>0) stats.push({k:'STEAL', v:ls+'%', c:'#5ee06a'});
    sv.innerHTML = stats.map(s=>`<div class="statbox"><div class="sk">${s.k}</div><div class="sv" style="color:${s.c}">${s.v}</div></div>`).join('');
  }
}

let announceT = 0;
function announce(txt, sub){
  const el = $('announce');
  el.innerHTML = txt + (sub?`<div style="font-size:20px;letter-spacing:4px;color:#cabfa4;margin-top:4px">${sub}</div>`:'');
  el.style.opacity = 1; announceT = 2.4;
}
/* =========================================================
   FLOATING TEXT / PARTICLES
========================================================= */
function ftext(x,y,txt,color,size=13,life=0.9){
  G.texts.push({x:x+rand(-8,8), y, txt, color, size, life, maxlife:life, vy:-46});
}
function burst(x,y,color,n=8,spd=160,life=0.5,size=3){
  for(let i=0;i<n;i++){
    const a=rand(0,TAU), s=rand(spd*0.3,spd);
    const ttl=rand(life*0.5,life);
    G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:ttl,maxlife:ttl,color,size:rand(size*0.5,size)});
  }
}
function shake(mag,t){ shakeMag=Math.max(shakeMag,mag); shakeT=Math.max(shakeT,t); }
function whirlwindTickTime(p){
  const scale = 1 + Math.max(0, p.atkSpd-1)*0.65;
  const tickMax = p.ww && p.ww.tickMax ? p.ww.tickMax : 0.18;
  return Math.max(0.09, tickMax / scale);
}

/* =========================================================
   AUDIO - dark fantasy weapon SFX
========================================================= */
const audio = { ctx:null, master:null, noise:null };
function unlockAudio(){
  if(audio.ctx){
    if(audio.ctx.state==='suspended') audio.ctx.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if(!AudioCtx) return;
  const ctx = audio.ctx = new AudioCtx();
  audio.master = ctx.createGain();
  audio.master.gain.value = 0.28;
  audio.master.connect(ctx.destination);
  audio.noise = makeNoiseBuffer(ctx);
}
function makeNoiseBuffer(ctx){
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<len;i++) data[i] = Math.random()*2-1;
  return buf;
}
function audioGain(peak, t, a, d){
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t+a);
  g.gain.exponentialRampToValueAtTime(0.0001, t+a+d);
  return g;
}
function noiseBurst({t, dur, gain, freq, q=0.7, type='bandpass', rate=1}){
  const src = audio.ctx.createBufferSource();
  const filter = audio.ctx.createBiquadFilter();
  const amp = audioGain(gain, t, dur*0.12, dur*0.88);
  src.buffer = audio.noise;
  src.playbackRate.value = rate;
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq*0.45), t+dur);
  filter.Q.value = q;
  src.connect(filter); filter.connect(amp); amp.connect(audio.master);
  src.start(t); src.stop(t+dur);
}
function toneSweep({t, dur, gain, from, to, type='triangle'}){
  const osc = audio.ctx.createOscillator();
  const amp = audioGain(gain, t, dur*0.08, dur*0.92);
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t+dur);
  osc.connect(amp); amp.connect(audio.master);
  osc.start(t); osc.stop(t+dur);
}
function playSfx(name, power=1){
  if(!audio.ctx) return;
  const t = audio.ctx.currentTime;
  if(name==='slash'){
    noiseBurst({t, dur:0.16, gain:0.18*power, freq:1200, q:0.8, rate:1.15});
    toneSweep({t:t+0.015, dur:0.09, gain:0.045*power, from:520, to:170});
  } else if(name==='cleave'){
    noiseBurst({t, dur:0.24, gain:0.26*power, freq:850, q:0.65, rate:0.82});
    toneSweep({t, dur:0.16, gain:0.075*power, from:240, to:75, type:'sawtooth'});
    toneSweep({t:t+0.03, dur:0.14, gain:0.035*power, from:95, to:45, type:'sine'});
  } else if(name==='bladeHit'){
    noiseBurst({t, dur:0.08, gain:0.12*power, freq:1900, q:1.1, rate:1.35});
    toneSweep({t, dur:0.08, gain:0.05*power, from:720, to:260});
  } else if(name==='bladeCrit'){
    toneSweep({t, dur:0.18, gain:0.075*power, from:1180, to:410, type:'square'});
    noiseBurst({t:t+0.01, dur:0.09, gain:0.1*power, freq:2600, q:1.4, rate:1.6});
  }
}

/* =========================================================
   UPDATE
========================================================= */
let lastT = performance.now();
function update(dt){
  const p = G.player;
  G.t += dt;
  if(G.screenFx && G.screenFx.nukeGray>0){
    G.screenFx.nukeGray = Math.max(0, G.screenFx.nukeGray - dt*1.8);
  }

  /* ---- waves ---- */
  if(G.waveState==='inter'){
    G.interT -= dt;
    if(G.interT<=0){
      startWave(Math.min(G.wave+1, getFinalWave()));
    }
  } else if(G.waveState==='spawn'){
    G.waveT -= dt;
    G.waveElapsed += dt;
    G.spawnT -= dt;
    const capRoom = Math.max(0, G.maxEnemies - G.enemies.length);
    if(G.toSpawn>0 && capRoom>0 && G.spawnT<=0){
      const spawnRate = typeof devTools !== 'undefined' ? devTools.spawnRate : 1;
      G.spawnT = waveSpawnInterval(G.wave) / Math.max(0.25, spawnRate);
      const burstCount = typeof waveSpawnBurstCount === 'function' ? waveSpawnBurstCount(G.wave) : (G.wave >= 20 ? 2 : 1);
      const toSpawnNow = Math.min(burstCount, G.toSpawn, capRoom);
      for(let bi=0; bi<toSpawnNow; bi++){
        let plan = typeof chooseDirectedWaveSpawn === 'function' ? chooseDirectedWaveSpawn(G.waveDirector) : null;
        if(!plan){
          let pool = typeof ETYPES !== 'undefined' ? Object.keys(ETYPES).filter(t=>typeof mobUnlocked !== 'function' || mobUnlocked(t)) : ['imp','grunt'];
          if(typeof filterWavePoolByDirector === 'function') pool = filterWavePoolByDirector(pool, G.waveDirector);
          if(!pool.length && typeof ETYPES !== 'undefined') pool = Object.keys(ETYPES).filter(t=>typeof mobUnlocked !== 'function' || mobUnlocked(t));
          const type = pick(pool);
          plan = {type, elite:false};
        }
        spawnEnemy(plan.type, plan.elite, plan);
        if(typeof recordDirectedWaveSpawn === 'function') recordDirectedWaveSpawn(plan.type, G.waveDirector);
        G.toSpawn--;
      }
    }
    const earlyClear = G.waveElapsed>=EARLY_CLEAR_MIN && G.enemies.length===0;
    const timedOut = G.waveT<=0;
    if(G.wave>=getFinalWave()){
      if(waveComplete()){
        victory();
      }
    } else if(earlyClear || timedOut){
      G.waveState='inter'; G.interT = earlyClear ? 3.0 : 1.6;
      G.toSpawn = 0;
      announce(earlyClear ? ('WAVE '+G.wave+' CLEARED') : ('WAVE '+G.wave+' SURVIVED'), earlyClear?'catch your breath':'next wave incoming');
      p.hp = Math.min(p.maxhp, p.hp + p.maxhp*(earlyClear?0.10:0.06));
    }
  }

  /* ---- player movement ---- */
  let mx=0,my=0;
  if(keys['w'])my--; if(keys['s'])my++; if(keys['a'])mx--; if(keys['d'])mx++;
  const mlen = Math.hypot(mx,my)||1;
  p.facing = Math.atan2(mouse.y - (p.y-G.cam.y), mouse.x - (p.x-G.cam.x));

  const furyMs = p.fury.active>0?1.22:1;
  if(p.dash.active>0){
    p.dash.active -= dt;
    p.x += p.dash.dx*dt; p.y += p.dash.dy*dt;
    if(Math.random()<0.7) G.parts.push({x:p.x+rand(-10,10),y:p.y+rand(-10,10),vx:0,vy:0,life:0.3,color:'#bff5b0',size:4});
    if(Math.random()<0.55) G.afterimages.push({x:p.x,y:p.y,facing:p.facing,alpha:0.55,life:0.18,maxlife:0.18,color:'#bff5b0'});
    // charge through enemies — stun them
    for(const e of G.enemies){
      if(dist2(p.x,p.y,e.x,e.y) < (p.r+e.r+6)**2){
        const freshStun = (e.stun || 0) <= 0;
        e.stun = Math.max(e.stun || 0, 1);
        e.atkCd = Math.max(e.atkCd, 0.35);
        e.tele = 0;
        if(freshStun){
          ftext(e.x, e.y-e.r-18, 'STUN', '#ffd75c', 12, 0.55);
          if(p.chargeImpact){
            const impDmg = p.baseDmg * 2.0 * p.dmgMul;
            hitEnemy(e, impDmg, Math.random()<p.crit, Math.atan2(e.y-p.y,e.x-p.x), 200, 'physical', 'skeleton.charge');
            p.iframes = Math.max(p.iframes, 0.3);
          }
        }
      }
    }
  } else {
    const slowWhileSwing = p.swing?0.55:1;
    p.x += mx/mlen * p.speed * furyMs * slowWhileSwing * dt;
    p.y += my/mlen * p.speed * furyMs * slowWhileSwing * dt;
    if(mx||my){ p.step += dt*10; p.moveAngle = Math.atan2(my, mx); }
  }
  // arena bounds
  const pr = Math.hypot(p.x,p.y);
  const _ar=getArenaR(); if(pr > _ar - p.r){ const a=Math.atan2(p.y,p.x); p.x=Math.cos(a)*(_ar-p.r); p.y=Math.sin(a)*(_ar-p.r); }

  /* ---- abilities ---- */
  p.swingCd -= dt; p.comboReset -= dt;
  if(p.comboReset<=0 && !p.swing) p.combo=0;
  p.ww.cd-=dt; p.dash.cd-=dt; p.fury.cd-=dt; p.slam.cd-=dt;
  p.iframes-=dt; p.hurtT-=dt;
  if(p.fury.active>0) p.fury.active-=dt;

  // Character ability dispatch — each class handles its own abilities
  if(G.charClass==='warlock') updateWarlockAbilities(dt);
  else updateSkeletonAbilities(dt, mx, my);

  /* ---- enemies ---- */
  // Tick totem buffs
  for(const e of G.enemies){ if(e.totemBuffT>0) e.totemBuffT-=dt; }
  for(const e of [...G.enemies]){
    if(!e.kb) e.kb = {x:0,y:0};
    e.hitFlash = e.hitFlash || 0;
    e.atkCd = e.atkCd || 0;
    e.slow = e.slow || 0;
    e.stun = e.stun || 0;
    e.t += dt; e.hitFlash-=dt; e.atkCd-=dt; e.slow-=dt; e.stun-=dt;
    // knockback decay
    e.x += e.kb.x*dt; e.y += e.kb.y*dt;
    e.kb.x*=Math.pow(0.0008,dt); e.kb.y*=Math.pow(0.0008,dt);
    if(e.stun>0) continue;

    updateEnemyBehavior(e, p, dt);
    // keep inside arena
    const er=Math.hypot(e.x,e.y);
    const _ear=getArenaR(); if(er>_ear-e.r){const a=Math.atan2(e.y,e.x);e.x=Math.cos(a)*(_ear-e.r);e.y=Math.sin(a)*(_ear-e.r);}
    // gentle separation
    for(const o of G.enemies){
      if(o===e) continue;
      const ddx=e.x-o.x,ddy=e.y-o.y,dd=Math.hypot(ddx,ddy);
      const min=(e.r+o.r)*0.85;
      if(dd>0&&dd<min){ const push=(min-dd)*0.5; e.x+=ddx/dd*push*dt*8; e.y+=ddy/dd*push*dt*8; }
    }
  }

  /* ---- wolf pet ---- */
  if(G.pet){
    const w = G.pet;
    const p = G.player;
    w.t += dt;
    w.atkCd = Math.max(0, w.atkCd - dt);

    // find nearest ranged enemy
    let nearest = null, nearDist = Infinity;
    for(const e of G.enemies){
      const isRanged = e.ranged || e.role==='ranged' || e.role==='ranged_poison' || e.role==='caster' || (typeof mobHasTag==='function' && mobHasTag(e.type,'ranged'));
      if(!isRanged || e.boss) continue;
      const d = dist2(w.x, w.y, e.x, e.y);
      if(d < nearDist){ nearDist = d; nearest = e; }
    }
    nearDist = Math.sqrt(nearDist);

    if(nearest && nearDist < w.range){
      // chase target
      w.state = 'chase';
      w.target = nearest;
      const dx = nearest.x - w.x, dy = nearest.y - w.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      w.angle = Math.atan2(dy, dx);
      if(d > nearest.r + 18){
        w.x += dx/d * w.spd * dt;
        w.y += dy/d * w.spd * dt;
      }
      // cleave attack when in range
      if(d <= w.cleavR && w.atkCd <= 0){
        w.atkCd = w.atkCdMax;
        for(const e of [...G.enemies]){
          const isRanged = e.ranged || e.role==='ranged' || e.role==='ranged_poison' || e.role==='caster' || (typeof mobHasTag==='function' && mobHasTag(e.type,'ranged'));
          if(!isRanged || e.boss) continue;
          if(dist2(w.x, w.y, e.x, e.y) <= w.cleavR * w.cleavR){
            hitEnemy(e, w.dmg, false, Math.atan2(e.y-w.y, e.x-w.x), 80, 'physical', 'talent.wolf');
          }
        }
        burst(w.x, w.y, '#c8e0ff', 10, 180, 0.4, 3);
        G.zones.push({x:w.x, y:w.y, r:w.cleavR, life:0.22, maxlife:0.22, color:'180,210,255', type:'slam'});
      }
    } else {
      // orbit player loosely
      w.state = 'follow';
      w.target = null;
      const orbitR = 90, orbitSpd = 1.4;
      const targetX = p.x + Math.cos(w.t * orbitSpd) * orbitR;
      const targetY = p.y + Math.sin(w.t * orbitSpd) * orbitR;
      const dx = targetX - w.x, dy = targetY - w.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      if(d > 12){
        w.x += dx/d * Math.min(d*4, w.spd*0.7) * dt;
        w.y += dy/d * Math.min(d*4, w.spd*0.7) * dt;
        w.angle = Math.atan2(dy, dx);
      }
    }
  }

  /* ---- projectiles ---- */
  for(const pr of [...G.projectiles]){
    pr.x+=pr.vx*dt; pr.y+=pr.vy*dt; pr.life-=dt;
    if(Math.random()<0.5) G.parts.push({x:pr.x,y:pr.y,vx:0,vy:0,life:0.25,color:pr.color,size:3});
    if(pr.life<=0){ G.projectiles.splice(G.projectiles.indexOf(pr),1); continue; }
    if(dist2(pr.x,pr.y,p.x,p.y)<(pr.r+p.r)**2){
      damagePlayer(pr.dmg);
      G.projectiles.splice(G.projectiles.indexOf(pr),1);
    }
  }

  /* ---- update parts + texts ---- */
  for(const pa of G.parts){ pa.x+=pa.vx*dt; pa.y+=pa.vy*dt; pa.life-=dt; }
  for(const t of G.texts){ t.y+=t.vy*dt; t.life-=dt; }
  G.texts = G.texts.filter(t=>t.life>0);

  /* ---- pickups ---- */
  for(const pk of [...G.pickups]){
    pk.t = (pk.t||0)+dt;
    if(pk.collectDelay>0){ pk.collectDelay-=dt; continue; }
    if((pk.type==='heal'||pk.type==='magnet'||pk.type==='bomb') && pk.life!==undefined){
      pk.life-=dt;
      if(pk.life<=0){ G.pickups.splice(G.pickups.indexOf(pk),1); continue; }
    }
    const pickupRange = pk.type==='xp' ? (p.r+(p.xpPickupRange||18)) : (p.r+18);
    if(dist2(pk.x,pk.y,p.x,p.y) < pickupRange**2){
      if(pk.type==='xp'){
        const base = pk.baseExp||pk.value||0;
        const gained = Math.round(base*p.xpMul);
        p.xp += gained;
        const bonus = gained-base;
        ftext(p.x,p.y-p.r-16,bonus>0?`+${gained} exp (+${bonus})`:`+${gained} exp`,'#7ee6ff',12,0.9);
        burst(pk.x,pk.y,'#5ab4ff',10,180,0.45,3);
        while(p.xp>=p.xpNext){ p.xp-=p.xpNext; queueLevelUp(); }
      } else if(pk.type==='heal'){
        const heal = Math.round(p.maxhp*(pk.healPct||0.15));
        p.hp = Math.min(p.maxhp,p.hp+heal);
        ftext(p.x,p.y-p.r-14,'+'+heal+' hp','#5ee06a',14,1);
        burst(pk.x,pk.y,'#5ee06a',12,200,0.6);
      } else if(pk.type==='magnet'){
        let xpTotal=0;
        G.pickups = G.pickups.filter(xp=>{ if(xp.type!=='xp') return true; xpTotal+=xp.baseExp||xp.value||0; return false; });
        if(xpTotal>0){
          const gained=Math.round(xpTotal*p.xpMul);
          p.xp+=gained;
          ftext(p.x,p.y-p.r-22,'+'+gained+' exp','#ffe066',17,1.8);
          burst(p.x,p.y,'#ffe066',24,280,0.8,5);
          while(p.xp>=p.xpNext){ p.xp-=p.xpNext; queueLevelUp(); }
        }
        G.pickups.splice(G.pickups.indexOf(pk),1);
        continue;
      } else if(pk.type==='bomb'){
        if(typeof triggerNukeBomb==='function') triggerNukeBomb(pk.x,pk.y);
      } else if(pk.type==='soul'){
        p.soulStacks = Math.min(30,(p.soulStacks||0)+1);
        ftext(pk.x,pk.y-16,'+1 SOUL','#c840ff',13,1.2);
        burst(pk.x,pk.y,'#c840ff',6,120,0.4,3);
      }
      G.pickups.splice(G.pickups.indexOf(pk),1);
    }
  }

  /* ---- level-up flourish ---- */
  if(G.lvlAnim>0){
    G.lvlAnim -= dt;
    for(let i=0;i<2;i++){
      G.parts.push({x:p.x+rand(-26,26), y:p.y+rand(-8,18),
        vx:rand(-20,20), vy:-rand(90,200), life:rand(0.35,0.6),
        color: Math.random()<0.5?'#7cc4ff':'#ffd75c', size:rand(2,4)});
    }
  }

  /* ---- open the level-up card screen once the flourish has played ---- */
  if(G.pendingLevels>0 && G.lvlAnim<=0 && state===ST.PLAY && typeof openPowerupSelection==='function'){
    openPowerupSelection();
  }

  /* ---- decay visual arrays ---- */
  for(const o of G.gibs)        { o.x+=o.vx*dt; o.y+=o.vy*dt; o.life-=dt; }
  for(const o of G.zones)       { o.life-=dt; }
  for(const o of G.zaps)        { o.life-=dt; }
  for(const o of G.ruinSlashes) { o.life-=dt; }
  for(const o of G.rings)       { o.life-=dt; }
  for(const o of G.afterimages) { o.life-=dt; }
  G.parts=G.parts.filter(o=>o.life>0);
  G.gibs =G.gibs.filter(o=>o.life>0);
  G.zones=G.zones.filter(o=>o.life>0);
  G.zaps =G.zaps.filter(o=>o.life>0);
  G.ruinSlashes=G.ruinSlashes.filter(o=>o.life>0);
  G.rings=G.rings.filter(o=>o.life>0);
  G.afterimages=G.afterimages.filter(o=>o.life>0);
  if(G.flames){ for(const fl of G.flames) fl.life-=dt; G.flames=G.flames.filter(fl=>fl.life>0); }
  if(G.novas){
    for(const nv of G.novas){
      const prevR = nv.r;
      nv.life -= dt;
      nv.r = nv.maxR * (1 - nv.life/nv.maxlife);
      if(G.charClass==='warlock'){
        for(const e of G.enemies){
          if(nv.hitSet.has(e)) continue;
          const d = Math.hypot(e.x-nv.x, e.y-nv.y);
          if(d <= nv.r+e.r && d >= prevR-e.r){
            nv.hitSet.add(e);
            e.cursed = {dur: nv.curseDur || 6};
            burst(e.x,e.y,'#8020e0',7,160,0.4,3);
            const a=Math.atan2(e.y-nv.y,e.x-nv.x);
            G.zaps.push({x1:nv.x+Math.cos(a)*nv.r,y1:nv.y+Math.sin(a)*nv.r,
              x2:e.x,y2:e.y,life:0.22,maxlife:0.22,color:'#8020e0'});
          }
        }
      }
    }
    G.novas=G.novas.filter(nv=>nv.life>0);
  }
  if(G.killNotifs) { for(const n of G.killNotifs) n.life-=dt; G.killNotifs=G.killNotifs.filter(n=>n.life>0); }

  /* ---- cam follow ---- */
  const p2 = G.player;
  G.cam.x = lerp(G.cam.x, p2.x - W/2, 0.12);
  G.cam.y = lerp(G.cam.y, p2.y - H/2, 0.12);
}
