/* Filefit: six client-side tools. Files are never sent to a Filefit server. */
(() => {
  'use strict';

  const TOOL_INFO = {
    compress: { title: 'Compress image', desc: 'Reduce an image to a size that fits your upload requirements.', accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', multiple: false, hint: 'JPG, PNG, or WebP • up to 50 MB • 40 megapixels', button: 'Compress image' },
    resize: { title: 'Photo & signature resizer', desc: 'Set exact pixel dimensions for forms, IDs, and signatures.', accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', multiple: false, hint: 'JPG, PNG, or WebP • up to 50 MB • 40 megapixels', button: 'Resize image' },
    convert: { title: 'Convert image', desc: 'Turn SVG, JPG, PNG or WebP images into JPG, PNG or WebP.', accept: 'image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg', multiple: false, hint: 'JPG, PNG, WebP (up to 50 MB) or SVG (up to 5 MB) • 40 megapixels', button: 'Convert image' },
    'images-pdf': { title: 'Images to PDF', desc: 'Combine your photos into one PDF, in the order you choose.', accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', multiple: true, hint: 'JPG, PNG, or WebP • up to 20 images, 50 MB each', button: 'Create PDF' },
    merge: { title: 'Merge PDFs', desc: 'Combine multiple PDFs into one file without uploading them.', accept: 'application/pdf,.pdf', multiple: true, hint: 'PDF only • 2–20 files, 80 MB each', button: 'Merge PDFs' },
    split: { title: 'Split PDF', desc: 'Keep the pages you choose from a PDF.', accept: 'application/pdf,.pdf', multiple: false, hint: 'PDF only • up to 80 MB', button: 'Extract pages' }
  };

  // Browser-only processing: bound memory-heavy inputs to avoid tab freezes.
  // These limits apply to files themselves; no file contents are transmitted.
  const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
  const MAX_SVG_BYTES = 5 * 1024 * 1024;
  const MAX_PDF_BYTES = 80 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
  const MAX_FILE_COUNT = 20;
  const MAX_IMAGE_PIXELS = 40_000_000;

  const initialTool = document.body.dataset.initialTool;
  let currentTool = TOOL_INFO[initialTool] ? initialTool : 'compress';
  let files = [];
  let resultUrl = null;
  let processing = false;
  let pdfLibraryPromise = null;

  const $ = (id) => document.getElementById(id);
  const grid = $('tool-grid');
  const upload = $('file-input');
  const dropzone = $('dropzone');
  const fileList = $('selected-files');
  const settings = $('settings');
  const action = $('process-button');
  const status = $('status');
  const result = $('result');
  $('year').textContent = String(new Date().getFullYear());

  const formatBytes = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
  const withoutExt = (name) => name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9 _-]/g, '_').slice(0, 100) || 'file';
  const fileExtension = (file) => (file.name.split('.').pop() || '').toLowerCase();
  const isImage = (file) => ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension(file)) || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  const isPdf = (file) => file.type === 'application/pdf' || fileExtension(file) === 'pdf';
  const isSvg = (file) => file.type === 'image/svg+xml' || fileExtension(file) === 'svg';
  const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  function revokeResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = null;
    result.hidden = true;
    result.replaceChildren();
  }
  function setStatus(message, kind = '') {
    status.textContent = message;
    status.className = 'status-message' + (kind ? ` ${kind}` : '');
    status.hidden = !message;
  }
  function field(name, label, content, extra = '') {
    return `<div class="field"><label for="${name}">${label}</label>${content}${extra ? `<span class="helper">${extra}</span>` : ''}</div>`;
  }
  const select = (id, options) => `<select id="${id}">${options.map(([v, label]) => `<option value="${v}">${label}</option>`).join('')}</select>`;
  const input = (id, val, min = 1, max = 20000) => `<input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${val}">`;

  function renderSettings() {
    let markup = '';
    if (currentTool === 'compress') {
      markup = field('target-kb', 'Target file size', select('target-kb', [['20','20 KB'], ['50','50 KB'], ['100','100 KB'], ['200','200 KB'], ['custom','Custom limit']])) +
        field('format', 'Output format', select('format', [['image/jpeg','JPG (small files)'], ['image/webp','WebP'], ['image/png','PNG (lossless)']])) +
        `<div class="field" id="custom-target-field" hidden><label for="custom-kb">Custom KB limit</label>${input('custom-kb', 150, 1, 20000)}</div>`;
    } else if (currentTool === 'resize') {
      markup = field('preset', 'Common dimensions', select('preset', [['passport','Passport photo · 413 × 531'], ['signature','Signature · 300 × 80'], ['square','Profile image · 400 × 400'], ['custom','Custom dimensions']])) +
        field('width', 'Width (pixels)', input('width', 413)) +
        field('height', 'Height (pixels)', input('height', 531)) +
        field('resize-format', 'Output format', select('resize-format', [['image/jpeg','JPG'], ['image/png','PNG'], ['image/webp','WebP']])) +
        field('fit-mode', 'Image fit', select('fit-mode', [['contain','Fit inside (no crop)'], ['cover','Fill (crop edges)']]), 'For contain, empty space is white (or transparent for PNG).');
    } else if (currentTool === 'convert') {
      markup = field('convert-format', 'Convert to', select('convert-format', [['image/jpeg','JPG'], ['image/png','PNG'], ['image/webp','WebP']])) +
        field('convert-quality', 'JPG / WebP quality', select('convert-quality', [['0.95','High quality'], ['0.85','Balanced'], ['0.7','Smaller file']]));
    } else if (currentTool === 'images-pdf') {
      markup = field('page-size', 'PDF page size', select('page-size', [['a4','A4 portrait'], ['landscape','A4 landscape'], ['letter','US Letter'], ['original','Fit image dimensions']])) +
        field('margin', 'Page margin', select('margin', [['24','Comfortable'], ['0','None'], ['48','Wide']]));
    } else if (currentTool === 'merge') {
      markup = `<p class="settings-note">Select at least two PDFs. Pages are combined in the order shown above; use ↑ and ↓ to rearrange files.</p>`;
    } else if (currentTool === 'split') {
      markup = field('page-ranges', 'Pages to extract', '<input id="page-ranges" type="text" placeholder="e.g. 1-3, 5, 8-10" autocomplete="off" value="1">', 'Use page numbers and ranges (1-based). Extracts selected pages to one PDF.');
    }
    settings.innerHTML = markup;
    if (currentTool === 'compress') {
      const target = $('target-kb');
      target.addEventListener('change', () => { $('custom-target-field').hidden = target.value !== 'custom'; });
    }
    if (currentTool === 'resize') {
      $('preset').addEventListener('change', () => {
        const sizes = { passport:[413,531], signature:[300,80], square:[400,400] };
        if (sizes[$('preset').value]) {
          [$('width').value, $('height').value] = sizes[$('preset').value];
        }
      });
      for (const id of ['width', 'height']) {
        $(id).addEventListener('input', () => { $('preset').value = 'custom'; });
      }
    }
  }
  function renderFiles() {
    fileList.replaceChildren();
    fileList.hidden = !files.length;
    files.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'selected-file';
      const label = document.createElement('span');
      label.textContent = `${index + 1}. ${file.name}`;
      const controls = document.createElement('span');
      controls.style.cssText = 'display:flex;align-items:center;gap:10px';
      const size = document.createElement('span');
      size.className = 'file-size';
      size.textContent = formatBytes(file.size);
      controls.append(size);
      if (files.length > 1) {
        for (const [symbol, direction] of [['↑',-1],['↓',1]]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = symbol;
          button.setAttribute('aria-label', `Move ${file.name} ${direction < 0 ? 'up' : 'down'}`);
          button.disabled = processing || index + direction < 0 || index + direction >= files.length;
          button.className = 'file-control';
          button.addEventListener('click', () => {
            if (processing) return;
            [files[index], files[index + direction]] = [files[index + direction], files[index]];
            renderFiles();
            revokeResult();
          });
          controls.append(button);
        }
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.className = 'file-control';
      remove.disabled = processing;
      remove.addEventListener('click', () => { if (processing) return; files.splice(index, 1); renderFiles(); updateButton(); revokeResult(); });
      controls.append(remove);
      row.append(label, controls);
      fileList.append(row);
    });
    updateButton();
  }
  function updateButton() {
    const required = currentTool === 'merge' ? 2 : 1;
    action.disabled = processing || files.length < required;
    const label = processing ? 'Processing…' : (files.length < required ? (required === 2 ? 'Choose at least 2 PDFs' : 'Choose a file first') : TOOL_INFO[currentTool].button);
    action.innerHTML = `${label} <span aria-hidden="true">↗</span>`;
    action.setAttribute('aria-busy', processing ? 'true' : 'false');
  }
  function changeTool(key) {
    if (!TOOL_INFO[key]) return;
    if (processing) {
      setStatus('Finish the current conversion before switching tools.', 'error');
      return;
    }
    currentTool = key;
    files = [];
    upload.value = '';
    upload.accept = TOOL_INFO[key].accept;
    upload.multiple = TOOL_INFO[key].multiple;
    $('workspace-title').textContent = TOOL_INFO[key].title;
    $('workspace-desc').textContent = TOOL_INFO[key].desc;
    $('file-hint').textContent = TOOL_INFO[key].hint;
    for (const item of (grid?.querySelectorAll('.tool-card') || [])) {
      const selected = item.dataset.tool === key;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
    setStatus('');
    revokeResult();
    renderSettings();
    renderFiles();
    $('workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function addFiles(list) {
    if (processing) {
      setStatus('Finish the current conversion before adding or replacing files.', 'error');
      return;
    }
    const incoming = [...list];
    if (!incoming.length) return;
    const isPdfTool = currentTool === 'merge' || currentTool === 'split';
    const perFileLimit = isPdfTool ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    const valid = incoming.filter(file => isPdfTool ? isPdf(file) : (isImage(file) || (currentTool === 'convert' && isSvg(file))));
    if (!valid.length) {
      setStatus(`Please choose ${isPdfTool ? 'PDF files' : currentTool === 'convert' ? 'JPG, PNG, WebP or SVG images' : 'JPG, PNG, or WebP images'}.`, 'error');
      upload.value = '';
      return;
    }
    if (valid.some(file => file.size === 0)) {
      setStatus('An empty file cannot be processed. Choose a nonempty file.', 'error');
      upload.value = '';
      return;
    }
    if (valid.some(file => file.size > perFileLimit)) {
      setStatus(`For reliable processing in your browser, choose ${isPdfTool ? 'PDFs' : 'images'} up to ${formatBytes(perFileLimit)} each.`, 'error');
      upload.value = '';
      return;
    }
    if (valid.some(file => isSvg(file) && file.size > MAX_SVG_BYTES)) {
      setStatus('SVG files must be 5 MB or smaller for safe browser conversion.', 'error');
      upload.value = '';
      return;
    }
    const next = TOOL_INFO[currentTool].multiple ? [...files, ...valid] : [valid[0]];
    if (next.length > MAX_FILE_COUNT) {
      setStatus(`Select at most ${MAX_FILE_COUNT} files in one batch. Try smaller batches.`, 'error');
      upload.value = '';
      return;
    }
    if (next.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
      setStatus(`Total input is too large. Select less than ${formatBytes(MAX_TOTAL_BYTES)} per batch.`, 'error');
      upload.value = '';
      return;
    }
    if (valid.length !== incoming.length) setStatus('Some unsupported files were skipped.', 'error');
    else setStatus('');
    files = next;
    revokeResult();
    renderFiles();
    upload.value = '';
  }

  for (const btn of (grid?.querySelectorAll('.tool-card') || [])) btn.addEventListener('click', () => changeTool(btn.dataset.tool));
  dropzone.addEventListener('click', (event) => { if (event.target !== upload) upload.click(); });
  dropzone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); upload.click(); } });
  upload.addEventListener('change', () => addFiles(upload.files));
  dropzone.addEventListener('dragenter', e => { e.preventDefault(); dropzone.classList.add('dragging'); });
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragging'); });
  dropzone.addEventListener('dragleave', e => { if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove('dragging'); });
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('dragging'); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });

  function validatePositive(id) {
    const val = Number($(id).value);
    if (!Number.isSafeInteger(val) || val < 1 || val > 20000) throw new Error(`Enter a valid ${id.replace(/-/g, ' ')} between 1 and 20,000.`);
    return val;
  }
  function blobFromCanvas(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) reject(new Error('The browser could not encode this image.'));
        else if (blob.type && blob.type !== mime) reject(new Error(`Your browser does not support ${mime.split('/')[1]} output. Try JPG or PNG.`));
        else resolve(blob);
      }, mime, quality);
    });
  }
  // SVGs are XML documents. Validate them without inserting markup into the page,
  // reject script/external references, then render only as an image for conversion.
  async function safeSvgBlob(file) {
    if (file.size > MAX_SVG_BYTES) throw new Error('SVG files must be 5 MB or smaller.');
    const source = await file.text();
    if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source) || /<\?(?!xml(?:\s|\?>))/i.test(source)) {
      throw new Error('This SVG contains unsupported XML declarations or entities.');
    }
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    const root = parsed.documentElement;
    const namespace = 'http://www.w3.org/2000/svg';
    if (parsed.getElementsByTagName('parsererror').length || root?.localName !== 'svg' || root.namespaceURI !== namespace) {
      throw new Error('Invalid SVG file. Please select a valid SVG image.');
    }
    const blocked = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'image', 'feimage', 'animate', 'animatemotion', 'animatetransform', 'set']);
    const safeUrls = text => {
      for (const match of text.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
        if (!/^#[a-z0-9_.:-]+$/i.test(match[2].trim())) return false;
      }
      return true;
    };
    for (const element of parsed.getElementsByTagName('*')) {
      if (element.namespaceURI !== namespace || blocked.has(element.localName.toLowerCase())) {
        throw new Error('This SVG contains unsupported or unsafe embedded content. Use a self-contained SVG.');
      }
      if (element.localName.toLowerCase() === 'style' &&
          (/@import\b|@font-face\b|expression\s*\(/i.test(element.textContent || '') || !safeUrls(element.textContent || ''))) {
        throw new Error('SVG styles cannot load external images, fonts or stylesheets.');
      }
      for (const attr of element.attributes) {
        const attrName = attr.name.toLowerCase();
        if (attrName.startsWith('on') || attrName === 'xml:base' || attrName === 'src' ||
            /@import\b|@font-face\b|expression\s*\(/i.test(attr.value) || !safeUrls(attr.value)) {
          throw new Error('This SVG contains unsupported or unsafe attributes.');
        }
        if ((attrName === 'href' || attrName.endsWith(':href')) && !/^#[a-z0-9_.:-]+$/i.test(attr.value.trim())) {
          throw new Error('External SVG references are not supported. Please use a self-contained SVG.');
        }
      }
    }
    const parsePx = value => {
      const m = /^(\d+(?:\.\d+)?)\s*(?:px)?$/i.exec((value || '').trim());
      return m ? Number(m[1]) : null;
    };
    const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const vw = viewBox.length === 4 && viewBox[2] > 0 ? viewBox[2] : null;
    const vh = viewBox.length === 4 && viewBox[3] > 0 ? viewBox[3] : null;
    let width = parsePx(root.getAttribute('width'));
    let height = parsePx(root.getAttribute('height'));
    width = width || (height && vw && vh ? height * vw / vh : vw || 300);
    height = height || (width && vw && vh ? width * vh / vw : vh || 150);
    width = Math.ceil(width);
    height = Math.ceil(height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 ||
        width > 8192 || height > 8192 || width * height > MAX_IMAGE_PIXELS) {
      throw new Error('SVG dimensions exceed safe browser limits (maximum 8,192 pixels per side and 40 megapixels).');
    }
    root.setAttribute('width', String(width));
    root.setAttribute('height', String(height));
    return new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' });
  }
  async function loadImage(file) {
    const source = isSvg(file) ? await safeSvgBlob(file) : file;
    const url = URL.createObjectURL(source);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('The file could not be decoded as an image.'));
        image.src = url;
      });
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image dimensions.');
      if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) {
        throw new Error('This image exceeds 40 megapixels. Resize it to a smaller image before using browser tools.');
      }
      return image;
    } finally { URL.revokeObjectURL(url); }
  }
  function drawImage(image, width, height, fit = 'cover', transparent = false) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser.');
    if (!transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const scale = fit === 'contain' ? Math.min(width / image.naturalWidth, height / image.naturalHeight) : Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    return canvas;
  }
  async function compressFile(file) {
    const image = await loadImage(file);
    const targetKb = $('target-kb').value === 'custom' ? validatePositive('custom-kb') : Number($('target-kb').value);
    const target = targetKb * 1024;
    const mime = $('format').value;
    // Do not re-encode an already compliant image into a larger file.
    if (file.type === mime && file.size <= target) {
      return { blob: file, name: `${withoutExt(file.name)}-compressed.${mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]}`, description: `${formatBytes(file.size)} · Already within ${targetKb} KB target`, warning: '' };
    }
    let maxDimension = Math.max(image.naturalWidth, image.naturalHeight);
    const maxCanvasDimension = Math.min(4500, maxDimension);
    let scale = maxCanvasDimension / maxDimension;
    let bestUnder = null;
    let bestOverall = null;
    for (let iteration = 0; iteration < 9; iteration++) {
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = drawImage(image, width, height, 'cover', mime === 'image/webp' || mime === 'image/png');
      const qualities = mime === 'image/png' ? [1] : [0.92,0.78,0.62,0.48,0.34,0.22,0.12,0.07];
      for (const quality of qualities) {
        const blob = await blobFromCanvas(canvas, mime, quality);
        if (!bestOverall || blob.size < bestOverall.size) bestOverall = blob;
        if (blob.size <= target && (!bestUnder || (blob.size > bestUnder.size))) bestUnder = blob;
      }
      if (bestUnder) break;
      if (width <= 60 || height <= 60) break;
      scale *= 0.75;
    }
    const bestEncoded = bestUnder || bestOverall;
    // When the requested output format matches the original, avoid growing files.
    const blob = file.type === mime && file.size < bestEncoded.size ? file : bestEncoded;
    const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
    const success = blob.size <= target;
    return { blob, name: `${withoutExt(file.name)}-compressed.${ext}`, description: `${formatBytes(file.size)} → ${formatBytes(blob.size)} · ${success ? 'Within' : 'Above'} ${targetKb} KB target`, warning: success ? '' : 'The target could not be reached without further quality or size reduction. The smallest result found is shown.' };
  }
  async function resizeFile(file) {
    const img = await loadImage(file);
    const width = validatePositive('width');
    const height = validatePositive('height');
    if (width * height > MAX_IMAGE_PIXELS) throw new Error('Output dimensions are too large for safe browser processing.');
    const mime = $('resize-format').value;
    const canvas = drawImage(img, width, height, $('fit-mode').value, mime === 'image/png' || mime === 'image/webp');
    const blob = await blobFromCanvas(canvas, mime, 0.92);
    const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
    return { blob, name: `${withoutExt(file.name)}-${width}x${height}.${ext}`, description: `${width} × ${height} pixels · ${formatBytes(blob.size)}` };
  }
  async function convertFile(file) {
    const img = await loadImage(file);
    const mime = $('convert-format').value;
    const canvas = drawImage(img, img.naturalWidth, img.naturalHeight, 'cover', mime !== 'image/jpeg');
    const blob = await blobFromCanvas(canvas, mime, Number($('convert-quality').value));
    const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
    return { blob, name: `${withoutExt(file.name)}-converted.${ext}`, description: `${ext.toUpperCase()} · ${formatBytes(blob.size)}` };
  }
  function injectScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => { if (window.PDFLib?.PDFDocument) resolve(window.PDFLib); else reject(new Error('PDF library not available after loading.')); };
      script.onerror = () => { script.remove(); reject(new Error('Could not load the free PDF library.')); };
      document.head.appendChild(script);
    });
  }
  async function getPdfLib() {
    if (window.PDFLib?.PDFDocument) return window.PDFLib;
    if (!pdfLibraryPromise) {
      pdfLibraryPromise = injectScript('/vendor/pdf-lib.min.js')
        .catch(() => { throw new Error('The PDF library could not load. Refresh the page and try again.'); });
    }
    try { return await pdfLibraryPromise; } catch (error) { pdfLibraryPromise = null; throw error; }
  }
  async function imageForPdf(file) {
    const img = await loadImage(file);
    const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, 3000 / maxSide);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = drawImage(img, width, height, 'cover', false);
    return { bytes: await (await blobFromCanvas(canvas, 'image/jpeg', 0.9)).arrayBuffer(), width, height };
  }
  async function imagesToPdf(imageFiles) {
    const { PDFDocument } = await getPdfLib();
    const doc = await PDFDocument.create();
    const pageSize = $('page-size').value;
    const margin = Number($('margin').value);
    const sizes = { a4:[595.28,841.89], landscape:[841.89,595.28], letter:[612,792] };
    for (const file of imageFiles) {
      const img = await imageForPdf(file);
      const embedded = await doc.embedJpg(img.bytes);
      const dimensions = pageSize === 'original' ? [img.width * 0.75 + margin * 2, img.height * 0.75 + margin * 2] : sizes[pageSize];
      const [pageW, pageH] = dimensions;
      const page = doc.addPage(dimensions);
      const fit = Math.min((pageW - margin * 2) / embedded.width, (pageH - margin * 2) / embedded.height);
      const w = embedded.width * fit, h = embedded.height * fit;
      page.drawImage(embedded, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
    }
    const bytes = await doc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return { blob, name: 'filefit-images.pdf', description: `${imageFiles.length} page${imageFiles.length === 1 ? '' : 's'} · ${formatBytes(blob.size)}` };
  }
  async function mergePdfs(pdfFiles) {
    const { PDFDocument } = await getPdfLib();
    const merged = await PDFDocument.create();
    let count = 0;
    for (const file of pdfFiles) {
      let source;
      try { source = await PDFDocument.load(await file.arrayBuffer()); }
      catch { throw new Error(`Cannot read "${file.name}". It may be password-protected or invalid.`); }
      const indices = source.getPageIndices();
      const pages = await merged.copyPages(source, indices);
      for (const page of pages) merged.addPage(page);
      count += pages.length;
    }
    if (!count) throw new Error('The selected PDFs contain no pages.');
    const blob = new Blob([await merged.save()], { type: 'application/pdf' });
    return { blob, name: 'filefit-merged.pdf', description: `${count} total pages · ${formatBytes(blob.size)}` };
  }
  function parsePages(expression, total) {
    const tokens = expression.split(',').map(v => v.trim());
    if (!tokens.length || tokens.some(t => !t)) throw new Error('Enter page numbers such as 1-3, 5, 8-10.');
    const pageSet = new Set();
    for (const token of tokens) {
      const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(token);
      if (!match) throw new Error(`Invalid page range: "${token}".`);
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : start;
      if (start < 1 || end < start || end > total) throw new Error(`Pages must be between 1 and ${total}, with ranges in ascending order.`);
      for (let page = start; page <= end; page++) pageSet.add(page - 1);
    }
    return [...pageSet].sort((a, b) => a - b);
  }
  async function splitPdf(file) {
    const { PDFDocument } = await getPdfLib();
    let source;
    try { source = await PDFDocument.load(await file.arrayBuffer()); }
    catch { throw new Error('Cannot read the PDF. It may be password-protected or invalid.'); }
    const total = source.getPageCount();
    if (!total) throw new Error('The PDF contains no pages.');
    const indices = parsePages($('page-ranges').value, total);
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    for (const page of pages) output.addPage(page);
    const blob = new Blob([await output.save()], { type: 'application/pdf' });
    return { blob, name: `${withoutExt(file.name)}-extracted.pdf`, description: `${indices.length} of ${total} pages · ${formatBytes(blob.size)}` };
  }
  // Tool activity events contain only the public tool identifier. Never pass
  // filenames, file sizes, document contents or error messages to analytics.
  // gtag is only created after GA4 has been enabled for this visitor.
  function trackToolEvent(eventName, toolId) {
    if (typeof window.gtag !== 'function') return;
    try { window.gtag('event', eventName, { tool_id: toolId }); } catch (_) {}
  }

  function showResult({blob, name, description, warning}) {
    revokeResult();
    resultUrl = URL.createObjectURL(blob);
    const text = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'result-label';
    title.textContent = '✓ Your file is ready';
    const subtitle = document.createElement('div');
    subtitle.className = 'result-sub';
    subtitle.textContent = description;
    text.append(title, subtitle);
    const download = document.createElement('a');
    download.href = resultUrl;
    download.download = name;
    download.className = 'download-button';
    download.textContent = `↓ Download ${name}`;
    result.append(text, download);
    result.hidden = false;
    if (warning) setStatus(warning, 'error'); else setStatus('Your file is ready. Click Download to save it.', 'success');
  }
  action.addEventListener('click', async () => {
    if (processing || action.disabled) return;
    processing = true;
    renderFiles();
    const toolBeingProcessed = currentTool;
    updateButton();
    revokeResult();
    setStatus('Processing securely in your browser…');
    trackToolEvent('filefit_tool_start', toolBeingProcessed);
    try {
      const snapshot = [...files];
      let output;
      if (currentTool === 'compress') output = await compressFile(snapshot[0]);
      else if (currentTool === 'resize') output = await resizeFile(snapshot[0]);
      else if (currentTool === 'convert') output = await convertFile(snapshot[0]);
      else if (currentTool === 'images-pdf') output = await imagesToPdf(snapshot);
      else if (currentTool === 'merge') output = await mergePdfs(snapshot);
      else if (currentTool === 'split') output = await splitPdf(snapshot[0]);
      if (output) {
        showResult(output);
        trackToolEvent('filefit_tool_complete', toolBeingProcessed);
      }
    } catch (error) {
      console.error('Filefit processing error:', error);
      setStatus(error?.message || 'Processing failed. Try another file.', 'error');
      trackToolEvent('filefit_tool_error', toolBeingProcessed);
    } finally { processing = false; renderFiles(); updateButton(); }
  });
  window.addEventListener('beforeunload', revokeResult);
  renderSettings();
  renderFiles();
  upload.accept = TOOL_INFO[currentTool].accept;
  upload.multiple = TOOL_INFO[currentTool].multiple;
  $('workspace-title').textContent = TOOL_INFO[currentTool].title;
  $('workspace-desc').textContent = TOOL_INFO[currentTool].desc;
  $('file-hint').textContent = TOOL_INFO[currentTool].hint;
  for (const item of (grid?.querySelectorAll('.tool-card') || [])) {
    const selected = item.dataset.tool === currentTool;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', selected ? 'true' : 'false');
  }
})();
