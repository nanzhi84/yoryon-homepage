# Open Life authoring

## Content and components

Article bodies stay in `src/content/blog/`; project facts stay in `src/content/projects/`. Never duplicate an article for another browsing axis. Every article has one canonical `/blog/<slug>/` URL.

`open-life.ts` contains typed editorial data:

- `lifeNodes`: actual phases, decisions, milestones and projects. Unknown dates stay absent. Undated nodes are displayed separately rather than assigned invented chronology.
- `topics`: long-lived interests. `match` provides a default title/tag matcher; `contentRelations.topicIds` explicitly overrides it (including an empty array).
- `readingCollections`: curated reading sequences. `contentIds` controls chapter order; it is not publication order.
- `contentRelations`: many-to-many article/node links. Add multiple `nodeIds`, optional `topicIds`, `type`, `visibility`, and a public `preview`. Do not infer biographical relationships from publication dates.

Visible projects automatically become project nodes using their existing `period` metadata. Do not add a duplicate node with the same project slug. Nodes and articles without relations are supported. Empty series remain honest empty states.

## Adding content

1. Add a normal blog entry with the required collection frontmatter. Draft entries remain hidden everywhere.
2. Optionally add its slug to `readingCollections[].contentIds` in reading order.
3. Optionally add a `contentRelations` record with confirmed life-node IDs and explicit topic IDs.
4. Run `npm run build`. Invalid relation IDs and duplicate entity IDs fail the build.

Adding a life event only requires a `LifeNode` record. Its detail route and timeline entry are generated automatically. Supported dates use `YYYY-MM` or `YYYY-MM-DD`. Changing a title does not change a stable ID.

## Reusable presentation

Components in `src/components/life/`: `NodeLink`, `ContentLink`, `ProjectPreview`, `CollectionLink`, `ExploreNav`, `AccessBadge`, `SubscriptionGate`, `ReadingConnections`, and decorative `Orbit`. Shared typography, spacing, responsive layouts and interaction states live in `public/css/life-archive.css`.

`ArchiveShell` provides shared detail-page layout. `getLifeGraph()` resolves all entities and validates relationships at build time. Resume links store only canonical article paths per series in localStorage and tolerate blocked storage. The search is local and requires no service.

## Subscription boundary

All existing articles remain public. Access states are frontend presentation for a future subscription system, not a working payment/authentication system. Non-public article routes emit only the public preview, never the full article body in that page's HTML. A real subscriber delivery endpoint and server-side authorization are still required before commercial release. Do not put confidential paid material in public assets or assume a CSS overlay protects content.

## Connected visual layouts

`KnowledgeGraph.astro` accepts a center title/URL plus typed nodes (`id`, `title`, `summary`, `href`, `x`, `y`, `side`). It powers both topic and project exploration. `knowledge-graph.ts` measures rendered dots and redraws SVG curves after font loads or responsive resizing. Hover and keyboard focus highlight the corresponding edge. Links remain normal accessible anchors.

Use `ContentRelation.displayTitle` for concise labels in the graph and chapter trail; the canonical article title stays unchanged. The homepage groups dated nodes by year, newest first. Each year is split into chapters of at most three nodes, with year navigation and previous/next controls generated from the data. Without JavaScript all chapters remain visible. Nodes without confirmed dates remain available on their detail pages but are omitted from the timeline. Do not fabricate an event relationship just to populate a graph.
