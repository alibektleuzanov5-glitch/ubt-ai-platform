const API_URL = "https://ubt-math-api.onrender.com/api"; 
document.addEventListener("DOMContentLoaded", checkAuth);

function checkAuth() {
    if (localStorage.getItem("token")) {
        document.getElementById("auth-section").style.display = "none";
        document.getElementById("main-app").style.display = "flex";
        updateUI(); show('dashboard-section');
    } else {
        document.getElementById("auth-section").style.display = "flex";
        document.getElementById("main-app").style.display = "none";
    }
}
function updateUI() {
    document.getElementById("user-greeting").innerText = localStorage.getItem("name");
    document.getElementById("user-xp").innerText = localStorage.getItem("xp");
    document.getElementById("user-league").innerText = localStorage.getItem("league") || "Қола";
    document.getElementById("header-avatar").src = localStorage.getItem("avatar");
}
function logout() { localStorage.clear(); checkAuth(); }

// БӨЛІМДЕРДІ АШУ ФУНКЦИЯСЫ
function show(id) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    
    if(id==='store-section') loadStore(); 
    if(id==='league-section') loadLeague(); 
    if(id==='courses-section') loadCourses(); // Курстар осында шақырылады
    if(id==='errors-section') loadErrors();   // Қателер осында шақырылады
}

async function login() {
    const res = await fetch(`${API_URL}/login`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({email: document.getElementById("auth-email").value, password: document.getElementById("auth-password").value})});
    if (res.ok) { const d = await res.json(); Object.entries(d).forEach(([k,v]) => localStorage.setItem(k==='access_token'?'token':k, v)); checkAuth(); } else alert("Қате!");
}
async function register() {
    const res = await fetch(`${API_URL}/register`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name: document.getElementById("reg-name").value, email: document.getElementById("auth-email").value, password: document.getElementById("auth-password").value})});
    if (res.ok) alert("Тіркелді!");
}

async function sendMsg() {
    const i = document.getElementById("chat-input"); const v = i.value; i.value="";
    document.getElementById("chat-box").innerHTML += `<div style="margin-top:10px; background:#3b82f6; padding:10px; border-radius:10px; align-self:flex-end; max-width:80%;"><b>Сен:</b> ${v}</div>`;
    
    const chatBox = document.getElementById("chat-box");
    chatBox.scrollTop = chatBox.scrollHeight;

    const res = await fetch(`${API_URL}/chat`, { method: "POST", headers: {"Content-Type":"application/json", "Authorization": `Bearer ${localStorage.getItem("token")}`}, body: JSON.stringify({message: v})});
    const d = await res.json(); 
    document.getElementById("chat-box").innerHTML += `<div style="margin-top:10px; background:#334155; padding:10px; border-radius:10px; max-width:80%;"><b>🤖 ЖИ:</b> ${d.reply}</div>`;
    
    if(window.MathJax) window.MathJax.typesetPromise();
    chatBox.scrollTop = chatBox.scrollHeight;

    if(d.new_xp){ localStorage.setItem("xp", d.new_xp); updateUI(); }
}

async function getParentCode() {
    const res = await fetch(`${API_URL}/generate-parent-code`, { headers: {"Authorization": `Bearer ${localStorage.getItem("token")}`} });
    const d = await res.json();
    document.getElementById("parent-code-display").innerText = "Телеграм код: " + d.code + (d.is_linked ? " (Байланысқан)" : " (Байланыспаған)");
}

async function loadStore() {
    const res = await fetch(`${API_URL}/store`); const d = await res.json();
    document.getElementById("store-container").innerHTML = d.map(i => `<div class="store-card" style="background:#1e293b; padding:20px; border-radius:10px; text-align:center; border:1px solid #334155;"><img src="${i.value}" style="width:80px;border-radius:50%;"><br><h3 style="margin:10px 0;">${i.name}</h3><button onclick="buy(${i.id}, ${i.cost})" style="background:#eab308; color:black; font-weight:bold; border-radius:5px;">${i.cost}XP Сатып алу</button></div>`).join('');
}
async function buy(id, cost) {
    if(!confirm("Аласың ба?")) return;
    const res = await fetch(`${API_URL}/store/buy`, { method: "POST", headers: {"Content-Type":"application/json", "Authorization": `Bearer ${localStorage.getItem("token")}`}, body: JSON.stringify({item_id: id})});
    const d = await res.json(); if(res.ok){ localStorage.setItem("xp", d.new_xp); localStorage.setItem("avatar", d.avatar_url); updateUI(); } else alert("Ақша жетпейді");
}

async function loadLeague() {
    document.getElementById("league-title").innerText = localStorage.getItem("league") + " Лигасы";
    const res = await fetch(`${API_URL}/league`, { headers: {"Authorization": `Bearer ${localStorage.getItem("token")}`} });
    const d = await res.json();
    document.getElementById("leaderboard").innerHTML = `<tr><th style="padding:10px; border-bottom:1px solid #334155;">Орын</th><th style="padding:10px; border-bottom:1px solid #334155;">Оқушы</th><th style="padding:10px; border-bottom:1px solid #334155;">XP</th></tr>` + d.leaderboard.map((u, i) => `<tr><td style="padding:10px; border-bottom:1px solid #334155;">#${i+1}</td><td style="padding:10px; border-bottom:1px solid #334155;"><img src="${u.avatar}" width="25" style="border-radius:50%; vertical-align:middle;"> ${u.name}</td><td style="padding:10px; border-bottom:1px solid #334155; color:#fbbf24; font-weight:bold;">${u.weekly_xp} XP</td></tr>`).join('');
}

