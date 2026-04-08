from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base
from pydantic import BaseModel
from typing import List

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_active_date = Column(String, default="")
    avatar_url = Column(String, default="https://api.dicebear.com/7.x/bottts/svg?seed=Axiom") 
    theme = Column(String, default="dark")
    inventory = Column(JSON, default=list)
    league = Column(String, default="Қола (Бронза)") 
    weekly_xp = Column(Integer, default=0)
    parent_link_code = Column(String, default="")
    parent_chat_id = Column(String, default="")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    image_url = Column(String)

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))

class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))

class ErrorRecord(Base):
    __tablename__ = "error_records"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    topic = Column(String)
    question = Column(String)
    user_answer = Column(String)
    correct_answer = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class StoreItem(Base):
    __tablename__ = "store_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    item_type = Column(String)
    cost = Column(Integer)
    value = Column(String)

class SimulatorResult(Base):
    __tablename__ = "simulator_results"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True)
    score = Column(Integer)
    total_questions = Column(Integer)
    ai_feedback = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel): name: str; email: str; password: str
class UserLogin(BaseModel): email: str; password: str
class ChatMessage(BaseModel): message: str
class ErrorSubmit(BaseModel): topic: str; question: str; user_answer: str; correct_answer: str
class StoreBuy(BaseModel): item_id: int
class SimulatorSubmit(BaseModel): score: int; total: int; wrong_topics: List[str]