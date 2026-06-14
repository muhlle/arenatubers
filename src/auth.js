"use strict";
/* =========================================================
   AUTH — localStorage user system
========================================================= */
(function(){
  const USERS_KEY   = 'grukk_users';
  const SESSION_KEY = 'grukk_session';

  function getUsers(){
    let users = {};
    try { users = JSON.parse(localStorage.getItem(USERS_KEY)||'{}'); } catch(e){}
    if(!users['admin']){
      users['admin'] = { pass:'admin', voidcores:200, talents:{} };
      saveUsers(users);
    }
    return users;
  }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function getSession(){ return localStorage.getItem(SESSION_KEY)||''; }
  function setSession(u){ localStorage.setItem(SESSION_KEY, u); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  function loadUserData(username){
    const users = getUsers();
    const u = users[username];
    if(!u) return;
    meta.voidcores = u.voidcores || 0;
    if(u.talents){
      for(const id in u.talents){
        if(Object.prototype.hasOwnProperty.call(talentRanks, id))
          talentRanks[id] = u.talents[id] || 0;
      }
    }
    if(u.selectedChar) selectedChar = u.selectedChar;
    $('menuUser').textContent = '⚔ ' + username.toUpperCase() + ' ⚔';
  }

  function saveUserData(){
    const username = getSession();
    if(!username) return;
    const users = getUsers();
    if(!users[username]) return;
    users[username].voidcores = meta.voidcores;
    const talents = {};
    for(const id in talentRanks) talents[id] = talentRanks[id];
    users[username].talents = talents;
    users[username].selectedChar = selectedChar;
    saveUsers(users);
  }

  function loginUser(username){
    try {
      loadUserData(username);
    } catch(err){
      console.error('[auth] loadUserData failed:', err);
    }
    setSession(username);
    openScreen('menu');
  }

  /* ---- tab switching ---- */
  $('ltabLogin').onclick = ()=>{
    $('ltabLogin').classList.add('active');
    $('ltabReg').classList.remove('active');
    $('loginForm').style.display = '';
    $('regForm').style.display = 'none';
    $('loginErr').textContent = '';
  };
  $('ltabReg').onclick = ()=>{
    $('ltabReg').classList.add('active');
    $('ltabLogin').classList.remove('active');
    $('regForm').style.display = '';
    $('loginForm').style.display = 'none';
    $('regErr').textContent = '';
  };

  /* ---- login ---- */
  $('btnLogin').onclick = ()=>{
    const user = $('loginUser').value.trim().toLowerCase();
    const pass = $('loginPass').value;
    $('loginErr').textContent = '';
    if(!user||!pass){ $('loginErr').textContent='Enter username and password.'; return; }
    const users = getUsers();
    if(!users[user]){ $('loginErr').textContent='User not found.'; return; }
    if(users[user].pass!==pass){ $('loginErr').textContent='Wrong password.'; return; }
    $('loginErr').style.color='#5ee06a';
    $('loginErr').textContent='Logging in...';
    setTimeout(()=> loginUser(user), 300);
  };
  // Allow Enter key in login form
  [$('loginUser'),$('loginPass')].forEach(el=>
    el.addEventListener('keydown', e=>{ if(e.key==='Enter') $('btnLogin').click(); })
  );

  /* ---- register ---- */
  $('btnReg').onclick = ()=>{
    const user = $('regUser').value.trim().toLowerCase();
    const pass = $('regPass').value;
    $('regErr').textContent = '';
    if(!user||!pass){ $('regErr').textContent='Enter username and password.'; return; }
    if(user.length<3){ $('regErr').textContent='Username must be at least 3 characters.'; return; }
    const users = getUsers();
    if(users[user]){ $('regErr').textContent='Username already taken.'; return; }
    users[user] = { pass, voidcores:0, talents:{} };
    saveUsers(users);
    $('regErr').style.color='#5ee06a';
    $('regErr').textContent='Account created! Welcome, '+user.toUpperCase()+'!';
    setTimeout(()=> loginUser(user), 600);
  };
  [$('regUser'),$('regPass')].forEach(el=>
    el.addEventListener('keydown', e=>{ if(e.key==='Enter') $('btnReg').click(); })
  );

  /* ---- logout ---- */
  $('btnLogout').onclick = ()=>{
    saveUserData();
    clearSession();
    if(typeof devTools !== 'undefined'){
      devTools.open = false;
      devTools.godmode = false;
      devTools.speed = 1;
    }
    if(typeof syncDevToolsPanel === 'function') syncDevToolsPanel();
    TALENTS.forEach(t=>{ talentRanks[t.id]=0; });
    meta.voidcores = 0;
    $('menuUser').textContent = '';
    openScreen('loginscreen');
  };

  /* ---- auto-save hooks ---- */
  // Save on toMenu (between runs)
  const _toMenu = toMenu;
  window.toMenu = function(){ saveUserData(); _toMenu(); };

  // Save after talent purchases (renderTalents is called after each buy)
  const _renderTalents = renderTalents;
  window.renderTalents = function(){ _renderTalents(); saveUserData(); };

  /* ---- check existing session on load ---- */
  const session = getSession();
  if(session){
    const users = getUsers();
    if(users[session]){ loginUser(session); return; }
    clearSession();
  }
  // No session -- loginscreen already showing via HTML
  getUsers(); // seed admin if needed
})();
