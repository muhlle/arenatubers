"use strict";
/* =========================================================
   COMBAT
========================================================= */
const CRIT_DAMAGE_MULT = 2.0;

function playerSwing(){
  const p = G.player;
  if(p.swing || p.swingCd>0 || p.ww.active>0 || p.slam.wind>0) return;
  const cleave = p.combo===2;
  p.swing = {
    t:0, dur: (cleave?0.34:0.22)/p.atkSpd,
    cleave, hand: p.combo%2===0?1:-1,   // alternate sword
    hit:false, dir: p.facing,
  };
  playSfx(cleave?'cleave':'slash', cleave?1.05:0.85);
  p.swingCd = (cleave?0.42:0.24)/p.atkSpd;
  p.comboReset = 1.1;
}
function doSwingDamage(sw){
  const p = G.player;
  const range = (sw.cleave?185:160)*p.reach;
  const arc   = sw.cleave?2.6:1.5;
  const dmgBase = p.baseDmg * (sw.cleave?2.5:1.2) * p.dmgMul;
  let candidates = [];
  for(const e of G.enemies){
    const d = Math.hypot(e.x-p.x, e.y-p.y) - e.r;
    if(d > range) continue;
    const a = Math.atan2(e.y-p.y, e.x-p.x);
    if(Math.abs(angDiff(sw.dir, a)) > arc/2) continue;
    candidates.push({e, d});
  }
  if(!candidates.length) return;
  candidates.sort((a,b)=>a.d-b.d);
  const targets = sw.cleave ? candidates : [candidates[0]];   // 2 single-target slashes, 3rd cleaves
  playSfx('bladeHit', sw.cleave?1.15:0.85);
  for(const {e} of targets){
    const crit = Math.random()<p.crit;
    if(crit) playSfx('bladeCrit', 0.85);
    hitEnemy(e, dmgBase*rand(0.92,1.08), crit, sw.dir, sw.cleave?260:140, 'physical', sw.cleave?'skeleton.cleave':'skeleton.slash');
    triggerWeaponItems(e, sw, crit);
  }
  shake(sw.cleave?3:2, 0.08);
}
function hitEnemy(e, dmg, crit, dir, kb, dmgType, source){
  if(crit) dmg *= CRIT_DAMAGE_MULT;
  dmg = Math.round(dmg);
  if(typeof runLogDamageDone === 'function') runLogDamageDone(e, dmg, crit, dmgType, source || 'unknown');
  e.hp -= dmg; e.hitFlash = 0.12;
  e.kb.x += Math.cos(dir)*kb; e.kb.y += Math.sin(dir)*kb;
  const _tc = (typeof DMG_COLORS!=='undefined' && DMG_COLORS[dmgType]) || '#e8dcc8';
  ftext(e.x, e.y-e.r-6, dmg, crit?'#ffd75c':_tc, crit?20:17, 0.7);
  burst(e.x, e.y, '#ff2200', crit?22:10, crit?300:200, 0.45, crit?4:3);
  if(crit){ burst(e.x, e.y, '#ffd75c', 10, 200, 0.3, 2.5); }
  G.rings.push({x:e.x, y:e.y, r:e.r*0.5, maxR:e.r*(crit?4:2.5), life:0.2, maxlife:0.2, color: crit?'255,215,80':'255,60,20'});
  const p = G.player;
  if(p.lifesteal>0){ p.hp = Math.min(p.maxhp, p.hp + dmg*p.lifesteal); }
  if(e.hp<=0) killEnemy(e, dir);
}
/* ---- Kill milestone notification (drawn beside player in world-space) ---- */
function killNotif(txt, color){
  if(!G || !G.killNotifs) return;
  // Replace any previous notif (only one at a time)
  G.killNotifs.length = 0;
  G.killNotifs.push({txt, color:color||'#ff6a6a', life:2.8, maxlife:2.8});
}

function dropEnemyXp(e){
  const baseExp = Math.max(0, Math.round(e.exp || 0));
  G.pickups.push({type:'xp', x:e.x+rand(-12,12), y:e.y+rand(-12,12), t:rand(0,TAU), baseExp, collectDelay:0.5});
}

