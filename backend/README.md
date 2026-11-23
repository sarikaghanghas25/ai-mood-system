# Backend

FastAPI service: auth, mood detection (rules + ML), history, dashboard, chatbot.

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs · health: `/health`.

Docker: `Dockerfile` (light model, Render) and `Dockerfile.full` (with sentence embeddings).
Setup, env vars, training and tests are in the [root README](../README.md).
