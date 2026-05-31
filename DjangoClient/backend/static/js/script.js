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

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
      <button class="dash-btn" type="button" data-open-modal>Assign Exercise</button>
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
              <div style="margin-left:auto; display:flex; gap:8px;">
              <button class="dash-btn" type="button" style="font-size:12px;padding:5px 12px" data-edit-exercise-id="${exercise.id}">Edit</button>
              <button class="dash-btn" type="button" style="font-size:12px;padding:5px 12px" data-open-modal data-assign-exercise-id="${exercise.id}">Assign</button>
            </div>
            </div>
          </div>
        </div>`).join("")
    : `<div class="card"><div class="card-body" style="font-size:14px;color:var(--text-light)">No exercises have been created yet.</div></div>`;

  return `
    <div class="dash-header">
      <div>
        <h2>Exercise Library</h2>
        <div class="welcome">${EXERCISES.length} exercises available</div>
      </div>
      
      <button class="dash-btn" type="button" data-open-create-modal>Create Exercise</button>
      
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
    ${patient.assignments?.length ? patient.assignments.map((assignment) => `
      <div class="ex-row">
        <div class="ex-icon blue"></div>
        <div class="ex-info">
          <div class="ex-name">${escapeHTML(assignment.exercise_title)}</div>
          <div class="ex-detail">Active assignment · ${assignment.repetitions} rep${Number(assignment.repetitions) === 1 ? "" : "s"}</div>
        </div>
        <button class="unassign-btn" type="button" title="Unassign exercise" aria-label="Unassign ${escapeHTML(assignment.exercise_title)}" data-unassign-assignment-id="${assignment.id}">✕</button>
      </div>
    `).join("") : `<div style="font-size:13px;color:var(--text-light)">No active assignments.</div>`}
    <div class="panel-section-title">Progress History</div>
    <div style="display:flex;align-items:flex-end;gap:6px;height:80px;margin-bottom:16px">
      ${patient.scores.map((score, index) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="width:100%;background:var(--blue);opacity:${0.4 + index * 0.1};border-radius:3px 3px 0 0;height:${Math.round((score / 100) * 64)}px"></div><div style="font-size:10px;color:var(--text-light)">S${index + 1}</div></div>`).join("")}
    </div>
    <div class="panel-section-title">Therapist Notes</div>
    <textarea class="note-area" placeholder="Add notes about this patient..."></textarea>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="dash-btn" type="button" style="flex:1" data-open-modal data-assign-child-id="${patient.id}">Assign Exercise</button>
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


  //delte modal
  if (event.target.id === "delete-exercise-btn") {
    const exId = document.getElementById('ex_id').value;
    if (exId && confirm("Are you sure you want to delete this exercise? This cannot be undone.")) {
      deleteExercise(exId);
    }
  }

  //edit modal
  const editExerciseBtn = event.target.closest("[data-edit-exercise-id]");
  if (editExerciseBtn) {
      openEditModal(Number(editExerciseBtn.dataset.editExerciseId));
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


  if (event.target.closest("[data-open-create-modal]")) {
    document.getElementById("create-exercise-modal")?.classList.add("open");
    resetExerciseBuilder();
  }

  if (event.target.closest("[data-close-create-modal]")) {
    document.getElementById("create-exercise-modal")?.classList.remove("open");
  }

  if (event.target.id === "add-question-btn") addQuestionBlock();

  if (event.target.id === "submit-new-exercise") submitNewExercise();

  if (event.target.closest(".remove-block-btn")) event.target.closest('.question-block').remove();
  if (event.target.closest(".remove-row-btn")) event.target.closest('.dynamic-row-item').remove();

  if (event.target.closest(".add-mc-row-btn")) addMCRow(event.target.closest('.add-mc-row-btn'));
  if (event.target.closest(".add-open-row-btn")) addOpenRow(event.target.closest('.add-open-row-btn'));
  if (event.target.closest(".add-pair-row-btn")) {
    const btn = event.target.closest('.add-pair-row-btn');
    const type = btn.dataset.pairType; // Gets the specific type from the button
    addPairRow(btn, type === 'CONNECTIONS' ? 'Target' : 'Group');
  }

  if (event.target.closest("[data-close-modal]")) closeModal();
  if (event.target.closest("[data-close-panel]")) closePanel();

  const unassignButton = event.target.closest("[data-unassign-assignment-id]");
  if (unassignButton) {
    event.stopPropagation();
    unassignExercise(Number(unassignButton.dataset.unassignAssignmentId));
    return;
  }

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

async function unassignExercise(assignmentId) {
  if (!assignmentId) return;

  const response = await fetch(`/therapy/api/assignment/${assignmentId}/unassign/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
  });
  const data = await response.json();

  if (!response.ok || !data.deleted) {
    showToast(data.message || "Could not unassign exercise.");
    return;
  }

  showToast(data.message || "Exercise unassigned.", "success");
  await loadDashboardData();
  openPatient(Number(data.child_id));
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

