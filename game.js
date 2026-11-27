'use strict';

/* ───────────── Regole ───────────── */

const CATS = [
  { id: 'ones',   label: 'Uno',         face: 1, hint: 'Somma degli 1' },
  { id: 'twos',   label: 'Due',         face: 2, hint: 'Somma dei 2' },
  { id: 'threes', label: 'Tre',         face: 3, hint: 'Somma dei 3' },
  { id: 'fours',  label: 'Quattro',     face: 4, hint: 'Somma dei 4' },
  { id: 'fives',  label: 'Cinque',      face: 5, hint: 'Somma dei 5' },
  { id: 'sixes',  label: 'Sei',         face: 6, hint: 'Somma dei 6' },
  { id: 'tris',   label: 'Tris',        hint: 'Tre uguali · somma' },
  { id: 'poker',  label: 'Poker',       hint: 'Quattro uguali · somma' },
  { id: 'full',   label: 'Full',        hint: 'Tre più due · 25' },
  { id: 'small',  label: 'Scala corta', hint: 'Quattro in fila · 30' },
  { id: 'large',  label: 'Scala lunga', hint: 'Cinque in fila · 40' },
  { id: 'cinq',   label: 'Yatzy',       hint: 'Cinque uguali · 50' },
  { id: 'chance', label: 'Chance',      hint: 'Somma dei dadi' },
];
// Variante Arcobaleno: ogni dado ha anche un colore (rubino, smeraldo, zaffiro)
const RAINBOW_CATS = [
  { id: 'mono',  label: 'Monocolore',     hint: 'Cinque dello stesso colore · 40', rainbow: true },
  { id: 'fullc', label: 'Full di colori', hint: 'Tre di un colore e due di un altro · 20', rainbow: true },
];
const GEMS = { r: 'rubino', g: 'smeraldo', b: 'zaffiro' };
const GEM_KEYS = Object.keys(GEMS);
const rndGem = () => GEM_KEYS[Math.floor(Math.random() * 3)];
const CAT = Object.fromEntries([...CATS, ...RAINBOW_CATS].map(c => [c.id, c]));
const UPPER = CATS.filter(c => c.face);
const LOWER = [...CATS.filter(c => !c.face), ...RAINBOW_CATS];
const BONUS_AT = 63, BONUS = 35, CINQ_BONUS = 100;
const MAX_HP = 150, BATTLE_BONUS_HEAL = 35, BATTLE_EXTRA_HIT = 50;
// Bevuta: 5 bicchieri a testa. La parte bassa fa bere l'avversario, la parte alta fa smaltire.
const GLASSES = 7, SALUDE_ROUNDS = [4, 8, 12];
// quanto si vede l'ubriachezza (0–4), in proporzione ai bicchieri bevuti
const dlv = q => Math.min(4, Math.round((q?.drunk || 0) * 4 / (GLASSES - 1)));
const DRINKS = {
  ichnusa:    { name: 'Ichnusa',         emoji: '🍺', color: '#e8b33a' },
  vino:       { name: 'vino nieddu',     emoji: '🍷', color: '#7a0f1d', short: 'vino' },
  mirto:      { name: 'mirto',           emoji: '🫐', color: '#5b1f63' },
  filu:       { name: "filu 'e ferru",   emoji: '🥃', color: '#efe8d2' },
  cannonau:   { name: 'Cannonau',        emoji: '🍷', color: '#4a0410' },
  vermentino: { name: 'Vermentino',      emoji: '🥂', color: '#e3d77e' },
};
const DRINK_OF = { tris: 'ichnusa', poker: 'ichnusa', full: 'vino', small: 'vino', large: 'vino', chance: 'mirto', cinq: 'filu', mono: 'cannonau', fullc: 'vermentino' };
function glassesFor(id, sc) {
  if (!sc) return 0;
  if (id === 'cinq' || id === 'mono') return 2;                    // filu 'e ferru e Cannonau: due bicchieri a tzoccu
  if (['tris', 'poker', 'full', 'small', 'large', 'fullc'].includes(id)) return 1;
  if (id === 'chance') return sc >= 25 ? 1 : 0;
  return 0;
}
// Spuntini della parte alta: più dadi uguali, più si smaltisce
const SNACKS = {
  pane:        { name: 'pane carasau', sober: 1 },
  culurgiones: { name: 'culurgiones',  sober: 2 },
  casu:        { name: 'casu marzu',   sober: 3 },
  salsiccia:   { name: 'salsiccia sarda', sober: 2 },
};
const shakesFor = id => ['full', 'small', 'large'].includes(id);   // Full e Scale: il tavolo gira al turno dopo
const catsOf = p => (p.rainbow ? [...CATS, ...RAINBOW_CATS] : CATS);

function counts(d) {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of d) c[v]++;
  return c;
}
const sum = d => d.reduce((a, b) => a + b, 0);
const isCinq = d => d[0] > 0 && d.every(v => v === d[0]);

function hasRun(d, len) {
  const s = new Set(d);
  for (let start = 1; start + len - 1 <= 6; start++) {
    let ok = true;
    for (let k = 0; k < len; k++) if (!s.has(start + k)) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

function colorCounts(col) {
  const n = { r: 0, g: 0, b: 0 };
  for (const k of col || []) if (k in n) n[k]++;
  return Object.values(n).sort((a, b) => b - a);
}

function scoreFor(id, d, joker, col) {
  const c = counts(d), s = sum(d), max = Math.max(...c);
  const cat = CAT[id];
  if (cat.face) return c[cat.face] * cat.face;
  switch (id) {
    case 'mono':   return colorCounts(col)[0] === 5 ? 40 : 0;
    case 'fullc':  { const n = colorCounts(col); return n[0] === 3 && n[1] === 2 ? 20 : 0; }
    case 'tris':   return max >= 3 ? s : 0;
    case 'poker':  return max >= 4 ? s : 0;
    case 'full':   return joker || (c.includes(3) && c.includes(2)) ? 25 : 0;
    case 'small':  return joker || hasRun(d, 4) ? 30 : 0;
    case 'large':  return joker || hasRun(d, 5) ? 40 : 0;
    case 'cinq':   return max === 5 ? 50 : 0;
    case 'chance': return s;
  }
  return 0;
}

const jokerFor = (p, d) => isCinq(d) && p.scores.cinq !== undefined;
const upperSum = p => UPPER.reduce((a, c) => a + (p.scores[c.id] ?? 0), 0);
const lowerSum = p => LOWER.reduce((a, c) => a + (p.scores[c.id] ?? 0), 0);
const bonusOf = p => (upperSum(p) >= BONUS_AT ? BONUS : 0);
const totalOf = p => upperSum(p) + bonusOf(p) + lowerSum(p) + p.extra;
const openCats = p => catsOf(p).filter(c => p.scores[c.id] === undefined).map(c => c.id);

/* ───────────── Tziu Gonario (computer) ───────────── */

const LEVELS = {
  easy:   { sims: 25,  noise: 9 },
  normal: { sims: 80,  noise: 6 },
  hard:   { sims: 320, noise: 0 },
};

/* ───────────── Avventura ───────────── */

const CHARMS = {
  ritorno: { name: 'Ampolla del Ritorno', icon: '⚗️', desc: 'Un lancio in più, in un turno a tua scelta.' },
  lente:   { name: 'Lente del Saggio',    icon: '🔍', desc: 'Rilancia un solo dado senza consumare lanci.' },
  sigillo: { name: 'Sigillo di Rame',     icon: '🔶', desc: 'Scegli tu la faccia di un dado.' },
  elisir:  { name: 'Elisir Doppio',       icon: '🧪', desc: 'La prossima casella che segni vale doppio.' },
};

// goal: score = fai almeno `min` punti da solo · beat = batti l'avversario (con `margin` di scarto, e il bonus se `needBonus`)
const STAGES = [
  { id: 'bottega', place: "L'Ovile", icon: '🐑', portrait: 'img/gonario/idle.webp',
    desc: 'Tra pecore e muretti a secco comincia il viaggio. Prima di lasciarti partire, Tziu Gonario ti sfida lui stesso… col bicchiere in mano.',
    foe: { name: 'Tziu Gonario', portrait: 'img/gonario/idle.webp', icon: '🐑', level: 'easy',
      quote: 'Ajò! Fammi vedere come lanci. E se perdi, il prossimo bicchiere lo paghi tu!',
      lines: ['Eja! Il vecchio non ha perso la mano!', 'Hic! Questo lo sapevo fare già da piccolo.'] },
    goal: { type: 'beat' }, goalText: 'Batti Tziu Gonario', stars: [170, 220], unlock: 'ritorno',
    intro: 'Ajò! Prima di partire fammi vedere come lanci… hic! Battimi, se ci riesci.' },
  { id: 'gavinedda', place: 'Su Furru', icon: '🍞',
    desc: 'Profumo di pane appena sfornato. Tzia Gavinedda gioca piano piano, punta sempre al bonus e non sbaglia mai un conto.',
    foe: { name: 'Tzia Gavinedda', img: 'gavinedda', icon: '👵', level: 'easy', style: 'prudente',
      quote: 'Fizu meu, chi va piano va sano e va lontano.',
      lines: ['Piano piano, il pane lievita.', 'Un punto alla volta, come le briciole per le galline.'] },
    goal: { type: 'beat' }, goalText: 'Batti Tzia Gavinedda', stars: [190, 240] },
  { id: 'casaro', place: 'Su Casu', icon: '🧀',
    desc: 'Nel caseificio stagionano le forme di pecorino. Il Casaro tiene solo i numeri più grossi e ama Tris, Poker e Chance pesanti.',
    foe: { name: 'Il Casaro', img: 'casaro', icon: '🧀', level: 'normal', style: 'accumulatore',
      quote: 'Il formaggio buono è quello che pesa. Anche i punti!',
      lines: ['Questa è una forma da tre chili!', 'Stagionato al punto giusto.'] },
    goal: { type: 'beat' }, goalText: 'Batti il Casaro', stars: [200, 250], unlock: 'lente' },
  { id: 'tzilleri', place: 'Su Tzilleri', icon: '🍷',
    desc: 'Nel bar del paese non si gioca solo a dadi: qui si gioca a Bevuta! Il barista è impulsivo e regge bene il vino.',
    foe: { name: 'Il barista', img: 'barista', icon: '🍷', level: 'normal', style: 'impulsivo',
      quote: 'Un lancio, un bicchiere, e via! Qui non si perde tempo.',
      lines: ['Alla salute!', 'Offre la casa!'] },
    rules: 'drink', goal: { type: 'beat' }, goalText: 'Batti il barista a Bevuta: fallo finire cottu prima di te', stars: [3, 5], starUnit: 'bicchieri rimasti' },
  { id: 'paskale', place: 'Sa Cantina', icon: '🍶',
    desc: 'In fondo alla cantina, tra le botti, ti aspetta Tziu Paskale: ancora più cottu di Tziu Gonario. Parte già con due bicchieri in corpo, ma gioca da maestro… quando non si addormenta.',
    foe: { name: 'Tziu Paskale', img: 'paskale', icon: '🍶', level: 'hard', style: 'dormiglione', drunk: 2,
      quote: 'Hic… chi ha detto che sono ubriaco? Siediti, che ti insegno io i dadi.',
      lines: ['Eh eh! Anche da mezzo addormentato ti batto!', 'Hic! Questo tiro lo dedico al fiasco.'] },
    rules: 'drink', goal: { type: 'beat' }, goalText: 'Batti Tziu Paskale a Bevuta: fallo finire cottu prima di te', stars: [3, 5], starUnit: 'bicchieri rimasti',
    intro: 'Attento a Tziu Paskale: è più cottu di me, ma coi dadi è un volpone… hic!' },
  { id: 'bonaria', place: 'Sa Domo', icon: '🧹',
    desc: 'Tzia Bonaria, la moglie di Tziu Gonario, è venuta a riportarlo a casa. Il vino non lo sopporta e ogni tanto porta via il fiasco a tutti: in Bevuta è un osso duro.',
    foe: { name: 'Tzia Bonaria', img: 'bonaria', icon: '🧹', level: 'hard', style: 'moglie',
      quote: 'Gonario! A casa, subito! E tu, siediti: prima finiamo questa partita.',
      lines: ['Altro che vino: qui si gioca con la testa!', 'Ecco come si fa, senza bicchiere in mano.'] },
    rules: 'drink', goal: { type: 'beat' }, goalText: 'Batti Tzia Bonaria a Bevuta: falla finire cotta prima di te', stars: [3, 5], starUnit: 'bicchieri rimasti',
    intro: 'Ahi ahi… è arrivata mia moglie! Nascondi il bicchiere e battila tu, che io non ho il coraggio… hic!' },
  { id: 'sartiglia', place: 'Sa Sartiglia', icon: '⭐',
    desc: 'Alla giostra si corre verso la stella. Su Componidori rischia tutto per scale e Yatzy. Si gioca con i dadi Arcobaleno.',
    foe: { name: 'Su Componidori', img: 'componidori', icon: '⭐', level: 'normal', style: 'stelle',
      quote: 'Io miro solo alla stella.',
      lines: ['Centro! La stella è mia.', 'Al galoppo verso la stella!'] },
    rules: 'rainbow', goal: { type: 'beat', margin: 15 }, goalText: 'Batti Su Componidori con 15 punti di scarto (dadi Arcobaleno)', stars: [230, 280], unlock: 'sigillo' },
  { id: 'merdules', place: 'Su Carrasecare', icon: '🎭',
    desc: 'È carnevale e il Merdules non scherza: attacca sempre. In questa tappa si gioca a Battaglia.',
    foe: { name: 'Il Merdules', img: 'merdules', icon: '🎭', level: 'normal', style: 'aggressivo',
      quote: 'A carnevale si gioca duro. Preparati!',
      lines: ['Ti ho preso!', 'Ecco un bel colpo di bastone!'] },
    rules: 'battle', goal: { type: 'beat' }, goalText: 'Batti il Merdules a Battaglia', stars: [50, 100], starUnit: 'punti vita', unlock: 'elisir' },
  { id: 'mammuthones', place: 'La notte dei campanacci', icon: '🔔',
    desc: 'Nella notte si sentono i campanacci avvicinarsi. La sfida finale: il Mammuthones, a Battaglia, con 200 punti vita.',
    foe: { name: 'Il Mammuthones', img: 'mammuthones', icon: '🔔', level: 'hard', style: 'boss', hp: 200,
      quote: 'Dlon… dlon… (il suono dei campanacci si fa sempre più vicino)',
      lines: ['Dlon! Dlon!', 'I campanacci suonano per te…'] },
    rules: 'battle', goal: { type: 'beat' }, goalText: 'Batti il Mammuthones a Battaglia (lui ha 200 punti vita)', stars: [40, 90], starUnit: 'punti vita' },
];
const ADV_KEY = 'cd.adv';
const loadAdv = () => { try { return JSON.parse(localStorage.getItem(ADV_KEY)) || { stars: {} }; } catch { return { stars: {} }; } };
const saveAdv = a => localStorage.setItem(ADV_KEY, JSON.stringify(a));
const stageUnlocked = (a, i) => i === 0 || (a.stars[STAGES[i].id] || 0) > 0 || (a.stars[STAGES[i - 1].id] || 0) > 0;
const charmsOwned = a => STAGES.filter(s => s.unlock && (a.stars[s.id] || 0) > 0).map(s => s.unlock);

// Stili di gioco degli avversari dell'avventura
const STYLE_STOP = { prudente: 2, impulsivo: 5, stelle: -2 };   // quanto preferiscono fermarsi
const maxHpOf = p => p.maxHp || MAX_HP;

function utility(id, sc, p) {
  let u = baseUtility(id, sc, p);
  const cat = CAT[id];
  switch (p.style) {
    case 'prudente':
      if (cat.face && upperSum(p) < BONUS_AT) u += (sc - cat.face * 3) * 1.3 + (sc >= cat.face * 3 ? 8 : 0);
      if (!cat.face && sc === 0) u -= 6;
      break;
    case 'accumulatore':
      if (id === 'tris' || id === 'poker' || id === 'chance') u += (sc - 18) * 0.5;
      if (cat.face >= 4) u += sc * 0.15;
      break;
    case 'stelle':
      if (['cinq', 'large', 'small', 'mono'].includes(id) && sc > 0) u += 12;
      break;
    case 'aggressivo':
      if (p.battle) u *= cat.face ? 0.5 : 1.25;
      break;
  }
  return u;
}

// Quanto "vale" per il computer segnare `sc` punti nella casella `id`.
function baseUtility(id, sc, p) {
  let u = sc;
  const cat = CAT[id];
  if (p.drink) {
    // Bevuta: conta far bere l'altro, e smaltire se si è già brilli
    if (cat.face) return (sc >= cat.face * 3 ? (p.drunk > 0 ? 22 : 6) : 0) + sc * 0.3 + (upperSum(p) < BONUS_AT && sc >= cat.face * 3 ? 4 : 0);
    const g = glassesFor(id, sc);
    return g * 26 + (g && (p._oppDrunk ?? 0) + g >= GLASSES ? 300 : 0) + sc * 0.15 - (sc === 0 ? ({ cinq: 10, large: 5, small: 3, full: 2 }[id] || 0) : 0) - (id === 'chance' ? 6 : 0);
  }
  if (p.battle) {
    // Battaglia: la parte alta cura (utile solo se si è feriti), la parte bassa attacca
    if (cat.face) {
      const heal = Math.min(sc, maxHpOf(p) - p.hp);
      return heal * 0.85 + (upperSum(p) < BONUS_AT && sc >= cat.face * 3 ? 4 : 0) - (sc === 0 ? 1 : 0);
    }
    if (sc >= (p._oppHp ?? MAX_HP)) u += 300;
    if (id === 'chance') u -= 7;
    if (sc === 0) u -= { cinq: 10, large: 5, small: 3, full: 2 }[id] || 0;
    return u;
  }
  if (cat.face) {
    if (upperSum(p) < BONUS_AT) u += (sc - cat.face * 3) * 0.9;
  } else if (id === 'chance') {
    u -= 9;
  } else if (id === 'tris' || id === 'poker') {
    u -= sc ? 4 : 0;
  } else if (sc === 0) {
    u -= { cinq: 14, large: 7, small: 4, full: 3, mono: 6, fullc: 2 }[id] || 0;
  }
  return u;
}

function bestUtility(d, p, col) {
  const joker = jokerFor(p, d);
  let best = -Infinity;
  for (const id of openCats(p)) {
    const u = utility(id, scoreFor(id, d, joker, col), p);
    if (u > best) best = u;
  }
  return best + (isCinq(d) && p.scores.cinq === 50 ? CINQ_BONUS : 0);
}

const rnd6 = () => 1 + Math.floor(Math.random() * 6);

// Restituisce la maschera di dadi da tenere (31 = tienili tutti, cioè fermati).
function bestKeep(d, p, level, col) {
  const { sims, noise } = LEVELS[level];
  let bestMask = 31, bestVal = bestUtility(d, p, col) + (STYLE_STOP[p.style] || 0);
  const tmp = [0, 0, 0, 0, 0], tmpC = ['', '', '', '', ''];
  for (let mask = 0; mask < 31; mask++) {
    let tot = 0;
    for (let s = 0; s < sims; s++) {
      for (let i = 0; i < 5; i++) {
        const keep = (mask >> i) & 1;
        tmp[i] = keep ? d[i] : rnd6();
        if (col) tmpC[i] = keep ? col[i] : rndGem();
      }
      tot += bestUtility(tmp, p, col ? tmpC : undefined);
    }
    const val = tot / sims + (Math.random() - 0.5) * noise;
    if (val > bestVal) { bestVal = val; bestMask = mask; }
  }
  return bestMask;
}

function bestCategory(d, p, level, col) {
  const { noise } = LEVELS[level];
  const joker = jokerFor(p, d);
  let best = null, bestVal = -Infinity;
  for (const id of openCats(p)) {
    const v = utility(id, scoreFor(id, d, joker, col), p) + (Math.random() - 0.5) * noise * 2;
    if (v > bestVal) { bestVal = v; best = id; }
  }
  return best;
}

/* ───────────── Suoni (sintetizzati, nessun file) ───────────── */

const Sound = {
  ctx: null,
  on: localStorage.getItem('cd.sound') !== '0',
  ensure() {
    if (!this.on) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 0.08;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  knock(t, f = 1800, g = 0.35) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 2.5;
    const gain = ctx.createGain(); gain.gain.value = g;
    src.connect(bp).connect(gain).connect(ctx.destination);
    src.start(t);
  },
  tone(freq, t, dur = 0.25, type = 'sine', g = 0.18) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(g, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gain).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  rattle() {
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    for (let k = 0; k < 9; k++) this.knock(t + k * 0.055 + Math.random() * 0.03, 1200 + Math.random() * 1800, 0.25);
    this.knock(t + 0.58, 900, 0.5);
  },
  click() {
    const ctx = this.ensure(); if (!ctx) return;
    this.knock(ctx.currentTime, 2600, 0.2);
  },
  score(big) {
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const notes = big ? [523, 659, 784, 1047] : [659, 880];
    notes.forEach((f, i) => this.tone(f, t + i * 0.08, 0.35, 'triangle', 0.14));
  },
  zero() {
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(330, t, 0.25, 'sine', 0.12);
    this.tone(247, t + 0.12, 0.35, 'sine', 0.12);
  },
  trombone() {                                    // wa-wa-wa-waaa
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    [392, 370, 349, 330].forEach((f, k) => this.tone(f, t + k * 0.28, k === 3 ? 0.8 : 0.26, 'sawtooth', 0.06));
  },
  gulp(n = 1) {
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    for (let k = 0; k < 3 * n; k++) this.tone(180 + Math.random() * 60, t + k * 0.16, 0.12, 'sine', 0.16);
  },
  hit(power = 20) {
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    this.knock(t, 300, 0.7); this.knock(t + 0.02, 160, 0.6);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.35);
    g.gain.setValueAtTime(Math.min(0.25, 0.08 + power / 300), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.45);
  },
  fanfare() {
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * 0.11, 0.5, 'triangle', 0.16));
  },
};

