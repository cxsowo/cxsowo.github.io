(() => {
  'use strict';
  const config=window.GUESTBOOK_CONFIG,$=id=>document.getElementById(id);
  const dialog=$('guestbook-dialog'),about=$('about-dialog'),host=$('guestbook-widget');
  const service='https://giscus.app',languages={zh:'zh-CN',en:'en',ko:'ko'};
  let language=document.documentElement.lang.startsWith('zh')?'zh':document.documentElement.lang,state='idle',returnToAbout=false,mounted=false,loadTimer=null;
  const tr=key=>window.TIMELINE_LOCALES[language]?.[key]??window.TIMELINE_LOCALES.zh[key];
  const theme=()=>new URL(config.theme,window.location.href).href;
  function render(){
    $('open-guestbook').querySelector('span').textContent=tr('guestbookTitle');
    $('guestbook-title').textContent=tr('guestbookTitle');
    $('close-guestbook').setAttribute('aria-label',tr('closeGuestbook'));
    $('guestbook-retry').textContent=tr('guestbookRetry');$('guestbook-retry').hidden=state!=='error';
    $('guestbook-status').textContent=state==='loading'?tr('guestbookLoading'):state==='error'?tr('guestbookError'):state==='setup'?tr('guestbookPreparing'):'';
    host.setAttribute('aria-busy',String(state==='loading'));
    host.querySelector('iframe')?.setAttribute('title',tr('guestbookTitle'));
  }
  function ready(){clearTimeout(loadTimer);state='ready';render();}
  function failed(){clearTimeout(loadTimer);state='error';render();}
  function mount(retry=false){
    if(mounted&&!retry)return;
    clearTimeout(loadTimer);host.replaceChildren();mounted=true;
    if(!/^[a-z\d-]+\/[a-z\d._-]+$/i.test(config.repo)||!config.repoId||!config.categoryId){state='setup';render();return;}
    state='loading';render();
    const script=document.createElement('script');script.src=service+'/client.js';script.async=true;script.crossOrigin='anonymous';
    const attributes={repo:config.repo,'repo-id':config.repoId,category:config.category,'category-id':config.categoryId,mapping:'specific',term:config.issueTerm,strict:'0','reactions-enabled':'0','emit-metadata':'0','input-position':'top',theme:theme(),lang:languages[language]||'zh-CN',loading:'eager'};
    Object.entries(attributes).forEach(([key,value])=>script.setAttribute('data-'+key,value));
    script.onerror=failed;script.onload=()=>{
      const frame=host.querySelector('iframe');if(!frame){failed();return;}
      frame.title=tr('guestbookTitle');frame.addEventListener('load',ready,{once:true});
    };
    loadTimer=setTimeout(failed,25000);host.append(script);
  }
  window.addEventListener('message',event=>{
    const frame=host.querySelector('iframe'),message=event.data?.giscus;
    if(event.origin!==service||!frame||event.source!==frame.contentWindow||!message)return;
    if(Number(message.resizeHeight)>0)ready();
    if(message.error&&!/discussion not found/i.test(message.error))failed();
  });
  function open(){returnToAbout=about.open;if(about.open)about.close();dialog.showModal();mount();}
  $('open-guestbook').addEventListener('click',open);
  $('close-guestbook').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{if(returnToAbout){returnToAbout=false;about.showModal();$('open-guestbook').focus();}});
  $('guestbook-retry').addEventListener('click',()=>mount(true));
  document.addEventListener('timeline-language-change',event=>{
    language=languages[event.detail.language]?event.detail.language:'zh';render();
    host.querySelector('iframe')?.contentWindow.postMessage({giscus:{setConfig:{lang:languages[language]}}},service);
  });
  render();
  // The official giscus client consumes its own sign-in callback parameter.
  if(new URLSearchParams(window.location.search).has('giscus')){returnToAbout=true;dialog.showModal();mount();}
})();
