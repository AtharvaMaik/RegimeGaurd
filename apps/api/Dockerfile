FROM python:3.10-slim

WORKDIR /app

COPY apps/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY apps/api /app/apps/api
COPY services /app/services
COPY apps/__init__.py /app/apps/__init__.py

EXPOSE 7860

CMD ["uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "7860"]

