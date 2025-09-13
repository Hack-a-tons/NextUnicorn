import os
import json
import base64
import io
from flask import Flask, request, jsonify
from PIL import Image
import torch
from diffusers import StableDiffusionXLPipeline, ControlNetModel
from diffusers.utils import load_image
import cv2
import numpy as np
from insightface.app import FaceAnalysis
import requests

app = Flask(__name__)

# Global variables for models
pipeline = None
face_app = None

def load_models():
    """Load InstantID models"""
    global pipeline, face_app
    
    try:
        # Load ControlNet for InstantID
        controlnet = ControlNetModel.from_pretrained(
            "/opt/ml/model/ControlNetModel", 
            torch_dtype=torch.float16
        )
        
        # Load SDXL pipeline with ControlNet
        pipeline = StableDiffusionXLPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            controlnet=controlnet,
            torch_dtype=torch.float16,
            use_safetensors=True,
            variant="fp16"
        )
        pipeline = pipeline.to("cuda")
        pipeline.enable_model_cpu_offload()
        
        # Load face analysis
        face_app = FaceAnalysis(name='buffalo_l')
        face_app.prepare(ctx_id=0, det_size=(640, 640))
        
        print("Models loaded successfully")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

def download_image(url):
    """Download image from URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert('RGB')
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def extract_face_features(image):
    """Extract face features using InsightFace"""
    try:
        img_array = np.array(image)
        faces = face_app.get(img_array)
        if faces:
            return faces[0].embedding
        return None
    except Exception as e:
        print(f"Error extracting face features: {e}")
        return None

def generate_image(person_image_url, clothing_images, place_image_url, prompt):
    """Generate image using InstantID"""
    try:
        # Download person image
        person_image = download_image(person_image_url)
        if not person_image:
            raise ValueError("Could not download person image")
        
        # Extract face features
        face_embedding = extract_face_features(person_image)
        if face_embedding is None:
            raise ValueError("Could not extract face features")
        
        # Generate image
        result = pipeline(
            prompt=prompt,
            image=person_image,
            num_inference_steps=30,
            guidance_scale=7.5,
            width=1024,
            height=1024,
            generator=torch.Generator(device="cuda").manual_seed(42)
        )
        
        return result.images[0]
    except Exception as e:
        print(f"Error generating image: {e}")
        raise

@app.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route('/invocations', methods=['POST'])
def invocations():
    """Main inference endpoint"""
    try:
        data = request.get_json()
        
        # Extract parameters
        person_image = data.get('person_image')
        clothing_images = data.get('clothing_images', [])
        place_image = data.get('place_image')
        prompt = data.get('prompt', 'A photorealistic portrait')
        
        if not person_image:
            return jsonify({"error": "person_image is required"}), 400
        
        # Generate image
        generated_image = generate_image(person_image, clothing_images, place_image, prompt)
        
        # Convert to base64
        buffer = io.BytesIO()
        generated_image.save(buffer, format='JPEG', quality=95)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            "generated_image": img_base64,
            "status": "success"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Loading InstantID models...")
    if load_models():
        print("Starting inference server...")
        app.run(host='0.0.0.0', port=8080)
    else:
        print("Failed to load models")
        exit(1)
