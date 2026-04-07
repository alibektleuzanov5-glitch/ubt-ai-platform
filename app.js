const API_URL = "https://ubt-math-api.onrender.com/api";
let userQuestions = []; let currentTopic = ""; let currentQuizData = []; let currentQuizIndex = 0; let correctAnswers = 0;
let examQuestions = []; let currentExamIndex = 0; let userAnswers = {}; let examTimerInterval; let timeRemaining = 40 * 60;
let progressChartInstance = null; 

// ЖАҢА: АУДИО МҰҒАЛІМ (TEXT-TO-SPEECH)
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Алдыңғысын тоқтату
        const msg = new SpeechSynthesisUtterance();
        // Маркдаун мен HTML тегтерін алып тастау үшін қарапайым тазалау
        msg.text = text.replace(/<[^>]*>?/gm, '').replace(/[*_#`]/g, '');
        msg.lang = 'kk-KZ'; // Қазақ тіліне тырысады, жоқ болса ru-RU
        msg.rate = 1.0; 
        window.speechSynthesis.speak(msg);
    } else { showToast("Кешіріңіз, сіздің браузеріңіз дыбысты қолдамайды.", "error"); }
}

// ЖАҢА: PRO MODAL БАСҚАРУ
function openProModal() { document.getElementById("proModal").classList.remove("hidden"); }
function closeProModal() { document.getElementById("proModal").classList.add("hidden"); }

// ЖАҢА: ЖЕТІСТІКТЕР (ACHIEVEMENTS) БАСҚАРУ
const achievementsList = [
    { id: "a1", icon: "🌱", title: "Алғашқы қадам", desc: "Жүйеге бірінші рет кіру", check: () => true },
    { id: "a2", icon: "🔥", title: "Тұрақтылық", desc: "Стрик 3 күнге жету", check: () => parseInt(localStorage.getItem("userStreak")||0) >= 3 },
    { id: "a3", icon: "🧠", title: "Білгір", desc: "500 XP жинау", check: () => parseInt(localStorage.getItem("userXP")||0) >= 500 },
    { id: "a4", icon: "📝", title: "Сынақ шебері", desc: "1 сынақ тест тапсыру", check: () => JSON.parse(localStorage.getItem("examHistory")||"[]").length >= 1 }
];
function checkAchievements() {
    let html = "";
    achievementsList.forEach(a => {
        let isUnlocked = a.check();
        // Жаңадан ашылса хабарлама беру (қарапайым логика)
        if(isUnlocked && !localStorage.getItem("ach_"+a.id)) {
            localStorage.setItem("ach_"+a.id, "true");
            setTimeout(() => showToast(`Жаңа жетістік: ${a.icon} ${a.title}!`, "success"), 2000);
        }
        html += `<div class="badge-card ${isUnlocked ? 'unlocked' : ''}"><div class="badge-icon">${a.icon}</div><div class="badge-title">${a.title}</div><div class="badge-desc">${a.desc}</div></div>`;
    });
    const box = document.getElementById("achievementsBox");
    if(box) box.innerHTML = html;
}

// POMODORO ТАЙМЕРІ
let pomoTime = 25 * 60; let pomoInterval = null; let isPomoRunning = false;
function togglePomodoro() {
    const btn = document.getElementById("pomoBtn");
    if(isPomoRunning) { clearInterval(pomoInterval); isPomoRunning = false; btn.innerText = "Жалғастыру"; btn.style.background = "#8b5cf6"; } 
    else {
        isPomoRunning = true; btn.innerText = "Тоқтату"; btn.style.background = "#ef4444";
        pomoInterval = setInterval(() => {
            if(pomoTime <= 0) { clearInterval(pomoInterval); showToast("Фокус уақыты бітті! Демалыңыз 🍅", "success"); pomoTime = 25*60; isPomoRunning=false; btn.innerText="Бастау"; btn.style.background="var(--primary)"; return; }
            pomoTime--; let m = Math.floor(pomoTime/60); let s = pomoTime%60;
            document.getElementById("pomoTime").innerText = `${m}:${s<10?'0':''}${s}`;
        }, 1000);
    }
}

