/* === SCRIPT PRINCIPAL — JOGO DA MEMÓRIA SICREDI (VERSÃO REVISADA) === */

// ========== ELEMENTOS DOM ==========
const screens = {
  cadastro: document.getElementById('cadastro-section'),
  jogo: document.getElementById('jogo-section'),
  premio: document.getElementById('premio-section'),
  fail: document.getElementById('fail-section'),
};

const form = document.getElementById('cadastro-form');
const erroMsg = document.getElementById('cadastro-erro');
const tecladoVirtual = document.getElementById('teclado-virtual');

const timers = {
  memorizar: document.getElementById('memorizar-timer'),
  jogo: document.getElementById('jogo-timer'),
  tentativas: document.getElementById('tentativas'),
  progress: document.querySelector('#progress-bar div'),
};

const board = document.getElementById('game-board');
const btnCSV = document.getElementById('baixar-csv');
const btnVoltarPremio = document.getElementById('voltar-cadastro-premio');
const btnVoltarFail = document.getElementById('voltar-cadastro-fail');

// ========== VARIÁVEIS DE ESTADO ==========
let jogadorCPF = '';
let tentativas = 0;
let memorizarTimeout = null;
let memorizarInterval = null;
let jogoTimeout = null;
let jogoInterval = null;
let lockBoard = false;
let flippedCards = [];
let cards = [];
let tempoTotal = 60;
let tempoMemorizar = 10;
let inputAtivo = null;

// ========== CONJUNTO DE ÍCONES (renomeados para icon0..icon9) ==========
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

// ========== PRÉ-CARREGAMENTO DINÂMICO (robusto) ==========
(function preloadImages(list) {
  if (!Array.isArray(list)) return;
  list.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => { /* pré-carregado */ };
    img.onerror = () => console.warn('Erro ao pré-carregar imagem:', src);
  });
})(icons);

// ========== FUNÇÕES UTILITÁRIAS ==========
function showScreen(section) {
  // Esconde todas as telas e mostra a solicitada com animação (usa .active da CSS)
  Object.values(screens).forEach(s => {
    s.classList.remove('active');
    s.hidden = true;
  });
  section.hidden = false;
  // pequeno delay para permitir transição
  setTimeout(() => section.classList.add('active'), 20);
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
  if (!usados.includes(cpf)) {
    usados.push(cpf);
    localStorage.setItem('cpfs_usados', JSON.stringify(usados));
  }
}
function salvarJogador(nome, telefone, email, cpf) {
  const jogadores = JSON.parse(localStorage.getItem('jogadores') || '[]');
  jogadores.push({ nome, telefone, email, cpf, data: new Date().toISOString() });
  localStorage.setItem('jogadores', JSON.stringify(jogadores));
}

// ========== CSV E RESET ==========
btnCSV.onclick = function () {
  const jogadores = JSON.parse(localStorage.getItem('jogadores') || '[]');
  if (jogadores.length === 0) return alert('Nenhum dado para exportar.');

  const linhas = ["Nome,Telefone,Email,CPF,Data"];
  jogadores.forEach(j => {
    linhas.push(`"${j.nome}","${j.telefone}","${j.email}","${j.cpf}","${j.data}"`);
  });

  const blob = new Blob([linhas.join("\n")], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'jogadores.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


// ========== FORMULÁRIO DE CADASTRO ==========
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

// ========== INÍCIO DO JOGO ==========
function iniciarJogo() {
  // Limpeza de possíveis timers anteriores
  clearAllTimers();

  board.innerHTML = '';
  tentativas = 0;
  timers.tentativas.textContent = '0';
  timers.progress.style.width = '100%';
  flippedCards = [];
  cards = [];

  const pares = shuffle([...icons, ...icons]);
  cards = pares.map((icon, i) => criarCarta(icon, i));
  lockBoard = true;

  // Mostra todas as cartas para memorizar
  cards.forEach(card => card.classList.add('flipped'));
  let tempo = tempoMemorizar;
  timers.memorizar.textContent = `${tempo}s`;

  // atualiza contador de memorização
  memorizarInterval = setInterval(() => {
    tempo--;
    timers.memorizar.textContent = `${tempo}s`;
    if (tempo <= 0) {
      clearInterval(memorizarInterval);
    }
  }, 1000);

  // ao fim do tempo de memorização, vira todas as cartas e inicia o jogo
  memorizarTimeout = setTimeout(() => {
    cards.forEach(card => card.classList.remove('flipped'));
    lockBoard = false;
    timers.memorizar.textContent = '';
    iniciarContagemJogo();
  }, tempoMemorizar * 1000);

  // mostra tela de jogo
  showScreen(screens.jogo);
}

function criarCarta(icon, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.icon = icon;
  // Mantemos a estrutura compatível com o CSS (.card-inner + front/back)
  card.innerHTML = `
    <div class="card-inner card-front"></div>
    <div class="card-inner card-back"><img src="${icon}" alt="ícone" draggable="false" /></div>
  `;

  // Usa pointerdown para resposta mais rápida em touchscreen (evita duplicar eventos)
  card.addEventListener('pointerdown', flipCard);
  // Também suporta teclado/enter (acessibilidade)
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') flipCard.call(card, e);
  });

  board.appendChild(card);
  return card;
}

