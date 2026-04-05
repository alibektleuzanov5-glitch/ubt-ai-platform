const API_URL = "https://ubt-math-api.onrender.com/api";

// Жүйеге кіру функциясы
async function login() {
    const emailField = document.getElementById("loginEmail");
    const passField = document.getElementById("loginPass");

    if (!emailField || !passField) {
        console.error("HTML-де loginEmail немесе loginPass табылмады!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: emailField.value, 
                password: String(passField.value).trim().substring(0, 50) 
            })
        });
        const data = await res.json();
        if (data.access_token) {
            localStorage.setItem("token", data.access_token);
            alert("Қош келдіңіз!");
            window.location.reload();
        } else {
            alert(data.detail || "Қате!");
        }
    } catch (err) {
        console.error("Кіру қатесі:", err);
        alert("Сервермен байланыс жоқ!");
    }
}

// Тіркелу функциясы
async function register() {
    try {
        const name = document.getElementById("regName").value;
        const email = document.getElementById("regEmail").value;
        let password = document.getElementById("regPass").value;

        password = String(password).trim().substring(0, 50);

        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email, password: password })
        });
        const data = await res.json();
        
        if (res.ok) {
            alert("🏆 ЖЕҢІС!!! Сіз сәтті тіркелдіңіз! Енді кіру формасы арқылы кіре аласыз.");
        } else {
            alert(data.message || data.detail);
        }
    } catch (err) {
        console.error("Тіркелу қатесі:", err);
        alert("Сервермен байланыс жоқ!");
    }
}

// ЖИ-мен сөйлесу (Қате шықпас үшін уақытша қосылды)
function sendChat() {
    alert("Чат жүйесі енді қосылады!");
}