/* ───────────── Opzioni ───────────── */

const OPTS = Object.assign({ fast: false, big: false, tease: true, music: true, lightfx: false },
  (() => { try { return JSON.parse(localStorage.getItem('cd.opts')) || {}; } catch { return {}; } })());
const saveOpts = () => localStorage.setItem('cd.opts', JSON.stringify(OPTS));
const T = ms => Math.round(ms * (OPTS.fast ? 0.45 : 1));   // tempi delle animazioni

/* ───────────── Musica (brani generati, in loop) ───────────── */

const Music = {
  src: { bgm: 'audio/sottofondo.mp3', notte: 'audio/notte.mp3', vittoria: 'audio/vittoria.mp3' },
  el: {}, cur: null, want: 'bgm', unlocked: false,
  vol: { bgm: 0.3, notte: 0.4, vittoria: 0.6 },
  get(k) {
    if (!this.el[k]) { const a = new Audio(this.src[k]); a.loop = k !== 'vittoria'; a.preload = 'auto'; a.volume = 0; this.el[k] = a; }
    return this.el[k];
  },
  fade(a, to, done) {
    clearInterval(a._f);
    const step = (to - a.volume) / 12;
    a._f = setInterval(() => {
      a.volume = Math.max(0, Math.min(1, a.volume + step));
      if (Math.abs(a.volume - to) <= Math.abs(step) + 0.001) { a.volume = to; clearInterval(a._f); done && done(); }
    }, 40);
  },
  play(k) {
    this.want = k;
    if (!OPTS.music || !this.unlocked || this.cur === k) return;
    const prev = this.cur && this.el[this.cur];
    if (prev) this.fade(prev, 0, () => prev.pause());
    this.cur = k;
    const a = this.get(k);
    a.play().then(() => this.fade(a, this.vol[k])).catch(() => { this.cur = null; });
  },
  stop() {
    const a = this.cur && this.el[this.cur];
    this.cur = null;
    if (a) this.fade(a, 0, () => a.pause());
  },
  jingle() {
    if (!OPTS.music || !this.unlocked) return;
    const bg = this.cur && this.el[this.cur];
    if (bg) this.fade(bg, 0.06);
    const a = this.get('vittoria');
    a.currentTime = 0; a.volume = this.vol.vittoria;
    a.onended = () => { if (bg && this.cur) this.fade(bg, this.vol[this.cur]); };
    a.play().catch(() => {});
  },
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.play(this.want);
  },
  refresh() { if (OPTS.music) { const k = this.want; this.cur = null; this.play(k); } else this.stop(); },
};

/* ───────────── Tziu Gonario (personaggio) ───────────── */

// Tziu Gonario: immagini in plastilina (posa + fotogrammi per ciglia e bocca)
const G_DIR = 'img/gonario/';
const POSE = { '': 'idle', happy: 'happy', wow: 'wow', sad: 'sad', think: 'think', smirk: 'smirk' };
const MENTOR_HTML = `<div class="g-wrap"><img class="g-pose" src="${G_DIR}idle.webp" alt="" draggable="false"><img class="g-blink" src="${G_DIR}blink.webp" alt="" draggable="false"><img class="g-talk" src="${G_DIR}talk.webp" alt="" draggable="false"></div>`;
['idle', 'happy', 'wow', 'sad', 'think', 'smirk', 'blink', 'talk'].forEach(k => { new Image().src = `${G_DIR}${k}.webp`; });