function downloadPDF() {
    showToast("PDF дайындалуда...", "info"); const element = document.getElementById('lessonContentDisplay');
    const opt = { margin: 1, filename: `${currentTopic}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save().then(() => showToast("PDF сәтті жүктелді!", "success"));
}

function checkQuests() {
    let q1 = localStorage.getItem("quest1"); let q2 = localStorage.getItem("quest2"); let q3 = localStorage.getItem("quest3");
    if(q1) { document.getElementById("quest1").classList.add("completed"); document.getElementById("quest1").innerText = "✅ Жүйеге кіру (Орындалды)"; }
    if(q2) { document.getElementById("quest2").classList.add("completed"); document.getElementById("quest2").innerText = "✅ 1 сабақ оқу (Орындалды)"; }
    if(q3) { document.getElementById("quest3").classList.add("completed"); document.getElementById("quest3").innerText = "✅ 1 ЖИ тест (Орындалды)"; }
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if(isDark) { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); }
    else { document.body.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer'); const toast = document.createElement('div'); toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '🔔';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`; container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function toggleForms() { document.getElementById("loginForm").classList.toggle("hidden"); document.getElementById("regForm").classList.toggle("hidden"); const t = document.getElementById("pageTitle"); t.innerText = t.innerText === "Жүйеге кіру" ? "Жаңа аккаунт ашу" : "Жүйеге кіру"; }
function updateStats(newXP, newStreak) {
    const name = localStorage.getItem("userName"); let xp = newXP !== undefined ? newXP : (localStorage.getItem("userXP") || 0); let streak = newStreak !== undefined ? newStreak : (localStorage.getItem("userStreak") || 0);
    localStorage.setItem("userXP", xp); localStorage.setItem("userStreak", streak);
    document.getElementById("userInfo").innerHTML = `Сәлем, <b>${name}</b>! <span class="xp-badge">🏆 ${xp} XP</span> <span class="streak-badge">🔥 ${streak} күн</span>`;
    checkAchievements(); // XP немесе стрик жаңарғанда бадждарды тексеру
}

function switchTab(tabId) { ["dashboardView", "lessonView", "examView", "profileView", "leaderboardView"].forEach(id => { document.getElementById(id).classList.add("hidden"); }); document.getElementById(tabId).classList.remove("hidden"); document.getElementById("lessonVideo").src = ""; if(tabId === 'profileView') checkAchievements(); }

async function login() {
    const res = await fetch(`${API_URL}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: document.getElementById("loginEmail").value, password: document.getElementById("loginPass").value }) });
    const data = await res.json();
    if (data.access_token) { localStorage.setItem("token", data.access_token); localStorage.setItem("userName", data.name); localStorage.setItem("userXP", data.xp); localStorage.setItem("userStreak", data.streak); localStorage.setItem("quest1", "done"); window.location.reload(); } 
    else { showToast(data.detail || "Қате", "error"); }
}
async function register() {
    const res = await fetch(`${API_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: document.getElementById("regName").value, email: document.getElementById("regEmail").value, password: document.getElementById("regPass").value }) });
    if (res.ok) { showToast("Тіркелдіңіз!", "success"); toggleForms(); } else { const data = await res.json(); showToast(data.detail || "Қате", "error"); }
}
function logout() { localStorage.clear(); window.location.reload(); }

