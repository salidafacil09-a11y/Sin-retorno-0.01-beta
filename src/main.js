(function (G) {
  'use strict';

  const DEBUG = location.search.indexOf('debug') !== -1;
  const LOW = G.Input.isTouch;            // móviles: sin antialias de fábrica (lo demás lo decide la calidad)
  const Q = G.Quality;
  const FOG = 0xaeb7b8;

  let renderer, scene, camera, player, sun, hemi;
  let state = 'menu';                     // menu | playing | paused | dead
  let last = 0, fpsAcc = 0, fpsN = 0;
  let target = null, lootT = null, vaultT = null;
  // Opciones (inicio y pausa): abrir puertas al correr (y saltar ventanas abiertas y vallas)
  const OPT_KEY = 'ceniza.autopuertas';
  // Pruebas de desarrollador: todas las armas (y munición sin fin) y un botón para sacar zombis
  const DEV_KEY = 'ceniza.dev';
  let devMode = (() => { try { return localStorage.getItem(DEV_KEY) === '1'; } catch (e) { return false; } })();
  G.DEV = devMode;
  let autoDoors = (() => { try { return localStorage.getItem(OPT_KEY) !== '0'; } catch (e) { return true; } })();
  let aimed = null;          // zombi resaltado con el contorno amarillo
  let kills = 0, survived = 0, deadT = 0;
  let baseFov = 60, scopedNow = false, scopeHint = false;
  let grabT = null;          // zombi que se puede agarrar por la espalda
  const el = (id) => document.getElementById(id);

  function fatal(msg) {
    el('start-msg').textContent = msg;
    el('btn-start').disabled = true;
  }

  function init() {
    if (typeof THREE === 'undefined') { fatal('No se pudo cargar Three.js. Revisa tu conexión y recarga la página.'); return; }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !LOW, powerPreference: 'high-performance' });
    } catch (e) { fatal('Tu navegador no admite WebGL, necesario para jugar.'); return; }
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = LOW ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    el('game').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG).convertSRGBToLinear();
    scene.fog = new THREE.Fog(scene.background.getHex(), 16, 58);

    hemi = new THREE.HemisphereLight(0xd6e0e4, 0x4f4a3c, 0.62);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1dc, 1.25);
    sun.castShadow = true;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.035;
    scene.add(sun);
    scene.add(sun.target);

    camera = new THREE.PerspectiveCamera(62, 1, 0.05, 95);
    G.Camera.init(camera);

    G.Input.init(renderer.domElement);
    G.World.init(scene, newSeed());
    G.World.reset(currentSeed);
    G.Population.init(scene);
    player = new G.Player(scene);
    G.World.setSpawnCheck((id) => !!player.spotFor(id));
    refreshWorld(true, 0);

    G.Guns.init(scene);
    G.Guns.onMessage = toast;
    G.Loot.onMessage = (m, fail) => toast(m, fail ? 'warn' : 'good');
    G.Combat.onMessage = toast;
    G.Guns.onHit = (res, crit) => G.Combat.onHit(res, crit);
    G.Combat.onHit = (res, crit) => {
      if (res === 'kill') kills++;
      const h = el('hitmark');
      h.className = 'on' + (crit ? ' crit' : '');
      clearTimeout(h._t);
      h._t = setTimeout(() => { h.className = ''; }, 140);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    applyQuality();
    Q.onChange((msg) => { applyQuality(); if (msg && state === 'playing') toast(msg); });
    setupQualityMenu();

    el('btn-start').addEventListener('click', start);
    el('btn-retry').addEventListener('click', retry);
    el('btn-resume').addEventListener('click', resume);
    // pruebas de desarrollador: botón «+ Zombi» (y la tecla N)
    document.body.classList.toggle('dev', devMode);
    const zs = el('btn-zspawn');
    if (zs) {
      zs.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!(G.HudEdit && G.HudEdit.editing)) devSpawnZombie(); });
      zs.addEventListener('click', (e) => e.preventDefault());
    }
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyN' && devMode && state === 'playing' && !e.repeat) devSpawnZombie();
      if (e.code === 'Enter' && !(G.HudEdit && G.HudEdit.editing)) {
        if (state === 'menu') start();
        else if (state === 'dead') retry();
        else if (state === 'paused') resume();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      // abrir un mueble suelta el ratón para poder tocar el menú: eso no pausa
      if (!G.Input.isTouch && state === 'playing' && !G.Input.pointerLocked && !G.Loot.isOpen && !G.Backpack.isOpen) pause();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });

    G.HUD.init();
    G.HUD.onMessage = toast;
    G.Backpack.onMessage = toast;
    if (G.HudEdit) G.HudEdit.init();
    el('controls-pc').classList.toggle('hidden', G.Input.isTouch);
    el('controls-touch').classList.toggle('hidden', !G.Input.isTouch);
    if (DEBUG) el('debug').classList.remove('hidden');
    requestAnimationFrame(loop);
  }

  let currentSeed = 0;
  function newSeed() {
    const m = /[?&]seed=(-?\d+)/.exec(location.search);
    currentSeed = m ? parseInt(m[1], 10) : Math.floor(Math.random() * 1000000);
    return currentSeed;
  }

  function refreshWorld(immediate, dt) {
    G.World.update(player.pos.x, player.pos.z, immediate, dt);
    G.Population.update(player.pos.x, player.pos.z, dt);
  }

  // ---------- Calidad gráfica ----------
  function applyQuality() {
    const q = Q.cur;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
    sun.castShadow = q.shadows;
    const S = q.shadowSize;
    const cam = sun.shadow.camera;
    if (cam.right !== S || sun.shadow.mapSize.x !== q.shadowMap) {
      cam.left = -S; cam.right = S; cam.top = S; cam.bottom = -S;
      cam.updateProjectionMatrix();
      sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    scene.fog.near = q.fog[0]; scene.fog.far = q.fog[1];
    camera.far = q.far;
    resize();
    refreshQualityMenu();
  }

  function setupQualityMenu() {
    document.querySelectorAll('.qrow').forEach((row) => {
      row.querySelectorAll('button[data-level]').forEach((b) => {
        b.addEventListener('click', (e) => { e.preventDefault(); Q.set(b.dataset.level); });
      });
      const cb = row.querySelector('input[data-fps30]');
      if (cb) cb.addEventListener('change', () => Q.setFps30(cb.checked));
      row.querySelectorAll('button[data-hud]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); G.HUD.setStyle(b.dataset.hud); refreshQualityMenu(); }));
      const dv = row.querySelector('input[data-dev]');
      if (dv) dv.addEventListener('change', () => setDev(dv.checked));
      const ad = row.querySelector('input[data-autodoor]');
      if (ad) ad.addEventListener('change', () => { autoDoors = ad.checked; try { localStorage.setItem(OPT_KEY, autoDoors ? '1' : '0'); } catch (e) { /* nada */ } refreshQualityMenu(); });
    });
    refreshQualityMenu();
  }
  function refreshQualityMenu() {
    document.querySelectorAll('.qrow').forEach((row) => {
      row.querySelectorAll('button[data-level]').forEach((b) => b.classList.toggle('on', b.dataset.level === Q.level));
      const cb = row.querySelector('input[data-fps30]');
      if (cb) cb.checked = Q.fps30;
      const ad = row.querySelector('input[data-autodoor]');
      if (ad) ad.checked = autoDoors;
      const dv = row.querySelector('input[data-dev]');
      if (dv) dv.checked = devMode;
      row.querySelectorAll('button[data-hud]').forEach((b) => b.classList.toggle('on', b.dataset.hud === G.HUD.style));
      const now = row.querySelector('.qnow');
      if (now) now.textContent = Q.level === 'auto' ? '(ahora ' + Q.cur.name + ')' : '';
    });
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    baseFov = w < h ? 74 : 60;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }

  function tryFullscreen() {
    if (!G.Input.isTouch) return;
    const d = document.documentElement;
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    try {
      if (req) { const p = req.call(d); if (p && p.catch) p.catch(() => {}); }
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } catch (e) { /* no pasa nada */ }
  }

  function start() {
    if (state !== 'menu') return;
    tryFullscreen();
    el('start').classList.add('hidden');
    G.Input.enabled = true;
    G.Input.requestLock();
    state = 'playing';
    if (devMode) player.applyDev();
    toast(devMode ? 'Mundo de pruebas: tienes todas las armas. Saca zombis con «+ Zombi»' + (G.Input.isTouch ? '' : ' (o la tecla N)') + '.'
      : 'Mundo de pruebas. Activa «Pruebas de desarrollador» en el menú para tener todas las armas y sacar zombis.');
  }

  // Corriendo contra una puerta cerrada la abres de un empujón (más ruido); contra una ventana
  // abierta o rota, o una valla, la saltas sin frenar
  function autoDoor() {
    if (!player.running || player.busy() || player.climb) return;
    const v = Math.hypot(player.vel.x, player.vel.z);
    if (v < 2.5) return;
    const W = G.World, E = W.E;
    const dx = player.vel.x / v, dz = player.vel.z / v;
    const x0 = player.pos.x, z0 = player.pos.z, x1 = x0 + dx * 0.6, z1 = z0 + dz * 0.6;
    const f = W.lineHit(x0, z0, x1, z1, (e) => e === E.DOOR || e === E.WIN_OPEN || e === E.WIN_BROKEN || e === E.FENCE, player.lv);
    if (f < 0) return;
    const ref = W.edgeAt(x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, dx, dz, player.lv);
    if (!ref) return;
    const e = W.edgeGet(ref);
    const mx = ref.o === 'N' ? ref.x + 0.5 : ref.x, mz = ref.o === 'N' ? ref.z : ref.z + 0.5;
    if (e === E.DOOR) { W.setEdge(ref, E.DOOR_OPEN); W.emit(mx, mz, 7, player.lv); if (G.Camera.shake) G.Camera.shake(0.06); }
    else if (!player.lv) {
      const m = G.Interact.climb({ climbable: true, ref, e, x: mx, z: mz }, player);
      if (m) toast(m, 'bad');
    }
  }

  function pause() {
    G.Loot.close(false);
    G.Backpack.close(false);
    state = 'paused';
    G.Input.enabled = false;
    el('paused').classList.remove('hidden');
  }

  function setDev(on) {
    devMode = !!on; G.DEV = devMode;
    try { localStorage.setItem(DEV_KEY, devMode ? '1' : '0'); } catch (e) { /* nada */ }
    document.body.classList.toggle('dev', devMode);
    if (devMode && player && !player.dead && state !== 'menu') { player.applyDev(); toast('Pruebas de desarrollador: todas las armas'); }
    refreshQualityMenu();
  }

  // Saca un zombi delante (a unos metros, donde haya sitio) que viene a por ti
  function devSpawnZombie() {
    if (!devMode || state !== 'playing' || player.dead) return;
    const W = G.World, f = G.Camera.forward();
    const base = Math.atan2(f.x, f.z), lv = player.lv || 0;
    const inside = W.isIndoor(Math.floor(player.pos.x), Math.floor(player.pos.z), lv);
    for (let tries = 0; tries < 40; tries++) {
      const a = base + (tries === 0 ? 0 : (Math.random() - 0.5) * Math.min(6.2, 0.6 + tries * 0.2));
      const d = Math.max(2.5, 6 + Math.random() * 3 - tries * 0.12);
      const x = player.pos.x + Math.sin(a) * d, z = player.pos.z + Math.cos(a) * d;
      if (W.circleBlocked(x, z, 0.35, lv)) continue;
      if (tries < 25 && W.isIndoor(Math.floor(x), Math.floor(z), lv) !== inside) continue;
      const zb = new G.Zombie(scene, x, z, null, Math.atan2(player.pos.x - x, player.pos.z - z), { lv });
      zb.state = 'chase'; zb.target = { x: player.pos.x, z: player.pos.z, lv }; zb.lastSeen = 0;
      G.Population.list.push(zb);
      toast(zb.runner ? 'Zombi de prueba (corredor)' : 'Zombi de prueba');
      return;
    }
    toast('No hay sitio para sacar un zombi aquí', 'warn');
  }

  function resume() {
    if (state !== 'paused') return;
    el('paused').classList.add('hidden');
    G.Input.enabled = true;
    G.Input.clear();
    G.Input.requestLock();
    state = 'playing';
  }

  function retry() {
    aimed = null;
    G.Loot.close(false);
    G.Backpack.close(false);
    G.Population.reset();
    G.World.reset(newSeed());
    player.reset();
    if (devMode) player.applyDev();
    G.Combat.dragT = 0;
    G.Guns.reset();
    kills = 0; survived = 0; deadT = 0;
    G.Camera.yaw = Math.PI; G.Camera.pitch = 0.1;
    refreshWorld(true, 0);
    el('dead').classList.add('hidden');
    G.Input.enabled = true;
    G.Input.clear();
    G.Input.requestLock();
    state = 'playing';
  }

  // ---------- HUD ----------
  const NOISE_TEXT = ['Sigilo', 'Caminando', 'Corriendo: te oyen', 'Agachado', 'Pecho a tierra', 'Oculto en la hierba'];
  let toastN = 0;
  function toast(text, kind) {
    const box = el('toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.textContent = text;
    box.appendChild(d);
    toastN++;
    setTimeout(() => { d.classList.add('out'); }, 2600);
    setTimeout(() => { d.remove(); }, 3100);
    while (box.children.length > 3) box.firstChild.remove();
  }

  function updateHud() {

    const n = el('noise');
    n.textContent = NOISE_TEXT[player.noiseLevel];
    n.className = 'n' + player.noiseLevel;
    const st = [];
    if (player.bleed > 0) st.push(G.Input.isTouch ? 'Sangrando: véndate' : 'Sangrando: véndate (B)');
    else if (player.infRiskT > 0) st.push('Herida sin vendar');
    if (player.sick) st.push('Fiebre');
    el('status').textContent = st.join(' · ');
    el('damage').style.opacity = Math.min(1, player.hurt * 2.2);

    G.HUD.update(player, state);

    // botones de contexto: puerta/ventana, botín (∆) y saltar
    const p = el('prompt');
    const use = el('btn-use'), lb = el('btn-loot'), jb = el('btn-jump');
    const playing = state === 'playing';
    document.body.classList.toggle('playing', playing);
    const parts = [];
    if (grabT && playing) parts.push('<b>Clic</b>Agarrar por la espalda');
    if (target && playing) parts.push('<b>E</b>' + target.label);
    if (lootT && playing) parts.push('<b>T</b>' + lootT.label);
    if (G.Loot.isOpen && playing) parts.push('<b>T</b>Cerrar');
    if (vaultT && playing) parts.push('<b>X</b>' + vaultT.label);
    const ph = parts.join(' &nbsp; ');
    if (ph) { if (p._h !== ph) { p._h = ph; p.innerHTML = ph; } p.classList.remove('hidden'); } else p.classList.add('hidden');
    use.classList.toggle('hidden', !(target && playing));
    if (target && playing) { const lbl = use.querySelector('.lbl'); if (lbl.textContent !== target.label) lbl.textContent = target.label; }
    const lootOn = playing && (!!lootT || G.Loot.isOpen);
    lb.classList.toggle('hidden', !lootOn);
    lb.classList.toggle('on', G.Loot.isOpen);
    if (lootOn) { const t = G.Loot.isOpen ? 'Cerrar' : lootT.label; const l2 = lb.querySelector('.lbl'); if (l2.textContent !== t) l2.textContent = t; }
    jb.classList.toggle('vault', !!(vaultT && playing));
    const bag = el('bag');
    bag.classList.toggle('on', G.Backpack.isOpen);
    bag.classList.toggle('nopack', !player.backpack);
    const nv = player.items.venda + player.items.venda_d;
    const bs = bag.querySelector('span');
    if (bs.textContent !== String(nv)) bs.textContent = nv;
    // munición y retícula de las armas de fuego
    const w = player.weapon, sl = player.slot, isGun = G.Weapons.isGun(w) && !!sl;
    const ch = el('crosshair');
    const gunAim = isGun && player.aiming;
    ch.classList.toggle('aim', player.aiming && !isGun);
    ch.classList.toggle('gun', gunAim);
    ch.classList.toggle('target', gunAim && !!aimed);
    if (gunAim) {
      const sp = G.Guns.spreadNow(player);
      const px = Math.round(Math.min(160, Math.tan(sp) / Math.tan(camera.fov * Math.PI / 360) * window.innerHeight / 2) * 2 + 8);
      if (ch._px !== px) { ch._px = px; ch.style.width = ch.style.height = px + 'px'; ch.style.margin = (-px / 2) + 'px 0 0 ' + (-px / 2) + 'px'; }
    } else if (ch._px) { ch._px = 0; ch.style.width = ch.style.height = ch.style.margin = ''; }
    el('btn-reload').classList.toggle('hidden', !(isGun && w.gun !== 'bow'));
    // atacar se convierte en agarrar si tienes a un zombi desprevenido de espaldas
    const ab = el('btn-attack');
    const grabbing = !!grabT && state === 'playing' && !player.aiming;
    if (ab._g !== grabbing) { ab._g = grabbing; ab.classList.toggle('grab', grabbing); ab.querySelector('.lbl').textContent = grabbing ? 'Agarrar' : ''; }
    el('cine').classList.toggle('on', !!(player.action && player.action.kind === 'finisher'));

    let chasing = 0;
    for (const z of G.Population.list) if (z.alive && (z.state === 'chase' || z.state === 'attack' || z.state === 'bang')) chasing++;
    el('chasers').textContent = chasing ? (chasing === 1 ? 'Te persigue 1 zombi' : 'Te persiguen ' + chasing + ' zombis') : '';
  }

  // ---------- Bucle ----------
  const prof = { logic: 0, zombies: 0, world: 0, render: 0, n: 0 };
  function loop(ts) {
    requestAnimationFrame(loop);
    // límite opcional de 30 fps (gasta menos batería y calienta menos)
    if (Q.fps30 && ts - last < 1000 / 30 - 3) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    let tA = DEBUG ? performance.now() : 0, tB = tA;

    if (state === 'playing') {
      survived += dt;
      G.Input.update(dt);
      if (G.Input.pause) { pause(); }
      const zombies = G.Population.list;
      const camYaw = Math.atan2(G.Camera.forward().x, G.Camera.forward().z);
      if (!player.dead) {
        G.Combat.handleInput(player, G.Input, zombies, camYaw);
        // con el rifle apuntando, la rueda (o el 2.º toque de Apuntar) pone o quita la mira
        const scopeOk = !!player.weapon.scope && player.aiming;
        if (G.Input.cycle) {
          if (scopeOk && !G.Input.isTouch) player.scope = !player.scope;
          else { const m = player.cycleWeapon(); if (m) toast(m); }
        }
        if (G.Input.quick) { const m = player.quickSwap(); if (m) toast(m); }
        if (G.Input.scope && scopeOk) player.scope = true;
        for (const n of [1, 2, 3, 4]) if (G.Input['slot' + n]) { const m = player.selectSlot(n); if (m) toast(m); }
        if (G.Input.grip) { const m = player.toggleGrip(); if (m) toast(m); }
        if (G.Input.pack) G.Backpack.open(player);
        if (G.Input.bandage) {
          // B: la venda desinfectada si la tienes y hace falta; si no, una venda normal
          const kind = player.items.venda_d && (player.needsCare || player.health < 95) ? 'venda_d' : 'venda';
          const m = player.startBandage(kind); if (m) toast(m, 'warn');
        }
        const camF = G.Camera.forward();
        const busyMenu = G.Loot.isOpen || G.Backpack.isOpen;
        target = busyMenu ? null : G.Interact.find(player, camF, 'door');
        lootT = busyMenu ? null : G.Interact.find(player, camF, 'loot');
        vaultT = busyMenu ? null : G.Interact.find(player, camF, 'vault');
        // ∆ / T: abre o cierra el botín. En el mando (A) es contextual: botín primero, si no la puerta
        const padA = G.Input.use && !!G.Input.padUse;
        if (G.Input.loot || (padA && (lootT || G.Loot.isOpen))) {
          if (G.Loot.isOpen) G.Loot.close(true);
          else if (lootT) { const m = G.Interact.use(lootT, player); if (m) toast(m); lootT = null; }
        } else if (G.Input.use) {
          if (G.Loot.isOpen) G.Loot.close(true);
          else if (target) { const m = G.Interact.use(target, player); if (m) toast(m); target = null; }
        }
        // Saltar: trepa si tienes delante una valla o una ventana abierta o rota; si no, un saltito
        if (G.Input.jump) {
          if (vaultT) { const m = G.Interact.climb(vaultT, player); if (m) toast(m, 'bad'); vaultT = null; }
          else player.jump();
        }
        if (autoDoors) autoDoor();
      } else target = null;
      // parón de impacto: unos instantes a cámara muy lenta al acertar un golpe
      const hs = G.Combat.hitStop > 0;
      if (hs) G.Combat.hitStop = Math.max(0, G.Combat.hitStop - dt);
      const gdt = hs ? dt * 0.12 : dt;
      player.update(gdt, G.Input, G.Camera);
      // contorno amarillo: al apuntar (en móvil, cuando hay un zombi a tu alcance delante)
      let tgt = null;
      const gun = G.Weapons.isGun(player.weapon);
      if (!player.dead && gun) {
        if (player.aiming) tgt = G.Guns.rayTarget(player, zombies);
      } else if (!player.dead) {
        // cuerpo a cuerpo: se marca el zombi al que vas a pegar (el más cercano, o hacia donde empujas)
        const mt = G.Combat.meleeTarget(player, zombies, camYaw, G.Input, 1.0);
        tgt = mt ? mt.z : null;
      }
      grabT = player.dead ? null : G.Combat.grabTarget(player, zombies);
      if (grabT && !tgt) tgt = grabT;
      if (tgt !== aimed) {
        if (aimed) G.Models.setOutline(aimed.model, false);
        if (tgt) G.Models.setOutline(tgt.model, true);
        aimed = tgt;
      }
      G.Combat.update(gdt, player, zombies);
      G.Loot.update();
      G.Backpack.update(player);
      G.Guns.update(gdt, player, zombies);
      if (DEBUG) { tB = performance.now(); prof.logic += tB - tA; tA = tB; }
      for (let i = 0; i < zombies.length; i++) zombies[i].update(gdt, player, zombies, G.Combat);
      if (DEBUG) { tB = performance.now(); prof.zombies += tB - tA; tA = tB; }
      refreshWorld(false, dt);
      if (DEBUG) { tB = performance.now(); prof.world += tB - tA; tA = tB; }
      Q.sample(dt);
      if (player.dead) {
        deadT += dt;
        if (deadT > 2.2) die();
      }
    } else if (state === 'menu' || state === 'dead' || state === 'paused') {
      if (G.Input.padConfirm() && !(G.HudEdit && G.HudEdit.editing)) { if (state === 'menu') start(); else if (state === 'dead') retry(); else resume(); }
      if (state === 'menu') {
        // la cámara gira lentamente alrededor de la casa en el menú
        G.Camera.yaw += dt * 0.08;
      }
    }

    player.apply(state === 'playing' && G.Combat.hitStop > 0 ? dt * 0.12 : dt);
    // zoom al apuntar con armas de fuego; con el rifle, mira telescópica
    const wpn = player.weapon;
    // la mira telescópica solo aparece si la pides (2.º toque de Apuntar, V, rueda o LB)
    const scoped = state === 'playing' && wpn.scope && player.aiming && player.scope && player.gun.aim > 0.85 && !player.dead;
    G.Input.scopeable = !!wpn.scope && player.aiming;
    G.Input.scoped = !!player.scope;
    if (G.Input.scopeable && !scopeHint && state === 'playing') {
      scopeHint = true;
      toast(G.Input.isTouch ? 'Toca otra vez Apuntar para mirar por la mira' : 'Rueda o V: mirar por la mira telescópica');
    }
    el('btn-aim').classList.toggle('scope', !!scoped);
    let fovT = baseFov * (scoped ? 0.36 : (G.Weapons.isGun(wpn) ? 1 - 0.12 * player.gun.aim : 1));
    // golpe de zoom al acertar un golpe cuerpo a cuerpo (la cámara "entra" en el impacto)
    const kick = G.Camera.fovKick || 0;
    fovT += (scoped ? 0 : (G.Camera.fovOff || 0)) - kick;
    if (Math.abs(camera.fov - fovT) > 0.05) {
      camera.fov += (fovT - camera.fov) * Math.min(1, dt * (scoped ? 14 : (kick > 0.3 ? 22 : 9)));
      camera.updateProjectionMatrix();
    }
    el('scope').classList.toggle('hidden', !scoped);
    scopedNow = scoped;
    G.Camera.update(dt, player, state === 'playing' ? G.Input : { look: { x: 0, y: 0 } });
    player.model.root.visible = (!G.Camera.near && !scopedNow) || player.dead;

    // el sol sigue al jugador (en pasos para que la sombra no tiemble)
    const sx = Math.round(player.pos.x), sz = Math.round(player.pos.z);
    sun.position.set(sx - 16, 32, sz + 11);
    sun.target.position.set(sx, 0, sz);

    updateHud();
    if (DEBUG) tA = performance.now();
    renderer.render(scene, camera);
    if (DEBUG) { prof.render += performance.now() - tA; prof.n++; }

    if (DEBUG && dt > 0) {
      fpsAcc += dt; fpsN++;
      if (fpsAcc > 0.5) {
        const st = G.World.stats();
        const n = Math.max(1, prof.n), f = (v) => (v / n).toFixed(1);
        el('debug').textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + renderer.info.render.calls + ' draws · ' +
          Math.round(renderer.info.render.triangles / 1000) + 'k tris · ' + st.built + '/' + st.generated + ' chunks · ' +
          G.Population.alive() + ' zombis\nms/fotograma: lógica ' + f(prof.logic) + ' · zombis ' + f(prof.zombies) + ' · mundo ' + f(prof.world) +
          ' · dibujo ' + f(prof.render) + ' · calidad ' + Q.cur.name + (Q.level === 'auto' ? ' (auto)' : '') + (Q.fps30 ? ' · 30 fps' : '') + ' · semilla ' + st.seed;
        fpsAcc = 0; fpsN = 0;
        prof.logic = prof.zombies = prof.world = prof.render = 0; prof.n = 0;
      }
    }
  }

  function die() {
    state = 'dead';
    G.Input.enabled = false;
    if (document.exitPointerLock) document.exitPointerLock();
    const m = Math.floor(survived / 60), s = Math.floor(survived % 60);
    el('dead-cause').textContent = player.deathCause;
    el('dead-stats').textContent = 'Sobreviviste ' + m + ' min ' + s + ' s · Zombis eliminados: ' + kills;
    el('dead').classList.remove('hidden');
  }

  // Para pruebas automáticas
  G.debug = {
    get player() { return player; }, get camera() { return camera; }, get renderer() { return renderer; },
    get scene() { return scene; }, get state() { return state; },
    start, retry, toast, refresh: () => refreshWorld(true, 0), autoDoor: () => autoDoor(),
    // congela al jugador en un momento de una animación (para revisar poses)
    // congela el juego tal cual (para capturas)
    hold() { state = 'frozen'; },
    freeze(kind, t, weapon) {
      if (weapon) { player.weapons = []; player.pickUp(weapon, 1); }
      if (player.slot && G.Weapons.isGun(G.Weapons.get(player.slot.id))) player.slot.cond = 1;
      player.action = kind ? { kind, t, dur: 1, done: true, weapon: player.weapon } : null;
      state = 'frozen';
    },
    tp(x, z, yaw, pitch, lv) {
      player.pos.x = x; player.pos.z = z; player.lv = lv || 0; player.y = G.World.groundY(x, z, player.lv);
      if (yaw != null) G.Camera.yaw = yaw;
      if (pitch != null) G.Camera.pitch = pitch;
      G.Camera.dist = 0.1;
      refreshWorld(true, 0);
    }
  };

  window.addEventListener('DOMContentLoaded', init);
})(window.Game = window.Game || {});
