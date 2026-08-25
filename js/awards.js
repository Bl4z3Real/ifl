// ===================== IFL AWARDS =====================
// Small metadata helpers for rendering trophies/awards nicely in the UI.

const AWARD_ICONS = {
  "Miglior Giovane":"🌱",
  "Capocannoniere":"⚽",
  "Miglior Assistman":"🎯",
  "Giocatore dell'Anno":"⭐",
  "MVP di Stagione":"🏅",
  "Squadra dell'Anno":"🛡️",
  "Premio Leggenda":"👑",
};

function awardIcon(name){ return AWARD_ICONS[name] || "🏆"; }

function trophyIcon(name){
  if(name === TROPHY_LIST.nt_major) return "🌍";
  if(name === TROPHY_LIST.nt_cont) return "🌐";
  if(name === TROPHY_LIST.intl) return "🏆";
  if(name === TROPHY_LIST.cup) return "🥇";
  return "🏆";
}
