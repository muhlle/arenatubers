"use strict";
/* =========================================================
   ONE PUNCH (Stickman) — abilities, drawing, update
   Drawing: drawPlayer() in rendering.js dispatches to drawStickman.
   Abilities implemented for now: LMB Fists of Fury, SPACE Speed Burst.
   Q / E / R are intentionally left unbound (designed later).
========================================================= */

/* ---------- TUNING ---------- */
const STICK = {
  // Fists of Fury (LMB autoattack)
  fofDur:      3.0,    // seconds the flurry channels
  fofCd:       1.5,    // cooldown AFTER the flurry ends
  fofTicks:    3,      // damage ticks per second
  fofDmgPct:   0.25,   // % of base damage per tick
  fofRange:    240,    // cone reach (px, scaled by reach)
  fofHalfArc:  0.46,   // half-angle of the cone (rad) ~ 53° total
  fofKnock:    55,
  // Speed Burst (SPACE)
  burstSpeed:  1750,
  burstTime:   0.17,
  burstCd:     2.4,
};

/* ---------- INIT ---------- */
function stickmanInitPlayer(p, cdr){
  cdr = cdr || 1;
  p.maxhp   = Math.round(105*(1+0.15*tval('vita')));
  p.speed   = 248*(1+0.08*tval('swft'));
  p.baseDmg = 13;
  p.armor   = 0.06;
  p.r       = 22;
  p.hp      = p.maxhp;
  p.cdr     = cdr;
  // Fists of Fury state
  p.fof   = { active:0, cd:0, cdMax:STICK.fofCd*cdr, tick:0, flash:0, hits:0 };
  // Speed Burst (own dash field so the generic charge handler stays off)
  p.burst = { active:0, cd:0, cdMax:STICK.burstCd*cdr, dx:0, dy:0, ang:0 };
  // animation helpers
  p._moveAmt = 0; p._lx = p.x; p._ly = p.y;
  p.swing = null; p.combo = 0; p.comboReset = 0;
  p.trails = p.trails || [];
}

/* ---------- ABILITY UPDATE ---------- */
function updateStickmanAbilities(dt){
  const p = G.player;
  const inGame = state === ST.PLAY;

  // Tick own cooldowns / timers
  if(p.fof)   p.fof.cd   -= dt;
  if(p.burst) p.burst.cd -= dt;
  if(p.fof && p.fof.flash>0) p.fof.flash = Math.max(0, p.fof.flash - dt*5);

  // Movement amount (drives leg animation) — smoothed from actual displacement
  const moved = Math.hypot(p.x - p._lx, p.y - p._ly);
  const movingNow = moved > Math.max(0.6, p.speed*dt*0.25) ? 1 : 0;
  p._moveAmt += (movingNow - p._moveAmt) * Math.min(1, dt*12);
  p._lx = p.x; p._ly = p.y;

  /* ===== SPACE — Speed Burst (short dash + blur) ===== */
  if(p.burst){
    if(inGame && keys[' '] && p.burst.cd<=0 && p.burst.active<=0){
      let dx = (keys['d']?1:0) - (keys['a']?1:0);
      let dy = (keys['s']?1:0) - (keys['w']?1:0);
      if(!dx && !dy){ dx = Math.cos(p.facing); dy = Math.sin(p.facing); }
      const l = Math.hypot(dx,dy) || 1;
      p.burst.active = STICK.burstTime;
      p.burst.cd     = p.burst.cdMax;
      p.burst.dx     = dx/l*STICK.burstSpeed;
      p.burst.dy     = dy/l*STICK.burstSpeed;
      p.burst.ang    = Math.atan2(dy,dx);
      p.iframes      = Math.max(p.iframes, STICK.burstTime + 0.04);
      ftext(p.x,p.y-46,'BURST','#bfeeff',15,0.6);
      burst(p.x,p.y,'#9fe8ff',12,260,0.4,3);
      playSfx('dodge',0.7);
    }
    if(p.burst.active>0){
      p.burst.active -= dt;
      p.x += p.burst.dx*dt;
      p.y += p.burst.dy*dt;
      // keep inside arena
      const ar = getArenaR(); const pr = Math.hypot(p.x,p.y);
      if(pr > ar - p.r){ const a=Math.atan2(p.y,p.x); p.x=Math.cos(a)*(ar-p.r); p.y=Math.sin(a)*(ar-p.r); }
      // cyan speed particles streaming behind
      if(Math.random()<0.9){
        G.parts.push({x:p.x+rand(-7,7), y:p.y+rand(-7,7),
          vx:-p.burst.dx*0.12+rand(-30,30), vy:-p.burst.dy*0.12+rand(-30,30),
          life:rand(0.18,0.34), color: Math.random()<0.4?'#ffffff':'#7fdcff', size:rand(2,4)});
      }
    }
  }

  /* ===== LMB — Fists of Fury (frontal cone flurry) ===== */
  if(p.fof){
    // Start a new flurry on click when ready
    if(inGame && mouse.down && p.fof.active<=0 && p.fof.cd<=0){
      p.fof.active = STICK.fofDur;
      p.fof.tick   = 0;
      p.fof.hits   = 0;
      ftext(p.x,p.y-50,'FISTS OF FURY','#8fe6ff',16,0.7);
    }
    if(p.fof.active>0){
      p.fof.active -= dt;
      p.fof.tick   -= dt;
      if(p.fof.tick<=0){
        p.fof.tick += (1/STICK.fofTicks) / (p.atkSpd||1);
        fofConeHit(p);
      }
      // flurry just ended -> start the recovery cooldown
      if(p.fof.active<=0){
        p.fof.active = 0;
        p.fof.cd     = p.fof.cdMax;
      }
    }
  }
}