async function loadCourses() {
    const container = document.getElementById("coursesContainer");
    try {
        const res = await fetch(`${API_URL}/courses-full`); const courses = await res.json();
        if (courses.length === 0) return; container.innerHTML = "";
        courses.forEach(c => {
            let mods = c.modules.map(m => `<div class="module-box"><div class="module-header" onclick="this.nextElementSibling.classList.toggle('hidden')">📂 ${m.title}</div><div class="lessons-list hidden">${m.lessons.map(l => `<div class="lesson-item" onclick="openLesson('${l.title.replace(/'/g, "\\'")}', '${l.video_url || ""}')">▶️ ${l.title}</div>`).join("")}</div></div>`).join("");
            container.innerHTML += `<div class="course-card"><div class="course-header" onclick="this.nextElementSibling.classList.toggle('hidden')"><img src="${c.image_url}"><div style="flex-grow:1;"><h4 style="margin:0;">${c.title}</h4></div><span style="color:#94a3b8;">▼</span></div><div class="course-body hidden">${mods}</div></div>`;
        });
    } catch (err) { console.error(err); }
}

async function openLesson(title, videoUrl) {
    currentTopic = title; switchTab('lessonView'); document.getElementById("lessonTitleDisplay").innerText = title; document.getElementById("lessonContentDisplay").innerHTML = "<i style='color: #64748b;'>⏳ Конспект ЖИ арқылы жасалуда...</i>"; document.getElementById("quizSection").classList.add("hidden"); document.getElementById("flashcardsSection").classList.add("hidden");
    const vc = document.getElementById("videoContainer"); const vf = document.getElementById("lessonVideo");
    if (videoUrl && videoUrl.includes("youtube")) { vf.src = videoUrl.replace("watch?v=", "embed/"); vc.style.display = "block"; } else { vf.src = ""; vc.style.display = "none"; }
    try {
        const res = await fetch(`${API_URL}/generate-lesson`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: title }) });
        const data = await res.json();
        if(window.marked) { document.getElementById("lessonContentDisplay").innerHTML = marked.parse(data.content); } else { document.getElementById("lessonContentDisplay").innerText = data.content; }
        if(window.MathJax) { MathJax.typesetPromise(); }
    } catch (err) { document.getElementById("lessonContentDisplay").innerHTML = "<b style='color:red;'>❌ Қате.</b>"; }
}

function completeLesson() { showToast("Сабақ аяқталды! +50 XP", "success"); let xp = parseInt(localStorage.getItem("userXP")||0); updateStats(xp+50, undefined); localStorage.setItem("quest2", "done"); checkQuests(); switchTab('dashboardView'); }

async function startAiFlashcards() {
    const sec = document.getElementById("flashcardsSection"); sec.classList.remove("hidden"); const container = document.getElementById("flashcardsContainer"); container.innerHTML = "<p>⏳ Флешкарталар жасалуда...</p>";
    try {
        const res = await fetch(`${API_URL}/generate-flashcards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: currentTopic }) });
        const data = await res.json();
        if(data.cards && data.cards.length > 0) { container.innerHTML = data.cards.map(c => `<div class="flashcard" onclick="this.classList.toggle('flipped')"><div class="flashcard-inner"><div class="flashcard-front">${c.front}</div><div class="flashcard-back">${c.back}</div></div></div>`).join(""); if(window.MathJax) MathJax.typesetPromise(); showToast("Флешкарталар дайын!", "success"); } 
        else { container.innerHTML = "<p>Табылмады.</p>"; }
    } catch(err) { container.innerHTML = "<p style='color:red;'>Қате.</p>"; }
}

async function startAiQuiz() {
    document.getElementById("quizSection").classList.remove("hidden"); document.getElementById("quizQuestion").innerText = "Сұрақтар құрастырылуда... ⏳"; document.getElementById("quizOptions").innerHTML = ""; document.getElementById("nextQuizBtn").classList.add("hidden"); currentQuizIndex = 0; correctAnswers = 0;
    const res = await fetch(`${API_URL}/generate-quiz`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: currentTopic }) }); const data = await res.json(); currentQuizData = data.quiz; renderQuizQuestion();
}
function renderQuizQuestion() {
    if(currentQuizIndex >= currentQuizData.length) {
        document.getElementById("quizQuestion").innerText = `🎉 Аяқталды! Дұрыс: ${correctAnswers}/${currentQuizData.length}.`; document.getElementById("quizOptions").innerHTML = ""; document.getElementById("nextQuizBtn").classList.add("hidden");
        if(correctAnswers > 0) { fetch(`${API_URL}/add-xp`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ points: correctAnswers * 10 }) }).then(r=>r.json()).then(d=>{ if(d.new_xp) updateStats(d.new_xp); }); showToast(`Тест аяқталды! +${correctAnswers*10} XP`, "success"); localStorage.setItem("quest3", "done"); checkQuests(); } return;
    }
    const q = currentQuizData[currentQuizIndex]; document.getElementById("quizQuestion").innerText = `${currentQuizIndex + 1}. ${q.q}`; document.getElementById("quizOptions").innerHTML = q.options.map(opt => `<div class="quiz-opt" onclick="checkQuizAnswer(this, '${opt.replace(/'/g, "\\'")}', '${q.ans.replace(/'/g, "\\'")}')">${opt}</div>`).join(""); document.getElementById("nextQuizBtn").classList.add("hidden");
}
function checkQuizAnswer(div, selected, correct) { if(!document.getElementById("nextQuizBtn").classList.contains("hidden")) return; if(selected.includes(correct) || correct.includes(selected)) { div.style.background = "#10b981"; div.style.color = "white"; correctAnswers++; } else { div.style.background = "#ef4444"; div.style.color = "white"; } document.getElementById("nextQuizBtn").classList.remove("hidden"); }
function nextQuizQuestion() { currentQuizIndex++; renderQuizQuestion(); }

