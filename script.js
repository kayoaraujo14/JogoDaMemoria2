/* === SCRIPT PRINCIPAL — JOGO DA MEMÓRIA SICREDI === */

// ===== UTILITÁRIAS =====
const getEl = (id) => document.getElementById(id);

// ===== ELEMENTOS DOM =====
const screens = {
  cadastro: getEl('cadastro-section'),
  jogo: getEl('jogo-section'),
  premio: getEl('premio-section'),
  fail: getEl('fail-section'),
};
const tecladoAlfanumericoContainer = getEl('teclado-alfanumerico');
const form = getEl('cadastro-form');
const erroMsg = getEl('cadastro-erro');
const tecladoVirtual = getEl('teclado-virtual');
const board = getEl('game-board');
const btnCSV = getEl('baixar-csv');
const btnVoltarPremio = getEl('voltar-cadastro-premio');
const btnVoltarFail = getEl('voltar-cadastro-fail');
const btnSettings = getEl('btn-settings');
const overlay = getEl('settings-overlay');
const btnCloseSettings = getEl('settings-close');
const radioTempoJogo = document.querySelectorAll('input[name="tempo-jogo"]');
const radioTempoMemorizar = document.querySelectorAll('input[name="tempo-memorizacao"]');
const rankingList = getEl('ranking-list');
const finalTimeEl = getEl('final-time');
const finalAttemptsEl = getEl('final-attempts');
const pairsFoundEl = getEl('pairs-found');


const timers = {
  memorizar: getEl('memorizar-timer'),
  jogo: getEl('jogo-timer'),
  tentativas: getEl('tentativas'),
  progress: document.querySelector('#progress-bar div'),
};

// ===== CONSTANTES =====
const TEMPO_ANIMACAO_TELA = 300; // ms (deve corresponder à transição do CSS)
const TEMPO_DESVIRAR_CARTA = 700; // ms
const STORAGE_KEYS = {
  JOGADORES: 'jogadores',
  CPFS_USADOS: 'cpfs_usados',
  RANKING: 'ranking',
};

// ===== ÁUDIO =====
const sounds = {
  flip: new Audio('sons/flip.mp3'),
  match: new Audio('sons/match.mp3'),
  victory: new Audio('sons/victory.mp3'),
  gameOver: new Audio('sons/game-over.mp3'),
};

// Estado inicial para referência e reset
const initialState = {
  jogadorCPF: '',
  tempoRestante: 0,
  tentativas: 0,
  lockBoard: false,
  flippedCards: [],
  cards: [],
  tempoTotal: 45,
  tempoMemorizar: 10,
  memorizarTimeout: null,
  jogoInterval: null,
};

// Objeto de estado principal do jogo, uma cópia do inicial
let state = JSON.parse(JSON.stringify(initialState));


// ===== CONJUNTO DE ÍCONES =====
const icons = [
  'imagens/icon0.png',
  'imagens/icon1.png',
  'imagens/icon2.png',
  'imagens/icon3.png',
  'imagens/icon4.png',
  'imagens/icon5.png',
  'imagens/icon6.png',
  'imagens/icon7.png',
  'imagens/icon8.png',
  'imagens/icon9.png'
];

function showScreen(screenToShow) {
  const currentScreen = document.querySelector('.screen.active');

  if (currentScreen) {
    if (currentScreen === screenToShow) return;
    currentScreen.classList.add('screen-exit');
    currentScreen.classList.remove('active');
  }

  screenToShow.classList.remove('screen-exit');
  screenToShow.classList.add('active');
}

function playAudio(sound) {
  if (sound && typeof sound.play === 'function') {
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.error(`Erro ao tocar o som: ${error.message}`);
    });
  }
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function validarCPF(cpf) {
  return /^\d{11}$/.test(cpf);
}
function cpfJaUsado(cpf) {
  const usados = JSON.parse(localStorage.getItem(STORAGE_KEYS.CPFS_USADOS) || '[]');
  return usados.includes(cpf);
}
function marcarCPFusado(cpf) {
  const usados = JSON.parse(localStorage.getItem(STORAGE_KEYS.CPFS_USADOS) || '[]');
  usados.push(cpf);
  localStorage.setItem(STORAGE_KEYS.CPFS_USADOS, JSON.stringify(usados));
}
function salvarJogador(nome, telefone, cpf) {
  const jogadores = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOGADORES) || '[]');
  jogadores.push({ nome, telefone, cpf });
  localStorage.setItem(STORAGE_KEYS.JOGADORES, JSON.stringify(jogadores));
}

