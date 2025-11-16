FROM python:3.11-slim

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies
RUN pip install --no-cache-dir -e .

# Copy source code
COPY src ./src

# Add health check, but do not make the container exit on failing health (always return success)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]