function setPose(el, m) {
  const img = el.querySelector('.g-pose');
  if (!img) return;
  const src = `${G_DIR}${POSE[m] || 'idle'}.webp`;
  if (img.getAttribute('src') === src) return;
  img.setAttribute('src', src);
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

// Tziu Gonario parla per metafore: la natura e i dadi.
const LINES = {
  start: [
    'Ajò! I dadi sono come semi: non sai cosa germoglierà finché non li lanci.',
    'Ogni partita è una stagione: tredici turni, come tredici lune.',
    'Lancia senza paura: anche la pioggia cade a caso, eppure l\'orto cresce.',
  ],
  yourTurn: ['{n}, il campo è tuo: semina i dadi.', 'Tocca a {n}. Che la brezza sia gentile.', '{n}, tre lanci: tre giorni di sole per far maturare il frutto.'],
  yourTurnTu: ['Tocca a te. Il vento è a favore!', 'A te i dadi: tre lanci, come tre giorni di sole per far maturare un frutto.', 'Il tuo turno. Semina bene!'],
  myTurn: ['Ora tocca a me. Ascolto il maestrale…', 'Tocca a me. Le mie pecore sanno che qui si fa sul serio.', 'Mescolo i dadi come la terra prima della semina.', 'Silenzio… anche il gufo aspetta il momento giusto.'],
  foeTurn: ['Tocca a {n}. Osserviamo, come l\'airone che aspetta il pesce.', '{n} lancia: vediamo che vento tira.', 'Ora {n}. Pazienza: la quercia non cresce in un giorno.'],
  cinq: ['Per mille querce! Cinque petali uguali sullo stesso fiore!', 'Cinque uguali! Come uno stormo che vola tutto insieme!', 'Yatzy! Più raro di un quadrifoglio… anzi, di un cinquefoglio!'],
  large: ['Scala lunga! Ordinata come i cerchi di un vecchio tronco.', 'Cinque in fila, come gli anatroccoli dietro alla mamma!'],
  small: ['Scala corta: quattro sassi per attraversare il ruscello.', 'Quattro in fila: il sentiero nel bosco è tracciato.'],
  full: ['Un full! Tre alberi e due cespugli: un bosco in armonia.', 'Full! Come un nido: tre uova e due piume.'],
  poker: ['Quattro uguali! Il raccolto è quasi pronto.', 'Poker! Quattro funghi della stessa specie: che fortuna nel bosco.'],
  hold: ['Tieni i dadi buoni, come si tengono i semi migliori per l\'anno dopo.', 'Il buon contadino non butta il grano maturo: scegli cosa tenere.', 'Tocca i dadi da tenere. Il resto, lascialo al vento.'],
  last: ['Niente più lanci: è tempo di raccogliere. Dove lo segni?', 'Il raccolto è questo. Scegli in quale cesto riporlo.'],
  zero: ['Uno zero… anche il campo a riposo prepara la prossima stagione.', 'Uno zero ben scelto è come potare un ramo: serve a crescere meglio.'],
  mono: ['Tutti dello stesso colore! Come un prato di papaveri a maggio.', 'Monocolore! Un bosco intero vestito d\'autunno.'],
  attack: ['{n} colpisce: −{d}! Come un fulmine sulla quercia.', 'Attacco da {d}! Il vento d\'autunno spoglia l\'albero.', '−{d}! Una grandinata improvvisa sul raccolto.', 'Colpo da {d}! Il torrente in piena si porta via il ponticello.'],
  heal: ['+{d} punti vita: la pioggia dopo la siccità.', 'Cura di {d}: la linfa torna a scorrere nei rami.', '+{d}: il prato ricresce dopo il passaggio del gregge.'],
  healFull: ['Già in piena salute: l\'acqua in un vaso pieno trabocca e basta.'],
  ko: ['{n} è a terra! Anche la quercia più grande cade, se il vento soffia forte.', '{n} è senza punti vita! La tempesta è passata.'],
  bonus: ['Bonus della parte alta: +35! Hai piantato bene, e ora raccogli i frutti.'],
  extra: ['Un altro Yatzy: +100! Due arcobaleni nello stesso giorno!'],
  teaseBad: ['Che lancio… nemmeno una lumaca bendata avrebbe fatto peggio.', 'Questi dadi sembrano foglie secche: sparsi e senza un perché.', 'Hai seminato sassi, caro mio. Non aspettarti il grano.', 'Un lancio così l\'ho visto fare solo a un riccio con i guanti.', 'Mmm. Anche il cuculo, quando sbaglia nido, fa più bella figura.'],
  teaseNear: ['Ahia! Eri a un passo, come la volpe sotto l\'uva.', 'Quasi! Il pesce ha toccato l\'amo… e se n\'è andato ridendo.', 'Per un dado! Come il fiore che sboccia il giorno dopo la festa.', 'Così vicino! Il picchio ci prova cento volte, tu riprovaci.'],
  teaseZero: ['Uno zero? Hai il pollice verde di un cactus di plastica.', 'Zero tondo, come un sasso di fiume. Almeno è liscio.', 'Hai appena innaffiato il deserto. Coraggio!', 'Zero. Perfino il bruco ride, e non ha nemmeno la bocca grande.'],
  teaseWaste: ['Sicuro? Stai buttando le ciliegie e tenendo i noccioli.', 'Raccogli le mele acerbe quando quelle mature sono lì a terra?', 'Ehm… c\'era un fungo porcino e hai preso il sasso accanto.'],
  gloat: ['Eja! Il vecchio olivastro piega ma non si spezza!', 'Imparerai, giovane germoglio. Imparerai.', 'Eh eh! La tartaruga arriva sempre, lo sai.', 'Questa radice è vecchia, ma tiene ancora!'],
  cheer: ['Eja! Così si coltiva un campo!', 'Mi\'! Che bellezza, bellu meu!', 'Che raccolto! Mi hai fatto ballare la barba!', 'Splendido! Le api fanno festa!'],
  wisdom: [
    'Il fiume non spinge l\'acqua: aspetta che scenda. Così si aspetta il dado giusto.',
    'La Chance è come l\'ombrello: meglio tenerla per i giorni di pioggia.',
    'Chi insegue lo Yatzy a ogni costo è come chi aspetta la neve ad agosto.',
    'I numeri alti sono come le mele in cima all\'albero: valgono di più, ma bisogna arrivarci.',
    'Sessantatré punti in alto, e il bonus fiorisce come un ciliegio a primavera.',
    'Un dado tenuto è un seme piantato; un dado rilanciato è un seme affidato al vento.',
    'Fai come la formica: tre dadi uguali per ogni numero in alto, e il bonus arriva da sé.',
    'La scala si costruisce come un nido: un rametto alla volta.',
    'Le api non si fermano su un solo fiore. Non fissarti su una sola casella.',
    'La luna cambia ogni notte, eppure torna sempre piena. Così fa la fortuna.',
    'Il bambù cresce in silenzio per anni, poi tocca il cielo in un attimo. Pazienza!',
    'Uno zero sullo Yatzy è come prosciugare il pozzo: pensaci bene prima.',
    'Un full è un piccolo frutteto: tre meli e due peri.',
    'Le stagioni non hanno fretta, e nemmeno i dadi.',
    'Il seme più piccolo, nel terreno giusto, diventa la quercia più grande. Anche un tris di uno, a volte, salva la partita.',
    'Quando il vento cambia, il saggio sposta la vela: se i dadi non vengono, cambia casella.',
    'Ehi, mi fai il solletico alla barba! Lancia, che è meglio.',
    'Il maestrale non chiede permesso: arriva e cambia tutto. Come uno Yatzy.',
    'Le pecore seguono il pastore, i dadi seguono la fortuna. Tu segui la testa.',
    'Il sughero cresce piano, ma regge il vino buono per cent\'anni. Pazienza!',
    'Il muretto a secco si fa pietra su pietra: così si riempie la parte alta.',
  ],
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const line = (key, vars = {}) => pick(LINES[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// Frasi in sardo (nuorese-logudorese), con la traduzione dopo il segno |
const SARDO = {
  bad: [
    'Mischinu!|Poverino!',
    'Ma ite ses faghende?|Ma che stai facendo?',
    'Deus meu!|Dio mio!',
    'Mancu sas berbeghes giogant gai male.|Nemmeno le pecore giocano così male.',
    'Custu tiru paret fatu dae un\'àinu.|Questo tiro sembra fatto da un asino.',
    'Cun custos dados non bincis mancu a sa murra.|Con questi dadi non vinci neanche a morra.',
    'Est mègius chi ti ponzas a pàschere sas berbeghes.|Meglio che ti metti a pascolare le pecore.',
    'Ses unu campione… de sa sorte mala!|Sei un campione… della sfortuna!',
    'Su dadu non ti cheret bene.|Il dado non ti vuole bene.',
    'A cantu paret, oe no est die tua.|A quanto pare oggi non è giornata tua.',
    'Mi\', mi\'… ite disastru!|Guarda, guarda… che disastro!',
    'Tziu Gonario at bidu de totu, ma custu mai!|Tziu Gonario ne ha viste tante, ma questa mai!',
    'Ma ses tontu?!|Ma sei scemo?!',
    'Lassa istare, lassa…|Lascia stare, lascia…',
    'Ses prus tostu de una pedra!|Sei più testardo di una pietra!',
    'Abberu? Ma non bi creo!|Davvero? Non ci credo!',
    'Custu dadu est malu che a su tiàulu!|Questo dado è cattivo come il diavolo!',
    'Oh Deus, ite pena!|Oh Dio, che pena!',
    'Ses unu bellu macu!|Sei proprio matto!',
    'Gai no andat bene, no!|Così non va bene, no!',
  ],
  cottu: ['Itte cazzu ses cottu??|Ma che c…, sei cotto??'],
  slow: [
    'Ajò, ca est tardu!|Dai, che è tardi!',
    'Ses prus lentu de una tostoine.|Sei più lento di una tartaruga.',
    'Ajò, chi su sole est artu!|Dai, che il sole è alto!',
    'Pàsia, pàsia…|Calma, calma…',
    'Ajò, chi s\'ora est passende!|Dai, che il tempo passa!',
    'Atzìccu atzìccu… ma non gai!|Piano piano… ma non così!',
  ],
  near: [
    'Eja, eja… comente no!|Sì, sì… come no!',
    'Ma bae!|Ma va\'!',
    'Bravu, bravu… e como?|Bravo, bravo… e adesso?',
    'Abbàida, abbàida…|Guarda, guarda…',
    'Fortuna chi ses bellu.|Per fortuna che sei bello.',
  ],
  good: [
    'Gai si faghet!|Così si fa!',
    'Ite cosa bella!|Che bella cosa!',
    'Bellu meu!|Bello mio!',
    'Eja! Custu est unu pastore!|Sì! Questo è un pastore!',
    'Ses unu leone!|Sei un leone!',
    'Ite fortuna, bellu meu!|Che fortuna, bello mio!',
    'Su pastore bonu non perdet mai una berbeghe.|Il buon pastore non perde mai una pecora.',
    'Bravu, ma sa fortuna est cega!|Bravo, ma la fortuna è cieca!',
  ],
  vino: [
    'A sa salude!|Alla salute!',
    'Salude e trigu!|Salute e grano!',
    'Su binu nieddu m\'at fatu bìdere sos dados dòpios!|Il vino nero mi ha fatto vedere i dadi doppi!',
    'Unu tzichiritu de binu e torro a giogare.|Un goccetto di vino e torno a giocare.',
    'Custu binu est menzus de sos dados tuos!|Questo vino è meglio dei tuoi dadi!',
    'Ti lo ghetto unu binu nieddu?|Te lo verso un vino nero?',
    'Ma ti lo buffes unu binellu?|Ma te lo bevi un vinello?',
  ],
  birra: ['Birredda ne cherese?|Una birretta, ne vuoi?'],
  ubriaco: [
    'Ih cazzu, forse ho esagerato allo tzilleri…',
    'Sa bagassa mea, apo buffadu meda oe!|Mannaggia, oggi ho bevuto parecchio!',
    'Ih lampu, soe cottu che pippa!|Accidenti, sono cotto come una pipa!',
    'Hic! Ma cantos dados bi sunt? Nde bido deghe!|Hic! Ma quanti dadi ci sono? Ne vedo dieci!',
    'Su mundu girat… o est sa mesa?|Il mondo gira… o è il tavolo?',
  ],
  cinq: ['A chent\'annos!|Cent\'anni!'],
  stupore: [
    'Comente cazzu est possìbile???|Come c… è possibile???',
    'Sa bagassa tua! Ite culu!|Accidenti a te! Che fortuna!',
  ],
  zeru: [
    'Ahi ahi ahi, ses prus cottu de tziu Paskale!|Ahi ahi ahi, sei più ubriaco di zio Pasquale!',
    'Bae a mùnghere sas crabas, bae!|Vai a mungere le capre, vai!',
  ],
  gloat: [
    'Su becciu at galu sas dentes!|Il vecchio ha ancora i denti!',
    'Imparadu as? Como torra a cumintzare.|Hai imparato? Ora ricomincia.',
  ],
};
// A volte in sardo, a volte in italiano
const sline = (key, sd, p = 0.4) => (SARDO[sd] && Math.random() < p ? pick(SARDO[sd]) : line(key));
const TEASE_SD = { teaseBad: 'bad', teaseNear: 'near', teaseZero: 'bad', teaseWaste: 'bad' };

// Ogni tanto Tziu Gonario ti prende in giro (con affetto)
const tease = (key, chance = 0.55) => { if (OPTS.tease && Math.random() < chance) { say(sline(key, TEASE_SD[key])); mood('smirk', 2600); return true; } return false; };

// Espressioni: '' (sorriso), 'happy', 'wow', 'sad', 'think'
let moodTimer = null;
function mood(m, ms = 2400) {
  document.querySelectorAll('[data-mentor]').forEach(el => { el.dataset.mood = m; setPose(el, m); });
  clearTimeout(moodTimer);
  if (ms) moodTimer = setTimeout(() => mood('', 0), ms);
}

// Tziu Gonario è sempre un po' brillo: ogni tanto gli scappa un singhiozzo
function hiccup() {
  const el = [...document.querySelectorAll('[data-mentor]')].find(x => x.offsetParent && !x.closest('#cameo') && (!x.classList.contains('player') || Number(x.dataset.drunk) >= 2));
  if (!el || reducedMotion) return;
  el.classList.remove('hic'); void el.offsetWidth; el.classList.add('hic');
  const r = el.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'hic-pop';
  d.textContent = 'hic!';
  d.style.left = `${Math.round(r.left + r.width * 0.65)}px`;
  d.style.top = `${Math.round(r.top + r.height * 0.15)}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1300);
}

// Si sporge un po' verso il dito o il mouse
let eyeFrame = 0;
function lookAt(x, y) {
  cancelAnimationFrame(eyeFrame);
  eyeFrame = requestAnimationFrame(() => {
    document.querySelectorAll('[data-mentor]').forEach(el => {
      if (!el.offsetParent) return;
      const r = el.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * 0.4);
      const k = Math.max(-1, Math.min(1, dx / 260));
      el.style.setProperty('--lean', `${(k * 2.5).toFixed(2)}deg`);
    });
  });
}

// Toccando Tziu Gonario risponde con un proverbio
// Tziu Gonario brillo ogni tanto si arrabbia e tira il bicchiere verso lo schermo
const RABBIA = 'Oh ite cazzu cherese?! Lassami buffare in paghe!|Oh, che c… vuoi?! Lasciami bere in pace!';
let lastTantrum = 0;
function tantrum() {
  if (reducedMotion || Date.now() - lastTantrum < 25000) return false;
  lastTantrum = Date.now();
  const hasClip = !!clips['g-rabbia'];
  cameo(RABBIA, 'cheer', true, 'g-rabbia');
  mood('sad', 3000);
  // il bicchiere arriva sullo schermo: schizzo di vino
  setTimeout(() => {
    const sp = document.createElement('div');
    sp.className = 'wine-splash';
    document.body.appendChild(sp);
    Sound.hit(30);
    haptic([60, 30, 120]);
    setTimeout(() => sp.remove(), 2600);
  }, hasClip ? 2300 : 600);
  return true;
}

// Ogni tanto, senza motivo, Tziu perde la pazienza (più raro delle altre scenette)
let tantrumsThisGame = 0;
function maybeTantrum() {
  if (!G || G.over || reducedMotion || !$('#cameo').hidden) return;
  const owed = tantrumsThisGame === 0 && G.round >= 5 + (G.rounds > 13 ? 2 : 0);   // almeno una volta a partita
  if (!owed && (Math.random() > 0.07 || Date.now() - lastTantrum < 120000)) return;
  setTimeout(() => { if ($('#cameo').hidden && tantrum()) { tantrumsThisGame++; mood('sad', 3000); } }, 1400);
}

let pokes = [];
function pokeMentor(el) {
  pokes = [...pokes.filter(t => Date.now() - t < 15000), Date.now()];
  if (pokes.length >= 4 || Math.random() < 0.12) { pokes = []; if (tantrum()) return; }
  el.classList.remove('jump'); void el.offsetWidth; el.classList.add('jump');
  mood('happy', 1800);
  haptic(15);
  Sound.tone && Sound.ensure() && Sound.tone(880 + Math.random() * 300, Sound.ctx.currentTime, 0.18, 'sine', 0.08);
  const r = el.getBoundingClientRect();
  FX.burst(r.right - r.width * 0.15, r.top + r.height * 0.45, 14, { speed: 3, up: 2 });
  const inMenu = !!el.closest('#menu');
  say(line('wisdom'), inMenu ? '#menuSay' : '#say');
  idleReset();
}

// Se resti fermo un po', Tziu Gonario ti racconta qualcosa
let idleTimer = null;
let idleTicks = 0;
function idleReset(keepCount = false) {
  clearTimeout(idleTimer);
  if (!keepCount) idleTicks = 0;
  idleTimer = setTimeout(() => {
    idleTicks++;
    const inGame = $('#game').classList.contains('active');
    const inMenu = $('#menu').classList.contains('active');
    if (inGame && G && !busy && !curP().cpu) {
      if (idleTicks >= 3) {
        // fermo da tanto: si addormenta (toccalo per svegliarlo)
        cameo('Zzz… Tziu Gonario si è appisolato. Toccalo per svegliarlo!', 'cheer', true, 'g-sonno');
      } else if (idleTicks === 2 && Math.random() < 0.6) {
        say(SARDO.birra[0]);
        cameo('Aaaaah, bella frisca!|Aaah, bella fresca!', 'cheer', true, 'g-birra');
      } else if (OPTS.tease && Math.random() < 0.45) { say(pick(SARDO.slow)); mood('smirk', 2000); }
      else if (Math.random() < 0.5) { say(pick(Math.random() < 0.5 ? SARDO.ubriaco : SARDO.vino)); mood('happy', 1500); hiccup(); }
      else { say(line('wisdom')); mood('think', 1500); }
    }
    else if (inMenu) say(line('wisdom'), '#menuSay');
    idleReset(true);
  }, 16000);
}

/* ───────────── Il tuo personaggio ───────────── */

const PLAYER_CHARS = [
  { id: 'pastoreddu', name: 'Su Pastoreddu',  desc: 'Giovane pastore con il suo cane fedele.' },
  { id: 'tenore',     name: 'Su Tenore',      desc: 'Canta a tenore, con la mano all\'orecchio.' },
  { id: 'launeddas',  name: 'Su Sonadore',    desc: 'Suona le launeddas a guance gonfie.' },
  { id: 'boe',        name: 'Su Boe',         desc: 'La maschera con le corna e i campanacci.' },
  { id: 'jana',       name: 'Sa Jana',        desc: 'La piccola fata delle domus de janas.' },
  { id: 'piscadore',  name: 'Su Piscadore',   desc: 'Pescatore della laguna di Cabras.' },
  { id: 'sirbone',    name: 'Su Sirbone',     desc: 'Il cinghiale sardo, testardo e furbo.' },
  { id: 'mufrone',    name: 'Su Mufrone',     desc: 'Il muflone dalle grandi corna.' },
  { id: 'cuaddeddu',  name: 'Su Cuaddeddu',   desc: 'Il cavallino selvatico della Giara.' },
  { id: 'filonzana',  name: 'Sa Filonzana',   desc: 'La maschera di Ottana che fila la lana… e il tuo destino.' },
  { id: 'crabitta',   name: 'Sa Crabitta',    desc: 'La capretta curiosa che salta sui muretti.' },
  { id: 'ballerina',  name: 'Sa Ballerina',   desc: 'Balla su ballu tundu col costume della festa.' },
];
const charSrc = id => (PLAYER_CHARS.some(c => c.id === id) ? `img/giocatori/${id}.webp` : null);
const myChar = () => localStorage.getItem('cd.char');
const profileName = () => localStorage.getItem('cd.name') || '';

/* ───────────── Stato ───────────── */

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SAVE_KEY = 'cd.save', BEST_KEY = 'cd.best';

let G = null;          // partita in corso
let lastSetup = null;  // per la rivincita
let busy = false;      // animazione o turno del computer

const curP = () => G.players[G.cur];
// Online: ognuno controlla solo il proprio giocatore
const isMe = p => !p.cpu && (!G.online || G.players.indexOf(p) === G.online.me);
const myTurn = () => isMe(curP());
const alive = () => G.players.filter(q => !q.out);
// Battaglia: si attacca l'avversario ancora in gioco con più punti vita
const battleTarget = p => G.players.filter(q => q !== p && !q.out).sort((a, b) => (G.drink ? a.drunk - b.drunk : b.hp - a.hp))[0] || p;
// Passa al prossimo giocatore ancora in gioco (salta chi è fuori o si è scollegato)
function nextTurn() {
  const n = G.players.length;
  for (let k = 0; k < n; k++) {
    G.cur = (G.cur + 1) % n;
    if (G.cur === 0) G.round++;
    const q = G.players[G.cur];
    if (q.out) continue;
    if (q.skip) { q.skip = false; continue; }          // il casu marzu fa saltare un turno
    return;
  }
}
const rolled = () => G.hasRolled;
const stageOf = () => (G?.adv ? STAGES[G.adv.stage] : null);
const ROLL_WORDS = ['nessun lancio', 'un lancio', 'due lanci', 'tre lanci', 'quattro lanci', 'cinque lanci'];

// setup: { mode: 'cpu'|'duo'|'solo'|'adv', level, name1, name2, stage, charm }
function newGame(setup) {
  tantrumsThisGame = 0;
  $('#betOverlay').hidden = true;
  if (setup.mode === 'adv') {
    const st = STAGES[setup.stage];
    setup = { ...setup, rainbow: st.rules === 'rainbow', battle: st.rules === 'battle', drink: st.rules === 'drink' };
  }
  if (setup.drink) setup = { ...setup, rainbow: true };          // in Bevuta ci sono anche Monocolore e Full colori
  lastSetup = setup;
  const mk = (name, cpu = false) => ({ name, cpu, scores: {}, extra: 0, rainbow: !!setup.rainbow, battle: !!setup.battle, drink: !!setup.drink, hp: MAX_HP, drunk: 0, drinks: [] });
  const players = [mk(setup.name1 || (setup.mode === 'duo' ? 'Giocatore 1' : profileName() || 'Tu'))];
  let level = setup.level, maxRolls = 3, adv = null;
  if (setup.mode === 'cpu') players.push(mk('Tziu Gonario', true));
  if (setup.mode === 'duo') (setup.names || ['', setup.name2]).slice(1, 4).forEach((n, i) => players.push(mk(n || `Giocatore ${i + 2}`)));
  if (setup.mode === 'online') players.splice(0, players.length, ...setup.names.slice(0, 4).map(n => mk(n)));
  // ritratti: il tuo personaggio (e online quello dell'amico)
  const charIds = setup.mode === 'online' || setup.mode === 'duo' ? (setup.chars || []) : [myChar()];
  charIds.forEach((c, i) => { if (players[i] && charSrc(c)) { players[i].ava = charSrc(c); players[i].charId = c; } });
  loadGonarioClips();
  // clip di festa dei personaggi in gioco (e del Mammuthones nella sfida finale)
  players.forEach(q => { if (q.charId) loadClip(`char:${q.charId}`, `img/clip/${q.charId}.webp`); });
  if (setup.mode === 'adv' && STAGES[setup.stage].id === 'mammuthones') loadClip('mammuthones', 'img/clip/mammuthones.webp');
  if (setup.mode === 'adv') {
    const st = STAGES[setup.stage];
    if (st.foe) {
      const foe = mk(st.foe.name, true);
      foe.icon = st.foe.icon;
      foe.img = st.foe.img;
      foe.ava = st.foe.img ? rivalSrc(st.foe.img) : null;
      foe.style = st.foe.style;
      foe.lines = st.foe.lines;
      foe.extra = st.foe.head || 0;
      if (st.foe.drunk && setup.drink) { foe.drunk = st.foe.drunk; foe.drinks = Array(st.foe.drunk).fill('vino'); }
      if (st.foe.hp) foe.hp = foe.maxHp = st.foe.hp;
      players.push(foe);
      level = st.foe.level;
    }
    maxRolls = st.rolls || 3;
    adv = { stage: setup.stage, charm: setup.charm || null, charmUsed: false, armed: null, double: false };
  }
  G = { players, cur: 0, round: 1, rounds: catsOf(players[0]).length, rainbow: !!setup.rainbow, battle: !!setup.battle, drink: !!setup.drink, colors: ['', '', '', '', ''], level, maxRolls, adv, dice: [0, 0, 0, 0, 0], held: [false, false, false, false, false], rollsLeft: maxRolls, rollsTotal: maxRolls, hasRolled: false, sel: null,
    online: setup.mode === 'online' ? { me: setup.me } : null };
  show('game');
  buildSheet();
  if (!window._barcollato && !reducedMotion) {
    window._barcollato = true;
    setTimeout(() => cameo('Ih cazzu, forse ho esagerato allo tzilleri…', 'cheer', true, 'g-barcolla'), 1400);
  }
  const st = stageOf();
  say(st ? (st.intro || `${st.place}: ${st.goalText.toLowerCase()}. Coraggio!`) : line('start'));
  startTurn(true);
}

function save() {
  if (!G || G.online) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ G, lastSetup }));
}
function clearSave() { localStorage.removeItem(SAVE_KEY); }

function resume() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    G = data.G; lastSetup = data.lastSetup;
    G.maxRolls ??= 3;
    G.rounds ??= 13;
    G.colors ??= ['', '', '', '', ''];
  } catch { clearSave(); return; }
  show('game');
  buildSheet();
  startTurn();
}

/* ───────────── Flusso del turno ───────────── */

function startTurn(first = false) {
  G.dice = [0, 0, 0, 0, 0];
  G.colors = ['', '', '', '', ''];
  G.held = [false, false, false, false, false];
  G.rollsLeft = G.rollsTotal = G.maxRolls;
  G.hasRolled = false;
  G.sel = null;
  if (G.adv) G.adv.armed = null;
  render();
  const p = curP();
  if (p.cpu) {
    say(p.name === 'Tziu Gonario' ? line('myTurn') : line('foeTurn', { n: p.name }));
    mood('think', 2500);
    cpuTurn();
  } else if (!first && Math.random() < 0.15) {
    say(pick(SARDO.ubriaco)); hiccup();
  } else if (G.online) {
    say(myTurn() ? line('yourTurnTu') : line('foeTurn', { n: p.name }));
    if (!myTurn()) mood('think', 2000);
  } else if (!first && G.players.length > 1) {
    say(p.name === 'Tu' ? line('yourTurnTu') : line('yourTurn', { n: p.name }));
  }
}

const CUP_SVG = `<svg viewBox="0 0 80 96" aria-hidden="true">
  <defs><linearGradient id="cupg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a2a17"/><stop offset=".45" stop-color="#9a5226"/><stop offset=".7" stop-color="#b8693a"/><stop offset="1" stop-color="#4a1f10"/></linearGradient></defs>
  <ellipse cx="40" cy="90" rx="26" ry="5" fill="rgba(0,0,0,.35)"/>
  <path d="M10 10 L18 86 Q40 92 62 86 L70 10 Z" fill="url(#cupg)"/>
  <path d="M14 30 Q40 36 66 30 M16 62 Q40 68 64 62" stroke="#d08a45" stroke-width="4" fill="none"/>
  <path d="M15 30 Q40 36 65 30" stroke="#f0a640" stroke-width="1.2" fill="none" opacity=".7"/>
  <ellipse cx="40" cy="10" rx="30" ry="7" fill="#3a160c"/>
  <ellipse cx="40" cy="10" rx="30" ry="7" fill="none" stroke="#d08a45" stroke-width="3"/>
  <path d="M22 16 L27 80" stroke="#fff" stroke-opacity=".12" stroke-width="5" stroke-linecap="round"/>
</svg>`;

// Clip animata (WebP con trasparenza): si scarica una volta e riparte da capo a ogni Yatzy
// Clip animate (WebP con trasparenza): si scaricano una volta e ripartono da capo ogni volta
const CLIP_MS = 5200;
const clips = {};
function loadClip(key, url) {
  if (key in clips) return;
  clips[key] = null;
  fetch(url).then(r => (r.ok ? r.blob() : null)).then(b => { clips[key] = b; }).catch(() => {});
}
const loadGonarioClips = () => {
  loadClip('gonario', `${G_DIR}ballo.webp`);
  ['vino', 'birra', 'sonno', 'ride', 'pecora', 'barcolla', 'singhiozzo', 'rabbia'].forEach(k => loadClip(`g-${k}`, `${G_DIR}${k}.webp`));
};

// Tziu Gonario entra in scena per festeggiare (non blocca il gioco)
let lastCameo = 0;
function cameo(text, kind = 'cheer', force = false, clipKey = null) {
  if (reducedMotion) return;
  if (!force && Date.now() - lastCameo < 20000) return;
  lastCameo = Date.now();
  const box = $('#cameo');
  setLine(box.querySelector('.cameo-say'), text);
  const blob = (clipKey && clips[clipKey]) || (kind === 'wow' && clips.gonario) || null;
  const clip = !!blob;
  box.className = `cameo ${kind}${clip ? ' clip' : ''}`;
  const clipImg = box.querySelector('.cameo-clip');
  if (clip) {
    if (clipImg.dataset.url) URL.revokeObjectURL(clipImg.dataset.url);
    clipImg.dataset.url = URL.createObjectURL(blob);
    clipImg.src = clipImg.dataset.url;
  }
  box.hidden = false;
  void box.offsetWidth;
  box.classList.add('in');
  mood(kind === 'wow' ? 'wow' : 'happy', 2600);
  setTimeout(() => {
    const r = box.querySelector('.portrait').getBoundingClientRect();
    FX.burst(r.left + r.width * 0.8, r.top + r.height * 0.45, 40, { speed: 7, up: 5 });
  }, 450);
  clearTimeout(box._t);
  box._t = setTimeout(() => { box.classList.remove('in'); box.classList.add('out'); setTimeout(() => { box.hidden = true; }, 500); }, clip ? CLIP_MS : 2800);
}

async function rollDice(which, preset) {
  busy = true;
  G.sel = null;
  Sound.rattle();
  haptic(25);
  const dieEls = [...document.querySelectorAll('#tray .die')];
  const cup = $('#cup');
  const cr = cup.getBoundingClientRect();
  cup.classList.remove('pour'); void cup.offsetWidth; cup.classList.add('pour');
  await sleep(reducedMotion ? 0 : T(260));
  which.forEach(i => {
    const el = dieEls[i];
    const dr = el.getBoundingClientRect();
    el.style.setProperty('--fx', `${Math.round(cr.left + cr.width * 0.3 - (dr.left + dr.width / 2))}px`);
    el.style.setProperty('--fy', `${Math.round(cr.top + cr.height * 0.2 - (dr.top + dr.height / 2))}px`);
    G.dice[i] = preset ? preset.dice[i] : rnd6();
    if (G.rainbow) { G.colors[i] = preset ? preset.colors[i] : rndGem(); el.dataset.c = G.colors[i]; }
    el.classList.remove('rolling', 'blank');
    void el.offsetWidth;
    el.style.setProperty('--d', `${Math.floor(Math.random() * 140)}ms`);
    el.classList.add('rolling');
    setDie(el, G.dice[i], true);
  });
  await sleep(reducedMotion ? 120 : T(950));
  dieEls.forEach(el => el.classList.remove('rolling'));
  cup.classList.remove('pour');
  haptic(12);
  busy = false;
}

// Bevuta: prima dell'ultimo lancio Tziu Gonario propone una scommessa
const BET_NEED = { 3: 'un Tris (3 dadi uguali)', 4: 'un Poker (4 dadi uguali)', 5: 'uno Yatzy (5 dadi uguali)' };
function maybeOfferBet() {
  const p = curP();
  if (!G.drink || G.online || !isMe(p) || p.cpu || G.rollsLeft !== 1 || G.bet || (G.betsMade || 0) >= 2) return;
  const have = Math.max(...counts(G.dice));
  if (have >= 5 || Math.random() > 0.35) return;
  const need = Math.max(3, have + 1);
  G.bet = { need, state: 'offer' };
  G.betsMade = (G.betsMade || 0) + 1;
  $('#betNeed').textContent = BET_NEED[need];
  $('#betOverlay').hidden = false;
  mood('smirk', 4000);
  Sound.tone && Sound.ensure() && Sound.tone(520, Sound.ctx.currentTime, 0.2, 'triangle', 0.08);
}
function answerBet(yes) {
  $('#betOverlay').hidden = true;
  if (!G.bet) return;
  if (!yes) { G.bet = null; say('Eh eh, hai paura del vecchio? Va bene, va bene…'); mood('smirk', 2200); return; }
  G.bet.state = 'on';
  say(`Affare fatto! Al prossimo lancio voglio vedere ${BET_NEED[G.bet.need]}.`);
  mood('happy', 2200);
  render();
}
function resolveBet() {
  if (!G.bet || G.bet.state !== 'on') { G.bet = null; return; }
  const p = curP(), j = G.cur, won = Math.max(...counts(G.dice)) >= G.bet.need;
  G.bet = null;
  if (won) {
    const back = Math.min(2, p.drunk);
    p.drunk -= back; p.drinks.length = p.drunk;
    say(back ? `Scommessa vinta! Ti riprendi ${back === 2 ? 'due bicchieri' : 'un bicchiere'}. Tziu Gonario mastica amaro…` : 'Scommessa vinta! Eri già sobrio, ma la soddisfazione resta.');
    mood('sad', 3000);
    FX.burstAt($('#tray'), 50); Sound.score(true);
    cameo(pick(SARDO.stupore), 'wow', true, 'g-barcolla');
  } else {
    if (p.drunk < GLASSES - 1) { p.drunk++; p.drinks.push('vino'); drinkFx(j, 1, 'vino'); }
    say('Scommessa persa! Un vinello a tzoccu, forza… glu glu glu!');
    mood('happy', 3000);
    cameo('A sa salude!|Alla salute!', 'cheer', true, 'g-vino');
  }
  render();
}

async function doRoll(preset) {
  await rollDice([0, 1, 2, 3, 4].filter(i => !G.held[i]), preset);
  G.rollsLeft--;
  G.hasRolled = true;
  render();
  react();
  if (G.rollsLeft === 0 && G.bet) setTimeout(resolveBet, reducedMotion ? 0 : 900);
  else if (!curP().cpu) setTimeout(() => { if (!busy) maybeOfferBet(); }, reducedMotion ? 0 : 700);
  if (!curP().cpu) tutEvent('roll');
}

// Yatzy: festa grande, poi arriva Tziu Gonario a bocca aperta
function yatzyParty() {
  const p = curP();
  Sound.fanfare(); haptic([40, 60, 40, 60, 80, 60, 120]);
  if (reducedMotion) { say(line('cinq')); return; }
  const b = document.createElement('div');
  b.className = 'yatzy-banner';
  b.innerHTML = `<i class="rays"></i><b>${'YATZY!'.split('').map((ch, k) => `<span style="--k:${k}">${ch}</span>`).join('')}</b><small>${p.name}</small>`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 3200);
  document.querySelectorAll('#tray .die').forEach((el, i) => {
    el.style.setProperty('--d', `${i * 90}ms`);
    el.classList.remove('party'); void el.offsetWidth; el.classList.add('party');
    setTimeout(() => el.classList.remove('party'), 2200);
  });
  document.body.classList.add('yatzy-flash');
  setTimeout(() => document.body.classList.remove('yatzy-flash'), 900);
  FX.confetti();
  const gold = ['#ffd28a', '#f0a640', '#fff1c9', '#ffb347', '#ffffff'];
  for (let k = 0; k < 9; k++) setTimeout(() => {
    FX.burst(innerWidth * (0.12 + 0.76 * Math.random()), innerHeight * (0.12 + 0.35 * Math.random()), 60, { speed: 9, up: 2, colors: gold });
    Sound.tone && Sound.ensure() && Sound.tone(600 + Math.random() * 700, Sound.ctx.currentTime, 0.12, 'triangle', 0.05);
  }, 300 + k * 260);
  const tziuPlays = p.cpu && p.name === 'Tziu Gonario';
  const charClip = !tziuPlays && p.charId && clips[`char:${p.charId}`] ? `char:${p.charId}` : null;
  if (tziuPlays) cameo(pick([...SARDO.cinq, ...SARDO.gloat]), 'wow', true, 'gonario');
  else {
    if (charClip) cameo(line('cinq'), 'wow', true, charClip);
    setTimeout(() => {
      cameo(pick(SARDO.stupore), 'wow', true, pick(['g-barcolla', 'gonario', 'g-singhiozzo', 'g-barcolla']));
      mood('wow', 3500);
    }, charClip ? CLIP_MS + 500 : 1500);
  }
  say(line('cinq'));
  mood('wow', 3000);
}

// Zero: timbro sulla casella, trombone triste e Tziu che se la ride
function zeroShame(id) {
  const t = document.querySelector(`#board .tile[data-id="${id}"]`);
  if (t && !reducedMotion) {
    const st = document.createElement('i');
    st.className = 'zero-stamp'; st.textContent = '0';
    t.appendChild(st);
    setTimeout(() => st.remove(), 2400);
    t.classList.remove('shamed'); void t.offsetWidth; t.classList.add('shamed');
    const r = t.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, 18, { speed: 3, up: 1, colors: ['#8a7a6a', '#5a4c42', '#b8a898'] });
  }
  Sound.trombone ? Sound.trombone() : Sound.zero();
  document.body.classList.remove('shake-sm'); void document.body.offsetWidth; document.body.classList.add('shake-sm');
  haptic([80, 40, 80]);
}

function react() {
  const d = G.dice, c = counts(d), human = isMe(curP());
  if (isCinq(d)) yatzyParty();
  else if (hasRun(d, 5)) { mood('happy'); say(line('large')); if (human) cameo(line('large'), 'dance'); FX.burstAt($('#tray'), 50); haptic([30, 40, 30]); }
  else if (c.includes(3) && c.includes(2)) { mood('happy'); say(line('full')); FX.burstAt($('#tray'), 35); }
  else if (Math.max(...c) === 4) { if (!(human && G.rollsLeft === 0 && tease('teaseNear', 0.6))) { mood('happy'); say(line('poker')); } }
  else if (G.rainbow && colorCounts(G.colors)[0] === 5) { mood('wow'); say(line('mono')); FX.burstAt($('#tray'), 45); }
  else if (hasRun(d, 4)) { if (!(human && G.rollsLeft === 0 && tease('teaseNear', 0.4))) say(line('small')); }
  else if (human && Math.max(...c) <= 2 && tease('teaseBad', G.rollsLeft === 0 ? 0.7 : 0.3)) {}
  else if (human) say(G.rollsLeft === 0 ? line('last') : line('hold'));
}

async function humanRoll() {
  if (busy || !myTurn() || G.rollsLeft === 0) return;
  if (G.adv) G.adv.armed = null;
  let note = null;
  const lvl = drunkLevel();
  // Bevuta, mano malferma: un dado tenuto può scivolare
  if (lvl >= 4 && G.hasRolled && Math.random() < 0.4) {
    const heldIdx = G.held.map((h, i) => (h ? i : -1)).filter(i => i >= 0);
    if (heldIdx.length) { G.held[pick(heldIdx)] = false; note = 'Ops! Mano malferma: un dado tenuto ti è scivolato.'; }
  }
  const preset = { dice: G.dice.map((v, i) => (G.held[i] ? v : rnd6())), colors: G.colors.map((c, i) => (G.held[i] || !G.rainbow ? c : rndGem())) };
  // Bevuta, bossolo ubriaco: se non lanci quando è al centro, un dado cade dal tavolo e conta 1
  if (CupWobble.on && !cupCentered()) {
    const free = G.held.map((h, i) => (h ? -1 : i)).filter(i => i >= 0);
    if (free.length) { preset.dice[pick(free)] = 1; note = 'Hai lanciato storto! Un dado è caduto dal tavolo: conta 1.'; }
  }
  wobbleCup(false);
  if (G.online) netSend({ t: 'roll', held: G.held, ...preset });   // valori decisi qui, uguali per tutti
  await doRoll(preset);
  if (note) { say(note); mood('smirk', 2000); }
}

async function dieClick(i) {
  if (busy || !myTurn() || !rolled()) return;
  const armed = G.adv?.armed;
  if (armed === 'lente') {
    G.adv.armed = null;
    G.adv.charmUsed = true;
    await rollDice([i]);
    render();
    react();
    return;
  }
  if (armed === 'sigillo') {
    openFacePicker(i);
    return;
  }
  if (G.rollsLeft === 0) return;
  G.held[i] = !G.held[i];
  Sound.click();
  if (G.online) netSend({ t: 'hold', held: G.held });
  render();
  tutEvent('hold');
}

function openFacePicker(i) {
  const box = $('#facePick');
  box.innerHTML = `<p>Che faccia vuoi per questo dado?</p><div class="faces">${[1, 2, 3, 4, 5, 6].map(v =>
    `<button class="die flat mini" data-v="${v}"><span class="face">${pipsHTML(v)}</span></button>`).join('')}</div>
    <button class="link" data-cancel>Annulla</button>`;
  box.querySelectorAll('.die.mini').forEach(b => {
    const v = Number(b.dataset.v);
    b.addEventListener('click', () => {
      G.dice[i] = v;
      G.adv.armed = null;
      G.adv.charmUsed = true;
      box.hidden = true;
      Sound.score(false);
      say(`Il Sigillo ha parlato: un ${v}!`);
      render();
    });
  });
  box.querySelector('[data-cancel]').addEventListener('click', () => { box.hidden = true; });
  box.hidden = false;
}

function useCharm() {
  const a = G?.adv;
  if (!a || !a.charm || a.charmUsed || busy || curP().cpu || !rolled()) return;
  if (a.armed) { a.armed = null; say('Va bene, lo teniamo per dopo.'); render(); return; }
  const c = a.charm;
  if (c === 'ritorno') {
    a.charmUsed = true;
    G.rollsLeft++; G.rollsTotal++;
    say('Ampolla del Ritorno: hai un lancio in più!');
  } else if (c === 'elisir') {
    a.charmUsed = true;
    a.double = true;
    say("Elisir Doppio: la prossima casella che segni vale doppio!");
  } else if (c === 'lente') {
    a.armed = 'lente';
    say('Lente del Saggio: tocca il dado da rilanciare.');
  } else if (c === 'sigillo') {
    a.armed = 'sigillo';
    say('Sigillo di Rame: tocca il dado da cambiare.');
  }
  Sound.score(false);
  render();
}

function choose(id) {
  if (busy || !myTurn() || !rolled() || curP().scores[id] !== undefined) return;
  if (G.sel === id) {
    if (G.online) netSend({ t: 'commit', id });
    commit(id);
    tutEvent('commit');
    if (G.online) netSend({ t: 'snap', s: snapshot() });
    return;
  }
  G.sel = id;
  Sound.click();
  if (G.online) netSend({ t: 'sel', id });
  render();
  tutEvent('sel');
}

function commit(id) {
  if (G.bet) { if (G.bet.state === 'on') resolveBet(); else { G.bet = null; $('#betOverlay').hidden = true; } }
  const p = curP();
  const joker = jokerFor(p, G.dice);
  const sc = scoreFor(id, G.dice, joker, G.colors);
  const hadBonus = bonusOf(p) > 0;
  const bestAvail = Math.max(...openCats(p).map(k => scoreFor(k, G.dice, joker, G.colors)));
  let msg = null;
  if (isCinq(G.dice) && p.scores.cinq === 50) { p.extra += CINQ_BONUS; msg = line('extra'); }
  p.scores[id] = sc;
  let doubled = false;
  if (G.adv?.double && !p.cpu) {
    G.adv.double = false;
    doubled = true;
    if (!G.battle) {
      p.extra += sc;
      msg = sc ? `L'Elisir raddoppia: +${sc} punti extra!` : "Peccato, l'Elisir su uno zero resta zero.";
    }
  }
  if (!hadBonus && bonusOf(p) > 0) msg = line('bonus');
  if (sc === 0 && !msg && isMe(p)) {
    zeroShame(id);
    if (OPTS.tease) {
      const r = Math.random();
      msg = r < 0.5 ? SARDO.cottu[0] : r < 0.8 ? pick(SARDO.zeru) : sline('teaseZero', 'bad', 0.4);
      mood('smirk', 2600);
      cameo(msg, 'cheer', true, pick(['g-ride', 'g-ride', 'g-pecora', 'g-singhiozzo']));   // Tziu Gonario se la ride
    } else { msg = line('zero'); mood('sad'); }
  }
  else if (!msg && OPTS.tease && isMe(p) && sc > 0 && sc + 15 <= bestAvail && Math.random() < 0.6) {
    msg = Math.random() < 0.3 ? SARDO.cottu[0] : sline('teaseWaste', 'bad', 0.35);
    mood('smirk', 2600);
    if (Math.random() < 0.5) cameo(msg, 'cheer', false, 'g-ride');
  }
  else if (!msg && p.cpu && p.name === 'Tziu Gonario' && sc === 0 && Math.random() < 0.5 && tantrum()) { msg = RABBIA; }
  else if (!msg && p.cpu && p.name === 'Tziu Gonario' && sc >= 25 && Math.random() < 0.6) {
    msg = sline('gloat', 'gloat', 0.5); mood('happy');
    cameo(pick(SARDO.vino), 'cheer', false, 'g-vino');      // si concede un bicchiere di vino nieddu
  }
  else if (!isMe(p) && !p.cpu && sc >= 30 && Math.random() < 0.4) cameo(pick(SARDO.vino), 'cheer', false, 'g-vino');
  else if (!msg && p.cpu && p.lines && sc >= 25 && Math.random() < 0.6) { msg = `${p.name}: «${pick(p.lines)}»`; mood('sad'); }
  if (p.style === 'dormiglione' && !p.out && !p.skip && Math.random() < 0.2) {
    p.skip = true;
    msg = `${p.name} si appisola sul fiasco… Zzz… salta il prossimo turno!`;
    mood('happy', 2500);
  }
  if (G.drink && p.style === 'moglie' && !p.out && Math.random() < 0.2 && G.players.some(q => q.drunk > 0)) {
    G.players.forEach(q => { if (q.drunk > 0) { q.drunk--; q.drinks?.pop(); } });
    msg = `${p.name} porta via il fiasco: un bicchiere in meno per tutti!`;
    mood('sad', 2500);
  }
  if (isMe(p) && sc >= 25) cheerChip(G.cur);
  maybeTantrum();
  if (isMe(p) && !hadBonus && bonusOf(p) > 0) cameo('Bonus! Anche la pecorella è contenta: su pastore bonu non perdet mai una berbeghe.', 'cheer', true, 'g-pecora');
  else if (isMe(p) && sc >= 30) cameo(sline('cheer', 'good', 0.5), sc >= 40 ? 'dance' : 'cheer');
  if (bonusOf(p) > 0 && !hadBonus) mood('happy');
  let ko = false;
  if (G.drink) {
    G.players.forEach(q => { q.drinks ||= []; });
    const target = battleTarget(p);
    const g = CAT[id].face ? 0 : glassesFor(id, sc) * (doubled ? 2 : 1);
    p.tempFx = 0;
    // spuntini: 3 uguali pane carasau, 4 culurgiones, 5 casu marzu; il bonus vale la salsiccia
    const snacks = [];
    if (CAT[id].face) {
      const n = counts(G.dice)[CAT[id].face];
      if (n >= 5) snacks.push('casu'); else if (n >= 4) snacks.push('culurgiones'); else if (n >= 3) snacks.push('pane');
    }
    if (!hadBonus && bonusOf(p) > 0) snacks.push('salsiccia');
    if (snacks.length) {
      const was = p.drunk;
      const sober = snacks.reduce((a, k) => a + SNACKS[k].sober, 0);
      p.drunk = Math.max(0, p.drunk - sober);
      p.drinks.length = p.drunk;
      const names = snacks.map(k => SNACKS[k].name).join(' e ');
      msg = was > p.drunk ? `${p.name} mangia ${names}: ${was - p.drunk === 1 ? 'un bicchiere smaltito' : `${was - p.drunk} bicchieri smaltiti`}!` : `${p.name} si mangia ${names}. Bene, così regge meglio!`;
      // il casu marzu è vivace: a volte (deciso dai dadi, uguale per tutti) ti senti male
      if (snacks.includes('casu') && (sum(G.dice) * 7 + G.round) % 3 === 0) {
        p.skip = true;
        msg = `Il casu marzu era troppo vivace: ${p.name} si sente male e salta il prossimo turno!`;
      }
    }
    if (g && target !== p) {
      const take = Math.min(g, GLASSES - target.drunk);
      const dk = DRINK_OF[id] || 'vino', drink = DRINKS[dk];
      target.drunk += take;
      for (let k = 0; k < take; k++) target.drinks.push(dk);
      if (shakesFor(id)) target.tempFx = 1;
      if (dk === 'filu') target.tempFx = Math.max(target.tempFx || 0, 3 - dlv(target));   // filu 'e ferru: vista doppia subito
      drinkFx(G.players.indexOf(target), take, dk);
      msg = take >= 2 ? `${target.name} beve ${drink.emoji} ${drink.name}: due bicchieri a tzoccu! Glu glu glu…` : `${target.name} beve ${drink.emoji} ${drink.name} a tzoccu! ${pick(SARDO.ubriaco).split('|')[0]}`;
      if (target.drunk >= GLASSES) {
        target.out = true;
        msg = `${target.name} è cottu! ${SARDO.cottu[0].split('|')[0]}`;
        mood('wow', 3000);
        cameo(SARDO.cottu[0], 'cheer', true, 'g-ride');
        ko = alive().length <= 1;
      } else if (dlv(target) >= 3) cameo(pick(SARDO.ubriaco), 'cheer', false, 'g-barcolla');
    }
  }
  if (G.battle) {
    const opp = battleTarget(p);
    let heal = 0, hit = 0;
    if (CAT[id].face) heal += sc;
    else hit += sc;
    if (!hadBonus && bonusOf(p) > 0) heal += BATTLE_BONUS_HEAL;
    if (isCinq(G.dice) && p.extra > 0 && p.scores.cinq === 50 && id !== 'cinq') hit += BATTLE_EXTRA_HIT;
    if (doubled) { heal *= 2; hit *= 2; }
    heal = Math.min(heal, maxHpOf(p) - p.hp);
    p.hp += heal;
    hit = Math.min(hit, opp.hp);
    opp.hp -= hit;
    if (hit) { battleFx(G.players.indexOf(opp), `−${hit}`, 'hit'); msg = line('attack', { n: p.name, d: hit }); mood(p.cpu ? 'sad' : 'happy'); }
    else if (heal) { battleFx(G.cur, `+${heal}`, 'heal'); msg = line('heal', { d: heal }); }
    else if (!msg) msg = CAT[id].face ? line('healFull') : line('zero');
    if (opp.hp <= 0) {
      opp.out = true;
      msg = line('ko', { n: opp.name });
      mood('wow', 3000);
      ko = alive().length <= 1;               // in 3-4 si continua finché ne resta uno
    }
  }
  if (msg) say(msg);
  sc === 0 ? Sound.zero() : G.battle && !CAT[id].face ? Sound.hit(sc) : Sound.score(sc >= 25 || msg);
  G.sel = null;
  flashCell(id, G.cur);
  if (sc > 0 && !G.battle) popScore(id, G.cur, `+${sc}`, sc >= 25);
  haptic(sc ? (G.battle && !CAT[id].face ? [30, 30, 60] : 18) : [10, 40, 10]);
  if (ko) { busy = true; render(); setTimeout(() => { busy = false; endGame(); }, 900); return; }

  const roundBefore = G.round;
  nextTurn();
  if (G.round > G.rounds) { render(); return endGame(); }
  // Bevuta: brindisi fissi, uguali per tutti (anche online)
  if (G.drink && G.round !== roundBefore && SALUDE_ROUNDS.includes(G.round)) {
    alive().forEach(q => { if (q.drunk < GLASSES - 1) { q.drunk++; q.drinks.push('vino'); } });
    G.players.forEach((q, j) => { if (!q.out) drinkFx(j, 1); });
    setTimeout(() => { say('Salude! Tziu Gonario offre un brindisi a tutti: un bicchiere a testa!'); cameo('A sa salude!|Alla salute!', 'cheer', true, 'g-vino'); }, 500);
  }
  save();
  setTimeout(() => startTurn(), msg ? 900 : 450);
  render();
}

async function cpuTurn() {
  busy = true;
  const p = curP();
  if (G.battle) p._oppHp = battleTarget(p).hp;
  if (G.drink) p._oppDrunk = battleTarget(p).drunk;
  render();
  await sleep(T(900));
  while (G.rollsLeft > 0) {
    await doRoll();
    busy = true; render();
    if (G.rollsLeft === 0) break;
    await sleep(T(650));
    const keep = bestKeep(G.dice, p, G.level, G.rainbow ? G.colors : undefined);
    if (keep === 31) break;
    let changed = false;
    for (let i = 0; i < 5; i++) {
      const h = !!((keep >> i) & 1);
      if (G.held[i] !== h) { G.held[i] = h; changed = true; }
    }
    if (changed) { Sound.click(); render(); await sleep(T(650)); }
  }
  await sleep(T(500));
  const id = bestCategory(G.dice, p, G.level, G.rainbow ? G.colors : undefined);
  G.sel = id;
  render();
  await sleep(T(900));
  busy = false;
  commit(id);
}

function endGame() {
  clearSave();
  if (G.online) G.online.over = true;
  const ps = G.players;
  const totals = ps.map(shownTotal);
  const top = Math.max(...totals);
  const human = G.battle ? [] : ps.filter(isMe).map(totalOf);
  const prevBest = Number(localStorage.getItem(BEST_KEY) || 0);
  const best = Math.max(prevBest, ...human);
  if (best > 0) localStorage.setItem(BEST_KEY, best);

  let title;
  if (ps.length === 1) title = `${top} punti!`;
  else if (totals.every(t => t === top)) title = 'Pareggio!';
  else title = `Ha vinto ${ps[totals.indexOf(top)].name}!`;
  let note = best > prevBest ? `Nuovo record personale: ${best}!` : `Il tuo record: ${best}`;
  if (G.drink) {
    const w = ps[totals.indexOf(top)];
    note = ps.some(q => q.out) ? `${ps.filter(q => q.out).map(q => q.name).join(' e ')} è finito cottu. ${w.name} regge ancora!` : `Turni finiti: ${w.name} ha bevuto meno di tutti.`;
  }
  if (G.battle) {
    note = totals.includes(0) ? `${ps[totals.indexOf(0)].name} è rimasto senza punti vita.` : `Caselle finite: ${w.name} ha più punti vita.`;
    if (totals.every(t => t === top)) note = 'Stessi punti vita: la battaglia finisce alla pari.';
  }
  let starsHtml = '';

  $('#btnNext').hidden = true;
  $('#btnAgain').textContent = G.adv ? 'Riprova' : 'Rivincita';
  $('#btnAgain').disabled = false;
  $('#btnAgain').hidden = false;
  $('#btnEndMenu').textContent = G.adv ? 'Mappa' : 'Menù';

  if (G.adv) {
    const st = stageOf(), me = totals[0], foe = totals[1] ?? 0, g = st.goal;
    let ok = g.type === 'score' ? me >= g.min : me > foe + (g.margin || 0);
    if (g.needBonus && bonusOf(ps[0]) === 0) ok = false;
    const stars = ok ? 1 + (me >= st.stars[0]) + (me >= st.stars[1]) : 0;
    const advState = loadAdv();
    const before = advState.stars[st.id] || 0;
    advState.stars[st.id] = Math.max(before, stars);
    saveAdv(advState);

    title = ok ? 'Missione compiuta!' : 'Non questa volta…';
    starsHtml = `<div class="stars big">${[0, 1, 2].map(k => `<span class="${k < stars ? 'on' : ''}">★</span>`).join('')}</div>`;
    const bits = [ok ? st.goalText + ': fatto!' : `Obiettivo: ${st.goalText.toLowerCase()}.`];
    if (ok && before === 0 && st.unlock) bits.push(`Hai ottenuto ${CHARMS[st.unlock].icon} ${CHARMS[st.unlock].name}!`);
    if (ok && before === 0 && G.adv.stage === STAGES.length - 1) bits.push('Hai completato l\'avventura. Tziu Gonario è fiero di te!');
    if (ok && stars < 3) bits.push(`Prossima stella a ${st.stars[stars - 1]} ${st.starUnit || 'punti'}.`);
    note = bits.join(' ');
    if (ok && G.adv.stage < STAGES.length - 1) $('#btnNext').hidden = false;
  }
  $('#btnAgain').classList.toggle('primary', $('#btnNext').hidden);

  $('#endTitle').textContent = title;
  $('#endScores').innerHTML = starsHtml + ps.map((p, i) =>
    `<div class="end-row ${totals[i] === top ? 'win' : ''}"><span>${p.ava ? `<i class="chip-ava">${avatarHTML(p.ava)}</i>` : ''}${esc(p.name)}</span><b>${totals[i]}${G.battle ? ' <small>PV</small>' : G.drink ? ' <small>🍷 rimasti</small>' : ''}</b></div>`).join('');
  $('#endNote').textContent = note;
  Sound.fanfare();
  const won = G.adv ? title === 'Missione compiuta!' : isMe(ps[totals.indexOf(top)]);
  // battere il Mammuthones: prima il suo ballo, poi la schermata finale
  const bossDown = won && G.adv && stageOf().id === 'mammuthones' && clips.mammuthones;
  if (bossDown) cameo('Hai battuto il Mammuthones! Ora balla per te: a chent\'annos!', 'wow', true, 'mammuthones');
  if (won) Music.jingle();
  setTimeout(() => { $('#endOverlay').hidden = false; if (won) FX.confetti(); }, bossDown ? CLIP_MS + 300 : 700);
}

/* ───────────── Mappa e briefing ───────────── */

let briefStage = 0;

function renderMap() {
  const a = loadAdv();
  const total = STAGES.reduce((n, s) => n + (a.stars[s.id] || 0), 0);
  const me = charSrc(myChar());
  $('#mapStars').innerHTML = `${me ? `<i class="chip-ava">${avatarHTML(me)}</i>` : ''}★ ${total} / ${STAGES.length * 3}`;
  $('#mapList').innerHTML = STAGES.map((s, i) => {
    const open = stageUnlocked(a, i), st = a.stars[s.id] || 0;
    return `<button class="stage ${open ? '' : 'locked'} ${st ? 'done' : ''}" data-i="${i}" ${open ? '' : 'disabled'}>
      <span class="medal">${open ? avatarHTML(s.foe?.img ? rivalSrc(s.foe.img) : s.portrait) : '🔒'}</span>
      <span class="info"><small>Tappa ${i + 1}</small><b>${s.place}</b><em>${open ? (s.foe ? s.foe.name : 'Tziu Gonario') : 'Bloccata'}</em></span>
      <span class="stars">${[0, 1, 2].map(k => `<span class="${k < st ? 'on' : ''}">★</span>`).join('')}</span>
    </button>`;
  }).join('');
  const owned = charmsOwned(a);
  $('#mapCharms').innerHTML = Object.entries(CHARMS).map(([id, c]) =>
    `<div class="charm-chip ${owned.includes(id) ? '' : 'locked'}" title="${c.desc}"><span>${owned.includes(id) ? c.icon : '?'}</span>${owned.includes(id) ? c.name : '???'}</div>`).join('');
}

function openBrief(i) {
  briefStage = i;
  const s = STAGES[i], a = loadAdv();
  const owned = charmsOwned(a);
  $('#briefIcon').innerHTML = avatarHTML(s.foe?.img ? rivalSrc(s.foe.img) : s.portrait);
  $('#briefStep').textContent = `Tappa ${i + 1} di ${STAGES.length}`;
  $('#briefPlace').textContent = s.place;
  $('#briefDesc').textContent = s.desc;
  $('#briefFoe').textContent = s.foe ? s.foe.name : 'Tziu Gonario';
  $('#briefQuote').textContent = `«${s.foe ? s.foe.quote : s.intro}»`;
  $('#briefGoal').textContent = s.goalText;
  $('#briefStars').innerHTML =
    `<span><b>★</b> obiettivo</span><span><b>★★</b> ${s.stars[0]} ${s.starUnit || 'punti'}</span><span><b>★★★</b> ${s.stars[1]} ${s.starUnit || 'punti'}</span>`;
  const seg = $('#segCharm');
  seg.innerHTML = `<button data-v="" class="on">Nessuno</button>` +
    owned.map(id => `<button data-v="${id}" title="${CHARMS[id].desc}">${CHARMS[id].icon} ${CHARMS[id].name}</button>`).join('');
  $('#charmBox').hidden = owned.length === 0;
  $('#charmDesc').textContent = '';
  show('brief');
}

function startStage() {
  const charm = segValue('segCharm') || null;
  clearSave();
  newGame({ mode: 'adv', stage: briefStage, charm, name1: localStorage.getItem('cd.name') || '' });
}

/* ───────────── Disegno ───────────── */

const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

// Rotazione del cubo che porta la faccia v verso chi guarda
const FACE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const pipsHTML = v => Array.from({ length: 9 }, (_, k) => `<i class="pip${(PIPS[v] || []).includes(k) ? ' on' : ''}"></i>`).join('');
const cubeHTML = () => `<span class="cube">${[1, 2, 3, 4, 5, 6].map(v => `<span class="side s${v}">${pipsHTML(v)}</span>`).join('')}</span>`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function setDie(el, v, spin = false) {
  if (spin) {
    const turns = () => 1 + Math.floor(Math.random() * 2);
    el._nx = (el._nx || 0) + turns();
    el._ny = (el._ny || 0) + turns();
    el._nz = (el._nz || 0) + (Math.random() < 0.5 ? -1 : 1);
  } else if (el.dataset.v === String(v)) return;
  el.dataset.v = v;
  const [ax, ay] = FACE_ROT[v || 1];
  el.querySelector('.cube').style.transform =
    `rotateZ(${360 * (el._nz || 0)}deg) rotateX(${ax + 360 * (el._nx || 0)}deg) rotateY(${ay + 360 * (el._ny || 0)}deg)`;
}

const haptic = pattern => { try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(pattern); } catch {} };

// Numeri che salgono invece di cambiare di colpo
const rivalSrc = img => `img/rivali/${img}.webp`;
const avatarHTML = (src, alt = '') => `<img class="ava" src="${src}" alt="${alt}" draggable="false">`;

const shownTotal = q => (G?.drink ? GLASSES - q.drunk : G?.battle ? q.hp : totalOf(q));

// Il tuo personaggio esulta accanto al nome
function cheerChip(j) {
  const ava = document.querySelector(`#players .chip[data-p="${j}"] .chip-ava`);
  if (!ava) return;
  ava.classList.remove('cheer'); void ava.offsetWidth; ava.classList.add('cheer');
  const tp = $('.mentor [data-mentor]');
  tp.classList.remove('cheer'); void tp.offsetWidth; tp.classList.add('cheer');
}

// Bevuta: un bicchiere si svuota sotto il nome, con un "glu glu"
function drinkFx(j, n, dk = 'vino') {
  const chip = document.querySelector(`#players .chip[data-p="${j}"]`);
  if (!chip) return;
  chip.classList.remove('gulp'); void chip.offsetWidth; chip.classList.add('gulp');
  const r = chip.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'score-pop big hit';
  const em = DRINKS[dk]?.emoji || '🍷';
  d.textContent = n >= 2 ? `${em}${em} glu glu!` : `${em} glu!`;
  d.style.left = `${Math.round(r.left + r.width / 2)}px`;
  d.style.top = `${Math.round(r.top + r.height / 2)}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1200);
  Sound.gulp(n);
  haptic([20, 40, 20, 40, 20]);
}

// Bevuta: "Offro io!" — una volta per partita un giro di Ichnusa per tutti, te compreso
function doGiro(idx) {
  const p = G.players[idx];
  if (!p || p.giroUsed) return;
  p.giroUsed = true;
  G.players.forEach((q, j) => {
    if (q.out) return;
    q.drunk = Math.min(GLASSES, q.drunk + 1);
    q.drinks.push('ichnusa');
    drinkFx(j, 1, 'ichnusa');
    if (q.drunk >= GLASSES) q.out = true;
  });
  say(`${p.name}: «Offro io! Un giro di Ichnusa per tutti!»`);
  cameo('Aaaaah, bella frisca!|Aaah, bella fresca!', 'cheer', true, 'g-birra');
  if (alive().length <= 1) { busy = true; render(); setTimeout(() => { busy = false; endGame(); }, 1200); return; }
  if (G.players[G.cur].out) { busy = false; G.sel = null; nextTurn(); if (G.round > G.rounds) { render(); return endGame(); } startTurn(); return; }
  render();
}
function offerGiro() {
  if (!G?.drink || busy || !myTurn() || curP().giroUsed) return;
  if (G.online) netSend({ t: 'giro', idx: G.cur });
  doGiro(G.cur);
}

// Bevuta: quanto è brillo chi sta giocando su QUESTO telefono (0-4)
function drunkLevel() {
  if (!G?.drink || !$('#game').classList.contains('active')) return 0;
  const p = curP();
  if (!isMe(p) || p.out) return 0;
  return Math.min(4, dlv(p) + (p.tempFx || 0));
}
function applyDrunkFx() {
  const lvl = drunkLevel();
  for (let k = 1; k <= 4; k++) document.body.classList.toggle(`drunk-${k}`, lvl === k);
  document.body.classList.toggle('lightfx', !!OPTS.lightfx);
  wobbleCup(lvl >= 2 && myTurn() && !busy && G.rollsLeft > 0);
}

// Vista doppia: compaiono dadi fantasma (toccarli non serve a niente)
function renderGhosts() {
  const tray = $('#tray');
  const want = drunkLevel() >= 3 && G.hasRolled ? (drunkLevel() >= 4 ? 3 : 2) : 0;
  const have = tray.querySelectorAll('.ghost').length;
  if (have === want) return;
  tray.querySelectorAll('.ghost').forEach(g => g.remove());
  tray.querySelectorAll('.die').forEach((d, i) => { d.style.order = String(i * 2); });   // i fantasmi si infilano tra i dadi veri
  for (let k = 0; k < want; k++) {
    const b = document.createElement('button');
    b.className = 'die ghost';
    b.innerHTML = cubeHTML() + '<span class="shadow"></span>';
    b.style.order = String(1 + k * 2);
    setDie(b, rnd6());
    b.addEventListener('click', e => { e.stopPropagation(); say(pick(['Hic! Quel dado non esiste, bellu meu.', 'Era un dado fantasma! Il vino ti fa vedere doppio.', 'Mi\'… stai toccando l\'aria!'])); mood('smirk', 1500); });
    tray.appendChild(b);
  }
}

// Il bossolo ubriaco: ondeggia e bisogna lanciare quando è al centro
const CupWobble = { on: false, t0: 0, raf: 0, period: 1600, amp: 46 };
function wobbleCup(on) {
  const cup = $('#cup');
  if (on === CupWobble.on) return;
  CupWobble.on = on;
  cup.classList.toggle('wobble', on);
  $('#cupAim').hidden = !on;
  cancelAnimationFrame(CupWobble.raf);
  if (!on) { cup.style.translate = ''; return; }
  CupWobble.t0 = performance.now();
  CupWobble.period = 1700 - drunkLevel() * 180;
  const ta = $('.cup-zone').getBoundingClientRect(), cr = cup.getBoundingClientRect();
  $('#cupAim').style.left = `${Math.round(cr.left - ta.left + cr.width / 2 - CupWobble.amp)}px`;
  const step = t => {
    if (!CupWobble.on) return;
    const ph = Math.sin(((t - CupWobble.t0) / CupWobble.period) * Math.PI * 2);
    cup.style.translate = `${Math.round(-CupWobble.amp + ph * CupWobble.amp)}px 0`;
    CupWobble.raf = requestAnimationFrame(step);
  };
  CupWobble.raf = requestAnimationFrame(step);
}
const cupCentered = () => Math.abs(Math.sin(((performance.now() - CupWobble.t0) / CupWobble.period) * Math.PI * 2)) < 0.38;

function battleFx(j, text, kind) {
  const chip = document.querySelector(`#players .chip[data-p="${j}"]`);
  if (!chip) return;
  chip.classList.remove('hit', 'heal'); void chip.offsetWidth; chip.classList.add(kind);
  const r = chip.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = `score-pop big ${kind}`;
  d.textContent = text;
  d.style.left = `${Math.round(r.left + r.width / 2)}px`;
  d.style.top = `${Math.round(r.top + r.height / 2)}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1200);
  FX.burst(r.left + r.width / 2, r.top + r.height / 2, kind === 'hit' ? 26 : 16,
    { speed: kind === 'hit' ? 6 : 3, up: kind === 'hit' ? 2 : 4, colors: kind === 'hit' ? ['#ff5a3c', '#ffb36b', '#c8231a', '#fff'] : ['#5fd3a0', '#c9f5e0', '#2fae6a', '#fff'] });
}

function animateNum(el, to) {
  const from = Number(el.dataset.val ?? to);
  el.dataset.val = to;
  if (from === to || reducedMotion) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 650;
  const step = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1 && el.dataset.val == to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

function popScore(id, j, text, big) {
  const td = document.querySelector(`#sheet tr[data-id="${id}"] .cell[data-p="${j}"]`);
  if (!td) return;
  const r = td.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'score-pop' + (big ? ' big' : '');
  d.textContent = text;
  d.style.left = `${Math.round(r.left + r.width / 2)}px`;
  d.style.top = `${Math.round(r.top + r.height / 2)}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1200);
  if (big) FX.burst(r.left + r.width / 2, r.top + r.height / 2, 28, { speed: 5 });
}

/* Particelle: scintille e coriandoli su un canvas sopra la pagina */
const FX = {
  parts: [], running: false,
  init() {
    this.cv = $('#fx'); this.ctx = this.cv.getContext('2d');
    const size = () => {
      const d = window.devicePixelRatio || 1;
      this.cv.width = Math.round(innerWidth * d); this.cv.height = Math.round(innerHeight * d);
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size(); addEventListener('resize', size);
  },
  burst(x, y, n = 40, o = {}) {
    if (reducedMotion) return;
    const cols = o.colors || ['#f0a640', '#ffd28a', '#c8743a', '#f6ead2', '#5fd3a0', '#ff7a59'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 7) * (0.35 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 3), g: 0.2, life: 1,
        decay: 0.007 + Math.random() * 0.012, size: 4 + Math.random() * 6, rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], rect: Math.random() < 0.6 });
    }
    this.run();
  },
  burstAt(el, n) { const r = el.getBoundingClientRect(); this.burst(r.left + r.width / 2, r.top + r.height / 2, n); },
  confetti() {
    for (let k = 0; k < 6; k++) setTimeout(() => this.burst(innerWidth * (0.1 + 0.8 * Math.random()), innerHeight * (0.15 + 0.2 * Math.random()), 45, { speed: 10, up: 5 }), k * 160);
  },
  run() {
    if (this.running) return;
    this.running = true;
    const step = () => {
      const c = this.ctx;
      c.clearRect(0, 0, innerWidth, innerHeight);
      this.parts = this.parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
      for (const p of this.parts) {
        p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
        c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
        c.fillStyle = p.c;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        if (p.rect) c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else { c.beginPath(); c.arc(0, 0, p.size / 3, 0, Math.PI * 2); c.fill(); }
        c.restore();
      }
      c.globalAlpha = 1;
      if (this.parts.length) requestAnimationFrame(step); else { this.running = false; c.clearRect(0, 0, innerWidth, innerHeight); }
    };
    requestAnimationFrame(step);
  },
};

/* Agita il telefono per lanciare (spento di default, sensibilità moderata) */
const Shake = {
  on: localStorage.getItem('cd.shake') === '1',
  last: 0, attached: false,
  async permit() {
    const DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      try { return (await DME.requestPermission()) === 'granted'; } catch { return false; }
    }
    return !!DME;
  },
  attach() { if (!this.attached) { addEventListener('devicemotion', this.onMotion); this.attached = true; } },
  onMotion(e) {
    if (!Shake.on || !G || !$('#game').classList.contains('active')) return;
    const a = e.acceleration;
    let m;
    if (a && a.x != null) m = Math.hypot(a.x, a.y, a.z);
    else { const g = e.accelerationIncludingGravity; if (!g || g.x == null) return; m = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81); }
    if (m > 17 && Date.now() - Shake.last > 1300) { Shake.last = Date.now(); humanRoll(); }
  },
};

function buildTray() {
  const tray = $('#tray');
  tray.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('button');
    b.className = 'die';
    b.setAttribute('aria-label', `Dado ${i + 1}`);
    b.innerHTML = cubeHTML() + '<span class="shadow"></span><span class="tag">tenuto</span>';
    b.addEventListener('click', () => dieClick(i));
    tray.appendChild(b);
  }
}

function buildSheet() {
  const two = G.players.length > 1;
  const head = `<thead><tr><th></th>${G.players.map((p, j) => `<th class="pcol" data-p="${j}">${esc(p.name)}</th>`).join('')}</tr></thead>`;
  const row = c => `<tr data-id="${c.id}"><td class="lbl"><span>${c.label}</span><small>${c.hint}</small></td>${G.players.map((_, j) => `<td class="cell" data-p="${j}"></td>`).join('')}</tr>`;
  const sumRow = (cls, label) => `<tr class="sum ${cls}"><td class="lbl"><span>${label}</span></td>${G.players.map((_, j) => `<td data-p="${j}"></td>`).join('')}</tr>`;
  $('#players').innerHTML = G.players.map((q, j) =>
    `<div class="chip${G.battle ? ' battle' : ''}${G.drink ? ' drink' : ''}" data-p="${j}"><span>${q.ava ? `<i class="chip-ava">${avatarHTML(q.ava)}</i>` : q.icon ? q.icon + ' ' : ''}${esc(q.name)}</span><b data-val="${shownTotal(q)}">${shownTotal(q)}</b>${G.battle ? '<div class="hp"><i></i></div>' : ''}${G.drink ? `<div class="glasses">${'<i></i>'.repeat(GLASSES)}</div>` : ''}</div>`).join('');
  buildBoard();
  $('#players').classList.toggle('many', G.players.length > 2);
  $('#sheet').className = 'sheet' + (two ? ' two' : '');
  $('#sheet').innerHTML = head + '<tbody>' +
    UPPER.map(row).join('') +
    sumRow('upper', 'Parte alta') +
    sumRow('bonus', `Bonus <small>(63 → +35)</small>`) +
    LOWER.filter(c => !c.rainbow || G.rainbow).map(row).join('') +
    sumRow('extra', 'Extra <small>(Yatzy extra, elisir)</small>') +
    sumRow('total', 'Totale') +
    '</tbody>';
}

// Plancia a tessere del giocatore di turno
const TILE_LABEL = { tris: 'Tris', poker: 'Poker', full: 'Full', chance: 'Chance', small: 'Scala 4', large: 'Scala 5', cinq: 'Yatzy', mono: 'Monocolore', fullc: 'Full colori' };
const TILE_ORDER = ['tris', 'poker', 'full', 'chance', 'small', 'large', 'cinq', 'mono', 'fullc'];
// Icone delle caselle (disegnate qui, colore preso dal testo)
const sq = (x, y, s = 6) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="1.6"/><circle cx="${x + s / 2}" cy="${y + s / 2}" r="1" class="f"/>`;
const ICON = {
  tris:   `<svg viewBox="0 0 24 24">${sq(1.5, 9)}${sq(9, 9)}${sq(16.5, 9)}</svg>`,
  poker:  `<svg viewBox="0 0 24 24">${sq(4, 3.5, 7)}${sq(13, 3.5, 7)}${sq(4, 13.5, 7)}${sq(13, 13.5, 7)}</svg>`,
  full:   `<svg viewBox="0 0 24 24">${sq(1.5, 3.5)}${sq(9, 3.5)}${sq(16.5, 3.5)}<g class="alt">${sq(5, 14)}${sq(13, 14)}</g></svg>`,
  chance: `<svg viewBox="0 0 24 24"><g class="leaf"><circle cx="12" cy="7.2" r="3.8"/><circle cx="16.8" cy="12" r="3.8"/><circle cx="12" cy="16.8" r="3.8"/><circle cx="7.2" cy="12" r="3.8"/></g><circle cx="12" cy="12" r="1.4" class="f"/><path d="M13 15.5 q2 4 5.5 6" /></svg>`,
  small:  `<svg viewBox="0 0 24 24"><path d="M2.5 21h5v-4.5h4.5v-4.5h4.5v-4.5h5V21z"/></svg>`,
  large:  `<svg viewBox="0 0 24 24"><path d="M2 21h4v-3.6h4v-3.6h4v-3.6h4V6.6h4V21z"/></svg>`,
  cinq:   `<svg viewBox="0 0 24 24"><path class="star" d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.2 1.3-6.6-4.9-4.5 6.6-.8z"/></svg>`,
  mono:   `<svg viewBox="0 0 24 24"><path class="gem r" d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9 4l-1.5 5L12 20l4.5-11L15 4"/></svg>`,
  fullc:  `<svg viewBox="0 0 24 24"><path class="gem g" d="M3 7h6l2.5 3-5.5 7-5.5-7z"/><path class="gem b" d="M15 7h6l2.5 3-5.5 7-5.5-7z" transform="translate(-1.5 0)"/></svg>`,
};

function buildBoard() {
  const drinkTag = id => {
    const dk = G.drink && DRINK_OF[id] && DRINKS[DRINK_OF[id]];
    if (!dk) return '';
    const n = ['cinq', 'mono'].includes(id) ? 2 : 1;
    const h = dk.color.slice(1), lum = (parseInt(h.slice(0, 2), 16) * 299 + parseInt(h.slice(2, 4), 16) * 587 + parseInt(h.slice(4, 6), 16) * 114) / 1000;
    return `<span class="t-liquid${lum > 150 ? ' light' : ''}" style="--dc:${dk.color}" title="${dk.name}${id === 'chance' ? ' (da 25 punti)' : ''}"><i></i><em>${dk.short || dk.name}${n > 1 ? ' ×2' : ''}</em></span>`;
  };
  const tile = (id, inner, cls = '') => `<button class="tile ${cls}" data-id="${id}" aria-label="${CAT[id].label}">${drinkTag(id)}<span class="t-top">${inner}</span><span class="t-val"></span><i class="t-check" aria-hidden="true">✓</i></button>`;
  $('#board').classList.toggle('battle', !!G.battle);
  $('#board').classList.toggle('drink', !!G.drink);
  $('#board').innerHTML =
    `<div class="b-upper">${UPPER.map(c => tile(c.id, `<span class="mini">${pipsHTML(c.face)}</span>`, 'up')).join('')}</div>
     <div class="bonusbar"><i></i><b class="sheep" aria-hidden="true">🐑</b><span></span></div>
     <div class="b-lower">${TILE_ORDER.filter(id => !CAT[id].rainbow || G.rainbow).map(id =>
       tile(id, `<span class="t-ico">${ICON[id]}</span><b>${TILE_LABEL[id]}</b>`, ['cinq', 'mono', 'fullc'].includes(id) ? 'wide ' + id : id)).join('')}</div>`;
}

function renderBoard(p, canAct) {
  const joker = jokerFor(p, G.dice);
  let best = null, bestV = 0;
  document.querySelectorAll('#board .tile').forEach(t => {
    const id = t.dataset.id, val = t.querySelector('.t-val');
    const done = p.scores[id] !== undefined;
    t.className = t.className.replace(/\b(done|preview|zero|sel|pickable|best)\b/g, '').trim();
    if (done) { t.classList.add('done'); val.textContent = p.scores[id]; if (!p.scores[id]) t.classList.add('zero'); }
    else if (rolled()) {
      const v = scoreFor(id, G.dice, joker, G.colors);
      val.textContent = G.drink && v
        ? (CAT[id].face ? (v >= CAT[id].face * 3 ? `${v} 🍞` : v) : glassesFor(id, v) ? `${(DRINKS[DRINK_OF[id]]?.emoji || '🍷').repeat(glassesFor(id, v))}` : v)
        : G.battle && v ? (CAT[id].face ? `+${Math.min(v, maxHpOf(p) - p.hp)}` : `−${v}`) : v;
      t.classList.add('preview');
      if (!v) t.classList.add('zero');
      if (v > bestV) { bestV = v; best = t; }
      if (G.sel === id) t.classList.add('sel');
      if (canAct) t.classList.add('pickable');
    } else val.textContent = '·';
    t.disabled = !(canAct && !done && rolled());
  });
  if (best && canAct && !G.sel) best.classList.add('best');
  const up = upperSum(p);
  const pct = Math.min(100, Math.round(up / BONUS_AT * 100));
  $('#board .bonusbar i').style.width = `${pct}%`;
  $('#board .bonusbar .sheep').style.left = `calc(${pct}% - ${Math.round(pct * 0.22)}px)`;
  $('#board .bonusbar').classList.toggle('got', up >= BONUS_AT);
  $('#board .bonusbar span').textContent = G.battle
    ? (up >= BONUS_AT ? `Parte alta ${up} · cura +35 ottenuta!` : `Parte alta: cura · ${up} / 63 per una cura di +35`)
    : (up >= BONUS_AT ? `Parte alta ${up} · bonus +35 conquistato!` : `Parte alta ${up} / 63 · bonus +35`);
}

function render() {
  if (!G) return;
  const p = curP();
  const canAct = !busy && myTurn() && !G.online?.gone;

  $('#roundNo').textContent = Math.min(G.round, G.rounds);
  $('#roundOf').textContent = G.rounds;

  // giocatori
  document.querySelectorAll('#players .chip').forEach(ch => {
    const j = Number(ch.dataset.p);
    ch.classList.toggle('on', j === G.cur);
    ch.classList.toggle('out', !!G.players[j].out);
    ch.classList.toggle('asleep', !!G.players[j].skip && !G.players[j].out);
    const q = G.players[j];
    animateNum(ch.querySelector('b'), shownTotal(q));
    if (G.battle) {
      ch.querySelector('.hp i').style.width = `${Math.round(q.hp / maxHpOf(q) * 100)}%`;
      ch.classList.toggle('low', q.hp <= 30);
    }
    if (G.drink) {
      ch.querySelectorAll('.glasses i').forEach((gl, k) => {
        const empty = k >= GLASSES - q.drunk;
        gl.classList.toggle('empty', empty);
        const dk = empty ? (q.drinks || [])[GLASSES - 1 - k] : null;
        gl.style.setProperty('--res', dk ? DRINKS[dk].color : 'transparent');
        gl.title = dk ? DRINKS[dk].name : '';
      });
      ch.dataset.drunk = dlv(q);
      ch.classList.toggle('low', q.drunk >= GLASSES - 2);
    }
  });

  // dadi
  const dieEls = document.querySelectorAll('#tray .die');
  dieEls.forEach((el, i) => {
    if (!el.classList.contains('rolling')) setDie(el, G.dice[i]);
    el.classList.toggle('held', G.held[i]);
    if (G.rainbow && G.colors[i]) el.dataset.c = G.colors[i]; else delete el.dataset.c;
    el.classList.toggle('blank', G.dice[i] === 0);
    el.disabled = !(canAct && rolled() && (G.rollsLeft > 0 || G.adv?.armed));
    el.classList.toggle('target', !!G.adv?.armed && canAct);
  });

  // lanci rimasti
  const canRoll = canAct && G.rollsLeft > 0 && !G.adv?.armed;
  $('#tray').classList.toggle('can-roll', canRoll);
  $('#cup').classList.toggle('shaking', canRoll || (p.cpu && G.rollsLeft > 0));
  $('#cup').classList.toggle('idle', !canRoll && !(p.cpu && G.rollsLeft > 0));
  $('#tray').classList.toggle('in-cup', !rolled());
  $('#rollHint').hidden = !(canAct && !rolled());
  $('#rollHint').textContent = Shake.on ? 'Agita il telefono o tocca il bossolo' : 'Tocca il bossolo o premi Lancia';
  $('#rolls').innerHTML = Array.from({ length: G.rollsTotal }, (_, k) => `<i class="${k < G.rollsLeft ? 'left' : ''}"></i>`).join('') +
    `<span>${ROLL_WORDS[G.rollsLeft]}</span>`;

  const roll = $('#btnRoll');
  roll.disabled = !canAct || G.rollsLeft === 0;
  roll.textContent = rolled() ? 'Rilancia' : 'Lancia';

  const scoreBtn = $('#btnScore');
  if (G.sel && rolled()) {
    const v = scoreFor(G.sel, G.dice, jokerFor(p, G.dice), G.colors);
    scoreBtn.textContent = G.battle ? `${CAT[G.sel].face ? 'Cura' : 'Attacca'} ${v} · ${CAT[G.sel].label}` : `Segna ${v} · ${CAT[G.sel].label}`;
    scoreBtn.disabled = !canAct;
    scoreBtn.classList.add('primary');
  } else {
    scoreBtn.textContent = rolled() ? 'Scegli una casella' : 'Prima lancia';
    scoreBtn.disabled = true;
    scoreBtn.classList.remove('primary');
  }

  // talismano (avventura)
  const cb = $('#btnCharm'), a = G.adv;
  cb.hidden = !(a && a.charm);
  if (a && a.charm) {
    const c = CHARMS[a.charm];
    cb.innerHTML = a.charmUsed ? `${c.icon} ${c.name} · usato` : a.armed ? `${c.icon} Annulla` : `${c.icon} Usa ${c.name}`;
    cb.disabled = a.charmUsed || !canAct || !rolled();
    cb.classList.toggle('armed', !!a.armed);
  }
  $('#roundLabel').textContent = stageOf() ? stageOf().place : '';

  renderBoard(p, canAct);
  applyDrunkFx();
  renderGhosts();
  const gb = $('#btnGiro');
  gb.hidden = !G.drink || !isMe(p) || !!p.giroUsed || !!p.out;
  gb.disabled = !canAct;
  document.body.classList.toggle('tavern', !!G.drink && $('#game').classList.contains('active'));
  document.body.style.setProperty('--dim', G.drink ? (dlv(p) * 0.09).toFixed(2) : '0');
  const tp = $('.mentor [data-mentor]'), ta = tp.querySelector('.turn-ava');
  tp.classList.toggle('player', !!p.ava);
  tp.dataset.drunk = G.drink ? dlv(p) : 0;
  if (p.ava && ta.getAttribute('src') !== p.ava) {
    ta.setAttribute('src', p.ava);
    tp.classList.remove('pop'); void tp.offsetWidth; tp.classList.add('pop');
  }
  $('#emotes').hidden = !G.online || !!G.online.gone;

  // foglio punti
  const joker = jokerFor(p, G.dice);
  document.querySelectorAll('#sheet tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelectorAll('.cell').forEach(td => {
      const j = Number(td.dataset.p), q = G.players[j];
      const done = q.scores[id] !== undefined;
      td.className = 'cell';
      if (done) {
        td.textContent = q.scores[id];
        td.classList.add('done');
        if (q.scores[id] === 0) td.classList.add('zero');
      } else if (j === G.cur && rolled()) {
        const v = scoreFor(id, G.dice, joker, G.colors);
        td.textContent = v;
        td.classList.add('preview');
        if (v === 0) td.classList.add('zero');
        if (G.sel === id) td.classList.add('sel');
        if (canAct) td.classList.add('pickable');
      } else td.textContent = '';
    });
  });
  document.querySelectorAll('#sheet thead .pcol').forEach(th => th.classList.toggle('on', Number(th.dataset.p) === G.cur));
  const fill = (cls, fn) => document.querySelectorAll(`#sheet tr.${cls} td[data-p]`).forEach(td => { td.textContent = fn(G.players[Number(td.dataset.p)]); });
  fill('upper', q => `${upperSum(q)}/63`);
  fill('bonus', q => bonusOf(q) || '');
  fill('extra', q => q.extra || '');
  document.querySelectorAll('#sheet tr.total td[data-p]').forEach(td => animateNum(td, shownTotal(G.players[Number(td.dataset.p)])));
  $('#sheet tr.total .lbl span').textContent = G.drink ? 'Bicchieri rimasti' : G.battle ? 'Punti vita' : 'Totale';
}

