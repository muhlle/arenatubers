"use strict";
/* =========================================================
   RENDER
========================================================= */
function draw(){
  ctx.clearRect(0,0,W,H);
  if(!G){ ctx.fillStyle='#0b0d08'; ctx.fillRect(0,0,W,H); return; }
  const cam = G.cam, p = G.player;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  drawArena(cam);
  // zones (telegraphs / slams)
  for(const z of G.zones){
    const f = z.life/z.maxlife;
    ctx.beginPath(); ctx.arc(z.x,z.y,z.r*(z.type==='slam'?(1-f*0.3):1),0,TAU);
    if(z.type==='tele'){ ctx.fillStyle=`rgba(${z.color},${0.16})`; ctx.fill();
      ctx.strokeStyle=`rgba(${z.color},.8)`; ctx.lineWidth=3; ctx.stroke();
      ctx.beginPath(); ctx.arc(z.x,z.y,z.r*(1-f),0,TAU); ctx.strokeStyle=`rgba(${z.color},.5)`; ctx.stroke();
    } else { ctx.fillStyle=`rgba(${z.color},${0.25*f})`; ctx.fill();
      ctx.strokeStyle=`rgba(${z.color},${0.7*f})`; ctx.lineWidth=4; ctx.stroke(); }
  }

  // Ground flames (Warlock Firestorm eruptions)
  if(G.flames && G.flames.length) drawGroundFlames();
  if(false && G.flames && G.flames.length){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    for(const fl of G.flames){
      const f = fl.life/fl.maxlife;
      // burst up fast, linger, then shrink: peak at 80% life
      const phase = f>0.2 ? 1 : f/0.2;
      const h = fl.h * phase;
      ctx.save();
      ctx.translate(fl.x, fl.y);
      // Base ground glow
      const bg=ctx.createRadialGradient(0,0,2,0,0,fl.w*1.4);
      bg.addColorStop(0,`rgba(255,100,20,${0.55*f})`);
      bg.addColorStop(1,'rgba(255,40,0,0)');
      ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(0,0,fl.w*1.4,0,TAU); ctx.fill();
      // 3 flame tongues — center + two offset
      const tongues=[
        {ox:fl.ox,      fw:fl.w,      fh:h,      r0:'255,60,0', r1:'255,200,50'},
        {ox:fl.ox-fl.w*0.45, fw:fl.w*0.62, fh:h*0.78, r0:'255,80,10', r1:'255,220,80'},
        {ox:fl.ox+fl.w*0.45, fw:fl.w*0.55, fh:h*0.70, r0:'255,50,0',  r1:'255,180,40'},
      ];
      for(const tg of tongues){
        const fg=ctx.createLinearGradient(tg.ox,0,tg.ox,-tg.fh);
        fg.addColorStop(0,   `rgba(${tg.r0},${0.92*f})`);
        fg.addColorStop(0.38,`rgba(255,140,20,${0.70*f})`);
        fg.addColorStop(0.72,`rgba(${tg.r1},${0.38*f})`);
        fg.addColorStop(1,   'rgba(255,255,180,0)');
        ctx.fillStyle=fg;
        ctx.beginPath();
        ctx.moveTo(tg.ox - tg.fw*0.5, 2);
        ctx.quadraticCurveTo(tg.ox - tg.fw*0.25, -tg.fh*0.55, tg.ox, -tg.fh);
        ctx.quadraticCurveTo(tg.ox + tg.fw*0.25, -tg.fh*0.55, tg.ox + tg.fw*0.5, 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // pickups
  for(const pk of G.pickups){
    const bob = Math.sin(pk.t*4)*3;
    const blink = pk.type==='heal' && pk.life<5 && Math.floor(pk.t*8)%2===0;
    if(blink) continue;
    ctx.save(); ctx.translate(pk.x, pk.y+bob);
    ctx.fillStyle='rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(0,12-bob,11,4,0,0,TAU); ctx.fill();
    if(pk.type==='xp'){
      const g = ctx.createRadialGradient(0,0,2,0,0,18);
      g.addColorStop(0,'rgba(190,235,255,.85)'); g.addColorStop(0.5,'rgba(90,180,255,.45)'); g.addColorStop(1,'rgba(90,180,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,18,0,TAU); ctx.fill();
      ctx.save(); ctx.rotate(pk.t);
      ctx.fillStyle='#5ab4ff'; ctx.strokeStyle='#d7f2ff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(8,0); ctx.lineTo(0,10); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#e8fbff'; ctx.beginPath(); ctx.arc(-2,-3,2.4,0,TAU); ctx.fill();
      ctx.restore();
    } else if(pk.type==='heal'){
      // size: sm=12, md=18, lg=24
      const s = pk.healSize==='lg' ? 24 : pk.healSize==='sm' ? 12 : 18;
      const g = ctx.createRadialGradient(0,0,2,0,0,s+4);
      g.addColorStop(0,'rgba(94,224,106,.5)'); g.addColorStop(1,'rgba(94,224,106,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,s+4,0,TAU); ctx.fill();
      ctx.fillStyle='#5ee06a'; ctx.strokeStyle='#1d6b28'; ctx.lineWidth=Math.max(1.5, s*0.12);
      const h = s*0.55, arm = s*0.38;
      ctx.beginPath();
      ctx.moveTo(-arm,-h); ctx.lineTo(arm,-h); ctx.lineTo(arm,-arm); ctx.lineTo(h,-arm); ctx.lineTo(h,arm);
      ctx.lineTo(arm,arm); ctx.lineTo(arm,h); ctx.lineTo(-arm,h); ctx.lineTo(-arm,arm); ctx.lineTo(-h,arm);
      ctx.lineTo(-h,-arm); ctx.lineTo(-arm,-arm); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle='#c8ffd0'; ctx.fillRect(-arm*0.4,-h*0.85,arm*0.8,h*0.55);
      ctx.font=`bold ${Math.max(9,s*0.5)}px Verdana`; ctx.textAlign='center'; ctx.lineWidth=3;
      ctx.strokeStyle='rgba(0,0,0,.75)'; ctx.fillStyle='#c8ffd0';
      const labelY = -(s+8);
      ctx.strokeText(Math.ceil(pk.life),0,labelY); ctx.fillText(Math.ceil(pk.life),0,labelY);
    } else if(pk.type==='magnet'){
      // glow
      const mg = ctx.createRadialGradient(0,0,2,0,0,22);
      mg.addColorStop(0,'rgba(255,220,60,.55)'); mg.addColorStop(1,'rgba(255,180,0,0)');
      ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(0,0,22,0,TAU); ctx.fill();
      // horseshoe body (U-shape)
      ctx.lineWidth=5; ctx.lineCap='round';
      ctx.strokeStyle='#cc2222';
      ctx.beginPath(); ctx.arc(0,2,9,Math.PI,0,false); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9,2); ctx.lineTo(-9,12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9,2); ctx.lineTo(9,12); ctx.stroke();
      // poles (silver tips)
      ctx.strokeStyle='#cccccc'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.moveTo(-9,10); ctx.lineTo(-9,14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9,10); ctx.lineTo(9,14); ctx.stroke();
      // sparkle lines
      ctx.strokeStyle='rgba(255,220,60,.7)'; ctx.lineWidth=1.5;
      for(let i=0;i<6;i++){
        const a=i/6*TAU + pk.t*2, r1=14, r2=18+Math.sin(pk.t*3+i)*2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1); ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2); ctx.stroke();
      }
      // no timer text — magnet is picked up and removed on contact
    } else if(pk.type==='bomb'){
      // Outer glow
      const bombPulse = 1+Math.sin(pk.t*5)*0.12;
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=0.45;
      const bg=ctx.createRadialGradient(0,0,4,0,0,20);
      bg.addColorStop(0,'rgba(255,80,0,0.8)'); bg.addColorStop(1,'rgba(255,40,0,0)');
      ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(0,0,20,0,TAU); ctx.fill();
      ctx.restore();
      // Bomb body
      ctx.save();
      ctx.scale(bombPulse,bombPulse);
      ctx.fillStyle='#1a1a1a'; ctx.strokeStyle='#444'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,2,11,0,TAU); ctx.fill(); ctx.stroke();
      // Shine
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.ellipse(-3,-2,5,3.5,Math.PI*0.7,0,TAU); ctx.fill();
      // Fuse
      ctx.strokeStyle='#c8a040'; ctx.lineWidth=2; ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(4,-8);
      ctx.bezierCurveTo(10,-18,2,-22,-2,-16);
      ctx.stroke();
      // Fuse spark
      const sparkA = pk.t*12;
      ctx.fillStyle='#ffee44';
      ctx.shadowColor='#ffcc00'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(-2+Math.cos(sparkA)*2,-16+Math.sin(sparkA)*2, 2.5,0,TAU); ctx.fill();
      ctx.shadowBlur=0;
      ctx.restore();
      // Label
      ctx.font='bold 9px Impact'; ctx.textAlign='center';
      ctx.fillStyle='#ff6020'; ctx.strokeStyle='rgba(0,0,0,.8)'; ctx.lineWidth=2;
      ctx.strokeText('BOMB',-1,26); ctx.fillText('BOMB',-1,26);
    } else if(pk.type==='soul'){
      // Soul fragment — purple gem
      const soulPulse = 1 + Math.sin(pk.t*5)*0.15;
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = 0.5;
      const soulG = ctx.createRadialGradient(0,0,2,0,0,16);
      soulG.addColorStop(0,'rgba(200,40,255,0.7)'); soulG.addColorStop(1,'rgba(200,40,255,0)');
      ctx.fillStyle=soulG; ctx.beginPath(); ctx.arc(0,0,16,0,TAU); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(pk.t*1.8);
      ctx.scale(soulPulse,soulPulse);
      ctx.fillStyle='#c840ff'; ctx.strokeStyle='#e8a0ff'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(0,-8); ctx.lineTo(5,0); ctx.lineTo(0,8); ctx.lineTo(-5,0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(255,220,255,0.85)';
      ctx.beginPath(); ctx.arc(-1,-2,2,0,TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // sword ground scratches -- wide groove + 4 parallel scratches
  if(p.swordTrail && p.swordTrail.length>1){
    ctx.save(); ctx.lineCap='round';
    // main dark groove
    for(let i=1;i<p.swordTrail.length;i++){
      const a=p.swordTrail[i], b=p.swordTrail[i-1];
      const f=i/p.swordTrail.length;
      ctx.globalAlpha=f*0.38;
      ctx.strokeStyle='#0d0b07'; ctx.lineWidth=6*f;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    // 4 thin parallel scratches
    for(const off of [-10,-4,4,10]){
      ctx.beginPath();
      for(let i=1;i<p.swordTrail.length;i++){
        const a=p.swordTrail[i], b=p.swordTrail[i-1];
        const nx=-(b.y-a.y), ny=b.x-a.x, nl=Math.hypot(nx,ny)||1;
        const ax2=a.x+nx/nl*off, ay2=a.y+ny/nl*off;
        const bx2=b.x+nx/nl*off, by2=b.y+ny/nl*off;
        if(i===1) ctx.moveTo(ax2,ay2); else ctx.lineTo(ax2,ay2);
        ctx.lineTo(bx2,by2);
      }
      ctx.globalAlpha=0.18;
      ctx.strokeStyle='#1a1610'; ctx.lineWidth=1.1;
      ctx.stroke();
    }
    // debris dots near sword tip
    if(p.swordTrail.length>3){
      const tip=p.swordTrail[0];
      ctx.fillStyle='#0d0b07';
      for(let i=0;i<6;i++){
        const ang=i*1.0472, dist=(i+1)*4.5;
        ctx.globalAlpha=0.20*(1-i/6);
        ctx.beginPath(); ctx.arc(tip.x+Math.cos(ang)*dist, tip.y+Math.sin(ang)*dist*0.6, 1.8-i*0.22, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha=1; ctx.restore();
  }

    // afterimage trails (dash = green, whirlwind = cyan)
  for(const ai of G.afterimages){
    const f = ai.life/ai.maxlife;
    ctx.save();
    ctx.globalAlpha = ai.alpha * f;
    ctx.translate(ai.x, ai.y);
    ctx.rotate(ai.facing);
    ctx.fillStyle = ai.color;
    ctx.shadowColor = ai.color;
    ctx.shadowBlur = 14;
    // silhouette: simple orc body shape
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -p.r*1.1, p.r*0.55, p.r*0.55, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Warlock world-space VFX (sigils + firestorm) — drawn before entities
  if(G.charClass==='warlock'){
    drawWarlockSigils();
    drawWarlockBoneShield();
  }
  // Curse nova (all characters can be affected)
  drawNovas();

  // sort drawables by y for a hint of depth
  const ents = [...G.enemies];
  ents.sort((a,b)=>a.y-b.y);
  let playerDrawn=false;
  for(const e of ents){
    if(!playerDrawn && e.y>p.y){ drawPlayer(p); playerDrawn=true; }
    drawEnemy(e);
  }
  if(!playerDrawn) drawPlayer(p);

  // wolf pet
  if(G.pet) drawWolf(G.pet);

  // projectiles
  for(const pr of G.projectiles){
    ctx.beginPath(); ctx.arc(pr.x,pr.y,pr.r+4,0,TAU); ctx.fillStyle='rgba(192,106,255,.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(pr.x,pr.y,pr.r,0,TAU); ctx.fillStyle=pr.color; ctx.fill();
    ctx.beginPath(); ctx.arc(pr.x,pr.y,pr.r*0.4,0,TAU); ctx.fillStyle='#fff'; ctx.fill();
  }
  // warlock player bolts
  if(G.playerBolts) drawPlayerBolts();
  // Eye of Ruin void slashes
  for(const s of G.ruinSlashes){
    const a = clamp(s.life/s.maxlife,0,1);
    ctx.save();
    ctx.translate(s.x,s.y);
    ctx.rotate(s.dir);
    ctx.globalAlpha = a;
    ctx.shadowColor='#d64cff';
    ctx.shadowBlur=22;
    const g = ctx.createLinearGradient(0,0,s.len,0);
    g.addColorStop(0,'rgba(214,76,255,0)');
    g.addColorStop(0.25,'rgba(214,76,255,.85)');
    g.addColorStop(0.7,'rgba(255,235,255,.95)');
    g.addColorStop(1,'rgba(214,76,255,0)');
    ctx.strokeStyle=g;
    ctx.lineWidth=s.width*a;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(22,0);
    ctx.quadraticCurveTo(s.len*0.48,-s.width*0.28,s.len,0);
    ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle=`rgba(30,5,45,${0.9*a})`;
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(36,0); ctx.lineTo(s.len*0.88,0); ctx.stroke();
    ctx.restore();
  }
  // void prism arcs
  for(const z of G.zaps){
    const a = clamp(z.life/z.maxlife,0,1);
    ctx.globalAlpha = a;
    ctx.strokeStyle = z.color;
    ctx.lineWidth = 3 + a*3;
    ctx.shadowColor = z.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    const mx = (z.x1+z.x2)/2 + Math.sin(G.t*28)*18;
    const my = (z.y1+z.y2)/2 + Math.cos(G.t*24)*18;
    ctx.moveTo(z.x1,z.y1);
    ctx.quadraticCurveTo(mx,my,z.x2,z.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  // hit rings (expanding shockwaves)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(const rn of G.rings){
    const f = rn.life/rn.maxlife;
    const r = rn.r + (rn.maxR - rn.r)*(1-f);
    ctx.globalAlpha = f * 0.7;
    ctx.strokeStyle = `rgba(${rn.color},1)`;
    ctx.lineWidth = 3 * f;
    ctx.beginPath(); ctx.arc(rn.x, rn.y, r, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
  // particles
  for(const pa of G.parts){
    const a = pa.maxlife ? clamp(pa.life/pa.maxlife,0,1) : clamp(pa.life*2.5,0,1);
    if(pa.kind==='smoke'){
      ctx.save();
      ctx.globalAlpha = 0.22*a;
      const r = pa.size*(1.2+(1-a)*0.9);
      const g=ctx.createRadialGradient(pa.x,pa.y,2,pa.x,pa.y,r);
      g.addColorStop(0,pa.color || 'rgba(40,32,26,0.55)');
      g.addColorStop(1,'rgba(40,32,26,0)');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.ellipse(pa.x,pa.y,r,r*0.55,pa.rot||0,0,TAU); ctx.fill();
      ctx.restore();
    } else if(pa.kind==='ember'){
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = a;
      ctx.shadowColor=pa.color; ctx.shadowBlur=10;
      ctx.fillStyle=pa.color;
      ctx.beginPath(); ctx.arc(pa.x,pa.y,pa.size,0,TAU); ctx.fill();
      ctx.shadowBlur=0;
      ctx.restore();
    } else if(pa.kind==='rock' || pa.kind==='dust'){
      ctx.save();
      ctx.globalAlpha = 0.75*a;
      ctx.translate(pa.x,pa.y);
      ctx.rotate(pa.rot||0);
      ctx.fillStyle=pa.color;
      ctx.beginPath();
      ctx.moveTo(-pa.size*0.6,-pa.size*0.35);
      ctx.lineTo(pa.size*0.45,-pa.size*0.5);
      ctx.lineTo(pa.size*0.65,pa.size*0.25);
      ctx.lineTo(-pa.size*0.25,pa.size*0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle=pa.color;
      ctx.fillRect(pa.x-pa.size/2, pa.y-pa.size/2, pa.size, pa.size);
    }
  }
  ctx.globalAlpha=1;
  // floating texts
  ctx.textAlign='center';
  for(const t of G.texts){
    ctx.globalAlpha = clamp(t.life/t.maxlife*1.6,0,1);
    ctx.font = `bold ${t.size}px Verdana`;
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.7)';
    ctx.strokeText(t.txt,t.x,t.y); ctx.fillStyle=t.color; ctx.fillText(t.txt,t.x,t.y);
  }
  ctx.globalAlpha=1;

  // Kill milestone notifs — CoD-style, right of player
  if(G.killNotifs && G.killNotifs.length){
    const kp = G.player;
    ctx.save();
    let rowY = 0;
    for(const kn of G.killNotifs){
      const f = kn.life/kn.maxlife;
      // slide in from right over first 0.18s, hold, then fade out over last 0.6s
      const slideT = Math.min(1, (kn.maxlife-kn.life)/0.18);
      const fadeA  = Math.min(1, kn.life/0.6);
      const slideX = (1-slideT)*80;
      const alpha  = slideT * fadeA;
      ctx.globalAlpha = alpha;
      const nx = kp.x + kp.r + 18 + slideX;
      const ny = kp.y - 8 + rowY;
      // Background pill
      ctx.fillStyle='rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(nx-6, ny-14, ctx.measureText(kn.txt).width+16, 22, 5);
      ctx.fill();
      // Text
      ctx.font = 'bold 13px Impact, Arial Black';
      ctx.textAlign = 'left';
      ctx.letterSpacing = '1px';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth=3;
      ctx.strokeText(kn.txt, nx+2, ny);
      ctx.fillStyle = kn.color;
      ctx.shadowColor = kn.color; ctx.shadowBlur = 10;
      ctx.fillText(kn.txt, nx+2, ny);
      ctx.shadowBlur=0;
      rowY += 24;
    }
    ctx.letterSpacing='0px';
    ctx.restore();
  }

  ctx.restore();

  drawVignette();
  drawScreenFx();
  updateHUD();
}

function drawGroundFlames(){
  for(const fl of G.flames){
    const f = fl.life/fl.maxlife;
    const age = 1-f;
    const phase = f>0.16 ? 1 : f/0.16;
    const h = fl.h * phase;
    ctx.save();
    ctx.translate(fl.x, fl.y);
    ctx.rotate(fl.rot || 0);

    ctx.fillStyle=`rgba(12,6,2,${0.36*f})`;
    ctx.beginPath(); ctx.ellipse(0,6,fl.w*1.9,fl.w*0.55,0,0,TAU); ctx.fill();
    const scorch=ctx.createRadialGradient(0,2,2,0,2,fl.w*2.4);
    scorch.addColorStop(0,`rgba(255,96,12,${0.34*f})`);
    scorch.addColorStop(0.42,`rgba(90,24,0,${0.24*f})`);
    scorch.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=scorch; ctx.beginPath(); ctx.arc(0,2,fl.w*2.4,0,TAU); ctx.fill();

    for(let i=0;i<3;i++){
      const sx=(i-1)*fl.w*0.5 + Math.sin((fl.seed||0)+i)*4;
      const sy=-h*(0.34+i*0.17)-age*22;
      const sr=fl.w*(1.1+i*0.34)*(0.7+age*0.8);
      const sg=ctx.createRadialGradient(sx,sy,2,sx,sy,sr);
      sg.addColorStop(0,`rgba(42,33,27,${0.24*f})`);
      sg.addColorStop(1,'rgba(35,26,20,0)');
      ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(sx,sy,sr,sr*0.55,0,0,TAU); ctx.fill();
    }

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const bg=ctx.createRadialGradient(0,0,2,0,0,fl.w*3.0);
    bg.addColorStop(0,`rgba(255,190,45,${0.58*f})`);
    bg.addColorStop(0.42,`rgba(255,80,8,${0.28*f})`);
    bg.addColorStop(1,'rgba(255,40,0,0)');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(0,0,fl.w*3,0,TAU); ctx.fill();

    const tongues=[
      {ox:fl.ox,             fw:fl.w*1.05, fh:h,      r0:'255,42,0',  r1:'255,230,75'},
      {ox:fl.ox-fl.w*0.48,   fw:fl.w*0.68, fh:h*0.76, r0:'255,80,8',  r1:'255,205,60'},
      {ox:fl.ox+fl.w*0.42,   fw:fl.w*0.58, fh:h*0.68, r0:'255,55,0',  r1:'255,185,42'},
      {ox:fl.ox+Math.sin((fl.seed||0)+age*5)*fl.w*0.25, fw:fl.w*0.36, fh:h*0.9, r0:'255,170,24', r1:'255,255,185'},
    ];
    for(const tg of tongues){
      const fg=ctx.createLinearGradient(tg.ox,0,tg.ox,-tg.fh);
      fg.addColorStop(0,   `rgba(${tg.r0},${0.95*f})`);
      fg.addColorStop(0.34,`rgba(255,120,18,${0.78*f})`);
      fg.addColorStop(0.68,`rgba(${tg.r1},${0.44*f})`);
      fg.addColorStop(1,   'rgba(255,255,180,0)');
      ctx.fillStyle=fg;
      ctx.beginPath();
      ctx.moveTo(tg.ox - tg.fw*0.55, 3);
      ctx.quadraticCurveTo(tg.ox - tg.fw*0.38, -tg.fh*0.45, tg.ox+Math.sin((fl.seed||0)+age*8)*6, -tg.fh);
      ctx.quadraticCurveTo(tg.ox + tg.fw*0.38, -tg.fh*0.48, tg.ox + tg.fw*0.55, 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle=`rgba(45,32,22,${0.7*f})`;
    for(let i=0;i<4;i++){
      const a=(fl.seed||0)+i*1.7+age*2.4;
      const rr=fl.w*(0.8+i*0.3)+age*16;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a)*rr, Math.sin(a)*rr*0.38+4, 2+i%2, 1.5, a, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---- the orc ---- */
function drawSwordEnchant(SL, t){
  // WoW-style weapon illusion: flowing ribbons + drifting embers
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // cycle hue: void-purple -> ice-blue -> arc-cyan
  const hue = (Math.sin(t*0.8)*0.5+0.5);
  const r1 = Math.round(185 - hue*145), g1 = Math.round(74 + hue*86), b1 = 255;
  const col = r1+','+g1+','+b1;
  const segs = 22;
  const spd = t * 3.4;

  // top ribbon
  ctx.beginPath();
  for(let i=0;i<=segs;i++){
    const fr = i/segs;
    const x = -8 - fr*(SL-12);
    const baseY = -(13 - fr*8);
    const wave = Math.sin(fr*9 + spd)*5*(1-fr*0.5);
    if(i===0) ctx.moveTo(x, baseY+wave); else ctx.lineTo(x, baseY+wave);
  }
  ctx.strokeStyle = 'rgba('+col+',0.65)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgb('+col+')'; ctx.shadowBlur = 10;
  ctx.stroke();

  // bottom ribbon (opposite phase)
  ctx.beginPath();
  for(let i=0;i<=segs;i++){
    const fr = i/segs;
    const x = -8 - fr*(SL-12);
    const baseY = (13 - fr*8);
    const wave = Math.sin(fr*9 + spd + Math.PI)*5*(1-fr*0.5);
    if(i===0) ctx.moveTo(x, baseY+wave); else ctx.lineTo(x, baseY+wave);
  }
  ctx.stroke();

  // center vein (faster)
  ctx.beginPath();
  for(let i=0;i<=segs;i++){
    const fr = i/segs;
    const x = -8 - fr*(SL-12);
    const wave = Math.sin(fr*12 + spd*1.6)*3*(1-fr*0.6);
    if(i===0) ctx.moveTo(x, wave); else ctx.lineTo(x, wave);
  }
  ctx.strokeStyle = 'rgba('+col+',0.4)';
  ctx.lineWidth = 1.5; ctx.shadowBlur = 6;
  ctx.stroke();

  // drifting embers along blade
  ctx.shadowBlur = 12;
  for(let i=0;i<10;i++){
    const seed = i*1.618;
    const fr = ((seed*0.31 + t*0.35) % 1.0);
    const x = -10 - fr*(SL-14);
    const drift = Math.sin(t*2.2+seed)*10 - 8;
    const alpha = Math.sin(fr*Math.PI)*0.9;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba('+col+',1)';
    ctx.beginPath(); ctx.arc(x, drift, 2.2, 0, TAU); ctx.fill();
  }

  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawSword(len, glow){
  // drawn pointing +x from origin (hand)
  ctx.save();
  if(glow){
    ctx.shadowColor='#b94aff';
    ctx.shadowBlur=18;
    ctx.strokeStyle='rgba(185,74,255,.42)';
    ctx.lineWidth=12;
    ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(len,0); ctx.stroke();
    ctx.shadowBlur=0;
  }
  // grip
  ctx.fillStyle='#1f1610'; ctx.fillRect(-16,-5,20,10);
  ctx.fillStyle='#7d1d24';
  for(let i=-14;i<2;i+=6) ctx.fillRect(i,-5,3,10);
  // guard
  ctx.fillStyle='#26313d'; ctx.fillRect(1,-15,8,30);
  ctx.fillStyle='#7e1218';
  ctx.beginPath(); ctx.moveTo(3,-18); ctx.lineTo(20,-7); ctx.lineTo(20,7); ctx.lineTo(3,18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#ff3d4d'; ctx.lineWidth=2; ctx.stroke();
  // blade — big chunky cleaver blade like the reference
  const L = len;
  ctx.beginPath();
  ctx.moveTo(12,-15);
  ctx.lineTo(L*0.70,-18);
  ctx.lineTo(L,-3);
  ctx.lineTo(L+14,0);
  ctx.lineTo(L,3);
  ctx.lineTo(L*0.70,18);
  ctx.lineTo(12,15);
  ctx.closePath();
  const blade = ctx.createLinearGradient(10,-18,L,18);
  blade.addColorStop(0,'#151820');
  blade.addColorStop(0.32,'#68717f');
  blade.addColorStop(0.62,'#171b24');
  blade.addColorStop(1,'#c9d2dd');
  ctx.fillStyle=blade; ctx.fill();
  ctx.strokeStyle='#07080c'; ctx.lineWidth=3; ctx.stroke();
  // dark spine
  ctx.beginPath();
  ctx.moveTo(15,-12); ctx.lineTo(L*0.68,-14); ctx.lineTo(L*0.78,-6); ctx.lineTo(15,-4); ctx.closePath();
  ctx.fillStyle='rgba(45,55,68,.72)'; ctx.fill();
  // molten core groove
  ctx.beginPath();
  ctx.moveTo(17,0); ctx.lineTo(L*0.68,-5); ctx.lineTo(L*0.78,0); ctx.lineTo(L*0.68,5); ctx.closePath();
  ctx.fillStyle = glow ? '#d64cff' : '#e02635';
  if(glow){ ctx.shadowColor='#d64cff'; ctx.shadowBlur=16; }
  ctx.fill();
  ctx.shadowBlur=0;
  // cursed runes
  ctx.strokeStyle=glow?'rgba(226,90,255,.95)':'rgba(220,30,45,.75)';
  ctx.lineWidth=2;
  for(let i=0;i<3;i++){
    const x=34+i*18;
    ctx.beginPath();
    ctx.moveTo(x,-3); ctx.lineTo(x+7,2); ctx.lineTo(x+2,7);
    ctx.stroke();
  }
  ctx.restore();
}
function drawWolf(w){
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(w.angle);

  // attack range ring (faint, only when chasing)
  if(w.state==='chase'){
    ctx.strokeStyle='rgba(180,210,255,0.12)';
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(0,0,w.cleavR,0,TAU); ctx.stroke();
  }

  const run = Math.sin(w.t*14)*0.18; // leg bob

  // shadow
  ctx.fillStyle='rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(2,14,13,4,0,0,TAU); ctx.fill();

  // tail
  ctx.strokeStyle='#c8c0b0'; ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(-14,2);
  ctx.quadraticCurveTo(-22,-6+run*10,-18,-14);
  ctx.stroke();

  // body
  ctx.fillStyle='#b8b0a0';
  ctx.strokeStyle='#5a5248'; ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.ellipse(0,0,14,10,0,0,TAU);
  ctx.fill(); ctx.stroke();

  // belly
  ctx.fillStyle='#d8d0c0';
  ctx.beginPath(); ctx.ellipse(2,3,8,6,0,0,TAU); ctx.fill();

  // head
  ctx.fillStyle='#b8b0a0';
  ctx.strokeStyle='#5a5248'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(16,0,10,8,0.15,0,TAU); ctx.fill(); ctx.stroke();

  // snout
  ctx.fillStyle='#a89888';
  ctx.beginPath(); ctx.ellipse(23,2,5,4,0.1,0,TAU); ctx.fill();

  // nose
  ctx.fillStyle='#2a1a14';
  ctx.beginPath(); ctx.ellipse(26,1,2,1.5,0,0,TAU); ctx.fill();

  // eye
  ctx.fillStyle= w.state==='chase' ? '#ff4422' : '#ffe0a0';
  ctx.beginPath(); ctx.arc(18,-2,2,0,TAU); ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.arc(18.5,-2,1,0,TAU); ctx.fill();

  // ears
  ctx.fillStyle='#a09080'; ctx.strokeStyle='#5a5248'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(12,-7); ctx.lineTo(9,-16); ctx.lineTo(16,-10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(17,-6); ctx.lineTo(15,-14); ctx.lineTo(21,-8); ctx.closePath(); ctx.fill(); ctx.stroke();

  // legs (4, animated)
  ctx.strokeStyle='#8a8070'; ctx.lineWidth=3; ctx.lineCap='round';
  const legs=[[-6,8,-6,18+run*8],[-6,8,-6,18-run*8],[6,8,6,18-run*8],[6,8,6,18+run*8]];
  for(const [x1,y1,x2,y2] of legs){
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }

  ctx.restore();
}
function drawPlayer(p){
  if(G && G.charClass==='warlock'){ drawWarlock(p); return; }
  const t = performance.now()/1000;
  const auraPulse = 1 + Math.sin(t*5)*0.08;
  ctx.save();
  ctx.translate(p.x, p.y);

  /* shadow */
  ctx.fillStyle='rgba(0,0,0,.42)';
  ctx.beginPath(); ctx.ellipse(0,p.r*0.9,p.r*1.45,p.r*0.52,0,0,TAU); ctx.fill();

  /* ground aura */
  ctx.save();
  ctx.globalAlpha = 0.24+Math.sin(t*4)*0.05;
  ctx.strokeStyle = p.fury.active>0 ? '#ff4b10' : '#6622aa';
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(0,p.r*0.9,54*auraPulse,21*auraPulse,0,0,TAU); ctx.stroke();
  ctx.restore();

  /* level-up flourish */
  if(G.lvlAnim>0){
    const prog=1-G.lvlAnim/0.55, ease=1-Math.pow(1-prog,3);
    ctx.save();
    const pg=ctx.createLinearGradient(0,-280,0,30);
    pg.addColorStop(0,'rgba(124,196,255,0)');
    pg.addColorStop(0.6,'rgba(124,196,255,'+(0.35*(1-prog))+')');
    pg.addColorStop(1,'rgba(255,215,92,'+(0.45*(1-prog))+')');
    ctx.fillStyle=pg; ctx.fillRect(-32-14*ease,-280,(32+14*ease)*2,310);
    for(const [delay,col] of [[0,'124,196,255'],[0.18,'255,215,92']]){
      const rp=clamp((prog-delay)/(1-delay),0,1); if(rp<=0) continue;
      ctx.strokeStyle='rgba('+col+','+0.8*(1-rp)+')';
      ctx.lineWidth=6*(1-rp)+2;
      ctx.beginPath(); ctx.arc(0,4,30+rp*170,0,TAU); ctx.stroke();
    }
    ctx.restore();
  }

  /* fury aura */
  if(p.fury.active>0){
    const g=ctx.createRadialGradient(0,0,8,0,0,66);
    g.addColorStop(0,'rgba(255,110,40,.35)'); g.addColorStop(1,'rgba(255,110,40,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,66,0,TAU); ctx.fill();
  }
  drawItemAuras(p,t);

  /* swing trails */
  for(const tr of p.trails){
    ctx.save(); ctx.rotate(tr.a);
    ctx.globalAlpha=tr.life/0.18*0.72;
    const g=ctx.createLinearGradient(0,0,tr.r,0);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(0.45,tr.cleave?'rgba(255,190,90,.55)':'rgba(118,240,255,.42)');
    g.addColorStop(0.72,tr.cleave?'rgba(255,100,55,.95)':'rgba(230,250,255,.95)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.strokeStyle=g; ctx.lineWidth=tr.cleave?26:16; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(20,0); ctx.lineTo(tr.r,0); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha=1;

  const hurt=p.hurtT>0;
  const bob=Math.sin(p.step)*3;
  const wwSpin=p.ww.active>0 ? t*22*(1+Math.max(0,p.atkSpd-1)*0.45) : 0;

  /* ---- greatsword angle ---- */
  // Blade extends in -X direction, so blade tip direction = swordA + PI.
  // Idle: drag behind -> tip points opposite facing -> swordA = p.facing
  let swordA=p.facing+Math.PI;
  if(p.ww.active>0){
    swordA=wwSpin;
  } else if(p.swing){
    const sw=p.swing, prog=clamp(sw.t/sw.dur,0,1);
    const arc=sw.cleave?2.6:1.5;
    const e=prog<0.5?prog/0.5:1;
    // Match trail angle exactly: trails go from a0->a1, blade tip does same via swordA = trailA - PI
    const a0=sw.dir - sw.hand*arc/2, a1=sw.dir + sw.hand*arc/2;
    const trailA = a0 + (a1-a0)*e;
    swordA = trailA - Math.PI;
  } else if(p.slam.wind>0){
    swordA=p.facing;
  }

  const SL=220*p.reach;

  /* ---- greatsword draw ---- */
  ctx.save();
  ctx.rotate(swordA);
  const tilt=p.ww.active>0?0:(p.swing?-0.04:0.13);
  ctx.rotate(tilt);
  ctx.lineCap='round'; ctx.lineJoin='round';

  /* grip */
  ctx.strokeStyle='#1a0e04'; ctx.lineWidth=11;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(26,0); ctx.stroke();
  ctx.strokeStyle='#7a5828'; ctx.lineWidth=7;
  ctx.setLineDash([5,5]);
  ctx.beginPath(); ctx.moveTo(2,0); ctx.lineTo(24,0); ctx.stroke();
  ctx.setLineDash([]);

  /* pommel */
  ctx.fillStyle='#100d06'; ctx.strokeStyle='#c8a24a'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(28,0,8,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#c8a24a'; ctx.beginPath(); ctx.arc(28,0,4,0,TAU); ctx.fill();

  /* cross-guard -- ornate dragon-wing barbs */
  // base bar
  ctx.fillStyle='#0e0c08'; ctx.strokeStyle='#9a7a38'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.rect(-18,-7,36,14); ctx.fill(); ctx.stroke();
  // gold trim line
  ctx.strokeStyle='rgba(200,162,74,0.6)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(-14,-3); ctx.lineTo(14,-3); ctx.moveTo(-14,3); ctx.lineTo(14,3); ctx.stroke();
  // wing barbs (each side: 3 barbs of different sizes)
  for(const s of [-1,1]){
    ctx.fillStyle='#0e0c08'; ctx.strokeStyle='#9a7a38'; ctx.lineWidth=2.2;
    // main large wing
    ctx.beginPath();
    ctx.moveTo(s*18,-6);
    ctx.lineTo(s*28,-18); ctx.lineTo(s*36,-8);
    ctx.lineTo(s*40,0);
    ctx.lineTo(s*36,8); ctx.lineTo(s*28,18);
    ctx.lineTo(s*18,6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // secondary barb (forward)
    ctx.beginPath();
    ctx.moveTo(s*22,-5); ctx.lineTo(s*32,-14); ctx.lineTo(s*26,-3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s*22,5); ctx.lineTo(s*32,14); ctx.lineTo(s*26,3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // tip spike
    ctx.strokeStyle='#c8a24a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(s*38,-3); ctx.lineTo(s*46,0); ctx.lineTo(s*38,3); ctx.stroke();
    // gold vein on wing
    ctx.strokeStyle='rgba(200,162,74,0.45)'; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(s*20,-2); ctx.quadraticCurveTo(s*30,-10,s*36,-7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s*20,2); ctx.quadraticCurveTo(s*30,10,s*36,7); ctx.stroke();
  }
  // center gem
  ctx.fillStyle='#0a0810'; ctx.strokeStyle='#9a7a38'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(0,0,8,6,0,0,TAU); ctx.fill(); ctx.stroke();
  ctx.shadowColor='#b94aff'; ctx.shadowBlur=14;
  ctx.fillStyle='#d64cff';
  ctx.beginPath(); ctx.ellipse(0,0,5,3.5,0,0,TAU); ctx.fill();
  ctx.shadowBlur=0;

  /* blade */
  const W0=24, W1=10, tipX=-SL, midX=-SL*0.52;
  ctx.beginPath();
  ctx.moveTo(-6,-W0/2);
  for(let i=0;i<6;i++){
    const bx=-6+(midX+6)*(i/5), bw=(W0/2)+(W1/2-W0/2)*(i/5);
    ctx.lineTo(bx,-bw+(i%2===0?5:-2));
  }
  ctx.lineTo(midX,-W1/2);
  ctx.lineTo(tipX*0.88,-3); ctx.lineTo(tipX,0); ctx.lineTo(tipX*0.88,3);
  ctx.lineTo(midX,W1/2);
  for(let i=5;i>=0;i--){
    const bx=-6+(midX+6)*(i/5), bw=(W0/2)+(W1/2-W0/2)*(i/5);
    ctx.lineTo(bx,bw-(i%2===0?5:-2));
  }
  ctx.lineTo(-6,W0/2); ctx.closePath();
  const bladeG=ctx.createLinearGradient(-6,0,tipX,0);
  bladeG.addColorStop(0,'#3c3830'); bladeG.addColorStop(0.3,'#1a1c22');
  bladeG.addColorStop(0.7,'#101318'); bladeG.addColorStop(1,'#090b0e');
  ctx.fillStyle=bladeG; ctx.fill();
  ctx.strokeStyle='#585860'; ctx.lineWidth=2.5; ctx.stroke();
  /* edge highlight */
  const edgeG=ctx.createLinearGradient(-6,0,tipX*0.85,0);
  edgeG.addColorStop(0,'rgba(210,220,230,.9)'); edgeG.addColorStop(0.6,'rgba(160,175,190,.4)'); edgeG.addColorStop(1,'rgba(100,130,160,0)');
  ctx.strokeStyle=edgeG; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-6,-W0/2+2); ctx.quadraticCurveTo(midX*0.45,-W1/2,midX,-W1/2+1); ctx.lineTo(tipX*0.87,-1); ctx.stroke();
  /* fuller */
  const fullG=ctx.createLinearGradient(-6,0,tipX*0.78,0);
  fullG.addColorStop(0,'rgba(70,85,110,.8)'); fullG.addColorStop(1,'rgba(30,40,60,0)');
  ctx.strokeStyle=fullG; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(-6,0); ctx.quadraticCurveTo(midX*0.5,1,tipX*0.78,0); ctx.stroke();
  /* runes */
  ctx.strokeStyle='rgba(200,162,74,.52)'; ctx.lineWidth=1.3;
  for(let i=0;i<7;i++){
    const lx=-24-i*((SL-28)/7), lw=(W0/2)*(1-i/7)*0.6;
    ctx.beginPath(); ctx.moveTo(lx,-lw); ctx.lineTo(lx+9,lw*0.4); ctx.stroke();
  }
  // weapon enchant illusion
  drawSwordEnchant(SL, t);
  ctx.restore(); /* sword */

  /* ---- body (tall skeleton) ---- */
  ctx.save();
  ctx.translate(0,bob);
  if(p.iframes>0 && Math.floor(t*16)%2===0) ctx.globalAlpha=0.55;
  const boneC=hurt?'#fff8ef':'#ede8d5', darkC='#07090e';
  ctx.lineCap='round'; ctx.lineJoin='round';

  /* legs */
  const walkA=Math.sin(p.step)*0.44;
  for(const s of [1,-1]){
    const lsw=s===1?walkA:-walkA;
    const hx=s*10, hy=38;
    const kx=hx+Math.sin(lsw)*23, ky=hy+Math.cos(lsw)*26;
    const fx=kx+Math.sin(lsw*0.4)*10, fy=ky+28;
    ctx.strokeStyle=boneC; ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(kx,ky); ctx.stroke();
    ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(fx,fy); ctx.stroke();
    ctx.fillStyle=darkC; ctx.strokeStyle=boneC; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(kx,ky,4.5,0,TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=boneC; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(fx+s*9,fy+4); ctx.stroke();
  }

  /* pelvis */
  ctx.strokeStyle=boneC; ctx.lineWidth=6;
  ctx.beginPath(); ctx.moveTo(-14,38); ctx.quadraticCurveTo(0,31,14,38); ctx.stroke();
  ctx.strokeStyle=darkC; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-10,34); ctx.lineTo(10,34); ctx.stroke();

  /* spine */
  ctx.strokeStyle=boneC; ctx.lineWidth=7;
  ctx.beginPath(); ctx.moveTo(0,35); ctx.lineTo(0,-24); ctx.stroke();
  ctx.strokeStyle=darkC; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,32); ctx.lineTo(0,-22); ctx.stroke();
  ctx.strokeStyle=boneC; ctx.lineWidth=2;
  for(let i=0;i<9;i++){
    const sy=28-i*7;
    ctx.beginPath(); ctx.moveTo(-5,sy); ctx.lineTo(5,sy); ctx.stroke();
  }

  /* ribs */
  ctx.lineWidth=4;
  for(let i=0;i<5;i++){
    const ry=-2+i*8, rw=15-i*1.4;
    ctx.strokeStyle=boneC;
    ctx.beginPath();
    ctx.moveTo(0,ry); ctx.quadraticCurveTo(-rw,ry-5,-rw-7,ry+3);
    ctx.moveTo(0,ry); ctx.quadraticCurveTo(rw,ry-5,rw+7,ry+3);
    ctx.stroke();
  }
  /* clavicle */
  ctx.strokeStyle=boneC; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(-17,-16); ctx.lineTo(17,-16); ctx.stroke();
  ctx.strokeStyle=darkC; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-12,-16); ctx.lineTo(12,-16); ctx.stroke();

  /* soul gem */
  const cp=1+Math.sin(t*6)*0.1;
  ctx.fillStyle=darkC;
  ctx.beginPath(); ctx.ellipse(0,6,7,14,0,0,TAU); ctx.fill();
  ctx.shadowColor='#b94aff'; ctx.shadowBlur=14;
  ctx.fillStyle='#c840ff';
  ctx.beginPath(); ctx.arc(0,5,4.5*cp,0,TAU); ctx.fill();
  ctx.shadowBlur=0;

  /* shoulder pauldrons */
  for(const s of [-1,1]){
    ctx.save(); ctx.translate(s*19,-15); ctx.rotate(s*0.24);
    ctx.fillStyle=darkC; ctx.strokeStyle='#c8a24a'; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.ellipse(0,0,14,9,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(200,162,74,.5)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-9,2); ctx.lineTo(9,-2); ctx.stroke();
    ctx.fillStyle=boneC; ctx.strokeStyle=darkC; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(-4,-19); ctx.lineTo(4,-19); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* sword arm (right) */
  const armDir=swordA-Math.PI;
  const elRx=17+Math.cos(armDir)*17, elRy=-14+Math.sin(armDir)*17;
  const haRx=elRx+Math.cos(armDir-0.18)*15, haRy=elRy+Math.sin(armDir-0.18)*15;
  ctx.strokeStyle=boneC; ctx.lineWidth=6;
  ctx.beginPath(); ctx.moveTo(17,-14); ctx.lineTo(elRx,elRy); ctx.stroke();
  ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(elRx,elRy); ctx.lineTo(haRx,haRy); ctx.stroke();
  ctx.fillStyle=darkC; ctx.strokeStyle=boneC; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(elRx,elRy,4.5,0,TAU); ctx.fill(); ctx.stroke();

  /* free arm (left) */
  const laDir=p.facing+Math.PI+0.45;
  const elLx=-17+Math.cos(laDir)*17, elLy=-14+Math.sin(laDir)*17;
  const haLx=elLx+Math.cos(laDir+0.3)*14, haLy=elLy+Math.sin(laDir+0.3)*14;
  ctx.strokeStyle=boneC; ctx.lineWidth=6;
  ctx.beginPath(); ctx.moveTo(-17,-14); ctx.lineTo(elLx,elLy); ctx.stroke();
  ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(elLx,elLy); ctx.lineTo(haLx,haLy); ctx.stroke();
  ctx.fillStyle=darkC; ctx.strokeStyle=boneC; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(elLx,elLy,4.5,0,TAU); ctx.fill(); ctx.stroke();

  /* skull */
  ctx.save();
  ctx.translate(Math.cos(p.facing)*5,-24+Math.sin(p.facing)*3);
  const sk=ctx.createRadialGradient(-5,-9,4,0,0,20);
  sk.addColorStop(0,hurt?'#fff8ef':'#f2edd4');
  sk.addColorStop(0.6,'#cec5a8'); sk.addColorStop(1,'#7e7870');
  ctx.fillStyle=sk;
  ctx.beginPath(); ctx.ellipse(0,-2,13,18,0,0,TAU); ctx.fill();
  ctx.strokeStyle=darkC; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle='#ddd5ba'; ctx.strokeStyle=darkC; ctx.lineWidth=2;
  ctx.beginPath();
  if(ctx.roundRect){ ctx.roundRect(-9,8,18,10,3); } else { ctx.rect(-9,8,18,10); }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle='#010208';
  ctx.beginPath(); ctx.ellipse(-4.5,-5,4.2,5.8,-0.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4.5,-5,4.2,5.8,0.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-3,5); ctx.lineTo(3,5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=darkC; ctx.lineWidth=1.3;
  for(let i=-2;i<=2;i++){
    ctx.beginPath(); ctx.moveTo(i*3,9); ctx.lineTo(i*3,16); ctx.stroke();
  }
  ctx.shadowColor='#b94aff'; ctx.shadowBlur=10;
  ctx.fillStyle='#d060ff';
  ctx.beginPath(); ctx.arc(-4.5,-6,2.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5,-6,2.2,0,TAU); ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore(); /* head */
  ctx.restore(); /* body */

  /* whirlwind ring */
  if(p.ww.active>0){
    ctx.globalAlpha=0.45;
    ctx.strokeStyle='#cfe9ff'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(0,0,175*p.reach,wwSpin,wwSpin+2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,150*p.reach,-wwSpin,-wwSpin+1.8); ctx.stroke();
    ctx.globalAlpha=1;
  }
  /* slam indicator */
  if(p.slam.wind>0){
    ctx.strokeStyle='rgba(232,182,76,.6)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,230*p.reach*(1-p.slam.wind/0.28),0,TAU); ctx.stroke();
  }
  ctx.restore();
}


/* ---- enemies ---- */
function _drawSpider(ctx, e, bodyC, fa){
  const r = e.r;
  const t = e.t;
  const type = e.type;

  // Per-type config
  const cfg = {
    spiderling:   {legs:8, legW:1.2, legL:0.9,  abdR:0.50, ceR:0.38, eyeC:'#ff2020', pupils:2, hairy:false, spine:false, abdGlow:null},
    dart_spider:  {legs:8, legW:1.4, legL:1.0,  abdR:0.52, ceR:0.40, eyeC:'#aa40ff', pupils:2, hairy:false, spine:true,  abdGlow:null},
    venom_spitter:{legs:8, legW:1.6, legL:1.1,  abdR:0.58, ceR:0.42, eyeC:'#40ff40', pupils:4, hairy:false, spine:false, abdGlow:'#30aa20'},
    cobweb_crawler:{legs:8,legW:1.5, legL:1.05, abdR:0.55, ceR:0.38, eyeC:'#d0cc80', pupils:2, hairy:true,  spine:false, abdGlow:null},
    blood_stalker:{legs:8, legW:1.6, legL:1.15, abdR:0.54, ceR:0.42, eyeC:'#ff0000', pupils:2, hairy:false, spine:true,  abdGlow:'#8a0000'},
    carapace_guard:{legs:8,legW:2.2, legL:0.95, abdR:0.60, ceR:0.45, eyeC:'#8080ff', pupils:4, hairy:false, spine:false, abdGlow:'#1a1060'},
    jade_widow:   {legs:8, legW:1.7, legL:1.1,  abdR:0.58, ceR:0.40, eyeC:'#60ff80', pupils:6, hairy:false, spine:false, abdGlow:'#104020'},
    phase_stalker:{legs:8, legW:1.5, legL:1.2,  abdR:0.52, ceR:0.40, eyeC:'#d080ff', pupils:2, hairy:false, spine:true,  abdGlow:'#30006a'},
    brood_mother: {legs:8, legW:2.0, legL:1.0,  abdR:0.65, ceR:0.48, eyeC:'#ff60d0', pupils:8, hairy:true,  spine:false, abdGlow:'#4a0a3a'},
    void_weaver:  {legs:8, legW:2.5, legL:1.0,  abdR:0.68, ceR:0.52, eyeC:'#c080ff', pupils:8, hairy:false, spine:false, abdGlow:'#200050'},
  }[type] || {legs:8,legW:1.5,legL:1.0,abdR:0.55,ceR:0.40,eyeC:'#ff2020',pupils:2,hairy:false,spine:false,abdGlow:null};

  const abdR  = r * cfg.abdR;
  const ceR   = r * cfg.ceR;
  const legLen = r * 1.55 * cfg.legL;
  const legOff = r * 0.3; // cephalothorax offset from center

  // Abdomen (back, larger oval)
  const abdX = -legOff * 0.6;
  if(cfg.abdGlow){
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.3+Math.sin(t*4)*0.1;
    ctx.fillStyle=cfg.abdGlow; ctx.beginPath(); ctx.ellipse(abdX,0,abdR+6,abdR+4,0,0,TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle=bodyC; ctx.beginPath(); ctx.ellipse(abdX,0,abdR,abdR*0.82,0,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.2; ctx.stroke();

  // Hairy texture (cobweb_crawler, brood_mother)
  if(cfg.hairy){
    ctx.strokeStyle='rgba(180,160,140,0.35)'; ctx.lineWidth=0.8;
    for(let i=0;i<8;i++){
      const ha=i/8*TAU;
      ctx.beginPath();
      ctx.moveTo(abdX+Math.cos(ha)*abdR*0.7,Math.sin(ha)*abdR*0.7);
      ctx.lineTo(abdX+Math.cos(ha)*abdR,Math.sin(ha)*abdR); ctx.stroke();
    }
  }

  // Hourglass / marking on abdomen
  if(type==='jade_widow'){
    ctx.fillStyle='#ff2020';
    ctx.beginPath(); ctx.ellipse(abdX,0,abdR*0.22,abdR*0.45,0,0,TAU); ctx.fill();
  } else if(type==='void_weaver'){
    // void eye marking
    ctx.fillStyle='rgba(140,80,255,0.5)';
    ctx.beginPath(); ctx.ellipse(abdX,0,abdR*0.4,abdR*0.5,0,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(220,180,255,0.7)';
    ctx.beginPath(); ctx.ellipse(abdX,0,abdR*0.12,abdR*0.18,0,0,TAU); ctx.fill();
  } else if(type==='brood_mother'){
    // egg sac stripes
    ctx.strokeStyle='rgba(80,20,60,0.5)'; ctx.lineWidth=2;
    for(let i=-1;i<=1;i++){
      ctx.beginPath(); ctx.moveTo(abdX+i*abdR*0.3,-abdR*0.7); ctx.lineTo(abdX+i*abdR*0.3,abdR*0.7); ctx.stroke();
    }
  }

  // Legs (8, 4 per side, animated skitter)
  ctx.strokeStyle = type==='cobweb_crawler' ? 'rgba(200,195,170,0.8)' : 'rgba(0,0,0,0.65)';
  ctx.lineWidth = cfg.legW;
  ctx.lineCap = 'round';
  const legAngles = [-0.55, -0.28, 0.28, 0.55];
  for(let side=-1;side<=1;side+=2){
    for(let li=0;li<4;li++){
      const baseA  = (side<0 ? Math.PI - legAngles[li] : legAngles[li]);
      const swing  = Math.sin(t*8 + li*0.6 + (side<0?1.5:0)) * 0.12;
      const a      = baseA + swing;
      const midX   = Math.cos(a) * legLen * 0.5;
      const midY   = Math.sin(a) * legLen * 0.5 - r*0.15;
      const tipX   = Math.cos(a) * legLen + Math.sin(a + Math.PI/3) * legLen*0.3;
      const tipY   = Math.sin(a) * legLen - Math.cos(a + Math.PI/3) * legLen*0.2;
      ctx.beginPath();
      ctx.moveTo(abdX*0.2, 0);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
    }
  }

  // Spines on abdomen (dart_spider, blood_stalker, phase_stalker)
  if(cfg.spine){
    ctx.fillStyle='rgba(180,140,200,0.7)';
    for(let i=0;i<5;i++){
      const sa = Math.PI + (i/4)*Math.PI - Math.PI/2 + 0.2;
      const sx = abdX + Math.cos(sa)*abdR;
      const sy = Math.sin(sa)*abdR;
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(sa);
      ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(r*0.22,0); ctx.lineTo(0,3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // Cephalothorax (front, smaller oval, faces player)
  ctx.save(); ctx.rotate(fa);
  ctx.fillStyle=bodyC; ctx.beginPath(); ctx.ellipse(ceR*0.5,0,ceR,ceR*0.78,0,0,TAU); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1; ctx.stroke();

  // Eyes
  const eyeR = ceR*0.22;
  ctx.fillStyle=cfg.eyeC;
  const eyeCount = Math.min(cfg.pupils, 8);
  if(eyeCount<=2){
    ctx.beginPath(); ctx.arc(ceR*0.9, -ceR*0.28, eyeR, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ceR*0.9,  ceR*0.28, eyeR, 0, TAU); ctx.fill();
  } else if(eyeCount<=4){
    for(const [ex,ey] of [[0.9,-0.35],[0.9,0.35],[1.1,-0.12],[1.1,0.12]]){
      ctx.beginPath(); ctx.arc(ceR*ex,ceR*ey,eyeR*0.9,0,TAU); ctx.fill();
    }
  } else {
    // 6-8 eyes: two rows
    const epos=[[0.9,-0.38],[0.9,0.38],[1.05,-0.22],[1.05,0.22],[1.15,-0.08],[1.15,0.08],[0.75,-0.3],[0.75,0.3]];
    for(let i=0;i<eyeCount;i++){
      ctx.beginPath(); ctx.arc(ceR*epos[i][0],ceR*epos[i][1],eyeR*0.8,0,TAU); ctx.fill();
    }
  }
  // Pupils
  ctx.fillStyle='rgba(0,0,0,0.7)';
  if(eyeCount<=2){
    ctx.beginPath(); ctx.arc(ceR*0.92,-ceR*0.27,eyeR*0.45,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ceR*0.92, ceR*0.27,eyeR*0.45,0,TAU); ctx.fill();
  }
  // Chelicerae (mandibles)
  ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.5; ctx.lineCap='round';
  for(const s of [-1,1]){
    ctx.beginPath(); ctx.moveTo(ceR*1.1,s*ceR*0.1);
    ctx.quadraticCurveTo(ceR*1.6,s*ceR*0.25, ceR*1.5,s*ceR*0.12); ctx.stroke();
  }
  ctx.restore();

  // Phase stalker blink effect
  if(type==='phase_stalker' && e.tele>0){
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.35+Math.sin(t*25)*0.25;
    ctx.fillStyle='#6020a0'; ctx.beginPath(); ctx.arc(0,0,r+8,0,TAU); ctx.fill();
    ctx.restore();
  }
  // Void weaver void aura
  if(type==='void_weaver'){
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.15+Math.sin(t*2.5)*0.08;
    ctx.fillStyle='#5010a0'; ctx.beginPath(); ctx.arc(0,0,r*1.6,0,TAU); ctx.fill();
    ctx.restore();
  }
  // Blood stalker leap flash
  if(type==='blood_stalker' && e.leapWind>0){
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.4+Math.sin(t*30)*0.2;
    ctx.fillStyle='#cc0000'; ctx.beginPath(); ctx.arc(0,0,r+10,0,TAU); ctx.fill();
    ctx.restore();
  }
  // Brood mother egg sac glow
  if(type==='brood_mother'){
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.12+Math.sin(t*3)*0.06;
    ctx.fillStyle='#aa40c0'; ctx.beginPath(); ctx.arc(0,0,r*1.4,0,TAU); ctx.fill();
    ctx.restore();
  }
  // Cobweb crawl web indicator
  if(type==='cobweb_crawler' && (e.webCd||0)<0.4){
    ctx.strokeStyle='rgba(160,180,100,0.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(0,0,70,0,TAU); ctx.stroke();
  }
}

function drawEnemy(e){
  ctx.save(); ctx.translate(e.x,e.y);
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0,e.r*0.85,e.r*1.1,e.r*0.42,0,0,TAU); ctx.fill();
  if(e.elite){
    const g=ctx.createRadialGradient(0,0,e.r*0.4,0,0,e.r*1.9);
    g.addColorStop(0,'rgba(232,182,76,.0)'); g.addColorStop(0.8,'rgba(232,182,76,.28)'); g.addColorStop(1,'rgba(232,182,76,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,e.r*1.9,0,TAU); ctx.fill();
  }
  const flash = e.hitFlash>0;
  const bodyC = flash?'#ffffff':e.color;
  const fa = Math.atan2(G.player.y-e.y, G.player.x-e.x);
  const bob = Math.sin(e.t*8)*2;
  ctx.translate(0,bob);
  if(e.stun>0){
    ctx.save();
    ctx.globalAlpha = clamp(e.stun,0,1);
    ctx.strokeStyle='#ffd75c';
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(0,-e.r-10,e.r*0.8,e.r*0.25,0,0,TAU); ctx.stroke();
    ctx.fillStyle='#fff0a8';
    for(let i=0;i<3;i++){
      const a=e.t*4+i/3*TAU;
      ctx.beginPath(); ctx.arc(Math.cos(a)*e.r*0.55,-e.r-10+Math.sin(a)*3,2.3,0,TAU); ctx.fill();
    }
    ctx.restore();
  }

  if(e.type==='imp'){
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#5e2113'; ctx.lineWidth=2; ctx.stroke();
    // horns + eyes
    ctx.fillStyle='#f2e2c0';
    ctx.beginPath(); ctx.moveTo(-7,-e.r+3); ctx.lineTo(-12,-e.r-8); ctx.lineTo(-3,-e.r+1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7,-e.r+3); ctx.lineTo(12,-e.r-8); ctx.lineTo(3,-e.r+1); ctx.fill();
    eyes(fa, 5, '#ffe26a');
  }
  else if(e.type==='grunt'){
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#2c3a18'; ctx.lineWidth=2.5; ctx.stroke();
    // little axe
    ctx.save(); ctx.rotate(fa + (e.tele>0?Math.sin(e.t*40)*0.3:0.5));
    ctx.translate(e.r+6,0);
    ctx.fillStyle='#6a4a26'; ctx.fillRect(-2,-12,4,20);
    ctx.fillStyle='#aab2bc'; ctx.beginPath(); ctx.moveTo(-2,-12); ctx.quadraticCurveTo(12,-12,10,2); ctx.lineTo(-2,-2); ctx.fill();
    ctx.restore();
    eyes(fa, 6, '#ffd75c');
    // headband
    ctx.fillStyle='#a82a1e'; ctx.fillRect(-e.r+3,-8,2*e.r-6,5);
  }
  else if(e.type==='shaman'){
    // robe (triangle-ish)
    ctx.fillStyle=bodyC;
    ctx.beginPath(); ctx.moveTo(0,-e.r-4); ctx.lineTo(e.r,e.r); ctx.lineTo(-e.r,e.r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#3a1d52'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.fillStyle='#caa3ff'; ctx.fillRect(-4,-e.r-12,8,10); // hood tip glowstone
    // staff with orb
    ctx.save(); ctx.rotate(fa); ctx.translate(e.r+4,0);
    ctx.strokeStyle='#5a4326'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-4,10); ctx.lineTo(6,-14); ctx.stroke();
    const pulse = e.atkCd<0.5? 1.4:1;
    ctx.fillStyle='#c06aff'; ctx.beginPath(); ctx.arc(7,-16,5*pulse,0,TAU); ctx.fill();
    ctx.restore();
    eyes(fa, 5, '#e0c0ff');
  }
  else if(e.type==='brute' && !e.boss){
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#352a20'; ctx.lineWidth=3.5; ctx.stroke();
    // armor plates
    ctx.fillStyle='#4d4339'; ctx.beginPath(); ctx.arc(0,-e.r*0.35,e.r*0.7,Math.PI,TAU); ctx.fill();
    for(const s of [-1,1]){
      ctx.fillStyle='#ded3b8';
      ctx.beginPath(); ctx.moveTo(s*e.r*0.7,-e.r*0.5); ctx.lineTo(s*e.r*1.1,-e.r*1.05); ctx.lineTo(s*e.r*0.4,-e.r*0.7); ctx.closePath(); ctx.fill();
    }
    eyes(fa, 7, '#ff6a4a');
    if(e.tele>0){ // big windup ring
      ctx.strokeStyle=`rgba(255,90,60,${0.4+Math.sin(e.t*30)*0.3})`; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(0,0,e.r+78,fa-0.8,fa+0.8); ctx.stroke();
    }
  }
  else if(e.type==='bomber'){
    const fl = e.fuse>=0 ? Math.floor(e.t*14)%2===0 : false;
    ctx.fillStyle = fl?'#c0392b':bodyC;
    ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#15171c'; ctx.lineWidth=2.5; ctx.stroke();
    // fuse
    ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(4,-e.r+2); ctx.quadraticCurveTo(10,-e.r-8,16,-e.r-6); ctx.stroke();
    ctx.fillStyle='#ffd75c'; ctx.beginPath(); ctx.arc(16,-e.r-6,3+Math.sin(e.t*20)*1.5,0,TAU); ctx.fill();
    eyes(fa, 5, fl?'#fff':'#ff9a5c');
    if(e.fuse>=0){
      ctx.strokeStyle='rgba(255,120,60,.5)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(0,0,130,0,TAU); ctx.stroke();
    }
  }
  else if(e.type==='pit_runner'){
    // Foroverbøjet goblin — smal, hurtig silhuet
    ctx.fillStyle=bodyC; ctx.beginPath();
    ctx.ellipse(0,0,e.r*0.65,e.r,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#3a0808'; ctx.lineWidth=1.5; ctx.stroke();
    // red cloth scraps
    ctx.fillStyle='#8b1a1a';
    ctx.beginPath(); ctx.ellipse(0,e.r*0.3,e.r*0.5,e.r*0.3,0,0,TAU); ctx.fill();
    // chains
    ctx.strokeStyle='#666060'; ctx.lineWidth=1.5;
    for(const s of [-1,1]){
      ctx.beginPath(); ctx.moveTo(s*e.r*0.5,e.r*0.1);
      ctx.lineTo(s*e.r*0.9,e.r*0.6); ctx.stroke();
    }
    eyes(fa, 4, '#ffee00');
    // speed burst glow
    if(e.burstCd>0 && e.burstCd<0.35){
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.4;
      ctx.fillStyle='#ff4040'; ctx.beginPath(); ctx.arc(0,0,e.r+6,0,TAU); ctx.fill();
      ctx.restore();
    }
  }
  else if(e.type==='chain_brute'){
    // Chain trailing behind movement direction
    const trailA = fa + Math.PI;
    ctx.strokeStyle='#5a5040'; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(Math.cos(trailA)*e.r,Math.sin(trailA)*e.r);
    for(let i=1;i<=5;i++){
      const cx=Math.cos(trailA)*( e.r+i*18)+Math.sin(trailA+i)*6;
      const cy=Math.sin(trailA)*(e.r+i*18)+Math.cos(trailA+i)*6;
      ctx.lineTo(cx,cy);
    }
    ctx.stroke();
    // Ball
    ctx.fillStyle='#3a3028';
    const bx=Math.cos(trailA)*(e.r+95), by=Math.sin(trailA)*(e.r+95);
    ctx.beginPath(); ctx.arc(bx,by,12,0,TAU); ctx.fill();
    ctx.strokeStyle='#6a5a40'; ctx.lineWidth=2; ctx.stroke();
    // Body
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#2a2018'; ctx.lineWidth=4; ctx.stroke();
    // Armor plate
    ctx.fillStyle='#6a5a48'; ctx.beginPath(); ctx.arc(0,-e.r*0.2,e.r*0.75,Math.PI,TAU); ctx.fill();
    eyes(fa, 8, '#ff9a4a');
    if(e.chainWind>0){
      const prog = 1-e.chainWind/1.4;
      ctx.strokeStyle=`rgba(180,140,60,${0.3+prog*0.5})`; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(0,0,220,0,TAU*prog); ctx.stroke();
    }
  }
  else if(e.type==='spear_dancer'){
    // Slank med langt spyd
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.ellipse(0,0,e.r*0.75,e.r,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#5a2a0a'; ctx.lineWidth=2; ctx.stroke();
    // red scarf
    ctx.fillStyle='#cc2020'; ctx.beginPath();
    ctx.ellipse(0,-e.r*0.2,e.r*0.55,e.r*0.28,fa,0,TAU); ctx.fill();
    // spear — long line in facing direction
    ctx.save(); ctx.rotate(e.spearDir||fa);
    ctx.strokeStyle='#c8a060'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-e.r-4,0); ctx.lineTo(e.r+52,0); ctx.stroke();
    ctx.fillStyle='#e0d0a0'; ctx.beginPath();
    ctx.moveTo(e.r+52,-5); ctx.lineTo(e.r+68,0); ctx.lineTo(e.r+52,5); ctx.fill();
    ctx.restore();
    eyes(fa, 5, '#ffcc80');
    if(e.spearWind>0 && e.spearWind<0.6){
      ctx.strokeStyle='rgba(255,128,64,0.5)'; ctx.lineWidth=2; ctx.setLineDash([6,4]);
      const a=e.spearDir||fa;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.r,Math.sin(a)*e.r);
      ctx.lineTo(Math.cos(a)*700,Math.sin(a)*700); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  else if(e.type==='plague_crawler'){
    // Bred, lav insektkrop
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.ellipse(0,0,e.r*1.2,e.r*0.75,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#1a3a0a'; ctx.lineWidth=2; ctx.stroke();
    // insect legs
    ctx.strokeStyle='#2a4a1a'; ctx.lineWidth=2;
    for(let i=-1;i<=1;i+=2){
      for(const y of [-6,0,6]){
        ctx.beginPath(); ctx.moveTo(i*e.r*0.8,y); ctx.lineTo(i*e.r*1.6,y+i*5); ctx.stroke();
      }
    }
    // green pustules
    ctx.fillStyle='#80e020';
    for(const [ox,oy] of [[-5,-6],[4,-4],[0,5],[-8,2],[7,-2]]){
      const ps=3+Math.sin(e.t*6+ox)*1;
      ctx.beginPath(); ctx.arc(ox,oy,ps,0,TAU); ctx.fill();
    }
    eyes(fa, 7, '#c0ff40');
  }
  else if(e.type==='gore_leaper'){
    // Predator — breed front, spids bag
    ctx.fillStyle=bodyC;
    ctx.save(); ctx.rotate(fa);
    ctx.beginPath(); ctx.moveTo(e.r+6,0); ctx.quadraticCurveTo(e.r*0.2,e.r*0.9,-e.r,0);
    ctx.quadraticCurveTo(e.r*0.2,-e.r*0.9,e.r+6,0); ctx.fill();
    ctx.strokeStyle='#3a0808'; ctx.lineWidth=2.5; ctx.stroke();
    // metal mask
    ctx.fillStyle='#6a6058'; ctx.fillRect(-4,-e.r*0.35,e.r*0.7,e.r*0.7);
    ctx.strokeStyle='#2a2020'; ctx.lineWidth=1.5; ctx.strokeRect(-4,-e.r*0.35,e.r*0.7,e.r*0.7);
    // spikes on back
    ctx.fillStyle='#8a3a3a';
    for(let i=0;i<3;i++){
      const sy=-e.r*0.5+i*e.r*0.5;
      ctx.beginPath(); ctx.moveTo(-e.r*0.4+i*2,sy-6); ctx.lineTo(-e.r*0.6+i*2,sy); ctx.lineTo(-e.r*0.2+i*2,sy); ctx.fill();
    }
    ctx.restore();
    eyes(fa, e.r*0.3, '#ff2020');
    if(e.leapWind>0){
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.4+Math.sin(e.t*30)*0.2;
      ctx.fillStyle='#ff2020'; ctx.beginPath(); ctx.arc(0,0,e.r+10,0,TAU); ctx.fill();
      ctx.restore();
    }
  }
  else if(e.type==='bell_ringer'){
    // Tynd figur
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.ellipse(0,0,e.r*0.6,e.r,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#2a1a3a'; ctx.lineWidth=2; ctx.stroke();
    // big bone bell on back — glows purple
    const bellPulse=1+Math.sin(e.t*(e.bellCd<1?20:4))*0.08;
    ctx.save(); ctx.translate(0,-e.r*0.1);
    ctx.fillStyle='#d0c8a8';
    ctx.beginPath(); ctx.ellipse(0,-e.r*0.5,e.r*0.7*bellPulse,e.r*0.55*bellPulse,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#c0a0ff'; ctx.lineWidth=2; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.3+Math.sin(e.t*4)*0.1;
    ctx.fillStyle='#b94aff'; ctx.beginPath(); ctx.arc(0,-e.r*0.5,e.r*0.5,0,TAU); ctx.fill();
    ctx.restore(); ctx.restore();
    eyes(fa, 4, '#e0c0ff');
  }
  else if(e.type==='totem_carrier'){
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#3a2008'; ctx.lineWidth=2; ctx.stroke();
    // totem pole on back
    ctx.fillStyle='#6a4a28'; ctx.fillRect(-3,-e.r-22,6,22);
    ctx.strokeStyle='#c87828'; ctx.lineWidth=1.5; ctx.strokeRect(-3,-e.r-22,6,22);
    // flame
    const flicker=Math.sin(e.t*14)*3;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.7+Math.sin(e.t*10)*0.2;
    ctx.fillStyle='#ff8820';
    ctx.beginPath(); ctx.ellipse(0,-e.r-28+flicker*0.3,6+Math.abs(flicker)*0.5,10+flicker,0,0,TAU); ctx.fill();
    ctx.fillStyle='#ffee80'; ctx.beginPath(); ctx.ellipse(0,-e.r-30,3,5,0,0,TAU); ctx.fill();
    ctx.restore();
    eyes(fa, 5, '#ffaa40');
    // aura ring when buffing
    if(e.auraCd<0.15){
      ctx.strokeStyle='rgba(255,160,40,0.3)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,140,0,TAU); ctx.stroke();
    }
  }
  else if(e.type==='mirror_shade'){
    // Mørk skygge med lilla kanter
    ctx.save();
    ctx.globalAlpha=0.72;
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle='#8080ff'; ctx.lineWidth=2.5;
    ctx.shadowColor='#6060ff'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.stroke();
    ctx.shadowBlur=0;
    // sword afterimage in facing dir
    ctx.save(); ctx.rotate(fa); ctx.globalAlpha=0.5;
    ctx.strokeStyle='#a0a0ff'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-4,0); ctx.lineTo(e.r+18,0); ctx.stroke();
    ctx.restore();
    eyes(fa, 5, '#c0c0ff');
    if(e.echoPending){
      ctx.strokeStyle='rgba(128,128,255,0.4)'; ctx.lineWidth=2; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(e.echoPending.x-e.x,e.echoPending.y-e.y,28,0,TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  else if(e.type==='goldgut'){
    // Fed lille goblin med kæmpe guldpose
    ctx.fillStyle=bodyC; ctx.beginPath(); ctx.ellipse(0,2,e.r*0.85,e.r,0,0,TAU); ctx.fill();
    ctx.strokeStyle='#5a3a08'; ctx.lineWidth=2; ctx.stroke();
    // gold backpack
    ctx.fillStyle='#d4a020'; ctx.strokeStyle='#8a6010'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(0,-e.r*0.15,e.r*0.7,e.r*0.65,0,0,TAU); ctx.fill(); ctx.stroke();
    // coins
    ctx.fillStyle='#ffd700';
    for(const [ox,oy] of [[-5,-4],[4,-6],[0,-2],[-7,-8],[6,-2]]){
      ctx.beginPath(); ctx.arc(ox,oy,2.5,0,TAU); ctx.fill();
    }
    eyes(fa, 6, '#ffe060');
  }
  else if(e.type==='rift_maw'){
    // Stationær void-portal
    ctx.save();
    // outer glow
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.18+Math.sin(e.t*3)*0.07;
    ctx.fillStyle='#8020c0';
    ctx.beginPath(); ctx.arc(0,0,e.r+18,0,TAU); ctx.fill();
    ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
    ctx.restore();
    // void mouth
    const mouthGrad=ctx.createRadialGradient(0,0,4,0,0,e.r);
    mouthGrad.addColorStop(0,'#000000');
    mouthGrad.addColorStop(0.5,'#2a005a');
    mouthGrad.addColorStop(1,'#6010a0');
    ctx.fillStyle=mouthGrad; ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#9040d0'; ctx.lineWidth=3; ctx.stroke();
    // teeth
    ctx.fillStyle='#d0c0e0';
    for(let i=0;i<8;i++){
      const a=i/8*TAU+e.t*0.5;
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(e.r-4,0); ctx.lineTo(e.r+8,-4); ctx.lineTo(e.r+8,4); ctx.fill();
      ctx.restore();
    }
    // glowing centre
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.5+Math.sin(e.t*5)*0.2;
    ctx.fillStyle='#c060ff'; ctx.beginPath(); ctx.arc(0,0,8+Math.sin(e.t*7)*2,0,TAU); ctx.fill();
    ctx.restore();
    // tentacle spurs
    ctx.strokeStyle='#6010a0'; ctx.lineWidth=2;
    for(let i=0;i<4;i++){
      const a=i/4*TAU+e.t*0.8;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.r,Math.sin(a)*e.r);
      ctx.quadraticCurveTo(Math.cos(a+0.6)*(e.r+16),Math.sin(a+0.6)*(e.r+16),
        Math.cos(a+1.0)*(e.r+6),Math.sin(a+1.0)*(e.r+6)); ctx.stroke();
    }
  }
  else if(['spiderling','venom_spitter','dart_spider','cobweb_crawler','blood_stalker',
           'carapace_guard','jade_widow','phase_stalker','brood_mother','void_weaver'].includes(e.type)){
    _drawSpider(ctx, e, bodyC, fa);
  }
  else if(e.boss){
    // big armored tyrant
    ctx.fillStyle=flash?'#fff':'#4a3d52';
    ctx.beginPath(); ctx.arc(0,0,e.r,0,TAU); ctx.fill();
    ctx.strokeStyle='#1c1424'; ctx.lineWidth=5; ctx.stroke();
    ctx.fillStyle=flash?'#fff':'#6a5680';
    ctx.beginPath(); ctx.arc(0,-e.r*0.2,e.r*0.8,Math.PI,TAU); ctx.fill();
    for(const s of [-1,1]){
      ctx.fillStyle='#e0d4b4';
      ctx.beginPath(); ctx.moveTo(s*e.r*0.55,-e.r*0.6); ctx.lineTo(s*e.r*1.05,-e.r*1.35); ctx.lineTo(s*e.r*0.25,-e.r*0.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#9a8a62'; ctx.lineWidth=2; ctx.stroke();
    }
    // skull face
    ctx.fillStyle='#e8ddc2'; ctx.beginPath(); ctx.arc(0,-4,e.r*0.42,0,TAU); ctx.fill();
    ctx.fillRect(-e.r*0.28, e.r*0.18, e.r*0.56, e.r*0.22);
    ctx.fillStyle='#b94aff';
    ctx.beginPath(); ctx.arc(-e.r*0.16,-6,6,0,TAU); ctx.arc(e.r*0.16,-6,6,0,TAU); ctx.fill();
    ctx.shadowColor='#b94aff'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(-e.r*0.16,-6,3,0,TAU); ctx.arc(e.r*0.16,-6,3,0,TAU); ctx.fillStyle='#f0dcff'; ctx.fill();
    ctx.shadowBlur=0;
    // Boss nameplate
    const bossLabel = '💀 ' + (e.nm || 'BOSS');
    ctx.font = 'bold 13px Impact';
    const bossNmW = ctx.measureText(bossLabel).width + 18;
    const bossNmY = -e.r - 28;
    ctx.fillStyle = 'rgba(80,0,0,0.82)';
    ctx.strokeStyle = '#cc1010';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-bossNmW/2, bossNmY-13, bossNmW, 18, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff3030';
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(bossLabel, 0, bossNmY);
    ctx.shadowBlur = 0;
  }

  // Burning / Cursed status rings
  if(e.burning){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha = 0.5 + Math.sin(e.t*9)*0.2;
    ctx.strokeStyle='#ff6020'; ctx.lineWidth=3;
    ctx.shadowColor='#ff4010'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(0,0,e.r+4+Math.sin(e.t*7)*1.5,0,TAU); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.restore();
  }
  if(e.cursed){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha = 0.4 + Math.sin(e.t*6)*0.18;
    ctx.strokeStyle='#8820e0'; ctx.lineWidth=2.5;
    ctx.shadowColor='#c040ff'; ctx.shadowBlur=12;
    ctx.setLineDash([5,5]); ctx.lineDashOffset = -e.t*22;
    ctx.beginPath(); ctx.arc(0,0,e.r+8,0,TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur=0;
    ctx.restore();
  }

  // hp bar (not boss — boss uses top bar)
  if(!e.boss){
    const w=e.r*3.0;
    // Totem nameplate
    if(e.type==='totem_carrier'){
      const label='⚡ TOTEM';
      ctx.font='bold 10px Impact';
      const tw=ctx.measureText(label).width+10;
      ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(-tw/2,-e.r-30,tw,14);
      ctx.strokeStyle='#ff8820'; ctx.lineWidth=1; ctx.strokeRect(-tw/2,-e.r-30,tw,14);
      ctx.fillStyle='#ff9940'; ctx.textAlign='center';
      ctx.fillText(label,0,-e.r-20);
    }
    const hpMax = e.maxHp || e.maxhp || 1;
    const hpPct = clamp(e.hp / hpMax, 0, 1);
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(-w/2,-e.r-16,w,8);
    ctx.fillStyle=e.rare?'#ffd700':e.elite?'#e8b64c':e.type==='totem_carrier'?'#ff8820':'#d8453a'; ctx.fillRect(-w/2,-e.r-16,w*hpPct,8);
    if(e.rare){
      ctx.font='12px serif'; ctx.textAlign='left';
      ctx.fillText('⭐', w/2+3, -e.r-9);
    }
    if(e.affixIcon){
      if(e.affix === 'cursed'){
        // draw green poison drop
        ctx.save();
        ctx.translate(-w/2-8, -e.r-12);
        ctx.beginPath();
        ctx.moveTo(0,-5);
        ctx.bezierCurveTo(3.5,-1, 4,1.5, 4,3);
        ctx.arc(0,3,4,0,Math.PI);
        ctx.bezierCurveTo(-4,1.5,-3.5,-1,0,-5);
        ctx.fillStyle='#40d060'; ctx.fill();
        ctx.beginPath();
        ctx.arc(-1,1.5,1.3,0,TAU);
        ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fill();
        ctx.restore();
      } else {
        ctx.font='12px serif'; ctx.textAlign='right';
        ctx.fillText(e.affixIcon, -w/2-3, -e.r-9);
      }
    }
  }
  // hit-flash glow overlay
  if(e.hitFlash>0){
    const f = e.hitFlash/0.12;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha = f * 0.6;
    ctx.fillStyle='#ffffff';
    ctx.shadowColor='#ffffff'; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(0,0,e.r*1.1,0,TAU); ctx.fill();
    ctx.restore();
  }
  // Affix ring + label
  if(e.affix){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.5+Math.sin(e.t*8)*0.2;
    ctx.strokeStyle=e.affixColor; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,e.r+5+Math.sin(e.t*6)*2,0,TAU); ctx.stroke();
    ctx.restore();
  }
  // Totem buff aura
  if(e.totemBuffT>0){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.22*(e.totemBuffT/0.6);
    ctx.fillStyle='#ff8820'; ctx.beginPath(); ctx.arc(0,0,e.r+8,0,TAU); ctx.fill();
    ctx.restore();
  }
  // Rare pulsing gold ring
  if(e.rare){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.35+Math.sin(e.t*5)*0.15;
    ctx.strokeStyle='#ffd700'; ctx.lineWidth=2.5;
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(0,0,e.r+10,0,TAU); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.restore();
  }
  ctx.restore();

  function eyes(fa,off,color){
    const ex=Math.cos(fa)*off*0.5, ey=Math.sin(fa)*off*0.5;
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.arc(ex-off*0.7,ey-2,3,0,TAU); ctx.arc(ex+off*0.7,ey-2,3,0,TAU); ctx.fill();
  }
}

function drawItemAuras(p,t){
  if(!G.items || !G.items.length) return;
  const count = G.items.length;
  for(let i=0;i<count;i++){
    const it = G.items[i], def = getItemDef(it.id);
    if(!def) continue;
    const a = t*(0.8+i*0.22) + i/Math.max(1,count)*TAU;
    const r = 46 + i*10;
    const x = Math.cos(a)*r, y = Math.sin(a)*r*0.55 - 8;
    const pulse = 1 + Math.sin(t*4+i)*0.12;
    ctx.save();
    ctx.globalAlpha = 0.35 + it.rank*0.12;
    ctx.strokeStyle = def.hue;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0,-8,r,r*0.55,0,0,TAU); ctx.stroke();
    const g = ctx.createRadialGradient(x,y,2,x,y,18*pulse);
    g.addColorStop(0,'rgba(255,255,255,.95)');
    g.addColorStop(0.35,def.hue);
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x,y,18*pulse,0,TAU); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = def.hue;
    ctx.beginPath(); ctx.arc(x,y,3+it.rank,0,TAU); ctx.fill();
    ctx.restore();
  }

  if(itemRank('idol')){
    const a = 0.18 + itemRank('idol')*0.08;
    ctx.strokeStyle = `rgba(217,195,138,${a})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0,0,72+Math.sin(t*3)*4,0,TAU); ctx.stroke();
  }
}

function drawNovas(){
  if(!G || !G.novas || !G.novas.length) return;
  const t = performance.now()/1000;
  for(const nv of G.novas){
    const f   = nv.life/nv.maxlife;   // 1→0 as ring expands
    const age = 1-f;                   // 0→1
    const r   = nv.r;
    if(r < 1) continue;

    ctx.save();
    ctx.translate(nv.x, nv.y);
    ctx.save();
    ctx.globalCompositeOperation='lighter';

    // === 1. Inner ground darkness (shadow pool, fades instantly) ===
    if(f>0.6){
      const poolA = (f-0.6)/0.4 * 0.18;
      ctx.globalAlpha = poolA;
      ctx.globalCompositeOperation='source-over';
      const pg=ctx.createRadialGradient(0,0,r*0.2,0,0,r);
      pg.addColorStop(0,'rgba(20,0,50,0.9)'); pg.addColorStop(1,'rgba(20,0,50,0)');
      ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill();
      ctx.globalCompositeOperation='lighter';
    }

    // === 2. Three concentric shockwave rings (like D2 nova layers) ===
    const rings=[
      {rOff:0,   lw:18, a:0.22*f},
      {rOff:-18, lw:8,  a:0.35*f},
      {rOff:-32, lw:3,  a:0.50*f},
    ];
    for(const rg of rings){
      const rr=r+rg.rOff; if(rr<0) continue;
      ctx.globalAlpha=rg.a;
      ctx.strokeStyle='#c840ff'; ctx.lineWidth=rg.lw;
      ctx.shadowColor='#c840ff'; ctx.shadowBlur=rg.lw*2;
      ctx.beginPath(); ctx.arc(0,0,rr,0,TAU); ctx.stroke();
    }
    ctx.shadowBlur=0;

    // === 3. Bright leading edge ===
    ctx.globalAlpha=f*0.95;
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=3;
    ctx.shadowColor='#e080ff'; ctx.shadowBlur=22;
    ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.stroke();
    ctx.shadowBlur=0;

    // === 4. Radial bolt spines (D2 nova bolts) ===
    const nBolts=28;
    const rotOffset = age * 1.2; // slow rotation as it expands
    for(let i=0; i<nBolts; i++){
      const a = (i/nBolts)*TAU + rotOffset;
      const bx=Math.cos(a), by=Math.sin(a);
      // Bolt: from ring edge outward
      const bStart = r - 8;
      const bLen   = 38 + Math.sin(i*1.9+t*8)*14;
      const bFlick = 0.55 + Math.sin(t*14+i*2.3)*0.45;

      ctx.globalAlpha = f * bFlick * 0.85;
      const g=ctx.createLinearGradient(bx*bStart,by*bStart, bx*(bStart+bLen),by*(bStart+bLen));
      g.addColorStop(0,'rgba(220,100,255,0.9)');
      g.addColorStop(0.4,'rgba(160,40,255,0.7)');
      g.addColorStop(1,'rgba(80,0,160,0)');
      ctx.strokeStyle=g;
      ctx.lineWidth=3.5-Math.sin(i*1.1)*1;
      ctx.lineCap='round';
      ctx.shadowColor='#c840ff'; ctx.shadowBlur=8;
      ctx.beginPath();
      ctx.moveTo(bx*bStart, by*bStart);
      ctx.lineTo(bx*(bStart+bLen), by*(bStart+bLen));
      ctx.stroke();
      ctx.shadowBlur=0;

      // Bolt head spark
      if(i%3===0){
        ctx.globalAlpha=f*bFlick*0.7;
        ctx.fillStyle='rgba(255,220,255,0.9)';
        ctx.beginPath(); ctx.arc(bx*(bStart+bLen*0.6),by*(bStart+bLen*0.6),2.5,0,TAU); ctx.fill();
      }
    }

    // === 5. Inner wake (trailing purple wisps) ===
    const wakeR = r * 0.72;
    ctx.globalAlpha = f * 0.18;
    const wg=ctx.createRadialGradient(0,0,wakeR*0.5,0,0,wakeR);
    wg.addColorStop(0,'rgba(140,20,220,0)');
    wg.addColorStop(0.7,'rgba(140,20,220,0.4)');
    wg.addColorStop(1,'rgba(140,20,220,0)');
    ctx.fillStyle=wg; ctx.beginPath(); ctx.arc(0,0,wakeR,0,TAU); ctx.fill();

    ctx.restore(); // lighter
    ctx.restore();

    // === 6. Edge particles (spawned as ring moves) ===
    if(Math.random()<0.5){
      const a=rand(0,TAU);
      G.parts.push({x:nv.x+Math.cos(a)*r, y:nv.y+Math.sin(a)*r,
        vx:Math.cos(a)*rand(30,80), vy:Math.sin(a)*rand(30,80),
        life:rand(0.25,0.5), color:Math.random()<0.5?'#c840ff':'#8020e0', size:rand(2,4)});
    }
  }
}

function drawVignette(){
  const g = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.45,W/2,H/2,Math.max(W,H)*0.75);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.5)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const p=G&&G.player;
  if(p && p.hp/p.maxhp<0.3){
    const a = (0.3-p.hp/p.maxhp)/0.3*0.35 + Math.sin(performance.now()/300)*0.05;
    const g2 = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.7);
    g2.addColorStop(0,'rgba(160,20,10,0)'); g2.addColorStop(1,`rgba(160,20,10,${clamp(a,0,0.5)})`);
    ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
  }
}

function drawScreenFx(){
  if(!G || !G.screenFx || !G.screenFx.nukeGray) return;
  const a = clamp(G.screenFx.nukeGray/0.5, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = `rgba(150,150,150,${0.85*a})`;
  ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(215,215,215,${0.18*a})`;
  ctx.fillRect(0,0,W,H);
  const g = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.08,W/2,H/2,Math.max(W,H)*0.7);
  g.addColorStop(0,`rgba(255,255,255,${0.28*a})`);
  g.addColorStop(0.36,`rgba(210,210,210,${0.12*a})`);
  g.addColorStop(1,'rgba(80,80,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/* ---- menu background: the orc idling in the arena ---- */
let menuG = null;
function drawMenuBG(){
  if(!menuG){
    menuG = {
      t:0, lvlAnim:0, items:[],
      player:{x:0,y:0,r:26,facing:-Math.PI/2,hp:1,maxhp:1,
        reach:1, trails:[], step:0, iframes:0, hurtT:0,
        ww:{active:0}, dash:{active:0}, fury:{active:0}, swing:null,
        slam:{wind:0,cd:0,cdMax:8}, itemStats:{}, items:[]}
    };
  }
  menuG.t += 0.016;
  menuG.lvlAnim = 0;
  menuG.player.step = menuG.t;
  menuG.player.facing = -Math.PI/2 + Math.sin(menuG.t*0.7)*0.14;

  ctx.fillStyle = '#110d07';
  ctx.fillRect(0, 0, W, H);

  const ag = ctx.createRadialGradient(W/2, H*0.68, 60, W/2, H*0.68, W*0.55);
  ag.addColorStop(0, 'rgba(90,60,20,.22)');
  ag.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ag;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W/2, H/2 + 100);
  const savedG = G;
  G = menuG;
  drawPlayer(menuG.player);
  G = savedG;
  ctx.restore();
}

/* =========================================================
   HUD
========================================================= */
function updateAbilityCd(id, cd, cdMax){
  const el = $(id); if(!el) return;
  const cdEl  = el.querySelector('.cd');
  const cdtEl = el.querySelector('.cdt');
  if(cd > 0){
    if(cdEl)  cdEl.style.height  = clamp(cd/cdMax*100, 0, 100)+'%';
    if(cdtEl) cdtEl.textContent  = cd.toFixed(1);
    el.classList.remove('ready');
  } else {
    if(cdEl)  cdEl.style.height  = '0%';
    if(cdtEl) cdtEl.textContent  = '';
    el.classList.add('ready');
  }
}

function updateHUD(){
  if(!G) return;
  if(G.itemsDirty){ G.itemsDirty=false; updateItemsHUD(); }
  const p = G.player;
  $('hpfill').style.width  = clamp(p.hp/p.maxhp*100, 0, 100)+'%';
  $('hpfill').style.background = 'linear-gradient(#ff5a4d,#c72d25)';
  $('hptxt').textContent   = Math.ceil(p.hp)+' / '+p.maxhp;
  $('xpfill').style.width  = clamp(p.xp/p.xpNext*100, 0, 100)+'%';
  const xptEl=$('xptxt'); if(xptEl) xptEl.textContent='';
  $('lvltxt').textContent  = 'LV '+p.level;
  const wnEl=$('wavenum'); if(wnEl) wnEl.textContent='WAVE '+G.wave; else $('wavebig').textContent='WAVE '+G.wave;
  const wtEl=$('wavetimer');
  if(wtEl){
    if(G.waveState==='inter'){
      wtEl.textContent = ' — next wave in '+Math.ceil(G.interT||0)+'s';
    } else if(G.waveState==='spawn' && G.waveT>0){
      wtEl.textContent = ' — next wave in '+Math.ceil(G.waveT)+'s';
    } else {
      wtEl.textContent = '';
    }
  }
  $('enemiesleft').textContent = 'ENEMIES '+(G.enemies.length+(G.boss?1:0));
  const kcEl=$('killcount'); if(kcEl) kcEl.textContent='KILLS '+G.kills+(G.killStreak>=5?' ['+G.killStreak+']':'');
  if(G.boss) $('bossfill').style.width = clamp(G.boss.hp/(G.boss.maxHp || G.boss.maxhp || 1)*100, 0, 100)+'%';
  updateAbilityCd('abQ', p.fury.cd,  p.fury.cdMax);
  updateAbilityCd('abQ', p.fury.cd,  p.fury.cdMax);
  updateAbilityCd('abE', p.slam.cd,  p.slam.cdMax);
  if(G.charClass==='warlock'){
    updateAbilityCd('abR', p.boneShield ? p.boneShield.cd : 0, p.boneShield ? p.boneShield.cdMax : 16);
    updateAbilityCd('abQ', p.wlQ ? p.wlQ.cd : 0, p.wlQ ? p.wlQ.cdMax : 10);
    updateAbilityCd('abE', p.wlE ? p.wlE.cd : 0, p.wlE ? p.wlE.cdMax : 8);
    updateAbilityCd('abS', p.dash.cd, p.dash.cdMax);
    const abP=$('abP');
    if(abP){
      abP.style.display = G.charClass==='warlock' ? '' : 'none';
      const ps=abP.querySelector('.pstack');
      const ss=p.soulStacks||0;
      if(ps) ps.textContent = ss>0 ? ss : '';
      abP.style.borderColor = ss>=30 ? '#ff80ff' : '#6b3a8a';
      if(ss>=30) abP.style.boxShadow='0 0 12px rgba(255,128,255,.6)';
      else abP.style.boxShadow='';
    }
    const buffBar=$('buffbar');
    if(buffBar){
      const buffs=[];
      if(G.charClass==='warlock'){
        const ss=p.soulStacks||0;
        if(ss>0) buffs.push({icon:'◆',color:ss>=30?'#ff80ff':'#c840ff',cnt:ss,maxed:ss>=30,tip:'Soul Harvest - '+ss+' soul stacks'+(ss>=30?' (MAX)':'')});
      }
      buffBar.innerHTML=buffs.map(b=>
        `<div class="buff-ic${b.maxed?' maxed':''}" style="border-color:${b.color}" title="${b.tip}">` +
        `<span style="color:${b.color}">${b.icon}</span>` +
        `<span class="bcnt" style="color:${b.color}">${b.cnt}</span></div>`
      ).join('');
    }
  } else {
    updateAbilityCd('abR', p.ww.cd,    p.ww.cdMax);
    const abP=$('abP');
    if(abP) abP.style.display = 'none';
    const buffBar=$('buffbar');
    if(buffBar) buffBar.innerHTML = '';
  }
  updateAbilityCd('abS', p.dash.cd,  p.dash.cdMax);
  const now = performance.now();
  if(!updateHUD._lt) updateHUD._lt = now;
  const dt = Math.min((now - updateHUD._lt)/1000, 0.1);
  updateHUD._lt = now;
  if(announceT > 0){ announceT -= dt; if(announceT <= 0) $('announce').style.opacity = '0'; }
}

/* =========================================================
   GAME LOOP + BOOT
========================================================= */
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;
  if(state === ST.PLAY || state === ST.OVER || state === ST.WIN){
    const speed = typeof devTools !== 'undefined' ? devTools.speed : 1;
    update(dt * speed);
  }
  draw();
  if(state === ST.PLAY) updateHUD();
}

function boot(){
  resize();
  window.addEventListener('resize', resize);
  bindAbilityTooltips();
  if(typeof bindDevTools === 'function') bindDevTools();
  if(typeof updateAbilityIcons === 'function') updateAbilityIcons(typeof selectedChar !== 'undefined' ? selectedChar : 'skeleton');

  $('btnPlay').onclick    = ()=>{ unlockAudio(); openCharSelect(); };
  $('btnConfirmChar') && ($('btnConfirmChar').onclick = ()=>{ unlockAudio(); openMapSelect(); });
  $('btnCharBack')    && ($('btnCharBack').onclick    = ()=>{ openScreen('menu'); });
  $('btnMapStart')    && ($('btnMapStart').onclick    = ()=>{ unlockAudio(); startRun(selectedMap); });
  $('btnMapBack')     && ($('btnMapBack').onclick     = ()=>{ openScreen('charselect'); });
  $('btnTalents').onclick = ()=>{ openScreen('talents'); renderTalents(); };
  $('btnTalentsBack') && ($('btnTalentsBack').onclick = ()=>{ openScreen('menu'); });
  $('btnResetTalents') && ($('btnResetTalents').onclick = ()=>{ resetTalents(); });
  $('btnResume') && ($('btnResume').onclick = ()=>{ closeScreens(); state=ST.PLAY; lastT=performance.now(); });
  $('btnExit')   && ($('btnExit').onclick   = ()=>{ toMenu(); });
  $('btnAgain')  && ($('btnAgain').onclick  = ()=>{ unlockAudio(); startRun(selectedMap); });
  $('btnGoMenu') && ($('btnGoMenu').onclick = ()=>{ toMenu(); });
  $('btnVictoryAgain') && ($('btnVictoryAgain').onclick = ()=>{ unlockAudio(); startRun(selectedMap); });
  $('btnVictoryMenu')  && ($('btnVictoryMenu').onclick  = ()=>{ toMenu(); });

  openScreen('menu');
  requestAnimationFrame(loop);
}
boot();
