(function (G) {
  'use strict';

  // Mochila (o bolsillos, si aún no la tienes). Se abre con un toque y el personaje se agacha a
  // rebuscar: el mundo NO se pausa. Tiene:
  //   - las armas a mano y las guardadas (toca una larga y luego una guardada para cambiarlas,
  //     o arrástrala encima)
  //   - materiales y objetos (vendas, alcohol, vendas desinfectadas) para usar
  //   - fabricar: venda + alcohol = venda desinfectada (mantén pulsado)
  // La munición no se ve aquí: está en el indicador de combate.

  const CRAFT_MS = 1200;
  let box = null, player = null, selKey = null, onMsg = null;
  let crafting = null;          // { t0, raf }
  let dragFrom = null;
  const el = (id) => document.getElementById(id);
  const W = () => G.Weapons;
  const msg = (m, k) => { if (onMsg) onMsg(m, k); };

  const TXT = {
    venda: 'Corta la hemorragia y evita que se infecten los rasguños y las laceraciones. No recupera vida.',
    venda_d: 'Corta la hemorragia, evita la infección y recupera vida poco a poco (unos 30 puntos en un minuto).',
    alcohol: 'Sirve para desinfectar. Combinado con una venda da una venda desinfectada. Cada botella trae varios usos.',
    recipe: 'Receta: 1 venda + 1 uso de alcohol.'
  };

  function ensure() {
    if (box) return box;
    box = el('pack');
    if (!box) return null;
    box.addEventListener('pointerdown', (e) => e.stopPropagation());
    box.querySelector('.pk-x').addEventListener('pointerdown', (e) => { e.preventDefault(); close(true); });
    box.addEventListener('click', (e) => {
      const c = e.target.closest('[data-k]');
      if (!c || c.classList.contains('pk-hold')) return;
      tapCard(c.dataset.k);
    });
    // arrastrar un arma sobre otra la cambia
    box.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.pk-card[data-k^="h"], .pk-card[data-k^="s"]');
      dragFrom = c ? c.dataset.k : null;
    });
    box.addEventListener('pointerup', (e) => {
      if (!dragFrom) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const c = t && t.closest('.pk-card[data-k^="h"], .pk-card[data-k^="s"]');
      if (c && c.dataset.k !== dragFrom) { swap(dragFrom, c.dataset.k); selKey = c.dataset.k; render(); }
      dragFrom = null;
    });
    // mantener para fabricar o usar
    box.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.pk-hold');
      if (!b) return;
      e.preventDefault();
      startCraft(b);
    });
    const stop = () => stopCraft(false);
    box.addEventListener('pointerup', stop);
    box.addEventListener('pointercancel', stop);
    box.addEventListener('pointerleave', stop);
    window.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.code === 'Escape' || e.code === 'KeyI') { e.preventDefault(); close(true); }
    });
    document.addEventListener('pointerlockchange', () => { if (isOpen() && G.Input.pointerLocked) close(false); });
    return box;
  }

  const isOpen = () => !!(box && !box.classList.contains('hidden'));

  function open(p) {
    player = p;
    if (!ensure() || p.dead) return false;
    if (isOpen()) { close(true); return false; }
    if (p.busy()) { msg('Ahora no puedes'); return false; }
    if (G.Loot && G.Loot.isOpen) G.Loot.close(false);
    if (p.stance === 'prone') p.stance = 'crouch';
    p.aiming = false;
    p.action = { kind: 'pack', t: 0, dur: 1e9, impact: 2, face: p.facing, done: false };
    selKey = selKey || 'r:venda_d';
    box.classList.remove('hidden');
    render();
    if (!G.Input.isTouch && G.Input.pointerLocked && document.exitPointerLock) document.exitPointerLock();
    return true;
  }

  function close(relock) {
    if (!isOpen()) return;
    stopCraft(false);
    box.classList.add('hidden');
    if (player && player.action && player.action.kind === 'pack') player.action = null;
    if (relock && !G.Input.isTouch && G.Input.enabled && G.Input.requestLock) G.Input.requestLock();
  }

  // ---------- Contenido ----------
  function wText(s) {
    const w = W().get(s.id);
    if (W().isGun(w)) return s.broken ? 'ROTA' : Math.round((s.cond == null ? 1 : s.cond) * 100) + ' %';
    return Math.max(0, Math.round(s.cond * w.cond)) + ' golpes';
  }
  function card(k, id, label, txt, extra) {
    const u = id ? G.Icons.white(id) : null;
    return '<button type="button" class="pk-card' + (extra || '') + (selKey === k ? ' sel' : '') + '" data-k="' + k + '">' +
      '<span class="pk-ic">' + (u ? '<img alt="" src="' + u + '">' : '') + '</span>' +
      '<span class="pk-nm">' + label + '</span>' + (txt != null ? '<span class="pk-ct">' + txt + '</span>' : '') + '</button>';
  }

  function render() {
    if (!box || !player) return;
    const p = player;
    box.querySelector('.pk-title').textContent = p.backpack ? 'Mochila' : 'Bolsillos';
    const names = ['Cuerpo a cuerpo', 'Pistola', 'Arma larga', 'Arma larga'];
    box.querySelector('.pk-hands').innerHTML = [0, 1, 2, 3].map((i) => {
      const s = p.hands[i];
      return s ? card('h' + i, s.id, W().get(s.id).name, wText(s), (s.broken ? ' broken' : '') + (p.cur === i ? ' cur' : ''))
        : card('h' + i, null, names[i], 'vacío', ' empty');
    }).join('');
    box.querySelector('.pk-stored').innerHTML = p.backpack
      ? [0, 1].map((i) => { const s = p.stored[i]; return s ? card('s' + i, s.id, W().get(s.id).name, wText(s), s.broken ? ' broken' : '') : card('s' + i, null, 'Arma guardada', 'vacío', ' empty'); }).join('')
      : '<div class="pk-lock">Sin mochila no puedes guardar armas</div>';
    box.querySelector('.pk-mats').innerHTML =
      card('m:venda', 'venda', 'Venda', p.items.venda + ' / ' + W().SUPPLY.venda.cap[p.backpack ? 1 : 0]) +
      card('m:alcohol', 'alcohol', 'Alcohol', p.backpack ? p.items.alcohol + ' usos' : 'mochila', p.backpack ? '' : ' empty') +
      card('m:venda_d', 'venda_d', 'Venda desinf.', p.items.venda_d + ' / ' + W().SUPPLY.venda_d.cap[1], p.items.venda_d ? '' : ' empty');
    box.querySelector('.pk-craft').innerHTML = card('r:venda_d', 'venda_d', 'Venda desinfectada', 'venda + alcohol', p.backpack ? '' : ' empty');
    const dv = box.querySelector('.pk-dev');
    if (dv) dv.innerHTML = G.DEV ? W().LIST.filter((w) => w.cat !== 'none').map((w) => card('dev:' + w.id, w.id, w.name, W().isGun(w) ? 'de fuego' : 'cuerpo a cuerpo')).join('') : '';
    describe();
  }

  function describe() {
    const p = player, d = box.querySelector('.pk-desc');
    const k = selKey || '';
    let title = '', text = '', act = '';
    if (k.charAt(0) === 'h' || k.charAt(0) === 's') {
      const i = +k.slice(1), s = k.charAt(0) === 'h' ? p.hands[i] : p.stored[i];
      if (!s) { title = k.charAt(0) === 'h' ? 'Espacio vacío' : 'Espacio de la mochila vacío'; text = k.charAt(0) === 's' ? 'Toca un arma larga a mano para guardarla aquí.' : 'Encontrarás armas registrando muebles.'; }
      else {
        const w = W().get(s.id);
        title = w.name;
        text = W().isGun(w)
          ? (s.broken ? 'Está rota: no dispara. Se podrá arreglar en un banco de taller.' : 'Estado: ' + wText(s) + '.')
          : 'Le quedan ' + wText(s) + '. Al romperse desaparece.';
        if (p.backpack && (k === 'h2' || k === 'h3' || k.charAt(0) === 's')) text += ' Toca ' + (k.charAt(0) === 's' ? 'un arma larga a mano' : 'un arma guardada') + ' para cambiarlas.';
        if (k.charAt(0) === 'h') act = '<button type="button" class="pk-btn" data-k="eq' + i + '">' + (p.cur === i ? 'Guardar en la funda' : 'Equipar') + '</button>';
      }
    } else if (k === 'm:venda' || k === 'm:venda_d') {
      const id = k.slice(2);
      title = W().nameOf(id); text = TXT[id];
      if (p.items[id]) act = '<button type="button" class="pk-btn" data-k="use:' + id + '">Usar</button>';
    } else if (k === 'm:alcohol') {
      title = 'Alcohol'; text = p.backpack ? TXT.alcohol : 'Necesitas una mochila para llevar alcohol.';
    } else {
      title = 'Venda desinfectada'; text = TXT.venda_d + ' ' + TXT.recipe;
      const ok = p.backpack && p.items.venda > 0 && p.items.alcohol > 0 && p.items.venda_d < W().SUPPLY.venda_d.cap[1];
      act = p.backpack
        ? '<button type="button" class="pk-btn pk-hold' + (ok ? '' : ' off') + '" data-k="craft"><i class="pk-fill"></i><span>' + (ok ? 'Mantén para fabricar' : (p.items.venda_d >= W().SUPPLY.venda_d.cap[1] ? 'No caben más' : 'Te faltan materiales')) + '</span></button>'
        : '<div class="pk-lock">Necesitas una mochila para fabricar</div>';
    }
    d.innerHTML = '<b>' + title + '</b><p>' + text + '</p><div class="pk-acts">' + act + '</div>';
  }

  // tocar: seleccionar; tocar un arma con otra seleccionada: cambiarlas
  function tapCard(k) {
    const p = player;
    if (k.indexOf('eq') === 0) { const i = +k.slice(2); if (p.hands[i]) { p.cur === i ? p.equip(-1) : p.equip(i); } render(); return; }
    if (k.indexOf('use:') === 0) {
      const id = k.slice(4);
      close(false);
      const m = p.startBandage(id);
      if (m) msg(m, 'warn');
      return;
    }
    if (k === 'craft') return;
    if (k.indexOf('dev:') === 0) { const m = p.devGive(k.slice(4)); if (m) msg(m); render(); return; }
    const w1 = selKey && (selKey.charAt(0) === 'h' || selKey.charAt(0) === 's');
    const w2 = k.charAt(0) === 'h' || k.charAt(0) === 's';
    if (w1 && w2 && selKey !== k && swap(selKey, k)) { selKey = k; render(); return; }
    selKey = k;
    render();
  }

  // cambia un arma larga a mano (h2/h3) con una guardada (s0/s1)
  function swap(a, b) {
    const p = player;
    let h = null, s = null;
    for (const k of [a, b]) { if (k === 'h2' || k === 'h3') h = +k.slice(1); else if (k.charAt(0) === 's') s = +k.slice(1); }
    if (h == null || s == null || !p.backpack) return false;
    if (!p.hands[h] && !p.stored[s]) return false;
    p.swapStored(h, s);
    msg('Cambiaste de arma: ' + (p.hands[h] ? W().get(p.hands[h].id).name + ' a mano' : 'guardada en la mochila'));
    return true;
  }

  // ---------- Fabricar (mantener pulsado) ----------
  function startCraft(b) {
    if (b.classList.contains('off')) return;
    const fill = b.querySelector('.pk-fill');
    crafting = { t0: performance.now(), fill };
    const step = () => {
      if (!crafting) return;
      const k = Math.min(1, (performance.now() - crafting.t0) / CRAFT_MS);
      fill.style.width = (k * 100) + '%';
      if (k >= 1) {
        crafting = null;
        const m = player.craft('venda_d');
        msg(m || 'Fabricaste una venda desinfectada', m ? 'warn' : 'good');
        render();
        return;
      }
      crafting.raf = requestAnimationFrame(step);
    };
    crafting.raf = requestAnimationFrame(step);
  }
  function stopCraft() {
    if (!crafting) return;
    cancelAnimationFrame(crafting.raf);
    if (crafting.fill) crafting.fill.style.width = '0%';
    crafting = null;
  }

  // Cada fotograma: se cierra si algo te interrumpe (un golpe) o mueres
  function update(p) {
    player = p;
    if (!isOpen()) return;
    if (p.dead || !p.action || p.action.kind !== 'pack') close(false);
  }

  G.Backpack = {
    open, close, update, render,
    get isOpen() { return isOpen(); },
    set onMessage(fn) { onMsg = fn; }
  };
})(window.Game = window.Game || {});
