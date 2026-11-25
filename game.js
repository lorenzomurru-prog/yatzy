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
  { id: 'cinq',   label: 'Cinquina',    hint: 'Cinque uguali · 50' },
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
    desc: 'Tra pecore e muretti a secco comincia il viaggio. Tziu Gonario vuole vedere come lanci.',
    goal: { type: 'score', min: 120 }, goalText: 'Fai almeno 120 punti', stars: [170, 220], unlock: 'ritorno',
    intro: 'Ajò! Prima di partire fammi vedere come lanci. Arriva a 120 punti!' },
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
    desc: 'Nel bar del paese si gioca in fretta: tutti hanno solo due lanci per turno. Il barista lancia e via, senza pensarci troppo.',
    foe: { name: 'Il barista', img: 'barista', icon: '🍷', level: 'normal', style: 'impulsivo',
      quote: 'Un lancio, un bicchiere, e via! Qui non si perde tempo.',
      lines: ['Alla salute!', 'Offre la casa!'] },
    rolls: 2, goal: { type: 'beat' }, goalText: 'Batti il barista con soli 2 lanci per turno', stars: [170, 210] },
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
const stageUnlocked = (a, i) => i === 0 || (a.stars[STAGES[i - 1].id] || 0) > 0;
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
  cinq: ['Per mille querce! Cinque petali uguali sullo stesso fiore!', 'Cinque uguali! Come uno stormo che vola tutto insieme!', 'Una cinquina! Più rara di un quadrifoglio… anzi, di un cinquefoglio!'],
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
  extra: ['Un\'altra cinquina: +100! Due arcobaleni nello stesso giorno!'],
  teaseBad: ['Che lancio… nemmeno una lumaca bendata avrebbe fatto peggio.', 'Questi dadi sembrano foglie secche: sparsi e senza un perché.', 'Hai seminato sassi, caro mio. Non aspettarti il grano.', 'Un lancio così l\'ho visto fare solo a un riccio con i guanti.', 'Mmm. Anche il cuculo, quando sbaglia nido, fa più bella figura.'],
  teaseNear: ['Ahia! Eri a un passo, come la volpe sotto l\'uva.', 'Quasi! Il pesce ha toccato l\'amo… e se n\'è andato ridendo.', 'Per un dado! Come il fiore che sboccia il giorno dopo la festa.', 'Così vicino! Il picchio ci prova cento volte, tu riprovaci.'],
  teaseZero: ['Uno zero? Hai il pollice verde di un cactus di plastica.', 'Zero tondo, come un sasso di fiume. Almeno è liscio.', 'Hai appena innaffiato il deserto. Coraggio!', 'Zero. Perfino il bruco ride, e non ha nemmeno la bocca grande.'],
  teaseWaste: ['Sicuro? Stai buttando le ciliegie e tenendo i noccioli.', 'Raccogli le mele acerbe quando quelle mature sono lì a terra?', 'Ehm… c\'era un fungo porcino e hai preso il sasso accanto.'],
  gloat: ['Eja! Il vecchio olivastro piega ma non si spezza!', 'Imparerai, giovane germoglio. Imparerai.', 'Eh eh! La tartaruga arriva sempre, lo sai.', 'Questa radice è vecchia, ma tiene ancora!'],
  cheer: ['Eja! Così si coltiva un campo!', 'Mi\'! Che bellezza, bellu meu!', 'Che raccolto! Mi hai fatto ballare la barba!', 'Splendido! Le api fanno festa!'],
  wisdom: [
    'Il fiume non spinge l\'acqua: aspetta che scenda. Così si aspetta il dado giusto.',
    'La Chance è come l\'ombrello: meglio tenerla per i giorni di pioggia.',
    'Chi insegue la cinquina a ogni costo è come chi aspetta la neve ad agosto.',
    'I numeri alti sono come le mele in cima all\'albero: valgono di più, ma bisogna arrivarci.',
    'Sessantatré punti in alto, e il bonus fiorisce come un ciliegio a primavera.',
    'Un dado tenuto è un seme piantato; un dado rilanciato è un seme affidato al vento.',
    'Fai come la formica: tre dadi uguali per ogni numero in alto, e il bonus arriva da sé.',
    'La scala si costruisce come un nido: un rametto alla volta.',
    'Le api non si fermano su un solo fiore. Non fissarti su una sola casella.',
    'La luna cambia ogni notte, eppure torna sempre piena. Così fa la fortuna.',
    'Il bambù cresce in silenzio per anni, poi tocca il cielo in un attimo. Pazienza!',
    'Uno zero sulla cinquina è come prosciugare il pozzo: pensaci bene prima.',
    'Un full è un piccolo frutteto: tre meli e due peri.',
    'Le stagioni non hanno fretta, e nemmeno i dadi.',
    'Il seme più piccolo, nel terreno giusto, diventa la quercia più grande. Anche un tris di uno, a volte, salva la partita.',
    'Quando il vento cambia, il saggio sposta la vela: se i dadi non vengono, cambia casella.',
    'Ehi, mi fai il solletico alla barba! Lancia, che è meglio.',
    'Il maestrale non chiede permesso: arriva e cambia tutto. Come una cinquina.',
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
  ],
  slow: [
    'Ajò, ca est tardu!|Dai, che è tardi!',
    'Ses prus lentu de una tostoine.|Sei più lento di una tartaruga.',
    'Ajò, chi su sole est artu!|Dai, che il sole è alto!',
    'Pàsia, pàsia…|Calma, calma…',
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
  ],
  cinq: ['A chent\'annos!|Cent\'anni!'],
  gloat: [
    'Su becciu at galu sas dentes!|Il vecchio ha ancora i denti!',
    'Imparadu as? Como torra a cumintzare.|Hai imparato? Ora ricomincia.',
  ],
};
// A volte in sardo, a volte in italiano
const sline = (key, sd, p = 0.4) => (SARDO[sd] && Math.random() < p ? pick(SARDO[sd]) : line(key));
const TEASE_SD = { teaseBad: 'bad', teaseNear: 'near', teaseZero: 'bad', teaseWaste: 'bad' };

