import os
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
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

class QuizRequest(BaseModel): topic: str
class LessonRequest(BaseModel): topic: str
class RoadmapRequest(BaseModel): target: str
class CareerRequest(BaseModel): answers: str # ЖАҢА

def get_password_hash(password): return pwd_context.hash(password[:70])
def verify_password(plain_password, hashed_password): return pwd_context.verify(plain_password[:70], hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy(); expire = datetime.now(timezone.utc) + timedelta(days=7); to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def add_xp_to_user(token: str, points: int, db: Session):
    if not token: return None
    try:
        if token.startswith("Bearer "): token = token.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]); email = payload.get("sub")
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.xp += points
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d"); yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
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
        c1 = models.Course(id=1, title="Математикалық сауаттылық", description="2026", image_url="https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80")
        c2 = models.Course(id=2, title="Математика", description="2026", image_url="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80")
        c3 = models.Course(id=3, title="Информатика", description="2026", image_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80")
        db.add_all([c1, c2, c3]); db.commit()

        modules = [
            models.Module(id=1, title="Сандық талқылау", course_id=1), models.Module(id=2, title="Анықсыздық", course_id=1),
            models.Module(id=5, title="Сандар", course_id=2), models.Module(id=6, title="Теңдеулер", course_id=2),
            models.Module(id=15, title="Компьютерлік жүйелер", course_id=3)
        ]
        db.add_all(modules); db.commit()

        raw_lessons = [
            (1, "Сандық өрнектермен берілген логикалық тапсырмалар"), (2, "Арифметикалық орта, құлаш, медиана, мода"),
            (5, "Түбірлерге амалдар қолдану. Дәрежелерге амалдар қолдану"), (6, "Сызықтық және квадрат теңдеулер"),
            (15, "Компьютердің құрылғылары. Компьютерлік желілер")
        ]
        lessons_to_add = []
        for mod_id, text_block in raw_lessons:
            for part in text_block.split('.'):
                if part.strip(): lessons_to_add.append(models.Lesson(title=part.strip(), module_id=mod_id))
        db.add_all(lessons_to_add); db.commit()
    except Exception as e: db.rollback()

@router.post("/register")
def register(user: models.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first(): raise HTTPException(status_code=400, detail="Email тіркелген")
    db.add(models.User(name=user.name, email=user.email, hashed_password=get_password_hash(user.password))); db.commit(); return {"message": "Сәтті!"}

@router.post("/login")
def login(user: models.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password): raise HTTPException(status_code=400, detail="Қате мәлімет")
    auto_seed_data(db)
    return {"access_token": create_access_token({"sub": db_user.email}), "name": db_user.name, "xp": db_user.xp, "streak": db_user.streak}

@router.get("/courses-full")
def get_all_courses_with_modules(db: Session = Depends(get_db)):
    courses = db.query(models.Course).all()
    return [{"title": c.title, "image_url": c.image_url, "modules": [{"title": m.title, "lessons": [{"title": l.title} for l in db.query(models.Lesson).filter(models.Lesson.module_id == m.id).all()]} for m in db.query(models.Module).filter(models.Module.course_id == c.id).all()]} for c in courses]

@router.post("/generate-lesson")
def generate_lesson(req: LessonRequest, authorization: str = Header(None)):
    try:
        comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Мәтінді әдемілеп бер."}, {"role": "user", "content": f"'{req.topic}' тақырыбы бойынша оқушыға түсінікті қысқаша конспект, негізгі формулалар (LaTeX) және 1 мысал жазып бер. Markdown форматында қайтар."}], model="llama-3.1-8b-instant")
        return {"content": comp.choices[0].message.content}
    except Exception as e: return {"content": "Конспект жасау кезінде қате кетті."}

@router.post("/generate-quiz")
def generate_quiz(req: QuizRequest, authorization: str = Header(None)):
    try:
        comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Сен тек JSON қайтарасың."}, {"role": "user", "content": f"'{req.topic}' тақырыбы бойынша 3 тест сұрағын құрастыр. ЖАУАПТЫ ТЕК ҚАТАҢ JSON ФОРМАТЫНДА ҚАЙТАР: [{{\"q\":\"Сұрақ?\",\"options\":[\"1\",\"2\",\"3\",\"4\"],\"ans\":\"Дұрыс\"}}]" }], model="llama-3.1-8b-instant")
        return {"quiz": json.loads(comp.choices[0].message.content.replace("```json", "").replace("```", "").strip())}
    except Exception as e: return {"quiz": [{"q": "Қате кетті", "options": ["ОК"], "ans": "ОК"}]}

@router.post("/generate-flashcards")
def generate_flashcards(req: LessonRequest, authorization: str = Header(None)):
    try:
        comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Сен тек JSON қайтарасың."}, {"role": "user", "content": f"'{req.topic}' тақырыбы бойынша есте сақтауға арналған 4 флешкарта құрастыр. ЖАУАПТЫ ТЕК ҚАТАҢ JSON ФОРМАТЫНДА ҚАЙТАР: [{{\"front\":\"Термин\", \"back\":\"Анықтамасы\"}}]" }], model="llama-3.1-8b-instant")
        return {"cards": json.loads(comp.choices[0].message.content.replace("```json", "").replace("```", "").strip())}
    except Exception as e: return {"cards": []}

@router.post("/generate-roadmap")
def generate_roadmap(req: RoadmapRequest, authorization: str = Header(None)):
    try:
        comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Сен тәжірибелі ҰБТ тәлімгерісің."}, {"role": "user", "content": f"Оқушының мақсаты: '{req.target}'. Осы мақсатқа жету үшін ҰБТ-ға дайындықтың мотивациялық, 4 апталық нақты оқу жоспарын жасап бер. Markdown қолдан."}], model="llama-3.1-8b-instant")
        return {"roadmap": comp.choices[0].message.content}
    except Exception as e: return {"roadmap": "Қате кетті."}

# ЖАҢА: ЖИ МАМАНДЫҚ ТАҢДАУШЫ (CAREER PREDICTOR)
@router.post("/generate-career")
def generate_career(req: CareerRequest, authorization: str = Header(None)):
    try:
        comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Сен кәсіби профориентологсың."}, {"role": "user", "content": f"Оқушының қызығушылықтары: '{req.answers}'. Осыған қарап 1 мамандық, 1 Қазақстандық университет және ҰБТ бейіндік пәндерін ұсын. Мотивациялық мәтін жаз. Markdown қолдан."}], model="llama-3.1-8b-instant")
        return {"career": comp.choices[0].message.content}
    except Exception as e: return {"career": "Қате кетті."}

@router.post("/chat-vision")
def chat_with_vision(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "user", "content": [{"type": "text", "text": "Бұл есепті шығарып бер."}, {"type": "image_url", "image_url": {"url": req.message}}]}], model="llama-3.2-11b-vision-preview")
    stats = add_xp_to_user(authorization, 15, db); return {"reply": comp.choices[0].message.content, "new_xp": stats["xp"] if stats else None}

@router.post("/chat")
def chat_with_ai(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "LaTeX қолдан."}, {"role": "user", "content": req.message}], model="llama-3.1-8b-instant")
    stats = add_xp_to_user(authorization, 10, db); return {"reply": comp.choices[0].message.content, "new_xp": stats["xp"] if stats else None}

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)): return [{"name": u.name, "xp": u.xp} for u in db.query(models.User).order_by(models.User.xp.desc()).limit(10).all()]

@router.post("/add-xp")
def add_custom_xp(req: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    stats = add_xp_to_user(authorization, req.get("points", 0), db); return {"new_xp": stats["xp"] if stats else None}

@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    total_xp = db.query(func.sum(models.User.xp)).scalar() or 0
    top_user = db.query(models.User).order_by(models.User.xp.desc()).first()
    return {"total_users": total_users, "total_xp": total_xp, "top_user": top_user.name if top_user else "Жоқ"}