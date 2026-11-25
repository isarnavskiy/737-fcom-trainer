(() => {
  'use strict';

  const api = () => window.Flight;
  const esc = value => api().escape(String(value ?? ''));
  const icon = (name, size = 18) => api().icon(name, size);
  const findLesson = id => window.FCOM.find(item => item.id === id);
  const sourceLabel = lesson => `FCOM · том ${lesson.volume || lesson.part || 1} · PDF, с. ${lesson.pages}`;
  const route = (base, lesson) => '#' + base + '/' + encodeURIComponent(lesson.id);
  const graphicNames = {
    airframe: 'Самолёт',
    crew: 'Работа экипажа',
    instruments: 'Пилотажные приборы',
    document: 'Работа с документом',
    runway: 'Взлётно-посадочная полоса',
    route: 'Маршрут полёта'
  };

  // Illustrations identify the theme. The selectable labels identify concepts,
  // without implying real control positions or a sequence of crew actions.
  const graphics = {
    airframe: `<path class="ll-fill" d="M97 21 Q99 10 102 21 L105 59 161 92 161 99 106 81 106 109 123 121 123 125 100 121 77 125 77 121 94 109 94 81 39 99 39 92 95 59Z"/>
      <path d="M98 37h4m-5 4h6M101 49v55M53 91l32-17m31 0 32 17M96 116l-12 4m20-4 12 4"/><path class="ll-accent" d="M94 59l-54 33m65-33 55 33"/>`,
    crew: `<path class="ll-fill" d="M24 91l11-44 29-15h72l29 15 11 44-22 19H46z"/>
      <path d="M40 49l28-11 22 1v23H36zm120 0-28-11-22 1v23h54zM94 35h12v33H94zm-9 38h30l10 14H75z"/>
      <path d="M26 91l22-16h25l-4 19m105-3-22-16h-25l4 19M88 109v-9h24v9"/><rect class="ll-accent" x="49" y="85" width="28" height="34" rx="7"/><rect class="ll-accent" x="123" y="85" width="28" height="34" rx="7"/><path d="M53 111h20m54 0h20M89 92h22"/>`,
    instruments: `<rect class="ll-fill" x="23" y="30" width="154" height="87" rx="8"/><rect x="31" y="39" width="68" height="63" rx="3"/><rect x="104" y="39" width="65" height="63" rx="3"/>
      <path d="M40 46v46m49-46v46m-49-40h4m-4 7h4m-4 7h4m-4 7h4m-4 7h4m45-28h-4m4 7h-4m4 7h-4m4 7h-4m4 7h-4M57 60h17m-13-5h9m-9 25h9M117 87a22 22 0 0 1 39 0m-44-17a32 32 0 0 1 49 0"/>
      <path class="ll-accent" d="M48 72l32-7m-23 4h4l4 4 4-4h4m61 16 3-10 3 10-3-2z"/><circle cx="34" cy="110" r="2"/><circle cx="164" cy="110" r="2"/><path d="M86 109h29"/>`,
    document: `<path class="ll-fill" d="M56 27h76l13 13v77H56z"/><path d="M63 20h75l14 14v75m-88 13h75M131 28v14h13M66 41h48M66 47h34"/><path class="ll-accent" d="M66 57h68v11H66z"/><path d="M66 68v37h68V68M88 69v36m22-36v36M66 80h68m-68 13h68"/>`,
    runway: `<path class="ll-fill" d="M77 25h46l22 96H55z"/><path d="M80 31l-19 83m59-83 19 83M84 34h5m-6 4h5m-6 4h5m26-8h5m-4 4h5m-4 4h5M69 105l3-12m2 12 3-12m2 12 3-12m48 12-3-12m-2 12-3-12m-2 12-3-12"/><path class="ll-accent" stroke-dasharray="7 7" d="M100 45v57"/><path d="M38 84h23m78 0h23M42 80l-4 4 4 4m116-8 4 4-4 4"/>`,
    route: `<path d="M24 104q25-38 54-26t43-20 49-18m-145 73q26-39 56-26t46-20 45-18" opacity=".4"/><path class="ll-accent" d="M32 101l39-35 39 7 52-38"/><circle class="ll-point" cx="32" cy="101" r="4"/><path class="ll-point" d="M71 60l6 6-6 6-6-6zm39 7 6 6-6 6-6-6z"/><circle class="ll-point" cx="162" cy="35" r="5"/><path d="M148 97v16m-8-8h16M45 30v12m-6-6h12"/>`
  };

  const planeRegions = {
    'systems-exterior-lights': [
      '<circle cx="100" cy="44" r="5"/>',
      '<circle cx="42" cy="93" r="4"/><circle cx="158" cy="93" r="4"/><circle cx="90" cy="65" r="3"/><circle cx="110" cy="65" r="3"/>',
      '<circle cx="87" cy="118" r="4"/><circle cx="113" cy="118" r="4"/>'
    ],
    'sys-control-surfaces': [
      '<path d="M44 94l44-26-1 6-41 21zm112 0-44-26 1 6 41 21z"/>',
      '<path d="M80 120l14-9v6l-14 5zm40 0-14-9v6l14 5z"/>',
      '<path d="M99 97h2v23h-2z"/>'
    ],
    'sys-fuel': [
      '<path d="M61 84l32-19v11L61 88z"/>',
      '<rect x="96" y="63" width="8" height="19" rx="2"/>',
      '<path d="M139 84l-32-19v11l32 12z"/>'
    ]
  };

  const gridRegions = {
    'systems-air-distribution': ['ОТБОР', 'PACK', 'СМЕСЬ'],
    'sys-power-conversion': ['IDG', 'AC', 'TR']
  };

  function interactiveRegion(contents, i) {
    return `<g data-ll-region="${i}" class="ll-region${i === 0 ? ' ll-selected' : ''}">${contents}</g>`;
  }

  function illustration(lesson) {
    const key = Object.hasOwn(graphics, lesson.visual) ? lesson.visual : 'document';
    let drawing = graphics[key];
    let name = graphicNames[key];
    if (planeRegions[lesson.id]) {
      drawing += planeRegions[lesson.id].map(interactiveRegion).join('');
      name = lesson.title;
    } else if (gridRegions[lesson.id]) {
      const labels = gridRegions[lesson.id];
      drawing = '<path stroke-dasharray="4 3" d="M100 43v16m0 27v16"/>' + labels.map((label, i) => {
        const y = 20 + i * 40;
        return interactiveRegion(`<rect x="61" y="${y}" width="78" height="25" rx="5"/>
          <text x="100" y="${y + 17}" text-anchor="middle">${label}</text>`, i);
      }).join('');
      name = lesson.title;
    } else if (lesson.id === 'systems-radio-audio') {
      drawing = '<rect class="ll-fill" x="21" y="30" width="158" height="56" rx="6"/>' + [
        [29, 40, 66, 'ACTIVE'], [105, 40, 66, 'STANDBY'], [61, 98, 78, 'ACP']
      ].map(([x, y, w, label], i) => interactiveRegion(`<rect x="${x}" y="${y}" width="${w}" height="28" rx="4"/>
        <text x="${x+w/2}" y="${y+18}" text-anchor="middle">${label}</text>`, i)).join('');
      name = lesson.title;
    }
    return `<div class="ll-art" role="img" aria-label="${esc('Условная иллюстрация. ' + name)}">
      <svg class="ll-art-svg" viewBox="0 0 200 144" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">
        <path class="ll-frame" d="M13 28V13h16m142 0h16v15M13 117v14h16m142 0h16v-14"/>
        <path class="ll-cross" d="M100 13v118M14 72h172"/>${drawing}
      </svg></div>`;
  }

  function exhibit(table) {
    if (!table?.columns?.length || !table.rows?.length) return '';
    return `<div class="ll-exhibit" role="region" aria-label="${esc(table.caption || 'Данные для разбора')}">
      <table><caption>${esc(table.caption || 'Данные для разбора')}<small>Выберите значение, чтобы выделить его строку и столбец.</small></caption>
      <thead><tr>${table.columns.map(column => `<th scope="col">${esc(column)}</th>`).join('')}</tr></thead>
      <tbody>${table.rows.map(row => `<tr>${row.map((cell, i) =>
        `<td><button type="button" data-ll-cell="${i}" aria-pressed="false" aria-label="${esc(table.columns[i] + ' — ' + cell)}">${esc(cell)}</button></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function bindExhibits(host) {
    host.querySelectorAll('.ll-exhibit table').forEach(table => {
      table.addEventListener('click', event => {
        const button = event.target.closest('button[data-ll-cell]');
        if (!button) return;
        const activate = button.getAttribute('aria-pressed') !== 'true';
        const column = Number(button.dataset.llCell);
        const row = button.closest('tr');
        [...table.rows].forEach(item => {
          item.classList.toggle('ll-row-selected', activate && item === row);
          [...item.cells].forEach((cell, i) => {
            cell.classList.toggle('ll-col-selected', activate && i === column);
            cell.querySelector('button')?.setAttribute('aria-pressed', String(activate && item === row && i === column));
          });
        });
      });
    });
  }

  function display(panel) {
    if (!panel?.cells?.length) return '';
    return `<figure class="ll-panel-readout"><figcaption>${esc(panel.caption)}</figcaption><dl>${panel.cells.map(cell =>
      `<div><dt>${esc(cell.label)}</dt><dd>${esc(cell.value)}</dd></div>`).join('')}</dl></figure>`;
  }

  const feet = value => value.toLocaleString('ru-RU', { useGrouping: 'always' }) + ' ft';

  function altimeterLab() {
    const meters = [{ id: 'cap', name: 'КВС', offset: 40 }, { id: 'fo', name: 'Второй пилот', offset: -20 }];
    return `<section class="ll-card ll-lab"><h2>${icon('gauge')} Стенд высотомеров</h2>
      <p>Измените показания на земле и сравните три разницы с допусками таблицы RVSM. Источник — том 1, PDF, с. 5.</p>
      <div class="ll-lab-grid"><div class="ll-lab-controls">
      <label for="ll-elevation">Превышение аэродрома<select id="ll-elevation"><option value="4000">4 000 ft</option><option value="6000">6 000 ft</option></select></label>
      ${meters.map(m => `<div><label for="ll-meter-${m.id}">${m.name}<output aria-hidden="true" for="ll-meter-${m.id}" id="ll-reading-${m.id}">${feet(4000 + m.offset)}</output></label>
        <input id="ll-meter-${m.id}" type="range" min="3850" max="4150" step="5" value="${4000 + m.offset}"></div>`).join('')}</div>
      <dl class="ll-lab-res" aria-live="polite"><div><dt>КВС и второй пилот</dt><dd data-ll-delta="pair"></dd></div>
      <div><dt>КВС и аэродром</dt><dd data-ll-delta="captain"></dd></div><div><dt>Второй пилот и аэродром</dt><dd data-ll-delta="fo"></dd></div></dl></div></section>`;
  }

  function bindAltimeterLab(host) {
    const lab = host.querySelector('.ll-lab');
    if (!lab) return;
    const elevation = lab.querySelector('#ll-elevation');
    const meters = ['cap', 'fo'].map(id => ({
      input: lab.querySelector('#ll-meter-' + id), reading: lab.querySelector('#ll-reading-' + id)
    }));
    let base = Number(elevation.value);
    const update = () => {
      const values = meters.map(({ input, reading }) => {
        const value = Number(input.value);
        reading.value = feet(value);
        input.setAttribute('aria-valuetext', feet(value));
        return value;
      });
      const pairLimit = base === 4000 ? 50 : 60;
      const report = (name, delta, limit) => {
        const node = lab.querySelector('[data-ll-delta="' + name + '"]');
        const over = delta > limit;
        node.dataset.llOver = String(over);
        node.textContent = feet(delta) + ' / ' + feet(limit) + (over ? ' · Выше допуска' : ' · В пределах');
      };
      report('pair', Math.abs(values[0] - values[1]), pairLimit);
      report('captain', Math.abs(values[0] - base), 75);
      report('fo', Math.abs(values[1] - base), 75);
    };
    elevation.addEventListener('change', () => {
      const next = Number(elevation.value);
      meters.forEach(({ input }) => {
        const offset = Number(input.value) - base;
        input.min = next - 150;
        input.max = next + 150;
        input.value = next + offset;
      });
      base = next;
      update();
    });
    meters.forEach(({ input }) => input.addEventListener('input', update));
    update();
  }

  function radioLab() {
    return `<section class="ll-card ll-radio-lab"><h2>${icon('panel')} Стенд радиостанции</h2>
      <p>Для учебной VHF 1 выберите резервную частоту. Сравните окна до и после обмена. Значения в окнах заданы для упражнения.</p>
      <div class="ll-radio-windows" aria-live="polite"><div><span>ACTIVE · рабочая</span><output id="ll-active-frequency">119.200</output></div>
      <div><span>STANDBY · резервная</span><output id="ll-standby-frequency">127.600</output></div></div>
      <div class="ll-radio-tools"><label for="ll-radio-select">Резервная частота, МГц <select id="ll-radio-select">
      <option>119.200</option><option>121.800</option><option selected>127.600</option><option>132.400</option></select></label>
      <button type="button" class="btn btn-secondary" data-ll-transfer>${icon('reload', 16)} Обменять частоты</button></div>
      </section>`;
  }

  function bindRadioLab(host) {
    const lab = host.querySelector('.ll-radio-lab');
    if (!lab) return;
    const active = lab.querySelector('#ll-active-frequency');
    const standby = lab.querySelector('#ll-standby-frequency');
    const select = lab.querySelector('select');
    select.addEventListener('change', () => { standby.value = select.value; });
    lab.querySelector('[data-ll-transfer]').addEventListener('click', () => {
      const previous = active.value;
      active.value = standby.value;
      standby.value = previous;
      select.value = previous;
    });
  }

  function pageTop(lesson, mode) {
    const practical = mode === 'practice';
    const group = api().group(lesson.group);
    return `<nav class="ll-back" aria-label="Путь по тренажёру"><a href="#${practical ? 'scenarios' : 'theory'}">${icon('back', 16)} ${practical ? 'Все сценарии' : 'Вся теория'}</a><span aria-hidden="true">/</span><span>${esc(group.title)}</span></nav>
      <header class="ll-head"><div class="ll-meta"><span>${icon(practical ? 'play' : 'book', 15)} ${practical ? 'Практика' : 'Теория'}</span>
      <span class="ll-source">${api().sourceLink?.(lesson) || esc(sourceLabel(lesson))}</span></div>
      <h1>${esc(practical ? lesson.scenario.title : lesson.title)}</h1>
      <p>${esc(practical ? lesson.scenario.context : lesson.summary)}</p></header>
      <nav class="ll-modes" aria-label="Режим занятия">
      <a href="${route('lesson', lesson)}" ${practical ? '' : 'aria-current="page"'}>${icon('book')} Урок</a>
      <a href="${route('practice', lesson)}" ${practical ? 'aria-current="page"' : ''}>${icon('play')} Сценарий</a></nav>`;
  }

  function concepts(lesson) {
    if (!lesson.nodes?.length) return '';
    const items = lesson.nodes;
    return `<section class="ll-card ll-map" aria-labelledby="ll-map-heading">
      <h2 id="ll-map-heading">${icon('layers')} Схема понятий</h2>
      <div class="ll-map-board">
        ${illustration(lesson)}
        <div class="ll-map-picks" aria-label="Понятия урока">${items.map((node, i) =>
          `<button type="button" class="ll-node" aria-pressed="${i === 0}" aria-controls="ll-node-detail" data-ll-node="${i}"><i aria-hidden="true"></i>${esc(node.label)}</button>`).join('')}</div>
      </div><div class="ll-node-detail" id="ll-node-detail" aria-live="polite">
        <h3>${esc(items[0].label)}</h3><p>${esc(items[0].text)}</p></div>
      </section>`;
  }

  function theory(lesson) {
    const hasRead = api().progress().read.includes(lesson.id);
    const panels = window.Cockpit.exercisesForLesson(lesson.id);
    return `<div class="ll-study-grid">
      <div class="ll-content">
        <section class="ll-card ll-reading" aria-labelledby="ll-theory-heading"><h2 id="ll-theory-heading">${icon('book')} Разбор темы</h2>
        ${lesson.theory.map(block => `<article><h3>${esc(block.title)}</h3><p>${esc(block.text)}</p></article>`).join('')}
        ${exhibit(lesson.exhibit)}</section>
      </div><div class="ll-content">${concepts(lesson)}
      <section class="ll-card ll-next"><h2>${icon('target')} Проверить себя</h2>
      <h3>${esc(lesson.scenario.title)}</h3><p>${esc(lesson.scenario.context)}</p>
      <a class="btn btn-primary" href="${route('practice', lesson)}">${icon('play', 17)} Открыть сценарий</a>
      ${panels.map(panel => `<a class="ll-cockpit-link" href="#cockpit/${panel.id}">${icon('gauge', 17)} В кабину · ${esc(panel.title)}</a>`).join('')}</section></div>
      </div>${lesson.id === 'limits-rvsm' ? altimeterLab() : ''}${lesson.id === 'systems-radio-audio' ? radioLab() : ''}<div class="ll-read-row"><p>${icon('book', 16)} ${api().sourceLink(lesson)}</p>
      <button class="btn btn-secondary ll-read" type="button" data-ll-read ${hasRead ? 'disabled' : ''}>${icon('check', 17)} ${hasRead ? 'Урок изучен' : 'Отметить как изученный'}</button></div>`;
  }

  function answerExplanation(lesson, step) {
    if (!step.page) return esc(step.why);
    const volume = lesson.volume || lesson.part || 1;
    const text = step.why.replace(/ Том \d+, с\. \d+\.$/, '');
    const source = window.SourceDocs.pageLink(volume, step.page, 'Том ' + volume + ', с. ' + step.page);
    return esc(text) + ' ' + source;
  }

  function startRun(steps) {
    return { index: 0, answers: Array(steps.length).fill(null), checked: false };
  }

  function validRun(raw, steps) {
    if (!raw || !Array.isArray(raw.answers) || raw.answers.length !== steps.length ||
        !Number.isInteger(raw.index) || raw.index < 0 || raw.index >= steps.length) return null;
    const answers = raw.answers.map((answer, i) => (
      Number.isInteger(answer) && answer >= 0 && answer < steps[i].options.length ? answer : null
    ));
    const gap = answers.slice(0, raw.index).findIndex(answer => answer === null);
    if (gap >= 0) return { index: gap, answers, checked: false };
    return { index: raw.index, answers, checked: Boolean(raw.checked && answers[raw.index] !== null) };
  }

  function wrongAnswers(answers, steps) {
    return steps.reduce((wrong, step, i) => {
      if (answers[i] !== step.answer) wrong.push(i);
      return wrong;
    }, []);
  }

  function stepTrack(steps, run) {
    return `<div class="ll-track" aria-label="Шаг ${run.index + 1} из ${steps.length}">
      ${steps.map((step, i) => `<span class="${i < run.index || (i === run.index && run.checked)
        ? (run.answers[i] === step.answer ? 'll-hit' : 'll-miss') : i === run.index ? 'll-current' : ''}"></span>`).join('')}</div>`;
  }

  function activeStep(lesson, run) {
    const steps = lesson.scenario.steps;
    const current = steps[run.index];
    const picked = run.answers[run.index];
    const correct = picked === current.answer;
    return `<section class="ll-card ll-practice" aria-label="Прохождение сценария">
      <div class="ll-practice-top"><span class="ll-step-label">Шаг ${run.index + 1} из ${steps.length}</span>
      <a class="ll-ref" href="${route('lesson', lesson)}">${icon('book', 15)} К теории</a></div>
      ${stepTrack(steps, run)}
      <div class="ll-situation"><h2>Ситуация</h2><p>${esc(current.situation)}</p></div>
      ${display(current.display || lesson.scenario.display)}
      ${exhibit(current.exhibit || lesson.scenario.exhibit)}
      <form data-ll-form><fieldset><legend id="ll-question" tabindex="-1">${esc(current.question)}</legend>
        <div class="ll-options">${current.options.map((option, i) => {
          const checked = picked === i;
          const result = run.checked && (i === current.answer ? 'll-option-right' : checked ? 'll-option-wrong' : '');
          return `<label class="ll-option ${result || ''}"><input type="radio" name="ll-answer" value="${i}" ${checked ? 'checked' : ''} ${run.checked ? 'disabled' : ''} required><span>${esc(option)}</span>
            ${result ? `<span class="ll-answer-state">${i === current.answer ? icon('check', 16) + ' Верный ответ' : icon('close', 16) + ' Ваш ответ'}</span>` : ''}</label>`;
        }).join('')}</div></fieldset>
        ${run.checked ? `<div class="ll-feedback ${correct ? 'll-correct' : 'll-incorrect'}" id="ll-feedback" tabindex="-1"><h3>${icon(correct ? 'check' : 'info')} ${correct ? 'Верно' : 'Разбор ответа'}</h3><p>${answerExplanation(lesson, current)}</p></div>` : ''}
        <div class="ll-submit-row"><button class="btn btn-primary" type="submit" ${picked === null ? 'disabled' : ''}>${run.checked ? (run.index === steps.length - 1 ? 'Посмотреть результат' : 'Следующий шаг') : 'Проверить ответ'}</button></div>
      </form></section>`;
  }

  function declension(n, singular, few, many) {
    if (n % 100 >= 11 && n % 100 <= 14) return many;
    if (n % 10 === 1) return singular;
    return n % 10 >= 2 && n % 10 <= 4 ? few : many;
  }

  function resultView(lesson, result) {
    const steps = lesson.scenario.steps;
    const wrong = result.wrongIndices || result.wrong || [];
    const hasWrong = Array.isArray(wrong) && wrong.length > 0;
    const indices = hasWrong ? wrong.filter(i => Number.isInteger(i) && steps[i]) : [];
    const percent = Math.round(100 * result.score / result.total);
    return `<section class="ll-card ll-result"><div class="ll-result-intro">
      <div class="ll-score" style="--ll-score:${percent}%"><span><strong>${result.score}<small>/${result.total}</small></strong><span>верно</span></span></div>
      <div><p class="ll-step-label">Сценарий завершён</p><h2 tabindex="-1" id="ll-result-title">${result.score === result.total ? 'Все ответы верны' : 'Результат попытки'}</h2>
      <p>${indices.length ? `К повторению: ${indices.length} ${declension(indices.length, 'вопрос', 'вопроса', 'вопросов')}.` : 'Результат сохранён в вашем прогрессе.'}</p></div>
      </div>
      ${indices.length ? `<details class="ll-review" open><summary>Разбор ошибок</summary>
        ${indices.map(i => `<article><small>Шаг ${i + 1}</small><h3>${esc(steps[i].question)}</h3><strong>${icon('check', 15)} ${esc(steps[i].options[steps[i].answer])}</strong><p>${answerExplanation(lesson, steps[i])}</p></article>`).join('')}</details>` : ''}
      <div class="ll-result-actions"><button class="btn btn-primary" type="button" data-ll-restart>${icon('reload', 17)} Пройти ещё раз</button>
      <a class="btn btn-secondary" href="${route('lesson', lesson)}">${icon('book', 17)} Повторить теорию</a><a class="ll-ref" href="#progress">Мой прогресс</a></div>
      </section>`;
  }

  function practiceContent(lesson) {
    const steps = lesson.scenario.steps;
    const run = validRun(api().getRun(lesson.id), steps);
    if (run) return activeStep(lesson, run);
    const result = api().progress().results[lesson.id];
    if (result && result.total === steps.length && Number.isInteger(result.score) &&
        result.score >= 0 && result.score <= result.total) return resultView(lesson, result);
    return activeStep(lesson, startRun(steps));
  }

  window.RenderLesson = function renderLesson(id, mode) {
    const lesson = findLesson(id);
    if (!lesson) return '<section class="ll-page"><h1>Урок не найден</h1><a class="btn btn-secondary" href="#theory">Открыть теорию</a></section>';
    return `<div class="ll-page">${pageTop(lesson, mode)}<div id="ll-body">
      ${mode === 'practice' ? practiceContent(lesson) : theory(lesson)}</div></div>`;
  };

  function bindTheory(lesson, host) {
    bindAltimeterLab(host);
    bindRadioLab(host);
    bindExhibits(host);
    const buttons = [...host.querySelectorAll('[data-ll-node]')];
    const detail = host.querySelector('#ll-node-detail');
    const regions = [...host.querySelectorAll('[data-ll-region]')];
    regions.forEach(region => region.addEventListener('click', () => {
      buttons[Number(region.dataset.llRegion)]?.click();
    }));
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        buttons.forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
        regions.forEach(region => region.classList.toggle('ll-selected', Number(region.dataset.llRegion) === index));
        detail.querySelector('h3').textContent = lesson.nodes[index].label;
        detail.querySelector('p').textContent = lesson.nodes[index].text;
      });
    });
    host.querySelector('[data-ll-read]')?.addEventListener('click', event => {
      const button = event.currentTarget;
      api().markRead(lesson.id);
      button.innerHTML = icon('check', 17) + ' Урок изучен';
      button.disabled = true;
    });
  }

  function bindPractice(lesson, host) {
    bindExhibits(host);
    const id = lesson.id;
    const steps = lesson.scenario.steps;
    const run = validRun(api().getRun(id), steps) || startRun(steps);
    const redraw = (html, focus) => {
      host.innerHTML = html;
      bindPractice(lesson, host);
      host.querySelector(focus)?.focus();
    };
    const restart = host.querySelector('[data-ll-restart]');
    if (restart) {
      restart.addEventListener('click', () => {
        const fresh = startRun(steps);
        api().saveRun(id, fresh);
        redraw(activeStep(lesson, fresh), '#ll-question');
      });
      return;
    }
    const form = host.querySelector('[data-ll-form]');
    const submit = form.querySelector('[type="submit"]');
    form.addEventListener('change', event => {
      if (run.checked || !event.target.matches('input[name="ll-answer"]')) return;
      run.answers[run.index] = Number(event.target.value);
      api().saveRun(id, run);
      submit.disabled = false;
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (run.answers[run.index] === null) return;
      if (!run.checked) {
        run.checked = true;
        api().saveRun(id, run);
        redraw(activeStep(lesson, run), '#ll-feedback');
      } else if (run.index < steps.length - 1) {
        run.index += 1;
        run.checked = false;
        api().saveRun(id, run);
        redraw(activeStep(lesson, run), '#ll-question');
      } else {
        const wrong = wrongAnswers(run.answers, steps);
        const score = steps.length - wrong.length;
        api().finish(id, score, steps.length, wrong);
        api().saveRun(id, null);
        redraw(resultView(lesson, { score, total: steps.length, wrongIndices: wrong }), '#ll-result-title');
      }
    });
  }

  window.bindLesson = function bindLesson(id, mode) {
    const lesson = findLesson(id);
    const host = document.getElementById('ll-body');
    if (!lesson || !host) return;
    if (mode === 'practice') bindPractice(lesson, host);
    else bindTheory(lesson, host);
  };
})();