document.addEventListener("change", (event) => {
  // Update block UI if the question type dropdown is changed
  if (event.target.classList.contains('block-type')) {
    const block = event.target.closest('.question-block');
    renderBlockInner(block, event.target.value);
  }
});

let exerciseQuestionCount = 0;

function resetExerciseBuilder() {
    document.getElementById('ex_id').value = ''; 
    document.querySelector('#create-exercise-modal .modal-title').innerText = "Create a New Exercise"; 
    
    document.getElementById('ex_title').value = '';
    document.getElementById('ex_category').value = '';
    document.getElementById('ex_difficulty').value = '1';
    document.getElementById('ex_description').value = '';
    document.getElementById('exp_text').value = '';
    
    const container = document.getElementById('exercisesContainer');
    if (container) {
        container.innerHTML = '<p style="color: var(--text-light); text-align: center; margin: 30px 0; font-size: 14px;" id="emptyMessage">No questions added yet. Click "Add Question" to begin.</p>';
    }
    exerciseQuestionCount = 0;

    document.getElementById('delete-exercise-btn').style.display = 'none'; // Hide delete button
}

function addQuestionBlock(type = 'MULTIPLE_CHOICE') {
  const emptyMsg = document.getElementById('emptyMessage');
  if (emptyMsg) emptyMsg.style.display = 'none';

  exerciseQuestionCount++;
  const container = document.getElementById('exercisesContainer');

  const block = document.createElement('div');
  block.className = 'card question-block';
  block.style.marginBottom = '20px';
  block.style.border = '1.5px solid var(--blue)';

  block.innerHTML = `
        <div class="card-header" style="background: var(--blue-pale); padding: 10px 16px;">
            <div class="card-title" style="font-size: 14px; color: var(--blue);">Question #${exerciseQuestionCount}</div>
            <button type="button" class="remove-block-btn" style="background:none; border:none; color:var(--red); font-size:12px; font-weight:700; cursor:pointer;">✕ Remove</button>
        </div>
        <div class="card-body" style="padding: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-bottom: 16px;">
                <div>
                    <label>Question Type</label>
                    <select class="block-type" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--border);">
                        <option value="MULTIPLE_CHOICE" ${type === 'MULTIPLE_CHOICE' ? 'selected' : ''}>Multiple Choice</option>
                        <option value="OPEN_QUESTION" ${type === 'OPEN_QUESTION' ? 'selected' : ''}>Open Question</option>
                        <option value="CONNECTIONS" ${type === 'CONNECTIONS' ? 'selected' : ''}>Connections</option>
                        <option value="MILESTONE_EXERCISE" ${type === 'MILESTONE_EXERCISE' ? 'selected' : ''}>Milestone Exercise</option>
                    </select>
                </div>
                <div>
                    <label>Question / Instructions</label>
                    <input type="text" class="q-text" placeholder="e.g., Choose whether the Word contains 'M' or 'N'" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--border);">
                </div>
            </div>
            <div class="block-inner-content"></div>
        </div>
    `;
  container.appendChild(block);

  // Render the inputs based on the selected type
  renderBlockInner(block, type);
}