const mockDb = [{ q: "4, 8, 12... жалғастырыңыз", options: ["14", "16", "18", "20"], ans: "16" }, { q: "x + 5 = 12, x=?", options: ["5", "6", "7", "8"], ans: "7" }];
function startMockExam() { document.getElementById("examIntro").classList.add("hidden"); document.getElementById("examActive").classList.remove("hidden"); examQuestions = []; for(let i=0; i<15; i++) examQuestions.push(mockDb[i % mockDb.length]); userAnswers = {}; currentExamIndex = 0; timeRemaining = 40 * 60; clearInterval(examTimerInterval); examTimerInterval = setInterval(() => { if (timeRemaining <= 0) { clearInterval(examTimerInterval); finishExam(); return; } timeRemaining--; let m = Math.floor(timeRemaining/60); let s = timeRemaining%60; document.getElementById("examTimer").innerText = `⏱️ ${m}:${s<10?'0':''}${s}`; }, 1000); showExamQuestion(0); }
function renderExamNav() { document.getElementById("examNav").innerHTML = examQuestions.map((_, i) => `<button class="nav-btn ${i === currentExamIndex ? 'active' : ''} ${userAnswers[i] ? 'answered' : ''}" onclick="showExamQuestion(${i})">${i+1}</button>`).join(""); }
function showExamQuestion(idx) { currentExamIndex = idx; const q = examQuestions[idx]; document.getElementById("examQuestionText").innerText = `${idx + 1}. ${q.q}`; document.getElementById("examOptions").innerHTML = q.options.map(opt => `<div class="quiz-opt" style="${userAnswers[idx] === opt ? 'background:var(--primary);color:white;' : ''}" onclick="userAnswers[currentExamIndex]='${opt.replace(/'/g, "\\'")}'; showExamQuestion(currentExamIndex);">${opt}</div>`).join(""); renderExamNav(); }
function prevExamQuestion() { if(currentExamIndex > 0) showExamQuestion(currentExamIndex - 1); }
function nextExamQuestion() { if(currentExamIndex < 14) showExamQuestion(currentExamIndex + 1); }
function finishExam() { clearInterval(examTimerInterval); document.getElementById("examActive").classList.add("hidden"); document.getElementById("examResult").classList.remove("hidden"); let score = 0; for(let i=0; i<15; i++) if(userAnswers[i] === examQuestions[i].ans) score++; document.getElementById("examScoreDisplay").innerText = `${score}/15`; document.getElementById("examFeedback").innerText = `Жақсы нәтиже! +${score*20} XP`; let history = JSON.parse(localStorage.getItem("examHistory") || "[]"); history.push(score); localStorage.setItem("examHistory", JSON.stringify(history)); if(score > 0) { fetch(`${API_URL}/add-xp`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ points: score*20 }) }).then(r=>r.json()).then(d=>{ if(d.new_xp) updateStats(d.new_xp); }); showToast(`Тест аяқталды!`, "success"); } }

