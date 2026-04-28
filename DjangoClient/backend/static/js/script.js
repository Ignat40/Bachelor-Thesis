const PATIENTS = [
  { id: 1, name: "Goshko", age: 7, emoji: "", color: "#E8F2FF", status: "active", condition: "Articulation Disorder", sessions: 24, streak: 5, progress: 78, exercises: ["S-Sound Articulation", "Syllable Rhythm Clapping"], scores: [65, 70, 72, 75, 77, 78] },
  { id: 2, name: "Pehsko", age: 9, emoji: "", color: "#FFF3A3", status: "pending", condition: "Phonological Disorder", sessions: 12, streak: 2, progress: 45, exercises: ["R-Sound Blending", "Breath Support Training"], scores: [30, 35, 38, 40, 43, 45] },
  { id: 3, name: "Zdrawko", age: 6, emoji: "", color: "#FFE8E6", status: "attention", condition: "Stuttering", sessions: 31, streak: 0, progress: 55, exercises: ["Breath Support Training", "Minimal Pairs"], scores: [40, 45, 48, 50, 53, 55] },
  { id: 4, name: "Ramadancho", age: 8, emoji: "", color: "#E8F2FF", status: "active", condition: "Articulation Disorder", sessions: 18, streak: 7, progress: 83, exercises: ["Tongue Placement Drill", "S-Sound Articulation"], scores: [55, 62, 68, 72, 78, 83] },
  { id: 5, name: "Mariyka", age: 10, emoji: "", color: "#FFF3A3", status: "active", condition: "Voice Disorder", sessions: 9, streak: 3, progress: 62, exercises: ["Breath Support Training"], scores: [45, 50, 52, 55, 58, 62] },
  { id: 6, name: "Emilia", age: 5, emoji: "", color: "#FFE8E6", status: "pending", condition: "Late Talker", sessions: 5, streak: 1, progress: 30, exercises: ["Syllable Rhythm Clapping", "Minimal Pairs"], scores: [20, 22, 25, 26, 28, 30] },
  { id: 7, name: "Lorenzo", age: 7, emoji: "", color: "#E8F2FF", status: "active", condition: "Articulation Disorder", sessions: 20, streak: 4, progress: 70, exercises: ["S-Sound Articulation", "R-Sound Blending"], scores: [50, 55, 60, 63, 67, 70] },
  { id: 8, name: "Fiki", age: 11, emoji: "", color: "#FFF3A3", status: "active", condition: "Phonological Disorder", sessions: 40, streak: 10, progress: 91, exercises: ["Tongue Placement Drill"], scores: [70, 75, 80, 84, 88, 91] },
];

const EXERCISES = [
  { icon: "", name: "S-Sound Articulation", cat: "Articulation", diff: "Beginner", col: "blue", uses: 6, reps: 10 },
  { icon: "", name: "R-Sound Blending", cat: "Phonology", diff: "Intermediate", col: "yellow", uses: 3, reps: 8 },
  { icon: "", name: "Syllable Rhythm Clapping", cat: "Fluency", diff: "Beginner", col: "blue", uses: 4, reps: 15 },
  { icon: "", name: "Breath Support Training", cat: "Fluency", diff: "Beginner", col: "red", uses: 4, reps: 5 },
  { icon: "", name: "Tongue Placement Drill", cat: "Articulation", diff: "Advanced", col: "yellow", uses: 2, reps: 12 },
  { icon: "", name: "Minimal Pairs Practice", cat: "Phonology", diff: "Intermediate", col: "blue", uses: 3, reps: 10 },
  { icon: "", name: "Sentence Repetition", cat: "Language", diff: "Intermediate", col: "red", uses: 1, reps: 8 },
  { icon: "", name: "Word Final Sounds", cat: "Articulation", diff: "Advanced", col: "yellow", uses: 2, reps: 10 },
];

function statusText(status) {
  return status === "active" ? "Active" : status === "pending" ? "Pending" : "Attention";
}

function progressClass(progress) {
  if (progress > 70) return "pf-blue";
  if (progress > 45) return "pf-yellow";
  return "pf-red";
}