/* One damage tick of the cone */
function fofConeHit(p){
  const range = STICK.fofRange * (p.reach||1);
  const half  = STICK.fofHalfArc;
  const r2    = range*range;
  let landed  = 0;
  for(const e of [...G.enemies]){
    const dx=e.x-p.x, dy=e.y-p.y;
    if(dx*dx+dy*dy > (range+e.r)*(range+e.r)) continue;
    let d = Math.atan2(dy,dx) - p.facing;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if(Math.abs(d) > half + (e.r/(Math.max(40,range)))) continue;
    hitEnemy(e, p.baseDmg*STICK.fofDmgPct*p.dmgMul, Math.random()<p.crit,
             Math.atan2(dy,dx), STICK.fofKnock, 'physical', 'stickman.fof');
    burst(e.x, e.y, '#9fe8ff', 3, 130, 0.16, 2);
    landed++;
  }
  p.fof.flash = 1;
  p.fof.hits++;
  // forward fist puff in aim direction
  const fx = p.x + Math.cos(p.facing)*42;
  const fy = p.y + Math.sin(p.facing)*42;
  for(let i=0;i<3;i++){
    const sa = p.facing + rand(-half,half);
    G.parts.push({x:fx, y:fy, vx:Math.cos(sa)*rand(140,260), vy:Math.sin(sa)*rand(140,260),
      life:rand(0.14,0.26), color: i===0?'#ffffff':'#74dfff', size:rand(2,4)});
  }
  if(landed>0 && p.fof.hits%2===0) shake(2.2, 0.12);
}

