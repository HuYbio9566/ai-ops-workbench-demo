/* 仅负责导航呈现、焦点与图表主题；不改权限、数据或业务函数。 */
(() => {
  const mapping = {
    'legacy-overview':'monitor','legacy-feedback':'headset',
    'legacy-knowledge':'book-marked','legacy-tuitui':'message-square-heart',
    'legacy-skillhub':'file-chart-column','legacy-video':'video',
    'legacy-org':'users','legacy-opslog':'file-clock',
    overview:'chart-column-big',it:'cpu',admin:'building-2',
    jingfen:'square-kanban',security:'shield-ellipsis',test:'monitor-smartphone'
  };
  function icon(name) {
    const el = document.createElement('i');
    el.className = 'wb-icon';
    el.dataset.lucide = name || 'circle';
    el.setAttribute('aria-hidden','true');
    return el;
  }
  function refreshIcons() { window.lucide?.createIcons?.(); }
  let activeSelect = null;
  let selectUid = 0;
  function closeSelects(except) {
    if (activeSelect && activeSelect.root !== except) activeSelect.close();
  }
  function selectMenuPlacement(rect, height, width, viewportWidth, viewportHeight) {
    const edge = 8, gap = 4;
    const below = Math.max(0, viewportHeight - rect.bottom - gap - edge);
    const above = Math.max(0, rect.top - gap - edge);
    const upward = height > below && above > below;
    const maxHeight = Math.min(320, upward ? above : below);
    return {
      left: Math.max(edge, Math.min(rect.left, viewportWidth - width - edge)),
      top: upward ? Math.max(edge, rect.top - gap - Math.min(height, maxHeight)) : rect.bottom + gap,
      maxHeight,
    };
  }
  function enhanceSelect(select) {
    if (!select || select.dataset.uiEnhanced === 'true' || select.multiple ||
      !('showPopover' in HTMLElement.prototype)) return;
    let root = select.closest('.dash-select-wrap,.org-dept-select-wrap,.p-font-select-wrap');
    if (!root) {
      root = document.createElement('span');
      root.className = 'ui-select-wrap';
      if (select.style.width) root.style.width = select.style.width;
      if (select.style.flex) root.style.flex = select.style.flex;
      select.parentNode.insertBefore(root, select);
      root.append(select);
    }
    root.classList.add('ui-select-enhanced');
    root.querySelector(':scope > svg,:scope > i')?.setAttribute('aria-hidden','true');
    const trigger = document.createElement('button');
    const value = document.createElement('span');
    const menu = document.createElement('div');
    const menuId = select.id ? `${select.id}Menu` : `uiSelectMenu${++selectUid}`;
    const options = [];
    select.dataset.uiEnhanced = 'true';
    select.classList.add('ui-select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden','true');
    trigger.type = 'button';
    trigger.className = 'ui-select-trigger';
    trigger.setAttribute('aria-haspopup','listbox');
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-controls',menuId);
    value.className = 'ui-select-value';
    trigger.append(value,icon('chevron-down'));
    menu.id = menuId;
    menu.className = 'ui-select-menu';
    menu.setAttribute('popover','manual');
    menu.setAttribute('role','listbox');
    menu.hidden = true;
    function rebuild() {
      options.length = 0;
      menu.replaceChildren();
      [...select.options].forEach((option,index) => {
        const item = document.createElement('button');
        item.type = 'button'; item.className = 'ui-select-option';
        item.id = `${menuId}Option${index}`; item.dataset.value = option.value;
        item.setAttribute('role','option'); item.textContent = option.textContent;
        menu.append(item); options.push(item);
      });
    }
    function sync() {
      if (options.length !== select.options.length || options.some((item,index) => item.textContent !== select.options[index]?.textContent)) rebuild();
      value.textContent = select.selectedOptions[0]?.textContent || '';
      options.forEach(item => item.setAttribute('aria-selected',String(item.dataset.value === select.value)));
    }
    function positionMenu() {
      if (!trigger.isConnected || !trigger.getClientRects().length) { closeMenu(); return; }
      const rect = trigger.getBoundingClientRect();
      menu.style.minWidth = `${Math.min(rect.width, window.innerWidth - 16)}px`;
      menu.style.maxWidth = `${Math.max(0, window.innerWidth - 16)}px`;
      menu.style.maxHeight = '320px';
      const placement = selectMenuPlacement(rect, menu.offsetHeight, menu.offsetWidth,
        window.innerWidth, window.innerHeight);
      menu.style.left = `${placement.left}px`;
      menu.style.top = `${placement.top}px`;
      menu.style.maxHeight = `${placement.maxHeight}px`;
    }
    const triggerObserver = new ResizeObserver(() => {
      if (root.classList.contains('is-open')) positionMenu();
    });
    function openMenu(focusSelected = false) {
      sync(); closeSelects(root);
      root.classList.add('is-open');
      trigger.setAttribute('aria-expanded','true');
      menu.hidden = false;
      menu.showPopover();
      activeSelect = { root, menu, trigger, close:closeMenu, position:positionMenu };
      positionMenu();
      triggerObserver.observe(trigger);
      if (focusSelected) options.find(item => item.getAttribute('aria-selected') === 'true')?.focus();
    }
    function closeMenu(returnFocus = false) {
      root.classList.remove('is-open');
      trigger.setAttribute('aria-expanded','false');
      triggerObserver.disconnect();
      if (menu.matches(':popover-open')) menu.hidePopover();
      menu.hidden = true;
      if (activeSelect?.root === root) activeSelect = null;
      if (returnFocus) trigger.focus();
    }
    function choose(item) {
      if (select.value !== item.dataset.value) {
        select.value = item.dataset.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      sync();
      closeMenu(true);
    }
    trigger.addEventListener('click',() => root.classList.contains('is-open') ? closeMenu() : openMenu());
    trigger.addEventListener('keydown',event => {
      if (['ArrowDown','ArrowUp','Enter',' '].includes(event.key)) {
        event.preventDefault();
        openMenu(true);
      }
    });
    menu.addEventListener('click',event => {
      const item = event.target.closest('.ui-select-option');
      if (item) choose(item);
    });
    menu.addEventListener('keydown',event => {
      const current = options.indexOf(document.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return; }
      if (event.key === 'Tab') { closeMenu(); return; }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (current >= 0) choose(options[current]);
        return;
      }
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
      event.preventDefault();
      let next = current;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = options.length - 1;
      else if (event.key === 'ArrowDown') next = (current + 1) % options.length;
      else next = (current - 1 + options.length) % options.length;
      options[next]?.focus();
    });
    select.addEventListener('change',sync);
    root.append(trigger,menu);
    sync();
  }
  function enhanceAllSelects() {
    document.querySelectorAll('select').forEach(enhanceSelect);
    if (activeSelect && !activeSelect.trigger.isConnected) closeSelects();
  }
  enhanceAllSelects();
  new MutationObserver(enhanceAllSelects).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('pointerdown',event => {
    if (!event.target.closest('.ui-select-enhanced')) closeSelects();
  });
  document.addEventListener('keydown',event => {
    if (event.key !== 'Escape' || !activeSelect) return;
    event.preventDefault();
    event.stopPropagation();
    activeSelect.close(true);
  }, true);
  document.addEventListener('focusin',event => {
    if (activeSelect && !activeSelect.root.contains(event.target)) closeSelects();
  });
  document.addEventListener('scroll',event => {
    if (activeSelect && !activeSelect.menu.contains(event.target)) closeSelects();
  }, {capture:true, passive:true});
  window.addEventListener('resize',() => activeSelect?.position());
  document.addEventListener('mouseover',event => {
    const label = event.target.closest('.bot-card .b-name, .bot-card .b-sub');
    if (label) label.title = label.textContent.trim();
  });
  document.querySelectorAll('.info-ic').forEach(el => {
    if (el.textContent.trim() === '?') el.replaceChildren(icon('circle-help'));
    el.setAttribute('aria-label', el.dataset.tip || '查看说明');
    el.title = el.dataset.tip || '查看说明';
  });
  document.querySelectorAll('.nav-item').forEach(button => {
    const label = button.textContent.trim().replace(/\s+/g,' ');
    const iconName = mapping[button.dataset.entry || button.dataset.page];
    button.setAttribute('aria-label',label);
    button.title = label;
    const text = document.createElement('span');
    text.className = 'wb-label';
    text.textContent = label;
    button.replaceChildren(icon(iconName),text);
  });
  const account = document.querySelector('.user-box');
  if (account) {
    account.setAttribute('aria-label','切换模拟用户');
    account.title = '切换模拟用户';
  }
  const tabIcons = {'bot-dash':'chart-no-axes-combined','bot-qa':'library','bot-groups':'messages-square','bot-seaf':'monitor'};
  document.querySelectorAll('.inner-tab').forEach(button => {
    const first = button.firstChild;
    if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent.replace(/^[^\p{L}\p{N}]+/u,'');
    button.prepend(icon(tabIcons[button.dataset.itab]));
  });
  const contentModule = document.querySelector('#itab-bot-qa');
  function decorateContentIcons() {
    if (!contentModule) return;
    const pending = contentModule.querySelectorAll('.bot-ico:not([data-wb-icon])');
    pending.forEach(el => {
      el.dataset.wbIcon = 'true';
      el.replaceChildren(icon('file-text'));
    });
    if (pending.length) refreshIcons();
  }
  decorateContentIcons();
  if (contentModule) new MutationObserver(decorateContentIcons).observe(contentModule,{subtree:true,childList:true});
  function syncSelection() {
    document.querySelectorAll('.nav-item').forEach(button => {
      const value = button.classList.contains('active') ? 'page' : 'false';
      if (button.getAttribute('aria-current') !== value) button.setAttribute('aria-current',value);
    });
  }
  syncSelection();
  const navPanel = document.querySelector('.nav-panel');
  if (navPanel) new MutationObserver(syncSelection).observe(navPanel,{subtree:true,attributes:true,attributeFilter:['class']});
  document.querySelectorAll('.modal-mask').forEach(mask => {
    const dialog = mask.querySelector('.modal');
    const head = dialog.querySelector('.m-head');
    function enhanceHeader() {
      const title = head.querySelector('b');
      if (title) {
        if (!title.id) title.id = `${mask.id}Title`;
        dialog.setAttribute('aria-labelledby',title.id);
      }
      head.querySelectorAll('.xbtn').forEach(button => {
        button.setAttribute('aria-label','关闭'); button.title = '关闭';
      });
    }
    enhanceHeader();
    new MutationObserver(enhanceHeader).observe(head,{childList:true,subtree:true});
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.tabIndex = -1;
    let origin;
    const focusable = () => [...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')]
      .filter(el => !el.disabled && el.getClientRects().length);
    new MutationObserver(() => {
      if (mask.classList.contains('show')) {
        origin = document.activeElement;
        (focusable()[0] || dialog).focus();
      } else if (origin?.isConnected) origin.focus();
    }).observe(mask,{attributes:true,attributeFilter:['class']});
    dialog.addEventListener('keydown',event => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      const first = items[0], last = items[items.length-1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
  });
  function setupTableOverflow(container) {
    const table = container.querySelector('table');
    if (!table) return;
    const updateOverflow = () => {
      if (table.classList.contains('org-table')) {
        container.style.setProperty('--org-permission-width',
          `${Math.min(520, Math.max(360, container.clientWidth - 860))}px`);
      }
      const overflowing = container.clientWidth > 0 &&
        Math.max(table.getBoundingClientRect().width, table.scrollWidth) > container.clientWidth + 1;
      container.classList.toggle('has-horizontal-overflow', overflowing);
      if (overflowing) container.setAttribute('tabindex', '0');
      else container.removeAttribute('tabindex');
    };
    let frame;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateOverflow();
      });
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);
    observer.observe(table);
    new MutationObserver(scheduleUpdate).observe(table, {childList:true, subtree:true, characterData:true});
    updateOverflow();
  }
  document.querySelectorAll('.ui-table-scroll').forEach(setupTableOverflow);
  const scheme = matchMedia('(prefers-color-scheme: dark)');
  const originalColors = new WeakMap();
  function themeChart(chart) {
    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--muted').trim();
    const border = css.getPropertyValue('--border').trim();
    const colors = Array.from({length:6},(_,index) => css.getPropertyValue(`--chart-${index+1}`).trim());
    const sourceColors = ['#1f5fe8','#0e8f58','#c77d0a','#7c3aed','#d95555','#2bb3c0'];
    const options = chart.config.options;
    options.color = text;
    options.plugins ||= {};
    options.plugins.legend ||= {};
    options.plugins.legend.labels ||= {};
    options.plugins.legend.labels.color = text;
    if (['bar','line'].includes(chart.config.type)) {
      options.scales ||= {};
      options.scales.x ||= {};
      options.scales.y ||= {};
    }
    Object.values(options.scales || {}).forEach(scale => {
      scale.ticks ||= {}; scale.grid ||= {};
      scale.ticks.color = text; scale.grid.color = border;
    });
    chart.data.datasets.forEach((dataset,index) => {
      if (!originalColors.has(dataset)) originalColors.set(dataset,{border:dataset.borderColor,background:dataset.backgroundColor});
      const original = originalColors.get(dataset);
      const remap = (value,fallback) => {
        const found = sourceColors.findIndex(color => typeof value === 'string' && value.startsWith(color));
        return colors[found < 0 ? fallback % colors.length : found];
      };
      if (original.border) dataset.borderColor = remap(original.border,index);
      if (Array.isArray(original.background)) dataset.backgroundColor = original.background.map((value,i) => remap(value,i));
      else if (original.background) {
        const color = remap(original.border || original.background,index);
        dataset.backgroundColor = dataset.fill ? color + '26' : color;
      }
      if (chart.config.type === 'bar') dataset.borderRadius = parseFloat(css.getPropertyValue('--ui-control-radius')) || 0;
    });
  }
  function applyChartTheme() {
    if (typeof Chart === 'undefined') return;
    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--muted').trim();
    const border = css.getPropertyValue('--border').trim();
    Chart.defaults.color = text;
    Chart.defaults.borderColor = border;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Object.values(Chart.instances).forEach(chart => chart.update('none'));
  }
  // renderAll 会创建新图表；绘制前统一使用当前主题，不介入数据集。
  if (typeof Chart !== 'undefined') Chart.register({id:'workbenchTheme',beforeUpdate:themeChart});
  applyChartTheme();
  scheme.addEventListener('change',applyChartTheme);
  window.addEventListener('ops-personalization-change',applyChartTheme);
  refreshIcons();
  const iconObserver = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('i[data-lucide]') || node.querySelector('i[data-lucide]'))))) refreshIcons();
  });
  iconObserver.observe(document.body, { childList:true, subtree:true });
})();
