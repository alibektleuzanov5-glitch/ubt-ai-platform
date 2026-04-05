import os
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
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

# --- API МАРШРУТТАРЫ ---

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
        "xp": db_user.xp 
    }

# ЖАҢА: Суретті талдайтын ЖИ мұғалім
@router.post("/chat-vision")
def chat_with_vision(req: models.ChatMessage):
    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Сен ҰБТ математика мұғалімісің. Бұл суреттегі есепті тауып, оны LaTeX форматында қадам-қадаммен түсіндіріп шығарып бер."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": req.message, # Мұнда суреттің Base64 коды келеді
                            },
                        },
                    ],
                }
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
        )
        return {"reply": chat_completion.choices[0].message.content}
    except Exception as e:
        print(f"Vision Error: {e}")
        raise HTTPException(status_code=500, detail="ЖИ суретті көре алмады")

@router.post("/chat")
def chat_with_ai(req: models.ChatMessage):
    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Сен математика мұғалімісің. LaTeX қолдан."},
                {"role": "user", "content": req.message}
            ],
            model="llama-3.1-8b-instant",
        )
        return {"reply": chat_completion.choices[0].message.content}
    except:
        raise HTTPException(status_code=500, detail="ЖИ қатесі")

# Басқа маршруттар өзгеріссіз қалады (courses, save-result т.б.)