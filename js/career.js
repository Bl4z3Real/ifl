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

// --- fixtures / calendar ---
function generateFixtures(career){
  const club = currentClub(career);
  const rivals = CLUBS.filter(c=>c.league===club.league && c.id!==club.id);
  const fixtures = [];
  for(let i=0;i<career.seasonLength;i++){
    const isCup = (i>0 && i%7===0 && club.tier!=="small");
    const opponent = rivals[Math.floor(Math.random()*rivals.length)];
    fixtures.push({
      matchday: i+1,
      opponent: opponent.name,
      opponentTier: opponent.tier,
      competition: isCup ? TROPHY_LIST.cup : (club.league),
      home: i%2===0,
      played:false,
      result:null,
      playerGoals:0, playerAssists:0, playerRating:null,
    });
  }
  career.fixtures = fixtures;
}

// --- live league table ---
function buildFreshTable(career){
  const club = currentClub(career);
  const table = {};
  CLUBS.filter(c=>c.league===club.league).forEach(c=>{
    table[c.id] = { clubId:c.id, name:c.name, played:0, points:0, gf:0, ga:0, w:0, d:0, l:0 };
  });
  career.leagueTable = table;
}

function updateLeagueTable(career, matchResult){
  const club = currentClub(career);
  const table = career.leagueTable;
  if(!table || !table[club.id]) return;

  // user's club: use the actual simulated result
  applyTableResult(table[club.id], matchResult.teamResult);

  // rivals: simulate a lightweight phantom result for the same matchday so the
  // table evolves realistically alongside the player's own season
  Object.values(table).forEach(row=>{
    if(row.clubId===club.id) return;
    const rivalClub = clubById(row.clubId);
    const opp = clamp(rivalClub.strength + randFloat(-14,14), 30, 99);
    const diff = (rivalClub.strength + randFloat(-8,8)) - opp;
    const gf = clamp(Math.round(diff/12 + randFloat(-1,2.2)),0,6);
    const ga = clamp(Math.round(-diff/12 + randFloat(-1,2.2)),0,6);
    applyTableResult(row, { gf, ga, outcome: gf>ga?"V":(gf===ga?"P":"S") });
  });
}

function applyTableResult(row, teamResult){
  row.played++; row.gf += teamResult.gf; row.ga += teamResult.ga;
  if(teamResult.outcome==="V"){ row.points+=3; row.w++; }
  else if(teamResult.outcome==="P"){ row.points+=1; row.d++; }
  else { row.l++; }
}

function sortedTable(career){
  return Object.values(career.leagueTable).sort((a,b)=> b.points-a.points || (b.gf-b.ga)-(a.gf-a.ga));
}

function userTableRank(career){
  const sorted = sortedTable(career);
  return sorted.findIndex(r=>r.clubId===career.clubId) + 1;
}

// --- season objectives ---
const OBJECTIVE_POOL = [
  { id:"apps", label:(t)=>`Colleziona almeno ${t} presenze`, pick:(c)=>randInt(14,22),
    progress:(c)=>c.seasonStats.apps, check:(c,t)=>c.seasonStats.apps>=t },
  { id:"goal_contrib", label:(t)=>`Partecipa a ${t} gol (gol+assist)`, pick:(c)=>{
      const attacking = ["ATT","AD","AS","COC"].includes(c.player.position);
      return attacking ? randInt(12,20) : randInt(4,9);
    }, progress:(c)=>c.seasonStats.goals+c.seasonStats.assists, check:(c,t)=>(c.seasonStats.goals+c.seasonStats.assists)>=t },
  { id:"avg_rating", label:(t)=>`Media voto stagionale ≥ ${t.toFixed(1)}`, pick:()=>randFloat(6.4,6.9),
    progress:(c)=> c.seasonStats.ratedApps>0 ? c.seasonStats.ratingSum/c.seasonStats.ratedApps : 0,
    check:(c,t)=> c.seasonStats.ratedApps>=8 && (c.seasonStats.ratingSum/c.seasonStats.ratedApps)>=t },
  { id:"trophy", label:()=>`Vinci un trofeo con il club`, pick:()=>1,
    condition:(c)=>["big","super"].includes(currentClub(c).tier),
    progress:(c)=>(c.seasonTrophies||[]).length>0?1:0, check:(c)=>(c.seasonTrophies||[]).length>0 },
  { id:"national", label:()=>`Ottieni una convocazione in nazionale`, pick:()=>1,
    condition:(c)=>c.national.caps<3,
    progress:(c)=>c.national.calledThisSeasonFlag?1:0, check:(c)=>c.national.calledThisSeasonFlag },
  { id:"condition", label:()=>`Evita infortuni gravi per l'intera stagione`, pick:()=>1,
    progress:(c)=>c.hadSevereInjuryThisSeason?0:1, check:(c)=>!c.hadSevereInjuryThisSeason },
];

