import os
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone
from groq import Groq
from dotenv import load_dotenv
from database import get_db, engine
from pydantic import BaseModel
import models

load_dotenv()
router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "diplomdyq_jumys_super_secret_key"
ALGORITHM = "HS256"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ai_client = Groq(api_key=GROQ_API_KEY)

# --- MODELS ---
class QuizRequest(BaseModel):
    topic: str

def get_password_hash(password): return pwd_context.hash(password[:70])
def verify_password(plain_password, hashed_password): return pwd_context.verify(plain_password[:70], hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def add_xp_to_user(token: str, points: int, db: Session):
    if not token: return None
    try:
        if token.startswith("Bearer "): token = token.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.xp += points
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
                if user.last_active_date == today: pass 
                elif user.last_active_date == yesterday: user.streak += 1; user.last_active_date = today
                else: user.streak = 1; user.last_active_date = today
                db.commit(); db.refresh(user)
                return {"xp": user.xp, "streak": user.streak}
    except: pass
    return None

def auto_seed_data(db: Session):
    try:
        if db.query(models.Course).count() > 0: return 
        print("⏳ База толтырылуда...")
        c1 = models.Course(id=1, title="Математикалық сауаттылық", description="2026 жылғы тест", image_url="https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80")
        c2 = models.Course(id=2, title="Математика", description="2026 жылғы тест", image_url="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80")
        c3 = models.Course(id=3, title="Информатика", description="2026 жылғы тест", image_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80")
        db.add_all([c1, c2, c3])
        db.commit()

        modules = [
            models.Module(id=1, title="Сандық талқылау", course_id=1),
            models.Module(id=2, title="Анықсыздық", course_id=1),
            models.Module(id=3, title="Өзгерістер мен тәуелділіктер", course_id=1),
            models.Module(id=4, title="Кеңістік пен форма", course_id=1),
            models.Module(id=5, title="Сандар", course_id=2),
            models.Module(id=6, title="Теңдеулер", course_id=2),
            models.Module(id=15, title="Компьютерлік жүйелер", course_id=3),
            models.Module(id=16, title="Ақпараттық процестер", course_id=3),
            models.Module(id=17, title="Компьютерлік ойлау", course_id=3)
        ]
        db.add_all(modules)
        db.commit()

        raw_lessons = [
            (1, "Сандық өрнектермен берілген логикалық тапсырмалар"),
            (1, "Теңдеулердің көмегімен шешілетін мәтінді есептер"),
            (2, "Арифметикалық орта, құлаш, медиана, мода"),
            (5, "Түбірлерге амалдар қолдану. Дәрежелерге амалдар қолдану"),
            (6, "Сызықтық және квадрат теңдеулер"),
            (15, "Компьютердің құрылғылары. Компьютерлік желілер"),
            (17, "Python программалау тілінде алгоритмдерді программалау")
        ]
        lessons_to_add = []
        for mod_id, text_block in raw_lessons:
            for part in text_block.split('.'):
                if part.strip(): lessons_to_add.append(models.Lesson(title=part.strip(), module_id=mod_id))
        db.add_all(lessons_to_add)
        db.commit()
    except Exception as e: print(e); db.rollback()

# --- ROUTES ---
@router.post("/register")
def register(user: models.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Бұл email тіркеліп қойған")
    db.add(models.User(name=user.name, email=user.email, hashed_password=get_password_hash(user.password)))
    db.commit()
    return {"message": "Сәтті!"}

@router.post("/login")
def login(user: models.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Қате email немесе құпия сөз")
    auto_seed_data(db)
    return {"access_token": create_access_token({"sub": db_user.email}), "name": db_user.name, "xp": db_user.xp, "streak": db_user.streak}

@router.get("/courses-full")
def get_all_courses_with_modules(db: Session = Depends(get_db)):
    courses = db.query(models.Course).all()
    return [{"title": c.title, "image_url": c.image_url, "modules": [{"title": m.title, "lessons": [{"title": l.title} for l in db.query(models.Lesson).filter(models.Lesson.module_id == m.id).all()]} for m in db.query(models.Module).filter(models.Module.course_id == c.id).all()]} for c in courses]

# ЖАҢА: ЖИ Тест генераторы
@router.post("/generate-quiz")
def generate_quiz(req: QuizRequest, authorization: str = Header(None)):
    prompt = f"'{req.topic}' тақырыбы бойынша қазақ тілінде ҰБТ форматында 3 тест сұрағын құрастыр. ЖАУАПТЫ ТЕК ҚАТАҢ JSON ФОРМАТЫНДА ҚАЙТАР. Мысалы: [{{\"q\":\"Сұрақ?\",\"options\":[\"Жауап1\",\"Жауап2\",\"Жауап3\",\"Жауап4\"],\"ans\":\"Дұрыс жауап мәтіні\"}}]"
    try:
        comp = ai_client.chat.completions.create(
            messages=[{"role": "system", "content": "Сен тек JSON қайтаратын машинасын. Басқа ешқандай сөз қоспа."}, {"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant"
        )
        reply = comp.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        quiz_data = json.loads(reply)
        return {"quiz": quiz_data}
    except Exception as e:
        return {"quiz": [{"q": "Кешіріңіз, тест генерациялау мүмкін болмады.", "options": ["ОК", "Қате", "Жоқ", "Иә"], "ans": "ОК"}]}

@router.post("/chat-vision")
def chat_with_vision(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "user", "content": [{"type": "text", "text": "Бұл есепті шығарып бер."}, {"type": "image_url", "image_url": {"url": req.message}}]}], model="llama-3.2-11b-vision-preview")
    stats = add_xp_to_user(authorization, 15, db)
    return {"reply": comp.choices[0].message.content, "new_xp": stats["xp"] if stats else None, "new_streak": stats["streak"] if stats else None}

@router.post("/chat")
def chat_with_ai(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Сен мұғалімсің. LaTeX қолдан."}, {"role": "user", "content": req.message}], model="llama-3.1-8b-instant")
    stats = add_xp_to_user(authorization, 10, db)
    return {"reply": comp.choices[0].message.content, "new_xp": stats["xp"] if stats else None, "new_streak": stats["streak"] if stats else None}

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    return [{"name": u.name, "xp": u.xp} for u in db.query(models.User).order_by(models.User.xp.desc()).limit(10).all()]

@router.post("/add-xp")
def add_custom_xp(req: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    stats = add_xp_to_user(authorization, req.get("points", 0), db)
    return {"new_xp": stats["xp"] if stats else None}