function renderBlockInner(block, type) {
  const innerContainer = block.querySelector('.block-inner-content');
  
  // If it's a Milestone, we just need the text box above, no options builder.
  if (type === 'MILESTONE_EXERCISE') {
      innerContainer.innerHTML = `
        <div style="background: var(--off-white); border: 1px dashed var(--border); padding: 16px; border-radius: 8px; text-align: center; font-size: 13px; color: var(--text-mid);">
          This is a text-only milestone. It uses the input field above. No additional options are needed.
        </div>
      `;
      return;
  }

  let innerFields = '';
  let addBtnHtml = '';

  if (type === 'MULTIPLE_CHOICE') {
    innerFields = `<div style="margin-bottom:8px;"><label>Target Word</label><input type="text" class="w-text" placeholder="Mail" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border);"></div>`;
    addBtnHtml = `<button type="button" class="dash-btn add-mc-row-btn" style="background:var(--off-white); color:var(--text-mid); border:1px solid var(--border); padding:6px 12px; font-size:12px; margin-top:10px;">Add Option</button>`;
  } else if (type === 'OPEN_QUESTION') {
    innerFields = `<div style="margin-bottom:8px;"><label>Target Word</label><input type="text" class="w-text" placeholder="Knight" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border);"></div>`;
    addBtnHtml = `<button type="button" class="dash-btn add-open-row-btn" style="background:var(--off-white); color:var(--text-mid); border:1px solid var(--border); padding:6px 12px; font-size:12px; margin-top:10px;">Add Valid Answer</button>`;
  } else if (type === 'CONNECTIONS') {
    addBtnHtml = `<button type="button" class="dash-btn add-pair-row-btn" data-pair-type="${type}" style="background:var(--off-white); color:var(--text-mid); border:1px solid var(--border); padding:6px 12px; font-size:12px; margin-top:10px;">Add Pair</button>`;
  }

  innerContainer.innerHTML = `
      ${innerFields}
      <div style="background: white; border: 1px solid var(--border); padding: 12px; border-radius: 8px; margin-top: 12px;">
          <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-light);">Options / Answers</label>
          <div class="dynamic-rows"></div>
          ${addBtnHtml}
      </div>
  `;

  // Auto-click the add button so it doesn't start empty
  const btn = innerContainer.querySelector('.dash-btn');
  if (btn) btn.click();
}

function addMCRow(btn) {
  const row = document.createElement('div');
  row.className = 'dynamic-row-item mc-row';
  row.style = 'display: flex; gap: 8px; margin-top: 8px; align-items: center;';
  row.innerHTML = `
        <input type="text" class="opt-text" placeholder="Option" style="flex:2; padding:8px; border-radius:6px; border:1px solid var(--border);">
        <select class="opt-correct" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border);">
            <option value="false">Incorrect</option><option value="true">Correct</option>
        </select>
        <button type="button" class="remove-row-btn" style="background:var(--red-light); color:var(--red); border:none; border-radius:6px; width:34px; height:34px; cursor:pointer; font-weight:bold;">✕</button>`;
  btn.parentElement.querySelector('.dynamic-rows').appendChild(row);
}

function addOpenRow(btn) {
  const row = document.createElement('div');
  row.className = 'dynamic-row-item open-row';
  row.style = 'display: flex; gap: 8px; margin-top: 8px; align-items: center;';
  row.innerHTML = `
        <input type="text" class="open-ans" placeholder="Answer" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border);">
        <button type="button" class="remove-row-btn" style="background:var(--red-light); color:var(--red); border:none; border-radius:6px; width:34px; height:34px; cursor:pointer; font-weight:bold;">✕</button>`;
  btn.parentElement.querySelector('.dynamic-rows').appendChild(row);
}

