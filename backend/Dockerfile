# LIGHT backend image for free 512MB hosts (Render free): no torch, no
# sentence embeddings, so it needs ~350MB of RAM. It loads the light model
# (mood_multilabel_model_light.joblib); the best model needs Dockerfile.full.
FROM python:3.11-slim

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    MOOD_MODEL=light

WORKDIR /home/user/app

COPY --chown=user requirements-light.txt .
RUN pip install --no-cache-dir -r requirements-light.txt

COPY --chown=user . .

# Render sets $PORT (10000); 7860 when running it by hand
EXPOSE 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
