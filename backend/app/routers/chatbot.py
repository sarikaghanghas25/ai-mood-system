from typing import List, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User, MoodHistory
from app.services.chatbot import generate_chatbot_reply
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/chatbot",
    tags=["AI Chatbot"]
)


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str
    # Earlier messages of this chat, oldest first (optional)
    history: List[ChatTurn] = Field(default_factory=list, max_length=50)


@router.post("/chat")
def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = generate_chatbot_reply(
        request.message,
        conversation_history=[turn.model_dump() for turn in request.history],
    )

    mood_history = MoodHistory(
        user_id=current_user.id,
        text=request.message,
        mood=result["mood"],
        moods=",".join(result["moods"]),
        confidence=result["confidence"]
    )

    db.add(mood_history)
    db.commit()

    return {
        "message": request.message,
        "reply": result["reply"],
        "reply_source": result["reply_source"],
        "mood": result["mood"],
        "moods": result["moods"],
        "confidence": result["confidence"],
        "intensity": result["intensity"]
    }
