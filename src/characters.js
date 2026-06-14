"use strict";
/* =========================================================
   CHARACTER DEFINITIONS & SELECTION
========================================================= */
const CHARACTERS = [
  {
    id: 'skeleton',
    name: 'BONE REAPER',
    class: 'Death Knight',
    color: '#e8d8a8',
    accent: '#b94aff',
    lore: 'A cursed warrior risen from the grave, dragging a greatsword of unimaginable weight.',
    // Karakter-tags bruges til item/powerup filtrering og synergier
    tags: ['melee', 'physical', 'aoe', 'combo'],
    abilities: [
      { key:'LMB', name:'Slash / Cleave',   dmgType:'physical', tags:['physical','combo','aoe'],            desc:'3-hit combo. 3rd hit cleaves all nearby enemies.' },
      { key:'Q',   name:'Battle Fury',       dmgType:null,       tags:['buff','mobility'],                   desc:'Gain +22% movement speed for 5s.' },
      { key:'E',   name:'Ground Slam',       dmgType:'physical', tags:['physical','aoe'],                    desc:'Slam the earth after a short windup for 2.2x weapon damage.' },
      { key:'R',   name:'Whirlwind',         dmgType:'physical', tags:['physical','aoe','spin'],             desc:'Spin for multiple weapon-damage hits. Attack speed makes spins fire faster.' },
      { key:'SPC', name:'Charge',            dmgType:'physical', tags:['mobility','physical','stun'],        desc:'Dash through enemies and stun targets hit for 1s.' },
    ]
  },
  {
    id: 'warlock',
    name: 'SOUL BURNER',
    class: 'Warlock',
    color: '#c840ff',
    accent: '#ff4020',
    lore: 'A master of dark arts who sold his soul for forbidden power. His very presence corrupts.',
    // Karakter-tags bruges til item/powerup filtrering og synergier
    tags: ['ranged', 'shadow', 'fire', 'dot', 'curse', 'soul'],
    abilities: [
      { key:'LMB', name:'Shadow Bolt',   dmgType:'shadow',   tags:['shadow','fire','ranged','projectile'], desc:'Dark bolt that applies Burning on impact. Cursed targets take 25% bonus damage.' },
      { key:'Q',   name:'Curse',         dmgType:'shadow',   tags:['shadow','curse','dot','aoe','debuff'],   desc:'Hex enemies in a wide area for 6 sec — they take bonus damage and explode on death.' },
      { key:'E',   name:'Burning Sigil', dmgType:'fire',     tags:['fire','dot','aoe','sigil','crowd-control'], desc:'Place a fire circle that burns enemies inside. Slows cursed enemies. Explodes on expiry.' },
      { key:'R',   name:'Bone Shield',   dmgType:'physical', tags:['physical','projectile','orbit','shield'],  desc:'Conjure projectile bone shards orbiting you for 8 sec. Multishot adds shards and projectile speed spins them faster.' },
      { key:'SPC', name:'Shadow Step',   dmgType:null,       tags:['shadow','mobility'],                     desc:'Blink forward instantly, leaving a shadow afterimage.' },
      { key:'PSV', name:'Soul Harvest',  dmgType:'shadow',   tags:['soul','passive'],                       desc:'Enemies that die while Burning or Cursed can drop Soul Fragments that scale Warlock spell pressure.' },
    ]
  },
  {
    id: 'stickman',
    name: 'ONE PUNCH',
    class: 'Stickman',
    color: '#16161d',
    accent: '#8fe6ff',
    lore: 'A blur of fists. Tall, lean and impossibly fast — it answers every threat with a storm of punches.',
    // Karakter-tags bruges til item/powerup filtrering og synergier
    tags: ['melee', 'physical', 'speed', 'combo', 'flurry'],
    abilities: [
      { key:'LMB', name:'Fists of Fury', dmgType:'physical', tags:['physical','flurry','aoe','combo'], desc:'Channel a 3s flurry of punches in a cone ahead — 3 hits/sec for 25% damage each. 1.5s recovery after.' },
      { key:'Q',   name:'—',             dmgType:null,       tags:[],                                   desc:'Unbound — coming soon.' },
      { key:'E',   name:'—',             dmgType:null,       tags:[],                                   desc:'Unbound — coming soon.' },
      { key:'R',   name:'—',             dmgType:null,       tags:[],                                   desc:'Unbound — coming soon.' },
      { key:'SPC', name:'Speed Burst',   dmgType:null,       tags:['mobility','speed'],                 desc:'Short explosive dash leaving a streaking motion blur. Brief invulnerability.' },
    ]
  }
];

