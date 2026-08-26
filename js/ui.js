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

// ==================================================================
// CHARACTER CREATION WIZARD
// ==================================================================
const WIZARD = { step:1, formValues:null, pendingPlayer:null, selectedAppearance:null };

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

  const apGrid = document.getElementById("appearance-grid");
  apGrid.innerHTML = APPEARANCE_PRESETS.map((a,i)=>`
    <div class="appearance-card ${i===0?'selected':''}" data-appearance="${a.id}">
      <div class="appearance-swatch" style="background:linear-gradient(135deg, ${a.primary}, ${a.secondary});"></div>
      <div class="appearance-label">${a.label}</div>
    </div>
  `).join("");
  WIZARD.selectedAppearance = APPEARANCE_PRESETS[0].id;
  apGrid.querySelectorAll(".appearance-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      apGrid.querySelectorAll(".appearance-card").forEach(c=>c.classList.remove("selected"));
      card.classList.add("selected");
      WIZARD.selectedAppearance = card.dataset.appearance;
    });
  });

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

function resetWizard(){
  WIZARD.step = 1; WIZARD.formValues = null; WIZARD.pendingPlayer = null;
  document.getElementById("create-form").reset();
  goToWizardStep(1);
}

function goToWizardStep(n){
  WIZARD.step = n;
  document.querySelectorAll(".wizard-step").forEach(el=>{
    el.classList.toggle("active", parseInt(el.dataset.step,10)===n);
  });
  document.querySelectorAll(".wizard-dot").forEach(el=>{
    const s = parseInt(el.dataset.step,10);
    el.classList.toggle("active", s===n);
    el.classList.toggle("done", s<n);
  });
}

function collectFormValues(){
  const form = document.getElementById("create-form");
  const data = new FormData(form);
  const values = Object.fromEntries(data.entries());
  if(!values.shirtName || !values.shirtName.trim()) values.shirtName = values.lastName;
  values.appearance = WIZARD.selectedAppearance;
  return values;
}

function renderCreationSummary(){
  const form = WIZARD.formValues;
  const p = WIZARD.pendingPlayer;
  const preset = APPEARANCE_PRESETS.find(a=>a.id===p.appearance);
  const club = clubById(form.club);
  document.getElementById("summary-content").innerHTML = `
    <div class="summary-card">
      <div class="summary-jersey" style="background:linear-gradient(135deg, ${preset.primary}, ${preset.secondary});">${p.shirtNumber}</div>
      <div>
        <div class="summary-name">${p.firstName} ${p.lastName}</div>
        <div class="summary-sub">"${p.shirtName}" · ${POSITION_LABELS[p.position]} · ${p.nationality}</div>
        <div class="summary-sub">${club.name} (${club.league})</div>
      </div>
    </div>
    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-mini"><div class="lbl">Overall</div><div class="val">${p.overall}</div></div>
      <div class="stat-mini"><div class="lbl">Potenziale</div><div class="val">${p.potential}</div></div>
      <div class="stat-mini"><div class="lbl">Età</div><div class="val">${p.age}</div></div>
      <div class="stat-mini"><div class="lbl">Altezza</div><div class="val">${p.height}cm</div></div>
      <div class="stat-mini"><div class="lbl">Piede</div><div class="val">${p.foot}</div></div>
      <div class="stat-mini"><div class="lbl">Stile</div><div class="val" style="font-size:14px;">${p.style}</div></div>
    </div>
    ${renderFullStatGrid(p)}
  `;
}

