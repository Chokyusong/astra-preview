/* 엔터테인먼트 숏폼 화면의 카드 모션. 모양은 ent-reel.css, 설명은 설계 client/design-refs/pages-motion-design.md 4절.
   쪽 파일이 화면에 들어올 때 EntReel.start(), 떠날 때 EntReel.stop()을 부른다. 혼자 시작하지 않는다.
   EntReel.start(분야 번호 0~3)는 여는 장면 없이 그 분야 무리부터 돈다(2판, 지시서 008).
   3판(대표 2026-11-11 "witu 모션그래픽과 똑같이"): witu 첫 화면 영상(약 18초)을 0.1초 간격으로 찍어 순서와 빠르기를 맞췄다.
   여는 장면(아래에서 튀어 올라 쌓임 → 한 줄 → 한 장)은 대표 말로 2판 그대로 둔다. 구역 전체에 우주 사진 배경이 깔리고(여는 장면은 또렷하게, 나머지는 옅게)
   별이 반짝이며 흐르고 마우스에 반응한다.
   그 뒤(옆 카드가 뒤에서 나오고 뒤 벽이 커지며 나타남 → 분야마다 1.9초 → 큰 글자와 흐르는 세 줄 → 가운데로 작아짐 → 처음부터)는 witu 빠르기.
   옆 카드는 장면마다 바깥으로 천천히 벌어진다(카드 자체가 옆으로 펼쳐짐). 뒤 벽은 세로 줄마다 위아래로 천천히 흐른다. */
