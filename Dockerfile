# Use an official Python runtime as a parent image
FROM python:3.13-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv for faster dependency management
RUN pip install uv

# Copy the dependency files
COPY pyproject.toml .

# Install dependencies using uv
RUN uv pip install --system .

# Copy the source code
COPY src /app/src

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "mdm-hackathon-2026.main:app", "--host", "0.0.0.0", "--port", "8000"]
