// ===================== IFL UI =====================

function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function openModal(html){
  document.getElementById("modal-box").innerHTML = html;
  document.getElementById("modal-layer").classList.remove("hidden");
}
function closeModal(){
  document.getElementById("modal-layer").classList.add("hidden");
}

// ---------------- CREATE FORM ----------------
function populateCreateForm(){
  const natSel = document.querySelector('select[name="nationality"]');
  natSel.innerHTML = NATIONS.map(n=>`<option value="${n}">${n}</option>`).join("");

  const posSel = document.getElementById("position-select");
  posSel.innerHTML = POSITIONS.map(p=>`<option value="${p}">${p} — ${POSITION_LABELS[p]}</option>`).join("");

  const styleSel = document.getElementById("style-select");
  styleSel.innerHTML = STYLES.map(s=>`<option value="${s}">${s}</option>`).join("");

  const clubSel = document.getElementById("club-select");
  const byLeague = {};
  CLUBS.forEach(c=>{ (byLeague[c.league] = byLeague[c.league]||[]).push(c); });
  clubSel.innerHTML = Object.keys(byLeague).map(lg=>
    `<optgroup label="${lg}">${byLeague[lg].map(c=>`<option value="${c.id}">${c.name} (${c.tier})</option>`).join("")}</optgroup>`
  ).join("");

  updateStatPreview();
  document.getElementById("create-form").addEventListener("change", updateStatPreview);
}

function updateStatPreview(){
  const form = document.getElementById("create-form");
  const position = form.position.value;
  const style = form.style.value;
  // rough preview using average base stats + style mod, not the actual random roll
  const preview = {speed:53,shooting:49,passing:51,dribbling:51,defending:48,physical:53,technique:51,mentality:49};
  const mod = STYLE_MODIFIERS[style];
  if(mod && mod.start) for(const k in mod.start) preview[k]+=mod.start[k];
  const ovr = computeOverall(preview, position);
  const wrap = document.getElementById("stat-preview");
  wrap.innerHTML = `
    <div class="stat-mini"><div class="lbl">Overall stimato</div><div class="val">${ovr}</div></div>
    ${Object.entries(preview).map(([k,v])=>`<div class="stat-mini"><div class="lbl">${statLabel(k)}</div><div class="val">${Math.round(v)}</div></div>`).join("")}
  `;
}

function statLabel(k){
  return { speed:"Velocità", shooting:"Tiro", passing:"Passaggio", dribbling:"Dribbling",
    defending:"Difesa", physical:"Fisico", technique:"Tecnica", mentality:"Mentalità" }[k] || k;
}

// ---------------- HUB ----------------
function renderHub(){
  const career = IFL.career;
  const p = career.player;
  const club = currentClub(career);

  document.getElementById("hub-avatar").textContent = (p.firstName[0]+p.lastName[0]).toUpperCase();
  document.getElementById("hub-name").textContent = `${p.firstName} ${p.lastName}`;
  document.getElementById("hub-sub").textContent = `${POSITION_LABELS[p.position]} · ${club.name} · ${p.age} anni`;
  document.getElementById("hub-stats-mini").innerHTML = `
    <div class="mini-stat"><div class="n">${p.overall}</div><div class="l">OVR</div></div>
    <div class="mini-stat"><div class="n">${career.season}</div><div class="l">Stagione</div></div>
    <div class="mini-stat"><div class="n">${career.matchdayIndex}/${career.seasonLength}</div><div class="l">Giornata</div></div>
  `;

  renderHubTab(IFL.hubTab);

  const advanceBtn = document.getElementById("advance-btn");
  if(career.pendingTransferWindow){
    advanceBtn.textContent = "Gestisci mercato e prosegui";
  } else if(career.currentInjury){
    advanceBtn.textContent = `Infortunato (${career.currentInjury.daysLeft}g) — prosegui`;
  } else {
    advanceBtn.textContent = "Gioca prossima partita";
  }
}

