from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import router

app = FastAPI(title="ҰБТ Платформасы API")

# CORS (Frontend пен Backend-ті жалғау)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Деректер базасының кестелерін құру
Base.metadata.create_all(bind=engine)

# Routes.py ішіндегі барлық маршруттарды осында қосамыз
app.include_router(router)