function flashCell(id, j) {
  const td = document.querySelector(`#sheet tr[data-id="${id}"] .cell[data-p="${j}"]`);
  if (!td) return;
  td.classList.remove('flash'); void td.offsetWidth; td.classList.add('flash');
}

let sayToken = 0;
// Una frase può avere la traduzione dopo "|": la mostriamo piccola sotto
function setLine(el, text) {
  const [main, tr] = String(text).split('|');
  el.textContent = main;
  if (tr) { const sm = document.createElement('small'); sm.className = 'tr'; sm.textContent = tr; el.appendChild(sm); }
}

function say(text, target = '#say') {
  const b = $(target);
  if (!b) return;
  const token = b._tok = ++sayToken;
  b.hidden = false;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  const portraits = document.querySelectorAll('[data-mentor]');
  if (reducedMotion) { setLine(b, text); return; }
  const [main, tr] = String(text).split('|');
  portraits.forEach(el => { el.dataset.talking = '1'; });
  let i = 0;
  b.textContent = '';
  const tick = () => {
    if (token !== b._tok) return;
    i = Math.min(main.length, i + 2);
    b.textContent = main.slice(0, i);
    if (i < main.length) setTimeout(tick, 28);
    else {
      if (tr) setLine(b, text);
      portraits.forEach(el => { delete el.dataset.talking; });
    }
  };
  tick();
}

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/* ───────────── Sfida online: fino a 4 telefoni (PeerJS) ─────────────
   Chi crea la stanza fa da centro: gli altri si collegano a lui e lui inoltra le mosse a tutti. */

