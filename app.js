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
function show(id) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id==='store-section') loadStore(); if(id==='league-section') loadLeague(); if(id==='errors-section') loadErrors();
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
    document.getElementById("chat-box").innerHTML += `<div><b>Сен:</b> ${v}</div>`;
    const res = await fetch(`${API_URL}/chat`, { method: "POST", headers: {"Content-Type":"application/json", "Authorization": `Bearer ${localStorage.getItem("token")}`}, body: JSON.stringify({message: v})});
    const d = await res.json(); document.getElementById("chat-box").innerHTML += `<div><b>ЖИ:</b> ${d.reply}</div>`;
    if(d.new_xp){ localStorage.setItem("xp", d.new_xp); updateUI(); }
}

async function getParentCode() {
    const res = await fetch(`${API_URL}/generate-parent-code`, { headers: {"Authorization": `Bearer ${localStorage.getItem("token")}`} });
    const d = await res.json();
    document.getElementById("parent-code-display").innerText = "Телеграм код: " + d.code + (d.is_linked ? " (Байланысқан)" : " (Байланыспаған)");
}

async function loadStore() {
    const res = await fetch(`${API_URL}/store`); const d = await res.json();
    document.getElementById("store-container").innerHTML = d.map(i => `<div class="store-card"><img src="${i.value}"><br><button onclick="buy(${i.id}, ${i.cost})">${i.name} - ${i.cost}XP</button></div>`).join('');
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
    document.getElementById("leaderboard").innerHTML = d.leaderboard.map((u, i) => `<tr><td>#${i+1}</td><td><img src="${u.avatar}" width="20"> ${u.name}</td><td>${u.weekly_xp} XP</td></tr>`).join('');
}

const simData = [{q:"2+2?", options:["3","4","5"], ans:"4", topic:"Математика"}]; let currQ=0, simScore=0, wTopics=[];
function startSim() { currQ=0; simScore=0; wTopics=[]; document.getElementById("sim-start").style.display="none"; document.getElementById("sim-test").style.display="block"; renderQ(); }
function renderQ() {
    if(currQ>=simData.length) return finishSim();
    const q = simData[currQ]; document.getElementById("sim-q").innerText = q.q;
    document.getElementById("sim-opts").innerHTML = q.options.map(o => `<button class="opt-btn" onclick="ans('${o}')">${o}</button>`).join('');
}
function ans(v) { if(v===simData[currQ].ans) simScore++; else wTopics.push(simData[currQ].topic); currQ++; renderQ(); }
async function finishSim() {
    document.getElementById("sim-test").style.display="none"; document.getElementById("sim-res").style.display="block";
    document.getElementById("sim-score").innerText = simScore;
    const res = await fetch(`${API_URL}/simulator/submit`, { method: "POST", headers: {"Content-Type":"application/json", "Authorization": `Bearer ${localStorage.getItem("token")}`}, body: JSON.stringify({score: simScore, total: simData.length, wrong_topics: wTopics})});
    const d = await res.json(); document.getElementById("sim-ai").innerText = d.feedback;
    if(d.new_xp){ localStorage.setItem("xp", d.new_xp); updateUI(); }
}