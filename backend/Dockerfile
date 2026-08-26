

FROM python:3.12-alpine

WORKDIR /app

COPY requirements.txt .

RUN apk update \
    && apk upgrade \
    && rm -rf /var/cache/apk/*

RUN pip install --no-cache-dir -r requirements.txt \
    && python -m pip uninstall -y pip

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]

