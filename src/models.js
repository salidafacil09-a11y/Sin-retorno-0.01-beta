(function (G) {
  'use strict';

  // Personajes con esqueleto: cuerpo redondeado (esferas y cilindros) unido en
  // una sola malla con huesos, así cada personaje es una sola llamada de dibujo.
  // El modelo mira hacia +Z. Su izquierda es +X.

  const U = G.Util;

  // Huesos: [nombre, padre, posición relativa al padre]. 24 huesos: sin cara; los dedos de cada
  // mano van juntos en un hueso (para cerrar la mano o hacer garras).
  // Columna en tres tramos, clavículas para los hombros y dedos del pie para que ruede al pisar.
  const BONES = [
    ['hips', -1, [0, 0.95, 0]],
    ['spine', 0, [0, 0.12, 0]],                 // lumbar
    ['spine2', 1, [0, 0.13, 0]],                // dorsal
    ['chest', 2, [0, 0.13, 0]],                 // pecho
    ['neck', 3, [0, 0.2, 0]],
    ['head', 4, [0, 0.08, 0]],
    ['clavL', 3, [0.035, 0.09, 0]], ['armL', 6, [0.155, 0.02, 0]], ['foreL', 7, [0, -0.28, 0]], ['handL', 8, [0, -0.25, 0]],
    ['clavR', 3, [-0.035, 0.09, 0]], ['armR', 10, [-0.155, 0.02, 0]], ['foreR', 11, [0, -0.28, 0]], ['handR', 12, [0, -0.25, 0]],
    ['legL', 0, [0.1, -0.06, 0]], ['shinL', 14, [0, -0.42, 0]], ['footL', 15, [0, -0.4, 0]], ['toeL', 16, [0, -0.035, 0.1]],
    ['legR', 0, [-0.1, -0.06, 0]], ['shinR', 18, [0, -0.42, 0]], ['footR', 19, [0, -0.4, 0]], ['toeR', 20, [0, -0.035, 0.1]],
    // dedos (los cuatro juntos, como una manopla): para cerrar la mano sobre el arma o hacer garras
    ['fingL', 9, [0, -0.06, 0]], ['fingR', 13, [0, -0.06, 0]]
  ];
  const BI = {};
  BONES.forEach((b, i) => { BI[b[0]] = i; });

  // Posición de cada hueso en reposo (en el espacio del modelo)
  const REST = [];
  BONES.forEach((b, i) => {
    const p = b[2];
    REST[i] = b[1] < 0 ? p.slice() : [REST[b[1]][0] + p[0], REST[b[1]][1] + p[1], REST[b[1]][2] + p[2]];
  });

  // Articulaciones: donde la piel se reparte entre el hueso padre (a) y el hijo (b).
  // axis va del padre hacia el hijo; r es el ancho de la zona de mezcla; lim, lo lejos del eje que afecta.
  const JOINTS = [];
  (function () {
    const J = (a, b, p, axis, r, lim) => {
      const l = Math.hypot(axis[0], axis[1], axis[2]);
      JOINTS.push({ a: BI[a], b: BI[b], p, ax: [axis[0] / l, axis[1] / l, axis[2] / l], r, lim });
    };
    const R = (n) => REST[BI[n]];
    J('hips', 'spine', [0, 1.0, 0], [0, 1, 0], 0.06, 0.3);
    J('spine', 'spine2', [0, 1.14, 0], [0, 1, 0], 0.06, 0.3);
    J('spine2', 'chest', [0, 1.26, 0], [0, 1, 0], 0.06, 0.3);
    J('chest', 'neck', [0, 1.49, 0], [0, 1, 0], 0.035, 0.09);
    J('neck', 'head', [0, 1.575, 0], [0, 1, 0], 0.03, 0.12);
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1;
      J('chest', 'clav' + s, [0.11 * sg, 1.43, 0], [sg, 0, 0], 0.06, 0.1);
      J('clav' + s, 'arm' + s, R('arm' + s), [0, -1, 0], 0.06, 0.1);
      J('arm' + s, 'fore' + s, R('fore' + s), [0, -1, 0], 0.05, 0.1);
      J('fore' + s, 'hand' + s, R('hand' + s), [0, -1, 0], 0.03, 0.08);
      J('hand' + s, 'fing' + s, R('fing' + s), [0, -1, 0], 0.018, 0.06);
      J('hips', 'leg' + s, R('leg' + s), [0, -1, 0], 0.07, 0.085);
      J('leg' + s, 'shin' + s, R('shin' + s), [0, -1, 0], 0.05, 0.12);
      J('shin' + s, 'foot' + s, R('foot' + s), [0, -1, 0], 0.03, 0.1);
      J('foot' + s, 'toe' + s, R('toe' + s), [0, -0.33, 0.94], 0.035, 0.1);
    }
  })();

  // Reparte un vértice entre dos huesos según su distancia a la articulación más cercana
  function skinWeight(x, y, z, bone) {
    let best = null, bestT = Infinity;
    for (const j of JOINTS) {
      if (j.a !== bone && j.b !== bone) continue;
      const dx = x - j.p[0], dy = y - j.p[1], dz = z - j.p[2];
      const t = dx * j.ax[0] + dy * j.ax[1] + dz * j.ax[2];
      if (Math.abs(t) > j.r * 1.0001) continue;
      const lx = dx - t * j.ax[0], ly = dy - t * j.ax[1], lz = dz - t * j.ax[2];
      if (Math.hypot(lx, ly, lz) > j.lim) continue;
      if (Math.abs(t) < bestT) { bestT = Math.abs(t); best = { j, t }; }
    }
    if (!best) return null;
    const { j, t } = best;
    const wb = U.smooth((t + j.r) / (2 * j.r));
    return [j.a, 1 - wb, j.b, wb];
  }

  let matPlayer = null, matZombie = null, matWeapon = null;
  function mats() {
    if (!matPlayer) {
      matPlayer = new THREE.MeshLambertMaterial({ vertexColors: true, skinning: true });
      matZombie = new THREE.MeshLambertMaterial({ vertexColors: true, skinning: true });
      matWeapon = new THREE.MeshLambertMaterial({ vertexColors: true });
    }
  }

  // ---------- Protagonista: cuerpo de superficies continuas ----------
  // Torso, cuello, brazos, mangas y piernas son superficies de una sola pieza hechas con secciones
  // (como los anillos de un tubo que cambia de forma), con normales suaves y pesos repartidos a lo
  // largo de la columna y de cada miembro. Así no quedan círculos ni cortes de piezas superpuestas.
  // Ropa: remera blanca gastada de manga corta, venda en el antebrazo izquierdo y en el codo derecho.

  // ruido suave en 3D (suciedad y desgaste de la ropa)
  function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), ux), l(c(0, 1, 0), c(1, 1, 0), ux), uy),
      l(l(c(0, 0, 1), c(1, 0, 1), ux), l(c(0, 1, 1), c(1, 1, 1), ux), uy), uz);
  }
  function fbm(x, y, z) {
    return vnoise(x, y, z) * 0.57 + vnoise(x * 2.07 + 5.1, y * 2.07, z * 2.07) * 0.29 + vnoise(x * 4.3, y * 4.3 + 2.3, z * 4.3) * 0.14;
  }

  // colores en espacio lineal (como los guarda el Mesher)
  const LC = (hex) => { const c = G.Mesher.lin(hex); return [c.r, c.g, c.b]; };
  const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mulC = (a, f) => [a[0] * f, a[1] * f, a[2] * f];
  const sat = (v) => v < 0 ? 0 : (v > 1 ? 1 : v);

  // interpolación suave de una tabla [v, ...valores] ordenada por v (spline cúbica de Hermite)
  function curve(T, v) {
    const n = T.length;
    if (v <= T[0][0]) return T[0].slice(1);
    if (v >= T[n - 1][0]) return T[n - 1].slice(1);
    let i = 0;
    while (v > T[i + 1][0]) i++;
    const a = T[Math.max(0, i - 1)], b = T[i], c = T[i + 1], d = T[Math.min(n - 1, i + 2)];
    const h = c[0] - b[0], t = (v - b[0]) / h, t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    const out = [];
    for (let k = 1; k < b.length; k++) {
      // tangentes de Catmull-Rom no uniformes, limitadas para no pasarse de los valores vecinos
      let m0 = (c[k] - a[k]) / Math.max(1e-6, c[0] - a[0]);
      let m1 = (d[k] - b[k]) / Math.max(1e-6, d[0] - b[0]);
      const sl = (c[k] - b[k]) / h;
      if (sl * m0 <= 0) m0 = 0; else m0 = Math.sign(m0) * Math.min(Math.abs(m0), 3 * Math.abs(sl));
      if (sl * m1 <= 0) m1 = 0; else m1 = Math.sign(m1) * Math.min(Math.abs(m1), 3 * Math.abs(sl));
      out.push(h00 * b[k] + h10 * h * m0 + h01 * c[k] + h11 * h * m1);
    }
    return out;
  }

  // Pesos a lo largo de una cadena de huesos. J: [[posición, huesoPadre, huesoHijo, ancho], ...]
  // ordenado por v creciente (de padre a hijo).
  function chainW(v, J) {
    for (const j of J) {
      if (v < j[0] - j[3]) return [[j[1], 1]];
      if (v <= j[0] + j[3]) {
        const t = U.smooth((v - j[0] + j[3]) / (2 * j[3]));
        return [[j[1], 1 - t], [j[2], t]];
      }
    }
    return [[J[J.length - 1][2], 1]];
  }
  function packW(list) {
    const acc = new Map();
    for (const [b, w] of list) if (w > 1e-4) acc.set(b, (acc.get(b) || 0) + w);
    const e = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const s = e.reduce((t, x) => t + x[1], 0) || 1;
    const out = [];
    for (const [b, w] of e) out.push(b, w / s);
    while (out.length < 8) out.push(0, 0);
    return out;
  }

  // Superficie de anillos: rings[j][i] = { p: [x, y, z], c: [r, g, b], w: pesos }.
  // Los anillos son cerrados; capA y capB (opcionales) cierran los extremos con un polo.
  function surface(m, rings, capA, capB) {
    const M = rings.length, N = rings[0].length;
    const P = (i, j) => rings[Math.max(0, Math.min(M - 1, j))][((i % N) + N) % N].p;
    // orientación: que las normales miren hacia afuera del anillo del medio
    const jm = M >> 1;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < N; i++) { const p = P(i, jm); cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= N; cy /= N; cz /= N;
    const nAt = (i, j) => {
      const a = P(i + 1, j), b = P(i - 1, j);
      const jn = j + 1 < M ? j + 1 : j, jp = j - 1 >= 0 ? j - 1 : j;
      let c = P(i, jn), d = P(i, jp);
      // en anillos de los extremos la diferencia se hace con el vecino (y el polo si lo hay)
      if (j === 0 && capA) d = capA.p;
      if (j === M - 1 && capB) c = capB.p;
      const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2];
      const vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
      return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    };
    let flip = false;
    { const n = nAt(0, jm), p = P(0, jm); flip = (n[0] * (p[0] - cx) + n[1] * (p[1] - cy) + n[2] * (p[2] - cz)) < 0; }
    const NR = [];
    for (let j = 0; j < M; j++) {
      const row = [];
      for (let i = 0; i < N; i++) {
        const n = nAt(i, j);
        const l = Math.hypot(n[0], n[1], n[2]) || 1;
        const f = flip ? -1 / l : 1 / l;
        row.push([n[0] * f, n[1] * f, n[2] * f]);
      }
      NR.push(row);
    }
    const V = (i, j) => { const r = rings[j][i % N]; m.vert(r.p, NR[j][i % N], r.c, r.w); };
    const T = (a, b, c) => { if (flip) { V(a[0], a[1]); V(c[0], c[1]); V(b[0], b[1]); } else { V(a[0], a[1]); V(b[0], b[1]); V(c[0], c[1]); } };
    for (let j = 0; j < M - 1; j++) {
      for (let i = 0; i < N; i++) {
        T([i, j], [i + 1, j], [i + 1, j + 1]);
        T([i, j], [i + 1, j + 1], [i, j + 1]);
      }
    }
    const cap = (cp, j, start) => {
      const ring = rings[j];
      let rx = 0, ry = 0, rz = 0;
      for (const r of ring) { rx += r.p[0]; ry += r.p[1]; rz += r.p[2]; }
      rx /= N; ry /= N; rz /= N;
      let nx = cp.p[0] - rx, ny = cp.p[1] - ry, nz = cp.p[2] - rz;
      const l = Math.hypot(nx, ny, nz) || 1;
      const pn = [nx / l, ny / l, nz / l];
      const pole = () => m.vert(cp.p, pn, cp.c, cp.w);
      for (let i = 0; i < N; i++) {
        const k = (i + 1) % N;
        const a = ring[i], b = ring[k];
        // mismo sentido que la tira de triángulos
        const ord = start !== flip;
        pole();
        if (ord) { m.vert(b.p, NR[j][k], b.c, b.w); m.vert(a.p, NR[j][i], a.c, a.w); }
        else { m.vert(a.p, NR[j][i], a.c, a.w); m.vert(b.p, NR[j][k], b.c, b.w); }
      }
    };
    if (capA) cap(capA, 0, true);
    if (capB) cap(capB, M - 1, false);
  }

  // [y, ancho, fondo delante, fondo detrás, desplazamiento z, forma (2 = elipse, más = más cuadrada)]
  const HERO_TT = [
    [0.955, 0.181, 0.12, 0.126, -0.003, 2.4],
    [1.0, 0.173, 0.116, 0.118, -0.002, 2.4],
    [1.06, 0.163, 0.111, 0.108, 0, 2.4],
    [1.12, 0.161, 0.113, 0.104, 0, 2.5],
    [1.18, 0.166, 0.119, 0.106, 0, 2.6],
    [1.24, 0.172, 0.126, 0.11, 0.002, 2.7],
    [1.3, 0.177, 0.129, 0.114, 0.003, 2.8],
    [1.35, 0.183, 0.123, 0.114, 0, 2.8],
    [1.395, 0.188, 0.108, 0.108, -0.006, 2.9],
    [1.425, 0.176, 0.09, 0.092, -0.01, 2.7],
    [1.45, 0.138, 0.075, 0.08, -0.01, 2.4],
    [1.47, 0.1, 0.068, 0.074, -0.009, 2.2],
    [1.485, 0.08, 0.066, 0.072, -0.008, 2.1]
  ];

  // Contorno del torso del protagonista en el plano vertical x (para que las correas de la mochila
  // se apoyen en la remera). Devuelve el frente y la espalda (z) a la altura y, o null si x queda fuera.
  function heroTorsoZ(x, y) {
    const [w, df, db, zc, n] = curve(HERO_TT, y);
    const a = Math.abs(x) / w;
    if (a >= 1) return null;
    const k = Math.pow(1 - Math.pow(a, n), 1 / n);
    return { zf: zc + df * k, zb: zc - db * k };
  }

  function heroBody(m, o, q) {
    const N_T = q ? 36 : 14, N_L = q ? 20 : 9, N_A = q ? 18 : 8;
    const STEP = q ? 1 : 2.4;                     // densidad de anillos
    const B = BI;
    const SKIN = LC(o.skin), PANTS = LC(o.pants);
    const TEE = LC(o.shirt), TEE2 = LC(U.shade(o.shirt, 0.86)), GRIME = LC(0x8f826a), YEL = LC(0xc4b791);
    const BLOOD = LC(0x5e231b), BAND = LC(0xe6e0d2), BAND_D = LC(0xa99d84);
    const MUD = LC(0x3e352b);

    // ---- cadenas de pesos
    const TJ = [[1.0, B.hips, B.spine, 0.065], [1.14, B.spine, B.spine2, 0.065], [1.26, B.spine2, B.chest, 0.065], [1.515, B.chest, B.neck, 0.03]];
    const NJ = [[1.49, B.chest, B.neck, 0.035], [1.575, B.neck, B.head, 0.03]];
    const torsoW = (x, y) => {
      const base = chainW(y, TJ);
      // hombros y laterales altos del pecho se van con las clavículas (al levantar los brazos)
      const ax = Math.abs(x);
      const k = U.smooth(sat((ax - 0.085) / 0.085)) * U.smooth(sat((y - 1.32) / 0.09)) * 0.8;
      if (k <= 0) return packW(base);
      const cl = x > 0 ? B.clavL : B.clavR;
      return packW(base.map(([b, w]) => [b, w * (1 - k)]).concat([[cl, k]]));
    };
    const armJ = (A) => [[-1.462, B['clav' + A], B['arm' + A], 0.04], [-1.16, B['arm' + A], B['fore' + A], 0.05], [-0.91, B['fore' + A], B['hand' + A], 0.03]];
    const legJ = (A) => [[-0.89, B.hips, B['leg' + A], 0.07], [-0.47, B['leg' + A], B['shin' + A], 0.05], [-0.07, B['shin' + A], B['foot' + A], 0.03]];

    // sección superelíptica: frente +Z
    const sect = (th, w, df, db, zc, n) => {
      const c = Math.cos(th), s = Math.sin(th), e = 2 / n;
      const x = w * Math.sign(c) * Math.pow(Math.abs(c), e);
      const z = zc + (s > 0 ? df : db) * Math.sign(s) * Math.pow(Math.abs(s), e);
      return [x, z];
    };
    const range = (y0, y1, dy) => {
      const n = Math.max(2, Math.round((y1 - y0) / (dy * STEP)));
      const out = [];
      for (let k = 0; k <= n; k++) out.push(y0 + (y1 - y0) * k / n);
      return out;
    };

    // ===== remera (torso de una pieza) =====
    const TT = HERO_TT;
    const rag = (i, N, seed) => (vnoise(i * 0.85, seed * 1.7, 0.5) - 0.5) * 1.6 + (hash3(i, seed, 7) - 0.5) * 0.4;   // dobladillo irregular
    const teeCol = (x, y, z, edge) => {
      const ax = Math.abs(x);
      let c = mixC(TEE, TEE2, sat(fbm(x * 9 + 1.3, y * 9, z * 9) * 1.4 - 0.25));
      // mugre: más abajo, en los costados y por manchas
      const low = U.smooth(sat((1.13 - y) / 0.17));
      const n2 = fbm(x * 15 + 3.1, y * 13, z * 15 + 7.7);
      let g = low * 0.32 + sat((n2 - 0.52) * 1.9) * 0.55 + sat((ax - 0.15) / 0.05) * 0.12;
      if (edge) g += 0.22;
      c = mixC(c, GRIME, sat(g) * 0.78);
      // axilas y bajo el pecho: sombra suave
      if (ax > 0.12 && y > 1.2 && y < 1.4) c = mulC(c, 1 - 0.16 * U.smooth(sat((ax - 0.12) / 0.06)) * U.smooth(sat(1 - Math.abs(y - 1.31) / 0.09)));
      // cuello amarillento
      if (y > 1.45) c = mixC(c, YEL, 0.45 * sat((y - 1.45) / 0.04));
      // sangre seca: mancha en el costado bajo izquierdo (delante) y salpicaduras
      const bd = Math.hypot((x - 0.1) / 0.06, (y - 1.05) / 0.08);
      if (z > 0.02 && bd < 1.4) c = mixC(c, BLOOD, sat((1.4 - bd) * 0.9) * (0.45 + 0.55 * fbm(x * 30, y * 30, z * 30)) * 0.85);
      const sp = fbm(x * 40 + 9, y * 40, z * 40 + 2);
      if (z > 0.05 && y > 1.15 && y < 1.33 && x < 0 && sp > 0.66) c = mixC(c, BLOOD, (sp - 0.66) * 2.2);
      return c;
    };
    {
      const N = N_T, rings = [];
      const ringT = (y, opts) => {
        const r = [];
        const [w, df, db, zc, n] = curve(TT, y);
        const sc = (opts && opts.sc) || 1;
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2;
          let yy = y + (opts && opts.rag ? rag(i, N, 11) * opts.rag : 0);
          // pliegues de la tela floja en la cintura
          const fold = 1 + 0.011 * Math.sin(th * 7 + y * 31) * U.smooth(sat((1.16 - y) / 0.16)) +
            0.006 * Math.sin(th * 3 - y * 17) * U.smooth(sat((1.3 - y) / 0.2));
          const [x, z] = sect(th, w * sc * fold, df * sc * fold, db * sc * fold, zc, n);
          r.push({ p: [x, yy, z], c: opts && opts.col ? opts.col(x, yy, z) : teeCol(x, yy, z, opts && opts.edge), w: torsoW(x, yy) });
        }
        return r;
      };
      // labio interior del dobladillo (se apoya en la cadera) y borde gastado
      rings.push(ringT(0.962, { sc: 0.88, edge: true }));
      rings.push(ringT(0.951, { rag: 0.009, edge: true, sc: 1.004 }));
      for (const y of range(0.962, 1.485, 0.02)) rings.push(ringT(y));
      // cuello redondo de la remera (con ribete) y labio que se cierra sobre el cuello
      const collar = (y, w, d, col) => {
        const r = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2;
          const [x, z] = sect(th, w, d, d + 0.004, -0.006, 2.05);
          r.push({ p: [x, y, z], c: col(x, y, z), w: torsoW(x, y) });
        }
        return r;
      };
      const rib = (x, y, z) => mixC(mulC(TEE, 0.93), YEL, 0.55);
      rings.push(collar(1.494, 0.073, 0.067, rib));
      rings.push(collar(1.501, 0.066, 0.061, rib));
      rings.push(collar(1.498, 0.056, 0.051, (x, y, z) => mulC(YEL, 0.6)));
      rings.push(collar(1.49, 0.049, 0.046, (x, y, z) => mulC(SKIN, 0.55)));
      surface(m, rings, null, null);
    }

    // ===== cadera (pantalón) =====
    const pantsCol = (x, y, z) => {
      let c = mulC(PANTS, 0.9 + 0.2 * fbm(x * 11 + 4, y * 11, z * 11));
      // desgaste más claro delante de los muslos y en las rodillas
      const ax = Math.abs(x);
      const fade = (z > 0 ? 1 : 0.3) * (U.smooth(sat(1 - Math.abs(y - 0.72) / 0.14)) * 0.18 + U.smooth(sat(1 - Math.abs(y - 0.48) / 0.06)) * 0.22);
      c = mixC(c, mulC(PANTS, 1.45), fade * (0.6 + 0.4 * fbm(x * 20, y * 20, z * 20)));
      // barro cerca de las botas y detrás de las rodillas un poco más oscuro
      c = mixC(c, MUD, U.smooth(sat((0.32 - y) / 0.16)) * 0.55 * fbm(x * 18 + 2, y * 18, z * 18 + 5) * 1.5);
      if (z < 0 && Math.abs(y - 0.48) < 0.05) c = mulC(c, 0.85);
      if (ax < 0.04 && y > 0.82 && y < 0.95) c = mulC(c, 0.8);       // entrepierna
      return c;
    };
    {
      const PT = [
        [0.85, 0.11, 0.07, 0.085, 0, 2.2],
        [0.88, 0.152, 0.088, 0.106, -0.004, 2.4],
        [0.925, 0.171, 0.094, 0.116, -0.006, 2.5],
        [0.97, 0.17, 0.098, 0.112, -0.003, 2.5],
        [1.02, 0.158, 0.098, 0.105, 0, 2.4],
        [1.05, 0.15, 0.096, 0.099, 0, 2.3]
      ];
      const N = N_T, rings = [];
      for (const y of range(0.85, 1.05, 0.025)) {
        const [w, df, db, zc, n] = curve(PT, y);
        const r = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2;
          const [x, z] = sect(th, w, df, db, zc, n);
          r.push({ p: [x, y, z], c: pantsCol(x, y, z), w: packW(chainW(y, TJ)) });
        }
        rings.push(r);
      }
      surface(m, rings, { p: [0, 0.835, -0.004], c: mulC(PANTS, 0.7), w: packW([[B.hips, 1]]) },
        { p: [0, 1.06, 0], c: PANTS, w: packW(chainW(1.06, TJ)) });
    }

    // ===== cuello =====
    {
      const NT = [[1.43, 0.056, -0.006], [1.47, 0.054, -0.004], [1.52, 0.05, 0.0], [1.57, 0.047, 0.006], [1.62, 0.044, 0.01]];
      const N = N_L, rings = [];
      for (const y of range(1.43, 1.62, 0.025)) {
        const [r0, zc] = curve(NT, y);
        const r = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2;
          const x = Math.cos(th) * r0 * 1.04, z = zc + Math.sin(th) * r0;
          let c = mulC(SKIN, 0.97 + 0.06 * fbm(x * 20, y * 20, z * 20));
          if (y > 1.55 && z > 0) c = mulC(c, 1 - 0.18 * sat((y - 1.55) / 0.05));   // sombra de la mandíbula
          r.push({ p: [x, y, z], c, w: packW(chainW(y, NJ)) });
        }
        rings.push(r);
      }
      surface(m, rings, null, null);
    }

    // ===== brazos (piel), mangas y vendas =====
    // [y, ancho, fondo, desplazamiento z]
    const AT = [
      [0.905, 0.027, 0.031, 0.004],
      [0.925, 0.029, 0.033, 0.003],
      [0.97, 0.034, 0.038, 0.001],
      [1.03, 0.04, 0.044, -0.001],
      [1.08, 0.044, 0.046, -0.002],
      [1.13, 0.042, 0.043, -0.004],
      [1.165, 0.04, 0.041, -0.006],
      [1.21, 0.042, 0.043, 0.0],
      [1.27, 0.046, 0.048, 0.005],
      [1.33, 0.049, 0.051, 0.006],
      [1.36, 0.05, 0.051, 0.002],
      [1.39, 0.046, 0.047, 0.0],
      [1.415, 0.038, 0.039, 0.0],
      [1.432, 0.026, 0.027, 0.0]
    ];
    const armRing = (sg, A, y, extra, colFn, N) => {
      const [rx, rz, zc] = curve(AT, y);
      const ax = 0.19 * sg;
      const r = [];
      for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2;
        const ex = typeof extra === 'function' ? extra(i, th) : (extra || 0);
        const x = ax + Math.cos(th) * (rx + ex), z = zc + Math.sin(th) * (rz + ex);
        r.push({ p: [x, y, z], c: colFn(x, y, z, i, th), w: packW(chainW(-y, armJ(A))) });
      }
      return r;
    };
    for (const sg of [1, -1]) {
      const A = sg > 0 ? 'L' : 'R';
      const J = armJ(A);
      // ---- piel del brazo (de la axila a la muñeca, una sola pieza)
      const skinCol = (x, y, z) => {
        let c = mulC(SKIN, 0.94 + 0.1 * fbm(x * 16 + sg * 3, y * 16, z * 16));
        // codo y nudillos de la muñeca algo más oscuros; tierra en los antebrazos
        if (z < 0) c = mulC(c, 1 - 0.12 * U.smooth(sat(1 - Math.abs(y - 1.165) / 0.035)));
        const d = fbm(x * 22 + 8, y * 22, z * 22 + 1);
        if (y < 1.12 && y > 0.94) c = mixC(c, mulC(MUD, 1.5), sat((d - 0.6) * 1.6) * 0.5);
        // hacia la muñeca vuelve al tono de la mano (que es de un solo color)
        return mixC(c, SKIN, U.smooth(sat((0.95 - y) / 0.03)));
      };
      {
        const rings = [];
        for (const y of range(0.905, 1.432, 0.025)) rings.push(armRing(sg, A, y, 0, skinCol, N_A));
        surface(m, rings,
          { p: [0.19 * sg, 0.893, 0.004], c: SKIN, w: packW(chainW(-0.893, J)) },
          { p: [0.19 * sg, 1.439, 0], c: mulC(SKIN, 0.9), w: packW(chainW(-1.439, J)) });
      }
      // ---- manga corta: de la costura del hombro hasta la mitad del brazo, abierta y floja
      {
        // [y, ancho, fondo, z, corrimiento hacia el cuello]
        const ST = [
          [1.27, 0.0555, 0.057, 0.004, 0],
          [1.32, 0.056, 0.0575, 0.004, 0],
          [1.37, 0.0565, 0.058, 0.002, 0.002],
          [1.405, 0.055, 0.056, 0.0, 0.006],
          [1.428, 0.05, 0.052, -0.002, 0.012],
          [1.445, 0.041, 0.044, -0.004, 0.019],
          [1.456, 0.026, 0.03, -0.006, 0.025]
        ];
        const cx = 0.19 * sg;
        const N = N_L, rings = [];
        const sRing = (y, sc, edge, ragA) => {
          const [rx, rz, zc, sh] = curve(ST, y);
          const r = [];
          for (let i = 0; i < N; i++) {
            const th = (i / N) * Math.PI * 2;
            const yy = y + (ragA ? rag(i, N, sg > 0 ? 21 : 33) * ragA : 0);
            // la manga se separa un poco más del brazo por fuera que por dentro (cae floja)
            const out = Math.cos(th) * sg > 0 ? 1.02 : 0.96;
            const x = cx - sh * sg + Math.cos(th) * rx * sc * out, z = zc + Math.sin(th) * rz * sc;
            let c = teeCol(x, yy + 0.02, z, edge);
            if (Math.cos(th) * sg < -0.3) c = mulC(c, 0.88);         // cara interior, en sombra
            r.push({ p: [x, yy, z], c, w: packW(chainW(-yy, J)) });
          }
          return r;
        };
        rings.push(sRing(1.272, 0.76, true));                         // labio interior (toca el brazo)
        rings.push(sRing(1.264, 1.0, true, 0.007));                   // borde gastado
        for (const y of range(1.275, 1.456, 0.016)) rings.push(sRing(y, 1.0, false));
        surface(m, rings, null, { p: [0.162 * sg, 1.462, -0.006], c: teeCol(0.188 * sg, 1.476, 0, false), w: packW(chainW(-1.476, J)) });
      }
      // ---- vendas: izquierda en el antebrazo, derecha alrededor del codo
      {
        const y0 = sg > 0 ? 0.955 : 1.1, y1 = sg > 0 ? 1.088 : 1.228;
        const pitch = 0.026;                       // separación entre vueltas
        const seed = sg > 0 ? 3 : 5;
        const bandAt = (i, y) => {
          const u = i / N_A;
          const f = ((y - y0) / pitch + u) % 1;
          return Math.min(f, 1 - f);               // 0 en el borde de cada vuelta, 0.5 al centro
        };
        const thick = (y) => 0.0018 + 0.0062 * U.smooth(sat(Math.min(y - y0, y1 - y) / 0.012));
        const bloodC = sg > 0 ? [0.205, 1.035, -0.035] : [0.175 * sg, 1.17, -0.04];   // donde mancha la herida
        const rings = [];
        for (const y of range(y0, y1, 0.0075)) {
          rings.push(armRing(sg, A, y,
            (i) => thick(y) * (0.75 + 0.25 * U.smooth(sat(bandAt(i, y) * 5))) + (hash3(i, Math.round(y * 400), seed) - 0.5) * 0.0012,
            (x, yy, z, i) => {
              let c = mulC(BAND, 0.8 + 0.2 * U.smooth(sat(bandAt(i, yy) * 5)));
              c = mixC(c, BAND_D, sat((fbm(x * 30 + seed, yy * 30, z * 30) - 0.45) * 1.5) * 0.7);
              const bd = Math.hypot((x - bloodC[0] * (sg > 0 ? 1 : 1)) / 0.03, (yy - bloodC[1]) / 0.03, (z - bloodC[2]) / 0.04);
              if (bd < 1.5) c = mixC(c, BLOOD, sat(1.5 - bd) * 0.75 * (0.5 + 0.5 * fbm(x * 60, yy * 60, z * 60)));
              return c;
            }, N_A));
        }
        surface(m, rings, null, null);
        // punta de la venda remetida
        const ty = sg > 0 ? 1.07 : 1.205;
        m.box(0.19 * sg + 0.036 * sg, ty, 0.024, 0.006, 0.026, 0.02, 0xd6cfbf, 0.4 * sg, B['fore' + A], 0, 0.25 * sg);
      }
    }

    // ===== piernas (pantalón de una pieza, de la cadera al tobillo) =====
    const LT = [
      [0.125, 0.047, 0.05, 0.0],
      [0.2, 0.051, 0.054, 0.0],
      [0.28, 0.057, 0.061, -0.006],
      [0.35, 0.061, 0.066, -0.01],
      [0.42, 0.06, 0.062, -0.004],
      [0.48, 0.061, 0.063, 0.006],
      [0.55, 0.064, 0.066, 0.004],
      [0.64, 0.072, 0.074, 0.004],
      [0.75, 0.081, 0.082, 0.006],
      [0.85, 0.087, 0.09, 0.006],
      [0.93, 0.084, 0.09, 0.002],
      [0.99, 0.068, 0.076, 0.0]
    ];
    for (const sg of [1, -1]) {
      const A = sg > 0 ? 'L' : 'R';
      const J = legJ(A);
      const N = N_L, rings = [];
      for (const y of range(0.125, 0.99, 0.034)) {
        const [rx, rz, zc] = curve(LT, y);
        const r = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2;
          // pliegues en la corva y sobre la bota
          const wr = 1 + 0.03 * Math.sin(th * 5 + y * 40) * U.smooth(sat(1 - Math.abs(y - 0.24) / 0.06));
          const x = 0.1 * sg + Math.cos(th) * rx * wr, z = zc + Math.sin(th) * rz * wr;
          r.push({ p: [x, y, z], c: pantsCol(x, y, z), w: packW(chainW(-y, J)) });
        }
        rings.push(r);
      }
      surface(m, rings,
        { p: [0.1 * sg, 0.11, 0], c: PANTS, w: packW(chainW(-0.11, J)) },
        { p: [0.1 * sg, 1.0, 0], c: PANTS, w: packW(chainW(-1.0, J)) });
    }

    // correa de la pistolera alrededor del muslo derecho (anillo ceñido)
    {
      const J = legJ('R'), N = N_L, rings = [];
      for (const y of range(0.735, 0.765, 0.01)) {
        const [rx, rz, zc] = curve(LT, y);
        const e = 0.004 * U.smooth(sat(Math.min(y - 0.735, 0.765 - y) / 0.006)) + 0.001;
        const r = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2;
          const x = -0.1 + Math.cos(th) * (rx + e), z = zc + Math.sin(th) * (rz + e);
          r.push({ p: [x, y, z], c: LC(0x2a2420), w: packW(chainW(-y, J)) });
        }
        rings.push(r);
      }
      surface(m, rings, null, null);
    }
  }

  // ---------- Geometría del cuerpo ----------
  // o.lod: 1 = detallado (cerca), 0 = ligero (lejos), -1 = mínimo (muy lejos). o.outlineOnly: solo la silueta.
  function bodyGeometry(o) {
    const m = new G.Mesher(true);
    const far = o.lod === -1;
    const hi = o.lod !== 0 && !far && !o.outlineOnly;
    const D = hi ? (o.hero ? 3 : 2) : (far ? 0 : 1);     // detalle de las esferas
    const hero = hi && !!o.hero;          // el protagonista: más polígonos en silueta, articulaciones y ropa
    const C = hero ? 28 : (hi ? 16 : (far ? 6 : 9));    // lados de los cilindros
    const skin = o.skin, shirt = o.shirt, pants = o.pants, shoes = o.shoes || 0x2a2622;
    const sleeve = o.longSleeves ? shirt : skin;
    const detail = !o.outlineOnly && !far;
    const dark = (c, f) => U.shade(c, f);

    // ---- protagonista: torso, cuello, brazos y piernas de una pieza
    const cont = !!o.hero && !o.outlineOnly;
    if (cont) heroBody(m, o, hi ? 1 : 0);
    if (!cont) {
    // ---- pelvis y torso (tres tramos de columna)
    m.sphere(0, 0.93, 0, 0.165, 0.11, 0.115, pants, hero ? 4 : D, BI.hips);
    m.cyl(0, 1.03, 0, 0.152, 0.15, 0.14, shirt, C, BI.spine);
    m.cyl(0, 1.155, 0, 0.15, 0.162, 0.13, shirt, C, BI.spine2);
    m.cyl(0, 1.27, 0, 0.162, 0.185, 0.14, shirt, C, BI.chest);
    m.sphere(0, 1.35, 0, 0.19, 0.15, 0.115, shirt, hero ? 4 : D, BI.chest);
    if (hi) {
      // pecho, omóplatos y abdomen
      m.sphere(0.075, 1.33, 0.07, 0.085, 0.07, 0.06, shirt, 1, BI.chest);
      m.sphere(-0.075, 1.33, 0.07, 0.085, 0.07, 0.06, shirt, 1, BI.chest);
      m.sphere(0.08, 1.33, -0.07, 0.08, 0.09, 0.05, shirt, 1, BI.chest);
      m.sphere(-0.08, 1.33, -0.07, 0.08, 0.09, 0.05, shirt, 1, BI.chest);
      m.sphere(0, 1.1, 0.045, 0.12, 0.1, 0.11, shirt, 1, BI.spine2);
    }
    // trapecios: dan forma a los hombros (se mueven con las clavículas)
    for (const sg of [1, -1]) {
      m.sphere(0.1 * sg, 1.445, -0.01, 0.085, 0.045, 0.07, shirt, D, BI[sg > 0 ? 'clavL' : 'clavR']);
    }
    // cinturón
    if (detail && o.belt) m.cyl(0, 0.985, 0, 0.158, 0.158, 0.04, o.belt, C, BI.hips);
    // cuello de la camisa o chaqueta
    if (detail && o.collar) m.cyl(0, 1.475, -0.005, 0.07, 0.062, 0.05, o.collar, C, BI.chest);

    // ---- cuello y cabeza
    m.cyl(0, 1.52, 0, 0.05, 0.045, 0.1, skin, C, BI.neck);
    }
    m.sphere(0, 1.665, 0.005, 0.1, 0.122, 0.112, skin, hi ? 3 : (far ? 1 : 2), BI.head);
    if (detail) {
      m.sphere(0, 1.605, 0.02, 0.07, 0.045, 0.07, o.beard != null ? o.beard : skin, hero ? 2 : D, BI.head);   // mandíbula
      m.sphere(0, 1.66, 0.108, 0.012, 0.018, 0.012, dark(skin, 0.92), 1, BI.head);            // nariz
      if (hi) {
        m.sphere(0.098, 1.665, 0, 0.014, 0.024, 0.012, dark(skin, 0.95), 1, BI.head);         // orejas
        m.sphere(-0.098, 1.665, 0, 0.014, 0.024, 0.012, dark(skin, 0.95), 1, BI.head);
        m.sphere(0, 1.705, 0.095, 0.06, 0.012, 0.02, dark(skin, 0.9), 1, BI.head);             // ceja
      }
      const eye = o.zombie ? 0xd8d4b8 : 0x1a1612;
      if (!o.facePlate) {
        m.sphere(0.038, 1.69, 0.098, 0.016, 0.012, 0.01, eye, 1, BI.head);
        m.sphere(-0.038, 1.69, 0.098, 0.016, 0.012, 0.01, eye, 1, BI.head);
      } else {
        m.sphere(-0.038, 1.69, 0.098, 0.016, 0.012, 0.01, eye, 1, BI.head);
      }
      if (o.zombie) m.sphere(0, 1.615, 0.1, 0.03, 0.012, 0.012, 0x3a1612, 1, BI.head);   // boca
    }
    if (o.hair != null) {
      m.sphere(0, 1.71, -0.012, 0.108, 0.1, 0.118, o.hair, D, BI.head);
      if (o.longHair && detail) m.sphere(0, 1.6, -0.07, 0.1, 0.12, 0.06, o.hair, 1, BI.head);
    }

    // ---- brazos
    for (const sg of [1, -1]) {
      const A = sg > 0 ? 'L' : 'R';
      const x = 0.19 * sg;
      if (!cont) {
      m.sphere(x - 0.01 * sg, 1.415, 0, 0.058, 0.06, 0.058, shirt, D, BI['arm' + A]);       // hombro
      m.cyl(x + 0.004 * sg, 1.29, 0, 0.046, 0.054, 0.26, shirt, C, BI['arm' + A]);
      if (hi) m.sphere(x, 1.3, 0.012, 0.045, 0.075, 0.046, shirt, 1, BI['arm' + A]);         // bíceps
      m.sphere(x, 1.16, 0, 0.046, 0.046, 0.046, sleeve, D, BI['fore' + A]);                   // codo
      m.cyl(x, 1.04, 0, 0.037, 0.046, 0.24, sleeve, C, BI['fore' + A]);
      if (hi) m.sphere(x, 1.09, 0.008, 0.044, 0.07, 0.042, sleeve, 1, BI['fore' + A]);        // antebrazo
      if (detail && o.cuffs && o.longSleeves) m.cyl(x, 0.935, 0, 0.041, 0.041, 0.03, dark(shirt, 0.85), C, BI['fore' + A]);
      }
      // mano en forma de manopla con pulgar
      m.sphere(x, 0.865, 0.008, 0.035, 0.05, 0.024, skin, hero ? 2 : D, BI['hand' + A]);
      m.sphere(x, 0.815, 0.01, 0.03, 0.03, 0.021, skin, 1, BI['fing' + A]);
      if (hi) m.sphere(x - 0.022 * sg, 0.86, 0.025, 0.012, 0.03, 0.012, skin, 1, BI['hand' + A]);
    }

    // ---- piernas
    for (const sg of [1, -1]) {
      const A = sg > 0 ? 'L' : 'R';
      const x = 0.1 * sg;
      if (!cont) {
      m.cyl(x, 0.69, 0, 0.066, 0.085, 0.44, pants, C, BI['leg' + A]);
      if (hi) m.sphere(x, 0.74, 0.02, 0.075, 0.13, 0.072, pants, 1, BI['leg' + A]);             // muslo
      m.sphere(x, 0.48, 0.008, 0.062, 0.062, 0.064, pants, D, BI['shin' + A]);                   // rodilla
      m.cyl(x, 0.28, 0, 0.046, 0.06, 0.4, pants, C, BI['shin' + A]);
      if (hi) m.sphere(x, 0.36, -0.02, 0.055, 0.1, 0.055, pants, 1, BI['shin' + A]);             // pantorrilla
      if (detail && o.pocket) m.box(x + 0.06 * sg, 0.7, 0.01, 0.03, 0.12, 0.1, dark(pants, 0.85), 0, BI['leg' + A]);
      }
      // zapato: talón, puntera y suela
      m.sphere(x, 0.06, 0.02, 0.055, 0.048, 0.09, shoes, hero ? 2 : D, BI['foot' + A]);
      m.sphere(x, 0.042, 0.12, 0.05, 0.036, 0.062, shoes, hero ? 2 : D, BI['toe' + A]);
      if (hi) {
        m.box(x, 0.012, 0.03, 0.1, 0.022, 0.16, 0x1a1816, 0, BI['foot' + A]);
        m.box(x, 0.012, 0.13, 0.09, 0.022, 0.08, 0x1a1816, 0, BI['toe' + A]);
      }
    }

    // ---- protagonista: botas altas con cordones, bolsillo lateral, pistolera y funda de la navaja
    if (hero) {
      for (const sg of [1, -1]) {
        const A = sg > 0 ? 'L' : 'R', lx = 0.1 * sg;
        m.cyl(lx, 0.135, 0.004, 0.058, 0.056, 0.15, shoes, C, BI['shin' + A]);                 // caña de la bota
        m.cyl(lx, 0.215, 0.004, 0.062, 0.062, 0.025, dark(shoes, 0.75), C, BI['shin' + A]);   // borde de la bota
        m.box(lx, 0.15, 0.058, 0.03, 0.09, 0.008, dark(shoes, 0.7), 0, BI['shin' + A]);       // cordones
      }
      m.box(0.186, 0.68, 0.012, 0.022, 0.12, 0.085, dark(pants, 0.82), 0, BI.legL);            // bolsillo lateral
      m.box(0.186, 0.735, 0.012, 0.026, 0.022, 0.09, dark(pants, 0.7), 0, BI.legL);            // tapa del bolsillo
      m.box(-0.196, 0.8, 0.008, 0.032, 0.16, 0.09, 0x2a2622, 0, BI.legR);                      // pistolera en el muslo
      m.box(-0.196, 0.88, 0.008, 0.034, 0.03, 0.095, 0x3a2a1c, 0, BI.legR);
      m.box(-0.19, 0.93, 0.0, 0.03, 0.03, 0.05, 0x2a2622, 0, BI.hips);                         // enganche al cinto
      m.box(0.19, 0.89, -0.035, 0.026, 0.12, 0.04, 0x3a2a1c, 0, BI.hips);                      // funda de la navaja
    }

    // ---- mochila del superviviente
    if (detail && o.backpack) {
      const bp = o.backpack;
      m.box(0, 1.24, -0.2, 0.3, 0.38, 0.14, bp, 0, BI.chest);
      m.sphere(0, 1.42, -0.2, 0.15, 0.06, 0.075, bp, D, BI.chest);
      m.box(0, 1.12, -0.29, 0.22, 0.14, 0.05, dark(bp, 0.85), 0, BI.chest);        // bolsillo
      m.cyl(0, 1.06, -0.2, 0.06, 0.06, 0.26, 0x4a4436, C, BI.chest, 0, 0, Math.PI / 2); // saco de dormir
      for (const sg of [1, -1]) {
        m.box(0.1 * sg, 1.35, 0.1, 0.035, 0.22, 0.02, dark(bp, 0.7), 0, BI.chest, -0.15);   // correas
        m.box(0.11 * sg, 1.2, 0.12, 0.035, 0.12, 0.02, dark(bp, 0.7), 0, BI.chest, 0.1);
      }
    }

    // ---- infectados: ropa rota, manchas y hongos (inspirado, no copiado)
    if (o.zombie && detail) {
      const r = o.blood || U.mulberry32(1);
      for (let i = 0; i < 4; i++) {
        const ang = r() * 6.28, y = 1.05 + r() * 0.4;
        m.sphere(Math.sin(ang) * 0.17, y, Math.cos(ang) * 0.11, 0.06 + r() * 0.05, 0.05 + r() * 0.05, 0.02, 0x5a1a14, 1, y > 1.27 ? BI.chest : (y > 1.12 ? BI.spine2 : BI.spine));
      }
      m.sphere(0.02, 1.6, 0.085, 0.05, 0.03, 0.03, 0x5a1a14, 1, BI.head);
      // desgarros: piel a la vista en el torso
      for (let i = 0; i < 2; i++) {
        const ang = r() * 6.28, y = 1.08 + r() * 0.3;
        m.sphere(Math.sin(ang) * 0.158, y, Math.cos(ang) * 0.12, 0.045, 0.06, 0.02, skin, 1, y > 1.27 ? BI.chest : BI.spine2);
      }
      const fl = o.fungus || 0;
      if (fl > 0) {
        const FUN = [0x6d5d3e, 0x7b6a48, 0x5a4b32, 0x8a7a55];
        const n = fl === 1 ? (hi ? 7 : 4) : (hi ? 16 : 8);
        for (let i = 0; i < n; i++) {
          // racimos en cabeza, cuello y hombros
          const where = r();
          let bx, by, bz, bone;
          if (where < 0.5) { const ang = r() * 6.28; bx = Math.sin(ang) * 0.09; by = 1.68 + r() * 0.06; bz = Math.cos(ang) * 0.1 - 0.02; bone = BI.head; }
          else if (where < 0.75) { bx = (r() - 0.5) * 0.1; by = 1.5 + r() * 0.05; bz = -0.04 - r() * 0.03; bone = BI.neck; }
          else { const sg = r() < 0.5 ? 1 : -1; bx = (0.08 + r() * 0.1) * sg; by = 1.42 + r() * 0.05; bz = (r() - 0.5) * 0.1; bone = BI[sg > 0 ? 'clavL' : 'clavR']; }
          const sz = 0.02 + r() * (fl === 2 ? 0.035 : 0.022);
          m.sphere(bx, by, bz, sz * 1.3, sz * 0.8, sz * 1.3, FUN[Math.floor(r() * FUN.length)], 1, bone);
        }
        if (o.facePlate) {
          // placa de hongo que cubre medio rostro, con láminas
          for (let i = 0; i < (hi ? 6 : 3); i++) {
            const yy = 1.64 + i * 0.018;
            m.sphere(0.035 + r() * 0.01, yy, 0.085 - i * 0.004, 0.06 - i * 0.004, 0.012, 0.04, FUN[i % FUN.length], 1, BI.head);
          }
          m.sphere(0.05, 1.68, 0.06, 0.07, 0.07, 0.06, 0x5d4f34, D, BI.head);
        }
      }
    }

    const g = m.build(skinWeight);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.5);
    return g;
  }

  // ---------- Personaje ----------
  function createHumanoid(o) {
    mats();
    const root = new THREE.Group();        // posición en el mundo y orientación
    const body = new THREE.Group();        // se inclina al caer
    root.add(body);

    const bones = BONES.map((b) => {
      const bone = new THREE.Bone();
      bone.name = b[0];
      bone.position.fromArray(b[2]);
      return bone;
    });
    BONES.forEach((b, i) => { if (b[1] >= 0) bones[b[1]].add(bones[i]); });

    const geoHigh = bodyGeometry(o);
    const mesh = new THREE.SkinnedMesh(geoHigh, o.zombie ? matZombie : matPlayer);
    mesh.add(bones[0]);
    bones[0].updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    body.add(mesh);

    const rest = bones.map((b) => b.position.clone());
    const h = {
      root, body, mesh, bones, rest, zombie: !!o.zombie, opts: o, geoHigh, geoLow: null, lod: 1,
      weapon: null, weaponId: null
    };
    BONES.forEach((b, i) => { h[b[0]] = bones[i]; });
    return h;
  }

  // Contorno amarillo (como al apuntar en el original): una copia de la malla,
  // un poco inflada y vista por dentro, que comparte el esqueleto
  let outlineMat = null;
  function setOutline(h, on) {
    if (on && !h.outline) {
      if (!outlineMat) {
        outlineMat = new THREE.MeshBasicMaterial({ color: 0xf2c230, side: THREE.BackSide, skinning: true });
        outlineMat.toneMapped = false;
        outlineMat.onBeforeCompile = (sh) => {
          sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normal * 0.03;');
        };
      }
      const geo = bodyGeometry(Object.assign({}, h.opts, { outlineOnly: true, blood: null }));
      const o = new THREE.SkinnedMesh(geo, outlineMat);
      o.bind(h.mesh.skeleton, h.mesh.bindMatrix);
      o.frustumCulled = false;
      h.body.add(o);
      h.outline = o;
    }
    if (h.outline) h.outline.visible = !!on;
  }

  // Detalle según la distancia: lejos se usa una malla más ligera con los mismos huesos
  // 1 = cerca, 0 = media distancia, -1 = muy lejos (malla mínima)
  function setLOD(h, level) {
    if (h.lod === level) return;
    h.lod = level;
    if (level === 0 && !h.geoLow) h.geoLow = bodyGeometry(Object.assign({}, h.opts, { lod: 0 }));
    if (level === -1 && !h.geoFar) h.geoFar = bodyGeometry(Object.assign({}, h.opts, { lod: -1 }));
    h.mesh.geometry = level === 1 ? h.geoHigh : (level === 0 ? h.geoLow : h.geoFar);
  }

  function disposeHumanoid(h) {
    h.geoHigh.dispose();
    if (h.geoLow) h.geoLow.dispose();
    if (h.geoFar) h.geoFar.dispose();
    if (h.outline) h.outline.geometry.dispose();
    h.mesh.skeleton.dispose && h.mesh.skeleton.dispose();
  }

  // Coloca un arma en la mano derecha. Las armas de fuego y el arco van en un soporte
  // (h.gunAnchor) unido al pecho: la pose lo mueve y las manos lo siguen con IK.
  function setWeapon(h, id, opt) {
    const key = (id || '') + (opt && opt.sil ? '_sil' : '');
    if (h.weaponKey === key) return;
    if (h.weapon) { if (h.weapon.parent) h.weapon.parent.remove(h.weapon); h.weapon = null; }
    h.gun = null;
    h.weaponKey = key;
    h.weaponId = id;
    if (!id || id === 'manos') return;
    mats();
    const wd = G.Weapons.get(id);
    if (wd.cat === 'gun') { setGun(h, id, wd, opt); return; }
    const w = new THREE.Mesh(weaponGeometry(id), matWeapon);
    w.castShadow = true;
    const cat = wd.cat;
    // ángulo en la mano: la lanza apunta hacia abajo en reposo, el resto hacia delante y abajo
    w.rotation.x = cat === 'spear' ? Math.PI - 0.08 : 2.35;
    w.position.set(0, -0.05, 0.015);
    if (cat === 'spear') w.position.y = 0.5;   // se agarra por el medio (la punta queda lejos)
    h.handR.add(w);
    h.weapon = w;
    // dónde va la mano izquierda (distancia desde el agarre de la derecha, a lo largo del mango)
    h.weaponGrip = cat === 'spear' ? 0.12 : (G.Weapons.isLong(wd) ? 0.2 : 0.09);
  }

  // Arma de fuego o arco. holder: origen en el agarre, cañón hacia +Z, arriba +Y
  const MUZZLE = { pistol: [0, 0.18, -0.036], shotgun: [0, 0.71, -0.039], rifle: [0, 0.74, -0.03], bow: [0, 0.7, 0] };
  function setGun(h, id, wd, opt) {
    if (!h.gunAnchor) {
      h.gunAnchor = new THREE.Group();
      h.chest.add(h.gunAnchor);
    }
    h.gunAnchorOk = false;
    const kind = wd.gun;
    const holder = new THREE.Group();
    const bodyId = kind === 'pistol' ? (opt && opt.sil ? 'pistola_sil' : 'pistola') : (id + '_body');
    const mesh = new THREE.Mesh(weaponGeometry(bodyId), matWeapon);
    mesh.castShadow = true;
    mesh.rotation.x = Math.PI / 2;         // +Y de la geometría -> +Z (adelante); -Z -> arriba
    holder.add(mesh);
    const g = { kind, holder, mesh, part: null, arrow: null, string: null, muzzle: new THREE.Object3D() };
    const mz = MUZZLE[kind];
    g.muzzle.position.set(mz[0], mz[1] + (opt && opt.sil ? 0.15 : 0), mz[2]);
    mesh.add(g.muzzle);
    if (kind === 'shotgun') {
      g.part = new THREE.Mesh(weaponGeometry('escopeta_pump'), matWeapon);
      g.part.position.set(0, 0.3, -0.016); g.partRest = 0.3;
      mesh.add(g.part);
    } else if (kind === 'rifle') {
      g.part = new THREE.Mesh(weaponGeometry('rifle_bolt'), matWeapon);
      g.part.position.set(0, 0.0, -0.03); g.partRest = 0.0;
      mesh.add(g.part);
    } else if (kind === 'bow') {
      g.arrow = new THREE.Mesh(weaponGeometry('flecha'), matWeapon);
      mesh.add(g.arrow);
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute([0, -0.07, -0.56, 0, -0.07, 0, 0, -0.07, 0.56], 3));
      g.string = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0xd8d0b8 }));
      g.string.frustumCulled = false;
      mesh.add(g.string);
    }
    h.gunAnchor.add(holder);
    h.weapon = holder;
    h.gun = g;
  }

  // Armas largas a la espalda (hasta dos), cruzadas en diagonal por fuera de la mochila
  function setBackpack(h, on) {
    if (!!h.pack === !!on) return;
    mats();
    if (on) {
      h.pack = new THREE.Mesh(weaponGeometry('mochila_worn'), matWeapon);
      h.pack.castShadow = true;
      h.chest.add(h.pack);
    } else { h.chest.remove(h.pack); h.pack = null; }
  }

  function setBackWeapon(h, ids, pack) {
    if (!Array.isArray(ids)) ids = ids ? [ids] : [];
    const key = ids.join('|') + (pack ? '+m' : '');
    if (h.backId === key) return;
    if (h.backs) for (const b of h.backs) h.chest.remove(b);
    h.backs = [];
    h.backId = key;
    mats();
    ids.slice(0, 2).forEach((id, k) => {
      const w = new THREE.Mesh(weaponGeometry(id), matWeapon);
      w.castShadow = true;
      const len = G.Weapons.get(id).len || 0.9;
      const sg = k === 0 ? 1 : -1;
      w.rotation.set(0.12, 0, -0.62 * sg);
      // con mochila por fuera de ella; sin mochila, pegadas a la espalda
      w.position.set((-0.18 - 0.12 * (len - 0.9)) * sg, -0.32 - 0.25 * (len - 0.9), (pack ? -0.3 : -0.17) - 0.05 * k);
      h.chest.add(w);
      h.backs.push(w);
    });
  }

  // ---------- Poses y animación ----------
  function reset(h) {
    for (let i = 0; i < h.bones.length; i++) {
      h.bones[i].rotation.set(0, 0, 0);
      h.bones[i].position.copy(h.rest[i]);
    }
  }

  const sin = Math.sin, cos = Math.cos, max = Math.max, abs = Math.abs;
  const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const easeOut = (t) => { t = c01(t); return 1 - (1 - t) * (1 - t) * (1 - t); };
  const easeIn = (t) => { t = c01(t); return t * t; };

  // Suaviza el paso de una pose a otra: cada hueso persigue su pose objetivo
  // con una inercia corta, así no hay saltos bruscos entre animaciones.
  function blend(h, dt, rate) {
    const n = h.bones.length;
    if (!h.prev) { h.prev = new Float32Array(n * 3 + 1); h.prevOk = false; }
    const k = (h.prevOk && dt != null) ? 1 - Math.exp(-dt * rate) : 1;
    const p = h.prev;
    for (let i = 0; i < n; i++) {
      const r = h.bones[i].rotation, j = i * 3;
      r.x = p[j] + (r.x - p[j]) * k; p[j] = r.x;
      r.y = p[j + 1] + (r.y - p[j + 1]) * k; p[j + 1] = r.y;
      r.z = p[j + 2] + (r.z - p[j + 2]) * k; p[j + 2] = r.z;
    }
    const hp = h.hips.position;
    hp.y = p[n * 3] + (hp.y - p[n * 3]) * (h.prevOk ? k : 1); p[n * 3] = hp.y;
    h.prevOk = true;
  }

  // Ciclo de piernas. p = fase, a = intensidad (0 a 1)
  function legs(h, p, a, run, drag) {
    const amp = (run ? 0.92 : 0.58) * a;
    const ampL = drag ? amp * 0.55 : amp;
    const knee = run ? 1.55 : 0.9;
    h.legL.rotation.x = -sin(p) * ampL;
    h.legR.rotation.x = sin(p) * amp;
    // la rodilla se dobla mientras la pierna avanza
    const fl = max(0, cos(p)), fr = max(0, -cos(p));
    h.shinL.rotation.x = a * (0.08 + knee * fl * fl * (drag ? 0.45 : 1));
    h.shinR.rotation.x = a * (0.08 + knee * fr * fr);
    // el pie se levanta al apoyar el talón y se estira al despegar
    h.footL.rotation.x = a * (-0.25 * max(0, -sin(p)) + 0.3 * fl * 0.5);
    h.footR.rotation.x = a * (-0.25 * max(0, sin(p)) + 0.3 * fr * 0.5);
    // los dedos se doblan al despegar el pie del suelo
    h.toeL.rotation.x = -a * (run ? 0.7 : 0.5) * max(0, -sin(p)) * (drag ? 0.3 : 1);
    h.toeR.rotation.x = -a * (run ? 0.7 : 0.5) * max(0, sin(p));
    // los hombros acompañan el paso
    h.clavL.rotation.y = -sin(p) * (run ? 0.1 : 0.05) * a;
    h.clavR.rotation.y = -sin(p) * (run ? 0.1 : 0.05) * a;
    // cadera: sube al pasar la pierna, baja al apoyar, y se balancea
    h.hips.position.y = 0.95 - 0.02 * a + (run ? 0.035 : 0.018) * a * cos(2 * p);
    h.hips.rotation.y = sin(p) * 0.11 * a;
    h.hips.rotation.z = sin(p) * 0.045 * a;
    h.spine.rotation.z = -sin(p) * 0.03 * a;
    h.chest.rotation.y = -sin(p) * 0.15 * a;
  }

  // Brazos al caminar, con el codo un poco retrasado
  function armSwing(h, p, a, run, side) {
    const A = side === 'L' ? 'L' : 'R';
    const sg = side === 'L' ? 1 : -1;
    const sw = sin(p) * sg;
    h['arm' + A].rotation.x = sw * (run ? 0.75 : 0.42) * a;
    h['arm' + A].rotation.z = sg * (0.07 + (run ? 0.1 : 0) * a);
    const lag = max(0, -sin(p - 0.45) * sg);
    h['fore' + A].rotation.x = run ? -1.25 - 0.25 * lag * a : -0.18 - 0.38 * lag * a;
  }

  // Pose del jugador
  function posePlayer(h, s) {
    reset(h);
    const a = s.amt, t = s.time || 0;
    const two = !!s.two;
    const armed = s.cat && s.cat !== 'none';

    // ---- movimiento omnidireccional: la cadera gira hacia donde vas y el torso sigue mirando al frente
    let rel = s.rel || 0, p = s.phase, twist = 0;
    if (a > 0.05) {
      if (Math.abs(rel) <= 2.0) twist = Math.max(-0.95, Math.min(0.95, rel));
      else { p = -p; twist = Math.max(-0.8, Math.min(0.8, U.angleDiff(rel, Math.PI * Math.sign(rel)))); }
    }
    // corriendo agachado: zancada más corta (el agachado ya dobla mucho las piernas)
    legs(h, p, a * (s.run && (s.crouch || 0) > 0.3 ? 0.62 : 1), s.run, false);
    h.hips.rotation.y += twist * a;
    h.spine.rotation.y -= twist * 0.55 * a;
    h.chest.rotation.y -= twist * 0.45 * a;
    armSwing(h, p, a, s.run, 'L');
    armSwing(h, p, a, s.run, 'R');
    if (s.run) { h.spine.rotation.x = 0.26; h.neck.rotation.x = -0.16; }
    // respiración y pequeño balanceo de peso en reposo
    const idle = 1 - a;
    h.chest.rotation.x += sin(t * 1.7) * 0.022 * idle;
    h.hips.rotation.z += sin(t * 0.55) * 0.02 * idle;
    h.armL.rotation.z += sin(t * 1.7) * 0.012 * idle;
    h.armR.rotation.z -= sin(t * 1.7) * 0.012 * idle;
    h.clavL.rotation.z += sin(t * 1.7) * 0.025 * idle;
    h.clavR.rotation.z -= sin(t * 1.7) * 0.025 * idle;

    const gs = s.gun || null;
    if (armed && !gs) {
      if (s.aim) {
        // en guardia
        h.armR.rotation.x = -0.95; h.armR.rotation.z = -0.18;
        h.foreR.rotation.x = -1.15 + sin(t * 2) * 0.03;
        if (two) { h.armL.rotation.x = -0.95; h.armL.rotation.z = -0.52; h.foreL.rotation.x = -1.15; }
        else { h.armL.rotation.x = -0.25; h.foreL.rotation.x = -0.5; }
        h.spine.rotation.x = Math.max(h.spine.rotation.x, 0.12); h.chest.rotation.y -= 0.18;
        h.clavR.rotation.y += 0.16; h.clavR.rotation.z -= 0.08;
        if (two) h.clavL.rotation.y -= 0.22;
      } else if (two) {
        // a dos manos, el arma cruzada por delante
        h.armR.rotation.x = -0.4 + sin(p) * 0.05 * a; h.armR.rotation.z = -0.12;
        h.foreR.rotation.x = -0.95;
        h.armL.rotation.x = -0.5; h.armL.rotation.z = -0.45;
        h.foreL.rotation.x = -1.0;
        h.clavL.rotation.y -= 0.15;
      } else {
        // a una mano, relajada al costado
        h.armR.rotation.x = -0.1 - sin(p) * (s.run ? 0.35 : 0.18) * a;
        h.foreR.rotation.x = -0.18 - (s.run ? 0.6 : 0.08) * a;
      }
    } else if (!armed && s.aim) {
      h.armL.rotation.x = -0.95; h.armR.rotation.x = -0.95;
      h.foreL.rotation.x = -1.0; h.foreR.rotation.x = -1.0;
    }

    // armas de fuego: al apuntar el torso sigue la mirada (arriba y abajo), los hombros se adelantan
    // y con escopeta o rifle la cabeza se apoya en la culata
    if (gs) {
      const ai = U.smooth(c01(gs.aim)) * (s.climb != null ? 0 : 1) * (1 - (s.prone || 0));
      const pt = s.pitch || 0;
      h.spine.rotation.x += pt * 0.4 * ai + 0.05 * ai;
      h.neck.rotation.x += pt * 0.25 * ai;
      if (gs.kind === 'shotgun' || gs.kind === 'rifle') {
        h.neck.rotation.z += 0.14 * ai; h.neck.rotation.y -= 0.1 * ai; h.head.rotation.x += 0.12 * ai;
        h.clavL.rotation.y -= 0.45 * ai; h.clavR.rotation.y += 0.1 * ai; h.chest.rotation.y -= 0.1 * ai;
      } else if (gs.kind === 'pistol') {
        h.clavL.rotation.y -= 0.25 * ai; h.clavR.rotation.y += 0.18 * ai; h.head.rotation.x += 0.06 * ai;
      } else {
        // arco: postura de tiro. Cadera y torso girados a la derecha (el hombro izquierdo hacia el
        // blanco), piernas abiertas, cabeza girada hacia el blanco sobre la flecha y el hombro
        // derecho que sube al tensar
        const dr = c01(gs.draw || 0);
        const yaw = -1.0 * ai;
        h.hips.rotation.y += yaw * 0.45; h.spine.rotation.y += yaw * 0.3; h.chest.rotation.y += yaw * 0.25;
        h.spine.rotation.x -= pt * 0.2 * ai;              // menos cabeceo de columna: lo hacen los brazos
        h.neck.rotation.y -= yaw * 0.45; h.neck.rotation.z -= 0.08 * ai; h.head.rotation.x += 0.08 * ai;
        h.clavR.rotation.z -= 0.12 * ai * dr; h.clavR.rotation.y += 0.12 * ai * dr; h.clavL.rotation.y -= 0.12 * ai;
        const still = 1 - a;
        h.legL.rotation.x -= 0.14 * ai * still; h.legL.rotation.z += 0.1 * ai * still;
        h.legR.rotation.x += 0.1 * ai * still; h.legR.rotation.z -= 0.12 * ai * still;
        h.shinL.rotation.x += 0.08 * ai * still;
      }
    }

    // agachado (sigilo): agachado hondo, torso muy inclinado, cabeza levantada mirando al frente,
    // brazos algo separados y bajos, hombros encogidos
    const c = s.crouch || 0;
    if (c > 0.01) {
      h.hips.position.y -= 0.3 * c;
      h.legL.rotation.x -= 1.1 * c; h.legR.rotation.x -= 1.1 * c;
      h.legL.rotation.z += 0.08 * c; h.legR.rotation.z -= 0.08 * c;
      h.shinL.rotation.x += 1.65 * c; h.shinR.rotation.x += 1.65 * c;
      h.footL.rotation.x -= 0.55 * c; h.footR.rotation.x -= 0.55 * c;
      h.toeL.rotation.x -= 0.25 * c; h.toeR.rotation.x -= 0.25 * c;
      h.spine.rotation.x += 0.55 * c;
      h.neck.rotation.x -= 0.32 * c; h.head.rotation.x -= 0.12 * c;
      h.clavL.rotation.y -= 0.12 * c; h.clavR.rotation.y += 0.12 * c;
      h.clavL.rotation.z += 0.06 * c; h.clavR.rotation.z -= 0.06 * c;
      if (!s.aim && !(armed && two)) {
        const sw2 = sin(p) * 0.18 * a;
        h.armL.rotation.x = U.lerp(h.armL.rotation.x, -0.45 + sw2, c); h.armL.rotation.z = U.lerp(h.armL.rotation.z, 0.24, c);
        h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -0.85, c);
        if (!armed) {
          h.armR.rotation.x = U.lerp(h.armR.rotation.x, -0.45 - sw2, c); h.armR.rotation.z = U.lerp(h.armR.rotation.z, -0.24, c);
          h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -0.85, c);
        }
      }
    }

    // cobertura: pegado a la pared con el hombro, inclinado hacia ella; en una esquina se asoma
    const cvp = s.cover;
    if (cvp && cvp.amt > 0.01) {
      const k = cvp.amt, wl = cvp.wall || 1;
      h.spine.rotation.z -= wl * 0.14 * k;
      h.hips.position.x += wl * 0.04 * k;
      h.neck.rotation.z += wl * 0.1 * k;
      h.clavL.rotation.z += (wl > 0 ? 0.08 : 0) * k; h.clavR.rotation.z -= (wl < 0 ? 0.08 : 0) * k;
      if (cvp.peek && !cvp.aim) {
        // asomarse: el torso y la cabeza salen por la esquina
        h.spine.rotation.z += wl * 0.3 * k;
        h.spine.rotation.x += 0.12 * k;
        h.neck.rotation.z -= wl * 0.12 * k;
        h.head.rotation.y -= wl * 0.25 * k;
      }
      // la mano del lado de la pared se apoya en ella (si no lleva un arma a dos manos)
      if (!s.aim && !(armed && two) && !gs) {
        const A = wl > 0 ? 'L' : 'R';
        h['arm' + A].rotation.x = U.lerp(h['arm' + A].rotation.x, -0.55, k);
        h['arm' + A].rotation.z = U.lerp(h['arm' + A].rotation.z, wl * 0.55, k);
        h['fore' + A].rotation.x = U.lerp(h['fore' + A].rotation.x, -0.9, k);
      }
    }

    // saltito
    if (s.hop) {
      const k = sin(Math.PI * s.hop);
      h.legL.rotation.x -= 0.6 * k; h.shinL.rotation.x += 1.0 * k;
      h.legR.rotation.x -= 0.3 * k; h.shinR.rotation.x += 0.7 * k;
      h.armL.rotation.x -= 0.5 * k; h.armR.rotation.x -= 0.5 * k;
    }

    // guardia de pelea sin arma: piernas algo flexionadas, el pie izquierdo adelante y el hombro derecho atrás
    const gd = (!armed && !gs) ? (s.guard || 0) * (1 - c) : 0;
    if (gd > 0.01) {
      const still = 1 - a * 0.6;
      h.legL.rotation.x -= 0.24 * gd * still; h.legR.rotation.x += 0.14 * gd * still;
      h.shinL.rotation.x += 0.22 * gd * still; h.shinR.rotation.x += 0.28 * gd * still;
      h.footL.rotation.x += 0.04 * gd * still; h.toeR.rotation.x -= 0.12 * gd * still;
      h.hips.position.y -= 0.035 * gd;
      h.hips.rotation.y -= 0.12 * gd * still; h.chest.rotation.y -= 0.1 * gd;
      h.spine.rotation.x += 0.1 * gd; h.neck.rotation.x -= 0.06 * gd;
    }

    if (s.action) action(h, s.action, s.t, two, s);
    if (s.dodge != null) dodgePose(h, s.dodge, s.dodgeRel || 0, armed, two);
    if (s.blow) blowPose(h, s.blow, armed, two, !!gs, t);
    if (s.climb != null) {
      const k = sin(Math.PI * s.climb);
      h.legL.rotation.x = -1.2 * k; h.shinL.rotation.x = 1.4 * k;
      h.legR.rotation.x = -0.4 * k; h.shinR.rotation.x = 0.8 * k;
      h.spine.rotation.x = 0.5 * k;
      h.armL.rotation.x = -1.0 * k; h.armR.rotation.x = -1.0 * k;
    }

    // ---- pecho a tierra: el cuerpo se tumba boca abajo y se arrastra
    const pr = s.prone || 0;
    if (pr > 0.01) {
      const q = Math.sin(s.phase), am = a;
      const P = {
        armL: [-2.75 + q * 0.45 * am, 0, 0.35], armR: [-2.75 - q * 0.45 * am, 0, -0.35],
        foreL: [-0.55 - 0.4 * Math.max(0, -q) * am, 0, 0], foreR: [-0.55 - 0.4 * Math.max(0, q) * am, 0, 0],
        legL: [0.05 + q * 0.3 * am, 0, 0.16], legR: [0.05 - q * 0.3 * am, 0, -0.16],
        shinL: [0.15 + 0.7 * Math.max(0, q) * am, 0, 0], shinR: [0.15 + 0.7 * Math.max(0, -q) * am, 0, 0],
        footL: [0.4, 0, 0], footR: [0.4, 0, 0],
        spine: [0, 0, q * 0.06 * am], chest: [0, q * 0.08 * am, 0],
        neck: [-0.7, 0, 0], head: [-0.25, 0, 0], hips: [0, 0, -q * 0.05 * am]
      };
      for (const name in P) {
        const r = h[name].rotation, v = P[name];
        r.x = U.lerp(r.x, v[0], pr); r.y = U.lerp(r.y, v[1], pr); r.z = U.lerp(r.z, v[2], pr);
      }
      h.hips.position.y = U.lerp(h.hips.position.y, 0.95, pr);
    }
    const th = Math.PI / 2 * U.smooth(pr);
    h.body.rotation.x = th;
    h.body.position.set(0, (0.9 - 0.9 * Math.cos(th)) - 0.76 * Math.sin(th), -0.9 * Math.sin(th));

    // la cabeza compensa el giro del cuerpo (mira hacia delante)
    if (pr < 0.5) h.head.rotation.y -= (h.hips.rotation.y + h.spine.rotation.y + h.chest.rotation.y) * 0.6;
    // dedos: la mano se cierra sobre lo que agarra; relajada si está libre; abierta al empujar
    {
      const open = s.action === 'shove' || s.action === 'search';
      let cR = armed ? 1.15 : 0.35, cL = armed && two ? 1.0 : 0.3;
      if (gs) {
        cR = gs.kind === 'bow' ? 0.7 : 1.15;
        cL = gs.kind === 'pistol' ? 0.3 + 0.8 * U.smooth(c01(gs.aim)) : 1.05;
      }
      if (s.action === 'grab') { cL = 1.1; cR = s.grabKnife ? 1.15 : 1.0; }
      if (!armed && !gs && (PUNCH_K[s.action] || (!s.action && (s.guard || 0) > 0.3))) { cL = 1.3; cR = 1.3; }
      if (open) { cL = 0.1; cR = armed ? cR : 0.1; }
      h.fingR.rotation.z = cR; h.fingL.rotation.z = -cL;
    }
    distributeSpine(h);
    blend(h, s.dt, (s.action || s.dodge != null) ? 30 : 15);
    if (h.weapon && !gs) h.weapon.visible = (s.action !== 'grab' || !!(s.grabKnife && armed && s.cat === 'sblade')) && s.action !== 'search' && s.action !== 'bandage';
    if (s.action === 'grab') { if (gs) gunIK(h, s, gs); grabIK(h, s); }
    else if (s.action === 'bandage') { if (h.weapon) h.weapon.visible = false; bandageIK(h, s); }
    else if (s.action === 'search' || s.action === 'bandage') { if (h.weapon) h.weapon.visible = false; }
    else if (!armed && !gs && PUNCH_K[s.action]) fistIK(h, s, Math.max(gd, U.smooth(s.t / 0.1)));
    else if (!armed && !gs && !s.action && gd > 0.01 && s.dodge == null && s.climb == null && pr < 0.5) fistIK(h, s, gd);
    else if (gs) gunIK(h, s, gs);
    // mano izquierda sobre el arma cuando se agarra a dos manos
    else if (armed && two && pr < 0.5 && s.climb == null && s.action !== 'shove' && s.action !== 'stomp') leftHandIK(h);
    if (h.grabKnife) h.grabKnife.visible = s.action === 'grab' && !!s.grabKnife && !(armed && s.cat === 'sblade' && !gs);
  }

  // Agarre por la espalda: el brazo izquierdo rodea el cuello; con cuchillo, la derecha apuñala;
  // sin cuchillo, la derecha agarra la muñeca izquierda y estrangula
  const _gL = new THREE.Vector3(), _gR = new THREE.Vector3(), _gp1 = new THREE.Vector3(), _gp2 = new THREE.Vector3();
  const POLE_GL = new THREE.Vector3(1, -0.6, -0.3).normalize(), POLE_GR = new THREE.Vector3(-1, -0.7, -0.2).normalize();
  function grabIK(h, s) {
    const t = s.t;
    const k = win(t, 0, 0.12) * (1 - win(t, 0.86, 1));
    if (k <= 0) return;
    h.root.updateMatrixWorld(true);
    const shake = sin(t * 40) * 0.02 * (1 - win(t, 0.55, 0.8));
    h.chest.localToWorld(_gL.set(-0.1 + shake, 0.24, 0.44));
    armIK(h, 'L', _gL, _gp1.copy(POLE_GL), k);
    if (s.grabKnife) {
      // tres puñaladas al cuello
      let st = 0;
      for (const c of [0.3, 0.45, 0.6]) st = Math.max(st, win(t, c - 0.08, c) * (1 - win(t, c, c + 0.07)));
      h.chest.localToWorld(_gR.set(-0.28 + 0.18 * st, 0.32 - 0.05 * st, 0.12 + 0.28 * st));
      if (!h.grabKnife) {
        mats();
        h.grabKnife = new THREE.Mesh(weaponGeometry('cuchillo_caza'), matWeapon);
        h.grabKnife.rotation.x = 2.35; h.grabKnife.position.set(0, -0.05, 0.015);
        h.handR.add(h.grabKnife);
      }
    } else {
      h.chest.localToWorld(_gR.set(0.02 + shake, 0.22, 0.4));
    }
    armIK(h, 'R', _gR, _gp2.copy(POLE_GR), k);
  }

  // Vendarse: el antebrazo izquierdo delante del cuerpo y la mano derecha dando vueltas alrededor
  const _bL = new THREE.Vector3(), _bR = new THREE.Vector3(), _bdA = new THREE.Vector3(), _bdB = new THREE.Vector3();
  const POLE_BL = new THREE.Vector3(0.8, -1, -0.2).normalize(), POLE_BR = new THREE.Vector3(-0.8, -1, -0.2).normalize();
  // ---- Puños: trayectorias de cada puño en el espacio del pecho (la carga, el golpe y la vuelta),
  // con el codo guiado (afuera y a la altura del hombro en los ganchos). Claves: [t, x, y, z, codo x, y, z, curva]
  // curva del tramo que termina en la clave: 's' suave, 'i' acelera (el golpe), 'o' frena
  const PUNCH_K = { punch1: 1, punch2: 1, punch3: 1 };
  // posiciones en el espacio del cuerpo (pies en el suelo, mirando a +Z); el hombro derecho está en (-0,19; 1,44; 0)
  const FIST_GR = [-0.16, 1.47, 0.25, -0.5, -1, -0.05], FIST_GL = [0.1, 1.5, 0.3, 0.5, -1, -0.05];
  const FIST_TR = {
    punch1: {
      R: [[0, ...FIST_GR, 's'], [0.3, -0.25, 1.46, 0.17, -0.6, -1, -0.3, 'o'], [0.42, 0.0, 1.39, 0.57, -1, 0.1, -0.3, 'i'],
        [0.56, 0.17, 1.37, 0.42, -0.9, -0.2, 0.1, 'o'], [0.95, ...FIST_GR, 's']],
      L: [[0, ...FIST_GL, 's'], [0.3, 0.1, 1.5, 0.34, 0.5, -1, -0.1, 's'], [0.6, 0.1, 1.5, 0.34, 0.5, -1, -0.1, 's'], [0.95, ...FIST_GL, 's']]
    },
    punch3: {
      R: [[0, ...FIST_GR, 's'], [0.3, -0.26, 1.08, 0.1, -0.5, -1, -0.4, 'o'], [0.44, -0.4, 1.3, 0.0, -0.3, -1, -0.5, 's'],
        [0.52, 0.0, 1.37, 0.62, -1, 0.2, -0.2, 'i'], [0.7, 0.2, 1.12, 0.45, -0.7, 0.1, 0.4, 'o'], [0.98, ...FIST_GR, 's']],
      L: [[0, ...FIST_GL, 's'], [0.3, 0.16, 1.2, 0.5, 0.5, -1, 0, 's'], [0.5, 0.12, 1.4, 0.2, 0.7, -1, -0.2, 's'], [0.98, ...FIST_GL, 's']]
    }
  };
  // el gancho de izquierda es el de derecha en espejo
  FIST_TR.punch2 = {
    L: FIST_TR.punch1.R.map((k) => [k[0], -k[1], k[2], k[3], -k[4], k[5], k[6], k[7]]),
    R: FIST_TR.punch1.L.map((k) => [k[0], -k[1], k[2], k[3], -k[4], k[5], k[6], k[7]])
  };
  const _fk = [0, 0, 0, 0, 0, 0];
  function fistTrack(keys, t, out) {
    if (t <= keys[0][0]) { for (let i = 0; i < 6; i++) out[i] = keys[0][i + 1]; return out; }
    for (let k = 1; k < keys.length; k++) {
      const b = keys[k];
      if (t <= b[0] || k === keys.length - 1) {
        const a = keys[k - 1];
        let u = c01((t - a[0]) / (b[0] - a[0]));
        u = b[7] === 'i' ? u * u * u * 0.4 + u * u * 0.6 : (b[7] === 'o' ? 1 - (1 - u) * (1 - u) : U.smooth(u));
        for (let i = 0; i < 6; i++) out[i] = a[i + 1] + (b[i + 1] - a[i + 1]) * u;
        return out;
      }
    }
    return out;
  }
  const _fT = new THREE.Vector3(), _fP = new THREE.Vector3(), _fq1 = new THREE.Quaternion(), _fq2 = new THREE.Quaternion();
  let HAND_FX = -0.6;
  G.__setHandFx = (v) => { HAND_FX = v; };
  function fistIK(h, s, w) {
    if (w <= 0.001) return;
    h.root.updateMatrixWorld(true);
    const tr = PUNCH_K[s.action] ? FIST_TR[s.action] : null;
    for (const side of ['L', 'R']) {
      const k = tr ? fistTrack(tr[side], s.t, _fk) : (side === 'R' ? FIST_GR : FIST_GL);
      // en guardia los puños se mecen un poco
      const sw = tr ? 0 : Math.sin((s.time || 0) * 2.3 + (side === 'R' ? 0 : 1.7)) * 0.012;
      h.mesh.localToWorld(_fT.set(k[0], k[1] + sw, k[2]));
      // el codo se guía en el espacio del cuerpo (no gira con el torso): se pasa al de la clavícula
      h.mesh.getWorldQuaternion(_fq1);
      h['clav' + side].getWorldQuaternion(_fq2).invert();
      _fP.set(k[3], k[4], k[5]).normalize().applyQuaternion(_fq1).applyQuaternion(_fq2);
      armIK(h, side, _fT, _fP, w);
      h['hand' + side].rotation.set(HAND_FX, 0, side === 'R' ? -0.15 : 0.15);
    }
  }

  function bandageIK(h, s) {
    const t = s.t;
    const k = win(t, 0, 0.12) * (1 - win(t, 0.9, 1));
    if (k <= 0) return;
    h.root.updateMatrixWorld(true);
    h.chest.localToWorld(_bL.set(0.03, -0.16, 0.3));
    armIK(h, 'L', _bL, _bdA.copy(POLE_BL), k);
    const a = t * 40;
    h.chest.localToWorld(_bR.set(0.07 + 0.02 * Math.sin(a), -0.14 + 0.07 * Math.cos(a), 0.3 + 0.07 * Math.sin(a)));
    armIK(h, 'R', _bR, _bdB.copy(POLE_BR), k);
  }

  // Golpe recibido: tirón seco hacia donde empuja el golpe (atrás si viene de frente, de lado si viene
  // de un lado), un paso atrás y los brazos que se levantan para cubrirse. Un mordisco: forcejeo
  function blowPose(h, b, armed, two, gun, time) {
    const u = b.t, e = u * (b.dur || 0.6);
    const pk = e < 0.05 ? U.smooth(e / 0.05) : Math.exp(-(e - 0.05) * 7) * Math.cos((e - 0.05) * 10);
    const env = sin(Math.PI * Math.pow(u, 0.6));
    const fx = cos(b.rel), sx = sin(b.rel);      // de frente (+) / de espaldas (-), izquierda (+) / derecha (-)
    h.spine.rotation.x += -0.4 * fx * pk;
    h.neck.rotation.x += -0.35 * fx * pk;
    h.spine.rotation.z += -0.3 * sx * pk;
    h.chest.rotation.y += -0.4 * sx * pk;
    h.neck.rotation.z += -0.25 * sx * pk;
    h.hips.position.y -= 0.05 * env;
    const st = sin(u * Math.PI * 2) * env;
    h.legL.rotation.x += 0.3 * st * fx; h.legR.rotation.x -= 0.3 * st * fx;
    h.shinL.rotation.x += 0.3 * env; h.shinR.rotation.x += 0.25 * env;
    if (!gun && !(armed && two)) {
      // se cubre con los antebrazos
      const k = env * (b.bite ? 1 : 0.8);
      h.armL.rotation.x = U.lerp(h.armL.rotation.x, -1.25, k); h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -1.5, k);
      h.armL.rotation.z = U.lerp(h.armL.rotation.z, -0.15, k);
      if (!armed) { h.armR.rotation.x = U.lerp(h.armR.rotation.x, -1.2, k); h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -1.5, k); }
    }
    if (b.bite) {
      // forcejeo: empuja al zombi con los brazos y sacude el torso
      const w = env, q = sin(time * 28), q2 = sin(time * 23 + 1);
      h.chest.rotation.y += 0.18 * q * w; h.spine.rotation.z += 0.08 * q2 * w;
      h.armL.rotation.x = U.lerp(h.armL.rotation.x, -1.45 + 0.15 * q, w); h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -0.5, w);
      h.armR.rotation.x = U.lerp(h.armR.rotation.x, -1.4 - 0.15 * q2, w); h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -0.55, w);
      h.neck.rotation.x -= 0.2 * w;
    }
  }

  // Esquiva: se agacha y se aparta hacia un lado o hacia atrás, con la guardia alta.
  // rel = dirección de la esquiva respecto a donde mira el personaje
  function dodgePose(h, t, rel, armed, two) {
    const k = sin(Math.PI * c01(t * 1.15)) ;
    const fc = cos(rel), sc = sin(rel);            // adelante (+) / atrás (-), izquierda (+) / derecha (-)
    const L = sc >= 0;
    h.hips.position.y -= 0.17 * k;
    h.hips.rotation.y += -sc * 0.25 * k;
    h.spine.rotation.x += 0.3 * k + 0.12 * fc * k;
    h.spine.rotation.z += -sc * 0.32 * k;
    h.neck.rotation.x -= 0.2 * k; h.neck.rotation.z += sc * 0.22 * k;
    // pierna que lleva el paso hacia la esquiva, la otra empuja
    const lead = L ? 'L' : 'R', push = L ? 'R' : 'L';
    h['leg' + lead].rotation.x += (-0.35 - 0.35 * fc) * k; h['leg' + lead].rotation.z += (L ? 1 : -1) * 0.38 * abs(sc) * k;
    h['shin' + lead].rotation.x += 0.75 * k;
    h['leg' + push].rotation.x += (0.15 - 0.25 * fc) * k; h['shin' + push].rotation.x += 0.55 * k;
    h['leg' + push].rotation.z += (L ? 1 : -1) * 0.12 * abs(sc) * k;
    h['toe' + push].rotation.x -= 0.6 * k;
    // guardia: brazos recogidos delante de la cara
    h.armL.rotation.x = U.lerp(h.armL.rotation.x, -1.1, k); h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -1.6, k);
    h.armL.rotation.z = U.lerp(h.armL.rotation.z, -0.2, k);
    if (!armed || two) { h.armR.rotation.x = U.lerp(h.armR.rotation.x, -1.0, k); h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -1.5, k); }
    else { h.armR.rotation.x = U.lerp(h.armR.rotation.x, -0.6, k); h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -1.2, k); }
    h.clavL.rotation.y -= 0.2 * k; h.clavR.rotation.y += 0.2 * k;
  }

  // Reparte la curva y el giro de la columna entre sus tres tramos (espalda más natural)
  function distributeSpine(h) {
    const sp = h.spine.rotation, s2 = h.spine2.rotation, ch = h.chest.rotation;
    const bx = sp.x, by = sp.y, bz = sp.z, cy = ch.y;
    sp.x = bx * 0.5; s2.x += bx * 0.5;
    sp.y = by * 0.6; s2.y += by * 0.4 + cy * 0.3; ch.y = cy * 0.7;
    sp.z = bz * 0.6; s2.z += bz * 0.4;
  }

  // ---- IK de dos huesos: lleva una mano a un punto (en el mundo)
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
  const _down = new THREE.Vector3(0, -1, 0);
  const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion();
  const POLE = new THREE.Vector3(0.45, -1, -0.35).normalize();
  // side 'L' o 'R'; target en el mundo (se modifica); pole en el espacio de la clavícula; w = peso (0 FK, 1 IK)
  function armIK(h, side, target, pole, w) {
    if (w <= 0.001) return;
    const clav = h['clav' + side], arm = h['arm' + side], fore = h['fore' + side];
    const T = clav.worldToLocal(target);
    const S = arm.position;
    const A = 0.28, B = 0.31;
    const v = _v2.copy(T).sub(S);
    let d = v.length();
    if (d < 1e-4) return;
    v.divideScalar(d);
    d = Math.max(0.08, Math.min(A + B - 0.003, d));
    const cosA = U.clamp((A * A + d * d - B * B) / (2 * A * d), -1, 1);
    const ang = Math.acos(cosA);
    const pp = _v3.copy(pole).addScaledVector(v, -v.dot(pole));
    if (pp.lengthSq() < 1e-6) pp.set(0, -1, 0);
    pp.normalize();
    const u = _v4.copy(v).multiplyScalar(Math.cos(ang)).addScaledVector(pp, Math.sin(ang)).normalize();
    _q1.setFromUnitVectors(_down, u);
    const E = u.multiplyScalar(A).add(S);
    const fdir = T.sub(E).normalize().applyQuaternion(_q2.copy(_q1).invert());
    _q3.setFromUnitVectors(_down, fdir);
    if (w >= 0.999) { arm.quaternion.copy(_q1); fore.quaternion.copy(_q3); }
    else {
      _q4.copy(arm.quaternion); arm.quaternion.copy(_q4.slerp(_q1, w));
      _q4.copy(fore.quaternion); fore.quaternion.copy(_q4.slerp(_q3, w));
    }
  }

  function leftHandIK(h) {
    if (!h.weapon) return;
    h.root.updateMatrixWorld(true);
    const grip = h.weaponGrip || 0.2;
    armIK(h, 'L', h.weapon.localToWorld(_v1.set(0, grip, 0)), POLE, 1);
    h.handL.rotation.set(0, 0, 0.3);
  }

  // ---- Armas de fuego: pose del soporte (en el espacio del pecho) y manos con IK
  // [x, y, z, cabeceo, giro, alabeo]; cabeceo positivo = cañón hacia abajo; giro positivo = hacia la izquierda
  const GP = {
    pistol: { ready: [-0.24, -0.4, 0.16, 1.25, 0.08, 0], aim: [-0.05, 0.2, 0.45, 0, 0.05, 0], load: [-0.05, 0.03, 0.3, 0.35, 0.3, -0.6], L: [0.03, -0.035, 0.0] },
    // armas largas sin apuntar: en la mano derecha, a la altura de la cadera, con el cañón hacia
    // delante y abajo (la izquierda queda libre); al apuntar, culata al hombro y las dos manos
    shotgun: { ready: [-0.22, -0.36, 0.15, 0.42, 0.06, 0.05], aim: [-0.13, 0.155, 0.28, 0, 0.03, 0], load: [-0.07, -0.02, 0.27, 0.3, 0.35, -0.75], L: [0, -0.016, 0.3] },
    rifle: { ready: [-0.22, -0.36, 0.15, 0.42, 0.06, 0.05], aim: [-0.13, 0.155, 0.28, 0, 0.03, 0], load: [-0.08, 0.0, 0.27, 0.2, 0.3, -0.45], L: [0, -0.012, 0.3] },
    bow: { ready: [0.25, -0.3, 0.1, 0.35, 0, 0.1], aim: [0.04, 0.25, 0.5, 0, -0.04, -0.22], load: null, L: [0, 0, 0] }
  };
  const PRONE_GUN = [-0.16, 0.55, 0.12, -1.5, 0, 0];
  const RECOIL = { pistol: [0.06, 0.45], shotgun: [0.1, 0.58], rifle: [0.08, 0.38], bow: [0, 0] };
  const POLE_R = new THREE.Vector3(-0.5, -1, -0.25).normalize(), POLE_RA = new THREE.Vector3(-1, -0.35, -0.1).normalize();
  const POLE_L = new THREE.Vector3(0.45, -1, -0.2).normalize(), POLE_LA = new THREE.Vector3(0.25, -1, 0.1).normalize();
  const POLE_DRAW = new THREE.Vector3(-0.85, 0.1, 0.45).normalize();   // codo derecho hacia fuera, a la altura del hombro
  const POLE_BOW = new THREE.Vector3(0.6, -1, 0.1).normalize();
  const BOW_DRAW = 0.58;      // cuánto se tensa la cuerda (m): hasta la barbilla
  const _bm1 = new THREE.Matrix4(), _bm2 = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bq2 = new THREE.Quaternion();
  const _be = new THREE.Euler(0, 0, 0, 'YXZ'), _bp = new THREE.Vector3(), _bp2 = new THREE.Vector3(), _bs = new THREE.Vector3(), _bsh = new THREE.Vector3();
  const _pR = new THREE.Vector3(), _pL = new THREE.Vector3(), _poleR = new THREE.Vector3(), _poleL = new THREE.Vector3();
  const lerp6 = (a, b, k, out) => { for (let i = 0; i < 6; i++) out[i] = a[i] + (b[i] - a[i]) * k; return out; };
  const _T = [0, 0, 0, 0, 0, 0], _B = [0, 0, 0, 0, 0, 0];
  const win = (t, a, b) => U.smooth((t - a) / (b - a));      // 0 antes de a, 1 después de b

  function gunIK(h, s, gs) {
    const g = h.gun;
    if (!g) return;
    const G6 = GP[g.kind];
    const ai = s.climb != null ? 0 : U.smooth(c01(gs.aim));
    const T = lerp6(G6.ready, G6.aim, ai, _T);
    const rw = G6.load ? c01(gs.rw || 0) : 0;
    if (rw > 0) lerp6(T, G6.load, U.smooth(rw), T);
    const cyc = gs.cycle != null && gs.cycle >= 0 ? gs.cycle : -1;
    if (cyc >= 0 && g.kind !== 'bow') { const d = sin(Math.PI * cyc); T[1] -= 0.03 * d; T[3] += 0.12 * d; }
    T[3] += (s.pitch || 0) * 0.6 * ai;
    // culatazo / golpe con la pistola
    let bw = 0;
    if (s.action === 'bash') {
      const t = s.t;
      bw = win(t, 0, 0.12) * (1 - win(t, 0.8, 1));
      const wind = easeOut(t / 0.3), hit = easeIn((t - 0.28) / 0.17), back = U.smooth((t - 0.6) / 0.4);
      const f = hit * (1 - back);
      if (g.kind === 'pistol') {
        _B[0] = -0.2 + 0.14 * f; _B[1] = 0.3 * wind * (1 - hit) - 0.05 * f; _B[2] = 0.12 + 0.3 * f;
        _B[3] = -1.2 * wind * (1 - hit) + 1.0 * f; _B[4] = 0; _B[5] = 0;
      } else {
        _B[0] = -0.02; _B[1] = 0.06 + 0.04 * f; _B[2] = 0.16 - 0.05 * wind * (1 - hit) + 0.28 * f;
        _B[3] = 0; _B[4] = 1.3; _B[5] = 0;
      }
      lerp6(T, _B, bw, T);
    }
    const pr = U.smooth(c01(s.prone || 0));
    if (pr > 0) lerp6(T, PRONE_GUN, pr, T);

    // suavizado del soporte (el retroceso se suma después, para que sea seco)
    if (!h.gunT || !h.gunAnchorOk) { h.gunT = T.slice(); h.gunAnchorOk = true; }
    const k = s.dt != null ? 1 - Math.exp(-s.dt * 16) : 1;
    for (let i = 0; i < 6; i++) h.gunT[i] += (T[i] - h.gunT[i]) * k;
    const R = h.gunT, rc = RECOIL[g.kind], rec = (gs.recoil || 0) * (1 - pr);
    const an = h.gunAnchor;
    an.rotation.order = 'YXZ';
    an.position.set(R[0], R[1] + 0.02 * rec, R[2] - rc[0] * rec);
    an.rotation.set(R[3] - rc[1] * rec, R[4], R[5]);
    h.weapon.visible = s.action !== 'grab';
    // Arco apuntando: el arco se coloca en el espacio del personaje (no del pecho), con el brazo
    // izquierdo estirado desde el hombro hacia donde miras, aunque el torso esté girado de perfil
    if (g.kind === 'bow') {
      const wa = ai * (1 - bw) * (1 - pr);
      if (wa > 0.001) {
        h.root.updateMatrixWorld(true);
        const pt = s.pitch || 0;
        // hombro izquierdo en el espacio del personaje
        h.armL.getWorldPosition(_bsh);
        h.root.worldToLocal(_bsh);
        const dx = 0, dy = -Math.sin(pt), dz = Math.cos(pt);
        _bp.set(_bsh.x - 0.07 + dx * 0.6, _bsh.y + 0.07 + dy * 0.6, _bsh.z + dz * 0.6);
        _be.set(pt, 0.03, -0.16);
        _bq.setFromEuler(_be);
        _bm1.compose(_bp, _bq, _bs.set(1, 1, 1));
        _bm1.premultiply(h.root.matrixWorld);
        _bm2.copy(h.chest.matrixWorld).invert().multiply(_bm1);
        _bm2.decompose(_bp2, _bq2, _bs);
        an.position.lerp(_bp2, wa);
        an.quaternion.slerp(_bq2, wa);
      }
      // suavizado propio (el del resto de armas va en ángulos del pecho)
      if (!h.bowP) { h.bowP = an.position.clone(); h.bowQ = an.quaternion.clone(); }
      const kb = s.dt != null ? 1 - Math.exp(-s.dt * 18) : 1;
      h.bowP.lerp(an.position, kb); h.bowQ.slerp(an.quaternion, kb);
      an.position.copy(h.bowP); an.quaternion.copy(h.bowQ);
    } else if (h.bowP) { h.bowP = null; h.bowQ = null; }

    // piezas móviles
    if (g.kind === 'shotgun') {
      g.part.position.y = g.partRest - (cyc >= 0 ? 0.1 * sin(Math.PI * cyc) : 0);
    } else if (g.kind === 'rifle') {
      let rot = 0, back = 0;
      if (cyc >= 0) {
        const up = win(cyc, 0.18, 0.32) - win(cyc, 0.72, 0.84);
        const bk = win(cyc, 0.34, 0.52) - win(cyc, 0.54, 0.7);
        rot = up; back = bk;
      }
      rot = Math.max(rot, rw); back = Math.max(back, rw);
      g.part.rotation.y = -1.1 * rot;
      g.part.position.y = g.partRest - 0.08 * back;
    }
    let nockY = -0.07;
    if (g.kind === 'bow') {
      const draw = cyc >= 0 ? 0 : c01(gs.draw || 0);
      nockY = -0.07 - BOW_DRAW * draw;
      const p = g.string.geometry.attributes.position;
      p.setY(1, nockY); p.needsUpdate = true;
      g.arrow.visible = gs.arrow && (cyc < 0 || cyc > 0.8);
      g.arrow.position.y = nockY;
    }

    h.root.updateMatrixWorld(true);
    const hold = (x, y, z) => h.weapon.localToWorld(_pR.set(x, y, z));
    const chestP = (x, y, z, out) => h.chest.localToWorld(out.set(x, y, z));

    // ---- mano derecha
    let wR = 1, poleR = _poleR.copy(POLE_R).lerp(POLE_RA, g.kind === 'pistol' ? ai * 0.3 : ai).normalize();
    let tR;
    if (g.kind === 'bow') {
      wR = Math.max(ai, cyc >= 0 ? 1 : 0, bw);
      tR = hold(-0.015, 0, nockY);
      if (cyc >= 0) {
        const a = _v3.copy(tR);
        const ft = chestP(-0.14, 0.27, -0.06, _pL.clone());
        const qv = chestP(-0.12, 0.34, -0.2, _pL.clone());
        const rest = hold(-0.015, 0, -0.07).clone();
        let p = a.clone().lerp(ft, win(cyc, 0, 0.12));
        p.lerp(qv, win(cyc, 0.12, 0.45));
        p.lerp(rest, win(cyc, 0.45, 0.8));
        tR = _pR.copy(p);
      }
      poleR = _poleR.copy(POLE_DRAW);
    } else {
      tR = hold(0, 0, 0).clone();
      if (g.kind === 'rifle' && cyc >= 0) {
        const knob = g.part.localToWorld(_v3.set(-0.05, 0, 0.004)).clone();
        tR.lerp(knob, win(cyc, 0.04, 0.18) * (1 - win(cyc, 0.84, 0.98)));
      }
      if (g.kind === 'rifle' && rw > 0) {
        const u = gs.ru || 0;
        const pocket = chestP(-0.2, -0.3, 0.1, _v3.clone());
        const port = hold(0, 0.03, 0.04).clone();
        const toPocket = win(u, 0, 0.4) * (1 - win(u, 0.45, 0.85));
        tR.lerp(port.lerp(pocket, toPocket), U.smooth(rw));
      }
    }
    armIK(h, 'R', tR, poleR, wR);

    // ---- mano izquierda
    let wL = 1, tL;
    if (g.kind === 'bow') tL = hold(0, -0.01, 0).clone();
    else {
      tL = hold(G6.L[0], G6.L[1], G6.L[2] + (g.kind === 'shotgun' && cyc >= 0 ? -0.1 * sin(Math.PI * cyc) : 0)).clone();
      if (g.kind === 'pistol') {
        wL = Math.max(ai, rw);
        if (s.action === 'bash') wL *= 1 - bw;
        if (rw > 0) {
          const u = gs.ru || 0;
          const well = hold(0, -0.1, -0.04).clone();
          const pouch = chestP(0.14, -0.36, 0.12, _v3.clone());
          const slideA = hold(0, 0.045, -0.03).clone(), slideB = hold(0, 0.045, -0.1).clone();
          const p = tL.clone().lerp(well, win(u, 0, 0.14));
          p.lerp(pouch, win(u, 0.16, 0.38));
          p.lerp(well, win(u, 0.42, 0.62));
          p.lerp(slideA, win(u, 0.64, 0.74));
          p.lerp(slideB, win(u, 0.76, 0.84));
          p.lerp(tL, win(u, 0.86, 1));
          tL = p;
        }
      } else if (g.kind === 'shotgun' || g.kind === 'rifle') {
        // sin apuntar la larga va en una mano; la izquierda la agarra al apuntar, recargar, accionar o golpear
        wL = Math.max(ai, U.smooth(rw), cyc >= 0 ? 1 : 0, bw);
      }
      if (g.kind === 'shotgun' && rw > 0) {
        const u = gs.ru || 0;
        const belt = chestP(0.06, -0.33, 0.16, _v3.clone());
        const port = hold(0, -0.04, 0.06).clone();
        const p = tL.clone().lerp(belt, win(u, 0, 0.3) * U.smooth(rw));
        p.lerp(port, win(u, 0.4, 0.75) * U.smooth(rw));
        tL = p;
      }
      if (pr > 0.5) wL = 0;
    }
    const poleL = g.kind === 'bow' ? _poleL.copy(POLE_L).lerp(POLE_BOW, ai).normalize() : _poleL.copy(POLE_L).lerp(POLE_LA, ai).normalize();
    armIK(h, 'L', tL, poleL, wL);
    if (pr > 0.5 && g.kind === 'bow') { /* tumbado: el arco va en la mano izquierda igual */ }
  }

  // Ataques: t de 0 a 1, el golpe ocurre hacia t = 0.45.
  // Preparación rápida, golpe que acelera hasta el impacto y recuperación suave.
  function action(h, kind, t, two, s) {
    const wind = easeOut(t / 0.3);
    const hit = easeIn((t - 0.28) / 0.17);
    const back = U.smooth((t - 0.6) / 0.4);
    if (kind === 'swing2') {
      // golpe horizontal: giro de cadera y torso, con paso adelante
      const tw = -1.15 * wind + 2.15 * hit - 1.0 * back;
      h.hips.rotation.y = tw * 0.25;
      h.spine.rotation.y = tw * 0.35;
      h.chest.rotation.y = tw * 0.45;
      h.spine.rotation.x = 0.08 + 0.1 * hit * (1 - back);
      h.armR.rotation.x = -1.2 - 0.15 * wind * (1 - hit); h.armR.rotation.z = -0.3 + 0.25 * hit;
      h.foreR.rotation.x = -0.45 + 0.15 * hit;
      if (two) { h.armL.rotation.x = -1.15; h.armL.rotation.z = -0.6; h.foreL.rotation.x = -0.55; }
      else { h.armL.rotation.x = 0.3 * hit; h.armL.rotation.z = 0.35 * hit; }
      h.legL.rotation.x += -0.3 * hit * (1 - back);
      h.legR.rotation.x += 0.22 * hit * (1 - back);
      h.shinR.rotation.x += 0.2 * hit * (1 - back);
      h.toeR.rotation.x = -0.45 * hit * (1 - back);
      h.clavR.rotation.z = -0.22 * wind * (1 - hit); h.clavR.rotation.y = 0.25 * hit * (1 - back);
      if (two) h.clavL.rotation.y = -0.3 * hit * (1 - back);
    } else if (kind === 'swing1' || kind === 'floor') {
      // golpe de arriba abajo (o al suelo)
      const low = kind === 'floor';
      const up = -2.6 * wind;
      const down = (low ? 2.2 : 1.6) * hit;
      h.armR.rotation.x = -0.4 + up + down + 0.6 * back;
      h.armR.rotation.z = -0.3 * wind * (1 - hit);
      h.foreR.rotation.x = -0.95 * wind + 0.65 * hit;
      h.handR.rotation.x = 0.85 * hit * (1 - back * 0.6);
      h.spine.rotation.x = (low ? 0.55 : 0.14) * hit * (1 - back * 0.7) - 0.08 * wind * (1 - hit);
      h.chest.rotation.y = -0.4 * wind + 0.65 * hit * (1 - back);
      h.hips.rotation.y = -0.15 * wind + 0.25 * hit * (1 - back);
      if (two) { h.armL.rotation.x = h.armR.rotation.x; h.armL.rotation.z = -0.45; h.foreL.rotation.x = h.foreR.rotation.x - 0.3; }
      else { h.armL.rotation.x = -0.3 * wind + 0.4 * hit; h.armL.rotation.z = 0.2; }
      if (low) { h.legL.rotation.x = -0.5 * hit; h.shinL.rotation.x = 0.6 * hit; h.legR.rotation.x = 0.2 * hit; }
      else { h.legL.rotation.x += -0.2 * hit * (1 - back); }
    } else if (kind === 'swing2b') {
      // revés horizontal: el arma vuelve de izquierda a derecha cruzando el cuerpo
      const tw = 1.0 * wind - 2.0 * hit + 1.0 * back;
      h.hips.rotation.y = tw * 0.22;
      h.spine.rotation.y = tw * 0.35;
      h.chest.rotation.y = tw * 0.45;
      h.spine.rotation.x = 0.1 + 0.08 * hit * (1 - back);
      h.armR.rotation.x = -1.25 + 0.1 * hit; h.armR.rotation.z = 0.45 * wind * (1 - hit) - 0.55 * hit * (1 - back);
      h.foreR.rotation.x = -1.15 * wind * (1 - hit) - 0.35 * hit - 0.4 * back;
      h.handR.rotation.z = -0.4 * hit * (1 - back);
      if (two) { h.armL.rotation.x = -1.2; h.armL.rotation.z = -0.3; h.foreL.rotation.x = -0.7; }
      else { h.armL.rotation.x = -0.2 * wind; h.armL.rotation.z = 0.3 + 0.25 * hit; }
      h.clavR.rotation.y = 0.3 * wind * (1 - hit); h.clavR.rotation.z = -0.15 * hit * (1 - back);
      h.legR.rotation.x += -0.28 * hit * (1 - back); h.shinR.rotation.x += 0.15 * hit * (1 - back);
      h.legL.rotation.x += 0.18 * hit * (1 - back);
      h.toeL.rotation.x = -0.4 * hit * (1 - back);
    } else if (kind === 'swing1b') {
      // revés en diagonal hacia abajo, a una mano
      const tw = 0.9 * wind - 1.7 * hit + 0.8 * back;
      h.chest.rotation.y = tw * 0.5; h.spine.rotation.y = tw * 0.3; h.hips.rotation.y = tw * 0.18;
      h.armR.rotation.x = -1.9 * wind * (1 - hit) - 0.7 * hit - 0.2 * back;
      h.armR.rotation.z = 0.55 * wind * (1 - hit) - 0.45 * hit * (1 - back);
      h.foreR.rotation.x = -1.2 * wind * (1 - hit) - 0.25 * hit;
      h.handR.rotation.x = 0.6 * hit * (1 - back);
      h.spine.rotation.x = 0.06 + 0.16 * hit * (1 - back);
      h.armL.rotation.x = -0.35 * wind + 0.25 * hit; h.armL.rotation.z = 0.25;
      h.legR.rotation.x += -0.22 * hit * (1 - back);
    } else if (kind === 'overhead') {
      // golpe fuerte: levanta el arma por encima de la cabeza y la descarga con todo el cuerpo
      const wind2 = easeOut(t / 0.36);
      const hit2 = easeIn((t - 0.34) / 0.13);
      const up = wind2 * (1 - hit2), f = hit2 * (1 - back);
      h.armR.rotation.x = -0.6 - 2.35 * up - 0.15 * f + 0.3 * back; h.armR.rotation.z = -0.15 * up;
      h.foreR.rotation.x = -1.2 * up - 0.25 * f - 0.4 * back;
      h.handR.rotation.x = -0.4 * up + 0.9 * f;
      h.armL.rotation.x = h.armR.rotation.x; h.armL.rotation.z = -0.4; h.foreL.rotation.x = h.foreR.rotation.x - 0.3;
      h.spine.rotation.x = -0.2 * up + 0.5 * f + 0.1 * back;
      h.neck.rotation.x = 0.15 * up - 0.2 * f;
      h.clavL.rotation.z = 0.2 * up; h.clavR.rotation.z = -0.2 * up;
      h.clavL.rotation.y = -0.2 * f; h.clavR.rotation.y = 0.2 * f;
      h.hips.position.y -= 0.07 * f;
      h.legL.rotation.x += -0.55 * f - 0.15 * up; h.shinL.rotation.x += 0.45 * f;
      h.legR.rotation.x += 0.35 * f; h.shinR.rotation.x += 0.3 * f; h.toeR.rotation.x = -0.55 * f;
    } else if (kind === 'slash') {
      // tajo de revés con el cuchillo
      const tw = 0.8 * wind - 1.6 * hit + 0.8 * back;
      h.chest.rotation.y = tw * 0.5; h.spine.rotation.y = tw * 0.3;
      h.armR.rotation.x = -1.3 + 0.1 * hit; h.armR.rotation.z = 0.65 * wind * (1 - hit) - 0.7 * hit * (1 - back);
      h.foreR.rotation.x = -1.4 * wind * (1 - hit) - 0.2 * hit - 0.5 * back;
      h.handR.rotation.y = 0.5 * wind * (1 - hit) - 0.6 * hit * (1 - back);
      h.armL.rotation.x = -0.6; h.foreL.rotation.x = -1.2; h.armL.rotation.z = 0.2;
      h.spine.rotation.x = 0.12 + 0.1 * hit * (1 - back);
      h.legL.rotation.x += -0.2 * hit * (1 - back);
    } else if (kind === 'stab') {
      h.armR.rotation.x = -0.3 * (1 - hit) - 1.45 * hit * (1 - back) - 0.3 * back;
      h.foreR.rotation.x = -1.7 * wind * (1 - hit) - 0.15 * hit;
      h.handR.rotation.x = 0.75 * hit * (1 - back);
      h.chest.rotation.y = -0.35 * wind + 0.5 * hit * (1 - back);
      h.spine.rotation.x = 0.18 * hit * (1 - back);
      h.legL.rotation.x += -0.25 * hit * (1 - back);
      if (two) { h.armL.rotation.x = h.armR.rotation.x + 0.1; h.armL.rotation.z = -0.4; h.foreL.rotation.x = h.foreR.rotation.x; }
    } else if (kind === 'thrust') {
      const f = hit * (1 - back);
      h.armR.rotation.x = -1.2 - 0.35 * f + 0.2 * wind * (1 - hit); h.armR.rotation.z = -0.1;
      h.foreR.rotation.x = -0.9 * (1 - f) - 0.1;
      h.armL.rotation.x = -1.1 - 0.4 * f; h.armL.rotation.z = -0.45;
      h.foreL.rotation.x = -0.9 * (1 - f) - 0.2;
      h.spine.rotation.x = 0.22 * f - 0.08 * wind * (1 - hit);
      h.legL.rotation.x = -0.55 * f; h.legR.rotation.x = 0.35 * f;
    } else if (kind === 'shove') {
      const f = hit * (1 - back);
      for (const A of ['L', 'R']) {
        h['arm' + A].rotation.x = -0.6 - 0.95 * f;
        h['arm' + A].rotation.z = A === 'L' ? -0.15 : 0.15;
        h['fore' + A].rotation.x = -1.35 * (1 - f) - 0.1;
      }
      h.spine.rotation.x = 0.28 * f - 0.05 * wind * (1 - hit);
      h.legL.rotation.x = -0.5 * f; h.shinL.rotation.x = 0.2 * f;
      h.clavL.rotation.y = -0.35 * f; h.clavR.rotation.y = 0.35 * f;
      h.toeR.rotation.x = -0.4 * f;
    } else if (kind === 'finisher') {
      // remate: se arrodilla junto al zombi caído, levanta el arma y golpea hacia el suelo
      const kneel = U.smooth(t / 0.18) * (1 - U.smooth((t - 0.8) / 0.2));
      const raise = easeOut((t - 0.15) / 0.25);
      const smash = easeIn((t - 0.42) / 0.12);
      const rec = U.smooth((t - 0.66) / 0.2);
      h.hips.position.y -= 0.44 * kneel;
      h.legL.rotation.x = -1.35 * kneel; h.shinL.rotation.x = 1.45 * kneel; h.footL.rotation.x = -0.1 * kneel;
      h.legR.rotation.x = 0.25 * kneel; h.shinR.rotation.x = 1.9 * kneel; h.footR.rotation.x = 0.6 * kneel;
      h.toeR.rotation.x = -0.9 * kneel;
      h.clavR.rotation.z = -0.25 * raise * (1 - smash); h.clavR.rotation.y = 0.3 * smash * (1 - rec);
      let ax = U.lerp(-0.4, -3.0, raise);
      ax = U.lerp(ax, -0.5, smash);
      ax = U.lerp(ax, -0.6, rec);
      h.armR.rotation.x = ax; h.armR.rotation.z = -0.2 * raise * (1 - smash);
      h.foreR.rotation.x = U.lerp(U.lerp(-0.3, -0.85, raise), -0.1, smash);
      h.handR.rotation.x = 0.9 * smash * (1 - rec);
      h.spine.rotation.x = 0.28 * kneel + 0.5 * smash * (1 - rec) - 0.18 * raise * (1 - smash);
      h.chest.rotation.y = -0.3 * raise * (1 - smash);
      h.neck.rotation.x = 0.25 * kneel;
      if (two) { h.armL.rotation.x = ax; h.armL.rotation.z = -0.45; h.foreL.rotation.x = h.foreR.rotation.x - 0.3; }
      else { h.armL.rotation.x = -0.3 * kneel; h.armL.rotation.z = 0.3 * kneel; h.foreL.rotation.x = -0.9 * kneel; }
    } else if (kind === 'runatk' || kind === 'runshove') {
      // ataque en carrera: impulso hacia delante, el brazo izquierdo por delante y el arma
      // arriba detrás de la cabeza; golpe de arriba abajo al llegar y recuperación a trompicones
      const lean = U.smooth(t / 0.12) * (1 - U.smooth((t - 0.6) / 0.4));
      const up = easeOut(t / 0.24) * (1 - easeIn((t - 0.24) / 0.18));
      const f = easeIn((t - 0.24) / 0.18) * (1 - U.smooth((t - 0.55) / 0.45));
      h.spine.rotation.x += 0.3 * lean + 0.35 * f;
      h.hips.position.y -= 0.06 * lean + 0.08 * f;
      // zancada: la izquierda delante, la derecha empuja atrás
      h.legL.rotation.x = -0.9 * lean; h.shinL.rotation.x = 0.7 * lean;
      h.legR.rotation.x = 0.55 * lean; h.shinR.rotation.x = 0.5 * lean + 0.4 * up; h.toeR.rotation.x = -0.6 * lean;
      h.footL.rotation.x = -0.2 * lean;
      if (kind === 'runshove') {
        // placaje con el hombro
        h.spine.rotation.x += 0.25 * (up + f);
        h.armL.rotation.x = -1.2 * lean; h.armR.rotation.x = -1.25 * lean;
        h.armL.rotation.z = -0.25 * lean; h.armR.rotation.z = 0.25 * lean;
        h.foreL.rotation.x = -1.5 * lean + 0.9 * f; h.foreR.rotation.x = -1.5 * lean + 0.9 * f;
        h.clavL.rotation.y = -0.35 * f; h.clavR.rotation.y = 0.35 * f;
        h.chest.rotation.y = -0.3 * up + 0.2 * f;
      } else {
        h.chest.rotation.y = -0.5 * up + 0.55 * f;
        h.spine.rotation.y = -0.2 * up + 0.25 * f;
        // brazo derecho: arriba detrás de la cabeza y abajo con fuerza
        h.armR.rotation.x = -0.5 - 2.3 * up + 0.2 * f;
        h.armR.rotation.z = -0.35 * up;
        h.foreR.rotation.x = -1.3 * up - 0.25 * f;
        h.handR.rotation.x = -0.3 * up + 0.85 * f;
        h.clavR.rotation.z = -0.25 * up; h.clavR.rotation.y = 0.3 * f;
        if (two) { h.armL.rotation.x = h.armR.rotation.x; h.armL.rotation.z = -0.45; h.foreL.rotation.x = h.foreR.rotation.x - 0.3; }
        else {
          // el izquierdo se lanza adelante (como para agarrar) y luego tira hacia abajo
          h.armL.rotation.x = -1.55 * up * lean - 0.5 * f; h.armL.rotation.z = -0.25 * up;
          h.foreL.rotation.x = -0.25 * up - 0.9 * f;
          h.clavL.rotation.y = -0.3 * up;
        }
      }
    } else if (kind === 'bash') {
      // culatazo: paso adelante y empuje con el cuerpo (las manos las pone el IK del arma)
      const f = hit * (1 - back);
      h.spine.rotation.x += 0.22 * f - 0.08 * wind * (1 - hit);
      h.chest.rotation.y += -0.25 * wind * (1 - hit) + 0.2 * f;
      h.legL.rotation.x += -0.45 * f; h.shinL.rotation.x += 0.25 * f;
      h.legR.rotation.x += 0.2 * f; h.toeR.rotation.x = -0.4 * f;
    } else if (kind === 'grab') {
      // agarre por la espalda: rodillas dobladas, el cuerpo tira hacia atrás
      const k = win(t, 0, 0.12) * (1 - win(t, 0.86, 1));
      const pull = sin(t * 23) * 0.05 * (1 - win(t, 0.55, 0.8));
      h.hips.position.y -= 0.12 * k;
      h.legL.rotation.x -= 0.5 * k; h.shinL.rotation.x += 0.6 * k;
      h.legR.rotation.x += 0.15 * k; h.shinR.rotation.x += 0.5 * k; h.toeR.rotation.x -= 0.4 * k;
      h.spine.rotation.x += (-0.14 + pull) * k;
      h.chest.rotation.y += pull * 2 * k;
      h.neck.rotation.x += 0.15 * k;
      h.hips.rotation.z += pull * k;
    } else if (kind === 'search') {
      // registrar: agachado ante un mueble bajo o de pie ante uno alto; las manos rebuscan
      const k = win(t, 0, 0.15) * (1 - win(t, 0.88, 1));
      const low = s && s.searchLow;
      const r1 = sin(t * 26), r2 = sin(t * 26 + 2.1);
      const dig = (1 - win(t, 0.78, 0.88));
      if (low) {
        h.hips.position.y -= 0.42 * k;
        h.legL.rotation.x -= 1.35 * k; h.shinL.rotation.x += 1.9 * k; h.footL.rotation.x -= 0.5 * k;
        h.legR.rotation.x -= 0.5 * k; h.shinR.rotation.x += 2.1 * k; h.footR.rotation.x += 0.3 * k; h.toeR.rotation.x -= 0.8 * k;
        h.spine.rotation.x += 0.55 * k;
        h.armL.rotation.x = U.lerp(h.armL.rotation.x, -0.9 + 0.25 * r1 * dig, k); h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -0.5 - 0.3 * r2 * dig, k);
        h.armR.rotation.x = U.lerp(h.armR.rotation.x, -0.95 + 0.25 * r2 * dig, k); h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -0.5 - 0.3 * r1 * dig, k);
      } else {
        h.spine.rotation.x += 0.12 * k;
        h.armL.rotation.x = U.lerp(h.armL.rotation.x, -1.25 + 0.2 * r1 * dig, k); h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -0.9 - 0.3 * r2 * dig, k);
        h.armR.rotation.x = U.lerp(h.armR.rotation.x, -1.3 + 0.2 * r2 * dig, k); h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -0.9 - 0.3 * r1 * dig, k);
      }
      h.armL.rotation.z = U.lerp(h.armL.rotation.z, -0.15, k); h.armR.rotation.z = U.lerp(h.armR.rotation.z, 0.15, k);
      h.neck.rotation.x += 0.35 * k; h.head.rotation.x += 0.15 * k;
      h.clavL.rotation.y -= 0.2 * k; h.clavR.rotation.y += 0.2 * k;
    } else if (kind === 'bandage') {
      // vendarse: el antebrazo izquierdo cruzado delante y la mano derecha dando vueltas con la venda
      const k = win(t, 0, 0.12) * (1 - win(t, 0.9, 1));
      const r1 = sin(t * 34), r2 = cos(t * 34);
      h.spine.rotation.x += 0.18 * k; h.neck.rotation.x += 0.45 * k; h.head.rotation.x += 0.15 * k;
      h.armL.rotation.x = U.lerp(h.armL.rotation.x, -0.8, k); h.armL.rotation.z = U.lerp(h.armL.rotation.z, -0.42, k);
      h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -1.45, k);
      h.armR.rotation.x = U.lerp(h.armR.rotation.x, -0.85 + 0.16 * r1, k); h.armR.rotation.z = U.lerp(h.armR.rotation.z, 0.38 + 0.08 * r2, k);
      h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -1.25 + 0.22 * r2, k);
      h.clavL.rotation.y -= 0.15 * k; h.clavR.rotation.y += 0.25 * k;
    } else if (kind === 'punch1' || kind === 'punch2') {
      // gancho (1 = derecha, 2 = izquierda): carga girando el torso hacia el lado del puño,
      // descarga girando hacia el otro con el peso adelante, y vuelve a la guardia
      const sg = kind === 'punch1' ? 1 : -1;
      const w = easeOut(t / 0.3), f = easeIn((t - 0.28) / 0.14), b = U.smooth((t - 0.56) / 0.44);
      const tw = sg * (-0.35 * w + 1.0 * f) * (1 - b);
      h.hips.rotation.y += tw * 0.35; h.spine.rotation.y += tw * 0.4; h.chest.rotation.y += tw * 0.5;
      h.spine.rotation.x += 0.06 * w * (1 - f) + 0.16 * f * (1 - b);
      h.spine.rotation.z += -sg * 0.1 * f * (1 - b) + sg * 0.05 * w * (1 - f);
      h.hips.position.y -= 0.03 * (w + f) * (1 - b);
      h.clavR.rotation.y += (sg > 0 ? -0.15 * w * (1 - f) + 0.3 * f * (1 - b) : 0);
      h.clavL.rotation.y += (sg < 0 ? 0.15 * w * (1 - f) - 0.3 * f * (1 - b) : 0);
      // pie de atrás que empuja y gira
      const back = sg > 0 ? 'R' : 'L', front = sg > 0 ? 'L' : 'R';
      h['toe' + back].rotation.x -= 0.45 * f * (1 - b);
      h['leg' + back].rotation.x += 0.12 * f * (1 - b);
      h['leg' + front].rotation.x -= 0.18 * f * (1 - b); h['shin' + front].rotation.x += 0.14 * f * (1 - b);
      h.neck.rotation.x -= 0.05 * f * (1 - b);
    } else if (kind === 'punch3') {
      // golpe fuerte: se agacha y se aparta (esquiva), sube girando con todo el cuerpo y descarga
      // de arriba abajo; termina muy inclinado hacia delante por la inercia
      const duck = U.smooth(t / 0.28) * (1 - U.smooth((t - 0.34) / 0.14));
      const f = easeIn((t - 0.36) / 0.16);
      const fol = f * (1 - U.smooth((t - 0.66) / 0.34));
      const tw = (-0.6 * duck + 0.85 * fol);
      h.hips.rotation.y += tw * 0.35; h.spine.rotation.y += tw * 0.4; h.chest.rotation.y += tw * 0.5;
      h.hips.position.y -= 0.15 * duck + 0.07 * fol;
      const post = U.smooth((t - 0.5) / 0.14) * (1 - U.smooth((t - 0.7) / 0.3));
      h.spine.rotation.x += 0.32 * duck + 0.14 * f * (1 - post) + 0.5 * post;
      h.spine.rotation.z += 0.16 * duck - 0.1 * fol;
      h.neck.rotation.x -= 0.28 * duck + 0.2 * fol;
      h.legL.rotation.x -= 0.55 * duck + 0.55 * fol; h.shinL.rotation.x += 0.85 * duck + 0.5 * fol;
      h.legR.rotation.x -= 0.25 * duck - 0.38 * fol; h.shinR.rotation.x += 0.75 * duck + 0.2 * fol;
      h.footL.rotation.x -= 0.2 * duck;
      h.toeR.rotation.x -= 0.6 * fol;
      h.clavR.rotation.y += -0.2 * duck + 0.38 * fol; h.clavR.rotation.z -= 0.12 * f * (1 - fol * 0.5);
    } else if (kind === 'stomp') {
      const lift = wind * (1 - hit);
      h.legR.rotation.x = -1.25 * lift - 0.3 * hit * (1 - back);
      h.shinR.rotation.x = 1.35 * lift + 0.1;
      h.footR.rotation.x = 0.3 * lift;
      h.spine.rotation.x = 0.28 * (wind + hit) * (1 - back);
      h.armL.rotation.z = 0.5 * wind * (1 - back); h.armR.rotation.z = -0.5 * wind * (1 - back);
      h.legL.rotation.x = 0.15 * lift; h.shinL.rotation.x = 0.35 * lift;
    }
  }

  // Pose del zombi
  function poseZombie(h, s) {
    reset(h);
    const t = s.time || 0, seed = s.seed || 0;
    const spr = s.sprint || 0;
    legs(h, s.phase, spr > 0.3 ? Math.max(s.amt, spr) : s.amt, spr > 0.3, s.drag);
    // paso torpe: la cadera se tuerce y el torso se balancea
    const sw = sin(s.phase * 0.5 + seed);
    h.hips.rotation.z += sin(s.phase) * 0.08 * s.amt;
    h.spine.rotation.z = sw * 0.07 + s.lean;
    h.spine.rotation.x = 0.14 + 0.05 * sin(s.phase * 2) * s.amt;
    h.neck.rotation.z = 0.25 * s.tilt + sw * 0.05;
    h.neck.rotation.y = sin(t * 0.8 + seed) * 0.18;
    h.head.rotation.x = 0.2 + sin(t * 1.3 + seed * 2) * 0.05;
    // brazos: colgando al vagar, hacia delante al perseguir
    const up = s.chase ? 1 : s.armsUp;
    const lag = sin(s.phase - 0.6);
    h.armL.rotation.x = -0.15 - 1.15 * up + lag * 0.16 + sin(t * 1.1 + seed) * 0.05;
    h.armR.rotation.x = -0.15 - 1.05 * up - lag * 0.16 + sin(t * 1.3 + seed) * 0.05;
    h.armL.rotation.z = 0.12 + 0.05 * sw; h.armR.rotation.z = -0.12 + 0.05 * sw;
    h.foreL.rotation.x = -0.25 - 0.2 * up - 0.1 * max(0, lag);
    h.foreR.rotation.x = -0.3 - 0.2 * up - 0.1 * max(0, -lag);
    if (s.reach > 0) {
      const r = s.reach;
      h.armL.rotation.x = U.lerp(h.armL.rotation.x, -1.55, r);
      h.armR.rotation.x = U.lerp(h.armR.rotation.x, -1.5, r);
      h.armL.rotation.z = -0.15 * r; h.armR.rotation.z = 0.15 * r;
      h.foreL.rotation.x = -0.1; h.foreR.rotation.x = -0.1;
      h.spine.rotation.x = 0.14 + 0.38 * r;
      h.head.rotation.x = 0.35 * r;
    }
    // corredor: carrera encorvada, brazos que se agitan y cabeza adelantada
    if (spr > 0.01) {
      const k = spr, q = sin(s.phase);
      h.spine.rotation.x = U.lerp(h.spine.rotation.x, 0.55, k);
      h.neck.rotation.x -= 0.3 * k; h.head.rotation.x = U.lerp(h.head.rotation.x, -0.15, k);
      h.armL.rotation.x = U.lerp(h.armL.rotation.x, -0.7 + q * 0.9, k); h.armR.rotation.x = U.lerp(h.armR.rotation.x, -0.7 - q * 0.9, k);
      h.armL.rotation.z = U.lerp(h.armL.rotation.z, 0.45, k); h.armR.rotation.z = U.lerp(h.armR.rotation.z, -0.45, k);
      h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -1.1 - 0.3 * max(0, q), k); h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, -1.1 - 0.3 * max(0, -q), k);
      h.chest.rotation.y += -q * 0.25 * k;
    }
    // ataque (como en los juegos de referencia): se encoge con las garras arriba y atrás, y se lanza
    // con el cuerpo por delante y los brazos estirados para agarrarte
    if (s.atk != null) {
      const a = s.atk;
      const load = U.smooth(Math.min(1, a / 0.6)) * (1 - U.smooth((a - 0.68) / 0.22));
      const go = U.smooth((a - 0.66) / 0.3);
      h.spine.rotation.x = 0.12 - 0.12 * load + 0.62 * go;
      h.neck.rotation.x = -0.25 * load - 0.1 * go; h.head.rotation.x = 0.1 + 0.2 * go;
      h.hips.position.y -= 0.09 * load + 0.04 * go;
      h.legL.rotation.x += -0.3 * load - 0.6 * go; h.shinL.rotation.x += 0.45 * load + 0.35 * go;
      h.legR.rotation.x += 0.15 * load + 0.45 * go; h.shinR.rotation.x += 0.35 * load + 0.15 * go; h.toeR.rotation.x -= 0.5 * go;
      const wt = Math.min(1, load + go);
      h.armL.rotation.x = U.lerp(h.armL.rotation.x, U.lerp(-2.05, -1.6, go), wt);
      h.armR.rotation.x = U.lerp(h.armR.rotation.x, U.lerp(-2.2, -1.5, go), wt);
      h.armL.rotation.z = U.lerp(h.armL.rotation.z, U.lerp(0.55, -0.1, go), wt);
      h.armR.rotation.z = U.lerp(h.armR.rotation.z, U.lerp(-0.6, 0.1, go), wt);
      h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, U.lerp(-1.3, -0.15, go), wt);
      h.foreR.rotation.x = U.lerp(h.foreR.rotation.x, U.lerp(-1.4, -0.2, go), wt);
      h.chest.rotation.y += -0.25 * load + 0.2 * go;
    }
    // tras lanzarse: el brazo derecho barre hacia abajo cruzando el cuerpo; si te alcanzó, el izquierdo
    // se queda agarrado a tu hombro un momento; luego se recupera
    if (s.strike != null) {
      const k = s.strike;
      const sw = U.smooth(k / 0.35) * (1 - U.smooth((k - 0.55) / 0.45));
      const rec = 1 - U.smooth(k);
      h.spine.rotation.x = U.lerp(h.spine.rotation.x, 0.5, rec);
      h.armR.rotation.x = U.lerp(-1.5, -0.45, sw); h.armR.rotation.z = U.lerp(0.1, 0.55, sw);
      h.foreR.rotation.x = -0.25 - 0.4 * sw;
      h.chest.rotation.y += 0.45 * sw; h.spine.rotation.y += 0.15 * sw;
      if (s.strikeHit) {
        const g = 1 - U.smooth((k - 0.45) / 0.35);
        h.armL.rotation.x = U.lerp(h.armL.rotation.x, -1.45, g); h.armL.rotation.z = U.lerp(h.armL.rotation.z, -0.15, g);
        h.foreL.rotation.x = U.lerp(h.foreL.rotation.x, -0.7, g);
      } else {
        // falló: el impulso lo lleva un paso de más
        h.legL.rotation.x -= 0.4 * rec; h.shinL.rotation.x += 0.3 * rec;
      }
      h.legR.rotation.x += 0.3 * rec; h.toeR.rotation.x -= 0.4 * rec;
    }
    // corredor que te acaba de ver: se yergue, echa la cabeza atrás y chilla
    if (s.alert > 0) {
      const k = sin(Math.PI * Math.min(1, s.alert));
      const sh = sin(t * 45) * 0.06 * k;
      h.spine.rotation.x = U.lerp(h.spine.rotation.x, -0.2, k);
      h.neck.rotation.x = -0.45 * k + sh; h.head.rotation.x = -0.35 * k;
      h.armL.rotation.z = 0.9 * k; h.armR.rotation.z = -0.9 * k;
      h.armL.rotation.x = -0.5 * k; h.armR.rotation.x = -0.5 * k;
      h.foreL.rotation.x = -1.2 * k; h.foreR.rotation.x = -1.2 * k;
    }
    if (s.bang) {
      const b = max(0, sin(s.bang * 9));
      h.armL.rotation.x = -1.4 - 0.4 * b; h.armR.rotation.x = -1.4 - 0.4 * max(0, sin(s.bang * 9 + 1.5));
      h.spine.rotation.x = 0.25 + 0.08 * b;
    }
    // reacción a un golpe: un tirón seco en cabeza y torso que vuelve como un resorte, encima del
    // cuerpo que trastabilla (pasos cortos, rodillas que ceden) según el tipo de golpe
    if (s.stagger > 0) {
      const u = Math.min(1, s.stagger), e = u * (s.reactDur || 0.55);
      const pk = e < 0.06 ? U.smooth(e / 0.06) : Math.exp(-(e - 0.06) * 6) * Math.cos((e - 0.06) * 9);
      const env = sin(Math.PI * Math.pow(u, 0.7));
      const stp = sin(u * Math.PI * 3) * env;
      const fl = s.flinch || 1;
      const L = (r, v, k) => { r.x = U.lerp(r.x, v, k); };
      switch (s.react) {
        case 'side':
          h.neck.rotation.z += fl * 0.55 * pk; h.head.rotation.z += fl * 0.3 * pk; h.head.rotation.y -= fl * 0.5 * pk;
          h.chest.rotation.y -= fl * 0.45 * pk; h.spine.rotation.z += fl * 0.38 * env; h.spine.rotation.x += 0.22 * env;
          h.armL.rotation.z += 0.75 * env; h.armR.rotation.z -= 0.75 * env;
          L(h.armL.rotation, -0.35, env); L(h.armR.rotation, -0.35, env);
          h.hips.position.y -= 0.07 * env; h.hips.rotation.z += fl * 0.12 * env;
          h.legL.rotation.x += 0.35 * stp; h.legR.rotation.x -= 0.35 * stp;
          h.shinL.rotation.x += 0.45 * max(0, stp); h.shinR.rotation.x += 0.45 * max(0, -stp);
          h.legL.rotation.z -= fl * 0.12 * env; h.legR.rotation.z -= fl * 0.12 * env;
          break;
        case 'heavy':
          h.neck.rotation.x -= 0.7 * pk; h.head.rotation.x -= 0.45 * pk; h.spine.rotation.z += fl * 0.15 * pk;
          h.spine.rotation.x = U.lerp(h.spine.rotation.x, -0.5, env);
          L(h.armL.rotation, -2.3, env); L(h.armR.rotation, -2.0, env);
          h.armL.rotation.z += 0.55 * env; h.armR.rotation.z -= 0.55 * env;
          L(h.foreL.rotation, -0.6, env); L(h.foreR.rotation, -0.7, env);
          h.hips.position.y -= 0.05 * env;
          h.legL.rotation.x += 0.55 * stp; h.legR.rotation.x -= 0.55 * stp;
          h.shinL.rotation.x += 0.5 * max(0, -stp); h.shinR.rotation.x += 0.5 * max(0, stp);
          break;
        case 'vert':
          h.neck.rotation.x += 0.55 * pk; h.head.rotation.x += 0.3 * pk;
          h.spine.rotation.x += 0.6 * env; h.spine.rotation.z += fl * 0.12 * pk;
          h.hips.position.y -= 0.2 * env;
          h.legL.rotation.x -= 0.6 * env; h.legR.rotation.x -= 0.45 * env;
          h.shinL.rotation.x += 1.0 * env; h.shinR.rotation.x += 0.9 * env;
          h.footL.rotation.x -= 0.3 * env; h.footR.rotation.x -= 0.3 * env;
          L(h.armL.rotation, 0.1, env); L(h.armR.rotation, 0.05, env);
          break;
        case 'stab':
          h.spine.rotation.x += 0.55 * env; h.neck.rotation.x += 0.3 * pk;
          L(h.armL.rotation, -0.7, env); L(h.foreL.rotation, -1.5, env);
          L(h.armR.rotation, -0.6, env); L(h.foreR.rotation, -1.4, env);
          h.hips.position.y -= 0.06 * env;
          h.legL.rotation.x += 0.2 * stp; h.legR.rotation.x -= 0.2 * stp;
          break;
        case 'wall':
          // latigazo contra la pared: la cabeza va adelante y las rodillas ceden
          h.neck.rotation.x += 0.55 * pk; h.head.rotation.x += 0.25 * pk;
          h.spine.rotation.x += 0.3 * env; h.hips.position.y -= 0.12 * env;
          h.shinL.rotation.x += 0.5 * env; h.shinR.rotation.x += 0.4 * env; h.legL.rotation.x -= 0.3 * env; h.legR.rotation.x -= 0.2 * env;
          L(h.armL.rotation, -0.1, env); L(h.armR.rotation, -0.1, env);
          h.armL.rotation.z += 0.3 * env; h.armR.rotation.z -= 0.3 * env;
          break;
        default:      // empujón, culatazo o disparo: se echa atrás con los brazos abiertos
          h.neck.rotation.x -= 0.45 * pk; h.spine.rotation.z += fl * 0.2 * pk;
          h.spine.rotation.x = U.lerp(h.spine.rotation.x, -0.35, env);
          h.armL.rotation.z += 0.75 * env; h.armR.rotation.z -= 0.75 * env;
          L(h.armL.rotation, -0.6, env); L(h.armR.rotation, -0.6, env);
          h.head.rotation.x -= 0.25 * env;
          h.legL.rotation.x += 0.4 * stp; h.legR.rotation.x -= 0.4 * stp;
      }
    }
    if (s.grabbed != null) {
      // agarrado por la espalda: forcejea con los brazos hacia atrás y la cabeza echada atrás; al final se afloja
      const g = s.grabbed, fade = 1 - win(g, 0.5, 0.8) * 0.85, limp = win(g, 0.72, 0.95);
      const f1 = sin(t * 13 + seed), f2 = sin(t * 11 + 1.3 + seed);
      h.armL.rotation.x = U.lerp(-2.0 + 0.5 * f1 * fade, -0.3, limp); h.armL.rotation.z = U.lerp(0.5 + 0.25 * f2 * fade, 0.15, limp);
      h.armR.rotation.x = U.lerp(-1.8 + 0.5 * f2 * fade, -0.3, limp); h.armR.rotation.z = U.lerp(-0.5 - 0.25 * f1 * fade, -0.15, limp);
      h.foreL.rotation.x = U.lerp(-1.0, -0.2, limp); h.foreR.rotation.x = U.lerp(-1.1, -0.2, limp);
      h.spine.rotation.x = U.lerp(-0.22, 0.3, limp); h.neck.rotation.x = U.lerp(-0.35, 0.5, limp);
      h.head.rotation.x = U.lerp(-0.25 + 0.12 * f1 * fade, 0.4, limp); h.neck.rotation.z = 0.15 * f2 * fade;
      h.legL.rotation.x = -0.15 + 0.3 * f1 * fade; h.shinL.rotation.x = 0.45;
      h.legR.rotation.x = 0.3 * f2 * fade; h.shinR.rotation.x = 0.35 + 0.3 * limp;
      h.hips.position.y -= 0.1 + 0.1 * limp;
    }
    // garras: dedos medio cerrados; se abren al estirarse para agarrar
    const claw = 0.65 + 0.15 * sin(t * 2 + seed) - 0.45 * (s.reach || 0) * (1 - max(0, (s.reach || 0) - 0.85) * 6);
    h.fingL.rotation.z = -claw; h.fingR.rotation.z = claw;
    // hombros: hacia delante al estirar los brazos
    const reachUp = Math.max(s.chase ? 0.6 : (s.armsUp || 0), s.reach || 0);
    h.clavL.rotation.y = -0.28 * reachUp; h.clavR.rotation.y = 0.28 * reachUp;
    h.clavL.rotation.z = 0.06 * sw; h.clavR.rotation.z = 0.06 * sw;
    distributeSpine(h);
    blend(h, s.dt, (s.stagger > 0 || s.reach > 0.2 || s.grabbed != null) ? 22 : 9);
    // espasmos (después de suavizar, para que sean secos)
    const tw = s.twitch || 0;
    if (tw > 0.01) {
      const j = tw * tw, jit = sin(t * 57 + seed) * 0.07 * j;
      switch (s.twitchKind | 0) {
        case 0: h.neck.rotation.z += 0.5 * j + jit; h.head.rotation.x -= 0.35 * j; break;          // cabeza a un lado
        case 1: h.clavL.rotation.z += 0.4 * j; h.armL.rotation.z += 0.35 * j + jit; break;          // hombro que se encoge
        case 2: h.neck.rotation.y += 0.7 * j; h.head.rotation.z -= 0.35 * j + jit; break;           // giro brusco de cabeza
        default: h.spine2.rotation.z -= 0.18 * j; h.chest.rotation.y += 0.3 * j; h.clavR.rotation.z -= 0.35 * j + jit; // sacudida del torso
      }
    }
  }

  // Tumbado: f de 0 (de pie) a 1 (en el suelo). dir = -1 de espaldas, 1 boca abajo
  function poseFall(h, f, dir) {
    const a = dir * Math.PI / 2 * U.smooth(f);
    h.body.rotation.x = a;
    h.body.position.y = 0.12 * U.smooth(f);
    h.body.position.z = 0;
    if (f > 0.5) {
      h.armL.rotation.z = 0.6; h.armR.rotation.z = -0.5;
      h.armL.rotation.x = dir > 0 ? -0.2 : 0.3; h.armR.rotation.x = dir > 0 ? -0.3 : 0.2;
      h.legL.rotation.z = 0.12; h.legR.rotation.z = -0.1;
      h.head.rotation.y = 0.4;
    }
  }

  // ---------- Armas (modelos) ----------
  const geoCache = {};
  // Pieza blanda de la mochila: secciones superelípticas [y, ancho, fondo, forma] centradas en (cx, cz)
  function bagLoft(m, T, cx, cz, N, dy, col, Y, capA, capB) {
    const rings = [];
    const y0 = T[0][0], y1 = T[T.length - 1][0];
    const n = Math.max(2, Math.round((y1 - y0) / dy));
    for (let k = 0; k <= n; k++) {
      const y = y0 + (y1 - y0) * k / n;
      const [w, d, e] = curve(T, y);
      const r = [];
      for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), q = 2 / e;
        const x = cx + w * Math.sign(c) * Math.pow(Math.abs(c), q), z = cz + d * Math.sign(s) * Math.pow(Math.abs(s), q);
        r.push({ p: [x, y + Y, z], c: col(x, y, z), w: null });
      }
      rings.push(r);
    }
    const cap = (y) => ({ p: [cx, y + Y, cz], c: col(cx, y, cz), w: null });
    surface(m, rings, capA != null ? cap(capA) : null, capB != null ? cap(capB) : null);
  }

  // Cinta de sección rectangular que sigue un camino [y, z] en el plano x (correas)
  function ribbon(m, x, path, wd, th, hex, Y) {
    const c = G.Mesher.lin(hex), col = [c.r, c.g, c.b];
    const F = path.map((p, i) => {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      let ty = b[0] - a[0], tz = b[1] - a[1];
      const l = Math.hypot(ty, tz) || 1; ty /= l; tz /= l;
      // normal hacia afuera del cuerpo (perpendicular al camino, en el plano y-z)
      const ny = -tz, nz = ty;
      return { y: p[0] + Y, z: p[1], ny, nz };
    });
    const hw = wd / 2;
    const P = (f, sx, o) => [x + sx * hw, f.y + f.ny * o, f.z + f.nz * o];
    const quad = (a, b, c, d, n) => { for (const v of [a, b, c, a, c, d]) m.vert(v, n, col, null); };
    for (let i = 0; i < F.length - 1; i++) {
      const f = F[i], g = F[i + 1];
      const o0 = 0.002, o1 = 0.002 + th;
      const nOut = [0, (f.ny + g.ny) / 2, (f.nz + g.nz) / 2];
      quad(P(f, -1, o1), P(f, 1, o1), P(g, 1, o1), P(g, -1, o1), nOut);
      quad(P(f, 1, o1), P(f, 1, o0), P(g, 1, o0), P(g, 1, o1), [1, 0, 0]);
      quad(P(f, -1, o0), P(f, -1, o1), P(g, -1, o1), P(g, -1, o0), [-1, 0, 0]);
    }
  }

  function weaponGeometry(id) {
    if (geoCache[id]) return geoCache[id];
    const m = new G.Mesher();
    const WOOD = 0x9a7046, DARKW = 0x6e4e30, METAL = 0x9aa0a6, DARKM = 0x55595e, RED = 0xa8322a, BLACK = 0x26262a, RUST = 0x7a5a3e;
    const nails = (y0, y1, r) => { for (let y = y0; y <= y1; y += 0.07) { m.box(0, y, 0, r * 2 + 0.07, 0.008, 0.008, DARKM); m.box(0, y + 0.035, 0, 0.008, 0.008, r * 2 + 0.07, DARKM); } };
    switch (id) {
      case 'bate': case 'bate_clavos':
        m.cyl(0, 0.2, 0, 0.018, 0.022, 0.4, WOOD, 8);
        m.cyl(0, 0.62, 0, 0.022, 0.036, 0.46, WOOD, 8);
        m.sphere(0, 0.85, 0, 0.036, 0.02, 0.036, WOOD, 1);
        m.cyl(0, 0.02, 0, 0.026, 0.026, 0.03, DARKW, 8);
        if (id === 'bate_clavos') nails(0.55, 0.82, 0.032);
        break;
      case 'golf':
        m.cyl(0, 0.12, 0, 0.016, 0.016, 0.24, BLACK, 8);
        m.cyl(0, 0.6, 0, 0.007, 0.01, 0.76, METAL, 6);
        m.box(0, 0.98, 0.04, 0.03, 0.05, 0.11, DARKM);
        break;
      case 'mazo':
        m.cyl(0, 0.38, 0, 0.018, 0.02, 0.76, WOOD, 8);
        m.box(0, 0.8, 0, 0.09, 0.09, 0.24, DARKM);
        break;
      case 'pala':
        m.cyl(0, 0.45, 0, 0.017, 0.017, 0.9, WOOD, 8);
        m.box(0, 0.04, 0, 0.1, 0.03, 0.03, BLACK);
        m.box(0, 1.0, 0, 0.22, 0.26, 0.012, DARKM);
        break;
      case 'tabla': case 'tabla_clavos':
        m.box(0, 0.5, 0, 0.09, 1.0, 0.025, 0xa98a62);
        if (id === 'tabla_clavos') for (let y = 0.65; y < 0.98; y += 0.08) m.box(0, y, 0, 0.12, 0.008, 0.008, DARKM);
        break;
      case 'palanca':
        m.cyl(0, 0.36, 0, 0.012, 0.012, 0.72, 0x3e3e42, 6);
        m.box(0, 0.73, 0.03, 0.02, 0.02, 0.07, 0x3e3e42, 0, 0, 0.5);
        break;
      case 'martillo':
        m.cyl(0, 0.16, 0, 0.014, 0.017, 0.32, WOOD, 8);
        m.box(0, 0.33, 0.01, 0.03, 0.03, 0.13, DARKM);
        break;
      case 'llave':
        m.box(0, 0.16, 0, 0.026, 0.32, 0.012, METAL);
        m.box(0, 0.34, 0, 0.06, 0.04, 0.02, METAL);
        break;
      case 'sarten':
        m.cyl(0, 0.1, 0, 0.012, 0.014, 0.2, BLACK, 8);
        m.cyl(0, 0.33, 0, 0.12, 0.13, 0.025, 0x3a3a3e, 14, 0, Math.PI / 2, 0, 0);
        break;
      case 'tubo':
        m.cyl(0, 0.31, 0, 0.018, 0.018, 0.62, 0x6c7176, 8);
        break;
      case 'rodillo':
        m.cyl(0, 0.04, 0, 0.012, 0.012, 0.08, WOOD, 6);
        m.cyl(0, 0.22, 0, 0.03, 0.03, 0.28, 0xc9a77c, 10);
        m.cyl(0, 0.4, 0, 0.012, 0.012, 0.08, WOOD, 6);
        break;
      case 'porra':
        m.cyl(0, 0.3, 0, 0.016, 0.019, 0.6, BLACK, 8);
        m.cyl(0, 0.14, 0.04, 0.012, 0.012, 0.09, BLACK, 6, 0, Math.PI / 2, 0, 0);
        break;
      case 'hacha_bombero':
        m.cyl(0, 0.44, 0, 0.018, 0.02, 0.88, RED, 8);
        m.box(0, 0.84, 0.07, 0.022, 0.14, 0.13, METAL);
        m.box(0, 0.84, -0.07, 0.02, 0.05, 0.12, DARKM);
        break;
      case 'hacha_mano':
        m.cyl(0, 0.2, 0, 0.015, 0.018, 0.42, WOOD, 8);
        m.box(0, 0.4, 0.05, 0.02, 0.09, 0.1, METAL);
        break;
      case 'machete':
        m.cyl(0, 0.07, 0, 0.016, 0.016, 0.14, BLACK, 8);
        m.box(0, 0.4, 0.008, 0.006, 0.52, 0.05, METAL);
        break;
      case 'katana':
        m.cyl(0, 0.13, 0, 0.016, 0.016, 0.26, BLACK, 8);
        m.cyl(0, 0.27, 0, 0.04, 0.04, 0.012, 0xb59a52, 10);
        m.box(0, 0.64, 0.004, 0.005, 0.72, 0.03, 0xc4c9ce);
        break;
      case 'cuchillo':
        m.box(0, 0.06, 0, 0.022, 0.12, 0.016, BLACK);
        m.box(0, 0.2, 0.006, 0.004, 0.17, 0.035, METAL);
        break;
      case 'cuchillo_caza':
        m.box(0, 0.06, 0, 0.026, 0.12, 0.02, DARKW);
        m.box(0, 0.125, 0, 0.05, 0.012, 0.02, DARKM);
        m.box(0, 0.22, 0.006, 0.005, 0.18, 0.04, METAL);
        break;
      case 'destornillador':
        m.cyl(0, 0.05, 0, 0.016, 0.02, 0.1, 0xd0a42a, 8);
        m.cyl(0, 0.18, 0, 0.004, 0.004, 0.16, METAL, 6);
        break;
      case 'cuchilla':
        m.box(0, 0.06, 0, 0.024, 0.12, 0.018, DARKW);
        m.box(0, 0.22, 0.025, 0.005, 0.2, 0.09, METAL);
        break;
      case 'lanza':
        m.cyl(0, 0.75, 0, 0.016, 0.018, 1.5, WOOD, 8);
        m.box(0, 1.52, 0, 0.026, 0.04, 0.026, 0x6b6b6b);
        m.cone(0, 1.62, 0, 0.022, 0.18, METAL, 4);
        break;
      // ---- Armas de fuego: el cañón va a lo largo de +Y, la parte de arriba (miras) hacia -Z,
      // la empuñadura hacia +Z; el origen es donde agarra la mano derecha
      case 'pistola': case 'pistola_sil': {
        const GM = 0x2a2c2f, GM2 = 0x3d4044, GRIP = 0x3b3431;
        m.box(0, 0.07, -0.036, 0.027, 0.21, 0.033, GM);                  // corredera
        m.box(0, 0.045, -0.013, 0.023, 0.15, 0.016, GM2);                // armazón
        m.box(0, -0.025, 0.048, 0.026, 0.042, 0.1, GRIP, 0, 0, 0.3);     // empuñadura
        m.box(0, 0.028, 0.02, 0.006, 0.045, 0.006, GM);                  // guardamonte
        m.box(0, 0.168, -0.056, 0.005, 0.008, 0.007, GM);                // mira delantera
        m.box(0, -0.025, -0.056, 0.016, 0.008, 0.007, GM);               // mira trasera
        if (id === 'pistola_sil') m.cyl(0, 0.25, -0.036, 0.016, 0.016, 0.15, GM2, 10);
        break;
      }
      case 'escopeta': case 'escopeta_body': {
        const GM = 0x2b2c2e, GM2 = 0x45474b, W2 = 0x7a5232;
        m.box(0, 0.06, -0.026, 0.042, 0.2, 0.05, GM);                    // cajón de mecanismos
        m.cyl(0, 0.43, -0.039, 0.011, 0.011, 0.55, GM2, 8);              // cañón
        m.cyl(0, 0.34, -0.013, 0.01, 0.01, 0.38, GM, 8);                 // depósito
        m.box(0, -0.065, 0.025, 0.032, 0.1, 0.042, W2, 0, 0, 0.35);      // garganta
        m.box(0, -0.2, 0.014, 0.036, 0.24, 0.062, W2, 0, 0, -0.08);      // culata
        m.box(0, -0.325, 0.02, 0.039, 0.02, 0.072, BLACK);               // cantonera
        m.box(0, 0.0, 0.012, 0.006, 0.05, 0.006, GM);                    // guardamonte
        m.sphere(0, 0.7, -0.052, 0.004, 0.004, 0.004, METAL, 1);         // punto de mira
        if (id === 'escopeta') m.cyl(0, 0.3, -0.016, 0.022, 0.022, 0.16, W2, 8);
        break;
      }
      case 'escopeta_pump':
        m.cyl(0, 0, 0, 0.022, 0.022, 0.16, 0x7a5232, 8);
        for (let k = -2; k <= 2; k++) m.cyl(0, k * 0.025, 0, 0.0235, 0.0235, 0.008, 0x5e3f26, 8);
        break;
      case 'rifle': case 'rifle_body': {
        const GM = 0x2a2b2d, GM2 = 0x3f4245, W2 = 0x86562e;
        m.box(0, 0.14, -0.01, 0.036, 0.56, 0.04, W2);                    // caña de la culata
        m.box(0, -0.21, 0.026, 0.038, 0.24, 0.07, W2, 0, 0, -0.06);      // culata
        m.box(0, -0.335, 0.03, 0.04, 0.02, 0.075, 0x3a2a20);             // cantonera
        m.box(0, -0.06, 0.03, 0.03, 0.09, 0.048, W2, 0, 0, 0.3);         // garganta
        m.cyl(0, 0.52, -0.03, 0.0085, 0.0105, 0.44, GM2, 8);             // cañón
        m.cyl(0, 0.07, -0.03, 0.014, 0.014, 0.22, GM, 8);                // cerrojo (cajón)
        m.box(0, 0.0, 0.012, 0.006, 0.05, 0.006, GM);                    // guardamonte
        m.cyl(0, 0.07, -0.088, 0.015, 0.015, 0.2, BLACK, 10);            // mira telescópica
        m.cyl(0, -0.05, -0.088, 0.021, 0.016, 0.05, BLACK, 10);
        m.cyl(0, 0.19, -0.088, 0.016, 0.023, 0.06, BLACK, 10);
        m.box(0, 0.0, -0.062, 0.012, 0.016, 0.02, GM);
        m.box(0, 0.14, -0.062, 0.012, 0.016, 0.02, GM);
        if (id === 'rifle') { m.box(-0.03, 0.0, -0.03, 0.045, 0.01, 0.01, GM); m.sphere(-0.055, 0.0, -0.026, 0.012, 0.012, 0.012, GM, 1); }
        break;
      }
      case 'rifle_bolt':
        m.box(-0.025, 0, 0, 0.045, 0.01, 0.01, 0x2a2b2d);
        m.sphere(-0.05, 0, 0.004, 0.012, 0.012, 0.012, 0x2a2b2d, 1);
        break;
      case 'arco': case 'arco_body': {
        // origen en la empuñadura (mano izquierda). Palas hacia -Z (arriba) y +Z (abajo); la flecha va por +Y
        const BW = 0x8a5a33, BW2 = 0x5d3c22;
        const pts = [[0, 0], [0.035, 0.17], [0.032, 0.34], [-0.005, 0.47], [-0.07, 0.56]];
        for (const sg of [-1, 1]) {
          for (let k = 0; k < pts.length - 1; k++) {
            const a = pts[k], b = pts[k + 1];
            const dy = b[0] - a[0], dz = (b[1] - a[1]) * sg;
            const L = Math.hypot(dy, dz);
            const r0 = 0.016 - k * 0.0025, r1 = 0.016 - (k + 1) * 0.0025;
            m.cyl(0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 * sg, r0, r1, L, BW, 6, 0, Math.atan2(dz, dy));
          }
        }
        m.box(0, 0.005, 0, 0.032, 0.045, 0.12, BW2);                      // empuñadura forrada
        if (id === 'arco') m.box(0, -0.07, 0, 0.003, 0.003, 1.12, 0xd8d0b8); // cuerda (en reposo)
        break;
      }
      case 'flecha':
        m.cyl(0, 0.36, 0, 0.0045, 0.0045, 0.72, 0x9a7a52, 5);
        m.cone(0, 0.745, 0, 0.009, 0.05, METAL, 4);
        for (let k = 0; k < 3; k++) {
          const a = k * Math.PI * 2 / 3;
          m.box(Math.cos(a) * 0.008, 0.07, Math.sin(a) * 0.008, 0.002, 0.09, 0.016, k ? 0xd9d2c0 : 0xb5352a, -a);
        }
        break;
      // ---- Munición y accesorios (en el suelo; -Z queda hacia arriba)
      case 'mun_9mm': case 'mun_cartucho': case 'mun_rifle': {
        const col = id === 'mun_9mm' ? 0x8a6b3a : (id === 'mun_cartucho' ? 0x9c3528 : 0x4c6a3a);
        m.box(0, 0.075, -0.03, 0.1, 0.15, 0.06, col);
        m.box(0, 0.075, -0.0605, 0.08, 0.06, 0.002, 0xe6dcc0);
        break;
      }
      case 'mun_flecha':
        for (let k = -1; k <= 1; k++) {
          m.cyl(k * 0.02, 0.36, -0.01, 0.0045, 0.0045, 0.72, 0x9a7a52, 5);
          m.cone(k * 0.02, 0.745, -0.01, 0.009, 0.05, METAL, 4);
          m.box(k * 0.02, 0.07, -0.018, 0.002, 0.09, 0.016, 0xb5352a);
        }
        break;
      case 'silenciador':
        m.cyl(0, 0.08, -0.017, 0.017, 0.017, 0.15, 0x3d4044, 10);
        break;
      // ---- curación y mochila (para los iconos; la mochila puesta va aparte)
      case 'venda': case 'venda_d':
        m.cyl(0, 0.05, -0.04, 0.04, 0.04, 0.1, 0xe9e4d6, 12);
        m.cyl(0, 0.05, -0.04, 0.015, 0.015, 0.102, 0xb9b2a0, 8);
        m.box(0, 0.16, -0.075, 0.09, 0.14, 0.004, 0xe2dccc, 0, undefined, -0.25);
        if (id === 'venda_d') { m.box(0, 0.05, -0.081, 0.05, 0.016, 0.004, 0xc23b2b); m.box(0, 0.05, -0.081, 0.016, 0.05, 0.004, 0xc23b2b); }
        break;
      case 'alcohol':
        m.cyl(0, 0.09, -0.04, 0.04, 0.04, 0.18, 0x8a5a2a, 10);
        m.cyl(0, 0.2, -0.04, 0.04, 0.016, 0.05, 0x8a5a2a, 10);
        m.cyl(0, 0.245, -0.04, 0.016, 0.016, 0.05, 0x8a5a2a, 8);
        m.cyl(0, 0.275, -0.04, 0.019, 0.019, 0.02, 0x2a2a2a, 8);
        m.box(0, 0.09, -0.081, 0.05, 0.07, 0.004, 0xe6dcc0);
        break;
      case 'mochila_icon':
        m.box(0, 0.19, -0.07, 0.3, 0.38, 0.14, 0x6b5a3e);
        m.sphere(0, 0.37, -0.07, 0.15, 0.06, 0.075, 0x6b5a3e, 1);
        m.box(0, 0.08, -0.15, 0.22, 0.14, 0.05, 0x5b4d35);
        m.cyl(0, 0.0, -0.07, 0.06, 0.06, 0.26, 0x4a4436, 10, undefined, 0, 0, Math.PI / 2);
        break;
      case 'mochila_worn': {
        // en el espacio del hueso del pecho (que está a 1,33 m del suelo)
        const bp = 0x6b5a3e, Y = -1.33;
        // cuerpo de lona redondeado, tapa que cae por encima, bolsillo delantero y laterales,
        // correas con hebillas y saco de dormir enrollado abajo
        const canvas = (x, y, z) => mulC(LC(bp), 0.88 + 0.22 * fbm(x * 14 + 3, y * 14, z * 14));
        const dirty = (base, k) => (x, y, z) => mixC(mulC(LC(base), 0.9 + 0.18 * fbm(x * 16, y * 16 + 2, z * 16)), LC(0x4a3f30), k * sat(fbm(x * 9 + 7, y * 9, z * 9) * 1.6 - 0.6));
        bagLoft(m, [[1.02, 0.12, 0.06, 3.2], [1.06, 0.15, 0.075, 3.6], [1.2, 0.156, 0.08, 3.6], [1.34, 0.15, 0.078, 3.4], [1.42, 0.13, 0.07, 3.0], [1.46, 0.09, 0.05, 2.6]],
          0, -0.2, 20, 0.02, dirty(bp, 0.5), Y, 1.01, 1.47);
        bagLoft(m, [[1.355, 0.16, 0.086, 3.2], [1.43, 0.142, 0.08, 3.0], [1.476, 0.1, 0.06, 2.6]],
          0, -0.2, 20, 0.02, dirty(0x5b4c34, 0.4), Y, null, 1.49);                                  // tapa
        bagLoft(m, [[1.07, 0.1, 0.028, 3.0], [1.12, 0.115, 0.04, 3.2], [1.22, 0.11, 0.038, 3.2], [1.26, 0.088, 0.028, 3.0]],
          0, -0.292, 16, 0.02, dirty(0x62533a, 0.5), Y, 1.065, 1.265);                              // bolsillo delantero
        for (const sg of [1, -1]) {
          bagLoft(m, [[1.08, 0.03, 0.04, 2.6], [1.12, 0.04, 0.05, 2.8], [1.21, 0.038, 0.048, 2.8], [1.24, 0.03, 0.038, 2.6]],
            0.158 * sg, -0.2, 12, 0.02, dirty(0x62533a, 0.4), Y, 1.075, 1.245);                       // bolsillos laterales
          m.box(0.06 * sg, 1.3 + Y, -0.287, 0.026, 0.13, 0.006, 0x3e3426);                          // correas de la tapa
          m.box(0.06 * sg, 1.235 + Y, -0.3, 0.034, 0.022, 0.01, 0x2a2622);                           // hebillas
          m.cyl(0.11 * sg, 0.985 + Y, -0.19, 0.062, 0.062, 0.022, 0x2e2822, 14, undefined, 0, 0, Math.PI / 2); // correas del saco
        }
        m.cyl(0, 0.985 + Y, -0.19, 0.056, 0.056, 0.34, 0x4c5a46, 16, undefined, 0, 0, Math.PI / 2);   // saco de dormir
        m.cyl(0, 0.985 + Y, -0.19, 0.035, 0.035, 0.35, 0x3c4838, 12, undefined, 0, 0, Math.PI / 2);
        // correas: cintas que siguen la forma de la remera, del pecho al hombro y bajando a la mochila
        for (const sg of [1, -1]) {
          const x = 0.098 * sg, path = [];
          let top = 1.2;
          while (top < 1.6 && heroTorsoZ(x, top + 0.004)) top += 0.004;
          for (let y = 1.17; y < top; y += 0.025) path.push([y, heroTorsoZ(x, y).zf]);
          for (let k = 0; k <= 4; k++) {                  // por encima del hombro
            const a = (k / 4) * Math.PI, c = heroTorsoZ(x, top - 0.012);
            const zm = (c.zf + c.zb) / 2, rz = (c.zf - c.zb) / 2;
            path.push([top - 0.012 + Math.sin(a) * 0.014, zm + Math.cos(a) * rz]);
          }
          for (let y = top - 0.03; y > 1.38; y -= 0.025) path.push([y, heroTorsoZ(x, y).zb]);
          path.push([1.36, -0.13]);
          ribbon(m, x, path, 0.036, 0.007, 0x4b3f2b, Y);
          // hebilla y regulador en el pecho
          m.box(x, 1.24 + Y, heroTorsoZ(x, 1.24).zf + 0.009, 0.042, 0.026, 0.008, 0x2a2622);
        }
        break;
      }
      // montón genérico de cosas en el suelo (de pie, +Y arriba): un hatillo de tela con un mango asomando
      case 'monton':
        m.sphere(0, 0.1, 0, 0.2, 0.11, 0.16, 0x6b5a44, 1);
        m.sphere(0.05, 0.19, -0.02, 0.09, 0.07, 0.08, 0x5e4f3b, 1);
        m.sphere(0.06, 0.25, -0.02, 0.035, 0.03, 0.035, 0x4c4032, 1);
        m.cyl(-0.16, 0.12, 0.05, 0.016, 0.016, 0.34, 0x7a5a3e, 6, undefined, 0.2, 0, 1.1);
        m.box(0.14, 0.04, 0.12, 0.12, 0.07, 0.09, 0x8a6b3a, 0.5);
        break;
      default:
        m.cyl(0, 0.3, 0, 0.02, 0.02, 0.6, RUST, 6);
    }
    return (geoCache[id] = m.build());
  }

  G.Models = {
    createHumanoid, disposeHumanoid, setWeapon, setBackWeapon, setBackpack, setOutline, setLOD,
    posePlayer, poseZombie, poseFall, reset,
    weaponGeometry, BI
  };
})(window.Game = window.Game || {});
