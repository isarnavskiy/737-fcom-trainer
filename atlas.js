(() => {
  'use strict';

  const pageSize = 18;
  const searchStates = new Map();
  const kindLabels = {text: 'Текст', table: 'Таблица', figure: 'Иллюстрация', section: 'Раздел', scope: 'Справка'};
  const volumes = {
    1: {title: 'Ограничения, процедуры и характеристики', short: 'Процедуры и характеристики', icon: 'route'},
    2: {title: 'Системы самолёта', short: 'Системы самолёта', icon: 'panel'}
  };
  const synonyms = [
    ['всу', 'apu'], ['автопилот', 'автопилота', 'afds'], ['ткас', 'tcas', 'ткасс'],
    ['наддув', 'герметизац'], ['антиобледенени', 'противообледенительн', 'обледенен'],
    ['гидравлик', 'гидросистем'], ['электропитани', 'электросистем', 'электроснабжени'],
    ['впп', 'взлетно посадочн'], ['высотомер', 'альтиметр']
  ];
  let index;

  const e = value => window.Flight.escape(String(value ?? ''));
  const icon = (name, size = 18) => window.Flight.icon(name, size);
  const format = n => Number(n).toLocaleString('ru-RU');
  const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const title = t => t.title.replace(/^(\d{1,2})\s*[-–]\s*(?=[А-ЯЁ])/u, '$1. ');
  const topicHref = t => '#topic/' + encodeURIComponent(t.id);
  const link = (t, label) => '<a href="' + topicHref(t) + '">' + e(label || title(t)) + '</a>';
  const volumeHref = v => '#atlas/' + v;
  const volumeLabel = v => 'Том ' + v;
  const pageLabel = p => 'с. ' + p;
  const pageLink = (volume, page, label) => window.SourceDocs.pageLink(volume, page, label);
  const rangesFor = pages => String(pages || '').split(/[,;]/).map(range => range.match(/\d+/g)?.map(Number)).filter(Boolean);
  function plural(n, one, few, many) {
    const ten = n % 10, hundred = n % 100;
    return hundred >= 11 && hundred <= 14 ? many : ten === 1 ? one : ten >= 2 && ten <= 4 ? few : many;
  }
  const countItems = n => format(n) + ' ' + plural(n, 'пункт', 'пункта', 'пунктов');

  function getIndex() {
    const source = window.FcomIndex;
    if (!source?.topics?.length) return null;
    if (index?.source === source) return index;
    const byId = new Map(), children = new Map(), roots = new Map(), ancestors = new Map(), search = new Map();
    const counts = new Map();
    for (const t of source.topics) {
      byId.set(t.id, t);
      counts.set(t.volume, (counts.get(t.volume) || 0) + 1);
      const grouping = t.parent ? children : roots;
      const key = t.parent || t.volume;
      if (!grouping.has(key)) grouping.set(key, []);
      grouping.get(key).push(t);
      const parent = byId.get(t.parent);
      const path = parent ? [...ancestors.get(parent.id), parent] : [];
      ancestors.set(t.id, path);
      search.set(t.id, {name: normalize(t.title), context: normalize(path.map(p => p.title).join(' ')),
        text: normalize([t.description, t.excerpt].filter(Boolean).join(' '))});
    }
    const lessons = (window.FCOM || []).map(lesson => ({
      lesson, volume: lesson.volume || lesson.part || (lesson.group === 'systems' ? 2 : 1),
      ranges: rangesFor(lesson.pages)
    }));
    const guides = new Map((window.FcomGuides || []).map(guide => [guide.topicId, guide]));
    const cockpit = (window.CockpitPanels?.exercises || []).map(task => ({task, ranges: rangesFor(task.pages)}));
    index = {source, byId, children, roots, ancestors, counts, search, lessons, guides, cockpit};
    return index;
  }

  function stateFor(volume) {
    if (!searchStates.has(volume)) searchStates.set(volume, {query: '', page: 0});
    return searchStates.get(volume);
  }
  function queryForms(word) {
    const group = synonyms.find(terms => terms.some(t => word === t || (t.length > 4 && word.startsWith(t))));
    const tail = word.length > 5 ? word.replace(/(?:иями|ами|ями|ого|ему|ыми|ими|иях|ах|ях|ов|ев|ей|ые|ое|ие|ия|ий|ый|ая|ой|ом|ам|ям|ою|ую|ы|и|а|я|у|ю)$/u, '') : word;
    return [...new Set([word, ...(tail.length >= 4 ? [tail] : []), ...(group || [])])];
  }
  function matches(text, form) {
    return form.length > 3 ? text.includes(form) : (' ' + text + ' ').includes(' ' + form + ' ');
  }
  function searchTopics(data, volume, query) {
    const phrase = normalize(query);
    if (!phrase) return [];
    const forms = phrase.split(' ').map(queryForms);
    const results = [];
    for (const t of data.source.topics) {
      if (volume && t.volume !== volume) continue;
      const fields = data.search.get(t.id);
      let rank = fields.name === phrase ? 100 : fields.name.includes(phrase) ? 50 : 0;
      let complete = true;
      for (const variants of forms) {
        if (variants.some(v => matches(fields.name, v))) rank += 12;
        else if (variants.some(v => matches(fields.text, v))) rank += 4;
        else if (variants.some(v => matches(fields.context, v))) rank += 2;
        else { complete = false; break; }
      }
      if (complete) results.push({t, rank});
    }
    return results.sort((a, b) => b.rank - a.rank || a.t.depth - b.t.depth).map(hit => hit.t);
  }

  function chapters(data, volume) {
    const roots = data.roots.get(volume) || [];
    const contents = roots.filter(t => /^(Содержание|Оглавление)$/iu.test(t.title));
    const main = roots.filter(t => !contents.includes(t));
    if (volume === 2 && main.length === 1 && data.children.has(main[0].id)) {
      return {items: data.children.get(main[0].id), extra: [...contents, main[0]]};
    }
    return {items: main, extra: contents};
  }
  function searchField(volume, state) {
    const hint = volume ? 'Найти тему в томе ' + volume : 'Найти тему в двух томах';
    return '<div class="at-find"><label for="atlas-search">' + hint + '</label><div class="at-searchbox">' +
      icon('search', 21) + '<input id="atlas-search" type="search" autocomplete="off" placeholder="Например, шасси, FMC или наддув" value="' + e(state.query) + '">' +
      '<button data-at-clear type="button" aria-label="Очистить поиск"' + (state.query ? '' : ' hidden') + '>' + icon('close', 17) + '</button></div></div>';
  }
  function crumbs(items) {
    return '<nav class="at-crumbs" aria-label="Путь по атласу"><ol>' +
      items.map(item => '<li>' + item + '</li>').join('') + '</ol></nav>';
  }
  function row(data, t, context) {
    const chain = data.ancestors.get(t.id);
    const location = t.kind === 'scope' ? 'Обзор' : pageLabel(t.page);
    const meta = volumeLabel(t.volume) + ' · ' + location;
    const children = data.children.get(t.id);
    const tag = children?.length ? countItems(children.length) : kindLabels[t.kind] || '';
    return '<li><a class="at-row" href="' + topicHref(t) + '"><span class="at-row-text">' +
      (context && chain.length ? '<span class="at-row-path">' + e(chain.map(title).join(' › ')) + '</span>' : '') +
      '<strong>' + e(title(t)) + '</strong>' + '</span><span class="at-row-meta"><span>' + e(context ? meta : location) +
      '</span>' + (!context && tag ? '<small>' + e(tag) + '</small>' : '') + '</span>' + icon('chevron', 15) + '</a></li>';
  }
  function volumeCard(data, vol) {
    const meta = volumes[vol];
    const info = data.source.volumes.find(v => v.id === vol);
    const preview = chapters(data, vol).items;
    const subtitle = vol === 1 ? 'Условия применения, этапы полёта и таблицы характеристик.' :
      'Устройство, индикация и взаимосвязи бортовых систем.';
    return '<a class="at-volume" href="' + volumeHref(vol) + '"><div class="at-volume-head"><span class="at-bookicon">' + icon(meta.icon, 23) +
      '</span><span>' + volumeLabel(vol) + '</span></div><h2>' + meta.title + '</h2><p>' + subtitle +
      '</p><div class="at-volume-foot"><span>' + preview.length + ' ' + plural(preview.length, 'раздел', 'раздела', 'разделов') +
      (info ? ' · ' + format(info.pages) + ' ' + plural(info.pages, 'страница', 'страницы', 'страниц') : '') +
      '</span><span class="at-forward">' + icon('arrow', 20) + '</span></div></a>';
  }

  function browse(data, volume) {
    if (!volume) return '<div class="at-books">' + [1, 2].map(v => volumeCard(data, v)).join('') + '</div>';
    const selection = chapters(data, volume);
    return '<section class="at-section"><div class="at-section-head"><h2>Разделы тома</h2><span>' +
      countItems(selection.items.length) + '</span></div><ol class="at-list">' +
      selection.items.map(t => row(data, t, false)).join('') + '</ol></section>' +
      (selection.extra.length ? '<div class="at-source-nav"><span>В оглавлении PDF</span>' +
        selection.extra.map(t => link(t)).join('') + '</div>' : '');
  }
  function searchResults(data, volume, state) {
    if (!state.query.trim()) return browse(data, volume);
    const hits = searchTopics(data, volume, state.query);
    if (!hits.length) return '<section class="at-empty"><h2>Совпадений нет</h2><p>Попробуйте другое слово или сокращение из FCOM.</p>' +
      '<button type="button" class="at-action" data-at-clear>Сбросить поиск</button></section>';
    const pages = Math.ceil(hits.length / pageSize);
    const page = Math.max(0, Math.min(state.page, pages - 1));
    const start = page * pageSize;
    return '<section class="at-section"><div class="at-section-head"><h2>Результаты поиска</h2><span>' + countItems(hits.length) +
      '</span></div><ol class="at-list" start="' + (start + 1) + '">' +
      hits.slice(start, start + pageSize).map(t => row(data, t, true)).join('') + '</ol>' +
      (pages > 1 ? '<nav class="at-pager" aria-label="Страницы результатов"><button data-at-page="' + (page - 1) + '" type="button"' +
        (page ? '' : ' disabled') + '>' + icon('back', 16) + 'Назад</button><span>' + (page + 1) + ' из ' + format(pages) +
        '</span><button data-at-page="' + (page + 1) + '" type="button"' + (page + 1 < pages ? '' : ' disabled') +
        '>Далее' + icon('arrow', 16) + '</button></nav>' : '') + '</section>';
  }
  function atlas(data, arg) {
    const volume = [1, 2].includes(Number(arg)) ? Number(arg) : 0;
    const state = stateFor(volume);
    return '<section class="atlas at-catalog" data-at-volume="' + volume + '">' +
      (volume ? crumbs(['<a href="#atlas">Атлас FCOM</a>', '<span aria-current="page">' + volumeLabel(volume) + '</span>']) : '') +
      '<header class="at-head"><div>' + (volume ? '<div class="at-volume-label">' + volumeLabel(volume) + '</div>' : '') +
      '<h1>' + (volume ? volumes[volume].title : 'Атлас FCOM') + '</h1><p>' +
      (volume ? countItems(data.counts.get(volume)) + ' в оглавлении. Выберите раздел или найдите нужную тему.' :
        'Оглавление двух томов Boeing 737 с пояснениями, заданиями и ссылками на страницы руководства.') +
      '</p></div>' + (volume ? '<div class="at-headsource">' + pageLink(volume, 1, 'Открыть том в PDF') + '</div>' : '') + '</header>' +
      searchField(volume, state) + '<div data-at-results tabindex="-1">' + searchResults(data, volume, state) +
      '</div><span data-at-status class="at-sr" role="status"></span></section>';
  }

  function studyLinks(data, t, guide) {
    const end = Math.max(t.page, t.end || t.page);
    const touching = data.lessons.filter(item => item.volume === t.volume && item.ranges.some(([first, last = first]) =>
      first <= end && last >= t.page)).map(item => item.lesson);
    const guideIds = guide?.lessonIds || [];
    const related = guideIds.map(id => data.lessons.find(x => x.lesson.id === id)?.lesson)
      .filter(l => l && !touching.includes(l));
    return [...touching.map(l => [l, 'Из этого диапазона страниц']), ...related.map(l => [l, 'По теме раздела'])];
  }
  function relatedLessons(items) {
    if (!items.length) return '';
    const renderLesson = ([lesson, relation]) => '<li><small>' + e(relation) + ' · том ' + (lesson.volume || lesson.part || (lesson.group === 'systems' ? 2 : 1)) + ', с. ' + e(lesson.pages) + '</small><h3>' + e(lesson.title) +
      '</h3><p>' + e(lesson.summary) + '</p><div><a href="#lesson/' + e(lesson.id) + '">' + icon('book-open', 15) +
      'Урок</a><a href="#practice/' + e(lesson.id) + '">' + icon('play', 14) + 'Сценарий</a></div></li>';
    const extra = items.slice(4);
    return '<section class="at-section at-studies"><h2>Уроки и сценарии</h2><ul>' + items.slice(0, 4).map(renderLesson).join('') + '</ul>' +
      (extra.length ? '<details><summary>Ещё ' + extra.length + ' ' + plural(extra.length, 'урок', 'урока', 'уроков') + '</summary><ul>' +
        extra.map(renderLesson).join('') + '</ul></details>' : '') + '</section>';
  }
  function cockpitLinks(data, t) {
    if (t.volume !== 2 || t.kind === 'scope') return '';
    const end = Math.max(t.page, t.end || t.page);
    const tasks = data.cockpit.filter(entry => entry.ranges.some(([first, last = first]) => first <= end && last >= t.page));
    if (!tasks.length) return '';
    const taskLink = ({task}) => '<li><a href="#cockpit/' + e(task.id) + '">' + icon('gauge', 16) +
      '<span>' + e(task.title) + '<small>с. ' + e(task.pages) + '</small></span>' + icon('chevron', 14) + '</a></li>';
    return '<section class="at-cockpit"><div class="at-guide-heading">' + icon('panel', 20) + '<h2>Практика в кабине</h2></div><ul>' +
      tasks.slice(0, 3).map(taskLink).join('') + '</ul>' + (tasks.length > 3 ? '<details><summary>Ещё ' + (tasks.length - 3) +
        '</summary><ul>' + tasks.slice(3).map(taskLink).join('') + '</ul></details>' : '') + '</section>';
  }
  function guideBlock(guide, isExact) {
    if (!guide) return '';
    const observations = (guide.observe || []).map(observation => '<li>' + e(observation) + '</li>').join('');
    return '<section class="at-guide"><div class="at-guide-heading">' + icon('compass', 20) + '<h2>' +
      (isExact ? 'Как изучать раздел' : 'Ориентиры по разделу') + '</h2></div>' +
      (isExact ? '' : '<a class="at-guide-parent" href="#topic/' + e(guide.topicId) + '">' + e(guide.title) + '</a>') +
      (isExact ? '' : '<p>' + e(guide.summary) + '</p>') + (observations ? '<details><summary>На что обратить внимание</summary><ul>' + observations + '</ul></details>' : '') +
      '</section>';
  }

  // Each table exercise is about interpreting the quantity named in the heading.
  // Unknown table types keep their own source and chapter guide.
  const tableExercises = [
    {match: /идентификация пакета характеристик/u,
      question: 'Два листа озаглавлены одинаково, но взяты из разных пакетов. Что сверить до сравнения значений?',
      options: ['Вариант самолёта и двигателя, единицы и условия пакета', 'Только заголовки таблиц', 'Только номера строк с данными'],
      why: 'Пакет задаёт конфигурацию самолёта, двигатель, единицы и сертификационную основу. Совпадение заголовка таблицы само по себе не подтверждает совместимость.'},
    {match: /масса ограниченная препятствиями/u,
      question: 'У двух условных препятствий одинаковая высота. Какое ещё различие важно для интерпретации ограничения массы?',
      options: ['Удаление препятствия', 'Частота радиосвязи', 'Номер борта в журнале'],
      why: 'Высота и удаление вместе определяют положение препятствия относительно траектории набора.'},
    {match: /масса ограниченная набором высоты/u,
      question: 'На листе приведена масса, ограниченная набором высоты. Какой показатель определяет характер этого ограничения?',
      options: ['Требуемый градиент набора для заданной конфигурации', 'Продолжительность ожидания у аэродрома', 'Время охлаждения тормозов после посадки'],
      why: 'Этот раздел связывает массу с характеристиками набора. Для чтения данных важны конфигурация и условия, напечатанные на листе.'},
    {match: /поправки к длине впп/u,
      question: 'Две ВПП одинаковой длины. Какие условия различают примеры в таблице поправок?',
      options: ['Уклон ВПП и продольная составляющая ветра', 'Только номер ВПП', 'Продолжительность предыдущего полёта'],
      why: 'При чтении поправок к длине ВПП учитывают уклон и продольную составляющую ветра.'},
    {match: /^(?:vref|маневренные скорости для положений закрылков)$/u,
      question: 'Масса в двух учебных примерах одинакова. Какой параметр ещё нужен, чтобы выбрать соответствующую скорость?',
      options: ['Положение закрылков', 'Курс по MCP', 'Масштаб навигационного дисплея'],
      why: 'Скорости в этой таблице зависят и от массы, и от положения закрылков.'},
    {match: /(?:^| )n1(?: |$)/u,
      question: 'Как читать значение N1 со знаком процента?',
      options: ['Как частоту вращения ротора низкого давления в процентах', 'Как долю оставшегося рейсового топлива', 'Как положение закрылков в процентах'],
      why: 'N1 относится к вращению ротора низкого давления. Режим, для которого приведён процент, указан в заголовке.'},
    {match: /энергоемкости тормозов/u,
      question: 'Какой физический предел рассматривается в таблице VMBE?',
      options: ['Энергия, которую могут поглотить тормоза', 'Предельная нагрузка на крыло', 'Объём масла в двигателе'],
      why: 'Параметр VMBE связан с предельной энергией торможения при прекращённом взлёте.'},
    {match: /параметры режима максимальной дальности/u,
      question: 'Для сравнения двух строк LRC известна высота полёта. Какое ещё исходное условие по самолёту нужно сверить?',
      options: ['Массу самолёта', 'Номер активной радиочастоты', 'Цвет линии маршрута'],
      why: 'Крейсерские параметры LRC даны для разных масс и высот в указанной конфигурации самолёта.'},
    {match: /выбор высоты с учетом ветра/u,
      question: 'Редактор сравнивает два эшелона для учебного маршрута. Какие данные о ветре нужны для этого сравнения?',
      options: ['Данные о ветре на сравниваемых эшелонах', 'Только направление ветра у земли', 'Только направление полосы назначения'],
      why: 'Влияние ветра сравнивают по высотам. Одно наблюдение у земли не описывает разницу между эшелонами.'},
    {match: /^(?:ожидание|планирование ожидания)$/u,
      question: 'Две записи об ожидании показывают одинаковое количество топлива. Какая пара условий нужна при сравнении с табличными данными?',
      options: ['Масса самолёта и высота ожидания', 'Курс и частота радиосвязи', 'Масштаб карты и яркость экрана'],
      why: 'Таблицы ожидания связывают расход топлива с высотой и массой для указанной конфигурации.'},
    {match: /взлетные скорости/u,
      question: 'На двух листах указано одно состояние ВПП. Что ещё следует сопоставить перед сравнением скоростей?',
      options: ['Конфигурацию закрылков и номинал тяги', 'Яркость дисплея и масштаб карты', 'Соседние номера PDF-страниц'],
      why: 'Для применимости таблицы скоростей, помимо состояния полосы, важны указанные конфигурация закрылков и номинал тяги.'},
    {match: /масса,? ограниченная длиной впп|посадочная масса по длине впп|взлетная масса по длине впп/u,
      question: 'Известна длина полосы. Какую величину проверяют по этой таблице?',
      options: ['Массу самолёта', 'Дистанцию от начала разбега', 'Продолжительность полёта'],
      why: 'В заголовке результат выражен массой. Длина ВПП задаёт одно из условий для её определения.'},
    {match: /посадочная дистанция|фактическая дистанция посадки/u,
      question: 'В учебном примере сравнивают два результата этой таблицы. В каких единицах должна быть выражена сравниваемая величина?',
      options: ['В единицах длины', 'В единицах времени', 'В единицах массы'],
      why: 'Посадочная дистанция — длина. Конкретную единицу, метры или футы, указывает сама таблица.'},
    {match: /рейсовое топливо и время/u,
      question: 'Какие две величины нужно выписать раздельно, чтобы сравнить варианты одного маршрута?',
      options: ['Расходуемое за рейс топливо и время полёта', 'Запас топлива и угол сноса', 'Время полёта и курс'],
      why: 'Таблица даёт рейсовое топливо и время. Их записывают с единицами соответствующих граф.'},
    {match: /градиент набора высоты/u,
      question: 'Что описывает градиент набора?',
      options: ['Прирост высоты относительно горизонтального пути', 'Изменение высоты за минуту', 'Геометрическую высоту над уровнем моря'],
      why: 'Градиент связывает прирост высоты с пройденным по горизонтали расстоянием. Вертикальная скорость связывает его со временем.'},
    {match: /предельная масса быстрого оборота/u,
      question: 'Учебная таблица привязана к категории тормозов. Где проверить применимость данных перед сравнением чисел?',
      options: ['В названии таблицы и обозначении комплектации', 'Только в строке наибольшей массы', 'Только в номере PDF-страницы'],
      why: 'Заголовок указывает тип и категорию тормозов. При разных комплектациях нужно сверить соответствующую таблицу.'},
    {match: /максимальная высота в режиме|достижимая высота в режиме/u,
      question: 'Какую информацию нужно сохранить вместе с полученной высотой?',
      options: ['Режим полёта и условия, указанные для таблицы', 'Только значение высоты', 'Номер любой таблицы высот из другого пакета'],
      why: 'В заголовке высота привязана к конкретному режиму. Для сравнения используют одну конфигурацию и условия, указанные в источнике.'}
  ];
  function tableExercise(t) {
    if (t.volume !== 1 || t.kind !== 'table') return null;
    const name = normalize(t.title);
    return tableExercises.find(item => item.match.test(name));
  }
  function exercise(t) {
    const task = tableExercise(t);
    if (task) {
      const offset = (t.page + t.id.length) % task.options.length;
      return '<section class="at-exercise"><div class="at-guide-heading">' + icon('target', 20) + '<h2>Проверьте себя</h2></div>' +
        '<p>' + e(task.question) + '</p><div class="at-answers">' + task.options.map((_, i) => {
          const original = (i + offset) % task.options.length;
          return '<button type="button" data-at-answer="' + original + '">' + e(task.options[original]) + '</button>';
        }).join('') + '</div><p class="at-feedback" role="status" data-at-feedback></p></section>';
    }
    const excerpt = t.excerpt || '';
    const term = t.kind !== 'scope' && excerpt.length >= 45 && excerpt.match(/\b(?:PFD|FMC|MCP|TCAS|CDU|EFIS|AFDS|ACARS|IRS|ILS|GPWS|EGPWS|APU|EEC|FMS|ADIRU|VNAV|LNAV|VOR|DME|NDB|FMA|TAI|HUD)\b/u)?.[0];
    if (!term) return '';
    const masked = excerpt.replace(new RegExp('\\b' + term + '\\b', 'g'), '〔…〕');
    return '<section class="at-exercise"><div class="at-guide-heading">' + icon('target', 20) + '<h2>Вспомните обозначение</h2></div>' +
      '<p>Какое сокращение пропущено во фрагменте FCOM?</p>' + (t.excerptHeading ? '<div class="at-excerpt-label">' + e(t.excerptHeading.replace(new RegExp('\\b' + term + '\\b', 'g'), '〔…〕')) + '</div>' : '') + '<blockquote>' + e(masked) + '</blockquote>' +
      '<details><summary>Сверить ответ</summary><p><strong>' + term + '</strong> · ' +
      pageLink(t.volume, t.excerptPage || t.page, 'Фрагмент на с. ' + (t.excerptPage || t.page)) + '</p></details></section>';
  }
  function adjacent(data, t) {
    const peers = (t.parent ? data.children.get(t.parent) : data.roots.get(t.volume)) || [];
    const i = peers.indexOf(t), previous = peers[i - 1], next = peers[i + 1];
    if (!previous && !next) return '';
    const card = (dest, label, arrow) => '<a href="' + topicHref(dest) + '"><small>' + icon(arrow, 14) + label +
      '</small><strong>' + e(title(dest)) + '</strong></a>';
    return '<nav class="at-adjacent" aria-label="Соседние темы раздела">' +
      (previous ? card(previous, 'Предыдущая тема', 'back') : '') + (next ? card(next, 'Следующая тема', 'arrow') : '') + '</nav>';
  }
  function subtopics(data, t) {
    const children = data.children.get(t.id) || [];
    if (!children.length) return '';
    return '<section class="at-section at-children"><div class="at-section-head"><h2>В этом разделе</h2><span>' +
      countItems(children.length) + '</span></div><ol class="at-list" data-at-children>' +
      children.slice(0, pageSize).map(child => row(data, child, false)).join('') + '</ol>' +
      (children.length > pageSize ? '<button class="at-action at-more" type="button" data-at-more>Показать ещё ' +
        Math.min(pageSize, children.length - pageSize) + '</button>' : '') + '</section>';
  }
  function topic(data, arg) {
    const t = data.byId.get(arg);
    if (!t) return '<section class="atlas at-empty"><h1>Тема не найдена</h1><a href="#atlas">Найти тему в атласе</a></section>';
    const path = data.ancestors.get(t.id);
    const guideNode = [t, ...path.slice().reverse()].find(n => data.guides.has(n.id));
    const guide = guideNode && data.guides.get(guideNode.id);
    const isExactGuide = Boolean(guide && guideNode.id === t.id && t.kind !== 'scope');
    const related = t.kind === 'scope' ? [] : studyLinks(data, t, guide);
    const range = t.end > t.page ? t.page + '–' + t.end : String(t.page);
    const crumbsList = ['<a href="#atlas">Атлас FCOM</a>', '<a href="' + volumeHref(t.volume) + '">' + volumeLabel(t.volume) + '</a>',
      ...path.map(parent => link(parent))];
    const excerptHeading = t.excerptHeading ? '<div class="at-excerpt-label">' + e(t.excerptHeading) + '</div>' : '';
    const excerpt = t.kind !== 'scope' && t.excerpt ? '<details class="at-excerpt" open><summary>Фрагмент руководства</summary>' + excerptHeading + '<blockquote>' + e(t.excerpt) +
      '</blockquote><p>' + pageLink(t.volume, t.excerptPage || t.page, 'Сверить с PDF, с. ' + (t.excerptPage || t.page)) + '</p></details>' : '';
    const sourceLabel = t.kind === 'scope' ? volumeLabel(t.volume) : volumeLabel(t.volume) + ' · с. ' + range;
    const sourceLink = t.kind === 'scope' ? '<a href="#reference">К описанию первоисточников</a>' : pageLink(t.volume, t.page, 'Открыть PDF на с. ' + t.page);
    const sidebar = cockpitLinks(data, t) + (t.kind !== 'scope' ? guideBlock(guide, isExactGuide) : '');
    return '<article class="atlas at-topic" data-at-topic="' + e(t.id) + '">' + crumbs(crumbsList) +
      '<header class="at-head"><div><div class="at-volume-label">' + volumeLabel(t.volume) + ' · ' + e(kindLabels[t.kind] || 'Тема') +
      '</div><h1>' + e(title(t)) + '</h1></div><div class="at-source-card"><div class="at-guide-heading">' +
      icon('book-open', 20) + '<h2>Первоисточник</h2></div><p>737 Flight Crew Operations Manual</p><strong>' + e(sourceLabel) + '</strong>' +
      '<div class="at-open-page">' + sourceLink + '</div></div></header><div class="at-reading' + (sidebar ? '' : ' at-reading-single') + '">' +
      '<div class="at-body"><section class="at-description"><h2>О теме</h2>' + (isExactGuide ? '<p>' + e(guide.summary) + '</p>' : '') +
      (t.description && !(isExactGuide && /^(Внутри раздела|На страницах темы выделены)/u.test(t.description)) ? '<p>' + e(t.description) + '</p>' : '') + excerpt + '</section>' +
      subtopics(data, t) + exercise(t) + '</div>' + (sidebar ? '<aside class="at-side" aria-label="Материалы раздела">' + sidebar + '</aside>' : '') +
      '</div>' + relatedLessons(related) + adjacent(data, t) + '</article>';
  }

  function render(route, arg) {
    const data = getIndex();
    if (!data) return '<section class="atlas at-empty"><h1>Атлас FCOM</h1><p>Оглавление не загружено.</p><a href="#reference">К первоисточникам</a></section>';
    return route === 'topic' ? topic(data, arg) : atlas(data, arg);
  }
  function bind(route, arg) {
    const data = getIndex();
    const root = document.querySelector('.atlas');
    if (!root || !data) return;
    if (route === 'topic') {
      const t = data.byId.get(arg);
      if (!t) return;
      root.addEventListener('click', event => {
        const more = event.target.closest('[data-at-more]');
        if (more) {
          const children = data.children.get(t.id);
          const list = root.querySelector('[data-at-children]');
          const start = list.childElementCount;
          list.insertAdjacentHTML('beforeend', children.slice(start, start + pageSize).map(child => row(data, child, false)).join(''));
          const left = children.length - list.childElementCount;
          if (left > 0) more.textContent = 'Показать ещё ' + Math.min(pageSize, left);
          else more.remove();
          list.children[start]?.querySelector('a')?.focus({preventScroll: true});
        }
        const answer = event.target.closest('[data-at-answer]');
        if (!answer) return;
        const correct = answer.dataset.atAnswer === '0', task = tableExercise(t);
        if (!task) return;
        root.querySelectorAll('[data-at-answer]').forEach(button => {
          delete button.dataset.result;
          button.disabled = false;
        });
        answer.dataset.result = correct ? 'correct' : 'wrong';
        if (!correct) answer.disabled = true;
        if (correct) root.querySelectorAll('[data-at-answer]').forEach(button => { button.disabled = true; });
        root.querySelector('[data-at-feedback]').textContent = correct ? 'Верно. ' + task.why : 'Попробуйте ещё раз. Сверьтесь с пояснением к теме или откройте таблицу в PDF.';
      });
      return;
    }
    const volume = Number(root.dataset.atVolume) || 0;
    const state = stateFor(volume), input = root.querySelector('#atlas-search');
    if (!input) return;
    const results = root.querySelector('[data-at-results]');
    function update() {
      results.innerHTML = searchResults(data, volume, state);
      root.querySelector('.at-searchbox [data-at-clear]').hidden = !state.query;
      root.querySelector('[data-at-status]').textContent = state.query.trim() ?
        (results.querySelector('.at-section-head span')?.textContent || 'Совпадений нет') : '';
    }
    input.addEventListener('input', () => {
      state.query = input.value;
      state.page = 0;
      update();
    });
    root.addEventListener('click', event => {
      if (event.target.closest('[data-at-clear]')) {
        input.value = state.query = '';
        state.page = 0;
        update();
        input.focus();
      }
      const paging = event.target.closest('[data-at-page]');
      if (paging && !paging.disabled) {
        state.page = Number(paging.dataset.atPage);
        update();
        results.focus();
        results.scrollIntoView({block: 'start'});
      }
    });
  }
  window.Atlas = {render, bind};
})();
