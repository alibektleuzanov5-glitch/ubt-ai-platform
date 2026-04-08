import os
import json
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone
from groq import Groq
from dotenv import load_dotenv
from database import get_db
import models

load_dotenv()
router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "diplomdyq_jumys_super_secret_key"
ALGORITHM = "HS256"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ai_client = Groq(api_key=GROQ_API_KEY)

def get_password_hash(password): return pwd_context.hash(password[:70])
def verify_password(plain_password, hashed_password): return pwd_context.verify(plain_password[:70], hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now(timezone.utc) + timedelta(days=7)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_email_from_token(token: str):
    if not token: return None
    try:
        if token.startswith("Bearer "): token = token.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except: return None

def add_xp_to_user(token: str, points: int, db: Session):
    email = get_user_email_from_token(token)
    if email:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.xp += points
            user.weekly_xp += points # ЖАҢА: Лига үшін апталық XP
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            if user.last_active_date == yesterday: user.streak += 1
            elif user.last_active_date != today: user.streak = 1
            user.last_active_date = today
            db.commit(); db.refresh(user)
            return {"xp": user.xp, "streak": user.streak, "league": user.league}
    return None

# --- АВТОРИЗАЦИЯ ---
@router.post("/register")
def register(user: models.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first(): raise HTTPException(status_code=400, detail="Email тіркелген")
    db.add(models.User(name=user.name, email=user.email, hashed_password=get_password_hash(user.password)))
    db.commit()
    return {"message": "Сәтті!"}

@router.post("/login")
def login(user: models.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password): raise HTTPException(status_code=400, detail="Қате мәлімет")
    return {"access_token": create_access_token({"sub": db_user.email}), "name": db_user.name, "xp": db_user.xp, "streak": db_user.streak, "avatar": db_user.avatar_url, "league": db_user.league}

# --- КУРСТАР ЖӘНЕ ЧАТ ---
@router.get("/courses-full")
def get_all_courses(db: Session = Depends(get_db)):
    courses = db.query(models.Course).all()
    return [{"title": c.title, "image_url": c.image_url, "modules": [{"title": m.title, "lessons": [{"title": l.title} for l in db.query(models.Lesson).filter(models.Lesson.module_id == m.id).all()]} for m in db.query(models.Module).filter(models.Module.course_id == c.id).all()]} for c in courses]

@router.post("/chat")
def chat_with_ai(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "LaTeX қолдан."}, {"role": "user", "content": req.message}], model="llama-3.1-8b-instant")
    stats = add_xp_to_user(authorization, 10, db)
    return {"reply": comp.choices[0].message.content, "new_xp": stats["xp"] if stats else None}

# --- ҚАТЕЛЕР ДӘПТЕРІ ---
@router.post("/errors/save")
def save_error(req: models.ErrorSubmit, authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    db.add(models.ErrorRecord(user_email=email, topic=req.topic, question=req.question, user_answer=req.user_answer, correct_answer=req.correct_answer))
    db.commit()
    return {"message": "Қате сақталды!"}

@router.get("/errors")
def get_errors(authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    return db.query(models.ErrorRecord).filter(models.ErrorRecord.user_email == email).order_by(models.ErrorRecord.created_at.desc()).all()

@router.post("/errors/practice")
def practice_error(req: models.ErrorSubmit, authorization: str = Header(None)):
    prompt = f"Оқушы '{req.topic}' тақырыбында сұрақтан қателесті. Жауабы: {req.user_answer}. Дұрысы: {req.correct_answer}. Қатесін түсіндіріп, ұқсас 1 ЖАҢА есеп бер."
    comp = ai_client.chat.completions.create(messages=[{"role": "user", "content": prompt}], model="llama-3.1-8b-instant")
    return {"reply": comp.choices[0].message.content}

# --- ДҮКЕН ---
@router.get("/store")
def get_store_items(db: Session = Depends(get_db)):
    if db.query(models.StoreItem).count() == 0:
        db.add_all([
            models.StoreItem(name="Отты Аватар", item_type="avatar", cost=500, value="https://api.dicebear.com/7.x/bottts/svg?seed=Fire"),
            models.StoreItem(name="Хакер", item_type="avatar", cost=1000, value="https://api.dicebear.com/7.x/bottts/svg?seed=Hacker"),
            models.StoreItem(name="Космос", item_type="avatar", cost=2000, value="https://api.dicebear.com/7.x/bottts/svg?seed=Space")
        ])
        db.commit()
    return db.query(models.StoreItem).all()

@router.post("/store/buy")
def buy_item(req: models.StoreBuy, authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    user = db.query(models.User).filter(models.User.email == email).first()
    item = db.query(models.StoreItem).filter(models.StoreItem.id == req.item_id).first()
    if not item or user.xp < item.cost: raise HTTPException(status_code=400, detail="XP жеткіліксіз!")
    user.xp -= item.cost
    if item.item_type == "avatar": user.avatar_url = item.value
    db.commit()
    return {"new_xp": user.xp, "avatar_url": user.avatar_url}

# ================= ЖАҢА ФУНКЦИЯЛАР =================

# 1. ЛИГАЛАР (Рейтинг)
@router.get("/league")
def get_league(authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    if not email: raise HTTPException(status_code=401)
    user = db.query(models.User).filter(models.User.email == email).first()
    
    # Осы лигадағы топ-10 оқушыны шығару
    leaders = db.query(models.User).filter(models.User.league == user.league).order_by(models.User.weekly_xp.desc()).limit(10).all()
    
    return {
        "current_league": user.league,
        "weekly_xp": user.weekly_xp,
        "leaderboard": [{"name": u.name, "weekly_xp": u.weekly_xp, "avatar": u.avatar_url} for u in leaders]
    }

# 2. ҰБТ СИМУЛЯТОРЫ (AI Аналитикасымен)
@router.post("/simulator/submit")
def submit_simulator(req: models.SimulatorSubmit, authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    
    # 1. AI-дан стратегиялық талдау сұрау
    topics_str = ", ".join(req.wrong_topics) if req.wrong_topics else "ешқандай (бәрі дұрыс)"
    prompt = f"Оқушы ҰБТ диагностикасынан {req.total} сұрақтың {req.score} дұрыс тапты. Қателескен тақырыптары: {topics_str}. Осы оқушыға мотивация беріп, ҰБТ-да уақытты қалай үнемдеуге болатыны және қателескен тақырыптарын қалай оқу керектігі туралы 3 абзацтық нақты стратегиялық кеңес бер."
    
    try:
        comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Сен ҰБТ тәлімгерісің."}, {"role": "user", "content": prompt}], model="llama-3.1-8b-instant")
        feedback = comp.choices[0].message.content
    except:
        feedback = "ЖИ уақытша қолжетімсіз. Дегенмен нәтижеңіз жақсы, оқуды жалғастыра беріңіз!"
    
    # 2. Базаға сақтау және XP беру (дұрыс жауап үшін 20 XP)
    db.add(models.SimulatorResult(user_email=email, score=req.score, total_questions=req.total, ai_feedback=feedback))
    stats = add_xp_to_user(authorization, req.score * 20, db)
    
    return {"score": req.score, "feedback": feedback, "new_xp": stats["xp"] if stats else None}