function renderHubTab(tab){
  IFL.hubTab = tab;
  document.querySelectorAll(".hub-tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  const body = document.getElementById("hub-body");
  const career = IFL.career;
  const p = career.player;

  if(tab==="overview") body.innerHTML = renderOverviewTab(career);
  else if(tab==="training") body.innerHTML = renderTrainingTab(career);
  else if(tab==="squad") body.innerHTML = renderProfileTab(career);
  else if(tab==="history") body.innerHTML = renderHistoryTab(career);
  else if(tab==="national") body.innerHTML = renderNationalTab(career);

  if(tab==="training"){
    body.querySelectorAll(".focus-item").forEach(el=>{
      el.addEventListener("click", ()=>{
        career.trainingFocus = el.dataset.focus;
        saveCareer();
        renderHubTab("training");
      });
    });
  }
}

function renderOverviewTab(career){
  const p = career.player;
  const club = currentClub(career);
  const s = career.seasonStats;
  const avgRating = s.ratedApps>0 ? (s.ratingSum/s.ratedApps).toFixed(2) : "—";
  return `
    <div class="card">
      <h3>Stagione ${career.season} — ${club.name}</h3>
      <div class="stat-grid">
        <div class="stat-mini"><div class="lbl">Presenze</div><div class="val">${s.apps}</div></div>
        <div class="stat-mini"><div class="lbl">Minuti</div><div class="val">${s.minutes}</div></div>
        <div class="stat-mini"><div class="lbl">Gol</div><div class="val">${s.goals}</div></div>
        <div class="stat-mini"><div class="lbl">Assist</div><div class="val">${s.assists}</div></div>
        <div class="stat-mini"><div class="lbl">Media voto</div><div class="val">${avgRating}</div></div>
        <div class="stat-mini"><div class="lbl">Punti squadra</div><div class="val">${s.teamPoints}</div></div>
      </div>
    </div>

    <div class="card">
      <h3>Condizioni attuali</h3>
      ${renderMeter("Forma", p.form)}
      ${renderMeter("Morale", p.morale)}
      ${renderMeter("Condizione fisica", p.condition)}
      ${career.currentInjury ? `<p style="color:var(--c-danger); margin-top:10px;">🚑 ${career.currentInjury.label} — ${career.currentInjury.daysLeft} giorni rimanenti</p>` : ""}
    </div>

    <div class="card">
      <h3>Ultimi eventi</h3>
      ${career.eventLog && career.eventLog.length ? career.eventLog.slice(0,5).map(e=>`
        <div class="list-row"><div><div class="main">${e.title}</div><div class="sub">${e.text}</div></div></div>
      `).join("") : `<p style="color:var(--c-text-dim);">Nessun evento recente.</p>`}
    </div>
  `;
}

function renderMeter(label, value){
  return `<div class="stat-bar-row" style="margin-bottom:10px;">
    <div class="top"><span>${label}</span><span class="v">${Math.round(value)}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${clamp(value,0,100)}%"></div></div>
  </div>`;
}

function renderTrainingTab(career){
  const focuses = Object.keys(TRAINING_STAT_MAP);
  return `
    <div class="card">
      <h3>Focus allenamento settimanale</h3>
      <p style="color:var(--c-text-dim); font-size:13px;">Scegli su cosa concentrare l'allenamento. Influenza la crescita nel tempo e consuma condizione fisica.</p>
      <div class="focus-grid">
        ${focuses.map(f=>`<div class="focus-item ${career.trainingFocus===f?'selected':''}" data-focus="${f}">${f}</div>`).join("")}
      </div>
    </div>
    <div class="card">
      <h3>Statistiche del giocatore</h3>
      ${renderFullStatGrid(career.player)}
    </div>
  `;
}

function renderFullStatGrid(p){
  return `<div class="stat-grid">
    ${Object.entries(p.stats).map(([k,v])=>`
      <div class="stat-bar-row">
        <div class="top"><span>${statLabel(k)}</span><span class="v">${Math.round(v)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${v}%"></div></div>
      </div>
    `).join("")}
  </div>`;
}

function renderProfileTab(career){
  const p = career.player;
  const club = currentClub(career);
  return `
    <div class="card">
      <h3>Profilo</h3>
      <div class="list-row"><div class="main">Nome</div><div class="sub">${p.firstName} ${p.lastName}</div></div>
      <div class="list-row"><div class="main">Età</div><div class="sub">${p.age} anni</div></div>
      <div class="list-row"><div class="main">Nazionalità</div><div class="sub">${p.nationality}</div></div>
      <div class="list-row"><div class="main">Ruolo</div><div class="sub">${POSITION_LABELS[p.position]}</div></div>
      <div class="list-row"><div class="main">Stile</div><div class="sub">${p.style}</div></div>
      <div class="list-row"><div class="main">Club</div><div class="sub">${club.name}</div></div>
      <div class="list-row"><div class="main">Overall / Potenziale</div><div class="sub">${p.overall} / ${p.potential}</div></div>
      <div class="list-row"><div class="main">Valore di mercato</div><div class="sub">€${p.marketValue}M</div></div>
      <div class="list-row"><div class="main">Stipendio</div><div class="sub">€${career.contract.salary}k/sett.</div></div>
      <div class="list-row"><div class="main">Contratto</div><div class="sub">${career.contract.yearsLeft} anni rimanenti</div></div>
      <div class="list-row"><div class="main">Reputazione</div><div class="sub">${Math.round(p.reputation)}/100</div></div>
    </div>
    <div class="card">
      <h3>Statistiche</h3>
      ${renderFullStatGrid(p)}
    </div>
    <div class="card">
      <h3>Bacheca trofei (${career.trophies.length})</h3>
      ${career.trophies.length ? career.trophies.map(t=>`<div class="list-row"><div class="main">${trophyIcon(t.name)} ${t.name}</div><div class="sub">${t.season}</div></div>`).join("") : `<p style="color:var(--c-text-dim);">Ancora nessun trofeo.</p>`}
    </div>
    <div class="card">
      <h3>Premi individuali (${career.awards.length})</h3>
      ${career.awards.length ? career.awards.map(a=>`<div class="list-row"><div class="main">${awardIcon(a.name)} ${a.name}</div><div class="sub">${a.season}</div></div>`).join("") : `<p style="color:var(--c-text-dim);">Ancora nessun premio.</p>`}
    </div>
  `;
}

function renderHistoryTab(career){
  if(!career.history.length){
    return `<div class="card"><p style="color:var(--c-text-dim);">La prima stagione è ancora in corso. Torna qui a fine anno.</p></div>`;
  }
  return `<div class="card"><h3>Timeline carriera</h3>
    <div class="timeline">
      ${career.history.slice().reverse().map(h=>`
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-season">${h.season}</div>
          <div style="flex:1;">
            <div class="main">${h.club} — OVR ${h.overall}</div>
            <div class="sub">${h.apps} presenze · ${h.goals} gol · ${h.assists} assist · media ${h.avgRating}</div>
            ${h.trophies.length ? `<div style="margin-top:4px;">${h.trophies.map(t=>`<span class="pill gold">${t}</span> `).join("")}</div>` : ""}
            ${h.awards.length ? `<div style="margin-top:4px;">${h.awards.map(a=>`<span class="pill cyan">${a}</span> `).join("")}</div>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  </div>`;
}

function renderNationalTab(career){
  const n = career.national;
  const p = career.player;
  return `
    <div class="card">
      <h3>Nazionale ${p.nationality}</h3>
      <div class="stat-grid">
        <div class="stat-mini"><div class="lbl">Presenze</div><div class="val">${n.caps}</div></div>
        <div class="stat-mini"><div class="lbl">Gol</div><div class="val">${n.goals}</div></div>
        <div class="stat-mini"><div class="lbl">Assist</div><div class="val">${n.assists}</div></div>
        <div class="stat-mini"><div class="lbl">Tornei vinti</div><div class="val">${n.tournamentsWon.length}</div></div>
      </div>
      ${n.isCaptain ? `<p style="margin-top:12px;"><span class="pill gold">🎖 Capitano della Nazionale</span></p>` : ""}
      ${n.debutSeason ? `<p style="color:var(--c-text-dim); margin-top:10px;">Debutto in nazionale: ${n.debutSeason}</p>` : `<p style="color:var(--c-text-dim); margin-top:10px;">Non ancora convocato in nazionale.</p>`}
    </div>
    ${n.tournamentsWon.length ? `<div class="card"><h3>Tornei vinti</h3>${n.tournamentsWon.map(t=>`<div class="list-row"><div class="main">${trophyIcon(t.name)} ${t.name}</div><div class="sub">${t.season}</div></div>`).join("")}</div>` : ""}
  `;
}

// ---------------- LEADERBOARD / HOW TO / SETTINGS via modal ----------------
function showLeaderboardModal(){
  const board = getLeaderboard();
  openModal(`
    <h2>Classifica leggende</h2>
    <div class="modal-sub">Le carriere concluse, ordinate per rendimento complessivo</div>
    ${board.length===0 ? `<p>Nessuna carriera completata ancora.</p>` :
      board.slice(0,20).map((e,i)=>`
        <div class="list-row">
          <div><div class="main">#${i+1} ${e.name}</div><div class="sub">${e.nationality} · ${e.position} · ${e.bestClub}</div></div>
          <div style="text-align:right;"><div class="pill gold">${e.tier}</div><div class="sub" style="margin-top:4px;">${e.goals}G ${e.assists}A · ${e.trophies}🏆</div></div>
        </div>
      `).join("")
    }
    <div class="btn-row"><button class="btn-sm primary" data-action="close-modal">Chiudi</button></div>
  `);
}

function showHowToModal(){
  openModal(`
    <h2>Come si gioca</h2>
    <p>Crea il tuo calciatore scegliendo ruolo, stile e club di partenza. Ogni volta che premi <b>"Gioca prossima partita"</b> simuli una giornata: le tue statistiche, forma e condizione determinano prestazioni, gol e assist.</p>
    <p>Scegli un <b>focus di allenamento</b> per orientare la crescita. Attento a infortuni e morale: influenzano tutto, dalle convocazioni in nazionale alle offerte di mercato.</p>
    <p>A fine stagione ricevi trofei, premi individuali e — se il contratto è in scadenza o arrivano offerte — potrai cambiare squadra. La carriera continua fino al ritiro, quando riceverai una valutazione finale basata su tutto ciò che hai costruito.</p>
    <div class="btn-row"><button class="btn-sm primary" data-action="close-modal">Ho capito</button></div>
  `);
}

function showSettingsModal(){
  openModal(`
    <h2>Impostazioni</h2>
    <p>I salvataggi sono locali al browser (LocalStorage). Da qui puoi cancellare tutti i dati di IFL.</p>
    <div class="btn-row">
      <button class="btn-sm danger" data-action="wipe-data">Cancella tutti i salvataggi</button>
      <button class="btn-sm primary" data-action="close-modal">Chiudi</button>
    </div>
  `);
}

function showContinueModal(){
  const saves = getAllSaves();
  const slots = Object.keys(saves);
  if(slots.length===0){
    openModal(`<h2>Continua</h2><p>Non ci sono carriere salvate. Inizia una nuova carriera dal menu principale.</p>
      <div class="btn-row"><button class="btn-sm primary" data-action="close-modal">Chiudi</button></div>`);
    return;
  }
  openModal(`
    <h2>Le tue carriere</h2>
    ${slots.map(slot=>{
      const c = saves[slot];
      const club = clubById(c.clubId);
      return `<div class="list-row">
        <div><div class="main">${c.player.firstName} ${c.player.lastName}</div><div class="sub">${club.name} · OVR ${c.player.overall} · Stagione ${c.season}</div></div>
        <div class="btn-row" style="margin-top:0;">
          <button class="btn-sm primary" data-action="load-slot" data-slot="${slot}">Carica</button>
          <button class="btn-sm danger" data-action="delete-slot" data-slot="${slot}">Elimina</button>
        </div>
      </div>`;
    }).join("")}
    <div class="btn-row"><button class="btn-sm" data-action="close-modal">Chiudi</button></div>
  `);
}

// ---------------- SEASON END / TRANSFER MODALS ----------------
function showSeasonSummaryModal(summary, onDone){
  const r = summary.record;
  openModal(`
    <h2>Fine stagione ${r.season}</h2>
    <div class="modal-sub">${r.club}</div>
    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-mini"><div class="lbl">Presenze</div><div class="val">${r.apps}</div></div>
      <div class="stat-mini"><div class="lbl">Gol</div><div class="val">${r.goals}</div></div>
      <div class="stat-mini"><div class="lbl">Assist</div><div class="val">${r.assists}</div></div>
      <div class="stat-mini"><div class="lbl">Media voto</div><div class="val">${r.avgRating}</div></div>
      <div class="stat-mini"><div class="lbl">Overall</div><div class="val">${r.overall}</div></div>
      <div class="stat-mini"><div class="lbl">Posizione</div><div class="val">${r.finish}°</div></div>
    </div>
    ${r.trophies.length ? `<p><b>Trofei vinti:</b> ${r.trophies.map(t=>`<span class="pill gold">${t}</span>`).join(" ")}</p>` : ""}
    ${r.awards.length ? `<p><b>Premi:</b> ${r.awards.map(a=>`<span class="pill cyan">${a}</span>`).join(" ")}</p>` : ""}
    ${summary.tournament && summary.tournament.participated ? `<p>${summary.tournament.won ? "🏆 Hai vinto " : "Eliminato da "} <b>${summary.tournament.trophyName}</b> con la nazionale.</p>` : ""}
    <div class="btn-row"><button class="btn-sm primary" data-action="season-summary-close">Continua</button></div>
  `);
  document.querySelector('[data-action="season-summary-close"]').onclick = onDone;
}

function showTransferModal(career, onDone){
  const offers = career.transferOffers;
  const contractEnding = career.contract.yearsLeft <= 0;
  openModal(`
    <h2>Sessione di mercato</h2>
    <div class="modal-sub">${contractEnding ? "Il tuo contratto è scaduto." : "Offerte ricevute in questa finestra di mercato."}</div>
    ${offers.length===0 ? `<p style="color:var(--c-text-dim);">Nessuna offerta questa sessione.</p>` :
      offers.map((o,i)=>`
        <div class="list-row">
          <div><div class="main">${o.clubName}</div><div class="sub">${o.years} anni · €${o.salary}k/sett. · cartellino €${o.fee}M</div></div>
          <button class="btn-sm primary" data-action="accept-offer" data-idx="${i}">Accetta</button>
        </div>
      `).join("")
    }
    <div class="btn-row">
      <button class="btn-sm" data-action="renew-contract">Rinnova con il club attuale</button>
      ${!contractEnding ? `<button class="btn-sm" data-action="stay-put">Resta così</button>` : ""}
    </div>
  `);
  document.querySelectorAll('[data-action="accept-offer"]').forEach(btn=>{
    btn.onclick = ()=>{ acceptTransfer(career, parseInt(btn.dataset.idx,10)); onDone(); };
  });
  document.querySelector('[data-action="renew-contract"]').onclick = ()=>{ renewContract(career); onDone(); };
  const stayBtn = document.querySelector('[data-action="stay-put"]');
  if(stayBtn) stayBtn.onclick = ()=>{ stayWithoutRenewing(career); onDone(); };
}

// ---------------- RETIREMENT ----------------
function renderRetirementScreen(career){
  const r = career.retiredSummary;
  document.getElementById("retire-content").innerHTML = `
    <div class="retire-title">Fine di una carriera</div>
    <div class="retire-category">${r.tier}</div>
    <div class="retire-score">${r.fullName} · ${r.nationality} · ${POSITION_LABELS[r.position]}</div>
    <div class="retire-stats">
      <div class="rs"><div class="n">${r.seasonsPlayed}</div><div class="l">Stagioni</div></div>
      <div class="rs"><div class="n">${r.totalApps}</div><div class="l">Presenze</div></div>
      <div class="rs"><div class="n">${r.totalGoals}</div><div class="l">Gol</div></div>
      <div class="rs"><div class="n">${r.totalAssists}</div><div class="l">Assist</div></div>
      <div class="rs"><div class="n">${r.totalTrophies}</div><div class="l">Trofei</div></div>
      <div class="rs"><div class="n">${r.totalAwards}</div><div class="l">Premi</div></div>
      <div class="rs"><div class="n">${r.peakOverall}</div><div class="l">Overall max</div></div>
      <div class="rs"><div class="n">${r.nationalCaps}</div><div class="l">Cap nazionale</div></div>
      <div class="rs"><div class="n">${r.tournamentsWon}</div><div class="l">Tornei vinti</div></div>
    </div>
    ${r.isCaptain ? `<p class="pill gold">🎖 Capitano della Nazionale</p>` : ""}
    <div class="btn-row">
      <button class="menu-btn-primary form-submit" data-action="back-to-menu-final" style="margin-top:20px; padding:14px 28px;">Torna al menu</button>
    </div>
  `;
  showScreen("screen-retire");
}
