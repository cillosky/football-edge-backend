// test-algo.js
// Calcola proiezioni xG + semaforo per partite prossime 48h
// Esegui con: node --env-file=.env test-algo.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SEASON = '2026';
const OU_LINE_DEFAULT = 2.5;
const MIN_MATCHES = 1; // minimo partite per contesto (aumenta a 3+ dopo giornata 5)

// Threshold semaforo
const THRESHOLD = {
  GREEN:  0.50,  // gap >= 0.50 → VERDE
  YELLOW: 0.25,  // gap >= 0.25 → GIALLO
  BTTS_YES_GREEN:  0.90,
  BTTS_YES_YELLOW: 0.75,
  BTTS_NO_GREEN:   0.65,
};

function calcSignal(xgTotal, ouLine) {
  const gap = Math.round((xgTotal - ouLine) * 100) / 100;

  let signal = 'NOPLAY';
  let strength = 'NONE';

  if (gap >= THRESHOLD.GREEN) {
    signal = 'OVER';
    strength = 'GREEN';
  } else if (gap >= THRESHOLD.YELLOW) {
    signal = 'OVER';
    strength = 'YELLOW';
  } else if (gap <= -THRESHOLD.GREEN) {
    signal = 'UNDER';
    strength = 'GREEN';
  } else if (gap <= -THRESHOLD.YELLOW) {
    signal = 'UNDER';
    strength = 'YELLOW';
  }

  // Speculativo O/U 3.5
  let specSignal = 'NOPLAY';
  if (xgTotal >= 4.0) {
    const gap35 = xgTotal - 3.5;
    if (gap35 >= 0.60) specSignal = 'OVER_35';
  }

  return { signal, strength, gap, specSignal };
}

function calcBTTS(xgHome, xgAway) {
  if (xgHome >= THRESHOLD.BTTS_YES_GREEN && xgAway >= THRESHOLD.BTTS_YES_GREEN) {
    return { signal: 'BTTS_YES', strength: 'GREEN' };
  }
  if (xgHome >= THRESHOLD.BTTS_YES_YELLOW && xgAway >= THRESHOLD.BTTS_YES_YELLOW) {
    return { signal: 'BTTS_YES', strength: 'YELLOW' };
  }
  if (xgHome <= THRESHOLD.BTTS_NO_GREEN || xgAway <= THRESHOLD.BTTS_NO_GREEN) {
    return { signal: 'BTTS_NO', strength: 'GREEN' };
  }
  return { signal: 'NOPLAY', strength: 'NONE' };
}

function emoji(signal, strength) {
  if (signal === 'NOPLAY') return '⚫';
  if (strength === 'GREEN')  return signal.includes('OVER') ? '🟢' : '🔴';
  if (strength === 'YELLOW') return '🟡';
  return '⚫';
}

