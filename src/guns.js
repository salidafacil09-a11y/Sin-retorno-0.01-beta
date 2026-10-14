(function (G) {
  'use strict';

  // Armas de fuego y arco.
  // - Hay que apuntar (clic derecho / LT / botón de mira) para disparar; sin apuntar, atacar da un culatazo.
  // - La bala sale del centro de la pantalla (la mira) y la detienen las paredes y las puertas cerradas.
  // - A la cabeza hace el triple de daño; a las piernas derriba más. La escopeta dispara 7 perdigones.
  // - La retícula se abre al moverte y al disparar y se cierra si te quedas quieto.
  // - Cada disparo hace mucho ruido (el arco casi nada; la pistola con silenciador, poco).
  // - El arco se tensa solo mientras apuntas; cuanto más tenso, más lejos y más daño.
  //   Las flechas vuelan con caída y muchas se pueden recuperar del suelo o del cadáver.

  const U = G.Util;
  const KICK = { pistol: 0.03, shotgun: 0.085, rifle: 0.06, bow: 0.008 };     // la mira sube al disparar
  const BLOOM = { pistol: 0.7, shotgun: 1.0, rifle: 1.0, bow: 0.2 };
  const SHAKE = { pistol: 0.1, shotgun: 0.3, rifle: 0.22, bow: 0.03 };
  const CYCLE = { shotgun: 0.55, rifle: 0.85, bow: 0.75 };                       // corredera, cerrojo, coger flecha
  const DRAW_TIME = 0.8;
  const ARROW_SPEED = [22, 52], ARROW_G = 6;
  const SIL_SHOTS = 20;

  let scene = null;
  let light = null, flash = null;
  const tracers = [], parts = [], arrows = [];
  const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3();
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

  function flashTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(0.25, 'rgba(255,200,110,0.9)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    x.fillStyle = g;
    x.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, r = i % 2 ? 12 : 32;
      x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    x.fill();
    return new THREE.CanvasTexture(c);
  }

  // ---------- Geometría de los impactos ----------
  // Rayo contra esfera: devuelve t o -1
  function raySphere(o, d, cx, cy, cz, r) {
    const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz;
    const b = ox * d.x + oy * d.y + oz * d.z;
    const c = ox * ox + oy * oy + oz * oz - r * r;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : (c < 0 ? 0 : -1);
  }
  // Rayo contra cilindro vertical (cx, cz, radio r, de y0 a y1)
  function rayCyl(o, d, cx, cz, r, y0, y1) {
    const ox = o.x - cx, oz = o.z - cz;
    const a = d.x * d.x + d.z * d.z;
    let lo, hi;
    if (a < 1e-9) {
      if (ox * ox + oz * oz > r * r) return -1;
      lo = -Infinity; hi = Infinity;
    } else {
      const b = ox * d.x + oz * d.z, c = ox * ox + oz * oz - r * r;
      const disc = b * b - a * c;
      if (disc < 0) return -1;
      const sq = Math.sqrt(disc);
      lo = (-b - sq) / a; hi = (-b + sq) / a;
    }
    if (Math.abs(d.y) < 1e-9) { if (o.y < y0 || o.y > y1) return -1; }
    else {
      let s0 = (y0 - o.y) / d.y, s1 = (y1 - o.y) / d.y;
      if (s0 > s1) { const k = s0; s0 = s1; s1 = k; }
      lo = Math.max(lo, s0); hi = Math.min(hi, s1);
    }
    if (lo > hi || hi < 0) return -1;
    return Math.max(0, lo);
  }

  // Dónde le da un rayo a un zombi: { t, part: 'head' | 'body' | 'legs' } o null
  function hitZombie(z, o, d) {
    if (!z.alive) return null;
    const y = z.y + (z.lift || 0);
    let best = null;
    const take = (t, part) => { if (t >= 0 && (!best || t < best.t)) best = { t, part }; };
    if (z.fall > 0.5 || z.downed) {
      // tumbado: tres esferas a lo largo del cuerpo
      const dir = z.fallDir || -1;
      const ax = Math.sin(z.facing) * dir, az = Math.cos(z.facing) * dir;
      take(raySphere(o, d, z.pos.x + ax * 0.45, y + 0.16, z.pos.z + az * 0.45, 0.2), 'legs');
      take(raySphere(o, d, z.pos.x + ax * 1.0, y + 0.18, z.pos.z + az * 1.0, 0.26), 'body');
      take(raySphere(o, d, z.pos.x + ax * 1.55, y + 0.16, z.pos.z + az * 1.55, 0.16), 'head');
    } else {
      const fx = Math.sin(z.facing) * 0.07, fz = Math.cos(z.facing) * 0.07;   // la cabeza va algo adelantada
      take(raySphere(o, d, z.pos.x + fx, y + 1.6, z.pos.z + fz, 0.15), 'head');
      take(rayCyl(o, d, z.pos.x, z.pos.z, 0.25, y + 0.85, y + 1.48), 'body');
      take(rayCyl(o, d, z.pos.x, z.pos.z, 0.2, y + 0.05, y + 0.85), 'legs');
    }
    return best;
  }

  // Desvía una dirección al azar dentro de un cono
  function perturb(d, spread, out) {
    const a = spread * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2;
    _u.set(Math.abs(d.y) < 0.9 ? 0 : 1, Math.abs(d.y) < 0.9 ? 1 : 0, 0).cross(d).normalize();
    _w.copy(d).cross(_u);
    return out.copy(d).multiplyScalar(Math.cos(a))
      .addScaledVector(_u, Math.sin(a) * Math.cos(th)).addScaledVector(_w, Math.sin(a) * Math.sin(th)).normalize();
  }

  const Guns = {
    onMessage: null,
    onHit: null,

    msg(t, k) { if (this.onMessage) this.onMessage(t, k); },

    init(sc) {
      scene = sc;
      light = new THREE.PointLight(0xffc27a, 0, 7, 2);
      scene.add(light);
      flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      flash.material.toneMapped = false;
      flash.visible = false;
      scene.add(flash);
      for (let i = 0; i < 8; i++) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 1], 3));
        const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false }));
        l.material.toneMapped = false;
        l.frustumCulled = false;
        l.visible = false;
        scene.add(l);
        tracers.push({ line: l, life: 0 });
      }
      const geo = new THREE.IcosahedronGeometry(1, 0);
      const mBlood = new THREE.MeshBasicMaterial({ color: 0x6e0d0d });
      const mDust = new THREE.MeshBasicMaterial({ color: 0xb4a994 });
      for (let i = 0; i < 60; i++) {
        const m = new THREE.Mesh(geo, i % 3 ? mBlood : mDust);
        m.visible = false;
        scene.add(m);
        parts.push({ m, v: new THREE.Vector3(), life: 0, blood: !!(i % 3) });
      }
    },

    reset() {
      for (const a of arrows) if (a.mesh.parent) a.mesh.parent.remove(a.mesh);
      arrows.length = 0;
      for (const p of parts) { p.life = 0; p.m.visible = false; }
    },

    // ---------- Entrada ----------
    // Devuelve true si la acción se usó para el arma de fuego
    handleInput(player, input, zombies) {
      const w = player.weapon;
      if (!G.Weapons.isGun(w) || player.dead) return false;
      const aiming = player.aiming;
      if (input.reload) { this.startReload(player); return true; }
      if (input.attack && aiming) {
        if (!player.busy()) this.tryFire(player, zombies);
        return true;
      }
      return false;
    },

    // Cada disparo gasta el arma; rota no dispara pero se queda
    wearGun(player, w, s) {
      if (!w.shots) return;
      s.cond = Math.max(0, (s.cond == null ? 1 : s.cond) - 1 / w.shots);
      if (s.cond <= 0.0001) { s.broken = true; this.msg('Se rompió: ' + w.name + ' (no dispara; se podrá arreglar en un taller)', 'bad'); }
    },

    startReload(player) {
      const w = player.weapon, s = player.slot, g = player.gun;
      if (!s || w.gun === 'bow' || g.reload || s.broken) return;
      // durante la corredera o el cerrojo, la recarga empieza en cuanto terminan
      if (g.cycle || player.busy()) { g.wantReload = true; return; }
      g.wantReload = false;
      if (s.mag >= w.mag) return;
      if (player.ammo[w.ammo] <= 0) { this.msg('No te quedan ' + G.Weapons.AMMO[w.ammo].name, 'warn'); return; }
      g.reload = { u: 0, dur: w.reload, per: !!w.perShell };
      // recargar deja de apuntar (vuelve a apuntar si lo pides otra vez, o al terminar si mantienes el botón)
      player.reloadNoAim = true;
      if (G.Input && G.Input.setAim) G.Input.setAim(false);
    },

    tryFire(player, zombies) {
      const w = player.weapon, s = player.slot, g = player.gun;
      if (g.cooldown > 0 || g.cycle || g.aim < 0.6) return;
      if (s.broken) { g.cooldown = 0.6; this.msg(w.name + ': está rota (se podrá arreglar en un taller)', 'warn'); return; }
      if (g.reload) {
        // con la escopeta y el rifle se puede cortar la recarga para disparar
        if (g.reload.per && s.mag > 0) g.reload = null; else return;
      }
      if (w.gun === 'bow') {
        if (!s.mag) { if (!player.ammo.flecha) this.msg('No te quedan flechas', 'warn'); return; }
        if (g.draw < 0.15) return;
        this.shootArrow(player, zombies);
        return;
      }
      if (s.mag <= 0) {
        g.cooldown = 0.3;
        if (player.ammo[w.ammo] > 0) this.startReload(player);
        else this.msg('Sin munición', 'warn');
        return;
      }
      this.fire(player, zombies);
    },

    // Dispersión actual (radianes): crece al moverte, correr y disparar
    spreadNow(player) {
      const w = player.weapon, g = player.gun;
      if (!G.Weapons.isGun(w)) return 0;
      let s = w.spread * (1 + g.bloom * 2.2 + player.moveAmt * (player.crouching ? 0.8 : 1.4) + (player.running ? 2 : 0));
      if (player.crouching) s *= 0.8;
      if (w.gun === 'bow') s *= 1 + (1 - g.draw) * 3;
      s *= 1 + (1 - g.aim) * 2;
      return s;
    },

    // Origen y dirección del disparo (el centro de la pantalla) y desde dónde cuenta
    ray(player) {
      const C = G.Camera;
      _o.copy(C.pos);
      _d.copy(C.dir).normalize();
      // no puede darle a lo que está entre la cámara y el personaje
      const px = player.pos.x - _o.x, py = player.y + 1.3 - _o.y, pz = player.pos.z - _o.z;
      const tMin = Math.max(0, px * _d.x + py * _d.y + pz * _d.z - 0.25);
      return { o: _o, d: _d, tMin };
    },

    // Lanza un rayo: { t, z, part, point }
    cast(player, zombies, o, d, tMin, range) {
      const W = G.World;
      let tEnd = range;
      // paredes y puertas cerradas (desde el personaje hacia delante)
      const sx = o.x + d.x * tMin, sz = o.z + d.z * tMin;
      const ex = o.x + d.x * range, ez = o.z + d.z * range;
      const f = W.lineHit(sx, sz, ex, ez, W.blocksSightEdge, player.lv);
      let what = null;
      if (f >= 0) { tEnd = tMin + f * (range - tMin); what = 'wall'; }
      // suelo y lomas: se recorre el rayo a pasos de medio metro
      {
        const step = 0.5;
        for (let t = Math.max(tMin, 0.5); t < tEnd; t += step) {
          const x = o.x + d.x * t, z = o.z + d.z * t, y = o.y + d.y * t;
          // arriba solo cuenta el suelo de la planta dentro del edificio; fuera, el terreno
          const gAt = (gx, gz) => (player.lv && W.bldAt(Math.floor(gx), Math.floor(gz), player.lv)) ? W.groundY(gx, gz, player.lv) : W.groundY(gx, gz, 0);
          const gy = gAt(x, z);
          if (y < gy) {
            // afina entre el paso anterior y este
            let a = t - step, b = t;
            for (let k = 0; k < 5; k++) { const m = (a + b) / 2; if (o.y + d.y * m < gAt(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
            if (b > tMin) { tEnd = b; what = 'ground'; }
            break;
          }
        }
      }
      let bz = null, part = null;
      for (const z of zombies) {
        if (!z.alive || (z.lv || 0) !== (player.lv || 0)) continue;
        const dx = z.pos.x - o.x, dz = z.pos.z - o.z;
        if (dx * dx + dz * dz > (range + 2) * (range + 2)) continue;
        const h = hitZombie(z, o, d);
        if (h && h.t > tMin && h.t < tEnd) { tEnd = h.t; bz = z; part = h.part; what = 'zombie'; }
      }
      return { t: tEnd, z: bz, part, what, point: new THREE.Vector3(o.x + d.x * tEnd, o.y + d.y * tEnd, o.z + d.z * tEnd) };
    },

    // Zombi justo en la mira (para el contorno amarillo)
    rayTarget(player, zombies) {
      const w = player.weapon;
      if (!G.Weapons.isGun(w)) return null;
      const r = this.ray(player);
      const c = this.cast(player, zombies, r.o, r.d, r.tMin, w.range);
      return c.z || this.assistTarget(player, zombies, r, w.range);
    },

    // Ayuda a apuntar (más en móvil): si un zombi está casi en la mira, el disparo se va hacia él
    assistTarget(player, zombies, r, range) {
      const lim = G.Input.isTouch ? 0.07 : 0.03;
      let best = null, bestA = lim;
      for (const z of zombies) {
        if (!z.alive || z.fall > 0.5) continue;
        const cx = z.pos.x - r.o.x, cy = z.y + 1.25 - r.o.y, cz = z.pos.z - r.o.z;
        const L = Math.hypot(cx, cy, cz);
        if (L > range || L < 0.5) continue;
        const a = Math.acos(U.clamp((cx * r.d.x + cy * r.d.y + cz * r.d.z) / L, -1, 1));
        if (a < bestA && (z.lv || 0) === (player.lv || 0) && G.World.hasLOS(player.pos.x, player.pos.z, z.pos.x, z.pos.z, player.lv)) { bestA = a; best = z; }
      }
      return best;
    },

    fire(player, zombies) {
      const w = player.weapon, s = player.slot, g = player.gun;
      const r = this.ray(player);
      const o = r.o.clone(), dir = r.d.clone();
      // ayuda a apuntar: si no hay nadie en la mira pero sí casi, corrige un poco
      const direct = this.cast(player, zombies, o, dir, r.tMin, w.range);
      if (!direct.z) {
        const az = this.assistTarget(player, zombies, { o, d: dir }, w.range);
        if (az) {
          const tp = new THREE.Vector3(az.pos.x, az.y + 1.25, az.pos.z).sub(o).normalize();
          dir.lerp(tp, 0.85).normalize();
        }
      }
      const spread = this.spreadNow(player);
      const muzzle = this.muzzlePos(player);
      const hits = new Map();
      const dd = new THREE.Vector3();
      for (let i = 0; i < (w.pellets || 1); i++) {
        perturb(dir, spread, dd);
        const c = this.cast(player, zombies, o, dd, r.tMin, w.range);
        if (i < 3) this.tracer(muzzle, c.point);
        if (c.z) {
          const dist = c.t - r.tMin;
          let dmg = U.lerp(w.dmg[0], w.dmg[1], Math.random()) * (c.part === 'head' ? 3 : (c.part === 'legs' ? 0.75 : 1));
          if (w.gun === 'shotgun' && dist > 6) dmg *= Math.max(0.25, 1 - (dist - 6) / 16);
          const hz = hits.get(c.z) || { dmg: 0, head: false, legs: false, n: 0, dist, point: c.point };
          hz.dmg += dmg; hz.n++; hz.head = hz.head || c.part === 'head'; hz.legs = hz.legs || c.part === 'legs';
          hits.set(c.z, hz);
          this.burst(c.point, dd, true, c.part === 'head' ? 9 : 4);
        } else if (c.what) this.burst(c.point, dd, false, 3);
      }
      for (const [z, h] of hits) {
        const dx = z.pos.x - player.pos.x, dz = z.pos.z - player.pos.z;
        let knock = w.knock + (h.legs ? 0.35 : 0) + (w.gun === 'shotgun' && h.dist < 4 ? 0.45 : 0);
        const behind = G.Combat.behind(player, z);
        const res = z.takeHit(h.dmg, knock, dx, dz, behind, Math.random() < 0.5 ? 1 : -1, 'shot');
        if (this.onHit) this.onHit(res, h.head);
      }
      // los vidrios de las ventanas cerradas que cruza el disparo se rompen
      const far = direct.t;
      G.World.breakWindowsAlong(o.x + dir.x * r.tMin, o.z + dir.z * r.tMin, o.x + dir.x * far, o.z + dir.z * far, player.lv);
      // efectos, ruido y retroceso
      s.mag--;
      this.wearGun(player, w, s);
      const sil = !!s.sil;
      this.muzzleFlash(muzzle, sil ? 0.35 : (w.gun === 'shotgun' ? 1.4 : 1));
      G.World.emit(player.pos.x, player.pos.z, w.noise * (sil ? 0.22 : 1), player.lv);
      if (sil) {
        s.sil--;
        if (s.sil <= 0) { s.sil = 0; player.refreshModel(); this.msg('El silenciador se rompió', 'warn'); }
      }
      g.recoil = 1;
      g.bloom = Math.min(3, g.bloom + BLOOM[w.gun]);
      g.cooldown = w.fire;
      if (CYCLE[w.gun]) g.cycle = { t: 0, dur: CYCLE[w.gun] };
      const crouch = player.crouching ? 0.75 : 1;
      if (G.Camera.kick) G.Camera.kick(KICK[w.gun] * crouch);
      if (G.Camera.shake) G.Camera.shake(SHAKE[w.gun]);
    },

    shootArrow(player, zombies) {
      const w = player.weapon, s = player.slot, g = player.gun;
      const r = this.ray(player);
      const o = r.o.clone(), dir = r.d.clone();
      perturb(dir, this.spreadNow(player), dir);
      const c = this.cast(player, zombies, o, dir, r.tMin, w.range);
      const start = this.muzzlePos(player).clone();
      const draw = g.draw;
      const speed = U.lerp(ARROW_SPEED[0], ARROW_SPEED[1], draw);
      const to = c.point.clone().sub(start);
      const dist = to.length();
      const v = to.normalize().multiplyScalar(speed);
      v.y += 0.5 * ARROW_G * (dist / speed);        // compensa la caída: va a donde apuntas
      if (!scene) return;
      if (!this.arrowMat) this.arrowMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const mesh = new THREE.Mesh(G.Models.weaponGeometry('flecha'), this.arrowMat);
      mesh.position.copy(start);
      scene.add(mesh);
      arrows.push({ mesh, p: start, v, life: 0, lv: player.lv, dmg: U.lerp(w.dmg[0], w.dmg[1], draw), knock: w.knock + 0.2 * draw });
      s.mag = 0;
      this.wearGun(player, w, s);
      g.draw = 0;
      g.recoil = 0.5;
      g.cycle = { t: 0, dur: CYCLE.bow };
      g.cooldown = w.fire;
      G.World.emit(player.pos.x, player.pos.z, w.noise, player.lv);
      if (G.Camera.kick) G.Camera.kick(KICK.bow);
    },

    // Punta del cañón (o del arco) en el mundo
    muzzlePos(player) {
      const g = player.model.gun;
      if (!g) return _p.set(player.pos.x, player.y + 1.4, player.pos.z);
      player.model.root.updateMatrixWorld(true);
      return g.muzzle.getWorldPosition(_p);
    },

    // ---------- Efectos ----------
    muzzleFlash(p, size) {
      if (!light) return;
      light.position.copy(p);
      light.intensity = 3 * size;
      flash.position.copy(p);
      flash.scale.setScalar(0.32 * size);
      flash.material.rotation = Math.random() * Math.PI;
      flash.visible = size > 0.5;
      this.flashT = 0.06;
    },

    tracer(a, b) {
      if (!tracers.length) return;
      const t = tracers.find((x) => x.life <= 0) || tracers[0];
      const p = t.line.geometry.attributes.position;
      // la estela empieza un poco por delante del cañón
      const k = Math.min(1, 0.6 / Math.max(0.6, a.distanceTo(b)));
      p.setXYZ(0, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
      p.setXYZ(1, b.x, b.y, b.z);
      p.needsUpdate = true;
      t.line.visible = true;
      t.line.material.opacity = 0.75;
      t.life = 0.07;
    },

    // Salpicadura de sangre (zombi) o polvo (pared o suelo)
    burst(p, d, blood, n) {
      for (let i = 0; i < n; i++) {
        const q = parts.find((x) => x.life <= 0 && x.blood === blood);
        if (!q) break;
        q.life = 0.35 + Math.random() * 0.25;
        q.m.visible = true;
        q.m.position.copy(p);
        const s = (blood ? 0.022 : 0.016) * (0.7 + Math.random() * 0.8);
        q.m.scale.setScalar(s);
        q.v.set((Math.random() - 0.5) * 2.4, Math.random() * 2.2, (Math.random() - 0.5) * 2.4);
        if (blood) q.v.addScaledVector(d, 2.5); else q.v.addScaledVector(d, -1.5);
      }
    },

    // ---------- Actualización ----------
    update(dt, player, zombies) {
      const g = player.gun, w = player.weapon, s = player.slot;
      const isGun = G.Weapons.isGun(w) && !!s;
      g.recoil = Math.max(0, g.recoil - dt * 9);
      g.bloom = Math.max(0, g.bloom - dt * (player.moveAmt > 0.2 ? 1.2 : 2.2));
      g.cooldown = Math.max(0, (g.cooldown || 0) - dt);
      g.aim += ((isGun && player.aiming && !player.busy() ? 1 : 0) - g.aim) * Math.min(1, dt * 9);
      if (isGun) {
        // corredera, cerrojo o coger otra flecha
        if (g.cycle) {
          g.cycle.t += dt / g.cycle.dur;
          if (g.cycle.t >= 1) g.cycle = null;
        }
        if (g.wantReload && !g.cycle && !player.busy()) this.startReload(player);
        // recarga
        if (g.reload) {
          if (player.dodging || player.action || player.climb) g.reload = null;
          else {
            g.reload.u += dt / g.reload.dur;
            if (g.reload.u >= 1) {
              const have = player.ammo[w.ammo];
              if (g.reload.per) {
                if (have > 0 && s.mag < w.mag) { s.mag++; player.ammo[w.ammo]--; }
                if (s.mag >= w.mag || player.ammo[w.ammo] <= 0) g.reload = null; else g.reload.u = 0;
              } else {
                const n = Math.min(w.mag - s.mag, have);
                s.mag += n; player.ammo[w.ammo] -= n;
                g.reload = null;
              }
            }
          }
        }
        g.rw += ((g.reload ? 1 : 0) - g.rw) * Math.min(1, dt * 7);
        g.ru = g.reload ? g.reload.u : 0;
        // arco: coger flecha y tensar
        if (w.gun === 'bow') {
          if (!s.mag && !g.cycle && player.ammo.flecha > 0) { s.mag = 1; player.ammo.flecha--; }
          if (player.aiming && s.mag && !g.cycle && g.aim > 0.7) g.draw = Math.min(1, g.draw + dt / DRAW_TIME);
          else g.draw = Math.max(0, g.draw - dt * 4);
          g.arrow = s.mag > 0;
        }
      } else {
        g.reload = null; g.cycle = null; g.draw = 0; g.rw = 0; g.wantReload = false;
      }

      this.updateFx(dt, zombies);
    },

    updateFx(dt, zombies) {
      if (!light) return;
      if (this.flashT > 0) {
        this.flashT -= dt;
        if (this.flashT <= 0) { light.intensity = 0; flash.visible = false; }
        else light.intensity *= 0.6;
      }
      for (const t of tracers) {
        if (t.life <= 0) continue;
        t.life -= dt;
        t.line.material.opacity = Math.max(0, t.life / 0.07) * 0.75;
        if (t.life <= 0) t.line.visible = false;
      }
      for (const q of parts) {
        if (q.life <= 0) continue;
        q.life -= dt;
        q.v.y -= 9 * dt;
        q.m.position.addScaledVector(q.v, dt);
        if (q.m.position.y < 0.01) { q.m.position.y = 0.01; q.v.set(0, 0, 0); }
        if (q.life <= 0) q.m.visible = false;
      }
      this.updateArrows(dt, zombies);
    },

    updateArrows(dt, zombies) {
      const W = G.World;
      for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        a.life += dt;
        const p0 = a.p.clone();
        a.v.y -= ARROW_G * dt;
        a.p.addScaledVector(a.v, dt);
        const seg = a.p.clone().sub(p0);
        const L = seg.length();
        const d = seg.divideScalar(L || 1);
        let done = false;
        // zombis
        let bz = null, bh = null;
        for (const z of zombies) {
          if (!z.alive || (z.lv || 0) !== (a.lv || 0)) continue;
          if (Math.abs(z.pos.x - p0.x) > L + 2 || Math.abs(z.pos.z - p0.z) > L + 2) continue;
          const h = hitZombie(z, p0, d);
          if (h && h.t <= L && (!bh || h.t < bh.t)) { bz = z; bh = h; }
        }
        // vidrio de una ventana cerrada: se rompe y la flecha sigue
        W.breakWindowsAlong(p0.x, p0.z, a.p.x, a.p.z, a.lv);
        // pared o suelo
        const f = W.lineHit(p0.x, p0.z, a.p.x, a.p.z, W.blocksSightEdge, a.lv);
        const tWall = f >= 0 ? f * L : Infinity;
        const gy = W.groundY(a.p.x, a.p.z, a.lv);
        const tGround = a.p.y < gy ? L * (p0.y - gy) / Math.max(1e-4, p0.y - a.p.y) : Infinity;
        if (bz && bh.t < tWall && bh.t < tGround) {
          a.p.copy(p0).addScaledVector(d, bh.t);
          const dmg = a.dmg * (bh.part === 'head' ? 3 : (bh.part === 'legs' ? 0.75 : 1));
          const res = bz.takeHit(dmg, a.knock + (bh.part === 'legs' ? 0.3 : 0), d.x, d.z, G.Combat.behind({ pos: { x: p0.x, z: p0.z } }, bz), 1, 'shot');
          if (this.onHit) this.onHit(res, bh.part === 'head');
          this.burst(a.p, d, true, bh.part === 'head' ? 7 : 4);
          // la flecha se queda clavada: se recupera del cadáver (si no se rompe)
          this.orient(a);
          bz.model.body.attach(a.mesh);
          a.mesh.userData.arrow = true;
          if (Math.random() < 0.75) bz.arrowsIn = (bz.arrowsIn || 0) + 1;
          done = true;
        } else if (tWall < Infinity || tGround < Infinity) {
          const t = Math.min(tWall, tGround);
          a.p.copy(p0).addScaledVector(d, Math.max(0, t - 0.05));
          this.burst(a.p, d, false, 2);
          // en el suelo o contra la pared: a veces se rompe; si no, se puede recoger
          if (Math.random() < 0.7) W.dropItem(a.p.x - d.x * 0.3, a.p.z - d.z * 0.3, 'mun_flecha', 1, a.lv);
          scene.remove(a.mesh);
          done = true;
        } else if (a.life > 4) { scene.remove(a.mesh); done = true; }
        if (!done) this.orient(a);
        if (done) arrows.splice(i, 1);
      }
      // flechas clavadas en zombis muertos: se recogen del suelo
      for (const z of zombies) {
        if (z.alive || !z.arrowsIn || z.fall < 1) continue;
        const dir = z.fallDir || -1;
        W.dropItem(z.pos.x + Math.sin(z.facing) * dir * 1.0, z.pos.z + Math.cos(z.facing) * dir * 1.0, 'mun_flecha', z.arrowsIn, z.lv);
        z.arrowsIn = 0;
        for (const c of z.model.body.children.slice()) if (c.userData.arrow) z.model.body.remove(c);
      }
    },

    // la flecha mira hacia donde vuela; la punta queda en a.p (un poco hundida al clavarse)
    orient(a) {
      _w.copy(a.v).normalize();
      a.mesh.position.copy(a.p).addScaledVector(_w, -0.62);
      _q.setFromUnitVectors(_up, _w);
      a.mesh.quaternion.copy(_q);
    }
  };

  Guns.hitZombie = hitZombie;
  Guns.rayCyl = rayCyl;
  Guns.raySphere = raySphere;
  G.Guns = Guns;
})(window.Game = window.Game || {});
