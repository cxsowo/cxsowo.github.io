(() => {
  'use strict';
  const config = window.TIMELINE_CONFIG;
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
  const cards = [];
  const labelFor = event => event.person === 'both' ? `${config.people.a} + ${config.people.b} · 共同事件` : `${config.people[event.person]} · 个人事件`;
  const artworkLabels = { mountain: 'Somewhere, a beginning', window: 'A window into time', moon: 'Under the same moon', union: 'Two lives, one moment' };
  function createEvent(event, phase) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'event'; button.dataset.person = event.person;
    button.setAttribute('aria-label', `${event.date}，${labelFor(event)}，${event.title}，查看详情`);
    const art = document.createElement('div'); art.className = `art ${event.art}`; art.setAttribute('aria-hidden', 'true');
    const moon = document.createElement('i'); moon.className = 'moon'; if (event.art !== 'window' && event.art !== 'union') art.append(moon);
    const caption = document.createElement('span'); caption.className = 'art-caption'; caption.textContent = artworkLabels[event.art] || artworkLabels.moon; art.append(caption);
    const head = document.createElement('div'); head.className = 'event-head';
    const date = document.createElement('time'); date.dateTime = event.date.replaceAll('.', '-'); date.textContent = event.date;
    const owner = document.createElement('span'); owner.textContent = event.person === 'both' ? 'A + B' : config.people[event.person]; head.append(date, owner);
    const title = document.createElement('h2'); title.textContent = event.title;
    const copy = document.createElement('p'); copy.textContent = event.text;
    const foot = document.createElement('div'); foot.className = 'card-footer';
    const footLabel = document.createElement('span'); footLabel.textContent = '示例事件 · 查看详情';
    const arrow = document.createElement('b'); arrow.textContent = '↗'; foot.append(footLabel, arrow);
    button.append(art, head, title, copy, foot);
    button.addEventListener('click', () => {
      $('detail-owner').textContent = labelFor(event); $('detail-date').textContent = event.date;
      $('detail-date').dateTime = event.date.replaceAll('.', '-'); $('detail-title').textContent = event.title;
      $('detail-copy').textContent = event.text; dialog.showModal();
    });
    const node = document.createElement('div'); node.className = 'timeline-node'; node.dataset.person = event.person;
    const time = document.createElement('time'); time.textContent = event.date; node.append(time);
    const connector = document.createElement('div'); connector.className = 'node-connector';
    cardsRoot.append(connector, node, button);
    const item = { event, phase, button, node, connector }; cards.push(item);
  }
  config.before.forEach(event => createEvent(event, 'before'));
  config.after.forEach(event => createEvent(event, 'after'));
  $('crossing-date').textContent = config.crossingDate;
  const cardSpacing = clamp(config.cardSpacing ?? .16, .08, 1);
  const exitTravel = .5 / cardSpacing;
  const travelBefore = Math.max(...config.before.map(event => event.position)) + exitTravel;
  const travelAfter = Math.max(...config.after.map(event => event.position)) + exitTravel;
  const tickPreview = document.createElement('div');
  tickPreview.id = 'tick-preview'; tickPreview.className = 'tick-preview';
  tickPreview.setAttribute('role', 'tooltip'); tickPreview.hidden = true;
  document.querySelector('.bottom').append(tickPreview);
  function showTickPreview(item, marker) {
    const miniature = document.createElement('div');
    miniature.className = 'event'; miniature.dataset.person = item.event.person;
    for (const child of item.button.children) miniature.append(child.cloneNode(true));
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
    const crossingStart = clamp(config.crossingAt, .1, .8);
    const crossingEnd = Math.min(.95, crossingStart + config.crossingDuration);
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
    date.dateTime = item.event.date.replaceAll('.', '-');
    date.textContent = item.event.date.slice(5);
    marker.append(dot, date); $('event-ticks').append(marker);
    return { marker, position };
  });
  function scrollToProgress(p) { window.scrollTo({ top: p * (journey.offsetHeight - height), behavior: reducedMotion ? 'instant' : 'smooth' }); }
  $('jump').addEventListener('click', () => scrollToProgress(config.crossingAt + config.crossingDuration * .65));
  $('restart').addEventListener('click', () => scrollToProgress(0));
  document.querySelector('.wordmark').addEventListener('click', event => { event.preventDefault(); scrollToProgress(0); });
  $('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  function resize() {
    width = document.documentElement.clientWidth; height = document.querySelector('.stage').clientHeight;
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
    $('jump').hidden = index !== 0;
    document.querySelector('.chapter').hidden = true;
  }
  function hide(item) {
    item.button.hidden = true; item.button.disabled = true; item.node.hidden = true; item.connector.hidden = true;
  }
  function draw() {
    raf = 0;
    progress = clamp(window.scrollY / Math.max(1, journey.offsetHeight - height));
    const crossingStart = clamp(config.crossingAt, .1, .8);
    const crossingEnd = Math.min(.95, crossingStart + config.crossingDuration);
    const morph = smooth((progress - crossingStart) / config.crossingDuration);
    const after = progress >= crossingEnd;
    chapter(progress < crossingStart ? 0 : after ? 2 : 1);
    const cx = width / 2;
    const originY = height * .12;
    const nearY = height * .82;
    const endGap = Math.min(width * .035, 26);
    // Spread the two tracks across the viewport instead of a narrow center column.
    const spread = width * .43 - endGap;
    const gap = endGap * (1 - morph), extent = spread * (1 - morph);
    const startY = mix(originY, height * .45, morph);
    aRail.setAttribute('d', `M${cx - gap - extent} ${startY} L${cx - gap} ${nearY}`);
    bRail.setAttribute('d', `M${cx + gap + extent} ${startY} L${cx + gap} ${nearY}`);
    $('rails').style.opacity = 1 - morph;
    const heartY = mix(height * .40, height * .18, morph), size = Math.min(width * .13, height * .08, 64);
    const unionGradient = $('union-color');
    unionGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    unionGradient.setAttribute('x1', cx - size); unionGradient.setAttribute('x2', cx + size);
    unionGradient.setAttribute('y1', heartY); unionGradient.setAttribute('y2', heartY);
    const bottomY = heartY + size * .55, topY = heartY - size * .2;
    const left = `M${cx} ${topY} C${cx - size * .1} ${heartY - size * .91} ${cx - size * .65} ${heartY - size * 1.05} ${cx - size * .83} ${heartY - size * .51} C${cx - size} ${heartY - size * .06} ${cx - size * .23} ${heartY + size * .3} ${cx} ${bottomY}`;
    const right = `M${cx} ${topY} C${cx + size * .1} ${heartY - size * .91} ${cx + size * .65} ${heartY - size * 1.05} ${cx + size * .83} ${heartY - size * .51} C${cx + size} ${heartY - size * .06} ${cx + size * .23} ${heartY + size * .3} ${cx} ${bottomY}`;
    heartPaths.forEach((path, index) => {
      path.setAttribute('d', index === 0 ? left : right);
      const length = path.getTotalLength(); path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length * (1 - morph)}`;
    });
    heart.style.opacity = morph;
    const crossingLabelOpacity = Math.sin(clamp((progress - crossingStart) / config.crossingDuration) * Math.PI);
    $('crossing-label').style.opacity = crossingLabelOpacity;
    const beforeFade = 1 - smooth((progress - (crossingStart - .035)) / .035);
    const afterFade = smooth((progress - crossingEnd) / .025);
    let latestDate = currentChapter === 2 ? config.after[0].date.slice(0, 4) : config.before[0].date.slice(0, 4), closest = Infinity;
    const sharedCards = [];
    let focusDate = config.crossingDate, focusScore = -1;
    for (const item of cards) {
      const isBefore = item.phase === 'before';
      const opacity = isBefore ? beforeFade : afterFade;
      if (opacity < .001 || (isBefore && after) || (!isBefore && !after)) { hide(item); continue; }
      const travel = isBefore ? progress / crossingStart * travelBefore : (progress - crossingEnd) / (1 - crossingEnd) * travelAfter;
      // Compress depth without changing event order or the timeline phases.
      const z = (item.event.position - travel) * cardSpacing;
      if (z < -.4 || z > 10) { hide(item); continue; }
      const depth = 1 / (1 + Math.max(z, -.4) * .7);
      const vanY = isBefore ? originY : bottomY;
      let y = isBefore
        ? originY + (nearY - originY) * Math.min(depth, 1)
        : vanY + (height * 1.03 - vanY) * depth;
      const scale = isBefore ? Math.min(.96, depth * 1.15) : Math.min(.96, depth * .96);
      // Fade the entire card with distance, including its image and text.
      const distanceOpacity = clamp(Math.pow(depth, 1.35), .12, 1);
      const fade = opacity * distanceOpacity * smooth((10 - z) / 3) * smooth((z + .4) / .4);
      if (fade < .015) { hide(item); continue; }
      const cardWidth = isBefore
        ? (width <= 600 ? width * .45 : width * .36)
        : width;
      item.button.hidden = false;
      const cardHeight = item.button.offsetHeight;
      if (isBefore) {
        // Keep the foreground cards above the bottom navigation.
        y = Math.min(y, height * .86 - cardHeight * scale / 2);
      }
      if (!isBefore) {
        y = vanY + 18 + cardHeight * scale / 2 + height * .1 * Math.min(depth, 1);
      }
      let x = cx, nodeX = cx;
      if (isBefore) {
        const direction = item.event.person === 'a' ? -1 : 1;
        // Use the same inward-facing geometry as the drawn rail.
        nodeX = cx + direction * (endGap + spread * (nearY - y) / (nearY - originY));
        x = nodeX + direction * (cardWidth * scale / 2 + 20);
        x = clamp(x, cardWidth * scale / 2 + 16, width - cardWidth * scale / 2 - 16);
      }
      item.button.hidden = false; item.button.disabled = fade < .25; item.button.style.opacity = fade;
      item.button.style.zIndex = `${Math.round(depth * 100) + 5}`;
      item.button.style.transform = `translate3d(${x - cardWidth / 2}px,${y - cardHeight / 2}px,0) scale(${scale})`;
      if (!isBefore) {
        sharedCards.push({ button: item.button, x, y, cardWidth, cardHeight, scale });
        const score = depth * fade;
        if (score > focusScore) { focusScore = score; focusDate = item.event.date; }
      }
      item.button.style.filter = reducedMotion ? '' : `blur(${Math.max(0, z - 4) * .14}px)`;
      item.node.hidden = !isBefore; item.connector.hidden = !isBefore;
      item.node.style.transform = `translate(${nodeX - 3.5}px,${y - 3.5}px)`; item.node.style.opacity = fade;
      const targetX = x + (item.event.person === 'a' ? 1 : -1) * cardWidth * scale / 2;
      item.connector.style.width = `${Math.abs(nodeX - targetX)}px`;
      item.connector.style.transform = `translate(${Math.min(nodeX, targetX)}px,${y}px)`; item.connector.style.opacity = fade;
      if (Math.abs(z - 1.2) < closest) { closest = Math.abs(z - 1.2); latestDate = item.event.date.slice(0, 4); }
    }
    // Anchor the back of the stack just below the heart, moving the whole
    // group together so its existing overlap and perspective stay intact.
    if (sharedCards.length) {
      const backTop = Math.min(...sharedCards.map(card => card.y - card.cardHeight * card.scale / 2));
      const lift = Math.max(0, backTop - bottomY - 18);
      for (const card of sharedCards) {
        card.button.style.transform = `translate3d(${card.x - card.cardWidth / 2}px,${card.y - card.cardHeight / 2 - lift}px,0) scale(${card.scale})`;
      }
    }
    if (currentChapter === 1) latestDate = config.crossingDate.slice(0, 4);
    if (progress > .995) { latestDate = config.after.at(-1).date.slice(0, 4); $('scroll-label').textContent = '故事未完，回望每一个交点'; }
    else $('scroll-label').textContent = '向下滚动，沿时间向前';
    if (after && focusScore < 0) focusDate = config.after.at(-1).date;
    const heartDate = $('heart-date');
    heartDate.hidden = !after;
    heartDate.style.left = `${cx}px`;
    heartDate.style.top = `${heartY + size * .04}px`;
    heartDate.dateTime = focusDate.replaceAll('.', '-');
    $('heart-year').textContent = focusDate.slice(0, 4);
    $('heart-day').textContent = focusDate.slice(5);
    $('current-date').textContent = latestDate;
    $('progress').style.width = `${progress * 100}%`;
    for (const tick of eventTicks) tick.marker.classList.toggle('is-past', progress >= tick.position);
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize);
  resize();
})();
