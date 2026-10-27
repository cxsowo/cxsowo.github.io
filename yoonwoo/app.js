(() => {
  'use strict';
  const config = window.TIMELINE_CONFIG;
  // Keep a long shared history from stretching the short solo introduction.
  const timelineUnits=config.before.length+config.after.length+4;
  const timelineCrossingAt=config.after.length>20?Math.max(.1,config.before.length/timelineUnits):config.crossingAt;
  const timelineCrossingDuration=config.after.length>20?4/timelineUnits:config.crossingDuration;
  const locales = window.TIMELINE_LOCALES;
  let language = 'zh';
  try { const saved=localStorage.getItem('yoonwoo-language'); if(locales[saved])language=saved; } catch {}
  const tr = key => locales[language][key] ?? locales.zh[key];
  const eventContent = event => {
    const translation=event.i18n?.[language] ?? window.TIMELINE_EVENT_TRANSLATIONS?.[event.id]?.[language];
    return { title:translation?.title || event.title, text:translation?.text || event.text };
  };
  let openedEvent=null, galleryEvent=null, galleryIndex=0;
  const personName = key => config.peopleI18n?.[language]?.[key] || config.people[key];
  const dateText = value => value==='现在' ? ({zh:'现在',en:'Now',ko:'현재'})[language] : value;
  const shortDate = value => {
    if(/^\d{4}\.\d{2}\.\d{2}$/.test(value))return value.slice(5);
    if(/^\d{4}\.\d{2}$/.test(value))return language==='en' ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(value.slice(5))-1] : `${Number(value.slice(5))}${language==='ko'?'월':'月'}`;
    return dateText(value);
  };
  function setDate(element,value){
    element.textContent=dateText(value);
    if(/^\d{4}(\.\d{2}){0,2}$/.test(value))element.dateTime=value.replaceAll('.', '-');
    else element.removeAttribute('datetime');
  }

  const $ = id => document.getElementById(id);
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const journey = $('journey'), scene = $('scene'), dialog = $('event-dialog');
  const aRail = $('rail-a'), bRail = $('rail-b'), heart = $('heart');
  const heartPaths = [...heart.querySelectorAll('.heart-line')];
  const cardsRoot = $('cards');
  let width = 0, height = 0, progress = 0, raf = 0, currentChapter = -1;
  // A fixed seed keeps the sky stable when the page reloads.
  let starSeed=427;
  const starRandom=()=>{starSeed=(starSeed*1664525+1013904223)>>>0;return starSeed/4294967296;};
  const starFragment=document.createDocumentFragment();
  for(let index=0;index<115;index++){
    const star=document.createElement('i');
    const size=index%17===0?2.4:.8+starRandom()*1.1;
    star.style.cssText=`left:${starRandom()*100}%;top:${starRandom()*100}%;--star-size:${size}px;--star-duration:${3.5+starRandom()*6}s;--star-delay:${-starRandom()*12}s;--star-brightness:${.35+starRandom()*.45}`;
    starFragment.append(star);
  }
  $('starfield').append(starFragment);
  const skyStars=[...$('starfield').children];
  const recentSparkles=[];
  let sparkleTimer;
  function sparkle(){
    if(document.hidden || reducedMotion)return;
    const visibleCount=window.innerWidth<=600?75:skyStars.length;
    const candidates=skyStars.slice(0,visibleCount).filter(star=>!star.classList.contains('is-sparkling')&&!recentSparkles.includes(star));
    const star=candidates[Math.floor(Math.random()*candidates.length)];
    if(star){
      star.style.setProperty('--sparkle-duration',`${1.8+Math.random()*1.5}s`);
      star.classList.add('is-sparkling');recentSparkles.push(star);
      if(recentSparkles.length>16)recentSparkles.shift();
    }
    sparkleTimer=setTimeout(sparkle,650+Math.random()*1250);
  }
  $('starfield').addEventListener('animationend',event=>{
    if(event.animationName==='star-cross-twinkle')event.target.classList.remove('is-sparkling');
  });
  document.addEventListener('visibilitychange',()=>{
    clearTimeout(sparkleTimer);if(!document.hidden&&!reducedMotion)sparkle();
  });
  if(!reducedMotion)sparkle();
  const cards = [];
  const labelFor = event => event.person === 'both' ? `${personName('a')} + ${personName('b')} · ${tr('shared')}` : `${personName(event.person)} · ${tr('single')}`;
  const artworkLabels = { mountain: 'Somewhere, a beginning', window: 'A window into time', moon: 'Under the same moon', union: 'Two lives, one moment' };
  function createEvent(event, phase) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'event'; button.dataset.person = event.person;
    button.setAttribute('aria-label', `${event.date}，${labelFor(event)}，${event.title}，查看详情`);
    const art = document.createElement('div'); art.className = `art ${event.art}`; art.setAttribute('aria-hidden', 'true');
    const moon = document.createElement('i'); moon.className = 'moon'; if (event.art !== 'window' && event.art !== 'union') art.append(moon);
    const caption = document.createElement('span'); caption.className = 'art-caption'; caption.textContent = artworkLabels[event.art] || artworkLabels.moon; art.append(caption);
    if(event.cover){
      art.classList.add('has-photo');
      const cover=document.createElement('img');cover.src=event.cover;cover.alt='';cover.decoding='async';
      cover.style.objectPosition=event.coverPosition||'50% 50%';art.append(cover);
    }
    const head = document.createElement('div'); head.className = 'event-head';
    const date = document.createElement('time'); setDate(date,event.date);
    const owner = document.createElement('span'); owner.textContent = event.person === 'both' ? 'A + B' : personName(event.person); head.append(date, owner);
    const title = document.createElement('h2'); title.textContent = event.title;
    const copy = document.createElement('p'); copy.textContent = event.text;
    const foot = document.createElement('div'); foot.className = 'card-footer';
    const footLabel = document.createElement('span'); footLabel.textContent = '示例事件 · 查看详情';
    const arrow = document.createElement('b'); arrow.textContent = '↗'; foot.append(footLabel, arrow);
    button.append(art, head, title, copy, foot);
    button.addEventListener('click', () => {
      openedEvent=event; updateDetail(event); dialog.showModal();
    });
    const node = document.createElement('div'); node.className = 'timeline-node'; node.dataset.person = event.person;
    const time = document.createElement('time'); time.textContent = event.date; node.append(time);
    const connector = document.createElement('div'); connector.className = 'node-connector';
    const pointer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pointer.setAttribute('class', 'card-pointer'); pointer.setAttribute('aria-hidden', 'true');
    const pointerShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pointer.append(pointerShape);
    button.prepend(pointer);
    cardsRoot.append(connector, node, button);
    const item = { event, phase, button, node, connector, pointer, pointerShape }; cards.push(item);
  }
  config.before.forEach(event => createEvent(event, 'before'));
  config.after.forEach(event => createEvent(event, 'after'));
  $('crossing-date').textContent = config.crossingDate;
  const cardSpacing = clamp(config.cardSpacing ?? .16, .08, 1);
  const exitTravel = .5 / cardSpacing;
  const travelBefore = Math.max(...config.before.map(event => event.position)) + exitTravel;
  // Continue the same spacing between the last two events into the ending.
  const afterPositions = config.after.map(event => event.position).sort((a,b)=>a-b);
  const endingSpacing = afterPositions.length > 1 ? afterPositions.at(-1)-afterPositions.at(-2) : 5;
  const travelAfter = afterPositions.at(-1) + endingSpacing;
  const sharedAngleStep = .14;
  const tickPreview = document.createElement('div');
  tickPreview.id = 'tick-preview'; tickPreview.className = 'tick-preview';
  tickPreview.setAttribute('role', 'tooltip'); tickPreview.hidden = true;
  document.querySelector('.bottom').append(tickPreview);
  function showTickPreview(item, marker) {
    const miniature = document.createElement('div');
    miniature.className = 'event'; miniature.dataset.person = item.event.person;
    for (const child of item.button.children) if (!child.classList.contains('card-pointer')) miniature.append(child.cloneNode(true));
    tickPreview.replaceChildren(miniature); tickPreview.hidden = false;
    const bounds = document.querySelector('.bottom').getBoundingClientRect();
    const markerBounds = marker.getBoundingClientRect();
    const half = tickPreview.offsetWidth / 2;
    const center = clamp(markerBounds.left + markerBounds.width / 2 - bounds.left, half, bounds.width - half);
    tickPreview.style.left = `${center}px`;
    marker.setAttribute('aria-describedby', tickPreview.id);
  }
  function hideTickPreview(marker) { tickPreview.hidden = true; marker.removeAttribute('aria-describedby'); }
  const eventTicks = cards.map((item, index) => {
    const crossingStart = clamp(timelineCrossingAt, .1, .8);
    const crossingEnd = Math.min(.95, crossingStart + timelineCrossingDuration);
    const position = item.phase === 'before'
      ? item.event.position / travelBefore * crossingStart
      : crossingEnd + item.event.position / travelAfter * (1 - crossingEnd);
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'event-tick';
    marker.dataset.side = index % 2 ? 'below' : 'above';
    marker.style.left = `${position * 100}%`;
    marker.setAttribute('aria-label', `跳转到 ${item.event.date}，${item.event.title}`);
    marker.addEventListener('pointerenter', () => showTickPreview(item, marker));
    marker.addEventListener('pointerleave', () => hideTickPreview(marker));
    marker.addEventListener('focus', () => showTickPreview(item, marker));
    marker.addEventListener('blur', () => hideTickPreview(marker));
    marker.addEventListener('click', () => { hideTickPreview(marker); scrollToProgress(position); });
    const dot = document.createElement('span'); dot.className = 'event-tick-dot';
    const date = document.createElement('time');
    setDate(date,item.event.date);date.textContent=shortDate(item.event.date);
    marker.append(dot, date); $('event-ticks').append(marker);
    return { marker, position };
  });
  function updateDetail(event){
    const content=eventContent(event);
    $('detail-owner').textContent=labelFor(event);$('detail-date').textContent=event.date;
    setDate($('detail-date'),event.date);
    $('detail-title').textContent=content.title;$('detail-copy').textContent=content.text;
    if(galleryEvent!==event){galleryEvent=event;galleryIndex=0;}
    const gallery=$('detail-gallery');gallery.hidden=!event.images?.length;
    $('gallery-thumbs').replaceChildren();
    if(!gallery.hidden){
      event.images.forEach((src,index)=>{
        const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`${tr('photo')} ${index+1}`);
        const image=document.createElement('img');image.src=src;image.alt='';image.loading='lazy';button.append(image);
        button.addEventListener('click',()=>{galleryIndex=index;showGalleryPhoto();});$('gallery-thumbs').append(button);
      });
      $('gallery-prev').setAttribute('aria-label',tr('previousPhoto'));$('gallery-next').setAttribute('aria-label',tr('nextPhoto'));
      gallery.setAttribute('aria-label',tr(event.id.endsWith('-birth')?'childhoodPhotos':'photoAlbum'));showGalleryPhoto();
    }

  }
  function showGalleryPhoto(){
    if(!galleryEvent?.images?.length)return;
    const images=galleryEvent.images;galleryIndex=(galleryIndex+images.length)%images.length;
    $('gallery-image').src=images[galleryIndex];
    $('gallery-image').alt=`${labelFor(galleryEvent)} · ${tr(galleryEvent.id.endsWith('-birth')?'childhoodPhotos':'photoAlbum')} ${galleryIndex+1}`;
    $('gallery-counter').textContent=`${galleryIndex+1} / ${images.length}`;
    [...$('gallery-thumbs').children].forEach((button,index)=>button.setAttribute('aria-pressed',String(index===galleryIndex)));
  }
  $('gallery-prev').addEventListener('click',()=>{galleryIndex--;showGalleryPhoto();});
  $('gallery-next').addEventListener('click',()=>{galleryIndex++;showGalleryPhoto();});
  dialog.addEventListener('keydown',event=>{
    if($('detail-gallery').hidden)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();galleryIndex+=event.key==='ArrowLeft'?-1:1;showGalleryPhoto();
    }
  });
  function setLanguage(next){
    language=locales[next]?next:'zh';
    try{localStorage.setItem('yoonwoo-language',language);}catch{}
    document.documentElement.lang=language==='zh'?'zh-CN':language;
    document.title=`${tr('pageTitle').split(' · ')[0]} · ${personName('a')} & ${personName('b')}`;
    document.querySelector('.stage').setAttribute('aria-label',tr('timeline'));
    cardsRoot.setAttribute('aria-label',tr('events'));
    $('event-ticks').setAttribute('aria-label',tr('dates'));
    $('current-time').setAttribute('aria-label',tr('current'));
    $('language-switch').setAttribute('aria-label',tr('languages'));
    document.querySelector('.journey-meter>span').textContent=tr('start');
    $('about-site').textContent=tr('aboutButton');$('about-title').textContent=tr('aboutTitle');
    $('about-copy').textContent=tr('aboutCopy');$('about-love').textContent=tr('aboutLove');
    $('about-contact-label').textContent=tr('aboutContact');$('close-about').setAttribute('aria-label',tr('closeAbout'));
    $('restart').textContent=tr('restart');$('close-dialog').setAttribute('aria-label',tr('close'));
    document.querySelector('#crossing-label>span').textContent=tr('moment');
    document.querySelector('#crossing-label>p').textContent=eventContent(config.after.find(event=>event.id==='first-meeting')||{title:'',text:tr('crossing')}).text;
    for(const item of cards){
      const content=eventContent(item.event),button=item.button;
      button.querySelector('h2').textContent=content.title;button.querySelector('p').textContent=content.text;
      setDate(button.querySelector('.event-head time'),item.event.date);
      button.querySelector('.event-head>span').textContent=item.event.person==='both'?`${personName('a')} + ${personName('b')}`:personName(item.event.person);
      button.querySelector('.card-footer>span').textContent=item.event.images?.length?`${item.event.images.length} ${tr('photos')} · ${tr('details')}`:tr('sample');
      button.querySelector('.art-caption').textContent=tr('artwork')[item.event.art] || tr('artwork').moon;
      button.setAttribute('aria-label',`${item.event.date}，${labelFor(item.event)}，${content.title}，${tr('details')}`);
    }
    eventTicks.forEach((tick,index)=>{tick.marker.setAttribute('aria-label',`${tr('jump')} ${dateText(cards[index].event.date)}，${eventContent(cards[index].event).title}`);tick.marker.querySelector('time').textContent=shortDate(cards[index].event.date);});
    document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
    if(openedEvent&&dialog.open)updateDetail(openedEvent);
    tickPreview.hidden=true;
    schedule();
  }
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.language)));
  const meter=document.querySelector('.meter');
  const ruler=document.createElement('div');ruler.className='meter-ruler';ruler.setAttribute('aria-hidden','true');
  const rulerTicks=Array.from({length:161},(_,index)=>{
    const tick=document.createElement('i');tick.style.left=`${index/160*100}%`;ruler.append(tick);return tick;
  });
  meter.prepend(ruler);
  function waveAt(position){
    rulerTicks.forEach((tick,index)=>{
      const distance=position===null?Infinity:Math.abs(index/160-position);
      tick.style.setProperty('--wave-height',`${4+28*Math.exp(-Math.pow(distance/.035,2))}px`);
    });
  }
  meter.addEventListener('pointermove',event=>{
    const marker=event.target.closest('.event-tick');
    const entry=eventTicks.find(tick=>tick.marker===marker);
    waveAt(entry ? entry.position : null);
  });
  meter.addEventListener('pointerleave',()=>waveAt(null));
  meter.addEventListener('focusin',event=>{
    const entry=eventTicks.find(tick=>tick.marker===event.target);if(entry)waveAt(entry.position);
  });
  meter.addEventListener('focusout',()=>waveAt(null));
  function scrollToProgress(p) { window.scrollTo({ top: p * (journey.offsetHeight - height), behavior: reducedMotion ? 'instant' : 'smooth' }); }
  $('restart').addEventListener('click', () => scrollToProgress(0));
  $('close-dialog').addEventListener('click', () => dialog.close());
  const aboutDialog=$('about-dialog');
  $('about-site').addEventListener('click',()=>aboutDialog.showModal());
  $('close-about').addEventListener('click',()=>aboutDialog.close());
  aboutDialog.addEventListener('click',event=>{
    if(event.target!==aboutDialog)return;
    const rect=aboutDialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)aboutDialog.close();
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  function resize() {
    width = document.documentElement.clientWidth; height = document.querySelector('.stage').clientHeight;
    const crossingEnd=Math.min(.95,clamp(timelineCrossingAt,.1,.8)+timelineCrossingDuration);
    journey.style.height=`${Math.max(height*12.5,config.after.length*160/(1-crossingEnd)+height)}px`;
    const meterWidth=meter.clientWidth;
    meter.classList.toggle('is-dense',eventTicks.length>20);
    eventTicks.forEach((tick,index)=>{
      const previous=index?tick.position-eventTicks[index-1].position:1;
      const next=index<eventTicks.length-1?eventTicks[index+1].position-tick.position:1;
      tick.marker.style.width=`${clamp(Math.min(previous,next)*meterWidth*.8,4,26)}px`;
    });
    scene.setAttribute('viewBox', `0 0 ${width} ${height}`); schedule();
  }
  function chapter(index) {
    if (currentChapter === index) return; currentChapter = index;
    const chapters = [
      ['CHAPTER 01 — BEFORE US', '在相遇之前', '两段各自向前的时间，尚未写下彼此的名字。', '各自的序章'],
      ['CHAPTER 02 — THE CROSSING', '时间在此交汇', '这一次，命运有了相同的落点。', '相逢的时刻'],
      ['CHAPTER 03 — TOGETHER', '从此，同一段时间', '让散落的片刻，成为共同故事的注脚。', '我们的后来']
    ];
    const c = chapters[index]; $('chapter-number').textContent = c[0]; $('chapter-title').textContent = c[1]; $('chapter-copy').textContent = c[2]; $('phase-label').textContent = c[3];
    document.querySelector('.chapter').hidden = true;
  }
  function hide(item) {
    item.button.hidden = true; item.button.disabled = true; item.node.hidden = true; item.connector.hidden = true; item.pointer.style.display = 'none';
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  const dialGroup = document.createElementNS(svgNS, 'g');
  dialGroup.id = 'dial-marks'; scene.append(dialGroup);
  const dialClip=document.createElementNS(svgNS,'clipPath');dialClip.id='dial-content-clip';
  const dialClipRect=document.createElementNS(svgNS,'rect');dialClip.append(dialClipRect);
  scene.querySelector('defs').append(dialClip);
  dialGroup.setAttribute('clip-path','url(#dial-content-clip)');
  const tickPaths = ['a', 'b', 'both'].map(person => {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('class', `dial-ticks dial-ticks-${person}`);
    dialGroup.append(path); return path;
  });
  const unionArc = document.createElementNS(svgNS, 'path');
  unionArc.id = 'union-arc'; unionArc.setAttribute('stroke', 'url(#union-color)');
  dialGroup.prepend(unionArc);
  function point(cx, cy, r, angle, mirror = 1) {
    return { x: cx + mirror * Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  }
  function arc(cx, cy, radius, from, to, mirror = 1) {
    const points = Array.from({ length: 81 }, (_, i) => point(cx, cy, radius, mix(from, to, i / 80), mirror));
    return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  }
  function marks(cx, cy, r, from, to, rotation, mirror = 1) {
    const step = Math.PI / 90;
    let path = '';
    const shift = ((rotation % step) + step) % step;
    for (let i = -110; i <= 110; i++) {
      const angle = i * step + shift;
      if (angle < from || angle > to) continue;
      const p = point(cx, cy, r, angle, mirror);
      const q = point(cx, cy, r + (i % 5 === 0 ? 15 : 7), angle, mirror);
      path += `M${p.x} ${p.y}L${q.x} ${q.y}`;
    }
    return path;
  }
  function draw() {
    raf = 0;
    progress = clamp(window.scrollY / Math.max(1, journey.offsetHeight - height));
    const crossingStart = clamp(timelineCrossingAt, .1, .8);
    const crossingEnd = Math.min(.95, crossingStart + timelineCrossingDuration);
    const morph = smooth((progress - crossingStart) / timelineCrossingDuration);
    const after = progress >= crossingEnd;
    chapter(progress < crossingStart ? 0 : after ? 2 : 1);
    const cx = width / 2;
    const navigationTop=meter.getBoundingClientRect().top-document.querySelector('.stage').getBoundingClientRect().top;
    dialClipRect.setAttribute('width',width);
    dialClipRect.setAttribute('height',Math.max(0,navigationTop-28));
    const mobile = width <= 600;
    const r = width * (mobile ? .28 : .29);
    const sideY = height * .49;
    const sideX = -r * .40;
    const centerY = height * (mobile ? .94 : 1.04);
    const unionRadius = Math.min(width * .49, height * .52);
    const travelA = progress / crossingStart * travelBefore;
    const travelB = (progress - crossingEnd) / (1 - crossingEnd) * travelAfter;
    const beforeOpacity = 1 - smooth((progress - crossingStart) / (timelineCrossingDuration * .55));
    const afterOpacity = smooth((progress - (crossingEnd - .035)) / .035);
    const transition = clamp((progress-crossingStart)/timelineCrossingDuration);
    const gather = smooth(transition/.55);
    const unfold = smooth((transition-.55)/.45);
    const finalHeartY = centerY-unionRadius*(mobile ? .48 : .46);
    const heartY = mix(height*.43, finalHeartY, unfold);
    const size = Math.min(mobile ? 32 : 52, width*.085, unionRadius*.16);
    const sideMascotOpacity=1-smooth(transition/.55);
    const mascotY=sideY-(mobile?60:0);
    for(const [id,x] of [['mascot-left',width*.055],['mascot-right',width*.945]]){
      const mascot=$(id);mascot.style.left=`${x}px`;mascot.style.top=`${mascotY}px`;mascot.style.opacity=sideMascotOpacity;
    }
    const together=$('mascot-together');together.style.left=`${cx}px`;
    together.style.top=`${finalHeartY-(mobile?60:95)}px`;together.style.opacity=afterOpacity;

    const left = `M${cx} ${heartY-size*.15} C${cx-size*.2} ${heartY-size} ${cx-size*1.1} ${heartY-size*.75} ${cx-size*.8} ${heartY} C${cx-size*.6} ${heartY+size*.4} ${cx-size*.15} ${heartY+size*.65} ${cx} ${heartY+size*.8}`;
    const right = `M${cx} ${heartY-size*.15} C${cx+size*.2} ${heartY-size} ${cx+size*1.1} ${heartY-size*.75} ${cx+size*.8} ${heartY} C${cx+size*.6} ${heartY+size*.4} ${cx+size*.15} ${heartY+size*.65} ${cx} ${heartY+size*.8}`;
    heartPaths.forEach((path,i)=>{path.setAttribute('d',i?right:left);path.style.strokeDasharray='none';});
    const gradient=$('union-color');
    gradient.setAttribute('gradientUnits','userSpaceOnUse');
    gradient.setAttribute('x1',cx-size);gradient.setAttribute('x2',cx+size);
    gradient.setAttribute('y1',0);gradient.setAttribute('y2',0);
    // Match sample counts so both side arcs continuously become the two
    // heart lobes, then unfold into the left/right halves of the bottom dial.
    [aRail,bRail].forEach((rail,side)=>{
      const mirror=side===0?1:-1;
      const ox=side===0?sideX:width-sideX;
      const heartPath=heartPaths[side],length=heartPath.getTotalLength();
      const points=Array.from({length:81},(_,i)=>{
        const u=i/80;
        const original=point(ox,sideY,r,mix(-1.45,1.45,u),mirror);
        const h=heartPath.getPointAtLength(length*u);
        const union=point(cx,centerY,unionRadius,mix(-Math.PI/2,side===0?-Math.PI+.12:-.12,u));
        return {x:mix(mix(original.x,h.x,gather),union.x,unfold),y:mix(mix(original.y,h.y,gather),union.y,unfold)};
      });
      rail.setAttribute('stroke',transition>0?(side===0?'#e6faff':'#fde6ff'):(side===0?'url(#blue-line)':'url(#red-line)'));
      rail.style.strokeWidth=mix(1.5,3.5,gather*(1-unfold));
      rail.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' '));
    });
    // Crossfade the dial ticks into continuous curves for the joining motion.
    const lineIn=smooth(transition/.12);
    const dialIn=smooth((transition-.85)/.15);
    $('rails').style.opacity=lineIn*(1-dialIn);
    tickPaths[0].setAttribute('d',marks(sideX,sideY,r,-1.45,1.45,-travelA*.11));
    tickPaths[1].setAttribute('d',marks(width-sideX,sideY,r,-1.45,1.45,-travelA*.11,-1));
    tickPaths[0].style.opacity=1-lineIn;tickPaths[1].style.opacity=1-lineIn;
    unionArc.setAttribute('d',arc(cx,centerY,unionRadius,-Math.PI+.12,-.12));
    unionArc.style.opacity=0;
    tickPaths[2].setAttribute('d',marks(cx,centerY,unionRadius,-Math.PI+.12,-.12,-travelB*sharedAngleStep));
    tickPaths[2].style.opacity=dialIn;
    heart.style.opacity=unfold;
    $('crossing-label').style.opacity=Math.sin(transition*Math.PI);
    $('crossing-label').style.top=`${height*.43+size*.85+30}px`;
    const foreground = new Map();
    let focusDate = config.crossingDate, focusScore = -1;
    for (const item of cards) {
      const before = item.phase === 'before';
      const phaseOpacity = before ? beforeOpacity : afterOpacity;
      if (phaseOpacity < .001) { hide(item); continue; }
      const delta = (before ? travelA : travelB) - item.event.position;
      const angle = before ? -delta * .11 : -Math.PI / 2 - delta * sharedAngleStep;
      const distance = Math.abs(delta * (before ? .11 : sharedAngleStep));
      if (distance > (before ? 1.5 : 1.38)) { hide(item); continue; }
      const fade = phaseOpacity * (1 - smooth((distance - .95) / .5));
      const scale = 1 - Math.min(.24, distance * .15);
      const cardWidth = mobile ? Math.min(180, width * .32) : Math.min(310, width * .20);
      const cardHeight = mobile ? Math.min(220, height * .28) : Math.min(300, height * .32);
      item.button.style.width = `${cardWidth}px`; item.button.style.height = `${cardHeight}px`;
      item.button.style.minHeight = '0'; item.button.hidden = false;
      let center, node, rotation, inner;
      if (before) {
        const mirror = item.event.person === 'a' ? 1 : -1;
        const ox = mirror === 1 ? sideX : width - sideX;
        node = point(ox, sideY, r, angle, mirror);
        center = point(ox, sideY, r + cardWidth * .50 + 32, angle, mirror);
        rotation = mirror * angle;
        inner = point(ox, sideY, r - (mobile ? 32 : 44), angle, mirror);
      } else {
        node = point(cx, centerY, unionRadius, angle);
        center = point(cx, centerY, unionRadius + cardHeight * .50 + 32, angle);
        rotation = angle + Math.PI / 2;
        inner = point(cx, centerY, unionRadius - (mobile ? 32 : 44), angle);
      }
      item.button.style.transform = `translate3d(${center.x-cardWidth/2}px,${center.y-cardHeight/2}px,0) rotate(${rotation}rad) scale(${scale})`;
      item.button.style.opacity = fade * Math.max(.35, 1 - distance * .4);
      item.button.style.filter = 'none';
      item.button.style.zIndex = `${Math.round(100 - distance * 30)}`;
      // Draw the card and its tail as one outline in the card's local coordinates.
      const dx=(node.x-center.x)/scale,dy=(node.y-center.y)/scale;
      const tx=cardWidth/2+dx*Math.cos(rotation)+dy*Math.sin(rotation);
      const ty=cardHeight/2-dx*Math.sin(rotation)+dy*Math.cos(rotation);
      const vx=tx-cardWidth/2,vy=ty-cardHeight/2;
      const reach=Math.min(cardWidth/2/Math.max(.0001,Math.abs(vx)),cardHeight/2/Math.max(.0001,Math.abs(vy)));
      const ex=cardWidth/2+vx*reach,ey=cardHeight/2+vy*reach;
      const w=cardWidth,h=cardHeight,c=10,half=11;
      // A short, rounded tip reads as part of the card rather than a needle.
      const tail=(x,y,nx,ny,ux,uy)=>{
        const ax=x-ux*half,ay=y-uy*half,bx=x+ux*half,by=y+uy*half;
        const tipX=x+nx*12,tipY=y+ny*12;
        const length=Math.hypot(half,12),round=4;
        const p1x=tipX+(ax-tipX)/length*round,p1y=tipY+(ay-tipY)/length*round;
        const p2x=tipX+(bx-tipX)/length*round,p2y=tipY+(by-tipY)/length*round;
        return `L${ax} ${ay} L${p1x} ${p1y} Q${tipX} ${tipY} ${p2x} ${p2y} L${bx} ${by} `;
      };
      let top=`L${w-c} 0`,right=`L${w} ${h-c}`,bottom=`L${c} ${h}`,left=`L0 ${c}`;
      if(Math.abs(ey)<.01){const x=clamp(ex,c+half,w-c-half);top=tail(x,0,0,-1,1,0)+top;}
      else if(Math.abs(ex-w)<.01){const y=clamp(ey,c+half,h-c-half);right=tail(w,y,1,0,0,1)+right;}
      else if(Math.abs(ey-h)<.01){const x=clamp(ex,c+half,w-c-half);bottom=tail(x,h,0,1,-1,0)+bottom;}
      else {const y=clamp(ey,c+half,h-c-half);left=tail(0,y,-1,0,0,-1)+left;}
      item.pointer.style.display='block';
      item.pointer.setAttribute('width',w);item.pointer.setAttribute('height',h);
      item.pointer.setAttribute('viewBox',`0 0 ${w} ${h}`);
      item.pointerShape.setAttribute('d',`M${c} 0 ${top} Q${w} 0 ${w} ${c} ${right} Q${w} ${h} ${w-c} ${h} ${bottom} Q0 ${h} 0 ${h-c} ${left} Q0 0 ${c} 0 Z`);
      const time=item.node.querySelector('time');
      time.hidden=false;time.textContent=shortDate(item.event.date);
      time.style.left=`${inner.x-node.x}px`;time.style.top=`${inner.y-node.y}px`;

      item.button.disabled = fade < .3;
      item.connector.hidden = true;
      item.node.hidden = false;
      item.node.style.transform = `translate(${node.x}px,${node.y}px)`;
      item.node.style.opacity = fade;
      const key = before ? item.event.person : 'both';
      if (!foreground.has(key) || distance < foreground.get(key).distance) foreground.set(key, { item, distance, phaseOpacity });
      if (!before && 1-distance > focusScore) { focusScore=1-distance; focusDate=item.event.date; }
    }
    for (const {item, phaseOpacity} of foreground.values()) { item.button.style.opacity = phaseOpacity; }
    const beforeDate = [foreground.get('a'),foreground.get('b')].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
    const currentDate = after ? focusDate : beforeDate ? beforeDate.item.event.date : config.crossingDate;
    $('current-date').textContent = currentDate.slice(0,4);
    const displayedDate = progress >= crossingStart && !after ? config.crossingDate : currentDate;
    setDate($('current-time'),displayedDate);
    const date = $('heart-date'); date.hidden = !after;
    date.style.left = `${cx}px`; date.style.top = `${centerY-unionRadius*.76}px`;
    date.dateTime = focusDate.replaceAll('.', '-');
    $('heart-year').textContent = focusDate.slice(0,4); $('heart-day').textContent = shortDate(focusDate);
    $('scroll-label').textContent = after ? '滚动向左，翻阅共同的时间' : '向下滚动，转动彼此的时间';
    const ending = $('ending-card');
    // The ending is the next item on the same orbital track. At the end
    // of the scroll its angle reaches the dial's top, just like a focus card.
    const endingDelta = (travelB - travelAfter) * sharedAngleStep;
    const endingDistance = Math.abs(endingDelta);
    const endingAngle = -Math.PI / 2 - endingDelta;
    ending.hidden = !after || endingDistance > 1.38;
    if (!ending.hidden) {
      const endingHeight = ending.offsetHeight;
      const endingCenter = point(cx, centerY, unionRadius + endingHeight * .5 + 32, endingAngle);
      const endingScale = 1 - Math.min(.24, endingDistance * .15);
      ending.style.left = `${endingCenter.x}px`;
      ending.style.top = `${endingCenter.y}px`;
      ending.style.opacity = afterOpacity * (1 - smooth((endingDistance - .95) / .5));
      ending.style.transform = `translate(-50%,-50%) rotate(${endingAngle + Math.PI/2}rad) scale(${endingScale})`;
    }
    if (progress > .995) $('scroll-label').textContent = 'to be continue · 向上滚动，重温故事';
    $('progress').style.width = `${progress*100}%`;
    let activeTick=eventTicks.reduce((nearest,tick)=>Math.abs(tick.position-progress)<Math.abs(nearest.position-progress)?tick:nearest,eventTicks[0]);
    for(const tick of eventTicks){
      tick.marker.classList.toggle('is-past',progress>=tick.position);
      tick.marker.classList.toggle('is-active',tick===activeTick);
      if(tick===activeTick)tick.marker.setAttribute('aria-current','date');else tick.marker.removeAttribute('aria-current');
    }
    const activeIndex=Math.round(progress*160);
    rulerTicks.forEach((tick,index)=>tick.classList.toggle('is-active',index===activeIndex));
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize);
  setLanguage(language);
  resize();
})();
