const API_URL = "https://ubt-math-api.onrender.com/api";

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
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("userName", data.name);
            localStorage.setItem("userXP", data.xp);
            window.location.reload();
        } else {
            alert(data.detail || "Қате!");
        }
    } catch (err) { alert("Сервермен байланыс жоқ!"); }
}

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
            alert("🏆 Сәтті тіркелдіңіз!");
            toggleForms();
        } else {
            const data = await res.json();
            alert(data.detail);
        }
    } catch (err) { alert("Сервермен байланыс жоқ!"); }
}

function logout() {
    localStorage.clear();
    window.location.reload();
}

// Көмекші функция: Суретті мәтінге (Base64) айналдыру
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// ЖАҢАРТЫЛҒАН ЧАТ ФУНКЦИЯСЫ
async function sendChat() {
    const input = document.getElementById("chatInput");
    const imageInput = document.getElementById("imageInput");
    const box = document.getElementById("chatBox");
    
    const msg = input.value.trim();
    const file = imageInput.files[0];

    if (!msg && !file) return;

    let payloadMessage = msg;
    let endpoint = `${API_URL}/chat`;

    // 1. Егер сурет болса, оны Base64-ке айналдырып, vision маршрутын таңдау
    if (file) {
        const base64 = await toBase64(file);
        payloadMessage = base64; 
        endpoint = `${API_URL}/chat-vision`;
        box.innerHTML += `<div style="text-align: right;"><img src="${base64}" class="chat-img"></div>`;
        if (msg) box.innerHTML += `<div style="text-align: right;"><span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">${msg}</span></div>`;
    } else {
        box.innerHTML += `<div style="text-align: right;"><span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">${msg}</span></div>`;
    }

    input.value = "";
    imageInput.value = ""; // Файлды тазарту
    box.scrollTop = box.scrollHeight;

    const loadingId = "load-" + Date.now();
    box.innerHTML += `<div id="${loadingId}" style="text-align: left; color: gray;"><i>ЖИ талдап жатыр...</i></div>`;
    box.scrollTop = box.scrollHeight;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: payloadMessage })
        });
        const data = await res.json();
        
        document.getElementById(loadingId).remove();
        box.innerHTML += `<div style="text-align: left;"><span style="background: #e2e8f0; padding: 8px 12px; border-radius: 15px; display: inline-block;">🤖 ${data.reply}</span></div>`;
        box.scrollTop = box.scrollHeight;

        if (window.MathJax) { MathJax.typesetPromise(); }
    } catch (err) {
        document.getElementById(loadingId).innerText = "Қате шықты.";
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");
    if (token) {
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("regForm").classList.add("hidden");
        document.getElementById("mainContent").classList.remove("hidden");
        const name = localStorage.getItem("userName") || "Оқушы";
        const xp = localStorage.getItem("userXP") || "0";
        document.getElementById("userInfo").innerHTML = `Сәлем, <b>${name}</b>! <span class="xp-badge">🏆 ${xp} XP</span>`;
    }
});