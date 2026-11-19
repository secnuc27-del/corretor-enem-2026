// ============================================================
//  app.js — Lógica de Interação da Plataforma ENEM 2026
//  Todas as 12 cores/cadernos, capas ilustradas em SVG e fluxo limpo
// ============================================================

// Estado Global
let config = {
  dia: 1,                 // Dia usado no modo individual
  modoCorrecao: 'um',
  cadernoDia1Key: 'dia1-caderno1',
  cadernoDia2Key: 'dia2-caderno5',
  gabaritosPorDia: null,
  cadernoKey: 'dia1-caderno1',
  idioma: 'ingles',       // 'ingles' ou 'espanhol'
  respostas: {},          // { 1: 'A', 2: 'B', ... }
  indiceQuestao: 0,       // Índice na lista de questoes (0 a 89)
  questoes: [],           // Array de números das questões (ex: [1..90] ou [91..180])
  areas: [],              // Áreas do dia
  gabarito: null          // Objeto com o gabarito oficial
};

const CHAVE_RASCUNHO_CORRECAO = 'enem-corrector-progress-v1';
const CHAVE_ACESSIBILIDADE = 'enem-corrector-accessibility-v1';
let retornandoAoResultado = false;
let correcaoConcluida = false;
let tamanhoTextoAcessivel = 0;
let contrasteAcessivel = false;

function lerRascunhoCorrecao() {
  try {
    const rascunho = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO_CORRECAO) || 'null');
    if (!rascunho || rascunho.version !== 1 || !['um', 'dois'].includes(rascunho.modoCorrecao)) return null;
    if (!GABARITOS[rascunho.cadernoKey] || !GABARITOS[rascunho.cadernoDia1Key] || !GABARITOS[rascunho.cadernoDia2Key]) return null;
    if (![1, 2].includes(rascunho.dia) || !['ingles', 'espanhol'].includes(rascunho.idioma)) return null;
    if (!Number.isInteger(rascunho.indiceQuestao) || rascunho.indiceQuestao < 0 || rascunho.indiceQuestao > 179) return null;
    return rascunho;
  } catch (_) {
    return null;
  }
}

function limparRascunhoCorrecao() {
  try { localStorage.removeItem(CHAVE_RASCUNHO_CORRECAO); } catch (_) { /* armazenamento indisponível */ }
  atualizarBotaoRetomar();
}

function atualizarBotaoRetomar() {
  const botao = document.getElementById('btnContinuarRascunho');
  if (!botao) return;
  const rascunho = lerRascunhoCorrecao();
  botao.classList.toggle('hidden', !rascunho);
  if (!rascunho) return;

  const quantidade = rascunho.modoCorrecao === 'dois' ? 180 : 90;
  const indice = Math.min(rascunho.indiceQuestao, quantidade - 1);
  const numeroQuestao = rascunho.modoCorrecao === 'um' && rascunho.dia === 2 ? indice + 91 : indice + 1;
  const respondidas = Object.values(rascunho.respostas || {}).filter(resposta => ['A', 'B', 'C', 'D', 'E', 'ANULADA'].includes(resposta) || resposta === '').length;
  botao.innerHTML = `Continuar na questão ${numeroQuestao} <span aria-hidden="true">↗</span>`;
  botao.setAttribute('aria-label', `Continuar correção na questão ${numeroQuestao}; ${respondidas} questões respondidas`);
}

function salvarRascunhoCorrecao() {
  if (correcaoConcluida || retornandoAoResultado || !config.questoes.length) return;
  const telaQuiz = document.getElementById('quizScreen');
  if (!telaQuiz || telaQuiz.classList.contains('hidden')) return;

  const respostas = {};
  Object.entries(config.respostas).forEach(([numero, resposta]) => {
    if (/^\d{1,3}$/.test(numero) && ['A', 'B', 'C', 'D', 'E', 'ANULADA', ''].includes(resposta)) respostas[numero] = resposta;
  });
  const rascunho = {
    version: 1,
    savedAt: Date.now(),
    modoCorrecao: config.modoCorrecao,
    dia: config.dia,
    cadernoKey: config.cadernoKey,
    cadernoDia1Key: config.cadernoDia1Key,
    cadernoDia2Key: config.cadernoDia2Key,
    idioma: config.idioma,
    respostas,
    indiceQuestao: config.indiceQuestao
  };
  try {
    localStorage.setItem(CHAVE_RASCUNHO_CORRECAO, JSON.stringify(rascunho));
    atualizarBotaoRetomar();
  } catch (_) { /* modo privado o armazenamento pode estar indisponível */ }
}

// ============================================================
//  TRANSIÇÕES DE TELA
// ============================================================
let transicaoEmAndamento = false;

function irParaSelecao() {
  if (transicaoEmAndamento) return;

  const capa = document.getElementById('capaInicialScreen');
  const cabecalho = document.getElementById('mainHeader');
  const conteudo = document.getElementById('mainContentWrapper');
  const camada = document.getElementById('pageTransitionLayer');
  const botao = capa.querySelector('.btn-iniciar-hero');
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const celular = window.matchMedia('(max-width: 600px)').matches;
  const duracaoEntrada = celular ? 300 : 720;
  const duracaoSaida = celular ? 340 : 500;

  const abrirSelecao = () => {
    capa.classList.add('hidden');
    capa.classList.remove('is-leaving');
    document.body.classList.add('selection-active');
    document.body.classList.remove('quiz-active');
    cabecalho.classList.remove('hidden');
    conteudo.classList.remove('hidden');
    cabecalho.classList.remove('page-entering');
    conteudo.classList.remove('page-entering');
    document.getElementById('configScreen').classList.remove('hidden');
    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('resultadoScreen').classList.add('hidden');
    window.scrollTo(0, 0);
    definirDia(1);

    if (!movimentoReduzido && camada) {
      cabecalho.classList.add('page-entering');
      conteudo.classList.add('page-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cabecalho.classList.remove('page-entering');
        conteudo.classList.remove('page-entering');
      }));
      camada.classList.add('is-clearing');
      window.setTimeout(() => {
        camada.classList.remove('is-expanding', 'is-clearing');
        camada.style.removeProperty('--origin-x');
        camada.style.removeProperty('--origin-y');
        botao.disabled = false;
        transicaoEmAndamento = false;
      }, duracaoSaida);
    } else {
      if (camada) camada.classList.remove('is-expanding', 'is-clearing');
      botao.disabled = false;
      transicaoEmAndamento = false;
    }
  };

  if (movimentoReduzido || !camada) {
    abrirSelecao();
    return;
  }

  transicaoEmAndamento = true;
  botao.disabled = true;
  capa.classList.add('is-leaving');
  const areaBotao = botao.getBoundingClientRect();
  camada.style.setProperty('--origin-x', `${areaBotao.left + areaBotao.width / 2}px`);
  camada.style.setProperty('--origin-y', `${areaBotao.top + areaBotao.height / 2}px`);
  requestAnimationFrame(() => camada.classList.add('is-expanding'));
  window.setTimeout(abrirSelecao, duracaoEntrada);
}
function voltarParaCapa() {
  document.body.classList.remove('selection-active');
  document.body.classList.remove('quiz-active');
  document.getElementById('capaInicialScreen').classList.remove('hidden');
  document.getElementById('mainHeader').classList.add('hidden');
  document.getElementById('mainContentWrapper').classList.add('hidden');
  window.scrollTo(0, 0);
}

function voltarParaSelecao() {
  document.getElementById('resultadoScreen').classList.add('hidden');
  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('configScreen').classList.remove('hidden');
  document.body.classList.add('selection-active');
  document.body.classList.remove('quiz-active');
  agendarFundoCadernos();
  const mainHeader = document.getElementById('mainHeader');
  if (mainHeader) mainHeader.classList.remove('hidden');
  window.scrollTo(0, 0);
}

