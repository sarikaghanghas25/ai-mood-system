from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.database import Base, engine

from app.models import User, MoodHistory, Recommendation

from app.routers.auth import router as auth_router
from app.routers.mood import router as mood_router
from app.routers.recommendation import router as recommendation_router
from app.routers.mood_recommendation import (
    router as mood_recommendation_router
)
from app.routers.mood_history import (
    router as mood_history_router
)
from app.routers.dashboard import router as dashboard_router


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)


# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API routers
app.include_router(auth_router)
app.include_router(mood_router)
app.include_router(recommendation_router)
app.include_router(mood_recommendation_router)
app.include_router(mood_history_router)
app.include_router(dashboard_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }