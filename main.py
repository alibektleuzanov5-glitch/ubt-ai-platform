from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

# Біздің басқа файлдарымыздан керек нәрселерді шақыру
from database import engine, Base, get_db
from routes import router

# .env файлын жүктеу (API кілттер үшін)
load_dotenv()

# Базаны құру (егер әлі құрылмаса)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="UBT Math AI Platform API")

# --- МЫНАУ ЕҢ МАҢЫЗДЫ БӨЛІМ (CORS ЕМІ) ---
# Бұл код Vercel-ге Render-мен еркін сөйлесуге рұқсат береді
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Барлық сайттарға рұқсат
    allow_credentials=True,
    allow_methods=["*"],  # Барлық батырмаларға (POST, GET т.б.) рұқсат
    allow_headers=["*"],
)

# Маршруттарды қосу (prefix="/api" арқылы app.js-ке ыңғайлы болады)
app.include_router(router)

@app.get("/")
def home():
    return {"status": "Backend is running!", "docs": "/docs"}

# Render-де іске қосылу үшін қажетті баптау
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)