// ============================================================
//  GERADOR DE CAPA SVG OFICIAL DO CADERNO
// ============================================================
function gerarSvgCapaCaderno(corNome, corHex, numCaderno, diaNum, textColor = '#ffffff', instanceId = 'catalogo') {
  const svgUid = `${instanceId}-${diaNum}-${numCaderno}`;
  const isBranco = (corNome.toLowerCase() === 'branco');
  const borderCor = isBranco ? '#cbd5e1' : corHex;
  const darkCor = isBranco ? '#334155' : '#ffffff';

  return `
    <svg class="caderno-cover-svg-wrap" viewBox="0 0 100 135" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${svgUid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${corHex}" />
          <stop offset="100%" stop-color="${corHex}" stop-opacity="0.85" />
        </linearGradient>
        <filter id="shadow-${svgUid}" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Fundo do Caderno -->
      <rect x="2" y="2" width="96" height="131" rx="6" fill="#ffffff" stroke="${borderCor}" stroke-width="2" filter="url(#shadow-${svgUid})" />

      <!-- Tarja Colorida da Prova -->
      <path d="M 2 8 Q 2 2 8 2 L 92 2 Q 98 2 98 8 L 98 42 L 2 42 Z" fill="url(#grad-${svgUid})" />

      <!-- Faixa da Lombada -->
      <rect x="2" y="2" width="6" height="131" rx="2" fill="rgba(0,0,0,0.15)" />

      <!-- Código de Barras Decorativo no Topo -->
      <g fill="${isBranco ? '#475569' : 'rgba(255,255,255,0.7)'}" transform="translate(14, 6)">
        <rect x="0" y="0" width="2" height="7"/>
        <rect x="4" y="0" width="1" height="7"/>
        <rect x="7" y="0" width="3" height="7"/>
        <rect x="12" y="0" width="2" height="7"/>
        <rect x="16" y="0" width="1" height="7"/>
        <rect x="19" y="0" width="2" height="7"/>
        <rect x="23" y="0" width="3" height="7"/>
        <rect x="28" y="0" width="1" height="7"/>
        <rect x="31" y="0" width="2" height="7"/>
        <rect x="35" y="0" width="2" height="7"/>
        <rect x="39" y="0" width="3" height="7"/>
        <rect x="44" y="0" width="1" height="7"/>
        <rect x="47" y="0" width="2" height="7"/>
        <rect x="51" y="0" width="3" height="7"/>
        <rect x="56" y="0" width="1" height="7"/>
        <rect x="59" y="0" width="2" height="7"/>
        <rect x="63" y="0" width="2" height="7"/>
        <rect x="67" y="0" width="3" height="7"/>
      </g>

      <!-- Logo "enem 2026" na Capa -->
      <text x="52" y="26" font-family="-apple-system, sans-serif" font-size="11" font-weight="900" fill="${isBranco ? '#0f172a' : '#ffffff'}" text-anchor="middle" letter-spacing="-0.5">enem 2026</text>
      <text x="52" y="36" font-family="-apple-system, sans-serif" font-size="5" font-weight="700" fill="${isBranco ? '#334155' : 'rgba(255,255,255,0.9)'}" text-anchor="middle" text-transform="uppercase" letter-spacing="0.5">${diaNum}º DIA</text>

      <!-- Caixa Central da Cor -->
      <rect x="14" y="52" width="72" height="42" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
      <text x="50" y="68" font-family="-apple-system, sans-serif" font-size="6.5" font-weight="700" fill="#64748b" text-anchor="middle">CADERNO ${numCaderno}</text>
      <text x="50" y="84" font-family="-apple-system, sans-serif" font-size="12" font-weight="900" fill="${isBranco ? '#0f172a' : corHex}" text-anchor="middle">${corNome.toUpperCase()}</text>

      <!-- Linhas decorativas simulando instruções -->
      <rect x="18" y="104" width="64" height="2" rx="1" fill="#cbd5e1" />
      <rect x="18" y="109" width="48" height="2" rx="1" fill="#e2e8f0" />
      <rect x="18" y="114" width="56" height="2" rx="1" fill="#e2e8f0" />

      <!-- Marcação INEP rodapé -->
      <text x="50" y="126" font-family="-apple-system, sans-serif" font-size="4.5" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="1">INEP · OFICIAL</text>
    </svg>
  `;
}

// ============================================================
//  CONFIGURAÇÃO DOS 12 CADERNOS
// ============================================================
const CADERNOS_CONFIG = {
  1: [
    { key: 'dia1-caderno1',  cor: 'Azul',    hex: '#0057a3', numero: 1,  sub: 'Caderno 1 · Regular' },
    { key: 'dia1-caderno2',  cor: 'Amarelo', hex: '#d97706', numero: 2,  sub: 'Caderno 2 · Regular' },
    { key: 'dia1-caderno3',  cor: 'Branco',  hex: '#e2e8f0', numero: 3,  sub: 'Caderno 3 · Regular', textColor: '#0f172a' },
    { key: 'dia1-caderno4',  cor: 'Verde',   hex: '#059669', numero: 4,  sub: 'Caderno 4 · Regular' },
    { key: 'dia1-caderno9',  cor: 'Marrom',  hex: '#78350f', numero: 9,  sub: 'Caderno 9 · Braile/Ledor' },
    { key: 'dia1-caderno10', cor: 'Roxo',    hex: '#7e22ce', numero: 10, sub: 'Caderno 10 · Libras' }
  ],
  2: [
    { key: 'dia2-caderno5',  cor: 'Amarelo', hex: '#d97706', numero: 5,  sub: 'Caderno 5 · Regular' },
    { key: 'dia2-caderno6',  cor: 'Cinza',   hex: '#64748b', numero: 6,  sub: 'Caderno 6 · Regular' },
    { key: 'dia2-caderno7',  cor: 'Azul',    hex: '#0057a3', numero: 7,  sub: 'Caderno 7 · Regular' },
    { key: 'dia2-caderno8',  cor: 'Verde',   hex: '#059669', numero: 8,  sub: 'Caderno 8 · Regular' },
    { key: 'dia2-caderno11', cor: 'Marrom',  hex: '#78350f', numero: 11, sub: 'Caderno 11 · Braile/Ledor' },
    { key: 'dia2-caderno12', cor: 'Roxo',    hex: '#7e22ce', numero: 12, sub: 'Caderno 12 · Libras' }
  ]
};

// ============================================================
//  PASSO 1: ESCOLHA DO DIA
// ============================================================
const CORES_AMBIENTE_CADERNO = {
  azul: '#0057a3', amarelo: '#d97706', branco: '#94a3b8', verde: '#059669',
  cinza: '#64748b', marrom: '#78350f', roxo: '#7e22ce'
};
let ambientFrame = null;

function obterCorDoCaderno(key) {
  const gabarito = GABARITOS[key];
  const cor = gabarito && gabarito.cor ? gabarito.cor.toLowerCase() : 'azul';
  return CORES_AMBIENTE_CADERNO[cor] || CORES_AMBIENTE_CADERNO.azul;
}

function agendarFundoCadernos() {
  if (ambientFrame !== null) cancelAnimationFrame(ambientFrame);
  ambientFrame = requestAnimationFrame(() => {
    ambientFrame = null;
    atualizarFundoCadernos();
  });
}

