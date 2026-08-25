// ===================== IFL CAREER =====================

const NATION_STRENGTH_CACHE = {};
function nationStrength(nation){
  if(NATION_STRENGTH_CACHE[nation]) return NATION_STRENGTH_CACHE[nation];
  const bigFootball = ["Brasile","Argentina","Francia","Germania","Spagna","Italia","Inghilterra","Portogallo","Olanda","Belgio"];
  let base = bigFootball.includes(nation) ? randInt(78,92) : randInt(58,80);
  NATION_STRENGTH_CACHE[nation] = base;
  return base;
}

function newSeasonStats(){
  return { apps:0, minutes:0, goals:0, assists:0, ratingSum:0, ratedApps:0,
    teamWins:0, teamDraws:0, teamLosses:0, teamPoints:0 };
}

function initCareer(form){
  const player = createPlayer(form);
  const club = CLUBS.find(c=>c.id===form.club);
  const career = {
    player,
    clubId: club.id,
    contract: { salary: player.salary, yearsLeft: randInt(2,3) },
    season: 2026,
    matchdayIndex: 0,
    seasonLength: 30,
    seasonStats: newSeasonStats(),
    seasonTrophies: [],
    trophies: [],
    awards: [],
    history: [],
    national: { caps:0, goals:0, assists:0, isCaptain:false, tournamentsWon:[], debutSeason:null, calledThisSeason:false },
    currentInjury: null,
    injuryDaysThisSeason: 0,
    trainingFocus: "Tecnica",
    trainingSeasonsFocused:false,
    transferOffers: [],
    pendingTransferWindow:false,
    eventLog: [],
    retired:false,
    records:0,
    retiredSummary:null,
  };
  return career;
}

function currentClub(career){ return clubById(career.clubId); }

// --- training micro-effect applied every matchday advance ---
const TRAINING_STAT_MAP = {
  "Tiro":"shooting","Passaggio":"passing","Dribbling":"dribbling","Velocità":"speed",
  "Difesa":"defending","Fisico":"physical","Tecnica":"technique","Mentalità":"mentality"
};
function applyTrainingMicro(career){
  const key = TRAINING_STAT_MAP[career.trainingFocus];
  if(!key) return;
  const p = career.player;
  if(career.currentInjury) return; // can't train properly while injured
  const gain = randFloat(0.03,0.12) * (p.age<=23?1.3:(p.age<=28?1:0.6));
  p.stats[key] = clamp(Math.round((p.stats[key]+gain)*100)/100, 1, 99);
  p.condition = clamp(p.condition - randInt(1,3), 10, 100);
  p.overall = computeOverall(p.stats, p.position);
  career.trainingSeasonsFocused = true;
  // small injury risk from overtraining if condition very low
  if(p.condition < 20 && Math.random() < 0.02){
    const inj = rollInjury();
    career.currentInjury = { ...inj, daysLeft: inj.days };
  }
}

// --- national team ---
function checkNationalCallup(career){
  const p = career.player;
  const chance = clamp((p.overall-62)/55 + p.reputation/220, 0.02, 0.9);
  if(career.currentInjury) return null;
  if(Math.random() > chance) return null;

  if(!career.national.debutSeason) career.national.debutSeason = career.season;
  const perfRating = 6.0 + (p.overall-70)/25 + randFloat(-0.6,0.9);
  const goals = poissonish(0.18 * (p.stats.shooting/100) * clamp((perfRating-5.5)/3,0.1,1.4));
  const assists = poissonish(0.14 * (p.stats.passing/100) * clamp((perfRating-5.5)/3,0.1,1.3));
  career.national.caps++;
  career.national.goals += goals;
  career.national.assists += assists;
  p.reputation = clamp(p.reputation + 1.2, 0, 100);

  if(!career.national.isCaptain && career.national.caps>35 && p.age>=27 && p.reputation>60 && Math.random()<0.15){
    career.national.isCaptain = true;
  }
  return { caps:career.national.caps, goals, assists, rating:Math.round(perfRating*10)/10 };
}

function maybeNationalTournament(career){
  // Every other season a major tournament takes place
  if(career.season % 2 !== 0) return null;
  const p = career.player;
  const callChance = clamp((p.overall-64)/50 + p.reputation/200, 0.03, 0.92);
  if(career.currentInjury || Math.random() > callChance) return null;

  const ns = nationStrength(p.nationality);
  const boost = (p.overall-70)/10;
  const winChance = clamp((ns + boost - 75)/40 + 0.15, 0.03, 0.6);
  const isWorld = (career.season/2) % 2 === 0;
  const trophyName = isWorld ? TROPHY_LIST.nt_major : TROPHY_LIST.nt_cont;
  const won = Math.random() < winChance;
  if(won){
    career.national.tournamentsWon.push({ name:trophyName, season:career.season });
    career.trophies.push({ name:trophyName, season:career.season, withNational:true });
    p.reputation = clamp(p.reputation+10,0,100);
  }
  return { participated:true, trophyName, won };
}

