(() => {
  'use strict';
  const viewer=document.getElementById('image-viewer'),stage=document.getElementById('viewer-stage'),image=document.getElementById('viewer-image');
  const counter=document.getElementById('viewer-counter'),pointers=new Map();
  let images=[],index=0,zoom=1,angle=0,flipX=1,flipY=1,x=0,y=0,opener=null,sourceGallery=null,gesture=null;
  const icons={
    close:'M6 6l12 12M18 6 6 18',previousPhoto:'m15 5-7 7 7 7',nextPhoto:'m9 5 7 7-7 7',
    flipHorizontal:'M12 3v18M8 6 3 18h5V6Zm8 0v12h5L16 6Z',
    flipVertical:'M3 12h18M6 8h12L6 3v5Zm0 8v5l12-5H6Z',
    rotateLeft:'M4 10a8 8 0 1 1 1 8M4 4v6h6',rotateRight:'M20 10a8 8 0 1 0-1 8M20 4v6h-6',
    zoomOut:'M10 7v0M6 10h8M16 16l5 5',zoomIn:'M6 10h8M10 6v8M16 16l5 5',
    resetImage:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5'
  };
  const tr=key=>{
    const lang=document.documentElement.lang.startsWith('zh')?'zh':document.documentElement.lang;
    return window.TIMELINE_LOCALES[lang]?.[key]??window.TIMELINE_LOCALES.zh[key];
  };
  for(const button of viewer.querySelectorAll('[data-viewer-action]')){
    const action=button.dataset.viewerAction;
    button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[action]}"/>${action.startsWith('zoom')?'<circle cx="10" cy="10" r="7"/>':''}</svg>`;
    button.addEventListener('click',()=>act(action));
  }
  function labels(){
    viewer.setAttribute('aria-label',tr('imagePreview'));
    document.getElementById('viewer-toolbar').setAttribute('aria-label',tr('imageTools'));
    viewer.querySelectorAll('[data-viewer-action]').forEach(button=>{
      const label=tr(button.dataset.viewerAction==='close'?'closeImage':button.dataset.viewerAction);
      button.setAttribute('aria-label',label);button.title=label;
    });
  }
  function draw(){
    if(!image.naturalWidth)return;
    const sideways=Math.abs(angle%180)===90;
    const width=sideways?image.naturalHeight:image.naturalWidth,height=sideways?image.naturalWidth:image.naturalHeight;
    const fit=Math.min(stage.clientWidth/width,stage.clientHeight/height,1);
    image.style.width=`${image.naturalWidth*fit}px`;image.style.height=`${image.naturalHeight*fit}px`;
    image.style.transform=`translate(${x}px,${y}px) rotate(${angle}deg) scale(${zoom*flipX},${zoom*flipY})`;
    viewer.querySelector('[data-viewer-action="zoomOut"]').disabled=zoom<=.25;
    viewer.querySelector('[data-viewer-action="zoomIn"]').disabled=zoom>=8;
  }
  function reset(){zoom=1;angle=0;flipX=1;flipY=1;x=0;y=0;draw();}
  function setZoom(value,anchorX=0,anchorY=0){
    const next=Math.max(.25,Math.min(8,value)),ratio=next/zoom;
    x=anchorX-(anchorX-x)*ratio;y=anchorY-(anchorY-y)*ratio;zoom=next;draw();
  }
  function show(next){
    index=(next+images.length)%images.length;image.src=images[index].src;image.alt=images[index].alt||'';
    counter.textContent=images.length>1?`${index+1} / ${images.length}`:'';
    document.getElementById('viewer-prev').hidden=document.getElementById('viewer-next').hidden=images.length<2;
    reset();
    sourceGallery?.querySelectorAll('.gallery-thumbs button')[index]?.click();
  }
  function act(action){
    if(action==='close'){viewer.close();return;}
    if(action==='previousPhoto'){show(index-1);return;}
    if(action==='nextPhoto'){show(index+1);return;}
    if(action==='zoomIn')setZoom(zoom*1.25);
    else if(action==='zoomOut')setZoom(zoom/1.25);
    else if(action==='rotateLeft'){angle-=90;x=0;y=0;draw();}
    else if(action==='rotateRight'){angle+=90;x=0;y=0;draw();}
    else if(action==='flipHorizontal'){flipX*=-1;draw();}
    else if(action==='flipVertical'){flipY*=-1;draw();}
    else if(action==='resetImage')reset();
  }
  document.getElementById('detail-content').addEventListener('click',event=>{
    const button=event.target.closest('.gallery-open,.detail-image-open');if(!button)return;
    const selected=button.querySelector('img');opener=button;sourceGallery=button.closest('.detail-gallery');
    images=sourceGallery?[...sourceGallery.querySelectorAll('.gallery-thumbs img')].map(photo=>({src:photo.src,alt:selected.alt})):[{src:selected.src,alt:selected.alt}];
    index=Math.max(0,images.findIndex(photo=>photo.src===selected.src));labels();viewer.showModal();show(index);
  });
  image.addEventListener('load',draw);
  viewer.addEventListener('close',()=>{
    pointers.clear();gesture=null;stage.classList.remove('is-dragging');image.removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
  viewer.addEventListener('keydown',event=>{
    if(event.key==='Escape')return;
    const action={ArrowLeft:'previousPhoto',ArrowRight:'nextPhoto','+':'zoomIn','=':'zoomIn','-':'zoomOut','0':'resetImage'}[event.key];
    if(action){event.preventDefault();event.stopPropagation();act(action);}
  });
  stage.addEventListener('wheel',event=>{
    event.preventDefault();const r=stage.getBoundingClientRect();
    setZoom(zoom*Math.exp(-event.deltaY*.002),event.clientX-r.left-r.width/2,event.clientY-r.top-r.height/2);
  },{passive:false});
  stage.addEventListener('dblclick',()=>{zoom>1?reset():setZoom(2);});
  const center=()=>{const points=[...pointers.values()];return{x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length,distance:points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0};};
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();stage.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});gesture=center();stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const next=center();
    if(gesture.distance&&next.distance){const r=stage.getBoundingClientRect();setZoom(zoom*next.distance/gesture.distance,next.x-r.left-r.width/2,next.y-r.top-r.height/2);}
    x+=next.x-gesture.x;y+=next.y-gesture.y;gesture=next;draw();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,event=>{
    pointers.delete(event.pointerId);gesture=pointers.size?center():null;if(!pointers.size)stage.classList.remove('is-dragging');
  });
  window.addEventListener('resize',()=>{if(viewer.open)draw();});
  document.addEventListener('timeline-language-change',labels);labels();
})();
