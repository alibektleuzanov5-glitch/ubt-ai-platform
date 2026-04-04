const API_URL = 'http://127.0.0.1:8000/api';
window.currentTestQuestions = [];

function toggleForms() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('register-form').classList.toggle('hidden');
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(res.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('userEmail', email); 
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userXP', data.xp); 
            checkAuth();
        } else alert(data.detail || "Қате");
    } catch(e) { alert("Сервермен байланыс жоқ"); }
}

async function register() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, email, password })
        });
        if(res.ok) { alert("Сәтті тіркелдіңіз!"); toggleForms(); } 
        else { const data = await res.json(); alert(data.detail); }
    } catch(e) { alert("Қате"); }
}

async function showAnalytics() {
    const email = localStorage.getItem('userEmail');
    const section = document.getElementById('analytics-section');
    const content = document.getElementById('analytics-content');

    if (!email) {
        alert("Алдымен жүйеге кіріңіз!");
        return;
    }

    section.style.display = 'block';
    content.innerHTML = '<p>⌛ ЖИ сараптама жасап жатыр...</p>';

    try {
        const res = await fetch(`${API_URL}/my-analytics/${email}`);
        const data = await res.json();
        
        if (res.ok) {
            content.innerHTML = marked.parse(data.analysis);
        } else {
            content.innerHTML = `<p style="color:red">Қате: ${data.analysis}</p>`;
        }
    } catch (e) {
        content.innerHTML = '<p style="color:red">Сервермен байланыс жоқ.</p>';
    }
}

function logout() { localStorage.clear(); location.reload(); }

function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('chat-widget').classList.remove('hidden'); 
        
        document.getElementById('nav-user-name').innerText = `Сәлем, ${localStorage.getItem('userName')}!`;
        document.getElementById('user-xp-display').innerText = localStorage.getItem('userXP') || 0; 
        
        loadCourses();
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('dashboard-section').classList.add('hidden');
        document.getElementById('tools-section').classList.add('hidden');
        document.getElementById('analytics-section').style.display = 'none';
        document.getElementById('chat-widget').classList.add('hidden');
    }
}

function showTools() {
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('tools-section').classList.remove('hidden');
}

function hideTools() {
    document.getElementById('tools-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    loadCourses();
}

async function loadCourses() {
    const container = document.getElementById('courses-list');
    document.getElementById('back-button-container').classList.add('hidden');
    try {
        const res = await fetch(`${API_URL}/courses`);
        const courses = await res.json();
        container.innerHTML = '';
        courses.forEach(c => {
            container.innerHTML += `
                <div class="course-card">
                    <img src="${c.image_url}" class="course-img">
                    <div class="course-content">
                        <h3 class="course-title">${c.title}</h3>
                        <p class="course-desc">${c.description}</p>
                        <button style="width:100%" onclick="openCourse(${c.id})">Оқуды бастау</button>
                    </div>
                </div>`;
        });
    } catch (e) { }
}

async function openCourse(courseId) {
    const container = document.getElementById('courses-list');
    document.getElementById('page-title').innerText = "Курс сабақтары";
    document.getElementById('page-desc').innerText = "Видеоны көріп, тест тапсырыңыз.";
    document.getElementById('back-button-container').classList.remove('hidden');
    
    try {
        const res = await fetch(`${API_URL}/courses/${courseId}/lessons`);
        const lessons = await res.json();
        container.innerHTML = '';
        
        container.innerHTML += `
            <div style="grid-column: 1 / -1; background: #f0fdf4; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px dashed #10b981;">
                <h3 style="margin-top: 0; color: #047857;">⚙️ ЖИ Сабақ генераторы (Админ)</h3>
                <p style="font-size: 0.9rem; color: #065f46;">Тақырыпты жазыңыз, ЖИ автоматты түрде теория мен 3 тест сұрағын құрастырып, базаға қосады.</p>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="ai-topic-input" placeholder="Мысалы: Квадрат теңдеулер..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #a7f3d0;">
                    <button onclick="generateLesson(${courseId})" style="background-color: #10b981; white-space: nowrap;">✨ Жасау</button>
                </div>
                <p id="ai-gen-status" style="margin-top: 10px; font-weight: bold; color: #047857; display: none;">⏳ ЖИ ойланып, сабақ жазып жатыр... Бұл 10-15 секунд алуы мүмкін. Күте тұрыңыз.</p>
            </div>
        `;

        lessons.forEach(l => {
            const parsedText = marked.parse(l.content);
            container.innerHTML += `
                <div class="course-card" style="grid-column: 1 / -1; max-width: 800px; margin: 0 auto; width: 100%;">
                    <div class="course-content">
                        <h3 class="course-title">${l.title}</h3>
                        <div style="margin: 15px 0; border-radius: 8px; overflow: hidden;">
                            <iframe width="100%" height="400" src="${l.video_url}" frameborder="0" allowfullscreen></iframe>
                        </div>
                        <div class="course-desc ai-content" style="margin-bottom: 20px;">${parsedText}</div>
                        
                        <button style="width:100%; background-color: var(--success-color);" onclick="openTest(${l.id})">Тест тапсыру</button>
                        
                        <button style="width:100%; background-color: #ef4444; margin-top: 10px;" onclick="deleteLesson(${l.id}, ${courseId})">
                            🗑️ Сабақты өшіру
                        </button>
                    </div>
                </div>`;
        });

        renderMathInElement(container, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError : false
        });
    } catch (e) { }
}

