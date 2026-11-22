from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User, MoodHistory
from app.services.chatbot import generate_chatbot_reply
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/chatbot",
    tags=["AI Chatbot"]
)


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = generate_chatbot_reply(request.message)

    mood_history = MoodHistory(
        user_id=current_user.id,
        text=request.message,
        mood=result["mood"],
        confidence=result["confidence"]
    )

    db.add(mood_history)
    db.commit()

    return {
        "message": request.message,
        "reply": result["reply"],
        "mood": result["mood"],
        "confidence": result["confidence"],
        "intensity": result["intensity"]
    }
