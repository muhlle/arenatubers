"use strict";
/* =========================================================
   WARLOCK — abilities, drawing, update
========================================================= */

/* ---------- DRAWING ---------- */
function drawWarlock(p){
  const t = performance.now()/1000;
  ctx.save();
  ctx.translate(p.x, p.y);

  // Ground shadow
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(0,p.r*0.9,p.r*1.7,p.r*0.52,0,0,TAU); ctx.fill();

  // Fel ground aura
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=0.18+Math.sin(t*2)*0.07;
  const ag=ctx.createRadialGradient(0,0,8,0,0,62);
  ag.addColorStop(0,'rgba(180,0,255,0.55)'); ag.addColorStop(1,'rgba(180,0,255,0)');
  ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(0,0,62,0,TAU); ctx.fill();
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  ctx.restore();

  // Level-up flourish
  if(G.lvlAnim>0){
    const prog=1-G.lvlAnim/0.55, ease=1-Math.pow(1-prog,3);
    ctx.save();
    const pg=ctx.createLinearGradient(0,-280,0,30);
    pg.addColorStop(0,'rgba(200,0,255,0)');
    pg.addColorStop(0.6,'rgba(200,0,255,'+(0.35*(1-prog))+')');
    pg.addColorStop(1,'rgba(255,64,32,'+(0.45*(1-prog))+')');
    ctx.fillStyle=pg; ctx.fillRect(-34-14*ease,-280,(34+14*ease)*2,310);
    ctx.restore();
  }

  // Cape — billows away from facing direction
  const capeDir = p.facing+Math.PI;
  const capeFlap = Math.sin(t*1.8)*6;
  ctx.save();
  ctx.rotate(capeDir);
  // outer cape
  ctx.fillStyle='#1a0d22'; ctx.strokeStyle='#3d1a52'; ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(-2,-20);
  ctx.bezierCurveTo(-34+capeFlap,-50,-64,-22,-66,2);
  ctx.bezierCurveTo(-58,32,-24,58,0,62);
  ctx.bezierCurveTo(24,58,58,32,66,2);
  ctx.bezierCurveTo(64,-22,34-capeFlap,-50,2,-20);
  ctx.fill(); ctx.stroke();
  // crimson lining
  ctx.fillStyle='#5c1018';
  ctx.beginPath();
  ctx.moveTo(0,-16);
  ctx.bezierCurveTo(-22,-36,-46,-14,-46,2);
  ctx.bezierCurveTo(-40,30,-20,52,0,54);
  ctx.bezierCurveTo(20,52,40,30,46,2);
  ctx.bezierCurveTo(46,-14,22,-36,0,-16);
  ctx.fill();
  // clasps
  for(const s of [-1,1]){
    ctx.fillStyle='#c8a040'; ctx.strokeStyle='#5a3a08'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(s*18,-14,5.5,0,TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffe08a'; ctx.beginPath(); ctx.arc(s*18,-14,2.8,0,TAU); ctx.fill();
  }
  ctx.restore(); // cape

  // Robe body
  ctx.fillStyle='#1a1222'; ctx.strokeStyle='#2e1a3d'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(0,2,16,20,0,0,TAU); ctx.fill(); ctx.stroke();
  // robe trim lines
  ctx.strokeStyle='rgba(60,20,80,0.8)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(-12,-8); ctx.lineTo(-12,14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12,-8); ctx.lineTo(12,14); ctx.stroke();

  // Belt
  ctx.strokeStyle='#8b3a1a'; ctx.lineWidth=5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-14,12); ctx.lineTo(14,12); ctx.stroke();
  ctx.fillStyle='#c8a040'; ctx.strokeStyle='#5a3a08'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(0,12,5,0,TAU); ctx.fill(); ctx.stroke();

  // Hurt flash
  const hurt = p.hurtT>0;
  if(p.iframes>0 && Math.floor(t*16)%2===0){ ctx.globalAlpha=0.55; }

  // Head
  const headBob=Math.sin(t*2)*1.5;
  ctx.save(); ctx.translate(Math.cos(p.facing)*3,-2+headBob);
  ctx.fillStyle=hurt?'#fff8ef':'#c8bcaa'; ctx.strokeStyle='#1a1222'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(0,-2,11,14,0,0,TAU); ctx.fill(); ctx.stroke();
  // Hair
  ctx.fillStyle='#0d0a12';
  ctx.beginPath(); ctx.ellipse(0,-11,10,6,0,0,TAU); ctx.fill();
  // Horns
  for(const s of [-1,1]){
    ctx.save(); ctx.translate(s*9,-8);
    ctx.strokeStyle='#d4c9a8'; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.bezierCurveTo(s*8,-13,s*20,-10,s*20,2);
    ctx.bezierCurveTo(s*20,13,s*10,17,s*4,13);
    ctx.stroke();
    ctx.lineWidth=3; ctx.strokeStyle='#a89878';
    ctx.beginPath(); ctx.moveTo(s*4,13); ctx.bezierCurveTo(s*0,17,s*-3,15,s*-4,11); ctx.stroke();
    ctx.strokeStyle='rgba(20,10,30,0.85)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(s*10,-4); ctx.lineTo(s*14,-1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s*16,5); ctx.lineTo(s*18,9); ctx.stroke();
    ctx.restore();
  }
  // Eyes
  ctx.shadowColor='#ff1a1a'; ctx.shadowBlur=14;
  ctx.fillStyle='#ff1a1a';
  ctx.beginPath(); ctx.ellipse(-4,-4,3.5,2.5,0,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4,-4,3.5,2.5,0,0,TAU); ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore(); // head

  // Arms (extended toward facing direction for casting)
  const castPulse = 1+Math.sin(t*8)*0.12;
  for(const s of [-1,1]){
    const armDir = p.facing + s*0.55;
    const ex=Math.cos(armDir)*22, ey=Math.sin(armDir)*22;
    ctx.strokeStyle='#c8bcaa'; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(s*12,4); ctx.lineTo(ex,ey); ctx.stroke();
    // hand glow
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=(0.5+Math.sin(t*5+s)*0.25)*castPulse;
    ctx.fillStyle='rgba(180,0,255,0.8)'; ctx.shadowColor='#c840ff'; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(ex,ey,5.5,0,TAU); ctx.fill();
    ctx.shadowBlur=0; ctx.globalCompositeOperation='source-over';
    ctx.restore();
  }

  ctx.globalAlpha=1;
  ctx.restore(); // player
}