async function openTest(lessonId) {
    const container = document.getElementById('courses-list');
    try {
        const res = await fetch(`${API_URL}/lessons/${lessonId}/questions`);
        const questions = await res.json();
        
        if(questions.length === 0) return alert("Тест сұрақтары жоқ!");
        
        window.currentTestQuestions = questions; 
        
        document.getElementById('page-title').innerText = "Тест тапсырмалары";
        container.innerHTML = '';
        
        questions.forEach((q, i) => {
            const parsedQuestionText = marked.parse(q.text);
            const parsedOptionA = marked.parse(q.option_a);
            const parsedOptionB = marked.parse(q.option_b);
            const parsedOptionC = marked.parse(q.option_c);

            container.innerHTML += `
                <div class="test-card" id="test-question-${q.id}" style="grid-column: 1 / -1; max-width: 800px; margin: 0 auto; width: 100%;">
                    <p><strong>${i+1}. ${parsedQuestionText}</strong></p>
                    <label><input type="radio" name="q${q.id}" value="A"> ${parsedOptionA}</label>
                    <label><input type="radio" name="q${q.id}" value="B"> ${parsedOptionB}</label>
                    <label><input type="radio" name="q${q.id}" value="C"> ${parsedOptionC}</label>
                    
                    <div id="ai-help-${q.id}" style="margin-top: 15px; padding: 15px; background: #e0f2fe; border-left: 4px solid var(--primary-color); border-radius: 8px; display: none;">
                        <p style="margin: 0; font-size: 0.9rem; color: #0369a1;">🤖 ЖИ Тьютор ойланып жатыр...</p>
                    </div>
                    
                    <button id="btn-ai-${q.id}" onclick="askAI(${q.id})" 
                        style="margin-top: 10px; background-color: #8b5cf6; padding: 8px 15px; font-size: 0.9rem; display: none;">
                        💡 Түсіндіріп берші
                    </button>
                </div>`;
        });
        
        container.innerHTML += `
            <div style="grid-column: 1 / -1; max-width: 800px; margin: 20px auto; width: 100%;">
                <button id="check-btn" style="width:100%; padding: 15px; font-size: 1.1rem;" onclick="checkResults()">Нәтижені көру</button>
            </div>`;

        renderMathInElement(container, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError : false
        });

    } catch(e) { alert("Қате"); }
}

async function generateLesson(courseId) {
    const topicInput = document.getElementById('ai-topic-input');
    const statusText = document.getElementById('ai-gen-status');
    const topic = topicInput.value.trim();

    if (!topic) {
        alert("Алдымен тақырыпты жазыңыз!");
        return;
    }

    statusText.style.display = 'block';
    topicInput.disabled = true;

    try {
        const res = await fetch(`${API_URL}/generate-lesson`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ course_id: courseId, topic: topic })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert("Сәтті! ЖИ сабақты және тест сұрақтарын жасап шығарды.");
            openCourse(courseId);
        } else {
            alert("Қате шықты: " + (data.detail || "Белгісіз қате"));
            statusText.style.display = 'none';
            topicInput.disabled = false;
        }
    } catch (e) {
        alert("Сервермен байланыс жоқ.");
        statusText.style.display = 'none';
        topicInput.disabled = false;
    }
}

