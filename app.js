// Render-дегі бэкендтің нағыз интернет-адресі
const API_URL = "https://ubt-math-api.onrender.com/api";

// --- ЖҮЙЕГЕ КІРУ ЖӘНЕ ТІРКЕЛУ ---

async function register() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPass").value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        alert(data.message || data.detail);
    } catch (err) {
        console.error("Тіркелу қатесі:", err);
    }
}

async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPass").value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.access_token) {
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("userEmail", email);
            localStorage.setItem("userName", data.name);
            localStorage.setItem("userRole", data.role);
            alert("Қош келдіңіз, " + data.name);
            window.location.reload(); // Бетті жаңартып, курстарды көрсету
        } else {
            alert(data.detail || "Қате!");
        }
    } catch (err) {
        console.error("Кіру қатесі:", err);
    }
}

// --- КУРСТАР МЕН САБАҚТАР ---

async function loadCourses() {
    const res = await fetch(`${API_URL}/courses`);
    const courses = await res.json();
    const container = document.getElementById("coursesContainer");
    if (!container) return;
    
    container.innerHTML = courses.map(c => `
        <div class="course-card" onclick="loadLessons(${c.id})">
            <img src="${c.image_url || 'https://via.placeholder.com/150'}" alt="${c.title}">
            <h3>${c.title}</h3>
            <p>${c.description}</p>
        </div>
    `).join("");
}

async function loadLessons(courseId) {
    const res = await fetch(`${API_URL}/courses/${courseId}/lessons`);
    const lessons = await res.json();
    const container = document.getElementById("lessonsList");
    if (!container) return;

    container.innerHTML = lessons.map(l => `
        <div class="lesson-item" onclick="openLesson(${l.id})">
            <h4>${l.title}</h4>
        </div>
    `).join("");
}

// --- ЖИ-МЕН ЧАТ (CHATBOT) ---

async function sendChat() {
    const input = document.getElementById("chatInput");
    const message = input.value;
    if (!message) return;

    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML += `<p><b>Сен:</b> ${message}</p>`;
    input.value = "";

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        chatBox.innerHTML += `<p><b>Мұғалім:</b> ${data.reply}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
        chatBox.innerHTML += `<p style="color:red">Қате: Сервер жауап бермеді.</p>`;
    }
}

// --- ТЕСТ НӘТИЖЕСІН САҚТАУ ---

async function saveTestResult(lessonId, lessonTitle, score, total) {
    const email = localStorage.getItem("userEmail");
    if (!email) return;

    await fetch(`${API_URL}/save-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_email: email,
            lesson_id: lessonId,
            lesson_title: lessonTitle,
            score: score,
            total_questions: total
        })
    });
}

// --- БЕТ ЖҮКТЕЛГЕНДЕ ---
window.onload = () => {
    loadCourses();
    const userName = localStorage.getItem("userName");
    if (userName) {
        document.getElementById("userInfo").innerText = `Пайдаланушы: ${userName}`;
    }
};