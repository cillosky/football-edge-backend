// team-name-map.js
// Normalizza nomi squadre da football-data.org → nomi Understat
// Importa questo modulo in test-fixtures.js e test-algo.js

export const TEAM_NAME_MAP = {
  // Premier League
  'Arsenal FC':                    'Arsenal',
  'Aston Villa FC':                'Aston Villa',
  'AFC Bournemouth':               'Bournemouth',
  'Brentford FC':                  'Brentford',
  'Brighton & Hove Albion FC':     'Brighton',
  'Chelsea FC':                    'Chelsea',
  'Coventry City FC':              'Coventry',
  'Crystal Palace FC':             'Crystal Palace',
  'Everton FC':                    'Everton',
  'Fulham FC':                     'Fulham',
  'Hull City AFC':                 'Hull',
  'Ipswich Town FC':               'Ipswich',
  'Leeds United FC':               'Leeds',
  'Liverpool FC':                  'Liverpool',
  'Manchester City FC':            'Manchester City',
  'Manchester United FC':          'Manchester United',
  'Newcastle United FC':           'Newcastle United',
  'Nottingham Forest FC':          'Nottingham Forest',
  'Sunderland AFC':                'Sunderland',
  'Tottenham Hotspur FC':          'Tottenham',

  // Bundesliga
  '1. FC Köln':                    'FC Cologne',
  '1. FC Union Berlin':            'Union Berlin',
  '1. FSV Mainz 05':              'Mainz 05',
  'Bayer 04 Leverkusen':           'Bayer Leverkusen',
  'Borussia Dortmund':             'Borussia Dortmund',
  'Borussia Mönchengladbach':      'Borussia M.Gladbach',
  'Eintracht Frankfurt':           'Eintracht Frankfurt',
  'FC Augsburg':                   'Augsburg',
  'FC Bayern München':             'Bayern Munich',
  'FC Schalke 04':                 'Schalke 04',
  'Hamburger SV':                  'Hamburger SV',
  'SC Freiburg':                   'Freiburg',
  'SV 07 Elversberg':              'Elversberg',
  'SV Werder Bremen':              'Werder Bremen',
  'RB Leipzig':                    'RasenBallsport Leipzig',
  'TSG 1899 Hoffenheim':           'Hoffenheim',
  'TSG Hoffenheim':                'Hoffenheim',
  'VfB Stuttgart':                 'VfB Stuttgart',
  'SC Paderborn 07':               'Paderborn',
};

// Funzione helper per normalizzare un nome
export function normalizeName(name) {
  return TEAM_NAME_MAP[name] || name;
}