function checkResults() {
    const questions = window.currentTestQuestions;
    if (!questions || questions.length === 0) return;

    let score = 0;
    questions.forEach(q => {
        const sel = document.querySelector(`input[name="q${q.id}"]:checked`);
        const aiBtn = document.getElementById(`btn-ai-${q.id}`);
        if (aiBtn) aiBtn.style.display = 'inline-block';
        
        if(sel && sel.value.trim().toUpperCase() === q.correct_option.trim().toUpperCase()) {
            score++;
        }
    });
    
    document.getElementById('check-btn').style.display = 'none';

    const userEmail = localStorage.getItem('userEmail');
    const lessonTitle = document.getElementById('page-title').innerText;

    if (userEmail) {
        fetch(`${API_URL}/save-result`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                user_email: userEmail,
                lesson_title: lessonTitle,
                score: score,
                total_questions: questions.length
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "ok") {
                localStorage.setItem('userXP', data.new_total_xp);
                document.getElementById('user-xp-display').innerText = data.new_total_xp;
                alert(`Сіздің нәтижеңіз: ${score} / ${questions.length} дұрыс жауап!\n\nТапқан ұпайыңыз: +${data.earned_xp} XP ⭐\n\nНәтижеңіз жеке кабинетіңізге сақталды.`);
            }
        })
        .catch(err => {
            alert(`Сіздің нәтижеңіз: ${score} / ${questions.length} дұрыс жауап!`);
        });
    } else {
        alert(`Сіздің нәтижеңіз: ${score} / ${questions.length} дұрыс жауап!`);
    }
}

async function askAI(questionId) {
    const helpBox = document.getElementById(`ai-help-${questionId}`);
    const selInput = document.querySelector(`input[name="q${questionId}"]:checked`);
    const selectedAnswer = selInput ? selInput.value : "Жауап белгіленбеген";
    
    const qObj = window.currentTestQuestions.find(q => q.id === questionId);
    const questionText = qObj ? qObj.text : "Сұрақ табылмады";

    helpBox.style.display = 'block';
    helpBox.innerHTML = '<p style="color: #0369a1;">🤖 ЖИ Тьютор ойланып жатыр...</p>';

    try {
        const res = await fetch(`${API_URL}/ask-tutor`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                question_text: questionText, 
                selected_answer: selectedAnswer 
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            const htmlContent = marked.parse(data.explanation);
            helpBox.innerHTML = `<div class="ai-content"><strong>🤖 AI Тьютор:</strong><br>${htmlContent}</div>`;
            
            renderMathInElement(helpBox, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError : false
            });
        } else {
            helpBox.innerHTML = `<p style="color: #dc2626;">Қате: ${data.detail}</p>`;
        }
    } catch (e) {
        helpBox.innerHTML = `<p style="color: #dc2626;">Сервермен байланыс жоқ.</p>`;
    }
}

async function deleteLesson(lessonId, courseId) {
    const isConfirmed = confirm("Бұл сабақты және оның ішіндегі тест сұрақтарын шынымен өшіргіңіз келе ме?");
    if (!isConfirmed) return;

    try {
        const res = await fetch(`${API_URL}/lessons/${lessonId}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            alert("Сабақ сәтті өшірілді!");
            openCourse(courseId);
        } else {
            alert("Өшіру кезінде қате шықты.");
        }
    } catch (e) {
        alert("Сервермен байланыс жоқ.");
    }
}

function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex';
}

function handleChatEnter(e) {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const inputField = document.getElementById('chat-input');
    const messageText = inputField.value.trim();
    if (!messageText) return;

    const chatMessages = document.getElementById('chat-messages');
    
    chatMessages.innerHTML += `<div class="msg user">${messageText}</div>`;
    inputField.value = '';
    
    const loadingId = "loading-" + Date.now();
    chatMessages.innerHTML += `<div class="msg ai" id="${loadingId}">⏳ Ойланып жатыр...</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: messageText })
        });
        
        const data = await res.json();
        const loadingElement = document.getElementById(loadingId);
        
        if (res.ok) {
            const parsedHtml = marked.parse(data.reply);
            loadingElement.innerHTML = parsedHtml;
            
            renderMathInElement(loadingElement, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError : false
            });
        } else {
            loadingElement.innerText = "Қате шықты, қайта көріңіз.";
            loadingElement.style.color = "red";
        }
    } catch (e) {
        document.getElementById(loadingId).innerText = "Сервермен байланыс жоқ.";
        document.getElementById(loadingId).style.color = "red";
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.onload = checkAuth;