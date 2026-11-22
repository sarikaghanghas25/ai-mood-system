from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import add_missing_columns
from app.services.mood_ai import detect_mood_with_ai

from app.routers.auth import router as auth_router
from app.routers.mood import router as mood_router
from app.routers.recommendation import router as recommendation_router
from app.routers.mood_recommendation import router as mood_recommendation_router
from app.routers.mood_history import router as mood_history_router
from app.routers.dashboard import router as dashboard_router
from app.routers.chatbot import router as chatbot_router


# ============================================================
# MODEL WARM-UP
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # New columns (e.g. mood_history.moods) on an existing database
    add_missing_columns()

    # Loading the mood model takes ~5s; do it at startup instead of
    # making the first user wait
    try:
        detect_mood_with_ai("warm up")
    except Exception as error:
        print(f"Mood model warm-up failed: {error}")

    yield


# ============================================================
# CREATE FASTAPI APP
# ============================================================

app = FastAPI(
    lifespan=lifespan,
    title="AI Mood Detection & Personalized Recommendation System",
    description=(
        "AI-powered system for mood detection, "
        "personalized recommendations, mood analytics "
        "and an AI conversational companion."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

# Authentication
app.include_router(
    auth_router
)

# Mood Detection
app.include_router(
    mood_router
)

# Recommendations
app.include_router(
    recommendation_router
)

# Mood + Recommendations
app.include_router(
    mood_recommendation_router
)

# Mood History
app.include_router(
    mood_history_router
)

# Dashboard
app.include_router(
    dashboard_router
)

# AI Chatbot / AI Companion
app.include_router(
    chatbot_router
)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/api/health",
    tags=["default"]
)
def health_check():

    return {
        "status": "ok",
        "message": "AI Mood System backend is running"
    }


# ============================================================
# ROOT
# ============================================================

@app.get(
    "/",
    tags=["default"]
)
def root():

    return {
        "message": "Welcome to AI Mood Detection & Personalized Recommendation System",
        "docs": "/docs",
        "health": "/api/health"
    }