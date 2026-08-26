// ===================== IFL PLAYER =====================

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randFloat(min, max){ return Math.random()*(max-min)+min; }

// Base starting stats before style modifiers (16-21 y/o prospect)
function baseStartingStats(){
  return {
    speed: randInt(45,62),
    shooting: randInt(40,58),
    passing: randInt(42,60),
    dribbling: randInt(42,60),
    defending: randInt(38,58),
    physical: randInt(45,62),
    technique: randInt(42,60),
    mentality: randInt(40,58),
  };
}

function computeOverall(stats, position){
  const w = POSITION_WEIGHTS[position];
  let ovr = 0;
  for(const k in w){ ovr += stats[k]*w[k]; }
  return Math.round(clamp(ovr, 1, 99));
}

function createPlayer(form){
  const stats = baseStartingStats();
  const mod = STYLE_MODIFIERS[form.style];
  if(mod && mod.start){
    for(const k in mod.start){ stats[k] = clamp(stats[k] + mod.start[k], 1, 99); }
  }

  const age = parseInt(form.age,10);
  // Potential: younger + a random talent roll. Rare "wonderkid" chance.
  const talentRoll = Math.random();
  let potentialBase;
  if(talentRoll > 0.94) potentialBase = randInt(88,97);       // precocious talent
  else if(talentRoll > 0.75) potentialBase = randInt(78,88);  // strong prospect
  else if(talentRoll > 0.35) potentialBase = randInt(66,78);  // solid pro
  else potentialBase = randInt(55,66);                        // journeyman
  const potential = clamp(potentialBase - (age-17)*1.5, 50, 97);

  const overall = computeOverall(stats, form.position);
  const preset = APPEARANCE_PRESETS.find(p=>p.id===form.appearance) || APPEARANCE_PRESETS[0];

  const player = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    shirtName: (form.shirtName||form.lastName).trim().toUpperCase().slice(0,12),
    shirtNumber: clamp(parseInt(form.shirtNumber,10)||10, 1, 99),
    age, height: parseInt(form.height,10),
    foot: form.foot,
    nationality: form.nationality,
    position: form.position,
    style: form.style,
    appearance: preset.id,
    stats,
    overall,
    potential: Math.round(potential),
    peakOverall: overall,
    peakSeason: null,

    // secondary
    form: 65,          // current match form 0-100
    morale: 70,         // 0-100
    reputation: 15,      // 0-100 growing over career
    marketValue: estimateMarketValue(overall, age, potential, 15),
    salary: estimateSalary(overall, 15),
    reliability: randInt(60,85), // resistance to injuries
    condition: 100,      // physical freshness 0-100

    retired:false,
  };
  return player;
}

function estimateMarketValue(overall, age, potential, reputation){
  let base = Math.pow(1.16, overall-50) * 0.4; // millions
  const ageFactor = age <= 24 ? 1 + (24-age)*0.05 : Math.max(0.25, 1 - (age-24)*0.09);
  const potFactor = 1 + Math.max(0, potential-overall)*0.015;
  const repFactor = 0.7 + reputation/100*0.6;
  let value = base*ageFactor*potFactor*repFactor;
  return Math.round(clamp(value,0.05,220)*10)/10;
}

function estimateSalary(overall, reputation){
  let base = Math.pow(1.14, overall-50) * 8; // thousand/week
  const repFactor = 0.7 + reputation/100*0.6;
  return Math.round(clamp(base*repFactor, 2, 900));
}

// ---------- GROWTH SYSTEM ----------
// Called once per season (offseason) using aggregated season performance.
function applySeasonGrowth(career){
  const p = career.player;
  const s = career.seasonStats;
  const style = STYLE_MODIFIERS[p.style];

  // growth potential gap: how much room left to grow
  const gap = p.potential - p.overall;

  // performance factor from minutes played, average rating, goals contribution
  const minutesFactor = clamp(s.minutes / (career.seasonLength*80), 0, 1.3);
  const ratingFactor = clamp((s.avgRating - 6.3)/1.6, -0.6, 1.4);
  const trainingFactor = career.trainingSeasonsFocused ? 0.15 : 0;

  // age curve: fast growth <=23, slower 24-29, decline after 31
  let ageCurve;
  if(p.age <= 20) ageCurve = 2.4;
  else if(p.age <= 24) ageCurve = 1.9;
  else if(p.age <= 27) ageCurve = 1.0;
  else if(p.age <= 30) ageCurve = 0.4;
  else if(p.age <= 33) ageCurve = -0.25;
  else ageCurve = -0.9; // decline

  let growthPoints = 0;
  if(ageCurve > 0){
    growthPoints = ageCurve * (1 + minutesFactor*0.7 + Math.max(0,ratingFactor)*0.9 + trainingFactor);
    growthPoints *= clamp(gap/16, 0, 2.2); // no more growth once potential is reached
    // injuries hurt growth
    growthPoints *= clamp(1 - (career.injuryDaysThisSeason||0)/180, 0.35, 1);
  } else {
    // decline phase, worse with low condition/reliability and bad form
    growthPoints = ageCurve * (1 - Math.max(0,ratingFactor)*0.3);
  }

  // distribute growth across stats, weighted toward position + style growth bonuses.
  // Normalized so that the *resulting* overall increase actually matches growthPoints
  // (instead of being diluted by how concentrated the weights are).
  const w = POSITION_WEIGHTS[p.position];
  const growthMap = (style && style.growth) || {};
  const keys = Object.keys(p.stats);
  const weights = {};
  keys.forEach(k=>{ weights[k] = (w[k]||0.05) * (growthMap[k]||1); });
  const totalWeight = Object.values(weights).reduce((a,b)=>a+b,0);
  // S = how much a unit of "effort" per the weights above actually moves the overall
  let S = 0;
  keys.forEach(k=>{ S += (w[k]||0.05) * weights[k]; });
  const normalizedGrowth = S>0 ? growthPoints * (totalWeight / S) : growthPoints;

  const perStatCap = 9; // avoid unrealistic single-season spikes in one stat
  keys.forEach(k=>{
    let share = normalizedGrowth * (weights[k]/totalWeight);
    share = clamp(share, -perStatCap, perStatCap);
    const noise = randFloat(-0.4,0.4);
    p.stats[k] = clamp(Math.round((p.stats[k] + share + noise)*10)/10, 1, 99);
  });

  p.overall = computeOverall(p.stats, p.position);
  if(p.overall > p.peakOverall){ p.peakOverall = p.overall; p.peakSeason = career.season; }

  // reputation grows with performance & trophies, decays slowly otherwise
  const trophyBoost = (career.seasonTrophies||[]).length * 4;
  const repChange = ratingFactor*3 + trophyBoost + (s.goals+s.assists)*0.15 - 1;
  p.reputation = clamp(p.reputation + repChange, 1, 100);

  p.marketValue = estimateMarketValue(p.overall, p.age, p.potential, p.reputation);
  p.salary = career.contract ? career.contract.salary : estimateSalary(p.overall, p.reputation);
}