function addPairRow(btn, targetLabel) {
  const row = document.createElement('div');
  row.className = 'dynamic-row-item pair-row';
  row.style = 'display: flex; gap: 8px; margin-top: 8px; align-items: center;';
  row.innerHTML = `
        <input type="text" class="pair-word" placeholder="Word" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border);">
        <span style="font-size:12px; color:var(--text-light);">➔</span>
        <input type="text" class="pair-target" placeholder="${targetLabel}" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border);">
        <button type="button" class="remove-row-btn" style="background:var(--red-light); color:var(--red); border:none; border-radius:6px; width:34px; height:34px; cursor:pointer; font-weight:bold;">✕</button>`;
  btn.parentElement.querySelector('.dynamic-rows').appendChild(row);
}

function submitNewExercise() {
  let payload = {
    "Explination_Text": document.getElementById('exp_text').value,
    "Exercises": []
  };

  const blocks = document.querySelectorAll('.question-block');
  blocks.forEach(block => {
    const blockType = block.querySelector('.block-type').value; 
    
    let exerciseData = {
      "Type": blockType,
      "Question": block.querySelector('.q-text').value || "",
      "Words": [],
      "Options": []
    };

    if (blockType === 'MULTIPLE_CHOICE' || blockType === 'OPEN_QUESTION') {
      let wText = block.querySelector('.w-text').value;
      if (wText) exerciseData.Words.push({ "Text": wText });

      if (blockType === 'MULTIPLE_CHOICE') {
        block.querySelectorAll('.mc-row').forEach(row => {
          let text = row.querySelector('.opt-text').value;
          let isCorrect = row.querySelector('.opt-correct').value === "true";
          if (text) exerciseData.Options.push({ "Text": text, "Is_Correct": isCorrect });
        });
      } else {
        block.querySelectorAll('.open-row').forEach(row => {
          let ansVal = row.querySelector('.open-ans').value;
          if (!isNaN(ansVal) && ansVal.trim() !== "") {
            exerciseData.Options.push({ "Correct_Answer_Number": Number(ansVal) });
          } else if (ansVal.trim() !== "") {
            exerciseData.Options.push({ "Correct_Answer_Text": ansVal });
          }
        });
      }
    }
    else if (blockType === 'CONNECTIONS') {
      block.querySelectorAll('.pair-row').forEach(row => {
        let word = row.querySelector('.pair-word').value;
        let target = row.querySelector('.pair-target').value;
        if (word && target) {
          exerciseData.Words.push({ "Text": word });
          exerciseData.Options.push({ "Word": word, "Connected_Words": [target] });
        }
      });
    }

    if (exerciseData.Options.length > 0 || exerciseData.Question !== "") {
      payload.Exercises.push(exerciseData);
    }
  });

  const formTitle = document.getElementById('ex_title').value.trim() || "No Title";
  const formCategory = document.getElementById('ex_category').value.trim() || "No Category";
  const formDifficulty = parseInt(document.getElementById('ex_difficulty').value) || 1;
  const formDescription = document.getElementById('ex_description').value.trim() || "No Description";

  const exId = document.getElementById('ex_id').value;
  const apiUrl = exId ? `/therapy/exercise/api/update/${exId}/` : '/therapy/exercise/api/create/';

  fetch(apiUrl, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json', 
          'X-CSRFToken': getCookie("csrftoken") 
      },
      body: JSON.stringify({ 
          template_json: payload, 
          title: formTitle,
          description: formDescription,
          category: formCategory,
          difficulty: formDifficulty
      })
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          document.getElementById("create-exercise-modal")?.classList.remove("open");
          showToast(exId ? "Exercise Updated Successfully!" : "Exercise Created Successfully!", "success");
          loadDashboardData();
      } else {
          showToast("Error: " + data.message, "danger");
      }
  })
  .catch(error => {
      console.error("Fetch Error:", error);
      showToast("Network error while saving.", "danger");
  });
}

