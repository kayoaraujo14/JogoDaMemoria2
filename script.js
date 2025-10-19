/* === SCRIPT PRINCIPAL — JOGO DA MEMÓRIA SICREDI === */

// ===== ELEMENTOS DOM =====
const screens = {
  cadastro: document.getElementById('cadastro-section'),
  jogo: document.getElementById('jogo-section'),
  premio: document.getElementById('premio-section'),
  fail: document.getElementById('fail-section'),
};
const tecladoAlfanumericoContainer = document.getElementById('teclado-alfanumerico');
const tecladoNumericoContainer = document.getElementById('teclado-numerico');
const form = document.getElementById('cadastro-form');
const erroMsg = document.getElementById('cadastro-erro');
const tecladoVirtual = document.getElementById('teclado-virtual');
const board = document.getElementById('game-board');
const btnCSV = document.getElementById('baixar-csv');
const btnVoltarPremio = document.getElementById('voltar-cadastro-premio');
const btnVoltarFail = document.getElementById('voltar-cadastro-fail');
const btnSettings = document.getElementById('btn-settings');
const overlay = document.getElementById('settings-overlay');
const btnCloseSettings = document.getElementById('settings-close');
const radioTempoJogo = document.querySelectorAll('input[name="tempo-jogo"]');
const radioTempoMemorizar = document.querySelectorAll('input[name="tempo-memorizacao"]');

const timers = {
  memorizar: document.getElementById('memorizar-timer'),
  jogo: document.getElementById('jogo-timer'),
  tentativas: document.getElementById('tentativas'),
  progress: document.querySelector('#progress-bar div'),
};

// ===== VARIÁVEIS DE ESTADO =====
let jogadorCPF = '';
let tentativas = 0;
let memorizarTimeout, jogoTimeout, jogoInterval;
let lockBoard = false;
let flippedCards = [];
let cards = [];
let tempoTotal = 60;
let tempoMemorizar = 10;
let inputAtivo = null;

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

// ===== UTILITÁRIAS =====
function showScreen(target) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  target.classList.add('active');
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
  const usados = JSON.parse(localStorage.getItem('cpfs_usados') || '[]');
  return usados.includes(cpf);
}
function marcarCPFusado(cpf) {
  const usados = JSON.parse(localStorage.getItem('cpfs_usados') || '[]');
  usados.push(cpf);
  localStorage.setItem('cpfs_usados', JSON.stringify(usados));
}
function salvarJogador(nome, telefone, email, cpf) {
  const jogadores = JSON.parse(localStorage.getItem('jogadores') || '[]');
  jogadores.push({ nome, telefone, email, cpf });
  localStorage.setItem('jogadores', JSON.stringify(jogadores));
}

