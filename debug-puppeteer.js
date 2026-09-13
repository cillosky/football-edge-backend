// debug-puppeteer.js
// Scrape xG da Understat con Puppeteer
// Esegui con: node --env-file=.env debug-puppeteer.js

import puppeteer from 'puppeteer';

const LEAGUES = [
  { understatCode: 'EPL',        league: 'PL'  },
  { understatCode: 'Bundesliga', league: 'BL1' }
];

const SEASON = '2026';

async function scrapeLeague(browser, understatCode) {
  const url = `https://understat.com/league/${understatCode}/${SEASON}`;
  console.log(`Apro: ${url}`);

  const page = await browser.newPage();
  
  // Blocca immagini e CSS per velocizzare
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Estrai teamsData dal contesto JS della pagina
  const teamsData = await page.evaluate(() => {
    // Cerca nelle variabili globali
    if (typeof teamsData !== 'undefined') return teamsData;
    
    // Cerca nei script della pagina
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (text.includes('teamsData')) {
        const match = text.match(/teamsData\s*=\s*(\{.+?\});/s);
        if (match) {
          try { return JSON.parse(match[1]); } catch(e) {}
        }
      }
    }
    return null;
  });

  await page.close();
  return teamsData;
}

async function main() {
  console.log('=== FOOTBALL EDGE PRO — Test Puppeteer xG ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const league of LEAGUES) {
      console.log(`--- ${league.league} ---`);
      const data = await scrapeLeague(browser, league.understatCode);
      
      if (!data) {
        console.log('❌ teamsData non trovato\n');
        continue;
      }

      const teams = Object.values(data);
      console.log(`✅ Trovate ${teams.length} squadre`);
      
      // Mostra prime 3 squadre come esempio
      teams.slice(0, 3).forEach(team => {
        const home = team.history?.filter(m => m.h_a === 'h') || [];
        const away = team.history?.filter(m => m.h_a === 'a') || [];
        
        const xgf_home = home.length > 0
          ? (home.reduce((s, m) => s + parseFloat(m.xG || 0), 0) / home.length).toFixed(2)
          : 'N/A';
        const xga_home = home.length > 0
          ? (home.reduce((s, m) => s + parseFloat(m.xGA || 0), 0) / home.length).toFixed(2)
          : 'N/A';

        console.log(`  ${team.title}: xGF_casa=${xgf_home} xGA_casa=${xga_home} (${home.length}g casa, ${away.length}g away)`);
      });
      console.log('');
    }
  } finally {
    await browser.close();
  }

  console.log('=== DONE ===');
}

main().catch(console.error);