// Ogni tanto Tziu Gonario ti prende in giro (con affetto)
const tease = (key, chance = 0.55) => { if (Math.random() < chance) { say(sline(key, TEASE_SD[key])); mood('smirk', 2600); return true; } return false; };

// Espressioni: '' (sorriso), 'happy', 'wow', 'sad', 'think'
let moodTimer = null;
function mood(m, ms = 2400) {
  document.querySelectorAll('[data-mentor]').forEach(el => { el.dataset.mood = m; setPose(el, m); });
  clearTimeout(moodTimer);
  if (ms) moodTimer = setTimeout(() => mood('', 0), ms);
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
function pokeMentor(el) {
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
function idleReset() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const inGame = $('#game').classList.contains('active');
    const inMenu = $('#menu').classList.contains('active');
    if (inGame && G && !busy && !curP().cpu) {
      if (Math.random() < 0.45) { say(pick(SARDO.slow)); mood('smirk', 2000); }
      else { say(line('wisdom')); mood('think', 1500); }
    }
    else if (inMenu) say(line('wisdom'), '#menuSay');
    idleReset();
  }, 16000);
}

/* ───────────── Stato ───────────── */

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SAVE_KEY = 'cd.save', BEST_KEY = 'cd.best';

let G = null;          // partita in corso
let lastSetup = null;  // per la rivincita
let busy = false;      // animazione o turno del computer

const curP = () => G.players[G.cur];
const rolled = () => G.hasRolled;
const stageOf = () => (G?.adv ? STAGES[G.adv.stage] : null);
const ROLL_WORDS = ['nessun lancio', 'un lancio', 'due lanci', 'tre lanci', 'quattro lanci', 'cinque lanci'];

