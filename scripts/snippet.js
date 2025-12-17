import fs from 'fs-extra';

const CDN = process.argv[2];

if (!CDN) {
  console.log('\n❌ Missing CDN URL.');
  console.log('Usage: yarn snippet https://ton-cdn.b-cdn.net\n');
  process.exit(1);
}

/* --- CSS – Clean --- */

const cssClean = `
<!-- -------------------- AUTO ENV CSS LOADER — CLEAN -------------------- -->
<script>
(function () {
  const CDN = "${CDN}";

  const params = new URLSearchParams(location.search);
  const override = params.get("env");

  const env =
    override === "staging"
      ? "staging"
      : location.hostname.includes("webflow.io")
      ? "staging"
      : "prod";

  const href = \`\${CDN}/\${env}/latest/app.css\`;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;

  document.head.appendChild(link);
})();
</script>
`;

/* --- CSS – Minified --- */

const cssMinified = `
<!-- -------------------- AUTO ENV CSS LOADER — MINIFIED -------------------- -->
<script>(function(){const C="${CDN}",p=new URLSearchParams(location.search),o=p.get("env"),e=o==="staging"?"staging":location.hostname.includes("webflow.io")?"staging":"prod",u=\`\${C}/\${e}/latest/app.css\`,l=document.createElement("link");l.rel="stylesheet",l.href=u,document.head.appendChild(l)})();</script>
`;

/* --- JS – Clean --- */

const jsClean = `
<!-- -------------------- AUTO ENV JS LOADER — CLEAN -------------------- -->
<script>
(function () {
  const CDN = "${CDN}";

  const params = new URLSearchParams(location.search);
  const override = params.get("env");

  const env =
    override === "staging"
      ? "staging"
      : location.hostname.includes("webflow.io")
      ? "staging"
      : "prod";

  const src = \`\${CDN}/\${env}/latest/app.js\`;

  const script = document.createElement("script");
  script.src = src;
  script.type = "text/javascript";
  script.defer = true;

  document.head.appendChild(script);
})();
</script>
`;

/* --- JS – Minified --- */
const jsMinified = `
<!-- -------------------- AUTO ENV JS LOADER — MINIFIED -------------------- -->
<script>(function(){const C="${CDN}",p=new URLSearchParams(location.search),o=p.get("env"),e=o==="staging"?"staging":location.hostname.includes("webflow.io")?"staging":"prod",u=\`\${C}/\${e}/latest/app.js\`,s=document.createElement("script");s.src=u,s.type="text/javascript",s.defer=!0,document.head.appendChild(s)})();</script>
`;

/* --- Final output --- */

const output = `
<!-- -------------------- GENERATED SNIPPETS (COPY / PASTE) -------------------- -->

${cssMinified}

${jsMinified}
`;

await fs.outputFile('./dist/snippet.html', output);

console.log('\n✨ Snippet generated → dist/snippet.html');
console.log('📌 CDN:', CDN, '\n');
