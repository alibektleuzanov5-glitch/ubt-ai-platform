const API_URL = "https://ubt-math-api.onrender.com/api";

// ЖАҢА: Экрандағы XP санын лезде жаңартатын функция
function updateXP(newXP) {
    if (newXP !== undefined && newXP !== null) {
        localStorage.setItem("userXP", newXP);
        const name = localStorage.getItem("userName");
        document.getElementById("userInfo").innerHTML = `Сәлем, <b>${name}</b>! <span class="xp-badge">🏆 ${newXP} XP</span>`;
    }
}

// 1-ҚАДАМ: Оқушының сұрақтарын сақтайтын қоржын
let userQuestions = []; 

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

// РЕЙТИНГ КӨРСЕТУ ФУНКЦИЯСЫ
async function showLeaderboard() {
    const box = document.getElementById("chatBox"); 
    
    const loadingId = "load-leaderboard";
    box.innerHTML += `<div id="${loadingId}" style="text-align: center; color: gray; margin: 10px 0;"><i>🏆 Рейтинг жүктелуде...</i></div>`;
    box.scrollTop = box.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/leaderboard`);
        const data = await res.json();
        
        document.getElementById(loadingId).remove();

        let html = `
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 15px; padding: 15px; margin: 15px 0; text-align: left;">
            <h3 style="margin-top: 0; color: #1e40af; text-align: center;">🏆 Үздік 10 Оқушы</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">`;

        data.forEach((user, index) => {
            let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `<span style="display:inline-block; width: 20px; text-align:center;">${index + 1}</span>`;
            
            const myName = localStorage.getItem("userName");
            const isMe = user.name === myName ? "background: #dbeafe; font-weight: bold;" : "";

            html += `
                <li style="padding: 8px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; border-radius: 5px; ${isMe}">
                    <span>${medal} ${user.name}</span>
                    <span style="color: #047857; font-weight: bold;">${user.xp} XP</span>
                </li>`;
        });

        html += `</ul></div>`;
        box.innerHTML += html;
        box.scrollTop = box.scrollHeight;

    } catch (err) {
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        box.innerHTML += `<div style="text-align: center; color: red;">❌ Рейтингке қосылу мүмкін болмады.</div>`;
    }
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

    if (msg) {
        userQuestions.push(msg);
        if (userQuestions.length > 5) userQuestions.shift(); 
    }

    let payloadMessage = msg;
    let endpoint = `${API_URL}/chat`;

    if (file) {
        const base64 = await toBase64(file);
        payloadMessage = base64; 
        endpoint = `${API_URL}/chat-vision`;
        box.innerHTML += `<div style="text-align: right;"><img src="${base64}" class="chat-img" style="max-width:200px; border-radius:10px; margin: 5px 0;"></div>`;
        if (msg) box.innerHTML += `<div style="text-align: right;"><span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">${msg}</span></div>`;
    } else {
        box.innerHTML += `<div style="text-align: right;"><span style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">${msg}</span></div>`;
    }

    input.value = "";
    imageInput.value = ""; 
    box.scrollTop = box.scrollHeight;

    const loadingId = "load-" + Date.now();
    box.innerHTML += `<div id="${loadingId}" style="text-align: left; color: gray;"><i>⏳ ЖИ талдап жатыр...</i></div>`;
    box.scrollTop = box.scrollHeight;

    // ЖАҢА: Токенді қосып жіберу
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ message: payloadMessage })
        });
        
        const data = await res.json();
        console.log("Серверден келген жауап:", data); 

        // ЖАҢА: Экрандағы XP санын жаңарту
        updateXP(data.new_xp);

        document.getElementById(loadingId).remove();

        if (data.reply) {
            box.innerHTML += `<div style="text-align: left;"><span style="background: #e2e8f0; padding: 8px 12px; border-radius: 15px; display: inline-block;">🤖 ${data.reply}</span></div>`;
        } else if (data.detail) {
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

// 3-ҚАДАМ: ҚАТЕМЕН ЖҰМЫС ФУНКЦИЯСЫ
async function analyzeMistakes() {
    const box = document.getElementById("chatBox");
    
    if (userQuestions.length === 0) {
        box.innerHTML += `<div style="text-align: left;"><span style="background: #e2e8f0; padding: 8px 12px; border-radius: 15px; display: inline-block;">🤖 Қатемен жұмыс жасау үшін алдымен чатқа 2-3 сұрақ немесе есеп жазып жіберіңіз.</span></div>`;
        box.scrollTop = box.scrollHeight;
        return;
    }

    const loadingId = "load-analyze";
    box.innerHTML += `<div id="${loadingId}" style="text-align: left; color: gray;"><i>🔍 Сіздің сұрақтарыңызды талдап, әлсіз тұстарыңызды іздеп жатырмын...</i></div>`;
    box.scrollTop = box.scrollHeight;

    // ЖАҢА: Токенді қосып жіберу
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
        const res = await fetch(`${API_URL}/analyze-weakness`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ questions: userQuestions })
        });
        
        const data = await res.json();
        
        // ЖАҢА: Экрандағы XP санын жаңарту
        updateXP(data.new_xp);

        document.getElementById(loadingId).remove();

        if (data.reply) {
            box.innerHTML += `<div style="text-align: left; margin: 10px 0;"><span style="background: #e0f2fe; border: 2px solid #38bdf8; padding: 12px; border-radius: 15px; display: inline-block;"><b>🎯 Қатемен жұмыс:</b><br><br> ${data.reply}</span></div>`;
        } else {
            box.innerHTML += `<div style="text-align: left;"><span style="background: #fee2e2; color: #b91c1c; padding: 8px 12px; border-radius: 15px; display: inline-block;">❌ Қате: ${data.detail}</span></div>`;
        }

        box.scrollTop = box.scrollHeight;
        if (window.MathJax) { MathJax.typesetPromise(); }

    } catch (err) {
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        box.innerHTML += `<div style="text-align: left;"><span style="color: red;">❌ Сервермен байланыс үзілді.</span></div>`;
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