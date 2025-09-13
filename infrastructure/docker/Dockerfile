FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-devel

# Set environment variables to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    diffusers==0.21.4 \
    transformers==4.35.2 \
    accelerate==0.24.1 \
    controlnet-aux==0.0.7 \
    opencv-python==4.8.1.78 \
    insightface==0.7.3 \
    onnxruntime-gpu==1.16.3 \
    xformers==0.0.22.post7 \
    flask==2.3.3 \
    pillow==10.1.0 \
    numpy==1.24.4

# Set working directory
WORKDIR /opt/ml

# Copy inference code and serve script
COPY code/ code/
COPY model/ model/
COPY serve /usr/local/bin/serve

# Make serve script executable
RUN chmod +x /usr/local/bin/serve

# Set environment variables
ENV PYTHONPATH=/opt/ml/code
ENV MODEL_PATH=/opt/ml/model

# Expose port for SageMaker
EXPOSE 8080

# Start the inference server
CMD ["serve"]
