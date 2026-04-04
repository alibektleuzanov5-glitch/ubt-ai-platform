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

# Деректер базасы мен модельдерді импорттау
from database import get_db
import models

# .env файлындағы мәліметтерді жүктеу
load_dotenv()

# Router құру
router = APIRouter()

# Қауіпсіздік баптаулары
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "diplomdyq_jumys_super_secret_key"
ALGORITHM = "HS256"

# ЖИ баптаулары (Кілтті .env файлынан қауіпсіз түрде алу)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ai_client = Groq(api_key=GROQ_API_KEY)

# --- Көмекші функциялар ---
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ==========================================
# API МАРШРУТТАРЫ
# ==========================================

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

@router.get("/courses", response_model=List[models.CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    return db.query(models.Course).all()

@router.post("/courses", response_model=models.CourseResponse)
def create_course(course: models.CourseCreate, db: Session = Depends(get_db)):
    new_course = models.Course(title=course.title, description=course.description, image_url=course.image_url)
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.get("/courses/{course_id}/lessons", response_model=List[models.LessonResponse])
def get_lessons(course_id: int, db: Session = Depends(get_db)):
    return db.query(models.Lesson).filter(models.Lesson.course_id == course_id).all()

@router.post("/lessons", response_model=models.LessonResponse)
def create_lesson(lesson: models.LessonResponse, db: Session = Depends(get_db)):
    new_lesson = models.Lesson(
        title=lesson.title, video_url=lesson.video_url,
        content=lesson.content, course_id=lesson.course_id
    )
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return new_lesson

@router.get("/lessons/{lesson_id}/questions")
def get_questions(lesson_id: int, db: Session = Depends(get_db)):
    return db.query(models.Question).filter(models.Question.lesson_id == lesson_id).all()

@router.post("/ask-tutor")
def ask_tutor(request: models.TutorRequest):
    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Сен ҰБТ математика мұғалімісің. LaTeX қолдан."},
                {"role": "user", "content": f"Сұрақ: {request.question_text}\nЖауап: {request.selected_answer}"}
            ],
            model="llama-3.1-8b-instant",
        )
        return {"explanation": chat_completion.choices[0].message.content}
    except:
        return {"explanation": "ЖИ уақытша қолжетімсіз."}

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

@router.post("/save-result")
def save_result(res: models.ResultSave, db: Session = Depends(get_db)):
    new_res = models.TestResult(**res.model_dump())
    db.add(new_res)
    user = db.query(models.User).filter(models.User.email == res.user_email).first()
    earned_xp = 0
    if user:
        earned_xp = res.score * 10
        user.xp += earned_xp
        db.commit()
        db.refresh(user)
    else:
        db.commit()
    return {"status": "ok", "earned_xp": earned_xp, "new_total_xp": user.xp if user else 0}

@router.get("/my-analytics/{email}")
def get_analytics(email: str, db: Session = Depends(get_db)):
    results = db.query(models.TestResult).filter(models.TestResult.user_email == email).all()
    if not results: return {"analysis": "Мәлімет жоқ."}
    history = "\n".join([f"- {r.lesson_title}: {r.score}/{r.total_questions}" for r in results])
    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Оқушы нәтижесіне қазақша сараптама жаса."},
                {"role": "user", "content": history}
            ],
            model="llama-3.1-8b-instant",
        )
        return {"analysis": chat_completion.choices[0].message.content}
    except:
        return {"analysis": "Қате."}

@router.post("/generate-lesson")
def generate_lesson(req: models.GenerateRequest, db: Session = Depends(get_db)):
    try:
        chat_completion = ai_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Математика мұғалімісің. ТЕК JSON қайтар."},
                {"role": "user", "content": f"{req.topic} тақырыбына сабақ пен 3 тест жаса."}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}, 
        )
        ai_data = json.loads(chat_completion.choices[0].message.content)
        new_lesson = models.Lesson(title=ai_data["title"], video_url="https://www.youtube.com/embed/jfKfPfyJRdk", content=ai_data["content"], course_id=req.course_id)
        db.add(new_lesson)
        db.commit()
        db.refresh(new_lesson)
        for q in ai_data["questions"]:
            db.add(models.Question(text=q["text"], option_a=q["option_a"], option_b=q["option_b"], option_c=q["option_c"], correct_option=q["correct_option"], lesson_id=new_lesson.id))
        db.commit()
        return {"status": "ok"}
    except:
        raise HTTPException(status_code=500, detail="Генерация қатесі")

@router.delete("/lessons/{lesson_id}")
def delete_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if not lesson: raise HTTPException(status_code=404)
    db.query(models.Question).filter(models.Question.lesson_id == lesson_id).delete()
    db.delete(lesson)
    db.commit()
    return {"message": "Өшірілді"}