// ===== EXPORTAÇÃO CSV (agora limpa registros após baixar) =====
btnCSV.onclick = function () {
  const jogadores = JSON.parse(localStorage.getItem('jogadores') || '[]');
  if (jogadores.length === 0) return alert('Nenhum dado para exportar.');

  const linhas = ["Nome,Telefone,Email,CPF"];
  jogadores.forEach(j => {
    linhas.push(`"${j.nome}","${j.telefone}","${j.email}","${j.cpf}"`);
  });

  const blob = new Blob([linhas.join("\n")], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'jogadores.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Limpa registros após exportar
  localStorage.removeItem('jogadores');
  localStorage.removeItem('cpfs_usados');
  alert('CSV baixado e registros limpos.');
};

// ===== CONFIGURAÇÕES =====
btnSettings.onclick = () => overlay.classList.add('active');
btnCloseSettings.onclick = () => overlay.classList.remove('active');

radioTempoJogo.forEach(radio => {
  radio.addEventListener('change', () => {
    tempoTotal = parseInt(radio.value);
  });
});

radioTempoMemorizar.forEach(radio => {
  radio.addEventListener('change', () => {
    tempoMemorizar = parseInt(radio.value);
  });
});

// ===== FORMULÁRIO =====
form.onsubmit = function (e) {
  e.preventDefault();
  erroMsg.textContent = '';

  const nome = form.nome.value.trim();
  const telefone = form.telefone.value.trim();
  const email = form.email.value.trim();
  const cpf = form.cpf.value.trim();

  if (!nome || !telefone || !email || !cpf) {
    erroMsg.textContent = 'Preencha todos os campos.';
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

  jogadorCPF = cpf;
  salvarJogador(nome, telefone, email, cpf);
  iniciarJogo();
};

// ===== INÍCIO DO JOGO =====
function iniciarJogo() {
  showScreen(screens.jogo);
  board.innerHTML = '';
  tentativas = 0;
  timers.tentativas.textContent = '0';
  timers.progress.style.width = '100%';
  timers.progress.style.background = 'var(--verde-sicredi)';

  const pares = shuffle([...icons, ...icons]);
  cards = pares.map((icon, i) => criarCarta(icon, i));
  lockBoard = true;

  // Mostra todas as cartas por tempoMemorizar
  cards.forEach(card => card.classList.add('flipped'));
  let tempo = tempoMemorizar;
  timers.memorizar.textContent = `${tempo}s`;

  const memorizarInterval = setInterval(() => {
    tempo--;
    timers.memorizar.textContent = `${tempo}s`;
    if (tempo <= 0) clearInterval(memorizarInterval);
  }, 1000);

  memorizarTimeout = setTimeout(() => {
    cards.forEach(card => card.classList.remove('flipped'));
    lockBoard = false;
    iniciarTempoJogo();
  }, tempoMemorizar * 1000);
}

function criarCarta(icon, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.icon = icon;
  card.innerHTML = `
    <div class="card-inner card-front"></div>
    <div class="card-inner card-back"><img src="${icon}" alt="ícone" draggable="false"></div>
  `;
  card.addEventListener('click', flipCard);
  board.appendChild(card);
  return card;
}

// ===== LÓGICA DO JOGO =====
function iniciarTempoJogo() {
  let tempo = tempoTotal;
  timers.jogo.textContent = `${tempo}s`;
  timers.memorizar.textContent = '';
  timers.progress.style.width = '100%';

  jogoInterval = setInterval(() => {
    tempo--;
    timers.jogo.textContent = `${tempo}s`;

    const percent = (tempo / tempoTotal) * 100;
    timers.progress.style.width = `${percent}%`;

    if (percent > 60) timers.progress.style.background = 'var(--verde-sicredi)';
    else if (percent > 30) timers.progress.style.background = 'var(--amarelo)';
    else timers.progress.style.background = 'var(--vermelho)';

    if (tempo <= 5) timers.jogo.classList.add('critical');
    else timers.jogo.classList.remove('critical');

    if (tempo <= 0) {
      clearInterval(jogoInterval);
      encerrarJogo(false);
    }
  }, 1000);

  jogoTimeout = setTimeout(() => encerrarJogo(false), tempoTotal * 1000);
}

function flipCard() {
  if (lockBoard || this.classList.contains('flipped') || this.classList.contains('matched')) return;
  this.classList.add('flipped');
  flippedCards.push(this);

  if (flippedCards.length === 2) {
    tentativas++;
    timers.tentativas.textContent = tentativas;
    verificarPar();
  }
}

function verificarPar() {
  lockBoard = true;
  const [card1, card2] = flippedCards;
  if (card1.dataset.icon === card2.dataset.icon) {
    card1.classList.add('matched');
    card2.classList.add('matched');
    flippedCards = [];
    lockBoard = false;

    // Evita lag de virada dupla
    requestAnimationFrame(() => {
      card1.style.transform = 'rotateY(180deg)';
      card2.style.transform = 'rotateY(180deg)';
    });

    if (document.querySelectorAll('.matched').length === cards.length) {
      encerrarJogo(true);
    }
  } else {
    setTimeout(() => {
      card1.classList.remove('flipped');
      card2.classList.remove('flipped');
      flippedCards = [];
      lockBoard = false;
    }, 700);
  }
}

function encerrarJogo(venceu) {
  clearTimeout(memorizarTimeout);
  clearTimeout(jogoTimeout);
  clearInterval(jogoInterval);
  marcarCPFusado(jogadorCPF);

  setTimeout(() => {
    showScreen(venceu ? screens.premio : screens.fail);
  }, 400);
}

// ===== FLUXO =====
btnVoltarPremio.onclick = resetarJogo;
btnVoltarFail.onclick = resetarJogo;

function resetarJogo() {
  form.reset();
  erroMsg.textContent = '';
  flippedCards = [];
  cards = [];
  showScreen(screens.cadastro);
}

// ===== TECLADO VIRTUAL =====
function teclaClicada(tecla) {
  if (!inputAtivo) return;
  if (tecla === 'espaço') {
    tecla = ' '; // Converte a palavra-chave em um caractere de espaço
  }
  switch (tecla) {
    case '←':
      inputAtivo.value = inputAtivo.value.slice(0, -1);
      break;
    case 'Próximo': {
      const campos = Array.from(form.querySelectorAll('input'));
      const idx = campos.indexOf(inputAtivo);
      if (idx > -1 && idx < campos.length - 1) {
        campos[idx + 1].focus();
      }
      break;
    }
    default:
      if ((inputAtivo.id === 'cpf' || inputAtivo.id === 'telefone') && inputAtivo.value.length >= 11) return;
      inputAtivo.value += tecla;
      break;
  }
}

function criarLayoutTeclado(container, layout) {
  container.innerHTML = ''; // Limpa o container antes de construir

  layout.forEach(linha => {
    const divLinha = document.createElement('div');
    divLinha.className = 'linha-teclado';
    linha.forEach(tecla => {
      const btn = document.createElement('button');
      btn.className = 'tecla';
      btn.textContent = tecla;

      // Adiciona classes e IDs para teclas especiais
      if (tecla === 'espaço') {
        btn.id = 'tecla-espaco';
        btn.classList.add('tecla-especial');
      } else if (tecla === 'Próximo') {
        btn.id = 'tecla-proximo';
        btn.classList.add('tecla-especial');
      } else if (tecla === '←') {
        btn.classList.add('tecla-func');
      }

      btn.onclick = () => teclaClicada(tecla);
      divLinha.appendChild(btn);
    });
    container.appendChild(divLinha);
  });
}

function mostrarTeclado(tipo) {
  const isNumeric = tipo === 'number';
  tecladoAlfanumericoContainer.style.display = isNumeric ? 'none' : 'flex';
  tecladoNumericoContainer.style.display = isNumeric ? 'flex' : 'none';
}

form.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]').forEach(input => {
  input.addEventListener('focus', (e) => {
    inputAtivo = e.target;
    mostrarTeclado(input.id === 'telefone' || input.id === 'cpf' ? 'number' : 'text');
  });
});

// ===== BLOQUEIOS DE PÁGINA =====
document.addEventListener('contextmenu', e => e.preventDefault());
document.querySelectorAll('#cadastro-form input').forEach(input => {
  input.setAttribute('autocomplete', 'new-' + input.id);
  input.setAttribute('readonly', true);
  setTimeout(() => input.removeAttribute('readonly'), 500);
});

// ===== INICIALIZAÇÃO =====
showScreen(screens.cadastro);

// Cria os teclados uma única vez na inicialização
const layoutAlfanumerico = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '←'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@', '.'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ['espaço', 'Próximo'],
];
const layoutNumerico = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0', '←', 'Próximo'],
];

criarLayoutTeclado(tecladoAlfanumericoContainer, layoutAlfanumerico);
criarLayoutTeclado(tecladoNumericoContainer, layoutNumerico);
