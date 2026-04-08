from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os, uvicorn
from routes import router
from database import engine, Base, SessionLocal
import models
from seed import seed_data

Base.metadata.create_all(bind=engine)

db = SessionLocal()
if db.query(models.Course).count() == 0: seed_data()
db.close()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))