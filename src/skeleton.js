"use strict";
/* =========================================================
   SKELETON (Death Knight) - abilities & player init
   Drawing: drawPlayer() in rendering.js handles the skeleton.
========================================================= */

function skeletonInitPlayer(p, cdr){
  cdr = cdr || 1;
  p.maxhp   = Math.round(120*(1+0.15*tval('vita')));
  p.speed   = 220*(1+0.08*tval('swft'));
  p.baseDmg = 12;
  p.baseDmgBase = p.baseDmg;
  p.armor   = 0.08;
  p.r       = 24;
  p.hp      = p.maxhp;
  p.cdr     = cdr;
  p.fury    = { cd:0, cdMax:12*cdr, active:0 };
  p.slam    = { cd:0, cdMax:7*cdr,  wind:0 };
  p.ww      = { cd:0, cdMax:10*cdr, active:0, tick:0, tickMax:0.18, spins:4 };
  p.dash    = { active:0, cd:0, cdMax:8*cdr, dx:0, dy:0 };
  p.swing   = null;
  p.combo   = 0;
  p.comboReset = 0;
  p.trails  = p.trails || [];
}

function updateSkeletonAbilities(dt, mx, my){
  const p = G.player;

  // M1 - autoattack combo.
  if(mouse.down && state===ST.PLAY) playerSwing();
  if(p.swing){
    const sw = p.swing;
    sw.t += dt;
    const prog = sw.t/sw.dur;
    if(!sw.hit && prog>=0.45){
      sw.hit = true;
      doSwingDamage(sw);
    }
    const arc = sw.cleave ? 2.6 : 1.5;
    const a0 = sw.dir - sw.hand*arc/2;
    const a1 = sw.dir + sw.hand*arc/2;
    const ca = lerp(a0, a1, Math.min(1, prog*1.25));
    p.trails.push({a:ca, r:(sw.cleave?185:160)*p.reach, life:0.18, cleave:sw.cleave});
    if(sw.t>=sw.dur){
      p.combo = (p.combo+1)%3;
      p.swing = null;
    }
  }
  for(const tr of p.trails) tr.life -= dt;
  p.trails = p.trails.filter(t=>t.life>0);

  // R - Whirlwind. Attack speed shortens the time between spin hits.
  if(keys['r'] && p.ww.cd<=0 && p.ww.active<=0){
    const tickTime = whirlwindTickTime(p);
    p.ww.active = p.ww.spins * tickTime;
    p.ww.cd = p.ww.cdMax;
    p.ww.tick = 0;
    p.swing = null;
    ftext(p.x, p.y-44, 'WHIRLWIND', '#ffcf9a', 16, 0.9);
    playSfx('whirlwind',0.9);
  }
  if(p.ww.active>0){
    if(Math.random()<0.6) G.afterimages.push({x:p.x,y:p.y,facing:p.facing,alpha:0.45,life:0.14,maxlife:0.14,color:'#9adcff'});
    p.ww.active -= dt;
    p.ww.tick -= dt;
    if(p.ww.tick<=0){
      p.ww.tick = whirlwindTickTime(p);
      const rad = 175*p.reach;
      burst(p.x,p.y,'#e8b64c',6,100,0.22);
      for(const e of [...G.enemies]){
        if(dist2(p.x,p.y,e.x,e.y) < (rad+e.r)**2){
          const a = Math.atan2(e.y-p.y,e.x-p.x);
          hitEnemy(e, p.baseDmg*1.2*p.dmgMul, Math.random()<p.crit, a, 60, 'physical', 'skeleton.whirlwind');
          triggerWhirlwindItems(e, a);
        }
      }
    }
  }

  // SPACE - Charge. Movement is handled in main.js while dash.active > 0.
  if(keys[' '] && p.dash.cd<=0 && p.dash.active<=0){
    let dx = (keys['d']?1:0) - (keys['a']?1:0);
    let dy = (keys['s']?1:0) - (keys['w']?1:0);
    if(!dx && !dy){
      dx = Math.cos(p.facing);
      dy = Math.sin(p.facing);
    }
    const l = Math.hypot(dx,dy) || 1;
    p.dash.active = 0.17;
    p.dash.cd = p.dash.cdMax;
    p.dash.dx = dx/l*1500;
    p.dash.dy = dy/l*1500;
    ftext(p.x,p.y-44,'CHARGE','#fff0c0',15,0.7);
    burst(p.x,p.y,'#bff5b0',10,200,0.4);
    playSfx('charge',0.85);
  }

  // Q - Battle Fury.
  if(keys['q'] && p.fury.cd<=0){
    p.fury.cd = p.fury.cdMax;
    p.fury.active = 5;
    ftext(p.x,p.y-44,'FURY!','#ff9a5c',18,1.2);
    burst(p.x,p.y,'#ff7a3c',20,260,0.8);
    playSfx('fury',0.85);
  }

  // E - Ground Slam.
  if(keys['e'] && p.slam.cd<=0 && p.slam.wind<=0 && p.ww.active<=0){
    p.slam.cd = p.slam.cdMax;
    p.slam.wind = 0.28;
    p.swing = null;
  }
  if(p.slam.wind>0){
    p.slam.wind -= dt;
    if(p.slam.wind<=0){
      const rad = 230*p.reach*(p.itemStats.slamRadius || 1);
      shake(12,0.3);
      G.zones.push({x:p.x,y:p.y,r:rad,life:0.5,maxlife:0.5,color:'232,182,76',type:'slam'});
      burst(p.x,p.y,'#e8b64c',26,340,0.7,5);
      playSfx('groundSlam',1.0);
      for(const e of [...G.enemies]){
        if(dist2(p.x,p.y,e.x,e.y)<(rad+e.r)**2){
          const a = Math.atan2(e.y-p.y,e.x-p.x);
          hitEnemy(e, p.baseDmg*2.2*p.dmgMul, Math.random()<p.crit, a, 120, 'physical');
        }
      }
    }
  }

}