// --- advance one matchday ---
function advanceMatchday(career){
  if(career.retired) return null;
  const matchResult = simulateMatchday(career);
  applyTrainingMicro(career);
  const event = maybeTriggerEvent(career);
  career.matchdayIndex++;

  let national = null;
  // international breaks roughly every 10 matchdays
  if(career.matchdayIndex % 10 === 0 && career.matchdayIndex < career.seasonLength){
    national = checkNationalCallup(career);
  }

  let seasonEnded = false;
  let seasonSummary = null;
  if(career.matchdayIndex >= career.seasonLength){
    const tournament = maybeNationalTournament(career);
    seasonSummary = endSeason(career);
    seasonSummary.tournament = tournament;
    seasonEnded = true;
  }

  saveCareer();
  return { matchResult, event, national, seasonEnded, seasonSummary };
}

// --- end of season: trophies, awards, growth, aging, contract countdown ---
function endSeason(career){
  const p = career.player;
  const s = career.seasonStats;
  const club = currentClub(career);
  s.avgRating = s.ratedApps>0 ? Math.round((s.ratingSum/s.ratedApps)*100)/100 : 0;

  // approximate league finish based on club tier + team points performance
  const tierBase = { super:2, big:6, medium:10, small:14 }[club.tier];
  const perfShift = clamp((s.teamPoints - 45)/6, -4, 4);
  let finish = Math.round(clamp(tierBase - perfShift + randInt(-2,2), 1, 17));

  career.seasonTrophies = [];
  if(finish === 1){
    const trophyName = club.league==="Lega Aurea" ? TROPHY_LIST.league : TROPHY_LIST.league2;
    career.seasonTrophies.push(trophyName);
  }
  // cup: independent chance weighted by tier
  const cupChance = { super:0.22, big:0.13, medium:0.06, small:0.02 }[club.tier];
  if(Math.random() < cupChance){ career.seasonTrophies.push(TROPHY_LIST.cup); }
  // continental competition for big/super clubs
  if((club.tier==="super"||club.tier==="big") && Math.random() < (club.tier==="super"?0.15:0.05)){
    career.seasonTrophies.push(TROPHY_LIST.intl);
  }
  career.seasonTrophies.forEach(name=>career.trophies.push({ name, season:career.season }));

  // individual awards
  const seasonAwards = [];
  if(p.age<=21 && p.overall>=70 && Math.random()<0.35) seasonAwards.push("Miglior Giovane");
  if(s.goals>=18 && Math.random()<0.5) seasonAwards.push("Capocannoniere");
  if(s.assists>=14 && Math.random()<0.5) seasonAwards.push("Miglior Assistman");
  if(s.avgRating>=7.6 && career.seasonTrophies.length>0 && Math.random()<0.4) seasonAwards.push("Giocatore dell'Anno");
  if(s.avgRating>=7.8 && Math.random()<0.3) seasonAwards.push("MVP di Stagione");
  if(s.avgRating>=7.4 && s.apps>=22 && Math.random()<0.25) seasonAwards.push("Squadra dell'Anno");
  if(p.overall>=90 && career.trophies.length>=8 && Math.random()<0.2) seasonAwards.push("Premio Leggenda");
  seasonAwards.forEach(name=>career.awards.push({ name, season:career.season }));

  // growth & aging
  applySeasonGrowth(career);

  const seasonRecord = {
    season: career.season, club: club.name, apps:s.apps, minutes:s.minutes,
    goals:s.goals, assists:s.assists, avgRating:s.avgRating, overall:p.overall,
    finish, trophies:[...career.seasonTrophies], awards:[...seasonAwards],
    nationalCaps: career.national.calledThisSeasonCaps || 0,
  };
  career.history.push(seasonRecord);

  // reset season counters
  career.seasonStats = newSeasonStats();
  career.matchdayIndex = 0;
  career.injuryDaysThisSeason = 0;
  career.trainingSeasonsFocused = false;
  p.age += 1;
  career.season += 1;
  career.contract.yearsLeft -= 1;

  // transfer window: generate offers
  career.transferOffers = generateTransferOffers(career);
  career.pendingTransferWindow = true;

  // retirement check
  const retireRoll = Math.random();
  let forcedRetire = p.age >= 41;
  let voluntaryRetire = false;
  if(p.age>=33){
    const retireChance = clamp((p.age-33)*0.08 + (60-p.overall)*0.01, 0.02, 0.85);
    voluntaryRetire = retireRoll < retireChance;
  }
  if(forcedRetire || voluntaryRetire){
    career.retired = true;
    career.retiredSummary = buildRetirementSummary(career);
  }

  return { record: seasonRecord, awards: seasonAwards, trophies: career.seasonTrophies, retired: career.retired };
}