function killEnemy(e, dir){
  const i = G.enemies.indexOf(e); if(i<0) return;
  const nuked = !!e.nuked;
  G.enemies.splice(i,1);
  G.kills++;
  if(typeof runLogKill === 'function') runLogKill(e);
  const p = G.player;
  dropEnemyXp(e);
  // Kill streak tracking (for HUD kill counter badge)
  const now = G.t;
  if(now - G.lastKillT < 2.8){ G.killStreak++; } else { G.killStreak = 1; }
  G.lastKillT = now;
  // Kill milestones — floating notif beside player
  const k = G.kills;
  if(k===75)       killNotif('75💀 MASSACRE',        '#ff6a6a');
  else if(k===150) killNotif('150💀 GODLIKE',         '#ff9a5c');
  else if(k===250) killNotif('250💀 SLAUGHTERHOUSE',  '#ffe066');
  else if(k>250 && k%100===0) killNotif(k+'💀 UNSTOPPABLE', '#c840ff');
  // Warlock passive — Cursed death: shadow explosion, Soul Harvest drop
  if(!nuked && G.charClass==='warlock'){
    if(e.cursed){
      // Shadow explosion on cursed death
      const explR = 110;
      const explDmg = 28*p.dmgMul;
      burst(e.x,e.y,'#c840ff',20,300,0.65,5);
      burst(e.x,e.y,'#1a0030',10,180,0.4,3);
      G.rings.push({x:e.x,y:e.y,r:e.r,maxR:explR,life:0.28,maxlife:0.28,color:'180,40,255'});
      G.zones.push({x:e.x,y:e.y,r:explR,life:0.22,maxlife:0.22,color:'100,0,200',type:'tele'});
      shake(4,0.1);
      for(const nb of [...G.enemies]){
        if(dist2(e.x,e.y,nb.x,nb.y)<(explR+nb.r)**2){
          hitEnemy(nb,explDmg,false,Math.atan2(nb.y-e.y,nb.x-e.x),120,'shadow','warlock.curse_explosion');
        }
      }
    }
    // Fel Brand: burning enemies explode on death
    if(e.burning && p.felBrand){
      const fbRank = p.felBrand;
      const fbR   = 90 + fbRank*30;
      const fbDmg = (15 + fbRank*12) * p.dmgMul;
      burst(e.x,e.y,'#ff6020',16+fbRank*4,fbR*1.8,0.6,4);
      G.rings.push({x:e.x,y:e.y,r:e.r,maxR:fbR,life:0.22,maxlife:0.22,color:'255,80,20'});
      for(const nb of [...G.enemies]){
        if(nb!==e && dist2(e.x,e.y,nb.x,nb.y)<(fbR+nb.r)**2){
          hitEnemy(nb,fbDmg,false,Math.atan2(nb.y-e.y,nb.x-e.x),100,'fire','item.felbrand');
          setBurning(nb,2,fbDmg*0.3);
        }
      }
    }
    // Soul Harvest: 15% chance on Burning or Cursed kill
    warlockDropSoul(e);
  }
  // HP drops — size/chance based on enemy type
  if(!nuked){
    const healTiers = {
      imp:    {chance:0.15, pct:0.10, size:'sm'},
      bomber: {chance:0.15, pct:0.10, size:'sm'},
      grunt:  {chance:0.07, pct:0.15, size:'md'},
      shaman: {chance:0.07, pct:0.15, size:'md'},
      brute:  {chance:0.04, pct:0.20, size:'lg'},
    };
    const healTier = healTiers[e.type];
    if(healTier && Math.random() < healTier.chance){
      G.pickups.push({type:'heal', healPct:healTier.pct, healSize:healTier.size, x:e.x, y:e.y, t:rand(0,TAU), life:25, maxlife:25});
    }
  }
  if(!nuked && !e.boss){
    // Magnet drop — max 2 per wave
    if((G.waveDrops.magnet||0) < 2 && Math.random() < 0.01){
      G.waveDrops.magnet++;
      G.pickups.push({type:'magnet', x:e.x, y:e.y, t:rand(0,TAU)});
    }
    // Bomb drop — max 1 per wave, kills all enemies on pickup
    if((G.waveDrops.bomb||0) < 1 && Math.random() < 0.005){
      G.waveDrops.bomb++;
      G.pickups.push({type:'bomb', x:e.x, y:e.y, t:rand(0,TAU)});
    }
  }
  if(!nuked){
    burst(e.x, e.y, e.color, 14, 240, 0.7, 4);
    burst(e.x, e.y, '#7e1d12', 10, 180, 0.6, 4);
  }
  if(e.boss){
    $('bossbar').style.display='none'; G.boss=null;
    shake(16,0.5);
    // voidcore drops — 75%, then 24% for a second
    let drops = 0;
    if(Math.random()<0.75){ drops++; if(Math.random()<0.24) drops++; }
    if(drops>0){
      meta.voidcores += drops; G.coresThisRun += drops;
      ftext(e.x, e.y-40, `◆ +${drops} VOIDCORE${drops>1?'S':''}`, '#b98aff', 18, 2.2);
      burst(e.x, e.y, '#9b59f5', 34, 320, 1.1, 5);
      announce(`◆ VOIDCORE x${drops}`, 'spend it in Talents');
    } else {
      ftext(e.x, e.y-40, 'no core...', '#776a8c', 14, 1.6);
    }
  }
  if(!nuked && e.type==='bomber' && e.fuse<0){ explode(e.x,e.y,90,e.dmg*0.6,true); }
  // Plague Crawler: poison pool on death
  if(!nuked && e.type==='plague_crawler'){
    G.zones.push({x:e.x,y:e.y,r:70,life:4.5,maxlife:4.5,color:'60,160,40',type:'poison',dmg:e.dmg*0.5,tickCd:0,sourceType:e.type,sourceAttack:'death poison'});
    burst(e.x,e.y,'#40c020',14,180,0.5,4);
  }
  // Goldgut: scatter XP coins on death
  if(!nuked && e.type==='goldgut'){
    for(let i=0;i<5;i++) G.pickups.push({type:'xp',x:e.x+rand(-40,40),y:e.y+rand(-40,40),baseExp:8,t:rand(0,TAU),life:8,collectDelay:0.5});
    burst(e.x,e.y,'#ffd700',18,240,0.6,4);
  }
}

