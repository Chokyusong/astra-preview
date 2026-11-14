/* 미디어 "하는 일" 무대 — 4판(대표 11-14 "배경사진 빼고 인터랙티브·모션그래픽으로 고퀄리티, 어두운 테마 그대로지만 답답하지 않게,
   카메라 [ ] 따라다니는 것도 잘 쓰게").
   사진 대신 구역 뒤에 그림판 하나를 깐다.
   - 바탕: 조금 띄운 숯색(#0f0f11) + 천천히 떠도는 금빛 번짐 두 개 + 마우스 곁에서만 금빛으로 밝아지는 점 격자.
   - 고른 줄마다 다른 선 그림이 0.9초에 그려진다: 1 스튜디오 평면도(조명·카메라가 마우스 자리의 인물을 겨눈다)
     2 방송 신호 흐름(카메라·마이크 → 오디오 → PC → 송출, 신호가 흐르고 마우스를 빨리 움직이면 소리가 커진다)
     3 편집 타임라인(재생 막대가 마우스 가로 자리를 따라가고, 위 화면이 그 자리의 장면으로 컷된다)
     4 썸네일·배너·포스터 대지(대지 안에서 인물이 마우스를 따라오고 3등분 점에 붙는다, 안내선·좌표)
     5 타이틀·이징·모션 경로(ASTRA 글자가 쓸려 채워지고, 이징 곡선 손잡이와 모션 경로를 마우스로 당긴다)
   - 그림 속 물건(조명·카메라·모니터·재생 막대 …)은 초점 틀이 맞춰질 자리다(hit). 틀이 맞으면 그 물건이 금빛이 되고 이름표가 뜬다.
   - 고른 줄의 글 뒤에서는 그림만 74% 옅어진다(바탕은 그대로).
   - 마우스가 없는 화면(휴대폰)은 보이지 않는 손이 그림 위를 천천히 돈다. 글이 그림 위를 다 덮으므로 그림 전체는 34%, 이름표·녹화 표시 없음.
   - 움직임 줄이기는 다 그려진 한 장으로 멈춘다.
   media.html이 부른다: var WG = MediaWhat(host, { reduce, state }) → show(i, 'cut'|'soft'|'now'), frame(t, dt), hit(x, y), focus(key), redraw() */
