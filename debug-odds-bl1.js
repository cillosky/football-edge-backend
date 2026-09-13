// debug-odds-bl1.js
// Vede la struttura esatta delle quote Bundesliga
// Esegui con: node --env-file=.env debug-odds-bl1.js

const ODDS_API_KEY = process.env.ODDS_API_KEY;

const res = await fetch(
  `https://api.the-odds-api.com/v4/sports/soccer_germany_bundesliga/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=totals,spreads,h2h&oddsFormat=decimal`
);

const events = await res.json();
console.log(`Eventi: ${events.length}`);

if (events.length > 0) {
  const first = events[0];
  console.log(`\nPartita: ${first.home_team} vs ${first.away_team}`);
  console.log(`Bookmaker disponibili: ${first.bookmakers?.map(b => b.key).join(', ')}`);
  
  for (const bm of first.bookmakers || []) {
    console.log(`\n--- ${bm.key} ---`);
    for (const market of bm.markets || []) {
      console.log(`  Mercato: ${market.key}`);
      market.outcomes?.forEach(o => {
        console.log(`    ${o.name} ${o.point ?? ''}: ${o.price}`);
      });
    }
  }
}
