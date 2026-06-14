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
      ftext(p.x,p.y-50,'FISTS OF FURY','#ffe07a',16,0.7);
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
    burst(e.x, e.y, '#fff2c0', 3, 110, 0.16, 2);
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
      life:rand(0.14,0.26), color: i===0?'#ffffff':'#ffd24a', size:rand(2,4)});
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
  const BODY = hurt ? '#46464f' : '#16161d';
  const RIM  = hurt ? '#ffffff' : '#3b3b48';

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
      ctx.strokeStyle='rgba(150,230,255,0.35)'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-hs+3+faceX*2, headCY-hs+1.5);
      ctx.lineTo( hs-3+faceX*2, headCY-hs+1.5);
      ctx.stroke();
    }

    /* ----- ARMS ----- */
    const shX = 0, shY = shoulderY+3;
    const armLen = 26; // long arms
    if(flurry){
      // both fists hammering toward facing, alternating, with smear
      for(const s of [1,-1]){
        const out   = (s===pHand) ? pExt : 0.15 + pExt*0.1;
        const baseA = p.facing + s*0.16;
        // smear: draw a few ghost segments of the punching arm
        const reachX = Math.cos(baseA)*armLen*(0.5+out*0.9);
        const reachY = Math.sin(baseA)*armLen*(0.5+out*0.9);
        const elbowX = shX + s*7 + reachX*0.4;
        const elbowY = shY + 6 + reachY*0.4;
        const fistX  = shX + reachX;
        const fistY  = shY + reachY;
        if(s===pHand && out>0.4 && !tint){
          ctx.save();
          ctx.globalAlpha = alpha*0.35*out; ctx.strokeStyle='#8fe6ff'; ctx.lineWidth=6;
          for(let g=1;g<=2;g++){
            const ga = baseA - s*0.18*g;
            ctx.beginPath();
            ctx.moveTo(shX+s*7, shY+6);
            ctx.lineTo(shX+Math.cos(ga)*armLen*(0.5+out*0.9), shY+Math.sin(ga)*armLen*(0.5+out*0.9));
            ctx.stroke();
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
          ctx.fillStyle='rgba(255,240,180,0.95)'; ctx.shadowColor='#ffd24a'; ctx.shadowBlur=16;
          ctx.beginPath(); ctx.arc(fistX, fistY, 6.5, 0, TAU); ctx.fill();
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

  /* ---------- forward cone telegraph while channelling ---------- */
  if(flurry){
    ctx.save();
    ctx.rotate(p.facing);
    ctx.globalCompositeOperation='lighter';
    const rng = STICK.fofRange*(p.reach||1);
    const cg = ctx.createRadialGradient(0,0,10,0,0,rng);
    const pulse = 0.10 + p.fof.flash*0.16;
    cg.addColorStop(0,'rgba(255,225,120,'+pulse+')');
    cg.addColorStop(1,'rgba(255,180,40,0)');
    ctx.fillStyle=cg;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.arc(0,0,rng,-STICK.fofHalfArc,STICK.fofHalfArc);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/* ---------- character-select preview ---------- */
function _previewStickman(c, t){
  const BODY='#17171e';
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
  tg.addColorStop(0,'#3b3b48'); tg.addColorStop(0.35,BODY); tg.addColorStop(1,BODY);
  c.strokeStyle=tg; c.lineWidth=10;
  c.beginPath(); c.moveTo(0,hipY); c.quadraticCurveTo(2,(hipY+shoulderY)/2,0,shoulderY); c.stroke();
  // head
  c.fillStyle=BODY;
  if(c.roundRect){ c.beginPath(); c.roundRect(-12,headCY-12,24,24,6); c.fill(); }
  else { c.fillRect(-12,headCY-12,24,24); }
  c.strokeStyle='rgba(150,230,255,0.4)'; c.lineWidth=1.6;
  c.beginPath(); c.moveTo(-8,headCY-10.5); c.lineTo(8,headCY-10.5); c.stroke();
  // arms
  const shY=shoulderY+4;
  if(flurry){
    const clk=t*11, hand=Math.floor(clk)%2===0?1:-1, ext=Math.pow(Math.sin((clk%1)*Math.PI),0.6);
    for(const s of [1,-1]){
      const out=(s===hand)?ext:0.2;
      const dir=-0.15; // punch toward viewer-right
      const rx=Math.cos(dir)*30*(0.5+out*0.9), ry=Math.sin(dir)*30*(0.5+out*0.9);
      if(s===hand&&out>0.4){
        c.save(); c.globalAlpha=0.35*out; c.strokeStyle='#8fe6ff'; c.lineWidth=6;
        c.beginPath(); c.moveTo(s*8,shY+6); c.lineTo(rx*0.9,shY+6+ry*0.9); c.stroke(); c.restore();
      }
      c.strokeStyle=BODY; c.lineWidth=6.5;
      c.beginPath(); c.moveTo(s*8,shY+6); c.quadraticCurveTo(rx*0.5,shY+10+ry*0.4,rx,shY+6+ry); c.stroke();
      c.fillStyle=BODY; c.beginPath(); c.arc(rx,shY+6+ry,5,0,Math.PI*2); c.fill();
      if(s===hand&&out>0.55){
        c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=0.6*out;
        c.fillStyle='rgba(255,240,180,0.95)'; c.shadowColor='#ffd24a'; c.shadowBlur=16;
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
