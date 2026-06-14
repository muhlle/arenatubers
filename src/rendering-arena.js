"use strict";
/* =========================================================
   ARENA BUILDING & DRAWING
   Extracted from waves.js (buildArena) and rendering.js (drawArena).
   To add a new map: add buildArena<Id>() + drawArena<Id>() here,
   register in MAP_CONFIGS (maps.js), dispatch in buildCurrentArena()
   and drawArena().
========================================================= */

/* ---- Per-map decor objects ---- */
const decoClassic = { torches:[], banners:[], cracks:[], plants:[], props:[] };
const decoDark    = { pillars:[], cracks:[], bones:[], rifts:[], flames:[] };

/* =========================================================
   CLASSIC ARENA — The Pit
========================================================= */
function buildArenaClassic(){
  const R = MAP_CONFIGS.pit.arenaR;
  const d = decoClassic;
  d.torches=[]; d.banners=[]; d.cracks=[]; d.plants=[]; d.props=[];

  for(let i=0;i<18;i++){
    const a=i/18*TAU+0.08;
    d.torches.push({x:Math.cos(a)*(R+60),y:Math.sin(a)*(R+60),a,ph:rand(0,TAU)});
  }
  const cols=['#b03228','#2d4fb0','#7a2fa8'];
  for(let i=0;i<24;i++){
    const a=i/24*TAU+0.21;
    d.banners.push({x:Math.cos(a)*(R+130),y:Math.sin(a)*(R+130),a,c:cols[i%3]});
  }
  for(let i=0;i<140;i++){
    const a=rand(0,TAU),r=rand(120,R-60);
    const x=Math.cos(a)*r,y=Math.sin(a)*r,n=randi(2,4),pts=[[x,y]];
    let ca=rand(0,TAU);
    for(let j=0;j<n;j++){ca+=rand(-0.9,0.9);const l=rand(26,70);pts.push([pts[j][0]+Math.cos(ca)*l,pts[j][1]+Math.sin(ca)*l]);}
    d.cracks.push(pts);
  }
  for(let i=0;i<170;i++){
    const a=rand(0,TAU),r=R-Math.abs(rand(0,1)*rand(0,1))*R;
    d.plants.push({x:Math.cos(a)*r,y:Math.sin(a)*r,s:rand(10,34),g:Math.random()<0.5});
  }
  for(let i=0;i<90;i++){
    const a=rand(0,TAU),r=rand(200,R-80);
    d.props.push({x:Math.cos(a)*r,y:Math.sin(a)*r,t:randi(0,2),rot:rand(0,TAU),s:rand(0.7,1.4)});
  }
}