// === КУРСТАРДЫ ЖҮКТЕУ (ОСЫ БӨЛІМ ЖАҢАРТЫЛДЫ) ===
async function loadCourses() {
    try {
        const res = await fetch(`${API_URL}/courses-full`);
        const courses = await res.json();
        const container = document.getElementById("courses-container");
        container.innerHTML = "";
        
        courses.forEach(c => {
            container.innerHTML += `
            <div style="background:#1e293b; border-radius:10px; padding:15px; border:1px solid #334155;">
                <img src="${c.image_url}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                <h3 style="margin-top:15px;">${c.title}</h3>
                <p style="color:#94a3b8; margin-top:5px;">${c.modules.length} модуль бар</p>
                <button style="margin-top:10px; background:#3b82f6; width:100%; padding:10px; border:none; color:white; border-radius:5px; cursor:pointer;" onclick="alert('Сабақтарға кіру жақында қосылады!')">Көру</button>
            </div>`;
        });
    } catch(e) { document.getElementById("courses-container").innerHTML = "<p>Курстарды жүктеу кезінде қате кетті.</p>"; }
}

// === ҚАТЕЛЕР ДӘПТЕРІН ЖҮКТЕУ (ОСЫ БӨЛІМ ЖАҢАРТЫЛДЫ) ===
async function loadErrors() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/errors`, { headers: { "Authorization": `Bearer ${token}` } });
        const errors = await res.json();
        const container = document.getElementById("errors-container");
        container.innerHTML = errors.length === 0 ? "<p>Жарайсың! Қате жоқ.</p>" : "";
        
        errors.forEach(err => {
            container.innerHTML += `
            <div style="background:#1e293b; padding:15px; border-left:5px solid #ef4444; border-radius:5px;">
                <h4 style="color:#3b82f6;">📚 ${err.topic}</h4>
                <p style="margin:10px 0;"><b>Сұрақ:</b> ${err.question}</p>
                <p style="color:#f87171;">❌ Сенің жауабың: ${err.user_answer}</p>
                <p style="color:#4ade80;">✅ Дұрыс жауап: ${err.correct_answer}</p>
                <button style="margin-top:10px; background:#3b82f6; color:white; padding:8px 15px; border:none; border-radius:5px; cursor:pointer;" 
                onclick="practiceError('${err.topic}', '${err.question.replace(/'/g, "\\'")}', '${err.user_answer}', '${err.correct_answer}')">
                    🤖 ЖИ-мен талдау
                </button>
            </div>`;
        });
    } catch (e) { console.error(e); }
}

async function practiceError(topic, question, userAns, correctAns) {
    alert("ЖИ мұғалім қатені талдап жатыр...");
    const res = await fetch(`${API_URL}/errors/practice`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ topic, question, user_answer: userAns, correct_answer: correctAns })
    });
    const d = await res.json();
    show("dashboard-section");
    document.getElementById("chat-box").innerHTML += `<div style="margin-top:10px; background:#3b82f6; padding:10px; border-radius:10px; align-self:flex-end;">Мен мынадан қателестім: ${question}</div>`;
    document.getElementById("chat-box").innerHTML += `<div style="margin-top:10px; background:#334155; padding:10px; border-radius:10px;"><b>🤖 ЖИ:</b> ${d.reply}</div>`;
    if(window.MathJax) window.MathJax.typesetPromise();
}

const simData = [
    {q:"Математика: x² - 5x + 6 = 0 теңдеуінің түбірлерін табыңыз", options:["2 және 3","1 және 6"], ans:"2 және 3", topic:"Квадрат теңдеулер"},
    {q:"Информатика: 1 Байтта неше бит бар?", options:["4","8","16"], ans:"8", topic:"Ақпарат өлшемі"},
    {q:"Мат. сауаттылық: 2 сағатта 120 км жүрсе, жылдамдығы?", options:["50","60","70"], ans:"60", topic:"Қозғалыс"}
]; 
let currQ=0, simScore=0, wTopics=[];
function startSim() { currQ=0; simScore=0; wTopics=[]; document.getElementById("sim-start").style.display="none"; document.getElementById("sim-test").style.display="block"; renderQ(); }
function renderQ() {
    if(currQ>=simData.length) return finishSim();
    const q = simData[currQ]; document.getElementById("sim-q").innerText = q.q;
    document.getElementById("sim-opts").innerHTML = q.options.map(o => `<button class="opt-btn" style="background:#334155; color:white; border:none; display:block; width:100%; text-align:left; padding:15px; border-radius:8px; margin-bottom:10px; cursor:pointer;" onclick="ans('${o}')">${o}</button>`).join('');
}
function ans(v) { if(v===simData[currQ].ans) simScore++; else wTopics.push(simData[currQ].topic); currQ++; renderQ(); }
async function finishSim() {
    document.getElementById("sim-test").style.display="none"; document.getElementById("sim-res").style.display="block";
    document.getElementById("sim-score").innerText = simScore;
    document.getElementById("sim-ai").innerText = "ЖИ талдап жатыр ⏳...";
    const res = await fetch(`${API_URL}/simulator/submit`, { method: "POST", headers: {"Content-Type":"application/json", "Authorization": `Bearer ${localStorage.getItem("token")}`}, body: JSON.stringify({score: simScore, total: simData.length, wrong_topics: wTopics})});
    const d = await res.json(); document.getElementById("sim-ai").innerText = d.feedback;
    if(d.new_xp){ localStorage.setItem("xp", d.new_xp); updateUI(); }
}