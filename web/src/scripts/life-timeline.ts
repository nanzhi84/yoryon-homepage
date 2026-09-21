// Keep a long lifetime browsable in bounded, chronological chapters.
const root=document.querySelector<HTMLElement>('[data-long-timeline]');
if(root){
 const panels=[...root.querySelectorAll<HTMLElement>('[data-year-panel]')];
 const links=[...root.querySelectorAll<HTMLAnchorElement>('[data-year-link]')];
 const pages=panels.flatMap(panel=>{
  const entries=[...panel.querySelectorAll<HTMLElement>('[data-timeline-entry]')];
  return Array.from({length:Math.ceil(entries.length/3)},(_,index)=>({panel,entries,index,total:Math.ceil(entries.length/3)}));
 });
 const pager=root.querySelector<HTMLElement>('.timeline-pager')!;
 const prev=root.querySelector<HTMLButtonElement>('[data-timeline-prev]')!;
 const next=root.querySelector<HTMLButtonElement>('[data-timeline-next]')!;
 let current=0;
 function show(index:number){
  if(!pages[index])return;
  current=index;const page=pages[index];
  panels.forEach(panel=>panel.hidden=panel!==page.panel);
  page.entries.forEach((entry,i)=>entry.hidden=i<page.index*3||i>=(page.index+1)*3);
  links.forEach(link=>{const selected=link.dataset.yearLink===page.panel.dataset.yearPanel;if(selected)link.setAttribute('aria-current','date');else link.removeAttribute('aria-current');});
  root!.querySelector('[data-timeline-status]')!.textContent=`${page.panel.dataset.yearPanel} · ${page.index+1} / ${page.total} 段`;
  prev.disabled=index===0;next.disabled=index===pages.length-1;
 }
 function fromHash(){const year=location.hash.replace('#life-year-','');const index=pages.findIndex(p=>p.panel.dataset.yearPanel===year);if(index>=0)show(index);}
 links.forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const index=pages.findIndex(p=>p.panel.dataset.yearPanel===link.dataset.yearLink);show(index);history.replaceState(null,'',link.hash);}));
 function step(offset:number){show(current+offset);history.replaceState(null,'',`#life-year-${pages[current].panel.dataset.yearPanel}`);}
 prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
 window.addEventListener('hashchange',fromHash);
 if(pages.length){show(0);fromHash();pager.hidden=false;root.classList.add('timeline-ready');}
}