function generateObjectives(career){
  career.national.calledThisSeasonFlag = false;
  career.hadSevereInjuryThisSeason = false;
  const pool = OBJECTIVE_POOL.filter(o=>!o.condition || o.condition(career));
  const shuffled = pool.slice().sort(()=>Math.random()-0.5);
  const chosen = shuffled.slice(0,3);
  career.objectives = chosen.map(o=>{
    const target = o.pick(career);
    return { id:o.id, label:o.label(target), target, done:false, failed:false };
  });
}

function updateObjectivesProgress(career){
  if(!career.objectives) return;
  career.objectives.forEach(obj=>{
    const def = OBJECTIVE_POOL.find(o=>o.id===obj.id);
    if(!def || obj.done) return;
    obj.currentProgress = def.progress(career);
  });
}

function finalizeObjectives(career){
  if(!career.objectives) return [];
  const results = [];
  career.objectives.forEach(obj=>{
    const def = OBJECTIVE_POOL.find(o=>o.id===obj.id);
    if(!def) return;
    const success = def.check(career, obj.target);
    obj.done = success; obj.failed = !success;
    results.push({ label: obj.label, done: success });
    if(success){
      career.player.morale = clamp(career.player.morale+5,0,100);
      career.player.reputation = clamp(career.player.reputation+2,0,100);
    }
  });
  return results;
}

// --- notifications ---
function pushNotification(career, { title, text, type="info" }){
  career.notifications = career.notifications || [];
  career.notifications.unshift({ id: Date.now()+Math.random(), title, text, type,
    season: career.season, matchday: career.matchdayIndex, read:false });
  career.notifications = career.notifications.slice(0,60);
}

function unreadNotificationCount(career){
  return (career.notifications||[]).filter(n=>!n.read).length;
}

function markAllNotificationsRead(career){
  (career.notifications||[]).forEach(n=>n.read=true);
}

