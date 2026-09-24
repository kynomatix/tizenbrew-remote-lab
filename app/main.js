// Remote Lab: a TizenBrew app module.
//
// It does two jobs. It shows the keyCode every remote button actually sends,
// and it demonstrates D-pad focus handling, which is the part of TV
// development that differs most from the ordinary web. It also runs in a
// desktop browser: arrows, Enter and Escape (standing in for Back) behave
// the same, so most iteration can happen without touching the TV.

(function () {
  'use strict';

  // Tizen TV keyCodes. A key missing from this table still appears in the
  // log with its raw code, so the table is a convenience rather than a
  // source of truth; unknown codes are the interesting ones.
  const KEY_NAMES = {
    13: 'Enter',
    19: 'Pause',
    27: 'Escape',
    37: 'Left',
    38: 'Up',
    39: 'Right',
    40: 'Down',
    403: 'Red',
    404: 'Green',
    405: 'Yellow',
    406: 'Blue',
    412: 'Rewind',
    413: 'Stop',
    415: 'Play',
    417: 'FastForward',
    427: 'ChannelUp',
    428: 'ChannelDown',
    457: 'Info',
    10009: 'Back',
    10182: 'Exit',
    10252: 'PlayPause'
  };
  for (let digit = 0; digit <= 9; digit++) {
    KEY_NAMES[48 + digit] = String(digit);
  }

  const TILES = [
    { name: 'Indigo', color: '#6c8cff' },
    { name: 'Teal', color: '#2ec4b6' },
    { name: 'Amber', color: '#ffb020' },
    { name: 'Coral', color: '#ff6b6b' },
    { name: 'Violet', color: '#b07cff' },
    { name: 'Lime', color: '#9be15d' },
    { name: 'Sky', color: '#4cc9f0' },
    { name: 'Rose', color: '#ff7eb6' },
    { name: 'Silver', color: '#c9d1e0' }
  ];
  const COLS = 3;
  const ROWS = TILES.length / COLS;

  // The colour buttons jump straight to their matching tile, which shows
  // that the keys registered in package.json are arriving.
  const COLOUR_KEY_TILES = { 403: 3, 404: 5, 405: 2, 406: 6 };

  const MAX_LOG = 12;
  const BACK_WINDOW_MS = 1500;

  const grid = document.getElementById('grid');
  const lastName = document.getElementById('last-name');
  const lastCode = document.getElementById('last-code');
  const log = document.getElementById('log');
  const env = document.getElementById('env');
  const clock = document.getElementById('clock');

  const tileEls = TILES.map((tile) => {
    const el = document.createElement('div');
    const swatch = document.createElement('span');
    const label = document.createElement('span');
    el.className = 'tile';
    swatch.className = 'swatch';
    swatch.style.background = tile.color;
    label.textContent = tile.name;
    el.appendChild(swatch);
    el.appendChild(label);
    grid.appendChild(el);
    return el;
  });

  let focus = 0;
  let lastBack = 0;
  let shownTime = '';

  function setFocus(index) {
    tileEls[focus].classList.remove('focused');
    focus = index;
    tileEls[focus].classList.add('focused');
  }

  function move(dx, dy) {
    const col = (focus % COLS) + dx;
    const row = Math.floor(focus / COLS) + dy;
    // Stop at the edges rather than wrapping. Wrapping feels clever on a
    // keyboard and disorienting on a remote.
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    setFocus(row * COLS + col);
  }

  function select(index) {
    setFocus(index);
    document.documentElement.style.setProperty('--accent', TILES[index].color);
    const el = tileEls[index];
    el.classList.remove('pulse');
    void el.offsetWidth; // force a reflow so a repeat press restarts the animation
    el.classList.add('pulse');
  }

  function leave() {
    // How TizenBrew hosts an app module isn't documented, so try the gentlest
    // exit first. The remote's Home button works regardless.
    if (history.length > 1) {
      history.back();
    } else if (window.tizen && tizen.application) {
      tizen.application.getCurrentApplication().exit();
    }
  }

  function handleBack() {
    const now = Date.now();
    if (now - lastBack < BACK_WINDOW_MS) {
      leave();
      return;
    }
    lastBack = now;
    lastCode.textContent = 'Press Back again to leave';
  }

  function record(e) {
    const name = KEY_NAMES[e.keyCode];
    lastName.textContent = name || 'Unknown';
    lastCode.textContent = `keyCode ${e.keyCode}` + (e.key ? ` · key "${e.key}"` : '');

    const item = document.createElement('li');
    const what = document.createElement('span');
    const when = document.createElement('span');
    if (!name) item.className = 'unknown';
    what.textContent = `${name || 'Unknown'} · ${e.keyCode}`;
    when.textContent = new Date().toLocaleTimeString();
    item.appendChild(what);
    item.appendChild(when);
    log.insertBefore(item, log.firstChild);
    // TV chips are slow and an app can sit open for hours, so keep the list
    // bounded instead of letting the DOM grow with every press.
    while (log.children.length > MAX_LOG) {
      log.removeChild(log.lastChild);
    }
  }

  // Newest first: each feature paired with the Chromium version that shipped
  // it. The user agent can't be trusted for this. Samsung's omits "Chrome/",
  // and TizenBrew can replace it outright, so check what the engine can do.
  const ENGINE_RUNGS = [
    [128, () => typeof Promise.try === 'function'],
    [122, () => typeof Set.prototype.union === 'function'],
    [120, () => typeof URL.canParse === 'function'],
    [117, () => typeof Object.groupBy === 'function'],
    [110, () => typeof Array.prototype.toSorted === 'function'],
    [105, () => CSS.supports('selector(:has(a))')],
    [98, () => typeof structuredClone === 'function'],
    [92, () => typeof Array.prototype.at === 'function'],
    [85, () => typeof String.prototype.replaceAll === 'function'],
    [80, () => new Function('return ({})?.a === undefined')()],
    [73, () => typeof Object.fromEntries === 'function'],
    [69, () => typeof Array.prototype.flat === 'function']
  ];

  function detectEngine() {
    for (let i = 0; i < ENGINE_RUNGS.length; i++) {
      let supported = false;
      try {
        supported = ENGINE_RUNGS[i][1]();
      } catch (_) {
        // Missing syntax or API: this rung isn't supported.
      }
      if (supported) {
        const version = ENGINE_RUNGS[i][0];
        return i === 0 ? `Chromium ${version}+` : `Chromium ${version}–${ENGINE_RUNGS[i - 1][0] - 1}`;
      }
    }
    return 'older than Chromium 69';
  }

  function versionFromUserAgent(ua) {
    // Desktop style "Chrome/120", or Samsung TV style "120.0.6099.5/9.0 TV Safari".
    const match = ua.match(/Chrome\/(\d+)/) || ua.match(/\b(\d{2,3})(?:\.\d+){3,4}\/[\d.]+ TV Safari/);
    return match ? match[1] : 'none given';
  }

  function describeEnvironment() {
    const rows = [
      ['Viewport', `${window.innerWidth} × ${window.innerHeight} @ ${window.devicePixelRatio}x`],
      ['Engine', detectEngine()],
      ['UA version', versionFromUserAgent(navigator.userAgent)],
      ['Tizen API', window.tizen ? 'available' : 'not available here'],
      ['User agent', navigator.userAgent]
    ];
    rows.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      // The full agent string is long, and its useful part is at the end.
      if (label === 'User agent') dd.className = 'wrap';
      env.appendChild(dt);
      env.appendChild(dd);
    });
  }

  function tick() {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Skip the DOM write when nothing changed; this runs every second.
    if (time !== shownTime) {
      clock.textContent = shownTime = time;
    }
  }

  document.addEventListener('keydown', (e) => {
    record(e);
    switch (e.keyCode) {
      case 37: move(-1, 0); break;
      case 38: move(0, -1); break;
      case 39: move(1, 0); break;
      case 40: move(0, 1); break;
      case 13: select(focus); break;
      case 403:
      case 404:
      case 405:
      case 406:
        select(COLOUR_KEY_TILES[e.keyCode]);
        break;
      case 27:
      case 10009:
        handleBack();
        break;
      default:
        return; // leave every other key to the platform
    }
    e.preventDefault();
  });

  setFocus(0);
  describeEnvironment();
  tick();
  setInterval(tick, 1000);
})();