// ========== LÓGICA DO JOGO ==========

function iniciarContagemJogo() {
  let tempo = tempoTotal;
  timers.jogo.textContent = `${tempo}s`;
  timers.memorizar.textContent = '';
  timers.progress.style.width = '100%';

  // Limpeza prévia
  clearInterval(jogoInterval);
  clearTimeout(jogoTimeout);

  jogoInterval = setInterval(() => {
    tempo--;
    timers.jogo.textContent = `${tempo}s`;
    timers.progress.style.width = `${(tempo / tempoTotal) * 100}%`;
    if (tempo <= 0) {
      clearInterval(jogoInterval);
      encerrarJogo(false);
    }
  }, 1000);

  jogoTimeout = setTimeout(() => {
    encerrarJogo(false);
  }, tempoTotal * 1000);
}

function flipCard(e) {
  // suporte para ser chamado como handler (event) ou chamado com .call(card)
  const card = e && e.currentTarget ? e.currentTarget : this;
  if (!card) return;

  if (lockBoard || card.classList.contains('flipped') || card.classList.contains('matched')) return;

  card.classList.add('flipped');
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    tentativas++;
    timers.tentativas.textContent = tentativas;
    checkForMatch();
  }
}

function checkForMatch() {
  lockBoard = true;
  const [card1, card2] = flippedCards;

  if (!card1 || !card2) {
    // segurança
    flippedCards = [];
    lockBoard = false;
    return;
  }

  if (card1.dataset.icon === card2.dataset.icon) {
    card1.classList.add('matched');
    card2.classList.add('matched');
    flippedCards = [];
    lockBoard = false;

    // se todas as cartas estiverem marcadas -> vitória
    if (document.querySelectorAll('.matched').length === cards.length) {
      encerrarJogo(true);
    }
  } else {
    // pequena espera para mostrar ao usuário
    setTimeout(() => {
      card1.classList.remove('flipped');
      card2.classList.remove('flipped');
      flippedCards = [];
      lockBoard = false;
    }, 800);
  }
}

function encerrarJogo(venceu) {
  clearAllTimers();
  marcarCPFusado(jogadorCPF);

  // animação de transição suave
  setTimeout(() => {
    showScreen(venceu ? screens.premio : screens.fail);
  }, 400);
}

// limpa todos os timers usados no jogo
function clearAllTimers() {
  if (memorizarInterval) { clearInterval(memorizarInterval); memorizarInterval = null; }
  if (memorizarTimeout) { clearTimeout(memorizarTimeout); memorizarTimeout = null; }
  if (jogoInterval) { clearInterval(jogoInterval); jogoInterval = null; }
  if (jogoTimeout) { clearTimeout(jogoTimeout); jogoTimeout = null; }
}

// ========== BOTÕES DE FLUXO ==========

btnVoltarPremio.onclick = resetarJogo;
btnVoltarFail.onclick = resetarJogo;

