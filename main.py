from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routes import router
from database import engine, Base
import uvicorn

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# МІНЕ, ЕҢ МАҢЫЗДЫ ЖОЛ - /api осында тұр
app.include_router(router, prefix="/api")

@app.get("/")
def home():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)