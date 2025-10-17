FROM python:3.11

# set a working dir
WORKDIR /app

# install system deps required by geopandas/fiona/gdal etc
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    pkg-config \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    proj-bin \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Ensure pip/wheel are current
RUN python -m pip install --upgrade pip setuptools wheel

# If your repo copies requirements.txt
COPY requirements.txt .

# Point pip builds at the gdal-config we installed
ENV GDAL_CONFIG=/usr/bin/gdal-config
# Optional: also set GDAL_VERSION if you want a specific version (example)
# ENV GDAL_VERSION=3.6.4

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# (rest of your Dockerfile)
# COPY . .
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