(function () {
  'use strict';
  var GOLD = '201,173,128';
  var TAU = Math.PI * 2;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var easeOut = function (u) { return 1 - Math.pow(1 - u, 3); };
  var easeInOut = function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  var lag = function (dt, tau) { return 1 - Math.exp(-dt / tau); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  window.MediaWhat = function (host, opt) {
    var reduce = !!opt.reduce;
    var cv = document.createElement('canvas'), off = document.createElement('canvas');
    cv.className = 'wstage';
    host.appendChild(cv);
    var hud = document.createElement('div');
    hud.className = 'whud';
    hud.innerHTML = '<p class="whud-tc"><i></i>REC<b>00:00:00:00</b></p><p class="whud-ex">ƒ2.8 · 1/50 · ISO 800 · 4K 24p</p>';
    host.appendChild(hud);
    var tcEl = hud.querySelector('b'), tcLast = '', tcStart = 0, lastT = -1e9;
    var ctx = cv.getContext('2d'), oc = off.getContext('2d');
    var S = { W: 0, H: 0, dpr: 1, deck: true, cx: 0, cy: 0, u: 1, left: 0, top: 0, oy: 0, hb: 0 };
    var G = { cur: -1, t0: 0, mode: 'now', prev: -1, pt0: 0, pdur: 1 };
    var P = { x: 0, y: 0, raw: false, act: 0, sp: 0 };
    var HK = null, HL = {}, hots = [], nh = [], prox = {};
    var T = 0, DT = 0.016;
    var c = oc, A = 1, PR = 1, U = 1, lab = 1, GAIN = 1;

    /* ── 크기: 넘기는 화면은 그림을 오른쪽 2/3 자리(가운데 가로 66.5%, 세로 53.5%), 스크롤하는 화면은 가운데 ── */
    function size(deck) {
      var w = host.clientWidth, h = host.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
      if (!w || !h) return false;
      if (w !== S.W || h !== S.H || d !== S.dpr) {
        S.W = w; S.H = h; S.dpr = d;
        cv.width = off.width = Math.round(w * d); cv.height = off.height = Math.round(h * d);
      }
      S.deck = deck; lab = deck ? 1 : 0; GAIN = deck ? 1.2 : 1;
      var sw;
      if (deck) {
        // 위는 녹화 표시 아래 14px, 아래는 노출계 위(작은 창은 16px)까지. 그림 높이(이름 포함 744)가 그 안에 들게 줄이고, 비켜 서도 그 안에 머문다
        var tl = S.hb + 14, bl = h - (h >= 760 ? 52 : 16);
        sw = Math.min(w * 0.54, h * 0.74 / 0.7, (bl - tl) / 0.744);
        var half = sw * 0.372;
        S.cx = w * 0.665; S.cy = clamp(h * 0.535 + S.oy, tl + half, Math.max(tl + half, bl - half));
      } else { sw = Math.min(w * 1.02, h * 0.62 / 0.7, 760); S.cx = w / 2; S.cy = h * 0.54; }
      S.u = U = sw / 1000;
      return true;
    }

    /* ── 손: 그림 위 마우스(그림 단위 좌표). 마우스가 없거나 그림 밖이면 보이지 않는 손이 천천히 돈다 ── */
    function pointer(o, dt) {
      var raw = null;
      if (o.mouse) {
        var ux = (o.mouse.x - S.left - S.cx) / U, uy = (o.mouse.y - S.top - S.cy) / U;
        if (ux > -560 && ux < 560 && uy > -400 && uy < 400) raw = [ux, uy];
      }
      P.raw = !!raw;
      var vx = 300 * Math.sin(T * 0.31) + 60 * Math.sin(T * 0.83), vy = 170 * Math.sin(T * 0.47 + 1.3);
      var tx = raw ? raw[0] : vx, ty = raw ? raw[1] : vy, f = dt ? lag(dt, raw ? 0.09 : 0.7) : 1;
      var ox = P.x, oy = P.y;
      P.x += (tx - P.x) * f; P.y += (ty - P.y) * f;
      var sp = dt ? Math.hypot(P.x - ox, P.y - oy) / dt : 0;
      if (dt) { P.sp += (clamp(sp / 900, 0, 1) - P.sp) * lag(dt, 0.25); P.act += ((raw ? 1 : 0) - P.act) * lag(dt, 0.3); }
    }

    /* ── 그리기 도구(그림 단위 좌표. 가로 -500~500, 세로 -350~350) ── */
    function mix(h) { return Math.round(255 - 54 * h) + ',' + Math.round(255 - 82 * h) + ',' + Math.round(255 - 127 * h); }
    function ink(a, h) { c.strokeStyle = 'rgba(' + mix(h || 0) + ',' + clamp(a * A * GAIN, 0, 1).toFixed(3) + ')'; }
    function paint(a, h) { c.fillStyle = 'rgba(' + mix(h || 0) + ',' + clamp(a * A * GAIN, 0, 1).toFixed(3) + ')'; }
    function lw(px) { c.lineWidth = px / U; }
    function ph(a, b) { return easeOut(clamp((PR - a) / (b - a), 0, 1)); }
    function poly(p, k, close) {
      if (k <= 0) return;
      var q = close ? p.concat([p[0], p[1]]) : p, n = q.length, L = 0, segs = [], i;
      for (i = 2; i < n; i += 2) { var l = Math.hypot(q[i] - q[i - 2], q[i + 1] - q[i - 1]); segs.push(l); L += l; }
      var lim = L * Math.min(k, 1), acc = 0;
      c.beginPath(); c.moveTo(q[0], q[1]);
      for (i = 2; i < n; i += 2) {
        var sl = segs[i / 2 - 1];
        if (acc + sl >= lim) { var f = sl ? (lim - acc) / sl : 0; c.lineTo(q[i - 2] + (q[i] - q[i - 2]) * f, q[i - 1] + (q[i + 1] - q[i - 1]) * f); break; }
        c.lineTo(q[i], q[i + 1]); acc += sl;
      }
      c.stroke();
    }
    function line(x1, y1, x2, y2, k) { if (k <= 0) return; k = Math.min(k, 1); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k); c.stroke(); }
    function rect(x, y, w, h, k) { poly([x, y, x + w, y, x + w, y + h, x, y + h], k, true); }
    function rrPts(x, y, w, h, r) {
      var p = [], cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
      for (var i = 0; i < 4; i++) for (var k = 0; k <= 4; k++) { var a = cs[i][2] + k * Math.PI / 8; p.push(cs[i][0] + r * Math.cos(a), cs[i][1] + r * Math.sin(a)); }
      return p;
    }
    function rr(x, y, w, h, r, k) { poly(rrPts(x, y, w, h, r), k, true); }
    function rrFill(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); }
    function circ(x, y, r, k, a0) { if (k <= 0) return; a0 = a0 == null ? -Math.PI / 2 : a0; c.beginPath(); c.arc(x, y, r, a0, a0 + TAU * Math.min(k, 1)); c.stroke(); }
    function arc(x, y, r, a, b) { c.beginPath(); c.arc(x, y, r, a, b); c.stroke(); }
    function dot(x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    function txt(s, x, y, size, a, gold, align) {
      if (a * A <= 0.01) return;
      c.font = '500 ' + size + 'px Geist, "Pretendard Variable", sans-serif';
      c.textAlign = align || 'left'; c.textBaseline = 'middle';
      if ('letterSpacing' in c) c.letterSpacing = (size * 0.14).toFixed(1) + 'px';
      paint(a, gold ? 1 : 0); c.fillText(s, x, y);
      if ('letterSpacing' in c) c.letterSpacing = '0px';
    }
    function star(x, y, r, k) { var p = []; for (var i = 0; i < 8; i++) { var a = i / 8 * TAU - Math.PI / 2, q = i % 2 ? r * 0.26 : r; p.push(x + Math.cos(a) * q, y + Math.sin(a) * q); } poly(p, k, true); }
    function diamond(x, y, r, on, k) {
      if (k <= 0) return;
      var p = [x, y - r, x + r, y, x, y + r, x - r, y];
      if (on) { paint(0.95 * k, 1); c.beginPath(); c.moveTo(p[0], p[1]); for (var i = 2; i < 8; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); }
      else { lw(1.2); ink(0.4 * k); poly(p, k, true); }
    }
    function bezAt(B, s) { var m = 1 - s; return [m * m * m * B[0] + 3 * m * m * s * B[2] + 3 * m * s * s * B[4] + s * s * s * B[6], m * m * m * B[1] + 3 * m * m * s * B[3] + 3 * m * s * s * B[5] + s * s * s * B[7]]; }
    function bezPts(B, n) { var p = []; for (var i = 0; i <= n; i++) { var q = bezAt(B, i / n); p.push(q[0], q[1]); } return p; }
    function bezSolveX(B, x) { var a = 0, b = 1; for (var i = 0; i < 16; i++) { var m = (a + b) / 2; if (bezAt(B, m)[0] < x) a = m; else b = m; } return (a + b) / 2; }
    function plen(p) { var L = 0; for (var i = 2; i < p.length; i += 2) L += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); return L; }
    function pat(p, s) {
      for (var i = 2; i < p.length; i += 2) {
        var l = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
        if (s <= l) { var f = l ? s / l : 0; return [p[i - 2] + (p[i] - p[i - 2]) * f, p[i - 1] + (p[i + 1] - p[i - 1]) * f]; }
        s -= l;
      }
      return [p[p.length - 2], p[p.length - 1]];
    }
    function noise(i, t) { return 0.5 + 0.5 * Math.sin(i * 0.71 + t * 5.3) * Math.sin(i * 0.23 - t * 2.9 + Math.sin(i * 0.05 + t)); }
    // 초점 틀이 맞춰질 자리(화면 좌표로 바꿔 둔다). 다 그려지기 전·사라지는 중·휴대폰은 없다
    function hot(key, label, x, y, w, h) { if (!S.deck || PR < 0.6 || A < 0.9) return; nh.push({ key: key, label: label, x: S.cx + x * U, y: S.cy + y * U, w: w * U, h: h * U }); }
    // 그 자리에 틀이 맞은 정도(0.12초에 따라감)
    function hv(key) { var v = HL[key] || 0; v += ((HK === key ? 1 : 0) - v) * (DT ? lag(DT, 0.12) : 1); if (v < 0.001) v = 0; HL[key] = v; return v; }

    /* ───── 1 STUDIO SETUP: 방을 위에서 비스듬히 본 평면도. 인물 표시가 마우스를 따라 바닥을 걷고, 세 조명과 카메라가 인물을 겨눈다 ───── */
    var ST = { sx: 250, sy: 260 };
    function iso(x, y, z) { return [(x - y) * 0.866, (x + y) * 0.5 - (z || 0) - 160]; }
    function isoL(list, k, close) { var p = []; for (var i = 0; i < list.length; i++) { var v = iso(list[i][0], list[i][1], list[i][2]); p.push(v[0], v[1]); } poly(p, k, close); }
    function studio() {
      var a = P.x / 0.866, b = (P.y + 160) / 0.5;
      var tx = clamp((a + b) / 2, 70, 430), ty = clamp((b - a) / 2, 70, 430), f = DT ? lag(DT, 0.18) : 1, k, v;
      if (!HK) { ST.sx += (tx - ST.sx) * f; ST.sy += (ty - ST.sy) * f; }
      var sx = ST.sx, sy = ST.sy, Hh = 185;
      // 바닥·바닥 격자·벽
      lw(1.2); ink(0.4); isoL([[0, 0, 0], [500, 0, 0], [500, 500, 0], [0, 500, 0]], ph(0, 0.32), true);
      lw(1); ink(0.07);
      for (k = 1; k < 10; k++) { v = k * 50; var q = ph(0.1 + k * 0.025, 0.42 + k * 0.025); isoL([[v, 0, 0], [v, 500, 0]], q); isoL([[0, v, 0], [500, v, 0]], q); }
      lw(1.2); ink(0.3); isoL([[500, 0, 0], [500, 0, Hh], [0, 0, Hh], [0, 500, Hh], [0, 500, 0]], ph(0.06, 0.42));
      isoL([[0, 0, 0], [0, 0, Hh]], ph(0.1, 0.3));
      // 오른쪽 벽 흡음재
      lw(1); ink(0.17);
      for (k = 0; k < 10; k++) { v = 270 + k * 18; isoL([[v, 0, 38], [v, 0, 150]], ph(0.3 + k * 0.02, 0.5 + k * 0.02)); }
      // 왼쪽 벽 배경지(위 봉에서 내려와 바닥으로 휘어 나온다)
      var hs = hv('s_set'), pb = ph(0.24, 0.52);
      if (pb > 0) {
        var fp = [iso(0, 110, Hh - 14), iso(0, 340, Hh - 14), iso(0, 340, 26), iso(52, 340, 0), iso(52, 110, 0), iso(0, 110, 26)];
        paint((0.025 + 0.05 * hs) * pb, hs); c.beginPath(); c.moveTo(fp[0][0], fp[0][1]); for (k = 1; k < fp.length; k++) c.lineTo(fp[k][0], fp[k][1]); c.closePath(); c.fill();
        lw(1.6); ink(0.36 + 0.4 * hs, hs); isoL([[6, 96, Hh - 10], [6, 354, Hh - 10]], pb);
        lw(1.2);
        [110, 340].forEach(function (yy) { isoL([[0, yy, Hh - 14], [0, yy, 26], [4, yy, 10], [14, yy, 3], [30, yy, 0], [52, yy, 0]], pb); });
        ink(0.22 + 0.3 * hs, hs); isoL([[52, 110, 0], [52, 340, 0]], pb);
      }
      hot('s_set', 'BACKDROP', -300, -290, 255, 330);
      // 작업 책상과 모니터(오른쪽 벽 앞)
      var pd = ph(0.32, 0.58); lw(1.1); ink(0.26);
      isoL([[300, 24, 62], [450, 24, 62], [450, 96, 62], [300, 96, 62]], pd, true);
      isoL([[300, 96, 62], [300, 96, 0]], pd); isoL([[450, 96, 62], [450, 96, 0]], pd); isoL([[450, 24, 62], [450, 24, 0]], pd);
      isoL([[340, 40, 72], [420, 40, 72], [420, 40, 118], [340, 40, 118]], pd, true); isoL([[380, 40, 62], [380, 40, 72]], pd);
      // 인물(바닥 원 + 몸 + 머리)과 바닥에 떨어진 빛
      var ps = ph(0.42, 0.68), f0 = iso(sx, sy, 0);
      if (ps > 0) {
        c.save(); c.translate(f0[0], f0[1]); c.scale(1, 0.5);
        var gl = c.createRadialGradient(0, 0, 0, 0, 0, 120); gl.addColorStop(0, 'rgba(' + GOLD + ',' + (0.16 * ps * A).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(' + GOLD + ',0)');
        c.fillStyle = gl; c.fillRect(-120, -120, 240, 240); c.restore();
        var ring = []; for (k = 0; k <= 24; k++) { var an = k / 24 * TAU, rv = iso(sx + 34 * Math.cos(an), sy + 34 * Math.sin(an), 0); ring.push(rv[0], rv[1]); }
        lw(1.4); ink(0.8, 1); poly(ring, ps);
        ink(0.5, 1); line(f0[0] - 10, f0[1], f0[0] + 10, f0[1], ps); line(f0[0], f0[1] - 6, f0[0], f0[1] + 6, ps);
        var h0 = iso(sx, sy, 100), hd = iso(sx, sy, 128);
        ink(0.55); line(f0[0], f0[1], h0[0], h0[1], ps);
        poly([h0[0] - 22, h0[1] + 12, h0[0] - 16, h0[1] - 1, h0[0], h0[1] - 5, h0[0] + 16, h0[1] - 1, h0[0] + 22, h0[1] + 12], ps);
        ink(0.85, 1); circ(hd[0], hd[1], 13, ps);
        txt('TALENT', hd[0] + 24, hd[1] - 2, 13, 0.5 * ps * lab, true);
      }
      // 조명 셋: 스탠드, 빛 뿔, 소프트박스 머리(인물을 향해 돈다)
      var LT = [{ k: 's_key', n: 'KEY', x: 120, y: 400 }, { k: 's_fill', n: 'FILL', x: 445, y: 255 }, { k: 's_back', n: 'BACK', x: 70, y: 70 }];
      var tgt = iso(sx, sy, 70), pl = ph(0.46, 0.72), pbm = ph(0.62, 1);
      LT.forEach(function (L, i) {
        var h = hv(L.k), base = iso(L.x, L.y, 0), top = iso(L.x, L.y, 170), hd2 = iso(L.x, L.y, 182);
        lw(1.1); ink(0.32 + 0.3 * h, h);
        line(base[0], base[1], top[0], top[1], pl);
        [[L.x - 22, L.y], [L.x, L.y - 22], [L.x + 16, L.y + 16]].forEach(function (q) { var fq = iso(q[0], q[1], 0); line(base[0], base[1], fq[0], fq[1], pl); });
        var dx = tgt[0] - hd2[0], dy = tgt[1] - hd2[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
        if (pbm > 0) {
          var sp = 50 + 12 * h, ex = hd2[0] + ux * 18, ey = hd2[1] + uy * 18, ba = (i === 0 ? 0.17 : 0.1) * (1 + 0.9 * h) * pbm * A;
          var g = c.createLinearGradient(hd2[0], hd2[1], tgt[0], tgt[1]);
          g.addColorStop(0, 'rgba(' + GOLD + ',' + ba.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + GOLD + ',0)');
          c.fillStyle = g; c.beginPath();
          c.moveTo(ex + nx * 14, ey + ny * 14); c.lineTo(tgt[0] + nx * sp, tgt[1] + ny * sp); c.lineTo(tgt[0] - nx * sp, tgt[1] - ny * sp); c.lineTo(ex - nx * 14, ey - ny * 14);
          c.closePath(); c.fill();
          lw(1); ink(0.13 * pbm + 0.25 * h, 1);
          line(ex + nx * 14, ey + ny * 14, tgt[0] + nx * sp, tgt[1] + ny * sp, 1); line(ex - nx * 14, ey - ny * 14, tgt[0] - nx * sp, tgt[1] - ny * sp, 1);
        }
        lw(1.3); ink(0.62 + 0.35 * h, h);
        poly([hd2[0] - ux * 10 + nx * 7, hd2[1] - uy * 10 + ny * 7, hd2[0] + ux * 16 + nx * 17, hd2[1] + uy * 16 + ny * 17, hd2[0] + ux * 16 - nx * 17, hd2[1] + uy * 16 - ny * 17, hd2[0] - ux * 10 - nx * 7, hd2[1] - uy * 10 - ny * 7], pl, true);
        txt(L.n, hd2[0], hd2[1] - 32, 13, (0.42 * (1 - h)) * pl * lab, h > 0.5, 'center');
        hot(L.k, L.n + ' LIGHT', hd2[0] - 42, hd2[1] - 46, 84, 84);
      });
      // 카메라(삼각대 + 몸통이 인물을 향함 + 화각 점선)
      var hc = hv('s_cam'), ch = iso(400, 430, 112), pc = ph(0.5, 0.76);
      lw(1.1); ink(0.34 + 0.3 * hc, hc);
      [[372, 430], [428, 416], [404, 462]].forEach(function (q) { var fq = iso(q[0], q[1], 0); line(ch[0], ch[1] + 8, fq[0], fq[1], pc); });
      var ct = iso(sx, sy, 92), ca = Math.atan2(ct[1] - ch[1], ct[0] - ch[0]), nx2 = -Math.sin(ca), ny2 = Math.cos(ca);
      if (pc > 0.5) {
        c.setLineDash([5, 6]); lw(1); ink((0.3 + 0.35 * hc) * (pc - 0.5) * 2, 1);
        line(ch[0], ch[1], ct[0] + nx2 * 42, ct[1] + ny2 * 42, 1); line(ch[0], ch[1], ct[0] - nx2 * 42, ct[1] - ny2 * 42, 1);
        c.setLineDash([]);
      }
      c.save(); c.translate(ch[0], ch[1]); c.rotate(ca);
      lw(1.3); ink(0.72 + 0.25 * hc, hc); rr(-24, -14, 40, 28, 5, pc); poly([16, -8, 32, -13, 32, 13, 16, 8], pc, true); rect(-14, -22, 16, 8, pc);
      c.restore();
      txt('CAM A', ch[0] + 40, ch[1] + 14, 13, (0.42 * (1 - hc)) * pc * lab, hc > 0.5);
      hot('s_cam', 'CAMERA', ch[0] - 46, ch[1] - 44, 92, 86);
    }

    /* ───── 2 PERSONAL BROADCAST SETUP: 카메라·마이크 → 오디오 → PC → 송출. 신호가 선을 따라 흐르고, 마우스를 빨리 움직일수록 소리(파형·페이더)가 커진다 ───── */
    var EDGES = [[-310, -150, -10, -150, -10, -45, 35, -45], [-310, 150, -190, 150], [-40, 150, -10, 150, -10, 25, 35, 25], [265, -10, 348, -10]];
    var BR = { ph: 0 };
    function node(key, label, x, y, k, icon) {
      var h = hv(key);
      lw(1.2); ink(0.26 + 0.4 * h, h); rr(x - 75, y - 50, 150, 100, 14, k);
      if (h > 0.01) { paint(0.05 * h, 1); rrFill(x - 75, y - 50, 150, 100, 14); }
      icon(x, y, k, h);
      txt(label, x, y + 68, 13, (0.45 * (1 - h)) * k * lab, h > 0.5, 'center');
      hot(key, label, x - 75, y - 50, 150, 100);
    }
    function broadcast() {
      var lvl = 0.3 + 0.7 * Math.max(P.sp, 0.3 * (0.5 + 0.5 * Math.sin(T * 1.7)));
      BR.ph += DT * (110 + 260 * P.sp);
      EDGES.forEach(function (e, i) {
        var pe = ph(0.38 + i * 0.07, 0.7 + i * 0.06); lw(1.1); ink(0.24); poly(e, pe);
        if (pe < 1) return;
        var L = plen(e), n = Math.max(1, Math.floor(L / 70));
        for (var j = 0; j < n; j++) {
          var s = (BR.ph + j * L / n + i * 23) % L, q = pat(e, s), q2 = pat(e, Math.max(0, s - 18)), fe = Math.min(1, s / 30, (L - s) / 30);
          lw(2); ink(0.7 * fe, 1); line(q2[0], q2[1], q[0], q[1], 1);
          paint(0.95 * fe, 1); dot(q[0], q[1], 3);
        }
      });
      node('b_cam', 'CAMERA', -385, -150, ph(0, 0.35), function (x, y, k, h) {
        lw(1.4); ink(0.7 + 0.25 * h, h); rr(x - 36, y - 18, 50, 36, 6, k); poly([x + 14, y - 8, x + 34, y - 15, x + 34, y + 15, x + 14, y + 8], k, true); circ(x - 11, y, 9, k);
        if (k >= 1 && Math.sin(T * 4) > -0.2) { paint(0.95, 1); dot(x - 28, y - 26, 3); }
      });
      node('b_mic', 'MIC', -385, 150, ph(0.08, 0.42), function (x, y, k, h) {
        lw(1.4); ink(0.7 + 0.25 * h, h); rr(x - 10, y - 34, 20, 38, 10, k);
        if (k > 0.3) arc(x, y - 8, 19, 0.15, Math.PI - 0.15);
        line(x, y + 11, x, y + 28, k); line(x - 14, y + 28, x + 14, y + 28, k);
        if (k >= 1) for (var m = 1; m <= 2; m++) { lw(1.2); ink((0.15 + 0.5 * lvl) / m, 1); arc(x, y - 15, 22 + m * 10, -0.55, 0.55); }
      });
      node('b_aud', 'AUDIO', -115, 150, ph(0.14, 0.48), function (x, y, k, h) {
        for (var m = 0; m < 4; m++) {
          var fx = x - 33 + m * 22, lv = noise(m * 3 + 1, T) * lvl;
          lw(1.1); ink(0.3); line(fx, y - 26, fx, y + 26, k);
          lw(1.4); ink(0.85 * k, 1); rect(fx - 6, y + 20 - lv * 46 - 3, 12, 6, k);
        }
      });
      // PC 화면: 방송 화면(인물이 마우스 쪽을 본다 + 하단 자막 + LIVE)
      var hp = hv('b_pc'), pp = ph(0.2, 0.55), mx = 150, my = -10;
      lw(1.3); ink(0.32 + 0.4 * hp, hp); rr(mx - 115, my - 68, 230, 130, 8, pp); line(mx, my + 62, mx, my + 84, pp); line(mx - 36, my + 84, mx + 36, my + 84, pp);
      if (pp > 0.5) {
        var cp = (pp - 0.5) * 2, hx = clamp((P.x - mx) * 0.05, -14, 14), hy = clamp((P.y - my) * 0.03, -6, 6);
        c.save(); c.beginPath(); c.rect(mx - 109, my - 62, 218, 118); c.clip();
        lw(1.3); ink(0.55 * cp); circ(mx + hx, my - 12 + hy, 22, 1); arc(mx + hx * 0.5, my + 76, 52, Math.PI + 0.15, TAU - 0.15);
        paint(0.55 * cp, 1); c.fillRect(mx - 98, my + 28, 70, 8); paint(0.25 * cp); c.fillRect(mx - 98, my + 41, 46, 5);
        c.restore();
        if (Math.sin(T * 5) > -0.3) { paint(0.9 * cp, 1); dot(mx - 94, my - 50, 3.2); }
        txt('LIVE', mx - 86, my - 50, 11, 0.8 * cp, true);
      }
      txt('PC', mx, my + 104, 13, (0.45 * (1 - hp)) * pp * lab, hp > 0.5, 'center');
      hot('b_pc', 'PROGRAM', mx - 115, my - 68, 230, 130);
      // 송출: 퍼져 나가는 전파
      var hl = hv('b_live'), pl = ph(0.3, 0.62), lx = 410, ly = -10;
      lw(1.2); ink(0.3 + 0.4 * hl, hl); circ(lx, ly, 58, pl);
      if (pl > 0.6) {
        for (var j = 0; j < 3; j++) { var q = (T * 0.55 + j / 3) % 1; lw(1); ink((1 - q) * 0.4 * (0.6 + 0.4 * hl), 1); circ(lx, ly, 60 + q * 100, 1); }
        lw(1.5); ink(0.85, 1);
        for (var m = 1; m <= 2; m++) { arc(lx, ly, 8 + m * 10, -0.7, 0.7); arc(lx, ly, 8 + m * 10, Math.PI - 0.7, Math.PI + 0.7); }
        paint(0.95, 1); dot(lx, ly, 4.5);
      }
      txt('ON AIR', lx, ly + 76, 13, (0.5 * (1 - hl)) * pl * lab, true, 'center');
      hot('b_live', 'ON AIR', lx - 60, ly - 60, 120, 120);
      // 아래 소리 파형(마우스 곁이 커진다)
      var pw = ph(0.55, 1), N = 112, wy = 278;
      lw(2);
      for (var i = 0; i < N; i++) {
        if (i / N > pw) break;
        var x = -480 + i * (960 / (N - 1)), near = Math.exp(-Math.pow((x - P.x) / 150, 2)) * (0.35 + 0.65 * P.act);
        var am = 3 + 24 * noise(i, T) * (0.35 + lvl * 0.5 + near * 0.9);
        ink(0.16 + 0.5 * near, near); line(x, wy - am, x, wy + am, 1);
      }
    }

    /* ───── 3 VIDEO PRODUCTION: 위는 방송 화면, 아래는 편집 타임라인. 재생 막대가 마우스 가로 자리를 따라가고(마우스가 없으면 혼자 흐른다)
       막대가 V1의 장면 경계를 넘으면 위 화면이 그 장면으로 컷된다(풍경 · 인터뷰 · 로고 · 세로 숏폼) ───── */
    var VI = { f: 0.08, ci: -1, flash: -9 };
    var TR = [['V2', 0, 34], ['V1', 42, 52], ['A1', 104, 38], ['A2', 150, 38]];
    var CL = [[[0.1, 0.28, 'TITLE'], [0.56, 0.7, 'LOWER']], [[0, 0.27, 'OPEN'], [0.275, 0.52, 'TALK'], [0.525, 0.74, 'LOGO'], [0.745, 1, 'SHORTS']], [[0, 0.61], [0.615, 1]], [[0.04, 0.44], [0.5, 0.9]]];
    var SCN = [
      function (x, y, w, h, lf, k) {
        var hz = y + 40, pan = (lf - 0.5) * 40, m;
        lw(1.3); ink(0.5 * k);
        line(x - w / 2, hz, x + w / 2, hz, k);
        poly([x - w / 2, hz, x - 170 - pan, hz - 52, x - 110 - pan, hz - 20, x - 20 - pan, hz - 88, x + 70 - pan, hz - 26, x + 140 - pan, hz - 60, x + w / 2, hz - 8], k);
        ink(0.8 * k, 1); circ(x + 150 - pan * 1.6, y - 70 + lf * 16, 24, k);
        ink(0.22 * k); for (m = 0; m < 4; m++) line(x - 200 + m * 120 - pan, hz + 24 + m * 14, x - 150 + m * 120 - pan, hz + 24 + m * 14, k);
      },
      function (x, y, w, h, lf, k) {
        lw(1); ink(0.12 * k);
        line(x - w / 6, y - h / 2, x - w / 6, y + h / 2, k); line(x + w / 6, y - h / 2, x + w / 6, y + h / 2, k);
        line(x - w / 2, y - h / 6, x + w / 2, y - h / 6, k); line(x - w / 2, y + h / 6, x + w / 2, y + h / 6, k);
        var sx = x + w / 6 + (lf - 0.5) * 16;
        lw(1.4); ink(0.6 * k); circ(sx, y - 34, 40, k); if (k > 0.4) arc(sx, y + 150, 120, Math.PI + 0.3, TAU - 0.3);
        paint(0.6 * k, 1); c.fillRect(x - w / 2 + 34, y + 70, 170 * k, 12); paint(0.3 * k); c.fillRect(x - w / 2 + 34, y + 90, 110 * k, 6);
      },
      function (x, y, w, h, lf, k) {
        var s = 1 + 0.08 * Math.sin(lf * Math.PI), r = 70 * s;
        lw(1.2);
        for (var m = 0; m < 12; m++) { var an = m / 12 * TAU + lf * 0.6; ink(0.14 * k); line(x + Math.cos(an) * (r + 18), y + Math.sin(an) * (r + 18), x + Math.cos(an) * (r + 60 + 20 * lf), y + Math.sin(an) * (r + 60 + 20 * lf), k); }
        ink(0.7 * k, 1); circ(x, y, r, k, lf * TAU);
        lw(1.5); star(x, y, 30 * s, k);
      },
      function (x, y, w, h, lf, k) {
        var fh = 250, fw = fh * 9 / 16, m;
        lw(1); ink(0.12 * k); line(x - w / 2, y, x - fw / 2 - 20, y, k); line(x + fw / 2 + 20, y, x + w / 2, y, k);
        lw(1.4); ink(0.7 * k, 1); rr(x - fw / 2, y - fh / 2, fw, fh, 12, k);
        paint(0.3 * k); c.fillRect(x - fw / 2 + 10, y - fh / 2 + 12, (fw - 20) * lf, 3);
        ink(0.5 * k); circ(x, y - 22, 26, k); if (k > 0.4) arc(x, y + 78, 62, Math.PI + 0.3, TAU - 0.3);
        for (m = 0; m < 3; m++) { ink(0.45 * k); circ(x + fw / 2 - 16, y + 10 + m * 30, 7, k); }
        paint(0.35 * k); c.fillRect(x - fw / 2 + 12, y + fh / 2 - 40, 70, 6); c.fillRect(x - fw / 2 + 12, y + fh / 2 - 28, 46, 5);
      }
    ];
    function video() {
      var X0 = -440, TW = 920, RY = 80, TY = RY + 18, mx = 0, my = -140, mw = 520, mh = 292;
      if (P.raw) VI.f += (clamp((P.x - X0) / TW, 0, 1) - VI.f) * (DT ? lag(DT, 0.07) : 1);
      else if (!reduce) { VI.f += DT * 0.05; if (VI.f > 1) VI.f -= 1; }
      // 방송 화면
      var hm = hv('v_mon'), pm = ph(0, 0.4);
      lw(1.3); ink(0.34 + 0.4 * hm, hm); rect(mx - mw / 2, my - mh / 2, mw, mh, pm);
      lw(1); ink(0.1); c.setLineDash([4, 6]); rect(mx - mw * 0.45, my - mh * 0.45, mw * 0.9, mh * 0.9, pm); c.setLineDash([]);
      txt('PROGRAM', mx - mw / 2, my - mh / 2 - 18, 12, (0.42 * (1 - hm)) * pm * lab, hm > 0.5);
      var sec = VI.f * 48;
      txt('00:00:' + pad(Math.floor(sec)) + ':' + pad(Math.floor((sec % 1) * 24)), mx + mw / 2, my - mh / 2 - 18, 12, 0.6 * pm * lab, true, 'right');
      var ci = 0;
      CL[1].forEach(function (q, j) { if (VI.f >= q[0]) ci = j; });
      if (ci !== VI.ci) { if (VI.ci >= 0) VI.flash = T; VI.ci = ci; }
      var pc = ph(0.3, 0.75);
      if (pc > 0) {
        c.save(); c.beginPath(); c.rect(mx - mw / 2, my - mh / 2, mw, mh); c.clip();
        var q = CL[1][ci]; SCN[ci](mx, my, mw, mh, clamp((VI.f - q[0]) / (q[1] - q[0]), 0, 1), pc);
        var fl = 1 - (T - VI.flash) / 0.22; if (fl > 0) { paint(0.16 * fl); c.fillRect(mx - mw / 2, my - mh / 2, mw, mh); }
        c.restore();
      }
      hot('v_mon', 'PROGRAM', mx - mw / 2, my - mh / 2, mw, mh);
      // 타임라인: 눈금, 트랙 넷, 조각
      var pt = ph(0.3, 0.62), htl = hv('v_tl');
      lw(1); ink(0.28); line(X0, RY, X0 + TW, RY, pt);
      for (var m = 0; m <= 46; m++) { var tx = X0 + TW * m / 46, big = m % 5 === 0; ink(big ? 0.3 : 0.14); line(tx, RY - (big ? 9 : 5), tx, RY, pt); }
      TR.forEach(function (tr, j) {
        var ty = TY + tr[1], th = tr[2], pj = ph(0.34 + j * 0.05, 0.66 + j * 0.05);
        txt(tr[0], X0 - 18, ty + th / 2, 12, (0.42 * (1 - htl)) * pj * lab, htl > 0.5, 'right');
        lw(1); ink(0.06); line(X0, ty + th + 4, X0 + TW, ty + th + 4, pj);
        CL[j].forEach(function (q, n) {
          var cx0 = X0 + TW * q[0], cw = TW * (q[1] - q[0]) - 4, on = VI.f >= q[0] && VI.f < q[1], hl = on ? 1 : 0, pq = ph(0.42 + j * 0.05 + n * 0.03, 0.72 + j * 0.05 + n * 0.03);
          if (pq <= 0) return;
          paint((on ? 0.1 : 0.035) * pq, hl); rrFill(cx0, ty, cw, th, 5);
          lw(1.1); ink((on ? 0.75 : 0.3) * pq, hl); rr(cx0, ty, cw, th, 5, pq);
          if (j >= 2) {
            lw(1); ink((on ? 0.5 : 0.22) * pq, hl);
            for (var xx = cx0 + 6; xx < cx0 + cw - 6; xx += 5) { var am = (th / 2 - 6) * (0.25 + 0.75 * Math.abs(Math.sin(xx * 0.13 + j) * Math.sin(xx * 0.031))); line(xx, ty + th / 2 - am, xx, ty + th / 2 + am, 1); }
          } else txt(q[2], cx0 + 10, ty + th / 2, 11, (on ? 0.9 : 0.4) * pq * lab, on);
        });
      });
      var bot = TY + TR[3][1] + TR[3][2] + 8;
      hot('v_tl', 'TIMELINE', X0, TY - 4, TW, bot - TY);
      // 재생 막대
      var pp = ph(0.62, 0.86), hph = hv('v_ph'), px = X0 + TW * VI.f;
      if (pp > 0) {
        lw(1.6 + hph); ink(0.95 * pp, 1); line(px, RY - 2, px, bot, pp);
        paint(0.95 * pp, 1); c.beginPath(); c.moveTo(px - 8, RY - 18); c.lineTo(px + 8, RY - 18); c.lineTo(px + 8, RY - 8); c.lineTo(px, RY - 1); c.lineTo(px - 8, RY - 8); c.closePath(); c.fill();
      }
      hot('v_ph', 'PLAYHEAD', px - 22, RY - 24, 44, bot - RY + 28);
    }

    /* ───── 4 IMAGE PRODUCTION: 포스터 4:5 · 썸네일 16:9 · 배너 3:1 대지. 마우스가 대지 안이면 인물이 따라오고 3등분 점 40 안에서 붙는다.
       안내선과 좌표(그 판 크기의 픽셀), 고른 대지는 손잡이 여덟 개. 아래는 색 견본과 글꼴 견본 ───── */
    var AB = [['i_poster', -480, -290, 320, 400, 'POSTER  4:5', 0.62, 0.36, 1080, 1350], ['i_thumb', -110, -290, 480, 270, 'THUMBNAIL  16:9', 0.7, 0.45, 1280, 720], ['i_banner', -110, 30, 480, 160, 'BANNER  3:1', 0.13, 0.5, 1500, 500]];
    var IM = { i_poster: [0.62, 0.36], i_thumb: [0.7, 0.45], i_banner: [0.13, 0.5] };
    function spiral(cx, cy, R, k) { var b = 0.3063, n = 140, p = [], th1 = Math.log(R / 2) / b; for (var i = 0; i <= n; i++) { var th = th1 * i / n, r = 2 * Math.exp(b * th); p.push(cx + r * Math.cos(-th), cy + r * Math.sin(-th)); } poly(p, k); }
    function bar(x1, y, x2, wdt, k) { c.lineWidth = wdt; line(x1, y, x2, y, k); }
    var COMP = [
      function (x, y, w, h, fx, fy, k) {
        lw(1); ink(0.16 * k, 1); spiral(x + w * 0.618, y + h * 0.382, Math.max(w, h) * 0.9, k);
        lw(1.4); ink(0.7 * k, 1); circ(fx, fy, 56, k); lw(1); ink(0.3 * k); circ(fx, fy, 74, k);
        ink(0.3 * k); bar(x + 26, y + h - 86, x + 26 + (w - 52) * 0.8, 12, k); bar(x + 26, y + h - 62, x + 26 + (w - 52) * 0.55, 12, k);
        ink(0.2 * k); bar(x + 26, y + h - 36, x + 26 + (w - 52) * 0.35, 5, k);
        lw(1.2); ink(0.5 * k, 1); star(x + 34, y + 34, 12, k);
      },
      function (x, y, w, h, fx, fy, k) {
        lw(1); ink(0.08 * k);
        line(x + w / 3, y, x + w / 3, y + h, k); line(x + 2 * w / 3, y, x + 2 * w / 3, y + h, k); line(x, y + h / 3, x + w, y + h / 3, k); line(x, y + 2 * h / 3, x + w, y + 2 * h / 3, k);
        lw(1.4); ink(0.62 * k); circ(fx, fy - 8, 42, k); if (k > 0.4) arc(fx, fy + 128, 104, Math.PI + 0.3, TAU - 0.3);
        ink(0.55 * k, 1); bar(x + 34, y + h * 0.36, x + 34 + w * 0.36, 22, k); bar(x + 34, y + h * 0.36 + 34, x + 34 + w * 0.26, 22, k);
        lw(1.2); ink(0.6 * k, 1); rr(x + 28, y + 24, 64, 22, 11, k);
      },
      function (x, y, w, h, fx, fy, k) {
        lw(1.5); ink(0.8 * k, 1); star(fx, fy, 22, k);
        ink(0.35 * k); bar(x + w * 0.3, y + h / 2 - 12, x + w * 0.64, 12, k); ink(0.22 * k); bar(x + w * 0.3, y + h / 2 + 14, x + w * 0.52, 6, k);
        lw(1.2); ink(0.7 * k, 1); rr(x + w - 140, y + h / 2 - 18, 108, 36, 18, k); line(x + w - 96, y + h / 2, x + w - 74, y + h / 2, k); line(x + w - 81, y + h / 2 - 6, x + w - 74, y + h / 2, k); line(x + w - 81, y + h / 2 + 6, x + w - 74, y + h / 2, k);
      }
    ];
    function image() {
      AB.forEach(function (a, j) {
        var key = a[0], x = a[1], y = a[2], w = a[3], h = a[4], pa = ph(j * 0.1, 0.4 + j * 0.1), hh = hv(key);
        var inside = P.raw && P.x > x && P.x < x + w && P.y > y && P.y < y + h, snap = null, i, m;
        var gx = a[6] + 0.03 * Math.sin(T * 0.6 + j), gy = a[7] + 0.03 * Math.cos(T * 0.5 + j);
        if (inside) {
          gx = (P.x - x) / w; gy = (P.y - y) / h;
          for (i = 1; i <= 2; i++) for (m = 1; m <= 2; m++) { var sx = x + w * i / 3, sy = y + h * m / 3; if (Math.hypot(P.x - sx, P.y - sy) < 40) { snap = [sx, sy]; gx = i / 3; gy = m / 3; } }
        }
        var st = IM[key], f = DT ? lag(DT, 0.14) : 1; st[0] += (gx - st[0]) * f; st[1] += (gy - st[1]) * f;
        if (pa > 0) { paint(0.025 * pa); c.fillRect(x, y, w, h); }
        lw(1.2); ink(0.32 + 0.45 * hh, hh); rect(x, y, w, h, pa);
        txt(a[5], x, y - 18, 12, (0.42 * (1 - hh)) * pa * lab, hh > 0.5);
        var pc = ph(0.3 + j * 0.08, 0.75 + j * 0.06);
        if (pc > 0) { c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); COMP[j](x, y, w, h, x + w * st[0], y + h * st[1], pc); c.restore(); }
        if (hh > 0.02) {
          lw(1); var hs = [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]];
          hs.forEach(function (q) { c.fillStyle = 'rgba(15,15,17,' + (0.9 * hh * A).toFixed(3) + ')'; c.fillRect(q[0] - 4, q[1] - 4, 8, 8); ink(0.9 * hh, 1); c.strokeRect(q[0] - 4, q[1] - 4, 8, 8); });
        }
        if (inside && pc > 0.5) {
          c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
          c.setLineDash([4, 5]); lw(1); ink(0.32, 1);
          if (snap) { line(x, snap[1], x + w, snap[1], 1); line(snap[0], y, snap[0], y + h, 1); } else { line(x, P.y, x + w, P.y, 1); line(P.x, y, P.x, y + h, 1); }
          c.setLineDash([]); c.restore();
          if (snap) { paint(0.95, 1); dot(snap[0], snap[1], 5); lw(1.2); ink(0.7, 1); circ(snap[0], snap[1], 12, 1); }
          txt('X ' + Math.round((P.x - x) / w * a[8]) + '  Y ' + Math.round((P.y - y) / h * a[9]), P.x + 14, P.y - 16, 11, 0.85 * lab, true);
        }
        hot(key, a[5].split('  ')[0], x, y, w, h);
      });
      // 색 견본
      var hp = hv('i_pal'), pp = ph(0.5, 0.82), SW = ['201,173,128', '242,239,233', '138,138,138', '42,42,46', '122,95,58'];
      SW.forEach(function (col, i) {
        var q = clamp(pp * 5 - i, 0, 1); if (q <= 0) return;
        var x = -464 + i * 46, y = 236 - 10 * hp * (0.5 + 0.5 * Math.sin(T * 3 - i * 0.7));
        c.fillStyle = 'rgba(' + col + ',' + (0.92 * q * A).toFixed(3) + ')'; dot(x, y, 15 * easeOut(q));
        lw(1); ink(0.3 * q + 0.4 * hp, hp); circ(x, y, 15, 1);
      });
      txt('PALETTE', -480, 278, 12, (0.42 * (1 - hp)) * pp * lab, hp > 0.5);
      hot('i_pal', 'PALETTE', -488, 210, 240, 82);
      // 글꼴 견본(영문 디스플레이 + 한글 본문)
      var ht = hv('i_type'), pt = ph(0.58, 0.9);
      if (pt > 0) {
        lw(1); ink((0.14 + 0.3 * ht) * pt, 1); line(-110, 300, 370, 300, pt); ink((0.08 + 0.2 * ht) * pt, 1); line(-110, 262, 370, 262, pt); line(-110, 232, 370, 232, pt);
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        paint((0.6 + 0.3 * ht) * pt, ht); c.font = 'italic 400 88px "Bodoni Moda", serif'; c.fillText('Aa', -108, 300);
        paint((0.5 + 0.3 * ht) * pt); c.font = '600 64px "Pretendard Variable", Pretendard, sans-serif'; c.fillText('가', 30, 300);
        c.font = '500 64px "Pretendard Variable", Pretendard, sans-serif'; paint(0.22 * pt); c.fillText('나', 112, 300); paint(0.12 * pt); c.fillText('다', 194, 300);
        txt('TYPE', 370, 318, 12, (0.42 * (1 - ht)) * pt * lab, ht > 0.5, 'right');
      }
      hot('i_type', 'TYPE', -116, 214, 492, 98);
    }

    /* ───── 5 EFFECTS PRODUCTION: ASTRA 글자가 쓸려 채워졌다 지워진다(4.6초 반복, 마우스 곁 글자가 떠오른다).
       아래 왼쪽 이징 곡선(손잡이를 마우스로 당긴다), 오른쪽 모션 경로(가운데 손잡이를 마우스로 당긴다). 경로 위 점은 이징 곡선대로 움직이고 불티를 남긴다 ───── */
    var EF = { h1: null, h2: null, c2: null, parts: [], last: null };
    function effects() {
      var ty = -175, pt = ph(0, 0.45), ht = hv('e_title'), word = 'ASTRA', ws = [], tw = 0, i;
      c.font = '500 150px "Bodoni Moda", serif'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      for (i = 0; i < 5; i++) { var wd = c.measureText(word[i]).width + 8; ws.push(wd); tw += wd; }
      var x0 = -tw / 2, cyc = (((T - G.t0 / 1000) % 4.6) + 4.6) % 4.6;
      var rIn = reduce ? 1 : easeInOut(clamp((cyc - 0.6) / 1.2, 0, 1)), rOut = reduce ? 0 : easeInOut(clamp((cyc - 3.6) / 0.9, 0, 1));
      var near = P.raw ? clamp(1 - Math.abs(P.y - (ty - 50)) / 220, 0, 1) : 0.35, xx = x0;
      lw(1); ink(0.12 * pt); line(x0, -128, x0 + tw, -128, pt);
      for (i = 0; i < 5; i++) {
        var lcx = xx + ws[i] / 2, lift = -18 * Math.exp(-Math.pow((P.x - lcx) / 90, 2)) * near, pi = clamp(pt * 1.6 - i * 0.15, 0, 1);
        if (pi > 0) {
          c.font = '500 150px "Bodoni Moda", serif';
          lw(1.1); ink((0.34 + 0.3 * ht) * pi, ht); c.strokeText(word[i], xx, ty + lift + (1 - pi) * 24);
          var a0 = x0 + tw * rOut, a1 = x0 + tw * rIn, l0 = Math.max(a0, xx - 4), l1 = Math.min(a1, xx + ws[i]);
          if (l1 > l0 && pt >= 1) { c.save(); c.beginPath(); c.rect(l0, ty - 170, l1 - l0, 230); c.clip(); paint(0.92, 1); c.fillText(word[i], xx, ty + lift); c.restore(); }
          var frac = (lcx - x0) / tw;
          diamond(lcx, -128, 7, rIn >= frac && rOut < frac, pi);
        }
        xx += ws[i];
      }
      var mid = (rIn > 0 && rIn < 1) || (rOut > 0 && rOut < 1);
      if (mid && pt >= 1) {
        var ed = rOut > 0 ? x0 + tw * rOut : x0 + tw * rIn, g = c.createLinearGradient(0, ty - 160, 0, ty + 40);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * A).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.strokeStyle = g; lw(2); line(ed, ty - 160, ed, ty + 40, 1);
      }
      hot('e_title', 'TITLE FX', x0 - 10, ty - 122, tw + 20, 190);
      // 이징 곡선
      var gx0 = -480, gy0 = -80, gw = 440, gh = 320, pg = ph(0.25, 0.6), hg = hv('e_ease'), k;
      lw(1.1); ink(0.22 + 0.4 * hg, hg); rr(gx0, gy0, gw, gh, 10, pg);
      txt('EASE', gx0 + 18, gy0 + 22, 12, (0.42 * (1 - hg)) * pg * lab, hg > 0.5);
      lw(1); ink(0.05); for (k = 1; k < 4; k++) { line(gx0 + gw * k / 4, gy0 + 10, gx0 + gw * k / 4, gy0 + gh - 10, pg); line(gx0 + 10, gy0 + gh * k / 4, gx0 + gw - 10, gy0 + gh * k / 4, pg); }
      var A0 = [gx0 + 34, gy0 + gh - 34], A3 = [gx0 + gw - 34, gy0 + 52];
      var inG = P.raw && P.x > gx0 && P.x < gx0 + gw && P.y > gy0 && P.y < gy0 + gh;
      var d1 = [A0[0] + 200 + 30 * Math.sin(T * 0.7), A0[1]], d2 = [A3[0] - 200 - 30 * Math.cos(T * 0.6), A3[1]];
      if (inG) { var dp = [clamp(P.x, A0[0], A3[0]), clamp(P.y, gy0 + 12, gy0 + gh - 12)]; if (P.x < gx0 + gw / 2) d1 = dp; else d2 = dp; }
      if (!EF.h1) { EF.h1 = d1.slice(); EF.h2 = d2.slice(); }
      var fh = DT ? lag(DT, 0.1) : 1;
      EF.h1[0] += (d1[0] - EF.h1[0]) * fh; EF.h1[1] += (d1[1] - EF.h1[1]) * fh; EF.h2[0] += (d2[0] - EF.h2[0]) * fh; EF.h2[1] += (d2[1] - EF.h2[1]) * fh;
      var B = [A0[0], A0[1], EF.h1[0], EF.h1[1], EF.h2[0], EF.h2[1], A3[0], A3[1]], pcv = ph(0.4, 0.8);
      lw(1); ink(0.35 * pcv); line(A0[0], A0[1], EF.h1[0], EF.h1[1], pcv); line(A3[0], A3[1], EF.h2[0], EF.h2[1], pcv);
      lw(2.2); ink(0.9 * pcv, 1); poly(bezPts(B, 40), pcv);
      if (pcv > 0.5) { paint(0.95 * pcv, 1); dot(EF.h1[0], EF.h1[1], 5); dot(EF.h2[0], EF.h2[1], 5); paint(0.9 * pcv); c.fillRect(A0[0] - 4, A0[1] - 4, 8, 8); c.fillRect(A3[0] - 4, A3[1] - 4, 8, 8); }
      var loop = 2.8, ease = function (tt) { var u = clamp((((tt % loop) + loop) % loop) / 2.2, 0, 1), s = bezSolveX(B, A0[0] + (A3[0] - A0[0]) * u); return [bezAt(B, s), (A0[1] - bezAt(B, s)[1]) / (A0[1] - A3[1])]; };
      var e0 = reduce ? [bezAt(B, 0.6), 0.6] : ease(T);
      if (pcv >= 1) {
        c.setLineDash([3, 5]); lw(1); ink(0.25, 1); line(e0[0][0], e0[0][1], e0[0][0], A0[1] + 16, 1); line(e0[0][0], e0[0][1], A3[0] + 16, e0[0][1], 1); c.setLineDash([]);
        paint(1, 1); dot(e0[0][0], e0[0][1], 6);
      }
      hot('e_ease', 'EASE CURVE', gx0, gy0, gw, gh);
      // 모션 경로
      var mx0 = 20, mw = 460, pm = ph(0.35, 0.7), hm = hv('e_path');
      lw(1.1); ink(0.22 + 0.4 * hm, hm); rr(mx0, gy0, mw, gh, 10, pm);
      txt('MOTION PATH', mx0 + 18, gy0 + 22, 12, (0.42 * (1 - hm)) * pm * lab, hm > 0.5);
      var M0 = [mx0 + 50, gy0 + gh - 50], M3 = [mx0 + mw - 50, gy0 + 70], c1 = [mx0 + 70, gy0 + 60];
      var inM = P.raw && P.x > mx0 && P.x < mx0 + mw && P.y > gy0 && P.y < gy0 + gh;
      var dc = inM ? [P.x, P.y] : [mx0 + mw - 110 + 40 * Math.sin(T * 0.5), gy0 + gh - 40 + 20 * Math.cos(T * 0.7)];
      if (!EF.c2) EF.c2 = dc.slice();
      var fc = DT ? lag(DT, 0.12) : 1; EF.c2[0] += (dc[0] - EF.c2[0]) * fc; EF.c2[1] += (dc[1] - EF.c2[1]) * fc;
      var MB = [M0[0], M0[1], c1[0], c1[1], EF.c2[0], EF.c2[1], M3[0], M3[1]];
      c.setLineDash([2, 7]); lw(1.3); ink(0.42 * pm); poly(bezPts(MB, 48), pm); c.setLineDash([]);
      lw(1); ink(0.22 * pm); line(M3[0], M3[1], EF.c2[0], EF.c2[1], pm); line(M0[0], M0[1], c1[0], c1[1], pm);
      if (pm > 0.5) { paint(0.85 * pm, 1); dot(EF.c2[0], EF.c2[1], 4.5); paint(0.4 * pm); dot(c1[0], c1[1], 3.5); }
      diamond(M0[0], M0[1], 8, true, pm); diamond(M3[0], M3[1], 8, true, pm);
      if (pm >= 1) {
        for (k = 6; k >= 1; k--) { var ek = reduce ? e0 : ease(T - k * 0.05), qk = bezAt(MB, clamp(ek[1], -0.2, 1.2)); lw(1); ink(0.06 * (7 - k)); circ(qk[0], qk[1], 13, 1); }
        var qm = bezAt(MB, clamp(e0[1], -0.2, 1.2));
        paint(0.95, 1); dot(qm[0], qm[1], 12); lw(1.2); ink(0.5, 1); circ(qm[0], qm[1], 22, 1);
        if (EF.last && DT && A >= 0.99) { var dv = Math.hypot(qm[0] - EF.last[0], qm[1] - EF.last[1]), ne = Math.min(4, Math.floor(dv * 0.3)); for (k = 0; k < ne; k++) EF.parts.push({ x: qm[0], y: qm[1], vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, life: 1 }); }
        if (A >= 0.99) EF.last = qm;
      }
      for (k = EF.parts.length - 1; k >= 0; k--) {
        var pp = EF.parts[k];
        if (A >= 0.99) {
          pp.life -= DT / 0.9;
          if (pp.life <= 0) { EF.parts.splice(k, 1); continue; }
          if (P.raw) { pp.vx += (P.x - pp.x) * 0.8 * DT; pp.vy += (P.y - pp.y) * 0.8 * DT; }
          pp.x += pp.vx * DT; pp.y += pp.vy * DT;
        }
        paint(0.8 * pp.life, 1); c.fillRect(pp.x - 1.8, pp.y - 1.8, 3.6, 3.6);
      }
      if (EF.parts.length > 120) EF.parts.splice(0, EF.parts.length - 120);
      hot('e_path', 'MOTION PATH', mx0, gy0, mw, gh);
    }

    var GFX = [studio, broadcast, video, image, effects];

    /* ── 바탕 ── */
    function pool(x, y, r, rgb, a) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); g.addColorStop(0.55, 'rgba(' + rgb + ',' + (a * 0.35).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    function grid(px, py) {
      var sp = S.deck ? 30 : 26, W = S.W, H = S.H, R = S.deck ? 230 : 170, x, y, ox = (W % sp) / 2, oy = (H % sp) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      for (y = oy; y < H; y += sp) for (x = ox; x < W; x += sp) ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
      var x0 = ox + Math.max(0, Math.ceil((px - R - ox) / sp)) * sp, y0 = oy + Math.max(0, Math.ceil((py - R - oy) / sp)) * sp, ga = S.deck ? 0.3 + 0.2 * P.act : 0.22;
      for (y = y0; y <= py + R && y < H; y += sp) for (x = x0; x <= px + R && x < W; x += sp) {
        var q = 1 - Math.hypot(x - px, y - py) / R; if (q <= 0) continue; q *= q;
        ctx.fillStyle = 'rgba(' + GOLD + ',' + (q * ga).toFixed(3) + ')';
        var s = 1.2 + q * 1.3; ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    // 고른 줄 글 뒤에서는 그림만 옅게(위아래 48px 번짐)
    function band(b) {
      var y0 = b.top - S.top, y1 = b.bottom - S.top, f = 48, tot = y1 - y0 + f * 2;
      if (y1 <= y0) return;
      oc.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      oc.globalCompositeOperation = 'destination-out';
      var g = oc.createLinearGradient(0, y0 - f, 0, y1 + f);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f / tot, 'rgba(0,0,0,0.74)'); g.addColorStop(1 - f / tot, 'rgba(0,0,0,0.74)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      oc.fillStyle = g; oc.fillRect(0, y0 - f, S.W, tot);
      oc.globalCompositeOperation = 'source-over';
    }
    // 초점 틀이 맞은 물건의 이름표(틀 바로 위, 금빛)
    function tag(k) {
      for (var i = 0; i < hots.length; i++) {
        var h = hots[i], v = HL[h.key] || 0;
        if (v < 0.02) continue;
        ctx.font = '500 11px Geist, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1.6px';
        ctx.fillStyle = 'rgba(' + GOLD + ',' + (0.95 * v).toFixed(3) + ')';
        ctx.fillText(h.label, h.x - 8 * k, h.y - 8 * k - 8);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      }
    }
    // 아래 가운데 노출계(EV -3 ~ +3). 바늘이 손의 가로 자리를 따라간다
    function ruler() {
      if (S.H < 760) return;
      var y = S.H - 30, w = Math.min(340, S.W * 0.24), x0 = S.cx - w / 2, n = 24, i;
      ctx.lineWidth = 1;
      for (i = 0; i <= n; i++) {
        var x = Math.round(x0 + w * i / n) + 0.5, big = i % 4 === 0;
        ctx.strokeStyle = 'rgba(255,255,255,' + (big ? 0.3 : 0.13) + ')'; ctx.beginPath(); ctx.moveTo(x, y - (big ? 7 : 4)); ctx.lineTo(x, y); ctx.stroke();
        if (big) { ctx.font = '500 10px Geist, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; var v = i / 4 - 3; ctx.fillText(v > 0 ? '+' + v : '' + v, x, y + 5); }
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText('EV', x0 - 12, y - 2);
      var xi = S.cx + clamp(P.x / 480, -1, 1) * w / 2;
      ctx.fillStyle = 'rgba(' + GOLD + ',0.9)'; ctx.beginPath(); ctx.moveTo(xi - 4.5, y - 15); ctx.lineTo(xi + 4.5, y - 15); ctx.lineTo(xi, y - 9); ctx.closePath(); ctx.fill();
    }

    function render(t, dt) {
      var o = opt.state();
      var r = cv.getBoundingClientRect(); S.left = r.left; S.top = r.top;
      var wy = 0; if (o.deck && o.band && r.height) wy = clamp(-((o.band.top + o.band.bottom) / 2 - r.top - r.height * 0.535) * 0.4, -70, 90);
      S.oy += (wy - S.oy) * (dt ? lag(dt, 0.25) : 1);
      S.hb = o.deck ? hud.getBoundingClientRect().bottom - r.top : 0;
      if (!size(o.deck)) return;
      if (t - lastT > 600) tcStart = t;
      lastT = t; T = t / 1000; DT = dt;
      pointer(o, dt);
      var d = S.dpr, W = S.W, H = S.H, M = Math.max(W, H), px = S.cx + P.x * U, py = S.cy + P.y * U;
      // 바탕: 숯색 + 금빛 번짐 둘(천천히 떠돈다) + 손 곁 번짐 + 점 격자
      ctx.setTransform(d, 0, 0, d, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0f0f11'; ctx.fillRect(0, 0, W, H);
      pool(W * 0.7 + (px - S.cx) * 0.08 + Math.sin(T * 0.13) * W * 0.03, H * 0.34 + Math.cos(T * 0.11) * H * 0.04, M * 0.62, GOLD, 0.075);
      pool(W * 0.14 + Math.sin(T * 0.09) * W * 0.05, H * 1.02, M * 0.5, '255,255,255', 0.03);
      pool(px, py, S.deck ? 300 : 220, GOLD, 0.045 + 0.035 * P.act);
      grid(px, py);
      // 그림(따로 그린 뒤 고른 줄 자리만 옅게 해서 얹는다)
      nh = [];
      oc.setTransform(d, 0, 0, d, 0, 0); oc.globalAlpha = 1; oc.globalCompositeOperation = 'source-over'; oc.clearRect(0, 0, W, H);
      oc.setTransform(d * U, 0, 0, d * U, d * S.cx, d * S.cy); oc.lineCap = 'round'; oc.lineJoin = 'round'; c = oc;
      if (G.prev >= 0) { var pu = (t - G.pt0) / G.pdur; if (pu >= 1 || reduce) G.prev = -1; else { A = 1 - easeOut(pu); PR = 1; GFX[G.prev](); } }
      if (G.cur >= 0) { A = 1; PR = G.mode === 'now' || reduce ? 1 : clamp((t - G.t0) / 900, 0, 1); GFX[G.cur](); }
      A = 1; PR = 1;
      if (o.band) band(o.band);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = S.deck ? 1 : 0.34; ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      hots = nh;
      tag(o.k || 1);
      if (S.deck) ruler();
      // 녹화 시간(이 구역에 들어온 때부터, 초당 24칸)
      var e = reduce ? 0 : Math.max(0, (t - tcStart) / 1000), s = Math.floor(e);
      var str = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + ':' + pad(Math.floor((e % 1) * 24));
      if (str !== tcLast) { tcLast = str; tcEl.textContent = str; }
    }

    function show(i, mode) {
      if (i === G.cur) return;
      var t = performance.now();
      if (mode !== 'now' && G.cur >= 0 && i >= 0 && !reduce) { G.prev = G.cur; G.pt0 = t; G.pdur = mode === 'cut' ? 140 : 650; } else G.prev = -1;
      G.cur = i; G.mode = reduce ? 'now' : mode; G.t0 = t + (mode === 'cut' ? 60 : 0);
      HL = {}; HK = null; EF.parts = []; EF.last = null;
      if (mode === 'cut' && i >= 0 && !reduce && cv.animate) cv.animate([{ filter: 'blur(7px)' }, { filter: 'blur(0px)' }], { duration: 450, delay: 60, easing: 'cubic-bezier(0.3, 0.6, 0.3, 1)', fill: 'backwards' });
      if (reduce) render(t, 0);
    }
    function hit(x, y) {
      var lx = x - S.left, ly = y - S.top;
      for (var i = hots.length - 1; i >= 0; i--) { var h = hots[i]; if (lx >= h.x && lx <= h.x + h.w && ly >= h.y && ly <= h.y + h.h) return proxy(h.key); }
      return null;
    }
    // 초점 틀이 겨눌 수 있게 getBoundingClientRect를 가진 대리 물건(물건마다 하나, 같은 것을 돌려준다)
    function proxy(key) {
      if (!prox[key]) prox[key] = { key: key, className: 'hot ' + key, getBoundingClientRect: function () {
        for (var i = 0; i < hots.length; i++) if (hots[i].key === key) { var h = hots[i]; return { left: S.left + h.x, top: S.top + h.y, width: h.w, height: h.h, right: S.left + h.x + h.w, bottom: S.top + h.y + h.h }; }
        return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
      } };
      return prox[key];
    }
    return {
      show: show,
      frame: render,
      hit: hit,
      focus: function (k) { HK = k; },
      redraw: function () { render(performance.now(), 0); },
      state: function () { return { cur: G.cur, hot: HK, hots: hots.map(function (h) { return h.key + '@' + Math.round(S.left + h.x + h.w / 2) + ',' + Math.round(S.top + h.y + h.h / 2); }).join(' '), f: +VI.f.toFixed(2) }; }
    };
  };
})();
