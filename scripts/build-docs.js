#!/usr/bin/env node
'use strict';

// Renders the course documents (handouts, labs, quizzes, assessments, capstone,
// README, SYLLABUS) into scrollable HTML pages under dist/docs/, with Mermaid
// diagrams rendered client-side. Slides are NOT handled here — use Marp for those.

const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'docs');

const marked = new Marked({
  renderer: {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<pre class="mermaid">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>\n`;
      }
      return false; // fall through to the default renderer
    }
  }
});

const CSS = `
  :root { color-scheme: light; }
  body { font-family: 'Helvetica Neue', 'Segoe UI', Arial, sans-serif; color: #24292f;
         max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem 4rem; line-height: 1.6; }
  h1 { color: #0d1b2a; border-bottom: 4px solid #1f6feb; padding-bottom: .3rem; }
  h2 { color: #1f6feb; margin-top: 2rem; }
  a { color: #1f6feb; }
  code { background: #f0f3f6; border-radius: 4px; padding: .1em .3em; font-size: .9em; }
  pre { background: #0d1b2a; color: #e6edf3; border-radius: 8px; padding: 1rem; overflow-x: auto; }
  pre code { background: transparent; color: inherit; padding: 0; }
  pre.mermaid { background: #ffffff; color: #24292f; display: flex; justify-content: center; }
  table { border-collapse: collapse; margin: 1rem 0; }
  th { background: #0d1b2a; color: #fff; padding: .4rem .8rem; text-align: left; }
  td { padding: .4rem .8rem; border-bottom: 1px solid #d0d7de; }
  blockquote { border-left: 5px solid #2ea043; margin-left: 0; padding-left: 1rem; color: #57606a; }
  .crumbs { font-size: .85rem; color: #8b949e; margin-bottom: 1.5rem; }
  .crumbs a { color: #8b949e; }
`;

function htmlPage(title, body, depth) {
  const home = '../'.repeat(depth) + 'index.html';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<nav class="crumbs"><a href="${home}">Course index</a></nav>
${body}
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
</script>
</body>
</html>`;
}

function firstHeading(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/[*_`]/g, '') : fallback;
}

const sources = [
  'README.md',
  'SYLLABUS.md',
  'sample-app/README.md',
  'assessments/midterm.md',
  'capstone/brief.md',
  'capstone/rubric.md'
];

for (const moduleDir of fs.readdirSync(path.join(ROOT, 'modules')).sort()) {
  for (const doc of ['handout.md', 'lab.md', 'quiz.md']) {
    const rel = path.join('modules', moduleDir, doc);
    if (fs.existsSync(path.join(ROOT, rel))) sources.push(rel);
  }
}

const index = new Map(); // section -> [{title, href}]

for (const rel of sources) {
  const markdown = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const outRel = rel.replace(/\.md$/, '.html');
  const outPath = path.join(OUT, outRel);
  const depth = outRel.split(path.sep).length - 1;
  const title = firstHeading(markdown, path.basename(rel, '.md'));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, htmlPage(title, marked.parse(markdown), depth));

  const section = rel.startsWith('modules/') ? rel.split(path.sep)[1] : 'Course';
  if (!index.has(section)) index.set(section, []);
  index.get(section).push({ title, href: outRel });
  console.log(`${rel} => dist/docs/${outRel}`);
}

let listing = '<h1>DevOps Basics Course — Documents</h1>\n';
listing += '<p>Handouts, labs, quizzes, and course documents. For slide decks, run <code>npx marp -s modules --theme-set themes/course.css</code>.</p>\n';
for (const [section, entries] of index) {
  listing += `<h2>${section}</h2>\n<ul>\n`;
  for (const { title, href } of entries) {
    listing += `  <li><a href="${href}">${title}</a></li>\n`;
  }
  listing += '</ul>\n';
}
fs.writeFileSync(path.join(OUT, 'index.html'), htmlPage('DevOps Basics Course — Documents', listing, 0));
console.log(`index => dist/docs/index.html (${sources.length} documents)`);
