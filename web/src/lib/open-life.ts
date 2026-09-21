import { getCollection } from "astro:content";
import {lifeNodes, topics, readingCollections, contentRelations} from "../data/open-life";
import type {LifeNode, Visibility} from "../data/open-life";
export const slugOf = (entry: {id: string; slug?: string}) => entry.slug ?? entry.id.replace(/\.(mdoc|mdx?)$/, "");
export async function getLifeGraph() {
 const posts = (await getCollection("blog")).filter(p=>!p.data.draft).sort((a,b)=>+b.data.pubDate-+a.data.pubDate);
 const projects = (await getCollection("projects")).filter(p=>!p.data.hidden).sort((a,b)=>a.data.order-b.data.order);
 const projectNodes: LifeNode[] = projects.map(p=>{
   const dates = p.data.period.match(/\d{4}\.\d{2}/g) ?? [];
   return {id:slugOf(p), type:"project", title:p.data.title.split(" · ")[0], summary:p.data.summary,
    startDate:dates[0]?.replace(".","-"),endDate:dates[1]?.replace(".","-"),
    importance:Math.max(1,10-p.data.order),
    status:p.data.period.includes("至今")?"ongoing":"completed",projectId:slugOf(p)};
 });
 const nodes = [...lifeNodes,...projectNodes];
 const contents = posts.map(post=>{
  const id=slugOf(post), relation=contentRelations.find(r=>r.contentId===id);
  const text=[post.data.title,...post.data.tags].join(" ").toLowerCase();
  return {id,post,displayTitle:relation?.displayTitle??post.data.title,type:relation?.type??(post.data.category==="Tech"?"technical":"essay"),title:post.data.title,summary:post.data.description,href:`/blog/${id}/`,
   nodeIds:relation?.nodeIds??[],topicIds:relation?.topicIds??topics.filter(t=>t.match.some(m=>text.includes(m))).map(t=>t.id),
   collectionIds:readingCollections.filter(c=>c.contentIds.includes(id)).map(c=>c.id),
   visibility:(relation?.visibility??"public") as Visibility,preview:relation?.preview??post.data.description};
 });
 const uniqueIds=(ids:string[],context:string)=>{if(new Set(ids).size!==ids.length)throw new Error(`Duplicate ID in ${context}`)};
 uniqueIds(nodes.map(n=>n.id),"nodes"); uniqueIds(topics.map(t=>t.id),"topics");
 uniqueIds(readingCollections.map(c=>c.id),"collections"); uniqueIds(contentRelations.map(c=>c.contentId),"contentRelations");
 // Fail a build on stale editorial links rather than producing broken navigation.
 const requireIds=(ids:string[], valid:string[], context:string)=>ids.forEach(id=>{if(!valid.includes(id))throw new Error(`Unknown relation ${id} in ${context}`)});
 for(const collection of readingCollections){
  requireIds(collection.contentIds,contents.map(c=>c.id),collection.id);
  requireIds(collection.nodeIds,nodes.map(n=>n.id),collection.id);
  requireIds(collection.topicIds,topics.map(t=>t.id),collection.id);
 }
 for(const relation of contentRelations){
  requireIds([relation.contentId],contents.map(c=>c.id),"contentRelations");
  requireIds(relation.nodeIds,nodes.map(n=>n.id),relation.contentId);
  requireIds(relation.topicIds??[],topics.map(t=>t.id),relation.contentId);
 }
 return {nodes,topics,collections:readingCollections,contents,projects};
}
export type LifeGraph = Awaited<ReturnType<typeof getLifeGraph>>;
export type LifeContent = LifeGraph["contents"][number];
