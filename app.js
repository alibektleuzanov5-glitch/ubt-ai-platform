const API_URL = "https://ubt-math-api.onrender.com/api";

// 1. Формаларды ауыстыру
function toggleForms() {
    const loginForm = document.getElementById("loginForm");
    const regForm = document.getElementById("regForm");
    const pageTitle = document.getElementById("pageTitle");

    if (loginForm.classList.contains("hidden")) {
        loginForm.classList.remove("hidden");
        regForm.classList.remove("hidden");
        pageTitle.innerText = "Жүйеге кіру";
    } else {
        loginForm.classList.add("hidden");
        regForm.classList.remove("hidden");
        pageTitle.innerText = "Жаңа аккаунт ашу";
    }
}

// 2. Жүйеге кіру (XP мен Атты сақтаймыз)
async function login() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPass").value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: String(password).trim().substring(0, 50) })
        });
        const data = await res.json();
        
        if (data.access_token) {
            // Мәліметтерді браузер жадына сақтаймыз
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("userName", data.name);
            localStorage.setItem("userXP", data.xp);
            window.location.reload(); // Бетті жаңартамыз
        } else {
            alert(data.detail || "Қате!");
        }
    } catch (err) {
        alert("Сервермен байланыс жоқ!");
    }
}

// 3. Тіркелу
async function register() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPass").value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email, password: String(password).trim().substring(0, 50) })
        });
        if (res.ok) {
            alert("🏆 ЖЕҢІС!!! Сіз сәтті тіркелдіңіз! Енді кіру формасы арқылы кіріңіз.");
            toggleForms(); // Кіру формасына қайтару
        } else {
            const data = await res.json();
            alert(data.detail);
        }
    } catch (err) {
        alert("Сервермен байланыс жоқ!");
    }
}

// 4. Жүйеден шығу
function logout() {
    localStorage.clear();
    window.location.reload();
}

// 5. ЖАҢА ФУНКЦИЯ: Чат арқылы ЖИ-мен сөйлесу
async function sendChat() {
    const input = document.getElementById("chatInput");
    const box = document.getElementById("chatBox");
    const msg = input.value.trim();
    if (!msg) return;

    // Біздің сұрағымызды көк түспен шығару
    box.innerHTML += `<div style="text-align: right;"><span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">${msg}</span></div>`;
    input.value = "";
    box.scrollTop = box.scrollHeight; // Төменге түсіру

    // "Ойланып жатыр" деген жазуды қосу
    const loadingId = "load-" + Date.now();
    box.innerHTML += `<div id="${loadingId}" style="text-align: left; color: gray;"><i>ЖИ ойланып жатыр...</i></div>`;
    box.scrollTop = box.scrollHeight;

    try {
        // Бэкендке сұраныс жіберу
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        
        // "Ойланып жатырды" өшіру
        document.getElementById(loadingId).remove();
        
        // ЖИ жауабын сұр түспен шығару
        box.innerHTML += `<div style="text-align: left;"><span style="background: #e2e8f0; padding: 8px 12px; border-radius: 15px; display: inline-block;">🤖 ${data.reply}</span></div>`;
        box.scrollTop = box.scrollHeight;
    } catch (err) {
        document.getElementById(loadingId).innerText = "Қате шықты. Сервер ұйықтап жатуы мүмкін.";
    }
}

// 6. Бет ашылғанда не болатынын тексеретін негізгі логика
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");
    if (token) {
        // Кіріп қойған болса, формаларды жасырып, дашбордты ашу
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("regForm").classList.add("hidden");
        document.getElementById("mainContent").classList.remove("hidden");
        document.getElementById("pageTitle").innerText = "Жеке кабинет";

        // Аты мен XP ұпайын алып, экранға шығару
        const name = localStorage.getItem("userName") || "Оқушы";
        const xp = localStorage.getItem("userXP") || "0";
        document.getElementById("userInfo").innerHTML = `Сәлем, <b>${name}</b>! <span class="xp-badge">🏆 ${xp} XP</span>`;
    }
});