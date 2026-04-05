const API_URL = "https://ubt-math-api.onrender.com/api";

function updateStats(newXP, newStreak) {
    const name = localStorage.getItem("userName");
    let xpText = localStorage.getItem("userXP") || 0;
    let streakText = localStorage.getItem("userStreak") || 0;

    if (newXP !== undefined && newXP !== null) {
        localStorage.setItem("userXP", newXP);
        xpText = newXP;
    }
    if (newStreak !== undefined && newStreak !== null) {
        localStorage.setItem("userStreak", newStreak);
        streakText = newStreak;
    }
    
    document.getElementById("userInfo").innerHTML = `Сәлем, <b>${name}</b>! 
        <span class="xp-badge">🏆 ${xpText} XP</span> 
        <span class="streak-badge">🔥 ${streakText} күн</span>`;
}

let userQuestions = []; 

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
            localStorage.setItem("userStreak", data.streak);
            window.location.reload();
        } else {
            alert(data.detail || "Қате: Пароль немесе Email дұрыс емес.");
        }
    } catch (err) { alert("Сервер ұйықтап жатыр. Сәл күтіп, қайта көріңіз."); }
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
            alert("🏆 Сәтті тіркелдіңіз! Енді жүйеге кіре аласыз.");
            toggleForms();
        } else {
            const data = await res.json();
            alert(data.detail || "Тіркелу кезінде қате кетті.");
        }
    } catch (err) { alert("Сервермен байланыс жоқ."); }
}

function logout() {
    localStorage.clear();
    window.location.reload();
}

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

// ЖАҢА ФУНКЦИЯ: Курстар мен Модульдерді жүктеу
async function loadCourses() {
    const container = document.getElementById("coursesContainer");
    try {
        const res = await fetch(`${API_URL}/courses-full`);
        const courses = await res.json();
        
        if (courses.length === 0) return;
        container.innerHTML = "";

        courses.forEach(course => {
            let modulesHTML = course.modules.map(mod => `
                <div style="margin: 8px 0; border-left: 3px solid #3498db; padding-left: 10px;">
                    <div onclick="this.nextElementSibling.classList.toggle('hidden')" style="cursor:pointer; font-weight:bold; color:#1e293b; padding:5px; background: #f1f5f9; border-radius: 5px;">
                        📂 ${mod.title}
                    </div>
                    <div class="hidden" style="padding-left: 15px; font-size: 14px; color: #475569; margin-top: 5px;">
                        ${mod.lessons.map(l => `<div style="margin:5px 0; padding: 5px; background: white; border: 1px solid #e2e8f0; border-radius: 4px;">🔹 ${l.title}</div>`).join("")}
                    </div>
                </div>
            `).join("");

            const card = `
                <div style="background: white; border: 1px solid #cbd5e1; border-radius: 12px; margin-bottom: 15px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div onclick="this.nextElementSibling.classList.toggle('hidden')" style="cursor: pointer; display: flex; align-items: center; padding: 15px; background: #f8fafc;">
                        <img src="${course.image_url}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; margin-right: 15px;">
                        <div style="flex-grow: 1;">
                            <h4 style="margin: 0; color: #1e293b;">${course.title}</h4>
                            <small style="color: #64748b;">${course.modules.length} модуль</small>
                        </div>
                        <span style="color: #94a3b8; font-size: 18px;">▼</span>
                    </div>
                    <div class="hidden" style="padding: 15px; border-top: 1px solid #e2e8f0; background: white;">
                        ${modulesHTML}
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });
    } catch (err) {
        console.error("Курстарды жүктеу қатесі:", err);
    }
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

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
        updateStats(data.new_xp, data.new_streak); 
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
        updateStats(data.new_xp, data.new_streak); 
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

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");
    if (token) {
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("regForm").classList.add("hidden");
        document.getElementById("mainContent").classList.remove("hidden");
        document.getElementById("pageTitle").innerText = "Жеке кабинет";
        updateStats(); 
        loadCourses(); // КУРСТАРДЫ АВТОМАТТЫ ТҮРДЕ ЖҮКТЕЙМІЗ
    }
});