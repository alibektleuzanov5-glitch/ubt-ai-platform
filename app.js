const API_URL = "https://ubt-math-api.onrender.com/api";
let userQuestions = [];
let currentTopic = "";
let currentQuizData = [];
let currentQuizIndex = 0;
let correctAnswers = 0;

// ==================== АВТОРИЗАЦИЯ ЖӘНЕ СТАТИСТИКА ====================
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

function switchTab(tabId) {
    ["dashboardView", "lessonView", "examView"].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });
    document.getElementById(tabId).classList.remove("hidden");
    document.getElementById("lessonVideo").src = ""; // Видеоны тоқтату
}

async function login() {
    const res = await fetch(`${API_URL}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: document.getElementById("loginEmail").value, password: document.getElementById("loginPass").value }) });
    const data = await res.json();
    if (data.access_token) { localStorage.setItem("token", data.access_token); localStorage.setItem("userName", data.name); localStorage.setItem("userXP", data.xp); localStorage.setItem("userStreak", data.streak); window.location.reload(); } else { alert(data.detail || "Қате!"); }
}

async function register() {
    const res = await fetch(`${API_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: document.getElementById("regName").value, email: document.getElementById("regEmail").value, password: document.getElementById("regPass").value }) });
    if (res.ok) { alert("Тіркелдіңіз!"); toggleForms(); } else { const data = await res.json(); alert(data.detail || "Қате кетті"); }
}

function logout() { localStorage.clear(); window.location.reload(); }

// ==================== КУРСТАР ====================
async function loadCourses() {
    const container = document.getElementById("coursesContainer");
    try {
        const res = await fetch(`${API_URL}/courses-full`);
        const courses = await res.json();
        if (courses.length === 0) return;
        container.innerHTML = "";

        courses.forEach(course => {
            let modulesHTML = course.modules.map(mod => `
                <div class="module-box">
                    <div class="module-header" onclick="this.nextElementSibling.classList.toggle('hidden')">📂 ${mod.title}</div>
                    <div class="lessons-list hidden">
                        ${mod.lessons.map(l => {
                            const safeTitle = l.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                            const safeVideo = l.video_url || "";
                            return `<div class="lesson-item" onclick="openLesson('${safeTitle}', '${safeVideo}')">▶️ ${l.title}</div>`;
                        }).join("")}
                    </div>
                </div>
            `).join("");

            container.innerHTML += `
                <div class="course-card">
                    <div class="course-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                        <img src="${course.image_url}">
                        <div style="flex-grow:1;"><h4 style="margin:0; color:#1e293b;">${course.title}</h4><small style="color:#64748b;">${course.modules.length} модуль</small></div>
                        <span style="color:#94a3b8;">▼</span>
                    </div>
                    <div class="course-body hidden">${modulesHTML}</div>
                </div>`;
        });
    } catch (err) { console.error(err); }
}

function openLesson(title, videoUrl) {
    currentTopic = title;
    switchTab('lessonView');
    document.getElementById("lessonTitleDisplay").innerText = title;
    document.getElementById("lessonContentDisplay").innerHTML = "Тақырып конспектісі. Мұнда формулалар болады. <br><br><b>Маңызды:</b> Тақырыпты бекіту үшін төмендегі 'Тест тапсыру' батырмасын басыңыз!";
    document.getElementById("quizSection").classList.add("hidden");
    
    const videoContainer = document.getElementById("videoContainer");
    const videoFrame = document.getElementById("lessonVideo");
    if (videoUrl && videoUrl.includes("youtube.com")) {
        videoFrame.src = videoUrl.replace("watch?v=", "embed/");
        videoContainer.style.display = "block";
    } else {
        videoFrame.src = "";
        videoContainer.style.display = "none";
    }
}

function completeLesson() { alert("Тамаша жұмыс! +50 XP"); let xp = parseInt(localStorage.getItem("userXP")||0); updateStats(xp+50, undefined); switchTab('dashboardView'); }