// ===== EXPORTAÇÃO CSV (agora limpa registros após baixar) =====
btnCSV.onclick = function () {
  const jogadores = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOGADORES) || '[]');
  if (jogadores.length === 0) return alert('Nenhum dado para exportar.');

  const linhas = ["Nome,Telefone,CPF"];
  jogadores.forEach(j => {
    // Escapa aspas duplas dentro dos valores, se houver
    linhas.push([j.nome, j.telefone, j.cpf].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
  });

  const blob = new Blob([linhas.join("\n")], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'jogadores.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Limpa registros após exportar
  localStorage.removeItem(STORAGE_KEYS.JOGADORES);
  localStorage.removeItem(STORAGE_KEYS.CPFS_USADOS);
  localStorage.removeItem(STORAGE_KEYS.RANKING);
  alert('CSV baixado e todos os registros (jogadores e ranking) foram limpos.');
};

// ===== RANKING =====
function salvarPontuacao(nome, tempo) {
  const ranking = JSON.parse(localStorage.getItem(STORAGE_KEYS.RANKING) || '[]');
  ranking.push({ nome, tempo });
  ranking.sort((a, b) => a.tempo - b.tempo); // Ordena pelo menor tempo
  const top5 = ranking.slice(0, 5); // Pega apenas os 5 melhores
  localStorage.setItem(STORAGE_KEYS.RANKING, JSON.stringify(top5));
}

function renderizarRanking() {
  const ranking = JSON.parse(localStorage.getItem(STORAGE_KEYS.RANKING) || '[]');
  rankingList.innerHTML = '';
  
  if (ranking.length === 0) {
    rankingList.innerHTML = '<li>Ainda não há pontuações. Seja o primeiro!</li>';
    return;
  }
  rankingList.innerHTML = ranking.map((p, i) => `<li><span>${i + 1}. ${p.nome}</span> <strong>${p.tempo}s</strong></li>`).join('');
}

// ===== CONFIGURAÇÕES =====
btnSettings.onclick = () => overlay.classList.add('active');
btnCloseSettings.onclick = () => overlay.classList.remove('active');

radioTempoJogo.forEach(radio => {
  radio.addEventListener('change', () => {
    state.tempoTotal = parseInt(radio.value);
  });
});

radioTempoMemorizar.forEach(radio => {
  radio.addEventListener('change', () => {
    state.tempoMemorizar = parseInt(radio.value);
  });
});

// ===== FORMULÁRIO =====
form.onsubmit = function (e) {
  e.preventDefault();
  erroMsg.textContent = '';

  const nome = form.nome.value.trim();
  const telefone = form.telefone.value.trim();
  const cpf = form.cpf.value.trim();
  const lgpd = form['lgpd-consent'].checked;

  if (!nome || !telefone || !cpf) {
    erroMsg.textContent = 'Preencha todos os campos.';
    return;
  }
  if (!lgpd) {
    erroMsg.textContent = 'Você precisa aceitar os termos de uso dos dados.';
    return;
  }
  if (!validarCPF(cpf)) {
    erroMsg.textContent = 'CPF inválido. Use 11 números.';
    return;
  }
  if (cpfJaUsado(cpf)) {
    erroMsg.textContent = 'Este CPF já participou.';
    return;
  }

  state.jogadorCPF = cpf;
  salvarJogador(nome, telefone, cpf);
  iniciarJogo();
};

// ===== INÍCIO DO JOGO =====
function iniciarJogo() {
  // 1. Inicia a transição de tela imediatamente para uma resposta visual rápida
  showScreen(screens.jogo);

  // 2. Prepara o jogo em segundo plano (de forma assíncrona)
  setTimeout(() => {
    board.innerHTML = '';
    state.tentativas = 0;
    timers.tentativas.textContent = '0';
    timers.progress.style.width = '100%';
    timers.progress.style.background = 'var(--verde-sicredi)';

    const pares = shuffle([...icons, ...icons]);
    state.cards = pares.map((icon, i) => criarCarta(icon, i));
    state.lockBoard = true;

    // Mostra todas as cartas por state.tempoMemorizar
    state.cards.forEach(card => card.classList.add('flipped'));
    let tempo = state.tempoMemorizar;
    timers.memorizar.textContent = `${tempo}s`;

    const memorizarInterval = setInterval(() => {
      tempo--;
      timers.memorizar.textContent = `${tempo}s`;
      if (tempo <= 0) clearInterval(memorizarInterval);
    }, 1000);

  state.memorizarTimeout = setTimeout(() => {
    state.cards.forEach(card => card.classList.remove('flipped'));
    state.lockBoard = false;
    iniciarTempoJogo();
  }, state.tempoMemorizar * 1000);
  }, 0); // setTimeout com 0ms adia a execução para após a renderização atual
}

function criarCarta(icon, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.icon = icon;
  card.innerHTML = `
    <div class="card-inner card-front"></div>
    <div class="card-inner card-back"><img src="${icon}" alt="ícone" draggable="false"></div>
  `;
  board.appendChild(card);
  return card;
}

// ===== LÓGICA DO JOGO =====
function iniciarTempoJogo() {
  state.tempoRestante = state.tempoTotal;
  timers.jogo.textContent = `${state.tempoRestante}s`;
  timers.memorizar.textContent = '';
  timers.progress.style.width = '100%';

  state.jogoInterval = setInterval(() => {
    state.tempoRestante--;
    timers.jogo.textContent = `${state.tempoRestante}s`;

    const percent = (state.tempoRestante / state.tempoTotal) * 100;
    timers.progress.style.width = `${percent}%`;

    if (percent > 60) timers.progress.style.background = 'var(--verde-sicredi)';
    else if (percent > 30) timers.progress.style.background = 'var(--amarelo)';
    else timers.progress.style.background = 'var(--vermelho)';

    if (state.tempoRestante <= 5) timers.jogo.classList.add('critical');
    else timers.jogo.classList.remove('critical');

    if (state.tempoRestante <= 0) encerrarJogo(false);
  }, 1000);
}

function handleBoardClick(event) {
  const clickedCard = event.target.closest('.card');
  if (!clickedCard || state.lockBoard || clickedCard.classList.contains('flipped') || clickedCard.classList.contains('matched')) {
    return;
  }

  playAudio(sounds.flip);

  clickedCard.classList.add('flipped');
  state.flippedCards.push(clickedCard);

  if (state.flippedCards.length === 2) {
    state.tentativas++;
    timers.tentativas.textContent = state.tentativas;
    verificarPar();
  }
}

function verificarPar() {
  state.lockBoard = true;
  const [card1, card2] = state.flippedCards;
  if (card1.dataset.icon === card2.dataset.icon) {
    playAudio(sounds.match);

    card1.classList.add('matched');
    card2.classList.add('matched');
    state.flippedCards = [];
    state.lockBoard = false;

    // Evita lag de virada dupla
    requestAnimationFrame(() => {
      card1.style.transform = 'rotateY(180deg)';
      card2.style.transform = 'rotateY(180deg)';
    });

    if (document.querySelectorAll('.matched').length === state.cards.length) {
      encerrarJogo(true);
    }
  } else {
    setTimeout(() => {
      card1.classList.remove('flipped');
      card2.classList.remove('flipped');
      state.flippedCards = [];
      state.lockBoard = false;
    }, TEMPO_DESVIRAR_CARTA);
  }
}

function encerrarJogo(venceu) {
  clearTimeout(state.memorizarTimeout);
  state.lockBoard = true; // Trava o tabuleiro para evitar cliques extras
  clearInterval(state.jogoInterval);
  marcarCPFusado(state.jogadorCPF);
  
  const tempoGasto = state.tempoTotal - state.tempoRestante;
  
  if (venceu) {
    playAudio(sounds.victory);
    if (typeof confetti === 'function') {
      confetti();
    }
    salvarPontuacao(form.nome.value.trim(), tempoGasto);
    renderizarRanking();
    finalTimeEl.textContent = `${tempoGasto}s`;
    finalAttemptsEl.textContent = state.tentativas;
  } else {
    playAudio(sounds.gameOver);
    const paresEncontrados = document.querySelectorAll('.matched').length / 2;
    pairsFoundEl.textContent = paresEncontrados;
  }

  showScreen(venceu ? screens.premio : screens.fail);
}

// ===== FLUXO =====
btnVoltarPremio.onclick = resetarJogo;
btnVoltarFail.onclick = resetarJogo;

function resetarJogo() {
  form.reset();
  erroMsg.textContent = '';
  timers.jogo.classList.remove('critical');

  // Reseta o estado do jogo, mas mantém as configurações de tempo
  Object.assign(state, {
    ...initialState,
    tempoTotal: state.tempoTotal,
    tempoMemorizar: state.tempoMemorizar,
  });

  showScreen(screens.cadastro);
}

// ===== BLOQUEIOS DE PÁGINA =====
document.addEventListener('contextmenu', e => e.preventDefault());
document.querySelectorAll('#cadastro-form input').forEach(input => {
  input.setAttribute('autocomplete', 'new-' + input.id);
  input.setAttribute('readonly', true);
  setTimeout(() => input.removeAttribute('readonly'), 500); // Previne autofill em alguns navegadores
});

// ===== INICIALIZAÇÃO =====
showScreen(screens.cadastro);

board.addEventListener('click', handleBoardClick); // Event Delegation
// Cria os teclados uma única vez na inicialização
const tecladoNumericoContainer = document.getElementById('teclado-numerico');
new Keyboard(form, tecladoAlfanumericoContainer, tecladoNumericoContainer);
