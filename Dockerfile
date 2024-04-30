# Use Red Hat Universal Base Image 9 as the base
FROM registry.access.redhat.com/ubi9/ubi:latest

# Install Python 3 and other essentials
RUN yum install -y python39 && \
    yum clean all

# Install pip
RUN python3.9 -m ensurepip && \
    python3.9 -m pip install --upgrade pip

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="${PYTHONPATH}:/opt/venv/lib/python3.9/site-packages:/app:/"

# Imbue the container with the metadata about the application
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

# Set the working directory in the container
WORKDIR /app

# Create a virtual environment to isolate our package dependencies locally
RUN python3.9 -m venv /opt/venv
RUN pip install --upgrade pip

# Install FastAPI, uvicorn, and other dependencies
COPY requirements.txt .

# Download and cache Python packages
RUN pip download -d /package_cache -r requirements.txt

# Install required Python packages from cache
RUN pip install --no-index --find-links=/package_cache -r requirements.txt

# Expose port 8000 for Uvicorn
EXPOSE 8000

# Add a non-root user and change ownership of the work directory
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /opt/venv

# Use the non-root user to run our application
USER appuser

# Command to run the application
CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
