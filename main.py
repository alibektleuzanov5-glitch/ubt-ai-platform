from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routes import router
from database import engine, Base, SessionLocal
import uvicorn
import models
from seed import seed_data

# База құрылымын жасау
Base.metadata.create_all(bind=engine)

# Егер серверде база бос болса, 2026 тақырыптарын жүктейміз
db = SessionLocal()
if db.query(models.Course).count() == 0:
    print("База бос. Жаңа 2026 тақырыптарын жүктеп жатырмын...")
    seed_data()
db.close()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def home():
    return {"message": "AXIOM AI Backend is running smoothly!"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)