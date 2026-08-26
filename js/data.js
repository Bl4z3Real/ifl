// ===================== IFL DATA =====================
// Static game data: nations, clubs, positions, styles, name pools, awards.

const NATIONS = [
  "Italia","Spagna","Francia","Germania","Inghilterra","Portogallo","Brasile","Argentina",
  "Olanda","Belgio","Croazia","Uruguay","Giappone","Corea del Sud","Stati Uniti","Marocco",
  "Senegal","Nigeria","Ghana","Polonia","Svezia","Danimarca","Norvegia","Serbia","Austria",
  "Svizzera","Turchia","Grecia","Messico","Colombia"
];

const POSITIONS = ["POR","DC","TD","TS","CDC","CC","COC","AD","AS","ATT"];

const POSITION_LABELS = {
  POR:"Portiere", DC:"Difensore Centrale", TD:"Terzino Destro", TS:"Terzino Sinistro",
  CDC:"Centrocampista Difensivo", CC:"Centrocampista Centrale", COC:"Trequartista",
  AD:"Ala Destra", AS:"Ala Sinistra", ATT:"Attaccante"
};

// Which core stats matter most for OVR at each position (weights sum ~1)
const POSITION_WEIGHTS = {
  POR:  { speed:.05, shooting:.02, passing:.10, dribbling:.03, defending:.30, physical:.20, technique:.10, mentality:.20 },
  DC:   { speed:.08, shooting:.03, passing:.10, dribbling:.04, defending:.35, physical:.20, technique:.05, mentality:.15 },
  TD:   { speed:.15, shooting:.05, passing:.15, dribbling:.12, defending:.25, physical:.10, technique:.08, mentality:.10 },
  TS:   { speed:.15, shooting:.05, passing:.15, dribbling:.12, defending:.25, physical:.10, technique:.08, mentality:.10 },
  CDC:  { speed:.08, shooting:.05, passing:.20, dribbling:.10, defending:.25, physical:.15, technique:.07, mentality:.10 },
  CC:   { speed:.08, shooting:.10, passing:.22, dribbling:.15, defending:.10, physical:.10, technique:.15, mentality:.10 },
  COC:  { speed:.10, shooting:.15, passing:.20, dribbling:.20, defending:.03, physical:.07, technique:.20, mentality:.05 },
  AD:   { speed:.22, shooting:.12, passing:.13, dribbling:.22, defending:.03, physical:.08, technique:.15, mentality:.05 },
  AS:   { speed:.22, shooting:.12, passing:.13, dribbling:.22, defending:.03, physical:.08, technique:.15, mentality:.05 },
  ATT:  { speed:.15, shooting:.28, passing:.08, dribbling:.15, defending:.02, physical:.12, technique:.15, mentality:.05 },
};

const STYLES = ["Playmaker","Regista","Dribblatore","Finalizzatore","Ala","Difensore","Box-to-box","Attaccante completo"];

// Style modifiers: applied to starting stats and to growth rate of specific stats
const STYLE_MODIFIERS = {
  "Playmaker":          { start:{passing:6, technique:4, mentality:3}, growth:{passing:1.3, technique:1.15} },
  "Regista":            { start:{passing:7, mentality:5, defending:2}, growth:{passing:1.3, mentality:1.2} },
  "Dribblatore":        { start:{dribbling:7, technique:5}, growth:{dribbling:1.3, technique:1.15} },
  "Finalizzatore":      { start:{shooting:7, mentality:3}, growth:{shooting:1.35} },
  "Ala":                { start:{speed:6, dribbling:5, shooting:2}, growth:{speed:1.2, dribbling:1.2} },
  "Difensore":          { start:{defending:7, physical:5}, growth:{defending:1.35, physical:1.1} },
  "Box-to-box":         { start:{physical:5, passing:3, defending:3, speed:2}, growth:{physical:1.15, mentality:1.15} },
  "Attaccante completo":{ start:{shooting:5, physical:4, technique:3, speed:2}, growth:{shooting:1.2, physical:1.1} },
};

