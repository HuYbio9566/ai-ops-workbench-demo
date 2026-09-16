/* 按需浏览器回归：仅由 ?personalizationTest=1 加载。 */
(() => {
  const prefs = window.OpsPersonalization;
  const original = prefs.get();
  const originalRaw = localStorage.getItem(prefs.key);
  const results = [];
  const number = value => Number.parseFloat(value) || 0;
  const closeTo = (actual, expected, tolerance = 0.6) => Math.abs(actual - expected) <= tolerance;
  function check(name, pass, detail = '') {
    results.push({ name, pass: Boolean(pass), detail: String(detail) });
  }
  function css(selector, pseudo) {
    return getComputedStyle(document.querySelector(selector), pseudo);
  }
  function rect(selector) {
    return document.querySelector(selector).getBoundingClientRect();
  }
  function apply(patch) {
    prefs.set(patch);
    document.documentElement.getBoundingClientRect();
  }
  const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  function dispatchStorage(newValue) {
    window.dispatchEvent(new StorageEvent('storage', { key: prefs.key, newValue, storageArea: localStorage, url: location.href }));
  }
  async function systemMediaChangeWorks() {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.srcdoc = `<!doctype html><html><head><script>
      const media = new EventTarget();
      media.matches = false;
      media.media = '(prefers-color-scheme: dark)';
      window.__testMedia = media;
      window.matchMedia = () => media;
    <\/script><script src="./personalization-state.js"><\/script></head><body></body></html>`;
    document.body.append(frame);
    await new Promise((resolve, reject) => {
      frame.addEventListener('load', resolve, { once:true });
      setTimeout(() => reject(new Error('iframe load timeout')), 3000);
    });
    const view = frame.contentWindow;
    let changes = 0;
    view.addEventListener('ops-personalization-change', () => { changes += 1; });
    view.OpsPersonalization.set({ mode:'system' });
    const before = view.document.documentElement.dataset.pResolved;
    view.__testMedia.matches = true;
    view.__testMedia.dispatchEvent(new view.Event('change'));
    const after = view.document.documentElement.dataset.pResolved;
    frame.remove();
    return before === 'light' && after === 'dark' && changes === 2;
  }
  function canvasHasPixels(id) {
    const canvas = document.getElementById(id);
    if (!canvas?.width || !canvas.height) return false;
    const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    for (let index = 3; index < data.length; index += 4) if (data[index]) return true;
    return false;
  }
  async function run() {
    const root = document.documentElement;
    const themes = Object.keys(prefs.themes);
    const paintedCanvases = {};
    ['ovMsgChart','ovUserChart','ovMsgTrend','ovActTrend','ovChannel'].forEach(id => { paintedCanvases[id] = canvasHasPixels(id); });
    for (const theme of themes) {
      for (const mode of ['light', 'dark']) {
        for (const style of ['standard', 'embedded', 'floating']) {
          apply({ theme, mode, style, position: 'left', nav: 'wide' });
          const main = css('.main-shell');
          check(`${theme}/${mode}/${style} token`,
            root.dataset.pTheme === theme && root.dataset.pResolved === mode && root.dataset.pStyle === style &&
            Boolean(css(':root').getPropertyValue('--p-bg').trim()));
          check(`${theme}/${mode}/${style} main radius`,
            theme === 'default' ? number(main.borderTopLeftRadius) === 8 : style === 'standard' ? number(main.borderTopLeftRadius) === 0 : main.borderTopLeftRadius === css(':root').getPropertyValue('--p-card').trim(),
            main.borderTopLeftRadius);
        }
      }
    }

    for (const [nav, width] of [['wide',240],['icons',64],['labels',72]]) {
      apply({ theme:'default', mode:'light', style:'standard', position:'left', nav });
      check(`standard/${nav} navigation width`, closeTo(rect('.p-navigation').width,width), rect('.p-navigation').width);
      if (nav === 'icons') {
        const item = rect('.nav-item:not(.hidden)');
        check('icons selected area square', closeTo(item.width,40) && closeTo(item.height,40), `${item.width}x${item.height}`);
      }
      if (nav === 'labels') {
        const item = rect('.nav-item:not(.hidden)');
        check('labels selected area minimum height', item.height >= 52, item.height);
        check('labels typography', css('.wb-label').fontSize === '11px' && css('.wb-label').lineHeight === '15px', `${css('.wb-label').fontSize}/${css('.wb-label').lineHeight}`);
      }
    }
    for (const [nav, width] of [['wide',240],['icons',64],['labels',72]]) {
      apply({ style:'floating', position:'left', nav });
      const outer = rect('.col-left');
      const panel = rect('.p-navigation');
      check(`floating/${nav} panel width`, closeTo(panel.width,width), panel.width);
      check(`floating/${nav} four-side gap`,
        closeTo(panel.left-outer.left,12) && closeTo(outer.right-panel.right,12) && closeTo(panel.top-outer.top,12) && closeTo(outer.bottom-panel.bottom,12),
        `${panel.left-outer.left}/${outer.right-panel.right}/${panel.top-outer.top}/${outer.bottom-panel.bottom}`);
    }

    apply({ theme:'saas', mode:'dark', style:'floating', position:'top', nav:'labels' });
    const navPanel = rect('.p-navigation');
    const navOuter = rect('.col-left');
    check('top navigation keeps labels', css('.wb-label').display !== 'none');
    check('top floating inset', closeTo(navPanel.left-navOuter.left,12) && closeTo(navOuter.right-navPanel.right,12) && closeTo(navPanel.top-navOuter.top,12),
      `${navPanel.left-navOuter.left}/${navOuter.right-navPanel.right}/${navPanel.top-navOuter.top}`);

    if (typeof setITab === 'function') {
      setITab('bot-dash');
      await nextPaint();
      ['dashMsgTrend','dashActTrend','dashChannel'].forEach(id => { paintedCanvases[id] = canvasHasPixels(id); });
    }
    const activeTab = document.querySelector('.inner-tab.active');
    const line = activeTab ? getComputedStyle(activeTab,'::after') : null;
    check('active tab line', line && line.content !== 'none' && number(line.height) === 2 && number(line.left) === 0 && number(line.right) === 0,
      line ? `${line.content}/${line.height}/${line.left}/${line.right}` : 'missing active tab');

    if (typeof setITab === 'function') {
      setITab('bot-groups');
      await nextPaint();
      ['grpGroupCanvas','grpChannelCanvas'].forEach(id => { paintedCanvases[id] = canvasHasPixels(id); });
    }
    const chartKeys = typeof charts === 'object' && charts ? Object.keys(charts) : [];
    check('Chart.js loaded locally', typeof Chart === 'function', typeof Chart);
    check('all chart instances created', chartKeys.length === 10, chartKeys.join(','));
    const blankCanvases = Object.entries(paintedCanvases).filter(([,painted]) => !painted).map(([id]) => id);
    check('all canvases painted in visible views', Object.keys(paintedCanvases).length === 10 && blankCanvases.length === 0,
      blankCanvases.length ? blankCanvases.join(',') : Object.keys(paintedCanvases).join(','));

    apply({ theme:'terminal', mode:'dark', style:'floating', position:'left', nav:'wide' });
    const panelStyle = css('.p-navigation');
    check('floating border is single layer', panelStyle.borderLeftWidth === '1px' && css('.col-left').borderLeftWidth === '0px');
    check('floating panel radius follows theme', panelStyle.borderTopLeftRadius === css(':root').getPropertyValue('--p-card').trim());
    check('logo/avatar radius follows control', css('.logo').borderRadius === css('.u-avatar').borderRadius && css('.logo').borderRadius === css(':root').getPropertyValue('--p-radius').trim());

    apply({ theme:'claude', mode:'dark', position:'top', style:'embedded', nav:'labels', font:'serif' });
    const stored = JSON.parse(localStorage.getItem(prefs.key));
    check('localStorage persists validated preferences',
      stored.theme === 'claude' && stored.mode === 'dark' && stored.position === 'top' && stored.style === 'embedded' && stored.nav === 'labels' && stored.font === 'serif',
      JSON.stringify(stored));

    localStorage.setItem(prefs.key, '{bad json');
    dispatchStorage('{bad json');
    check('invalid localStorage JSON falls back to defaults', JSON.stringify(prefs.get()) === JSON.stringify(prefs.defaults), JSON.stringify(prefs.get()));

    const external = { ...prefs.defaults, theme:'neumorphism', mode:'dark', style:'floating', nav:'icons', font:'sans' };
    const externalRaw = JSON.stringify(external);
    localStorage.setItem(prefs.key, externalRaw);
    dispatchStorage(externalRaw);
    check('storage event synchronizes preferences', JSON.stringify(prefs.get()) === externalRaw, JSON.stringify(prefs.get()));

    localStorage.setItem(prefs.key, JSON.stringify(prefs.defaults));
    let systemChange = false;
    try { systemChange = await systemMediaChangeWorks(); } catch (error) { check('system media change event reapplies resolved mode', false, error.message); }
    if (!results.some(item => item.name === 'system media change event reapplies resolved mode')) {
      check('system media change event reapplies resolved mode', systemChange);
    }

    prefs.reset();
    check('reset restores defaults', JSON.stringify(prefs.get()) === JSON.stringify(prefs.defaults));
    check('default product baseline', prefs.get().theme === 'default' && prefs.get().mode === 'system' && prefs.get().position === 'left' && prefs.get().style === 'embedded' && prefs.get().nav === 'wide');
    check('lucide icons rendered', document.querySelectorAll('svg.lucide').length > 0, document.querySelectorAll('svg.lucide').length);
    check('no document horizontal overflow', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      `${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`);

    const report = { generatedAt:new Date().toISOString(), viewport:[innerWidth,innerHeight], passed:results.filter(item=>item.pass).length, failed:results.filter(item=>!item.pass).length, diagnostics:{ chartKeys, paintedCanvases }, results };
    window.__personalizationRegression = report;
    const output = document.createElement('section');
    output.id = 'personalization-test-report';
    output.style.cssText = 'position:fixed;inset:12px;z-index:9999;overflow:auto;padding:20px;background:#fff;color:#111;border:2px solid #111;font:13px/1.5 ui-monospace,monospace';
    output.innerHTML = `<h1 style="font-size:18px">个性化回归：${report.failed ? '失败' : '通过'} ${report.passed}/${results.length}</h1><pre style="white-space:pre-wrap">${results.map(item=>`${item.pass?'PASS':'FAIL'}  ${item.name}${item.detail?'  '+item.detail:''}`).join('\n')}</pre>`;
    document.body.append(output);
    console.info('personalization regression', report);
    if (originalRaw === null) localStorage.removeItem(prefs.key); else localStorage.setItem(prefs.key, originalRaw);
    dispatchStorage(originalRaw);
    console.info('personalization regression state restored', JSON.stringify(prefs.get()) === JSON.stringify(original));
  }
  requestAnimationFrame(() => requestAnimationFrame(run));
})();