// setup: { mode: 'cpu'|'duo'|'solo'|'adv', level, name1, name2, stage, charm }
function newGame(setup) {
  if (setup.mode === 'adv') {
    const st = STAGES[setup.stage];
    setup = { ...setup, rainbow: st.rules === 'rainbow', battle: st.rules === 'battle' };
  }
  lastSetup = setup;
  const mk = (name, cpu = false) => ({ name, cpu, scores: {}, extra: 0, rainbow: !!setup.rainbow, battle: !!setup.battle, hp: MAX_HP });
  const players = [mk(setup.name1 || (setup.mode === 'duo' ? 'Giocatore 1' : 'Tu'))];
  let level = setup.level, maxRolls = 3, adv = null;
  if (setup.mode === 'cpu') players.push(mk('Tziu Gonario', true));
  if (setup.mode === 'duo') players.push(mk(setup.name2 || 'Giocatore 2'));
  if (setup.mode === 'adv') {
    const st = STAGES[setup.stage];
    if (st.foe) {
      const foe = mk(st.foe.name, true);
      foe.icon = st.foe.icon;
      foe.img = st.foe.img;
      foe.style = st.foe.style;
      foe.lines = st.foe.lines;
      foe.extra = st.foe.head || 0;
      if (st.foe.hp) foe.hp = foe.maxHp = st.foe.hp;
      players.push(foe);
      level = st.foe.level;
    }
    maxRolls = st.rolls || 3;
    adv = { stage: setup.stage, charm: setup.charm || null, charmUsed: false, armed: null, double: false };
  }
  G = { players, cur: 0, round: 1, rounds: catsOf(players[0]).length, rainbow: !!setup.rainbow, battle: !!setup.battle, colors: ['', '', '', '', ''], level, maxRolls, adv, dice: [0, 0, 0, 0, 0], held: [false, false, false, false, false], rollsLeft: maxRolls, rollsTotal: maxRolls, hasRolled: false, sel: null };
  show('game');
  buildSheet();
  const st = stageOf();
  say(st ? (st.intro || `${st.place}: ${st.goalText.toLowerCase()}. Coraggio!`) : line('start'));
  startTurn(true);
}

