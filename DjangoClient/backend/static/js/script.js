let PATIENTS = [];
let EXERCISES = [];
let DASHBOARD_STATS = {
  total_patients: 0,
  active_this_week: 0,
  avg_progress: 0,
  need_attention: 0, 
}
let ACTIVITIES = []
let WEEKLY_SESSIONS = [];
let ALERTS = [];

function greetingText() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function todayText() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

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
      <div><h2>${greetingText()}, ${therapist}</h2><div class="welcome">${todayText()} · Here's how your patients are doing</div></div>
      <button class="dash-btn" type="button" data-open-modal>+ Assign Exercise</button>
    </div>
      <div class="stats-row">
      <div class="stat-card s-blue"><div class="stat-label">Total Patients</div><div class="stat-value">${DASHBOARD_STATS.total_patients}</div><div class="stat-delta up">Tracked patients</div></div>
      <div class="stat-card s-yellow"><div class="stat-label">Active This Week</div><div class="stat-value">${DASHBOARD_STATS.active_this_week}</div><div class="stat-delta up">With logged sessions</div></div>
      <div class="stat-card s-green"><div class="stat-label">Avg Progress</div><div class="stat-value">${DASHBOARD_STATS.avg_progress}%</div><div class="stat-delta up">Across active patients</div></div>
      <div class="stat-card s-red"><div class="stat-label">Need Attention</div><div class="stat-value">${DASHBOARD_STATS.need_attention}</div><div class="stat-delta down">Below 50% accuracy</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Patients</div><button class="card-action button-link" type="button" data-view-link="patients">View all →</button></div>
        <div class="card-body">${patientsTable(PATIENTS.slice(0, 5), false)}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Activity</div></div>
        <div class="card-body">
          ${activityHTML()}
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
            ${weeklySessionsHTML()}
          </div>
          <p style="font-size:13px;color:var(--text-light);margin-top:16px;text-align:center">${weeklySessionsTotal()} total sessions this week</p>
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
            ${showActions ? `${progressCell(p)}<td style="font-size:14px;font-weight:700">${p.streak}</td><td><button class="dash-btn" type="button" style="font-size:12px;padding:6px 14px" data-open-modal data-assign-child-id="${p.id}">Assign</button></td>` : `<td><span style="font-size:13px;font-weight:700">${p.streak}</span></td>`}
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

function activityHTML() {
  if (!ACTIVITIES.length) {
    return `<div class="activity-item"><div class="activity-dot" style="background:var(--text-light)"></div><div><div class="activity-text">No practice activity yet</div><div class="activity-time">Waiting for Unity sessions</div></div></div>`;
  }

  return ACTIVITIES.map((activity) => {
    const scoreColor = activity.score >= 70 ? "#22C55E" : activity.score >= 50 ? "var(--yellow-dark)" : "var(--red)";
    const text = `${activity.patient_name} completed <strong>${activity.exercise_title}</strong> — ${activity.score}% (${activity.correct_answers}/${activity.total_questions})`;
    return activityItem(scoreColor, text, activity.time);
  }).join("");
}

