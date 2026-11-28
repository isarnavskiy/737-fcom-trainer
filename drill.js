/* "Наизусть": spaced-repetition cards and a checkride-style mixed test built from the scenarios. */
(() => {
  'use strict';
  const data = window.FlightDrill || {decks: [], cards: []};
  const F = () => window.Flight;
  const icon = (name, size) => F().icon(name, size);
  const esc = value => F().escape(value);
  const plural = (n, one, few, many) => {
    const a = n % 10, b = n % 100;
    return b >= 11 && b <= 14 ? many : a === 1 ? one : a >= 2 && a <= 4 ? few : many;
  };
  const deckById = id => data.decks.find(d => d.id === id);
  const cardById = id => data.cards.find(c => c.id === id);
  const inDeck = id => data.cards.filter(c => c.deck === id);

  // ---- Storage ----
  const key = 'flightdeck-737-drill-v1';
  let store;
  try { store = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { store = {}; }
  if (typeof store !== 'object' || Array.isArray(store)) store = {};
  if (!store.cards || typeof store.cards !== 'object' || Array.isArray(store.cards)) store.cards = {};
  if (!Array.isArray(store.exams)) store.exams = [];
  const save = () => { try { localStorage.setItem(key, JSON.stringify(store)); } catch { /* the session still works */ } };

  // Leitner boxes 0..5. "Знаю" moves a card up a box, "Не вспомнил" returns it to box 0.
  const INTERVALS = [0, 1, 3, 7, 16, 35];
  const LEARNED_BOX = 3;
  const NEW_PER_SESSION = 10;
  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const addDays = days => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const cardState = id => {
    const s = store.cards[id];
    return s && Number.isInteger(s.box) && typeof s.due === 'string' ? s : null;
  };
  const isDue = card => { const s = cardState(card.id); return Boolean(s) && s.due <= today(); };
  const isNew = card => !cardState(card.id);
  const isLearned = card => (cardState(card.id)?.box || 0) >= LEARNED_BOX;

  function grade(card, result) {
    const old = cardState(card.id) || {box: 0, seen: 0, lapses: 0};
    let box = old.box, days;
    if (result === 'again') { box = 0; days = 0; }
    else if (result === 'hard') { days = Math.max(1, Math.round(INTERVALS[box] / 2)); }
    else { box = Math.min(5, box + 1); days = INTERVALS[box]; }
    store.cards[card.id] = {box, due: addDays(days), seen: (old.seen || 0) + 1,
      lapses: (old.lapses || 0) + Number(result === 'again'), last: new Date().toISOString()};
    save();
    return days;
  }
  function nextIn(card, result) {
    const box = cardState(card.id)?.box || 0;
    if (result === 'again') return 'сегодня';
    const days = result === 'hard' ? Math.max(1, Math.round(INTERVALS[box] / 2)) : INTERVALS[Math.min(5, box + 1)];
    return days === 1 ? 'завтра' : 'через ' + days + ' ' + plural(days, 'день', 'дня', 'дней');
  }

  function deckStats(id) {
    const cards = id ? inDeck(id) : data.cards;
    return {total: cards.length, due: cards.filter(isDue).length, fresh: cards.filter(isNew).length, learned: cards.filter(isLearned).length};
  }

  const shuffle = list => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  // ---- Sources ----
  function sourceLine(card) {
    const src = card.src || {};
    const parts = [];
    if (src.topic) {
      parts.push('<a class="dr-src-link" href="#topic/' + esc(src.topic) + '">' + icon('layers', 15) + 'FCOM · том ' + src.topic.slice(1, 2) + (src.page ? ', с. ' + src.page : '') + '</a>');
      if (src.page && window.SourceDocs) parts.push(window.SourceDocs.pageLink(Number(src.topic.slice(1, 2)), src.page, 'Открыть PDF'));
    }
    const note = src.text && !src.topic ? '<span class="dr-src-text">' + icon('book', 15) + esc(src.text) + '</span>' : '';
    const check = card.check ? '<span class="dr-check">' + icon('info', 15) + 'Сверьте с документацией эксплуатанта</span>' : '';
    return parts.length || note || check ? '<div class="dr-source">' + parts.join('') + note + check + '</div>' : '';
  }

  // ---- Overview ----
  function overview() {
    const all = deckStats();
    const exams = store.exams.slice(-1)[0];
    return '<header class="page-heading"><h1>Наизусть</h1><p>Карточки с интервальным повторением: ограничения, действия по памяти, манёвры и сокращения. Тренажёр сам напомнит, что пора повторить.</p></header>' +
      '<section class="dr-today"><div><span class="dr-kicker">Сегодня</span><h2>' + (all.due ? all.due + ' ' + plural(all.due, 'карточка', 'карточки', 'карточек') + ' к повторению' : all.fresh === all.total ? 'Начните с первых карточек' : 'Повторений на сегодня нет') + '</h2>' +
      '<p>Выучено ' + all.learned + ' из ' + all.total + '. Новых в одном занятии — не больше ' + NEW_PER_SESSION + '.</p></div>' +
      '<a class="btn btn-primary" href="#drill/all">' + icon('play', 17) + (all.due ? 'Повторить' : 'Начать занятие') + '</a></section>' +
      '<div class="dr-decks">' + data.decks.map(d => {
        const s = deckStats(d.id);
        return '<article class="dr-deck" style="--tint:' + d.color + '"><div class="dr-deck-top"><span class="module-code">' + esc(d.code) + '</span>' +
          (s.due ? '<span class="mini-state review">' + s.due + ' к повторению</span>' : s.learned === s.total ? '<span class="mini-state complete">Выучено</span>' : '') + '</div>' +
          '<h3>' + esc(d.title) + '</h3><p>' + esc(d.desc) + '</p>' +
          '<div class="dr-meter" aria-label="Выучено ' + s.learned + ' из ' + s.total + '"><i style="width:' + (s.total ? s.learned / s.total * 100 : 0) + '%"></i></div>' +
          '<div class="dr-deck-meta">' + s.learned + ' / ' + s.total + ' выучено</div>' +
          '<div class="dr-deck-actions"><a class="btn btn-secondary" href="#drill/' + d.id + '">' + icon('play', 15) + 'Учить</a><a class="dr-link" href="#sheet/' + d.id + '">' + icon('list', 15) + 'Шпаргалка</a></div></article>';
      }).join('') + '</div>' +
      '<a class="catalog-cockpit" href="#exam">' + icon('clipboard', 20) + '<span>Контрольный тест по всем сценариям — как на проверке</span>' + (exams ? '<b>' + exams.score + ' / ' + exams.total + '</b>' : '') + icon('chevron', 16) + '</a>' +
      '<p class="result-note">Значения из AFM, QRH и табличек приведены для типового 737-800 с двигателями CFM56-7B. Перед проверкой сверьте их с действующими документами своего эксплуатанта. Прогресс карточек хранится в этом браузере.</p>';
  }

  // ---- Session ----
  let session = null;
  function buildQueue(deckId, extra) {
    const pool = deckId === 'all' ? data.cards : inDeck(deckId);
    const due = pool.filter(isDue).sort((a, b) => cardState(a.id).due.localeCompare(cardState(b.id).due));
    const fresh = pool.filter(isNew).slice(0, NEW_PER_SESSION);
    let queue = [...due, ...fresh];
    if (!queue.length && extra) {
      queue = pool.slice().sort((a, b) => (cardState(a.id)?.last || '').localeCompare(cardState(b.id)?.last || '')).slice(0, NEW_PER_SESSION);
    }
    return queue.map(c => c.id);
  }
  function startSession(deckId, extra) {
    session = {deck: deckId, queue: buildQueue(deckId, extra), index: 0, revealed: false, mode: null,
      picked: [], options: [], mistakes: 0, counts: {again: 0, hard: 0, good: 0}, repeats: {}};
  }

  function deckLabel(id) { return id === 'all' ? 'Все колоды' : deckById(id)?.title || ''; }

  function sessionView(deckId) {
    if (!session || session.deck !== deckId) startSession(deckId);
    const head = '<nav class="ll-back" aria-label="Путь по тренажёру"><a href="#drill">' + icon('back', 15) + 'Наизусть</a><span aria-hidden="true">/</span><span>' + esc(deckLabel(deckId)) + '</span></nav>';
    if (!session.queue.length) {
      return head + '<header class="page-heading"><h1>' + esc(deckLabel(deckId)) + '</h1></header><div class="empty">' + icon('check', 28) +
        '<h3>На сегодня всё повторено</h3><p>Следующие карточки появятся по расписанию. Можно пройти ещё десять самых давних.</p>' +
        '<button class="btn btn-primary" data-dr-extra>' + icon('reload', 16) + 'Учить дальше</button> <a class="btn btn-secondary" href="#drill">К колодам</a></div>';
    }
    if (session.index >= session.queue.length) return head + finishView(deckId);
    const card = cardById(session.queue[session.index]);
    const deck = deckById(card.deck);
    const pct = Math.round(100 * session.index / session.queue.length);
    return head + '<header class="page-heading dr-heading"><h1>' + esc(deckLabel(deckId)) + '</h1><p>Карточка ' + (session.index + 1) + ' из ' + session.queue.length + (isNew(card) ? ' · новая' : '') + '</p></header>' +
      '<div class="dr-progress" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
      '<section class="dr-card" tabindex="-1" style="--tint:' + deck.color + '" aria-live="polite">' +
      '<div class="dr-card-top"><span class="group-tag"><i></i>' + esc(deck.title) + '</span><span class="dr-keys">Пробел — ответ · 1, 2, 3 — оценка</span></div>' +
      (card.steps ? stepsCard(card) : factCard(card)) + '</section>';
  }

  function factCard(card) {
    const abbr = card.deck === 'abbr';
    return '<h2 class="dr-q' + (abbr ? ' dr-q-abbr' : '') + '">' + esc(card.q) + '</h2>' +
      (session.revealed
        ? '<div class="dr-answer"><strong>' + esc(card.a) + '</strong>' + (card.note ? '<p>' + esc(card.note) + '</p>' : '') + sourceLine(card) + '</div>' + gradeRow(card)
        : '<p class="dr-hint">' + (abbr ? 'Расшифруйте сокращение и скажите, что оно означает.' : 'Ответьте вслух или про себя, затем проверьте.') + '</p><div class="dr-actions"><button class="btn btn-primary" data-dr-reveal>' + icon('eye', 17) + 'Показать ответ</button></div>');
  }

  function stepLine(step) {
    return '<span class="dr-step-body"><span class="dr-step-item">' + esc(step[0]) + '</span><span class="dr-step-dots" aria-hidden="true"></span><span class="dr-step-action">' + esc(step[1]) + '</span></span>';
  }

  function stepsCard(card) {
    const head = '<h2 class="dr-q">' + esc(card.title) + '</h2><p class="dr-ru">' + esc(card.ru) + '</p><div class="dr-trigger"><b>Когда</b>' + esc(card.trigger) + '</div>';
    if (!session.mode) {
      return head + '<p class="dr-hint">Назовите шаги по памяти. Затем откройте список или соберите шаги по порядку.</p><div class="dr-actions">' +
        (card.steps.length > 1 ? '<button class="btn btn-primary" data-dr-mode="order">' + icon('list', 17) + 'Собрать по порядку</button>' : '') +
        '<button class="btn ' + (card.steps.length > 1 ? 'btn-secondary' : 'btn-primary') + '" data-dr-reveal>' + icon('eye', 17) + 'Показать шаги</button></div>';
    }
    const total = card.steps.length;
    const done = session.mode === 'reveal' || session.picked.length === total;
    const list = '<ol class="dr-steps">' + (session.mode === 'reveal' ? card.steps : session.picked.map(i => card.steps[i])).map(step => '<li>' + stepLine(step) + '</li>').join('') +
      (done ? '' : '<li class="dr-step-next">Какой шаг следующий?</li>') + '</ol>';
    if (!done) {
      return head + list + '<div class="dr-options">' + session.options.map(i => session.picked.includes(i) ? '' :
        '<button class="dr-option" data-dr-pick="' + i + '">' + stepLine(card.steps[i]) + '</button>').join('') + '</div>' +
        '<p class="dr-hint">Ошибок: ' + session.mistakes + '</p>';
    }
    const suggestion = session.mode === 'order' ? (session.mistakes === 0 ? 'good' : session.mistakes === 1 ? 'hard' : 'again') : null;
    return head + list + (card.note ? '<p class="dr-note">' + esc(card.note) + '</p>' : '') + sourceLine(card) +
      (suggestion ? '<p class="dr-verdict">' + (session.mistakes ? 'Ошибок при сборке: ' + session.mistakes + '.' : 'Порядок собран без ошибок.') + '</p>' : '') + gradeRow(card, suggestion);
  }

  function gradeRow(card, suggestion) {
    const buttons = [['again', '1', 'Не вспомнил'], ['hard', '2', 'С трудом'], ['good', '3', 'Знаю']];
    return '<div class="dr-grades" role="group" aria-label="Оценка ответа">' + buttons.map(([id, k, label]) =>
      '<button class="dr-grade dr-grade-' + id + (suggestion === id ? ' dr-suggested' : '') + '" data-dr-grade="' + id + '"><b>' + label + '</b><small>' + k + ' · ' + nextIn(card, id) + '</small></button>').join('') + '</div>';
  }

  function finishView(deckId) {
    const c = session.counts, n = c.again + c.hard + c.good;
    const s = deckStats(deckId === 'all' ? null : deckId);
    return '<header class="page-heading"><h1>Занятие завершено</h1><p>' + n + ' ' + plural(n, 'ответ', 'ответа', 'ответов') + ' · выучено ' + s.learned + ' из ' + s.total + '</p></header>' +
      '<div class="metrics-grid dr-summary">' + [[c.good, 'Знаю', 'check'], [c.hard, 'С трудом', 'clock'], [c.again, 'Не вспомнил', 'reload'], [s.due, 'Ещё к повторению', 'history']]
        .map(([v, t, i]) => '<div class="metric"><span>' + icon(i, 18) + t + '</span><strong>' + v + '</strong></div>').join('') + '</div>' +
      '<div class="dr-actions"><button class="btn btn-primary" data-dr-again>' + icon('reload', 16) + 'Ещё занятие</button><a class="btn btn-secondary" href="#drill">К колодам</a><a class="dr-link" href="#sheet/' + (deckId === 'all' ? 'limits' : deckId) + '">' + icon('list', 15) + 'Шпаргалка</a></div>';
  }

  function bindSession(deckId) {
    const host = document.querySelector('.dr-page');
    const redraw = () => { host.innerHTML = sessionView(deckId); bindSession(deckId); (host.querySelector('.dr-card') || host.querySelector('.dr-actions .btn'))?.focus({preventScroll: true}); };
    host.querySelector('[data-dr-extra]')?.addEventListener('click', () => { startSession(deckId, true); redraw(); });
    host.querySelector('[data-dr-again]')?.addEventListener('click', () => { startSession(deckId, true); redraw(); });
    host.querySelector('[data-dr-reveal]')?.addEventListener('click', () => { session.revealed = true; session.mode = 'reveal'; redraw(); });
    host.querySelector('[data-dr-mode]')?.addEventListener('click', () => {
      const card = cardById(session.queue[session.index]);
      session.mode = 'order'; session.picked = []; session.mistakes = 0;
      do { session.options = shuffle(card.steps.map((_, i) => i)); } while (session.options.every((v, i) => v === i) && card.steps.length > 1);
      redraw();
    });
    host.querySelectorAll('[data-dr-pick]').forEach(button => button.addEventListener('click', () => {
      const pick = Number(button.dataset.drPick);
      if (pick === session.picked.length) { session.picked.push(pick); redraw(); }
      else {
        session.mistakes += 1;
        button.classList.remove('dr-wrong'); void button.offsetWidth; button.classList.add('dr-wrong');
        host.querySelector('.dr-options + .dr-hint').textContent = 'Ошибок: ' + session.mistakes;
      }
    }));
    host.querySelectorAll('[data-dr-grade]').forEach(button => button.addEventListener('click', () => {
      const card = cardById(session.queue[session.index]);
      const result = button.dataset.drGrade;
      grade(card, result);
      session.counts[result] += 1;
      // A forgotten card comes back once more at the end of the session.
      if (result === 'again' && !session.repeats[card.id]) { session.repeats[card.id] = true; session.queue.push(card.id); }
      session.index += 1; session.revealed = false; session.mode = null; session.picked = []; session.mistakes = 0;
      redraw();
    }));
  }

  // ---- Cheat sheet ----
  function sheet(deckId) {
    const deck = deckById(deckId) || data.decks[0];
    return '<nav class="ll-back" aria-label="Путь по тренажёру"><a href="#drill">' + icon('back', 15) + 'Наизусть</a><span aria-hidden="true">/</span><span>Шпаргалка</span></nav>' +
      '<header class="page-heading"><h1>Шпаргалка: ' + esc(deck.title) + '</h1><p>Все карточки колоды на одной странице. Удобно просмотреть перед полётом или проверкой.</p></header>' +
      '<div class="filter-chips">' + data.decks.map(d => '<a class="chip" ' + (d.id === deck.id ? 'aria-current="true"' : '') + ' href="#sheet/' + d.id + '">' + esc(d.title) + '</a>').join('') + '</div>' +
      '<div class="dr-sheet">' + inDeck(deck.id).map(card => {
        const box = cardState(card.id)?.box;
        const badge = box === undefined ? '' : '<span class="mini-state ' + (box >= LEARNED_BOX ? 'complete' : 'review') + '">' + (box >= LEARNED_BOX ? 'Выучено' : 'Учится') + '</span>';
        if (card.steps) {
          return '<article class="dr-sheet-row dr-sheet-steps"><div class="dr-sheet-head"><h3>' + esc(card.title) + '</h3>' + badge + '</div><p class="dr-ru">' + esc(card.ru) + ' · ' + esc(card.trigger) + '</p>' +
            '<ol class="dr-steps">' + card.steps.map(s => '<li>' + stepLine(s) + '</li>').join('') + '</ol>' + (card.note ? '<p class="dr-note">' + esc(card.note) + '</p>' : '') + sourceLine(card) + '</article>';
        }
        return '<article class="dr-sheet-row"><div class="dr-sheet-head"><h3>' + esc(card.q) + '</h3>' + badge + '</div><strong>' + esc(card.a) + '</strong>' +
          (card.note ? '<p class="dr-note">' + esc(card.note) + '</p>' : '') + sourceLine(card) + '</article>';
      }).join('') + '</div><div class="dr-actions"><a class="btn btn-primary" href="#drill/' + deck.id + '">' + icon('play', 16) + 'Учить эту колоду</a><button class="btn btn-secondary" data-dr-print>' + icon('clipboard', 16) + 'Распечатать</button></div>';
  }

  // ---- Checkride-style mixed test ----
  const examKey = 'flightdeck-737-exam-run-v1';
  const PASS = 75;
  let examSetup = {group: '', size: 20};
  function loadExam() {
    try {
      const run = JSON.parse(localStorage.getItem(examKey) || 'null');
      if (run && Array.isArray(run.items) && run.items.every(item => examStep(item))) return run;
    } catch { /* ignore broken runs */ }
    return null;
  }
  function saveExam(run) { try { if (run) localStorage.setItem(examKey, JSON.stringify(run)); else localStorage.removeItem(examKey); } catch { /* memory only */ } }
  let exam = loadExam();
  function examStep(item) {
    const lesson = (window.FCOM || []).find(l => l.id === item?.lesson);
    const step = lesson?.scenario.steps[item.step];
    return step && Array.isArray(item.order) && item.order.length === step.options.length ? {lesson, step} : null;
  }
  function newExam() {
    const lessons = (window.FCOM || []).filter(l => !examSetup.group || l.group === examSetup.group);
    const pool = lessons.flatMap(l => l.scenario.steps.map((s, i) => ({lesson: l.id, step: i, order: shuffle(s.options.map((_, k) => k))})));
    // Spread questions across lessons before taking a second step from the same scenario.
    const byLesson = shuffle(lessons.map(l => shuffle(pool.filter(p => p.lesson === l.id))));
    const items = [];
    while (items.length < examSetup.size && byLesson.some(list => list.length)) byLesson.forEach(list => { if (list.length && items.length < examSetup.size) items.push(list.pop()); });
    exam = {items: shuffle(items), answers: Array(items.length).fill(null), index: 0, group: examSetup.group, started: new Date().toISOString()};
    saveExam(exam);
  }
  function groupTitle(id) { return id ? F().group(id)?.title : 'Все модули'; }

  function examView() {
    const head = '<header class="page-heading"><h1>Контрольный тест</h1><p>Случайные вопросы из всех сценариев. Ответы проверяются в конце, как на проверке. Варианты перемешаны.</p></header>';
    if (!exam) return head + examSetupView();
    if (exam.finished) return head + examResult();
    const item = exam.items[exam.index], {lesson, step} = examStep(item);
    const picked = exam.answers[exam.index];
    const g = F().group(lesson.group);
    return head + '<section class="ll-card ll-practice dr-exam" style="--tint:' + g.color + '"><div class="ll-practice-top"><span class="ll-step-label">Вопрос ' + (exam.index + 1) + ' из ' + exam.items.length + '</span>' +
      '<button class="ll-ref dr-exam-stop" data-ex-stop>' + icon('close', 15) + 'Прервать</button></div>' +
      '<div class="ll-track">' + exam.items.map((_, i) => '<span class="' + (i < exam.index ? 'll-hit dr-answered' : i === exam.index ? 'll-current' : '') + '"></span>').join('') + '</div>' +
      '<p class="dr-exam-context"><span class="group-tag"><i></i>' + esc(g.title) + '</span> ' + esc(lesson.scenario.context) + '</p>' +
      '<div class="ll-situation"><h2>Ситуация</h2><p>' + esc(step.situation) + '</p></div>' +
      '<form data-ex-form><fieldset><legend id="ex-question" tabindex="-1">' + esc(step.question) + '</legend><div class="ll-options">' +
      item.order.map(k => '<label class="ll-option"><input type="radio" name="ex-answer" value="' + k + '" ' + (picked === k ? 'checked' : '') + ' required><span>' + esc(step.options[k]) + '</span></label>').join('') +
      '</div></fieldset><div class="ll-submit-row">' + (exam.index ? '<button class="btn btn-secondary" type="button" data-ex-back>' + icon('back', 16) + 'Назад</button>' : '') +
      '<button class="btn btn-primary" type="submit" ' + (picked === null ? 'disabled' : '') + '>' + (exam.index === exam.items.length - 1 ? 'Завершить тест' : 'Следующий вопрос') + '</button></div></form></section>';
  }

  function examSetupView() {
    const groups = ['', 'limits', 'normal', 'extra', 'performance', 'systems'];
    const history = store.exams.slice(-5).reverse();
    return '<section class="ll-card dr-exam-setup"><h2>Настройте тест</h2><div class="filter-chips" role="group" aria-label="Модуль">' +
      groups.map(id => '<button class="chip" data-ex-group="' + id + '" ' + (examSetup.group === id ? 'aria-current="true"' : '') + '>' + esc(groupTitle(id)) + '</button>').join('') + '</div>' +
      '<div class="filter-chips" role="group" aria-label="Число вопросов">' + [10, 20, 30].map(n => '<button class="chip" data-ex-size="' + n + '" ' + (examSetup.size === n ? 'aria-current="true"' : '') + '>' + n + ' вопросов</button>').join('') + '</div>' +
      '<p class="dr-hint">Зачёт — от ' + PASS + ' % верных ответов. После теста откроется разбор каждого вопроса со ссылкой на страницу FCOM.</p>' +
      '<button class="btn btn-primary" data-ex-start>' + icon('play', 17) + 'Начать тест</button></section>' +
      (history.length ? '<section class="journal-box"><h2>Последние попытки</h2>' + history.map(h => '<div class="journal-record"><div><b>' + esc(groupTitle(h.group)) + '</b><small>' + esc(new Date(h.date).toLocaleDateString('ru-RU')) + '</small></div><span>' + h.score + ' / ' + h.total + ' · ' + Math.round(100 * h.score / h.total) + ' %</span></div>').join('') + '</section>' : '');
  }

  function examResult() {
    const rows = exam.items.map((item, i) => ({...examStep(item), item, picked: exam.answers[i]}));
    const score = rows.filter(r => r.picked === r.step.answer).length, pct = Math.round(100 * score / rows.length);
    const wrong = rows.filter(r => r.picked !== r.step.answer);
    const explain = r => {
      const text = esc(r.step.why.replace(/ Том \d+, с\. \d+\.$/, ''));
      const volume = r.lesson.volume || 1;
      return text + (r.step.page && window.SourceDocs ? ' ' + window.SourceDocs.pageLink(volume, r.step.page, 'Том ' + volume + ', с. ' + r.step.page) : '');
    };
    return '<section class="ll-card ll-result"><div class="ll-result-intro"><div class="ll-score" style="--ll-score:' + pct + '%"><span><strong>' + score + '<small>/' + rows.length + '</small></strong><span>верно</span></span></div>' +
      '<div><p class="ll-step-label">' + esc(groupTitle(exam.group)) + '</p><h2 tabindex="-1" id="ex-result-title">' + (pct >= PASS ? 'Зачёт · ' : 'Нужно повторить · ') + pct + ' %</h2>' +
      '<p>' + (wrong.length ? 'Ошибок: ' + wrong.length + '. Разбор ниже, из него можно перейти к уроку.' : 'Все ответы верны.') + '</p></div></div>' +
      (wrong.length ? '<details class="ll-review" open><summary>Разбор ошибок</summary>' + wrong.map(r => '<article><small>' + esc(r.lesson.title) + '</small><h3>' + esc(r.step.question) + '</h3>' +
        '<p class="dr-your">' + icon('close', 15) + ' ' + esc(r.step.options[r.picked]) + '</p><strong>' + icon('check', 15) + ' ' + esc(r.step.options[r.step.answer]) + '</strong><p>' + explain(r) + '</p>' +
        '<a class="ll-ref" href="#lesson/' + esc(r.lesson.id) + '">' + icon('book', 15) + ' Урок «' + esc(r.lesson.title) + '»</a></article>').join('') + '</details>' : '') +
      '<div class="ll-result-actions"><button class="btn btn-primary" data-ex-new>' + icon('reload', 17) + 'Новый тест</button><a class="btn btn-secondary" href="#drill">' + icon('bolt', 17) + 'Карточки наизусть</a><a class="ll-ref" href="#progress">Мой прогресс</a></div></section>';
  }

  function bindExam() {
    const host = document.querySelector('.dr-page');
    const redraw = focus => { host.innerHTML = examView(); bindExam(); host.querySelector(focus)?.focus(); };
    host.querySelectorAll('[data-ex-group]').forEach(b => b.addEventListener('click', () => { examSetup.group = b.dataset.exGroup; redraw('[data-ex-start]'); }));
    host.querySelectorAll('[data-ex-size]').forEach(b => b.addEventListener('click', () => { examSetup.size = Number(b.dataset.exSize); redraw('[data-ex-start]'); }));
    host.querySelector('[data-ex-start]')?.addEventListener('click', () => { newExam(); redraw('#ex-question'); });
    host.querySelector('[data-ex-new]')?.addEventListener('click', () => { exam = null; saveExam(null); redraw('[data-ex-start]'); });
    host.querySelector('[data-ex-stop]')?.addEventListener('click', () => { exam = null; saveExam(null); redraw('[data-ex-start]'); });
    host.querySelector('[data-ex-back]')?.addEventListener('click', () => { exam.index -= 1; saveExam(exam); redraw('#ex-question'); });
    const form = host.querySelector('[data-ex-form]');
    if (!form) return;
    form.addEventListener('change', e => {
      if (!e.target.matches('input[name="ex-answer"]')) return;
      exam.answers[exam.index] = Number(e.target.value); saveExam(exam);
      form.querySelector('[type="submit"]').disabled = false;
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (exam.answers[exam.index] === null) return;
      if (exam.index < exam.items.length - 1) { exam.index += 1; saveExam(exam); redraw('#ex-question'); return; }
      exam.finished = true;
      const score = exam.items.filter((item, i) => exam.answers[i] === examStep(item).step.answer).length;
      store.exams.push({date: new Date().toISOString(), group: exam.group, score, total: exam.items.length});
      store.exams = store.exams.slice(-30); save(); saveExam(exam);
      redraw('#ex-result-title');
    });
  }

  // ---- Keyboard shortcuts for the card session ----
  document.addEventListener('keydown', e => {
    if (!/^#drill\/./.test(location.hash) || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input, textarea, select')) return;
    const main = document.querySelector('.dr-page');
    if (!main) return;
    if ((e.key === ' ' || e.key === 'Enter') && main.querySelector('[data-dr-reveal]') && !e.target.closest?.('button, a')) {
      e.preventDefault(); main.querySelector('[data-dr-reveal]').click();
    } else if (['1', '2', '3'].includes(e.key)) {
      main.querySelector('[data-dr-grade="' + ['again', 'hard', 'good'][Number(e.key) - 1] + '"]')?.click();
    }
  });

  function view(route, arg) {
    if (route === 'exam') return examView();
    if (route === 'sheet') return sheet(arg);
    if (arg && (arg === 'all' || deckById(arg))) return sessionView(arg);
    session = null;
    return overview();
  }
  const render = (route, arg) => '<div class="ll-page dr-page">' + view(route, arg) + '</div>';
  function bind(route, arg) {
    if (route === 'exam') return bindExam();
    if (route === 'sheet') {
      document.querySelector('[data-dr-print]')?.addEventListener('click', () => window.print());
      return;
    }
    if (arg && (arg === 'all' || deckById(arg))) bindSession(arg);
  }
  function progress() {
    const s = deckStats();
    return {total: s.total, learned: s.learned, due: s.due, lastExam: store.exams.slice(-1)[0] || null,
      bestExam: store.exams.reduce((best, e) => !best || e.score / e.total > best.score / best.total ? e : best, null)};
  }
  window.Drill = {render, bind, progress};
})();
