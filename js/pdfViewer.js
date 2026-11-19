// ============================================================
//  pdfViewer.js — Renderiza páginas de PDF usando PDF.js
//  Apenas o canvas da prova, sem barras de controles
// ============================================================

const pdfCache = {};
let paginaAtualPDF = 1;
let totalPaginasPDF = 32;
let pdfCarregadoAtual = null;

function initPDFWorker() {
  if (window['pdfjs-dist/build/pdf']) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPDFWorker);
} else {
  initPDFWorker();
}

async function loadPDF(url) {
  if (pdfCache[url]) return pdfCache[url];

  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;
  pdfCache[url] = pdf;
  return pdf;
}

/**
 * Calcula a página estimada do caderno para uma questão
 */
function calcularPaginaQuestao(n, dia) {
  if (dia === 1) {
    if (n <= 5) return 2; // Inglês / Espanhol
    const pag = 2 + Math.floor((n - 5) / 2.9);
    return Math.min(32, Math.max(2, pag));
  } else {
    const pag = 2 + Math.floor((n - 91) / 2.9);
    return Math.min(32, Math.max(2, pag));
  }
}

/**
 * Renderiza a página da prova diretamente no container (Apenas a imagem, sem barras!)
 */
async function renderPDFPage(pdfUrl, pageNum, container) {
  paginaAtualPDF = pageNum;

  container.innerHTML = `
    <div class="q-image-loading">
      <div class="spinner"></div>
      <span>Carregando questão…</span>
    </div>
  `;

  try {
    const pdf = await loadPDF(pdfUrl);
    pdfCarregadoAtual = pdf;
    totalPaginasPDF = pdf.numPages;

    const clampedPage = Math.min(pdf.numPages, Math.max(1, pageNum));
    paginaAtualPDF = clampedPage;

    const page = await pdf.getPage(clampedPage);

    // Ajusta a resolução e escala para máxima nitidez
    const containerWidth = Math.min(container.clientWidth || 700, window.innerWidth - 32);
    const viewportPadrao = page.getViewport({ scale: 1 });
    const ratio = window.devicePixelRatio || 1;
    const scale = (containerWidth / viewportPadrao.width) * Math.min(ratio, 2);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    // Coloca APENAS o canvas da questão (sem controles de anterior/próxima pág!)
    container.innerHTML = '';
    container.appendChild(canvas);

    // Rola para o topo do container
    container.scrollTop = 0;

  } catch (err) {
    console.error('Erro ao carregar PDF:', err);
    container.innerHTML = `
      <div class="q-image-loading" style="padding: 24px; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">📄</div>
        <div style="font-weight: 700; margin-bottom: 6px;">Visualização da Prova</div>
        <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 320px; margin: 0 auto; line-height: 1.5;">
          ${err.message || 'Arquivo PDF não encontrado.'}
        </div>
      </div>
    `;
  }
}

async function preloadPDF(url) {
  try {
    await loadPDF(url);
  } catch (e) {}
}

window.renderPDFPage = renderPDFPage;
window.preloadPDF = preloadPDF;
window.calcularPaginaQuestao = calcularPaginaQuestao;
