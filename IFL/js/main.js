// ===================== IFL MAIN =====================

document.addEventListener("DOMContentLoaded", ()=>{
  populateCreateForm();
  wireGlobalActions();
  wireCreateForm();
  wireHubTabs();
  showScreen("screen-menu");
});

function wireGlobalActions(){
  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-action]");
    if(!btn) return;
    const action = btn.dataset.action;

    switch(action){
      case "new-career":
        showScreen("screen-create");
        break;
      case "continue-career":
        showContinueModal();
        break;
      case "leaderboard":
        showLeaderboardModal();
        break;
      case "how-to-play":
        showHowToModal();
        break;
      case "settings":
        showSettingsModal();
        break;
      case "back-to-menu":
        IFL.career = null; IFL.activeSlot = null;
        showScreen("screen-menu");
        break;
      case "back-to-menu-final":
        IFL.career = null; IFL.activeSlot = null;
        showScreen("screen-menu");
        break;
      case "close-modal":
        closeModal();
        break;
      case "load-slot":{
        const slot = btn.dataset.slot;
        const saves = getAllSaves();
        if(saves[slot]){
          IFL.career = saves[slot];
          IFL.activeSlot = slot;
          closeModal();
          enterHub();
        }
        break;
      }
      case "delete-slot":{
        deleteSave(btn.dataset.slot);
        showContinueModal();
        break;
      }
      case "wipe-data":{
        localStorage.removeItem(STORAGE_KEYS.saves);
        localStorage.removeItem(STORAGE_KEYS.leaderboard);
        closeModal();
        break;
      }
      case "advance":
        handleAdvance();
        break;
    }
  });
}

function wireCreateForm(){
  const form = document.getElementById("create-form");
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const data = new FormData(form);
    const values = Object.fromEntries(data.entries());
    const career = initCareer(values);
    const slot = findFreeSlot();
    IFL.career = career;
    IFL.activeSlot = slot;
    saveCareer();
    enterHub();
  });
}

function wireHubTabs(){
  document.querySelectorAll(".hub-tab").forEach(tab=>{
    tab.addEventListener("click", ()=> renderHubTab(tab.dataset.tab));
  });
}

function enterHub(){
  IFL.hubTab = "overview";
  showScreen("screen-hub");
  renderHub();
}

function handleAdvance(){
  const career = IFL.career;
  if(!career || career.retired) return;

  if(career.pendingTransferWindow){
    showTransferModal(career, ()=>{
      closeModal();
      renderHub();
    });
    return;
  }

  const result = advanceMatchday(career);
  if(!result) return;

  if(result.seasonEnded){
    showSeasonSummaryModal(result.seasonSummary, ()=>{
      closeModal();
      if(career.retired){
        renderRetirementScreen(career);
      } else if(career.pendingTransferWindow){
        showTransferModal(career, ()=>{ closeModal(); renderHub(); });
      } else {
        renderHub();
      }
    });
  } else {
    // quick inline feedback via a lightweight toast-style modal only on notable moments
    if(result.event || (result.matchResult && result.matchResult.injury)){
      const parts = [];
      if(result.matchResult.injury){
        parts.push(`<p style="color:var(--c-danger);">🚑 <b>${result.matchResult.injury.label}</b> — starai fuori circa ${result.matchResult.injury.days} giorni.</p>`);
      }
      if(result.event){
        parts.push(`<p><b>${result.event.title}</b><br>${result.event.text}</p>`);
      }
      openModal(`<h2>Giornata ${career.matchdayIndex}</h2>${parts.join("")}
        <div class="btn-row"><button class="btn-sm primary" data-action="close-modal">Continua</button></div>`);
    }
    renderHub();
  }
}
