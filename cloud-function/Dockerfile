# Shared Python sources for Cloud Run functions (sync-intervals, strava-oauth, …).
# Build with: --build-arg FUNCTION_TARGET=strava_oauth
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ARG FUNCTION_TARGET=sync_intervals
ENV FUNCTION_TARGET=${FUNCTION_TARGET}

CMD exec functions-framework --target=${FUNCTION_TARGET} --port=${PORT} --host=0.0.0.0