const PEER_PREFIX = 'yatzy-tziugonario-';
const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const MAX_ONLINE = 4;
const RELAY = new Set(['roll', 'hold', 'sel', 'commit', 'snap', 'emote', 'giro']);
const NET = { peer: null, role: null, code: null, host: null, open: false, guests: [], active: [], lobby: [], queue: Promise.resolve(), waitTimer: null };
const EMOTES = ['Ajò!|Dai!', 'Mischinu!|Poverino!', 'Eja!|Sì!', 'Ma bae!|Ma va\'!', 'Ses prus lentu de una tostoine.|Sei più lento di una tartaruga.', 'A chent\'annos!|Cent\'anni!'];

function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL;
    s.onload = ok;
    s.onerror = () => ko(new Error('peerjs'));
    document.head.appendChild(s);
  });
}

const randCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
const myName = () => ($('#onName').value.trim() || localStorage.getItem('cd.name') || 'Giocatore').slice(0, 14);
const roomLink = code => `${location.origin}${location.pathname}?stanza=${code}`;
const gameRunning = () => !!(G?.online && !G.online.over && $('#game').classList.contains('active'));

function netStatus(text, kind = '') {
  const el = $('#onStatus');
  el.textContent = text;
  el.className = `on-status ${kind}`;
}

function netErrText(err) {
  switch (err?.type) {
    case 'peer-unavailable': return 'Stanza non trovata: controlla il codice (o la stanza è stata chiusa).';
    case 'browser-incompatible': return 'Questo browser non supporta il gioco online.';
    case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
      return 'Problema di connessione. Controlla internet e riprova.';
    default: return `Errore di collegamento (${err?.type || 'sconosciuto'}). Riprova.`;
  }
}