function drawArenaClassic(cam){
  const R = MAP_CONFIGS.pit.arenaR;
  const d = decoClassic;
  const inView=(x,y,m)=>x>cam.x-m&&x<cam.x+W+m&&y>cam.y-m&&y<cam.y+H+m;

  ctx.fillStyle='#10160c'; ctx.fillRect(cam.x,cam.y,W,H);

  const grd=ctx.createRadialGradient(0,0,200,0,0,R);
  grd.addColorStop(0,'#cbb482'); grd.addColorStop(0.7,'#b89e6e'); grd.addColorStop(1,'#8f7a52');
  ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fillStyle=grd; ctx.fill();

  if(inView(0,0,700)){
    ctx.save();
    ctx.lineWidth=10; ctx.strokeStyle='#a8854b';
    ctx.beginPath(); ctx.arc(0,0,560,0,TAU); ctx.stroke();
    ctx.lineWidth=4; ctx.strokeStyle='#8f6f3c';
    ctx.beginPath(); ctx.arc(0,0,430,0,TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,160,0,TAU); ctx.fillStyle='#6e5a3a'; ctx.fill();
    ctx.strokeStyle='#d8b96a'; ctx.lineWidth=6; ctx.stroke();
    ctx.fillStyle='#d8b96a';
    for(let i=0;i<8;i++){
      const a=i/8*TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*150,Math.sin(a)*150);
      ctx.lineTo(Math.cos(a+0.18)*70,Math.sin(a+0.18)*70);
      ctx.lineTo(Math.cos(a-0.18)*70,Math.sin(a-0.18)*70);
      ctx.fill();
    }
    const pulse=1+Math.sin(performance.now()/400)*0.08;
    ctx.beginPath(); ctx.arc(0,0,34*pulse,0,TAU); ctx.fillStyle='#3a8fd6'; ctx.fill();
    ctx.beginPath(); ctx.arc(-8,-10,12*pulse,0,TAU); ctx.fillStyle='#bfe4ff'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,52*pulse,0,TAU); ctx.strokeStyle='rgba(90,180,255,.35)'; ctx.lineWidth=6; ctx.stroke();
    ctx.strokeStyle='rgba(168,133,75,.8)'; ctx.lineWidth=14;
    for(let i=0;i<4;i++){const a=i/4*TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*180,Math.sin(a)*180); ctx.lineTo(Math.cos(a)*540,Math.sin(a)*540); ctx.stroke();}
    ctx.restore();
  }

  ctx.strokeStyle='rgba(90,70,42,.5)'; ctx.lineWidth=2;
  for(const c of d.cracks){
    if(!inView(c[0][0],c[0][1],160)) continue;
    ctx.beginPath(); ctx.moveTo(c[0][0],c[0][1]);
    for(let i=1;i<c.length;i++) ctx.lineTo(c[i][0],c[i][1]);
    ctx.stroke();
  }
  for(const pl of d.plants){
    if(!inView(pl.x,pl.y,80)) continue;
    ctx.fillStyle=pl.g?'rgba(86,122,54,.55)':'rgba(122,86,160,.4)';
    ctx.beginPath(); ctx.ellipse(pl.x,pl.y,pl.s,pl.s*0.6,0,0,TAU); ctx.fill();
    if(!pl.g){ctx.fillStyle='rgba(200,140,255,.6)';
      for(let i=0;i<3;i++) ctx.fillRect(pl.x+Math.cos(i*2.1)*pl.s*0.5,pl.y+Math.sin(i*2.1)*pl.s*0.3,3,3);}
  }
  for(const pr of d.props){
    if(!inView(pr.x,pr.y,80)) continue;
    ctx.save(); ctx.translate(pr.x,pr.y); ctx.rotate(pr.rot); ctx.scale(pr.s,pr.s);
    if(pr.t===0){
      ctx.fillStyle='#9a8866'; ctx.beginPath();
      ctx.moveTo(-14,6); ctx.lineTo(-6,-10); ctx.lineTo(10,-7); ctx.lineTo(15,8); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#b5a37e'; ctx.beginPath(); ctx.moveTo(-6,-10); ctx.lineTo(10,-7); ctx.lineTo(2,2); ctx.closePath(); ctx.fill();
    } else if(pr.t===1){
      ctx.strokeStyle='#ded3b8'; ctx.lineWidth=5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(12,0); ctx.stroke();
      ctx.fillStyle='#ded3b8';
      ctx.beginPath(); ctx.arc(-13,-3,4,0,TAU); ctx.arc(-13,3,4,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(13,-3,4,0,TAU); ctx.arc(13,3,4,0,TAU); ctx.fill();
    } else {
      ctx.fillStyle='#e3d8bd'; ctx.beginPath(); ctx.arc(0,-2,9,0,TAU); ctx.fill();
      ctx.fillRect(-6,3,12,6);
      ctx.fillStyle='#3a3225'; ctx.beginPath(); ctx.arc(-3.5,-3,2.6,0,TAU); ctx.arc(3.5,-3,2.6,0,TAU); ctx.fill();
    }
    ctx.restore();
  }

  ctx.lineWidth=70; ctx.strokeStyle='#5d544a';
  ctx.beginPath(); ctx.arc(0,0,R+38,0,TAU); ctx.stroke();
  ctx.lineWidth=14; ctx.strokeStyle='#7d7263';
  ctx.beginPath(); ctx.arc(0,0,R+8,0,TAU); ctx.stroke();
  ctx.lineWidth=4; ctx.strokeStyle='rgba(30,26,20,.5)';
  for(let i=0;i<72;i++){
    const a=i/72*TAU;
    const x1=Math.cos(a)*(R+6),y1=Math.sin(a)*(R+6);
    if(!inView(x1,y1,120)) continue;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(Math.cos(a)*(R+72),Math.sin(a)*(R+72)); ctx.stroke();
  }
  for(const b of d.banners){
    if(!inView(b.x,b.y,140)) continue;
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.a+Math.PI/2);
    ctx.fillStyle=b.c;
    ctx.beginPath(); ctx.moveTo(-22,-40); ctx.lineTo(22,-40); ctx.lineTo(22,30);
    ctx.lineTo(11,18); ctx.lineTo(0,32); ctx.lineTo(-11,18); ctx.lineTo(-22,30); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,220,120,.85)'; ctx.fillRect(-22,-44,44,7);
    ctx.fillStyle='rgba(255,235,180,.5)'; ctx.beginPath(); ctx.arc(0,-8,9,0,TAU); ctx.fill();
    ctx.restore();
  }
  const tt=performance.now()/1000;
  for(const t of d.torches){
    if(!inView(t.x,t.y,160)) continue;
    ctx.save(); ctx.translate(t.x,t.y);
    ctx.fillStyle='#6e6354'; ctx.fillRect(-10,-34,20,52);
    ctx.fillStyle='#8a7d6a'; ctx.fillRect(-13,-40,26,10);
    const fl=1+Math.sin(tt*9+t.ph)*0.25;
    const g=ctx.createRadialGradient(0,-48,4,0,-48,40*fl);
    g.addColorStop(0,'rgba(255,220,120,.9)'); g.addColorStop(0.4,'rgba(255,150,50,.45)'); g.addColorStop(1,'rgba(255,120,30,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,-48,40*fl,0,TAU); ctx.fill();
    ctx.fillStyle='#ffcf6a'; ctx.beginPath(); ctx.ellipse(0,-50,7,12*fl,0,0,TAU); ctx.fill();
    ctx.fillStyle='#fff3c8'; ctx.beginPath(); ctx.ellipse(0,-47,3.4,6*fl,0,0,TAU); ctx.fill();
    ctx.restore();
  }
}

