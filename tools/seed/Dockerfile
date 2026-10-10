# One-off job that loads demo data into a fresh local stack (see docker-compose.yml).
FROM python:3.12-alpine
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
# Time zone data so TZ=America/Toronto gives the clinic's local "today".
RUN apk add --no-cache tzdata
RUN adduser -D -H -u 10001 seed
WORKDIR /app
COPY seed.py .
USER 10001
CMD ["python", "seed.py"]