async function main() {
  console.log('=== FOOTBALL EDGE PRO — Algo Engine ===\n');

  // Leggi partite prossime 48h
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: games, error: gamesError } = await supabase
    .from('football_games')
    .select('*')
    .gte('match_date', now.toISOString())
    .lte('match_date', in48h.toISOString())
    .eq('status', 'TIMED')
    .order('match_date', { ascending: true });

  if (gamesError) {
    console.error('Errore lettura partite:', gamesError.message);
    return;
  }

  console.log(`Partite nelle prossime 48h: ${games.length}\n`);

  // Leggi tutti i dati xG squadre
  const { data: teamsXG, error: xgError } = await supabase
    .from('football_teams_xg')
    .select('*')
    .eq('season', SEASON);

  if (xgError) {
    console.error('Errore lettura xG:', xgError.message);
    return;
  }

  // Crea mappa team_name → dati xG
  const xgMap = {};
  for (const t of teamsXG) {
    xgMap[`${t.team_name}_${t.league}`] = t;
  }

  let processed = 0;
  let noData = 0;

  for (const game of games) {
    const homeKey = `${game.home_team}_${game.league}`;
    const awayKey = `${game.away_team}_${game.league}`;

    const homeXG = xgMap[homeKey];
    const awayXG = xgMap[awayKey];

    if (!homeXG || !awayXG) {
      console.log(`⚠️  Dati mancanti: ${game.home_team} vs ${game.away_team}`);
      if (!homeXG) console.log(`   → "${game.home_team}" non trovato in xG table`);
      if (!awayXG) console.log(`   → "${game.away_team}" non trovato in xG table`);
      noData++;
      continue;
    }

    // Verifica partite minime per contesto
    const homeOk = homeXG.matches_home >= MIN_MATCHES;
    const awayOk = awayXG.matches_away >= MIN_MATCHES;

    if (!homeOk || !awayOk) {
      console.log(`⚠️  Dati insufficienti: ${game.home_team} (${homeXG.matches_home}g casa) vs ${game.away_team} (${awayXG.matches_away}g away)`);
      noData++;
      continue;
    }

    // Formula core xG
    const xgProjHome = Math.round(((homeXG.xgf_home + awayXG.xga_away) / 2) * 100) / 100;
    const xgProjAway = Math.round(((awayXG.xgf_away + homeXG.xga_home) / 2) * 100) / 100;
    const xgTotal    = Math.round((xgProjHome + xgProjAway) * 100) / 100;

    // Elo correttivo (se disponibile)
    let xgTotalAdj = xgTotal;
    let eloGap = null;
    if (homeXG.elo_rating && awayXG.elo_rating) {
      eloGap = homeXG.elo_rating - awayXG.elo_rating;
      if (Math.abs(eloGap) > 200) {
        const adj = eloGap > 0 ? 0.15 : -0.15;
        xgTotalAdj = Math.round((xgTotal + Math.abs(adj)) * 100) / 100;
      }
      if (Math.abs(eloGap) > 350) {
        const adj = 0.25;
        xgTotalAdj = Math.round((xgTotal + adj) * 100) / 100;
      }
    }

    const ouLine = game.ou_line || OU_LINE_DEFAULT;
    const { signal, strength, gap, specSignal } = calcSignal(xgTotalAdj, ouLine);
    const btts = calcBTTS(xgProjHome, xgProjAway);

    // Ora IT
    const matchDateIT = new Date(game.match_date).toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    const signalEmoji = emoji(signal, strength);
    const bttsEmoji   = btts.signal === 'NOPLAY' ? '' : ` | BTTS ${btts.signal === 'BTTS_YES' ? '✅' : '❌'} ${btts.strength}`;
    const specStr     = specSignal !== 'NOPLAY' ? ' 🟠 SPEC O3.5' : '';

    console.log(`${signalEmoji} [${game.league}] ${matchDateIT} — ${game.home_team} vs ${game.away_team}`);
    console.log(`   xG: ${xgProjHome} + ${xgProjAway} = ${xgTotalAdj} | Linea: ${ouLine} | Gap: ${gap > 0 ? '+' : ''}${gap}`);
    console.log(`   Signal: ${signal} ${strength}${specStr}${bttsEmoji}`);
    if (eloGap !== null) console.log(`   Elo gap: ${eloGap}`);
    console.log('');

    // Salva su Supabase
    const { error: updateError } = await supabase
      .from('football_games')
      .update({
        xg_home_proj:    xgProjHome,
        xg_away_proj:    xgProjAway,
        xg_total_proj:   xgTotalAdj,
        xg_gap:          gap,
        ou_line:         ouLine,
        elo_gap:         eloGap,
        signal:          signal,
        signal_strength: strength,
        btts_signal:     btts.signal,
        updated_at:      new Date().toISOString()
      })
      .eq('match_id', game.match_id);

    if (updateError) {
      console.error(`❌ Update errore ${game.match_id}:`, updateError.message);
    } else {
      processed++;
    }
  }

  console.log(`\n=== FATTO: ${processed} partite elaborate, ${noData} senza dati ===`);
}

main().catch(console.error);