/* ---------- WARLOCK PROJECTILE DRAW (called from rendering.js) ---------- */
function drawPlayerBolts(){
  if(!G || !G.playerBolts) return;
  const t = performance.now()/1000;
  for(const b of G.playerBolts){
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    // glow halo
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.4;
    const halo=ctx.createRadialGradient(0,0,2,0,0,22);
    halo.addColorStop(0,'rgba(200,40,255,0.8)'); halo.addColorStop(1,'rgba(200,40,255,0)');
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(0,0,22,0,TAU); ctx.fill();
    // bolt body
    ctx.globalAlpha=1;
    ctx.fillStyle='#0d0a14'; ctx.shadowColor='#c840ff'; ctx.shadowBlur=16;
    ctx.beginPath();
    ctx.moveTo(14,0); ctx.lineTo(-4,-7); ctx.lineTo(-14,0); ctx.lineTo(-4,7); ctx.closePath();
    ctx.fill();
    ctx.fillStyle='#c840ff';
    ctx.beginPath(); ctx.ellipse(0,0,8,4,0,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(255,200,255,0.9)';
    ctx.beginPath(); ctx.arc(2,0,3,0,TAU); ctx.fill();
    ctx.shadowBlur=0; ctx.globalCompositeOperation='source-over';
    // particle trail
    if(Math.random()<0.7){
      G.parts.push({x:b.x-Math.cos(b.angle)*10,y:b.y-Math.sin(b.angle)*10,
        vx:rand(-20,20),vy:rand(-20,20),life:0.22,color:'#b94aff',size:rand(2,4)});
    }
    ctx.restore();
  }
}

/* =========================================================
   WARLOCK WORLD-SPACE VFX (called from rendering.js draw())
========================================================= */
const BONE_SHIELD_R = 260;
const BONE_COUNT    = 7;
const CURSE_R     = 780;
const SIGIL_R     = 110;

function boneShieldShardCount(p){
  return BONE_COUNT + (p && p.extraProjectiles || 0);
}
function boneShieldOrbitSpeed(p){
  return 1.45 * (p && p.projectileSpeed || 1);
}

function warlockSoulDamageMul(p){
  const stacks = p ? (p.soulStacks || 0) : 0;
  const soulRate = p && p.soulDoubleDot ? 0.02 : 0.01;
  const stoneRate = p && p.soulstone ? p.soulstone * 0.01 : 0;
  return 1 + stacks * (soulRate + stoneRate);
}
function setBurning(e, dur, dps){
  e.burning = {
    dur: Math.max(e.burning && e.burning.dur || 0, dur || 0),
    dps: Math.max(e.burning && e.burning.dps || 0, dps || 0),
    tickCd: e.burning && Number.isFinite(e.burning.tickCd) ? e.burning.tickCd : 0,
  };
}
function updateBurningStatuses(dt){
  if(!G || !G.enemies) return;
  for(const e of [...G.enemies]){
    if(!e.burning) continue;
    e.burning.dur -= dt;
    if(e.burning.dps>0){
      e.burning.tickCd -= dt;
      if(e.burning.tickCd<=0){
        hitEnemy(e, e.burning.dps*0.5, false, 0, 0, 'fire', 'warlock.burning_dot');
        e.burning.tickCd += 0.5;
        if(!G.enemies.includes(e)) continue;
      }
    }
    if(e.burning && e.burning.dur<=0) e.burning = null;
  }
}
function warlockDropSoul(e){
  if(!G || G.charClass!=='warlock') return;
  const p = G.player;
  if((p.soulStacks||0)>=30) return;
  if(!(e.cursed || e.burning)) return;
  if(Math.random() < 0.008){
    G.pickups.push({type:'soul', x:e.x+rand(-10,10), y:e.y+rand(-10,10), t:rand(0,TAU), collectDelay:0.25});
  }
}

/* ---------- Burning Sigil ground circles ---------- */
function drawWarlockSigils(){
  if(!G || !G.sigils || !G.sigils.length) return;
  const t = performance.now()/1000;
  for(const s of G.sigils){
    const pulse = 1 + Math.sin(t*6)*0.04;
    ctx.save();
    ctx.translate(s.x, s.y);

    // Ground heat glow
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha = 0.22 + Math.sin(t*4)*0.08;
    const sg = ctx.createRadialGradient(0,0,s.r*0.25,0,0,s.r*1.05);
    sg.addColorStop(0,'rgba(255,110,20,0.45)'); sg.addColorStop(0.65,'rgba(255,50,0,0.15)'); sg.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(0,0,s.r*pulse,0,TAU); ctx.fill();
    ctx.restore();

    // Outer ring
    ctx.strokeStyle='rgba(255,'+(80+Math.floor(Math.sin(t*5)*35))+',0,'+(0.65+Math.sin(t*7)*0.2)+')';
    ctx.lineWidth=3; ctx.shadowColor='#ff4010'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(0,0,s.r*pulse,0,TAU); ctx.stroke();
    ctx.shadowBlur=0;

    // Inner rune spokes (6-pointed)
    ctx.strokeStyle='rgba(255,120,40,0.3)'; ctx.lineWidth=1.5;
    for(let i=0;i<6;i++){
      const a=i/6*TAU + t*0.35;
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(a)*s.r*0.8, Math.sin(a)*s.r*0.8); ctx.stroke();
    }
    // Inner concentric ring
    ctx.strokeStyle='rgba(255,80,10,0.28)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(0,0,s.r*0.55,0,TAU); ctx.stroke();

    // Countdown arc (orange)
    const lifeArc = (s.life/s.maxlife)*TAU;
    ctx.strokeStyle='rgba(255,200,60,0.75)'; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.shadowColor='#ffd75c'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(0,0,s.r+9,-Math.PI/2,-Math.PI/2+lifeArc); ctx.stroke();
    ctx.shadowBlur=0;

    // Inner fire particles (spawned here, owned by G.parts)
    if(Math.random()<0.35){
      const fa=rand(0,TAU), fr=rand(0,s.r*0.75);
      G.parts.push({x:s.x+Math.cos(fa)*fr, y:s.y+Math.sin(fa)*fr,
        vx:rand(-14,14), vy:-rand(28,55), life:rand(0.35,0.6), color:'#ff5c18', size:rand(2,4)});
    }

    ctx.restore();
  }
}