// ==================== ЖИ ТАҚЫРЫПТЫҚ ТЕСТ (AI QUIZ) ====================
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
        if(correctAnswers > 0) fetch(`${API_URL}/add-xp`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ points: correctAnswers * 10 }) }).then(r=>r.json()).then(d=>{ if(d.new_xp) updateStats(d.new_xp); });
        return;
    }
    const q = currentQuizData[currentQuizIndex];
    document.getElementById("quizQuestion").innerText = `${currentQuizIndex + 1}. ${q.q}`;
    let optsHTML = "";
    q.options.forEach(opt => { optsHTML += `<div class="quiz-opt" onclick="checkQuizAnswer(this, '${opt.replace(/'/g, "\\'")}', '${q.ans.replace(/'/g, "\\'")}')">${opt}</div>`; });
    document.getElementById("quizOptions").innerHTML = optsHTML;
    document.getElementById("nextQuizBtn").classList.add("hidden");
}

function checkQuizAnswer(div, selected, correct) {
    if(!document.getElementById("nextQuizBtn").classList.contains("hidden")) return;
    if(selected.includes(correct) || correct.includes(selected)) { div.style.background = "#10b981"; div.style.color = "white"; correctAnswers++; } 
    else { div.style.background = "#ef4444"; div.style.color = "white"; }
    document.getElementById("nextQuizBtn").classList.remove("hidden");
}
function nextQuizQuestion() { currentQuizIndex++; renderQuizQuestion(); }

// ==================== ҰБТ СЫНАҚ ТЕСТІ (MOCK EXAM) ====================
let examQuestions = [];
let currentExamIndex = 0;
let userAnswers = {};
let examTimerInterval;
let timeRemaining = 40 * 60; // 40 минут

const mockDatabase = [
    { q: "Төрт санның арифметикалық ортасы 15-ке тең. Егер осы сандарға 25 санын қосса, жаңа арифметикалық орта неше болады?", options: ["15", "17", "18", "20"], ans: "17" },
    { q: "Егер x + y = 10 және x - y = 4 болса, x * y нешеге тең?", options: ["21", "24", "25", "16"], ans: "21" },
    { q: "Циркуль мен сызғыштың көмегімен қандай бұрышты салуға БОЛМАЙДЫ?", options: ["30°", "45°", "50°", "60°"], ans: "50°" },
    { q: "Кітаптың 20%-ы 40 бет болса, кітапта барлығы неше бет бар?", options: ["100", "150", "200", "250"], ans: "200" },
    { q: "Тізбек заңдылығын табыңыз: 2, 6, 12, 20, 30, ... Келесі сан?", options: ["40", "42", "44", "46"], ans: "42" }
];

function generateMockQuestions() { examQuestions = []; for(let i=0; i<15; i++) { examQuestions.push(mockDatabase[i % mockDatabase.length]); } }

function startMockExam() {
    document.getElementById("examIntro").classList.add("hidden");
    document.getElementById("examActive").classList.remove("hidden");
    generateMockQuestions(); userAnswers = {}; currentExamIndex = 0; timeRemaining = 40 * 60;
    clearInterval(examTimerInterval); examTimerInterval = setInterval(updateTimer, 1000);
    renderExamNav(); showExamQuestion(0);
}

function updateTimer() {
    if (timeRemaining <= 0) { clearInterval(examTimerInterval); finishExam(); return; }
    timeRemaining--; let m = Math.floor(timeRemaining / 60); let s = timeRemaining % 60;
    document.getElementById("examTimer").innerText = `⏱️ ${m}:${s < 10 ? '0' : ''}${s}`;
}

function renderExamNav() {
    let navHTML = "";
    for(let i=0; i<15; i++) {
        let classes = "nav-btn";
        if (i === currentExamIndex) classes += " active";
        if (userAnswers[i] !== undefined && i !== currentExamIndex) classes += " answered";
        navHTML += `<button class="${classes}" onclick="showExamQuestion(${i})">${i+1}</button>`;
    }
    document.getElementById("examNav").innerHTML = navHTML;
}