function netClear() {
  clearTimeout(NET.waitTimer);
  Object.assign(NET, { peer: null, role: null, code: null, host: null, open: false, guests: [], active: [], lobby: [], queue: Promise.resolve(), reconnecting: false });
  $('#roomBox').hidden = true;
  $('#lobbyBox').hidden = true;
}

function netReset() {
  const { peer, host, guests } = NET;
  netClear();
  try { host?.close(); } catch {}
  guests.forEach(g => { try { g.conn.close(); } catch {} });
  try { peer?.destroy(); } catch {}
}

function netLeave() {
  // saluto e chiudo solo QUESTA stanza, con un attimo di ritardo per far partire il messaggio
  const { peer, host, guests } = NET;
  netSend({ t: 'bye' });
  netClear();
  setTimeout(() => {
    try { host?.close(); } catch {}
    guests.forEach(g => { try { g.conn.close(); } catch {} });
    try { peer?.destroy(); } catch {}
  }, 150);
}

// Il centro manda a tutti (tranne chi ha mandato il messaggio); gli altri mandano al centro
function netSend(msg, except = null) {
  if (NET.role === 'host') NET.guests.forEach(g => { if (g.open && g !== except) { try { g.conn.send(msg); } catch {} } });
  else if (NET.host && NET.open) { try { NET.host.send(msg); } catch {} }
}

