// ===================== IFL STATE =====================
// LocalStorage-backed save system. Supports multiple slots + a global leaderboard.

const STORAGE_KEYS = {
  saves: "ifl_saves_v1",       // { slot1: careerObj, slot2: careerObj, ... }
  leaderboard: "ifl_leaderboard_v1", // [ {name, nationality, position, bestClub, tier, goals, assists, trophies, maxOverall} ]
  settings: "ifl_settings_v1"
};

const IFL = {
  career: null,          // active career object (in-memory)
  activeSlot: null,      // e.g. "slot1"
  screen: "menu",
  hubTab: "overview",
};

function getAllSaves(){
  try{
    const raw = localStorage.getItem(STORAGE_KEYS.saves);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}

function writeAllSaves(saves){
  localStorage.setItem(STORAGE_KEYS.saves, JSON.stringify(saves));
}

function saveCareer(){
  if(!IFL.career || !IFL.activeSlot) return;
  const saves = getAllSaves();
  saves[IFL.activeSlot] = IFL.career;
  writeAllSaves(saves);
}

function deleteSave(slot){
  const saves = getAllSaves();
  delete saves[slot];
  writeAllSaves(saves);
}

function findFreeSlot(){
  const saves = getAllSaves();
  for(let i=1;i<=5;i++){
    const key = "slot"+i;
    if(!saves[key]) return key;
  }
  return "slot1"; // overwrite oldest if full
}

function getLeaderboard(){
  try{
    const raw = localStorage.getItem(STORAGE_KEYS.leaderboard);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

function addToLeaderboard(entry){
  const board = getLeaderboard();
  board.push(entry);
  board.sort((a,b)=> (b._internalRating||0) - (a._internalRating||0));
  localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(board.slice(0,100)));
}

function clubById(id){
  return CLUBS.find(c=>c.id===id);
}
