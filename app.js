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

// 2. Жүйеге кіру
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
            alert(data.detail || "Қате: Пароль немесе Email дұрыс емес.");
        }
    } catch (err) { alert("Сервер ұйықтап жатыр. Сәл күтіп, қайта көріңіз."); }
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
            alert("🏆 Сәтті тіркелдіңіз! Енді жүйеге кіре аласыз.");
            toggleForms();
        } else {
            const data = await res.json();
            alert(data.detail || "Тіркелу кезінде қате кетті.");
        }
    } catch (err) { alert("Сервермен байланыс жоқ."); }
}

// 4. Жүйеден шығу
function logout() {
    localStorage.clear();
    window.location.reload();
}

// 5. Суретті Base64-ке айналдыру
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// 6. ЖАҢАРТЫЛҒАН СЕНІМДІ ЧАТ ФУНКЦИЯСЫ
async function sendChat() {
    const input = document.getElementById("chatInput");
    const imageInput = document.getElementById("imageInput");
    const box = document.getElementById("chatBox");
    
    const msg = input.value.trim();
    const file = imageInput.files[0];

    if (!msg && !file) return;

    let payloadMessage = msg;
    let endpoint = `${API_URL}/chat`;

    // Суретті өңдеу
    if (file) {
        const base64 = await toBase64(file);
        payloadMessage = base64; 
        endpoint = `${API_URL}/chat-vision`;
        box.innerHTML += `<div style="text-align: right;"><img src="${base64}" class="chat-img" style="max-width:200px; border-radius:10px; margin: 5px 0;"></div>`;
        if (msg) box.innerHTML += `<div style="text-align: right;"><span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">${msg}</span></div>`;
    } else {
        box.innerHTML += `<div style="text-align: right;"><span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">${msg}</span></div>`;
    }

    // Поляларды тазарту
    input.value = "";
    imageInput.value = ""; 
    box.scrollTop = box.scrollHeight;

    const loadingId = "load-" + Date.now();
    box.innerHTML += `<div id="${loadingId}" style="text-align: left; color: gray;"><i>⏳ ЖИ талдап жатыр...</i></div>`;
    box.scrollTop = box.scrollHeight;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: payloadMessage })
        });
        
        const data = await res.json();
        console.log("Серверден келген жауап:", data); // Консольден тексеру үшін

        document.getElementById(loadingId).remove();

        // undefined қатесін болдырмау үшін тексеру
        if (data.reply) {
            box.innerHTML += `<div style="text-align: left;"><span style="background: #e2e8f0; padding: 8px 12px; border-radius: 15px; display: inline-block;">🤖 ${data.reply}</span></div>`;
        } else if (data.detail) {
            // Егер сервер қате берсе (мысалы, модель өшіп қалса)
            box.innerHTML += `<div style="text-align: left;"><span style="background: #fee2e2; color: #b91c1c; padding: 8px 12px; border-radius: 15px; display: inline-block;">❌ Қате: ${data.detail}</span></div>`;
        } else {
            box.innerHTML += `<div style="text-align: left;"><span style="background: #fee2e2; color: #b91c1c; padding: 8px 12px; border-radius: 15px; display: inline-block;">❌ Күтпеген қате шықты.</span></div>`;
        }

        box.scrollTop = box.scrollHeight;
        if (window.MathJax) { MathJax.typesetPromise(); }

    } catch (err) {
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        box.innerHTML += `<div style="text-align: left;"><span style="color: red;">❌ Байланыс үзілді немесе сервер жауап бермеді.</span></div>`;
        box.scrollTop = box.scrollHeight;
    }
}

// 7. Бастапқы тексеру
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");
    if (token) {
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("regForm").classList.add("hidden");
        document.getElementById("mainContent").classList.remove("hidden");
        document.getElementById("pageTitle").innerText = "Жеке кабинет";
        const name = localStorage.getItem("userName") || "Оқушы";
        const xp = localStorage.getItem("userXP") || "0";
        document.getElementById("userInfo").innerHTML = `Сәлем, <b>${name}</b>! <span class="xp-badge">🏆 ${xp} XP</span>`;
    }
});