function weeklySessionsHTML() {
  const values = WEEKLY_SESSIONS.length
    ? WEEKLY_SESSIONS
    : [
        { day: "Mon", count: 0 },
        { day: "Tue", count: 0 },
        { day: "Wed", count: 0 },
        { day: "Thu", count: 0 },
        { day: "Fri", count: 0 },
        { day: "Sat", count: 0 },
        { day: "Sun", count: 0 },
      ];

  const maxCount = Math.max(...values.map((item) => item.count), 1);

  return values.map((item) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((item.count / maxCount) * 64), item.count > 0 ? 8 : 2)}px" title="${item.count} sessions">
        <span class="bar-value">${item.count}</span>
      </div>
      <div class="bar-label">${item.day}</div>
    </div>
  `).join("");

}

function weeklySessionsTotal() {
  return WEEKLY_SESSIONS.reduce((total, item) => total + item.count, 0);
}



function exercisesHTML() {
  const exerciseCards = EXERCISES.length
    ? EXERCISES.map((exercise) => `
        <div class="card exercise-card">
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div class="ex-icon ${exercise.col}" style="font-size:28px;width:52px;height:52px">${exercise.icon}</div>
              <div><div style="font-weight:700;font-size:15px">${exercise.name}</div><div style="font-size:12px;color:var(--text-light)">${exercise.cat}</div></div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="badge ${exercise.diff === "Beginner" ? "active" : exercise.diff === "Intermediate" ? "pending" : "attention"}" style="font-size:11px">${exercise.diff}</span>
              <span style="font-size:12px;color:var(--text-light)">${exercise.uses} patients using</span>
              <button class="dash-btn" type="button" style="margin-left:auto;font-size:12px;padding:5px 12px" data-open-modal data-assign-exercise-id="${exercise.id}">Assign</button>
            </div>
          </div>
        </div>`).join("")
    : `<div class="card"><div class="card-body" style="font-size:14px;color:var(--text-light)">No exercises have been created yet.</div></div>`;

  return `
    <div class="dash-header">
      <div><h2>Exercise Library</h2><div class="welcome">${EXERCISES.length} exercises available</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${exerciseCards}
    </div>`;
}

function progressHTML() {
  return `
    <div class="dash-header">
      <div><h2>Progress Reports</h2><div class="welcome">Latest progress from completed exercises</div></div>
    </div>
    <div class="stats-row">
      <div class="stat-card s-blue"><div class="stat-label">Avg Accuracy</div><div class="stat-value">${DASHBOARD_STATS.avg_progress}%</div><div class="stat-delta up">Across active patients</div></div>
      <div class="stat-card s-yellow"><div class="stat-label">Sessions Logged</div><div class="stat-value">${DASHBOARD_STATS.total_sessions || 0}</div><div class="stat-delta up">From Unity practice</div></div>
      <div class="stat-card s-green"><div class="stat-label">Assignments Completed</div><div class="stat-value">${DASHBOARD_STATS.completed_assignments || 0}</div><div class="stat-delta up">Marked completed</div></div>
      <div class="stat-card s-red"><div class="stat-label">Need Attention</div><div class="stat-value">${DASHBOARD_STATS.need_attention}</div><div class="stat-delta down">Below 50% accuracy</div></div>
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
  const alerts = ALERTS;
  return `
    <div class="dash-header"><div><h2>Alerts & Notifications</h2><div class="welcome">${alerts.length} real notifications</div></div></div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${alerts.length ? alerts.map((alert) => `
        <div class="alert-card">
          <div style="flex:1"><div style="font-weight:700;font-size:15px;margin-bottom:4px">${alert.title}</div><div style="font-size:13px;color:var(--text-mid);margin-bottom:8px">${alert.detail}</div><div style="font-size:12px;color:var(--text-light)">${alert.time}</div></div>
          <span class="badge ${alert.type}">${alert.type === "attention" ? "danger" : alert.type === "pending" ? "warning" : "info"}</span>
        </div>`).join("") : `<div class="alert-card"><div style="font-size:13px;color:var(--text-mid)">No patient alerts right now.</div></div>`}
    </div>`;
}

function renderModalOptions(selectedChildId = "", selectedExerciseId = "") {
  const patientSelect = document.getElementById("modal-patient");
  const exerciseList = document.getElementById("modal-exercises");
  if (!patientSelect || !exerciseList) return;
  patientSelect.innerHTML = `<option value="">Choose a patient...</option>${PATIENTS.map((patient) => `<option value="${patient.id}" ${String(patient.id) === String(selectedChildId) ? "selected" : ""}>${patient.name} — Age ${patient.age}</option>`).join("")}`;
  exerciseList.innerHTML = EXERCISES.length ? EXERCISES.map((exercise, index) => `
    <div class="ex-checkbox-item">
      <input type="checkbox" id="ex${index}" value="${exercise.id}" ${String(exercise.id) === String(selectedExerciseId) ? "checked" : ""}>
      <label for="ex${index}" class="ex-checkbox-label">${exercise.icon} ${exercise.name}</label>
      <div class="ex-reps-input"><input type="number" value="${exercise.reps}" min="1" max="50"><span class="reps-label">reps</span></div>
    </div>`).join("") : `<div style="font-size:13px;color:var(--text-light)">No exercises are available yet.</div>`;
}

