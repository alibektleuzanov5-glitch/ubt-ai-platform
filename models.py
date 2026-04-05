from sqlalchemy import Column, Integer, String, Text
from database import Base
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ==========================================
# 1. SQLAlchemy Кестелері (Деректер базасы)
# ==========================================
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="student")
    xp = Column(Integer, default=0)

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    image_url = Column(String, default="https://via.placeholder.com/300x150?text=Course")

class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    video_url = Column(String) 
    content = Column(Text)
    course_id = Column(Integer)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    option_a = Column(String)
    option_b = Column(String)
    option_c = Column(String)
    correct_option = Column(String)
    lesson_id = Column(Integer)

class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String)
    lesson_title = Column(String)
    score = Column(Integer)
    total_questions = Column(Integer)
    date = Column(String, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M"))

# ==========================================
# 2. Pydantic Схемалары (API деректерін тексеру)
# ==========================================
class TutorRequest(BaseModel):
    question_text: str
    selected_answer: str

class GenerateRequest(BaseModel):
    course_id: int
    topic: str

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class CourseCreate(BaseModel):
    title: str
    description: str
    image_url: Optional[str] = "https://via.placeholder.com/300x150?text=Course"

class ResultSave(BaseModel):
    user_email: str
    lesson_title: str
    score: int
    total_questions: int

class ChatMessage(BaseModel):
    message: str

class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    image_url: str
    class Config:
        from_attributes = True

class LessonResponse(BaseModel):
    id: int
    title: str
    video_url: str
    content: str
    course_id: int
    class Config:
        from_attributes = True

# ЖАҢА: Қатемен жұмысқа арналған схема
class WeaknessRequest(BaseModel):
    questions: List[str]