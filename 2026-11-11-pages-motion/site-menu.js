/* 휴대폰 메뉴: 브랜드 3판과 같은 모양·동작·값이다(대표 11-14 "퀄리티 있게", "한 화면에", "일곱 쪽에도").
   잡지 목차처럼 왼쪽 정렬, 번호 + 큰 영문(Bodoni) + 작은 한글, 지금 쪽은 금색과 ✦. 아래에 지원하기·상담 채널·회사 이름.
   여덟 줄이 남는 높이를 나눠 가져 어느 휴대폰에서도 한 화면에 들어간다(모양은 pages.css).
   열 때 판이 위에서 내려오고 영문이 한 줄씩 떠오르며 아래 묶음이 뒤따른다. ×·Esc·메뉴 항목·넓은 화면 전환으로 닫는다.
   열린 동안 뒤쪽은 스크롤되지 않는다. 움직임 줄이기 설정이면 바로 나타난다.
   일곱 쪽(홈·회사소개·MCN·엔터테인먼트·미디어·협력사·CONTACT)이 같이 쓴다. 쪽 HTML에는 링크 여덟 개만 두고,
   번호·영문·한글과 아래 묶음은 여기서 채운다. 브랜드는 자기 파일 안에 같은 HTML·코드가 있다. */
(function () {
  var root = document.documentElement;
  var menuButton = document.querySelector('.site-header .menu-button'), panel = document.getElementById('menu-panel');
  if (!menuButton || !panel) return;
  var menuClose = panel.querySelector('.menu-close');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var anim = function (el, kf, o) { return el && el.animate ? el.animate(kf, o) : null; };

  // 링크 주소로 영문 이름을 정한다. 한글은 쪽 HTML의 글자를 그대로 쓰고, 영문과 같으면(MCN·CONTACT) 한글 줄을 두지 않는다
  var EN = { home: 'HOME', about: 'ABOUT', mcn: 'MCN', 'brand-v3': 'BRAND', entertainment: 'ENTERTAINMENT', media: 'MEDIA', partners: 'PARTNERS', contact: 'CONTACT' };
  var span = function (cls, text, hidden) { var s = document.createElement('span'); s.className = cls; s.textContent = text; if (hidden) s.setAttribute('aria-hidden', 'true'); return s; };
  var list = panel.querySelector('.menu-list');
  Array.prototype.forEach.call(list.querySelectorAll('a'), function (a, i) {
    var ko = a.textContent.trim(), key = (a.getAttribute('href').split('/').pop().split('.')[0]);
    var en = EN[key] || ko.toUpperCase();
    a.textContent = '';
    a.appendChild(span('menu-no', String(i + 1).padStart(2, '0')));
    a.appendChild(span('menu-en', en));
    a.appendChild(span('menu-star', '✦', true));
    if (ko !== en) a.appendChild(span('menu-ko', ko));
  });
  var logo = document.querySelector('.site-header .wordmark'), logoImg = logo && logo.querySelector('img');
  if (logoImg) {
    var top = document.createElement('a');
    top.className = 'menu-top'; top.href = logo.getAttribute('href'); top.setAttribute('aria-label', 'ASTRA 홈');
    top.innerHTML = '<img src="' + logoImg.getAttribute('src') + '" alt="">';
    panel.insertBefore(top, list);
  }
  var applyLink = document.querySelector('.site-header .quick-apply');
  var foot = document.createElement('div');
  foot.className = 'menu-foot';
  foot.innerHTML =
    '<a class="menu-apply" href="' + (applyLink ? applyLink.getAttribute('href') : 'contact.html') + '">지원하기</a>' +
    '<div class="menu-sns">' +
      '<a href="#" aria-label="카카오톡 상담"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5c-4.7 0-8.5 2.9-8.5 6.5 0 2.3 1.6 4.4 4 5.5l-.9 3.3 3.8-2.5c.5.1 1 .1 1.6.1 4.7 0 8.5-2.9 8.5-6.4S16.7 4.5 12 4.5z"/></svg></a>' +
      '<a href="#" aria-label="인스타그램"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.9" cy="7.1" r=".6" fill="currentColor" stroke="none"/></svg></a>' +
      '<a href="#" aria-label="블로그"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L9 18l-4 1z"/><path d="M13.5 7.5l3 3"/></svg></a>' +
    '</div>' +
    '<p class="menu-copy">ASTRA ENTERTAINMENT</p>';
  panel.appendChild(foot);

  function setMenu(open, back) {
    if (panel.hidden === !open) return;
    panel.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    root.classList.toggle('menu-open', open);
    if (open) {
      if (!reduce) {
        // 판이 위에서 내려오고, 항목이 한 줄씩 아래에서 떠오르고, 아래쪽 묶음이 뒤따른다. ×는 반 바퀴 돌며 나타난다
        anim(panel, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 560, easing: EASE });
        Array.prototype.forEach.call(list.querySelectorAll('a'), function (a, i) {
          anim(a.querySelector('.menu-en'), [{ transform: 'translateY(110%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 160 + i * 55, fill: 'backwards', easing: EASE });
          anim(a, [{ borderBottomColor: 'rgba(255,255,255,0)' }, { borderBottomColor: 'rgba(255,255,255,0.12)' }], { duration: 600, delay: 160 + i * 55, fill: 'backwards', easing: EASE });
          [a.querySelector('.menu-no'), a.querySelector('.menu-ko')].forEach(function (el) {
            anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 320 + i * 55, fill: 'backwards', easing: EASE });
          });
        });
        anim(foot, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 620, fill: 'backwards', easing: EASE });
        anim(menuClose, [{ transform: 'rotate(-90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 200, fill: 'backwards', easing: EASE });
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
