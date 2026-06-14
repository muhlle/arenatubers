"use strict";
/* =========================================================
   MAP REGISTRY
   Each entry defines a playable arena / campaign level.
   To add a new map:
     1. Add entry to MAP_CONFIGS
     2. Add buildArena<Id>() + drawArena<Id>() in rendering-arena.js
     3. Add unlock condition check in mapUnlocked()
========================================================= */

const MAP_CONFIGS = {
  pit: {
    id:         'pit',
    name:       'THE PIT',
    subtitle:   'Arena of Blood',
    lore:       'A gladiatorial arena carved from stone and bone. Thousands have died here. You are next.',
    difficulty: 1,
    diffLabel:  'NORMAL',
    arenaR:     2300,
    theme:      'classic',
    floor:      { inner:'#cbb482', mid:'#b89e6e', outer:'#8f7a52' },
    wall:       '#5d544a',
    ambientColor: null,
    unlockCondition: null,   // always available
    finalWave:  10,
  },
  darklands: {
    id:         'darklands',
    name:       'THE DARKLANDS',
    subtitle:   'Where Light Dies',
    lore:       'A cursed expanse swallowed by shadow. The air reeks of void. Nothing that enters returns unchanged.',
    difficulty: 2,
    diffLabel:  'HARD',
    arenaR:     9200,
    theme:      'dark',
    floor:      { inner:'#1a0d2e', mid:'#110820', outer:'#080510' },
    wall:       '#2a0a3a',
    ambientColor: '#1a0028',
    unlockCondition: { type:'winMap', mapId:'pit' },
    finalWave:  35,
  },
};

/* Active map state */
let selectedMap = 'pit';

function mapUnlocked(mapId){
  const cfg = MAP_CONFIGS[mapId];
  if(!cfg) return false;
  if(!cfg.unlockCondition) return true;
  const cond = cfg.unlockCondition;
  if(cond.type === 'winMap'){
    return !!(typeof localStorage !== 'undefined' && localStorage.getItem('won_'+cond.mapId));
  }
  return false;
}

function markMapWon(mapId){
  try { localStorage.setItem('won_'+mapId, '1'); } catch(e){}
}

/* =========================================================
   MAP SELECT UI
========================================================= */
function openMapSelect(){
  renderMapSelect();
  openScreen('mapselect');
}

function renderMapSelect(){
  const grid = $('mapcards');
  if(!grid) return;
  grid.innerHTML = '';

  Object.values(MAP_CONFIGS).forEach(cfg => {
    const locked = !mapUnlocked(cfg.id);
    const active = selectedMap === cfg.id;

    const card = document.createElement('div');
    card.className = 'mapcard' + (active ? ' selected' : '') + (locked ? ' locked' : '');

    const diffStars = '★'.repeat(cfg.difficulty) + '☆'.repeat(3 - cfg.difficulty);
    const sizeLabel = cfg.arenaR >= 9000 ? 'VAST' : cfg.arenaR >= 4000 ? 'LARGE' : 'STANDARD';

    card.innerHTML = `
      <canvas class="mapprev" id="mprev_${cfg.id}" width="260" height="160"></canvas>
      ${locked ? '<div class="maplock">🔒 Complete The Pit to unlock</div>' : ''}
      <div class="mapnm">${cfg.name}</div>
      <div class="mapsub">${cfg.subtitle}</div>
      <div class="maplore">${cfg.lore}</div>
      <div class="mapstats">
        <span class="mapdiff" style="color:${cfg.difficulty===1?'#e8b64c':cfg.difficulty===2?'#ff4020':'#c840ff'}">${diffStars} ${cfg.diffLabel}</span>
        <span class="mapsize">⬛ ${sizeLabel}</span>
      </div>`;

    if(!locked){
      card.onclick = () => { selectedMap = cfg.id; renderMapSelect(); };
    }
    grid.appendChild(card);

    // draw preview after DOM is ready
    setTimeout(() => _drawMapPreview(cfg.id), 30);
  });
}

function _drawMapPreview(mapId){
  const cv = document.getElementById('mprev_'+mapId);
  if(!cv) return;
  const c = cv.getContext('2d');
  const cfg = MAP_CONFIGS[mapId];
  const locked = !mapUnlocked(mapId);
  c.clearRect(0,0,260,160);

  if(locked){
    c.fillStyle='#0a0812';
    c.fillRect(0,0,260,160);
    c.fillStyle='rgba(80,40,120,0.3)';
    c.fillRect(0,0,260,160);
    c.font='bold 28px Impact';
    c.fillStyle='#4a3060';
    c.textAlign='center';
    c.fillText('🔒', 130, 90);
    return;
  }

  // background
  c.fillStyle = cfg.theme==='dark' ? '#08050f' : '#2a2318';
  c.fillRect(0,0,260,160);

  // arena circle preview
  const cx=130, cy=80, r=58;
  const grd = c.createRadialGradient(cx,cy,8,cx,cy,r);
  if(cfg.theme==='dark'){
    grd.addColorStop(0,'#1a0d2e'); grd.addColorStop(0.7,'#110820'); grd.addColorStop(1,'#080510');
  } else {
    grd.addColorStop(0,'#cbb482'); grd.addColorStop(0.7,'#b89e6e'); grd.addColorStop(1,'#8f7a52');
  }
  c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2);
  c.fillStyle=grd; c.fill();

  // wall ring
  c.lineWidth=8; c.strokeStyle=cfg.wall;
  c.beginPath(); c.arc(cx,cy,r+4,0,Math.PI*2); c.stroke();

  // size indicator dots
  if(cfg.arenaR >= 9000){
    c.fillStyle='rgba(200,64,255,0.5)';
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      c.beginPath(); c.arc(cx+Math.cos(a)*(r-10),cy+Math.sin(a)*(r-10),2.5,0,Math.PI*2); c.fill();
    }
  }

  // theme glow
  if(cfg.theme==='dark'){
    c.save();
    c.globalCompositeOperation='lighter';
    c.globalAlpha=0.25;
    const ag=c.createRadialGradient(cx,cy,5,cx,cy,r);
    ag.addColorStop(0,'rgba(180,0,255,0.6)'); ag.addColorStop(1,'rgba(180,0,255,0)');
    c.fillStyle=ag; c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fill();
    c.restore();
  }

  // scale label
  c.font='bold 10px Impact';
  c.fillStyle = cfg.theme==='dark' ? '#c840ff' : '#e8b64c';
  c.textAlign='center';
  c.fillText(cfg.arenaR >= 9000 ? '4× ARENA SIZE' : 'STANDARD SIZE', cx, cy+r+18);
}
