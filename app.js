const STORAGE_KEY = "revisionBloomPro_clean_v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function toISODate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

const defaultData = {
  subjects: [],
  tasks: [],
  notes: [],
  planner: [],
  sessions: [],
  flashcards: [],
  goals: [],
  personalGoals: [],
  settings: {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15
  }
};

function createFreshData() {
  return structuredClone(defaultData);
}

function normaliseData(raw) {
  const base = createFreshData();

  return {
    subjects: Array.isArray(raw?.subjects) ? raw.subjects : base.subjects,
    tasks: Array.isArray(raw?.tasks) ? raw.tasks : base.tasks,
    notes: Array.isArray(raw?.notes) ? raw.notes : base.notes,
    planner: Array.isArray(raw?.planner) ? raw.planner : base.planner,
    sessions: Array.isArray(raw?.sessions) ? raw.sessions : base.sessions,
    flashcards: Array.isArray(raw?.flashcards) ? raw.flashcards : base.flashcards,
    goals: Array.isArray(raw?.goals) ? raw.goals : base.goals,
    personalGoals: Array.isArray(raw?.personalGoals) ? raw.personalGoals : base.personalGoals,
    settings: {
      pomodoro: Number(raw?.settings?.pomodoro) || 25,
      shortBreak: Number(raw?.settings?.shortBreak) || 5,
      longBreak: Number(raw?.settings?.longBreak) || 15
    }
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createFreshData();

  try {
    return normaliseData(JSON.parse(raw));
  } catch {
    return createFreshData();
  }
}

let data = loadData();

const state = {
  view: "dashboard",
  taskFilter: "all",
  subjectFilter: "all",
  noteSubjectFilter: "all",
  flashcardSubjectFilter: "all",
  timerMode: "pomodoro",
  timerRunning: false,
  timerRemaining: data.settings.pomodoro * 60,
  timerInterval: null,
  currentFlashcardId: null,
  flashcardShowingBack: false,
  prayerLoading: false,
  prayerError: "",
  prayerData: null,
  sidebarOpen: false
};

const navItems = [
  { key: "dashboard", label: "Dashboard", hint: "Overview", emoji: "✨" },
  { key: "subjects", label: "Subjects", hint: "Exams", emoji: "📚" },
  { key: "tasks", label: "Tasks", hint: "Deadlines", emoji: "✅" },
  { key: "notes", label: "Notes", hint: "Study bank", emoji: "📝" },
  { key: "planner", label: "Planner", hint: "Calendar", emoji: "🗓️" },
  { key: "exams", label: "Exams", hint: "Countdowns", emoji: "🎯" },
  { key: "timer", label: "Timer", hint: "Pomodoro", emoji: "⏳" },
  { key: "flashcards", label: "Flashcards", hint: "Recall", emoji: "🧠" },
  { key: "goals", label: "Goals", hint: "Study goals", emoji: "🏆" },
  { key: "personal", label: "Personal", hint: "Gym & life", emoji: "🌿" },
  { key: "prayer", label: "Prayer", hint: "Local times", emoji: "🕌" }
];

const viewMeta = {
  dashboard: {
    title: "Good things happen when your week is clear.",
    subtitle: "Plan exams, track progress, build routines, and stay calm with one beautiful dashboard.",
    actions: [
      { label: "Start planning", fn: "openTaskModal" },
      { label: "Add subject", fn: "openSubjectModal", secondary: true }
    ]
  },
  subjects: {
    title: "Subjects",
    subtitle: "Track exam dates, progress, and weekly targets in one clean place.",
    actions: [{ label: "Add subject", fn: "openSubjectModal" }]
  },
  tasks: {
    title: "Tasks",
    subtitle: "Keep revision and coursework organised without the chaos.",
    actions: [{ label: "Add task", fn: "openTaskModal" }]
  },
  notes: {
    title: "Notes",
    subtitle: "Keep your revision bank tidy, searchable, and ready when you need it.",
    actions: [{ label: "Add note", fn: "openNoteModal" }]
  },
  planner: {
    title: "Planner",
    subtitle: "Map out your study sessions with a calmer monthly view.",
    actions: [{ label: "Add plan", fn: "openPlannerModal" }]
  },
  exams: {
    title: "Exam countdowns",
    subtitle: "See what is close, what needs attention, and what is under control.",
    actions: [{ label: "Add subject", fn: "openSubjectModal" }]
  },
  timer: {
    title: "Focus timer",
    subtitle: "Stay in flow, log your effort, and build consistency one session at a time.",
    actions: [{ label: "Log session", fn: "openSessionModal", secondary: true }]
  },
  flashcards: {
    title: "Flashcards",
    subtitle: "Use active recall in a space that feels focused and distraction-free.",
    actions: [{ label: "Add flashcard", fn: "openFlashcardModal" }]
  },
  goals: {
    title: "Study goals",
    subtitle: "Set clear targets and keep your momentum visible.",
    actions: [{ label: "Add goal", fn: "openGoalModal" }]
  },
  personal: {
    title: "Personal goals",
    subtitle: "Track health, faith, routines, and life goals beside your study plan.",
    actions: [{ label: "Add personal goal", fn: "openPersonalGoalModal" }]
  },
  prayer: {
    title: "Prayer times",
    subtitle: "Keep your day grounded with local prayer times and a calm layout.",
    actions: [{ label: "Load prayer times", fn: "loadPrayerTimes" }]
  }
};

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSubject(id) {
  return data.subjects.find(subject => subject.id === id);
}

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatLongDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function formatTime(dateTime) {
  return new Date(dateTime).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function formatPlannerNow(date) {
  return {
    date: date.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const target = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
}

function averageProgress() {
  if (!data.subjects.length) return 0;
  return Math.round(
    data.subjects.reduce((sum, subject) => sum + Number(subject.progress || 0), 0) /
      data.subjects.length
  );
}

function weeklyMinutes() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  return data.sessions
    .filter(session => new Date(`${session.date}T00:00:00`) >= start)
    .reduce((sum, session) => sum + Number(session.duration || 0), 0);
}

function studyStreak() {
  let streak = 0;

  for (let i = 0; i < 30; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = toISODate(date);
    const hasSession = data.sessions.some(session => session.date === key);

    if (hasSession) streak += 1;
    else break;
  }

  return streak;
}

function totalHoursBySubject(subjectId) {
  const minutes = data.sessions
    .filter(session => session.subjectId === subjectId)
    .reduce((sum, session) => sum + Number(session.duration || 0), 0);

  return (minutes / 60).toFixed(1);
}

function nearestExam() {
  const exams = [...data.subjects]
    .filter(subject => subject.examDate)
    .sort((a, b) => daysUntil(a.examDate) - daysUntil(b.examDate));

  return exams[0] || null;
}

function completedGoalsCount() {
  return data.goals.filter(goal => goal.done).length;
}

function completedPersonalGoalsCount() {
  return data.personalGoals.filter(goal => goal.done).length;
}

function formatTimer(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function timerModeLabel() {
  if (state.timerMode === "pomodoro") return "Focused revision session";
  if (state.timerMode === "short") return "Short break";
  return "Long break";
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function setView(view) {
  state.view = view;
  if (window.innerWidth <= 760) {
    state.sidebarOpen = false;
    syncSidebar();
  }
  renderApp();
}

function requireSubjectFirst() {
  if (data.subjects.length) return false;
  openSubjectModal();
  return true;
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = navItems
    .map(
      item => `
        <button class="nav-btn ${state.view === item.key ? "active" : ""}" data-view="${item.key}" type="button">
          <span class="nav-left">
            <span class="nav-emoji">${item.emoji}</span>
            <span>
              <span>${escapeHtml(item.label)}</span>
              <small>${escapeHtml(item.hint)}</small>
            </span>
          </span>
        </button>
      `
    )
    .join("");

  nav.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
}

function renderSidebarInfo() {
  const exam = nearestExam();
  document.getElementById("sidebarFocusSubject").textContent = exam?.name || "No exam yet";
  document.getElementById("sidebarFocusText").textContent = exam
    ? `${Math.max(daysUntil(exam.examDate), 0)} days left. This is your closest deadline, so shape this week around it.`
    : "Add your first subject and exam date to unlock your dashboard flow.";
}

function renderViewHeader() {
  const meta = viewMeta[state.view];
  const exam = nearestExam();
  const streak = studyStreak();

  const pills = [
    `Today · ${formatLongDate()}`,
    `Overall progress · ${averageProgress()}%`,
    `Study streak · ${streak} day${streak === 1 ? "" : "s"}`,
    exam ? `Nearest exam · ${exam.name}` : "No exam added yet"
  ];

  document.getElementById("viewHeader").innerHTML = `
    <div class="view-header-top">
      <div>
        <p class="eyebrow">Revision Bloom Pro</p>
        <h2 class="view-title">${escapeHtml(meta.title)}</h2>
        <p class="panel-subtitle" style="max-width:760px;">${escapeHtml(meta.subtitle)}</p>
      </div>
      <div class="quick-actions">
        ${meta.actions
          .map(
            action => `
              <button
                class="${action.secondary ? "secondary-btn" : "primary-btn"}"
                type="button"
                onclick="${action.fn}()"
              >
                ${escapeHtml(action.label)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
    <div class="header-pills" style="margin-top:16px;">
      ${pills.map(pill => `<span class="metric-pill">${escapeHtml(pill)}</span>`).join("")}
    </div>
  `;
}

function renderDashboard() {
  const exam = nearestExam();
  const minutes = weeklyMinutes();
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const activeTasks = data.tasks.filter(task => !task.completed).length;
  const streak = studyStreak();

  const upcomingTasks = [...data.tasks]
    .filter(task => !task.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  const upcomingPlans = [...data.planner]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .filter(plan => `${plan.date}T${plan.time}` >= `${todayISO()}T00:00`)
    .slice(0, 4);

  return `
    <section class="stats-grid">
      <article class="stat-card">
        <span class="eyebrow">Overall progress</span>
        <strong>${averageProgress()}%</strong>
        <p class="tiny">Across all subjects</p>
      </article>

      <article class="stat-card">
        <span class="eyebrow">Study time</span>
        <strong>${hours}h ${mins}m</strong>
        <p class="tiny">Logged this week</p>
      </article>

      <article class="stat-card">
        <span class="eyebrow">Study streak</span>
        <strong>${streak}</strong>
        <p class="tiny">Day${streak === 1 ? "" : "s"} in a row</p>
      </article>

      <article class="stat-card">
        <span class="eyebrow">Nearest exam</span>
        <strong>${exam ? Math.max(daysUntil(exam.examDate), 0) : 0}</strong>
        <p class="tiny">${escapeHtml(exam ? `${exam.name} coming up` : "Add your first subject")}</p>
      </article>
    </section>

    <section class="dashboard-focus">
      <article class="hero-panel">
        <div class="hero-accent-line"></div>
        <div class="hero-top">
          <div>
            <p class="eyebrow">Weekly overview</p>
            <h3 class="dashboard-hero-title">
              ${escapeHtml(exam ? `Stay ready for ${exam.name}` : "Build your calm study system")}
            </h3>
            <p class="panel-subtitle dashboard-hero-copy">
              ${
                exam
                  ? `${Math.max(daysUntil(exam.examDate), 0)} days until your next exam on ${formatDate(exam.examDate)}. Focus on consistency, protect your energy, and keep your week simple.`
                  : "Add subjects, tasks, notes, and study plans to turn this into a beautiful revision dashboard you will actually want to use."
              }
            </p>
          </div>
        </div>

        <div class="hero-grid">
          <div class="hero-card">
            <p class="eyebrow">Subjects</p>
            <strong class="big-number">${data.subjects.length}</strong>
            <p class="tiny">Tracked this term</p>
          </div>
          <div class="hero-card">
            <p class="eyebrow">Active tasks</p>
            <strong class="big-number">${activeTasks}</strong>
            <p class="tiny">Still waiting on you</p>
          </div>
          <div class="hero-card">
            <p class="eyebrow">Flashcards</p>
            <strong class="big-number">${data.flashcards.length}</strong>
            <p class="tiny">Ready for recall</p>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-top">
          <div>
            <h3>Today’s flow</h3>
            <p class="panel-subtitle">Small actions that keep everything moving.</p>
          </div>
        </div>
        <div class="stack-actions">
          <button class="primary-btn" type="button" onclick="openTaskModal()">Add task</button>
          <button class="secondary-btn" type="button" onclick="openPlannerModal()">Add study block</button>
          <button class="secondary-btn" type="button" onclick="openFlashcardModal()">Add flashcard</button>
          <button class="secondary-btn" type="button" onclick="openSessionModal()">Log study session</button>
        </div>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-top">
          <div>
            <h3>Upcoming tasks</h3>
            <p class="panel-subtitle">Closest priorities first.</p>
          </div>
          <button class="secondary-btn" type="button" onclick="setView('tasks')">See all</button>
        </div>
        <div class="list-grid">
          ${upcomingTasks.length ? upcomingTasks.map(taskCardCompact).join("") : emptyState("No upcoming tasks yet. Add one and start your momentum.")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-top">
          <div>
            <h3>Coming up next</h3>
            <p class="panel-subtitle">Your next planned study blocks.</p>
          </div>
          <button class="secondary-btn" type="button" onclick="setView('planner')">Open planner</button>
        </div>
        <div class="timeline">
          ${
            upcomingPlans.length
              ? upcomingPlans
                  .map(plan => {
                    const subject = getSubject(plan.subjectId);
                    return `
                      <div class="timeline-item">
                        <div class="timeline-time">${escapeHtml(plan.time)}</div>
                        <div class="timeline-card">
                          <strong>${escapeHtml(plan.title)}</strong>
                          <div class="item-meta">
                            <span>${formatDate(plan.date)}</span>
                            <span>${escapeHtml(subject ? subject.name : "No subject")}</span>
                          </div>
                        </div>
                      </div>
                    `;
                  })
                  .join("")
              : emptyState("No study plans yet. Add one to make your week feel clear.")
          }
        </div>
      </article>
    </section>
  `;
}

function renderSubjects() {
  const sorted = [...data.subjects].sort((a, b) => daysUntil(a.examDate) - daysUntil(b.examDate));

  return `
    <section class="panel">
      <div class="list-grid">
        ${sorted.length ? sorted.map(subjectCard).join("") : emptyState("No subjects yet. Add one to start organising revision.")}
      </div>
    </section>
  `;
}

function renderTasks() {
  const filtered = [...data.tasks]
    .filter(task => {
      if (state.taskFilter === "active") return !task.completed;
      if (state.taskFilter === "complete") return task.completed;
      if (state.taskFilter === "high") return task.priority === "High";
      return true;
    })
    .filter(task => (state.subjectFilter === "all" ? true : task.subjectId === state.subjectFilter))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return `
    <section class="panel">
      <div class="goal-toolbar" style="margin-bottom:16px;">
        <div class="filters">
          ${["all", "active", "complete", "high"]
            .map(
              filter => `
                <button class="filter-chip ${state.taskFilter === filter ? "active" : ""}" type="button" onclick="setTaskFilter('${filter}')">
                  ${escapeHtml(capitalize(filter))}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="filters">
          <button class="subject-chip ${state.subjectFilter === "all" ? "active" : ""}" type="button" onclick="setSubjectFilter('all')">All subjects</button>
          ${data.subjects
            .map(
              subject => `
                <button class="subject-chip ${state.subjectFilter === subject.id ? "active" : ""}" type="button" onclick="setSubjectFilter('${subject.id}')">
                  ${escapeHtml(subject.name)}
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="list-grid">
        ${filtered.length ? filtered.map(taskCardFull).join("") : emptyState("No tasks match your current filters.")}
      </div>
    </section>
  `;
}

function renderNotes() {
  const filtered = [...data.notes]
    .filter(note => (state.noteSubjectFilter === "all" ? true : note.subjectId === state.noteSubjectFilter))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return `
    <section class="panel">
      <div class="filters" style="margin-bottom:16px;">
        <button class="subject-chip ${state.noteSubjectFilter === "all" ? "active" : ""}" type="button" onclick="setNoteSubjectFilter('all')">All subjects</button>
        ${data.subjects
          .map(
            subject => `
              <button class="subject-chip ${state.noteSubjectFilter === subject.id ? "active" : ""}" type="button" onclick="setNoteSubjectFilter('${subject.id}')">
                ${escapeHtml(subject.name)}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="list-grid">
        ${filtered.length ? filtered.map(noteCard).join("") : emptyState("No notes found for this filter.")}
      </div>
    </section>
  `;
}

function renderPlanner() {
  const plans = [...data.planner].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const now = new Date();

  return `
    <section class="two-col planner-layout">
      <article class="panel planner-sessions-panel">
        <div class="panel-top">
          <div>
            <h3>Planned sessions</h3>
            <p class="panel-subtitle">Your scheduled study blocks in a cleaner list.</p>
          </div>
        </div>

        <div class="planner-live-date">
          <div class="planner-live-date-box">
            <span class="eyebrow">Today</span>
            <strong>${formatPlannerNow(now).date}</strong>
            <p class="tiny">${formatPlannerNow(now).time}</p>
          </div>
        </div>

        <div class="list-grid" style="margin-top:14px;">
          ${plans.length ? plans.map(planCard).join("") : emptyState("No planner entries yet.")}
        </div>
      </article>

      <article class="calendar-card planner-calendar-panel">
        <div class="panel-top">
          <div>
            <h3>${now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
            <p class="panel-subtitle">A cleaner monthly calendar with evenly sized day blocks.</p>
          </div>
        </div>

        ${calendarTemplate()}
      </article>
    </section>
  `;
}
function renderExams() {
  const exams = [...data.subjects].sort((a, b) => daysUntil(a.examDate) - daysUntil(b.examDate));

  return `
    <section class="exam-grid">
      ${exams.length
        ? exams
            .map(subject => {
              const due = daysUntil(subject.examDate);
              const taskCount = data.tasks.filter(task => task.subjectId === subject.id && !task.completed).length;
              const noteCount = data.notes.filter(note => note.subjectId === subject.id).length;

              let tag = "On track";
              if (due <= 14 && due >= 0) tag = "Urgent";
              if (due <= 7 && due >= 0) tag = "Very close";
              if (due < 0) tag = "Passed";

              return `
                <article class="exam-card">
                  <div class="exam-toolbar">
                    <div>
                      <h3>${escapeHtml(subject.name)}</h3>
                      <p class="panel-subtitle">Exam ${formatDate(subject.examDate)}</p>
                    </div>
                    <span class="exam-tag active">${escapeHtml(tag)}</span>
                  </div>

                  <div class="goal-progress-grid" style="margin-top:14px;">
                    <div class="item-card">
                      <strong>${due < 0 ? `-${Math.abs(due)}` : due}</strong>
                      <p class="tiny">${due < 0 ? "Days ago" : "Days left"}</p>
                    </div>
                    <div class="item-card">
                      <strong>${taskCount}</strong>
                      <p class="tiny">Open tasks</p>
                    </div>
                    <div class="item-card">
                      <strong>${noteCount}</strong>
                      <p class="tiny">Notes</p>
                    </div>
                  </div>

                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${Math.max(0, Math.min(100, subject.progress || 0))}%"></div>
                  </div>

                  <div class="quick-actions" style="margin-top:14px;">
                    <button class="secondary-btn" type="button" onclick="openSubjectModal('${subject.id}')">Edit</button>
                    <button class="secondary-btn" type="button" onclick="setSubjectFilter('${subject.id}'); setView('tasks');">View tasks</button>
                  </div>
                </article>
              `;
            })
            .join("")
        : emptyState("No exams yet. Add a subject with an exam date.")}
    </section>
  `;
}

function renderTimer() {
  const totalSeconds =
    state.timerMode === "pomodoro"
      ? data.settings.pomodoro * 60
      : state.timerMode === "short"
        ? data.settings.shortBreak * 60
        : data.settings.longBreak * 60;

  const completedPercent = Math.round(((totalSeconds - state.timerRemaining) / Math.max(totalSeconds, 1)) * 100);
  const angle = Math.max(0, Math.min(360, Math.round((completedPercent / 100) * 360)));

  return `
    <section class="timer-layout">
      <article class="timer-card">
        <div class="tab-row">
          <button class="mode-chip ${state.timerMode === "pomodoro" ? "active" : ""}" type="button" onclick="switchTimerMode('pomodoro')">Pomodoro</button>
          <button class="mode-chip ${state.timerMode === "short" ? "active" : ""}" type="button" onclick="switchTimerMode('short')">Short break</button>
          <button class="mode-chip ${state.timerMode === "long" ? "active" : ""}" type="button" onclick="switchTimerMode('long')">Long break</button>
        </div>

        <div class="timer-ring" style="background: conic-gradient(var(--primary-strong) 0deg, var(--primary) ${angle}deg, #f2ecd1 ${angle}deg 360deg);">
          <div class="timer-ring-inner">
            <div class="timer-center">
              <div class="timer-value" id="timerValue">${formatTimer(state.timerRemaining)}</div>
              <p class="timer-label muted">${escapeHtml(timerModeLabel())}</p>
            </div>
          </div>
        </div>

        <div class="quick-actions" style="justify-content:center;">
          <button class="primary-btn" type="button" onclick="toggleTimer()">${state.timerRunning ? "Pause" : "Start"}</button>
          <button class="secondary-btn" type="button" onclick="resetTimer()">Reset</button>
          <button class="secondary-btn" type="button" onclick="openSettingsModal()">Timer settings</button>
          <button class="secondary-btn" type="button" onclick="openSessionModal()">Log session</button>
        </div>
      </article>

      <article class="panel">
        <h3>Focus summary</h3>
        <p class="panel-subtitle">Recent logged sessions and consistency.</p>

        <div class="focus-summary-grid">
          <div class="item-card">
            <strong>${weeklyMinutes()}</strong>
            <p class="tiny">Minutes this week</p>
          </div>
          <div class="item-card">
            <strong>${studyStreak()}</strong>
            <p class="tiny">Day streak</p>
          </div>
          <div class="item-card">
            <strong>${data.sessions.length}</strong>
            <p class="tiny">Total sessions</p>
          </div>
        </div>

        <div class="list-grid" style="margin-top:14px;">
          ${
            data.sessions.length
              ? [...data.sessions]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 6)
                  .map(sessionCard)
                  .join("")
              : emptyState("No sessions logged yet.")
          }
        </div>
      </article>
    </section>
  `;
}

function renderFlashcards() {
  const filteredCards = data.flashcards.filter(card =>
    state.flashcardSubjectFilter === "all" ? true : card.subjectId === state.flashcardSubjectFilter
  );

  if (!state.currentFlashcardId || !filteredCards.some(card => card.id === state.currentFlashcardId)) {
    state.currentFlashcardId = filteredCards[0]?.id || null;
    state.flashcardShowingBack = false;
  }

  const card = filteredCards.find(item => item.id === state.currentFlashcardId);
  const subject = card ? getSubject(card.subjectId) : null;

  return `
    <section class="two-col">
      <article class="panel">
        <div class="filters" style="margin-bottom:16px;">
          <button class="subject-chip ${state.flashcardSubjectFilter === "all" ? "active" : ""}" type="button" onclick="setFlashcardSubjectFilter('all')">All subjects</button>
          ${data.subjects
            .map(
              subjectItem => `
                <button class="subject-chip ${state.flashcardSubjectFilter === subjectItem.id ? "active" : ""}" type="button" onclick="setFlashcardSubjectFilter('${subjectItem.id}')">
                  ${escapeHtml(subjectItem.name)}
                </button>
              `
            )
            .join("")}
        </div>

        ${
          card
            ? `
              <div class="item-card flashcard-stage">
                <p class="eyebrow">${escapeHtml(subject ? subject.name : "Flashcard")}</p>
                <h3>${escapeHtml(state.flashcardShowingBack ? card.back : card.front)}</h3>
                <p class="note-preview">${state.flashcardShowingBack ? "Back of card" : "Front of card"}</p>
                <div class="quick-actions" style="justify-content:center; margin-top:16px;">
                  <button class="primary-btn" type="button" onclick="flipFlashcard()">${state.flashcardShowingBack ? "Show front" : "Show answer"}</button>
                  <button class="secondary-btn" type="button" onclick="nextFlashcard()">Next card</button>
                </div>
              </div>
            `
            : emptyState("No flashcards for this filter.")
        }
      </article>

      <article class="panel">
        <div class="panel-top">
          <div>
            <h3>Your flashcards</h3>
            <p class="panel-subtitle">Manage and review saved cards.</p>
          </div>
        </div>
        <div class="list-grid">
          ${filteredCards.length ? filteredCards.map(flashcardCard).join("") : emptyState("No flashcards yet.")}
        </div>
      </article>
    </section>
  `;
}

function renderGoals() {
  return `
    <section class="goal-grid">
      <article class="panel">
        <h3>Progress</h3>
        <div class="goal-progress-grid" style="margin-top:14px;">
          <div class="item-card">
            <strong>${completedGoalsCount()} / ${data.goals.length}</strong>
            <p class="tiny">Goals completed</p>
          </div>
          <div class="item-card">
            <strong>${studyStreak()}</strong>
            <p class="tiny">Current streak</p>
          </div>
          <div class="item-card">
            <strong>${weeklyMinutes()}</strong>
            <p class="tiny">Minutes this week</p>
          </div>
        </div>

        <div style="margin-top:16px;">
          <h3>Weekly streak</h3>
          <p class="panel-subtitle">Filled squares mean you logged study time on that day.</p>
          ${streakVisual()}
        </div>
      </article>

      <article class="panel">
        <div class="panel-top">
          <div>
            <h3>Goals list</h3>
            <p class="panel-subtitle">Your current revision targets.</p>
          </div>
        </div>
        <div class="list-grid">
          ${data.goals.length ? data.goals.map(goalCard).join("") : emptyState("No goals added yet.")}
        </div>
      </article>
    </section>
  `;
}

function renderPersonal() {
  return `
    <section class="personal-grid">
      <article class="panel">
        <h3>Personal progress</h3>
        <div class="goal-progress-grid" style="margin-top:14px;">
          <div class="item-card">
            <strong>${completedPersonalGoalsCount()} / ${data.personalGoals.length}</strong>
            <p class="tiny">Completed</p>
          </div>
          <div class="item-card">
            <strong>${data.personalGoals.filter(goal => goal.category === "Health").length}</strong>
            <p class="tiny">Health</p>
          </div>
          <div class="item-card">
            <strong>${data.personalGoals.filter(goal => goal.category === "Faith").length}</strong>
            <p class="tiny">Faith</p>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-top">
          <div>
            <h3>Personal goals</h3>
            <p class="panel-subtitle">Gym, sleep, habits, prayer, routines, and life tasks.</p>
          </div>
        </div>
        <div class="list-grid">
          ${data.personalGoals.length ? data.personalGoals.map(personalGoalCard).join("") : emptyState("No personal goals added yet.")}
        </div>
      </article>
    </section>
  `;
}

function renderPrayer() {
  return `
    <section class="prayer-grid">
      <article class="prayer-card">
        <div class="prayer-head">
          <div>
            <h3>Local prayer times</h3>
<p class="panel-subtitle">Load local prayer times with your device location.</p>
          </div>
          <div class="quick-actions">
            <button class="primary-btn" type="button" onclick="loadPrayerTimes()">Load prayer times</button>
            ${state.prayerData ? `<button class="secondary-btn" type="button" onclick="openNearbyMosques()">Nearby mosques</button>` : ""}
          </div>
        </div>

        <div style="margin-top:16px;">
          ${renderPrayerBody()}
        </div>
      </article>

      <article class="panel">
        <h3>How it works</h3>
        <div class="list-grid" style="margin-top:14px;">
          <div class="item-card">
            <strong>Location permission</strong>
            <p class="tiny">You need to allow location in the browser when asked.</p>
          </div>
          <div class="item-card">
            <strong>Prayer source</strong>
            <p class="tiny">This loads local daily prayer times for your area.</p>
          </div>
          <div class="item-card">
            <strong>Nearby mosques</strong>
            <p class="tiny">The mosque button opens mosque search near your location in maps.</p>
          </div>
          <div class="item-card">
            <strong>Important</strong>
            <p class="tiny">Exact mosque iqamah times can vary by mosque.</p>
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderPrayerBody() {
  if (state.prayerLoading) {
    return emptyState("Loading prayer times…");
  }

  if (state.prayerError) {
    return emptyState(state.prayerError);
  }

  if (!state.prayerData) {
    return emptyState("Press “Load prayer times” and allow location access.");
  }

  const prayers = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const currentPrayer = getCurrentPrayerName(state.prayerData.timings);

  return `
    <div class="prayer-meta" style="margin-bottom:14px;">
      ${escapeHtml(state.prayerData.locationLabel || "Your location")}
    </div>
    <div class="prayer-times">
      ${prayers
        .map(
          prayer => `
            <div class="prayer-time-box ${currentPrayer === prayer ? "current" : ""}">
              <p class="eyebrow">${escapeHtml(prayer)}</p>
              <strong>${escapeHtml(state.prayerData.timings[prayer] || "-")}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function getCurrentPrayerName(timings) {
  if (!timings) return "";
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const entries = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
    .map(name => {
      const raw = timings[name] || "";
      const clean = raw.split(" ")[0];
      const [h = "0", m = "0"] = clean.split(":");
      return {
        name,
        mins: Number(h) * 60 + Number(m)
      };
    })
    .sort((a, b) => a.mins - b.mins);

  let current = "";
  for (const item of entries) {
    if (minutesNow >= item.mins) current = item.name;
  }
  return current || "Fajr";
}

function subjectCard(subject) {
  const taskCount = data.tasks.filter(task => task.subjectId === subject.id && !task.completed).length;
  const noteCount = data.notes.filter(note => note.subjectId === subject.id).length;

  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <h3>${escapeHtml(subject.name)}</h3>
          <div class="item-meta">
            <span>Exam ${formatDate(subject.examDate)}</span>
            <span>${Math.max(daysUntil(subject.examDate), 0)} days left</span>
            <span>${taskCount} tasks</span>
            <span>${noteCount} notes</span>
            <span>${totalHoursBySubject(subject.id)}h studied</span>
          </div>
        </div>
        <div class="quick-actions">
          <span class="chip active">${escapeHtml(String(subject.progress))}%</span>
          <button class="secondary-btn" type="button" onclick="openSubjectModal('${subject.id}')">Edit</button>
          <button class="danger-btn" type="button" onclick="deleteSubject('${subject.id}')">Delete</button>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.max(0, Math.min(100, subject.progress || 0))}%"></div>
      </div>
    </article>
  `;
}

function taskCardCompact(task) {
  const subject = getSubject(task.subjectId);

  return `
    <article class="item-card ${task.completed ? "task-complete" : ""}">
      <div class="row" style="justify-content:space-between; align-items:flex-start;">
        <div>
          <strong class="task-title">${escapeHtml(task.title)}</strong>
          <div class="item-meta">
            <span>${escapeHtml(subject ? subject.name : "No subject")}</span>
            <span>${formatDate(task.dueDate)}</span>
            <span>${escapeHtml(task.priority)}</span>
          </div>
        </div>
        <input class="checkbox" type="checkbox" ${task.completed ? "checked" : ""} onchange="toggleTask('${task.id}')" />
      </div>
    </article>
  `;
}

function taskCardFull(task) {
  const subject = getSubject(task.subjectId);
  const dueIn = daysUntil(task.dueDate);
  const dueText = dueIn < 0 ? "Overdue" : dueIn === 0 ? "Due today" : `Due in ${dueIn} day${dueIn === 1 ? "" : "s"}`;

  return `
    <article class="item-card ${task.completed ? "task-complete" : ""}">
      <div class="item-head">
        <div class="row" style="align-items:flex-start;">
          <input class="checkbox" type="checkbox" ${task.completed ? "checked" : ""} onchange="toggleTask('${task.id}')" />
          <div>
            <strong class="task-title">${escapeHtml(task.title)}</strong>
            <div class="item-meta">
              <span>${escapeHtml(subject ? subject.name : "No subject")}</span>
              <span>${formatDate(task.dueDate)}</span>
              <span>${escapeHtml(dueText)}</span>
              <span>${escapeHtml(task.priority)} priority</span>
            </div>
          </div>
        </div>
        <div class="quick-actions">
          <button class="secondary-btn" type="button" onclick="openTaskModal('${task.id}')">Edit</button>
          <button class="danger-btn" type="button" onclick="deleteTask('${task.id}')">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function noteCard(note) {
  const subject = getSubject(note.subjectId);

  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <h3>${escapeHtml(note.title)}</h3>
          <div class="item-meta">
            <span>${escapeHtml(subject ? subject.name : "No subject")}</span>
            <span>Updated ${escapeHtml(new Date(note.updatedAt).toLocaleString())}</span>
          </div>
        </div>
        <div class="quick-actions">
          <button class="secondary-btn" type="button" onclick="openNoteModal('${note.id}')">Edit</button>
          <button class="danger-btn" type="button" onclick="deleteNote('${note.id}')">Delete</button>
        </div>
      </div>
      <p class="note-preview">${escapeHtml(note.content)}</p>
    </article>
  `;
}

function planCard(plan) {
  const subject = getSubject(plan.subjectId);

  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <h3>${escapeHtml(plan.title)}</h3>
          <div class="item-meta">
            <span>${formatDate(plan.date)}</span>
            <span>${escapeHtml(plan.time)}</span>
            <span>${escapeHtml(subject ? subject.name : "No subject")}</span>
          </div>
        </div>
        <div class="quick-actions">
          <button class="secondary-btn" type="button" onclick="openPlannerModal('${plan.id}')">Edit</button>
          <button class="danger-btn" type="button" onclick="deletePlan('${plan.id}')">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function sessionCard(session) {
  const subject = getSubject(session.subjectId);

  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <strong>${escapeHtml(session.type)}</strong>
          <div class="item-meta">
            <span>${escapeHtml(subject ? subject.name : "No subject")}</span>
            <span>${formatDate(session.date)}</span>
          </div>
        </div>
        <span class="chip active">${escapeHtml(String(session.duration))} min</span>
      </div>
    </article>
  `;
}

function flashcardCard(card) {
  const subject = getSubject(card.subjectId);

  return `
    <article class="item-card">
      <div class="item-head">
        <div>
          <strong>${escapeHtml(card.front)}</strong>
          <div class="item-meta">
            <span>${escapeHtml(subject ? subject.name : "No subject")}</span>
          </div>
        </div>
        <div class="quick-actions">
          <button class="secondary-btn" type="button" onclick="selectFlashcard('${card.id}')">Open</button>
          <button class="danger-btn" type="button" onclick="deleteFlashcard('${card.id}')">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function goalCard(goal) {
  return `
    <article class="item-card ${goal.done ? "task-complete" : ""}">
      <div class="item-head">
        <div class="row" style="align-items:flex-start;">
          <input class="checkbox" type="checkbox" ${goal.done ? "checked" : ""} onchange="toggleGoal('${goal.id}')" />
          <div>
            <strong class="goal-title">${escapeHtml(goal.text)}</strong>
          </div>
        </div>
        <button class="danger-btn" type="button" onclick="deleteGoal('${goal.id}')">Delete</button>
      </div>
    </article>
  `;
}

function personalGoalCard(goal) {
  return `
    <article class="item-card ${goal.done ? "task-complete" : ""}">
      <div class="item-head">
        <div class="row" style="align-items:flex-start;">
          <input class="checkbox" type="checkbox" ${goal.done ? "checked" : ""} onchange="togglePersonalGoal('${goal.id}')" />
          <div>
            <strong class="goal-title">${escapeHtml(goal.text)}</strong>
            <div class="item-meta">
              <span>${escapeHtml(goal.category || "Life")}</span>
            </div>
          </div>
        </div>
        <div class="quick-actions">
          <button class="secondary-btn" type="button" onclick="openPersonalGoalModal('${goal.id}')">Edit</button>
          <button class="danger-btn" type="button" onclick="deletePersonalGoal('${goal.id}')">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function streakVisual() {
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = toISODate(date);
    const active = data.sessions.some(session => session.date === key);
    days.push(`<div class="streak-day ${active ? "active" : ""}"></div>`);
  }

  return `<div class="streak-box">${days.join("")}</div>`;
}

function calendarTemplate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = todayISO();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const startOffset = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;

  let html = `<div class="calendar calendar-clean">`;

  html += labels
    .map(label => `<div class="calendar-label">${label}</div>`)
    .join("");

  for (let i = 0; i < totalCells; i += 1) {
    const dayNum = i - startOffset + 1;

    if (dayNum < 1 || dayNum > last.getDate()) {
      html += `<div class="calendar-day calendar-day-empty"></div>`;
      continue;
    }

    const date = new Date(year, month, dayNum);
    const key = toISODate(date);

    const plans = data.planner.filter(plan => plan.date === key).slice(0, 2);
    const exams = data.subjects.filter(subject => subject.examDate === key).slice(0, 1);

    html += `
      <div class="calendar-day ${key === todayKey ? "today" : ""}">
        <div class="calendar-day-top">
          <span class="calendar-day-number">${dayNum}</span>
        </div>

        <div class="calendar-day-content">
          ${exams.map(subject => `<div class="calendar-exam">${escapeHtml(subject.name)}</div>`).join("")}
          ${plans.map(plan => `<div class="calendar-event">${escapeHtml(plan.time)} · ${escapeHtml(plan.title)}</div>`).join("")}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

function openModal(html) {
  document.getElementById("modalPanel").innerHTML = html;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("modalPanel").innerHTML = "";
}

function subjectOptions(selectedId) {
  return data.subjects
    .map(
      subject => `
        <option value="${subject.id}" ${selectedId === subject.id ? "selected" : ""}>
          ${escapeHtml(subject.name)}
        </option>
      `
    )
    .join("");
}

function openSubjectModal(id = null) {
  const subject = id ? getSubject(id) : null;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>${subject ? "Edit subject" : "Add subject"}</h2>
        <p class="tiny muted">Set exam date, progress, and weekly target.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="subjectForm" class="form-grid" style="margin-top:16px;">
      <div class="span-12">
        <label class="tiny muted">Subject name</label>
        <input class="input" name="name" required value="${subject ? escapeHtml(subject.name) : ""}" />
      </div>
      <div class="span-6">
        <label class="tiny muted">Exam date</label>
        <input class="input" type="date" name="examDate" required value="${subject?.examDate || todayISO()}" />
      </div>
      <div class="span-3">
        <label class="tiny muted">Progress %</label>
        <input class="input" type="number" min="0" max="100" name="progress" required value="${subject?.progress ?? 0}" />
      </div>
      <div class="span-3">
        <label class="tiny muted">Target hours/week</label>
        <input class="input" type="number" min="1" max="40" name="targetHours" required value="${subject?.targetHours ?? 4}" />
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">${subject ? "Save subject" : "Create subject"}</button>
      </div>
    </form>
  `);

  document.getElementById("subjectForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    const payload = {
      id: subject?.id || uid(),
      name: String(form.get("name")).trim(),
      examDate: String(form.get("examDate")),
      progress: Number(form.get("progress")),
      targetHours: Number(form.get("targetHours"))
    };

    if (!payload.name) return;

    if (subject) {
      data.subjects = data.subjects.map(item => (item.id === subject.id ? payload : item));
    } else {
      data.subjects.unshift(payload);
    }

    saveData();
    closeModal();
    renderApp();
  };
}

function openTaskModal(id = null) {
  if (requireSubjectFirst()) return;
  const task = id ? data.tasks.find(item => item.id === id) : null;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>${task ? "Edit task" : "Add task"}</h2>
        <p class="tiny muted">Organise by subject, deadline, and priority.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="taskForm" class="form-grid" style="margin-top:16px;">
      <div class="span-12">
        <label class="tiny muted">Task title</label>
        <input class="input" name="title" required value="${task ? escapeHtml(task.title) : ""}" />
      </div>
      <div class="span-4">
        <label class="tiny muted">Subject</label>
        <select class="select" name="subjectId">${subjectOptions(task?.subjectId || data.subjects[0]?.id)}</select>
      </div>
      <div class="span-4">
        <label class="tiny muted">Due date</label>
        <input class="input" type="date" name="dueDate" required value="${task?.dueDate || todayISO()}" />
      </div>
      <div class="span-4">
        <label class="tiny muted">Priority</label>
        <select class="select" name="priority">
          ${["High", "Medium", "Low"].map(level => `<option ${task?.priority === level ? "selected" : ""}>${level}</option>`).join("")}
        </select>
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">${task ? "Save task" : "Create task"}</button>
      </div>
    </form>
  `);

  document.getElementById("taskForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    const payload = {
      id: task?.id || uid(),
      title: String(form.get("title")).trim(),
      subjectId: String(form.get("subjectId")),
      dueDate: String(form.get("dueDate")),
      priority: String(form.get("priority")),
      completed: task?.completed || false
    };

    if (!payload.title) return;

    if (task) {
      data.tasks = data.tasks.map(item => (item.id === task.id ? payload : item));
    } else {
      data.tasks.unshift(payload);
    }

    saveData();
    closeModal();
    renderApp();
  };
}

function openNoteModal(id = null) {
  if (requireSubjectFirst()) return;
  const note = id ? data.notes.find(item => item.id === id) : null;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>${note ? "Edit note" : "Add note"}</h2>
        <p class="tiny muted">Store summary notes and key points.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="noteForm" class="form-grid" style="margin-top:16px;">
      <div class="span-12">
        <label class="tiny muted">Note title</label>
        <input class="input" name="title" required value="${note ? escapeHtml(note.title) : ""}" />
      </div>
      <div class="span-4">
        <label class="tiny muted">Subject</label>
        <select class="select" name="subjectId">${subjectOptions(note?.subjectId || data.subjects[0]?.id)}</select>
      </div>
      <div class="span-12">
        <label class="tiny muted">Content</label>
        <textarea class="textarea" name="content" required>${note ? escapeHtml(note.content) : ""}</textarea>
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">${note ? "Save note" : "Create note"}</button>
      </div>
    </form>
  `);

  document.getElementById("noteForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    const payload = {
      id: note?.id || uid(),
      title: String(form.get("title")).trim(),
      subjectId: String(form.get("subjectId")),
      content: String(form.get("content")).trim(),
      updatedAt: new Date().toISOString()
    };

    if (!payload.title || !payload.content) return;

    if (note) {
      data.notes = data.notes.map(item => (item.id === note.id ? payload : item));
    } else {
      data.notes.unshift(payload);
    }

    saveData();
    closeModal();
    renderApp();
  };
}

function openPlannerModal(id = null) {
  if (requireSubjectFirst()) return;
  const plan = id ? data.planner.find(item => item.id === id) : null;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>${plan ? "Edit plan" : "Add plan"}</h2>
        <p class="tiny muted">Create a revision block with date and time.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="plannerForm" class="form-grid" style="margin-top:16px;">
      <div class="span-12">
        <label class="tiny muted">Plan title</label>
        <input class="input" name="title" required value="${plan ? escapeHtml(plan.title) : ""}" />
      </div>
      <div class="span-4">
        <label class="tiny muted">Subject</label>
        <select class="select" name="subjectId">${subjectOptions(plan?.subjectId || data.subjects[0]?.id)}</select>
      </div>
      <div class="span-4">
        <label class="tiny muted">Date</label>
        <input class="input" type="date" name="date" required value="${plan?.date || todayISO()}" />
      </div>
      <div class="span-4">
        <label class="tiny muted">Time</label>
        <input class="input" type="time" name="time" required value="${plan?.time || "17:00"}" />
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">${plan ? "Save plan" : "Create plan"}</button>
      </div>
    </form>
  `);

  document.getElementById("plannerForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    const payload = {
      id: plan?.id || uid(),
      title: String(form.get("title")).trim(),
      subjectId: String(form.get("subjectId")),
      date: String(form.get("date")),
      time: String(form.get("time"))
    };

    if (!payload.title) return;

    if (plan) {
      data.planner = data.planner.map(item => (item.id === plan.id ? payload : item));
    } else {
      data.planner.push(payload);
    }

    saveData();
    closeModal();
    renderApp();
  };
}

function openSessionModal() {
  if (requireSubjectFirst()) return;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>Log study session</h2>
        <p class="tiny muted">Record completed study time.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="sessionForm" class="form-grid" style="margin-top:16px;">
      <div class="span-4">
        <label class="tiny muted">Subject</label>
        <select class="select" name="subjectId">${subjectOptions(data.subjects[0]?.id)}</select>
      </div>
      <div class="span-4">
        <label class="tiny muted">Minutes</label>
        <input class="input" type="number" min="5" max="600" name="duration" value="${state.timerMode === "pomodoro" ? data.settings.pomodoro : 30}" required />
      </div>
      <div class="span-4">
        <label class="tiny muted">Type</label>
        <select class="select" name="type">
          <option>Focus Session</option>
          <option>Flashcards</option>
          <option>Past Paper</option>
          <option>Essay Practice</option>
          <option>Reading Review</option>
        </select>
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">Save session</button>
      </div>
    </form>
  `);

  document.getElementById("sessionForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    data.sessions.unshift({
      id: uid(),
      subjectId: String(form.get("subjectId")),
      duration: Number(form.get("duration")),
      date: todayISO(),
      type: String(form.get("type"))
    });

    saveData();
    closeModal();
    renderApp();
  };
}

function openFlashcardModal() {
  if (requireSubjectFirst()) return;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>Add flashcard</h2>
        <p class="tiny muted">Create a front and back recall card.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="flashcardForm" class="form-grid" style="margin-top:16px;">
      <div class="span-4">
        <label class="tiny muted">Subject</label>
        <select class="select" name="subjectId">${subjectOptions(data.subjects[0]?.id)}</select>
      </div>
      <div class="span-12">
        <label class="tiny muted">Front</label>
        <input class="input" name="front" required />
      </div>
      <div class="span-12">
        <label class="tiny muted">Back</label>
        <textarea class="textarea" name="back" required></textarea>
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">Create flashcard</button>
      </div>
    </form>
  `);

  document.getElementById("flashcardForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    const payload = {
      id: uid(),
      subjectId: String(form.get("subjectId")),
      front: String(form.get("front")).trim(),
      back: String(form.get("back")).trim()
    };

    if (!payload.front || !payload.back) return;

    data.flashcards.unshift(payload);
    state.currentFlashcardId = payload.id;
    state.flashcardShowingBack = false;

    saveData();
    closeModal();
    renderApp();
  };
}

function openGoalModal(id = null) {
  const goal = id ? data.goals.find(item => item.id === id) : null;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>${goal ? "Edit goal" : "Add goal"}</h2>
        <p class="tiny muted">Set a bigger revision target.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="goalForm" class="form-grid" style="margin-top:16px;">
      <div class="span-12">
        <label class="tiny muted">Goal</label>
        <input class="input" name="text" required value="${goal ? escapeHtml(goal.text) : ""}" />
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">${goal ? "Save goal" : "Create goal"}</button>
      </div>
    </form>
  `);

  document.getElementById("goalForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    const payload = {
      id: goal?.id || uid(),
      text: String(form.get("text")).trim(),
      done: goal?.done || false
    };

    if (!payload.text) return;

    if (goal) {
      data.goals = data.goals.map(item => (item.id === goal.id ? payload : item));
    } else {
      data.goals.unshift(payload);
    }

    saveData();
    closeModal();
    renderApp();
  };
}

function openPersonalGoalModal(id = null) {
  const goal = id ? data.personalGoals.find(item => item.id === id) : null;

  openModal(`
    <div class="modal-top">
      <div>
        <h2>${goal ? "Edit personal goal" : "Add personal goal"}</h2>
        <p class="tiny muted">Examples: gym, sleep, walking, prayer, Qur'an, routine.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="personalGoalForm" class="form-grid" style="margin-top:16px;">
      <div class="span-12">
        <label class="tiny muted">Goal</label>
        <input class="input" name="text" required value="${goal ? escapeHtml(goal.text) : ""}" />
      </div>
      <div class="span-6">
        <label class="tiny muted">Category</label>
        <select class="select" name="category">
          ${["Health", "Faith", "Life"].map(category => `<option ${goal?.category === category ? "selected" : ""}>${category}</option>`).join("")}
        </select>
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">${goal ? "Save goal" : "Create goal"}</button>
      </div>
    </form>
  `);

  document.getElementById("personalGoalForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    const payload = {
      id: goal?.id || uid(),
      text: String(form.get("text")).trim(),
      category: String(form.get("category") || "Life"),
      done: goal?.done || false
    };

    if (!payload.text) return;

    if (goal) {
      data.personalGoals = data.personalGoals.map(item => (item.id === goal.id ? payload : item));
    } else {
      data.personalGoals.unshift(payload);
    }

    saveData();
    closeModal();
    renderApp();
  };
}

function openSettingsModal() {
  openModal(`
    <div class="modal-top">
      <div>
        <h2>Timer settings</h2>
        <p class="tiny muted">Change your Pomodoro and break lengths.</p>
      </div>
      <button class="secondary-btn" type="button" onclick="closeModal()">Close</button>
    </div>

    <form id="settingsForm" class="form-grid" style="margin-top:16px;">
      <div class="span-4">
        <label class="tiny muted">Pomodoro</label>
        <input class="input" type="number" min="5" max="120" name="pomodoro" value="${data.settings.pomodoro}" required />
      </div>
      <div class="span-4">
        <label class="tiny muted">Short break</label>
        <input class="input" type="number" min="1" max="60" name="shortBreak" value="${data.settings.shortBreak}" required />
      </div>
      <div class="span-4">
        <label class="tiny muted">Long break</label>
        <input class="input" type="number" min="5" max="90" name="longBreak" value="${data.settings.longBreak}" required />
      </div>
      <div class="span-12 row" style="justify-content:flex-end;">
        <button class="primary-btn" type="submit">Save settings</button>
      </div>
    </form>
  `);

  document.getElementById("settingsForm").onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);

    data.settings.pomodoro = Number(form.get("pomodoro"));
    data.settings.shortBreak = Number(form.get("shortBreak"));
    data.settings.longBreak = Number(form.get("longBreak"));

    saveData();
    closeModal();
    resetTimer();
  };
}

function toggleTask(id) {
  data.tasks = data.tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task));
  saveData();
  renderApp();
}

function deleteTask(id) {
  data.tasks = data.tasks.filter(task => task.id !== id);
  saveData();
  renderApp();
}

function deleteNote(id) {
  data.notes = data.notes.filter(note => note.id !== id);
  saveData();
  renderApp();
}

function deletePlan(id) {
  data.planner = data.planner.filter(plan => plan.id !== id);
  saveData();
  renderApp();
}

function deleteSubject(id) {
  const subject = getSubject(id);
  if (!subject) return;

  const ok = confirm(`Delete ${subject.name}? Linked tasks, notes, plans, sessions, and flashcards for this subject will also be removed.`);
  if (!ok) return;

  data.subjects = data.subjects.filter(item => item.id !== id);
  data.tasks = data.tasks.filter(item => item.subjectId !== id);
  data.notes = data.notes.filter(item => item.subjectId !== id);
  data.planner = data.planner.filter(item => item.subjectId !== id);
  data.sessions = data.sessions.filter(item => item.subjectId !== id);
  data.flashcards = data.flashcards.filter(item => item.subjectId !== id);

  saveData();
  renderApp();
}

function toggleGoal(id) {
  data.goals = data.goals.map(goal => (goal.id === id ? { ...goal, done: !goal.done } : goal));
  saveData();
  renderApp();
}

function deleteGoal(id) {
  data.goals = data.goals.filter(goal => goal.id !== id);
  saveData();
  renderApp();
}

function togglePersonalGoal(id) {
  data.personalGoals = data.personalGoals.map(goal => (goal.id === id ? { ...goal, done: !goal.done } : goal));
  saveData();
  renderApp();
}

function deletePersonalGoal(id) {
  data.personalGoals = data.personalGoals.filter(goal => goal.id !== id);
  saveData();
  renderApp();
}

function selectFlashcard(id) {
  state.currentFlashcardId = id;
  state.flashcardShowingBack = false;
  renderApp();
}

function deleteFlashcard(id) {
  data.flashcards = data.flashcards.filter(card => card.id !== id);

  if (state.currentFlashcardId === id) {
    state.currentFlashcardId = data.flashcards[0]?.id || null;
    state.flashcardShowingBack = false;
  }

  saveData();
  renderApp();
}

function flipFlashcard() {
  state.flashcardShowingBack = !state.flashcardShowingBack;
  renderApp();
}

function nextFlashcard() {
  const filteredCards = data.flashcards.filter(card =>
    state.flashcardSubjectFilter === "all" ? true : card.subjectId === state.flashcardSubjectFilter
  );

  if (!filteredCards.length) return;

  const index = filteredCards.findIndex(card => card.id === state.currentFlashcardId);
  const next = filteredCards[(index + 1) % filteredCards.length];
  state.currentFlashcardId = next.id;
  state.flashcardShowingBack = false;
  renderApp();
}

function setTaskFilter(filter) {
  state.taskFilter = filter;
  renderApp();
}

function setSubjectFilter(filter) {
  state.subjectFilter = filter;
  renderApp();
}

function setNoteSubjectFilter(filter) {
  state.noteSubjectFilter = filter;
  renderApp();
}

function setFlashcardSubjectFilter(filter) {
  state.flashcardSubjectFilter = filter;
  state.currentFlashcardId = null;
  state.flashcardShowingBack = false;
  renderApp();
}

function switchTimerMode(mode) {
  state.timerMode = mode;
  state.timerRunning = false;
  clearInterval(state.timerInterval);

  if (mode === "pomodoro") state.timerRemaining = data.settings.pomodoro * 60;
  if (mode === "short") state.timerRemaining = data.settings.shortBreak * 60;
  if (mode === "long") state.timerRemaining = data.settings.longBreak * 60;

  renderApp();
}

function toggleTimer() {
  state.timerRunning = !state.timerRunning;

  if (state.timerRunning) {
    state.timerInterval = setInterval(() => {
      state.timerRemaining -= 1;

      if (state.timerRemaining <= 0) {
        clearInterval(state.timerInterval);
        state.timerRunning = false;
        state.timerRemaining = 0;
        renderApp();
        alert(state.timerMode === "pomodoro" ? "Pomodoro complete. Great work." : "Break complete.");
        return;
      }

      const timerValue = document.getElementById("timerValue");
      if (timerValue) timerValue.textContent = formatTimer(state.timerRemaining);
    }, 1000);
  } else {
    clearInterval(state.timerInterval);
  }

  renderApp();
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning = false;
  switchTimerMode(state.timerMode);
}

function resetData() {
  const ok = confirm("Reset the whole app? This clears all saved data from this browser.");
  if (!ok) return;

  clearInterval(state.timerInterval);
  data = createFreshData();

  state.view = "dashboard";
  state.taskFilter = "all";
  state.subjectFilter = "all";
  state.noteSubjectFilter = "all";
  state.flashcardSubjectFilter = "all";
  state.timerMode = "pomodoro";
  state.timerRunning = false;
  state.timerRemaining = data.settings.pomodoro * 60;
  state.currentFlashcardId = null;
  state.flashcardShowingBack = false;
  state.prayerLoading = false;
  state.prayerError = "";
  state.prayerData = null;

  saveData();
  renderApp();
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `revision-bloom-backup-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function triggerImport() {
  const input = document.getElementById("importFile");
  if (input) input.click();
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      data = normaliseData(parsed);
      saveData();
      renderApp();
      alert("Import complete.");
    } catch {
      alert("That file could not be imported.");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

function syncSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  sidebar.classList.toggle("open", state.sidebarOpen);
}

function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  syncSidebar();
}

async function loadPrayerTimes() {
  if (!window.isSecureContext) {
    state.prayerLoading = false;
    state.prayerData = null;
    state.prayerError = "Location only works on HTTPS or localhost. Open this with Live Server in VS Code.";
    renderApp();
    return;
  }

  if (!navigator.geolocation) {
    state.prayerError = "Geolocation is not supported in this browser.";
    state.prayerLoading = false;
    state.prayerData = null;
    renderApp();
    return;
  }

  state.prayerLoading = true;
  state.prayerError = "";
  renderApp();

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        const { latitude, longitude } = position.coords;

        const response = await fetch(
          `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`
        );

        if (!response.ok) {
          throw new Error("Prayer times could not be loaded.");
        }

        const json = await response.json();
        const timings = json?.data?.timings;

        if (!timings) {
          throw new Error("Prayer times were not returned.");
        }

        let locationLabel = `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`;

        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          if (geoResponse.ok) {
            const geoJson = await geoResponse.json();
            const address = geoJson?.address || {};
            const place =
              address.city ||
              address.town ||
              address.village ||
              address.county ||
              "";
            const country = address.country || "";

            const pretty = [place, country].filter(Boolean).join(", ");
            if (pretty) locationLabel = pretty;
          }
        } catch {
          // keep fallback location label
        }

        state.prayerData = {
  latitude,
  longitude,
  locationLabel,
  timings,
  dateLoaded: todayISO() 
};
        state.prayerLoading = false;
        state.prayerError = "";
        renderApp();
      } catch (error) {
        state.prayerLoading = false;
        state.prayerData = null;
        state.prayerError = error?.message || "Could not load prayer times.";
        renderApp();
      }
    },
    error => {
      state.prayerLoading = false;
      state.prayerData = null;

      if (error.code === 1) {
        state.prayerError = "Location permission was denied. Allow location in the browser and try again.";
      } else if (error.code === 2) {
        state.prayerError = "Your location could not be found.";
      } else if (error.code === 3) {
        state.prayerError = "Location request timed out. Try again.";
      } else {
        state.prayerError = "Could not access your location.";
      }

      renderApp();
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000
    }
  );
}

function openNearbyMosques() {
  if (!state.prayerData) return;
  const { latitude, longitude } = state.prayerData;
  const url = `https://www.google.com/maps/search/mosque/@${latitude},${longitude},14z`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function bindStaticActions() {
  const resetBtn = document.getElementById("resetDataBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const modal = document.getElementById("modal");

  if (resetBtn) resetBtn.onclick = resetData;
  if (exportBtn) exportBtn.onclick = exportData;
  if (importBtn) importBtn.onclick = triggerImport;
  if (importFile) importFile.onchange = handleImportFile;
  if (sidebarToggle) sidebarToggle.onclick = toggleSidebar;

  if (modal) {
    modal.onclick = event => {
      if (event.target.id === "modal") closeModal();
    };
  }
}

function renderApp() {
  renderNav();
  renderSidebarInfo();
  renderViewHeader();
  syncSidebar();

  const container = document.getElementById("viewContainer");
  if (!container) return;

  if (state.view === "dashboard") container.innerHTML = renderDashboard();
  if (state.view === "subjects") container.innerHTML = renderSubjects();
  if (state.view === "tasks") container.innerHTML = renderTasks();
  if (state.view === "notes") container.innerHTML = renderNotes();
  if (state.view === "planner") container.innerHTML = renderPlanner();
  if (state.view === "exams") container.innerHTML = renderExams();
  if (state.view === "timer") container.innerHTML = renderTimer();
  if (state.view === "flashcards") container.innerHTML = renderFlashcards();
  if (state.view === "goals") container.innerHTML = renderGoals();
  if (state.view === "personal") container.innerHTML = renderPersonal();
  if (state.view === "prayer") container.innerHTML = renderPrayer();

  bindStaticActions();
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

window.setView = setView;
window.openSubjectModal = openSubjectModal;
window.openTaskModal = openTaskModal;
window.openNoteModal = openNoteModal;
window.openPlannerModal = openPlannerModal;
window.openSessionModal = openSessionModal;
window.openFlashcardModal = openFlashcardModal;
window.openGoalModal = openGoalModal;
window.openPersonalGoalModal = openPersonalGoalModal;
window.openSettingsModal = openSettingsModal;
window.closeModal = closeModal;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.deleteNote = deleteNote;
window.deletePlan = deletePlan;
window.deleteSubject = deleteSubject;
window.toggleGoal = toggleGoal;
window.deleteGoal = deleteGoal;
window.togglePersonalGoal = togglePersonalGoal;
window.deletePersonalGoal = deletePersonalGoal;
window.selectFlashcard = selectFlashcard;
window.deleteFlashcard = deleteFlashcard;
window.flipFlashcard = flipFlashcard;
window.nextFlashcard = nextFlashcard;
window.setTaskFilter = setTaskFilter;
window.setSubjectFilter = setSubjectFilter;
window.setNoteSubjectFilter = setNoteSubjectFilter;
window.setFlashcardSubjectFilter = setFlashcardSubjectFilter;
window.switchTimerMode = switchTimerMode;
window.toggleTimer = toggleTimer;
window.resetTimer = resetTimer;
window.loadPrayerTimes = loadPrayerTimes;
window.openNearbyMosques = openNearbyMosques;

setInterval(() => {
  const today = todayISO();

  // refresh prayer times daily
  if (state.prayerData && state.prayerData.dateLoaded !== today) {
    state.prayerData = null;
  }

  // re-render key views
  if (state.view === "planner" || state.view === "dashboard") {
    renderApp();
  }
}, 30000);

saveData();
renderApp();