function atualizarFundoCadernos() {
  const fundo = document.getElementById('selectionAmbient');
  const onda = document.getElementById('selectionAmbientWave');
  if (!fundo || !onda) return;

  const doisDias = config.modoCorrecao === 'dois';
  const corA = obterCorDoCaderno(doisDias ? config.cadernoDia1Key : config.cadernoKey);
  const corB = obterCorDoCaderno(doisDias ? config.cadernoDia2Key : config.cadernoKey);
  fundo.dataset.mode = doisDias ? 'dual' : 'single';
  fundo.style.setProperty('--ambient-a', corA);
  fundo.style.setProperty('--ambient-b', corB);

  // O celular recebe a cor imediatamente; evita refazer layout e animar uma máscara de tela inteira.
  if (window.matchMedia('(max-width: 600px)').matches) {
    onda.classList.add('is-expanding');
    return;
  }

  const lado = Math.floor(Math.random() * 4);
  const ponto = Math.floor(16 + Math.random() * 68);
  const origem = [
    [`${ponto}%`, '-8%'],
    ['108%', `${ponto}%`],
    [`${ponto}%`, '108%'],
    ['-8%', `${ponto}%`]
  ][lado];
  onda.style.setProperty('--wave-x', origem[0]);
  onda.style.setProperty('--wave-y', origem[1]);

  onda.classList.remove('is-expanding');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onda.classList.add('is-expanding');
    return;
  }
  void onda.offsetWidth;
  onda.classList.add('is-expanding');
}
function definirModoCorrecao(modo) {
  config.modoCorrecao = modo;
  const doisDias = modo === 'dois';
  const areaIndividual = document.getElementById('modoIndividualArea');
  const areaDoisDias = document.getElementById('modoDoisDiasArea');
  const grupoIdioma = document.getElementById('grupoIdioma');
  const btnUm = document.getElementById('btnModoIndividual');
  const btnDois = document.getElementById('btnModoDuplo');

  btnUm.classList.toggle('selected', !doisDias);
  btnDois.classList.toggle('selected', doisDias);
  btnUm.setAttribute('aria-pressed', String(!doisDias));
  btnDois.setAttribute('aria-pressed', String(doisDias));
  areaIndividual.classList.toggle('hidden', doisDias);
  areaDoisDias.classList.toggle('hidden', !doisDias);
  grupoIdioma.style.display = (doisDias || config.dia === 1) ? 'block' : 'none';

  if (doisDias) {
    renderizarCadernos(1, 'cadernosDia1Grid', config.cadernoDia1Key);
    renderizarCadernos(2, 'cadernosDia2Grid', config.cadernoDia2Key);
  }
  atualizarBotaoIniciar();
  agendarFundoCadernos();
}

function definirDia(dia) {
  config.dia = dia;

  const btnD1 = document.getElementById('btnDia1');
  const btnD2 = document.getElementById('btnDia2');
  if (btnD1 && btnD2) {
    btnD1.classList.toggle('selected', dia === 1);
    btnD2.classList.toggle('selected', dia === 2);
  }

  const grupoIdioma = document.getElementById('grupoIdioma');
  if (grupoIdioma) {
    grupoIdioma.style.display = (config.modoCorrecao === 'dois' || dia === 1) ? 'block' : 'none';
  }

  renderizarCadernos(dia, 'cadernosGrid');
}

function renderizarCadernos(dia, containerId = 'cadernosGrid', keySelecionado = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const lista = CADERNOS_CONFIG[dia] || [];
  lista.forEach(item => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'caderno-card';
    card.id = `card-${containerId}-${item.key}`;
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML = `
      ${gerarSvgCapaCaderno(item.cor, item.hex, item.numero, dia, item.textColor, containerId)}
      <span class="caderno-title">${item.cor}</span>
      <span class="caderno-sub">Caderno ${item.numero} · ${item.sub.split('·').pop().trim()}</span>
    `;
    card.addEventListener('click', () => selecionarCaderno(item.key, containerId, dia));
    container.appendChild(card);
  });

  const chaveSalva = containerId === 'cadernosDia1Grid'
    ? config.cadernoDia1Key
    : containerId === 'cadernosDia2Grid'
      ? config.cadernoDia2Key
      : keySelecionado;
  const chaveValida = lista.some(item => item.key === chaveSalva) ? chaveSalva : (lista[0] && lista[0].key);
  if (chaveValida) selecionarCaderno(chaveValida, containerId, dia);
}

function selecionarCaderno(key, containerId = 'cadernosGrid', dia = config.dia) {
  if (containerId === 'cadernosDia1Grid') config.cadernoDia1Key = key;
  else if (containerId === 'cadernosDia2Grid') config.cadernoDia2Key = key;
  else config.cadernoKey = key;

  const container = document.getElementById(containerId);
  if (container) {
    container.querySelectorAll('.caderno-card').forEach(card => {
      const selecionado = card.id === `card-${containerId}-${key}`;
      card.classList.toggle('selected', selecionado);
      card.setAttribute('aria-pressed', String(selecionado));
    });
  }
  atualizarBotaoIniciar();
  agendarFundoCadernos();
}

function atualizarBotaoIniciar() {
  const botao = document.getElementById('btnIniciar');
  const nota = document.getElementById('startActionNote');
  if (!botao) return;

  if (config.modoCorrecao === 'dois') {
    const gabDia1 = GABARITOS[config.cadernoDia1Key];
    const gabDia2 = GABARITOS[config.cadernoDia2Key];
    const pronto = Boolean(gabDia1 && gabDia2);
    botao.disabled = !pronto;
    botao.textContent = pronto ? 'Iniciar correção · 180 questões →' : 'Selecione um caderno para cada dia';
    if (nota) nota.textContent = pronto ? `${gabDia1.nome} + ${gabDia2.nome}` : 'Escolha um caderno do 1º e outro do 2º dia.';
    return;
  }

  const gab = GABARITOS[config.cadernoKey];
  botao.disabled = !gab;
  botao.textContent = gab ? `Abrir prova · ${gab.nome} →` : 'Selecione um caderno para continuar';
  if (nota) nota.textContent = gab ? `${gab.nome} · 90 questões` : 'Escolha o caderno correspondente à sua prova.';
}
function definirIdioma(idioma) {
  config.idioma = idioma;
  const btnIng = document.getElementById('btnIngles');
  const btnEsp = document.getElementById('btnEspanhol');

  if (btnIng && btnEsp) {
    btnIng.classList.toggle('selected', idioma === 'ingles');
    btnEsp.classList.toggle('selected', idioma === 'espanhol');
  }
}

// ============================================================
//  INICIAR CORREÇÃO
// ============================================================
function iniciarCorrecao(estadoSalvo = null) {
  if (!estadoSalvo) {
    const rascunhoExistente = lerRascunhoCorrecao();
    if (rascunhoExistente) {
      const continuar = window.confirm('Há uma correção salva neste aparelho. Deseja continuar de onde parou? Se escolher Cancelar, o progresso salvo será substituído pela nova correção.');
      if (continuar) {
        iniciarCorrecao(rascunhoExistente);
        return;
      }
      limparRascunhoCorrecao();
    }
  } else {
    config.modoCorrecao = estadoSalvo.modoCorrecao;
    config.dia = estadoSalvo.dia;
    config.cadernoKey = estadoSalvo.cadernoKey;
    config.cadernoDia1Key = estadoSalvo.cadernoDia1Key;
    config.cadernoDia2Key = estadoSalvo.cadernoDia2Key;
    config.idioma = estadoSalvo.idioma;
    definirModoCorrecao(config.modoCorrecao);
    if (config.modoCorrecao === 'um') definirDia(config.dia);
    definirIdioma(config.idioma);
  }

  let inicio;
  let fim;

  config.gabarito = null;
  config.gabaritosPorDia = null;

  if (config.modoCorrecao === 'dois') {
    const gabDia1 = GABARITOS[config.cadernoDia1Key];
    const gabDia2 = GABARITOS[config.cadernoDia2Key];
    if (!gabDia1 || !gabDia2) {
      alert('Selecione um caderno para cada dia.');
      return;
    }
    config.gabaritosPorDia = { 1: gabDia1, 2: gabDia2 };
    config.areas = [...AREAS_DIA1, ...AREAS_DIA2];
    inicio = 1;
    fim = 180;
  } else {
    const gab = GABARITOS[config.cadernoKey];
    if (!gab) {
      alert('Selecione um caderno válido para continuar.');
      return;
    }
    config.gabarito = gab;
    config.areas = (config.dia === 1) ? AREAS_DIA1 : AREAS_DIA2;
    inicio = (config.dia === 1) ? 1 : 91;
    fim = (config.dia === 1) ? 90 : 180;
  }

  config.respostas = {};
  config.questoes = [];
  for (let q = inicio; q <= fim; q++) config.questoes.push(q);
  if (estadoSalvo) {
    const numerosValidos = new Set(config.questoes.map(String));
    Object.entries(estadoSalvo.respostas || {}).forEach(([numero, resposta]) => {
      if (numerosValidos.has(numero) && ['A', 'B', 'C', 'D', 'E', 'ANULADA', ''].includes(resposta)) config.respostas[numero] = resposta;
    });
    config.indiceQuestao = Math.min(estadoSalvo.indiceQuestao, config.questoes.length - 1);
  } else {
    config.indiceQuestao = 0;
  }
  retornandoAoResultado = false;
  correcaoConcluida = false;
  document.querySelector('.quiz-return-result')?.classList.add('hidden');

  document.getElementById('configScreen').classList.add('hidden');
  document.getElementById('resultadoScreen').classList.add('hidden');
  document.body.classList.remove('selection-active');
  document.body.classList.add('quiz-active');
  document.getElementById('quizScreen').classList.remove('hidden');

  const mainHeader = document.getElementById('mainHeader');
  if (mainHeader) mainHeader.classList.add('hidden');

  window.scrollTo(0, 0);
  exibirQuestao();
}

function obterDiaDaQuestao(n) {
  return config.modoCorrecao === 'dois' ? (n <= 90 ? 1 : 2) : config.dia;
}

function aplicarTemaDoCaderno(gabarito) {
  const temas = {
    azul: { principal: '#2563eb', suave: 'rgba(37,99,235,.12)' },
    amarelo: { principal: '#c27a13', suave: 'rgba(194,122,19,.12)' },
    branco: { principal: '#64748b', suave: 'rgba(100,116,139,.13)' },
    verde: { principal: '#059669', suave: 'rgba(5,150,105,.12)' },
    cinza: { principal: '#64748b', suave: 'rgba(100,116,139,.13)' },
    marrom: { principal: '#8a4b27', suave: 'rgba(138,75,39,.12)' },
    roxo: { principal: '#7c3aed', suave: 'rgba(124,58,237,.12)' }
  };
  const tema = temas[(gabarito.cor || 'azul').toLowerCase()] || temas.azul;
  const tela = document.getElementById('quizScreen');
  tela.style.setProperty('--quiz-accent', tema.principal);
  tela.style.setProperty('--quiz-accent-soft', tema.suave);
}
function obterGabaritoDaQuestao(n) {
  const dia = obterDiaDaQuestao(n);
  if (config.modoCorrecao === 'dois') {
    return config.gabaritosPorDia ? config.gabaritosPorDia[dia] : null;
  }
  return config.gabarito;
}
function getGabaritoOficial(n) {
  const gab = obterGabaritoDaQuestao(n);
  if (!gab) return null;

  if (obterDiaDaQuestao(n) === 1) {
    if (n >= 1 && n <= 5) {
      const src = (config.idioma === 'ingles') ? gab.LC_ingles : gab.LC_espanhol;
      return src ? src[n] : null;
    }
    if (n >= 6 && n <= 45) return gab.LC_comum ? gab.LC_comum[n] : null;
    if (n >= 46 && n <= 90) return gab.CH ? gab.CH[n] : null;
  } else {
    if (n >= 91 && n <= 135) return gab.CN ? gab.CN[n] : null;
    if (n >= 136 && n <= 180) return gab.MT ? gab.MT[n] : null;
  }
  return null;
}

function getAreaDaQuestao(n) {
  return config.areas.find(a => n >= a.ini && n <= a.fim) || config.areas[0];
}

function exibirQuestao() {
  const n = config.questoes[config.indiceQuestao];
  const area = getAreaDaQuestao(n);
  const total = config.questoes.length;
  const atualIndex = config.indiceQuestao + 1;

  // Número da questão em destaque
  const numDisplay = document.getElementById('numeroQuestaoDisplay');
  if (numDisplay) numDisplay.textContent = n;

  // Contador simples (ex: 1 / 90)
  const progTexto = document.getElementById('progressoTexto');
  if (progTexto) progTexto.textContent = `${atualIndex} / ${total}`;

  // Identifica o caderno correspondente à questão atual.
  const cadernoBadge = document.getElementById('quizCadernoNome');
  const gabDoCadernoAtual = obterGabaritoDaQuestao(n);
  if (cadernoBadge && gabDoCadernoAtual) {
    cadernoBadge.textContent = gabDoCadernoAtual.nome;
    aplicarTemaDoCaderno(gabDoCadernoAtual);
  }
  // Barra de progresso fina
  const miniBarra = document.getElementById('quizMiniBarra');
  if (miniBarra) {
    miniBarra.style.width = `${(atualIndex / total) * 100}%`;
  }

  // Nome da área
  const areaDisplay = document.getElementById('areaNomeDisplay');
  if (areaDisplay) {
    let nomeArea = area.nome;
    if (n >= 1 && n <= 5 && obterDiaDaQuestao(n) === 1) {
      nomeArea += (config.idioma === 'ingles') ? ' · Inglês' : ' · Espanhol';
    }
    areaDisplay.textContent = nomeArea;
  }

  // Anulada
  const gabCorreto = getGabaritoOficial(n);
  const isAnulada = (gabCorreto === 'ANULADA');
  const badgeInfo = document.getElementById('qBadgeInfo');
  if (badgeInfo) {
    if (isAnulada) {
      badgeInfo.textContent = '⭐ Questão Anulada pelo INEP (ponto garantido)';
      badgeInfo.style.display = 'inline-block';
      if (config.respostas[n] === undefined) {
        config.respostas[n] = 'ANULADA';
      }
    } else {
      badgeInfo.style.display = 'none';
    }
  }

  // Renderiza apenas os botões circulares [A] [B] [C] [D] [E]
  renderizarApenasAlternativas(n, isAnulada);

  // Controle de voltar
  const btnVoltar = document.getElementById('btnVoltarQuestao');
  if (btnVoltar) {
    btnVoltar.disabled = (config.indiceQuestao === 0);
  }
  const botaoEmBranco = document.querySelector('.btn-nav-blank');
  const respostaEmBranco = config.respostas[n] === '';
  if (botaoEmBranco) {
    botaoEmBranco.classList.toggle('selected', respostaEmBranco);
    botaoEmBranco.setAttribute('aria-pressed', String(respostaEmBranco));
  }

  const textoAvancar = document.getElementById('textoBotaoAvancar');
  if (textoAvancar) {
    textoAvancar.textContent = config.indiceQuestao === config.questoes.length - 1 ? 'Ver resultado' : 'Próxima';
  }
  const voltarResultado = document.querySelector('.quiz-return-result');
  if (voltarResultado) voltarResultado.classList.toggle('hidden', !retornandoAoResultado);
  salvarRascunhoCorrecao();
}

function renderizarApenasAlternativas(n, isAnulada) {
  const container = document.getElementById('alternativasContainer');
  if (!container) return;
  const respMarcada = config.respostas[n];
  const letras = ['A', 'B', 'C', 'D', 'E'];

  container.innerHTML = '';

  // Cria APENAS os botões circulares das letras A, B, C, D, E
  letras.forEach(letra => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'alt-btn-circle' + (respMarcada === letra ? ' selected' : '');
    btn.setAttribute('aria-label', 'Alternativa ' + letra);

    btn.disabled = isAnulada;
    btn.innerHTML = `<span class="answer-choice-letter">${letra}</span><span class="answer-choice-label">Alternativa</span><span class="answer-choice-check" aria-hidden="true">✓</span>`;
    btn.setAttribute('aria-pressed', String(respMarcada === letra));
    btn.addEventListener('click', () => {
      clicarAlternativa(n, letra, btn);
    });
    container.appendChild(btn);
  });
}

