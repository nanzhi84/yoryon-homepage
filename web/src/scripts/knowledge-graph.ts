// Endpoints follow the real rendered dots, including wrapped labels and mobile layouts.
function initGraph(graph: HTMLElement) {
 const svg=graph.querySelector<SVGSVGElement>('svg.knowledge-edges');
 if(!svg)return;
 const nodes=[...graph.querySelectorAll<HTMLElement>('[data-graph-node]')];
 const edges=[...graph.querySelectorAll<SVGPathElement>('[data-graph-edge]')];
 const draw=()=>{
  const bounds=graph.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
  const locations=new Map(nodes.map(node=>{
   const rect=(node.querySelector('.graph-dot')??node).getBoundingClientRect();
   return [node.dataset.graphNode,{x:rect.left+rect.width/2-bounds.left,y:rect.top+rect.height/2-bounds.top}] as const;
  }));
  edges.forEach(edge=>{
   const from=locations.get(edge.dataset.from),to=locations.get(edge.dataset.to);
   if(!from||!to)return;
   const bend=Number(edge.dataset.bend??1);
   const dx=to.x-from.x,dy=to.y-from.y;
   edge.setAttribute('d',`M ${from.x} ${from.y} C ${from.x+dx*.38-dy*.12*bend} ${from.y+dy*.05+dx*.12*bend}, ${from.x+dx*.72+dy*.12*bend} ${from.y+dy*.9-dx*.09*bend}, ${to.x} ${to.y}`);
  });
  const orbit=svg.querySelector('ellipse.graph-orbit');
  if(orbit){orbit.setAttribute('cx',String(bounds.width*.5));orbit.setAttribute('cy',String(bounds.height*.5));orbit.setAttribute('rx',String(bounds.width*.29));orbit.setAttribute('ry',String(bounds.height*.2));orbit.setAttribute('transform',`rotate(-18 ${bounds.width*.5} ${bounds.height*.5})`);}
 };
 const highlight=(id?:string)=>{
  graph.classList.toggle('has-active-node',Boolean(id));
  nodes.forEach(n=>n.classList.toggle('is-active',n.dataset.graphNode===id));
  edges.forEach(e=>e.classList.toggle('is-active',Boolean(id&&(e.dataset.from===id||e.dataset.to===id))));
 };
 nodes.forEach(node=>{
  node.addEventListener('pointerenter',()=>highlight(node.dataset.graphNode));
  node.addEventListener('focus',()=>highlight(node.dataset.graphNode));
  node.addEventListener('pointerleave',()=>highlight(nodes.find(n=>n===document.activeElement)?.dataset.graphNode));
  node.addEventListener('blur',()=>highlight());
 });
 const observer=new ResizeObserver(draw);observer.observe(graph);nodes.forEach(n=>observer.observe(n));
 document.fonts.ready.then(draw);draw();
 window.addEventListener('pagehide',event=>{if(!event.persisted)observer.disconnect();},{once:true});
}
document.querySelectorAll<HTMLElement>('[data-knowledge-graph]').forEach(initGraph);