/* =========================================================
   DARK ARENA — The Darklands
========================================================= */
function buildArenaDark(){
  const R = MAP_CONFIGS.darklands.arenaR;
  const d = decoDark;
  d.pillars=[]; d.cracks=[]; d.bones=[]; d.rifts=[]; d.flames=[];

  // ruined pillars around edge
  for(let i=0;i<32;i++){
    const a=i/32*TAU+rand(-0.04,0.04);
    const r=R-rand(40,140);
    d.pillars.push({
      x:Math.cos(a)*r, y:Math.sin(a)*r,
      a, h:rand(60,140), w:rand(18,30),
      broken:Math.random()<0.6, ph:rand(0,TAU),
      glow:Math.random()<0.4
    });
  }
  // void cracks — longer and more dramatic than classic
  for(let i=0;i<280;i++){
    const a=rand(0,TAU), r=rand(200,R-100);
    const x=Math.cos(a)*r, y=Math.sin(a)*r, n=randi(3,6), pts=[[x,y]];
    let ca=rand(0,TAU);
    for(let j=0;j<n;j++){ca+=rand(-0.7,0.7);const l=rand(40,120);pts.push([pts[j][0]+Math.cos(ca)*l,pts[j][1]+Math.sin(ca)*l]);}
    d.cracks.push({pts, glowing:Math.random()<0.3});
  }
  // bones & skulls scattered across large map
  for(let i=0;i<220;i++){
    const a=rand(0,TAU), r=rand(300,R-120);
    d.bones.push({x:Math.cos(a)*r, y:Math.sin(a)*r, t:randi(0,2), rot:rand(0,TAU), s:rand(0.8,1.6)});
  }
  // void rifts — ambient glowing pools
  for(let i=0;i<18;i++){
    const a=rand(0,TAU), r=rand(400,R-300);
    d.rifts.push({x:Math.cos(a)*r, y:Math.sin(a)*r, rx:rand(60,180), ry:rand(30,80), rot:rand(0,TAU), ph:rand(0,TAU)});
  }
  // dark torches / cursed flames along wall
  for(let i=0;i<24;i++){
    const a=i/24*TAU+0.08;
    d.flames.push({x:Math.cos(a)*(R+60), y:Math.sin(a)*(R+60), a, ph:rand(0,TAU), color:Math.random()<0.5?'purple':'red'});
  }
}