(function () {
  'use strict';
  var P = '../2026-11-10-pages/img/', L = '../2026-11-11-ent-shorts/img/';
  // 카드 열두 장. 앞의 넷은 지금 시안의 숏폼 예시 사진(분야 순서), 뒤의 여덟은 GPT로 만든 예시 사진
  var PHOTOS = [P + 'ent-short-2.webp', P + 'ent-short-3.webp', P + 'ent-short-1.webp', P + 'ent-short-4.webp',
    L + 'short-05.webp', L + 'short-06.webp', L + 'short-07.webp', L + 'short-08.webp',
    L + 'short-09.webp', L + 'short-10.webp', L + 'short-11.webp', L + 'short-12.webp'];
  // 글은 모두 지금 시안에 있는 문구다(새로 쓴 것 없음)
  var STAGE = { t: 'A NEW STAGE FOR EVERY TALENT', s: '각자의 개성과 재능은 저마다 다른 방식으로 빛납니다.' };
  var FIELDS = [
    { t: 'PERSONAL BROADCASTING', s: '개인의 매력을 방송만의 색으로 만듭니다.', lead: 0 },
    { t: 'YOUTUBE', s: '채널의 개성을 콘텐츠와 성장으로 연결합니다.', lead: 1 },
    { t: 'TIKTOK', s: '짧은 순간에 크리에이터의 매력을 선명하게 담습니다.', lead: 2 },
    { t: 'INFLUENCER', s: '영향력과 브랜드의 만남을 기획합니다.', lead: 3 }
  ];
  // 무리(부채꼴) 자리: 가운데 카드의 가로·세로를 1로 본 위치, 크기, 기울기, 깊이
  var SLOTS = [
    { x: 0, y: 0, s: 1, r: 0, z: 20, d: 4 },
    { x: -0.62, y: -0.10, s: 0.56, r: 0, z: 12, d: 9 }, { x: 0.66, y: -0.10, s: 0.56, r: 0, z: 12, d: 9 },
    { x: -0.80, y: 0.20, s: 0.57, r: -3, z: 14, d: 13 }, { x: 0.83, y: 0.21, s: 0.57, r: 3, z: 14, d: 13 },
    { x: -1.14, y: -0.16, s: 0.55, r: -8, z: 10, d: 18 }, { x: 1.16, y: -0.18, s: 0.55, r: 8, z: 10, d: 18 },
    { x: -1.47, y: 0.12, s: 0.5, r: -12, z: 8, d: 24 }, { x: 1.48, y: 0.12, s: 0.5, r: 14, z: 8, d: 24 }
  ];
  // "무대" 장면 자리: 가운데가 크고 양옆으로 갈수록 작아지는 한 줄
  var LINE = [
    { x: 0, y: 0, s: 0.9, z: 20, d: 4 },
    { x: -0.66, y: 0.02, s: 0.7, z: 16, d: 8 }, { x: 0.66, y: 0.02, s: 0.7, z: 16, d: 8 },
    { x: -1.2, y: 0.03, s: 0.56, z: 12, d: 14 }, { x: 1.2, y: 0.03, s: 0.56, z: 12, d: 14 },
    { x: -1.64, y: 0.04, s: 0.44, z: 8, d: 20 }, { x: 1.64, y: 0.04, s: 0.44, z: 8, d: 20 }
  ];
  // 카드 열두 장이 각각 어느 분야인지(PHOTOS와 같은 순서). 카드를 누르면 그 카드가 가운데로 오고 글이 그 분야로 바뀐다
  var CARD_FIELD = [0, 1, 2, 3, 0, 2, 1, 0, 2, 1, 3, 0];
  // pick: 누른 카드가 가운데에 머무는 시간(저절로 넘어갈 때의 field보다 길게)
  // 시간(ms). lead: 가운데 한 장으로 시작해 무대로 펼치기까지(5판, 대표 11-12). 그 뒤는 witu 영상에서 잰 값: 무대 약 2초, 분야 1.6~2.2초, 맺음 약 2.3초, 작아짐 0.4초
  var T = { lead: 450, stage: 1950, field: 1900, pick: 4200, outro: 2500, shrink: 450, gap: 250 };

  function rnd(i, k) { var v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); }   // 늘 같은 흩어짐
  var reel = document.getElementById('reel');
  if (!reel) return;
  var running = false, stage = document.getElementById('reel-stage'), copy = document.getElementById('reel-copy');
  var titleEl = copy.querySelector('.reel-title span'), subEl = copy.querySelector('.reel-sub span'), segs = document.getElementById('reel-segs');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = PHOTOS.length, cards = [], W = 200, H = 356, vw = 0, vh = 0, cy = 0, timers = [], now = null, hold = null, slotOf = [], said = '';   // hold: 확인할 때 장면을 멈춰 두는 값
  reel.style.setProperty('--scene', T.field / 1000 + 's');

  PHOTOS.forEach(function (src, i) {
    var el = document.createElement('figure'); el.className = 'rc';
    el.innerHTML = '<span class="rc-in"><img src="' + src + '" alt="" draggable="false"></span>';
    el.tabIndex = -1; el.setAttribute('role', 'button'); el.setAttribute('aria-label', FIELDS[CARD_FIELD[i]].t + ' 영상 보기');
    el.addEventListener('click', function () { pick(i); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } });
    stage.appendChild(el); cards.push(el);
  });
  FIELDS.forEach(function (f, k) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', f.t);
    b.addEventListener('click', function () { clear(); field(k, null, T.pick); });
    segs.appendChild(b);
  });
  // 배경 한 장(쪽 파일의 data-open-img, 대표 11-11 우주 사진). 구역 맨 아래에 깔고, 위에 별 그림판을 겹친다
  var sky = null, skyIn = null, skyCv = null, sg = null, stars = [], skyRaf = 0, skyT = 0, sm = { x: 0, y: 0, tx: 0, ty: 0, px: -1e4, py: -1e4, w: 0, h: 0, dpr: 1 };
  var openSrc = reel.getAttribute('data-open-img');
  if (openSrc) {
    sky = document.createElement('div'); sky.className = 'reel-sky'; sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = '<div class="reel-sky-in"><img src="' + openSrc + '" alt=""><canvas></canvas></div>';
    reel.insertBefore(sky, reel.firstChild);
    skyIn = sky.firstChild; skyCv = sky.querySelector('canvas'); sg = skyCv.getContext('2d');
  }
  // 별: 넓이 9,000px²마다 하나. 깊이(0.2~1)가 클수록 밝고 빨리 흐르고 마우스에 많이 밀린다. 셋에 하나는 따뜻한 빛
  function skySize() {
    if (!sky) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.25), w = skyIn.clientWidth, h = skyIn.clientHeight;
    if (!w || (w === sm.w && h === sm.h)) return;
    skyCv.width = Math.round(w * dpr); skyCv.height = Math.round(h * dpr);
    sm.w = w; sm.h = h; sm.dpr = dpr; stars = [];
    var n = Math.round(w * h / 9000);
    for (var i = 0; i < n; i++) stars.push({ x: rnd(i, 41) * w, y: rnd(i, 42) * h, d: 0.2 + rnd(i, 43) * 0.8, r: 0.45 + Math.pow(rnd(i, 44), 3) * 1.5, ph: rnd(i, 45) * 6.283, sp: 0.5 + rnd(i, 46) * 1.6, warm: rnd(i, 47) < 0.33 });
  }
  function skyFrame(t) {
    if (!running) { skyRaf = 0; return; }
    skyRaf = requestAnimationFrame(skyFrame);
    var dt = skyT ? Math.min(0.05, (t - skyT) / 1000) : 0.016, k = 1 - Math.exp(-dt / 0.6);
    skyT = t;
    sm.x += (sm.tx - sm.x) * k; sm.y += (sm.ty - sm.y) * k;
    // 사진은 마우스 반대쪽으로 가로 창의 1.4%, 세로 1%까지
    skyIn.style.transform = 'translate3d(' + (sm.x * vw * 0.014).toFixed(1) + 'px,' + (sm.y * vh * 0.01).toFixed(1) + 'px,0)';
    var w = sm.w, h = sm.h, s = t / 1000;
    sg.setTransform(sm.dpr, 0, 0, sm.dpr, 0, 0);
    sg.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var x = st.x - s * 7 * st.d + sm.x * 28 * st.d; x = ((x % w) + w) % w;
      var y = st.y + sm.y * 18 * st.d;
      var dx = x - sm.px, dy = y - sm.py, near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 170);
      var tw = 0.6 + 0.4 * Math.sin(s * st.sp * 2 + st.ph);
      var a = Math.min(1, (0.18 + 0.55 * st.d) * tw + near * near * 0.85);
      if (a < 0.03) continue;
      var r = st.r * (1 + near * 1.3);
      sg.fillStyle = st.warm ? 'rgba(255,214,160,' + a.toFixed(3) + ')' : 'rgba(222,240,255,' + a.toFixed(3) + ')';
      sg.beginPath(); sg.arc(x, y, r, 0, 6.2832); sg.fill();
      if (near > 0.35) { sg.fillStyle = 'rgba(255,255,255,' + (a * 0.12).toFixed(3) + ')'; sg.beginPath(); sg.arc(x, y, r * 4, 0, 6.2832); sg.fill(); }
    }
  }
  function skyOn() { if (!sky || reduce) return; skySize(); if (!skyRaf) { skyT = 0; skyRaf = requestAnimationFrame(skyFrame); } }
  // 뒤 격자와 흐르는 줄
  var grid = document.getElementById('reel-grid');
  // 세로 줄마다 같은 카드 묶음을 세 번 넣어 끊김 없이 흐르게 한다. 홀수 줄은 위로, 짝수 줄은 아래로(대표 11-11 "위아래 롤링")
  function buildGrid() {
    var cols = vw < 720 ? 6 : 14, rows = 6, html = '';
    grid.style.setProperty('--cols', cols);
    for (var c = 0; c < cols; c++) {
      html += '<div class="gc" style="--gt:' + (34 + rnd(c, 31) * 14).toFixed(1) + 's;--gy:' + (-rnd(c, 32) * 30).toFixed(1) + '%">';
      for (var copyNo = 0; copyNo < 3; copyNo++) for (var r = 0; r < rows; r++) {
        var dx = (c - (cols - 1) / 2) / (cols / 2), dy = (r - (rows - 1) / 2) / (rows / 2), dist = Math.sqrt(dx * dx + dy * dy);
        html += '<i style="background-image:url(' + PHOTOS[(r * 5 + c * 3) % N] + ');--gd:' + (0.05 + dist * 0.28).toFixed(2) + 's;--go:' + (0.2 + dist * 0.16).toFixed(2) + '"></i>';
      }
      html += '</div>';
    }
    grid.innerHTML = html;
  }
  [].forEach.call(document.querySelectorAll('.reel-row'), function (row, k) {
    var html = '';
    for (var copyNo = 0; copyNo < 2; copyNo++) for (var i = 0; i < 18; i++) html += '<i style="background-image:url(' + PHOTOS[(i + k * 4) % N] + ')"></i>';
    row.innerHTML = html;
  });

  function measure() {
    vw = reel.clientWidth; vh = reel.clientHeight;
    W = Math.min(vw * 0.36, vh * 0.235, 320); H = W * 16 / 9;
    reel.style.setProperty('--W', W.toFixed(1) + 'px');
    cy = parseFloat(getComputedStyle(cards[0]).top);
  }
  // 카드 한 장을 자리에 놓는다. 단위: x는 W, y는 H의 배수
  function put(i, p) {
    var st = cards[i].style;
    st.setProperty('--x', (p.x * W).toFixed(1) + 'px'); st.setProperty('--y', (p.y * H).toFixed(1) + 'px');
    st.setProperty('--r', (p.r || 0) + 'deg'); st.setProperty('--s', p.s); st.setProperty('--o', p.o == null ? 1 : p.o);
    st.setProperty('--z', p.z || 1); st.setProperty('--d', p.d || 0);
    st.setProperty('--dur', (p.dur == null ? 0.9 : p.dur) + 's'); st.setProperty('--dl', (p.dl || 0) + 's');
    st.setProperty('--odur', (p.odur == null ? 0.4 : p.odur) + 's');
    if (p.ez) st.setProperty('--ez', p.ez); else st.removeProperty('--ez');
  }
  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  function setLead(i) { cards.forEach(function (c, k) { c.classList.toggle('lead', k === i); }); if (i != null) { void cards[i].offsetWidth; } }
  function say(t, s) {
    if (said === t && copy.classList.contains('in')) return;   // 같은 분야 안에서 카드만 바꿀 때는 글을 그대로 둔다
    said = t;
    copy.classList.remove('in'); copy.classList.add('out');
    later(reduce ? 0 : 180, function () {
      titleEl.innerHTML = t.split(' ').map(function (w, k) { return '<span class="rw" style="--wi:' + k + '">' + esc(w) + '</span>'; }).join(' ');
      subEl.innerHTML = s.split('').map(function (ch, k) { return '<span class="rk" style="--ci:' + k + '">' + esc(ch) + '</span>'; }).join('');
      copy.classList.remove('out'); void copy.offsetWidth; copy.classList.add('in');
    });
  }
  function esc(x) { return x.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function hush() { said = ''; copy.classList.remove('in'); copy.classList.add('out'); }
  function mode(name) { reel.classList.remove('cluster', 'outro', 'grid-on', 'shrink', 'open-img'); if (name) reel.classList.add(name); }

  // 1. 여는 장면(5판, 대표 11-12 "앞에 카드 밑에 깔려 있는 건 없애고 이 화면에서 펼쳐지는 것부터"): 우주 배경 위 가운데 카드 한 장에서 시작해 곧바로 무대로 펼쳐진다.
  //    (전: 아래에서 튀어 올라 쌓임 0.9초 → 한 줄 1.1초 → 한 장으로 접힘 0.6초). 배경은 여는 장면에서 또렷하고, 분야 무리에서 옅게, 무대·맺음에서는 꺼진다(대표 11-11)
  function open() {
    now = open; mode(''); hush(); setLead(null); cards.forEach(function (c) { c.tabIndex = -1; });
    cards.forEach(function (c, i) { put(i, i === 0 ? { x: 0, y: 0, s: 0.9, z: 20, o: 1, dur: 0, odur: 0.3 } : { x: 0, y: 0, s: 0.5, o: 0, z: 5, dur: 0, odur: 0 }); });
    void stage.offsetWidth;
    reel.classList.add('open-img');
    later(T.lead, function () { if (hold !== 'row') stageScene(0); });
  }
  // 옆 카드가 그 장면에 머무는 동안 바깥으로 천천히 벌어진다(witu: 사진 안이 움직이는 것이 아니라 카드 자체가 옆으로 펼쳐진다, 대표 11-11)
  function spread(list, base, from, until) {
    if (reduce || hold) return;
    later(from, function () {
      list.forEach(function (it) {
        var p = base[it.slot]; if (!p || !it.slot) return;
        put(it.card, Object.assign({}, p, { x: p.x * 1.12, r: (p.r || 0) * 1.4, dur: Math.max(0.4, (until - from) / 1000 + 0.3), dl: 0, ez: 'cubic-bezier(.3,.1,.5,1)' }));
      });
    });
  }
  // 2. "무대" 장면(witu): 가운데 카드 뒤에서 옆 카드가 나오고, 뒤 벽이 가운데서부터 커지며 나타난다
  function stageScene(center) {
    now = stageScene; setLead(null);
    center = center == null ? 0 : center;
    var order = [center].concat(cards.map(function (c, i) { return i; }).filter(function (i) { return i !== center; }));
    order.forEach(function (ci, n) {
      if (n > 0 && n < LINE.length) put(ci, { x: 0, y: 0, s: 0.62, o: 0, z: 2, dur: 0, odur: 0 });
    });
    void stage.offsetWidth;
    later(20, function () {
      mode('grid-on');
      order.forEach(function (ci, n) {
        put(ci, n < LINE.length ? Object.assign({ dur: n ? 0.5 : 0.4, odur: 0.22, dl: Math.floor((n + 1) / 2) * 0.05, ez: 'cubic-bezier(.16,.84,.3,1)' }, LINE[n]) : { x: 0, y: 0, s: 0.5, o: 0, z: 1, dur: 0.3, odur: 0.2 });
        cards[ci].tabIndex = n < LINE.length ? 0 : -1;
      });
      spread(order.map(function (ci, n) { return { card: ci, slot: n }; }), LINE, 520, T.stage);
    });
    say(STAGE.t, STAGE.s);
    later(T.stage, function () { if (!hold) field(0); });
  }
  // 3. 분야 네 장면: 그 분야 카드가 가운데로 오고 나머지가 부채꼴로 자리를 바꾼다.
  //    picked(카드 번호)가 있으면 그 카드를 가운데에 둔다. 이미 무리 안에 보이는 카드면 가운데 카드와 자리만 맞바꾼다
  function field(k, picked, stay) {
    var wasCluster = reel.classList.contains('cluster'), lead, rest = [], i, turn;
    mode('cluster');
    if (picked != null && wasCluster && slotOf[picked] > 0) {
      lead = picked; slotOf[slotOf.indexOf(0)] = slotOf[picked]; slotOf[picked] = 0;
    } else {
      lead = picked != null ? picked : FIELDS[k].lead;
      for (i = 0; i < N; i++) if (i !== lead) rest.push(i);
      turn = k * 3 % rest.length; rest = rest.slice(turn).concat(rest.slice(0, turn));   // 장면마다 자리를 돌린다
      slotOf = []; slotOf[lead] = 0;
      rest.forEach(function (ci, n) { slotOf[ci] = n < SLOTS.length - 1 ? n + 1 : -1; });
    }
    cards.forEach(function (c, ci) {
      var sl = slotOf[ci];
      if (sl >= 0) put(ci, Object.assign({ dur: sl === 0 ? 0.42 : 0.48, odur: 0.25, dl: sl === 0 ? 0 : 0.015 * (sl - 1), ez: 'cubic-bezier(.2,.8,.2,1)' }, SLOTS[sl]));
      else put(ci, { x: 0, y: 0.05, s: 0.5, o: 0, z: 1, dur: 0.35, odur: 0.18 });
      c.tabIndex = sl > 0 ? 0 : -1;
    });
    stay = stay || T.field;
    spread(cards.map(function (c, ci) { return { card: ci, slot: slotOf[ci] }; }).filter(function (it) { return it.slot > 0; }), SLOTS, 480, stay);
    reel.style.setProperty('--scene', stay / 1000 + 's');
    setLead(lead);
    [].forEach.call(segs.children, function (b, n) { b.classList.toggle('done', n < k); b.classList.remove('now'); void b.offsetWidth; b.classList.toggle('now', n === k); b.setAttribute('aria-pressed', n === k); });
    say(FIELDS[k].t, FIELDS[k].s);
    if (reduce || hold) return;
    later(stay, function () { if (k < FIELDS.length - 1) field(k + 1); else outro(); });
  }
  // 카드를 눌렀을 때: 무리 장면이나 무대 장면에서 보이는 카드만 받는다. 가운데 카드는 이미 가운데라 그대로 둔다
  function pick(i) {
    var inCluster = reel.classList.contains('cluster'), inStage = reel.classList.contains('grid-on');
    if (!inCluster && !inStage) return;
    if (parseFloat(cards[i].style.getPropertyValue('--o')) < 0.5) return;
    if (inCluster && slotOf[i] === 0) return;
    clear(); field(CARD_FIELD[i], i, T.pick);
  }
  // 4. 맺는 장면: 카드가 바깥으로 흩어지고 큰 글자가 또렷해진다. 뒤로 흐린 카드 세 줄이 흐른다
  function outro() {
    now = outro; mode('outro'); hush(); setLead(null); cards.forEach(function (c) { c.tabIndex = -1; });
    cards.forEach(function (c, i) {
      var st = c.style, x = parseFloat(st.getPropertyValue('--x')) / W, y = parseFloat(st.getPropertyValue('--y')) / H;
      put(i, { x: x * 2.4, y: y * 2 + (i === FIELDS[3].lead ? 0.1 : 0), r: (rnd(i, 9) - 0.5) * 30, s: 0.4, o: 0, dur: 0.5, odur: 0.32, ez: 'cubic-bezier(.5,0,.8,.4)' });
    });
    later(T.outro, function () { if (hold) return; reel.classList.add('shrink'); later(T.shrink, function () { mode(''); later(T.gap, open); }); });
  }

  // from: 분야 번호를 주면 여는 장면 없이 그 분야 무리부터 돈다(2판: 네 분야 화면에서 칸을 눌러 넘어왔을 때). 그 분야는 누른 카드처럼 오래 머문다
  function start(from) {
    running = true; clear(); measure(); buildGrid(); skyOn();
    if (from != null && FIELDS[from]) {
      cards.forEach(function (c, i) { put(i, { x: 0, y: 0.05, s: 0.5, o: 0, z: 1, dur: 0, odur: 0 }); });
      void stage.offsetWidth;
      field(from, null, reduce ? null : T.pick); return;
    }
    if (reduce) { field(0); return; } open();
  }
  // 화면을 떠났을 때: 멈추고 비워 둔다(다시 들어오면 처음부터 돈다)
  function stop() {
    running = false; clear(); mode(''); hush(); setLead(null);
    cards.forEach(function (c, i) { c.tabIndex = -1; c.style.setProperty('--dur', '0s'); c.style.setProperty('--odur', '0s'); c.style.setProperty('--dl', '0s'); c.style.setProperty('--o', 0); });
  }
  // 마우스: 카드가 깊이만큼 마우스 반대쪽으로 밀린다(가운데 카드는 조금, 바깥 카드는 많이)
  reel.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || reduce) return;
    var box = reel.getBoundingClientRect();
    reel.style.setProperty('--mx', (-((e.clientX - box.left) / box.width - 0.5) * 2).toFixed(3));
    if (sky) { var cb = skyCv.getBoundingClientRect(); sm.tx = -((e.clientX - box.left) / box.width - 0.5) * 2; sm.ty = -((e.clientY - box.top) / box.height - 0.5) * 2; sm.px = e.clientX - cb.left; sm.py = e.clientY - cb.top; }
    reel.style.setProperty('--my', (-((e.clientY - box.top) / box.height - 0.5) * 2).toFixed(3));
  });
  reel.addEventListener('pointerleave', function () { reel.style.setProperty('--mx', 0); reel.style.setProperty('--my', 0); sm.tx = sm.ty = 0; sm.px = sm.py = -1e4; });
  var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (running) start(); }, 200); });
  document.addEventListener('visibilitychange', function () { if (!running) return; if (!document.hidden) start(); else clear(); });
  window.EntReel = window.__reel = { stop: stop, running: function () { return running; }, hold: function (v) { hold = v; }, start: start, field: function (k) { clear(); field(k); }, pick: pick, slots: function () { return slotOf.slice(); }, outro: function () { clear(); outro(); }, stage: function () { clear(); stageScene(0); }, open: function () { clear(); open(); }, T: T };
})();
