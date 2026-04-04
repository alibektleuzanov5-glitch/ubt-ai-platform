const API_URL = "https://ubt-math-api.onrender.com/api";

// Тіркелу мен Кіру формаларын ауыстырып қосатын функция (toggle)
function toggleForms() {
    const loginForm = document.getElementById("loginForm");
    const regForm = document.getElementById("regForm");
    if (loginForm.style.display === "none") {
        loginForm.style.display = "block";
        regForm.style.display = "none";
    } else {
        loginForm.style.display = "none";
        regForm.style.display = "block";
    }
}

// Жүйеге кіру функциясы
async function login() {
    // ID-лер HTML-дегімен бірдей болуы шарт!
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
            body: JSON.stringify({ email: emailField.value, password: passField.value })
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
    }
}

// Тіркелу функциясы
async function register() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPass").value;

    const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    alert(data.message || data.detail);
}