/* ── Creare la stanza ── */

async function hostRoom() {
  netReset();
  localStorage.setItem('cd.name', myName());
  netStatus('Preparo la stanza…', 'wait');
  try { await loadPeerJS(); } catch { return netStatus('Non riesco a caricare il gioco online. Controlla la connessione.', 'err'); }
  const code = randCode();
  NET.role = 'host';
  NET.code = code;
  const peer = NET.peer = new window.Peer(PEER_PREFIX + code);
  peer.on('open', () => {
    $('#roomCode').textContent = code;
    $('#roomBox').hidden = false;
    netStatus('Mandate il link o il codice agli amici (fino a 4 giocatori).', 'wait');
    broadcastLobby();
  });
  peer.on('connection', conn => {
    const refuse = t => conn.on('open', () => { conn.send({ t }); setTimeout(() => conn.close(), 400); });
    if (gameRunning()) return attachGuest(conn, true);      // può essere qualcuno che si ricollega
    if (NET.guests.length >= MAX_ONLINE - 1) return refuse('full');
    attachGuest(conn);
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch {} });
  peer.on('error', err => {
    if (err.type === 'unavailable-id') return hostRoom();   // codice già usato: ne provo un altro
    if (err.type === 'peer-unavailable') return;          // un ospite sparito: non è grave
    netStatus(netErrText(err), 'err');
  });
}

function attachGuest(conn, pending = false) {
  const g = { conn, name: '', char: null, open: false, pending };
  NET.guests.push(g);
  conn.on('open', () => { g.open = true; });
  conn.on('data', msg => { NET.queue = NET.queue.then(() => onHostData(g, msg)).catch(() => {}); });
  conn.on('close', () => onGuestGone(g));
  conn.on('error', () => onGuestGone(g));
}

function broadcastLobby() {
  const ready = NET.guests.filter(g => g.open && g.name);
  NET.lobby = [{ name: myName(), char: myChar() }, ...ready.map(g => ({ name: g.name, char: g.char }))];
  netSend({ t: 'lobby', players: NET.lobby, host: myName() });
  renderLobby();
}

function renderLobby(hostName) {
  const box = $('#lobbyBox');
  box.hidden = NET.lobby.length === 0;
  $('#lobbyTitle').textContent = `Giocatori nella stanza (${NET.lobby.length}/${MAX_ONLINE})`;
  $('#lobbyList').innerHTML = NET.lobby.map((p, i) => {
    const src = charSrc(p.char);
    return `<div class="lobby-p">${src ? `<i class="chip-ava">${avatarHTML(src)}</i>` : '<i class="chip-ava"></i>'}<b>${esc(p.name)}</b>${i === 0 ? '<small>crea la stanza</small>' : ''}</div>`;
  }).join('');
  const startBtn = $('#btnStartOnline');
  startBtn.hidden = NET.role !== 'host';
  startBtn.disabled = NET.lobby.length < 2;
  startBtn.textContent = NET.lobby.length < 2 ? 'Aspetta almeno un amico…' : `Inizia la partita in ${NET.lobby.length}`;
  if (NET.role === 'guest') netStatus(`Collegato! Aspetta che ${hostName || NET.lobby[0]?.name || 'chi ha creato la stanza'} inizi la partita…`, 'ok');
}

async function onHostData(g, msg) {
  if (!msg || typeof msg !== 'object') return;
  g = g.alias || g;
  if (g.pending) {
    if (msg.t === 'rejoin') return handleRejoin(g, msg);
    try { g.conn.send({ t: 'busy' }); } catch {}
    setTimeout(() => { try { g.conn.close(); } catch {} }, 400);
    NET.guests = NET.guests.filter(x => x !== g);
    return;
  }
  if (msg.t === 'hello') {
    g.name = String(msg.name || 'Amico').slice(0, 14);
    g.char = typeof msg.char === 'string' ? msg.char : null;
    if (!gameRunning()) broadcastLobby();
    return;
  }
  if (msg.t === 'bye') { g.lost = false; clearTimeout(g.lostTimer); NET.guests = NET.guests.filter(x => x !== g); if (gameRunning()) { const idx = NET.active.indexOf(g) + 1; if (idx > 0) { netSend({ t: 'left', idx, name: g.name }); playerLeft(idx, g.name); } } else broadcastLobby(); return; }
  if (msg.t === 'again') {
    if ($('#endOverlay').hidden) return;
    $('#endNote').textContent = `${g.name} vuole la rivincita!`;
    $('#btnAgain').classList.add('primary');
    return;
  }
  if (RELAY.has(msg.t)) {
    netSend(msg, g);          // lo giro agli altri
    await applyAction(msg);   // e lo applico qui
  }
}

function handleRejoin(g, msg) {
  const name = String(msg.name || '');
  const slot = NET.active.find(x => x.lost && x.name === name);
  if (!slot) {
    try { g.conn.send({ t: 'busy' }); } catch {}
    NET.guests = NET.guests.filter(x => x !== g);
    return;
  }
  clearTimeout(slot.lostTimer);
  Object.assign(slot, { conn: g.conn, open: true, lost: false });
  g.alias = slot;
  NET.guests = NET.guests.filter(x => x !== g);
  NET.guests.push(slot);
  const idx = NET.active.indexOf(slot) + 1;
  try { slot.conn.send({ t: 'state', s: fullState(), me: idx }); } catch {}
  netSend({ t: 'note', text: `${slot.name} è tornato! Si riprende.` }, slot);
  say(`${slot.name} è tornato! Si riprende.`);
}

function fullState() {
  const keys = ['cur', 'round', 'rounds', 'rainbow', 'battle', 'drink', 'maxRolls', 'dice', 'held', 'colors', 'rollsLeft', 'rollsTotal', 'hasRolled', 'sel'];
  const st = Object.fromEntries(keys.map(k => [k, G[k]]));
  st.players = G.players.map(q => ({ name: q.name, scores: q.scores, extra: q.extra, hp: q.hp, out: !!q.out, ava: q.ava, charId: q.charId, rainbow: q.rainbow, battle: q.battle, drink: q.drink, drunk: q.drunk, drinks: q.drinks || [], tempFx: q.tempFx || 0, skip: !!q.skip, giroUsed: !!q.giroUsed }));
  return st;
}

function applyState(st, me) {
  if (!st) return;
  if (!G?.online) {
    startOnline(st.drink ? 'drink' : st.battle ? 'battle' : st.rainbow ? 'rainbow' : 'classic', st.players.map(p => p.name), me, st.players.map(p => p.charId));
  }
  const { players, ...rest } = st;
  Object.assign(G, rest);
  G.players.forEach((q, i) => Object.assign(q, players[i] || {}));
  G.online.me = me;
  G.online.gone = false;
  busy = false;
  $('#endOverlay').hidden = true;
  buildSheet();
  render();
  say('Ricollegato! Si riprende da dove eravamo.');
}

function netStartGame() {
  const rules = segValue('segOnRules');
  NET.active = NET.guests.filter(g => g.open && g.name);
  if (NET.active.length === 0) return netStatus('Serve almeno un amico nella stanza.', 'err');
  const names = [myName(), ...NET.active.map(g => g.name)];
  // nomi doppi: aggiungo un numero
  names.forEach((n, i) => { if (names.indexOf(n) !== i) names[i] = `${n} ${i + 1}`; });
  const chars = [myChar(), ...NET.active.map(g => g.char)];
  NET.active.forEach((g, i) => { try { g.conn.send({ t: 'start', rules, names, chars, me: i + 1 }); } catch {} });
  startOnline(rules, names, 0, chars);
}

/* ── Entrare in una stanza ── */

async function joinRoom(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (code.length < 4) return netStatus('Il codice della stanza ha 4 lettere.', 'err');
  netReset();
  localStorage.setItem('cd.name', myName());
  netStatus(`Mi collego alla stanza ${code}…`, 'wait');
  try { await loadPeerJS(); } catch { return netStatus('Non riesco a caricare il gioco online. Controlla la connessione.', 'err'); }
  NET.role = 'guest';
  NET.code = code;
  const peer = NET.peer = new window.Peer();
  peer.on('open', () => {
    connectToHost(false);
    NET.waitTimer = setTimeout(() => {
      if (!NET.open) netStatus('Non riesco a collegarmi. Controllate il codice, oppure provate col Wi-Fi: su alcune reti mobili il collegamento diretto non passa.', 'err');
    }, 15000);
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch {} });
  peer.on('error', err => { if (!NET.reconnecting) netStatus(netErrText(err), 'err'); });
}

function connectToHost(rejoin) {
  const conn = NET.host = NET.peer.connect(PEER_PREFIX + NET.code, { reliable: true });
  conn.on('open', () => {
    if (NET.host !== conn) return;
    NET.open = true;
    clearTimeout(NET.waitTimer);
    if (rejoin) {
      NET.reconnecting = false;
      netSend({ t: 'rejoin', name: G.players[G.online.me].name, char: myChar() });
    } else {
      netStatus('Collegato! Entro nella stanza…', 'ok');
      netSend({ t: 'hello', name: myName(), char: myChar() });
    }
  });
  conn.on('data', msg => { if (NET.host === conn) NET.queue = NET.queue.then(() => onGuestData(msg)).catch(() => {}); });
  conn.on('close', () => { if (NET.host === conn) onHostGone(); });
  conn.on('error', () => { if (NET.host === conn) onHostGone(); });
}

// La rete è caduta durante la partita: provo a ricollegarmi per un po'
function tryReconnect() {
  NET.reconnecting = true;
  say('Connessione persa: mi ricollego…');
  let tries = 0;
  const attempt = () => {
    if (!NET.reconnecting || !NET.peer) return;
    if (++tries > 8) {
      NET.reconnecting = false;
      G.online.gone = true;
      busy = false;
      render();
      return showGone('Non riesco a ricollegarmi alla stanza. Controlla la connessione e create una nuova stanza.');
    }
    try { if (NET.peer.disconnected) NET.peer.reconnect(); } catch {}
    connectToHost(true);
    NET.waitTimer = setTimeout(() => { if (!NET.open) attempt(); }, 3000);
  };
  attempt();
}

async function onGuestData(msg) {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.t) {
    case 'lobby':
      NET.lobby = Array.isArray(msg.players) ? msg.players.slice(0, MAX_ONLINE) : [];
      renderLobby(msg.host);
      break;
    case 'full': netStatus('La stanza è piena (massimo 4 giocatori).', 'err'); break;
    case 'busy': netStatus('In questa stanza c\'è una partita in corso: aspettate la fine e riprova.', 'err'); break;
    case 'start':
      startOnline(msg.rules, msg.names, msg.me, Array.isArray(msg.chars) ? msg.chars : []);
      break;
    case 'left':
      playerLeft(msg.idx, msg.name);
      break;
    case 'state':
      applyState(msg.s, msg.me);
      break;
    case 'note':
      if (G?.online) say(String(msg.text || '').slice(0, 140));
      break;
    case 'bye':
      onHostGone(true);
      break;
    default:
      if (RELAY.has(msg.t)) await applyAction(msg);
  }
}

/* ── Le mosse ── */

function startOnline(rules, names, me, chars = []) {
  $('#endOverlay').hidden = true;
  newGame({ mode: 'online', rainbow: rules === 'rainbow', battle: rules === 'battle', drink: rules === 'drink', names, me, chars });
}

function snapshot() {
  return { players: G.players.map(q => ({ scores: q.scores, extra: q.extra, hp: q.hp, out: !!q.out, drunk: q.drunk || 0, drinks: q.drinks || [], tempFx: q.tempFx || 0, skip: !!q.skip, giroUsed: !!q.giroUsed })), cur: G.cur, round: G.round };
}

async function applyAction(msg) {
  if (!G?.online || G.online.gone) return;
  switch (msg.t) {
    case 'roll':
      G.held = msg.held;
      await doRoll({ dice: msg.dice, colors: msg.colors });
      break;
    case 'hold':
      G.held = msg.held;
      Sound.click();
      render();
      break;
    case 'sel':
      G.sel = msg.id;
      Sound.click();
      render();
      break;
    case 'commit':
      commit(msg.id);
      break;
    case 'snap':
      // riallineo punteggi e turno, nel caso qualcosa si fosse perso
      if (!msg.s) return;
      msg.s.players.forEach((q, i) => { if (G.players[i]) Object.assign(G.players[i], q); });
      if (G.cur !== msg.s.cur || G.round !== msg.s.round) { G.cur = msg.s.cur; G.round = msg.s.round; }
      render();
      break;
    case 'giro':
      doGiro(msg.idx);
      break;
    case 'emote':
      say(`${String(msg.name || 'Un amico').slice(0, 14)}: ${String(msg.text || '').slice(0, 120)}`);
      mood('smirk', 2200);
      haptic(20);
      break;
  }
}

function netRematch() {
  if (NET.role === 'host') return netStartGame();
  netSend({ t: 'again' });
  $('#btnAgain').disabled = true;
  $('#endNote').textContent = 'Hai chiesto la rivincita: aspetta chi ha creato la stanza…';
}

/* ── Chi se ne va ── */

// Un giocatore lascia la partita: gli altri continuano, saltando i suoi turni
function playerLeft(idx, name) {
  if (!G?.online || !G.players[idx] || G.players[idx].out) return;
  G.players[idx].out = true;
  say(`${name || G.players[idx].name} si è scollegato: si continua senza di lui.`);
  if (alive().length < 2) {
    G.online.gone = true;
    busy = false;
    render();
    return showGone(`${name || 'Gli altri giocatori'} si è scollegato e sei rimasto da solo.`);
  }
  if (G.cur === idx && !G.online.over) {
    busy = false;
    G.sel = null;
    nextTurn();
    if (G.round > G.rounds) { render(); return endGame(); }
    startTurn();
  } else render();
}

const REJOIN_MS = 25000;

function onGuestGone(g) {
  if (g.alias) { if (g.alias.conn !== g.conn) return; g = g.alias; }
  if (!NET.guests.includes(g)) return;
  NET.guests = NET.guests.filter(x => x !== g);
  if (g.pending) return;
  if (gameRunning()) {
    const idx = NET.active.indexOf(g) + 1;
    if (idx > 0) {
      // gli do un po' di tempo per ricollegarsi prima di toglierlo dalla partita
      g.open = false;
      g.lost = true;
      say(`${g.name} ha perso la connessione: lo aspettiamo un attimo…`);
      netSend({ t: 'note', text: `${g.name} ha perso la connessione: lo aspettiamo un attimo…` });
      clearTimeout(g.lostTimer);
      g.lostTimer = setTimeout(() => {
        if (!g.lost || !gameRunning()) return;
        g.lost = false;
        netSend({ t: 'left', idx, name: g.name });
        playerLeft(idx, g.name);
      }, REJOIN_MS);
    }
  } else if (NET.role === 'host') {
    if (g.name) netStatus(`${g.name} è uscito dalla stanza.`, 'err');
    broadcastLobby();
  }
}

function onHostGone(final = false) {
  if (!NET.host) return;
  NET.open = false;
  NET.host = null;
  if (!final && gameRunning() && !G.online.gone) return tryReconnect();
  const name = NET.lobby[0]?.name || 'Chi ha creato la stanza';
  if (G?.online && $('#game').classList.contains('active') && !G.online.gone) {
    G.online.gone = true;
    busy = false;
    render();
    showGone(`${name} (che ha creato la stanza) si è scollegato. Potete crearne una nuova quando volete.`);
  } else {
    netStatus(`${name} ha chiuso la stanza.`, 'err');
    $('#lobbyBox').hidden = true;
  }
}

function showGone(note) {
  $('#endTitle').textContent = 'Collegamento perso';
  $('#endScores').innerHTML = '';
  $('#endNote').textContent = note;
  $('#btnNext').hidden = true;
  $('#btnAgain').hidden = true;
  $('#btnEndMenu').textContent = 'Menù';
  $('#endOverlay').hidden = false;
}

/* ── Battute e condivisione ── */

function sendEmote(text) {
  if (!G?.online || G.online.gone) return;
  netSend({ t: 'emote', text, name: G.players[G.online.me].name });
  say(`Tu: ${text.split('|')[0]}`);
  haptic(10);
}

function buildEmotes() {
  $('#emotes').innerHTML = EMOTES.map((e, i) => `<button class="emote" data-i="${i}">${esc(e.split('|')[0])}</button>`).join('');
}

async function shareRoom() {
  const url = roomLink(NET.code);
  const text = `Sfidami a Yatzy con Tziu Gonario! Codice stanza: ${NET.code} (fino a 4 giocatori)`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Yatzy', text, url }); return; }
  } catch { return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); netStatus('Link copiato: incollalo su WhatsApp ai tuoi amici.', 'ok'); }
  catch { netStatus(`Manda questo link ai tuoi amici: ${url}`, 'ok'); }
}

