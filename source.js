(() => {
  'use strict';

  const documents = [
    {
      part: 1, title: 'Ограничения, процедуры и характеристики', pages: 1484, size: 14176395,
      datedLeaves: [[3, 'L.10.1', '15 марта 2018'], [4, 'L.10.2', '15 декабря 2021']],
      hash: '2ac56361adf1afb42981caaa8ddfa854fe51001a08c4423d2a431fc8ee089b9b',
      chapters: [
        ['Ограничения', 3, 'limits'], ['Нормальные процедуры', 15, 'normal'],
        ['Дополнительные процедуры', 91, 'extra'],
        ['Предполётные характеристики', 225, 'performance'], ['Характеристики в полёте', 539, 'performance']
      ]
    },
    {
      part: 2, title: 'Описание систем самолёта', pages: 1400, size: 29084320,
      datedLeaves: [[3, '1.TOC.1', '15 декабря 2021'], [21, '1.20.11', '18 июня 2020']],
      hash: '2a7559bbbef32c2ab233cecc5fece92f38180e225fa0a5538d373f5c755dbe1f',
      chapters: [
        ['Самолёт, аварийное оборудование, двери и окна', 3], ['Воздушные системы', 135],
        ['Защита от обледенения и дождя', 167], ['Автоматическое управление полётом', 189],
        ['Связь', 261], ['Электросистема', 301], ['Двигатели и ВСУ', 343],
        ['Противопожарная защита', 411], ['Система управления самолётом', 431],
        ['Пилотажные приборы и индикаторы', 475], ['Управление полётом и навигация', 815],
        ['Топливо', 1289], ['Гидросистемы', 1309], ['Шасси', 1327],
        ['Системы предупреждающей сигнализации', 1347]
      ]
    }
  ];

  const boeingManuals = 'https://services.boeing.com/training-solutions/flight-training/licensed-manuals';
  const faaCatalog = 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentid/1030486';
  const faaOriginal = 'https://www.faa.gov/documentlibrary/media/advisory_circular/ac_120-71b.pdf';
  const faaFile = 'docs/faa-ac-120-71b.pdf';
  let faaLocalUrl;
  const attached = new Map();
  const notices = new Map();
  let connection;
  let restoring;
  let onChange = () => {};
  let batchStatus = '';
  const icon = (name, size = 18) => window.Flight.icon(name, size);
  const esc = value => window.Flight.escape(String(value));
  const entry = part => documents.find(doc => doc.part === Number(part));

  function bundled(part) {
    if (globalThis.location?.protocol !== 'file:') return null;
    const path = window.FlightdeckLocalVolumes?.[part];
    return path === 'docs/fcom-ru-' + part + '.pdf' ? {url: path, bundled: true} : null;
  }

  function sourceFor(part) {
    return bundled(part) || attached.get(part);
  }

  function database() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('flightdeck-fcom-sources', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('documents');
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('database blocked'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = undefined; };
        resolve(db);
      };
    });
    connection.catch(() => { connection = undefined; });
    return connection;
  }

  async function access(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', mode);
      const request = operation(tx.objectStore('documents'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
    });
  }

  function attach(part, file, persistent) {
    const existing = attached.get(part);
    if (existing) URL.revokeObjectURL(existing.url);
    const pdf = file.type === 'application/pdf' ? file : new Blob([file], {type: 'application/pdf'});
    attached.set(part, {url: URL.createObjectURL(pdf), persistent});
  }

  function init(onReady) {
    if (typeof onReady === 'function') onChange = onReady;
    if (restoring) return restoring;
    restoring = Promise.all(documents.map(async doc => {
      if (bundled(doc.part)) return false;
      try {
        const item = await access('readonly', store => store.get(doc.part));
        if (item?.hash === doc.hash && item.file instanceof Blob && item.file.size === doc.size && !attached.has(doc.part)) {
          attach(doc.part, item.file, true);
          return true;
        }
      } catch { /* Files can still be paired for the current visit. */ }
      return false;
    })).then(restored => { if (restored.some(Boolean)) onChange(); });
    return restoring;
  }

  function pageUrl(part, page) {
    const doc = entry(part);
    const number = Number(page);
    if (!doc || !Number.isInteger(number) || number < 1 || number > doc.pages) return null;
    const source = sourceFor(doc.part);
    return source ? source.url + '#page=' + number : null;
  }

  function firstPage(range) {
    return Number(String(range || '1').match(/\d+/)?.[0] || 1);
  }

  function url(lesson) {
    return pageUrl(lesson.volume || lesson.part || (lesson.group === 'systems' ? 2 : 1), firstPage(lesson.pages));
  }

  function pageLink(part, page, label) {
    const doc = entry(part);
    const number = Number(page);
    const caption = label || ('Открыть страницу ' + number);
    if (!doc || !Number.isInteger(number) || number < 1 || number > doc.pages) return esc(caption);
    const href = pageUrl(doc.part, number);
    const title = 'Том ' + doc.part + ', страница ' + number;
    return href
      ? `<a class="src-range" href="${esc(href)}" target="_blank" rel="noopener" title="${title} · PDF в новой вкладке">${esc(caption)}</a>`
      : `<a class="src-range" href="#reference/${doc.part}/${number}" title="${title} · выбрать PDF">${esc(caption)}</a>`;
  }

  function link(lesson) {
    const part = Number(lesson.volume || lesson.part || (lesson.group === 'systems' ? 2 : 1));
    const ranges = String(lesson.pages || 1).split(/[,;]/).map(value => value.trim()).filter(Boolean);
    const anchors = ranges.map(range => pageLink(part, firstPage(range), 'с. ' + range));
    return `<span class="src-citation"><span>${icon('book-open', 16)} FCOM · том ${part}</span>${anchors.join(' ')}</span>`;
  }

  function chapters(doc) {
    const rows = doc.chapters.map(([title, page, group]) => {
      const titleLabel = group ? `<a href="#theory/${group}">${esc(title)}</a>` : esc(title);
      return `<li><span>${titleLabel}</span>${pageLink(doc.part, page, 'с. ' + page)}</li>`;
    });
    const leaves = doc.datedLeaves.map(([page, sheet, date]) => pageLink(doc.part, page, sheet + ' · ' + date)).join(', ');
    return `<details class="src-chapters"><summary>Содержание и данные издания<span aria-hidden="true">⌄</span></summary>
      <ol>${rows.join('')}</ol><p class="src-imprint">Обозначение D6-27370-8AS-UTR. Примеры дат на листах руководства — ${leaves}.</p></details>`;
  }

  function volumeCard(doc) {
    const source = sourceFor(doc.part);
    const state = source?.bundled ? 'PDF входит в ваш комплект'
      : source ? (source.persistent ? 'Подключён в этом браузере' : 'Подключён до закрытия вкладки') : 'Для чтения понадобится ваш PDF';
    const disconnect = source && !source.bundled ? `<button class="src-remove" type="button" data-src-remove="${doc.part}">Отключить</button>` : '';
    const action = source
      ? `<a class="btn btn-secondary" href="${esc(pageUrl(doc.part, 1))}" target="_blank" rel="noopener">${icon('book-open', 16)} Открыть том</a>
        ${disconnect}`
      : `<button class="btn btn-secondary" type="button" data-src-select="${doc.part}">${icon('book', 16)} Выбрать PDF тома ${doc.part}</button>`;
    const currentNotice = notices.get(doc.part) || '';
    const description = doc.part === 1 ? 'Части 01–04. Ограничения, нормальные и дополнительные процедуры, предполётные и полётные характеристики.'
      : 'Части 05–08. Главы 1–15 об устройстве самолёта, индикации и работе его систем.';
    return `<article class="src-card" aria-labelledby="src-title-${doc.part}">
      <header><span class="src-volume">FCOM · Том ${doc.part}</span><span class="src-pages">${doc.pages.toLocaleString('ru-RU')} стр.</span></header>
      <h2 id="src-title-${doc.part}">${esc(doc.title)}</h2>
      <p class="src-caption">${description}</p>
      <p class="src-status ${source ? 'src-ready' : ''}">${source ? icon('check', 16) : ''} ${state}</p>
      <div class="src-actions">${action}</div>
      <input hidden type="file" accept="application/pdf,.pdf" data-src-file="${doc.part}" aria-label="Выбрать PDF, том ${doc.part}">
      <p class="src-notice" role="status" data-src-notice="${doc.part}">${esc(currentNotice)}</p>
      ${chapters(doc)}
      </article>`;
  }

  function requestedPage() {
    const match = /^#reference\/([12])\/(\d+)$/.exec(globalThis.location?.hash || '');
    if (!match) return '';
    const doc = entry(match[1]);
    const page = Number(match[2]);
    if (page < 1 || page > doc.pages) return '';
    const href = pageUrl(doc.part, page);
    const action = href
      ? `<a class="btn btn-primary" href="${esc(href)}" target="_blank" rel="noopener">${icon('book-open', 16)} Открыть страницу ${page}</a>`
      : `<button type="button" class="btn btn-primary" data-src-select="${doc.part}">${icon('book', 16)} Выбрать PDF тома ${doc.part}</button>`;
    return `<section class="src-request" aria-label="Запрошенная страница">
      <div><h2>Том ${doc.part} · страница ${page}</h2>
      <p>${href ? 'Том подключён. Откройте нужное место в новой вкладке.' : 'Выберите файл этого тома. Здесь появится ссылка на нужную страницу.'}</p>
      <p class="src-notice" role="status" data-src-target-notice="${doc.part}">${esc(notices.get(doc.part) || '')}</p></div>${action}
      </section>`;
  }

  function faaUrl() {
    if (faaLocalUrl) return faaLocalUrl;
    const asset = window.flightdeckAsset?.(faaFile) || faaFile;
    if (!asset.startsWith('data:')) return asset;
    const data = atob(asset.slice(asset.indexOf(',') + 1));
    const bytes = Uint8Array.from(data, char => char.charCodeAt(0));
    faaLocalUrl = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}));
    return faaLocalUrl;
  }

  function render() {
    const isLocalKit = documents.every(doc => bundled(doc.part));
    const intro = isLocalKit
      ? 'Оба тома входят в комплект. В уроках и атласе нажмите на номер страницы, чтобы открыть её в PDF.'
      : 'Уроки и атлас ссылаются на страницы двух русских томов FCOM. Выберите PDF на своём устройстве один раз, чтобы из темы сразу переходить к нужной странице.';
    const batch = documents.every(doc => sourceFor(doc.part)) ? '' : `<div class="src-drop" data-src-drop>
      <span><strong>Подключить файлы курса</strong><small>Перетащите сюда один или оба тома.</small></span>
      <button type="button" class="btn btn-secondary" data-src-batch>Выбрать PDF</button>
      <input hidden type="file" multiple accept="application/pdf,.pdf" data-src-files aria-label="Выбрать один или оба тома">
      </div>`;
    return `<section class="src-view" aria-labelledby="src-heading">
      <div class="page-heading"><h1 id="src-heading">Документы и источники</h1>
      <p>${intro}</p></div>
      ${requestedPage()}
      ${batch}<p class="src-batch-status" role="status" data-src-batch-status>${esc(batchStatus)}</p>
      <div class="src-books">${documents.map(volumeCard).join('')}</div>
      <div class="src-publications">
        <section class="src-edition"><div class="src-edition-icon">${icon('book-open', 21)}</div>
          <div><h2>Руководство Boeing</h2><p><strong>737 Flight Crew Operations Manual · D6-27370-8AS-UTR.</strong> Это обозначение на титульных страницах обоих томов. Перевод выполнен с помощью ИИ. На титуле указан приоритет английского оригинала. Даты в выходных данных относятся к отдельным листам. Ссылки в курсе ведут на порядковые страницы русского PDF.</p>
          <p>Англоязычный FCOM распространяется Boeing по лицензии. Для полётов применяется действующая документация эксплуатанта. ${isLocalKit ? 'В вашем комплекте оба PDF доступны без интернета.' : 'Выбранные здесь файлы хранятся в вашем браузере.'}</p>
          <div class="src-doc-links"><a href="${boeingManuals}" target="_blank" rel="noopener">Доступ к FCOM у Boeing ${icon('corner', 12)}</a>
          <a href="https://services.boeing.com/operations/myboeingfleet-portal" target="_blank" rel="noopener">MyBoeingFleet для эксплуатантов ${icon('corner', 12)}</a></div></div></section>
        <section class="src-edition"><div class="src-edition-icon">${icon('book', 21)}</div>
          <div><h2>Процедуры и взаимодействие экипажа</h2><p><strong>FAA AC 120-71B.</strong> Циркуляр FAA о стандартных процедурах и обязанностях пилота, контролирующего полёт. Дополнительный материал к курсу. На английском языке, 10 января 2017 года, 34 страницы.</p>
          <div class="src-doc-links"><a class="btn btn-secondary" href="${esc(faaUrl())}" target="_blank" rel="noopener">${icon('book-open', 16)} Открыть PDF</a>
          <a href="${faaCatalog}" target="_blank" rel="noopener">Карточка FAA ${icon('corner', 12)}</a><a href="${faaOriginal}" target="_blank" rel="noopener">PDF на faa.gov ${icon('corner', 12)}</a></div></div></section>
      </div>
      <details class="src-credits"><summary>Фотографии кабины</summary>
        <p>Передняя панель Boeing 737-800, борт VT-JBE авиакомпании Jet Airways. Фото Kurush Pawar. <a href="https://commons.wikimedia.org/wiki/File:VT-JBE_%288050804061%29.jpg" target="_blank" rel="noopener">Оригинал ${icon('corner', 12)}</a></p>
        <p>Потолочная панель Boeing 737 NG в Домодедове. Фото Artem Katranzhi. <a href="https://commons.wikimedia.org/wiki/File:Domodedovo_IMG_2473_%288062172282%29.jpg" target="_blank" rel="noopener">Оригинал ${icon('corner', 12)}</a></p>
        <p>Оба снимка уменьшены и переведены в WebP. Разметка наложена в интерфейсе. Фотографии и адаптации распространяются по лицензии <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener">CC BY-SA 2.0</a>.</p></details>
      </section>`;
  }

  function message(part, value) {
    notices.set(part, value);
    const target = document.querySelector('[data-src-notice="' + part + '"]');
    if (target) target.textContent = value;
    const requested = document.querySelector('[data-src-target-notice="' + part + '"]');
    if (requested) requested.textContent = value;
  }

  function refreshView() {
    const view = document.querySelector('.src-view');
    if (!view) return;
    view.outerHTML = render();
    bind();
  }

  async function pair(part, file) {
    if (!file) return;
    const doc = entry(part);
    const other = documents.find(item => item.part !== part && item.size === file.size);
    if (file.size !== doc.size) {
      message(part, other ? `Размер совпадает с томом ${other.part}. Выберите его карточку либо другой файл.` : `Нужна исходная русская копия FCOM, том ${part}. Размер выбранного файла отличается.`);
      return;
    }
    message(part, 'Проверяем издание…');
    try {
      if (!globalThis.crypto?.subtle) {
        message(part, 'Чтобы браузер мог проверить PDF, откройте тренажёр по HTTPS или на localhost.');
        return;
      }
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
      const hex = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
      if (hex !== doc.hash) {
        message(part, `Содержимое отличается от исходного тома ${part}. Выберите PDF из комплекта этого курса.`);
        return;
      }
      let persistent = true;
      try { await access('readwrite', store => store.put({hash: doc.hash, file}, part)); }
      catch { persistent = false; }
      attach(part, file, persistent);
      notices.delete(part);
      refreshView();
      onChange();
      const target = document.querySelector('.src-request a.btn');
      if (target) target.focus?.({preventScroll: true});
      return true;
    } catch {
      message(part, 'Браузер не смог прочитать PDF. Выберите файл ещё раз.');
    }
  }

  async function remove(part) {
    const source = attached.get(part);
    if (!source) return;
    if (source.persistent) {
      try { await access('readwrite', store => store.delete(part)); }
      catch { message(part, 'Не удалось удалить локальную копию. Попробуйте ещё раз.'); return; }
    }
    URL.revokeObjectURL(source.url);
    attached.delete(part);
    notices.delete(part);
    setBatchStatus('');
    refreshView();
  }

  function setBatchStatus(value) {
    batchStatus = value;
    const status = document.querySelector('[data-src-batch-status]');
    if (status) status.textContent = value;
  }

  async function pairBatch(files) {
    if (!files.length) return;
    setBatchStatus('Проверяем выбранные PDF…');
    const selected = new Set();
    let hasUnknown = false;
    const result = [];
    for (const file of files) {
      const doc = documents.find(item => item.size === file.size);
      if (!doc) { hasUnknown = true; continue; }
      if (selected.has(doc.part)) continue;
      if (await pair(doc.part, file)) {
        selected.add(doc.part);
        result.push('Том ' + doc.part + ' подключён.');
      } else {
        result.push('Не удалось подключить том ' + doc.part + '. Проверьте сообщение в его карточке.');
      }
    }
    if (hasUnknown) result.push('Распознать все выбранные файлы не удалось. Выберите исходные PDF русского перевода.');
    setBatchStatus(result.join(' '));
  }

  function bind() {
    const view = document.querySelector('.src-view');
    if (!view || view.dataset.bound) return;
    view.dataset.bound = 'true';
    view.addEventListener('click', event => {
      const select = event.target.closest('[data-src-select]');
      const disconnect = event.target.closest('[data-src-remove]');
      if (event.target.closest('[data-src-batch]')) view.querySelector('[data-src-files]').click();
      if (select) view.querySelector('[data-src-file="' + select.dataset.srcSelect + '"]').click();
      if (disconnect) remove(Number(disconnect.dataset.srcRemove));
    });
    view.addEventListener('change', event => {
      const input = event.target;
      const field = input.closest('[data-src-file], [data-src-files]');
      if (!field) return;
      const files = Array.from(field.files || []);
      field.value = '';
      if (field.dataset.srcFile) {
        setBatchStatus('');
        pair(Number(field.dataset.srcFile), files[0]);
      } else {
        pairBatch(files);
      }
    });
    const drop = view.querySelector?.('[data-src-drop]');
    if (drop) {
      drop.addEventListener('dragover', event => {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        drop.classList.add('src-dragging');
      });
      drop.addEventListener('dragleave', event => {
        if (!drop.contains(event.relatedTarget)) drop.classList.remove('src-dragging');
      });
      drop.addEventListener('drop', event => {
        event.preventDefault();
        drop.classList.remove('src-dragging');
        pairBatch(Array.from(event.dataTransfer.files));
      });
    }
  }

  window.SourceDocs = {link, url, pageLink, pageUrl, render, bind, init};
})();
