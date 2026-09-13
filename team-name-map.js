// team-name-map.js
// Normalizza nomi squadre da football-data.org → nomi Understat

export const TEAM_NAME_MAP = {
  // Premier League
  'Arsenal FC': 'Arsenal', 'Aston Villa FC': 'Aston Villa',
  'AFC Bournemouth': 'Bournemouth', 'Brentford FC': 'Brentford',
  'Brighton & Hove Albion FC': 'Brighton', 'Chelsea FC': 'Chelsea',
  'Coventry City FC': 'Coventry', 'Crystal Palace FC': 'Crystal Palace',
  'Everton FC': 'Everton', 'Fulham FC': 'Fulham',
  'Hull City AFC': 'Hull', 'Ipswich Town FC': 'Ipswich',
  'Leeds United FC': 'Leeds', 'Liverpool FC': 'Liverpool',
  'Manchester City FC': 'Manchester City', 'Manchester United FC': 'Manchester United',
  'Newcastle United FC': 'Newcastle United', 'Nottingham Forest FC': 'Nottingham Forest',
  'Sunderland AFC': 'Sunderland', 'Tottenham Hotspur FC': 'Tottenham',
  // Bundesliga
  '1. FC Köln': 'FC Cologne', '1. FC Union Berlin': 'Union Berlin',
  '1. FSV Mainz 05': 'Mainz 05', 'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'Borussia Dortmund': 'Borussia Dortmund', 'Borussia Mönchengladbach': 'Borussia M.Gladbach',
  'Eintracht Frankfurt': 'Eintracht Frankfurt', 'FC Augsburg': 'Augsburg',
  'FC Bayern München': 'Bayern Munich', 'FC Schalke 04': 'Schalke 04',
  'Hamburger SV': 'Hamburger SV', 'SC Freiburg': 'Freiburg',
  'SV 07 Elversberg': 'Elversberg', 'SV Werder Bremen': 'Werder Bremen',
  'RB Leipzig': 'RasenBallsport Leipzig', 'TSG 1899 Hoffenheim': 'Hoffenheim',
  'VfB Stuttgart': 'VfB Stuttgart', 'SC Paderborn 07': 'Paderborn',
  // Serie A
  'AC Milan': 'AC Milan', 'ACF Fiorentina': 'Fiorentina',
  'AS Roma': 'Roma', 'Atalanta BC': 'Atalanta',
  'Bologna FC 1909': 'Bologna', 'Cagliari Calcio': 'Cagliari',
  'Como 1907': 'Como', 'FC Internazionale Milano': 'Inter',
  'Frosinone Calcio': 'Frosinone', 'Genoa CFC': 'Genoa',
  'Juventus FC': 'Juventus', 'SS Lazio': 'Lazio',
  'SSC Napoli': 'Napoli', 'Torino FC': 'Torino',
  'US Lecce': 'Lecce', 'US Sassuolo Calcio': 'Sassuolo',
  'Udinese Calcio': 'Udinese', 'Venezia FC': 'Venezia',
  'AC Monza': 'Monza', 'Parma Calcio 1913': 'Parma Calcio 1913',
  // La Liga
  'CA Osasuna': 'Osasuna', 'Club Atlético de Madrid': 'Atletico Madrid',
  'Deportivo Alavés': 'Alaves', 'Elche CF': 'Elche',
  'FC Barcelona': 'Barcelona', 'Getafe CF': 'Getafe',
  'Levante UD': 'Levante', 'Málaga CF': 'Malaga',
  'RC Celta de Vigo': 'Celta Vigo', 'RC Deportivo La Coruña': 'Deportivo La Coruna',
  'RCD Espanyol de Barcelona': 'Espanyol', 'Rayo Vallecano de Madrid': 'Rayo Vallecano',
  'Real Betis Balompié': 'Real Betis', 'Real Madrid CF': 'Real Madrid',
  'Real Racing Club de Santander': 'Racing Santander', 'Real Sociedad de Fútbol': 'Real Sociedad',
  'Sevilla FC': 'Sevilla', 'Valencia CF': 'Valencia',
  'Villarreal CF': 'Villarreal',
  // Ligue 1
  'AJ Auxerre': 'Auxerre', 'AS Monaco FC': 'Monaco',
  'Angers SCO': 'Angers', 'ES Troyes AC': 'Troyes',
  'FC Lorient': 'Lorient', 'Le Havre AC': 'Le Havre',
  'Le Mans FC': 'Le Mans', 'Lille OSC': 'Lille',
  'OGC Nice': 'Nice', 'Olympique Lyonnais': 'Lyon',
  'Olympique de Marseille': 'Marseille', 'Paris Saint-Germain FC': 'Paris Saint Germain',
  'RC Strasbourg Alsace': 'Strasbourg', 'Racing Club de Lens': 'Lens',
  'Stade Brestois 29': 'Brest', 'Stade Rennais FC 1901': 'Rennes',
  'Toulouse FC': 'Toulouse',
};

export function normalizeName(name) {
  return TEAM_NAME_MAP[name] || name;
}
