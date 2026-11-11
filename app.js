/* =========================================================
   千寻电气 · 产品图册
   Custom two-page / single-page flipbook
   No framework, no network dependency
   ========================================================= */
(() => {
  'use strict';

  const PAGES = Array.isArray(window.ALBUM_PAGES) ? window.ALBUM_PAGES : [];
  const TOC = Array.isArray(window.ALBUM_TOC) ? window.ALBUM_TOC : [];
  const TOTAL = PAGES.length;
  const PAGE_RATIO = 1440 / 1954;
  const FLIP_START = 0;
  const FLIP_END = 0.994;
  const FLIP_LEAD = 0.16;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_COARSE = window.matchMedia('(pointer: coarse)').matches;
  const IS_PREVIEW_FRAME = new URLSearchParams(window.location.search).has('preview');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const dom = {
    app: $('#app'),
    stage: $('#stage'),
    bookArea: $('#bookArea'),
    bookViewport: $('#bookViewport'),
    bookShadow: $('#bookShadow'),
    spread: $('#spread'),
    leafLeft: $('#leafLeft'),
    leafRight: $('#leafRight'),
    leafSingle: $('#leafSingle'),
    imgLeft: $('#imgLeft'),
    imgRight: $('#imgRight'),
    imgSingle: $('#imgSingle'),
    gutter: $('#gutter'),
    shadeLeft: $('#shadeLeft'),
    shadeRight: $('#shadeRight'),
    sheet: $('#sheet'),
    sheetFrontFace: $('#sheetFrontFace'),
    sheetBackFace: $('#sheetBackFace'),
    sheetFront: $('#sheetFront'),
    sheetBack: $('#sheetBack'),
    flipCanvas: $('#flipCanvas'),
    prevBtn: $('#prevBtn'),
    nextBtn: $('#nextBtn'),
    firstBtn: $('#firstBtn'),
    lastBtn: $('#lastBtn'),
    prevPage: $('#prevPage'),
    nextPage: $('#nextPage'),
    tocBtn: $('#tocBtn'),
    zoomBtn: $('#zoomBtn'),
    soundBtn: $('#soundBtn'),
    fullBtn: $('#fullBtn'),
    brandHome: $('#brandHome'),
    pageStatus: $('#pageStatus'),
    pageTitle: $('#pageTitle'),
    pageCount: $('#pageCount'),
    scrubber: $('#scrubber'),
    hint: $('#hint'),
    hintText: $('#hintText'),
    loading: $('#loading'),
    toast: $('#toast'),
    live: $('#live'),
    drawer: $('#drawer'),
    drawerBackdrop: $('#drawerBackdrop'),
    drawerClose: $('#drawerClose'),
    drawerBody: $('#drawerBody'),
    drawerSubCount: $('#drawerSubCount'),
    drawerSubHint: $('#drawerSubHint'),
    tocTabDirectory: $('#tocTabDirectory'),
    tocTabThumbs: $('#tocTabThumbs'),
    directoryPanel: $('#directoryPanel'),
    thumbsPanel: $('#thumbsPanel'),
    tocList: $('#tocList'),
    thumbGrid: $('#thumbGrid'),
    zoomModal: $('#zoomModal'),
    zoomClose: $('#zoomClose'),
    zoomTitle: $('#zoomTitle'),
    zoomMeta: $('#zoomMeta'),
    zoomStage: $('#zoomStage'),
    zoomImg: $('#zoomImg'),
    zoomLoading: $('#zoomLoading'),
    zoomLevel: $('#zoomLevel'),
    zoomIn: $('#zoomIn'),
    zoomOut: $('#zoomOut'),
    zoomFit: $('#zoomFit'),
    starfield: $('#starfield'),
    intro: $('#intro'),
    chapterGhost: $('#chapterGhost'),
    chapterGhostCode: $('#chapterGhostCode'),
    chapterGhostName: $('#chapterGhostName'),
    searchBtn: $('#searchBtn'),
    shareBtn: $('#shareBtn'),
    pdfBtn: $('#pdfBtn'),
    helpBtn: $('#helpBtn'),
    searchModal: $('#searchModal'),
    searchClose: $('#searchClose'),
    searchInput: $('#searchInput'),
    searchResults: $('#searchResults'),
    searchEmpty: $('#searchEmpty'),
    shareModal: $('#shareModal'),
    shareClose: $('#shareClose'),
    shareQr: $('#shareQr'),
    shareUrl: $('#shareUrl'),
    copyShare: $('#copyShare'),
    nativeShare: $('#nativeShare'),
    downloadQr: $('#downloadQr'),
    helpModal: $('#helpModal'),
    helpClose: $('#helpClose'),
    helpMode: $('#helpMode'),
    helpList: $('#helpList'),
    pdfModal: $('#pdfModal'),
    pdfBtnDrawer: $('#pdfBtnDrawer'),
    pdfClose: $('#pdfClose'),
    pdfCancel: $('#pdfCancel'),
    pdfStatus: $('#pdfStatus'),
    pdfBar: $('#pdfBar'),
    contactHighlight: $('#contactHighlight'),
    contactHighlightGlow: $('#contactHighlightGlow'),
    contactHighlightHit: $('#contactHighlightHit'),
    contactHighlightBadge: $('#contactHighlightBadge'),
    contactModal: $('#contactModal'),
    contactClose: $('#contactClose'),
    contactList: $('#contactList')
  };

  if (!TOTAL) {
    if (dom.loading) {
      dom.loading.innerHTML = '<div class="loading-inner"><p class="loading-title">页面数据读取失败</p><p class="loading-sub">请确认 data/pages.js 文件完整</p></div>';
    }
    return;
  }

  /* ---------- Page structure ---------- */

  const spreads = [{ kind: 'cover', left: null, right: 0 }];
  let buildIndex = 1;
  while (buildIndex < TOTAL - 1) {
    spreads.push({ kind: 'inner', left: buildIndex, right: buildIndex + 1 });
    buildIndex += 2;
  }
  spreads.push({ kind: 'back', left: TOTAL - 1, right: null });

  const pageToSpread = new Array(TOTAL).fill(0);
  spreads.forEach((spread, index) => {
    if (spread.left != null) pageToSpread[spread.left] = index;
    if (spread.right != null) pageToSpread[spread.right] = index;
  });

  let mode = 'spread';
  let spreadIndex = 0;
  let singleIndex = 0;
  let pageWidth = 0;
  let pageHeight = 0;
  let busy = false;
  let ready = false;
  let introElapsed = false;
  let introFinished = false;
  let chapterGhostTimer = 0;

  window.setTimeout(() => {
    introElapsed = true;
    finishIntroIfReady();
  }, 2500);
  let rafId = 0;
  let flip = null;
  let audioContext = null;
  let noiseBuffer = null;
  let soundEnabled = false;
  let toastTimer = 0;
  let hintTimer = 0;
  let resizeTimer = 0;
  let lastFocus = null;
  let drawerOpen = false;
  let drawerCloseTimer = 0;
  let tocView = 'directory';
  let searchOpen = false;
  let shareOpen = false;
  let helpOpen = false;
  let pdfOpen = false;
  let pdfJobToken = 0;
  let contactOpen = false;
  let modalLastFocus = null;
  let searchItems = [];
  let searchActive = -1;
  const PUBLIC_URL = 'https://echoo395.github.io/echoos/';
  const SHARE_QR = 'assets/brand/share-qr.png';
  const CONTACT_INFO = {
    address: {
      label: '地址',
      value: '浙江温州乐清市天成街道天成工业区宁康东路2892号',
      copy: '浙江温州乐清市天成街道天成工业区宁康东路2892号'
    },
    phone: {
      label: '电话',
      value: '135 8779 8177',
      copy: '13587798177'
    },
    email: {
      label: '邮箱',
      value: 'Una@chaserr.cc',
      copy: 'Una@chaserr.cc'
    },
    website: {
      label: '网址',
      value: 'https://cn.qianxunele.com',
      copy: 'https://cn.qianxunele.com'
    }
  };
  const CONTACT_FRAME = { x: 24, y: 1522, w: 746, h: 402 };
  const BACK_PAGE = Math.max(0, TOTAL - 1);
  const CONTACT_SOURCE = { width: 1440, height: 1954 };

  const flipImageFront = new Image();
  const flipImageBack = new Image();
  let flipContext = null;
  let flipCanvasDpr = 1;

  flipImageFront.decoding = 'async';
  flipImageBack.decoding = 'async';
  flipImageFront.addEventListener('load', () => {
    if (flip) applyFlipProgress(flip.progress);
  });
  flipImageBack.addEventListener('load', () => {
    if (flip) applyFlipProgress(flip.progress);
  });

  const drag = {
    active: false,
    prepared: false,
    pointerId: null,
    pointerType: 'mouse',
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    direction: 0,
    progress: 0,
    moved: false,
    vertical: false
  };

  let lastTap = { time: 0, x: 0, y: 0 };

  /* ---------- Helpers ---------- */

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const pad2 = (number) => String(number).padStart(2, '0');
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easePageTurn(t) {
    const smooth = t * t * (3 - 2 * t);
    return smooth * 0.68 + t * 0.32;
  }

  function addRoundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function pageLabel(index) {
    return PAGES[index] ? PAGES[index].label : '';
  }

  function pageTitle(index) {
    return PAGES[index] ? PAGES[index].title : '';
  }

  function tocSeriesForPage(index) {
    const page = PAGES[index];
    const printed = page ? Number(page.label) : NaN;
    if (!Number.isFinite(printed)) return '';

    const series = (window.ALBUM_TOC || []).find(
      (item) => printed >= item.start && printed <= item.end
    );
    return series ? series.name : '';
  }

  function tocTitleForView(view) {
    if (view.kind === 'cover') return '封面';
    if (view.kind === 'back') return '封底';

    const pages = viewPages(view);
    const names = [];

    for (const index of pages) {
      const name = tocSeriesForPage(index) || pageTitle(index);
      if (name && !names.includes(name)) names.push(name);
    }

    return names.join('\n');
  }

  function viewForSpread(index) {
    const spread = spreads[index];
    return {
      kind: spread.kind,
      left: spread.left,
      right: spread.right,
      spreadIndex: index,
      pages: [spread.left, spread.right].filter((value) => value != null)
    };
  }

  function viewForSingle(index) {
    return {
      kind: 'single',
      single: index,
      pageIndex: index,
      pages: [index]
    };
  }

  function currentView() {
    return mode === 'single' ? viewForSingle(singleIndex) : viewForSpread(spreadIndex);
  }

  function viewPages(view) {
    if (view.kind === 'single') return [view.single];
    return [view.left, view.right].filter((value) => value != null);
  }

  function activePage() {
    const view = currentView();
    return viewPages(view)[0] ?? 0;
  }

  function targetView(direction) {
    if (mode === 'single') {
      const next = singleIndex + direction;
      if (next < 0 || next >= TOTAL) return null;
      return viewForSingle(next);
    }
    const next = spreadIndex + direction;
    if (next < 0 || next >= spreads.length) return null;
    return viewForSpread(next);
  }

  function targetViewForPage(index) {
    if (mode === 'single') return viewForSingle(index);
    return viewForSpread(pageToSpread[index]);
  }

  function isSameView(a, b) {
    if (a.kind === 'single' && b.kind === 'single') return a.single === b.single;
    if (a.kind === 'single' || b.kind === 'single') return false;
    return a.left === b.left && a.right === b.right;
  }

  function pageNumber(index) {
    return PAGES[index] ? PAGES[index].n : index + 1;
  }

  function setStateFromView(view) {
    if (view.kind === 'single') {
      singleIndex = view.single;
    } else {
      spreadIndex = view.spreadIndex;
    }
  }

  function isProduct(index) {
    return PAGES[index] && PAGES[index].n > 3 && PAGES[index].n < TOTAL;
  }

  function viewTitle(view) {
    if (view.kind === 'cover') return '封面';
    if (view.kind === 'back') return '封底';
    if (view.kind === 'single') return tocSeriesForPage(view.single) || pageTitle(view.single);
    const pages = viewPages(view);
    if (pages.length === 1) return tocSeriesForPage(pages[0]) || pageTitle(pages[0]);
    if (pages.every(isProduct)) return tocTitleForView(view);
    return pages.map(pageTitle).join(' · ');
  }

  function viewSection(view) {
    if (view.kind === 'cover') return '封面';
    if (view.kind === 'back') return '封底';
    if (view.kind === 'single') return pageTitle(view.single);
    const pages = viewPages(view);
    if (pages.length === 1) return pageTitle(pages[0]);
    if (pages.every(isProduct)) {
      return `产品 ${pageLabel(pages[0])}–${pageLabel(pages[pages.length - 1])}`;
    }
    if (pages.includes(1) && pages.includes(2)) return '简介 / 目录';
    return pages.map(pageTitle).join(' / ');
  }

  /* ---------- Image loading ---------- */

  const loadedSources = new Set();
  const loadingSources = new Map();
  const loadedImages = new Map();

  function loadSource(src) {
    if (!src) return Promise.resolve();
    if (loadedSources.has(src)) return Promise.resolve();
    if (loadingSources.has(src)) return loadingSources.get(src);

    const promise = new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (image.naturalWidth > 0) {
          loadedImages.set(src, image);
          loadedSources.add(src);
        }
        loadingSources.delete(src);
        resolve();
      };

      const image = new Image();
      image.onload = finish;
      image.onerror = finish;
      image.src = src;
      if (image.complete && image.naturalWidth > 0) finish();
      window.setTimeout(finish, 4000);
    });

    loadingSources.set(src, promise);
    return promise;
  }

  function loadPage(index) {
    return PAGES[index] ? loadSource(PAGES[index].page) : Promise.resolve();
  }

  async function decodePage(index) {
    const source = PAGES[index] && PAGES[index].page;
    const image = source ? loadedImages.get(source) : null;
    if (image && typeof image.decode === 'function') {
      try {
        await image.decode();
      } catch {
        // The image is still usable through the normal <img> path.
      }
    }
  }

  async function ensureViewImages(view) {
    const pages = viewPages(view);
    await Promise.race([
      Promise.all(pages.map(loadPage)),
      delay(1100)
    ]);

    await Promise.race([
      Promise.all(pages.map(async (index) => {
        const image = loadedImages.get(PAGES[index]?.page);
        if (image && typeof image.decode === 'function') {
          try {
            await image.decode();
          } catch {
            // The image is still usable through the normal <img> path.
          }
        }
      })),
      delay(300)
    ]);
  }

  function setImageElement(image, index) {
    if (!index && index !== 0) {
      image.removeAttribute('src');
      image.dataset.src = '';
      image.classList.remove('is-ready');
      image.alt = '';
      return;
    }

    const page = PAGES[index];
    if (!page) return;

    if (image.dataset.src !== page.page) {
      image.dataset.src = page.page;
      image.classList.remove('is-ready');
      image.src = page.page;
      image.alt = page.title;
    }

    if (image.complete && image.naturalWidth > 0) {
      image.classList.add('is-ready');
    } else {
      image.onload = () => {
        if (image.dataset.src === page.page) image.classList.add('is-ready');
      };
    }
  }

  function setLeafPage(leaf, image, index) {
    if (index == null) {
      leaf.classList.add('is-empty');
      leaf.style.backgroundImage = 'none';
      delete leaf.dataset.pageIndex;
      setImageElement(image, null);
    } else {
      leaf.classList.remove('is-empty');
      leaf.dataset.pageIndex = String(index);
      leaf.style.backgroundImage = `url("${PAGES[index].thumb}")`;
      setImageElement(image, index);
    }
  }

  function renderStatic(view) {
    if (mode === 'single') {
      setLeafPage(dom.leafSingle, dom.imgSingle, view.single);
    } else {
      setLeafPage(dom.leafLeft, dom.imgLeft, view.left);
      setLeafPage(dom.leafRight, dom.imgRight, view.right);
    }

    dom.gutter.style.opacity = mode === 'spread' && view.kind === 'inner' ? '0.8' : '0';
    dom.gutter.style.display = mode === 'spread' && view.kind === 'inner' ? 'block' : 'none';
  }

  function preloadAround() {
    if (!ready) return;
    const indexes = new Set();
    const view = currentView();

    viewPages(view).forEach((index) => indexes.add(index));

    if (mode === 'single') {
      for (let offset = -2; offset <= 2; offset += 1) {
        const index = singleIndex + offset;
        if (index >= 0 && index < TOTAL) indexes.add(index);
      }
    } else {
      [spreadIndex - 1, spreadIndex + 1, spreadIndex + 2].forEach((index) => {
        if (index >= 0 && index < spreads.length) {
          viewPages(viewForSpread(index)).forEach((page) => indexes.add(page));
        }
      });
    }

    Array.from(indexes).slice(0, 9).forEach((index) => {
      const timer = window.setTimeout(() => loadPage(index), 90);
      void timer;
    });
  }

  function queuePageCacheWarmup() {
    const order = [];
    const seen = new Set();

    const addView = (view) => {
      if (!view) return;
      viewPages(view).forEach((index) => {
        if (!seen.has(index)) {
          seen.add(index);
          order.push(index);
        }
      });
    };

    addView(currentView());
    addView(targetView(1));
    addView(targetView(-1));

    for (let step = 2; step <= 4; step += 1) {
      addView(targetView(step));
      addView(targetView(-step));
    }

    for (let index = 0; index < TOTAL; index += 1) {
      if (!seen.has(index)) {
        seen.add(index);
        order.push(index);
      }
    }

    let cursor = 0;
    const run = async () => {
      if (busy || flip) {
        window.setTimeout(run, 200);
        return;
      }

      const index = order[cursor];
      cursor += 1;
      if (index == null) return;

      await loadPage(index);
      await decodePage(index);

      if (cursor < order.length) {
        window.setTimeout(run, 55);
      }
    };

    window.setTimeout(run, 90);
  }

  /* ---------- Layout ---------- */

  function detectMode() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < 900) return 'single';
    if (IS_COARSE) {
      if (width < 980 || height < 600) return 'single';
      return 'spread';
    }
    if (height < 560 && width < 1240) return 'single';
    return 'spread';
  }

  function measure() {
    const areaWidth = dom.bookArea.clientWidth;
    const areaHeight = dom.bookArea.clientHeight;

    if (areaWidth < 80 || areaHeight < 80) return false;

    const usableHeight = areaHeight * (mode === 'spread' ? 0.95 : 0.965);

    if (mode === 'single') {
      pageWidth = Math.min(areaWidth, usableHeight * PAGE_RATIO, 690);
    } else {
      const maxPageHeight = Math.min(usableHeight, (areaWidth / 2) / PAGE_RATIO, 985);
      pageWidth = maxPageHeight * PAGE_RATIO;
    }

    pageWidth = Math.max(120, Math.floor(pageWidth));
    pageHeight = Math.floor(pageWidth / PAGE_RATIO);

    if (pageHeight > usableHeight) {
      pageHeight = Math.floor(usableHeight);
      pageWidth = Math.floor(pageHeight * PAGE_RATIO);
    }

    if (mode === 'spread' && pageWidth * 2 > areaWidth) {
      pageWidth = Math.floor(areaWidth / 2);
      pageHeight = Math.floor(pageWidth / PAGE_RATIO);
    }

    dom.app.classList.toggle('mode-single', mode === 'single');
    dom.app.classList.toggle('mode-spread', mode === 'spread');

    dom.bookViewport.style.width = `${mode === 'single' ? pageWidth : pageWidth * 2}px`;
    dom.bookViewport.style.height = `${pageHeight}px`;
    dom.bookArea.style.setProperty('--page-w', `${pageWidth}px`);
    dom.bookArea.style.setProperty('--page-h', `${pageHeight}px`);

    resizeFlipCanvas();
    return true;
  }

  function resizeFlipCanvas() {
    if (!dom.flipCanvas) return;
    const width = dom.bookViewport.clientWidth;
    const height = dom.bookViewport.clientHeight;
    if (!width || !height) return;

    flipCanvasDpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * flipCanvasDpr);
    const pixelHeight = Math.round(height * flipCanvasDpr);

    if (dom.flipCanvas.width !== pixelWidth || dom.flipCanvas.height !== pixelHeight) {
      dom.flipCanvas.width = pixelWidth;
      dom.flipCanvas.height = pixelHeight;
    }

    dom.flipCanvas.style.width = `${width}px`;
    dom.flipCanvas.style.height = `${height}px`;
    flipContext = dom.flipCanvas.getContext('2d');
    if (flipContext) {
      flipContext.setTransform(flipCanvasDpr, 0, 0, flipCanvasDpr, 0, 0);
      flipContext.imageSmoothingEnabled = true;
      flipContext.imageSmoothingQuality = 'high';
    }
  }

  function layoutForView(view) {
    let offset = 0;
    let clipLeft = 0;
    let clipRight = 0;
    let visibleWidth = pageWidth;

    if (mode === 'single') {
      visibleWidth = pageWidth;
    } else if (view.kind === 'cover') {
      offset = -pageWidth / 2;
      clipLeft = 50;
      visibleWidth = pageWidth;
    } else if (view.kind === 'back') {
      offset = pageWidth / 2;
      clipRight = 50;
      visibleWidth = pageWidth;
    } else {
      visibleWidth = pageWidth * 2;
    }

    return {
      offset,
      clipLeft,
      clipRight,
      shadowWidth: mode === 'single' ? visibleWidth * 0.8 : visibleWidth * 0.92
    };
  }

  function applyClip(clipLeft, clipRight) {
    if (clipLeft < 0.02 && clipRight < 0.02) {
      dom.bookViewport.style.clipPath = 'none';
      dom.bookViewport.style.webkitClipPath = 'none';
    } else {
      const value = `inset(0% ${clipRight.toFixed(2)}% 0% ${clipLeft.toFixed(2)}%)`;
      dom.bookViewport.style.clipPath = value;
      dom.bookViewport.style.webkitClipPath = value;
    }
  }

  function applyRestLayout(view = currentView()) {
    const layout = layoutForView(view);
    dom.bookViewport.style.transform = `translate3d(${layout.offset.toFixed(2)}px, 0, 0)`;
    applyClip(layout.clipLeft, layout.clipRight);
    dom.bookShadow.style.width = `${Math.round(layout.shadowWidth)}px`;
    dom.bookShadow.style.opacity = '0.9';
  }

  function relayout() {
    if (!ready) return;

    if (flip) {
      cancelActiveFlip();
    }

    const anchor = activePage();
    const nextMode = detectMode();

    if (nextMode !== mode) {
      mode = nextMode;
      if (mode === 'single') {
        singleIndex = anchor;
      } else {
        spreadIndex = pageToSpread[anchor];
      }
    }

    if (!measure()) {
      window.setTimeout(relayout, 120);
      return;
    }

    renderStatic(currentView());
    applyRestLayout();
    updateUI();
    preloadAround();

    if (zoomState.open) {
      window.requestAnimationFrame(() => {
        if (!zoomState.open) return;
        if (fitZoomImage()) setZoomTransform(zoomState.scale, zoomState.x, zoomState.y);
      });
    }
  }

  function scheduleRelayout() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(relayout, 140);
  }

  /* ---------- Flip engine ---------- */

  function sheetContentFor(direction, target) {
    const current = currentView();
    let frontIndex = null;
    let backIndex = null;
    let staticView = null;

    if (mode === 'single') {
      frontIndex = current.single;
      backIndex = target.single;
      staticView = { kind: 'single', single: target.single, left: null, right: null };
    } else if (direction === 1) {
      frontIndex = current.right;
      backIndex = target.left;
      staticView = { kind: 'static', left: current.left, right: target.right };
    } else {
      frontIndex = current.left;
      backIndex = target.right;
      staticView = { kind: 'static', left: target.left, right: current.right };
    }

    return { current, target, direction, frontIndex, backIndex, staticView };
  }

  function drawFlipPage(progress) {
    if (!flip || !flipContext) return;

    const ctx = flipContext;
    const width = dom.bookViewport.clientWidth;
    const height = pageHeight;
    const W = pageWidth;
    const dir = flip.direction;
    const frontImage = flip.frontImage;
    const backImage = flip.backImage;

    ctx.clearRect(0, 0, width, height);

    if (
      !frontImage || !frontImage.complete || !frontImage.naturalWidth ||
      !backImage || !backImage.complete || !backImage.naturalWidth
    ) {
      return;
    }

    const hinge = mode === 'single' ? (dir === 1 ? 0 : W) : W;
    const segments = mode === 'single' ? 56 : 72;
    const ds = W / segments;
    const adj = progress * (1 + FLIP_LEAD) - FLIP_LEAD * 0.5;
    const points = [];
    let minX = Infinity;
    let maxX = -Infinity;

    for (let i = 0; i <= segments; i += 1) {
      const u = i * ds;
      const t = u / W;
      const vp = clamp(adj + (t - 0.5) * FLIP_LEAD, 0, 1);
      const angle = vp * Math.PI;
      const d = t * W;
      const depth = d * Math.sin(angle);
      const widen = 1 + 0.18 * clamp(depth / W, 0, 1);
      const x = hinge + (dir === 1 ? 1 : -1) * d * Math.cos(angle) * widen;
      points.push({ u, angle, x });
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }

    const strips = [];

    for (let i = 0; i < segments; i += 1) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const left = Math.min(p0.x, p1.x);
      const stripWidth = Math.abs(p1.x - p0.x);

      if (stripWidth < 0.08) continue;

      const angle = (p0.angle + p1.angle) / 2;
      const front = angle < Math.PI / 2;
      const image = front ? frontImage : backImage;
      let sourceStart;
      let sourceEnd;

      if (dir === 1) {
        if (front) {
          sourceStart = p0.u;
          sourceEnd = p1.u;
        } else {
          sourceStart = W - p1.u;
          sourceEnd = W - p0.u;
        }
      } else if (front) {
        sourceStart = W - p1.u;
        sourceEnd = W - p0.u;
      } else {
        sourceStart = p0.u;
        sourceEnd = p1.u;
      }

      const sourceWidth = ((sourceEnd - sourceStart) / W) * image.naturalWidth;
      if (sourceWidth <= 0) continue;

      strips.push({
        left,
        width: stripWidth + 0.9,
        image,
        sourceX: (sourceStart / W) * image.naturalWidth,
        sourceWidth
      });
    }

    if (!strips.length) return;

    const curl = Math.sin(Math.PI * progress);
    const clipCorners = progress < 0.16;

    if (progress > 0.004) {
      ctx.save();
      ctx.beginPath();
      for (const strip of strips) {
        ctx.rect(strip.left - 1, 0, strip.width + 2, height);
      }
      ctx.shadowColor = `rgba(0, 0, 0, ${(0.34 * curl).toFixed(3)})`;
      ctx.shadowBlur = 22 + 12 * curl;
      ctx.shadowOffsetX = dir === 1 ? -10 : 10;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = 'rgba(2, 8, 14, 0.1)';
      ctx.fill();
      ctx.restore();
    }

    if (clipCorners) {
      ctx.save();
      ctx.beginPath();
      addRoundRectPath(ctx, minX, 0, maxX - minX, height, 3);
      ctx.clip();
    }

    for (const strip of strips) {
      ctx.drawImage(
        strip.image,
        strip.sourceX, 0, strip.sourceWidth, strip.image.naturalHeight,
        strip.left, 0, strip.width, height
      );
    }

    if (curl > 0.01) {
      ctx.save();
      ctx.beginPath();
      for (const strip of strips) {
        ctx.rect(strip.left, 0, strip.width, height);
      }
      ctx.clip();

      const edgeX = points[segments].x;
      const shade = Math.abs(edgeX - hinge) > 0.5
        ? ctx.createLinearGradient(hinge, 0, edgeX, 0)
        : null;

      if (shade) {
        shade.addColorStop(0, `rgba(2, 9, 16, ${(0.16 * curl).toFixed(3)})`);
        shade.addColorStop(0.12, `rgba(2, 9, 16, ${(0.03 * curl).toFixed(3)})`);
        shade.addColorStop(0.7, `rgba(2, 9, 16, ${(0.05 * curl).toFixed(3)})`);
        shade.addColorStop(1, `rgba(2, 9, 16, ${(0.32 * curl).toFixed(3)})`);
        ctx.fillStyle = shade;
        ctx.fillRect(minX - 4, 0, (maxX - minX) + 8, height);
      }

      const inward = edgeX < hinge ? 1 : -1;
      const highlight = ctx.createLinearGradient(edgeX + inward * W * 0.13, 0, edgeX, 0);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0)');
      highlight.addColorStop(1, `rgba(255, 255, 255, ${(0.08 * curl).toFixed(3)})`);
      ctx.fillStyle = highlight;
      ctx.fillRect(minX - 4, 0, (maxX - minX) + 8, height);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    for (const strip of strips) {
      ctx.rect(strip.left, 0, strip.width, height);
    }
    ctx.clip();
    const spine = ctx.createLinearGradient(hinge - 34, 0, hinge + 34, 0);
    spine.addColorStop(0, 'rgba(2, 9, 16, 0)');
    spine.addColorStop(0.5, `rgba(2, 9, 16, ${(0.28 + 0.12 * curl).toFixed(3)})`);
    spine.addColorStop(1, 'rgba(2, 9, 16, 0)');
    ctx.fillStyle = spine;
    ctx.fillRect(hinge - 34, 0, 68, height);
    ctx.restore();

    if (clipCorners) ctx.restore();

    const edgeX = points[segments].x;
    const outside = edgeX >= hinge ? 1 : -1;
    if (progress > 0.006 && Math.abs(edgeX - hinge) > 1) {
      const cast = ctx.createLinearGradient(edgeX, 0, edgeX + outside * 46, 0);
      cast.addColorStop(0, `rgba(2, 8, 14, ${(0.08 + 0.18 * curl).toFixed(3)})`);
      cast.addColorStop(1, 'rgba(2, 8, 14, 0)');
      ctx.fillStyle = cast;
      ctx.fillRect(Math.min(edgeX + outside * 2, edgeX + outside * 46), 0, 46, height);
    }

    if (progress > 0.006 && edgeX >= -2 && edgeX <= width + 2) {
      const thickness = 1.8;
      ctx.fillStyle = 'rgba(241, 247, 252, 0.94)';
      ctx.fillRect(dir === 1 ? edgeX - thickness : edgeX, 0, thickness, height);

      ctx.strokeStyle = 'rgba(8, 22, 38, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(edgeX, 0);
      ctx.lineTo(edgeX, height);
      ctx.stroke();
    }
  }

  function setSheetFace(face, image, index) {
    if (index == null) {
      face.classList.add('is-blank');
      face.style.backgroundImage = 'none';
      setImageElement(image, null);
    } else {
      face.classList.remove('is-blank');
      face.style.backgroundImage = `url("${PAGES[index].thumb}")`;
      setImageElement(image, index);
    }
  }

  function prepareFlip(direction, target, options = {}) {
    const content = sheetContentFor(direction, target);
    const startLayout = layoutForView(content.current);
    const endLayout = layoutForView(target);
    const special = mode === 'spread' && (content.current.kind !== 'inner' || target.kind !== 'inner');
    let revealFrom = 0;

    if (special) {
      if (content.current.kind === 'inner' && target.kind !== 'inner') revealFrom = 0.54;
      else if (content.current.kind !== 'inner' && target.kind === 'inner') revealFrom = 0.4;
      else revealFrom = 0.45;
    }

    flip = {
      ...content,
      startLayout,
      endLayout,
      special,
      revealFrom,
      progress: options.initialProgress ?? 0,
      playedSound: false,
      staticAdvanced: false,
      options
    };

    const frontSource = content.frontIndex != null ? PAGES[content.frontIndex].page : null;
    const backSource = content.backIndex != null ? PAGES[content.backIndex].page : null;

    flip.frontImage = frontSource ? (loadedImages.get(frontSource) || null) : null;
    flip.backImage = backSource ? (loadedImages.get(backSource) || null) : null;

    if (!flip.frontImage && frontSource) {
      flipImageFront.src = frontSource;
      flip.frontImage = flipImageFront;
    }
    if (!flip.backImage && backSource) {
      flipImageBack.src = backSource;
      flip.backImage = flipImageBack;
    }

    setLeafPage(dom.leafLeft, dom.imgLeft, content.current.left);
    setLeafPage(dom.leafRight, dom.imgRight, content.current.right);
    setLeafPage(dom.leafSingle, dom.imgSingle, content.current.single ?? null);

    if (content.frontIndex != null) flipImageFront.src = PAGES[content.frontIndex].page;
    if (content.backIndex != null) flipImageBack.src = PAGES[content.backIndex].page;

    resizeFlipCanvas();
    dom.flipCanvas.classList.add('is-active');
    dom.app.classList.add('is-flipping');
    if (options.dragging) dom.app.classList.add('is-dragging');

    if (options.sound) {
      flip.playedSound = true;
      playTurnSound();
    }

    applyFlipProgress(flip.progress);
  }

  function applyFlipProgress(progress) {
    if (!flip) return;

    flip.progress = progress;
    const shade = Math.sin(progress * Math.PI);
    const revealProgress = flip.special
      ? easeInOutCubic(clamp((progress - flip.revealFrom) / (1 - flip.revealFrom), 0, 1))
      : progress;

    const flipImagesReady =
      flip.frontImage && flip.frontImage.complete && flip.frontImage.naturalWidth &&
      flip.backImage && flip.backImage.complete && flip.backImage.naturalWidth;

    if (progress > 0.012 && !flip.staticAdvanced && flipImagesReady) {
      flip.staticAdvanced = true;
      if (mode === 'single') {
        setLeafPage(dom.leafSingle, dom.imgSingle, flip.staticView.single);
      } else {
        setLeafPage(dom.leafLeft, dom.imgLeft, flip.staticView.left);
        setLeafPage(dom.leafRight, dom.imgRight, flip.staticView.right);
      }
    } else if (progress < 0.008 && flip.staticAdvanced) {
      flip.staticAdvanced = false;
      if (mode === 'single') {
        setLeafPage(dom.leafSingle, dom.imgSingle, flip.current.single);
      } else {
        setLeafPage(dom.leafLeft, dom.imgLeft, flip.current.left);
        setLeafPage(dom.leafRight, dom.imgRight, flip.current.right);
      }
    }

    drawFlipPage(progress);

    if (flip.direction === 1) {
      dom.shadeRight.style.opacity = (shade * 0.64).toFixed(3);
      dom.shadeLeft.style.opacity = '0';
    } else {
      dom.shadeLeft.style.opacity = (shade * 0.64).toFixed(3);
      dom.shadeRight.style.opacity = '0';
    }

    const offset = lerp(flip.startLayout.offset, flip.endLayout.offset, revealProgress);
    const clipLeft = lerp(flip.startLayout.clipLeft, flip.endLayout.clipLeft, revealProgress);
    const clipRight = lerp(flip.startLayout.clipRight, flip.endLayout.clipRight, revealProgress);
    const shadowWidth = lerp(flip.startLayout.shadowWidth, flip.endLayout.shadowWidth, revealProgress);

    dom.bookViewport.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
    applyClip(clipLeft, clipRight);
    dom.bookShadow.style.width = `${Math.round(shadowWidth)}px`;
  }

  function playTurnSoundNow() {
    if (!flip || flip.playedSound) return;
    flip.playedSound = true;
    playTurnSound();
  }

  function settleFlip(target, completed) {
    window.cancelAnimationFrame(rafId);
    rafId = 0;

    if (!flip) {
      busy = false;
      return;
    }

    const finalView = completed ? target : currentView();

    if (completed) {
      maybeShowChapterGhost(target, currentView());
      setStateFromView(target);
    }

    renderStatic(finalView);
    applyRestLayout(finalView);

    dom.shadeLeft.style.opacity = '0';
    dom.shadeRight.style.opacity = '0';

    flip = null;
    busy = false;

    updateUI();
    preloadAround();

    // Keep the already-painted flip sheet for one extra frame so the target
    // image is composited before the canvas is removed. This prevents the
    // one-frame flash on the first visit to a spread.
    window.requestAnimationFrame(() => {
      dom.flipCanvas.classList.remove('is-active');
      if (flipContext) {
        flipContext.clearRect(0, 0, dom.bookViewport.clientWidth, pageHeight);
      }
      dom.app.classList.remove('is-flipping', 'is-dragging');
    });
  }

  function cancelActiveFlip() {
    if (!flip) {
      busy = false;
      return;
    }
    settleFlip(null, false);
  }

  function animateFlip(target, direction, fromProgress = 0, toProgress = 1, options = {}) {
    if (!flip) prepareFlip(direction, target, options);

    busy = true;
    dom.app.classList.add('is-flipping');
    dom.app.classList.remove('is-dragging');

    const complete = options.complete ?? toProgress === 1;
    const distance = Math.abs(toProgress - fromProgress);
    const duration = REDUCED_MOTION
      ? 1
      : Math.max(220, 560 * distance + (fromProgress > 0.01 ? 80 : 0));
    const startTime = performance.now();
    const startProgress = fromProgress;
    const easing = easePageTurn;

    const tick = (now) => {
      const elapsed = Math.min(1, (now - startTime) / duration);
      const eased = easing(elapsed);
      applyFlipProgress(startProgress + (toProgress - startProgress) * eased);

      if (elapsed < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        if (complete) {
          playTurnSoundNow();
          settleFlip(target, true);
        } else {
          settleFlip(null, false);
        }
      }
    };

    rafId = window.requestAnimationFrame(tick);
  }

  async function navigate(direction) {
    if (!ready || busy) return;
    const target = targetView(direction);
    if (!target) return;

    hideHint();
    busy = true;

    await Promise.race([
      Promise.all([...viewPages(currentView()), ...viewPages(target)].map(loadPage)),
      delay(40)
    ]);

    if (!ready) {
      busy = false;
      return;
    }

    prepareFlip(direction, target, { sound: true, initialProgress: FLIP_START });
    animateFlip(target, direction, FLIP_START, FLIP_END, { sound: false, complete: true });
  }

  function jumpToView(target) {
    if (!ready || busy) return;

    busy = true;
    dom.app.classList.add('is-jumping');
    hideHint();

    window.setTimeout(() => {
      setStateFromView(target);
      renderStatic(currentView());
      applyRestLayout();
      updateUI();

      window.requestAnimationFrame(() => {
        dom.app.classList.remove('is-jumping');
        window.setTimeout(() => {
          busy = false;
          preloadAround();
        }, REDUCED_MOTION ? 20 : 240);
      });
    }, REDUCED_MOTION ? 10 : 140);
  }

  function goToPage(index) {
    if (!ready || index < 0 || index >= TOTAL) return;
    const target = targetViewForPage(index);
    if (isSameView(target, currentView())) {
      closeDrawer();
      return;
    }

    closeDrawer();

    if (busy) return;

    let delta = 0;
    if (mode === 'single') delta = target.single - singleIndex;
    else delta = target.spreadIndex - spreadIndex;

    if (Math.abs(delta) === 1) {
      navigate(delta > 0 ? 1 : -1);
    } else {
      jumpToView(target);
    }
  }

  /* ---------- UI ---------- */

  let currentThumbPages = new Set();

  function updateUI() {
    const view = currentView();
    const visible = viewPages(view);
    const first = visible[0] ?? 0;
    const last = visible[visible.length - 1] ?? first;
    const title = viewTitle(view);
    const section = viewSection(view);

    dom.pageTitle.textContent = title;
    dom.pageStatus.title = title.replace(/\n/g, ' / ');
    dom.pageCount.textContent = `${pad2(pageNumber(first))}${visible.length > 1 ? '–' + pad2(pageNumber(last)) : ''} / ${TOTAL}`;

    const atStart = mode === 'single' ? singleIndex === 0 : spreadIndex === 0;
    const atEnd = mode === 'single' ? singleIndex === TOTAL - 1 : spreadIndex === spreads.length - 1;

    [dom.prevBtn, dom.prevPage].forEach((button) => { button.disabled = atStart; });
    [dom.nextBtn, dom.nextPage].forEach((button) => { button.disabled = atEnd; });
    dom.firstBtn.disabled = atStart;
    dom.lastBtn.disabled = atEnd;

    dom.scrubber.value = String(first + 1);
    const seek = ((first + 1 - 1) / Math.max(1, TOTAL - 1)) * 100;
    dom.scrubber.style.setProperty('--seek', `${seek.toFixed(2)}%`);

    const countLabel = visible.length > 1
      ? `第 ${pageNumber(first)} 至 ${pageNumber(last)} 页`
      : `第 ${pageNumber(first)} 页`;
    const accessibleTitle = title.replace(/\n/g, '，');
    dom.pageStatus.setAttribute('aria-label', `${countLabel}，${accessibleTitle}，点击打开页面目录`);

    dom.live.textContent = `${countLabel}，${accessibleTitle}`;

    const visibleSet = new Set(visible);
    if (visibleSet.size !== currentThumbPages.size || Array.from(visibleSet).some((page) => !currentThumbPages.has(page))) {
      currentThumbPages = visibleSet;
      updateThumbCurrent();
    }

    updateDirectoryCurrent();
    updateContactHotspots();
  }

  function updateContactHotspots() {
    const elements = [
      dom.contactHighlight,
      dom.contactHighlightGlow,
      dom.contactHighlightHit,
      dom.contactHighlightBadge
    ];
    if (elements.some((element) => !element)) return;

    const hide = () => elements.forEach((element) => { element.hidden = true; });
    const leaf = [dom.leafLeft, dom.leafRight, dom.leafSingle].find(
      (item) => item && item.dataset.pageIndex === String(BACK_PAGE) && !item.classList.contains('is-empty')
    );

    if (!ready || flip || !leaf) {
      hide();
      return;
    }

    const spreadRect = dom.spread.getBoundingClientRect();
    const leafRect = leaf.getBoundingClientRect();
    const scale = Math.max(
      leafRect.width / CONTACT_SOURCE.width,
      leafRect.height / CONTACT_SOURCE.height
    );
    const offsetX = (leafRect.width - CONTACT_SOURCE.width * scale) / 2;
    const offsetY = (leafRect.height - CONTACT_SOURCE.height * scale) / 2;

    const left = leafRect.left - spreadRect.left + offsetX + CONTACT_FRAME.x * scale;
    const top = leafRect.top - spreadRect.top + offsetY + CONTACT_FRAME.y * scale;
    const width = CONTACT_FRAME.w * scale;
    const height = CONTACT_FRAME.h * scale;

    dom.contactHighlight.hidden = false;
    dom.contactHighlightGlow.hidden = false;
    dom.contactHighlightHit.hidden = false;
    for (const element of [dom.contactHighlight, dom.contactHighlightGlow, dom.contactHighlightHit]) {
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
    }

    const badge = dom.contactHighlightBadge;
    badge.hidden = false;
    const badgeWidth = badge.offsetWidth || 120;
    const badgeHeight = badge.offsetHeight || 24;
    const badgeLeft = clamp(left + width - badgeWidth, 0, window.innerWidth - badgeWidth);
    let badgeTop = top - badgeHeight - 8;
    if (badgeTop < 0) badgeTop = top + 8;
    badge.style.left = `${badgeLeft}px`;
    badge.style.top = `${badgeTop}px`;

    dom.contactHighlightHit.style.top = `${top - badgeHeight - 8}px`;
    dom.contactHighlightHit.style.height = `${height + badgeHeight + 8}px`;
  }

  function printedPageForIndex(index) {
    const page = PAGES[index];
    if (!page || page.n <= 3 || page.n >= TOTAL) return null;
    return page.n - 3;
  }

  function pageRangeText(start, end) {
    return end > start ? `${pad2(start)}–${pad2(end)}` : pad2(start);
  }

  function buildDirectory() {
    if (!TOC.length) {
      dom.tocTabDirectory.hidden = true;
      tocView = 'thumbs';
      switchTocView('thumbs', { scroll: false });
      return;
    }

    const fragment = document.createDocumentFragment();

    TOC.forEach((item) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'toc-row';
      row.dataset.start = String(item.start);
      row.dataset.end = String(item.end);
      row.setAttribute('aria-label', `${item.name}，印刷页 ${pageRangeText(item.start, item.end)}，点击跳转`);

      const bullet = document.createElement('span');
      bullet.className = 'toc-bullet';
      bullet.setAttribute('aria-hidden', 'true');

      const name = document.createElement('span');
      name.className = 'toc-name';
      name.textContent = item.name;

      const range = document.createElement('span');
      range.className = 'toc-range';
      range.textContent = pageRangeText(item.start, item.end);

      row.append(bullet, name, range);
      row.addEventListener('click', () => {
        goToPage(item.start + 2);
      });

      fragment.appendChild(row);
    });

    dom.tocList.appendChild(fragment);
    updateDirectoryCurrent();
  }

  function updateDirectoryCurrent() {
    if (!dom.tocList || !dom.tocList.children.length) return;

    const currentPrinted = viewPages(currentView())
      .map(printedPageForIndex)
      .filter((value) => value != null);

    $$('.toc-row', dom.tocList).forEach((row) => {
      const start = Number(row.dataset.start);
      const end = Number(row.dataset.end);
      const active = currentPrinted.some((page) => page >= start && page <= end);
      row.classList.toggle('is-active', active);
      if (active) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
  }

  function scrollIntoDrawer(element) {
    if (!element || !drawerOpen) return;
    const body = dom.drawerBody;
    const bodyRect = body.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const top = body.scrollTop + (elementRect.top - bodyRect.top) - Math.max(16, (body.clientHeight - elementRect.height) / 2);
    body.scrollTo({ top: Math.max(0, top), behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
  }

  function scrollActiveTocIntoView() {
    const active = $('.toc-row.is-active', dom.tocList);
    if (active) {
      scrollIntoDrawer(active);
    } else {
      dom.drawerBody.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
    }
  }

  function switchTocView(view, options = {}) {
    tocView = view === 'thumbs' ? 'thumbs' : 'directory';
    const isDirectory = tocView === 'directory';

    dom.tocTabDirectory.classList.toggle('is-active', isDirectory);
    dom.tocTabThumbs.classList.toggle('is-active', !isDirectory);
    dom.tocTabDirectory.setAttribute('aria-selected', String(isDirectory));
    dom.tocTabThumbs.setAttribute('aria-selected', String(!isDirectory));
    dom.tocTabDirectory.tabIndex = isDirectory ? 0 : -1;
    dom.tocTabThumbs.tabIndex = isDirectory ? -1 : 0;

    dom.directoryPanel.hidden = !isDirectory;
    dom.thumbsPanel.hidden = isDirectory;

    dom.drawerSubCount.textContent = isDirectory
      ? `${TOC.length || 34} 个产品系列`
      : `共 ${TOTAL} 页`;
    dom.drawerSubHint.textContent = isDirectory
      ? '点击系列快速跳转'
      : '点击缩略图快速跳转';

    if (options.scroll === false) return;

    window.requestAnimationFrame(() => {
      if (!drawerOpen) return;
      if (isDirectory) scrollActiveTocIntoView();
      else scrollCurrentThumbIntoView();
    });
  }

  function updateThumbCurrent() {
    $$('.thumb-card', dom.thumbGrid).forEach((card) => {
      const index = Number(card.dataset.page);
      const current = currentThumbPages.has(index);
      card.classList.toggle('is-current', current);
      if (current) card.setAttribute('aria-current', 'page');
      else card.removeAttribute('aria-current');
    });
  }

  function buildThumbs() {
    const fragment = document.createDocumentFragment();

    PAGES.forEach((page, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'thumb-card';
      card.dataset.page = String(index);
      card.setAttribute('aria-label', `第 ${page.n} 页，${page.title}`);

      const frame = document.createElement('span');
      frame.className = 'thumb-frame';

      const image = document.createElement('img');
      image.src = page.thumb;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      frame.appendChild(image);

      const meta = document.createElement('span');
      meta.className = 'thumb-meta';

      const label = document.createElement('span');
      label.className = 'thumb-label';
      if (page.n === 1) label.textContent = '封面';
      else if (page.n === 2) label.textContent = '简介';
      else if (page.n === 3) label.textContent = '目录';
      else if (page.n === TOTAL) label.textContent = '封底';
      else label.textContent = `产品 ${page.label}`;

      const number = document.createElement('span');
      number.className = 'thumb-pnum';
      number.textContent = pad2(page.n);

      meta.append(label, number);
      card.append(frame, meta);

      card.addEventListener('click', () => goToPage(index));
      fragment.appendChild(card);
    });

    dom.thumbGrid.appendChild(fragment);
  }

  function scrollCurrentThumbIntoView() {
    const current = $('.thumb-card.is-current', dom.thumbGrid);
    if (!current) return;
    scrollIntoDrawer(current);
  }

  function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    lastFocus = document.activeElement;
    window.clearTimeout(drawerCloseTimer);

    dom.drawerBackdrop.hidden = false;
    dom.drawer.setAttribute('aria-hidden', 'false');
    dom.tocBtn.setAttribute('aria-expanded', 'true');
    dom.app.classList.add('is-drawer-open');

    window.requestAnimationFrame(() => {
      dom.drawerBackdrop.classList.add('is-open');
      dom.drawer.classList.add('is-open');
    });

    updateUI();
    switchTocView(tocView, { scroll: false });
    window.setTimeout(() => {
      if (!drawerOpen) return;
      if (tocView === 'directory') scrollActiveTocIntoView();
      else scrollCurrentThumbIntoView();
      dom.drawerClose.focus({ preventScroll: true });
    }, 90);
  }

  function closeDrawer(restoreFocus = true) {
    if (!drawerOpen) return;
    drawerOpen = false;
    dom.drawer.classList.remove('is-open');
    dom.drawerBackdrop.classList.remove('is-open');
    dom.drawer.setAttribute('aria-hidden', 'true');
    dom.tocBtn.setAttribute('aria-expanded', 'false');
    dom.app.classList.remove('is-drawer-open');

    window.clearTimeout(drawerCloseTimer);
    drawerCloseTimer = window.setTimeout(() => {
      if (!drawerOpen) dom.drawerBackdrop.hidden = true;
    }, REDUCED_MOTION ? 10 : 420);

    if (restoreFocus && lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function showToast(message, duration = 1900) {
    dom.toast.textContent = message;
    dom.toast.classList.add('is-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove('is-show');
    }, duration);
  }

  function showHint() {
    if (!ready) return;
    dom.hintText.textContent = isMobileUX()
      ? '左右拖动翻页 · 双击放大 · 点此看提示'
      : '拖动页角翻页 · 双击放大 · 点此看提示';
    dom.hint.classList.add('is-visible');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(hideHint, 6200);
  }

  function hideHint() {
    window.clearTimeout(hintTimer);
    dom.hint.classList.remove('is-visible');
    dom.hint.classList.add('is-hidden');
  }

  /* ---------- Sound ---------- */

  function ensureAudio() {
    if (audioContext) {
      if (audioContext.state === 'suspended') audioContext.resume();
      return audioContext;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    audioContext = new Ctx();
    const seconds = 0.6;
    const length = Math.floor(audioContext.sampleRate * seconds);
    noiseBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const envelope = Math.pow(1 - i / length, 1.8);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    return audioContext;
  }

  function playTurnSound(strength = 1) {
    if (!soundEnabled) return;
    const context = ensureAudio();
    if (!context || !noiseBuffer) return;

    const now = context.currentTime + 0.005;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.72;
    filter.frequency.setValueAtTime(720, now);
    filter.frequency.exponentialRampToValueAtTime(2300, now + 0.19);
    filter.frequency.exponentialRampToValueAtTime(520, now + 0.48);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.085 * strength, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + 0.54);

    const thump = context.createOscillator();
    const thumpGain = context.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(150, now);
    thump.frequency.exponentialRampToValueAtTime(64, now + 0.1);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.018 * strength, now + 0.012);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    thump.connect(thumpGain);
    thumpGain.connect(context.destination);
    thump.start(now);
    thump.stop(now + 0.15);
  }

  function updateSoundUI() {
    dom.soundBtn.classList.toggle('is-on', soundEnabled);
    dom.soundBtn.setAttribute('aria-pressed', String(soundEnabled));
    dom.soundBtn.setAttribute('aria-label', soundEnabled ? '关闭翻页音效' : '开启翻页音效');
  }

  function loadSoundPreference() {
    try {
      soundEnabled = window.localStorage.getItem('qianxun-album-sound') === 'on';
    } catch (error) {
      soundEnabled = false;
    }
    updateSoundUI();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    try {
      window.localStorage.setItem('qianxun-album-sound', soundEnabled ? 'on' : 'off');
    } catch (error) {
      /* storage may be disabled under file:// */
    }
    updateSoundUI();
    if (soundEnabled) {
      ensureAudio();
      playTurnSound(0.42);
      showToast('翻页音效已开启');
    } else {
      showToast('翻页音效已关闭');
    }
  }

  /* ---------- Fullscreen ---------- */

  const canFullscreen = Boolean(document.documentElement.requestFullscreen);

  function updateFullscreenUI() {
    const active = Boolean(document.fullscreenElement);
    dom.fullBtn.classList.toggle('is-on', active);
    dom.fullBtn.setAttribute('aria-label', active ? '退出全屏' : '进入全屏');
    dom.fullBtn.title = active ? '退出全屏' : '全屏';
  }

  async function toggleFullscreen() {
    if (!canFullscreen) {
      showToast('当前浏览器不支持全屏');
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch (error) {
      showToast('无法切换全屏，请检查浏览器设置');
    }
  }

  /* ---------- Zoom ---------- */

  const zoomState = {
    open: false,
    index: 0,
    scale: 1,
    x: 0,
    y: 0,
    baseW: 0,
    baseH: 0,
    availW: 0,
    availH: 0,
    maxScale: 1,
    pointers: new Map(),
    pinchDistance: 0,
    pinchScale: 1,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    originX: 0,
    originY: 0,
    movePointerId: null,
    loadToken: 0
  };

  function pageIndexFromPoint(clientX, clientY) {
    if (mode === 'single') return singleIndex;

    const view = currentView();
    const rect = dom.bookViewport.getBoundingClientRect();
    const leftPageWidth = rect.width / 2;
    const onLeft = clientX < rect.left + leftPageWidth;
    if (onLeft && view.left != null) return view.left;
    if (!onLeft && view.right != null) return view.right;
    return activePage();
  }

  function zoomStageMetrics() {
    const style = window.getComputedStyle(dom.zoomStage);
    return {
      width: Math.max(1, dom.zoomStage.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0)),
      height: Math.max(1, dom.zoomStage.clientHeight - parseFloat(style.paddingTop || 0) - parseFloat(style.paddingBottom || 0))
    };
  }

  function getMaxZoomScale() {
    if (!zoomState.baseW) return 1;
    const naturalWidth = dom.zoomImg.naturalWidth || 1440;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const nativeScale = naturalWidth / Math.max(1, zoomState.baseW * dpr);
    return clamp(nativeScale, 1, 4.5);
  }

  function fitZoomImage() {
    const naturalWidth = dom.zoomImg.naturalWidth;
    const naturalHeight = dom.zoomImg.naturalHeight;
    if (!naturalWidth || !naturalHeight) return false;

    const metrics = zoomStageMetrics();
    const fit = Math.min(metrics.width / naturalWidth, metrics.height / naturalHeight, 1);

    zoomState.baseW = naturalWidth * fit;
    zoomState.baseH = naturalHeight * fit;
    zoomState.availW = metrics.width;
    zoomState.availH = metrics.height;
    zoomState.maxScale = getMaxZoomScale();
    return true;
  }

  function setZoomTransform(scale, x, y) {
    if (!zoomState.open || !zoomState.baseW) return;

    const maxScale = getMaxZoomScale();
    const nextScale = clamp(scale, 1, maxScale);
    const width = zoomState.baseW * nextScale;
    const height = zoomState.baseH * nextScale;
    const maxX = Math.max(0, (width - zoomState.availW) / 2 + 14);
    const maxY = Math.max(0, (height - zoomState.availH) / 2 + 14);

    zoomState.scale = nextScale;
    zoomState.maxScale = maxScale;
    zoomState.x = nextScale <= 1.001 ? 0 : clamp(x, -maxX, maxX);
    zoomState.y = nextScale <= 1.001 ? 0 : clamp(y, -maxY, maxY);

    dom.zoomImg.style.width = `${width.toFixed(2)}px`;
    dom.zoomImg.style.height = `${height.toFixed(2)}px`;
    dom.zoomImg.style.transform = `translate(-50%, -50%) translate3d(${zoomState.x.toFixed(2)}px, ${zoomState.y.toFixed(2)}px, 0)`;
    dom.zoomLevel.textContent = `${Math.round(zoomState.scale * 100)}%`;
    dom.zoomStage.classList.toggle('is-zoomed', zoomState.scale > 1.02);
    dom.zoomIn.disabled = zoomState.scale >= maxScale - 0.005;
    dom.zoomOut.disabled = zoomState.scale <= 1.005;
  }

  function handleZoomImageLoad() {
    if (!zoomState.open) return;
    if (!fitZoomImage()) return;
    dom.zoomStage.classList.add('is-ready');
    dom.zoomLoading.classList.remove('is-visible');
    setZoomTransform(zoomState.scale, zoomState.x, zoomState.y);
  }

  function zoomAtPoint(nextScale, clientX, clientY) {
    if (!zoomState.open || !zoomState.baseW) return;
    const maxScale = getMaxZoomScale();
    const target = clamp(nextScale, 1, maxScale);
    if (Math.abs(target - zoomState.scale) < 0.0005) return;

    const rect = dom.zoomStage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const pointX = clientX - centerX;
    const pointY = clientY - centerY;
    const ratio = target / zoomState.scale;

    setZoomTransform(
      target,
      pointX - (pointX - zoomState.x) * ratio,
      pointY - (pointY - zoomState.y) * ratio
    );
  }

  function openZoom(index = activePage()) {
    if (!ready) return;
    const page = PAGES[index];
    if (!page) return;

    zoomState.open = true;
    zoomState.index = index;
    zoomState.scale = 1;
    zoomState.x = 0;
    zoomState.y = 0;
    zoomState.baseW = 0;
    zoomState.baseH = 0;
    zoomState.maxScale = 1;
    zoomState.pointers.clear();
    zoomState.loadToken += 1;
    const token = zoomState.loadToken;

    lastFocus = document.activeElement;
    dom.zoomModal.setAttribute('aria-hidden', 'false');
    dom.zoomTitle.textContent = page.title;
    dom.zoomMeta.textContent = `${pad2(page.n)} / ${TOTAL}`;
    dom.zoomImg.alt = `${page.title}，第 ${page.n} 页`;
    dom.zoomImg.style.width = '0px';
    dom.zoomImg.style.height = '0px';
    dom.zoomImg.style.transform = 'translate(-50%, -50%)';
    dom.zoomLevel.textContent = '100%';
    dom.zoomIn.disabled = true;
    dom.zoomOut.disabled = true;
    dom.zoomStage.classList.remove('is-ready', 'is-zoomed', 'is-dragging');
    dom.zoomLoading.classList.add('is-visible');
    dom.zoomModal.classList.add('is-open');

    dom.zoomImg.src = page.page;
    if (dom.zoomImg.complete && dom.zoomImg.naturalWidth) {
      window.requestAnimationFrame(handleZoomImageLoad);
    }

    window.setTimeout(() => {
      if (zoomState.open) dom.zoomClose.focus({ preventScroll: true });
    }, 80);

    const hires = new Image();
    hires.onload = () => {
      if (!zoomState.open || token !== zoomState.loadToken) return;
      dom.zoomImg.src = page.zoom;
    };
    hires.src = page.zoom;
  }

  function closeZoom() {
    if (!zoomState.open) return;
    zoomState.open = false;
    zoomState.loadToken += 1;
    zoomState.pointers.clear();
    zoomState.dragging = false;
    dom.zoomModal.classList.remove('is-open');
    dom.zoomModal.setAttribute('aria-hidden', 'true');
    dom.zoomStage.classList.remove('is-ready', 'is-zoomed', 'is-dragging');
    dom.zoomLoading.classList.remove('is-visible');
    dom.zoomImg.style.width = '0px';
    dom.zoomImg.style.height = '0px';
    dom.zoomImg.style.transform = 'translate(-50%, -50%)';
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function zoomBy(factor) {
    if (!zoomState.open) return;
    const rect = dom.zoomStage.getBoundingClientRect();
    zoomAtPoint(zoomState.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function resetZoom() {
    setZoomTransform(1, 0, 0);
  }

  function handleZoomPointerDown(event) {
    if (!zoomState.open) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    dom.zoomStage.setPointerCapture?.(event.pointerId);
    zoomState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (zoomState.pointers.size === 1) {
      zoomState.movePointerId = event.pointerId;
      zoomState.dragging = zoomState.scale > 1.01;
      zoomState.dragStartX = event.clientX;
      zoomState.dragStartY = event.clientY;
      zoomState.originX = zoomState.x;
      zoomState.originY = zoomState.y;
      if (zoomState.dragging) dom.zoomStage.classList.add('is-dragging');
    } else if (zoomState.pointers.size === 2) {
      const points = Array.from(zoomState.pointers.values());
      zoomState.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      zoomState.pinchScale = zoomState.scale;
      zoomState.dragging = false;
      dom.zoomStage.classList.remove('is-dragging');
    }
  }

  function handleZoomPointerMove(event) {
    if (!zoomState.open || !zoomState.pointers.has(event.pointerId)) return;
    zoomState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (zoomState.pointers.size === 2) {
      const points = Array.from(zoomState.pointers.values());
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (zoomState.pinchDistance > 0) {
        const next = zoomState.pinchScale * (distance / zoomState.pinchDistance);
        const centerX = (points[0].x + points[1].x) / 2;
        const centerY = (points[0].y + points[1].y) / 2;
        zoomAtPoint(next, centerX, centerY);
      }
      event.preventDefault();
      return;
    }

    if (!zoomState.dragging || zoomState.scale <= 1.01) return;

    const dx = event.clientX - zoomState.dragStartX;
    const dy = event.clientY - zoomState.dragStartY;
    setZoomTransform(zoomState.scale, zoomState.originX + dx, zoomState.originY + dy);
    event.preventDefault();
  }

  function handleZoomPointerUp(event) {
    zoomState.pointers.delete(event.pointerId);
    if (zoomState.pointers.size < 2) zoomState.pinchDistance = 0;
    if (zoomState.pointers.size === 0) {
      zoomState.dragging = false;
      zoomState.movePointerId = null;
      dom.zoomStage.classList.remove('is-dragging');
    }
  }

  function handleZoomWheel(event) {
    if (!zoomState.open) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomAtPoint(zoomState.scale * factor, event.clientX, event.clientY);
  }

  /* ---------- Focus trap ---------- */

  function trapFocus(event, container) {
    if (event.key !== 'Tab') return;

    const focusables = $$('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter((element) => element.offsetParent !== null);

    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------- Drag / touch ---------- */

  function canFlip(direction) {
    if (direction === 1) {
      return mode === 'single' ? singleIndex < TOTAL - 1 : spreadIndex < spreads.length - 1;
    }
    if (direction === -1) {
      return mode === 'single' ? singleIndex > 0 : spreadIndex > 0;
    }
    return false;
  }

  function beginDrag(event) {
    if (!ready || busy || event.button > 0 || drawerOpen || zoomState.open) return;
    if (event.target.closest('button, a, input')) return;

    drag.active = true;
    drag.prepared = false;
    drag.pointerId = event.pointerId;
    drag.pointerType = event.pointerType || 'mouse';
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    drag.startTime = performance.now();
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = drag.startTime;
    drag.velocity = 0;
    drag.direction = 0;
    drag.progress = 0;
    drag.moved = false;
    drag.vertical = false;

    dom.bookViewport.setPointerCapture?.(event.pointerId);
  }

  function pickDirection(event) {
    if (mode === 'single') {
      const dx = event.clientX - drag.startX;
      if (Math.abs(dx) < 8) return 0;
      return dx < 0 ? 1 : -1;
    }

    const rect = dom.bookViewport.getBoundingClientRect();
    return drag.startX < rect.left + rect.width / 2 ? -1 : 1;
  }

  function moveDrag(event) {
    if (!drag.active || event.pointerId !== drag.pointerId) return;
    if (!ready || drawerOpen || zoomState.open) {
      endDrag(event, true);
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = Math.abs(event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;

    if (!drag.prepared) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.15) {
        drag.vertical = true;
        drag.active = false;
        return;
      }

      const direction = pickDirection(event);
      if (!direction || !canFlip(direction)) {
        drag.active = false;
        return;
      }

      if (direction === 1 && dx > 0) return;
      if (direction === -1 && dx < 0) return;

      const target = targetView(direction);
      if (!target) {
        drag.active = false;
        return;
      }

      prepareFlip(direction, target, { sound: false, dragging: true });
      drag.prepared = true;
      drag.direction = direction;
      busy = true;
      dom.app.classList.add('is-dragging');
    }

    if (!drag.prepared || !flip) return;

    drag.moved = true;
    let progress;
    if (drag.direction === 1) {
      progress = (drag.startX - event.clientX) / Math.max(1, pageWidth * 0.9);
    } else {
      progress = (event.clientX - drag.startX) / Math.max(1, pageWidth * 0.9);
    }

    drag.progress = clamp(progress, 0, 1);
    applyFlipProgress(drag.progress);
    event.preventDefault();
  }

  function endDrag(event, cancelled = false) {
    if (!drag.active && !drag.prepared) return;

    const wasPrepared = drag.prepared;
    const direction = drag.direction;
    const progress = drag.progress;
    const pointerType = drag.pointerType;
    const startX = drag.startX;
    const startY = drag.startY;
    const moved = drag.moved;
    const vertical = drag.vertical;

    drag.active = false;

    if (dom.bookViewport.hasPointerCapture?.(event.pointerId)) {
      try {
        dom.bookViewport.releasePointerCapture(event.pointerId);
      } catch (error) {
        /* ignore */
      }
    }

    if (!wasPrepared) {
      drag.prepared = false;
      drag.pointerId = null;

      if (!moved && !vertical && !cancelled) {
        handleTap(event, pointerType, startX, startY);
      }
      return;
    }

    drag.prepared = false;
    drag.pointerId = null;

    if (!flip) {
      busy = false;
      return;
    }

    const elapsed = Math.max(1, performance.now() - drag.lastTime);
    const velocity = Math.max(drag.velocity, Math.abs(event.clientX - drag.lastX) / elapsed);
    const complete = !cancelled && (progress > 0.3 || velocity > 0.5);

    if (complete) {
      playTurnSoundNow();
      if (progress >= FLIP_END) {
        applyFlipProgress(FLIP_END);
        settleFlip(flip.target, true);
      } else {
        animateFlip(flip.target, direction, progress, FLIP_END, { sound: false, complete: true });
      }
    } else {
      animateFlip(flip.target, direction, progress, 0, { sound: false, complete: false });
    }
  }

  function handleTap(event, pointerType, startX, startY) {
    if (pointerType !== 'touch') return;

    const now = performance.now();
    const distance = Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y);

    if (now - lastTap.time < 340 && distance < 42) {
      lastTap = { time: 0, x: 0, y: 0 };
      const index = pageIndexFromPoint(event.clientX, event.clientY);
      openZoom(index);
      return;
    }

    lastTap = { time: now, x: event.clientX, y: event.clientY };
    void startX;
    void startY;
  }

  /* ---------- Event bindings ---------- */

  /* ---------- Ambient starfield ---------- */

  function initStarfield() {
    const canvas = dom.starfield;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars = [];
    let meteors = [];
    let rafId = 0;
    let lastFrame = 0;
    let lastPaint = 0;
    let nextMeteorAt = 0;

    const starCount = () => (
      IS_COARSE
        ? 170
        : Math.min(380, Math.max(220, Math.round((window.innerWidth * window.innerHeight) / 3800)))
    );

    const makeStars = () => {
      const fieldStars = Array.from({ length: starCount() }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.5 + Math.random() * 1.5,
        alpha: 0.34 + Math.random() * 0.62,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.35 + Math.random() * 1.15,
        drift: 0.0015 + Math.random() * 0.0035,
        bright: Math.random() > 0.9,
        galaxy: false
      }));

      const galaxyCount = IS_COARSE ? 100 : 300;
      const galaxyStars = Array.from({ length: galaxyCount }, () => {
        const t = Math.random();
        return {
          x: t * width + (Math.random() - 0.5) * width * 0.1,
          y: height * (0.04 + t * 0.92) + (Math.random() - 0.5) * height * 0.14,
          radius: 0.28 + Math.random() * 0.78,
          alpha: 0.14 + Math.random() * 0.34,
          phase: Math.random() * Math.PI * 2,
          twinkle: 0.28 + Math.random() * 1.3,
          drift: 0.001 + Math.random() * 0.0028,
          bright: false,
          galaxy: true
        };
      });

      stars = fieldStars.concat(galaxyStars);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
      if (REDUCED_MOTION) drawStatic();
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        ctx.fillStyle = `rgba(190, 220, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const spawnMeteor = (now) => {
      const fromLeft = Math.random() > 0.5;
      const speedX = (0.28 + Math.random() * 0.15) * (fromLeft ? 1 : -1);
      const speedY = 0.18 + Math.random() * 0.11;
      meteors.push({
        x: fromLeft ? -30 - Math.random() * 80 : width + 30 + Math.random() * 80,
        y: -30 - Math.random() * height * 0.28,
        vx: speedX,
        vy: speedY,
        age: 0,
        life: 900 + Math.random() * 620,
        length: 165 + Math.random() * 190,
        width: 1.1 + Math.random() * 1.05
      });

      if (Math.random() < 0.28) {
        const secondLeft = Math.random() > 0.5;
        meteors.push({
          x: secondLeft ? -40 - Math.random() * 60 : width + 40 + Math.random() * 60,
          y: -80 - Math.random() * height * 0.22,
          vx: (0.26 + Math.random() * 0.12) * (secondLeft ? 1 : -1),
          vy: 0.17 + Math.random() * 0.08,
          age: -220 - Math.random() * 260,
          life: 850 + Math.random() * 500,
          length: 130 + Math.random() * 150,
          width: 0.9 + Math.random() * 0.7
        });
      }

      nextMeteorAt = now + 2400 + Math.random() * 3600;
    };

    const draw = (now) => {
      rafId = window.requestAnimationFrame(draw);
      if (document.hidden) {
        lastFrame = now;
        return;
      }

      if (now - lastPaint < 32) return;
      lastPaint = now;

      const dt = lastFrame ? Math.min(48, now - lastFrame) : 16;
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        star.y += star.drift * dt * 0.035;
        if (star.y > height + 2) {
          star.y = -2;
          star.x = Math.random() * width;
        }
        const twinkle = 0.6 + 0.4 * Math.sin(now * 0.001 * star.twinkle + star.phase);
        const alpha = star.alpha * twinkle;
        const x = star.x;
        const y = star.y;

        if (star.bright) {
          ctx.fillStyle = `rgba(128, 194, 255, ${(alpha * 0.1).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, star.radius * 5.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = star.galaxy
          ? `rgba(177, 205, 248, ${alpha.toFixed(3)})`
          : `rgba(202, 229, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!REDUCED_MOTION && now >= nextMeteorAt) spawnMeteor(now);

      meteors = meteors.filter((meteor) => {
        meteor.age += dt;
        if (meteor.age < 0) return true;
        meteor.x += meteor.vx * dt;
        meteor.y += meteor.vy * dt;

        if (meteor.age > meteor.life || meteor.y > height + 80) return false;

        const tailX = meteor.x - meteor.vx * meteor.length * 3;
        const tailY = meteor.y - meteor.vy * meteor.length * 3;
        const fade = Math.sin(Math.min(1, meteor.age / meteor.life) * Math.PI);
        const trail = ctx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
        trail.addColorStop(0, `rgba(242, 250, 255, ${(0.98 * fade).toFixed(3)})`);
        trail.addColorStop(0.22, `rgba(176, 220, 255, ${(0.55 * fade).toFixed(3)})`);
        trail.addColorStop(1, 'rgba(90, 160, 255, 0)');

        ctx.save();
        ctx.strokeStyle = trail;
        ctx.lineWidth = meteor.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.shadowColor = 'rgba(160, 216, 255, .95)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(245, 252, 255, ${(0.96 * fade).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, 1.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });
    };

    resize();
    window.addEventListener('resize', resize);
    if (!REDUCED_MOTION) {
      nextMeteorAt = performance.now() + 1100 + Math.random() * 1500;
      rafId = window.requestAnimationFrame(draw);
    }
    window.addEventListener('pagehide', () => window.cancelAnimationFrame(rafId));
  }

  /* ---------- Button effects ---------- */

  function initButtonEffects() {
    if (REDUCED_MOTION) return;

    document.addEventListener('pointerdown', (event) => {
      if (event.button && event.button > 0) return;
      const control = event.target.closest('button, .brand, .toc-row, .thumb-card');
      if (!control || control.disabled) return;

      const rect = control.getBoundingClientRect();
      const size = Math.min(180, Math.max(52, Math.max(rect.width, rect.height) * 1.15));
      const ripple = document.createElement('span');
      ripple.className = 'ui-click-ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }, { passive: true });
  }

  /* ---------- Page light ---------- */

  function initPageLightEffects() {
    if (IS_COARSE || !dom.spread) return;

    let rafId = 0;
    let pointerX = 0;
    let pointerY = 0;

    const update = () => {
      rafId = 0;
      const rect = dom.bookViewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = ((pointerX - rect.left) / rect.width) * 100;
      const y = ((pointerY - rect.top) / rect.height) * 100;
      const inside = x >= -2 && x <= 102 && y >= -2 && y <= 102;

      dom.spread.style.setProperty('--lx', `${clamp(x, 0, 100).toFixed(2)}%`);
      dom.spread.style.setProperty('--ly', `${clamp(y, 0, 100).toFixed(2)}%`);
      dom.spread.classList.toggle('is-pointer-active', inside);
    };

    window.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!rafId) rafId = window.requestAnimationFrame(update);
    }, { passive: true });

    dom.bookViewport.addEventListener('pointerleave', () => {
      dom.spread.classList.remove('is-pointer-active');
    });
  }

  /* ---------- Chapter marker ---------- */

  function showChapterGhost(name) {
    if (!dom.chapterGhost || !name) return;

    const match = name.match(/^([^（(]+)[（(]([^）)]+)[）)]$/);
    const code = (match ? match[1] : name).trim();
    const label = match ? match[2].trim() : '';

    dom.chapterGhostCode.textContent = code;
    dom.chapterGhostName.textContent = label;
    dom.chapterGhost.classList.remove('is-visible');
    void dom.chapterGhost.offsetWidth;
    dom.chapterGhost.classList.add('is-visible');

    window.clearTimeout(chapterGhostTimer);
    chapterGhostTimer = window.setTimeout(() => {
      dom.chapterGhost.classList.remove('is-visible');
    }, 1250);
  }

  function maybeShowChapterGhost(target, previous) {
    if (!previous || !target) return;

    const firstNew = viewPages(target)[0];
    const firstOld = viewPages(previous)[0];
    if (firstNew == null || firstOld == null) return;

    const seriesName = tocSeriesForPage(firstNew);
    if (!seriesName || seriesName === tocSeriesForPage(firstOld)) return;

    const series = TOC.find((item) => item.name === seriesName);
    const page = PAGES[firstNew];
    if (!series || !page || Number(page.label) !== series.start) return;

    showChapterGhost(seriesName);
  }

  /* ---------- Search / Share / Help / PDF ---------- */

  function isMobileUX() {
    return IS_COARSE || window.matchMedia('(max-width: 700px)').matches;
  }

  function openModal(modal, focusTarget) {
    if (!modal) return;
    modalLastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (focusTarget) {
      window.setTimeout(() => {
        try { focusTarget.focus({ preventScroll: true }); } catch (error) { /* ignore */ }
      }, 60);
    }
  }

  function closeModal(modal, restoreFocus = true) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (restoreFocus && modalLastFocus && typeof modalLastFocus.focus === 'function') {
      try { modalLastFocus.focus({ preventScroll: true }); } catch (error) { /* ignore */ }
    }
  }

  function normalizeSearch(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\s\-—–_/（）()·,，.。:：]+/g, '');
  }

  function buildSearchIndex() {
    const items = [];

    TOC.forEach((item) => {
      const pageIndex = clamp(Number(item.start) + 2, 0, TOTAL - 1);
      const sub = item.start === item.end
        ? `印刷页 ${item.start}`
        : `印刷页 ${item.start}–${item.end}`;
      items.push({
        kind: '系列',
        title: item.name,
        sub,
        pageIndex,
        code: normalizeSearch(String(item.name).split(/[（(]/)[0]),
        hay: normalizeSearch(`${item.name} ${item.start} ${item.end} ${pageLabel(pageIndex)}`)
      });
    });

    PAGES.forEach((page, index) => {
      const hasPrinted = Number.isFinite(Number(page.label));
      if (!hasPrinted) {
        items.push({
          kind: '页面',
          title: page.title,
          sub: `第 ${page.n} 页`,
          pageIndex: index,
          hay: normalizeSearch(`${page.title} ${page.label} ${page.n}`)
        });
        return;
      }

      items.push({
        kind: '页面',
        title: `产品 ${page.label}`,
        sub: tocSeriesForPage(index) || page.title,
        pageIndex: index,
        hay: normalizeSearch(`${page.label} ${page.title} ${tocSeriesForPage(index)} ${page.n}`)
      });
    });

    return items;
  }

  function getSearchResults(query) {
    const q = normalizeSearch(query);
    if (!q) return [];

    return searchItems
      .map((item) => {
        const index = item.hay.indexOf(q);
        let score = 0;
        if (index === 0) score = 3;
        else if (index > 0) score = 2;
        else if (item.hay.includes(q)) score = 1;
        if (item.kind === '系列') score += 0.2;
        if (item.code === q) score += 2;
        else if (item.code && item.code.startsWith(q)) score += 0.8;
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => entry.item);
  }

  function renderSearchResults(query) {
    const results = getSearchResults(query);
    dom.searchResults.replaceChildren();
    searchActive = results.length ? 0 : -1;
    dom.searchEmpty.hidden = results.length > 0 || !normalizeSearch(query);

    results.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `search-result${index === searchActive ? ' is-active' : ''}`;
      button.dataset.index = String(index);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', index === searchActive ? 'true' : 'false');

      const type = document.createElement('span');
      type.className = 'search-result__type';
      type.textContent = item.kind;

      const text = document.createElement('span');
      const title = document.createElement('span');
      title.className = 'search-result__title';
      title.textContent = item.title;
      const sub = document.createElement('span');
      sub.className = 'search-result__sub';
      sub.textContent = item.sub;
      text.append(title, sub);

      const page = document.createElement('span');
      page.className = 'search-result__page';
      page.textContent = `第 ${PAGES[item.pageIndex] ? PAGES[item.pageIndex].n : item.pageIndex + 1} 页`;

      button.append(type, text, page);
      dom.searchResults.appendChild(button);
    });

    dom.searchResults.dataset.results = JSON.stringify(results.map((item) => ({
      title: item.title,
      pageIndex: item.pageIndex
    })));
    dom.searchResults.scrollTop = 0;
  }

  function setSearchActive(index) {
    const buttons = $$('.search-result', dom.searchResults);
    if (!buttons.length) return;
    searchActive = (index + buttons.length) % buttons.length;
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === searchActive;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) button.scrollIntoView({ block: 'nearest' });
    });
  }

  function chooseSearchResult(index) {
    const buttons = $$('.search-result', dom.searchResults);
    const button = buttons[index];
    if (!button) return;
    const data = JSON.parse(dom.searchResults.dataset.results || '[]');
    const item = data[Number(button.dataset.index)];
    if (!item) return;

    closeSearch(false);
    goToPage(item.pageIndex);
  }

  function openSearch() {
    if (!ready || searchOpen) return;
    if (drawerOpen) closeDrawer(false);
    window.scrollTo(0, 0);
    searchOpen = true;
    if (!searchItems.length) searchItems = buildSearchIndex();
    dom.searchInput.value = '';
    renderSearchResults('');
    openModal(dom.searchModal, dom.searchInput);
  }

  function closeSearch(restoreFocus = true) {
    if (!searchOpen) return;
    searchOpen = false;
    if (!restoreFocus && document.activeElement && dom.searchModal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    closeModal(dom.searchModal, restoreFocus);
    window.scrollTo(0, 0);
  }

  function openShare() {
    if (!ready || shareOpen) return;
    if (drawerOpen) closeDrawer(false);
    shareOpen = true;
    dom.shareUrl.value = PUBLIC_URL;
    dom.nativeShare.hidden = typeof navigator.share !== 'function';
    openModal(dom.shareModal, dom.copyShare);
  }

  function closeShare(restoreFocus = true) {
    if (!shareOpen) return;
    shareOpen = false;
    closeModal(dom.shareModal, restoreFocus);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (copyError) { ok = false; }
      helper.remove();
      return ok;
    }
  }

  async function copyShareLink() {
    const ok = await copyText(PUBLIC_URL);
    showToast(ok ? '图册网址已复制' : '复制失败，请手动选择网址');
  }

  async function copyContactValue(key, button) {
    const info = CONTACT_INFO[key];
    if (!info) return;
    const ok = await copyText(info.copy);
    showToast(ok ? `${info.label}已复制` : '复制失败，请手动选择内容');
    if (ok && button) {
      const original = button.textContent;
      button.textContent = '已复制';
      window.setTimeout(() => {
        if (button.isConnected) button.textContent = original;
      }, 1200);
    }
  }

  function openContactModal() {
    if (!ready || contactOpen) return;
    if (drawerOpen) closeDrawer(false);
    contactOpen = true;
    openModal(dom.contactModal, dom.contactClose);
  }

  function closeContactModal(restoreFocus = true) {
    if (!contactOpen) return;
    contactOpen = false;
    closeModal(dom.contactModal, restoreFocus);
  }

  function bindContactEvents() {
    dom.contactHighlightHit.addEventListener('click', openContactModal);
    dom.contactClose.addEventListener('click', () => closeContactModal());
    dom.contactModal.addEventListener('click', (event) => {
      if (event.target === dom.contactModal) closeContactModal();
    });
    dom.contactModal.addEventListener('keydown', (event) => trapFocus(event, dom.contactModal));
    $$('[data-copy-contact]', dom.contactModal).forEach((button) => {
      button.addEventListener('click', () => {
        copyContactValue(button.dataset.copyContact, button);
      });
    });
  }

  function buildHelpList() {
    const mobile = isMobileUX();
    dom.helpMode.textContent = mobile ? '手机版操作' : '电脑版操作';
    const rows = mobile
      ? [
          ['左右拖动', '上一页 / 下一页'],
          ['双击页面', '放大当前页'],
          ['双指缩放', '放大后拖动查看'],
          ['底部页码 / 目录', '快速跳转系列或页面'],
          ['右上角放大镜', '搜索型号 / 系列'],
          ['右上角分享', '分享整本图册'],
          ['右上角 ?', '随时打开本提示']
        ]
      : [
          ['← / → / 空格', '上一页 / 下一页'],
          ['Home / End', '回到封面 / 封底'],
          ['G', '打开目录'],
          ['/ 或 Ctrl+K', '搜索型号 / 系列'],
          ['Z', '查看当前页大图'],
          ['F', '进入 / 退出全屏'],
          ['Esc', '关闭弹窗 / 目录'],
          ['鼠标拖动页角', '手动翻页；双击页面放大']
        ];

    dom.helpList.replaceChildren();
    rows.forEach(([key, text]) => {
      const row = document.createElement('div');
      row.className = 'help-row';
      const keyNode = document.createElement('span');
      keyNode.className = 'help-key';
      keyNode.textContent = key;
      const textNode = document.createElement('span');
      textNode.textContent = text;
      row.append(keyNode, textNode);
      dom.helpList.appendChild(row);
    });
  }

  function openHelp() {
    if (!ready || helpOpen) return;
    if (drawerOpen) closeDrawer(false);
    helpOpen = true;
    buildHelpList();
    openModal(dom.helpModal, dom.helpClose);
  }

  function closeHelp(restoreFocus = true) {
    if (!helpOpen) return;
    helpOpen = false;
    closeModal(dom.helpModal, restoreFocus);
  }

  function createPdfWatermark(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = .085;
    ctx.fillStyle = '#0b4f93';
    ctx.font = `600 ${Math.round(width * .052)}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.fillText('千寻电气 · 产品图册', 0, -height * .07);
    ctx.globalAlpha = .065;
    ctx.fillStyle = '#1b6ed4';
    ctx.font = `500 ${Math.round(width * .021)}px "Segoe UI", Arial, sans-serif`;
    ctx.fillText('QIANXUN ELECTRICAL · PRODUCT CATALOGUE', 0, height * .075);
    ctx.restore();
    return canvas.toDataURL('image/png');
  }

  function loadPdfPageImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`无法加载 ${src}`));
      image.src = src;
    });
  }

  function updatePdfProgress(index, total, status) {
    dom.pdfStatus.textContent = status;
    dom.pdfBar.style.width = `${Math.round((index / total) * 100)}%`;
  }

  async function generatePdf(token) {
    const JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF) {
      dom.pdfStatus.textContent = 'PDF 组件加载失败，请刷新页面后重试。';
      return;
    }

    let doc = null;
    let watermark = null;

    try {
      for (let index = 0; index < TOTAL; index++) {
        if (!pdfOpen || token !== pdfJobToken) return;

        updatePdfProgress(index, TOTAL, `正在处理第 ${index + 1} / ${TOTAL} 页…`);
        const image = await loadPdfPageImage(PAGES[index].page);
        if (!pdfOpen || token !== pdfJobToken) return;

        const width = image.naturalWidth;
        const height = image.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('无法创建画布');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        const jpeg = canvas.toDataURL('image/jpeg', .84);

        if (!doc) {
          const orientation = width > height ? 'landscape' : 'portrait';
          doc = new JsPDF({
            orientation,
            unit: 'px',
            format: [width, height],
            compress: true,
            hotfixes: ['px_scaling']
          });
          watermark = createPdfWatermark(width, height);
        } else {
          doc.addPage([width, height], width > height ? 'landscape' : 'portrait');
        }

        doc.addImage(jpeg, 'JPEG', 0, 0, width, height, undefined, 'FAST');
        if (watermark) {
          doc.addImage(watermark, 'PNG', 0, 0, width, height, undefined, 'FAST');
        }

        if (index % 2 === 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }

      if (!pdfOpen || token !== pdfJobToken) return;
      updatePdfProgress(TOTAL, TOTAL, '正在保存 PDF…');
      await new Promise((resolve) => window.setTimeout(resolve, 30));
      doc.save('千寻电气产品图册.pdf');
      dom.pdfStatus.textContent = `已生成 ${TOTAL} 页 PDF，下载已开始。`;
      showToast('PDF 已生成，正在下载');
    } catch (error) {
      dom.pdfStatus.textContent = `生成失败：${error.message || '请刷新页面重试。'}`;
    }
  }

  function triggerPdfDownload(href, filename, revoke = false) {
    const link = document.createElement('a');
    link.href = href;
    if (filename) link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (revoke) {
      window.setTimeout(() => URL.revokeObjectURL(href), 60000);
    }
  }

  function openPdfExport() {
    if (!ready) return;
    if (drawerOpen) closeDrawer(false);
    triggerPdfDownload('assets/qianxun-catalog.pdf', '千寻电气产品图册.pdf');
    showToast('PDF 正在下载');
  }

  function closePdfExport(restoreFocus = true) {
    if (!pdfOpen) return;
    pdfOpen = false;
    pdfJobToken++;
    closeModal(dom.pdfModal, restoreFocus);
  }

  function bindFeatureEvents() {
    dom.searchBtn.addEventListener('click', openSearch);
    dom.searchClose.addEventListener('click', () => closeSearch());
    dom.searchModal.addEventListener('click', (event) => {
      if (event.target === dom.searchModal) closeSearch();
    });
    dom.searchInput.addEventListener('input', () => renderSearchResults(dom.searchInput.value));
    dom.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSearchActive(searchActive + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSearchActive(searchActive - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        chooseSearchResult(searchActive);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
      }
    });
    dom.searchResults.addEventListener('click', (event) => {
      const result = event.target.closest('.search-result');
      if (result) chooseSearchResult(Number(result.dataset.index));
    });
    dom.searchModal.addEventListener('keydown', (event) => trapFocus(event, dom.searchModal));

    dom.shareBtn.addEventListener('click', openShare);
    dom.shareClose.addEventListener('click', () => closeShare());
    dom.shareModal.addEventListener('click', (event) => {
      if (event.target === dom.shareModal) closeShare();
    });
    dom.copyShare.addEventListener('click', copyShareLink);
    dom.nativeShare.addEventListener('click', async () => {
      if (typeof navigator.share !== 'function') return;
      try {
        await navigator.share({
          title: '千寻电气产品图册',
          text: '千寻电气产品图册',
          url: PUBLIC_URL
        });
      } catch (error) {
        /* user cancelled */
      }
    });
    dom.shareModal.addEventListener('keydown', (event) => trapFocus(event, dom.shareModal));

    dom.helpBtn.addEventListener('click', openHelp);
    dom.helpClose.addEventListener('click', () => closeHelp());
    dom.hint.addEventListener('click', openHelp);
    dom.helpModal.addEventListener('click', (event) => {
      if (event.target === dom.helpModal) closeHelp();
    });
    dom.helpModal.addEventListener('keydown', (event) => trapFocus(event, dom.helpModal));

    dom.pdfBtn.addEventListener('click', openPdfExport);
    dom.pdfBtnDrawer.addEventListener('click', openPdfExport);
    dom.pdfClose.addEventListener('click', () => closePdfExport());
    dom.pdfCancel.addEventListener('click', () => closePdfExport());
    dom.pdfModal.addEventListener('click', (event) => {
      if (event.target === dom.pdfModal) closePdfExport();
    });
    dom.pdfModal.addEventListener('keydown', (event) => trapFocus(event, dom.pdfModal));
    bindContactEvents();
  }


  function bindEvents() {
    dom.prevBtn.addEventListener('click', () => navigate(-1));
    dom.prevPage.addEventListener('click', () => navigate(-1));
    dom.nextBtn.addEventListener('click', () => navigate(1));
    dom.nextPage.addEventListener('click', () => navigate(1));
    dom.firstBtn.addEventListener('click', () => goToPage(0));
    dom.lastBtn.addEventListener('click', () => goToPage(TOTAL - 1));

    dom.brandHome.addEventListener('click', (event) => {
      event.preventDefault();
      goToPage(0);
    });

    dom.tocBtn.addEventListener('click', openDrawer);
    dom.pageStatus.addEventListener('click', openDrawer);
    dom.drawerClose.addEventListener('click', () => closeDrawer());
    dom.drawerBackdrop.addEventListener('click', () => closeDrawer());
    dom.tocTabDirectory.addEventListener('click', () => switchTocView('directory'));
    dom.tocTabThumbs.addEventListener('click', () => switchTocView('thumbs'));
    [dom.tocTabDirectory, dom.tocTabThumbs].forEach((tab) => {
      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const next = tocView === 'directory' ? 'thumbs' : 'directory';
        switchTocView(next);
        (next === 'directory' ? dom.tocTabDirectory : dom.tocTabThumbs).focus();
      });
    });

    dom.zoomBtn.addEventListener('click', () => openZoom(activePage()));
    dom.zoomClose.addEventListener('click', closeZoom);
    dom.zoomIn.addEventListener('click', () => zoomBy(1.45));
    dom.zoomOut.addEventListener('click', () => zoomBy(1 / 1.45));
    dom.zoomFit.addEventListener('click', resetZoom);

    dom.zoomModal.addEventListener('click', (event) => {
      if (event.target === dom.zoomModal) closeZoom();
    });

    dom.zoomStage.addEventListener('pointerdown', handleZoomPointerDown);
    dom.zoomStage.addEventListener('pointermove', handleZoomPointerMove);
    dom.zoomStage.addEventListener('pointerup', handleZoomPointerUp);
    dom.zoomStage.addEventListener('pointercancel', handleZoomPointerUp);
    dom.zoomStage.addEventListener('wheel', handleZoomWheel, { passive: false });
    dom.zoomImg.addEventListener('load', handleZoomImageLoad);
    dom.zoomStage.addEventListener('dblclick', (event) => {
      event.preventDefault();
      if (zoomState.scale > 1.2) resetZoom();
      else zoomAtPoint(2.35, event.clientX, event.clientY);
    });

    dom.soundBtn.addEventListener('click', toggleSound);
    dom.fullBtn.addEventListener('click', toggleFullscreen);

    dom.scrubber.addEventListener('input', () => {
      const value = Number(dom.scrubber.value);
      const seek = ((value - 1) / Math.max(1, TOTAL - 1)) * 100;
      dom.scrubber.style.setProperty('--seek', `${seek.toFixed(2)}%`);
    });

    dom.scrubber.addEventListener('change', () => {
      goToPage(Number(dom.scrubber.value) - 1);
    });

    dom.bookViewport.addEventListener('pointerdown', beginDrag);
    dom.bookViewport.addEventListener('pointermove', moveDrag);
    dom.bookViewport.addEventListener('pointerup', (event) => endDrag(event));
    dom.bookViewport.addEventListener('pointercancel', (event) => endDrag(event, true));
    dom.bookViewport.addEventListener('contextmenu', (event) => event.preventDefault());

    dom.bookViewport.addEventListener('dblclick', (event) => {
      event.preventDefault();
      openZoom(pageIndexFromPoint(event.clientX, event.clientY));
    });

    window.addEventListener('resize', scheduleRelayout, { passive: true });
    window.addEventListener('orientationchange', () => {
      window.setTimeout(scheduleRelayout, 260);
    });

    document.addEventListener('fullscreenchange', () => {
      updateFullscreenUI();
      window.setTimeout(relayout, 220);
    });

    dom.drawer.addEventListener('keydown', (event) => trapFocus(event, dom.drawer));
    dom.zoomModal.addEventListener('keydown', (event) => trapFocus(event, dom.zoomModal));

    document.addEventListener('keydown', onKeyDown);
  }

  function onKeyDown(event) {
    if (event.defaultPrevented) return;

    if (searchOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
      }
      return;
    }

    if (shareOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeShare();
      }
      return;
    }

    if (helpOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHelp();
      }
      return;
    }

    if (contactOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeContactModal();
      }
      return;
    }

    if (pdfOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePdfExport();
      }
      return;
    }

    if (zoomState.open) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeZoom();
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomBy(1.35);
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomBy(1 / 1.35);
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        resetZoom();
        return;
      }
      return;
    }

    if (drawerOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
      }
      return;
    }

    const target = event.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ((event.key === ' ' || event.key === 'Enter') && (tag === 'button' || tag === 'a')) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === '/') {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.key === '?') {
      event.preventDefault();
      openHelp();
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        event.preventDefault();
        navigate(1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        navigate(-1);
        break;
      case 'Home':
        event.preventDefault();
        goToPage(0);
        break;
      case 'End':
        event.preventDefault();
        goToPage(TOTAL - 1);
        break;
      case 'g':
      case 'G':
        event.preventDefault();
        openDrawer();
        break;
      case 'z':
      case 'Z':
        event.preventDefault();
        openZoom(activePage());
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
      case 'Escape':
        if (document.fullscreenElement) return;
        break;
      default:
        break;
    }
  }

  /* ---------- Init ---------- */

  function setupFullscreenVisibility() {
    if (!canFullscreen) {
      dom.fullBtn.style.display = 'none';
    }
    updateFullscreenUI();
  }

  function finishIntroIfReady() {
    if (!introElapsed || !ready || introFinished) return;
    introFinished = true;

    document.body.classList.remove('is-intro');
    dom.app.classList.remove('is-intro');
    if (dom.loading) dom.loading.classList.add('is-done');
    if (dom.intro) dom.intro.classList.add('is-out');

    window.setTimeout(() => {
      if (dom.intro) dom.intro.hidden = true;
    }, 820);
  }

  async function init() {
    if (!measure()) {
      window.setTimeout(init, 80);
      return;
    }

    mode = detectMode();
    if (mode === 'single') {
      singleIndex = 0;
    } else {
      spreadIndex = 0;
    }

    measure();
    renderStatic(currentView());
    applyRestLayout();
    updateUI();
    buildDirectory();
    buildThumbs();
    updateThumbCurrent();
    bindEvents();
    bindFeatureEvents();
    searchItems = buildSearchIndex();
    initStarfield();
    initButtonEffects();
    initPageLightEffects();
    loadSoundPreference();
    setupFullscreenVisibility();

    const firstTarget = targetView(1);
    const bootPages = new Set(viewPages(currentView()));
    if (firstTarget) viewPages(firstTarget).forEach((index) => bootPages.add(index));

    await Promise.race([
      Promise.all(Array.from(bootPages).map(loadPage)),
      delay(1800)
    ]);
    await Promise.race([
      Promise.all(Array.from(bootPages).map(decodePage)),
      delay(240)
    ]);

    ready = true;
    dom.app.classList.add('is-ready');
    finishIntroIfReady();

    window.setTimeout(() => {
      dom.loading.classList.add('is-done');
    }, 180);

    preloadAround();
    if (!IS_PREVIEW_FRAME) queuePageCacheWarmup();
    window.setTimeout(showHint, 1150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.requestAnimationFrame(init);
    });
  } else {
    window.requestAnimationFrame(init);
  }
})();