let selectedChar = 'skeleton';

function openCharSelect(){
  renderCharSelect();
  openScreen('charselect');
  _startCharPreviewLoop();
}

function renderCharSelect(){
  const grid = $('charcards');
  if(!grid) return;
  grid.innerHTML = '';
  CHARACTERS.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'charcard' + (selectedChar === ch.id ? ' selected' : '');
    card.style.cssText = `--acc:${ch.accent};--col:${ch.color}`;
    card.innerHTML = `
      <canvas class="charpreview" id="cprev_${ch.id}" width="200" height="220"></canvas>
      <div class="charnm">${ch.name}</div>
      <div class="charclass">${ch.class}</div>
      <div class="charlore">${ch.lore}</div>
      <div class="charabs">
        ${ch.abilities.map(a=>{
          const dmgColors={physical:'#e8dcc8',shadow:'#c840ff',fire:'#ff6020',poison:'#40c020',bleed:'#ff2040',magic:'#60a0ff'};
          const badge = a.dmgType ? `<span class="abdmgtype" style="color:${dmgColors[a.dmgType]||'#aaa'}">${a.dmgType}</span>` : '';
          return `<div class="charab">
            <span class="abkey">${a.key}</span>
            <span class="abinfo"><b>${a.name}</b>${badge}<br>${a.desc}</span>
          </div>`;
        }).join('')}
      </div>`;
    card.onclick = () => {
      selectedChar = ch.id;
      if(typeof updateAbilityIcons === 'function') updateAbilityIcons(selectedChar);
      renderCharSelect();
    };
    grid.appendChild(card);
  });
  // draw previews next frame after DOM is ready
  setTimeout(()=>{ CHARACTERS.forEach(ch=>_drawCharPreview(ch.id)); }, 30);
}

let _charPreviewRaf = null;
function _startCharPreviewLoop(){
  if(_charPreviewRaf) return;
  function loop(){
    const screen = document.getElementById('charselect');
    if(!screen || !screen.classList.contains('show')){ _charPreviewRaf=null; return; }
    CHARACTERS.forEach(ch=>_drawCharPreview(ch.id));
    _charPreviewRaf = requestAnimationFrame(loop);
  }
  _charPreviewRaf = requestAnimationFrame(loop);
}

function _drawCharPreview(id){
  const cv = document.getElementById('cprev_'+id);
  if(!cv) return;
  const c = cv.getContext('2d');
  const t = performance.now()/1000;
  c.clearRect(0,0,200,220);
  // dark bg
  const bg = c.createRadialGradient(100,110,10,100,110,100);
  bg.addColorStop(0,'#1a1218'); bg.addColorStop(1,'#0a080d');
  c.fillStyle=bg; c.fillRect(0,0,200,220);
  c.save(); c.translate(100,130);
  if(id==='skeleton') _previewSkeleton(c,t);
  else if(id==='stickman') _previewStickman(c,t);
  else _previewWarlock(c,t);
  c.restore();
}

