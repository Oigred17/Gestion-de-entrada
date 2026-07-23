# Stage 1: Construir el frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Backend + frontend + NFC reader
FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    pcscd \
    libpcsclite1 \
    libpcsclite-dev \
    gcc \
    swig \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Backend_Proy_Cobao/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY Backend_Proy_Cobao/app/ ./app/
COPY Backend_Proy_Cobao/bd_COBAO.sql .

COPY nfc_reader.py .
COPY start.sh .
RUN chmod +x start.sh

COPY --from=frontend-builder /app/dist ./frontend/dist

EXPOSE 8000
CMD ["./start.sh"]