/* ---------- Bone Shield orbit (R ability) ---------- */
function drawWarlockBoneShield(){
  if(!G || !G.player) return;
  const p = G.player;
  if(!p.boneShield || p.boneShield.active <= 0) return;
  const t = performance.now()/1000;
  const lifeRatio = Math.min(1, p.boneShield.active / 8.0);
  const alpha = Math.min(1, lifeRatio * 3);

  ctx.save();
  ctx.translate(p.x, p.y);

  // Faint orbit ring
  ctx.save();
  ctx.globalAlpha = 0.07 * alpha;
  ctx.beginPath(); ctx.arc(0, 0, BONE_SHIELD_R, 0, TAU);
  ctx.strokeStyle = '#c8c0a0'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  const count = boneShieldShardCount(p);
  const ang = p.boneShield.angle;
  for(let i = 0; i < count; i++){
    const baseAngle = ang + (TAU / count) * i;
    const wobble = Math.sin(t * 3.1 + i * 1.37) * 0.14;
    const bx = Math.cos(baseAngle) * BONE_SHIELD_R;
    const by = Math.sin(baseAngle) * BONE_SHIELD_R;
    const tilt = baseAngle + Math.PI / 2 + wobble;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);
    ctx.globalAlpha = alpha * (0.88 + Math.sin(t * 2.2 + i * 0.9) * 0.12);
    ctx.shadowColor = 'rgba(215,205,168,0.55)';
    ctx.shadowBlur  = 13;

    // Bone shard body — 8-point angular polygon
    const w = 7, h = 24;
    ctx.beginPath();
    ctx.moveTo(   0,      -h     );
    ctx.lineTo(  w*0.75,  -h*0.4 );
    ctx.lineTo(  w,        h*0.08);
    ctx.lineTo(  w*0.55,   h*0.65);
    ctx.lineTo(   0,       h     );
    ctx.lineTo( -w*0.55,   h*0.65);
    ctx.lineTo( -w,        h*0.08);
    ctx.lineTo( -w*0.75,  -h*0.4 );
    ctx.closePath();

    const g = ctx.createLinearGradient(-w, -h, w, h);
    g.addColorStop(0,   'rgba(242,238,226,1)');
    g.addColorStop(0.45,'rgba(216,208,188,1)');
    g.addColorStop(1,   'rgba(155,148,128,1)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(45,38,22,0.78)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Crack detail
    ctx.beginPath();
    ctx.moveTo(-w*0.3, -h*0.22);
    ctx.lineTo( w*0.4,  h*0.18);
    ctx.strokeStyle = 'rgba(88,74,52,0.45)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

/* ---- R: Bone Shield ---- */
function warlockBoneShield(){
  const p = G.player;
  if(!p.boneShield || p.boneShield.cd > 0 || p.boneShield.active > 0) return;
  p.boneShield.active  = 8.0;
  p.boneShield.cd      = p.boneShield.cdMax;
  p.boneShield.hitCds  = {};
  burst(p.x, p.y, '#d4cfc0', 16, 360, 0.65, 5);
  burst(p.x, p.y, '#6080a0', 10, 220, 0.45, 3);
  ftext(p.x, p.y-60, 'BONE SHIELD', '#c8c0a0', 20, 1.6);
  G.rings.push({x:p.x, y:p.y, r:10, maxR:BONE_SHIELD_R*1.1, life:0.4, maxlife:0.4, color:'190,182,155'});
  shake(5, 0.2);
  playSfx('cleave', 0.9);
}

function updateBoneShield(dt){
  const p = G.player;
  if(!p.boneShield || p.boneShield.active <= 0) return;
  p.boneShield.active -= dt;
  p.boneShield.angle   = (p.boneShield.angle || 0) + boneShieldOrbitSpeed(p) * dt;

  // Decay per-enemy hit cooldowns
  const hc = p.boneShield.hitCds;
  for(const id in hc){ hc[id] -= dt; if(hc[id] <= 0) delete hc[id]; }

  const ang    = p.boneShield.angle;
  const dmgMul = p.dmgMul;
  const dotMul = warlockSoulDamageMul(p);

  const count = boneShieldShardCount(p);
  for(let i = 0; i < count; i++){
    const a  = ang + (TAU / count) * i;
    const bx = p.x + Math.cos(a) * BONE_SHIELD_R;
    const by = p.y + Math.sin(a) * BONE_SHIELD_R;

    for(const e of G.enemies){
      if(!e._boneId) e._boneId = Math.random().toString(36).slice(2);
      if(hc[e._boneId] > 0) continue;
      if(dist2(bx, by, e.x, e.y) < (20 + e.r) ** 2){
        const curseMul = e.cursed ? 1.35 : 1;
        hitEnemy(e, p.baseDmg * 1.8 * dmgMul * dotMul * curseMul,
          Math.random() < p.crit, Math.atan2(e.y - by, e.x - bx), 90, 'physical', 'warlock.bone_shield');
        hc[e._boneId] = 0.55;
        burst(bx, by, '#d0cbb5', 4, 80, 0.3, 3);
        break;
      }
    }
  }

  // Bone dust ambient particles
  if(Math.random() < 0.14){
    const ba = Math.random() * TAU;
    const pr = BONE_SHIELD_R + rand(-22, 22);
    G.parts.push({
      kind:'dust',
      x: p.x + Math.cos(ba) * pr,
      y: p.y + Math.sin(ba) * pr,
      vx: Math.cos(ba + Math.PI/2) * rand(18, 55),
      vy: -rand(12, 38),
      life: rand(0.35, 0.75), maxlife: 0.75,
      color: '#9a9078', size: rand(2, 4), rot: rand(0, TAU)
    });
  }
}



/* =========================================================
   WARLOCK INIT + ABILITY UPDATE
========================================================= */
function warlockInitPlayer(p, cdr){
  cdr = cdr || 1;
  p.maxhp   = Math.round(85*(1+0.15*tval('vita')));
  p.speed   = 235*(1+0.08*tval('swft'));
  p.baseDmg = 10;
  p.armor   = 0.05;
  p.r       = 21;
  p.hp      = p.maxhp;
  p.cdr     = cdr;
  p.wlQ     = { cd:0, cdMax:10*cdr };
  p.wlE     = { cd:0, cdMax:8*cdr  };
  p.boneShield = { active:0, cd:0, cdMax:16*cdr, angle:0, hitCds:{} };
  p.dash    = { active:0, cd:0, cdMax:3.5*cdr, dx:0, dy:0 };
  p.boltCd  = 0;
  p.boltCdMax = 0.65;
  p.soulStacks  = 0;
  p.curseBonusDur = 0;
  p.shadowPierce  = 0;
  p.soulDoubleDot = false;
  p.felBrand  = 0;
  p.soulstone = 0;
  p.extraProjectiles = 0;
  p.swing = null; p.swingCd = 0; p.combo = 0; p.comboReset = 0;
}

function updateWarlockAbilities(dt){
  const p = G.player;
  const inGame = state === ST.PLAY;

  // Tick cooldowns
  if(p.wlQ)       p.wlQ.cd -= dt;
  if(p.wlE)       p.wlE.cd -= dt;
  if(p.boneShield){ p.boneShield.cd -= dt; updateBoneShield(dt); }
  updateBurningStatuses(dt);
  if(!G.sigils)   G.sigils = [];

  // === Auto-attack: shadow bolts (fires at nearest enemy) ===
  p.boltCd -= dt;
  if(p.boltCd <= 0 && G.enemies.length > 0){
    let nearest = null, nearD2 = Infinity;
    for(const e of G.enemies){
      const d2 = dist2(p.x, p.y, e.x, e.y);
      if(d2 < nearD2){ nearD2=d2; nearest=e; }
    }
    if(nearest && nearD2 < 1400*1400){
      const bspd = 680*(p.projectileSpeed||1);
      const ba   = Math.atan2(nearest.y-p.y, nearest.x-p.x);
      const pierce = p.shadowPierce||0;
      G.playerBolts.push({x:p.x,y:p.y, vx:Math.cos(ba)*bspd, vy:Math.sin(ba)*bspd,
        angle:ba, life:2.0, maxlife:2.0, pierceLeft:pierce});
      for(let ep=0;ep<(p.extraProjectiles||0);ep++){
        const side = (ep%2===0?1:-1)*(ep+1)*0.22;
        const ea   = ba+side;
        G.playerBolts.push({x:p.x,y:p.y, vx:Math.cos(ea)*bspd, vy:Math.sin(ea)*bspd,
          angle:ea, life:2.0, maxlife:2.0, pierceLeft:pierce});
      }
      p.boltCd = (p.boltCdMax||0.65) / (p.atkSpd||1);
    }
  }
  // Move bolts + hit-test
  for(const b of G.playerBolts){
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    for(const e of G.enemies){
      if(dist2(b.x,b.y,e.x,e.y) < (e.r+8)**2){
        const curseMul = e.cursed ? 1.25 : 1;
        const dotMul   = warlockSoulDamageMul(p);
        hitEnemy(e, p.baseDmg*2.2*p.dmgMul*dotMul*curseMul,
          Math.random()<p.crit, b.angle, 80, 'shadow', 'warlock.shadow_bolt');
        if(G.enemies.includes(e)) setBurning(e, 2.5, 0);
        if(b.pierceLeft > 0){ b.pierceLeft--; }
        else { b.life = 0; }
        break;
      }
    }
  }
  G.playerBolts = G.playerBolts.filter(b=>b.life>0);

  // Update sigil zones
  for(const s of G.sigils){
    s.life -= dt;
    s.tickCd = Number.isFinite(s.tickCd) ? s.tickCd - dt : 0;
    const damageTick = s.tickCd <= 0;
    for(const e of G.enemies){
      if(dist2(s.x,s.y,e.x,e.y) < (s.r+e.r)**2){
        if(damageTick){
          const curseMul = e.cursed ? 1.25 : 1;
          const dotMul   = warlockSoulDamageMul(p);
          hitEnemy(e, s.dps*0.5*p.dmgMul*dotMul*curseMul,
            false, Math.atan2(e.y-s.y,e.x-s.x), 0, 'fire', 'warlock.burning_sigil');
        }
        if(G.enemies.includes(e)) setBurning(e, 2.0, 0);
        if(e.cursed) e.slow = Math.max(e.slow, 0.12);
      }
    }
    if(damageTick) s.tickCd += 0.5;
    if(s.life <= 0){
      burst(s.x,s.y,'#ff6020',20,280,0.6,5);
      burst(s.x,s.y,'#ffd75c',10,180,0.4,3);
      G.rings.push({x:s.x,y:s.y,r:10,maxR:s.r*1.8,life:0.35,maxlife:0.35,color:'255,140,30'});
      for(const e of G.enemies){
        if(dist2(s.x,s.y,e.x,e.y) < (s.r*1.8+e.r)**2){
          const curseMul = e.cursed ? 1.35 : 1;
          hitEnemy(e, p.baseDmg*3.0*p.dmgMul*warlockSoulDamageMul(p)*curseMul,
            Math.random()<p.crit, Math.atan2(e.y-s.y,e.x-s.x), 120, 'fire', 'warlock.sigil_explosion');
        }
      }
      shake(7, 0.3);
    }
  }
  G.sigils = G.sigils.filter(s=>s.life>0);

  if(!inGame) return;

  // Q — Curse nova
  if(keys['q'] && p.wlQ && p.wlQ.cd <= 0){
    p.wlQ.cd = p.wlQ.cdMax;
    const cdur = 6+(p.curseBonusDur||0);
    G.novas.push({x:p.x,y:p.y,r:0,maxR:CURSE_R,
      life:0.65,maxlife:0.65,curseDur:cdur,hitSet:new Set()});
    burst(p.x,p.y,'#8020e0',14,200,0.5,4);
    ftext(p.x,p.y-60,'CURSE','#b040ff',18,1.4);
    shake(4,0.15);
    playSfx('cleave',0.6);
  }

  // E — Burning Sigil (place at mouse world pos)
  if(keys['e'] && p.wlE && p.wlE.cd <= 0){
    p.wlE.cd = p.wlE.cdMax;
    const wx = G.cam.x + mouse.x;
    const wy = G.cam.y + mouse.y;
    G.sigils.push({x:wx,y:wy,r:SIGIL_R,life:5.0,maxlife:5.0,dps:22});
    burst(wx,wy,'#ff6020',12,150,0.45,4);
    ftext(wx,wy-50,'SIGIL','#ff7030',16,1.2);
    playSfx('slam',0.7);
  }

  // R — Bone Shield
  if(keys['r'] && p.boneShield && p.boneShield.cd <= 0 && p.boneShield.active <= 0){
    warlockBoneShield();
  }

  // SPACE — Shadow Step (blink toward cursor)
  if(keys[' '] && p.dash.cd <= 0){
    const BLINK_RANGE = 500;
    p.dash.cd = p.dash.cdMax;
    const wx = G.cam.x + mouse.x;
    const wy = G.cam.y + mouse.y;
    const bang = Math.atan2(wy-p.y, wx-p.x);
    const bdst = Math.min(Math.hypot(wx-p.x, wy-p.y), BLINK_RANGE);
    G.afterimages.push({x:p.x,y:p.y,life:0.5,maxlife:0.5,facing:p.facing});
    p.x += Math.cos(bang)*bdst;
    p.y += Math.sin(bang)*bdst;
    p.iframes = 0.25;
        burst(p.x,p.y,'#b040ff',10,200,0.4,3);
    G.rings.push({x:p.x,y:p.y,r:10,maxR:80,life:0.3,maxlife:0.3,color:'180,40,255'});
    playSfx('dodge',0.8);
  }
}
