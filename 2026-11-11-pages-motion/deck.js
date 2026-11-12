/* 움직이는 시안 공통 틀 (지시서 006). 브랜드 3판(../2026-11-11-brand-v3/source/brand-v3.src.html)의 "한 화면씩 넘기기"를 뽑았다.
   값은 브랜드 3판과 같다: 넘김 0.9초, 휠 한 번에 한 화면(넘어가는 동안의 휠과 관성 신호는 버림), 키보드·이동 표시·Tab·터치 쓸기.
   브랜드만의 것(빛이 번지는 넘김, 조명, 연기)은 넣지 않았다.

   쪽 파일이 하는 일
   - 화면마다 class="scene"과 data-name="화면 이름"을 단다. 밝은 화면(흰 문의)에는 data-light를 단다.
   - 차례로 떠오를 것에 class="rise"와 style="--i:번호", 줄마다 올라올 제목에 data-lines(시작 번호), 낱말마다 올라올 큰 글에 data-words.
   - 마지막에 Deck.setup({ ... })을 부른다. 넘길 수 있는 갈고리(모두 없어도 된다):
       enter(n, scene, from)  화면 n에 들어왔을 때(PC, from = 떠난 화면) — 그 쪽만의 펼침을 시작한다
       reset(n, scene)  화면 n을 떠난 뒤(PC) — 처음 상태로 돌린다(다시 들어오면 또 펼쳐진다)
       step(n, d, src)  휠·키보드 한 번(d = 1 또는 -1, src = 'wheel'·'key'·'touch'). 화면 안에서 먼저 쓸 단계가 있으면 처리하고 true를 돌려준다
                        (MCN 하는 일: 휠은 원을 하나씩 넘기고, 키보드 위아래는 화면을 넘긴다)
       seen(n, scene, instant)  스크롤하는 화면에서 화면 n이 보였을 때(18% 넘게, 또는 화면 높이의 18% 넘게). instant면 펼침 없이 다 켠다
       unseen(n, scene)  스크롤하는 화면에서 화면 n이 화면 밖으로 완전히 나갔을 때 — 처음 상태로 돌린다(다시 보이면 또 펼쳐진다, 설계 1-4)
       start(), stop()  한 화면씩 넘기기가 켜질 때·꺼질 때
       move(from, to, fromEl, toEl)  화면을 넘길 때 그 쪽만의 넘김을 끼워 넣는다(지시서 012). 없거나 null을 돌려주면 공통 넘김.
                        돌려줄 것 { dur: 걸리는 ms, anims: [Animation…], cover: true면 공통 넘김(아래에서 덮기)도 같이,
                                    light: 머리말을 바꿀 ms, enter: 펼침을 시작할 ms }. 넘어가는 동안 휠을 버리는 규칙은 그대로다.
   공통 틀이 더 해 주는 것(지시서 012)
   - 알약 버튼(화면 안의 .btn, .magnet)이 마우스 쪽으로 끌려온다(가로 18%, 세로 30%, 나가면 0.5초에 복귀). 한 화면씩 넘길 때만.
   - 큰 창 배율: 기준 1440×900. 배율 = 가로÷1440과 세로÷900 중 작은 값, 1~1.6. html의 --k와 Deck.k에 둔다(한 화면씩 넘길 때만, 아니면 1).
   - Deck.mouse { x, y, at }: 마지막 마우스 자리와 시각(ms, 움직인 적 없으면 0). Deck.trans { from, to, t0, dur }: 넘어가는 중이면 그 정보. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var anim = function (el, kf, o) { return el && el.animate ? el.animate(kf, o) : null; };
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var MOVE = 900, MOVE_EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
  var noop = function () {};

  var Deck = window.Deck = { reduce: reduce, anim: anim, EASE: EASE, MOVE: MOVE, MOVE_EASE: MOVE_EASE, on: false, cur: 0, k: 1, trans: null, mouse: { x: 0, y: 0, at: 0 }, $: $, $$: $$ };
  // 마우스 자리는 쪽 반응들이 같이 쓴다(마우스가 아닌 손가락·펜은 넣지 않는다)
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    Deck.mouse.x = e.clientX; Deck.mouse.y = e.clientY; Deck.mouse.at = performance.now();
  }, { passive: true });

  // 스크롤하는 화면(휴대폰, 태블릿, 좁힌 창)에서 스크롤에 묶는 반응(설계 12절, 지시서 015).
  // 쪽 파일이 Deck.flow(그리기)로 건다. 그리기(vh, on)는 스크롤할 때 화면 한 장에 한 번 불린다.
  // on이면 지금 스크롤 자리대로 그리고, on이 아니면(한 화면씩 넘기기가 켜짐, 움직임 줄이기) 그린 것을 걷어 원래 모습으로 둔다.
  // Deck.span(요소, a, b): 요소 위쪽이 화면 높이의 a에서 b까지 올라오는 동안 0에서 1로 가는 진행(a > b, 화면 맨 위 0, 맨 아래 1)
  var flows = [], flowOn = false, flowTick = false;
  Deck.flowOn = function () { return !reduce && !Deck.on && root.classList.contains('fx'); };
  Deck.flowRun = function () {
    var on = Deck.flowOn();
    if (!on && !flowOn) return;
    flowOn = on;
    var vh = window.innerHeight;
    flows.forEach(function (fn) { fn(vh, on); });
  };
  // 처음 그린 것도 "켜져 있었음"으로 적어 둔다. 그래야 곧이어 넘김 방식이 시작될 때 지우는 차례(on=false)가 돈다(협력사 사진에 휴대폰 가림이 남았던 것)
  Deck.flow = function (fn) { flows.push(fn); if (Deck.flowOn()) { flowOn = true; fn(window.innerHeight, true); } };
  Deck.span = function (el, a, b, vh) {
    vh = vh || window.innerHeight;
    var v = (vh * a - el.getBoundingClientRect().top) / (vh * (a - b));
    return v < 0.002 ? 0 : v > 0.998 ? 1 : v; // 끝 자리에 1px 모자라게 멈춰도 끝난 것으로 친다
  };
  // 맨 아래 구역용: 쪽 끝까지 내려도 구역 위쪽이 b에 닿지 못하면(아래 내용이 화면의 1-b보다 짧으면) 쪽 끝에서 다 끝나게 끝 자리를 올린다
  Deck.spanEnd = function (el, a, b, vh) {
    vh = vh || window.innerHeight;
    var top = el.getBoundingClientRect().top, root = document.documentElement;
    var lowest = (top - Math.max(0, root.scrollHeight - vh - window.pageYOffset)) / vh; // 쪽 끝까지 내렸을 때 구역 위쪽의 높이
    var b2 = Math.max(b, lowest + 0.004), a2 = Math.max(a, Math.min(1, b2 + 0.3));
    var v = (vh * a2 - top) / (vh * (a2 - b2));
    return v < 0.002 ? 0 : v > 0.998 ? 1 : v; // 끝 자리에 1px 모자라게 멈춰도 끝난 것으로 친다
  };
  window.addEventListener('scroll', function () {
    if (flowTick || !flows.length) return;
    flowTick = true;
    requestAnimationFrame(function () { flowTick = false; Deck.flowRun(); });
  }, { passive: true });
  window.addEventListener('resize', function () { if (flows.length) Deck.flowRun(); });

  Deck.setup = function (hooks) {
    hooks = hooks || {};
    var H = {
      enter: hooks.enter || noop, reset: hooks.reset || noop, seen: hooks.seen || noop, unseen: hooks.unseen || noop, move: hooks.move || function () { return null; },
      start: hooks.start || noop, stop: hooks.stop || noop,
      step: hooks.step || function () { return false; }
    };

    // ── 떠 있는 버튼: 누르면 네 개가 펼쳐지고 다시 누르면 닫힌다(브랜드 3판과 같다) ──
    var fabButton = $('.fab-button'), fabBox = $('.fab'), fabItems = $$('.fab-menu a');
    function setFab(open, refocus) {
      if (!fabButton || document.body.classList.contains('fab-open') === open) return;
      document.body.classList.toggle('fab-open', open);
      fabButton.setAttribute('aria-expanded', String(open));
      fabButton.setAttribute('aria-label', open ? '상담·지원 바로가기 닫기' : '상담·지원 바로가기 열기');
      if (open && !reduce) fabItems.slice().reverse().forEach(function (a, i) {
        anim(a, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: i * 40, fill: 'backwards', easing: EASE });
      });
      if (refocus) fabButton.focus();
    }
    if (fabButton) {
      fabButton.addEventListener('click', function () { setFab(!document.body.classList.contains('fab-open')); });
      fabItems.forEach(function (a) { a.addEventListener('click', function () { setFab(false); }); });
      document.addEventListener('click', function (e) { if (!fabBox.contains(e.target)) setFab(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('fab-open')) setFab(false, true); });
    }

    // ── 줄마다·낱말마다 올라오게 감싼다(글자는 그대로, 한 화면씩 넘길 때만 움직인다) ──
    $$('[data-lines]').forEach(function (el) {
      var i = Number(el.getAttribute('data-lines')) || 0, frag = document.createDocumentFragment(), line = null;
      Array.prototype.slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeName === 'BR') { frag.appendChild(n); line = null; return; }
        if (!line) {
          var outer = document.createElement('span');
          outer.className = 'mask';
          outer.style.setProperty('--i', i++);
          line = document.createElement('span');
          outer.appendChild(line);
          frag.appendChild(outer);
        }
        line.appendChild(n);
      });
      el.appendChild(frag);
    });
    $$('[data-words]').forEach(function (el) {
      var text = el.textContent;
      el.setAttribute('aria-label', text);
      el.textContent = '';
      text.split(' ').forEach(function (w, i) {
        if (i) el.appendChild(document.createTextNode(' '));
        var outer = document.createElement('span'), inner = document.createElement('span');
        outer.className = 'w';
        outer.style.setProperty('--i', i);
        outer.setAttribute('aria-hidden', 'true');
        inner.textContent = w;
        outer.appendChild(inner);
        el.appendChild(outer);
      });
    });

    var scenes = $$('.scene');
    var END = scenes.length - 1;
    var cur = 0, busy = false, pending = -1, holdUntil = 0, deck = false;
    var io = null, watch = null, ioTop = -1, leftAt = { y: -1, n: 0 }; // 스크롤로 바꿀 때 보던 화면과 자리(다시 넓히면 같은 화면으로 돌아간다)
    var header = $('.site-header');

    // 오른쪽 가운데 이동 표시
    var indexNav = document.createElement('nav');
    indexNav.className = 'deck-index';
    indexNav.setAttribute('aria-label', '화면 이동');
    document.body.appendChild(indexNav);
    var indexButtons = scenes.map(function (s, i) {
      var b = document.createElement('button'), sp = document.createElement('span');
      b.type = 'button';
      sp.textContent = s.getAttribute('data-name');
      b.appendChild(sp);
      b.setAttribute('aria-label', s.getAttribute('data-name') + ' 화면으로 이동');
      b.addEventListener('click', function () { ask(i); });
      indexNav.appendChild(b);
      return b;
    });
    var isLight = function (n) { return scenes[n].hasAttribute('data-light'); };
    function setChrome(n) { indexButtons.forEach(function (b, i) { b.setAttribute('aria-current', String(i === n)); }); }

    function enter(n, from) { scenes[n].classList.add('in'); H.enter(n, scenes[n], from === undefined ? -1 : from); }
    function reset(n) { scenes[n].classList.remove('in', 'title-on'); H.reset(n, scenes[n]); }

    function goTo(n) {
      if (!deck || busy || n === cur || n < 0 || n > END) return;
      var fromIdx = cur, from = scenes[fromIdx], to = scenes[n], fwd = n > fromIdx;
      var ae = document.activeElement;
      if (ae && from.contains(ae)) ae.blur();
      busy = true; cur = Deck.cur = n;
      setFab(false);
      to.classList.remove('in', 'title-on');
      to.style.opacity = '1';
      var anims = [], own = H.move(fromIdx, n, from, to), dur = MOVE;
      if (own) { dur = own.dur || MOVE; anims = (own.anims || []).slice(); }
      if (own && !own.cover) {
        // 쪽이 준 넘김만 쓴다
      } else if (fwd) {
        // 다음 화면이 아래에서 올라와 덮고, 지금 화면은 16% 밀려 올라가며 어두워진다
        to.style.zIndex = '3';
        anims.push(anim(to, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: MOVE, easing: MOVE_EASE, fill: 'both' }));
        anims.push(anim(from, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-16%)', opacity: 0.3 }], { duration: MOVE, easing: MOVE_EASE, fill: 'both' }));
      } else {
        from.style.zIndex = '3';
        anims.push(anim(from, [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: MOVE, easing: MOVE_EASE, fill: 'both' }));
        anims.push(anim(to, [{ transform: 'translateY(-16%)', opacity: 0.3 }, { transform: 'translateY(0)', opacity: 1 }], { duration: MOVE, easing: MOVE_EASE, fill: 'both' }));
      }
      setChrome(n);
      Deck.trans = { from: fromIdx, to: n, t0: performance.now(), dur: dur };
      // 머리말 바탕: 밝은 화면이 머리말 자리를 덮은 뒤에 짙게, 걷힌 뒤에 다시 비치게
      setTimeout(function () { if (deck) root.classList.toggle('on-light', isLight(cur)); }, own && own.light !== undefined ? own.light : fwd ? 640 : 260);
      setTimeout(function () { if (deck && cur === n) enter(n, fromIdx); }, own && own.enter !== undefined ? own.enter : 360);
      var finished = false;
      var done = function () {
        if (finished) return;
        finished = true;
        if (!deck) return;
        from.classList.remove('current');
        to.classList.add('current');
        anims.forEach(function (a) { if (a) a.cancel(); });
        from.style.opacity = from.style.zIndex = to.style.opacity = to.style.zIndex = '';
        Deck.trans = null;
        reset(fromIdx);
        busy = false;
        var p = pending;
        pending = -1;
        if (p >= 0 && p !== cur) goTo(p);
      };
      if (!own && anims[0]) anims[0].onfinish = done;
      setTimeout(done, dur + 80);
    }
    // 누르거나 초점이 옮겨 와서 가야 할 때: 넘어가는 중이면 끝난 뒤에 간다
    function ask(n) { if (busy) pending = n; else goTo(n); }
    // 휠·키보드 한 번: 화면 안에서 먼저 쓸 단계가 있으면 그것부터, 끝에 닿으면 다음 화면으로
    function step(d, src) {
      if (!deck || busy || performance.now() < holdUntil) return;
      if (H.step(cur, d, src || 'wheel')) { holdUntil = performance.now() + 640; return; }
      goTo(cur + d);
    }
    Deck.go = ask;
    Deck.step = step;

    function startDeck() {
      var mid = window.innerHeight / 2, best = 0;
      scenes.forEach(function (s, i) { if (s.getBoundingClientRect().top <= mid) best = i; });
      if (Math.abs(window.pageYOffset - leftAt.y) < 2) best = leftAt.n; // 창만 좁혔다 넓혔으면 보던 화면 그대로
      deck = Deck.on = true; cur = Deck.cur = best; busy = false; pending = -1; Deck.trans = null;
      root.classList.add('deck');
      fitScale();
      window.scrollTo(0, 0);
      scenes.forEach(function (s, i) { s.classList.toggle('current', i === cur); s.classList.remove('in', 'title-on'); H.reset(i, s); });
      setChrome(cur);
      root.classList.toggle('on-light', isLight(cur));
      H.start();
      // 처음 그리는 순간에 펼침이 시작되게 한 박자 늦춘다
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (deck) enter(cur, -1); }); });
      Deck.flowRun();
    }
    function stopDeck() {
      deck = Deck.on = false; busy = false; pending = -1; Deck.trans = null;
      scenes.forEach(function (s, i) {
        if (s.getAnimations) s.getAnimations().forEach(function (a) { a.cancel(); });
        s.classList.remove('current', 'in', 'title-on');
        s.style.opacity = s.style.zIndex = '';
        H.reset(i, s);
        if (s.classList.contains('seen')) H.seen(i, s, true);
      });
      root.classList.remove('deck', 'on-light');
      fitScale();
      H.stop();
      window.scrollTo(0, scenes[cur].getBoundingClientRect().top + window.pageYOffset - (cur ? header.offsetHeight : 0));
      leftAt = { y: window.pageYOffset, n: cur };
      // 한 화면씩 넘기던 동안은 "보였다"를 세지 않았으므로 다시 잰다(지금 보이는 화면이 떠오른다)
      if (watch) { ioTop = -1; watch(); }
      Deck.flowRun();
    }

    // 아래 표시: 한 화면씩 넘길 때는 다음 화면, 스크롤할 때는 다음 구역으로
    $$('.scroll-hint').forEach(function (b) {
      b.addEventListener('click', function () {
        if (deck) step(1, 'key');
        else if (scenes[1]) window.scrollTo({ top: scenes[1].getBoundingClientRect().top + window.pageYOffset - header.offsetHeight, behavior: reduce ? 'auto' : 'smooth' });
      });
    });

    // 큰 창 배율(설계 1-2절): 1440×900에서 1, 그보다 크면 가로·세로 비율 중 작은 값만큼(최대 1.6). 한 화면씩 넘길 때만
    function fitScale() {
      var k = deck ? Math.max(1, Math.min(1.6, window.innerWidth / 1440, window.innerHeight / 900)) : 1;
      Deck.k = k;
      root.style.setProperty('--k', k.toFixed(4));
    }
    window.addEventListener('resize', fitScale);

    if (reduce) return; // 움직임 줄이기: 한 화면씩 넘기기와 떠오르기를 켜지 않는다. 내용은 처음부터 다 보인다

    // 스크롤하는 화면(설계 1-4): 구역이 18% 넘게 보이면 떠오르고, 화면 밖으로 완전히 나가면 처음 상태로 돌아간다.
    // 그래서 내렸다가 다시 올리거나, 올렸다가 다시 내리면 또 펼쳐진다. 보이는 동안에는 절대 되돌리지 않는다.
    // - 화면보다 훨씬 긴 구역은 18%에 닿지 않을 수 있어 "화면 높이의 18% 넘게 보임"도 같이 본다(그래서 문턱을 0.01 간격으로 촘촘히 둔다).
    // - 화면 위에 붙어 있는 머리말 뒤에 완전히 숨은 구역은 벗어난 것으로 친다(맨 아래까지 내려도 바로 위 구역의 끝 몇 px가 머리말 뒤에 남는다).
    // - 화면 끝에 0px로 맞닿기만 한 구역은 보이지 않는 것으로 친다(맨 위에서 둘째 구역 윗선이 화면 아래 끝에 딱 맞닿는다). 그래서 아래쪽을 1px 줄여 잰다.
    root.classList.add('fx');
    if ('IntersectionObserver' in window) {
      var marks = [0];
      for (var t = 1; t <= 18; t++) marks.push(t / 100);
      watch = function () {
        var hs = header ? getComputedStyle(header).position : '';
        var top = header && (hs === 'sticky' || hs === 'fixed') ? header.offsetHeight : 0;
        if (io && top === ioTop) return;
        ioTop = top;
        if (io) io.disconnect();
        io = new IntersectionObserver(function (list) {
          list.forEach(function (e) {
            if (deck) return;
            var s = e.target, n = scenes.indexOf(s), on = s.classList.contains('seen');
            var vh = e.rootBounds ? e.rootBounds.height : window.innerHeight;
            if (!e.isIntersecting || e.intersectionRect.height <= 0) {
              if (on) { s.classList.remove('seen'); H.unseen(n, s); }
              return;
            }
            if (!on && (e.intersectionRatio >= 0.18 || e.intersectionRect.height >= vh * 0.18)) {
              s.classList.add('seen');
              H.seen(n, s, false);
            }
          });
        }, { threshold: marks, rootMargin: '-' + top + 'px 0px -1px 0px' });
        scenes.forEach(function (s) { io.observe(s); });
      };
      watch();
      window.addEventListener('resize', function () { if (!deck) watch(); });
    } else scenes.forEach(function (s, i) { s.classList.add('seen'); H.seen(i, s, true); });

    // 한 화면씩 넘기기를 켜는 조건: 넓고 높이가 충분하고 마우스를 쓰는 화면
    var mq = window.matchMedia('(min-width: 1100px) and (min-height: 620px) and (hover: hover) and (pointer: fine)');
    function applyMode() { if (mq.matches !== deck) { if (mq.matches) startDeck(); else stopDeck(); } }
    if (mq.addEventListener) mq.addEventListener('change', applyMode); else if (mq.addListener) mq.addListener(applyMode);
    applyMode();

    // 휠: 한 번 굴리면 한 화면. 터치패드의 관성으로 이어지는 약한 신호는 한 번으로 친다. Ctrl+휠(확대)은 건드리지 않는다
    var lastWheelAt = 0, lastAbs = 0;
    window.addEventListener('wheel', function (e) {
      if (!deck || e.ctrlKey) return;
      e.preventDefault();
      var now = performance.now(), abs = Math.abs(e.deltaY);
      var tail = now - lastWheelAt < 90 && abs <= lastAbs * 1.15;
      lastWheelAt = now; lastAbs = abs;
      if (tail || abs < 4) return;
      step(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    // 키보드: 아래·위 화살표, Page Down·Up, 스페이스, Home·End
    document.addEventListener('keydown', function (e) {
      if (!deck || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target, free = t === document.body || t === root;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable) return;
      if (t.closest && t.closest('[data-keys]')) return; // 화살표를 스스로 쓰는 부품(쪽 파일이 정한다)
      var k = e.key, d = 0;
      if (k === 'PageDown' || k === 'ArrowDown' || (k === ' ' && !e.shiftKey && free)) d = 1;
      else if (k === 'PageUp' || k === 'ArrowUp' || (k === ' ' && e.shiftKey && free)) d = -1;
      else if (k === 'Home') { e.preventDefault(); ask(0); return; }
      else if (k === 'End') { e.preventDefault(); ask(END); return; }
      if (d) { e.preventDefault(); step(d, 'key'); }
    });
    // 터치 화면이 달린 노트북: 위아래로 쓸면 넘어간다
    var touchY = null;
    window.addEventListener('touchstart', function (e) { touchY = deck ? e.touches[0].clientY : null; }, { passive: true });
    window.addEventListener('touchend', function (e) {
      if (!deck || touchY === null) return;
      var dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) > 48) step(dy > 0 ? 1 : -1, 'touch');
    }, { passive: true });
    // 알약 버튼이 마우스 쪽으로 끌려온다(브랜드 3판과 같은 값: 가로 18%, 세로 30%, 나가면 0.5초에 돌아온다)
    $$('.scene .btn, .magnet').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        if (!deck || e.pointerType !== 'mouse') return;
        var r = b.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        // 지금 옮겨진 만큼을 빼고 잰다(끌려간 버튼을 기준으로 재면 떨린다)
        var m = /translate\(([-\d.]+)px, ?([-\d.]+)px\)/.exec(b.style.transform || '');
        if (m) { cx -= Number(m[1]); cy -= Number(m[2]); }
        b.style.transform = 'translate(' + ((e.clientX - cx) * 0.18).toFixed(1) + 'px,' + ((e.clientY - cy) * 0.3).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () {
        if (!b.style.transform) return;
        anim(b, [{ transform: b.style.transform }, { transform: 'none' }], { duration: 500, easing: EASE });
        b.style.transform = '';
      });
    });
    // Tab으로 다른 화면의 버튼에 초점이 가면 그 화면으로 넘어간다
    document.addEventListener('focusin', function (e) {
      if (!deck || !e.target.closest) return;
      var s = e.target.closest('.scene');
      var i = s ? scenes.indexOf(s) : -1;
      if (i >= 0 && i !== cur) ask(i);
    });
    // 쪽 안의 바로가기(#으로 시작하는 주소)는 그 화면으로 넘어간다
    document.addEventListener('click', function (e) {
      if (!deck || !e.target.closest) return;
      var a = e.target.closest('a[href^="#"]');
      var id = a ? a.getAttribute('href').slice(1) : '';
      var s = id ? document.getElementById(id) : null;
      var i = s && s.closest('.scene') ? scenes.indexOf(s.closest('.scene')) : -1;
      if (i < 0) return;
      e.preventDefault();
      ask(i);
    });
  };
})();
