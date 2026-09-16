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
  tools.innerHTML = `<button type="button" class="p-settings-trigger" aria-haspopup="dialog" aria-controls="ops-personalization" title="个性化设置">${lucideIcon('palette', 'p-settings-icon')}<span class="p-settings-label">个性化设置</span></button>`;
  shell.insertBefore(tools, userBox);
  const footer = document.createElement('div');
  footer.className = 'p-nav-footer';
  shell.insertBefore(footer, tools);
  footer.append(tools, userBox);
  const trigger = tools.querySelector('button');
  const userLine = userBox.querySelector('.user-line');
  const userMessage = userBox.querySelector('.user-message');

  const dialog = document.createElement('dialog');
  dialog.id = 'ops-personalization';
  dialog.className = 'p-dialog';
  dialog.setAttribute('aria-labelledby', 'p-title');

  function options(name, label, items, className = '') {
    return `<div class="p-field p-option-field ${className}" role="group" aria-label="${label}"><span class="p-setting-label">${label}</span><div class="p-options">${items.map(([value, text]) => `<label class="p-choice"><input type="radio" name="${name}" value="${value}"><span>${text}</span></label>`).join('')}</div></div>`;
  }
  function modeButton(value, label, iconName) {
    const preview = value === 'system' ? '<span class="theme-mode-preview__light"></span><span class="theme-mode-preview__dark"></span>' : '<span class="theme-mode-preview__rail"></span><span class="theme-mode-preview__content"><i></i><b></b><em></em></span>';
    return `<button type="button" class="theme-mode-choice" data-mode="${value}" role="radio" aria-checked="false"><span class="theme-mode-preview theme-mode-preview--${value}" aria-hidden="true">${preview}</span><span class="theme-choice__label theme-choice__label--${value === 'dark' ? 'light' : value === 'system' ? 'system' : 'dark'}">${lucideIcon(iconName)}<strong>${label}</strong></span>${lucideIcon('check','theme-choice__check')}</button>`;
  }
  function themeButton(name) {
    const theme = prefs.themes[name];
    const previewName = {terminal:'elevenlabs',neumorphism:'cohere',vaporwave:'voltagent',saas:'ollama'}[name] || name;
    return `<button type="button" class="theme-choice" data-theme="${name}" role="radio" aria-checked="false"><span class="theme-preview" data-preview-theme="${previewName}" aria-hidden="true"><span class="theme-preview__rail"></span><span class="theme-preview__content"><i></i><b></b><em></em></span></span><span class="theme-choice__label theme-choice__label--${['terminal','vaporwave'].includes(name)?'light':'dark'}"><strong>${theme.label}</strong></span>${lucideIcon('check','theme-choice__check')}</button>`;
  }

  dialog.innerHTML = `<header class="p-dialog-head"><h2 id="p-title">个性化设置</h2><button type="button" class="btn p-dialog-close" data-close aria-label="关闭个性化设置" title="关闭">${lucideIcon('x')}</button></header>
    <div class="p-dialog-body">
      <section class="p-module" aria-labelledby="p-theme-title">
        <div class="p-module-title">${lucideIcon('palette')}<h3 id="p-theme-title">主题设置</h3></div>
        <fieldset class="p-field"><legend>默认主题</legend><div class="p-mode-grid" role="radiogroup" aria-label="默认主题">${modeButton('light', '浅色', 'sun')}${modeButton('dark', '深色', 'moon')}${modeButton('system', '跟随系统', 'monitor')}</div></fieldset>
        <fieldset class="p-field"><legend>更多主题</legend><div class="p-theme-grid" role="radiogroup" aria-label="更多主题">${['saas', 'brutalist', 'claude', 'terminal', 'neumorphism', 'vaporwave'].map(themeButton).join('')}</div></fieldset>
      </section>
      <section class="p-module" aria-labelledby="p-nav-title">
        <div class="p-module-title">${lucideIcon('panel-left')}<h3 id="p-nav-title">导航栏设置</h3></div>
        ${options('position', '导航栏位置', [['left', '左侧'], ['top', '顶部']], 'p-desktop-only')}
        ${options('style', '导航栏样式', [['standard', '普通'], ['embedded', '内嵌'], ['floating', '浮动']])}
        ${options('nav', '导航栏收起', [['labels', '图标 + 文字'], ['icons', '仅图标'], ['wide', '宽导航']], 'p-desktop-only')}
        <p class="p-help p-desktop-only" data-nav-note>顶部导航始终显示文字；切回左侧时恢复所选模式。</p>
        <p class="p-help p-mobile-only">小屏幕使用可展开导航，桌面布局偏好会保留。</p>
      </section>
      <section class="p-module" aria-labelledby="p-other-title">
        <div class="p-module-title">${lucideIcon('settings-2')}<h3 id="p-other-title">其他设置</h3></div>
        <label class="p-field" style="display:block" for="p-font"><span>字体</span><span class="p-font-select-wrap"><select id="p-font" class="p-font" name="font"><option value="theme">跟随主题</option><option value="sans">系统黑体</option><option value="serif">系统宋体</option><option value="mono">系统等宽</option></select>${lucideIcon('chevron-down')}</span></label>
        <p class="p-status" role="status" aria-live="polite" data-status></p>
        <div class="p-reset-block"><div><strong>恢复默认设置</strong><p>恢复默认蓝色主题、浅色模式、左侧宽导航、内嵌布局和主题默认字体。</p></div><button type="button" class="btn p-reset" data-reset>${lucideIcon('rotate-ccw')}恢复默认</button></div>
      </section>
    </div>`;
  dialog.querySelectorAll('.p-module').forEach(module => {
    const group = document.createElement('div');
    group.className = 'personalization-settings-group';
    group.append(...Array.from(module.children).slice(1));
    module.append(group);
  });
  document.body.append(dialog);

  const status = dialog.querySelector('[data-status]');
  const dialogBody = dialog.querySelector('.p-dialog-body');
  function sync() {
    const state = prefs.get();
    dialog.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = input.value === state[input.name]; });
    dialog.querySelector('[name="font"]').value = state.font;
    dialog.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-checked', String(state.theme === 'default' && button.dataset.mode === state.mode)));
    dialog.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.theme === state.theme)));
    trigger.setAttribute('aria-label', `个性化设置，当前主题：${prefs.themes[state.theme].label}`);
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
    dialog.querySelector('[data-nav-note]').hidden = state.position !== 'top';
    refreshIcons();
  }
  function save(patch) {
    const saved = prefs.set(patch);
    status.textContent = saved ? '已保存，仅影响当前浏览器' : '已应用，当前浏览器无法保存偏好';
  }
  const focusable = () => [...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')]
    .filter(element => !element.disabled && element.getClientRects().length);
  trigger.addEventListener('click', () => { dialog.showModal(); trigger.setAttribute('aria-expanded', 'true'); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); return; }
    if (event.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) { event.preventDefault(); dialog.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  dialog.addEventListener('close', () => { trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
    const mode = event.target.closest('[data-mode]');
    if (mode) save({ theme: 'default', mode: mode.dataset.mode });
    const theme = event.target.closest('[data-theme]');
    if (theme) save({ theme: theme.dataset.theme });
  });
  dialog.addEventListener('change', event => {
    if (event.target.name in prefs.choices) save({ [event.target.name]: event.target.value });
  });
  dialog.querySelector('[data-reset]').addEventListener('click', () => {
    const saved = prefs.reset();
    status.textContent = saved ? '已恢复默认设置' : '已恢复默认，当前浏览器无法保存';
  });
  collapse.addEventListener('click', () => {
    if (matchMedia('(max-width:700px)').matches) {
      root.dataset.pMobile = root.dataset.pMobile === 'open' ? 'closed' : 'open';
      sync();
    } else save({ nav: prefs.get().nav === 'wide' ? 'icons' : 'wide' });
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
  let dialogScrollTimer;
  dialogBody.addEventListener('scroll', () => {
    dialogBody.classList.add('is-scrolling');
    clearTimeout(dialogScrollTimer);
    dialogScrollTimer = setTimeout(() => dialogBody.classList.remove('is-scrolling'), 700);
  }, { passive: true });
  navPanel.addEventListener('click', event => {
    if (event.target.closest('.nav-item') && matchMedia('(max-width:700px)').matches) { root.dataset.pMobile = 'closed'; sync(); }
  });
  window.addEventListener('ops-personalization-change', sync);
  window.addEventListener('resize', sync);
  sync();
})();
