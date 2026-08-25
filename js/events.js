// ===================== IFL EVENTS =====================
// Random events fire occasionally during the season and have real, mechanical
// consequences on morale, form, reputation, market value, injuries, relationships.

const EVENT_POOL = [
  {
    id:"great_performance",
    title:"Prestazione super",
    text:(c)=>`${c.player.firstName} disputa una partita straordinaria, applaudito da tutto lo stadio.`,
    weight:8,
    apply:(c)=>{ c.player.form = clamp(c.player.form+10,0,99); c.player.reputation = clamp(c.player.reputation+3,0,100); }
  },
  {
    id:"bad_patch",
    title:"Periodo negativo",
    text:(c)=>`${c.player.firstName} attraversa un momento difficile, la critica inizia a farsi sentire.`,
    weight:8,
    apply:(c)=>{ c.player.form = clamp(c.player.form-12,0,99); c.player.morale = clamp(c.player.morale-6,0,100); }
  },
  {
    id:"coach_argument",
    title:"Discussione con l'allenatore",
    text:(c)=>`Tensione nello spogliatoio: l'allenatore critica pubblicamente ${c.player.firstName}.`,
    weight:5,
    apply:(c)=>{ c.player.morale = clamp(c.player.morale-10,0,100); }
  },
  {
    id:"coach_change",
    title:"Cambio in panchina",
    text:()=>`Il club esonera l'allenatore. Arriva un nuovo tecnico con idee diverse.`,
    weight:3,
    apply:(c)=>{ c.player.morale = clamp(c.player.morale + randInt(-8,8),0,100); }
  },
  {
    id:"teammate_help",
    title:"Un compagno di squadra aiuta",
    text:(c)=>`Un veterano dello spogliatoio prende ${c.player.firstName} sotto la sua ala protettiva.`,
    weight:6,
    apply:(c)=>{ c.player.morale = clamp(c.player.morale+8,0,100); c.player.stats.mentality = clamp(c.player.stats.mentality+0.6,1,99); }
  },
  {
    id:"media_pressure",
    title:"Pressione mediatica",
    text:(c)=>`I giornali parlano molto di ${c.player.firstName}: grandi aspettative sulle spalle.`,
    weight:5,
    apply:(c)=>{ c.player.reputation = clamp(c.player.reputation+2,0,100); c.player.morale = clamp(c.player.morale-3,0,100); }
  },
  {
    id:"big_club_interest",
    title:"Interesse di un grande club",
    text:(c)=>`Voci di mercato: un club prestigioso osserva da vicino ${c.player.firstName}.`,
    weight:4,
    condition:(c)=> c.player.overall >= 68,
    apply:(c)=>{ c.player.reputation = clamp(c.player.reputation+4,0,100); }
  },
  {
    id:"record",
    title:"Record personale",
    text:(c)=>`${c.player.firstName} stabilisce un nuovo record personale di rendimento.`,
    weight:3,
    apply:(c)=>{ c.player.reputation = clamp(c.player.reputation+5,0,100); c.records = (c.records||0)+1; }
  },
  {
    id:"minor_setback",
    title:"Piccolo intoppo fisico",
    text:(c)=>`${c.player.firstName} accusa un affaticamento muscolare precauzionale.`,
    weight:5,
    apply:(c)=>{ c.player.condition = clamp(c.player.condition-15,0,100); }
  },
  {
    id:"confidence_boost",
    title:"Momento decisivo",
    text:(c)=>`Un episodio chiave in campo cambia la percezione di ${c.player.firstName} agli occhi di tutti.`,
    weight:3,
    apply:(c)=>{ c.player.morale = clamp(c.player.morale+12,0,100); c.player.reputation = clamp(c.player.reputation+3,0,100); }
  },
];

function maybeTriggerEvent(career){
  // ~28% chance per matchday of a random event firing
  if(Math.random() > 0.28) return null;
  const pool = EVENT_POOL.filter(e => !e.condition || e.condition(career));
  const totalWeight = pool.reduce((s,e)=>s+e.weight,0);
  let roll = Math.random()*totalWeight;
  for(const e of pool){
    roll -= e.weight;
    if(roll <= 0){
      e.apply(career);
      const entry = { title:e.title, text: e.text(career), season: career.season };
      career.eventLog = career.eventLog || [];
      career.eventLog.unshift(entry);
      career.eventLog = career.eventLog.slice(0,40);
      return entry;
    }
  }
  return null;
}
