// test-xg.js
// Scrape xG da Understat con Puppeteer e salva su Supabase
// Esegui con: node --env-file=.env test-xg.js

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SEASON = '2026';

const LEAGUES = [
  { understatCode: 'EPL',        league: 'PL'  },
  { understatCode: 'Bundesliga', league: 'BL1' }
];

async function scrapeLeague(browser, understatCode) {
  const url = `https://understat.com/league/${understatCode}/${SEASON}`;
  console.log(`Apro: ${url}`);

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  const teamsData = await page.evaluate(() => {
    if (typeof teamsData !== 'undefined') return teamsData;
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

function parseTeams(teamsData, leagueCode) {
  const results = [];

  for (const [, teamData] of Object.entries(teamsData)) {
    const title = teamData.title;
    const history = teamData.history || [];

    const homeMatches = history.filter(m => m.h_a === 'h');
    const awayMatches = history.filter(m => m.h_a === 'a');

    const avg = (matches, field) => matches.length > 0
      ? Math.round(matches.reduce((s, m) => s + parseFloat(m[field] || 0), 0) / matches.length * 100) / 100
      : 0;

    results.push({
      team_name:    title,
      league:       leagueCode,
      season:       SEASON,
      xgf_home:     avg(homeMatches, 'xG'),
      xga_home:     avg(homeMatches, 'xGA'),
      xgf_away:     avg(awayMatches, 'xG'),
      xga_away:     avg(awayMatches, 'xGA'),
      matches_home: homeMatches.length,
      matches_away: awayMatches.length,
      updated_at:   new Date().toISOString()
    });
  }

  return results;
}

async function main() {
  console.log('=== FOOTBALL EDGE PRO — xG Scraper ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalSaved = 0;

  try {
    for (const league of LEAGUES) {
      console.log(`--- ${league.league} (${league.understatCode}) ---`);

      const teamsData = await scrapeLeague(browser, league.understatCode);

      if (!teamsData) {
        console.log('❌ teamsData non trovato\n');
        continue;
      }

      const teams = parseTeams(teamsData, league.league);
      console.log(`Squadre trovate: ${teams.length}`);

      for (const team of teams) {
        const { error } = await supabase
          .from('football_teams_xg')
          .upsert(team, { onConflict: 'team_name,league,season' });

        if (error) {
          console.error(`❌ ${team.team_name}:`, error.message);
        } else {
          console.log(
            `✅ ${team.team_name.padEnd(28)} ` +
            `Casa: xGF=${team.xgf_home} xGA=${team.xga_home} (${team.matches_home}g) | ` +
            `Away: xGF=${team.xgf_away} xGA=${team.xga_away} (${team.matches_away}g)`
          );
          totalSaved++;
        }
      }
      console.log('');
    }
  } finally {
    await browser.close();
  }

  console.log(`=== FATTO: ${totalSaved} squadre salvate ===`);
}

main().catch(console.error);
