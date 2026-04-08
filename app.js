// === БЭКЕНД СІЛТЕМЕСІ (Өзгертуге болады) ===
const API_URL = "https://ubt-math-api.onrender.com/api"; 
// Локальді тексергенде: const API_URL = "http://127.0.0.1:10000/api";

let timerInterval;
let timeLeft = 1500; // 25 минут

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});

// ==================== 1. АВТОРИЗАЦИЯ ЖӘНЕ UI БАСҚАРУ ====================

function checkAuth() {
    const token = localStorage.getItem("token");
    if (token) {
        document.getElementById("auth-section").style.display = "none";
        document.getElementById("main-app").style.display = "flex";
        updateUserInfo();
        showSection('dashboard-section');
    } else {
        document.getElementById("auth-section").style.display = "flex";
        document.getElementById("main-app").style.display = "none";
    }
}

async function login() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("name", data.name);
            localStorage.setItem("xp", data.xp);
            localStorage.setItem("streak", data.streak);
            localStorage.setItem("avatar", data.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Axiom");
            checkAuth();
        } else {
            document.getElementById("auth-error").innerText = data.detail;
        }
    } catch (e) { document.getElementById("auth-error").innerText = "Серверге қосылу қатесі!"; }
}

async function register() {
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    
    if(!name) return alert("Аты-жөніңізді жазыңыз");

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        if (res.ok) {
            alert("Сәтті тіркелдіңіз! Енді кіріңіз.");
        } else {
            const data = await res.json();
            document.getElementById("auth-error").innerText = data.detail;
        }
    } catch (e) { document.getElementById("auth-error").innerText = "Қате кетті"; }
}

function logout() {
    localStorage.clear();
    checkAuth();
}

function updateUserInfo() {
    document.getElementById("user-greeting").innerText = "Сәлем, " + localStorage.getItem("name") + "!";
    document.getElementById("profile-name").innerText = localStorage.getItem("name");
    
    document.getElementById("user-xp").innerText = localStorage.getItem("xp");
    document.getElementById("profile-xp").innerText = localStorage.getItem("xp");
    
    document.getElementById("user-streak").innerText = localStorage.getItem("streak");
    
    const avatar = localStorage.getItem("avatar");
    document.getElementById("header-avatar").src = avatar;
    document.getElementById("user-avatar-large").src = avatar;
}

// Бөлімдерді ауыстыру
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';

    if (sectionId === 'courses-section') loadCourses();
    if (sectionId === 'store-section') loadStore();
    if (sectionId === 'errors-section') loadErrors();
}

// ==================== 2. ФОКУС ТАЙМЕР ====================
function toggleTimer() {
    const btn = document.getElementById("timer-btn");
    if (btn.innerText === "Бастау") {
        btn.innerText = "Тоқтату";
        timerInterval = setInterval(() => {
            timeLeft--;
            let m = Math.floor(timeLeft / 60);
            let s = timeLeft % 60;
            document.getElementById("timer-display").innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
            if (timeLeft <= 0) { clearInterval(timerInterval); alert("Таймер аяқталды! Демалыңыз."); btn.innerText = "Бастау"; timeLeft = 1500; }
        }, 1000);
    } else {
        clearInterval(timerInterval);
        btn.innerText = "Бастау";
    }
}

// ==================== 3. ЖИ МҰҒАЛІМ ЧАТЫ ====================
async function sendMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value;
    if (!msg) return;

    addChatMessage(msg, "user");
    input.value = "";
    
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        addChatMessage(data.reply, "ai");
        
        if(data.new_xp) {
            localStorage.setItem("xp", data.new_xp);
            updateUserInfo();
        }
    } catch (e) { addChatMessage("Кешіріңіз, қате кетті.", "ai"); }
}

function addChatMessage(text, sender) {
    const box = document.getElementById("chat-box");
    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.innerHTML = text; // LaTeX форматталуы мүмкін
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    if (window.MathJax) window.MathJax.typesetPromise();
}

