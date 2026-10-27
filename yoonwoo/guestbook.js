(() => {
  'use strict';
  const config=window.GUESTBOOK_CONFIG;
  const $=id=>document.getElementById(id);
  const dialog=$('guestbook-dialog'),about=$('about-dialog'),host=$('guestbook-widget');
  let language='zh',state='idle',returnToAbout=false,mounted=false,loadTimer=null;
  const tr=key=>window.TIMELINE_LOCALES[language][key]??window.TIMELINE_LOCALES.zh[key];
  function render(){
    $('open-guestbook').querySelector('span').textContent=tr('guestbookTitle');
    $('guestbook-title').textContent=tr('guestbookTitle');
    $('close-guestbook').setAttribute('aria-label',tr('closeGuestbook'));
    $('guestbook-retry').textContent=tr('guestbookRetry');
    $('guestbook-retry').hidden=state!=='error';
    $('guestbook-status').textContent=state==='loading'?tr('guestbookLoading'):state==='error'?tr('guestbookError'):'';
    host.setAttribute('aria-busy',String(state==='loading'));
    host.querySelector('iframe')?.setAttribute('title',tr('guestbookTitle'));
  }
  function ready(){clearTimeout(loadTimer);state='ready';render();}
  function failed(){clearTimeout(loadTimer);state='error';render();}
  function mount(retry=false){
    if(mounted&&!retry)return;
    clearTimeout(loadTimer);host.replaceChildren();mounted=true;
    if(!/^[a-z\d-]+\/[a-z\d._-]+$/i.test(config.repo)||!config.issueTerm){failed();return;}
    state='loading';render();
    const script=document.createElement('script');
    script.src='https://utteranc.es/client.js';script.async=true;script.crossOrigin='anonymous';
    script.setAttribute('repo',config.repo);script.setAttribute('issue-term',config.issueTerm);
    script.setAttribute('theme',config.theme||'github-dark');
    script.onerror=failed;
    script.onload=()=>{
      const frame=host.querySelector('iframe');
      if(!frame){failed();return;}
      frame.title=tr('guestbookTitle');frame.addEventListener('load',ready,{once:true});
    };
    loadTimer=setTimeout(failed,20000);host.append(script);
  }
  window.addEventListener('message',event=>{
    const frame=host.querySelector('iframe');
    if(event.origin==='https://utteranc.es'&&frame&&event.source===frame.contentWindow&&event.data?.type==='resize'&&Number(event.data.height)>0)ready();
  });
  function open(){returnToAbout=about.open;if(about.open)about.close();dialog.showModal();mount();}
  $('open-guestbook').addEventListener('click',open);
  $('close-guestbook').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{if(returnToAbout){returnToAbout=false;about.showModal();$('open-guestbook').focus();}});
  $('guestbook-retry').addEventListener('click',()=>mount(true));
  document.addEventListener('timeline-language-change',event=>{language=['zh','en','ko'].includes(event.detail.language)?event.detail.language:'zh';render();});
  render();
  // Utterances completes GitHub sign-in on the original page. Reopen the widget
  // so its official client can consume and remove its callback parameter.
  if(new URLSearchParams(window.location.search).has('utterances')){
    returnToAbout=true;dialog.showModal();mount();
  }
})();