function initOnline() {
  $('#onName').value = localStorage.getItem('cd.name') || '';
  initSeg('segOnRules');
  buildEmotes();
  $('#btnOnline').addEventListener('click', () => show('online'));
  $('#btnHost').addEventListener('click', hostRoom);
  $('#btnStartOnline').addEventListener('click', netStartGame);
  $('#btnJoin').addEventListener('click', () => joinRoom($('#joinCode').value));
  $('#joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('#joinCode').value); });
  $('#btnShare').addEventListener('click', shareRoom);
  $('#emotes').addEventListener('click', e => { const b = e.target.closest('.emote'); if (b) sendEmote(EMOTES[Number(b.dataset.i)]); });
  // link d'invito: ?stanza=ABCD
  const code = new URLSearchParams(location.search).get('stanza');
  if (code) {
    history.replaceState(null, '', location.pathname);
    show('online');
    $('#joinCode').value = code.toUpperCase();
    setTimeout(() => joinRoom(code), 300);
  }
}

/* ───────────── Tutorial guidato (solo se richiesto) ───────────── */

const TUT_STEPS = [
  { text: 'Ajò! Ti insegno Yatzy in un minuto. Ogni turno hai tre lanci per fare la combinazione migliore.', next: true },
  { target: '#btnRoll', text: 'Tocca "Lancia" (o il bossolo) per lanciare i cinque dadi.', wait: 'roll' },
  { target: '#tray', text: 'Tocca i dadi che ti piacciono: si sollevano e restano fermi. Gli altri li rilanci.', wait: 'hold', next: true },
  { target: '#btnRoll', text: 'Ora rilancia quelli che non hai tenuto. Ti resta ancora un lancio dopo questo.', wait: 'roll' },
  { target: '#board', text: 'Ogni tessera mostra quanto vale con questi dadi. La migliore brilla. Toccane una per sceglierla.', wait: 'sel' },
  { target: '#btnScore', text: 'Toccala di nuovo, o premi "Segna", per confermare. Ogni casella si usa una volta sola.', wait: 'commit' },
  { target: '.bonusbar', text: 'Parte alta: la somma degli 1, dei 2… fino ai 6. Arriva a 63 e prendi 35 punti di bonus: la pecorella ti mostra quanto manca.', next: true },
  { target: '.b-lower', text: 'Parte bassa: Tris, Poker, Full (25), Scale (30 e 40), Yatzy (50) e Chance. In tutto 13 turni.', next: true },
  { text: 'Consigli da pastore: punta ai 5 e ai 6 per il bonus, tieni la Chance per i turni sfortunati, e non sprecare lo Yatzy troppo presto. Buona partita!', next: true, last: true },
];
const TUT = { on: false, i: 0 };

function startTutorial() {
  clearSave();
  newGame({ mode: 'solo', level: 'normal', name1: '' });
  TUT.on = true; TUT.i = 0;
  document.body.classList.add('tut');
  showTutStep();
}

function showTutStep() {
  const st = TUT_STEPS[TUT.i];
  document.querySelectorAll('.coach-on').forEach(el => el.classList.remove('coach-on'));
  if (!st) return endTutorial();
  const box = $('#coach');
  box.hidden = false;
  setLine(box.querySelector('.coach-text'), st.text);
  box.querySelector('.coach-step').textContent = `${TUT.i + 1} / ${TUT_STEPS.length}`;
  const nextBtn = box.querySelector('[data-next]');
  nextBtn.hidden = !st.next;
  nextBtn.textContent = st.last ? 'Gioca!' : st.wait ? 'Ho capito' : 'Avanti';
  if (st.target) {
    const el = $(st.target);
    if (el) { el.classList.add('coach-on'); el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }); }
  }
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
}

function tutEvent(name) {
  if (!TUT.on) return;
  const st = TUT_STEPS[TUT.i];
  if (st && st.wait === name) { TUT.i++; setTimeout(showTutStep, name === 'roll' ? 300 : 150); }
}

function endTutorial() {
  TUT.on = false;
  document.body.classList.remove('tut');
  $('#coach').hidden = true;
  document.querySelectorAll('.coach-on').forEach(el => el.classList.remove('coach-on'));
}

/* ───────────── Più giocatori sullo stesso telefono ───────────── */

const LOCAL = { count: 2, names: ['', '', '', ''], chars: [null, 'tenore', 'boe', 'jana'] };
function buildLocalRows() {
  // personaggi di partenza tutti diversi (e diversi dal tuo), finché non li cambiate
  if (!LOCAL.touched) {
    const free = PLAYER_CHARS.map(c => c.id).filter(id => id !== myChar());
    for (let i = 1; i < 4; i++) LOCAL.chars[i] = free[(i - 1) % free.length];
  }
  $('#localRows').innerHTML = Array.from({ length: LOCAL.count - 1 }, (_, k) => {
    const i = k + 1, c = PLAYER_CHARS.find(x => x.id === LOCAL.chars[i]);
    return `<div class="lp-row">
      <button class="lp-ava" data-i="${i}" title="Tocca per cambiare personaggio">${avatarHTML(charSrc(LOCAL.chars[i]))}<small>${c ? c.name : ''}</small></button>
      <input class="input lp-name" data-i="${i}" maxlength="14" placeholder="Giocatore ${i + 1}" value="${esc(LOCAL.names[i] || '')}" autocomplete="off">
    </div>`;
  }).join('');
}

/* ───────────── Schermata opzioni ───────────── */

function openOptions() {
  const set = (id, v) => document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle('on', b.dataset.v === v));
  set('optSpeed', OPTS.fast ? 'fast' : 'normal');
  set('optText', OPTS.big ? 'big' : 'normal');
  set('optTease', OPTS.tease ? 'on' : 'off');
  set('optMusic', OPTS.music ? 'on' : 'off');
  set('optSound', Sound.on ? 'on' : 'off');
  set('optShake', Shake.on ? 'on' : 'off');
  set('optLight', OPTS.lightfx ? 'light' : 'full');
  show('options');
}
function applyOpts() {
  document.body.classList.toggle('fast', OPTS.fast);
  document.body.classList.toggle('big', OPTS.big);
}
function initOptions() {
  applyOpts();
  initSeg('optSpeed', v => { OPTS.fast = v === 'fast'; saveOpts(); applyOpts(); });
  initSeg('optText', v => { OPTS.big = v === 'big'; saveOpts(); applyOpts(); });
  initSeg('optTease', v => { OPTS.tease = v === 'on'; saveOpts(); if (OPTS.tease) say(pick(SARDO.near), '#optSay'); else say('Va bene, starò zitto… o quasi.', '#optSay'); });
  initSeg('optLight', v => { OPTS.lightfx = v === 'light'; saveOpts(); });
  initSeg('optMusic', v => { OPTS.music = v === 'on'; saveOpts(); Music.refresh(); });
  initSeg('optSound', v => { if ((v === 'on') !== Sound.on) toggleSound(); });
  initSeg('optShake', async v => { if ((v === 'on') !== Shake.on) { await toggleShake(); if ((v === 'on') !== Shake.on) openOptions(); } });
  $('#btnOptions').addEventListener('click', openOptions);
}

/* ───────────── Profilo: nome e personaggio ───────────── */

let pickedChar = null;
function openProfile(first = false) {
  pickedChar = myChar() || null;
  $('#profName').value = profileName();
  $('#profTitle').textContent = first ? 'Benvenuto! Chi sei?' : 'Il tuo personaggio';
  $('#profBack').hidden = first;
  $('#profGrid').innerHTML = PLAYER_CHARS.map(c => `
    <button class="pchar ${c.id === pickedChar ? 'on' : ''}" data-id="${c.id}">
      <span class="pchar-img">${avatarHTML(charSrc(c.id), c.name)}</span>
      <b>${c.name}</b><small>${c.desc}</small>
    </button>`).join('');
  refreshProfileBtn();
  show('profile');
  say(first ? 'Ajò! Prima di cominciare: dimmi come ti chiami e scegli chi vuoi essere.' : 'Cambia pure, bellu meu. Anche il pastore cambia pascolo.', '#profSay');
}

function refreshProfileBtn() {
  const ok = !!pickedChar && $('#profName').value.trim().length > 0;
  $('#profOk').disabled = !ok;
  $('#profOk').textContent = ok ? `Gioca come ${PLAYER_CHARS.find(c => c.id === pickedChar).name}` : 'Scrivi il nome e scegli un personaggio';
}

function saveProfile() {
  const name = $('#profName').value.trim().slice(0, 14);
  if (!name || !pickedChar) return;
  localStorage.setItem('cd.name', name);
  localStorage.setItem('cd.char', pickedChar);
  $('#name1').value = name;
  $('#onName').value = name;
  Sound.score(true);
  show('menu');
}

function refreshMenuProfile() {
  const src = charSrc(myChar());
  $('#btnProfile').innerHTML = src
    ? `<i class="chip-ava">${avatarHTML(src)}</i><span>${esc(profileName() || 'Tu')} · ${PLAYER_CHARS.find(c => c.id === myChar()).name}</span><em>cambia</em>`
    : '<span>Scegli il tuo personaggio</span>';
}

/* ───────────── Schermate e controlli ───────────── */

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $('#endOverlay').hidden = true;
  $('#facePick').hidden = true;
  if (id !== 'game' && TUT.on) endTutorial();
  if (id !== 'game') { for (let k = 1; k <= 4; k++) document.body.classList.remove(`drunk-${k}`); wobbleCup(false); document.body.classList.remove('tavern'); }
  if (id === 'menu') { refreshMenu(); refreshMenuProfile(); }
  if (id === 'game') Music.play(G?.adv && stageOf()?.id === 'mammuthones' ? 'notte' : 'bgm');
  else if (id !== 'game') Music.play('bgm');
  if (id === 'map') renderMap();
  if (id === 'menu' && NET.peer) netLeave();
}

function refreshMenu() {
  $('#btnContinue').hidden = !localStorage.getItem(SAVE_KEY);
  const best = localStorage.getItem(BEST_KEY);
  $('#bestScore').textContent = Number(best) > 0 ? `Record personale: ${best}` : '';
}

function refreshSound() {
  $('#btnSound').textContent = `♪ Suoni: ${Sound.on ? 'sì' : 'no'}`;
  $('#btnSound2').textContent = Sound.on ? '♪' : '♪̸';
  $('#btnSound2').style.opacity = Sound.on ? 1 : 0.45;
}
function refreshShake() {
  $('#btnShake').textContent = `📳 Agita per lanciare: ${Shake.on ? 'sì' : 'no'}`;
}
async function toggleShake() {
  if (!Shake.on) {
    if (!(await Shake.permit())) { $('#btnShake').textContent = '📳 Sensore di movimento non disponibile'; return; }
    Shake.attach();
  }
  Shake.on = !Shake.on;
  localStorage.setItem('cd.shake', Shake.on ? '1' : '0');
  refreshShake();
  haptic(20);
}

function toggleSound() {
  Sound.on = !Sound.on;
  localStorage.setItem('cd.sound', Sound.on ? '1' : '0');
  refreshSound();
  if (Sound.on) Sound.click();
}

function segValue(id) { return $(`#${id} .on`).dataset.v; }
function initSeg(id, onChange) {
  $(`#${id}`).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $(`#${id}`).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    onChange?.(b.dataset.v);
  });
}

function init() {
  document.querySelectorAll('[data-mentor]').forEach((el, k) => { el.innerHTML = MENTOR_HTML; });
  // nel riquadro della partita: il personaggio di chi è di turno, con Tziu Gonario nel medaglione
  $('.mentor [data-mentor]').insertAdjacentHTML('beforeend',
    `<img class="turn-ava" alt="" draggable="false"><span class="tziu-badge" aria-hidden="true"><img src="${G_DIR}idle.webp" alt=""></span>`);
  buildTray();
  FX.init();
  document.querySelectorAll('.deco').forEach(d => { d.innerHTML = cubeHTML(); });
  refreshSound();
  refreshShake();
  $('#btnShake').addEventListener('click', toggleShake);
  document.querySelectorAll('[data-mentor]').forEach(el => {
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Parla con Tziu Gonario');
    el.addEventListener('click', () => pokeMentor(el));
  });
  addEventListener('pointermove', e => lookAt(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', e => { lookAt(e.clientX, e.clientY); idleReset(); }, { passive: true });
  addEventListener('keydown', idleReset);
  idleReset();
  (function blinkLoop() {
    setTimeout(() => {
      document.querySelectorAll('[data-mentor]').forEach(el => {
        if (el.dataset.mood || el.dataset.talking || !el.offsetParent) return;
        el.classList.add('blinking');
        setTimeout(() => el.classList.remove('blinking'), 140);
      });
      blinkLoop();
    }, 2200 + Math.random() * 3600);
  })();
  setTimeout(() => say('Ajò! Sono Tziu Gonario… hic! Toccami quando vuoi: ho un proverbio per ogni lancio. E un bicchiere per ogni proverbio.', '#menuSay'), 600);
  // all'apertura: Tziu Gonario singhiozza col suo bicchiere (una volta per sessione)
  setTimeout(() => loadClip('g-singhiozzo', `${G_DIR}singhiozzo.webp`), 400);
  setTimeout(() => {
    if ($('#menu').classList.contains('active') && clips['g-singhiozzo']) cameo(pick(SARDO.ubriaco), 'cheer', true, 'g-singhiozzo');
  }, 4500);
  // ogni tanto un singhiozzo
  (function hicLoop() {
    setTimeout(() => { hiccup(); hicLoop(); }, 9000 + Math.random() * 9000);
  })();
  if (Shake.on) {
    Shake.attach();
    // su iPhone il permesso va chiesto dopo un tocco
    addEventListener('click', () => Shake.permit(), { once: true });
  }
  $('#cup').innerHTML = CUP_SVG;
  $('#cup').addEventListener('click', humanRoll);
  $('#cameo').addEventListener('click', () => { $('#cameo').hidden = true; });
  // lanciare toccando il tavolo
  $('#tray').addEventListener('click', e => { if (!e.target.closest('.die')) humanRoll(); });
  refreshMenu();

  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  $('#btnClassic').addEventListener('click', () => show('setup'));
  $('#btnRules').addEventListener('click', () => show('rules'));
  $('#btnContinue').addEventListener('click', resume);
  $('#btnAdventure').addEventListener('click', () => show('map'));
  $('#mapList').addEventListener('click', e => { const b = e.target.closest('.stage'); if (b && !b.disabled) openBrief(Number(b.dataset.i)); });
  initSeg('segCharm', v => { $('#charmDesc').textContent = v ? CHARMS[v].desc + ' Una volta per partita.' : ''; });
  $('#btnPlayStage').addEventListener('click', startStage);
  $('#btnCharm').addEventListener('click', useCharm);
  $('#btnGiro').addEventListener('click', offerGiro);
  $('#btnBetYes').addEventListener('click', () => answerBet(true));
  $('#btnBetNo').addEventListener('click', () => answerBet(false));
  $('#btnNext').addEventListener('click', () => openBrief(G.adv.stage + 1));
  $('#btnSound').addEventListener('click', toggleSound);
  $('#btnSound2').addEventListener('click', () => {
    toggleSound();
    OPTS.music = Sound.on; saveOpts(); Music.refresh();
  });

  const savedName = localStorage.getItem('cd.name') || '';
  $('#name1').value = savedName;
  initSeg('segMode', v => {
    $('#levelBox').hidden = v !== 'cpu';
    $('#localBox').hidden = v !== 'duo';
    $('#name1').placeholder = v === 'duo' ? 'Primo giocatore (tu)' : 'Il tuo nome';
    if (v === 'duo') buildLocalRows();
  });
  initSeg('segCount', v => { LOCAL.count = Number(v); buildLocalRows(); });
  $('#localRows').addEventListener('click', e => {
    const b = e.target.closest('.lp-ava'); if (!b) return;
    const i = Number(b.dataset.i), ids = PLAYER_CHARS.map(c => c.id);
    LOCAL.chars[i] = ids[(ids.indexOf(LOCAL.chars[i]) + 1) % ids.length];
    LOCAL.touched = true;
    Sound.click();
    buildLocalRows();
  });
  $('#localRows').addEventListener('input', e => { const inp = e.target.closest('.lp-name'); if (inp) LOCAL.names[Number(inp.dataset.i)] = inp.value; });
  initSeg('segLevel');
  initSeg('segRules', v => {
    $('#rulesDesc').textContent = {
      rainbow: 'Ogni dado ha un colore: rubino, smeraldo o zaffiro. Due caselle in più: Monocolore (40) e Full di colori (20). 15 turni.',
      drink: 'Dadi colorati e 5 bicchieri a testa. Ogni combinazione fa bere all\'avversario una bevanda sarda: Ichnusa, vino nieddu, mirto, Vermentino, Cannonau e, per lo Yatzy, filu \'e ferru. La parte alta fa smaltire con pane carasau, culurgiones, casu marzu e salsiccia. Una volta puoi offrire un giro a tutti. Chi finisce i bicchieri è cottu!',
      battle: 'Si parte da 150 punti vita. La parte alta cura te, la parte bassa attacca l\'avversario. Vince chi lo manda a zero. Si gioca in due (da solo diventa contro Tziu Gonario).',
    }[v] || '';
  });
  $('#btnStart').addEventListener('click', () => {
    const name1 = $('#name1').value.trim();
    localStorage.setItem('cd.name', name1);
    clearSave();
    const rules = segValue('segRules');
    let mode = segValue('segMode');
    if ((rules === 'battle' || rules === 'drink') && mode === 'solo') mode = 'cpu';
    const names = [name1, ...LOCAL.names.slice(1, LOCAL.count).map(n => (n || '').trim())];
    const chars = [myChar(), ...LOCAL.chars.slice(1, LOCAL.count)];
    newGame({ mode, level: segValue('segLevel'), rainbow: rules === 'rainbow', battle: rules === 'battle', drink: rules === 'drink', name1, names, chars });
  });

  initOnline();
  initOptions();
  $('#btnLearn').addEventListener('click', startTutorial);
  $('#btnLearn2').addEventListener('click', startTutorial);
  $('#coach').addEventListener('click', e => {
    if (e.target.closest('[data-skip]')) return endTutorial();
    if (e.target.closest('[data-next]')) { TUT.i++; showTutStep(); }
  });
  addEventListener('pointerdown', () => Music.unlock(), { once: true });
  addEventListener('keydown', () => Music.unlock(), { once: true });
  $('#btnProfile').addEventListener('click', () => openProfile(false));
  $('#profBack').addEventListener('click', () => show('menu'));
  $('#profGrid').addEventListener('click', e => {
    const b = e.target.closest('.pchar'); if (!b) return;
    pickedChar = b.dataset.id;
    document.querySelectorAll('#profGrid .pchar').forEach(x => x.classList.toggle('on', x === b));
    b.classList.remove('cheer'); void b.offsetWidth; b.classList.add('cheer');
    Sound.click(); haptic(10);
    refreshProfileBtn();
  });
  $('#profName').addEventListener('input', refreshProfileBtn);
  $('#profOk').addEventListener('click', saveProfile);
  refreshMenuProfile();
  // alla prima apertura: nome e personaggio (ma non se si arriva da un invito)
  if (!myChar() && !new URLSearchParams(location.search).get('stanza')) setTimeout(() => openProfile(true), 50);
  $('#btnRoll').addEventListener('click', humanRoll);
  $('#board').addEventListener('click', e => { const t = e.target.closest('.tile'); if (t && !t.disabled) choose(t.dataset.id); });
  $('#btnSheet').addEventListener('click', () => {
    const open = document.body.classList.toggle('sheet-open');
    $('#btnSheet').textContent = open ? 'Chiudi il foglio completo' : 'Foglio completo di tutti i giocatori';
    if (open) $('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#btnScore').addEventListener('click', () => { if (G?.sel) choose(G.sel); });
  $('#sheet').addEventListener('click', e => {
    const td = e.target.closest('td'); const tr = e.target.closest('tr[data-id]');
    if (!tr || !G) return;
    if (td && td.dataset.p !== undefined && Number(td.dataset.p) !== G.cur) return;
    choose(tr.dataset.id);
  });
  $('#btnQuit').addEventListener('click', () => { if (!busy) { if (G?.online) netLeave(); show(G?.adv ? 'map' : G?.online ? 'online' : 'menu'); } });
  $('#btnAgain').addEventListener('click', () => {
    if (G?.online) return netRematch();
    newGame(lastSetup);
  });
  $('#btnEndMenu').addEventListener('click', () => { if (G?.online) netLeave(); show(G?.adv ? 'map' : 'menu'); });

  // Tastiera (PC): spazio = lancia, 1-5 = tieni dado, invio = segna
  document.addEventListener('keydown', e => {
    if (!$('#game').classList.contains('active') || e.target.matches('input')) return;
    if (e.code === 'Space') { e.preventDefault(); humanRoll(); }
    else if (/^Digit[1-5]$/.test(e.code)) dieClick(Number(e.code.slice(5)) - 1);
    else if (e.code === 'Enter' && G?.sel) choose(G.sel);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