function showProfile() { switchTab('profileView'); document.getElementById("profXp").innerText = localStorage.getItem("userXP") || 0; document.getElementById("profStreak").innerText = (localStorage.getItem("userStreak") || 0) + " күн"; let history = JSON.parse(localStorage.getItem("examHistory") || "[]"); document.getElementById("profTests").innerText = history.length; const ctx = document.getElementById('progressChart').getContext('2d'); if (progressChartInstance) progressChartInstance.destroy(); progressChartInstance = new Chart(ctx, { type: 'line', data: { labels: history.length > 0 ? history.map((_, i) => `Тест ${i + 1}`) : ["Тест 1", "Тест 2", "Тест 3"], datasets: [{ label: 'Сынақ ұпайлары', data: history.length > 0 ? history : [0, 0, 0], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 15 } } } }); }
async function showLeaderboard() { switchTab('leaderboardView'); const container = document.getElementById('leaderboardContent'); container.innerHTML = "<p>⏳ Рейтинг жүктелуде...</p>"; try { const res = await fetch(`${API_URL}/leaderboard`); const data = await res.json(); if (data.length === 0) { container.innerHTML = "<p>Рейтинг бос.</p>"; return; } let html = `<div class="podium-container">`; if(data[1]) html += `<div class="podium-step second"><div class="podium-avatar">🥈</div><div class="podium-name">${data[1].name}</div><div class="podium-xp">${data[1].xp} XP</div></div>`; if(data[0]) html += `<div class="podium-step first"><div class="podium-avatar">👑</div><div class="podium-name">${data[0].name}</div><div class="podium-xp">${data[0].xp} XP</div></div>`; if(data[2]) html += `<div class="podium-step third"><div class="podium-avatar">🥉</div><div class="podium-name">${data[2].name}</div><div class="podium-xp">${data[2].xp} XP</div></div>`; html += `</div><div class="rank-list">`; for(let i=3; i<data.length; i++) { const isMe = data[i].name === localStorage.getItem("userName") ? "my-rank" : ""; html += `<div class="rank-item ${isMe}"><span><b>${i+1}.</b> ${data[i].name}</span> <b style="color:var(--primary);">${data[i].xp} XP</b></div>`; } html += `</div>`; container.innerHTML = html; } catch (err) { container.innerHTML = "<p style='color:red;'>❌ Қате.</p>"; } }

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
        
        // ЖАҢА: ДАУЫСПЕН ОҚУ БАТЫРМАСЫ ҚОСЫЛДЫ
        let replyHtml = data.reply || "❌ Қате";
        let safeText = replyHtml.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        box.innerHTML += `<div class="bot-msg" style="display:flex; gap:10px; align-items:start;">
                            <div>${replyHtml}</div>
                            <button class="btn-speak" onclick="speakText('${safeText}')" title="Дауыстап оқу">🔊</button>
                          </div>`;
        
        box.scrollTop = box.scrollHeight; if (window.MathJax) MathJax.typesetPromise();
    } catch (err) { if(document.getElementById(loadingId)) document.getElementById(loadingId).remove(); showToast("Байланыс жоқ", "error"); }
}

window.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    if(localStorage.getItem("token")) { 
        document.getElementById("authContainer").classList.add("hidden"); document.getElementById("mainContent").classList.remove("hidden"); 
        updateStats(); loadCourses(); checkQuests(); showToast("Қош келдіңіз!", "info"); 
    }
});