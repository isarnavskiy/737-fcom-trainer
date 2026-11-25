(() => {
  'use strict';

  const documents = [
    {
      part: 1, title: 'Ограничения, процедуры и характеристики', pages: 1484, size: 14176395,
      hash: '2ac56361adf1afb42981caaa8ddfa854fe51001a08c4423d2a431fc8ee089b9b',
      chapters: [
        ['Ограничения', 3, 'limits'], ['Нормальные процедуры', 15, 'normal'],
        ['Дополнительные процедуры', 91, 'extra'],
        ['Предполётные характеристики', 225, 'performance'], ['Характеристики в полёте', 539, 'performance']
      ]
    },
    {
      part: 2, title: 'Описание систем самолёта', pages: 1400, size: 29084320,
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

  const attached = new Map();
  const notices = new Map();
  let connection;
  let restoring;
  let onChange = () => {};
  const icon = (name, size = 18) => window.Flight.icon(name, size);
  const esc = value => window.Flight.escape(String(value));
  const entry = part => documents.find(doc => doc.part === Number(part));

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

  function url(lesson) {
    const doc = entry(lesson.part || (lesson.group === 'systems' ? 2 : 1));
    const source = doc && attached.get(doc.part);
    const page = Number(String(lesson.pages || '1').match(/\d+/)?.[0] || 1);
    return source ? source.url + '#page=' + Math.max(1, Math.min(doc.pages, page)) : null;
  }

  function link(lesson) {
    const part = lesson.part || (lesson.group === 'systems' ? 2 : 1);
    const label = 'FCOM · том ' + part;
    if (!url(lesson)) {
      return `<a class="ll-ref" href="#reference">${icon('book-open', 16)} ${esc(label)} · с. ${esc(lesson.pages)} · Подключить PDF</a>`;
    }
    const ranges = String(lesson.pages).split(/[,;]/).map(value => value.trim()).filter(Boolean);
    const anchors = ranges.map(range => {
      const href = url({part, pages: range});
      const accessibleLabel = `Открыть том ${part}, с. ${range}, в новой вкладке`;
      return `<a class="src-range" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(accessibleLabel)}">с. ${esc(range)}</a>`;
    });
    return `<span class="src-citation"><span>${icon('book-open', 16)} ${esc(label)}</span>${anchors.join(' ')}</span>`;
  }

  function chapters(doc) {
    const rows = doc.chapters.map(([title, page, group]) => {
      const href = url({part: doc.part, pages: page});
      const pageLabel = href
        ? `<a class="src-page" href="${esc(href)}" target="_blank" rel="noopener" aria-label="Открыть PDF, страница ${page}">с. ${page}</a>`
        : `<span class="src-page">с. ${page}</span>`;
      const titleLabel = group ? `<a href="#theory/${group}">${esc(title)}</a>` : esc(title);
      return `<li><span>${titleLabel}</span>${pageLabel}</li>`;
    });
    return `<details class="src-chapters"><summary>Содержание тома<span aria-hidden="true">⌄</span></summary>
      <ol>${rows.join('')}</ol></details>`;
  }

  function volumeCard(doc) {
    const source = attached.get(doc.part);
    const state = source ? (source.persistent ? 'Подключён в этом браузере' : 'Подключён до закрытия вкладки') : 'PDF не выбран';
    const action = source
      ? `<a class="btn btn-secondary" href="${esc(source.url)}#page=1" target="_blank" rel="noopener">${icon('book-open', 16)} Открыть том</a>
        <button class="src-remove" type="button" data-src-remove="${doc.part}">Отключить</button>`
      : `<button class="btn btn-secondary" type="button" data-src-select="${doc.part}">${icon('book', 16)} Выбрать PDF</button>`;
    const currentNotice = notices.get(doc.part) || '';
    return `<article class="src-card" aria-labelledby="src-title-${doc.part}">
      <header><span class="src-volume">ТОМ 0${doc.part}</span><span class="src-pages">${doc.pages.toLocaleString('ru-RU')} страниц</span></header>
      <h2 id="src-title-${doc.part}">${esc(doc.title)}</h2>
      <p class="src-status ${source ? 'src-ready' : ''}">${source ? icon('check', 16) : ''} ${state}</p>
      <div class="src-actions">${action}</div>
      <input hidden type="file" accept="application/pdf,.pdf" data-src-file="${doc.part}" aria-label="Выбрать PDF, том ${doc.part}">
      <p class="src-notice" role="status" aria-live="polite" data-src-notice="${doc.part}">${esc(currentNotice)}</p>
      ${chapters(doc)}
      <a class="src-module" href="#theory/${doc.part === 1 ? 'limits' : 'systems'}">${doc.part === 1 ? 'К урокам по ограничениям' : 'К урокам по системам'}</a>
      </article>`;
  }

  function render() {
    return `<section class="src-view" aria-labelledby="src-heading">
      <div class="page-heading"><h1 id="src-heading">Справочник FCOM</h1>
      <p>Кабина и весь курс доступны сразу. Подключите свои PDF, если хотите открывать страницы руководства прямо из уроков. Файлы обрабатываются на вашем устройстве.</p></div>
      <div class="src-books">${documents.map(volumeCard).join('')}</div>
      <section class="src-edition"><div class="src-edition-icon">${icon('book-open', 21)}</div>
        <div><h2>Об издании</h2><p><b>737 Flight Crew Operations Manual</b> · D6-27370-8AS-UTR. Уроки ссылаются на порядковые страницы двух PDF русского перевода. Название файла можно менять.</p>
        <p>На титульных страницах указано, что перевод выполнен с помощью ИИ. Тренажёр предназначен для самостоятельного изучения. Для лётной работы используют актуальные утверждённые документы эксплуатанта.</p></div></section>
      <section class="src-edition"><div class="src-edition-icon">${icon('eye', 21)}</div>
        <div><h2>Фотографии кабины</h2>
        <p>Передняя панель Boeing 737-800, борт VT-JBE авиакомпании Jet Airways. Автор: Kurush Pawar. <a href="https://commons.wikimedia.org/wiki/File:VT-JBE_%288050804061%29.jpg" target="_blank" rel="noopener">VT-JBE</a></p>
        <p>Потолочная панель Boeing 737 NG в Домодедово. Автор: Artem Katranzhi. <a href="https://commons.wikimedia.org/wiki/File:Domodedovo_IMG_2473_%288062172282%29.jpg" target="_blank" rel="noopener">Domodedovo IMG 2473</a></p>
        <p>Оба снимка уменьшены и переведены в WebP. Разметка приборов наложена в интерфейсе. Фотографии и их адаптации доступны по лицензии <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener">CC BY-SA 2.0</a>.</p></div></section>
      </section>`;
  }

  function message(part, value) {
    notices.set(part, value);
    const target = document.querySelector('[data-src-notice="' + part + '"]');
    if (target) target.textContent = value;
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
    refreshView();
  }

  function bind() {
    const view = document.querySelector('.src-view');
    if (!view || view.dataset.bound) return;
    view.dataset.bound = 'true';
    view.addEventListener('click', event => {
      const select = event.target.closest('[data-src-select]');
      const disconnect = event.target.closest('[data-src-remove]');
      if (select) view.querySelector('[data-src-file="' + select.dataset.srcSelect + '"]').click();
      if (disconnect) remove(Number(disconnect.dataset.srcRemove));
    });
    view.addEventListener('change', event => {
      const input = event.target.closest('[data-src-file]');
      if (!input) return;
      const file = input.files[0];
      input.value = '';
      pair(Number(input.dataset.srcFile), file);
    });
  }

  window.SourceDocs = {link, url, render, bind, init};
})();