function _previewSkeleton(c,t){
  const bone='#ede8d5', dark='#07090e';
  const bob = Math.sin(t*2)*2;
  c.save(); c.translate(0,bob);
  // ground shadow
  c.fillStyle='rgba(0,0,0,0.4)';
  c.beginPath(); c.ellipse(0,50,30,8,0,0,Math.PI*2); c.fill();
  // sword
  c.save(); c.rotate(-0.6);
  const SL=95;
  const blG=c.createLinearGradient(-6,0,-SL,0);
  blG.addColorStop(0,'#3c3830'); blG.addColorStop(0.4,'#1a1c22'); blG.addColorStop(1,'#090b0e');
  c.fillStyle=blG;
  c.beginPath(); c.moveTo(-6,-13); c.lineTo(-SL*0.6,-10); c.lineTo(-SL,0); c.lineTo(-SL*0.6,10); c.lineTo(-6,13); c.closePath(); c.fill();
  c.strokeStyle='#585860'; c.lineWidth=1.5; c.stroke();
  c.strokeStyle='#12100a'; c.lineWidth=8; c.lineCap='round';
  c.beginPath(); c.moveTo(4,0); c.lineTo(26,0); c.stroke();
  c.fillStyle='#12100a'; c.strokeStyle='#c8a24a'; c.lineWidth=2;
  c.beginPath(); c.rect(-22,-6,44,12); c.fill(); c.stroke();
  // enchant
  c.globalCompositeOperation='lighter';
  c.globalAlpha=0.5+Math.sin(t*3)*0.2;
  c.strokeStyle='rgba(185,74,255,0.7)'; c.lineWidth=2.5;
  c.shadowColor='#b94aff'; c.shadowBlur=12;
  const sp=t*3.4;
  c.beginPath();
  for(let i=0;i<=16;i++){ const f=i/16,x=-8-f*(SL-12),y=(f===0?0:Math.sin(f*9+sp)*5*(1-f*0.5));
    if(i===0)c.moveTo(x,y);else c.lineTo(x,y); }
  c.stroke();
  c.shadowBlur=0; c.globalCompositeOperation='source-over'; c.restore();
  // body
  c.strokeStyle=bone; c.lineWidth=6; c.lineCap='round';
  c.beginPath(); c.moveTo(0,36); c.lineTo(0,-14); c.stroke();
  c.lineWidth=4;
  for(let i=0;i<4;i++){
    const ry=0+i*7,rw=14-i*2;
    c.strokeStyle=bone;
    c.beginPath(); c.moveTo(0,ry); c.quadraticCurveTo(-rw,ry-4,-rw-5,ry+3); c.stroke();
    c.beginPath(); c.moveTo(0,ry); c.quadraticCurveTo(rw,ry-4,rw+5,ry+3); c.stroke();
  }
  // skull
  const sk=c.createRadialGradient(-4,-22,3,0,-20,16);
  sk.addColorStop(0,'#f2edd4'); sk.addColorStop(1,'#8a8070');
  c.fillStyle=sk; c.beginPath(); c.ellipse(0,-20,12,15,0,0,Math.PI*2); c.fill();
  c.strokeStyle=dark; c.lineWidth=2; c.stroke();
  c.fillStyle='#010208';
  c.beginPath(); c.ellipse(-4.5,-22,4,5.5,-0.2,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(4.5,-22,4,5.5,0.2,0,Math.PI*2); c.fill();
  c.shadowColor='#b94aff'; c.shadowBlur=10;
  c.fillStyle='#d060ff';
  c.beginPath(); c.arc(-4.5,-23,2,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(4.5,-23,2,0,Math.PI*2); c.fill();
  c.shadowBlur=0;
  c.restore();
}

function _previewWarlock(c,t){
  const bob = Math.sin(t*1.8)*2;
  c.save(); c.translate(0,bob);
  // ground shadow
  c.fillStyle='rgba(0,0,0,0.5)';
  c.beginPath(); c.ellipse(0,50,34,9,0,0,Math.PI*2); c.fill();
  // fel ground aura
  c.globalCompositeOperation='lighter';
  c.globalAlpha=0.2+Math.sin(t*2)*0.08;
  const ag=c.createRadialGradient(0,30,5,0,30,55);
  ag.addColorStop(0,'rgba(180,0,255,0.6)'); ag.addColorStop(1,'rgba(180,0,255,0)');
  c.fillStyle=ag; c.beginPath(); c.arc(0,30,55,0,Math.PI*2); c.fill();
  c.globalCompositeOperation='source-over'; c.globalAlpha=1;
  // cape outer
  const capeFlap = Math.sin(t*1.2)*4;
  c.fillStyle='#1a0d22'; c.strokeStyle='#3d1a52'; c.lineWidth=2;
  c.beginPath();
  c.moveTo(-2,-18);
  c.bezierCurveTo(-30+capeFlap,-42,-58,-18,-60,4);
  c.bezierCurveTo(-54,28,-22,52,0,55);
  c.bezierCurveTo(22,52,54,28,60,4);
  c.bezierCurveTo(58,-18,30-capeFlap,-42,2,-18);
  c.fill(); c.stroke();
  // cape inner lining
  c.fillStyle='#5c1018';
  c.beginPath();
  c.moveTo(0,-14);
  c.bezierCurveTo(-20,-32,-42,-12,-42,4);
  c.bezierCurveTo(-36,30,-18,46,0,48);
  c.bezierCurveTo(18,46,36,30,42,4);
  c.bezierCurveTo(42,-12,20,-32,0,-14);
  c.fill();
  // cape clasps
  for(const s of [-1,1]){
    c.fillStyle='#c8a040'; c.strokeStyle='#8a6a1a'; c.lineWidth=1.5;
    c.beginPath(); c.arc(s*16,-12,5,0,Math.PI*2); c.fill(); c.stroke();
    c.fillStyle='#ffe08a';
    c.beginPath(); c.arc(s*16,-12,2.5,0,Math.PI*2); c.fill();
  }
  // robe body
  c.fillStyle='#1a1222'; c.strokeStyle='#2e1a3d'; c.lineWidth=2;
  c.beginPath(); c.ellipse(0,2,16,20,0,0,Math.PI*2); c.fill(); c.stroke();
  // belt
  c.strokeStyle='#8b3a1a'; c.lineWidth=5; c.lineCap='round';
  c.beginPath(); c.moveTo(-13,12); c.lineTo(13,12); c.stroke();
  c.fillStyle='#c8a040'; c.strokeStyle='#5a3a08'; c.lineWidth=1.5;
  c.beginPath(); c.arc(0,12,5,0,Math.PI*2); c.fill(); c.stroke();
  // head
  c.fillStyle='#c8bcaa'; c.strokeStyle='#1a1222'; c.lineWidth=2;
  c.beginPath(); c.ellipse(0,-2,11,14,0,0,Math.PI*2); c.fill(); c.stroke();
  // hair
  c.fillStyle='#0d0a12';
  c.beginPath(); c.ellipse(0,-11,10,6,0,0,Math.PI*2); c.fill();
  // horns
  for(const s of [-1,1]){
    c.save(); c.translate(s*9,-8);
    c.strokeStyle='#d4c9a8'; c.lineWidth=6; c.lineCap='round';
    c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(s*8,-13,s*20,-10,s*20,2); c.bezierCurveTo(s*20,13,s*10,17,s*4,13); c.stroke();
    c.lineWidth=3; c.strokeStyle='#a89878';
    c.beginPath(); c.moveTo(s*4,13); c.bezierCurveTo(s*0,17,s*-3,15,s*-4,11); c.stroke();
    c.strokeStyle='rgba(20,10,30,0.8)'; c.lineWidth=2;
    c.beginPath(); c.moveTo(s*10,-4); c.lineTo(s*14,-1); c.stroke();
    c.beginPath(); c.moveTo(s*16,5); c.lineTo(s*18,9); c.stroke();
    c.restore();
  }
  // eyes
  c.shadowColor='#ff1a1a'; c.shadowBlur=14;
  c.fillStyle='#ff1a1a';
  c.beginPath(); c.ellipse(-4,-4,3.5,2.5,0,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(4,-4,3.5,2.5,0,0,Math.PI*2); c.fill();
  c.shadowBlur=0;
  // casting glow on hands
  c.globalCompositeOperation='lighter';
  c.globalAlpha=0.4+Math.sin(t*4)*0.2;
  c.fillStyle='rgba(180,0,255,0.6)'; c.shadowColor='#c840ff'; c.shadowBlur=14;
  c.beginPath(); c.arc(-16,8,5,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(16,8,5,0,Math.PI*2); c.fill();
  c.shadowBlur=0; c.globalCompositeOperation='source-over'; c.globalAlpha=1;
  c.restore();
}
