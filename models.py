from sqlalchemy import Column, Integer, String, Text, ForeignKey
from database import Base
from pydantic import BaseModel
from typing import Optional, List

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="student")
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_active_date = Column(String, default="")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    image_url = Column(String)

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    course_id = Column(Integer, ForeignKey("courses.id"))

class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    video_url = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"))

# --- Pydantic моделдері (Фронтендтен келетін сұраныстар үшін) ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ChatMessage(BaseModel):
    message: str

class WeaknessRequest(BaseModel):
    questions: List[str]