# Agent Guide

Guide for AI coding agents working in this Astro + Keystatic repo on a Windows + PowerShell host.

---

## 1. File encoding — never write through PowerShell

This repo is full of Chinese content (Astro pages, blog markdown, project markdown). PowerShell on a `zh-CN` Windows defaults to the system ANSI code page (CP936 / GBK) for output. When agents pipe UTF-8 strings through PowerShell, the bytes get re-encoded and Chinese turns into mojibake (`ä¸­æ` etc.). This has already broken the repo once.

**Never** use the following to edit repo files:

- `powershell ... Set-Content`
- `powershell ... Out-File`
- `>` / `>>` redirection through PowerShell
- `echo` / heredocs through `cmd` or `powershell`
- `sed -i`, `awk` rewrites through shell

**Always** edit through the UTF-8-safe tools:

- `StrReplace` — targeted replacements
- `Write` — whole-file rewrites
- `EditNotebook` — `.ipynb` cells

If a scripted batch edit is unavoidable, use Node or Python with an explicit UTF-8 flag, e.g.:

```bash
node -e "const fs=require('fs');const p='path';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/a/g,'b'),'utf8')"
```

After any non-trivial write, re-read the file and verify Chinese characters render correctly before continuing.

## 2. Don't `git checkout` to "undo" agent edits

`git checkout -- <path>` (and `git restore <path>`) restore the file from the index / HEAD. **This also wipes uncommitted user edits in the working tree.** This repo is usually dirty (per `git status` at session start), so a checkout often destroys both the agent's edits and the user's earlier local work, which is unrecoverable without reflog.

When an agent edit goes wrong:

1. Fix forward with `StrReplace` / `Write`, restoring only the lines you broke.
2. Before any destructive git command (`checkout`, `restore`, `reset --hard`, `clean -fd`), run `git status` and confirm with the user.
3. If a full rollback is needed, prefer `git stash` first so changes are recoverable.

## 3. Project layout

- `apps/web/` — Astro 5 site
  - `src/content.config.ts` — Astro content collection schema (source of truth for frontmatter fields).
  - `src/content/blog/*.md` — Blog posts.
  - `src/content/projects/*.md` — Project entries.
  - `src/pages/` — Astro pages; `index.astro` is the home, `[slug].astro` files render details.
  - `src/layouts/SiteShell.astro` — Header / footer shell used by every page.
  - `public/css/styles.css` — Hand-written CSS, no Tailwind.
  - `public/pages/project-*.html` — Legacy redirect HTML for old slugs.
  - `keystatic.config.ts` — Keystatic CMS schema; keep it in sync with `content.config.ts` when adding fields.
- `public/assets/` — Image assets; prefer `.webp` with `.png` fallback.

## 4. Content rules

- Project frontmatter required by `content.config.ts`: `title`, `summary`, `role`, `period`, `type`, `platform`, `stack`, `order`. Optional: `tags` (string array).
- `order` is the sort key on the home page — lower comes first. When adding a project, renumber so there are no duplicates.
- Blog `pubDate` and `updatedDate` must be ISO-parseable. `draft: true` hides a post.
- When you delete a project markdown file, also delete the matching `apps/web/public/pages/project-<slug>.html` redirect, otherwise it becomes a 404 trap.
- Personal bio / contact information should be sourced from the user's resume PDF rather than invented. Ask the user before changing factual claims (school, location, project numbers, etc.).

## 5. Style

- Match existing component classes (`section-aside`, `fact-list`, `contact-content`, `project-row`) before inventing new ones. The site is intentionally minimal and the CSS is shared across blog and project detail pages.
- Avoid adding new npm dependencies for cosmetic changes — extend the existing CSS in `public/css/styles.css`.

## 6. Communication

- Default chat language: Chinese (the user replies in Chinese).
- Code, comments, commit messages, and this file: English.
- Don't commit unless explicitly asked. The working tree usually has the user's in-progress edits.

## 7. Repo overrides to global user rules

The user's global "no document files" rule (forbidding agents to add `.md` / `.docx` / `.pdf` / `.txt` to a repo) **does not apply here**. This repo is a content site whose primary deliverables are markdown documents (blog posts, project entries, READMEs, this file). Agents may freely add, edit, and commit:

- Markdown content under `apps/web/src/content/blog/` and `apps/web/src/content/projects/`
- Repo-level docs at the project root (`AGENTS.md`, `README.md`, etc.)
- Any other documentation file the task naturally requires

The standard "ask before committing" rule still applies to commits in general — the override only loosens the file-type restriction, not the commit-on-request norm.