function save() {
  if (!G) return;
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

// Clip animata (WebP con trasparenza): si scarica una volta e riparte da capo a ogni cinquina
let clipBlob = null;
fetch(`${G_DIR}ballo.webp`).then(r => (r.ok ? r.blob() : null)).then(b => { clipBlob = b; }).catch(() => {});
const CLIP_MS = 5200;

// Tziu Gonario entra in scena per festeggiare (non blocca il gioco)
let lastCameo = 0;
function cameo(text, kind = 'cheer', force = false) {
  if (reducedMotion) return;
  if (!force && Date.now() - lastCameo < 20000) return;
  lastCameo = Date.now();
  const box = $('#cameo');
  setLine(box.querySelector('.cameo-say'), text);
  const clip = kind === 'wow' && clipBlob;
  box.className = `cameo ${kind}${clip ? ' clip' : ''}`;
  const clipImg = box.querySelector('.cameo-clip');
  if (clip) {
    if (clipImg.dataset.url) URL.revokeObjectURL(clipImg.dataset.url);
    clipImg.dataset.url = URL.createObjectURL(clipBlob);
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

async function rollDice(which) {
  busy = true;
  G.sel = null;
  Sound.rattle();
  haptic(25);
  const dieEls = [...document.querySelectorAll('#tray .die')];
  const cup = $('#cup');
  const cr = cup.getBoundingClientRect();
  cup.classList.remove('pour'); void cup.offsetWidth; cup.classList.add('pour');
  await sleep(reducedMotion ? 0 : 260);
  which.forEach(i => {
    const el = dieEls[i];
    const dr = el.getBoundingClientRect();
    el.style.setProperty('--fx', `${Math.round(cr.left + cr.width * 0.3 - (dr.left + dr.width / 2))}px`);
    el.style.setProperty('--fy', `${Math.round(cr.top + cr.height * 0.2 - (dr.top + dr.height / 2))}px`);
    G.dice[i] = rnd6();
    if (G.rainbow) { G.colors[i] = rndGem(); el.dataset.c = G.colors[i]; }
    el.classList.remove('rolling', 'blank');
    void el.offsetWidth;
    el.style.setProperty('--d', `${Math.floor(Math.random() * 140)}ms`);
    el.classList.add('rolling');
    setDie(el, G.dice[i], true);
  });
  await sleep(reducedMotion ? 120 : 950);
  dieEls.forEach(el => el.classList.remove('rolling'));
  cup.classList.remove('pour');
  haptic(12);
  busy = false;
}

async function doRoll() {
  await rollDice([0, 1, 2, 3, 4].filter(i => !G.held[i]));
  G.rollsLeft--;
  G.hasRolled = true;
  render();
  react();
}

function react() {
  const d = G.dice, c = counts(d), human = !curP().cpu;
  if (isCinq(d)) { mood('wow', 3000); say(line('cinq')); cameo(Math.random() < 0.5 ? SARDO.cinq[0] : line('cinq'), 'wow', true); Sound.fanfare(); FX.confetti(); haptic([40, 60, 40, 60, 80]); }
  else if (hasRun(d, 5)) { mood('happy'); say(line('large')); if (human) cameo(line('large'), 'dance'); FX.burstAt($('#tray'), 50); haptic([30, 40, 30]); }
  else if (c.includes(3) && c.includes(2)) { mood('happy'); say(line('full')); FX.burstAt($('#tray'), 35); }
  else if (Math.max(...c) === 4) { if (!(human && G.rollsLeft === 0 && tease('teaseNear', 0.6))) { mood('happy'); say(line('poker')); } }
  else if (G.rainbow && colorCounts(G.colors)[0] === 5) { mood('wow'); say(line('mono')); FX.burstAt($('#tray'), 45); }
  else if (hasRun(d, 4)) { if (!(human && G.rollsLeft === 0 && tease('teaseNear', 0.4))) say(line('small')); }
  else if (human && Math.max(...c) <= 2 && tease('teaseBad', G.rollsLeft === 0 ? 0.7 : 0.3)) {}
  else if (human) say(G.rollsLeft === 0 ? line('last') : line('hold'));
}

async function humanRoll() {
  if (busy || curP().cpu || G.rollsLeft === 0) return;
  if (G.adv) G.adv.armed = null;
  await doRoll();
}

async function dieClick(i) {
  if (busy || curP().cpu || !rolled()) return;
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
  render();
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
  if (busy || curP().cpu || !rolled() || curP().scores[id] !== undefined) return;
  if (G.sel === id) return commit(id);
  G.sel = id;
  Sound.click();
  render();
}

function commit(id) {
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
  if (sc === 0 && !msg && !p.cpu) { if (Math.random() < 0.55) { msg = sline('teaseZero', 'bad', 0.4); mood('smirk', 2600); } else { msg = line('zero'); mood('sad'); } }
  else if (!msg && !p.cpu && sc > 0 && sc + 15 <= bestAvail && Math.random() < 0.6) { msg = sline('teaseWaste', 'bad', 0.35); mood('smirk', 2600); }
  else if (!msg && p.cpu && p.name === 'Tziu Gonario' && sc >= 25 && Math.random() < 0.6) { msg = sline('gloat', 'gloat', 0.5); mood('happy'); }
  else if (!msg && p.cpu && p.lines && sc >= 25 && Math.random() < 0.6) { msg = `${p.name}: «${pick(p.lines)}»`; mood('sad'); }
  if (!p.cpu && (sc >= 30 || (!hadBonus && bonusOf(p) > 0))) cameo(sline('cheer', 'good', 0.5), sc >= 40 ? 'dance' : 'cheer');
  if (bonusOf(p) > 0 && !hadBonus) mood('happy');
  let ko = false;
  if (G.battle) {
    const opp = G.players[1 - G.cur];
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
    if (hit) { battleFx(1 - G.cur, `−${hit}`, 'hit'); msg = line('attack', { n: p.name, d: hit }); mood(p.cpu ? 'sad' : 'happy'); }
    else if (heal) { battleFx(G.cur, `+${heal}`, 'heal'); msg = line('heal', { d: heal }); }
    else if (!msg) msg = CAT[id].face ? line('healFull') : line('zero');
    if (opp.hp <= 0) { ko = true; msg = line('ko', { n: opp.name }); mood('wow', 3000); }
  }
  if (msg) say(msg);
  sc === 0 ? Sound.zero() : G.battle && !CAT[id].face ? Sound.hit(sc) : Sound.score(sc >= 25 || msg);
  G.sel = null;
  flashCell(id, G.cur);
  if (sc > 0 && !G.battle) popScore(id, G.cur, `+${sc}`, sc >= 25);
  haptic(sc ? (G.battle && !CAT[id].face ? [30, 30, 60] : 18) : [10, 40, 10]);
  if (ko) { busy = true; render(); setTimeout(() => { busy = false; endGame(); }, 900); return; }

  G.cur = (G.cur + 1) % G.players.length;
  if (G.cur === 0) G.round++;
  if (G.round > G.rounds) { render(); return endGame(); }
  save();
  setTimeout(() => startTurn(), msg ? 900 : 450);
  render();
}

async function cpuTurn() {
  busy = true;
  const p = curP();
  if (G.battle) p._oppHp = G.players[1 - G.cur].hp;
  render();
  await sleep(900);
  while (G.rollsLeft > 0) {
    await doRoll();
    busy = true; render();
    if (G.rollsLeft === 0) break;
    await sleep(650);
    const keep = bestKeep(G.dice, p, G.level, G.rainbow ? G.colors : undefined);
    if (keep === 31) break;
    let changed = false;
    for (let i = 0; i < 5; i++) {
      const h = !!((keep >> i) & 1);
      if (G.held[i] !== h) { G.held[i] = h; changed = true; }
    }
    if (changed) { Sound.click(); render(); await sleep(650); }
  }
  await sleep(500);
  const id = bestCategory(G.dice, p, G.level, G.rainbow ? G.colors : undefined);
  G.sel = id;
  render();
  await sleep(900);
  busy = false;
  commit(id);
}

function endGame() {
  clearSave();
  const ps = G.players;
  const totals = ps.map(shownTotal);
  const top = Math.max(...totals);
  const human = G.battle ? [] : ps.filter(p => !p.cpu).map(totalOf);
  const prevBest = Number(localStorage.getItem(BEST_KEY) || 0);
  const best = Math.max(prevBest, ...human);
  if (best > 0) localStorage.setItem(BEST_KEY, best);

  let title;
  if (ps.length === 1) title = `${top} punti!`;
  else if (totals.every(t => t === top)) title = 'Pareggio!';
  else title = `Ha vinto ${ps[totals.indexOf(top)].name}!`;
  let note = best > prevBest ? `Nuovo record personale: ${best}!` : `Il tuo record: ${best}`;
  if (G.battle) {
    const w = ps[totals.indexOf(top)];
    note = totals.includes(0) ? `${ps[totals.indexOf(0)].name} è rimasto senza punti vita.` : `Caselle finite: ${w.name} ha più punti vita.`;
    if (totals.every(t => t === top)) note = 'Stessi punti vita: la battaglia finisce alla pari.';
  }
  let starsHtml = '';

  $('#btnNext').hidden = true;
  $('#btnAgain').textContent = G.adv ? 'Riprova' : 'Rivincita';
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
    `<div class="end-row ${totals[i] === top ? 'win' : ''}"><span>${esc(p.name)}</span><b>${totals[i]}${G.battle ? ' <small>PV</small>' : ''}</b></div>`).join('');
  $('#endNote').textContent = note;
  Sound.fanfare();
  const won = G.adv ? title === 'Missione compiuta!' : !ps[totals.indexOf(top)].cpu;
  setTimeout(() => { $('#endOverlay').hidden = false; if (won) FX.confetti(); }, 700);
}

/* ───────────── Mappa e briefing ───────────── */

let briefStage = 0;

function renderMap() {
  const a = loadAdv();
  const total = STAGES.reduce((n, s) => n + (a.stars[s.id] || 0), 0);
  $('#mapStars').textContent = `★ ${total} / ${STAGES.length * 3}`;
  $('#mapList').innerHTML = STAGES.map((s, i) => {
    const open = stageUnlocked(a, i), st = a.stars[s.id] || 0;
    return `<button class="stage ${open ? '' : 'locked'} ${st ? 'done' : ''}" data-i="${i}" ${open ? '' : 'disabled'}>
      <span class="medal">${open ? avatarHTML(s.foe ? rivalSrc(s.foe.img) : s.portrait) : '🔒'}</span>
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
  $('#briefIcon').innerHTML = avatarHTML(s.foe ? rivalSrc(s.foe.img) : s.portrait);
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

const haptic = pattern => { try { navigator.vibrate?.(pattern); } catch {} };

// Numeri che salgono invece di cambiare di colpo
const rivalSrc = img => `img/rivali/${img}.webp`;
const avatarHTML = (src, alt = '') => `<img class="ava" src="${src}" alt="${alt}" draggable="false">`;

const shownTotal = q => (G?.battle ? q.hp : totalOf(q));

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
    `<div class="chip${G.battle ? ' battle' : ''}" data-p="${j}"><span>${q.img ? `<i class="chip-ava">${avatarHTML(rivalSrc(q.img))}</i>` : q.icon ? q.icon + ' ' : ''}${esc(q.name)}</span><b data-val="${shownTotal(q)}">${shownTotal(q)}</b>${G.battle ? '<div class="hp"><i></i></div>' : ''}</div>`).join('');
  buildBoard();
  $('#sheet').className = 'sheet' + (two ? ' two' : '');
  $('#sheet').innerHTML = head + '<tbody>' +
    UPPER.map(row).join('') +
    sumRow('upper', 'Parte alta') +
    sumRow('bonus', `Bonus <small>(63 → +35)</small>`) +
    LOWER.filter(c => !c.rainbow || G.rainbow).map(row).join('') +
    sumRow('extra', 'Extra <small>(cinquine, elisir)</small>') +
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
  const tile = (id, inner, cls = '') => `<button class="tile ${cls}" data-id="${id}" aria-label="${CAT[id].label}"><span class="t-top">${inner}</span><span class="t-val"></span><i class="t-check" aria-hidden="true">✓</i></button>`;
  $('#board').classList.toggle('battle', !!G.battle);
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
      val.textContent = G.battle && v ? (CAT[id].face ? `+${Math.min(v, maxHpOf(p) - p.hp)}` : `−${v}`) : v;
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
  const canAct = !busy && !p.cpu;

  $('#roundNo').textContent = Math.min(G.round, G.rounds);
  $('#roundOf').textContent = G.rounds;

  // giocatori
  document.querySelectorAll('#players .chip').forEach(ch => {
    const j = Number(ch.dataset.p);
    ch.classList.toggle('on', j === G.cur);
    const q = G.players[j];
    animateNum(ch.querySelector('b'), shownTotal(q));
    if (G.battle) {
      ch.querySelector('.hp i').style.width = `${Math.round(q.hp / maxHpOf(q) * 100)}%`;
      ch.classList.toggle('low', q.hp <= 30);
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
  $('#sheet tr.total .lbl span').textContent = G.battle ? 'Punti vita' : 'Totale';
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

/* ───────────── Schermate e controlli ───────────── */

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  $('#endOverlay').hidden = true;
  $('#facePick').hidden = true;
  if (id === 'menu') refreshMenu();
  if (id === 'map') renderMap();
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
  setTimeout(() => say('Ajò! Sono Tziu Gonario. Toccami quando vuoi: ho un proverbio per ogni lancio.', '#menuSay'), 600);
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
  $('#btnNext').addEventListener('click', () => openBrief(G.adv.stage + 1));
  $('#btnSound').addEventListener('click', toggleSound);
  $('#btnSound2').addEventListener('click', toggleSound);

  const savedName = localStorage.getItem('cd.name') || '';
  $('#name1').value = savedName;
  initSeg('segMode', v => {
    $('#levelBox').hidden = v !== 'cpu';
    $('#name2').hidden = v !== 'duo';
    $('#name1').placeholder = v === 'duo' ? 'Primo giocatore' : 'Il tuo nome';
  });
  initSeg('segLevel');
  initSeg('segRules', v => {
    $('#rulesDesc').textContent = {
      rainbow: 'Ogni dado ha un colore: rubino, smeraldo o zaffiro. Due caselle in più: Monocolore (40) e Full di colori (20). 15 turni.',
      battle: 'Si parte da 150 punti vita. La parte alta cura te, la parte bassa attacca l\'avversario. Vince chi lo manda a zero. Si gioca in due (da solo diventa contro Tziu Gonario).',
    }[v] || '';
  });
  $('#btnStart').addEventListener('click', () => {
    const name1 = $('#name1').value.trim();
    localStorage.setItem('cd.name', name1);
    clearSave();
    const rules = segValue('segRules');
    let mode = segValue('segMode');
    if (rules === 'battle' && mode === 'solo') mode = 'cpu';
    newGame({ mode, level: segValue('segLevel'), rainbow: rules === 'rainbow', battle: rules === 'battle', name1, name2: $('#name2').value.trim() });
  });

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
  $('#btnQuit').addEventListener('click', () => { if (!busy) show(G?.adv ? 'map' : 'menu'); });
  $('#btnAgain').addEventListener('click', () => newGame(lastSetup));
  $('#btnEndMenu').addEventListener('click', () => show(G?.adv ? 'map' : 'menu'));

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
