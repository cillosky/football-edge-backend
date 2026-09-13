// debug-understat2.js
// Trova il JSON.parse nel HTML di Understat
// Esegui con: node --env-file=.env debug-understat2.js

const url = 'https://understat.com/league/EPL/2025';

const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  }
});

const html = await res.text();

// Trova tutte le occorrenze di JSON.parse e mostra il contesto
const idx = html.indexOf('JSON.parse');
if (idx !== -1) {
  console.log('Contesto intorno a JSON.parse:');
  console.log(html.substring(idx - 200, idx + 500));
}

// Mostra tutti i tag <script> inline
console.log('\n--- TUTTI GLI SCRIPT INLINE ---');
const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g);
let i = 0;
for (const match of scriptMatches) {
  const content = match[1].trim();
  if (content.length > 10) {
    console.log(`\n[Script ${++i}] (${content.length} chars):`);
    console.log(content.substring(0, 800));
    console.log('...');
  }
}
