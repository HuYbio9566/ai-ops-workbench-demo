/* 可复用核心：主题注册表、偏好校验、首屏应用；不依赖运营页面 DOM。 */
(() => {
  const palette = (bg, surface, soft, text, muted, primary, ink, border, radius, card, shadow = 'none', font = 'sans') =>
    ({ bg, surface, soft, text, muted, primary, ink, border, radius, card, shadow, font });
  const themes = {
    default: { label: '默认', hint: '清晰 · 活力蓝',
      // 默认浅色主题：内容底与卡片底交换层级，统一作用于共享组件。
      light: palette('#fafafa','#f1f5f9','#ffffff','#0f172a','#64748b','#0052ff','#ffffff','#e2e8f0','12px','16px','0 4px 14px rgba(0,82,255,.08)'),
      dark: palette('#151515','#1c1c1c','#262626','#ededed','#a3a3a3','#0052ff','#ffffff','#343434','12px','16px','0 2px 12px rgba(0,0,0,.22)') },
    saas: { label: 'Vercel', hint: '中性 · 专注数据',
      light: palette('#fafafa','#ffffff','#f2f2f2','#171717','#666666','#171717','#ffffff','#e5e5e5','6px','8px','0 1px 2px rgba(0,0,0,.04)'),
      dark: palette('#151515','#1c1c1c','#262626','#ededed','#a3a3a3','#f5f5f5','#171717','#343434','6px','8px','0 2px 12px rgba(0,0,0,.22)') },
    brutalist: { label: 'Neo-brutalism', hint: '直角 · 硬边投影',
      light: palette('#FFFDF5','#FFFFFF','#FFF8D6','#000000','#3D3D3D','#FFD93D','#000000','#000000','0px','0px','4px 4px 0 #000000','neo'),
      dark: palette('#111111','#1D1D1D','#2A2A2A','#FFFFFF','#D6D6D6','#FFD93D','#000000','#FFFFFF','0px','0px','4px 4px 0 #000000','neo') },
    claude: { label: 'Claude', hint: '暖色 · 阅读友好',
      light: palette('#f7f5f2','#fffdf9','#eee9e2','#2d2926','#716a63','#c96442','#fffaf5','#ded7ce','10px','12px','0 2px 8px rgba(69,52,42,.06)','serif'),
      dark: palette('#1f1b18','#28231f','#342e29','#ededed','#a3a3a3','#c96442','#fffaf5','#443b34','10px','12px','0 2px 12px rgba(0,0,0,.22)','serif') },
    neumorphism: { label: 'Neumorphism', hint: '柔和 · 浮雕质感',
      light: palette('#e0e5ec','#e0e5ec','#e0e5ec','#3d4852','#606773','#6c63ff','#ffffff','transparent','16px','32px','9px 9px 16px rgb(163 177 198 / 60%), -9px -9px 16px rgb(255 255 255 / 50%)'),
      dark: palette('#252a31','#252a31','#252a31','#e8ecf1','#aeb7c4','#6c63ff','#ffffff','transparent','16px','32px','9px 9px 16px rgb(10 13 17 / 55%), -9px -9px 16px rgb(61 69 80 / 35%)') },
    terminal: { label: 'Terminal CLI', hint: '等宽 · 命令行绿',
      light: palette('#0a0a0a','#0d120d','#102410','#33ff00','#73a873','#33ff00','#0a0a0a','#1f521f','0px','0px','none','mono'),
      dark: palette('#0a0a0a','#0d120d','#102410','#33ff00','#73a873','#33ff00','#0a0a0a','#1f521f','0px','0px','none','mono') },
    vaporwave: { label: 'Vaporwave', hint: '霓虹 · 紫色空间',
      light: palette('#090014','rgba(26,16,60,.8)','#1a103c','#e0e0e0','#aaa0c4','#ff00ff','#090014','#2d1b4e','0px','0px','0 0 18px rgba(0,255,255,.12), 0 0 10px rgba(255,0,255,.1)','mono'),
      dark: palette('#151515','#1c1c1c','#262626','#ededed','#a3a3a3','#ff00ff','#090014','#343434','0px','0px','0 2px 12px rgba(0,0,0,.22)','mono') }
  };
  const defaults = Object.freeze({ version: 1, theme: 'default', mode: 'light', position: 'left', style: 'embedded', nav: 'wide', font: 'theme' });
  const choices = { theme: Object.keys(themes), mode: ['light','dark','system'], position: ['left','top'], style: ['standard','embedded','floating'], nav: ['wide','icons','labels'], font: ['theme','sans','serif','mono'] };
  const key = 'ai-ops:public-demo:personalization:v1';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const fonts = { sans: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif', serif: 'Georgia, "Songti SC", "STSong", serif', mono: '"SFMono-Regular", Consolas, "PingFang SC", monospace', neo: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif' };
  function normalize(input) {
    const result = { ...defaults };
    for (const [name, values] of Object.entries(choices)) if (values.includes(input?.[name])) result[name] = input[name];
    return result;
  }
  function read() {
    try { return normalize(JSON.parse(localStorage.getItem(key))); } catch { return { ...defaults }; }
  }
  let state = read();
  function apply() {
    const root = document.documentElement;
    const mode = state.mode === 'system' ? (media.matches ? 'dark' : 'light') : state.mode;
    const values = themes[state.theme][mode];
    for (const [name, value] of Object.entries(values)) if (name !== 'font') root.style.setProperty(`--p-${name}`, value);
    root.style.setProperty('--p-font', fonts[state.font === 'theme' ? values.font : state.font]);
    root.style.colorScheme = mode;
    for (const name of Object.keys(choices)) root.dataset[`p${name[0].toUpperCase()}${name.slice(1)}`] = state[name];
    root.dataset.pResolved = mode;
    window.dispatchEvent(new CustomEvent('ops-personalization-change', { detail: { ...state, resolvedMode: mode } }));
  }
  function set(patch) {
    state = normalize({ ...state, ...patch });
    let saved = true;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { saved = false; }
    apply();
    return saved;
  }
  window.OpsPersonalization = Object.freeze({ themes, defaults, choices, key, get: () => ({ ...state }), set, reset: () => set(defaults) });
  media.addEventListener('change', () => { if (state.mode === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { state = read(); apply(); }
  });
  apply();
})();
