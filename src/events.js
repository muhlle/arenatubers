"use strict";
/* =========================================================
   EVENTS — in-run special events (scaffold)
   Events are triggered by the wave director or on kill milestones.
   G.eventQueue  — pending events waiting to fire
   G.activeEvent — currently running event (one at a time)

   To add a new event:
     1. Add an entry to EVENTS with id, nm, ds, trigger()
     2. Call queueEvent(id) from waves.js or player.js
     3. Handle any per-frame update in updateEvents(dt)
========================================================= */
const EVENTS = [
  {
    id: 'horde',
    nm: 'HORDE INCOMING',
    ds: 'A massive horde swarms the arena!',
    trigger(){
      // Spawn extra wave of enemies
      const count = 10 + Math.floor(G.wave * 0.8);
      const pool = ['imp','imp','grunt','bomber'];
      for(let i = 0; i < count; i++){
        setTimeout(()=>{ if(G && G.enemies) spawnEnemy(pick(pool)); }, i * 180);
      }
      announce('HORDE!', 'survive the swarm');
    }
  },
  {
    id: 'eliteHunt',
    nm: 'ELITE HUNT',
    ds: 'Three elite champions enter the arena.',
    trigger(){
      setTimeout(()=>{
        if(!G) return;
        for(let i = 0; i < 3; i++) spawnEnemy(pick(['brute','shaman']), true);
      }, 800);
      announce('ELITE HUNT', 'three champions approach');
    }
  },
  {
    id: 'darkness',
    nm: 'DARKNESS FALLS',
    ds: 'Vision is reduced for 20 seconds. (Placeholder — rendering hook needed.)',
    trigger(){
      G.activeEvent = { id:'darkness', life:20 };
      announce('DARKNESS FALLS', 'survive the dark');
    }
  },
];

const _EVENT_MAP = {};
EVENTS.forEach(e => _EVENT_MAP[e.id] = e);

function queueEvent(id){
  const def = _EVENT_MAP[id];
  if(!def) return;
  G.eventQueue.push(id);
}

function updateEvents(dt){
  if(!G) return;
  // Tick active event
  if(G.activeEvent){
    G.activeEvent.life -= dt;
    if(G.activeEvent.life <= 0) G.activeEvent = null;
  }
  // Start next queued event when arena is clear of active one
  if(!G.activeEvent && G.eventQueue.length){
    const id = G.eventQueue.shift();
    const def = _EVENT_MAP[id];
    if(def) def.trigger();
  }
}
