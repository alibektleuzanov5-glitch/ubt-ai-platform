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
from database import get_db, engine # engine қосылды
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
                
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
                
                if user.last_active_date == today:
                    pass 
                elif user.last_active_date == yesterday:
                    user.streak += 1
                    user.last_active_date = today
                else:
                    user.streak = 1
                    user.last_active_date = today
                
                db.commit()
                db.refresh(user)
                return {"xp": user.xp, "streak": user.streak}
    except:
        pass
    return None

# ==========================================
# ЖАҢА: Базаны автоматты түрде толтыратын функция
# ==========================================
def auto_seed_data(db: Session):
    try:
        # 1. Тексеру: Базада курс бар ма?
        course_count = db.query(models.Course).count()
        if course_count > 0:
            return 

        print("⏳ Render серверінде базаны спецификациямен толтыру басталды...")

        # 2. ПӘНДЕРДІ ҚОСУ
        c1 = models.Course(id=1, title="Математикалық сауаттылық", description="2026 жылғы тест спецификациясы", image_url="https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80")
        c2 = models.Course(id=2, title="Математика", description="2026 жылғы тест спецификациясы", image_url="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80")
        c3 = models.Course(id=3, title="Информатика", description="2026 жылғы тест спецификациясы", image_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80")
        db.add_all([c1, c2, c3])
        db.commit()

        # 3. МОДУЛЬДЕРДІ ҚОСУ
        modules = [
            models.Module(id=1, title="Сандық талқылау", course_id=1),
            models.Module(id=2, title="Анықсыздық", course_id=1),
            models.Module(id=3, title="Өзгерістер мен тәуелділіктер", course_id=1),
            models.Module(id=4, title="Кеңістік пен форма", course_id=1),
            models.Module(id=5, title="Сандар", course_id=2),
            models.Module(id=6, title="Теңдеулер", course_id=2),
            models.Module(id=7, title="Теңдеулер жүйесі", course_id=2),
            models.Module(id=8, title="Теңсіздіктер", course_id=2),
            models.Module(id=9, title="Теңсіздіктер жүйесі", course_id=2),
            models.Module(id=10, title="Тізбектер", course_id=2),
            models.Module(id=11, title="Математикалық модельдеу мен талдау", course_id=2),
            models.Module(id=12, title="Планиметрия", course_id=2),
            models.Module(id=13, title="Стереометрия", course_id=2),
            models.Module(id=14, title="Кеңістіктегі векторлар мен түрлендірулер", course_id=2),
            models.Module(id=15, title="Компьютерлік жүйелер", course_id=3),
            models.Module(id=16, title="Ақпараттық процестер", course_id=3),
            models.Module(id=17, title="Компьютерлік ойлау", course_id=3),
            models.Module(id=18, title="Аппараттық және программалық қамтамасыз ету", course_id=3),
            models.Module(id=19, title="Ақпараттық процестер мен жүйелер", course_id=3),
            models.Module(id=20, title="Ақпараттық объектілерді құру және түрлендіру", course_id=3)
        ]
        db.add_all(modules)
        db.commit()

        # 4. ТАҚЫРЫПТАРДЫ ҚОСУ (Бөлінген)
        raw_lessons = [
            (1, "Сандық өрнектермен берілген логикалық тапсырмалар"),
            (1, "Теңдеулердің көмегімен және әріпті өрнектер құру арқылы шешілетін мәтінді есептерге берілген логикалық есептер"),
            (1, "Пайыздық есептеулерге берілген логикалық есептер. Дөңгелек және бағанды диаграммалар түріндегі статистикалық мәліметтерге арналған логикалық есептер"),
            (2, "Бірнеше сандардың арифметикалық ортасы, санды деректердің құлашы, медианасы, модасы"),
            (2, "Статистикалық кесте, алқап, гистограмма. Жиындар теориясы және логика элементтері. Комбинаторика негіздері. Ықтималдықтар теориясының негіздері"),
            (3, "Бір шаманың екінші шамаға тәуелді өзгеруіне байланысты берілген логикалық есептер"),
            (3, "Тізбектерді қолдануға берілген логикалық тапсырмалар. Кестедегі ақпараттарды талдай білуге берілген логикалық тапсырмалар"),
            (4, "Геометриялық мазмұндағы логикалық есептер және геометриялық мазмұндағы стандартты емес тапсырмалар"),
            (4, "Геометриялық фигуралардың периметрі мен ауданының формуласын қолдануға берілген логикалық есептер"),
            (4, "Геометриялық денелердің бет аудандарының формуласын қолдануға берілген логикалық есептер"),
            (5, "Түбірлерге амалдар қолдану. Санды және әріпті өрнектер. Бүтін және бөлшек өрнектер"),
            (5, "Дәрежелерге амалдар қолдану"),
            (5, "Тригонометрия"),
            (5, "Алгебралық өрнектер және түрлендірулер. Формулалар. Қысқаша көбейту формулалары. Бөлшектің дәрежесі. Көпмүшені жіктеу. Алгебралық өрнектерді ықшамдау"),
            (6, "Сызықтық теңдеулер. Квадрат теңдеулер. Бөлшек-рационал теңдеулер"),
            (6, "Тригонометриялық теңдеулер. Иррационал теңдеулер"),
            (6, "Көрсеткіштік теңдеулер. Логарифмдік теңдеулер"),
            (15, "Компьютердің құрылғылары"),
            (15, "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру. Ақпараттық қауіпсіздік"),
            (16, "Ақпаратты ұсыну және өлшеу. Ақпаратты кодтау"),
            (16, "Есептеу жүйелері"),
            (16, "Компьютердің логикалық негіздері"),
            (17, "Python программалау тілінде алгоритмдерді программалау"),
            (17, "Алгоритмдер және программалау (Функция, Рекурсия, жолдармен жұмыс, файлдармен жұмыс, сұрыптау, граф)"),
            (19, "Реляциондық деректер қоры"),
            (19, "Мәліметтер қорын жасау. Құрылымдалған сұраныстар"),
            (20, "Web-жобалау")
        ]

        lessons_to_add = []
        for mod_id, text_block in raw_lessons:
            parts = text_block.split('.')
            for part in parts:
                clean_title = part.strip()
                if clean_title:
                    lessons_to_add.append(models.Lesson(title=clean_title, module_id=mod_id))
        
        db.add_all(lessons_to_add)
        db.commit()
        print("✅ База сәтті толтырылды!")
    except Exception as e:
        print(f"❌ Auto-seed қатесі: {e}")
        db.rollback()

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
    
    # ЖАҢА: Логин жасағанда базаны тексеріп толтыру
    auto_seed_data(db)

    access_token = create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "name": db_user.name, 
        "role": db_user.role,
        "xp": db_user.xp,
        "streak": db_user.streak
    }

@router.get("/courses-full")
def get_all_courses_with_modules(db: Session = Depends(get_db)):
    try:
        courses = db.query(models.Course).all()
        result = []
        for course in courses:
            modules = db.query(models.Module).filter(models.Module.course_id == course.id).all()
            module_list = []
            for mod in modules:
                lessons = db.query(models.Lesson).filter(models.Lesson.module_id == mod.id).all()
                module_list.append({
                    "title": mod.title,
                    "lessons": [{"title": l.title} for l in lessons]
                })
            result.append({
                "title": course.title,
                "image_url": course.image_url,
                "modules": module_list
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Курстарды алу мүмкін болмады")

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