function renderDash(view = "overview") {
  const container = document.getElementById("dash-main");
  if (!container) return;

  if (view === "overview") container.innerHTML = overviewHTML();
  if (view === "patients") container.innerHTML = patientsHTML();
  if (view === "exercises") container.innerHTML = exercisesHTML();
  if (view === "progress") container.innerHTML = progressHTML();
  if (view === "alerts") container.innerHTML = alertsHTML();
  if (view === "assign") {
    container.innerHTML = overviewHTML();
    openModal();
  }
  animateBars();
}

function overviewHTML() {
  const therapist = document.getElementById("dash-main")?.dataset.therapist || "Therapist";
  return `
    <div class="dash-header">
      <div><h2>Good morning, ${therapist} </h2><div class="welcome">Thursday, 23 April 2026 — Here's how your patients are doing</div></div>
      <button class="dash-btn" type="button" data-open-modal>+ Assign Exercise</button>
    </div>
    <div class="stats-row">
      <div class="stat-card s-blue"><div class="stat-label">Total Patients</div><div class="stat-value">${PATIENTS.length}</div><div class="stat-delta up">▲ 2 this month</div></div>
      <div class="stat-card s-yellow"><div class="stat-label">Active This Week</div><div class="stat-value">6</div><div class="stat-delta up">▲ Good engagement</div></div>
      <div class="stat-card s-green"><div class="stat-label">Avg Progress</div><div class="stat-value">64%</div><div class="stat-delta up">▲ +5% vs last week</div></div>
      <div class="stat-card s-red"><div class="stat-label">Need Attention</div><div class="stat-value">2</div><div class="stat-delta down">▼ Check alerts</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Patients</div><button class="card-action button-link" type="button" data-view-link="patients">View all →</button></div>
        <div class="card-body">${patientsTable(PATIENTS.slice(0, 5), false)}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Activity</div></div>
        <div class="card-body">
          ${activityItem("#22C55E", "Fiki completed <strong>Tongue Placement Drill</strong> — 10/10 reps ", "10 minutes ago")}
          ${activityItem("var(--blue)", "Ramadancho started a new session", "35 minutes ago")}
          ${activityItem("var(--yellow-dark)", "Goshko completed <strong>S-Sound Articulation</strong> — 8/10 reps", "2 hours ago")}
          ${activityItem("var(--red)", "Zdrawko missed 3 sessions this week", "Today")}
          ${activityItem("#22C55E", "Mariyka hit a new milestone: 60% accuracy ", "Yesterday")}
        </div>
      </div>
    </div>
    <div class="grid-equal">
      <div class="card">
        <div class="card-header"><div class="card-title">Patient Progress Overview</div></div>
        <div class="card-body">${PATIENTS.map(progressItem).join("")}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Weekly Sessions</div></div>
        <div class="card-body">
          <div class="mini-chart">
            ${[["Mon", 12], ["Tue", 18], ["Wed", 9], ["Thu", 22], ["Fri", 15], ["Sat", 6], ["Sun", 3]].map(([day, value]) => `
              <div class="bar-wrap"><div class="bar" style="height:${Math.round((value / 22) * 64)}px" title="${value} sessions"></div><div class="bar-label">${day}</div></div>
            `).join("")}
          </div>
          <p style="font-size:13px;color:var(--text-light);margin-top:16px;text-align:center">85 total sessions this week — <strong style="color:#16A34A">+12% vs last week</strong></p>
        </div>
      </div>
    </div>`;
}

function patientsHTML() {
  return `
    <div class="dash-header">
      <div><h2>My Patients</h2><div class="welcome">${PATIENTS.length} patients under your care</div></div>
      <button class="dash-btn" type="button" data-open-modal>+ Assign Exercise</button>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">All Patients</div><input type="text" placeholder="Search patients..." style="width:220px;padding:7px 12px;font-size:13px" data-patient-filter></div>
      <div class="card-body">${patientsTable(PATIENTS, true)}</div>
    </div>`;
}

