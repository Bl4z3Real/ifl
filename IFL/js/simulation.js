// ===================== IFL SIMULATION =====================
// Simulates a single matchday for the player's club, including the player's
// individual involvement (starter/sub/unused), performance, goals/assists,
// and injury risk. Not purely random: driven by stats, form, morale, condition.

function starterProbability(career){
  const p = career.player;
  const club = clubById(career.clubId);
  // squad competition: stronger clubs are harder to break into, especially when young/low rep
  const tierPenalty = { small:0, medium:4, big:10, super:16 }[club.tier];
  let chance = 0.35 + (p.overall-60)*0.014 + (p.reputation-30)*0.003 - tierPenalty*0.01;
  chance += (p.form-50)*0.002;
  if(career.currentInjury) chance = 0;
  return clamp(chance, 0.04, 0.97);
}

function opponentStrength(career){
  const club = clubById(career.clubId);
  return clamp(club.strength + randFloat(-14,14), 30, 99);
}

function simulateMatchday(career){
  const p = career.player;
  const club = clubById(career.clubId);
  const result = { played:false, minutes:0, goals:0, assists:0, rating:0, injury:null, teamResult:null, matchImportance:1 };

  if(career.currentInjury){
    // sidelined
    career.currentInjury.daysLeft -= 7;
    if(career.currentInjury.daysLeft <= 0){ career.currentInjury = null; }
    result.injuryStatus = "out";
  }

  const oppStrength = opponentStrength(career);
  const isStarter = !career.currentInjury && Math.random() < starterProbability(career);

  if(isStarter){
    result.played = true;
    result.minutes = randInt(60,90);
  } else if(!career.currentInjury && Math.random() < 0.4){
    result.played = true;
    result.minutes = randInt(8,30); // substitute appearance
  }

  if(result.played){
    // performance rating base — compares player quality to their own club's level,
    // so a player fitting their club plays at a "normal" 6.3-6.8 rating on average,
    // while over/under-performing relative to club level swings it further.
    const w = POSITION_WEIGHTS[p.position];
    let statScore = 0;
    for(const k in w) statScore += p.stats[k]*w[k];
    const clubFitDiff = (statScore - club.strength)/18;
    const strengthDiff = (club.strength - oppStrength)/45;
    const formBoost = (p.form-50)/130;
    const moraleBoost = (p.morale-50)/170;
    const conditionPenalty = (100-p.condition)/240;

    let rating = 6.4 + clubFitDiff + strengthDiff*0.5 + formBoost + moraleBoost - conditionPenalty + randFloat(-0.5,0.6);
    rating = clamp(rating, 3.5, 10);
    result.rating = Math.round(rating*10)/10;

    // goal/assist probability scaled by minutes, shooting/passing, position, rating
    const minuteFactor = result.minutes/90;
    const attackWeight = { ATT:1, AD:0.7, AS:0.7, COC:0.6, CC:0.35, CDC:0.15, TD:0.15, TS:0.15, DC:0.06, POR:0.01 }[p.position];
    const goalChance = attackWeight * minuteFactor * (p.stats.shooting/100) * clamp((rating-5.5)/3,0.1,1.6) * 0.55;
    const assistWeight = { ATT:0.4, AD:0.8, AS:0.8, COC:0.9, CC:0.6, CDC:0.35, TD:0.35, TS:0.35, DC:0.08, POR:0.01 }[p.position];
    const assistChance = assistWeight * minuteFactor * (p.stats.passing/100) * clamp((rating-5.5)/3,0.1,1.5) * 0.5;

    result.goals = poissonish(goalChance);
    result.assists = poissonish(assistChance);
    if(result.goals>0) rating += Math.min(result.goals*0.35,1.2);
    if(result.assists>0) rating += Math.min(result.assists*0.2,0.6);
    result.rating = clamp(Math.round(rating*10)/10, 3.5, 10);

    // condition drain
    p.condition = clamp(p.condition - (result.minutes/90)*randInt(8,16), 10, 100);
    // form drift toward rating-driven direction
    const formDelta = (result.rating-6.5)*2 + randFloat(-2,2);
    p.form = clamp(p.form + formDelta, 5, 99);

    // injury risk
    const injuryRisk = 0.018 * (1 - p.reliability/130) * (1 + (100-p.condition)/160) * (result.minutes/90);
    if(Math.random() < injuryRisk){
      result.injury = rollInjury();
      career.currentInjury = { ...result.injury, daysLeft: result.injury.days };
      career.injuryDaysThisSeason = (career.injuryDaysThisSeason||0) + result.injury.days;
    }
  } else {
    // did not play: condition recovers, form drifts slightly toward neutral
    p.condition = clamp(p.condition + randInt(4,10), 10, 100);
    p.form = clamp(p.form + (55-p.form)*0.05, 5, 99);
  }

  // team result (approximate, flavor only)
  const teamPerf = club.strength + randFloat(-10,10) + (result.played? (result.rating-6.5)*1.5 : 0);
  const diff = teamPerf - oppStrength;
  let gf = clamp(Math.round((diff/12) + randFloat(-1,2.2)), 0, 6);
  let ga = clamp(Math.round((-diff/12) + randFloat(-1,2.2)), 0, 6);
  result.teamResult = { gf, ga, outcome: gf>ga?"V":(gf===ga?"P":"S") };

  // accumulate season stats
  if(result.played){
    career.seasonStats.apps++;
    career.seasonStats.minutes += result.minutes;
    career.seasonStats.goals += result.goals;
    career.seasonStats.assists += result.assists;
    career.seasonStats.ratingSum += result.rating;
    career.seasonStats.ratedApps++;
  }
  if(result.teamResult.outcome==="V") career.seasonStats.teamWins++;
  else if(result.teamResult.outcome==="P") career.seasonStats.teamDraws++;
  else career.seasonStats.teamLosses++;
  career.seasonStats.teamPoints += result.teamResult.outcome==="V"?3:(result.teamResult.outcome==="P"?1:0);

  return result;
}

function poissonish(lambda){
  // cheap approximation for small lambda goal/assist counts
  if(Math.random() > lambda) return 0;
  if(Math.random() > lambda*2.2) return 1;
  return Math.random() > 0.85 ? 2 : 1;
}

function rollInjury(){
  const roll = Math.random();
  if(roll < 0.55) return { severity:"lieve", label:"Infortunio lieve", days:randInt(7,14) };
  if(roll < 0.85) return { severity:"medio", label:"Infortunio medio", days:randInt(15,35) };
  if(roll < 0.97) return { severity:"grave", label:"Infortunio grave", days:randInt(45,120) };
  return { severity:"ricorrente", label:"Infortunio ricorrente", days:randInt(20,60) };
}