// --- transfers ---
function generateTransferOffers(career){
  const p = career.player;
  const club = currentClub(career);
  const offers = [];
  const contractEnding = career.contract.yearsLeft <= 0;
  const nOffers = contractEnding ? randInt(1,3) : (Math.random()<0.45 ? randInt(1,2) : 0);

  const candidateClubs = CLUBS.filter(c=>c.id!==club.id);
  for(let i=0;i<nOffers;i++){
    // pick a club roughly matching player level, with some chance of reaching higher
    const sorted = candidateClubs.slice().sort((a,b)=>{
      const da = Math.abs((a.strength) - p.overall);
      const db = Math.abs((b.strength) - p.overall);
      return da-db;
    });
    const poolSize = Math.max(3, Math.round(sorted.length*0.4));
    let pick = sorted[randInt(0, poolSize-1)];
    // small chance of an ambitious big-club offer if reputation is high
    if(p.reputation>70 && Math.random()<0.25){
      const bigOnes = candidateClubs.filter(c=>c.tier==="super"||c.tier==="big");
      if(bigOnes.length) pick = bigOnes[randInt(0,bigOnes.length-1)];
    }
    if(offers.find(o=>o.clubId===pick.id)) continue;
    const fee = Math.round(p.marketValue * randFloat(0.85,1.35) * 10)/10;
    const salary = Math.round(p.salary * randFloat(1.05,1.45));
    offers.push({ clubId: pick.id, clubName: pick.name, tier: pick.tier, fee, salary, years: randInt(2,4) });
  }
  return offers;
}

function acceptTransfer(career, offerIndex){
  const offer = career.transferOffers[offerIndex];
  if(!offer) return false;
  career.clubId = offer.clubId;
  career.contract = { salary: offer.salary, yearsLeft: offer.years };
  career.player.reputation = clamp(career.player.reputation + (TIER_ORDER[offer.tier]>=2?3:0), 0, 100);
  career.transferOffers = [];
  career.pendingTransferWindow = false;
  saveCareer();
  return true;
}

function renewContract(career){
  const p = career.player;
  const years = randInt(2,4);
  const salary = Math.round(p.salary * randFloat(1.1,1.3));
  career.contract = { salary, yearsLeft: years };
  career.transferOffers = [];
  career.pendingTransferWindow = false;
  p.morale = clamp(p.morale+8,0,100);
  saveCareer();
}

function stayWithoutRenewing(career){
  // if contract already at 0 and player refuses all offers, auto small renewal to keep career going
  if(career.contract.yearsLeft <= 0){
    career.contract.yearsLeft = 1;
  }
  career.transferOffers = [];
  career.pendingTransferWindow = false;
  saveCareer();
}

// --- retirement summary & career tier (internal, no numeric score shown) ---
function buildRetirementSummary(career){
  const p = career.player;
  const totalApps = career.history.reduce((s,h)=>s+h.apps,0);
  const totalGoals = career.history.reduce((s,h)=>s+h.goals,0);
  const totalAssists = career.history.reduce((s,h)=>s+h.assists,0);
  const totalTrophies = career.trophies.length;
  const totalAwards = career.awards.length;
  const seasonsPlayed = career.history.length;
  const topSeasons = career.history.filter(h=>h.avgRating>=7.3).length;

  // internal rating used ONLY to pick a category — never displayed as a number
  let rating = 0;
  rating += totalGoals*3.2 + totalAssists*2.6 + totalApps*1.1;
  rating += totalTrophies*140 + totalAwards*90;
  rating += (career.national.caps)*4 + career.national.goals*6 + career.national.tournamentsWon.length*300;
  rating += p.peakOverall*22;
  rating += topSeasons*60;
  rating += seasonsPlayed*15;
  if(career.national.isCaptain) rating += 200;

  let tier = LEGACY_TIERS[0].label;
  for(const t of LEGACY_TIERS){ if(rating>=t.min && rating<=t.max){ tier = t.label; } }

  const summary = {
    fullName: `${p.firstName} ${p.lastName}`,
    nationality: p.nationality, position: p.position,
    seasonsPlayed, totalApps, totalGoals, totalAssists,
    totalTrophies, totalAwards, peakOverall: p.peakOverall, peakMarketValue: p.marketValue,
    nationalCaps: career.national.caps, nationalGoals: career.national.goals,
    isCaptain: career.national.isCaptain, tournamentsWon: career.national.tournamentsWon.length,
    tier,
    clubsPlayedFor: [...new Set(career.history.map(h=>h.club))],
    bestClub: currentClub(career).name,
  };

  addToLeaderboard({
    name: summary.fullName, nationality: summary.nationality, position: summary.position,
    bestClub: summary.bestClub, tier: summary.tier, goals: summary.totalGoals,
    assists: summary.totalAssists, trophies: summary.totalTrophies, maxOverall: summary.peakOverall,
    _internalRating: rating,
  });

  return summary;
}