function openEditModal(id) {
    const exercise = EXERCISES.find(ex => ex.id === id);
    if (!exercise) return;

    resetExerciseBuilder(); 
    document.querySelector('#create-exercise-modal .modal-title').innerText = "Edit Exercise";
    document.getElementById('delete-exercise-btn').style.display = 'block'; 
    
    document.getElementById('ex_id').value = id;
    document.getElementById('ex_title').value = exercise.name || '';
    document.getElementById('ex_category').value = exercise.cat || '';
    document.getElementById('ex_difficulty').value = exercise.difficulty_num || '1';
    document.getElementById('ex_description').value = exercise.description || '';

    const template = exercise.template_json || {};
    document.getElementById('exp_text').value = template.Explination_Text || '';

    if (template.Exercises && template.Exercises.length > 0) {
        document.getElementById('emptyMessage').style.display = 'none';
        
        template.Exercises.forEach((exData) => {
            const blockType = exData.Type || 'MULTIPLE_CHOICE';
            addQuestionBlock(blockType); 
            
            const blocks = document.querySelectorAll('.question-block');
            const currentBlock = blocks[blocks.length - 1];

            currentBlock.querySelector('.q-text').value = exData.Question || '';

            if ((blockType === 'MULTIPLE_CHOICE' || blockType === 'OPEN_QUESTION') && exData.Words && exData.Words.length > 0) {
                currentBlock.querySelector('.w-text').value = exData.Words[0].Text || '';
            }

            if (exData.Options && exData.Options.length > 0) {
                const dynamicRows = currentBlock.querySelector('.dynamic-rows');
                dynamicRows.innerHTML = ''; 

                exData.Options.forEach(opt => {
                    if (blockType === 'MULTIPLE_CHOICE') {
                        const btn = currentBlock.querySelector('.add-mc-row-btn');
                        addMCRow(btn);
                        const rows = currentBlock.querySelectorAll('.mc-row');
                        const newRow = rows[rows.length - 1];
                        newRow.querySelector('.opt-text').value = opt.Text || '';
                        newRow.querySelector('.opt-correct').value = opt.Is_Correct ? "true" : "false";
                    } 
                    else if (blockType === 'OPEN_QUESTION') {
                        const btn = currentBlock.querySelector('.add-open-row-btn');
                        addOpenRow(btn);
                        const rows = currentBlock.querySelectorAll('.open-row');
                        const newRow = rows[rows.length - 1];
                        newRow.querySelector('.open-ans').value = opt.Correct_Answer_Text || opt.Correct_Answer_Number || '';
                    } 
                    else if (blockType === 'CONNECTIONS') {
                        const btn = currentBlock.querySelector('.add-pair-row-btn');
                        addPairRow(btn, 'Target');
                        const rows = currentBlock.querySelectorAll('.pair-row');
                        const newRow = rows[rows.length - 1];
                        newRow.querySelector('.pair-word').value = opt.Word || '';
                        newRow.querySelector('.pair-target').value = opt.Connected_Words?.[0] || '';
                    }
                });
            }
        });
    }
    
    document.getElementById("create-exercise-modal").classList.add("open");
}

function deleteExercise(id) {
  fetch(`/therapy/exercise/api/delete/${id}/`, {
      method: 'POST',
      headers: { 
          'X-CSRFToken': getCookie("csrftoken") 
      }
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          document.getElementById("create-exercise-modal")?.classList.remove("open");
          showToast("Exercise deleted successfully.", "success");
          loadDashboardData(); // Refresh the dashboard UI
      } else {
          showToast("Error: " + data.message, "danger");
      }
  })
  .catch(error => {
      console.error("Fetch Error:", error);
      showToast("Network error while deleting.", "danger");
  });
}