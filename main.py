from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routes import router
from database import engine, Base
import uvicorn

# Базаны құру
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- КҮШЕЙТІЛГЕН CORS БАПТАУЫ ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Барлық сайттарға рұқсат
    allow_credentials=True,
    allow_methods=["*"],  # POST, GET, OPTIONS - бәріне рұқсат
    allow_headers=["*"],  # Барлық заголовоктарға рұқсат
)

# Маршрутты қосу
# Ескерту: Егер routes.py-да префикс болса, мұнда керек емес
app.include_router(router, prefix="/api") 

@app.get("/")
def home():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)