function clicarAlternativa(n, letra, btnClicado) {
  config.respostas[n] = letra;
  document.querySelectorAll('.alt-btn-circle').forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
  btnClicado.classList.add('selected');
  btnClicado.setAttribute('aria-pressed', 'true');

  const botaoEmBranco = document.querySelector('.btn-nav-blank');
  if (botaoEmBranco) {
    botaoEmBranco.classList.remove('selected');
    botaoEmBranco.setAttribute('aria-pressed', 'false');
  }
  salvarRascunhoCorrecao();
}
function marcarEmBranco() {
  const n = config.questoes[config.indiceQuestao];
  if (getGabaritoOficial(n) === 'ANULADA') return;

  config.respostas[n] = '';
  document.querySelectorAll('.alt-btn-circle').forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });
  const botaoEmBranco = document.querySelector('.btn-nav-blank');
  if (botaoEmBranco) {
    botaoEmBranco.classList.add('selected');
    botaoEmBranco.setAttribute('aria-pressed', 'true');
  }
  salvarRascunhoCorrecao();
}
function avancarQuestao() {
  const n = config.questoes[config.indiceQuestao];
  if (config.respostas[n] === undefined) config.respostas[n] = '';

  if (config.indiceQuestao < config.questoes.length - 1) {
    config.indiceQuestao++;
    exibirQuestao();
  } else {
    concluirCorrecao();
  }
}
function voltarQuestao() {
  if (config.indiceQuestao > 0) {
    config.indiceQuestao--;
    exibirQuestao();
  }
}

function concluirCorrecao() {
  correcaoConcluida = true;
  retornandoAoResultado = false;
  document.querySelector('.quiz-return-result')?.classList.add('hidden');
  limparRascunhoCorrecao();
  document.body.classList.remove('selection-active');
  document.body.classList.remove('quiz-active');
  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('resultadoScreen').classList.remove('hidden');
  const mainHeader = document.getElementById('mainHeader');
  if (mainHeader) mainHeader.classList.remove('hidden');
  window.scrollTo(0, 0);
  gerarRelatorioFinal();
}

function retomarCorrecao() {
  const rascunho = lerRascunhoCorrecao();
  if (rascunho) iniciarCorrecao(rascunho);
}

function revisarQuestaoDoResultado(numero) {
  const indice = config.questoes.indexOf(numero);
  if (indice < 0) return;
  retornandoAoResultado = true;
  config.indiceQuestao = indice;
  document.getElementById('resultadoScreen').classList.add('hidden');
  document.getElementById('quizScreen').classList.remove('hidden');
  document.body.classList.add('quiz-active');
  document.body.classList.remove('selection-active');
  document.getElementById('mainHeader')?.classList.add('hidden');
  exibirQuestao();
  document.querySelector('.q-numero-destaque')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function voltarAoResultado() {
  if (!retornandoAoResultado) return;
  retornandoAoResultado = false;
  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('resultadoScreen').classList.remove('hidden');
  document.body.classList.remove('quiz-active');
  document.getElementById('mainHeader')?.classList.remove('hidden');
  gerarRelatorioFinal();
  document.getElementById('resultadoTitulo')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function gerarRelatorioFinal() {
  const subtituloResultado = document.getElementById('resultadoSubtitulo');
  if (subtituloResultado) {
    if (config.modoCorrecao === 'dois') {
      const dia1 = GABARITOS[config.cadernoDia1Key];
      const dia2 = GABARITOS[config.cadernoDia2Key];
      subtituloResultado.textContent = `Resumo dos dois dias: ${dia1.nome} e ${dia2.nome}.`;
    } else {
      subtituloResultado.textContent = `Resumo de acertos · ${config.gabarito.nome}.`;
    }
  }

  let acertosGerais = 0;
  const listaDetalhes = [];
  const resultadosArea = [];

  config.areas.forEach(area => {
    let acertosArea = 0;
    const totalArea = area.fim - area.ini + 1;
    const dia = area.ini <= 90 ? 1 : 2;

    for (let n = area.ini; n <= area.fim; n++) {
      const correta = getGabaritoOficial(n);
      const marcada = config.respostas[n];

      if (correta === 'ANULADA') {
        acertosArea++;
        listaDetalhes.push({ n, area: area.nome, dia, marcada: '—', correta: 'ANULADA', acertou: true, anulada: true });
        continue;
      }

      if (marcada === undefined || marcada === '') {
        listaDetalhes.push({ n, area: area.nome, dia, marcada: 'Em branco', correta, acertou: false, anulada: false });
      } else if (marcada === correta) {
        acertosArea++;
        listaDetalhes.push({ n, area: area.nome, dia, marcada, correta, acertou: true, anulada: false });
      } else {
        listaDetalhes.push({ n, area: area.nome, dia, marcada, correta, acertou: false, anulada: false });
      }
    }

    acertosGerais += acertosArea;
    resultadosArea.push({ area, dia, acertos: acertosArea, total: totalArea });
  });

  const containerAreas = document.getElementById('listaResultadosArea');
  containerAreas.innerHTML = '';
  [1, 2].forEach(dia => {
    const areasDoDia = resultadosArea.filter(item => item.dia === dia);
    if (!areasDoDia.length) return;

    const acertosDia = areasDoDia.reduce((soma, item) => soma + item.acertos, 0);
    const totalDia = areasDoDia.reduce((soma, item) => soma + item.total, 0);
    const pctDia = Math.round((acertosDia / totalDia) * 100);
    const nomeDia = dia === 1 ? '1º dia' : '2º dia';
    const descricaoDia = dia === 1
      ? 'Linguagens e Ciências Humanas'
      : 'Ciências da Natureza e Matemática';
    const grupoDia = document.createElement('section');
    grupoDia.className = 'result-day-group';
    grupoDia.innerHTML = `
      <div class="result-day-heading">
        <span class="result-day-index">0${dia}</span>
        <div><h2>${nomeDia}</h2><p>${descricaoDia}</p></div>
      </div>
      <div class="result-area-grid"></div>
      <div class="result-day-subtotal">
        <div class="result-subtotal-copy"><strong>Subtotal do ${nomeDia}</strong><span>${totalDia} questões</span></div>
        <div class="result-subtotal-score"><strong>${acertosDia}</strong><span>/ ${totalDia} · ${pctDia}%</span></div>
        <div class="result-subtotal-track"><span style="width:${pctDia}%"></span></div>
      </div>
    `;
    const gradeAreas = grupoDia.querySelector('.result-area-grid');

    areasDoDia.forEach(({ area, acertos, total }) => {
      const pct = Math.round((acertos / total) * 100);
      const cardArea = document.createElement('article');
      cardArea.className = 'area-stat-card';
      cardArea.innerHTML = `
        <div class="area-stat-top">
          <span class="area-stat-name">${area.nome}</span>
          <span class="area-stat-score"><strong>${acertos}</strong><span>/ ${total}</span></span>
        </div>
        <div class="area-progress-bg"><div class="area-progress-fill" style="width:${pct}%;--area-accent:${area.cor}"></div></div>
        <div class="area-stat-foot"><span>${pct}% de acertos</span><span>${total - acertos} para revisar</span></div>
      `;
      gradeAreas.appendChild(cardArea);
    });

    containerAreas.appendChild(grupoDia);
  });

  const totalGeral = config.questoes.length;
  document.getElementById('scoreAcertosTotal').textContent = acertosGerais;
  document.getElementById('scoreTotalQuestoes').textContent = totalGeral;
  document.getElementById('scoreTotalRotulo').textContent = 'acertos no total';

  const pctGeral = Math.round((acertosGerais / totalGeral) * 100);
  document.getElementById('scorePercentual').textContent = `${pctGeral}%`;
  document.getElementById('resultadoTitulo').textContent = 'Seu desempenho';

  renderizarGabaritosOficiais();
  renderizarTabelaGabarito(listaDetalhes, 'issues');
}

function renderizarGabaritosOficiais() {
  if (observadorPreviaDocumento) {
    observadorPreviaDocumento.disconnect();
    observadorPreviaDocumento = null;
  }
  const gabaritos = config.modoCorrecao === 'dois'
    ? [config.gabaritosPorDia && config.gabaritosPorDia[1], config.gabaritosPorDia && config.gabaritosPorDia[2]]
    : [config.gabarito];
  renderizarListaDocumentosOficiais('officialKeyCards', gabaritos, 'pdfGabarito', 'Gabarito');
  renderizarListaDocumentosOficiais('officialExamCards', gabaritos, 'pdfProva', 'Prova');
}

function renderizarListaDocumentosOficiais(containerId, gabaritos, propriedadeArquivo, tipoDocumento) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const selecionados = gabaritos.filter(gabarito => gabarito && gabarito[propriedadeArquivo]);
  container.innerHTML = '';
  container.classList.toggle('is-dual', selecionados.length > 1);

  selecionados.forEach(gabarito => {
    const corNome = (gabarito.cor || '').toLowerCase();
    const cor = CORES_AMBIENTE_CADERNO[corNome] || '#2563eb';
    const dia = Number(gabarito.dia) || 1;
    const arquivo = gabarito[propriedadeArquivo];
    const tituloDocumento = `${tipoDocumento} oficial · ${gabarito.nome}`;
    const card = document.createElement('article');
    card.className = 'official-key-card';
    card.style.setProperty('--key-accent', cor);
    card.innerHTML = `
      <header class="official-key-card-header">
        <span class="official-key-day">${dia}º DIA</span>
        <strong>${gabarito.nome}</strong>
        <a href="${arquivo}" target="_blank" rel="noopener noreferrer">Abrir ${tipoDocumento.toLowerCase()} <span aria-hidden="true">↗</span></a>
      </header>
      <div class="official-key-preview">
        <div class="official-key-canvas-host" data-pdf-preview data-pdf-url="${arquivo}" role="img" aria-label="Prévia da primeira página de ${tituloDocumento}"></div>
        <button type="button" class="official-key-preview-trigger" aria-label="Ampliar ${tipoDocumento.toLowerCase()}: ${gabarito.nome}">
          <span>Ampliar ${tipoDocumento.toLowerCase()} <span aria-hidden="true">↗</span></span>
        </button>
      </div>
    `;
    const gatilho = card.querySelector('.official-key-preview-trigger');
    gatilho.addEventListener('click', () => abrirGabarito(arquivo, tituloDocumento, gatilho));
    container.appendChild(card);
    agendarPreviaDocumento(arquivo, card.querySelector('[data-pdf-preview]'));
  });

  if (!selecionados.length) {
    const aviso = document.createElement('p');
    aviso.className = 'official-key-unavailable';
    aviso.textContent = `O arquivo da ${tipoDocumento.toLowerCase()} oficial não está disponível para esta seleção.`;
    container.appendChild(aviso);
  }
}

let observadorPreviaDocumento = null;
let filaPreviaDocumentos = Promise.resolve();

function agendarPreviaDocumento(pdfUrl, container) {
  if (!container) return;
  if (!window.renderPDFPage) {
    container.textContent = 'Use “Abrir PDF” acima para ver o documento oficial.';
    container.classList.add('pdf-preview-error');
    return;
  }
  const renderizar = () => {
    if (!container.isConnected) return Promise.resolve();
    return window.renderPDFPage(pdfUrl, 1, container);
  };
  if (!('IntersectionObserver' in window)) {
    filaPreviaDocumentos = filaPreviaDocumentos.then(renderizar).catch(() => {});
    return;
  }
  if (!observadorPreviaDocumento) {
    observadorPreviaDocumento = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observadorPreviaDocumento.unobserve(entry.target);
        const alvo = entry.target;
        filaPreviaDocumentos = filaPreviaDocumentos
          .then(() => {
            if (!alvo.isConnected) return null;
            return window.renderPDFPage(alvo.dataset.pdfUrl, 1, alvo);
          })
          .catch(() => {});
      });
    }, { rootMargin: '100px 0px' });
  }
  observadorPreviaDocumento.observe(container);
}

