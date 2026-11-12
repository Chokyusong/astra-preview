/* 휴대폰 메뉴(대표 11-12 "휴대폰 메뉴도 브랜드처럼"): 브랜드 3판과 같은 동작·값이다.
   삼선을 누르면 화면 전체를 검게 덮고(0.26초) 가운데 메뉴 여덟 개가 16px 아래에서 올라온다(0.52초).
   ×·Esc·메뉴 항목·넓은 화면 전환으로 닫는다. 열린 동안 뒤쪽은 스크롤되지 않는다. 움직임 줄이기 설정이면 바로 나타난다.
   일곱 쪽(홈·회사소개·MCN·엔터테인먼트·미디어·협력사·CONTACT)이 같이 쓴다. 브랜드는 자기 파일 안에 같은 코드가 있다. */
(function () {
  var root = document.documentElement;
  var menuButton = document.querySelector('.site-header .menu-button'), panel = document.getElementById('menu-panel');
  if (!menuButton || !panel) return;
  var menuClose = panel.querySelector('.menu-close');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var anim = function (el, kf, o) { return el && el.animate ? el.animate(kf, o) : null; };
  function setMenu(open, back) {
    if (panel.hidden === !open) return;
    panel.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    root.classList.toggle('menu-open', open);
    if (open) {
      if (!reduce) {
        anim(panel, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE });
        anim(panel.querySelector('.menu-list'), [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE });
      }
      menuClose.focus();
    } else if (back) menuButton.focus();
  }
  menuButton.addEventListener('click', function () { setMenu(true); });
  menuClose.addEventListener('click', function () { setMenu(false, true); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setMenu(false, true); return; }
    if (e.key !== 'Tab') return;
    var items = panel.querySelectorAll('button, a'), first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  var wide = window.matchMedia('(max-width: 900px)');
  var onWide = function (e) { if (!e.matches) setMenu(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
  // 메뉴로 다른 쪽에 갔다가 뒤로 돌아오면(쪽이 그대로 보관돼 있으면) 닫힌 채로 보인다
  window.addEventListener('pageshow', function () { setMenu(false); });
})();
