/* Local instrument exercises. Source pages refer to the second volume of the course PDF. */
(() => {
  'use strict';

  const exercises = [
    {id:'pfd-read', station:'pfd', title:'Считать скорость и высоту', find:'Найдите основной пилотажный дисплей командира.', action:'Считайте текущие приборную скорость и барометрическую высоту с двух шкал PFD. Запишите их под экраном.', explanation:'Белые окна по центру шкал показывают 250 узлов и 12 400 футов. Пурпурные значения сверху обозначают выбранные скорость и высоту.', pages:'537–541, 562–563'},
    {id:'nd-range', station:'nd', title:'Изменить масштаб карты', find:'Найдите навигационный дисплей командира.', action:'На пульте EFIS установите дальность 40 NM. Наблюдайте, как меняются положение точек и отметка на линии пути.', explanation:'При выбранной дальности 40 NM средняя отметка соответствует 20 NM. Изменение масштаба меняет размер участка карты на экране.', pages:'588–589, 653–654'},
    {id:'mcp-heading', station:'mcp', title:'Выставить заданный курс', find:'Найдите панель выбора режимов MCP над основными дисплеями.', action:'Селектором HEADING выставьте 005°. Исходная установка 358°. Проследите за цифрами при переходе через север.', explanation:'В окне HEADING отображается выбранный курс 005°. На MCP его задаёт поворот селектора курса. Текущий курс самолёта в этом упражнении остаётся прежним.', pages:'203–204'},
    {id:'eng-compare', station:'eng', title:'Сопоставить показания N1', find:'Найдите верхний центральный дисплей с показаниями двигателей.', action:'На дисплее выберите фактическое значение N1 двигателя с большими оборотами вентилятора. Нажмите прямо на число.', explanation:'Справа текущее N1 двигателя 2 составляет 84,1%, слева у двигателя 1 — 82,4%. Зелёные 95,6% над шкалами обозначают опорные значения.',pages:'360, 365–366'},
    {id:'electric-meter', station:'oh-elec', title:'Измерить частоту генератора', find:'На верхней панели найдите приборы измерения AC и DC.', action:'Выберите источник GEN 2 правым селектором измерительных приборов AC. Введите частоту, которая появится в окне CPS FREQ.', explanation:'Селектор измерительных приборов выбирает источник для частотомера и измерителей переменного тока. В этом задании для GEN 2 частота равна 402 Гц, напряжение 116 В.',pages:'306, 308–310'}
  ];

  const ranges = [5,10,20,40,80,160,320,640];
  const rangeAngles = [-90,-62,-31,0,31,62,90,113];
  const sources = [
    {name:'GEN 1',freq:'400',current:'36',volts:'115'},
    {name:'APU GEN',freq:'',current:'',volts:''},
    {name:'GEN 2',freq:'402',current:'38',volts:'116'}
  ];
  const initial = id => ({
    misses:0, error:false,
    ...(id==='mcp-heading' ? {heading:358} : id==='nd-range' ? {rangeIndex:1} : id==='eng-compare' ? {chosen:''} : id==='electric-meter' ? {sourceIndex:0,frequency:''} : {speed:'',altitude:''})
  });
  const angle = (x,y,r,deg) => {
    const rad=deg*Math.PI/180;
    return [x+r*Math.cos(rad),y+r*Math.sin(rad)];
  };
  const point=(p)=>p.map(v=>v.toFixed(2)).join(',');
  const arc=(x,y,r,a,b)=>'M'+point(angle(x,y,r,a))+' A'+r+','+r+' 0 '+(b-a>180?1:0)+' 1 '+point(angle(x,y,r,b));
  const line=(a,b,color='#eee',stroke=1)=>'<path d="M'+point(a)+' L'+point(b)+'" fill="none" stroke="'+color+'" stroke-width="'+stroke+'"/>';
  const label=(x,y,txt,size=13,color='#eef1ef',anchor='middle',attr='')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" text-anchor="'+anchor+'" '+attr+'>'+txt+'</text>';
  const rect=(x,y,w,h,fill,stroke='none',rx=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'" stroke="'+stroke+'"/>';
  const mag='#ee66f4',green='#74ee6d',cyan='#69d3ef';
  const svg=(box,title,body)=>'<svg class="cp-screen" viewBox="'+box+'" role="img" aria-label="'+title+'"><title>'+title+'</title>'+body+'</svg>';
  const pad=v=>String(v).padStart(3,'0');
  const numberText=v=>String(v??'').replace(/[^0-9 ]/g,'').slice(0,8);
  const normalize=v=>Number(String(v??'').replace(/\s/g,''));
  const feedback=msg=>'<p class="cp-feedback" role="status" aria-live="polite">'+(msg||'')+'</p>';
  const check=label=>'<button class="btn btn-primary cp-check" type="submit">'+label+'</button>';
  const screws='<i class="cp-screw s1" aria-hidden="true"></i><i class="cp-screw s2" aria-hidden="true"></i><i class="cp-screw s3" aria-hidden="true"></i><i class="cp-screw s4" aria-hidden="true"></i>';
  const frame=content=>'<div class="cp-bezel">'+screws+'<div class="cp-glass">'+content+'</div></div>';

  function pfd() {
    let b='<defs><clipPath id="cp-horizon-cut"><rect x="86" y="60" width="179" height="181" rx="15"/></clipPath></defs>';
    b+=rect(8,8,344,305,'#06090b');
    // The PFD is a frozen frame. Only the report underneath it is editable.
    b+=rect(83,12,184,22,'#282d2c')+line([142,12],[142,34],'#a8aba8')+line([200,12],[200,34],'#a8aba8');
    b+=label(114,25,'MCP SPD',10,green)+label(171,25,'HDG SEL',10,green)+label(233,25,'V/S',11,green);
    b+=label(175,54,'CMD',14,green)+label(54,51,'270',17,mag)+label(296,51,'14000',16,mag);
    b+='<g clip-path="url(#cp-horizon-cut)">'+rect(86,60,179,97,'#1474b9')+rect(86,157,179,90,'#835220')+line([83,157],[266,157],'#f8f3d6',2);
    for(let i=-7;i<=7;i++){if(!i)continue;const y=157-i*11,w=Math.abs(i)%2?12:25;b+=line([175-w,y],[175+w,y],'#fcf7df',1.2);
      if(Math.abs(i)===4)b+=label(136,y+3,'10',9)+label(214,y+3,'10',9);}
    b+='<path d="M91 146h42v7h9v-11h-51zm168 0h-42v7h-9v-11h51z" fill="#101513" stroke="#f9eeb9" stroke-width="1.4"/>';
    b+=rect(172,143,7,6,'#161615','#fff0b5')+line([175,122],[175,175],mag,2)+line([150,146],[200,146],mag,2.1);
    for(const d of [-60,-45,-30,-20,-10,0,10,20,30,45,60])b+=line(angle(175,148,80,d-90),angle(175,148,d%30?85:89,d-90),'#faf8e5',1.5);
    b+='<path d="M170 65l5-9 5 9zM170 76l5-9 5 9z" fill="none" stroke="#fff" stroke-width="1.4"/></g>';
    b+=rect(26,60,46,182,'#3e4546')+rect(278,60,48,182,'#3e4546');
    for(let i=-4;i<=4;i++){const y=151-i*20; b+=line([65,y],[72,y]);if(i%2===0)b+=label(61,y+4,250+i*10,12,'#fff','end');
      b+=line([278,y],[285,y]);if(i%2===0)b+=label(322,y+4,12400+i*100,11,'#fff','end');}
    b+='<path d="M18 139h42l9 12-9 12H18zM327 138h-39l-10 13 10 13h39z" fill="#020407" stroke="#f2f3f2" stroke-width="1.8"/>';
    b+=label(42,157,'250',17)+label(305,156,'12400',14);
    b+='<path d="M73 104h8v13h-8zm202-42h-8v8h8z" fill="none" stroke="'+mag+'" stroke-width="1.8"/>';
    b+='<path d="M337 66l11 22v126l-11 24z" fill="#41484a"/>';
    for(let y of [82,104,124,151,178,198,218])b+=line([337,y],[342,y]);
    b+=line([338,123],[347,145],'#fff',2)+label(339,60,'1.0',9)+label(300,258,'1013 HPA',11,green);
    b+='<path d="M68 306 Q175 183 282 306" fill="#333b3d" stroke="#9aa0a4"/>';
    for(let i=-4;i<=4;i++){const deg=-90+i*10;b+=line(angle(175,358,111,deg),angle(175,358,119,deg),'#fff');}
    b+=label(129,266,'34',11)+label(175,255,'N',13)+label(220,266,'02',11)+line([175,251],[175,265],'#fff',1.5)+label(175,298,'MAG',10,green);
    return svg('0 0 360 312','PFD. Белые окна: скорость 250 узлов, высота 12 400 футов; выбранные пурпурные 270 и 14 000.',b);
  }

  function nd(rangeIndex) {
    const range=ranges[rangeIndex];
    const cx=180,cy=260,R=202;
    let b='<defs><clipPath id="cp-map-cut"><rect x="6" y="59" width="348" height="206"/></clipPath></defs>';
    b+=rect(0,0,360,302,'#040709')+label(12,22,'GS 308 TAS 300',12,'#fff','start')+label(12,39,'248°/12',12,'#fff','start');
    b+=label(124,37,'TRK',12,green)+rect(146,19,55,25,'#040709','#cad2ce')+label(173,37,'350',17)+label(223,37,'MAG',12,green);
    b+=label(347,19,'KELAN',12,mag,'end')+label(347,35,'12.0 NM',11,'#fff','end');
    b+='<g clip-path="url(#cp-map-cut)"><path d="'+arc(cx,cy,R,206,334)+'" fill="none" stroke="#e6e7e7" stroke-width="1.7"/>';
    for(let n=-12;n<=12;n++){const deg=-90+n*5;b+=line(angle(cx,cy,R,deg),angle(cx,cy,R-(n%2?5:10),deg),'#e6e7e7');
      if(n%6===0){const p=angle(cx,cy,R-23,deg);b+=label(p[0].toFixed(1),p[1].toFixed(1),Math.round((350+n*5+360)%360/10),11);}}
    const scale=R/range;
    const route=[[0,0],[3,11.62],[-1.5,23.5],[6,45]].map(([x,y])=>[cx+x*scale,cy-y*scale]);
    b+='<path d="M'+route.map(point).join(' L')+'" fill="none" stroke="'+mag+'" stroke-width="2.3"/>';
    ['','KELAN','ROKIM','LEMOT'].forEach((n,i)=>{if(!i)return;const [x,y]=route[i];if(x<6||x>353||y<65||y>258)return;
      b+='<path d="m'+x.toFixed(1)+' '+(y-5).toFixed(1)+' 5 5 -5 5 -5-5z" fill="#040709" stroke="'+(i===1?mag:'#e9eced')+'"/>';
      b+=label((x+9).toFixed(1),(y+1).toFixed(1),n,10,i===1?mag:'#fff','start');});
    b+=line([cx,cy-5],[cx,cy-R],'#efefe8',1)+line([cx-5,cy-R/2],[cx+5,cy-R/2],'#f4f3e7',1.2);
    b+=label(cx-9,cy-R/2+3,String(range/2),12,'#fff','end')+'</g>';
    b+='<path d="m180 250 -7 16 7-4 7 4z" fill="#040709" stroke="#fff" stroke-width="1.8"/>';
    b+=label(13,285,'FMC L',11,green,'start');
    return svg('0 0 360 302','Навигационная карта. Выбранный масштаб '+range+' морских миль, половинная отметка '+range/2+'.',b);
  }

  function engineDial(cx,cy,r,reading,ref,egt) {
    const valAngle=egt?reading/1000*205:reading/100*180;
    let b='<path d="M'+cx+','+cy+' L'+point(angle(cx,cy,r,0))+' A'+r+','+r+' 0 0 1 '+point(angle(cx,cy,r,valAngle))+' Z" fill="#777c79"/>';
    b+='<path d="'+arc(cx,cy,r,0,201)+'" fill="none" stroke="#d1d9d6" stroke-width="1.6"/>';
    for(let i=0;i<=10;i++){const a=i*18; b+=line(angle(cx,cy,r,a),angle(cx,cy,r-(i%2?3:5),a),'#e1e6e2');
      if(!egt&&i%2===0){const p=angle(cx,cy,r-11,a);b+=label(p[0].toFixed(1),p[1]+3,i,9,'#e1e5e0');}}
    b+=line([cx,cy],angle(cx,cy,r-1,valAngle),'#fff',2.2);
    if(!egt)b+=line(angle(cx,cy,r-3,ref*1.8),angle(cx,cy,r+7,ref*1.8),'#65f669',2);
    b+=line(angle(cx,cy,r-2,199),angle(cx,cy,r+4,199),'#ff5148',2.4);
    return b;
  }

  function engineDisplay(chosen){
    let b=rect(0,0,360,268,'#040709')+label(15,21,'TAT  −12°C',12,cyan,'start')+label(164,21,'CRZ',13,green);
    b+=engineDial(91,91,49,82.4,95.6,false)+engineDial(258,91,49,84.1,95.6,false);
    b+=engineDial(91,194,43,562,0,true)+engineDial(258,194,43,570,0,true);
    b+=label(180,128,'N₁',13,cyan)+label(180,217,'EGT',13,cyan);
    const screen=svg('0 0 360 268','Показания двигателей. Нажмите на одно из шести чисел.',b);
    const controls=[['r1',119,46,'95.6','Опорное N1 двигателя 1'],['r2',286,46,'95.6','Опорное N1 двигателя 2'],['n1',119,78,'82.4','Текущее N1 двигателя 1'],['n2',286,78,'84.1','Текущее N1 двигателя 2'],['t1',119,180,'562','EGT двигателя 1'],['t2',286,180,'570','EGT двигателя 2']];
    return '<div class="cp-eng-screen">'+screen+controls.map(([key,x,y,v,a])=>'<button type="button" class="cp-value '+(key[0]==='r'?'cp-refvalue':'')+'" aria-pressed="'+(chosen===key)+'" data-cp-reading="'+key+'" aria-label="'+a+', '+v+'" style="left:'+x/3.6+'%;top:'+y/2.68+'%">'+v+'</button>').join('')+'</div>';
  }

  const segments=[
    '3,0 15,0 17,2 14,4 4,4 2,2','15,4 18,2 18,13 16,15 14,13','16,16 18,18 18,28 15,26 14,18','4,27 14,27 17,29 15,31 3,31 1,29','1,18 3,16 4,18 4,26 1,29 0,27','1,2 4,4 4,13 2,15 0,13','4,14 14,14 16,16 14,18 4,18 2,16'
  ];
  const maps=['012345','12','01643','01236','5612','05623','056423','012','0123456','012356'];
  function headingDigits(heading){
    return '<svg class="cp-digits" viewBox="0 0 78 39" role="img" aria-label="Выбранный курс '+pad(heading)+' градусов">'+pad(heading).split('').map((d,i)=>'<g transform="translate('+(4+i*24)+' 4)">'+segments.map((points,j)=>'<polygon points="'+points+'" fill="'+(maps[Number(d)].includes(String(j))?'#ffe2ab':'#322d25')+'"/>').join('')+'</g>').join('')+'</svg>';
  }

  function turnControl(id,state){
    const hdg=id==='mcp-heading';
    const value=hdg?state.heading:ranges[state.rangeIndex];
    const valText=hdg?pad(value)+'°':value+' NM';
    const rotation=hdg?(value-358)*5:rangeAngles[state.rangeIndex];
    const a11y=hdg?'Селектор заданного курса':'Селектор дальности карты';
    const dial='<div class="cp-dial-wrap">'+(hdg?'':'<div class="cp-range-scale" aria-hidden="true">'+ranges.map((r,i)=>{const p=angle(50,50,43,rangeAngles[i]-90);return '<span style="left:'+p[0]+'%;top:'+p[1]+'%">'+r+'</span>';}).join('')+'</div>')+
      '<div class="cp-knob" role="spinbutton" tabindex="0" aria-label="'+a11y+'" aria-valuemin="'+(hdg?0:5)+'" aria-valuemax="'+(hdg?359:640)+'" aria-valuenow="'+value+'" aria-valuetext="'+valText+'" data-cp-knob><i style="transform:rotate('+rotation+'deg)" aria-hidden="true"></i></div></div>';
    const plate='<div class="cp-machine '+(hdg?'cp-mcp':'cp-efis')+'">'+screws+'<div class="cp-machine-title">'+(hdg?'HEADING':'EFIS · RANGE')+'</div>'+(hdg?'<div class="cp-hdg-window">'+headingDigits(value)+'</div>':'')+dial+(hdg?'':'<div class="cp-units">НАВИГАЦИОННЫЙ ДИСПЛЕЙ · NM</div>')+'</div>';
    return '<div class="cp-console">'+plate+'<div class="cp-turnkeys"><button type="button" data-cp-turn="-1" aria-label="'+a11y+' — уменьшить">−</button><output aria-live="polite">'+valText+'</output><button type="button" data-cp-turn="1" aria-label="'+a11y+' — увеличить">+</button></div></div>';
  }

  function meter(state){
    const selected=sources[state.sourceIndex];
    let display=rect(0,0,318,86,'#101510');
    [['0',51,32],[selected.freq,266,32],['28',51,73],[selected.current,160,73],[selected.volts,266,73]].forEach(([v,x,y])=>{
      display+=rect(x-31,y-23,63,28,'#181c16')+label(x+25,y,v,26,'#b1dca0','end','class="cp-meter-readings"');
    });
    const a='Селектор измерительных приборов AC';
    const dial='<div class="cp-dial-wrap"><div class="cp-range-scale" aria-hidden="true">'+
      sources.map((item,i)=>{const p=angle(50,60,47,-140+i*50);return '<span style="left:'+p[0]+'%;top:'+p[1]+'%">'+item.name+'</span>';}).join('')+
      '</div><div class="cp-knob" role="spinbutton" tabindex="0" aria-label="'+a+'" aria-valuemin="1" aria-valuemax="3" aria-valuenow="'+(state.sourceIndex+1)+'" aria-valuetext="'+selected.name+'" data-cp-knob><i style="transform:rotate('+((state.sourceIndex-1)*45)+'deg)" aria-hidden="true"></i></div></div>';
    return '<div class="cp-console cp-meter-plate"><div class="cp-machine cp-meter">'+screws+
      '<div class="cp-meter-labels"><span>DC AMPS</span><span></span><span>CPS FREQ</span></div><div class="cp-glass">'+svg('0 0 318 86','Панель измерения. DC AMPS 0, CPS FREQ '+(selected.freq||'нет показания')+', DC VOLTS 28, AC AMPS '+(selected.current||'нет показания')+', AC VOLTS '+(selected.volts||'нет показания')+'.',display)+'</div><div class="cp-meter-labels"><span>DC VOLTS</span><span>AC AMPS</span><span>AC VOLTS</span></div>'+
      '<div class="cp-meter-select">'+dial+'</div><span class="cp-units">AC</span></div><div class="cp-turnkeys"><button type="button" data-cp-turn="-1" aria-label="Предыдущий источник">−</button><output aria-live="polite">'+selected.name+'</output><button type="button" data-cp-turn="1" aria-label="Следующий источник">+</button></div></div>';
  }

  function getState(id,raw){
    const s=Object.assign(initial(id),raw||{});
    s.misses=Math.max(0,parseInt(s.misses,10)||0);
    if(id==='electric-meter'){s.sourceIndex=Math.min(2,Math.max(0,Math.trunc(Number(s.sourceIndex))||0));s.frequency=numberText(s.frequency);}
    if(id==='nd-range')s.rangeIndex=Math.max(0,Math.min(ranges.length-1,Math.trunc(Number(s.rangeIndex))||0));
    if(id==='mcp-heading')s.heading=((Math.trunc(Number(s.heading))||0)%360+360)%360;
    if(id==='pfd-read'){s.speed=numberText(s.speed);s.altitude=numberText(s.altitude);}
    if(id==='eng-compare'&&!['r1','r2','n1','n2','t1','t2'].includes(s.chosen))s.chosen='';
    return s;
  }

  function render(id,raw){
    if(!exercises.some(ex=>ex.id===id))return '';
    const s=getState(id,raw);
    const title={ 'pfd-read':'Основной пилотажный дисплей', 'nd-range':'Экран карты и селектор EFIS', 'mcp-heading':'Секция курса MCP','eng-compare':'Верхний дисплей двигателей', 'electric-meter':'Панель измерительных приборов AC/DC'}[id];
    let instrument='',inputs='',error='';
    if(id==='pfd-read'){
      instrument=frame(pfd());
      inputs='<div class="cp-fields"><label>Скорость, kt<input name="cp-speed" type="text" inputmode="numeric" autocomplete="off" maxlength="5" value="'+s.speed+'" placeholder="Узлы" required></label><label>Высота, ft<input name="cp-altitude" type="text" inputmode="numeric" autocomplete="off" maxlength="8" value="'+s.altitude+'" placeholder="Футы" required></label></div>';
      error=normalize(s.speed)!==250?'Посмотрите на белое окно в середине левой шкалы скорости.':'Считайте высоту в белом окне справа от авиагоризонта.';
    }else if(id==='nd-range'){
      instrument='<div class="cp-pair">'+frame(nd(s.rangeIndex))+turnControl(id,s)+'</div>';
      error='Проверьте установку на пульте EFIS. На шкале нужны 40 морских миль.';
    }else if(id==='mcp-heading'){
      instrument=turnControl(id,s);
      error='Сейчас в окне '+pad(s.heading)+'°. Поверните селектор до 005°.';
    }else if(id==='electric-meter'){
      instrument=meter(s);
      inputs='<div class="cp-fields"><label>Частота GEN 2, Гц<input name="cp-frequency" type="text" inputmode="numeric" autocomplete="off" maxlength="4" value="'+s.frequency+'" placeholder="Герцы" required></label></div>';
      error=s.sourceIndex!==2?'Выберите GEN 2 правым селектором приборов AC.':'Прочитайте верхнее правое окно CPS FREQ. В нижнем правом окне показано напряжение.';
    }else {
      instrument=frame(engineDisplay(s.chosen));
      error=s.chosen==='n1'?'Вы выбрали текущие обороты первого двигателя. Сравните их с правым показанием.':s.chosen[0]==='t'?'Вы выбрали температуру EGT. Обороты N1 находятся в верхнем ряду приборов.':s.chosen?'Зелёное число показывает опорное значение. Сравните белые числа в рамках N1.':'Выберите одно из чисел прямо на дисплее.';
    }
    return '<section class="cp-panel" aria-label="'+title+'" data-cp-panel="'+id+'"><header class="cp-caption"><span>'+title+'</span><small>Учебный фрагмент</small></header><form class="cp-form"><div class="cp-instrument">'+instrument+'</div>'+((id==='nd-range'||id==='mcp-heading'||id==='electric-meter')?'<p class="cp-help">Поверните ручку движением влево или вправо. Можно использовать кнопки − и + или клавиши со стрелками на ручке.</p>':'')+inputs+feedback(s.error?error:'')+check(id==='eng-compare'?'Проверить выбор':id==='pfd-read'?'Проверить показания':'Проверить установку')+'</form></section>';
  }

  function bind(host,id,raw,onState,onComplete){
    const panel=host.matches?.('[data-cp-panel]')?host:host.querySelector('[data-cp-panel]');
    if(!panel||panel.dataset.cpPanel!==id)return;
    const state=getState(id,raw);
    const form=panel.querySelector('form');
    const notify=()=>onState?.({...state});
    const redraw=focus=>{
      const next=document.createElement('template'); next.innerHTML=render(id,state);
      const newPanel=next.content.firstElementChild; panel.replaceWith(newPanel);
      bind(newPanel,id,state,onState,onComplete);
      if(focus)newPanel.querySelector(focus)?.focus({preventScroll:true});
    };
    const turn=(delta,focus)=>{
      if(id==='nd-range')state.rangeIndex=Math.min(ranges.length-1,Math.max(0,state.rangeIndex+delta));
      else if(id==='electric-meter')state.sourceIndex=Math.min(2,Math.max(0,state.sourceIndex+delta));
      else state.heading=(state.heading+delta+360)%360;
      state.error=false;notify();redraw(focus);
    };
    panel.querySelectorAll('[data-cp-turn]').forEach(button=>button.addEventListener('click',()=>{
      turn(Number(button.dataset.cpTurn),'[data-cp-turn="'+button.dataset.cpTurn+'"]');
    }));
    const knob=panel.querySelector('[data-cp-knob]');
    if(knob){
      knob.addEventListener('keydown',e=>{
        const delta={ArrowLeft:-1,ArrowDown:-1,ArrowUp:1,ArrowRight:1}[e.key];
        if(delta){e.preventDefault();turn(delta,'[data-cp-knob]');}
      });
      let start=null;
      knob.addEventListener('pointerdown',e=>{if(e.button!==0)return;start=e.clientX;knob.setPointerCapture(e.pointerId);});
      knob.addEventListener('pointerup',e=>{if(start===null)return;const delta=Math.trunc((e.clientX-start)/10);start=null;if(delta)turn(Math.min(40,Math.max(-40,delta)),'[data-cp-knob]');});
      knob.addEventListener('pointercancel',()=>{start=null;});
    }
    const clearFeedback=()=>{state.error=false; const alert=panel.querySelector('.cp-feedback');if(alert)alert.textContent='';};
    if(id==='pfd-read'){
      for(const name of ['speed','altitude'])form.elements['cp-'+name].addEventListener('input',e=>{state[name]=numberText(e.target.value);clearFeedback();notify();});
    }
    if(id==='electric-meter')form.elements['cp-frequency'].addEventListener('input',e=>{state.frequency=numberText(e.target.value);clearFeedback();notify();});
    if(id==='eng-compare'){
      panel.querySelectorAll('[data-cp-reading]').forEach(button=>button.addEventListener('click',()=>{
        state.chosen=button.dataset.cpReading; clearFeedback(); notify();
        panel.querySelectorAll('[data-cp-reading]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      }));
    }
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(id==='pfd-read'){state.speed=numberText(form.elements['cp-speed'].value);state.altitude=numberText(form.elements['cp-altitude'].value);}
      if(id==='electric-meter')state.frequency=numberText(form.elements['cp-frequency'].value);
      const done=id==='pfd-read'?normalize(state.speed)===250&&normalize(state.altitude)===12400:id==='nd-range'?ranges[state.rangeIndex]===40:id==='mcp-heading'?state.heading===5:id==='electric-meter'?state.sourceIndex===2&&normalize(state.frequency)===402:state.chosen==='n2';
      if(done){state.error=false;notify();onComplete?.({...state});return;}
      state.error=true;state.misses+=1;notify();redraw('.cp-check');
    });
  }
  window.CockpitPanels={exercises,initial,render,bind};
})();