function nukeEnemyAsh(e){
  const baseR = Math.max(24, e.r || 18);
  ftext(e.x, e.y-baseR-18, '☠ NUKED', '#ff3030', 15, 1.25);
  G.rings.push({x:e.x, y:e.y, r:baseR*0.4, maxR:baseR*4.2, life:0.38, maxlife:0.38, color:'255,70,20'});
  G.zones.push({x:e.x, y:e.y, r:baseR*3.2, life:0.28, maxlife:0.28, color:'255,80,20', type:'flash'});

  for(let i=0;i<18;i++){
    const a = rand(0,TAU), s = rand(70,260);
    G.parts.push({
      x:e.x+rand(-baseR*0.35,baseR*0.35), y:e.y+rand(-baseR*0.45,baseR*0.2),
      vx:Math.cos(a)*s*0.7, vy:Math.sin(a)*s*0.35-rand(80,220),
      life:rand(0.55,1.05), color:Math.random()<0.72?'#26211d':'#4a4036', size:rand(2,5)
    });
  }
  for(let i=0;i<8;i++){
    const a = rand(0,TAU), s = rand(80,210);
    G.parts.push({
      x:e.x+rand(-baseR*0.25,baseR*0.25), y:e.y+rand(-baseR*0.35,baseR*0.15),
      vx:Math.cos(a)*s*0.35, vy:Math.sin(a)*s*0.25-rand(60,150),
      life:rand(0.35,0.7), color:Math.random()<0.5?'#ff4a16':'#ffb13a', size:rand(2,4)
    });
  }
}

function triggerNukeBomb(x, y){
  const victims = [...G.enemies];
  if(!G.screenFx) G.screenFx = {};
  if(!victims.length){
    shake(12,0.28);
    G.screenFx.nukeGray = Math.max(G.screenFx.nukeGray || 0, 0.42);
    ftext(x, y-36, '☠ NUKED', '#ff3030', 18, 1.2);
    return;
  }

  G.screenFx.nukeGray = Math.max(G.screenFx.nukeGray || 0, 0.5);
  shake(22,0.45);
  G.rings.push({x, y, r:70, maxR:720, life:0.45, maxlife:0.45, color:'210,210,210'});
  G.zones.push({x, y, r:620, life:0.28, maxlife:0.28, color:'220,220,220', type:'flash'});

  for(const e of victims){
    nukeEnemyAsh(e);
    if(typeof runLogDamageDone === 'function') runLogDamageDone(e, e.hp || e.maxHp || 0, false, 'fire', 'pickup.bomb');
    e.nuked = true;
    killEnemy(e, 0);
  }
  burst(x,y,'#ff5a16',32,440,0.75,6);
  burst(x,y,'#d8d8d8',24,380,0.65,5);
}
function explode(x,y,rad,dmg,hurtPlayer){
  burst(x,y,'#ff9a3c',26,360,0.6,6); burst(x,y,'#ffd75c',16,260,0.45,4);
  shake(8,0.2);
  G.zones.push({x,y,r:rad,life:0.22,maxlife:0.22,color:'255,150,60',type:'flash'});
  const p = G.player;
  if(hurtPlayer && dist2(x,y,p.x,p.y) < (rad+p.r)*(rad+p.r)) damagePlayer(dmg, {kind:'enemy', enemyType:'bomber', attack:'explosion'});
  for(const e of [...G.enemies]){
    if(dist2(x,y,e.x,e.y) < (rad+e.r)*(rad+e.r)){
      const a = Math.atan2(e.y-y, e.x-x);
      hitEnemy(e, dmg*0.8, false, a, 220, 'fire', 'environment.explosion');
    }
  }
}
function damagePlayer(dmg, source){
  const p = G.player;
  if(typeof devTools !== 'undefined' && devTools.godmode) return;
  if(p.iframes>0 || p.dash.active>0) return;
  const armorPct = (p.armor || 0) + (p.itemStats.guard || 0);
  dmg *= 1 - Math.min(armorPct, 0.40);
  if(typeof runLogDamageTaken === 'function') runLogDamageTaken(dmg, source || {kind:'enemy', enemyType:'unknown', attack:'hit'});
  p.hp -= dmg; p.iframes = 0.45; p.hurtT = 0.25;
  ftext(p.x, p.y-p.r-12, '-'+Math.round(dmg), '#ff5a4a', 15, 0.8);
  burst(p.x,p.y,'#c0392b',10,220,0.5);
  shake(9,0.25);
  if(p.hp<=0){ p.hp=0; gameOver(); }
}
function gameOver(){
  if(typeof runLogFinish === 'function') runLogFinish('death');
  state = ST.OVER;
  $('gostats').innerHTML =
    `Reached wave <b>${G.wave}</b> &nbsp;·&nbsp; Level <b>${G.player.level}</b> &nbsp;·&nbsp; Kills <b>${G.kills}</b><br>` +
    `Voidcores earned this run: <span class="voiddrop">◆ ${G.coresThisRun}</span> (total ◆ ${meta.voidcores})`;
  openScreen('gameover');
  if(typeof renderEndRunStats === 'function') renderEndRunStats('gameoverRunStats');
}

