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
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
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
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            if user.last_active_date == today: pass 
            elif user.last_active_date == yesterday: user.streak += 1; user.last_active_date = today
            else: user.streak = 1; user.last_active_date = today
            db.commit(); db.refresh(user)
            return {"xp": user.xp, "streak": user.streak}
    return None

# --- АВТОРИЗАЦИЯ ---
@router.post("/register")
def register(user: models.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first(): 
        raise HTTPException(status_code=400, detail="Email тіркелген")
    db.add(models.User(name=user.name, email=user.email, hashed_password=get_password_hash(user.password)))
    db.commit()
    return {"message": "Сәтті!"}

@router.post("/login")
def login(user: models.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password): 
        raise HTTPException(status_code=400, detail="Қате мәлімет")
    return {
        "access_token": create_access_token({"sub": db_user.email}), 
        "name": db_user.name, "xp": db_user.xp, "streak": db_user.streak, "avatar": db_user.avatar_url
    }

# --- КУРСТАР ЖӘНЕ ЖИ (AI) ---
@router.get("/courses-full")
def get_all_courses_with_modules(db: Session = Depends(get_db)):
    courses = db.query(models.Course).all()
    return [{"title": c.title, "image_url": c.image_url, "modules": [{"title": m.title, "lessons": [{"title": l.title} for l in db.query(models.Lesson).filter(models.Lesson.module_id == m.id).all()]} for m in db.query(models.Module).filter(models.Module.course_id == c.id).all()]} for c in courses]

@router.post("/chat")
def chat_with_ai(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "LaTeX қолдан."}, {"role": "user", "content": req.message}], model="llama-3.1-8b-instant")
    stats = add_xp_to_user(authorization, 10, db)
    return {"reply": comp.choices[0].message.content, "new_xp": stats["xp"] if stats else None}

@router.post("/add-xp")
def add_custom_xp(req: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    stats = add_xp_to_user(authorization, req.get("points", 0), db); return {"new_xp": stats["xp"] if stats else None}

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)): 
    return [{"name": u.name, "xp": u.xp} for u in db.query(models.User).order_by(models.User.xp.desc()).limit(10).all()]

# ================= ЖАҢА ФУНКЦИЯЛАР (ҚАТЕЛЕР ЖӘНЕ ДҮКЕН) =================

@router.post("/errors/save")
def save_error(req: models.ErrorSubmit, authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    if not email: raise HTTPException(status_code=401, detail="Авторизациядан өтіңіз")
    db.add(models.ErrorRecord(user_email=email, topic=req.topic, question=req.question, user_answer=req.user_answer, correct_answer=req.correct_answer))
    db.commit()
    return {"message": "Қате сақталды!"}

@router.get("/errors")
def get_errors(authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email_from_token(authorization)
    if not email: raise HTTPException(status_code=401, detail="Авторизациядан өтіңіз")
    return db.query(models.ErrorRecord).filter(models.ErrorRecord.user_email == email).order_by(models.ErrorRecord.created_at.desc()).all()

@router.post("/errors/practice")
def practice_error(req: models.ErrorSubmit, authorization: str = Header(None)):
    prompt = f"Оқушы '{req.topic}' тақырыбында мына сұрақтан қате жіберді: '{req.question}'. Жауабы: {req.user_answer}. Дұрысы: {req.correct_answer}. Қатесін түсіндіріп, дәл осыған ұқсас 1 ЖАҢА есеп (жауап нұсқаларымен) бер."
    comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "Сен ҰБТ мұғалімісің."}, {"role": "user", "content": prompt}], model="llama-3.1-8b-instant")
    return {"reply": comp.choices[0].message.content}

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
    if not email: raise HTTPException(status_code=401, detail="Авторизациядан өтіңіз")
    user = db.query(models.User).filter(models.User.email == email).first()
    item = db.query(models.StoreItem).filter(models.StoreItem.id == req.item_id).first()
    
    if not item or user.xp < item.cost: raise HTTPException(status_code=400, detail="XP жеткіліксіз немесе зат жоқ!")
    
    user.xp -= item.cost
    inv = list(user.inventory) if user.inventory else []
    inv.append(item.name)
    user.inventory = inv
    if item.item_type == "avatar": user.avatar_url = item.value
    db.commit()
    return {"message": "Сатып алынды!", "new_xp": user.xp, "avatar_url": user.avatar_url}