let gatilhoGabaritoAtivo = null;

function abrirGabarito(pdfUrl, nome, gatilho) {
  const modal = document.getElementById('gabaritoLightbox');
  const page = document.getElementById('gabaritoLightboxPage');
  const titulo = document.getElementById('gabaritoLightboxTitle');
  const link = document.getElementById('gabaritoLightboxOpen');
  if (!modal || !page || !titulo || !link) return;
  if (!window.renderPDFPage) {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  gatilhoGabaritoAtivo = gatilho || document.activeElement;
  titulo.textContent = nome;
  link.href = pdfUrl;
  page.setAttribute('aria-label', `Página do documento: ${nome}`);
  modal.classList.remove('hidden');
  document.body.classList.add('gabarito-modal-open');
  window.requestAnimationFrame(() => window.renderPDFPage?.(pdfUrl, 1, page));
  modal.querySelector('.gabarito-lightbox-close').focus();
}

function fecharGabarito() {
  const modal = document.getElementById('gabaritoLightbox');
  const page = document.getElementById('gabaritoLightboxPage');
  if (!modal || modal.classList.contains('hidden')) return;

  modal.classList.add('hidden');
  document.body.classList.remove('gabarito-modal-open');
  if (page) window.clearPDFPage?.(page);
  if (gatilhoGabaritoAtivo && document.contains(gatilhoGabaritoAtivo)) gatilhoGabaritoAtivo.focus();
  gatilhoGabaritoAtivo = null;
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    fecharGabarito();
    fecharPainelAcessibilidade();
  }
});

function renderizarTabelaGabarito(lista, filtro = 'issues') {
  const container = document.getElementById('tabelaGabaritoCompleto');
  const filtros = document.querySelectorAll('[data-review-filter]');
  const erradas = lista.filter(item => !item.acertou && !item.anulada && item.marcada !== 'Em branco').length;
  const emBranco = lista.filter(item => !item.anulada && item.marcada === 'Em branco').length;
  const paraRevisar = erradas + emBranco;

  document.getElementById('reviewErradasResumo').textContent = paraRevisar;
  document.getElementById('reviewCountIssues').textContent = paraRevisar;
  document.getElementById('reviewCountWrong').textContent = erradas;
  document.getElementById('reviewCountBlank').textContent = emBranco;
  document.getElementById('reviewCountAll').textContent = lista.length;

  filtros.forEach(botao => {
    const selecionado = botao.dataset.reviewFilter === filtro;
    botao.classList.toggle('is-active', selecionado);
    botao.setAttribute('aria-pressed', String(selecionado));
    botao.onclick = () => renderizarTabelaGabarito(lista, botao.dataset.reviewFilter);
  });

  container.innerHTML = '';
  const filtradas = lista.filter(item => {
    if (filtro === 'issues') return !item.acertou && !item.anulada;
    if (filtro === 'wrong') return !item.acertou && !item.anulada && item.marcada !== 'Em branco';
    if (filtro === 'blank') return !item.anulada && item.marcada === 'Em branco';
    return true;
  }).sort((a, b) => a.n - b.n);

  if (!filtradas.length) {
    const vazio = document.createElement('p');
    vazio.className = 'review-empty-state';
    vazio.textContent = filtro === 'issues'
      ? 'Nenhuma questão errada ou em branco. Tudo certo!'
      : 'Não há questões nesta categoria.';
    container.appendChild(vazio);
    return;
  }

  const gruposArea = new Map();
  filtradas.forEach(item => {
    if (!gruposArea.has(item.area)) gruposArea.set(item.area, []);
    gruposArea.get(item.area).push(item);
  });

  gruposArea.forEach((itens, nomeArea) => {
    const grupo = document.createElement('section');
    grupo.className = 'review-area-group';
    grupo.innerHTML = `<div class="review-area-heading"><h3>${nomeArea}</h3><span>${itens.length} ${itens.length === 1 ? 'questão' : 'questões'}</span></div>`;
    const linhas = document.createElement('div');
    linhas.className = 'review-area-rows';

    itens.forEach(item => {
      const classeStatus = item.anulada ? 'anulada' : (item.acertou ? 'correct' : (item.marcada === 'Em branco' ? 'blank' : 'wrong'));
      const status = item.anulada ? 'Anulada · ponto garantido' : (item.acertou ? 'Correta' : (item.marcada === 'Em branco' ? 'Em branco' : 'Errada'));
      const row = document.createElement('article');
      row.className = `answer-row ${classeStatus}`;
      row.innerHTML = `
        <button type="button" class="answer-question-number" data-action="review-question" data-question-number="${item.n}" aria-label="Voltar à questão ${item.n}">Q${item.n}</button>
        <div class="answer-comparison">
          <span><small>Sua resposta</small><strong>${item.anulada ? '—' : item.marcada}</strong></span>
          <span><small>Gabarito</small><strong>${item.anulada ? 'Ponto garantido' : item.correta}</strong></span>
        </div>
        <span class="answer-status-pill">${status}</span>
      `;
      linhas.appendChild(row);
    });

    grupo.appendChild(linhas);
    container.appendChild(grupo);
  });
}

