// debug-understat.js
// Controlla cosa restituisce Understat
// Esegui con: node --env-file=.env debug-understat.js

const url = 'https://understat.com/league/EPL/2025';

const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  }
});

console.log('Status:', res.status);
console.log('Content-Type:', res.headers.get('content-type'));

const html = await res.text();
console.log('HTML length:', html.length);
console.log('\n--- Primi 2000 caratteri ---');
console.log(html.substring(0, 2000));

// Cerca pattern JSON nel HTML
const patterns = [
  'teamsData',
  'datesData', 
  'JSON.parse',
  'var teams',
  'playersData'
];

console.log('\n--- Ricerca pattern ---');
for (const p of patterns) {
  const found = html.includes(p);
  console.log(`${found ? '✅' : '❌'} "${p}"`);
}
