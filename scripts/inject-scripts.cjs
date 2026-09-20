const fs = require('fs');
const path = require('path');

// Read variables directly from Cloudflare's build environment
const GA_ID = process.env.PUBLIC_GOOGLE_ANALYTICS_ID || '';
const ADSENSE_ID = process.env.PUBLIC_GOOGLE_ADSENSE_ID || '';
const SEARCH_TAG = process.env.PUBLIC_SEARCH_CONSOLE_TAG || '';

console.log(`[INJECT] GA_ID: ${GA_ID ? 'FOUND' : 'MISSING'}`);
console.log(`[INJECT] ADSENSE_ID: ${ADSENSE_ID ? 'FOUND' : 'MISSING'}`);
console.log(`[INJECT] SEARCH_TAG: ${SEARCH_TAG ? 'FOUND' : 'MISSING'}`);

if (!GA_ID && !ADSENSE_ID && !SEARCH_TAG) {
  console.error('[INJECT] ERROR: No environment variables found. Aborting.');
  process.exit(1);
}

// Generate replacement strings
const searchConsoleMeta = SEARCH_TAG 
  ? `<meta name="google-site-verification" content="${SEARCH_TAG.replace('google-site-verification=', '')}" />` 
  : '';

const gaScripts = GA_ID 
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>` 
  : '';

const adsenseScript = ADSENSE_ID 
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}" crossorigin="anonymous"></script>` 
  : '';

const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error(`[INJECT] ERROR: dist/ directory not found at ${distDir}`);
  process.exit(1);
}

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    if (content.includes('<!-- REPLACEMENT_PLACEHOLDER_GOOGLE_SEARCH_CONSOLE -->')) {
      content = content.replace('<!-- REPLACEMENT_PLACEHOLDER_GOOGLE_SEARCH_CONSOLE -->', searchConsoleMeta);
      modified = true;
    }
    if (content.includes('<!-- REPLACEMENT_PLACEHOLDER_GOOGLE_ANALYTICS -->')) {
      content = content.replace('<!-- REPLACEMENT_PLACEHOLDER_GOOGLE_ANALYTICS -->', gaScripts);
      modified = true;
    }
    if (content.includes('<!-- REPLACEMENT_PLACEHOLDER_ADSENSE -->')) {
      content = content.replace('<!-- REPLACEMENT_PLACEHOLDER_ADSENSE -->', adsenseScript);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[INJECT] ✅ Replaced secrets in ${path.relative(distDir, filePath)}`);
    }
  } catch (err) {
    console.error(`[INJECT]  Error processing ${filePath}:`, err.message);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      replaceInFile(fullPath);
    }
  }
}

processDirectory(distDir);
console.log('[INJECT] 🎉 Secret injection complete!');