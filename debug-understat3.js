// debug-understat3.js
// Prova le API interne di Understat
// Esegui con: node --env-file=.env debug-understat3.js

const BASE = 'https://understat.com';

// Understat usa chiamate POST con action specifica
async function tryAPI(action, params) {
  const body = new URLSearchParams({ action, ...params });
  
  const res = await fetch(`${BASE}/main/getTeamsStats`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://understat.com/league/EPL/2025'
    },
    body
  });

  console.log(`POST /main/getTeamsStats status: ${res.status}`);
  const text = await res.text();
  console.log('Response:', text.substring(0, 500));
  return text;
}

async function tryLeagueAPI(league, season) {
  const endpoints = [
    `/main/getTeamsStats`,
    `/main/get_teams_stats`,
    `/ajax/getTeamsStats`,
  ];

  for (const endpoint of endpoints) {
    console.log(`\nProvo: POST ${endpoint}`);
    try {
      const body = new URLSearchParams({ 
        action: 'getTeamsStats',
        league,
        season
      });
      
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body
      });
      
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response (500 chars):', text.substring(0, 500));
    } catch (err) {
      console.log('Errore:', err.message);
    }
  }
}

// Prova anche la pagina con diverso user agent (simula browser reale)
async function tryWithCookies() {
  console.log('\n--- Provo con accept diverso ---');
  const res = await fetch('https://understat.com/league/EPL', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  });
  
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('Length:', html.length);
  
  // Cerca qualsiasi var con dati
  const vars = html.match(/var\s+\w+\s*=/g);
  if (vars) {
    console.log('Variabili JS trovate:', vars);
  }
  
  // Cerca script src esterni che potrebbero caricare i dati
  const scripts = html.match(/src="[^"]+\.js[^"]*"/g);
  if (scripts) {
    console.log('Script esterni:', scripts);
  }
}

await tryLeagueAPI('EPL', '2025');
await tryWithCookies();