function victory(){
  const p = G.player;
  if(typeof runLogFinish === 'function') runLogFinish('victory');
  state = ST.WIN;
  G.waveState = 'done';
  p.hp = Math.min(p.maxhp, p.hp + p.maxhp*0.25);
  if(G.mapId && typeof markMapWon === 'function') markMapWon(G.mapId);
  $('bossbar').style.display='none';
  $('vstats').innerHTML =
    `Cleared all <b>${typeof getFinalWave==='function'?getFinalWave():FINAL_WAVE}</b> waves &nbsp;·&nbsp; Level <b>${p.level}</b> &nbsp;·&nbsp; Kills <b>${G.kills}</b><br>` +
    `Voidcores earned this run: <span class="voiddrop">◆ ${G.coresThisRun}</span> (total ◆ ${meta.voidcores})`;
  openScreen('victory');
  if(typeof renderEndRunStats === 'function') renderEndRunStats('victoryRunStats');
}

function triggerWeaponItems(target, sw, crit){
  const p = G.player;
  const ember = p.itemStats.ember || 0;
  if(ember && sw.cleave){
    const rad = 88 + 18*ember*p.reach;
    const dmg = (8 + ember*7) * p.dmgMul;
    G.zones.push({x:target.x,y:target.y,r:rad,life:0.22,maxlife:0.22,color:'255,138,61',type:'flash'});
    burst(target.x,target.y,'#ff8a3d',10+ember*3,260,0.45,4);
    for(const e of [...G.enemies]){
      if(e===target) continue;
      if(dist2(target.x,target.y,e.x,e.y)<(rad+e.r)**2){
        const a=Math.atan2(e.y-target.y,e.x-target.x);
        hitEnemy(e,dmg,false,a,90,'fire','item.ember_sigil');
      }
    }
  }

  const voidRank = p.itemStats.void || 0;
  const voidChance = 0.08*voidRank + (crit?0.08:0);
  if(voidRank && Math.random()<voidChance){
    const nearbyEnemies = G.enemies.filter(e=>e!==target && dist2(target.x,target.y,e.x,e.y)<520*520);
    if(nearbyEnemies.length){
      const t2 = pick(nearbyEnemies);
      hitEnemy(t2, (10+voidRank*8)*p.dmgMul, crit, Math.atan2(t2.y-target.y,t2.x-target.x), 60, 'shadow');
      G.zaps.push({x1:target.x,y1:target.y,x2:t2.x,y2:t2.y,life:0.22,maxlife:0.22,color:'#b94aff'});
    }
  }
}

function triggerWhirlwindItems(e, a){
  const p = G.player;
  const ruinRank = p.itemStats.ruin || 0;
  if(!ruinRank) return;
  p.itemStats.ruinHits = (p.itemStats.ruinHits||0) + 1;
  if(p.itemStats.ruinHits % 4 !== 0) return;
  const len = (180 + ruinRank*20) * p.reach;
  const dmg = (18 + ruinRank*10) * p.dmgMul;
  G.ruinSlashes.push({x:p.x, y:p.y, dir:a, len, width:22+ruinRank*4, life:0.28, maxlife:0.28});
  for(const en of [...G.enemies]){
    if(en===e) continue;
    const da = Math.atan2(en.y-p.y, en.x-p.x);
    if(Math.abs(angDiff(a,da)) < 0.65 && dist2(p.x,p.y,en.x,en.y) < (len+en.r)**2){
      hitEnemy(en, dmg, Math.random()<p.crit, da, 120, 'physical', 'item.eye_of_ruin');
    }
  }
}