function patientsTable(patients, showActions) {
  return `
    <table>
      <thead><tr><th>Patient</th><th>${showActions ? "Condition" : "Status"}</th><th>${showActions ? "Status" : "Progress"}</th><th>${showActions ? "Sessions" : "Streak"}</th>${showActions ? "<th>Progress</th><th>Streak</th><th>Action</th>" : ""}</tr></thead>
      <tbody id="patients-tbody">
        ${patients.map((p) => `
          <tr class="patient-row-tr" data-patient-id="${p.id}">
            <td><div class="patient-row"><div class="patient-avatar" style="background:${p.color}">${p.emoji}</div><div><div class="patient-name">${p.name}</div><div class="patient-age">Age ${p.age}${showActions ? "" : ` · ${p.condition}`}</div></div></div></td>
            ${showActions ? `<td style="font-size:13px;color:var(--text-mid)">${p.condition}</td>` : `<td><span class="badge ${p.status}">${statusText(p.status)}</span></td>`}
            ${showActions ? `<td><span class="badge ${p.status}">${statusText(p.status)}</span></td><td style="font-size:14px;font-weight:600">${p.sessions}</td>` : progressCell(p)}
            ${showActions ? `${progressCell(p)}<td style="font-size:14px;font-weight:700">${p.streak} 🔥</td><td><button class="dash-btn" type="button" style="font-size:12px;padding:6px 14px" data-open-modal>Assign</button></td>` : `<td><span style="font-size:13px;font-weight:700">${p.streak} 🔥</span></td>`}
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function progressCell(patient) {
  return `<td><div style="display:flex;align-items:center;gap:8px"><div class="progress-track" style="width:80px;display:inline-block"><div class="progress-fill ${progressClass(patient.progress)} bar-anim" data-pct="${patient.progress}" style="width:0"></div></div><span style="font-size:12px;font-weight:700;color:var(--blue)">${patient.progress}%</span></div></td>`;
}

function progressItem(patient) {
  return `
    <div class="progress-item">
      <div class="progress-info"><span class="progress-name">${patient.name}</span><span class="progress-pct">${patient.progress}%</span></div>
      <div class="progress-track"><div class="progress-fill ${progressClass(patient.progress)} bar-anim" data-pct="${patient.progress}" style="width:0"></div></div>
    </div>`;
}

function activityItem(color, text, time) {
  return `<div class="activity-item"><div class="activity-dot" style="background:${color}"></div><div><div class="activity-text">${text}</div><div class="activity-time">${time}</div></div></div>`;
}

function exercisesHTML() {
  return `
    <div class="dash-header">
      <div><h2>Exercise Library</h2><div class="welcome">${EXERCISES.length} exercises available</div></div>
      <button class="dash-btn yellow" type="button">+ New Exercise</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${EXERCISES.map((exercise) => `
        <div class="card exercise-card">
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div class="ex-icon ${exercise.col}" style="font-size:28px;width:52px;height:52px">${exercise.icon}</div>
              <div><div style="font-weight:700;font-size:15px">${exercise.name}</div><div style="font-size:12px;color:var(--text-light)">${exercise.cat}</div></div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="badge ${exercise.diff === "Beginner" ? "active" : exercise.diff === "Intermediate" ? "pending" : "attention"}" style="font-size:11px">${exercise.diff}</span>
              <span style="font-size:12px;color:var(--text-light)">${exercise.uses} patients using</span>
              <button class="dash-btn" type="button" style="margin-left:auto;font-size:12px;padding:5px 12px" data-open-modal>Assign</button>
            </div>
          </div>
        </div>`).join("")}
    </div>`;
}

function progressHTML() {
  return `
    <div class="dash-header">
      <div><h2>Progress Reports</h2><div class="welcome">Week of April 16 – 23, 2026</div></div>
      <button class="dash-btn yellow" type="button">Export PDF</button>
    </div>
    <div class="stats-row">
      <div class="stat-card s-blue"><div class="stat-label">Avg Accuracy</div><div class="stat-value">71%</div><div class="stat-delta up">▲ +4% vs last week</div></div>
      <div class="stat-card s-yellow"><div class="stat-label">Exercises Done</div><div class="stat-value">247</div><div class="stat-delta up">▲ +28 this week</div></div>
      <div class="stat-card s-green"><div class="stat-label">Milestones Hit</div><div class="stat-value">5</div></div>
      <div class="stat-card s-red"><div class="stat-label">Missed Sessions</div><div class="stat-value">7</div><div class="stat-delta down">▼ Needs follow-up</div></div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Individual Progress — Last 6 Sessions</div></div>
      <div class="card-body">${PATIENTS.map(patientChart).join("")}</div>
    </div>`;
}

function patientChart(patient) {
  return `
    <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="patient-avatar" style="background:${patient.color};width:36px;height:36px">${patient.emoji}</div>
        <div><div style="font-weight:700;font-size:14px">${patient.name}</div><div style="font-size:12px;color:var(--text-light)">${patient.condition}</div></div>
        <span class="badge ${patient.status}" style="margin-left:auto">${patient.progress}% overall</span>
      </div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:60px">
        ${patient.scores.map((score, index) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:100%;background:${index === patient.scores.length - 1 ? "var(--blue)" : "var(--blue-light)"};opacity:${0.4 + index * 0.12};border-radius:3px 3px 0 0;height:${Math.round((score / 100) * 52)}px"></div><div style="font-size:10px;color:var(--text-light)">S${index + 1}</div></div>`).join("")}
      </div>
    </div>`;
}

function alertsHTML() {
  document.getElementById("alert-badge").textContent = "0";
  const alerts = [
    ["attention", "", "Zdrawko missed 3 consecutive sessions", "Last active: April 20. Consider reaching out to the family.", "Today"],
    ["pending", "", "Pehsko accuracy dropped to 40%", "Down from 48% last week. May need a review session.", "Yesterday"],
    ["pending", "", "Emilia has not started today's exercises", "Daily reminder was sent at 09:00 but no activity yet.", "3 hours ago"],
    ["active", "", "Fiki hit 90% accuracy milestone!", "Outstanding progress — consider advancing to the next level.", "This morning"],
    ["active", "", "Ramadancho completed a 7-day streak", "Reward badge automatically sent to the app.", "Yesterday"],
  ];
  return `
    <div class="dash-header"><div><h2>Alerts & Notifications</h2><div class="welcome">${alerts.length} notifications</div></div><button class="dash-btn" type="button" data-clear-alerts>Mark all read</button></div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${alerts.map(([type, icon, title, detail, time]) => `
        <div class="alert-card">
          <div style="font-size:28px">${icon}</div>
          <div style="flex:1"><div style="font-weight:700;font-size:15px;margin-bottom:4px">${title}</div><div style="font-size:13px;color:var(--text-mid);margin-bottom:8px">${detail}</div><div style="font-size:12px;color:var(--text-light)">${time}</div></div>
          <span class="badge ${type}">${type === "attention" ? "danger" : type === "pending" ? "warning" : "info"}</span>
        </div>`).join("")}
    </div>`;
}

function renderModalOptions() {
  const patientSelect = document.getElementById("modal-patient");
  const exerciseList = document.getElementById("modal-exercises");
  if (!patientSelect || !exerciseList) return;
  patientSelect.innerHTML = `<option value="">Choose a patient...</option>${PATIENTS.map((patient) => `<option>${patient.name} — Age ${patient.age}</option>`).join("")}`;
  exerciseList.innerHTML = EXERCISES.slice(0, 6).map((exercise, index) => `
    <div class="ex-checkbox-item">
      <input type="checkbox" id="ex${index}" ${index === 0 || index === 2 ? "checked" : ""}>
      <label for="ex${index}" class="ex-checkbox-label">${exercise.icon} ${exercise.name}</label>
      <div class="ex-reps-input"><input type="number" value="${exercise.reps}" min="1" max="50"><span class="reps-label">reps</span></div>
    </div>`).join("");
}

function openModal() {
  renderModalOptions();
  document.getElementById("assign-modal")?.classList.add("open");
}

function closeModal() {
  document.getElementById("assign-modal")?.classList.remove("open");
}

function openPatient(id) {
  const patient = PATIENTS.find((item) => item.id === id);
  const panel = document.getElementById("panel-content");
  if (!patient || !panel) return;
  panel.innerHTML = `
    <button class="panel-close" type="button" data-close-panel>✕</button>
    <div class="panel-avatar" style="background:${patient.color}">${patient.emoji}</div>
    <div class="panel-name">${patient.name}</div>
    <div class="panel-info">Age ${patient.age} · ${patient.condition}</div>
    <span class="badge ${patient.status}" style="display:block;text-align:center;width:fit-content;margin:0 auto 20px">${statusText(patient.status)}</span>
    <div class="info-row">
      <div class="info-chip"><div class="info-chip-val">${patient.sessions}</div><div class="info-chip-label">Sessions</div></div>
      <div class="info-chip"><div class="info-chip-val">${patient.progress}%</div><div class="info-chip-label">Progress</div></div>
      <div class="info-chip"><div class="info-chip-val">${patient.streak}🔥</div><div class="info-chip-label">Streak</div></div>
    </div>
    <div class="panel-section-title">Current Exercises</div>
    ${patient.exercises.map((exercise) => `<div class="ex-row"><div class="ex-icon blue">🎯</div><div class="ex-info"><div class="ex-name">${exercise}</div><div class="ex-detail">Active assignment</div></div></div>`).join("")}
    <div class="panel-section-title">Progress History</div>
    <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:16px">
      ${patient.scores.map((score, index) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:100%;background:var(--blue);opacity:${0.4 + index * 0.1};border-radius:3px 3px 0 0;height:${Math.round((score / 100) * 64)}px"></div><div style="font-size:10px;color:var(--text-light)">S${index + 1}</div></div>`).join("")}
    </div>
    <div class="panel-section-title">Therapist Notes</div>
    <textarea class="note-area" placeholder="Add notes about this patient...">${patient.status === "attention" ? "Missed multiple sessions. Family should be contacted. Consider adjusting exercise difficulty." : ""}</textarea>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="dash-btn" type="button" style="flex:1" data-open-modal>+ Assign Exercise</button>
      <button class="dash-btn yellow" type="button" style="flex:1">📋 View Report</button>
    </div>`;
  document.getElementById("patient-panel")?.classList.add("open");
}

function closePanel() {
  document.getElementById("patient-panel")?.classList.remove("open");
}

function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast${type ? ` ${type}` : ""}`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function animateBars() {
  setTimeout(() => {
    document.querySelectorAll(".bar-anim").forEach((bar) => {
      bar.style.width = `${bar.dataset.pct}%`;
    });
  }, 50);
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.remove("active"));
    viewButton.classList.add("active");
    renderDash(viewButton.dataset.view);
  }

  const viewLink = event.target.closest("[data-view-link]");
  if (viewLink) {
    const sidebarItem = document.querySelector(`[data-view="${viewLink.dataset.viewLink}"]`);
    sidebarItem?.click();
  }

  if (event.target.closest("[data-open-modal]")) {
    event.stopPropagation();
    openModal();
  }

  if (event.target.closest("[data-close-modal]")) closeModal();
  if (event.target.closest("[data-close-panel]")) closePanel();
  if (event.target.closest("[data-clear-alerts]")) document.getElementById("alert-badge").textContent = "0";

  const patientRow = event.target.closest("[data-patient-id]");
  if (patientRow && !event.target.closest("button")) openPatient(Number(patientRow.dataset.patientId));

  if (event.target.id === "submit-assignment") {
    const patient = document.getElementById("modal-patient").value;
    if (!patient) {
      showToast("Please select a patient first.");
      return;
    }
    closeModal();
    showToast(`Exercises assigned to ${patient} ✓`, "success");
  }

  if (event.target.id === "assign-modal") closeModal();
  if (event.target.id === "patient-panel") closePanel();
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-patient-filter]")) return;
  const query = event.target.value.toLowerCase();
  document.querySelectorAll(".patient-row-tr").forEach((row) => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("[data-dashboard-page]")) renderDash("overview");
});
