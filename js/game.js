(() => {
  "use strict";

  // ======================= Labirinto =======================
  // '#' = parede, '.' = corredor. A linha 10 tem túnel nas bordas.
  const MAP = [
    "#####################",
    "#...................#",
    "#.#####.##########.##",
    "#.#####.##########.##",
    "#...................#",
    "#.##########.######.#",
    "#.##########.######.#",
    "#...................#",
    "##.##########.####.##",
    "##.##########.####.##",
    ".....................",
    "#.#####.###########.#",
    "#.#####.###########.#",
    "#...................#",
    "#.#######.########.##",
    "#.#######.########.##",
    "#...................#",
    "##.###.############.#",
    "##.###.############.#",
    "#...................#",
    "#.####.######.#####.#",
    "#.####.######.#####.#",
    "#...................#",
    "#####################",
  ];
  const COLS = MAP[0].length;
  const ROWS = MAP.length;

  // Posição de cada ficha: linha, coluna inicial e quantas casas ocupa (horizontal).
  // Todas continuam alcançáveis mesmo com as demais fichas no mapa.
  const SLOTS = {
    CPU: { r: 1, c: 3, len: 2 },
    MICROCONTROLADOR: { r: 1, c: 9, len: 8 },
    DATABUS: { r: 4, c: 3, len: 4 },
    RAM: { r: 4, c: 14, len: 2 },
    MEMORIADEMASSA: { r: 7, c: 4, len: 7 },
    ULA: { r: 7, c: 16, len: 2 },
    DMA: { r: 10, c: 3, len: 2 },
    FLASH: { r: 10, c: 15, len: 3 },
    EEPROM: { r: 13, c: 2, len: 3 },
    REGISTRADORES: { r: 13, c: 11, len: 7 },
    UC: { r: 16, c: 3, len: 2 },
    QUADCORE: { r: 16, c: 12, len: 4 },
    ADDRESSBUS: { r: 19, c: 8, len: 5 },
    ROM: { r: 19, c: 16, len: 2 },
    CACHE: { r: 22, c: 2, len: 3 },
    DUALCORE: { r: 22, c: 14, len: 4 },
  };

  const CHIP_COLORS = ["#3be8ff", "#ff3b8d", "#3dff8a", "#ffa53b", "#b06bff", "#ffd23f"];

  const PLAYER_START = { x: 10, y: 22 };
  const GHOST_DEFS = [
    { x: 9, y: 10, color: "#ff4d6d", mira: 0 },   // persegue o jogador
    { x: 11, y: 10, color: "#3be8ff", mira: 4 },  // mira à frente do jogador
  ];
  const PLAYER_SPEED = 6.2;       // casas por segundo
  const GHOST_SPEED = 4.3;
  const GHOST_SPEED_STEP = 0.07;  // acelera um pouco a cada acerto
  const LIVES = 3;
  const READY_TIME = 1.3;
  const DEATH_TIME = 1.5;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const DIR_LIST = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];

  // ======================= DOM =======================
  const $ = (id) => document.getElementById(id);
  const canvas = $("jogo");
  const ctx = canvas.getContext("2d");
  const stage = $("stage");
  const el = {
    pergunta: $("pergunta"),
    perguntaBox: $("pergunta-box"),
    progresso: $("progresso"),
    pontos: $("pontos"),
    vidas: $("vidas"),
    toast: $("toast"),
    telaInicio: $("telaInicio"),
    telaPausa: $("telaPausa"),
    telaFim: $("telaFim"),
    fimTitulo: $("fimTitulo"),
    fimTexto: $("fimTexto"),
    btnPausa: $("btnPausa"),
  };
  const optAleatoria = [$("optAleatoria"), $("optAleatoriaFim")];
  const optFantasmas = [$("optFantasmas"), $("optFantasmasPausa"), $("optFantasmasFim")];

  // ======================= Estado =======================
  const game = {
    state: "start", // start | ready | playing | dying | paused | gameover | win
    pausedFrom: null,
    order: [],
    qIndex: 0,
    score: 0,
    lives: LIVES,
    chips: [],
    grid: [],
    player: null,
    ghosts: [],
    ghostsOn: true,
    timer: 0,
    wrongChip: null,
    particles: [],
    floaters: [],
    time: 0,
  };

  // ======================= Utilidades do mapa =======================
  const isTunnelRow = (y) => MAP[y] && MAP[y][0] === "." && MAP[y][COLS - 1] === ".";
  function isOpen(x, y) {
    if (y < 0 || y >= ROWS) return false;
    if (x < 0 || x >= COLS) return isTunnelRow(y);
    return MAP[y][x] === ".";
  }
  const wrapX = (x) => ((x % COLS) + COLS) % COLS;
  const sameDir = (a, b) => a && b && a.x === b.x && a.y === b.y;
  const isOpposite = (a, b) => a && b && a.x === -b.x && a.y === -b.y && (a.x || a.y);

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ======================= Entidades =======================
  function makeEntity(x, y, speed) {
    return { x, y, tx: x, ty: y, dir: { x: 0, y: 0 }, face: { x: -1, y: 0 }, next: null, speed };
  }

  // Move a entidade casa a casa. chooseDir é chamado sempre que ela está no centro de uma casa.
  function stepEntity(e, dt, chooseDir) {
    let dist = e.speed * dt;
    let guard = 0;
    while (dist > 1e-6 && guard++ < 8) {
      if (e.x === e.tx && e.y === e.ty) {
        const d = chooseDir(e);
        if (!d) { e.dir = { x: 0, y: 0 }; return; }
        e.dir = d;
        e.face = d;
        e.tx = e.x + d.x;
        e.ty = e.y + d.y;
      }
      const rem = Math.abs(e.tx - e.x) + Math.abs(e.ty - e.y);
      const s = Math.min(dist, rem);
      e.x += e.dir.x * s;
      e.y += e.dir.y * s;
      dist -= s;
      if (s >= rem - 1e-9) {
        e.x = e.tx;
        e.y = e.ty;
        if (e.x < 0 || e.x >= COLS) { e.x = wrapX(e.x); e.tx = e.x; }
      }
    }
  }

  function playerChoose(p) {
    if (p.next && isOpen(p.x + p.next.x, p.y + p.next.y)) return p.next;
    if ((p.dir.x || p.dir.y) && isOpen(p.x + p.dir.x, p.y + p.dir.y)) return p.dir;
    return null;
  }

  function ghostChoose(g) {
    const p = game.player;
    const options = DIR_LIST.filter((d) => isOpen(g.x + d.x, g.y + d.y) && !isOpposite(d, g.dir));
    if (options.length === 0) {
      const back = DIR_LIST.find((d) => isOpposite(d, g.dir) && isOpen(g.x + d.x, g.y + d.y));
      return back || null;
    }
    if (Math.random() < 0.3) return options[Math.floor(Math.random() * options.length)];
    const pd = (p.dir.x || p.dir.y) ? p.dir : p.face;
    const alvoX = p.x + pd.x * g.mira;
    const alvoY = p.y + pd.y * g.mira;
    let best = options[0];
    let bestD = Infinity;
    for (const d of options) {
      const dx = g.x + d.x - alvoX;
      const dy = g.y + d.y - alvoY;
      const dd = dx * dx + dy * dy;
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }

  // ======================= Fluxo do jogo =======================
  function buildChips() {
    game.chips = WORDS.map((w, i) => {
      const s = SLOTS[w.palavra];
      return { word: w.palavra, idx: i, r: s.r, c: s.c, len: s.len, eaten: false, color: CHIP_COLORS[i % CHIP_COLORS.length] };
    });
    rebuildGrid();
  }

  function rebuildGrid() {
    game.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    for (const ch of game.chips) {
      if (ch.eaten) continue;
      for (let i = 0; i < ch.len; i++) game.grid[ch.r][ch.c + i] = ch;
    }
  }

  function resetPositions() {
    game.player = makeEntity(PLAYER_START.x, PLAYER_START.y, PLAYER_SPEED);
    const speed = GHOST_SPEED + GHOST_SPEED_STEP * game.qIndex;
    game.ghosts = GHOST_DEFS.map((d, i) => {
      const g = makeEntity(d.x, d.y, speed);
      g.color = d.color;
      g.mira = d.mira;
      g.dir = i === 0 ? DIRS.left : DIRS.right;
      g.face = g.dir;
      return g;
    });
  }

  function currentWord() {
    const i = game.order[game.qIndex];
    return i === undefined ? null : WORDS[i];
  }

  function startGame() {
    const aleatoria = optAleatoria[0].checked;
    game.order = WORDS.map((_, i) => i);
    if (aleatoria) shuffle(game.order);
    game.qIndex = 0;
    game.score = 0;
    game.lives = LIVES;
    game.particles = [];
    game.floaters = [];
    game.wrongChip = null;
    game.ghostsOn = optFantasmas[0].checked;
    buildChips();
    resetPositions();
    hideOverlays();
    toReady();
    updateHud();
  }

  function toReady() {
    game.state = "ready";
    game.timer = READY_TIME;
    showToast("Pronto!", "");
  }

  function hideOverlays() {
    el.telaInicio.hidden = true;
    el.telaPausa.hidden = true;
    el.telaFim.hidden = true;
  }

  function eatCorrect(chip) {
    chip.eaten = true;
    rebuildGrid();
    game.score += 100;
    const cx = chip.c + chip.len / 2;
    const cy = chip.r + 0.5;
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 6;
      game.particles.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7 + Math.random() * 0.4, max: 1.1, color: chip.color });
    }
    game.floaters.push({ x: cx, y: cy, text: "+100", life: 1 });
    flashBox("acerto");
    game.qIndex++;
    for (const g of game.ghosts) g.speed = GHOST_SPEED + GHOST_SPEED_STEP * game.qIndex;
    updateHud();
    if (game.qIndex >= WORDS.length) win();
  }

  function die(motivo, chip) {
    game.state = "dying";
    game.timer = DEATH_TIME;
    game.wrongChip = chip || null;
    game.lives--;
    updateHud();
    flashBox("erro");
    showToast(motivo, "erro");
  }

  function afterDeath() {
    game.wrongChip = null;
    if (game.lives <= 0) {
      endScreen(false);
      return;
    }
    resetPositions();
    toReady();
  }

  function win() {
    game.state = "win";
    hideToast();
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 3 + Math.random() * 8;
        game.particles.push({ x: 3 + k * 5, y: 4 + (k % 2) * 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, max: 1.2, color: CHIP_COLORS[(i + k) % CHIP_COLORS.length] });
      }
    }
    setTimeout(() => endScreen(true), 900);
  }

  function endScreen(venceu) {
    game.state = venceu ? "win" : "gameover";
    hideToast();
    el.fimTitulo.textContent = venceu ? "Você venceu!" : "Fim de jogo";
    el.fimTitulo.style.color = venceu ? "var(--verde)" : "var(--vermelho)";
    el.fimTexto.textContent = venceu
      ? `Respondeu as 16 perguntas! Pontuação: ${game.score}.`
      : `Acertos: ${game.qIndex}/16 · Pontuação: ${game.score}.`;
    if (venceu) el.pergunta.textContent = "Parabéns! Você dominou a Arquitetura Computacional!";
    el.telaFim.hidden = false;
    $("btnDeNovo").focus({ preventScroll: true });
  }

  function togglePause() {
    if (game.state === "paused") {
      el.telaPausa.hidden = true;
      game.state = game.pausedFrom;
      game.pausedFrom = null;
      el.btnPausa.textContent = "❚❚";
      el.btnPausa.setAttribute("aria-label", "Pausar");
    } else if (game.state === "playing" || game.state === "ready" || game.state === "dying") {
      game.pausedFrom = game.state;
      game.state = "paused";
      el.telaPausa.hidden = false;
      el.btnPausa.textContent = "▶";
      el.btnPausa.setAttribute("aria-label", "Continuar");
      $("btnContinuar").focus({ preventScroll: true });
    }
  }

  // ======================= HUD =======================
  function updateHud() {
    const w = currentWord();
    if (game.state !== "start" && w) el.pergunta.textContent = w.pergunta;
    el.progresso.textContent = `${game.qIndex}/${WORDS.length}`;
    el.pontos.textContent = game.score;
    el.vidas.innerHTML = "";
    for (let i = 0; i < LIVES; i++) {
      const s = document.createElement("span");
      s.className = "vida" + (i < game.lives ? "" : " perdida");
      el.vidas.appendChild(s);
    }
    el.vidas.setAttribute("aria-label", `${game.lives} vidas`);
  }

  let flashTimer = null;
  function flashBox(cls) {
    el.perguntaBox.classList.remove("acerto", "erro");
    void el.perguntaBox.offsetWidth;
    el.perguntaBox.classList.add(cls);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.perguntaBox.classList.remove(cls), 700);
  }

  function showToast(text, cls) {
    el.toast.textContent = text;
    el.toast.className = "toast" + (cls ? " " + cls : "");
    el.toast.hidden = false;
  }
  function hideToast() { el.toast.hidden = true; }

  // ======================= Atualização =======================
  function update(dt) {
    game.time += dt;
    updateEffects(dt);

    if (game.state === "ready") {
      game.timer -= dt;
      if (game.timer <= 0) { game.state = "playing"; hideToast(); }
      return;
    }
    if (game.state === "dying") {
      game.timer -= dt;
      if (game.timer <= 0) afterDeath();
      return;
    }
    if (game.state !== "playing") return;

    const p = game.player;
    // Inverter o sentido no meio do caminho, como no clássico.
    if (p.next && isOpposite(p.next, p.dir) && !(p.x === p.tx && p.y === p.ty)) {
      p.tx -= p.dir.x;
      p.ty -= p.dir.y;
      p.dir = p.next;
      p.face = p.next;
    }
    stepEntity(p, dt, playerChoose);

    // Comeu alguma ficha? (casa sob o centro do personagem)
    const cx = wrapX(Math.round(p.x));
    const cy = Math.round(p.y);
    const chip = game.grid[cy] && game.grid[cy][cx];
    if (chip) {
      const w = currentWord();
      if (w && chip.word === w.palavra) eatCorrect(chip);
      else { die("Resposta errada!", chip); return; }
      if (game.state !== "playing") return;
    }

    if (game.ghostsOn) {
      for (const g of game.ghosts) {
        stepEntity(g, dt, ghostChoose);
        let dx = Math.abs(g.x - p.x);
        dx = Math.min(dx, COLS - dx);
        const dy = Math.abs(g.y - p.y);
        if (dx + dy < 0.65) { die("Pego por um fantasma!"); return; }
      }
    }
  }

  function updateEffects(dt) {
    for (const pt of game.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.life -= dt;
    }
    game.particles = game.particles.filter((pt) => pt.life > 0);
    for (const f of game.floaters) { f.y -= dt * 1.5; f.life -= dt; }
    game.floaters = game.floaters.filter((f) => f.life > 0);
  }

  // ======================= Desenho =======================
  let T = 20;          // tamanho da casa em px CSS
  let dpr = 1;
  let wallLayer = null;

  function resize() {
    const r = stage.getBoundingClientRect();
    const t = Math.max(8, Math.min(r.width / COLS, r.height / ROWS));
    T = Math.floor(t * 4) / 4;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(T * COLS);
    const h = Math.round(T * ROWS);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    buildWallLayer();
  }

  function buildWallLayer() {
    wallLayer = document.createElement("canvas");
    wallLayer.width = canvas.width;
    wallLayer.height = canvas.height;
    const c = wallLayer.getContext("2d");
    c.scale(dpr, dpr);
    c.fillStyle = "#05060f";
    c.fillRect(0, 0, COLS * T, ROWS * T);

    // pontilhado discreto de "placa de circuito" nos corredores
    c.fillStyle = "rgba(80, 110, 220, 0.12)";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (MAP[y][x] === ".") c.fillRect((x + 0.5) * T - 1, (y + 0.5) * T - 1, 2, 2);
      }
    }

    const wall = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS && MAP[y][x] === "#";
    const m = T * 0.18; // recuo da borda neon
    c.fillStyle = "#0a1240";
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!wall(x, y)) continue;
        const x0 = x * T + (wall(x - 1, y) ? 0 : m);
        const x1 = (x + 1) * T - (wall(x + 1, y) ? 0 : m);
        const y0 = y * T + (wall(x, y - 1) ? 0 : m);
        const y1 = (y + 1) * T - (wall(x, y + 1) ? 0 : m);
        c.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    // bordas neon onde a parede encosta no corredor
    c.strokeStyle = "#2f6bff";
    c.lineWidth = Math.max(1.5, T * 0.09);
    c.lineCap = "round";
    c.shadowColor = "#2f6bff";
    c.shadowBlur = T * 0.35;
    c.beginPath();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!wall(x, y)) continue;
        const L = x * T + (wall(x - 1, y) ? 0 : m);
        const R = (x + 1) * T - (wall(x + 1, y) ? 0 : m);
        const U = y * T + (wall(x, y - 1) ? 0 : m);
        const D = (y + 1) * T - (wall(x, y + 1) ? 0 : m);
        if (!wall(x, y - 1)) { c.moveTo(L, U); c.lineTo(R, U); }
        if (!wall(x, y + 1)) { c.moveTo(L, D); c.lineTo(R, D); }
        if (!wall(x - 1, y)) { c.moveTo(L, U); c.lineTo(L, D); }
        if (!wall(x + 1, y)) { c.moveTo(R, U); c.lineTo(R, D); }
      }
    }
    c.stroke();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  const CHIP_FONT = 'bold %spx "Trebuchet MS", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function drawChip(ch) {
    const x = ch.c * T + T * 0.08;
    const w = ch.len * T - T * 0.16;
    const h = T * 0.98;
    const y = ch.r * T + (T - h) / 2;
    const errada = game.wrongChip === ch;
    const blink = errada && Math.floor(game.time * 8) % 2 === 0;
    const cor = errada ? "#ff4d5e" : ch.color;

    // "pinos" do chip em cima e embaixo
    ctx.fillStyle = cor;
    const pins = Math.max(2, ch.len * 2);
    for (let i = 0; i < pins; i++) {
      const px = x + (w / pins) * (i + 0.5) - T * 0.04;
      ctx.fillRect(px, y - T * 0.1, T * 0.08, T * 0.1);
      ctx.fillRect(px, y + h, T * 0.08, T * 0.1);
    }

    roundRect(ctx, x, y, w, h, T * 0.18);
    ctx.fillStyle = blink ? "#5a0f1a" : "#0e1433";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, T * 0.08);
    ctx.strokeStyle = cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = T * 0.3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // texto ajustado para caber, sempre legível
    let size = T * 0.62;
    ctx.font = CHIP_FONT.replace("%s", size.toFixed(1));
    const avail = w - T * 0.24;
    let tw = ctx.measureText(ch.word).width;
    let sx = 1;
    if (tw > avail) {
      const k = avail / tw;
      if (k >= 0.8) sx = k;
      else { sx = 0.8; size *= k / 0.8; ctx.font = CHIP_FONT.replace("%s", size.toFixed(1)); }
    }
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + size * 0.04);
    ctx.scale(sx, 1);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch.word, 0, 0);
    ctx.restore();
  }

  function drawPlayer() {
    const p = game.player;
    const cx = (p.x + 0.5) * T;
    const cy = (p.y + 0.5) * T;
    const r = T * 0.44;
    const ang = Math.atan2(p.face.y, p.face.x);
    let mouth;
    if (game.state === "dying") {
      const k = 1 - Math.max(0, game.timer) / DEATH_TIME; // 0 -> 1
      mouth = Math.min(Math.PI, 0.25 + k * Math.PI * 1.1);
    } else if (game.state === "playing" && (p.dir.x || p.dir.y)) {
      mouth = 0.08 + Math.abs(Math.sin(game.time * 14)) * 0.42;
    } else {
      mouth = 0.3;
    }
    ctx.save();
    ctx.shadowColor = "#ffd23f";
    ctx.shadowBlur = T * 0.5;
    ctx.fillStyle = "#ffd23f";
    if (game.state === "dying") ctx.globalAlpha = Math.max(0.15, game.timer / DEATH_TIME);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, ang + mouth, ang + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGhost(g) {
    const cx = (g.x + 0.5) * T;
    const cy = (g.y + 0.5) * T;
    const r = T * 0.42;
    ctx.save();
    ctx.shadowColor = g.color;
    ctx.shadowBlur = T * 0.4;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
    const base = cy + r * 0.85;
    ctx.lineTo(cx + r, base);
    const waves = 4;
    const off = Math.sin(game.time * 10) * r * 0.08;
    for (let i = 0; i < waves; i++) {
      const x1 = cx + r - ((i + 0.5) * 2 * r) / waves;
      const x2 = cx + r - ((i + 1) * 2 * r) / waves;
      ctx.quadraticCurveTo(x1, base - r * 0.3 + (i % 2 ? off : -off), x2, base);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // olhos
    const d = g.face;
    for (const s of [-1, 1]) {
      const ex = cx + s * r * 0.38;
      const ey = cy - r * 0.2;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.26, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a2a9a";
      ctx.beginPath();
      ctx.arc(ex + d.x * r * 0.12, ey + d.y * r * 0.14, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (wallLayer) ctx.drawImage(wallLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const ch of game.chips) if (!ch.eaten) drawChip(ch);

    if (game.player && game.state !== "start") {
      if (game.ghostsOn && game.state !== "dying") for (const g of game.ghosts) drawGhost(g);
      if (game.state !== "gameover") drawPlayer();
    }

    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x * T - T * 0.08, pt.y * T - T * 0.08, T * 0.16, T * 0.16);
    }
    ctx.globalAlpha = 1;
    for (const f of game.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = CHIP_FONT.replace("%s", (T * 0.8).toFixed(1));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = T * 0.12;
      ctx.strokeStyle = "#05060f";
      ctx.strokeText(f.text, f.x * T, f.y * T);
      ctx.fillStyle = "#3dff8a";
      ctx.fillText(f.text, f.x * T, f.y * T);
    }
    ctx.globalAlpha = 1;
  }

  // ======================= Laço principal =======================
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ======================= Controles =======================
  function setDir(name) {
    if (!game.player || !DIRS[name]) return;
    game.player.next = DIRS[name];
  }

  const KEYS = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  };

  window.addEventListener("keydown", (e) => {
    const dir = KEYS[e.code];
    if (dir) {
      e.preventDefault();
      setDir(dir);
      return;
    }
    if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      togglePause();
      return;
    }
    if ((e.code === "Enter" || e.code === "Space") && game.state === "start" && document.activeElement.tagName !== "BUTTON") {
      e.preventDefault();
      startGame();
    }
  }, { passive: false });

  // Deslizar o dedo no labirinto
  let swipe = null;
  canvas.addEventListener("pointerdown", (e) => {
    swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignora */ }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    swipe.x = e.clientX;
    swipe.y = e.clientY;
  });
  const endSwipe = () => { swipe = null; };
  canvas.addEventListener("pointerup", endSwipe);
  canvas.addEventListener("pointercancel", endSwipe);
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // Direcional na tela
  document.querySelectorAll("#dpad .dp").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      setDir(b.dataset.dir);
      b.classList.add("ativo");
    });
    const off = () => b.classList.remove("ativo");
    b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off);
    b.addEventListener("pointercancel", off);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  $("dpad").addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // Botões e opções
  $("btnComecar").addEventListener("click", startGame);
  $("btnDeNovo").addEventListener("click", startGame);
  $("btnContinuar").addEventListener("click", togglePause);
  $("btnReiniciar").addEventListener("click", () => { el.telaPausa.hidden = true; startGame(); });
  el.btnPausa.addEventListener("click", (e) => { togglePause(); e.currentTarget.blur(); });

  function syncChecks(list, value) { list.forEach((c) => { c.checked = value; }); }
  optAleatoria.forEach((c) => c.addEventListener("change", () => syncChecks(optAleatoria, c.checked)));
  optFantasmas.forEach((c) => c.addEventListener("change", () => {
    syncChecks(optFantasmas, c.checked);
    game.ghostsOn = c.checked;
  }));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (game.state === "playing" || game.state === "ready")) togglePause();
  });

  // ======================= Início =======================
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  syncChecks(optAleatoria, optAleatoria[0].checked);
  syncChecks(optFantasmas, optFantasmas[0].checked);
  game.ghostsOn = optFantasmas[0].checked;
  buildChips();
  resetPositions();
  updateHud();
  resize();
  requestAnimationFrame(frame);

  // Acesso para testes automatizados e depuração.
  window.ArqMan = { game, SLOTS, MAP, startGame };
})();