function compartilharResultado() {
  const botao = document.querySelector('[data-action="share-result"]');
  const status = document.getElementById('shareResultStatus');
  const nomeAreas = [...document.querySelectorAll('.area-stat-card')].map(card => ({
    nome: card.querySelector('.area-stat-name')?.textContent.trim() || '',
    acertos: card.querySelector('.area-stat-score strong')?.textContent.trim() || '0',
    total: card.querySelector('.area-stat-score span')?.textContent.replace('/', '').trim() || '45'
  }));

  if (!botao || !nomeAreas.length) return;
  botao.disabled = true;
  if (status) status.textContent = 'Preparando seu resumo…';

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const contexto = canvas.getContext('2d');
  if (!contexto) {
    botao.disabled = false;
    if (status) status.textContent = 'Não foi possível criar a imagem neste navegador.';
    return;
  }

  const arredondar = (x, y, largura, altura, raio, cor) => {
    contexto.beginPath();
    if (typeof contexto.roundRect === 'function') contexto.roundRect(x, y, largura, altura, raio);
    else {
      contexto.moveTo(x + raio, y);
      contexto.lineTo(x + largura - raio, y);
      contexto.quadraticCurveTo(x + largura, y, x + largura, y + raio);
      contexto.lineTo(x + largura, y + altura - raio);
      contexto.quadraticCurveTo(x + largura, y + altura, x + largura - raio, y + altura);
      contexto.lineTo(x + raio, y + altura);
      contexto.quadraticCurveTo(x, y + altura, x, y + altura - raio);
      contexto.lineTo(x, y + raio);
      contexto.quadraticCurveTo(x, y, x + raio, y);
    }
    contexto.fillStyle = cor;
    contexto.fill();
  };
  const quebrarLinha = (texto, x, y, larguraMaxima, alturaLinha, maxLinhas = 2) => {
    const palavras = texto.split(/\s+/);
    let linha = '';
    let linhas = 0;
    palavras.forEach(palavra => {
      const teste = linha ? `${linha} ${palavra}` : palavra;
      if (contexto.measureText(teste).width > larguraMaxima && linha) {
        contexto.fillText(linha, x, y + linhas * alturaLinha);
        linhas++;
        linha = palavra;
      } else linha = teste;
    });
    if (linha && linhas < maxLinhas) contexto.fillText(linha, x, y + linhas * alturaLinha);
  };

  const fundo = contexto.createLinearGradient(0, 0, 1080, 1350);
  fundo.addColorStop(0, '#0b1830');
  fundo.addColorStop(1, '#10284a');
  contexto.fillStyle = fundo;
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.fillStyle = '#34b8f2';
  contexto.fillRect(0, 0, canvas.width, 14);
  contexto.fillStyle = 'rgba(56,189,248,.12)';
  contexto.beginPath();
  contexto.arc(1010, 120, 245, 0, Math.PI * 2);
  contexto.fill();

  contexto.fillStyle = '#7dd3fc';
  contexto.font = '800 27px system-ui, sans-serif';
  contexto.fillText('ENEM 2026  ·  CORREÇÃO DE GABARITO', 76, 100);
  contexto.fillStyle = '#ffffff';
  contexto.font = '800 66px system-ui, sans-serif';
  contexto.fillText('Meu desempenho', 76, 198);
  contexto.fillStyle = '#c6d5e8';
  contexto.font = '500 27px system-ui, sans-serif';
  quebrarLinha(document.getElementById('resultadoSubtitulo')?.textContent || 'Resumo da minha correção', 76, 254, 900, 40, 2);

  arredondar(66, 330, 948, 280, 30, '#f8fbff');
  contexto.fillStyle = '#60758d';
  contexto.font = '800 23px system-ui, sans-serif';
  contexto.fillText('ACERTOS', 108, 394);
  contexto.fillStyle = '#0f9b70';
  contexto.font = '900 125px system-ui, sans-serif';
  contexto.fillText(document.getElementById('scoreAcertosTotal')?.textContent.trim() || '0', 103, 535);
  contexto.fillStyle = '#18304d';
  contexto.font = '700 42px system-ui, sans-serif';
  contexto.fillText(`/ ${document.getElementById('scoreTotalQuestoes')?.textContent.trim() || '90'}`, 300, 530);
  arredondar(760, 390, 205, 150, 24, '#e7f6f0');
  contexto.fillStyle = '#0b8f68';
  contexto.textAlign = 'center';
  contexto.font = '900 48px system-ui, sans-serif';
  contexto.fillText(document.getElementById('scorePercentual')?.textContent.trim() || '0%', 862, 460);
  contexto.fillStyle = '#416957';
  contexto.font = '700 19px system-ui, sans-serif';
  contexto.fillText('de acertos', 862, 498);
  contexto.textAlign = 'left';

  contexto.fillStyle = '#ddecfa';
  contexto.font = '800 24px system-ui, sans-serif';
  contexto.fillText('RESULTADO POR ÁREA', 78, 690);
  nomeAreas.forEach((area, indice) => {
    const y = 730 + indice * 116;
    arredondar(66, y, 948, 96, 18, 'rgba(255,255,255,.08)');
    contexto.fillStyle = '#ffffff';
    contexto.font = '700 22px system-ui, sans-serif';
    quebrarLinha(area.nome, 94, y + 36, 690, 25, 2);
    contexto.fillStyle = '#9ed8fb';
    contexto.textAlign = 'right';
    contexto.font = '800 23px system-ui, sans-serif';
    contexto.fillText(`${area.acertos} / ${area.total}`, 970, y + 56);
    contexto.textAlign = 'left';
  });

  contexto.fillStyle = '#9fb3cb';
  contexto.font = '600 21px system-ui, sans-serif';
  contexto.fillText('Confira sua prova e corrija em', 76, 1240);
  contexto.fillStyle = '#7dd3fc';
  contexto.font = '800 23px system-ui, sans-serif';
  contexto.fillText('corretor-enem-2026-siex.vercel.app', 76, 1281);

  canvas.toBlob(async imagem => {
    if (!imagem) {
      botao.disabled = false;
      if (status) status.textContent = 'Não foi possível criar a imagem. Tente novamente.';
      return;
    }
    const arquivo = typeof File === 'function' ? new File([imagem], 'meu-resultado-enem.png', { type: 'image/png' }) : null;
    try {
      if (arquivo && navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Meu resultado ENEM', text: 'Confira meu resumo de correção do ENEM.' });
        if (status) status.textContent = 'Imagem pronta para compartilhar.';
      } else {
        const url = URL.createObjectURL(imagem);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'meu-resultado-enem.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (status) status.textContent = 'Imagem baixada. Agora você pode compartilhar onde quiser.';
      }
    } catch (erro) {
      if (status) status.textContent = erro?.name === 'AbortError' ? 'Compartilhamento cancelado.' : 'Não foi possível compartilhar agora. Tente baixar a imagem novamente.';
    } finally {
      botao.disabled = false;
    }
  }, 'image/png');
}