// Club tiers: small, medium, big, super — used for offers, salary, prestige
const CLUBS = [
  // Lega Aurea (top league, fictional)
  { id:"C01", name:"Real Costiera", league:"Lega Aurea", tier:"super", strength:92, prestige:98, budget:400 },
  { id:"C02", name:"Nord Milano FC", league:"Lega Aurea", tier:"super", strength:90, prestige:95, budget:380 },
  { id:"C03", name:"Atletico Bravos", league:"Lega Aurea", tier:"super", strength:89, prestige:93, budget:350 },
  { id:"C04", name:"Porto Reale", league:"Lega Aurea", tier:"big", strength:83, prestige:80, budget:200 },
  { id:"C05", name:"Stella Rossonera", league:"Lega Aurea", tier:"big", strength:81, prestige:78, budget:180 },
  { id:"C06", name:"Unione Vesuvio", league:"Lega Aurea", tier:"big", strength:79, prestige:74, budget:150 },
  { id:"C07", name:"Torino Union", league:"Lega Aurea", tier:"medium", strength:72, prestige:60, budget:90 },
  { id:"C08", name:"Adriatica Calcio", league:"Lega Aurea", tier:"medium", strength:70, prestige:55, budget:80 },
  { id:"C09", name:"Sud Marina FC", league:"Lega Aurea", tier:"medium", strength:68, prestige:52, budget:70 },
  { id:"C10", name:"Alpina United", league:"Lega Aurea", tier:"small", strength:60, prestige:35, budget:35 },
  { id:"C11", name:"Portofiume", league:"Lega Aurea", tier:"small", strength:58, prestige:32, budget:30 },
  { id:"C12", name:"Collina Sport Club", league:"Lega Aurea", tier:"small", strength:55, prestige:28, budget:25 },

  // Segunda Division (second tier, where career often starts)
  { id:"C13", name:"Bassa Terra FC", league:"Segunda Division", tier:"medium", strength:63, prestige:40, budget:40 },
  { id:"C14", name:"Villa Nuova", league:"Segunda Division", tier:"small", strength:54, prestige:25, budget:20 },
  { id:"C15", name:"Foresta Calcio", league:"Segunda Division", tier:"small", strength:50, prestige:20, budget:15 },
  { id:"C16", name:"Riviera Giovani", league:"Segunda Division", tier:"small", strength:47, prestige:16, budget:10 },
  { id:"C17", name:"Ponte Vecchio SC", league:"Segunda Division", tier:"small", strength:45, prestige:14, budget:8 },
];

const TIER_ORDER = { small:0, medium:1, big:2, super:3 };

const TROPHY_LIST = {
  league: "Campionato Lega Aurea",
  league2: "Campionato Segunda Division",
  cup: "Coppa Nazionale",
  supercup: "Supercoppa",
  intl: "Coppa dei Campioni IFL",
  nt_major: "Coppa del Mondo IFL",
  nt_cont: "Campionato Continentale"
};

const AWARDS_LIST = [
  "Miglior Giovane","Capocannoniere","Miglior Assistman","Giocatore dell'Anno",
  "MVP di Stagione","Squadra dell'Anno","Premio Leggenda"
];

// Simple aesthetic presets for character creation — color-based, no external art assets needed.
const APPEARANCE_PRESETS = [
  { id:"p1", label:"Notturno",  primary:"#e3ab2c", secondary:"#0d1320", skin:"#c48a5a" },
  { id:"p2", label:"Adriatico", primary:"#6fd6ff", secondary:"#0b1a22", skin:"#a9714a" },
  { id:"p3", label:"Vulcanico", primary:"#e8543f", secondary:"#1a0d0a", skin:"#e0b089" },
  { id:"p4", label:"Smeraldo",  primary:"#3ecf7e", secondary:"#0a1a12", skin:"#8a5a35" },
  { id:"p5", label:"Regale",    primary:"#b98af0", secondary:"#140b1f", skin:"#f0cba3" },
  { id:"p6", label:"Ghiaccio",  primary:"#eef1f6", secondary:"#141a24", skin:"#c48a5a" },
];

const FIRST_NAMES = ["Luca","Marco","Alessandro","Davide","Andrea","Matteo","Simone","Nicolo","Gabriel","Rafael",
  "Bruno","Diego","Mateus","Thiago","Lucas","Hugo","Leo","Nathan","Kevin","Erik","Lars","Jonas","Felix","Noah",
  "Adam","Kofi","Malik","Amir","Yusuf","Kenji","Haruto","Min-jun","Carlos","Pablo","Javier","Tomas"];
const LAST_NAMES = ["Rinaldi","Bianchi","Moretti","Silva","Santos","Fernandez","Costa","Lopez","Garcia","Rossi",
  "Van Dijk","De Boer","Andersson","Nilsson","Kowalski","Novak","Popovic","Diallo","Mensah","Okafor","Suzuki",
  "Tanaka","Kim","Park","Martins","Alves","Ferreira","Dubois","Lefevre","Weber","Muller","Keller"];

// Career tiers — determined internally from career achievements (trophies, goals,
// caps, awards, longevity...). No raw numeric score is ever shown to the player,
// only the resulting category and the real achievements behind it.
const LEGACY_TIERS = [
  { min:0,    max:1999, label:"Talento" },
  { min:2000, max:3999, label:"Professionista" },
  { min:4000, max:5999, label:"Stella" },
  { min:6000, max:7999, label:"Leggenda" },
  { min:8000, max:9499, label:"Icona" },
  { min:9500, max:Infinity, label:"Immortale" },
];

function randomName(){
  return {
    firstName: FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)],
    lastName: LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)]
  };
}
