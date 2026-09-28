/* 运营适配：设置 UI 与当前导航结构；数据、权限、路由继续由原型负责。 */
(() => {
  const prefs = window.OpsPersonalization;
  const root = document.documentElement;
  const sidebar = document.querySelector('.col-left');
  const navPanel = document.querySelector('.nav-panel');
  const mainShell = document.querySelector('.main-shell');
  const brand = document.querySelector('.brand');
  const userBox = document.querySelector('.user-box');
  if (!prefs || !sidebar || !navPanel || !brand || !userBox) return;

  const lucideIcon = (name, className = '') => `<i data-lucide="${name}"${className ? ` class="${className}"` : ''} aria-hidden="true"></i>`;
  const refreshIcons = () => window.lucide?.createIcons?.();
  const shell = document.createElement('div');
  shell.className = 'p-navigation';
  shell.setAttribute('aria-label', '导航内容面板');
  shell.append(...sidebar.childNodes);
  sidebar.append(shell);
  sidebar.setAttribute('aria-label', '导航外层容器');
  navPanel.setAttribute('aria-label', '主导航');
  navPanel.setAttribute('role', 'navigation');
  brand.querySelector(':scope > div:last-child')?.classList.add('p-brand-text');

  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'p-collapse';
  collapse.innerHTML = lucideIcon('panel-left-close');
  brand.append(collapse);

  const tools = document.createElement('div');
  tools.className = 'p-nav-tools';
  tools.innerHTML = '<button type="button" class="p-settings-trigger" id="theme-toggle" aria-pressed="false"></button>';
  shell.insertBefore(tools, userBox);
  const footer = document.createElement('div');
  footer.className = 'p-nav-footer';
  shell.insertBefore(footer, tools);
  footer.append(tools, userBox);
  const trigger = tools.querySelector('button');
  const userLine = userBox.querySelector('.user-line');
  const userMessage = userBox.querySelector('.user-message');

  function sync() {
    const state = prefs.get();
    const dark = root.dataset.pResolved === 'dark';
    const label = dark ? '切换到亮色模式' : '切换到暗黑模式';
    trigger.setAttribute('aria-label', label);
    trigger.setAttribute('aria-pressed', String(dark));
    trigger.title = label;
    trigger.innerHTML = `${lucideIcon(dark ? 'sun' : 'moon', 'p-settings-icon')}<span class="p-settings-label">${dark ? '亮色模式' : '暗黑模式'}</span>`;
    const mobile = matchMedia('(max-width:700px)').matches;
    const expanded = mobile ? root.dataset.pMobile === 'open' : state.nav === 'wide';
    const compactLeftNav = !mobile && state.position === 'left' && state.nav !== 'wide';
    if (userMessage && userLine) {
      if (compactLeftNav) footer.insertBefore(userMessage, userBox);
      else userLine.append(userMessage);
    }
    collapse.setAttribute('aria-label', expanded ? '收起导航' : '展开导航');
    collapse.title = expanded ? '收起导航' : '展开导航';
    collapse.setAttribute('aria-expanded', String(expanded));
    collapse.innerHTML = lucideIcon(expanded ? 'panel-left-close' : 'panel-left-open');
    refreshIcons();
  }
  trigger.addEventListener('click', () => {
    prefs.set({ mode: root.dataset.pResolved === 'dark' ? 'light' : 'dark' });
  });
  collapse.addEventListener('click', () => {
    if (matchMedia('(max-width:700px)').matches) {
      root.dataset.pMobile = root.dataset.pMobile === 'open' ? 'closed' : 'open';
      sync();
    } else prefs.set({ nav: prefs.get().nav === 'wide' ? 'icons' : 'wide' });
  });
  let scrollTimer;
  navPanel.addEventListener('scroll', () => {
    navPanel.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => navPanel.classList.remove('is-scrolling'), 700);
  }, { passive: true });
  if (mainShell) {
    let mainScrollTimer;
    mainShell.addEventListener('scroll', () => {
      mainShell.classList.add('is-scrolling');
      clearTimeout(mainScrollTimer);
      mainScrollTimer = setTimeout(() => mainShell.classList.remove('is-scrolling'), 700);
    }, { passive: true });
  }
  navPanel.addEventListener('click', event => {
    if (event.target.closest('.nav-item') && matchMedia('(max-width:700px)').matches) { root.dataset.pMobile = 'closed'; sync(); }
  });
  window.addEventListener('ops-personalization-change', sync);
  window.addEventListener('resize', sync);
  sync();
})();
