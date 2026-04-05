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
from database import get_db
import models

load_dotenv()
router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "diplomdyq_jumys_super_secret_key"
ALGORITHM = "HS256"

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ai_client = Groq(api_key=GROQ_API_KEY)

def get_password_hash(password):
    return pwd_context.hash(password[:70])

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password[:70], hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ЖАҢА: Токенді тексеріп, XP мен Жалынды (Streak) есептейтін функция
def add_xp_to_user(token: str, points: int, db: Session):
    if not token: 
        return None
    try:
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.xp += points
                
                # Жалынды (Streak) есептеу
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
                
                if user.last_active_date == today:
                    pass # Бүгін кіріп қойған, жалын өспейді
                elif user.last_active_date == yesterday:
                    user.streak += 1 # Кеше де кірген, жалынды жалғастырамыз
                    user.last_active_date = today
                else:
                    user.streak = 1 # Көптен бері кірмеген немесе бірінші рет
                    user.last_active_date = today
                
                db.commit()
                db.refresh(user)
                return {"xp": user.xp, "streak": user.streak}
    except:
        pass
    return None

@router.post("/register")
def register(user: models.UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Бұл email тіркеліп қойған")
    hashed_pw = get_password_hash(user.password)
    new_user = models.User(name=user.name, email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    return {"message": "Сәтті тіркелдіңіз!"}

@router.post("/login")
def login(user: models.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Қате email немесе құпия сөз")
    access_token = create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "name": db_user.name, 
        "role": db_user.role,
        "xp": db_user.xp,
        "streak": db_user.streak # Кірген кезде жалынды да қайтарамыз
    }

@router.post("/chat-vision")
def chat_with_vision(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Сен ҰБТ математика мұғалімісің. Бұл суреттегі есепті тауып, оны LaTeX форматында қадам-қадаммен түсіндіріп шығарып бер."},
                        {"type": "image_url", "image_url": {"url": req.message}},
                    ],
                }
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
        )
        reply = chat_completion.choices[0].message.content
        stats = add_xp_to_user(authorization, 15, db) 
        new_xp = stats["xp"] if stats else None
        new_streak = stats["streak"] if stats else None
        return {"reply": reply, "new_xp": new_xp, "new_streak": new_streak}
    except Exception as e:
        raise HTTPException(status_code=500, detail="ЖИ суретті көре алмады")

@router.post("/chat")
def chat_with_ai(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Сен математика мұғалімісің. LaTeX қолдан."},
                {"role": "user", "content": req.message}
            ],
            model="llama-3.1-8b-instant",
        )
        reply = chat_completion.choices[0].message.content
        stats = add_xp_to_user(authorization, 10, db) 
        new_xp = stats["xp"] if stats else None
        new_streak = stats["streak"] if stats else None
        return {"reply": reply, "new_xp": new_xp, "new_streak": new_streak}
    except:
        raise HTTPException(status_code=500, detail="ЖИ қатесі")
    
@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    try:
        top_users = db.query(models.User).order_by(models.User.xp.desc()).limit(10).all()
        result = [{"name": u.name, "xp": u.xp} for u in top_users]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Рейтингті алу мүмкін болмады")

@router.post("/analyze-weakness")
def analyze_weakness(req: models.WeaknessRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not req.questions:
        return {"reply": "Әзірге маған ешқандай есеп жіберген жоқсыз."}
    
    prompt = f"Оқушы мынадай сұрақтар сұрады: {', '.join(req.questions)}. Әлсіз тұстарын тауып, түсіндіріп 2 жаңа есеп бер. Формулаларды $ белгісімен (LaTeX) жаз."

    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Сен ҰБТ математика мұғалімісің. Оқушының қателерімен жұмыс істейсің."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
        )
        reply = chat_completion.choices[0].message.content
        stats = add_xp_to_user(authorization, 20, db) 
        new_xp = stats["xp"] if stats else None
        new_streak = stats["streak"] if stats else None
        return {"reply": reply, "new_xp": new_xp, "new_streak": new_streak}
    except Exception as e:
        raise HTTPException(status_code=500, detail="ЖИ талдау жасай алмады")