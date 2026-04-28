from typing import List
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import database, models, schemas

app = FastAPI(title="MDM Hackathon 2026 API")

@app.get("/")
async def root():
    return {"message": "Welcome to the MDM Hackathon 2026 API"}

@app.get("/service-request", response_model=List[schemas.SRHeaderBase])
async def list_service_requests(skip: int = 0, limit: int = 10, db: Session = Depends(database.get_db)):
    return db.query(models.SRHeader).offset(skip).limit(limit).all()

@app.get("/service-request/{sr_number}", response_model=schemas.SRHeader)
async def get_service_request(sr_number: str, db: Session = Depends(database.get_db)):
    print(sr_number)
    db_sr = db.query(models.SRHeader).filter(models.SRHeader.SR_NUMBER == sr_number).first()
    
    if db_sr is None:
        raise HTTPException(status_code=404, detail="Service Request not found")
    return db_sr

@app.put("/service-request")
async def inset_service_request():
    
    pass

@app.post("/anomaly")
async def anomaly_detection():
    pass

@app.get("/health")
async def health_check(db: Session = Depends(database.get_db)):
    try:
        # Simple query to verify DB connection
        db.execute(models.SRHeader.__table__.select().limit(1))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