function initCareer(form, prebuiltPlayer){
  const player = prebuiltPlayer || createPlayer(form);
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
    marketValueHistory: [],
    national: { caps:0, goals:0, assists:0, isCaptain:false, tournamentsWon:[], debutSeason:null, calledThisSeasonFlag:false },
    currentInjury: null,
    injuryDaysThisSeason: 0,
    hadSevereInjuryThisSeason: false,
    trainingFocus: "Tecnica",
    trainingSeasonsFocused:false,
    transferOffers: [],
    pendingTransferWindow:false,
    eventLog: [],
    notifications: [],
    retired:false,
    records:0,
    retiredSummary:null,
  };
  generateFixtures(career);
  buildFreshTable(career);
  generateObjectives(career);
  pushNotification(career, { title:"Benvenuto in IFL", text:`La tua avventura con ${club.name} comincia ora. In bocca al lupo, ${player.firstName}.`, type:"season" });
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
  career.national.calledThisSeasonFlag = true;
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
  pushNotification(career, { title:"Convocazione in Nazionale", text:`Sei stato convocato dalla nazionale ${p.nationality}. Presenza numero ${career.national.caps}.`, type:"national" });
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
  const fixture = career.fixtures[career.matchdayIndex];
  const matchResult = simulateMatchday(career);

  // record into calendar
  if(fixture){
    fixture.played = true;
    fixture.result = matchResult.teamResult;
    fixture.playerGoals = matchResult.goals;
    fixture.playerAssists = matchResult.assists;
    fixture.playerRating = matchResult.played ? matchResult.rating : null;
    fixture.playerMinutes = matchResult.minutes;
  }
  updateLeagueTable(career, matchResult);

  if(matchResult.injury && (matchResult.injury.severity==="grave" || matchResult.injury.severity==="ricorrente")){
    career.hadSevereInjuryThisSeason = true;
  }
  if(matchResult.injury){
    pushNotification(career, { title:"Infortunio", text:`${matchResult.injury.label}: circa ${matchResult.injury.days} giorni di stop.`, type:"injury" });
  }

  applyTrainingMicro(career);
  const event = maybeTriggerEvent(career);
  if(event){ pushNotification(career, { title:event.title, text:event.text, type:"event" }); }
  career.matchdayIndex++;
  updateObjectivesProgress(career);

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

  // real finishing position from the live-tracked league table (falls back to the
  // approximate tier-based estimate if for any reason the table isn't available)
  let finish;
  if(career.leagueTable && career.leagueTable[club.id]){
    finish = userTableRank(career);
  } else {
    const tierBase = { super:2, big:6, medium:10, small:14 }[club.tier];
    const perfShift = clamp((s.teamPoints - 45)/6, -4, 4);
    finish = Math.round(clamp(tierBase - perfShift + randInt(-2,2), 1, 17));
  }
  const finalTable = career.leagueTable ? sortedTable(career) : [];

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
  career.seasonTrophies.forEach(name=>{
    career.trophies.push({ name, season:career.season });
    pushNotification(career, { title:"Trofeo vinto!", text:`Hai conquistato: ${name}.`, type:"season" });
  });

  // individual awards
  const seasonAwards = [];
  if(p.age<=21 && p.overall>=70 && Math.random()<0.35) seasonAwards.push("Miglior Giovane");
  if(s.goals>=18 && Math.random()<0.5) seasonAwards.push("Capocannoniere");
  if(s.assists>=14 && Math.random()<0.5) seasonAwards.push("Miglior Assistman");
  if(s.avgRating>=7.6 && career.seasonTrophies.length>0 && Math.random()<0.4) seasonAwards.push("Giocatore dell'Anno");
  if(s.avgRating>=7.8 && Math.random()<0.3) seasonAwards.push("MVP di Stagione");
  if(s.avgRating>=7.4 && s.apps>=22 && Math.random()<0.25) seasonAwards.push("Squadra dell'Anno");
  if(p.overall>=90 && career.trophies.length>=8 && Math.random()<0.2) seasonAwards.push("Premio Leggenda");
  seasonAwards.forEach(name=>{
    career.awards.push({ name, season:career.season });
    pushNotification(career, { title:"Premio individuale", text:`Hai vinto: ${name}.`, type:"season" });
  });

  // objectives: finalize before growth resets anything season-specific
  const objectiveResults = finalizeObjectives(career);
  objectiveResults.forEach(r=>{
    if(r.done) pushNotification(career, { title:"Obiettivo raggiunto", text:r.label, type:"objective" });
  });

  // growth & aging
  applySeasonGrowth(career);
  career.marketValueHistory.push({ season: career.season, value: p.marketValue, overall: p.overall });

  const seasonRecord = {
    season: career.season, club: club.name, apps:s.apps, minutes:s.minutes,
    goals:s.goals, assists:s.assists, avgRating:s.avgRating, overall:p.overall,
    finish, leagueSize: finalTable.length || 17, trophies:[...career.seasonTrophies], awards:[...seasonAwards],
    nationalCaps: career.national.caps,
  };
  career.history.push(seasonRecord);
  pushNotification(career, { title:`Fine stagione ${career.season}`, text:`${s.apps} presenze, ${s.goals} gol, ${s.assists} assist. Posizione finale: ${finish}°.`, type:"season" });

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
  if(career.transferOffers.length>0){
    pushNotification(career, { title:"Offerte di mercato", text:`Hai ricevuto ${career.transferOffers.length} offerta/e. Gestiscile nella sezione Mercato.`, type:"market" });
  }

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
  // NOTE: next season's fixtures/table/objectives are generated in prepareNewSeason(),
  // called once the transfer window is resolved — so they always reflect the club
  // the player actually plays for next season.

  return { record: seasonRecord, awards: seasonAwards, trophies: career.seasonTrophies, retired: career.retired, objectiveResults };
}

function prepareNewSeason(career){
  if(career.retired) return;
  generateFixtures(career);
  buildFreshTable(career);
  generateObjectives(career);
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
  const oldClub = currentClub(career).name;
  career.clubId = offer.clubId;
  career.contract = { salary: offer.salary, yearsLeft: offer.years };
  career.player.reputation = clamp(career.player.reputation + (TIER_ORDER[offer.tier]>=2?3:0), 0, 100);
  career.transferOffers = [];
  career.pendingTransferWindow = false;
  pushNotification(career, { title:"Trasferimento completato", text:`Sei passato da ${oldClub} a ${offer.clubName}.`, type:"market" });
  prepareNewSeason(career);
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
  pushNotification(career, { title:"Rinnovo firmato", text:`Hai rinnovato con ${currentClub(career).name} per ${years} anni.`, type:"market" });
  prepareNewSeason(career);
  saveCareer();
}

function stayWithoutRenewing(career){
  // if contract already at 0 and player refuses all offers, auto small renewal to keep career going
  if(career.contract.yearsLeft <= 0){
    career.contract.yearsLeft = 1;
  }
  career.transferOffers = [];
  career.pendingTransferWindow = false;
  prepareNewSeason(career);
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
