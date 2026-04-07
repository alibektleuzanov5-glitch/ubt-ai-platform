const API_URL = "https://ubt-math-api.onrender.com/api";
let currentTopic = "";
let currentQuizData = [];
let currentQuizIndex = 0;
let correctAnswers = 0;

function toggleForms() {
    document.getElementById("loginForm").classList.toggle("hidden");
    document.getElementById("regForm").classList.toggle("hidden");
    const title = document.getElementById("pageTitle");
    title.innerText = title.innerText === "Жүйеге кіру" ? "Жаңа аккаунт ашу" : "Жүйеге кіру";
}

function updateStats(newXP, newStreak) {
    const name = localStorage.getItem("userName");
    let xp = newXP !== undefined ? newXP : (localStorage.getItem("userXP") || 0);
    let streak = newStreak !== undefined ? newStreak : (localStorage.getItem("userStreak") || 0);
    localStorage.setItem("userXP", xp);
    localStorage.setItem("userStreak", streak);
    document.getElementById("userInfo").innerHTML = `Сәлем, <b>${name}</b>! <span class="xp-badge">🏆 ${xp} XP</span> <span class="streak-badge">🔥 ${streak} күн</span>`;
}

// Табтарды ауыстыру функциясы (Басты бет, Сабақ, Сынақ тест)
function switchTab(tabId) {
    ["dashboardView", "lessonView", "examView"].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });
    document.getElementById(tabId).classList.remove("hidden");
}

async function login() {
    const res = await fetch(`${API_URL}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: document.getElementById("loginEmail").value, password: document.getElementById("loginPass").value }) });
    const data = await res.json();
    if (data.access_token) { localStorage.setItem("token", data.access_token); localStorage.setItem("userName", data.name); localStorage.setItem("userXP", data.xp); localStorage.setItem("userStreak", data.streak); window.location.reload(); } else { alert("Қате!"); }
}

async function register() {
    const res = await fetch(`${API_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: document.getElementById("regName").value, email: document.getElementById("regEmail").value, password: document.getElementById("regPass").value }) });
    if (res.ok) { alert("Тіркелдіңіз!"); toggleForms(); } else { alert("Қате кетті"); }
}

function logout() { localStorage.clear(); window.location.reload(); }

async function loadCourses() {
    const container = document.getElementById("coursesContainer");
    const res = await fetch(`${API_URL}/courses-full`);
    const courses = await res.json();
    container.innerHTML = "";
    courses.forEach(course => {
        let modulesHTML = course.modules.map(mod => `
            <div class="module-box">
                <div class="module-header" onclick="this.nextElementSibling.classList.toggle('hidden')">📂 ${mod.title}</div>
                <div class="lessons-list hidden">
                    ${mod.lessons.map(l => `<div class="lesson-item" onclick="openLesson('${l.title.replace(/'/g, "\\'")}')">▶️ ${l.title}</div>`).join("")}
                </div>
            </div>
        `).join("");
        container.innerHTML += `<div class="course-card"><div class="course-header" onclick="this.nextElementSibling.classList.toggle('hidden')"><img src="${course.image_url}"><div style="flex-grow:1;"><h4 style="margin:0;">${course.title}</h4></div></div><div class="course-body hidden">${modulesHTML}</div></div>`;
    });
}

function openLesson(title) {
    currentTopic = title;
    switchTab('lessonView');
    document.getElementById("lessonTitleDisplay").innerText = title;
    document.getElementById("lessonContentDisplay").innerHTML = "Тақырып конспектісі. Мұнда формулалар болады. <br><br><b>Маңызды:</b> Тақырыпты бекіту үшін төмендегі 'Тест тапсыру' батырмасын басыңыз!";
    document.getElementById("quizSection").classList.add("hidden");
}

async function startAiQuiz() {
    const quizSec = document.getElementById("quizSection");
    quizSec.classList.remove("hidden");
    document.getElementById("quizQuestion").innerText = "ЖИ сізге арнайы сұрақтар құрастырып жатыр... ⏳";
    document.getElementById("quizOptions").innerHTML = "";
    document.getElementById("nextQuizBtn").classList.add("hidden");
    
    currentQuizIndex = 0; correctAnswers = 0;
    
    const res = await fetch(`${API_URL}/generate-quiz`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: currentTopic }) });
    const data = await res.json();
    currentQuizData = data.quiz;
    renderQuizQuestion();
}

function renderQuizQuestion() {
    if(currentQuizIndex >= currentQuizData.length) {
        document.getElementById("quizQuestion").innerText = `🎉 Тест аяқталды! Дұрыс жауаптар: ${correctAnswers}/${currentQuizData.length}. Сізге +${correctAnswers*10} XP қосылды!`;
        document.getElementById("quizOptions").innerHTML = "";
        document.getElementById("nextQuizBtn").classList.add("hidden");
        // Бэкендке XP қосу сұранысын жіберу
        if(correctAnswers > 0) fetch(`${API_URL}/add-xp`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ points: correctAnswers * 10 }) }).then(r=>r.json()).then(d=>{ if(d.new_xp) updateStats(d.new_xp); });
        return;
    }
    const q = currentQuizData[currentQuizIndex];
    document.getElementById("quizQuestion").innerText = `${currentQuizIndex + 1}. ${q.q}`;
    let optsHTML = "";
    q.options.forEach(opt => {
        optsHTML += `<div class="quiz-opt" onclick="checkQuizAnswer(this, '${opt.replace(/'/g, "\\'")}', '${q.ans.replace(/'/g, "\\'")}')">${opt}</div>`;
    });
    document.getElementById("quizOptions").innerHTML = optsHTML;
    document.getElementById("nextQuizBtn").classList.add("hidden");
}

function checkQuizAnswer(div, selected, correct) {
    if(!document.getElementById("nextQuizBtn").classList.contains("hidden")) return; // Қайта басудан қорғау
    if(selected.includes(correct) || correct.includes(selected)) {
        div.style.background = "#10b981"; div.style.color = "white"; correctAnswers++;
    } else {
        div.style.background = "#ef4444"; div.style.color = "white";
    }
    document.getElementById("nextQuizBtn").classList.remove("hidden");
}

function nextQuizQuestion() { currentQuizIndex++; renderQuizQuestion(); }
function completeLesson() { alert("Сабақ аяқталды! +50 XP"); switchTab('dashboardView'); }
const toBase64 = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); });
async function sendChat() { /* ... Бұрынғы Чат коды сол күйінде істей береді ... */ }

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem("token")) {
        document.getElementById("authContainer").classList.add("hidden");
        document.getElementById("mainContent").classList.remove("hidden");
        updateStats(); loadCourses();
    }
});