function obterPreferenciasAcessibilidade() {
  try {
    const preferencias = JSON.parse(localStorage.getItem(CHAVE_ACESSIBILIDADE) || '{}');
    return {
      tamanho: Number.isInteger(preferencias.tamanho) ? Math.max(0, Math.min(3, preferencias.tamanho)) : 1,
      contraste: preferencias.contraste === true
    };
  } catch (_) {
    return { tamanho: 1, contraste: false };
  }
}

function salvarPreferenciasAcessibilidade() {
  try { localStorage.setItem(CHAVE_ACESSIBILIDADE, JSON.stringify({ tamanho: tamanhoTextoAcessivel, contraste: contrasteAcessivel })); } catch (_) { /* preferências seguem ativas nesta sessão */ }
}

function aplicarPreferenciasAcessibilidade() {
  const tamanhos = ['small', 'normal', 'large', 'xlarge'];
  document.documentElement.dataset.accessTextSize = tamanhos[tamanhoTextoAcessivel] || 'normal';
  document.body.classList.toggle('high-contrast', contrasteAcessivel);
  const contraste = document.getElementById('btnHighContrast');
  if (contraste) contraste.setAttribute('aria-pressed', String(contrasteAcessivel));
}

function inicializarPreferenciasAcessibilidade() {
  const preferencias = obterPreferenciasAcessibilidade();
  tamanhoTextoAcessivel = preferencias.tamanho;
  contrasteAcessivel = preferencias.contraste;
  aplicarPreferenciasAcessibilidade();
}

function ajustarTamanhoTexto(passo, redefinir = false) {
  tamanhoTextoAcessivel = redefinir ? 1 : Math.max(0, Math.min(3, tamanhoTextoAcessivel + passo));
  aplicarPreferenciasAcessibilidade();
  salvarPreferenciasAcessibilidade();
}

function alternarAltoContraste() {
  contrasteAcessivel = !contrasteAcessivel;
  aplicarPreferenciasAcessibilidade();
  salvarPreferenciasAcessibilidade();
}

function alternarPainelAcessibilidade() {
  const painel = document.getElementById('accessibilityPanel');
  const botoes = [...document.querySelectorAll('[data-action="toggle-accessibility"]')];
  if (!painel || !botoes.length) return;
  const abrir = painel.classList.contains('hidden');
  painel.classList.toggle('hidden', !abrir);
  botoes.forEach(botao => botao.setAttribute('aria-expanded', String(abrir)));
  if (abrir) painel.querySelector('button')?.focus();
}

function fecharPainelAcessibilidade() {
  document.getElementById('accessibilityPanel')?.classList.add('hidden');
  const botoes = [...document.querySelectorAll('[data-action="toggle-accessibility"]')];
  botoes.forEach(botao => botao.setAttribute('aria-expanded', 'false'));
  botoes.find(botao => !botao.closest('.hidden') && getComputedStyle(botao).display !== 'none')?.focus();
}

function textoDaTelaAtual() {
  if (!document.getElementById('capaInicialScreen').classList.contains('hidden')) {
    return 'ENEM 2026. Correção de gabarito. Sua prova, seu resultado. ' + (document.querySelector('.capa-subtitle')?.textContent || 'Comece uma correção.');
  }
  if (!document.getElementById('quizScreen').classList.contains('hidden')) {
    const numero = config.questoes[config.indiceQuestao];
    const selecionada = config.respostas[numero];
    const respostaTexto = selecionada === undefined ? 'Nenhuma resposta marcada.' : `Resposta marcada: ${selecionada === '' ? 'em branco' : selecionada}.`;
    return `${document.getElementById('quizCadernoNome')?.textContent || ''}. ${document.getElementById('areaNomeDisplay')?.textContent || ''}. Questão ${numero}. Alternativas A, B, C, D e E. ${respostaTexto}`;
  }
  if (!document.getElementById('configScreen').classList.contains('hidden')) {
    const modo = config.modoCorrecao === 'dois' ? 'Dois cadernos juntos' : (config.dia === 1 ? 'Primeiro dia' : 'Segundo dia');
    const caderno = config.modoCorrecao === 'dois'
      ? `${GABARITOS[config.cadernoDia1Key]?.nome || ''} e ${GABARITOS[config.cadernoDia2Key]?.nome || ''}`
      : GABARITOS[config.cadernoKey]?.nome || 'Escolha um caderno';
    return `Monte sua correção. ${modo}. ${caderno}. Escolha suas opções e pressione Abrir prova.`;
  }
  const total = document.getElementById('scoreAcertosTotal')?.textContent || '0';
  const totalQuestoes = document.getElementById('scoreTotalQuestoes')?.textContent || '0';
  const percentual = document.getElementById('scorePercentual')?.textContent || '0%';
  const areas = [...document.querySelectorAll('.area-stat-card')].map(card => `${card.querySelector('.area-stat-name')?.textContent || ''}: ${card.querySelector('.area-stat-score strong')?.textContent || '0'} acertos`).join('. ');
  return `Seu desempenho. ${total} acertos de ${totalQuestoes}, ${percentual}. ${areas}`;
}

function lerTelaAtualEmVozAlta() {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    const regiao = document.getElementById('appLiveRegion');
    if (regiao) regiao.textContent = 'A leitura em voz alta não está disponível neste navegador.';
    return;
  }
  window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(textoDaTelaAtual());
  fala.lang = 'pt-BR';
  fala.rate = 0.96;
  const vozPortugues = window.speechSynthesis.getVoices().find(voz => voz.lang.toLowerCase().startsWith('pt'));
  if (vozPortugues) fala.voice = vozPortugues;
  window.speechSynthesis.speak(fala);
}

function pararLeituraEmVozAlta() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const controle = event.target.closest('[data-action]');
  if (!controle || controle.disabled) return;

  switch (controle.dataset.action) {
    case 'start-selection': irParaSelecao(); break;
    case 'back-cover': voltarParaCapa(); break;
    case 'set-mode': definirModoCorrecao(controle.dataset.mode); break;
    case 'set-day': definirDia(Number(controle.dataset.day)); break;
    case 'set-language': definirIdioma(controle.dataset.language); break;
    case 'start-correction': iniciarCorrecao(); break;
    case 'resume-correction': retomarCorrecao(); break;
    case 'previous-question': voltarQuestao(); break;
    case 'blank-question': marcarEmBranco(); break;
    case 'next-question': avancarQuestao(); break;
    case 'return-to-results': voltarAoResultado(); break;
    case 'review-question': revisarQuestaoDoResultado(Number(controle.dataset.questionNumber)); break;
    case 'back-selection': voltarParaSelecao(); break;
    case 'close-document': fecharGabarito(); break;
    case 'share-result': compartilharResultado(); break;
    case 'toggle-accessibility': alternarPainelAcessibilidade(); break;
    case 'close-accessibility': fecharPainelAcessibilidade(); break;
    case 'change-text-size': ajustarTamanhoTexto(Number(controle.dataset.sizeStep)); break;
    case 'reset-text-size': ajustarTamanhoTexto(0, true); break;
    case 'toggle-contrast': alternarAltoContraste(); break;
    case 'read-current-screen': lerTelaAtualEmVozAlta(); break;
    case 'stop-reading': pararLeituraEmVozAlta(); break;
  }
});

inicializarPreferenciasAcessibilidade();
atualizarBotaoRetomar();
