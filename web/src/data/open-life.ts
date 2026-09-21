// Editorial relationships live here; article bodies remain in the blog collection.
export type NodeType = "phase" | "decision" | "milestone" | "project";
export type ContentType = "diary" | "essay" | "technical" | "review" | "note";
export type Visibility = "public" | "preview" | "subscriber";
export interface LifeNode {
  id: string; type: NodeType; title: string; summary: string;
  startDate?: string; endDate?: string; status: "ongoing" | "completed" | "organizing";
  projectId?: string; importance?: number;
}
export interface Topic { id: string; title: string; summary: string; match: string[] }
export interface ReadingCollection {
  id: string; title: string; summary: string; contentIds: string[]; nodeIds: string[]; topicIds: string[];
}
export interface ContentRelation {
  contentId: string; displayTitle?: string; nodeIds: string[]; topicIds?: string[];
  type?: ContentType; visibility?: Visibility; preview?: string;
}
export const nodeLabels: Record<NodeType, string> = {phase:"人生阶段", decision:"一次选择", milestone:"里程碑", project:"项目"};
export const lifeNodes: LifeNode[] = [
  {id:"born",type:"milestone",title:"来到这个世界",summary:"故事从这里开始。",startDate:"2004-11-26",importance:10,status:"completed"},
  {id:"ai-pm-internship",type:"phase",title:"AI PM 实习",summary:"记录真实工作里的问题、当时的判断，以及后来的改变。",status:"organizing"},
  {id:"university",type:"phase",title:"大学生活",summary:"课堂内外，记录探索、日常与慢慢发生的变化。",status:"organizing"},
];
export const topics: Topic[] = [
  {id:"agent",title:"Agent",summary:"从工作流到自主行动，探索 Agent 的工具、架构与判断。",match:["agent","harness","工具"]},
  {id:"ai",title:"AI",summary:"模型、评测与应用，理解智能如何走进真实世界。",match:["ai","模型","llm","ocr","claude","gpt"]},
  {id:"product",title:"产品",summary:"从一个问题出发，理解技术怎样成为有用的产品。",match:["产品","cursor","设计","工作流"]},
  {id:"investing",title:"投资",summary:"记录判断与选择，回头看看当时的自己。",match:["投资"]},
];
export const readingCollections: ReadingCollection[] = [
  {id:"agent-map",title:"Agent 技术地图",summary:"从工作流、工具设计到 Harness，一步步建立对 Agent 的理解。",contentIds:["workflow-to-agent-patterns","agent-design-patterns","agent-tool-design","deepseek-harness","jev-typed-decisions"],nodeIds:[],topicIds:["agent","ai","product"]},
  {id:"ai-pm-internship",title:"AI PM 实习日记",summary:"关于真实工作里的观察、选择与复盘。",contentIds:[],nodeIds:["ai-pm-internship"],topicIds:["product","agent"]},
  {id:"university",title:"我的大学生活",summary:"把大学里的经历和感受留在这里。",contentIds:[],nodeIds:["university"],topicIds:[]},
  {id:"investing",title:"我的投资笔记",summary:"留下做决定时的思考，让选择有迹可循。",contentIds:[],nodeIds:[],topicIds:["investing"]},
];
// Add explicit many-to-many links here when the author confirms their context.
// Never infer a life event from an article's publication date.
export const contentRelations: ContentRelation[] = [
 {contentId:"jev-typed-decisions",displayTitle:"Jev：从生成到类型化决策",nodeIds:[]},
 {contentId:"deepseek-harness",displayTitle:"深入 DeepSeek Harness",nodeIds:[]},
 {contentId:"agent-tool-design",displayTitle:"为 Agent 写好工具",nodeIds:[]},
 {contentId:"agent-design-patterns",displayTitle:"Agent 设计模式",nodeIds:[]},
 {contentId:"workflow-to-agent-patterns",displayTitle:"从 Workflow 到 Agent",nodeIds:[]},
 {contentId:"claude-subagent-vs-agent-teams",displayTitle:"Subagent 与 Agent Teams",nodeIds:[]},
];