// ==================================================================
// HUB
// ==================================================================
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
  const badge = document.getElementById("notif-badge");
  const unread = unreadNotificationCount(career);
  badge.textContent = unread>0 ? unread : "";

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

  const renderers = {
    overview: renderOverviewTab, squad: renderProfileTab, stats: renderStatsTab,
    calendar: renderCalendarTab, standings: renderStandingsTab, objectives: renderObjectivesTab,
    training: renderTrainingTab, national: renderNationalTab, market: renderMarketTab,
    notifications: renderNotificationsTab, settings: renderHubSettingsTab,
  };
  body.innerHTML = (renderers[tab] || renderOverviewTab)(career);

  if(tab==="training"){
    body.querySelectorAll(".focus-item").forEach(el=>{
      el.addEventListener("click", ()=>{
        career.trainingFocus = el.dataset.focus;
        saveCareer();
        renderHubTab("training");
      });
    });
  }
  if(tab==="calendar"){
    body.querySelectorAll(".fixture-row[data-md]").forEach(el=>{
      el.addEventListener("click", ()=> showFixtureModal(career, parseInt(el.dataset.md,10)));
    });
  }
  if(tab==="notifications"){
    markAllNotificationsRead(career);
    saveCareer();
    document.getElementById("notif-badge").textContent = "";
  }
  if(tab==="settings"){
    const wipeBtn = body.querySelector('[data-action="hub-wipe-data"]');
    if(wipeBtn) wipeBtn.onclick = ()=>{
      localStorage.removeItem(STORAGE_KEYS.saves);
      localStorage.removeItem(STORAGE_KEYS.leaderboard);
      IFL.career = null; IFL.activeSlot = null;
      showScreen("screen-menu");
    };
  }
}

// ---------------- HOME ----------------
function renderOverviewTab(career){
  const p = career.player;
  const club = currentClub(career);
  const s = career.seasonStats;
  const avgRating = s.ratedApps>0 ? (s.ratingSum/s.ratedApps).toFixed(2) : "—";
  const nextFixture = career.fixtures ? career.fixtures[career.matchdayIndex] : null;
  const unreadNotifs = (career.notifications||[]).filter(n=>!n.read).slice(0,3);

  return `
    ${nextFixture ? `
    <div class="card next-match-card">
      <h3>Prossima partita</h3>
      <div class="next-match-row">
        <div>
          <div class="next-match-vs">${club.name} ${nextFixture.home ? "🏠" : "✈️"} ${nextFixture.opponent}</div>
          <div class="next-match-meta">
            <span class="pill gold">${nextFixture.competition}</span>
            <span class="pill cyan">Giornata ${nextFixture.matchday}</span>
            <span class="pill">${nextFixture.home ? "Casa" : "Trasferta"}</span>
          </div>
        </div>
      </div>
    </div>` : ""}

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

    ${career.objectives && career.objectives.length ? `
    <div class="card">
      <h3>Obiettivi stagionali</h3>
      ${career.objectives.slice(0,3).map(o=>renderObjectiveCard(o)).join("")}
    </div>` : ""}

    <div class="card">
      <h3>Notifiche recenti ${unreadNotifs.length ? `<span class="tab-badge">${unreadNotifs.length}</span>`:""}</h3>
      ${(career.notifications||[]).length ? career.notifications.slice(0,4).map(n=>renderNotifRow(n)).join("") : `<p style="color:var(--c-text-dim);">Nessuna notifica.</p>`}
    </div>
  `;
}

function renderMeter(label, value){
  return `<div class="stat-bar-row" style="margin-bottom:10px;">
    <div class="top"><span>${label}</span><span class="v">${Math.round(value)}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${clamp(value,0,100)}%"></div></div>
  </div>`;
}

// ---------------- TRAINING ----------------
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

