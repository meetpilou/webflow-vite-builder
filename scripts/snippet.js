import fs from 'fs-extra';

const CDN = process.argv[2];

if (!CDN) {
  console.log('\n❌ Missing CDN URL.');
  console.log('Usage: yarn snippet https://your-cdn.b-cdn.net\n');
  process.exit(1);
}

/* AUTO ENV SNIPPETS (MINIFIED)
 *
 * Staging URL : {CDN}/staging/app.js       (no /latest)
 * Prod URL    : {CDN}/prod/latest/app.js
 */

/* --- CSS — Auto ENV --- */
const cssAuto = `
<!-- -------------------- AUTO ENV CSS LOADER -------------------- -->
<script>(function(){const C="${CDN}",p=new URLSearchParams(location.search),o=p.get("env"),e=o==="staging"?"staging":location.hostname.includes("webflow.io")?"staging":"prod",u=e==="staging"?\`\${C}/staging/app.css\`:\`\${C}/prod/latest/app.css\`,l=document.createElement("link");l.rel="stylesheet",l.href=u,document.head.appendChild(l)})();</script>
`;

/* --- JS — Auto ENV --- */
const jsAuto = `
<!-- -------------------- AUTO ENV JS LOADER -------------------- -->
<script>(function(){const C="${CDN}",p=new URLSearchParams(location.search),o=p.get("env"),e=o==="staging"?"staging":location.hostname.includes("webflow.io")?"staging":"prod",u=e==="staging"?\`\${C}/staging/app.js\`:\`\${C}/prod/latest/app.js\`,s=document.createElement("script");s.src=u,s.type="text/javascript",s.defer=!0,document.head.appendChild(s)})();</script>
`;

/* EXPLICIT URLS (STAGING / PROD) */

/* --- CSS — Explicit --- */
const cssExplicit = `
<!-- -------------------- CSS — EXPLICIT URLS -------------------- -->

<!-- 🚧 Staging -->
<link href="${CDN}/staging/app.css" rel="stylesheet" />

<!-- 💎 Production -->
<link href="${CDN}/prod/latest/app.css" rel="stylesheet" />
`;

/* --- JS — Explicit --- */
const jsExplicit = `
<!-- -------------------- JS — EXPLICIT URLS -------------------- -->

<!-- 🚧 Staging -->
<script src="${CDN}/staging/app.js" defer></script>

<!-- 💎 Production -->
<script src="${CDN}/prod/latest/app.js" defer></script>
`;

/* FINAL OUTPUT */

const output = `
<!-- -------------------- GENERATED SNIPPETS (COPY / PASTE) -------------------- -->

${cssAuto}

${jsAuto}

${cssExplicit}

${jsExplicit}
`;

await fs.outputFile('./dist/snippet.html', output);

console.log('\n✨ Snippet generated → dist/snippet.html');
console.log('📌 CDN:', CDN, '\n');