function resetarJogo() {
  clearAllTimers();
  form.reset();
  erroMsg.textContent = '';
  flippedCards = [];
  cards = [];
  jogadorCPF = '';
  showScreen(screens.cadastro);
}

// ========== TECLADO VIRTUAL ==========
function criarTeclado(tipo = 'text') {
  tecladoVirtual.innerHTML = '';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'teclado-toggle';
  toggleBtn.textContent = tipo === 'text' ? '123 / @' : 'ABC';
  toggleBtn.type = 'button'; // <-- impede envio de form
  toggleBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    criarTeclado(tipo === 'text' ? 'number' : 'text');
  };
  tecladoVirtual.appendChild(toggleBtn);

  // ======== Layouts de teclado ========
  const teclados = {
    number: [
      ['1','2','3'],
      ['4','5','6'],
      ['7','8','9'],
      [' ','0','←'],
      ['Próximo']
    ],
    text: [
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l','←'],
      ['z','x','c','v','b','n','m','Próximo'],
      ['_','-','Espaço','.','@']
    ]
  };

  const layout = teclados[tipo] || teclados.text;

  layout.forEach(linha => {
    const div = document.createElement('div');
    div.className = 'linha-teclado';

    linha.forEach(tecla => {
      if (tecla.trim() === '') {
        const espaço = document.createElement('div');
        espaço.style.width = '40px';
        espaço.style.height = '40px';
        div.appendChild(espaço);
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'tecla' + (['←','Próximo','Espaço'].includes(tecla) ? ' tecla-func' : '');
      btn.textContent = tecla;
      btn.type = 'button'; // <-- impede perder foco do input
      if (tecla === 'Próximo') {
        btn.style.minWidth = '150px';
        btn.style.marginTop = '8px';
      }

      // Mantém o foco ativo no input ao clicar no teclado
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (inputAtivo) inputAtivo.focus(); // força o foco de volta
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (inputAtivo) {
          inputAtivo.focus();
          teclaClicada(tecla);
        }
      });

      div.appendChild(btn);
    });

    tecladoVirtual.appendChild(div);
  });
}

function teclaClicada(tecla) {
  if (!inputAtivo) return;

  // Garante que o campo continua com foco
  inputAtivo.focus();

  if (tecla === 'Próximo') {
    const campos = [form.nome, form.telefone, form.email, form.cpf];
    const idx = campos.indexOf(inputAtivo);
    if (idx !== -1 && idx < campos.length - 1) campos[idx + 1].focus();
    else if (idx === campos.length - 1) inputAtivo.blur();
    return;
  }

  if (tecla === '←') return inputAtivo.value = inputAtivo.value.slice(0, -1);
  if (tecla === 'Espaço') return inputAtivo.value += ' ';
  if (inputAtivo.id === 'cpf' && inputAtivo.value.length >= 11) return;
  if (inputAtivo.id === 'telefone' && inputAtivo.value.length >= 11) return;

  inputAtivo.value += tecla;
}


// Liga teclado ao foco dos inputs
[form.nome, form.telefone, form.email, form.cpf].forEach(input => {
  input.addEventListener('focus', (e) => {
    inputAtivo = e.target;
    criarTeclado(input.id === 'telefone' || input.id === 'cpf' ? 'number' : 'text');
  });
  input.addEventListener('blur', () => {
    // não limpa inputAtivo imediatamente para evitar perda durante clique no teclado virtual
    setTimeout(() => { if (document.activeElement.tagName !== 'INPUT') inputAtivo = null; }, 150);
  });
});

// ========== INICIALIZAÇÃO ==========
showScreen(screens.cadastro);
criarTeclado('text');

// ========== BLOQUEIOS DE SEGURANÇA PARA USO EM FEIRA ==========

// Bloqueia o menu de contexto (botão direito)
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Bloqueia algumas teclas comuns de inspeção (F12, Ctrl+Shift+I, Ctrl+U, etc.)
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
    (e.ctrlKey && e.key.toUpperCase() === 'U')
  ) {
    e.preventDefault();
  }
});