// ---------------- PROFILE ----------------
function renderProfileTab(career){
  const p = career.player;
  const club = currentClub(career);
  const preset = APPEARANCE_PRESETS.find(a=>a.id===p.appearance) || APPEARANCE_PRESETS[0];
  return `
    <div class="card">
      <div class="summary-card" style="margin-bottom:0;">
        <div class="summary-jersey" style="background:linear-gradient(135deg, ${preset.primary}, ${preset.secondary});">${p.shirtNumber}</div>
        <div>
          <div class="summary-name">${p.firstName} ${p.lastName}</div>
          <div class="summary-sub">"${p.shirtName}" · ${POSITION_LABELS[p.position]} · ${club.name}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>Profilo</h3>
      <div class="list-row"><div class="main">Età</div><div class="sub">${p.age} anni</div></div>
      <div class="list-row"><div class="main">Nazionalità</div><div class="sub">${p.nationality}</div></div>
      <div class="list-row"><div class="main">Altezza / Piede</div><div class="sub">${p.height}cm · ${p.foot}</div></div>
      <div class="list-row"><div class="main">Stile</div><div class="sub">${p.style}</div></div>
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

// ---------------- STATISTICHE (progression + timeline) ----------------
function renderStatsTab(career){
  const s = career.seasonStats;
  const avgRating = s.ratedApps>0 ? (s.ratingSum/s.ratedApps).toFixed(2) : "—";
  const chartData = career.history.slice(-8);

  return `
    <div class="card">
      <h3>Stagione in corso</h3>
      <div class="stat-grid">
        <div class="stat-mini"><div class="lbl">Presenze</div><div class="val">${s.apps}</div></div>
        <div class="stat-mini"><div class="lbl">Gol</div><div class="val">${s.goals}</div></div>
        <div class="stat-mini"><div class="lbl">Assist</div><div class="val">${s.assists}</div></div>
        <div class="stat-mini"><div class="lbl">Media voto</div><div class="val">${avgRating}</div></div>
      </div>
    </div>

    ${chartData.length ? `
    <div class="card">
      <h3>Progressione Overall</h3>
      <div class="chart-bars">
        ${chartData.map(h=>`
          <div class="chart-bar-col">
            <div class="chart-bar" style="height:${clamp(h.overall,10,99)}%"></div>
            <div class="chart-bar-label">${h.overall}</div>
          </div>
        `).join("")}
      </div>
      <div class="chart-bars" style="height:auto; margin-top:2px;">
        ${chartData.map(h=>`<div class="chart-bar-col"><div class="chart-bar-label">${String(h.season).slice(2)}</div></div>`).join("")}
      </div>
    </div>` : ""}

    <div class="card"><h3>Timeline carriera</h3>
      ${!career.history.length ? `<p style="color:var(--c-text-dim);">La prima stagione è ancora in corso. Torna qui a fine anno.</p>` : `
      <div class="timeline">
        ${career.history.slice().reverse().map(h=>`
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-season">${h.season}</div>
            <div style="flex:1;">
              <div class="main">${h.club} — OVR ${h.overall}</div>
              <div class="sub">${h.apps} presenze · ${h.goals} gol · ${h.assists} assist · media ${h.avgRating} · ${h.finish}°/${h.leagueSize||17}</div>
              ${h.trophies.length ? `<div style="margin-top:4px;">${h.trophies.map(t=>`<span class="pill gold">${t}</span> `).join("")}</div>` : ""}
              ${h.awards.length ? `<div style="margin-top:4px;">${h.awards.map(a=>`<span class="pill cyan">${a}</span> `).join("")}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>`}
    </div>
  `;
}

// ---------------- CALENDARIO ----------------
function renderCalendarTab(career){
  const fixtures = career.fixtures || [];
  const nextIdx = career.matchdayIndex;
  return `
    <div class="card">
      <h3>Calendario stagione ${career.season}</h3>
      ${fixtures.map((f,i)=>{
        let resClass="", resText="—";
        if(f.played && f.result){
          resText = `${f.result.gf}-${f.result.ga}`;
          resClass = f.result.outcome==="V"?"win":(f.result.outcome==="P"?"draw":"loss");
        }
        const isNext = i===nextIdx;
        return `<div class="fixture-row ${isNext?'next':''}" data-md="${i}">
          <div class="fixture-md">G${f.matchday}</div>
          <div class="fixture-info">
            <div class="fixture-opponent">${f.home?'vs':'@'} ${f.opponent}</div>
            <div class="fixture-comp">${f.competition}</div>
          </div>
          ${isNext ? `<span class="pill gold">Prossima</span>` : `<div class="fixture-result ${resClass}">${resText}</div>`}
        </div>`;
      }).join("")}
    </div>
  `;
}

function showFixtureModal(career, idx){
  const f = career.fixtures[idx];
  const club = currentClub(career);
  if(!f) return;
  openModal(`
    <h2>${club.name} ${f.home?'—':'@'} ${f.opponent}</h2>
    <div class="modal-sub">${f.competition} · Giornata ${f.matchday} · ${f.home ? "Casa":"Trasferta"}</div>
    ${!f.played ? `<p style="color:var(--c-text-dim);">Partita non ancora disputata.</p>` : `
      <div class="stat-grid" style="margin-bottom:10px;">
        <div class="stat-mini"><div class="lbl">Risultato</div><div class="val">${f.result.gf}-${f.result.ga}</div></div>
        <div class="stat-mini"><div class="lbl">Minuti giocati</div><div class="val">${f.playerMinutes||0}</div></div>
        <div class="stat-mini"><div class="lbl">Gol</div><div class="val">${f.playerGoals}</div></div>
        <div class="stat-mini"><div class="lbl">Assist</div><div class="val">${f.playerAssists}</div></div>
        <div class="stat-mini"><div class="lbl">Voto</div><div class="val">${f.playerRating ?? "—"}</div></div>
      </div>
    `}
    <div class="btn-row"><button class="btn-sm primary" data-action="close-modal">Chiudi</button></div>
  `);
}

// ---------------- CLASSIFICA ----------------
function renderStandingsTab(career){
  if(!career.leagueTable){
    return `<div class="card"><p style="color:var(--c-text-dim);">Classifica non disponibile.</p></div>`;
  }
  const rows = sortedTable(career);
  const club = currentClub(career);
  return `
    <div class="card">
      <h3>${club.league}</h3>
      <table class="standings-table">
        <thead><tr><th>#</th><th>Squadra</th><th>PG</th><th>V</th><th>N</th><th>P</th><th>DR</th><th>Pt</th></tr></thead>
        <tbody>
          ${rows.map((r,i)=>`
            <tr class="${r.clubId===career.clubId?'me':''}">
              <td class="num">${i+1}</td>
              <td>${r.name}</td>
              <td class="num">${r.played}</td>
              <td class="num">${r.w}</td>
              <td class="num">${r.d}</td>
              <td class="num">${r.l}</td>
              <td class="num">${r.gf-r.ga>0?'+':''}${r.gf-r.ga}</td>
              <td class="pts">${r.points}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------- OBIETTIVI ----------------
function renderObjectiveCard(o){
  const pct = clamp(((o.currentProgress||0)/(typeof o.target==="number"?o.target:1))*100, 0, 100);
  return `<div class="objective-card ${o.done?'done':''}">
    <div class="objective-top">
      <span class="label">${o.done?'✅ ':''}${o.label}</span>
    </div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%; ${o.done?'background:var(--c-success);':''}"></div></div>
  </div>`;
}

function renderObjectivesTab(career){
  return `
    <div class="card">
      <h3>Obiettivi stagione ${career.season}</h3>
      ${(career.objectives||[]).length ? career.objectives.map(o=>renderObjectiveCard(o)).join("") : `<p style="color:var(--c-text-dim);">Nessun obiettivo attivo.</p>`}
    </div>
  `;
}

// ---------------- NAZIONALE ----------------
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

// ---------------- MERCATO ----------------
function renderMarketTab(career){
  const p = career.player;
  const club = currentClub(career);
  const history = career.marketValueHistory || [];
  const chartData = history.slice(-8);
  return `
    <div class="card">
      <h3>Contratto attuale</h3>
      <div class="list-row"><div class="main">Club</div><div class="sub">${club.name}</div></div>
      <div class="list-row"><div class="main">Stipendio</div><div class="sub">€${career.contract.salary}k/sett.</div></div>
      <div class="list-row"><div class="main">Durata residua</div><div class="sub">${career.contract.yearsLeft} anni</div></div>
      <div class="list-row"><div class="main">Valore di mercato</div><div class="sub">€${p.marketValue}M</div></div>
      <div class="list-row"><div class="main">Reputazione</div><div class="sub">${Math.round(p.reputation)}/100</div></div>
    </div>
    ${chartData.length ? `
    <div class="card">
      <h3>Andamento valore di mercato</h3>
      <div class="chart-bars">
        ${chartData.map(h=>{
          const maxV = Math.max(...chartData.map(x=>x.value), 1);
          return `<div class="chart-bar-col"><div class="chart-bar" style="height:${clamp((h.value/maxV)*100,6,100)}%"></div><div class="chart-bar-label">€${h.value}M</div></div>`;
        }).join("")}
      </div>
    </div>` : ""}
    <div class="card">
      <h3>Sessione di mercato</h3>
      ${career.pendingTransferWindow ? `<p>Hai una finestra di mercato aperta — premi "Gestisci mercato e prosegui" in fondo alla schermata per vedere le offerte.</p>` : `<p style="color:var(--c-text-dim);">Nessuna finestra di mercato attiva al momento. Le offerte arrivano a fine stagione.</p>`}
    </div>
  `;
}

// ---------------- NOTIFICHE ----------------
const NOTIF_ICONS = { info:"ℹ️", event:"⚡", injury:"🚑", national:"🌍", market:"💼", objective:"🎯", season:"🏆" };
function renderNotifRow(n){
  return `<div class="notif-row ${n.read?'read':''}">
    <div class="notif-icon">${NOTIF_ICONS[n.type]||"🔔"}</div>
    <div>
      <div class="notif-title">${n.title}</div>
      <div class="notif-text">${n.text}</div>
      <div class="notif-meta">Stagione ${n.season}</div>
    </div>
  </div>`;
}

function renderNotificationsTab(career){
  const notifs = career.notifications || [];
  return `
    <div class="card">
      <h3>Notifiche</h3>
      ${notifs.length ? notifs.map(n=>renderNotifRow(n)).join("") : `<p style="color:var(--c-text-dim);">Nessuna notifica.</p>`}
    </div>
  `;
}

// ---------------- IMPOSTAZIONI (hub) ----------------
function renderHubSettingsTab(career){
  return `
    <div class="card">
      <h3>Salvataggio</h3>
      <p style="color:var(--c-text-dim); font-size:13px;">La carriera viene salvata automaticamente a ogni azione.</p>
      <div class="list-row"><div class="main">Slot attivo</div><div class="sub">${IFL.activeSlot}</div></div>
    </div>
    <div class="card">
      <h3>Dati</h3>
      <p style="color:var(--c-text-dim); font-size:13px;">Cancella tutte le carriere salvate e la classifica locale.</p>
      <div class="btn-row">
        <button class="btn-sm danger" data-action="hub-wipe-data">Cancella tutti i salvataggi</button>
      </div>
    </div>
  `;
}

// ==================================================================
// LEADERBOARD / HOW TO / SETTINGS (main menu modals)
// ==================================================================
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
    <p>Crea il tuo calciatore scegliendo ruolo, stile, aspetto e club di partenza. Ogni volta che premi <b>"Gioca prossima partita"</b> simuli una giornata: le tue statistiche, forma e condizione determinano prestazioni, gol e assist.</p>
    <p>Nell'hub trovi calendario, classifica, obiettivi stagionali, mercato e notifiche: tutto è collegato alla tua carriera reale, non è decorativo.</p>
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

// ==================================================================
// SEASON END / TRANSFER MODALS
// ==================================================================
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
      <div class="stat-mini"><div class="lbl">Posizione</div><div class="val">${r.finish}°/${r.leagueSize||17}</div></div>
    </div>
    ${r.trophies.length ? `<p><b>Trofei vinti:</b> ${r.trophies.map(t=>`<span class="pill gold">${t}</span>`).join(" ")}</p>` : ""}
    ${r.awards.length ? `<p><b>Premi:</b> ${r.awards.map(a=>`<span class="pill cyan">${a}</span>`).join(" ")}</p>` : ""}
    ${summary.objectiveResults && summary.objectiveResults.length ? `<p><b>Obiettivi:</b><br>${summary.objectiveResults.map(o=>`${o.done?'✅':'❌'} ${o.label}`).join("<br>")}</p>` : ""}
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

// ==================================================================
// RETIREMENT
// ==================================================================
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