function showExamQuestion(index) {
    currentExamIndex = index; const q = examQuestions[index];
    document.getElementById("examQuestionText").innerText = `${index + 1}. ${q.q}`;
    let optsHTML = "";
    q.options.forEach(opt => {
        let isSelected = userAnswers[index] === opt ? "background: var(--primary); color: white;" : "";
        optsHTML += `<div class="quiz-opt" style="${isSelected}" onclick="selectExamAnswer('${opt.replace(/'/g, "\\'")}')">${opt}</div>`;
    });
    document.getElementById("examOptions").innerHTML = optsHTML; renderExamNav();
}

function selectExamAnswer(answer) { userAnswers[currentExamIndex] = answer; showExamQuestion(currentExamIndex); }
function prevExamQuestion() { if(currentExamIndex > 0) showExamQuestion(currentExamIndex - 1); }
function nextExamQuestion() { if(currentExamIndex < 14) showExamQuestion(currentExamIndex + 1); }

function finishExam() {
    clearInterval(examTimerInterval);
    document.getElementById("examActive").classList.add("hidden"); document.getElementById("examResult").classList.remove("hidden");
    let score = 0; for(let i=0; i<15; i++) { if(userAnswers[i] === examQuestions[i].ans) score++; }
    document.getElementById("examScoreDisplay").innerText = `${score}/15`;
    let earnedXp = score * 20; document.getElementById("examFeedback").innerText = `Сіз ${score} сұраққа дұрыс жауап бердіңіз! +${earnedXp} XP 🏆`;
    if(earnedXp > 0) fetch(`${API_URL}/add-xp`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ points: earnedXp }) }).then(r=>r.json()).then(d=>{ if(d.new_xp) updateStats(d.new_xp); });
}

// ==================== ЖИ ЧАТ ====================
const toBase64 = file => new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); });
async function sendChat() {
    const input = document.getElementById("chatInput"); const imageInput = document.getElementById("imageInput"); const box = document.getElementById("chatBox");
    const msg = input.value.trim(); const file = imageInput.files[0];
    if (!msg && !file) return;
    if (msg) { userQuestions.push(msg); if (userQuestions.length > 5) userQuestions.shift(); }
    let payloadMessage = msg; let endpoint = `${API_URL}/chat`;
    if (file) { const base64 = await toBase64(file); payloadMessage = base64; endpoint = `${API_URL}/chat-vision`; box.innerHTML += `<div class="user-msg"><img src="${base64}" style="max-width:200px; border-radius:10px; margin-bottom:5px;"><br>${msg}</div>`; } 
    else { box.innerHTML += `<div class="user-msg">${msg}</div>`; }
    input.value = ""; imageInput.value = ""; box.scrollTop = box.scrollHeight;
    const loadingId = "load-" + Date.now(); box.innerHTML += `<div id="${loadingId}" class="bot-msg" style="color: gray;"><i>⏳ Ойланып жатырмын...</i></div>`; box.scrollTop = box.scrollHeight;
    const token = localStorage.getItem("token"); const headers = { "Content-Type": "application/json" }; if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
        const res = await fetch(endpoint, { method: "POST", headers: headers, body: JSON.stringify({ message: payloadMessage }) });
        const data = await res.json(); updateStats(data.new_xp, data.new_streak); document.getElementById(loadingId).remove();
        box.innerHTML += `<div class="bot-msg">${data.reply || "❌ Қате"}</div>`; box.scrollTop = box.scrollHeight; if (window.MathJax) MathJax.typesetPromise();
    } catch (err) { if(document.getElementById(loadingId)) document.getElementById(loadingId).remove(); box.innerHTML += `<div class="bot-msg" style="background:#fee2e2; color:red;">❌ Байланыс жоқ.</div>`; box.scrollTop = box.scrollHeight; }
}

async function analyzeMistakes() { /* ... Қатемен жұмыс ... */ }
async function showLeaderboard() { /* ... Рейтинг ... */ }

// Инициализация
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem("token")) { document.getElementById("authContainer").classList.add("hidden"); document.getElementById("mainContent").classList.remove("hidden"); updateStats(); loadCourses(); }
});