/* =========================================================
   DRAWING
========================================================= */
function drawStickman(p){
  const t = performance.now()/1000;
  ctx.save();
  ctx.translate(p.x, p.y);

  /* ground shadow */
  ctx.fillStyle='rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 20, p.r*1.45, p.r*0.5, 0, 0, TAU); ctx.fill();

  /* speed ground aura (subtle cyan) */
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha = 0.14 + Math.sin(t*4)*0.05 + p.fof.active*0.04;
  const ag = ctx.createRadialGradient(0,14,4,0,14,52);
  ag.addColorStop(0,'rgba(120,225,255,0.5)'); ag.addColorStop(1,'rgba(120,225,255,0)');
  ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(0,14,52,0,TAU); ctx.fill();
  ctx.restore();

  /* level-up flourish */
  if(G.lvlAnim>0){
    const prog=1-G.lvlAnim/0.55;
    ctx.save();
    const pg=ctx.createLinearGradient(0,-280,0,30);
    pg.addColorStop(0,'rgba(140,230,255,0)');
    pg.addColorStop(0.6,'rgba(140,230,255,'+(0.35*(1-prog))+')');
    pg.addColorStop(1,'rgba(255,210,74,'+(0.45*(1-prog))+')');
    ctx.fillStyle=pg; ctx.fillRect(-26,-280,52,310);
    ctx.restore();
  }

  /* ---- pose params ---- */
  const move   = p._moveAmt||0;
  const stepA  = Math.sin(p.step||0);
  const bob    = (move>0.05 ? Math.abs(Math.sin((p.step||0)))*2.2 : Math.sin(t*2)*1.1);
  const faceX  = Math.cos(p.facing);              // -1..1, which way it aims
  const lean   = clamp(faceX,-1,1)*3 + (p.burst.active>0 ? Math.cos(p.burst.ang)*5 : 0);
  const hurt   = p.hurtT>0;

  /* fists-of-fury punch clock (visual flurry, faster than damage ticks) */
  const flurry   = p.fof.active>0;
  const punchClk = t*11;
  const pHand    = Math.floor(punchClk)%2===0 ? 1 : -1;  // which fist is out
  const pExt     = Math.pow(Math.sin((punchClk%1)*Math.PI), 0.6); // 0->1->0

  // colours
  const BODY = hurt ? '#3f4852' : '#121821';
  const RIM  = hurt ? '#ffffff' : '#314b61';
  const ELEC = '#74dfff';

  /* ---------- figure painter (reused for motion-blur ghosts) ---------- */
  const paint = (alpha, tint) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(lean, -bob);
    const body = tint || BODY;

    // anchor points (y up = negative)
    const footY    = 18;
    const hipY     = -8;
    const shoulderY= -48;
    const headCY   = -64;

    ctx.lineCap='round'; ctx.lineJoin='round';

    /* ----- LEGS ----- */
    const legSwing = stepA * (0.5*move) ; // radians of swing while walking
    ctx.strokeStyle = body; ctx.lineWidth = 6.5;
    for(const s of [-1,1]){
      const phase = s>0 ? legSwing : -legSwing;
      const hipX  = s*4;
      const kneeX = hipX + Math.sin(phase)*8;
      const kneeY = (hipY+footY)/2 + Math.abs(Math.cos(phase))*1.5*move;
      const footX = hipX + Math.sin(phase)*15;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(kneeX, kneeY, footX, footY + (s>0? -Math.max(0,Math.sin(phase))*3 : -Math.max(0,-Math.sin(phase))*3));
      ctx.stroke();
    }

    /* ----- TORSO (tall, thin, soft) ----- */
    const tg = ctx.createLinearGradient(0, shoulderY, 0, hipY);
    tg.addColorStop(0, tint || RIM);
    tg.addColorStop(0.35, body);
    tg.addColorStop(1, body);
    ctx.strokeStyle = tg; ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, hipY+1);
    ctx.quadraticCurveTo(faceX*2, (hipY+shoulderY)/2, 0, shoulderY);
    ctx.stroke();

    /* ----- HEAD (square, soft edges) ----- */
    const hs = 11; // half-size
    ctx.fillStyle = body;
    if(ctx.roundRect){
      ctx.beginPath(); ctx.roundRect(-hs+faceX*2, headCY-hs, hs*2, hs*2, 5.5); ctx.fill();
    } else {
      ctx.beginPath(); ctx.rect(-hs+faceX*2, headCY-hs, hs*2, hs*2); ctx.fill();
    }
    if(!tint){
      // top rim light for a touch of dimension
      ctx.strokeStyle='rgba(150,230,255,0.45)'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-hs+3+faceX*2, headCY-hs+1.5);
      ctx.lineTo( hs-3+faceX*2, headCY-hs+1.5);
      ctx.stroke();
      // lightning-infused eyes: blue living flame / current leaking forward
      const eyeY = headCY - 2.5;
      const eyeForward = faceX*2.2;
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.shadowColor=ELEC; ctx.shadowBlur=12;
      for(const s of [-1,1]){
        const ex = faceX*2 + s*4.2 + eyeForward;
        const flame = 1 + Math.sin(t*18+s*2.1)*0.22;
        ctx.fillStyle='rgba(180,245,255,0.95)';
        ctx.beginPath(); ctx.ellipse(ex, eyeY, 2.2, 3.2*flame, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle='rgba(116,223,255,0.75)'; ctx.lineWidth=1.3;
        ctx.beginPath();
        ctx.moveTo(ex+faceX*1.6, eyeY-1);
        ctx.quadraticCurveTo(ex+faceX*(8+flame*2), eyeY-5*s, ex+faceX*(15+flame*4), eyeY-1+s*2);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ----- ARMS ----- */
    const shX = 0, shY = shoulderY+3;
    const armLen = 26; // long arms
    if(flurry){
      // both fists hammering toward facing, alternating, with reach-matching stretch and smear
      for(const s of [1,-1]){
        const out   = (s===pHand) ? pExt : 0.15 + pExt*0.1;
        const baseA = p.facing + s*0.16;
        const attackReach = STICK.fofRange * (p.reach||1);
        const stretchLen = 34 + attackReach*0.58;
        const drawLen = lerp(armLen, stretchLen, out);
        // smear: draw a few ghost segments of the punching arm
        const reachX = Math.cos(baseA)*drawLen;
        const reachY = Math.sin(baseA)*drawLen;
        const elbowX = shX + s*7 + reachX*0.4;
        const elbowY = shY + 6 + reachY*0.4;
        const fistX  = shX + reachX;
        const fistY  = shY + reachY;
        if(s===pHand && out>0.28 && !tint){
          ctx.save();
          ctx.globalCompositeOperation='lighter';
          for(let g=1;g<=5;g++){
            const ga = baseA - s*(0.08+0.045*g);
            const trailOut = out*(1-g*0.11);
            const trailLen = lerp(armLen, stretchLen, Math.max(0.15, trailOut));
            ctx.globalAlpha = alpha*(0.24-g*0.025)*out;
            ctx.strokeStyle = g%2===0 ? '#d8fbff' : ELEC;
            ctx.lineWidth = Math.max(2, 7-g*0.75);
            ctx.beginPath();
            ctx.moveTo(shX+s*7, shY+6);
            ctx.lineTo(shX+Math.cos(ga)*trailLen, shY+Math.sin(ga)*trailLen);
            ctx.stroke();
            // mirror afterimage fist
            ctx.fillStyle='rgba(150,235,255,0.75)';
            ctx.beginPath(); ctx.arc(shX+Math.cos(ga)*trailLen, shY+Math.sin(ga)*trailLen, Math.max(2.2, 5.8-g*0.65), 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
        ctx.strokeStyle = body; ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(shX+s*7, shY+6);
        ctx.quadraticCurveTo(elbowX, elbowY, fistX, fistY);
        ctx.stroke();
        // fist
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(fistX, fistY, 4.5, 0, TAU); ctx.fill();
        if(!tint && s===pHand && out>0.55){
          ctx.save();
          ctx.globalCompositeOperation='lighter';
          ctx.globalAlpha = alpha*(0.5+p.fof.flash*0.5)*out;
          ctx.fillStyle='rgba(205,250,255,0.98)'; ctx.shadowColor=ELEC; ctx.shadowBlur=18;
          ctx.beginPath(); ctx.arc(fistX, fistY, 6.5, 0, TAU); ctx.fill();
          ctx.strokeStyle='rgba(116,223,255,0.9)'; ctx.lineWidth=1.2;
          for(let z=0; z<2; z++){
            const za = baseA + rand(-0.35,0.35);
            ctx.beginPath(); ctx.moveTo(fistX, fistY);
            ctx.lineTo(fistX+Math.cos(za)*rand(12,22), fistY+Math.sin(za)*rand(12,22));
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    } else {
      // idle / walking arm sway (counter-swing to legs), long arms with elbow
      for(const s of [-1,1]){
        const sway = -stepA*0.35*move*s + Math.sin(t*1.6 + (s>0?0:1.1))*0.12*(1-move);
        const a0   = Math.PI/2 + 0.25*s + sway;     // hang down + slight out
        const elbowX = shX + s*7 + Math.cos(a0)* (armLen*0.5);
        const elbowY = shY + 6   + Math.sin(a0)* (armLen*0.5);
        const handX  = elbowX + Math.cos(a0+sway*0.6)*(armLen*0.55);
        const handY  = elbowY + Math.sin(a0+sway*0.6)*(armLen*0.55);
        ctx.strokeStyle = body; ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(shX+s*7, shY+6);
        ctx.quadraticCurveTo(elbowX, elbowY, handX, handY);
        ctx.stroke();
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(handX, handY, 4.2, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------- motion-blur ghosts during Speed Burst ---------- */
  if(p.burst.active>0){
    const nx = Math.cos(p.burst.ang), ny = Math.sin(p.burst.ang);
    const ghosts = [[14,0.30],[28,0.18],[44,0.10]];
    for(const [off,a] of ghosts){
      ctx.save();
      ctx.translate(-nx*off, -ny*off);
      ctx.shadowColor='#7fdcff'; ctx.shadowBlur=12;
      paint(a, '#7fdcff');
      ctx.restore();
    }
  }

  /* ---------- main figure ---------- */
  if(p.iframes>0 && Math.floor(t*16)%2===0) ctx.globalAlpha=0.55;
  paint(1, null);
  ctx.globalAlpha=1;

  /* ---------- lightning wind blur while channelling ---------- */
  if(flurry){
    ctx.save();
    ctx.rotate(p.facing);
    ctx.globalCompositeOperation='lighter';
    const rng = STICK.fofRange*(p.reach||1);
    const wind = 0.22 + p.fof.flash*0.24;
    for(let i=0;i<7;i++){
      const yy = (i-3)*7 + Math.sin(t*18+i)*3;
      const x0 = 28 + i*3;
      const x1 = rng*(0.55+0.06*(i%3));
      ctx.globalAlpha = wind*(1-i*0.08);
      ctx.strokeStyle = i%2 ? 'rgba(210,250,255,0.75)' : 'rgba(116,223,255,0.72)';
      ctx.lineWidth = i%2 ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.quadraticCurveTo(rng*0.34, yy + Math.sin(t*24+i)*10, x1, yy*0.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/* ---------- character-select preview ---------- */
function _previewStickman(c, t){
  const BODY='#121821';
  const ELEC='#74dfff';
  const move=0; // idle in preview, gentle flurry showcase
  const flurry = (Math.floor(t/2.4)%2)===1;   // alternate idle / flurry every few sec
  const bob = Math.sin(t*2)*1.4;
  c.save(); c.translate(0,bob);
  // shadow
  c.fillStyle='rgba(0,0,0,0.4)';
  c.beginPath(); c.ellipse(0,52,30,8,0,0,Math.PI*2); c.fill();
  // speed aura
  c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=0.16+Math.sin(t*4)*0.05;
  const ag=c.createRadialGradient(0,40,4,0,40,46);
  ag.addColorStop(0,'rgba(120,225,255,0.5)'); ag.addColorStop(1,'rgba(120,225,255,0)');
  c.fillStyle=ag; c.beginPath(); c.arc(0,40,46,0,Math.PI*2); c.fill(); c.restore();

  c.lineCap='round'; c.lineJoin='round';
  const footY=46, hipY=18, shoulderY=-22, headCY=-40;
  // legs
  c.strokeStyle=BODY; c.lineWidth=7;
  for(const s of [-1,1]){
    c.beginPath(); c.moveTo(s*4,hipY); c.quadraticCurveTo(s*5,(hipY+footY)/2,s*7,footY); c.stroke();
  }
  // torso
  const tg=c.createLinearGradient(0,shoulderY,0,hipY);
  tg.addColorStop(0,'#314b61'); tg.addColorStop(0.35,BODY); tg.addColorStop(1,BODY);
  c.strokeStyle=tg; c.lineWidth=10;
  c.beginPath(); c.moveTo(0,hipY); c.quadraticCurveTo(2,(hipY+shoulderY)/2,0,shoulderY); c.stroke();
  // head
  c.fillStyle=BODY;
  if(c.roundRect){ c.beginPath(); c.roundRect(-12,headCY-12,24,24,6); c.fill(); }
  else { c.fillRect(-12,headCY-12,24,24); }
  c.strokeStyle='rgba(150,230,255,0.4)'; c.lineWidth=1.6;
  c.beginPath(); c.moveTo(-8,headCY-10.5); c.lineTo(8,headCY-10.5); c.stroke();
  c.save();
  c.globalCompositeOperation='lighter';
  c.shadowColor=ELEC; c.shadowBlur=12;
  for(const s of [-1,1]){
    const ex=s*4.5, ey=headCY-2.5, flame=1+Math.sin(t*18+s*2)*0.22;
    c.fillStyle='rgba(180,245,255,0.96)';
    c.beginPath(); c.ellipse(ex,ey,2.2,3.2*flame,0,0,Math.PI*2); c.fill();
    c.strokeStyle='rgba(116,223,255,0.78)'; c.lineWidth=1.25;
    c.beginPath(); c.moveTo(ex+2,ey-1); c.quadraticCurveTo(ex+10,ey-5*s,ex+17,ey-1+s*2); c.stroke();
  }
  c.restore();
  // arms
  const shY=shoulderY+4;
  if(flurry){
    const clk=t*11, hand=Math.floor(clk)%2===0?1:-1, ext=Math.pow(Math.sin((clk%1)*Math.PI),0.6);
    for(const s of [1,-1]){
      const out=(s===hand)?ext:0.2;
      const dir=-0.15; // punch toward viewer-right
      const len=30 + 72*out;
      const rx=Math.cos(dir)*len, ry=Math.sin(dir)*len;
      if(s===hand&&out>0.3){
        c.save(); c.globalCompositeOperation='lighter';
        for(let g=1;g<=4;g++){
          const ga=dir-s*(0.08+g*0.05), glen=30+72*Math.max(0.2,out-g*0.1);
          c.globalAlpha=(0.26-g*0.035)*out; c.strokeStyle=g%2?'#8fe6ff':'#d8fbff'; c.lineWidth=Math.max(2,6-g);
          c.beginPath(); c.moveTo(s*8,shY+6); c.lineTo(Math.cos(ga)*glen,shY+6+Math.sin(ga)*glen); c.stroke();
          c.fillStyle='rgba(150,235,255,0.7)';
          c.beginPath(); c.arc(Math.cos(ga)*glen,shY+6+Math.sin(ga)*glen,Math.max(2,5-g*0.5),0,Math.PI*2); c.fill();
        }
        c.restore();
      }
      c.strokeStyle=BODY; c.lineWidth=6.5;
      c.beginPath(); c.moveTo(s*8,shY+6); c.quadraticCurveTo(rx*0.5,shY+10+ry*0.4,rx,shY+6+ry); c.stroke();
      c.fillStyle=BODY; c.beginPath(); c.arc(rx,shY+6+ry,5,0,Math.PI*2); c.fill();
      if(s===hand&&out>0.55){
        c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=0.6*out;
        c.fillStyle='rgba(205,250,255,0.98)'; c.shadowColor=ELEC; c.shadowBlur=16;
        c.beginPath(); c.arc(rx,shY+6+ry,7,0,Math.PI*2); c.fill(); c.restore();
      }
    }
  } else {
    for(const s of [-1,1]){
      const a0=Math.PI/2+0.28*s+Math.sin(t*1.6+(s>0?0:1.1))*0.18;
      const ex=s*8+Math.cos(a0)*15, ey=shY+6+Math.sin(a0)*15;
      const hx=ex+Math.cos(a0)*16, hy=ey+Math.sin(a0)*16;
      c.strokeStyle=BODY; c.lineWidth=6.5;
      c.beginPath(); c.moveTo(s*8,shY+6); c.quadraticCurveTo(ex,ey,hx,hy); c.stroke();
      c.fillStyle=BODY; c.beginPath(); c.arc(hx,hy,4.6,0,Math.PI*2); c.fill();
    }
  }
  c.restore();
}
