import os, json, random
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
ai_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def verify_password(plain, hashed): return pwd_context.verify(plain[:70], hashed)
def get_user_email(token):
    if not token: return None
    try: return jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
    except: return None

def add_xp(token, points, db):
    email = get_user_email(token)
    if email:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.xp += points
            user.weekly_xp += points
            tdy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            yst = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            if user.last_active_date == yst: user.streak += 1
            elif user.last_active_date != tdy: user.streak = 1
            user.last_active_date = tdy
            db.commit(); db.refresh(user)
            return user
    return None

@router.post("/register")
def register(user: models.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first(): raise HTTPException(400, "Email бар")
    db.add(models.User(name=user.name, email=user.email, hashed_password=pwd_context.hash(user.password[:70])))
    db.commit(); return {"message": "Сәтті!"}

@router.post("/login")
def login(user: models.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password): raise HTTPException(400, "Қате")
    token = jwt.encode({"sub": db_user.email, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "name": db_user.name, "xp": db_user.xp, "streak": db_user.streak, "avatar": db_user.avatar_url, "league": db_user.league}

@router.get("/courses-full")
def courses(db: Session = Depends(get_db)):
    return [{"title": c.title, "image_url": c.image_url, "modules": [{"title": m.title, "lessons": [{"title": l.title} for l in db.query(models.Lesson).filter(models.Lesson.module_id == m.id).all()]} for m in db.query(models.Module).filter(models.Module.course_id == c.id).all()]} for c in db.query(models.Course).all()]

@router.post("/chat")
def chat(req: models.ChatMessage, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "system", "content": "LaTeX қолдан."}, {"role": "user", "content": req.message}], model="llama-3.1-8b-instant")
    u = add_xp(authorization, 10, db)
    return {"reply": comp.choices[0].message.content, "new_xp": u.xp if u else None}

@router.post("/errors/save")
def save_error(req: models.ErrorSubmit, authorization: str = Header(None), db: Session = Depends(get_db)):
    email = get_user_email(authorization)
    db.add(models.ErrorRecord(user_email=email, topic=req.topic, question=req.question, user_answer=req.user_answer, correct_answer=req.correct_answer))
    db.commit(); return {"message": "Сақталды"}

@router.get("/errors")
def get_errors(authorization: str = Header(None), db: Session = Depends(get_db)):
    return db.query(models.ErrorRecord).filter(models.ErrorRecord.user_email == get_user_email(authorization)).order_by(models.ErrorRecord.created_at.desc()).all()

@router.post("/errors/practice")
def practice_error(req: models.ErrorSubmit):
    comp = ai_client.chat.completions.create(messages=[{"role": "user", "content": f"Қате: '{req.question}', Жауабы: {req.user_answer}, Дұрысы: {req.correct_answer}. Түсіндіріп, ұқсас 1 ЖАҢА есеп бер."}], model="llama-3.1-8b-instant")
    return {"reply": comp.choices[0].message.content}

@router.get("/store")
def store(db: Session = Depends(get_db)):
    if db.query(models.StoreItem).count() == 0:
        db.add_all([models.StoreItem(name="Отты Аватар", item_type="avatar", cost=500, value="https://api.dicebear.com/7.x/bottts/svg?seed=Fire"), models.StoreItem(name="Хакер", item_type="avatar", cost=1000, value="https://api.dicebear.com/7.x/bottts/svg?seed=Hacker")])
        db.commit()
    return db.query(models.StoreItem).all()

@router.post("/store/buy")
def buy(req: models.StoreBuy, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == get_user_email(authorization)).first()
    item = db.query(models.StoreItem).filter(models.StoreItem.id == req.item_id).first()
    if not item or user.xp < item.cost: raise HTTPException(400, "Жеткіліксіз")
    user.xp -= item.cost
    if item.item_type == "avatar": user.avatar_url = item.value
    db.commit(); return {"new_xp": user.xp, "avatar_url": user.avatar_url}

@router.get("/league")
def league(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == get_user_email(authorization)).first()
    leaders = db.query(models.User).filter(models.User.league == user.league).order_by(models.User.weekly_xp.desc()).limit(10).all()
    return {"current_league": user.league, "weekly_xp": user.weekly_xp, "leaderboard": [{"name": u.name, "weekly_xp": u.weekly_xp, "avatar": u.avatar_url} for u in leaders]}

@router.post("/simulator/submit")
def simulator(req: models.SimulatorSubmit, authorization: str = Header(None), db: Session = Depends(get_db)):
    comp = ai_client.chat.completions.create(messages=[{"role": "user", "content": f"ҰБТ-да {req.total}-дан {req.score} алды. Қателері: {','.join(req.wrong_topics)}. Стратегия бер."}], model="llama-3.1-8b-instant")
    db.add(models.SimulatorResult(user_email=get_user_email(authorization), score=req.score, total_questions=req.total, ai_feedback=comp.choices[0].message.content))
    u = add_xp(authorization, req.score * 20, db)
    return {"score": req.score, "feedback": comp.choices[0].message.content, "new_xp": u.xp if u else None}

@router.get("/generate-parent-code")
def parent_code(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == get_user_email(authorization)).first()
    if not user.parent_link_code:
        user.parent_link_code = str(random.randint(100000, 999999))
        db.commit()
    return {"code": user.parent_link_code, "is_linked": bool(user.parent_chat_id)}