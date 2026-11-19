(() => {
  const pdfCache = new Map();
  const renderJobs = new WeakMap();
  let pdfjsImportPromise = null;

  async function getPDFJS() {
    if (!pdfjsImportPromise) {
      pdfjsImportPromise = import('../vendor/pdfjs/6.5.438/pdf.min.mjs')
        .then(pdfjsLib => {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/6.5.438/pdf.worker.min.mjs', import.meta.url).href;
          return pdfjsLib;
        })
        .catch(error => {
          pdfjsImportPromise = null;
          throw error;
        });
    }
    return pdfjsImportPromise;
  }

  function message(text, className) {
    const element = document.createElement('div');
    element.className = className;
    element.textContent = text;
    return element;
  }

  async function loadPDF(url) {
    if (pdfCache.has(url)) {
      const cached = pdfCache.get(url);
      pdfCache.delete(url);
      pdfCache.set(url, cached);
      return cached;
    }

    const promise = (async () => {
      const pdfjsLib = await getPDFJS();
      return pdfjsLib.getDocument({
        url,
        rangeChunkSize: 65536,
        disableAutoFetch: true
      }).promise;
    })();
    pdfCache.set(url, promise);

    try {
      const pdf = await promise;
      while (pdfCache.size > 2) {
        const [oldestUrl, oldestPromise] = pdfCache.entries().next().value;
        if (oldestUrl === url) break;
        pdfCache.delete(oldestUrl);
        oldestPromise.then(oldDocument => oldDocument.destroy()).catch(() => {});
      }
      return pdf;
    } catch (error) {
      if (pdfCache.get(url) === promise) pdfCache.delete(url);
      throw error;
    }
  }

  async function renderPDFPage(pdfUrl, pageNumber, container) {
    if (!container) return null;

    const job = (renderJobs.get(container) || 0) + 1;
    renderJobs.set(container, job);
    container.setAttribute('aria-busy', 'true');
    container.replaceChildren(message('Carregando documento oficial…', 'pdf-preview-loading'));

    try {
      const pdf = await loadPDF(pdfUrl);
      const page = await pdf.getPage(Math.min(pdf.numPages, Math.max(1, pageNumber)));
      const baseViewport = page.getViewport({ scale: 1 });
      const width = Math.max(1, container.clientWidth || 320);
      const height = Math.max(1, container.clientHeight || 480);
      const outputScale = Math.min(window.devicePixelRatio || 1, 1.5);
      const scale = Math.min(width / baseViewport.width, height / baseViewport.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Não foi possível preparar a prévia.');

      canvas.width = Math.ceil(viewport.width * outputScale);
      canvas.height = Math.ceil(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', container.getAttribute('aria-label') || 'Página do documento oficial');

      await page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0]
      }).promise;

      if (renderJobs.get(container) !== job) return null;
      container.replaceChildren(canvas);
      container.setAttribute('aria-busy', 'false');
      return { page: page.pageNumber, totalPages: pdf.numPages };
    } catch (error) {
      if (renderJobs.get(container) !== job) return null;
      container.setAttribute('aria-busy', 'false');
      const notice = message('A prévia não carregou. Use “Abrir PDF” acima para ver o documento.', 'pdf-preview-error');
      container.replaceChildren(notice);
      console.error('Falha ao renderizar PDF oficial:', error);
      return null;
    }
  }

  function clearPDFPage(container) {
    if (!container) return;
    renderJobs.set(container, (renderJobs.get(container) || 0) + 1);
    container.replaceChildren();
    container.removeAttribute('aria-busy');
  }

  window.renderPDFPage = renderPDFPage;
  window.clearPDFPage = clearPDFPage;
})();