// ==================== 4. КУРСТАР БӨЛІМІ ====================
async function loadCourses() {
    try {
        const res = await fetch(`${API_URL}/courses-full`);
        const courses = await res.json();
        const container = document.getElementById("courses-container");
        container.innerHTML = "";
        
        courses.forEach(course => {
            const card = document.createElement("div");
            card.className = "course-card";
            card.innerHTML = `
                <img src="${course.image_url}" alt="${course.title}">
                <div class="course-info">
                    <h3>${course.title}</h3>
                    <p>${course.modules.length} модуль бар</p>
                </div>
            `;
            // Оқушы курсқа басса, тақырыптарын көрсетуге болады (болашақта)
            card.onclick = () => alert("Бұл курстың ішіндегі сабақтар беті жақын арада қосылады!");
            container.appendChild(card);
        });
    } catch (e) {
        document.getElementById("courses-container").innerHTML = "Курстарды жүктеу мүмкін болмады.";
    }
}

// ==================== 5. XP ДҮКЕНІ ====================
async function loadStore() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/store`, { headers: { "Authorization": `Bearer ${token}` } });
        const items = await response.json();
        const container = document.getElementById("store-container");
        container.innerHTML = "";
        
        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "store-card";
            card.innerHTML = `
                <img src="${item.value}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p style="color: #fbbf24; margin: 10px 0;">💎 ${item.cost} XP</p>
                <button class="buy-btn" onclick="buyItem(${item.id}, ${item.cost})">Сатып алу</button>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

async function buyItem(itemId, cost) {
    const token = localStorage.getItem("token");
    const currentXp = parseInt(localStorage.getItem("xp") || 0);
    
    if (currentXp < cost) return alert(`Жеткіліксіз! Бұл затқа ${cost} XP керек, сенде ${currentXp} XP.`);
    if (!confirm(`Осы затты сатып аласыз ба?`)) return;

    try {
        const res = await fetch(`${API_URL}/store/buy`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ item_id: itemId })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Сәтті сатып алынды! 🎉");
            localStorage.setItem("xp", data.new_xp);
            localStorage.setItem("avatar", data.avatar_url);
            updateUserInfo();
        } else { alert(data.detail); }
    } catch (e) { console.error(e); }
}

// ==================== 6. ҚАТЕЛЕР ДӘПТЕРІ ====================
async function loadErrors() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/errors`, { headers: { "Authorization": `Bearer ${token}` } });
        const errors = await response.json();
        const container = document.getElementById("errors-container");
        container.innerHTML = "";
        
        if (errors.length === 0) {
            container.innerHTML = "<p>Жарайсың! Әзірге қате жоқ.</p>";
            return;
        }

        errors.forEach(err => {
            const card = document.createElement("div");
            card.className = "error-card";
            card.innerHTML = `
                <h4>📚 ${err.topic}</h4>
                <p style="margin: 10px 0;"><b>Сұрақ:</b> ${err.question}</p>
                <p style="color: #f87171;">❌ Сенің жауабың: ${err.user_answer}</p>
                <p style="color: #4ade80;">✅ Дұрыс жауап: ${err.correct_answer}</p>
                <button class="practice-btn" onclick="practiceError('${err.topic}', '${err.question.replace(/'/g, "\\'")}', '${err.user_answer}', '${err.correct_answer}')">
                    🤖 ЖИ-мен талдау
                </button>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

async function practiceError(topic, question, userAns, correctAns) {
    alert("ЖИ мұғалім қатені талдап жатыр, күте тұрыңыз...");
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/errors/practice`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ topic: topic, question: question, user_answer: userAns, correct_answer: correctAns })
        });
        const data = await response.json();
        
        showSection("dashboard-section");
        addChatMessage(`Мен мына сұрақтан қателестім: ${question}`, "user");
        addChatMessage(data.reply, "ai");
    } catch (e) { alert("Қате кетті"); }
}