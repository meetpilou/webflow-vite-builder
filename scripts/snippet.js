// scripts/generate-snippet.js
import fs from 'fs-extra';

const CDN = process.argv[2];

if (!CDN) {
  console.log('\n❌ Missing CDN URL.');
  console.log('Usage: yarn snippet https://ton-cdn.b-cdn.net\n');
  process.exit(1);
}

// Snippet non-minifié (version claire)
const snippetClean = `
<!-- Auto ENV loader (clean version) -->
<script>
document.addEventListener("DOMContentLoaded", function () {
  const CDN = "${CDN}"; // automatically injected

  const params = new URLSearchParams(location.search);
  const override = params.get("env");

  let env =
    override === "staging"
      ? "staging"
      : location.hostname.includes("webflow.io")
      ? "staging"
      : "prod";

  const url = \`\${CDN}/\${env}/latest/app.js\`;

  const s = document.createElement("script");
  s.src = url;
  s.type = "text/javascript";
  document.body.appendChild(s);

  console.log(\`🔧 Loaded \${env}: \${url}\`);
});
</script>
`;

// Snippet minifié (à coller dans Webflow)
const snippetMinified = `
<!-- Auto ENV loader (minified) -->
<script>document.addEventListener("DOMContentLoaded",function(){const C="${CDN}",p=new URLSearchParams(location.search),o=p.get("env");let e=o==="staging"?"staging":location.hostname.includes("webflow.io")?"staging":"prod";const u=\`\${C}/\${e}/latest/app.js\`,s=document.createElement("script");s.src=u,s.type="text/javascript",document.body.appendChild(s),console.log(\`🔧 Loaded \${e}: \${u}\`)});</script>
`;

// Output file
const finalOutput = `
${snippetClean}

${snippetMinified}
`;

await fs.outputFile('./dist/snippet.html', finalOutput);

console.log('\n✨ Snippet generated → dist/snippet.html');
console.log('📌 CDN:', CDN, '\n');
