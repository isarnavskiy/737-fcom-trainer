/* Flightdeck runs as a static app, including directly from a downloaded folder. */
(() => {
  'use strict';
  const course = window.FCOM || [];
  const groups = {
    limits: {title:'Ограничения', number:'01', code:'L', color:'#ff9867', desc:'Условия применения, допуски приборов и ограничения по топливу.'},
    normal: {title:'Нормальные процедуры', number:'02', code:'NP', color:'#78cfbf', desc:'Работа экипажа, перекрёстная проверка и контроль режимов.'},
    extra: {title:'Дополнительные процедуры', number:'03', code:'SP', color:'#b5a2f2', desc:'Воздушные системы, электропитание, навигация и погода.'},
    performance: {title:'Лётные характеристики', number:'04', code:'PD / PI', color:'#8ab9f4', desc:'Чтение таблиц, единицы измерения и выбор исходных данных.'},
    systems: {title:'Системы самолёта', number:'05', code:'SYS', color:'#8bd992', desc:'От дверей и наддува до шасси и сигнализации. Все 15 глав второго тома.'}
  };
  const paths = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5a2.5 2.5 0 0 0 0 5M4 5.5V20a2 2 0 0 0 2 2h14M8 7h8"/>',
    'book-open':'<path d="M3 4.5c3.5-1.3 6.4-.8 9 1.6 2.6-2.4 5.5-2.9 9-1.6v14c-3.5-1.2-6.4-.7-9 1.5-2.6-2.2-5.5-2.7-9-1.5zM12 6v14"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    play:'<path d="m7.8 4.8 12 7.2-12 7.2z"/>',
    chart:'<path d="M3 3v17h18M7 15v-4m5 4V7m5 8V5"/>',
    check:'<path d="m4.5 12.5 5 5 10-11"/>', arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back:'<path d="M20 12H5m6-6-6 6 6 6"/>', chevron:'<path d="m9 5 7 7-7 7"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    circle:'<circle cx="12" cy="12" r="8"/>',plane:'<path d="m3 13 18-9-6 17-3-8z"/>',compass:'<circle cx="12" cy="12" r="9"/><path d="m16.5 7.5-3 6-6 3 3-6z"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    list:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.1m-.1 7h.1m-.1 7h.1"/>',close:'<path d="m6 6 12 12m0-12L6 18"/>',
    reload:'<path d="M20 5v5h-5M4.3 9A8.2 8.2 0 0 1 19 7.2l1 2M4 19v-5h5m10.7 1A8.2 8.2 0 0 1 5 16.8l-1-2"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 9v11"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    flag:'<path d="M5 21V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',route:'<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M5 16V9a3 3 0 0 1 6 0v5a3 3 0 0 0 6 0V8"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',gauge:'<path d="M4 18a10 10 0 1 1 16 0zM12 14l5-7"/><circle cx="12" cy="14" r="1.5"/>',
    clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="4" rx="1"/><path d="M8 12h8m-8 4h6"/>',
    'corner':'<path d="M6 18 18 6m-10 0h10v10"/>', monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    history:'<path d="M3 5v5h5M3.6 9A8.6 8.6 0 1 1 4 17m8-10v6l3 2"/>',
    bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
    sliders:'<path d="M3 7h5m4 0h9M3 17h9m4 0h5"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/>'
  };
  const icon=(name,size=20)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.circle)+'</svg>';
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plural=(n,one,few,many)=>{const a=n%10,b=n%100;return b>=11&&b<=14?many:a===1?one:a>=2&&a<=4?few:many;};
  const byId=id=>course.find(l=>l.id===id);
  const inGroup=id=>course.filter(l=>l.group===id);
  const key='flightdeck-737-progress-v1';
  let state;
  try{state=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{state={};}
  if(typeof state!=='object'||Array.isArray(state)) state={};
  state.read=Array.from(new Set((Array.isArray(state.read)?state.read:[]).filter(byId)));
  for(const field of ['results','runs']) if(!state[field]||typeof state[field]!=='object'||Array.isArray(state[field])) state[field]={};
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{state.sessionOnly=true;}}
  const markRead=id=>{if(!state.read.includes(id))state.read.push(id);save();};
  function finish(id,score,total,wrongIndices){const old=state.results[id];state.results[id]={score,total,wrongIndices:[...wrongIndices],best:Math.max(old?.best??0,score),attempts:(old?.attempts||0)+1,date:new Date().toISOString()};delete state.runs[id];save();}
  function saveRun(id,run){if(run)state.runs[id]=run;else delete state.runs[id];save();}
  const go=route=>{if(location.hash==='#'+route) render();else location.hash=route;};
  window.Flight={go,icon,escape,group:id=>groups[id],progress:()=>state,markRead,finish,saveRun,getRun:id=>state.runs[id]||null,sourceLink:l=>window.SourceDocs?.link(l)||''};
  const total=course.length;
  function stats(){const results=Object.entries(state.results).filter(([id])=>byId(id));const decisions=results.reduce((n,[,r])=>n+r.total,0), correct=results.reduce((n,[,r])=>n+r.score,0);
    return {read:state.read.length, done:results.length, pct:total?Math.round(100*(state.read.length+results.length)/(2*total)):0, accuracy:decisions?Math.round(correct/decisions*100):null,results,redo:results.filter(([,r])=>r.score<r.total)};}
  function current(){const last=state.last&&byId(state.last.id);if(last&&(state.runs[last.id]||!state.read.includes(last.id)||!state.results[last.id]))return last;
    return course.find(l=>state.runs[l.id])||course.find(l=>state.read.includes(l.id)&&!state.results[l.id])||(!state.read.length&&!stats().done&&byId('normal-crew'))||course.find(l=>!state.read.includes(l.id)||!state.results[l.id])||byId('normal-crew')||course[0];}
  function ring(pct){return '<div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="43"/><circle class="ring-value" cx="50" cy="50" r="43" pathLength="100" stroke-dasharray="'+pct+' 100"/></svg><strong>'+pct+'<small>%</small></strong></div>';}
  function statRows(s){return '<div class="stat-row"><span>'+icon('book-open',16)+'Прочитано уроков</span><b>'+s.read+' <i>/ '+total+'</i></b></div><div class="stat-row"><span>'+icon('play',16)+'Пройдено сценариев</span><b>'+s.done+' <i>/ '+total+'</i></b></div>';}
  const nav=[['home','grid','Обзор'],['theory','book-open','Теория'],['scenarios','play','Практика'],['progress','chart','Прогресс']];
  function top(active){document.getElementById('primary-nav').innerHTML=nav.map(([id,ico,title])=>'<a href="#'+id+'" '+(id===active?'aria-current="page"':'')+'>'+icon(ico,17)+'<span>'+title+'</span></a>').join('');
    document.querySelector('.source-button').toggleAttribute('data-current',active==='reference');}
  const hgroup=(title,text)=>'<header class="page-heading"><h1>'+title+'</h1><p>'+text+'</p></header>';
  function moduleCards(){return Object.entries(groups).filter(([id])=>inGroup(id).length).map(([id,g])=>{
    const lessons=inGroup(id),n=lessons.length,read=lessons.filter(l=>state.read.includes(l.id)).length;
    return '<a class="module-card" style="--tint:'+g.color+'" href="#theory/'+id+'"><div class="module-banner"><span class="module-code">'+g.code+'</span><img alt="" src="assets/module-'+id+'.svg"></div><div class="module-info"><h3>'+g.title+'</h3><div class="module-meta">'+icon('book-open',14)+n+' '+plural(n,'урок','урока','уроков')+'<span class="dot-sep">·</span>'+ (read?'Прочитано '+read:'Том '+(id==='systems'?2:1))+'</div></div></a>';}).join('');}
  function dashboard(){const next=current(),s=stats(), resumed=Boolean(state.last||s.read||s.done), crew=next.id==='normal-crew';
    const startMode=state.runs[next.id]||state.read.includes(next.id)&&!state.results[next.id]?'practice':'lesson';
    const title=crew?'Работа экипажа':escape(next.title);
    const heroDesc=crew?'Разберите роли PF и PM и проверьте, кто за что отвечает в кабине Boeing 737.':escape(next.summary);
    return hgroup('Учебный центр','Теория и практика по руководству Boeing 737-800.')+
    '<section class="hero" aria-labelledby="hero-title"><div class="hero-photo"></div><div class="hero-content"><div class="hero-label"><span></span>'+(resumed?'Продолжить обучение':'Рекомендуемое занятие')+'</div><h2 id="hero-title">'+title+'</h2><p>'+heroDesc+'</p><div class="hero-bottom"><a class="btn btn-primary" href="#'+startMode+'/'+next.id+'">'+icon('play',17)+(resumed?'Продолжить занятие':'Начать занятие')+'</a><span class="hero-format">'+icon('layers',16)+'Теория + практика</span></div></div><span class="hero-caption"><i></i>737-800 <em>/</em> FLIGHT DECK</span></section>'+
    '<div class="dash-cols"><section class="module-section"><div class="section-head"><h2>Модули курса</h2><span class="head-count">'+Object.keys(groups).filter(id=>inGroup(id).length).length+'</span></div><div class="module-grid">'+moduleCards()+'</div></section><aside class="progress-aside"><div class="section-head"><h2>Мой прогресс</h2></div><div class="progress-panel"><div class="ring-row">'+ring(s.pct)+'<div><span class="side-kicker">Освоено курса</span><strong>'+(s.pct===100?'Курс пройден':s.pct===0?'Начало курса':'В процессе')+'</strong></div></div>'+statRows(s)+'<a href="#progress" class="panel-link">'+icon('chart',16)+'Открыть журнал</a></div>'+
    '<a class="quick-card" href="#scenarios"><span class="quick-icon">'+icon('compass',23)+'</span><span><b>Практика сценариев</b><small>Выбрать ситуацию</small></span>'+icon('chevron',17)+'</a></aside></div>';}
  function headingMeta(l){return '<span class="source-meta">Том '+(l.volume||1)+' <i>·</i> С. '+escape(l.pages)+'</span>';}
  function statusFor(l,practice){if(practice){const r=state.results[l.id];if(state.runs[l.id])return ['В процессе','running'];if(r)return [r.score+' / '+r.total+' верно',r.score===r.total?'complete':'review'];}
    else if(state.read.includes(l.id))return ['Прочитано','complete'];return ['',''];}
  const catalogState={theory:{q:'',status:'all'},scenarios:{q:'',status:'all'}};
  function catalog(active,groupId){const practice=active==='scenarios',c=catalogState[active],g=groups[groupId];
    const title=practice?'Практика сценариев':'Библиотека теории';
    return hgroup(title,practice?'Выберите ситуацию, примите решение и разберите ответ по FCOM.':'Выберите модуль или найдите тему по названию, прибору или сокращению.')+
      '<div class="catalog-tools"><label class="searchbox">'+icon('search',19)+'<input id="catalog-search" type="search" autocomplete="off" aria-label="Поиск по темам" placeholder="Найти тему или сокращение…" value="'+escape(c.q)+'"></label><label class="status-select"><span class="sr-only">Статус обучения</span>'+icon('sliders',17)+'<select id="catalog-status">'+[['all','Любой статус'],['new','Не начато'],['done',practice?'Завершено':'Прочитано'],...(practice?[['running','В процессе'],['errors','С ошибками']]:[])].map(([k,v])=>'<option value="'+k+'" '+(c.status===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
      '<div class="filter-chips" aria-label="Модули">'+[['','Все модули'],...Object.entries(groups).map(([id,v])=>[id,v.title])].map(([id,label])=>'<a class="chip" '+((g?groupId:'')===id?'aria-current="true"':'')+' href="#'+active+(id?'/'+id:'')+'">'+label+'</a>').join('')+'</div><div id="catalog-list" aria-live="polite"></div>';}
  function itemCard(l,practice){const g=groups[l.group],stat=statusFor(l,practice);
    return '<a href="#'+(practice?'practice':'lesson')+'/'+l.id+'" class="lesson-card" style="--tint:'+g.color+'"><div class="lesson-card-top"><span class="group-tag"><i></i>'+g.title+'</span>'+ (stat[0]?'<span class="mini-state '+stat[1]+'">'+stat[0]+'</span>':'')+'</div><h3>'+escape(practice?l.scenario.title:l.title)+'</h3><p>'+escape(practice?l.scenario.context:l.summary)+'</p><div class="lesson-card-bottom">'+headingMeta(l)+'<span>'+icon(practice?'play':'book-open',15)+(practice?l.scenario.steps.length+' решения':'Теория')+'</span></div></a>';}
  function refreshCatalog(active,groupId){const practice=active==='scenarios',c=catalogState[active],q=c.q.toLowerCase().trim().replace(/ё/g,'е');
    const entries=course.filter(l=>{if(groups[groupId]&&l.group!==groupId)return false;
      const done=practice?!!state.results[l.id]:state.read.includes(l.id),run=practice&&!!state.runs[l.id];
      if(c.status==='done'&&!done||c.status==='new'&&(done||run)||c.status==='running'&&!run||c.status==='errors'&&!(state.results[l.id]?.wrongIndices?.length))return false;
      const hay=[l.title,l.summary,l.scenario.title,l.scenario.context,groups[l.group].title,...l.nodes.map(x=>x.label+' '+x.text),...l.theory.map(x=>x.title+' '+x.text)].join(' ').toLowerCase().replace(/ё/g,'е');
      return q.split(/\s+/).every(w=>hay.includes(w));});
    document.querySelector('#catalog-list').innerHTML='<div class="catalog-caption">'+entries.length+' '+(practice?plural(entries.length,'сценарий','сценария','сценариев'):plural(entries.length,'урок','урока','уроков'))+'</div>'+(entries.length?'<div class="catalog-grid">'+entries.map(l=>itemCard(l,practice)).join('')+'</div>':'<div class="empty">'+icon('search',28)+'<h3>Совпадений нет</h3><p>Попробуйте другое слово или сбросьте фильтры.</p><button class="btn btn-secondary" id="clear-search">Сбросить фильтры</button></div>');
    const clear=document.querySelector('#clear-search');if(clear)clear.onclick=()=>{c.q='';c.status='all';go(active);};}
  function journal(){const s=stats(),rows=s.results.slice().sort((a,b)=>new Date(b[1].date)-new Date(a[1].date));
    return hgroup('Журнал прогресса','Здесь сохраняются прочитанные уроки, последние результаты и темы для повторения.')+
    '<div class="metrics-grid">'+[[s.pct+'%','Освоено курса','target'],[s.read+' / '+total,'Прочитано уроков','book-open'],[s.done+' / '+total,'Пройдено сценариев','play'],[s.accuracy===null?'—':s.accuracy+'%','Верных решений¹','check']].map(([v,t,i])=>'<div class="metric"><span>'+icon(i,18)+t+'</span><strong>'+v+'</strong></div>').join('')+'</div>'+
    '<p class="result-note">¹ По последней завершённой попытке каждого сценария.</p><div class="journal-cols"><section class="journal-box"><h2>Прогресс по модулям</h2>'+Object.entries(groups).map(([id,g])=>{const ls=inGroup(id),n=ls.reduce((t,l)=>t+Number(state.read.includes(l.id))+Number(!!state.results[l.id]),0),max=ls.length*2;
     return '<a class="journal-module" href="#theory/'+id+'" style="--tint:'+g.color+'"><span><b>'+g.title+'</b><small>'+n+' / '+max+'</small></span><i><em style="width:'+(max?n/max*100:0)+'%"></em></i></a>';}).join('')+'</section><section class="journal-box"><h2>К повторению</h2>'+(s.redo.length?s.redo.map(([id,r])=>'<a class="journal-record" href="#practice/'+id+'"><b>'+escape(byId(id).scenario.title)+'</b><span>'+ (r.total-r.score)+' '+plural(r.total-r.score,'ошибка','ошибки','ошибок')+'</span></a>').join(''):'<p>Здесь появятся сценарии, в которых были ошибки. Из списка можно вернуться к разбору.</p>')+'</section></div>'+
    '<section class="journal-box"><h2>Результаты сценариев</h2>'+(rows.length?rows.map(([id,r])=>'<a class="journal-record" href="#practice/'+id+'"><div><b>'+escape(byId(id).scenario.title)+'</b><small>'+escape(new Date(r.date).toLocaleDateString('ru-RU'))+' · '+r.attempts+' '+plural(r.attempts,'попытка','попытки','попыток')+'</small></div><span>'+r.score+' / '+r.total+' верно</span></a>').join(''):'<p>Пройдите первый сценарий, чтобы увидеть результат и разбор ответов.</p><a href="#scenarios" class="btn btn-secondary">'+icon('play',16)+'Выбрать сценарий</a>')+'</section><p class="result-note">'+(state.sessionOnly?'Прогресс доступен в этой вкладке. Браузер заблокировал постоянное сохранение.':'Прогресс сохраняется в этом браузере на этом устройстве.')+'</p>';}
  let lastRoute='';
  function render(){const raw=location.hash.slice(1)||'home';let [route,arg]=raw.split('/');let body,active;
    const main=document.getElementById('main');
    if(route==='home'){active='home';body=dashboard();}
    else if(route==='theory'||route==='scenarios'){active=route;body=catalog(active,arg);}
    else if((route==='lesson'||route==='practice')&&byId(arg)){active=route==='lesson'?'theory':'scenarios';state.last={id:arg,mode:route};save();body=window.RenderLesson(arg,route==='lesson'?'theory':'practice');}
    else if(route==='progress'){active=route;body=journal();}
    else if(route==='reference'){active=route;body=window.SourceDocs.render();}
    else {active='home';body='<div class="empty"><h1>Страница не найдена</h1><a class="btn btn-primary" href="#home">В учебный центр</a></div>';}
    main.innerHTML=body;top(active);document.title=(main.querySelector('h1')?.textContent||'Учебный центр')+' · Flightdeck 737';
    if(route==='theory'||route==='scenarios'){
      const c=catalogState[route];refreshCatalog(route,arg);
      document.getElementById('catalog-search').oninput=e=>{c.q=e.target.value;refreshCatalog(route,arg);};
      document.getElementById('catalog-status').onchange=e=>{c.status=e.target.value;refreshCatalog(route,arg);};
    }else if((route==='lesson'||route==='practice')&&byId(arg))window.bindLesson(arg,route==='lesson'?'theory':'practice');
    else if(route==='reference')window.SourceDocs.bind();
    if(lastRoute!==raw){window.scrollTo(0,0);if(lastRoute)main.focus({preventScroll:true});lastRoute=raw;}
  }
  document.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon,17));
  document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();document.getElementById('main').focus();});
  window.addEventListener('hashchange',render);render();
  window.SourceDocs?.init(()=>{if(/^(#reference|#lesson\/|#practice\/)/.test(location.hash))render();});
})();
