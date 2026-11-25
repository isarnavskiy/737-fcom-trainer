/* Interactive photo atlas and practice sessions for the 737 flight deck. */
(() => {
  'use strict';
  const key = 'flightdeck-737-cockpit-v1';
  const sources = {
    front: {label:'Приборная доска', asset:'assets/cockpit-overview.webp', width:2304,height:1725,
      author:'Kurush Pawar', link:'https://commons.wikimedia.org/wiki/File:VT-JBE_(8050804061).jpg'},
    overhead: {label:'Верхняя панель', asset:'assets/cockpit-overhead.webp', width:2160,height:1728,
      author:'Artem Katranzhi',link:'https://commons.wikimedia.org/wiki/File:Domodedovo_IMG_2473_(8062172282).jpg'}
  };
  // Coordinates use percentages of the full, uncropped source photograph.
  const stations = [
    {key:'pfd', code:'PFD', title:'Основной пилотажный дисплей', text:'На одном экране собраны пространственное положение, скорость, высота и вертикальная скорость. В верхней части расположена строка режимов FMA.', lesson:'sys-efis-altitude', x:22,y:52.3,w:9,h:11, twin:{x:74.5,y:52.8}},
    {key:'nd', code:'ND', title:'Навигационный дисплей', text:'Здесь экипаж видит навигационную обстановку. Содержимое изображения зависит от выбранного режима и масштаба карты.', lesson:'sys-nd-map-plan', x:33.5,y:53.6,w:9,h:11,twin:{x:64.2,y:53.6}},
    {key:'mcp', code:'MCP', title:'Панель управления режимами', text:'В окнах панели видны заданные значения курса, высоты и других параметров. Действующий режим экипаж проверяет по строке FMA на пилотажном дисплее.', lesson:'normal-fma', x:49.7,y:35.8,w:28,h:6},
    {key:'eng', code:'ENG', title:'Индикация двигателей', text:'На верхнем центральном дисплее параметры левого и правого двигателей удобно сравнивать попарно. N1 показывает частоту вращения ротора низкого давления в процентах.', lesson:'sys-engine-rotors', x:49.7,y:53.6,w:9,h:11},
    {key:'cdu', code:'CDU', title:'Пульт ввода и индикации', text:'Через CDU экипаж взаимодействует с вычислителем FMC. Клавиши по краям экрана относятся к соответствующим строкам, а введённые символы появляются в нижней строке.', lesson:'sys-cdu', x:39.1,y:69.2,w:7,h:12,twin:{x:59.2,y:69.2}},
    {key:'oh-elec',deck:'overhead',code:'AC / DC',title:'Электроизмерительная панель',text:'Четыре поля разделены по измеряемой величине. На снимке сверху показаны ток DC и частота AC, снизу — напряжения DC и AC. Подписи указывают единицы каждого показания.',lesson:'sys-power-conversion',x:33,y:29,w:18,h:12},
    {key:'oh-window',deck:'overhead',code:'WINDOW HEAT',title:'Обогрев стёкол кабины',text:'Здесь сгруппированы переключатели обогрева стёкол. Надписи L и R обозначают левую и правую стороны, FWD и SIDE — передние и боковые стёкла.',lesson:'sys-window-probe-heat',x:63,y:23,w:18,h:8},
    {key:'oh-duct',deck:'overhead',code:'DUCT PRESS',title:'Давление в воздушных магистралях',text:'Две стрелки общего указателя позволяют сравнивать давление в левой и правой пневматических магистралях.',lesson:'systems-air-distribution',x:78,y:54,w:8,h:9},
    {key:'oh-alt',deck:'overhead',code:'FLT ALT',title:'Заданная высота полёта',text:'Окно FLT ALT относится к системе наддува. Оно показывает заданную высоту полёта, тогда как текущую барометрическую высоту считывают на пилотажном дисплее.',lesson:'extra-pressure',x:72,y:73.3,w:10,h:6},
    {key:'oh-fuel',deck:'overhead',code:'FUEL',title:'Панель топливных насосов',text:'На панели сгруппированы переключатели топливных насосов и соответствующие им сигнальные табло. Расположение переключателей отражает деление по бакам.',lesson:'sys-fuel',x:24,y:80,w:13,h:8},
    {key:'isfd',code:'ISFD / RMI',title:'Резервные приборы',text:'На центральной доске установлены два прибора. Верхний экран ISFD объединяет резервные показания скорости, высоты и пространственного положения. Нижний круглый прибор показывает навигационные пеленги.',lesson:'extra-altimeter-evidence',x:41.8,y:53.6,w:5.5,h:12.2},
    {key:'oh-cooling',deck:'overhead',code:'EQUIP COOLING',title:'Охлаждение оборудования',text:'Две линии обеспечивают подачу и вытяжку воздуха. Под переключателями раздельные табло OFF. На снимке видны подписи SUPPLY и EXHAUST.',lesson:'systems-air-distribution',x:48.4,y:55.9,w:6.6,h:5.4},
    {key:'oh-temperature',deck:'overhead',code:'ZONE TEMP',title:'Температура по зонам',text:'Три соседние ручки относятся к кабине экипажа, передней и задней частям пассажирского салона. Над каждой есть подпись соответствующей зоны.',lesson:'systems-air-distribution',x:80.3,y:41.3,w:17,h:7.4}
  ];
  const atlasSubjects = {
    pfd:[540,'Индикация скорости на PFD'],nd:[586,'Расширенный и центрированный режимы MAP'],
    mcp:[203,'Боковая навигация'],eng:[365,'Индикация N1'],cdu:[823,'Пульт управления и индикации (CDU)'],
    'oh-elec':[306,'Панель измерительных приборов AC и DC'],'oh-window':[169,'Панель обогрева окон'],
    'oh-duct':[137,'Органы управления и индикаторы отбора воздуха'],'oh-alt':[144,'Панель наддува кабины'],
    'oh-fuel':[1291,'Панель топливной системы'],isfd:[643,'Интегрированный резервный пилотажный индикатор'],
    'oh-cooling':[142,'Панель охлаждения оборудования'],'oh-temperature':[139,'Органы управления и индикаторы кондиционирования воздуха']
  };
  const byKey = id => stations.find(s => s.key === id);
  const exercises = () => window.CockpitPanels?.exercises || [];
  const exercise = () => exercises().find(e => e.id === state.exercise) || exercises()[0];
  const icon = (name, size = 18) => window.Flight.icon(name, size);
  const esc = value => window.Flight.escape(value);
  const photo = deck => (window.flightdeckAsset || (path => path))(sources[deck].asset);
  const deckOf = s => s.deck || 'front';
  const inDeck = deck => stations.filter(s=>deckOf(s)===deck);
  function read() {
    try { const raw = JSON.parse(localStorage.getItem(key)); return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}; }
    catch { return {}; }
  }
  const state = read();
  state.mode = state.mode === 'practice' ? 'practice' : 'explore';
  state.station = byKey(state.station)?.key || stations[0].key;
  state.deck = sources[state.deck] ? state.deck : deckOf(byKey(state.station));
  for (const field of ['runs','results']) {
    if (!state[field] || typeof state[field] !== 'object' || Array.isArray(state[field])) state[field] = {};
  }
  function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch { state.temporary = true; } }
  function progress() {
    const ids = exercises().map(ex => ex.id);
    return {total:ids.length,completed:ids.filter(id => state.results[id]?.attempts > 0).length,
      attempts:ids.reduce((sum,id) => sum + (Number(state.results[id]?.attempts) || 0),0)};
  }
  let zoom = 1, referencePhoto = false;
  const panel = () => window.CockpitPanels;
  function runFor(ex) {
    if (!ex) return null;
    const run = state.runs[ex.id];
    return run && ['locate','panel','done'].includes(run.step) ? run : null;
  }
  function start(ex, fresh = false) {
    if (!ex) return;
    state.mode = 'practice'; state.exercise = ex.id; state.deck=deckOf(byKey(ex.station)); referencePhoto = false; zoom = 1;
    if (!runFor(ex) || fresh) state.runs[ex.id] = {step:'locate', misses:0, lastWrong:'', panel:panel().initial(ex.id)};
    save();
  }
  function reflectSelection() {
    if(!location.hash.startsWith('#cockpit'))return;
    const path='#cockpit/'+(state.mode==='practice'?state.exercise:state.station);
    if(location.hash!==path)history.pushState(null,'',path);
  }
  function selectExercise(id) { start(exercises().find(ex => ex.id === id));reflectSelection(); }
  function complete(ex, nextState) {
    const run = runFor(ex);
    if (!run || run.step !== 'panel') return;
    run.panel = nextState; run.step = 'done';
    const previous = state.results[ex.id] || {};
    const misses = (Number(run.misses) || 0) + (Number(nextState?.misses) || 0);
    run.totalMisses = misses;
    state.results[ex.id] = {attempts:(Number(previous.attempts) || 0) + 1, best:Math.min(previous.best ?? misses, misses),lastMisses:misses};
    referencePhoto = false; save(); repaint('.cp-result-title', true);
  }
  const index = s => inDeck(deckOf(s)).indexOf(s) + 1;
  function photoCredit(deck) {
    const source=sources[deck];
    return '<small class="cp-credit">Фото: <a href="'+esc(source.link)+'" target="_blank" rel="noopener noreferrer">'+esc(source.author)+'</a> · <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 2.0</a> · WebP, сжатие</small>';
  }
  function photoFrame(s, zoomable=false) {
    const view=state.mirrored && s.key===state.station && s.twin ? s.twin : s;
    const open=zoomable?'<button type="button" class="cp-crop cp-open-crop" data-cp-action="focus-zone" aria-label="Увеличить этот прибор на фотографии">':'<div class="cp-crop" aria-hidden="true">';
    return open+'<img src="'+esc(photo(deckOf(s)))+'" alt="" style="--pin-x:'+view.x+'%;--pin-y:'+view.y+'%;--crop-magnification:'+Math.max(310,Math.min(650,10000/(s.w*2.2)))+'%">'+(zoomable?'<span>'+icon('eye',12)+'Увеличить на фото</span></button>':'</div>');
  }
  function marker(s, hidden, selected, twin=false, inactive=false) {
    const n = index(s), position=twin?s.twin:s;
    const side=s.twin?(twin?' · справа, второй пилот':' · слева, командир'):'';
    const label = (hidden ? 'Область '+n : s.code+' · '+s.title)+side;
    return '<button type="button" class="cp-pin'+(twin?' cp-twin':'')+(selected?' is-selected':'')+'" '+(inactive?'disabled ':'')+(twin?'data-cp-twin ':'')+'data-cp-zone="'+s.key+'" aria-label="'+esc(label)+'" '+
      (hidden?'':'aria-pressed="'+selected+'"')+' style="--x:'+position.x+'%;--y:'+position.y+'%;--w:'+s.w+'%;--h:'+s.h+'%">'+
      '<span class="cp-pin-face" aria-hidden="true">'+n+'</span></button>';
  }
  function atlasView(ex, run, locate = false) {
    const ref=ex&&run?.step==='panel', deck=ref?deckOf(byKey(ex.station)):state.deck;
    const shown=inDeck(deck), source=sources[deck], chosen=ref?ex.station:state.station;
    const toolbar=ref?'<span>'+icon('eye',15)+source.label+'</span>':'<div class="cp-views" role="group" aria-label="Ракурс фотографии">'+Object.entries(sources).map(([id,src])=>'<button type="button" data-cp-view="'+id+'" aria-pressed="'+(deck===id)+'">'+src.label+'</button>').join('')+'</div>';
    const pins=shown.map(st=>{
      const active=!locate&&chosen===st.key, inactive=ref&&chosen!==st.key;
      return marker(st,locate,active&&!state.mirrored,false,inactive)+(st.twin?marker(st,locate,active&&state.mirrored,true,inactive):'');
    }).join('');
    return '<section class="cp-photo-card" aria-label="Фотография кабины"><div class="cp-photo-tools">'+toolbar+'<div class="cp-zoom" aria-label="Масштаб фотографии">'+
      '<button type="button" data-cp-action="zoom-out" aria-label="Уменьшить фотографию"'+(zoom<=1?' disabled':'')+'>−</button>'+
      '<output aria-live="polite">'+Math.round(zoom*100)+'%</output><button type="button" data-cp-action="zoom-in" aria-label="Увеличить фотографию"'+(zoom>=3?' disabled':'')+'>+</button></div></div>'+
      '<div class="cp-viewport" role="region" tabindex="0" aria-label="Фотография. При увеличении перемещайте её прокруткой или клавишами со стрелками." style="--ratio:'+source.width+' / '+source.height+'">'+
      '<div class="cp-film" style="width:'+zoom*100+'%"><img width="'+source.width+'" height="'+source.height+'" src="'+esc(photo(deck))+'" alt="'+(deck==='front'?'Приборная доска Boeing 737-800, вид из кабины':'Верхняя панель Boeing 737NG крупным планом')+'">'+pins+'</div></div>'+
      '<div class="cp-photo-foot"><div class="cp-station-list" aria-label="'+(locate?'Области на фотографии':'Выбор прибора')+'">'+shown.map(st=>
        '<button type="button" class="cp-zone-key" data-cp-zone="'+st.key+'"'+(ref&&chosen!==st.key?' disabled':'')+(!locate?' aria-pressed="'+(chosen===st.key)+'"':'')+
        (locate?' aria-label="Область '+index(st)+'"':'')+'><b>'+index(st)+'</b>'+(!locate?'<span>'+st.code+'</span>':'')+'</button>').join('')+'</div>'+
      (!locate&&!ref?'<button type="button" class="cp-jump-detail" data-cp-action="show-instrument">Подробнее о '+esc(byKey(chosen).code)+' '+icon('chevron',13)+'</button>':'')+photoCredit(deck)+'</div></section>';
  }
  function stationLinks(st,ex) {
    const [page,title]=atlasSubjects[st.key];
    const topic=window.FcomIndex?.topics?.find(t=>t.volume===2&&t.page===page&&t.title===title);
    const pages=ex?.pages || String(page);
    const source=window.SourceDocs?.link({part:2,pages}) || '<a href="#reference/2/'+page+'">FCOM · том 2 · с. '+esc(pages)+'</a>';
    return '<div class="cp-related">'+(st.lesson?'<a class="cp-lesson-link" href="#lesson/'+st.lesson+'">'+icon('book-open',15)+'Урок по теме</a>':'')+
      (topic?'<a class="cp-lesson-link" href="#topic/'+esc(topic.id)+'">'+icon('layers',15)+'Тема в атласе FCOM</a>':'')+
      '<div class="cp-doc-links">'+source+'</div></div>';
  }
  function atlasDetail() {
    const s = byKey(state.station);
    const ex = exercises().find(e=>e.station===s.key);
    return '<aside class="cp-rail cp-info"><div class="cp-rail-top"><span class="cp-station-code">'+esc(s.code)+'</span><span>Прибор '+index(s)+' из '+inDeck(deckOf(s)).length+'</span></div>'+
      '<h2 id="cp-instrument-name" tabindex="-1">'+esc(s.title)+'</h2>'+photoFrame(s,true)+'<p>'+esc(s.text)+'</p>'+
      (ex?'<button type="button" class="btn btn-primary" data-cp-start="'+esc(ex.id)+'">'+icon('play',16)+(runFor(ex)?.step==='done'?'Открыть результат':runFor(ex)?'Продолжить задание':'Задание на приборе')+'</button>':'')+
      stationLinks(s,ex)+'<button type="button" class="cp-return-photo" data-cp-action="return-photo">К фотографии</button></aside>';
  }
  function taskSelector(ex) {
    return '<div class="cp-assignment"><label for="cp-exercise">Упражнение</label><select id="cp-exercise">'+exercises().map(item=>
      '<option value="'+esc(item.id)+'"'+(item.id===ex.id?' selected':'')+'>'+esc(item.title)+(state.results[item.id]?.attempts?' · пройдено':'')+'</option>').join('')+'</select></div>';
  }
  function stepIndicator(step) {
    const n = {locate:1,panel:2,done:3}[step];
    return '<ol class="cp-steps" aria-label="Этапы упражнения">'+['Найти','Выполнить','Разбор'].map((t,i)=>
      '<li class="'+(i+1===n?'is-current':i+1<n?'is-done':'')+'"'+(i+1===n?' aria-current="step"':'')+'><span>'+(i+1<n?icon('check',13):i+1)+'</span>'+t+'</li>').join('')+'</ol>';
  }
  function exerciseBrief(ex,run) {
    const st = byKey(ex.station), locate=run.step==='locate';
    const wrong = byKey(run.lastWrong);
    return '<aside class="cp-rail cp-brief">'+taskSelector(ex)+stepIndicator(run.step)+
      '<div class="cp-brief-content"><span class="cp-task-label">'+(locate?'На фотографии':'На приборе')+'</span><h2 tabindex="-1" class="cp-task-title">'+(locate?'Найдите прибор':'Выполните действие')+'</h2><p>'+esc(locate?ex.find:ex.action)+'</p>'+
      (locate&&wrong?'<p class="cp-error" role="status">'+icon('info',16)+'<span>Вы выбрали '+esc(wrong.code)+(run.lastWrongTwin?' со стороны второго пилота':'')+'. Попробуйте другую область.</span></p>':'')+
      (!locate?photoFrame(st)+'<button type="button" class="btn btn-secondary cp-photo-toggle" data-cp-action="toggle-photo">'+icon(referencePhoto?'panel':'eye',15)+(referencePhoto?'Вернуться к прибору':'Посмотреть место в кабине')+'</button>':'')+'</div>'+
      (locate?'':photoCredit(deckOf(st)))+stationLinks(st,ex)+'</aside>';
  }
  function resultView(ex, run) {
    const result=state.results[ex.id] || {}, stat=progress();
    const next=exercises().find(t=>t.id!==ex.id&&!state.results[t.id]?.attempts);
    return '<section class="cp-result"><div class="cp-result-mark">'+icon('check',32)+'</div><div><h2 class="cp-result-title" tabindex="-1">Упражнение пройдено</h2><h3>'+esc(ex.title)+'</h3><p>'+esc(ex.explanation)+'</p><div class="cp-scores"><span>Ошибки <b>'+Number(run.totalMisses||0)+'</b></span><span>Попытки <b>'+Number(result.attempts||1)+'</b></span><span>Пройдено <b>'+stat.completed+' / '+stat.total+'</b></span></div>'+
      '<div class="cp-actions">'+(next?'<button type="button" data-cp-start="'+esc(next.id)+'" class="btn btn-primary">'+icon('play',16)+'Следующее упражнение</button>':'')+
      '<button type="button" data-cp-action="again" class="btn btn-secondary">'+icon('reload',16)+'Пройти ещё раз</button><button type="button" class="cp-text-btn" data-cp-action="mode-explore">В кабину</button></div></div></section>';
  }
  function render(target) {
    if(target){
      const namedExercise=exercises().find(item=>item.id===target);
      const namedStation=byKey(target);
      if(namedExercise)start(namedExercise);
      else if(namedStation){state.mode='explore';state.station=namedStation.key;state.deck=deckOf(namedStation);state.mirrored=false;referencePhoto=false;zoom=1;save();}
      else if(target==='practice')start(exercise());
    }
    const ex=exercise(), practicing=state.mode==='practice'&&!!ex;
    if(practicing&&!runFor(ex))start(ex);
    const run=practicing?runFor(ex):null;
    let content='';
    if(!practicing)content='<div class="cp-layout">'+atlasView()+atlasDetail()+'</div>';
    else if(run.step==='done')content='<div class="cp-layout">'+resultView(ex,run)+'<aside class="cp-rail">'+taskSelector(ex)+stepIndicator('done')+stationLinks(byKey(ex.station),ex)+'</aside></div>';
    else {
      const activePanel = run.step==='panel'&&!referencePhoto;
      const main=activePanel?'<section class="cp-panel-workspace" aria-label="Интерактивный прибор">'+panel().render(ex.id,run.panel)+'</section>':atlasView(ex,run,run.step==='locate');
      content='<div class="cp-layout cp-practice">'+main+exerciseBrief(ex,run)+'</div>';
    }
    return '<section id="cp-station" class="cp-root"><header class="cp-head"><div class="page-heading"><h1>Кабина Boeing 737-800</h1><p>'+(practicing?'Найдите нужный прибор и выполните задание на его панели.':'Выберите прибор на одном из двух снимков. Можно рассмотреть детали, открыть нужную страницу FCOM и попробовать прибор в работе.')+'</p></div>'+
      '<div class="cp-modes" role="group" aria-label="Режим кабины"><button type="button" aria-pressed="'+!practicing+'" data-cp-action="mode-explore">'+icon('eye',16)+'Осмотр</button><button type="button" aria-pressed="'+practicing+'" data-cp-action="mode-practice">'+icon('target',16)+'Практика</button></div></header>'+
      content+(state.temporary?'<p class="cp-source-note">В этом браузере прогресс доступен до закрытия вкладки.</p>':'')+'</section>';
  }
  function currentView() { return document.querySelector('#cp-station'); }
  function repaint(focus, toTop=false, preserveScroll=false) {
    const old=currentView();
    if(!old)return;
    const oldView=old.querySelector('.cp-viewport');
    const scroll=preserveScroll&&oldView?[oldView.scrollLeft,oldView.scrollTop]:null;
    old.outerHTML=render(); bind();
    const view=currentView(), frame=view?.querySelector('.cp-viewport');
    if(scroll&&frame){frame.scrollLeft=scroll[0];frame.scrollTop=scroll[1];}
    const target=focus&&view?.querySelector(focus);
    if(target)target.focus({preventScroll:!toTop});
  }
  function updateZoom(root,direction) {
    const frame=root.querySelector('.cp-viewport'), film=frame?.querySelector('.cp-film');
    if(!frame||!film)return;
    const levels=[1,1.5,2,3], next=levels[levels.indexOf(zoom)+direction];
    if(!next)return;
    const centerX=(frame.scrollLeft+frame.clientWidth/2)/film.clientWidth;
    const centerY=(frame.scrollTop+frame.clientHeight/2)/film.clientHeight;
    zoom=next;film.style.width=zoom*100+'%';
    frame.scrollLeft=centerX*film.clientWidth-frame.clientWidth/2;
    frame.scrollTop=centerY*film.clientHeight-frame.clientHeight/2;
    root.querySelector('.cp-zoom output').textContent=Math.round(zoom*100)+'%';
    root.querySelector('[data-cp-action="zoom-in"]').disabled=zoom===3;
    root.querySelector('[data-cp-action="zoom-out"]').disabled=zoom===1;
    if(zoom===1||zoom===3)frame.focus({preventScroll:true});
  }
  function selectZone(s, ex,run,fromPhoto,twin) {
    if(!s)return;
    const selector=fromPhoto?'.cp-pin[data-cp-zone="'+s.key+'"]'+(twin?'[data-cp-twin]':':not([data-cp-twin])'):'.cp-zone-key[data-cp-zone="'+s.key+'"]';
    if(state.mode!=='practice'){
      state.station=s.key;state.mirrored=twin;save();reflectSelection();
      repaint(selector,false,true);
      if(window.matchMedia('(max-width:700px)').matches){
        const name=currentView()?.querySelector('#cp-instrument-name');
        name?.focus({preventScroll:true});name?.scrollIntoView({block:'start'});
      }
      return;
    }
    if(run?.step==='panel'){
      if(s.key===ex.station){referencePhoto=false;repaint('.cp-task-title',false);}
      return;
    }
    if(run?.step!=='locate')return;
    if(s.key===ex.station&&!twin){run.step='panel';run.lastWrong='';state.station=s.key;state.mirrored=twin;referencePhoto=false;save();repaint('.cp-task-title',true);}
    else {run.misses++;run.lastWrong=s.key;run.lastWrongTwin=twin;save();repaint(selector,false,true);}
  }
  function bindDrag(frame) {
    if(!frame)return;
    let drag=null, suppressClick=false;
    frame.addEventListener('pointerdown',event=>{
      if(zoom===1||event.pointerType==='touch'||event.button!==0)return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:frame.scrollLeft,top:frame.scrollTop,active:false};
    });
    frame.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;
      if(!event.buttons){drag=null;return;}
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.active&&Math.hypot(dx,dy)<5)return;
      if(!drag.active){drag.active=true;frame.setPointerCapture(event.pointerId);frame.classList.add('is-panning');}
      frame.scrollLeft=drag.left-dx;frame.scrollTop=drag.top-dy;event.preventDefault();
    });
    const stop=()=>{if(drag?.active)suppressClick=true;drag=null;frame.classList.remove('is-panning');};
    frame.addEventListener('pointerup',stop);
    frame.addEventListener('pointercancel',()=>{drag=null;frame.classList.remove('is-panning');});
    frame.addEventListener('pointerdown',()=>{suppressClick=false;},true);
    frame.addEventListener('click',event=>{if(suppressClick){event.stopPropagation();event.preventDefault();suppressClick=false;}},true);
  }
  function bind() {
    const root=currentView(); if(!root || root.dataset.bound)return;
    root.dataset.bound='1';
    bindDrag(root.querySelector('.cp-viewport'));
    const ex=exercise(),run=ex?runFor(ex):null;
    if(state.mode==='practice'&&run?.step==='panel'&&!referencePhoto){
      const box=root.querySelector('.cp-panel-workspace');
      if(box)panel().bind(box,ex.id,run.panel,next=>{run.panel=next;save();},next=>complete(ex,next));
    }
    root.querySelector('#cp-exercise')?.addEventListener('change',event=>{selectExercise(event.target.value);repaint('#cp-exercise');});
    root.addEventListener('click',event=>{
      const target=event.target.closest('button'); if(!target||!root.contains(target))return;
      if(target.dataset.cpView){
        const deck=target.dataset.cpView;if(!sources[deck])return;
        if(deck!==state.deck){state.deck=deck;zoom=1;if(state.mode!=='practice'){state.station=inDeck(deck)[0].key;state.mirrored=false;reflectSelection();}save();repaint('[data-cp-view="'+deck+'"]');}
        return;
      }
      if(target.dataset.cpZone){selectZone(byKey(target.dataset.cpZone),ex,run,target.classList.contains('cp-pin'),target.hasAttribute('data-cp-twin'));return;}
      if(target.dataset.cpStart){selectExercise(target.dataset.cpStart);repaint('.cp-task-title',true);return;}
      switch(target.dataset.cpAction){
        case 'mode-explore': state.mode='explore';state.deck=deckOf(byKey(state.station));referencePhoto=false;zoom=1;save();reflectSelection();repaint('[data-cp-action="mode-explore"]');break;
        case 'mode-practice': start(exercises().find(item=>item.station===state.station) || ex);reflectSelection();repaint('[data-cp-action="mode-practice"]');break;
        case 'show-instrument':root.querySelector('#cp-instrument-name')?.focus();break;
        case 'focus-zone': {
          const st=byKey(state.station),pos=state.mirrored&&st.twin?st.twin:st;
          zoom=3;repaint();const view=currentView(),frame=view.querySelector('.cp-viewport'),film=view.querySelector('.cp-film');
          frame.scrollLeft=film.clientWidth*pos.x/100-frame.clientWidth/2;
          frame.scrollTop=film.clientHeight*pos.y/100-frame.clientHeight/2;
          view.querySelector('.cp-pin.is-selected')?.focus({preventScroll:true});
          view.querySelector('.cp-photo-card')?.scrollIntoView({block:'start'});break;
        }
        case 'return-photo': {
          const pin=root.querySelector('.cp-pin.is-selected');
          pin?.focus({preventScroll:true});root.querySelector('.cp-photo-card')?.scrollIntoView({block:'start'});break;
        }
        case 'zoom-in':updateZoom(root,1);break;
        case 'zoom-out':updateZoom(root,-1);break;
        case 'toggle-photo':referencePhoto=!referencePhoto;zoom=1;repaint('.cp-photo-toggle');break;
        case 'again':start(ex,true);repaint('.cp-task-title',true);break;
      }
    });
  }
  const relatedLessons = {
    pfd:['extra-altimeter-evidence','limits-rvsm'],nd:['extra-route'],mcp:['systems-fma-modes','sys-afs-roles'],
    eng:['sys-engine-displays'],cdu:['normal-cdu','normal-fmc-preflight-data','sys-fmc-messages'],
    'oh-elec':['extra-electric','sys-standby-supply'],'oh-alt':['sys-cabin-pressure-path'],'oh-fuel':['sys-fuel-measurements']
  };
  function exercisesForLesson(id) {
    return exercises().filter(ex=>byKey(ex.station)?.lesson===id||relatedLessons[ex.station]?.includes(id));
  }
  window.Cockpit={render,bind,progress,exercisesForLesson};
})();