function openModal(selectedChildId = "", selectedExerciseId = "") {
  renderModalOptions(selectedChildId, selectedExerciseId);
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
      <div class="info-chip"><div class="info-chip-val">${patient.streak}</div><div class="info-chip-label">Streak</div></div>
    </div>
    <div class="panel-section-title">Current Exercises</div>
    ${patient.exercises.length ? patient.exercises.map((exercise) => `<div class="ex-row"><div class="ex-icon blue"></div><div class="ex-info"><div class="ex-name">${exercise}</div><div class="ex-detail">Active assignment</div></div></div>`).join("") : `<div style="font-size:13px;color:var(--text-light)">No active assignments.</div>`}
    <div class="panel-section-title">Progress History</div>
    <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:16px">
      ${patient.scores.map((score, index) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:100%;background:var(--blue);opacity:${0.4 + index * 0.1};border-radius:3px 3px 0 0;height:${Math.round((score / 100) * 64)}px"></div><div style="font-size:10px;color:var(--text-light)">S${index + 1}</div></div>`).join("")}
    </div>
    <div class="panel-section-title">Therapist Notes</div>
    <textarea class="note-area" placeholder="Add notes about this patient..."></textarea>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="dash-btn" type="button" style="flex:1" data-open-modal data-assign-child-id="${patient.id}">+ Assign Exercise</button>
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

  const openModalButton = event.target.closest("[data-open-modal]");
  if (openModalButton) {
    event.stopPropagation();
    openModal(openModalButton.dataset.assignChildId || "", openModalButton.dataset.assignExerciseId || "");
  }

  if (event.target.closest("[data-close-modal]")) closeModal();
  if (event.target.closest("[data-close-panel]")) closePanel();

  const patientRow = event.target.closest("[data-patient-id]");
  if (patientRow && !event.target.closest("button")) openPatient(Number(patientRow.dataset.patientId));

  if (event.target.id === "submit-assignment") {
    submitAssignment();
  }

  if (event.target.id === "assign-modal") closeModal();
  if (event.target.id === "patient-panel") closePanel();
});

async function submitAssignment() {
  const patientSelect = document.getElementById("modal-patient");
  const selectedExercises = Array.from(document.querySelectorAll("#modal-exercises input[type='checkbox']:checked"));
  if (!patientSelect.value) {
    showToast("Please select a patient first.");
    return;
  }
  if (!selectedExercises.length) {
    showToast("Please select an exercise first.");
    return;
  }

  for (const selectedExercise of selectedExercises) {
    const repetitionsInput = selectedExercise.closest(".ex-checkbox-item").querySelector("input[type='number']");
    const response = await fetch("/therapy/api/assignments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify({
        child_id: Number(patientSelect.value),
        exercise_id: Number(selectedExercise.value),
        repetitions: Number(repetitionsInput.value || 1),
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.created) {
      showToast(data.message || "Could not assign exercise.");
      return;
    }
  }

  closeModal();
  showToast(`${selectedExercises.length} exercise${selectedExercises.length === 1 ? "" : "s"} assigned.`, "success");
  await loadDashboardData();
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1] || "";
}

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-patient-filter]")) return;
  const query = event.target.value.toLowerCase();
  document.querySelectorAll(".patient-row-tr").forEach((row) => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? "" : "none";
  });
});

async function loadDashboardData() {
  try {
    const response = await fetch("/therapy/api/dashboard-data/");
    if (!response.ok) throw new Error("Dashboard data request failed");

    const data = await response.json();
    PATIENTS = data.patients || [];
    EXERCISES = data.exercises || [];
    DASHBOARD_STATS = data.stats || DASHBOARD_STATS;
    ACTIVITIES = data.activities || [];
    WEEKLY_SESSIONS = data.weekly_sessions || [];
    ALERTS = data.alerts || [];

    const patientBadge = document.getElementById("patient-badge");
    if (patientBadge) patientBadge.textContent = PATIENTS.length;
    const alertBadge = document.getElementById("alert-badge");
    if (alertBadge) alertBadge.textContent = ALERTS.length;

    renderDash("overview");
  } catch (error) {
    console.error(error);
    const container = document.getElementById("dash-main");
    if (container) {
      container.innerHTML = `
      <div class="dash-header">
        <div>
            <h2>Dashboard unavailable</h2>
            <div class="welcome">Could not load therapist dashboard data.</div>
          </div>
      </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("[data-dashboard-page]")) {
    loadDashboardData();
  }
});