function drawArenaDark(cam){
  const R = MAP_CONFIGS.darklands.arenaR;
  const d = decoDark;
  const tt = performance.now()/1000;
  const inView=(x,y,m)=>x>cam.x-m&&x<cam.x+W+m&&y>cam.y-m&&y<cam.y+H+m;

  // void wilderness
  ctx.fillStyle='#050208'; ctx.fillRect(cam.x,cam.y,W,H);

  // arena floor
  const grd=ctx.createRadialGradient(0,0,300,0,0,R);
  grd.addColorStop(0,'#1a0d2e'); grd.addColorStop(0.5,'#110820'); grd.addColorStop(0.85,'#09050f'); grd.addColorStop(1,'#050208');
  ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fillStyle=grd; ctx.fill();

  // center void emblem
  if(inView(0,0,900)){
    ctx.save();
    // outer rings
    ctx.strokeStyle='rgba(120,0,180,0.35)'; ctx.lineWidth=12;
    ctx.beginPath(); ctx.arc(0,0,820,0,TAU); ctx.stroke();
    ctx.strokeStyle='rgba(80,0,140,0.25)'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(0,0,620,0,TAU); ctx.stroke();
    // void eye at center
    const pulse=1+Math.sin(tt*1.4)*0.12;
    ctx.beginPath(); ctx.arc(0,0,200,0,TAU); ctx.fillStyle='rgba(30,0,50,0.8)'; ctx.fill();
    ctx.strokeStyle='rgba(150,0,255,0.4)'; ctx.lineWidth=8; ctx.stroke();
    // 6-point void star
    ctx.fillStyle='rgba(120,0,200,0.3)';
    for(let i=0;i<6;i++){
      const a=i/6*TAU+tt*0.08;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*190,Math.sin(a)*190);
      ctx.lineTo(Math.cos(a+0.22)*80,Math.sin(a+0.22)*80);
      ctx.lineTo(Math.cos(a-0.22)*80,Math.sin(a-0.22)*80);
      ctx.fill();
    }
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.5+Math.sin(tt*2)*0.15;
    const eg=ctx.createRadialGradient(0,0,10,0,0,80*pulse);
    eg.addColorStop(0,'rgba(200,0,255,0.8)'); eg.addColorStop(0.5,'rgba(100,0,200,0.3)'); eg.addColorStop(1,'rgba(80,0,180,0)');
    ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(0,0,80*pulse,0,TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // void rifts
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(const rf of d.rifts){
    if(!inView(rf.x,rf.y,rf.rx+40)) continue;
    const f=0.12+Math.sin(tt*1.2+rf.ph)*0.06;
    const rg=ctx.createRadialGradient(rf.x,rf.y,4,rf.x,rf.y,rf.rx);
    rg.addColorStop(0,`rgba(140,0,220,${f*2})`); rg.addColorStop(1,'rgba(80,0,160,0)');
    ctx.fillStyle=rg;
    ctx.save(); ctx.translate(rf.x,rf.y); ctx.rotate(rf.rot);
    ctx.beginPath(); ctx.ellipse(0,0,rf.rx,rf.ry,0,0,TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // glowing void cracks
  for(const cr of d.cracks){
    if(!inView(cr.pts[0][0],cr.pts[0][1],200)) continue;
    if(cr.glowing){
      ctx.save(); ctx.globalCompositeOperation='lighter';
      ctx.strokeStyle=`rgba(160,0,255,${0.18+Math.sin(tt*3+cr.pts[0][0])*0.08})`;
      ctx.lineWidth=3; ctx.shadowColor='#8000ff'; ctx.shadowBlur=8;
    } else {
      ctx.strokeStyle='rgba(60,0,80,0.6)'; ctx.lineWidth=1.5;
    }
    ctx.beginPath(); ctx.moveTo(cr.pts[0][0],cr.pts[0][1]);
    for(let i=1;i<cr.pts.length;i++) ctx.lineTo(cr.pts[i][0],cr.pts[i][1]);
    ctx.stroke();
    if(cr.glowing){ ctx.shadowBlur=0; ctx.restore(); }
  }

  // bones & skulls
  for(const pr of d.bones){
    if(!inView(pr.x,pr.y,80)) continue;
    ctx.save(); ctx.translate(pr.x,pr.y); ctx.rotate(pr.rot); ctx.scale(pr.s,pr.s);
    if(pr.t===0){
      ctx.strokeStyle='#c8b8a0'; ctx.lineWidth=5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(12,0); ctx.stroke();
      ctx.fillStyle='#c8b8a0';
      ctx.beginPath(); ctx.arc(-13,-3,4,0,TAU); ctx.arc(-13,3,4,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(13,-3,4,0,TAU); ctx.arc(13,3,4,0,TAU); ctx.fill();
    } else if(pr.t===1){
      ctx.fillStyle='#d0c0a8'; ctx.beginPath(); ctx.arc(0,-2,9,0,TAU); ctx.fill();
      ctx.fillRect(-6,3,12,6);
      ctx.fillStyle='#1a0828';
      ctx.beginPath(); ctx.arc(-3.5,-3,2.6,0,TAU); ctx.arc(3.5,-3,2.6,0,TAU); ctx.fill();
      // glowing void eyes
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.7;
      ctx.fillStyle='rgba(160,0,255,0.6)';
      ctx.beginPath(); ctx.arc(-3.5,-3,1.8,0,TAU); ctx.arc(3.5,-3,1.8,0,TAU); ctx.fill();
      ctx.restore();
    } else {
      // rock shard
      ctx.fillStyle='#2a1e3a';
      ctx.beginPath(); ctx.moveTo(-12,8); ctx.lineTo(-4,-14); ctx.lineTo(8,-10); ctx.lineTo(14,6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#4a2e5a'; ctx.lineWidth=1.5; ctx.stroke();
    }
    ctx.restore();
  }

  // ruined pillars
  for(const pl of d.pillars){
    if(!inView(pl.x,pl.y,160)) continue;
    ctx.save(); ctx.translate(pl.x,pl.y);
    const hw=pl.w/2;
    // pillar body
    const pg=ctx.createLinearGradient(-hw,0,hw,0);
    pg.addColorStop(0,'#1e1028'); pg.addColorStop(0.4,'#2e1840'); pg.addColorStop(1,'#160c1e');
    ctx.fillStyle=pg; ctx.fillRect(-hw,-pl.h,pl.w,pl.h);
    ctx.strokeStyle='#3a2050'; ctx.lineWidth=2; ctx.strokeRect(-hw,-pl.h,pl.w,pl.h);
    // broken top
    if(pl.broken){
      ctx.fillStyle='#0e0818';
      ctx.beginPath();
      ctx.moveTo(-hw,-pl.h);
      ctx.lineTo(hw,-pl.h);
      ctx.lineTo(hw*0.6,-pl.h+rand(15,35));
      ctx.lineTo(0,-pl.h+rand(25,55));
      ctx.lineTo(-hw*0.5,-pl.h+rand(10,30));
      ctx.closePath(); ctx.fill();
    } else {
      // cap
      ctx.fillStyle='#2e1840'; ctx.fillRect(-hw-4,-pl.h-10,pl.w+8,10);
    }
    // optional glow
    if(pl.glow){
      ctx.save(); ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=0.3+Math.sin(tt*2+pl.ph)*0.12;
      ctx.fillStyle='rgba(160,0,255,0.4)';
      ctx.beginPath(); ctx.ellipse(0,-pl.h*0.5,hw+8,pl.h*0.6,0,0,TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // wall
  ctx.lineWidth=90; ctx.strokeStyle='#1a0828';
  ctx.beginPath(); ctx.arc(0,0,R+48,0,TAU); ctx.stroke();
  ctx.lineWidth=18; ctx.strokeStyle='#3a0a50';
  ctx.beginPath(); ctx.arc(0,0,R+8,0,TAU); ctx.stroke();
  // void wall seams
  ctx.save(); ctx.globalCompositeOperation='lighter';
  ctx.lineWidth=2; ctx.strokeStyle='rgba(120,0,180,0.25)';
  for(let i=0;i<96;i++){
    const a=i/96*TAU;
    const x1=Math.cos(a)*(R+6), y1=Math.sin(a)*(R+6);
    if(!inView(x1,y1,140)) continue;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(Math.cos(a)*(R+90),Math.sin(a)*(R+90)); ctx.stroke();
  }
  ctx.restore();

  // dark torches / cursed flames
  for(const t of d.flames){
    if(!inView(t.x,t.y,160)) continue;
    ctx.save(); ctx.translate(t.x,t.y);
    ctx.fillStyle='#1e1028'; ctx.fillRect(-8,-44,16,60);
    ctx.fillStyle='#2e1840'; ctx.fillRect(-11,-50,22,10);
    const fl=1+Math.sin(tt*7+t.ph)*0.3;
    const isPurple = t.color==='purple';
    const c0=isPurple?'rgba(200,80,255,.9)':'rgba(255,60,40,.9)';
    const c1=isPurple?'rgba(120,0,200,.4)':'rgba(200,20,0,.4)';
    const g=ctx.createRadialGradient(0,-58,3,0,-58,36*fl);
    g.addColorStop(0,c0); g.addColorStop(0.5,c1); g.addColorStop(1,'rgba(80,0,120,0)');
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,-58,36*fl,0,TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle=isPurple?'#d060ff':'#ff4020';
    ctx.beginPath(); ctx.ellipse(0,-60,5,10*fl,0,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(255,200,255,0.7)'; ctx.beginPath(); ctx.ellipse(0,-57,2.5,5*fl,0,0,TAU); ctx.fill();
    ctx.restore();
  }
}

/* =========================================================
   DISPATCHER
========================================================= */
function buildCurrentArena(mapId){
  if(mapId==='darklands') buildArenaDark();
  else buildArenaClassic();
}

function drawArena(cam){
  const mapId = (typeof G !== 'undefined' && G && G.mapId) ? G.mapId : 'pit';
  if(mapId==='darklands') drawArenaDark(cam);
  else drawArenaClassic(cam);
}
