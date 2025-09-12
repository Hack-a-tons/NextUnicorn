# Image Composition API

A Node.js API that combines person photos, clothing items, and places into photorealistic composite images using AWS SageMaker and InstantID.

## Overview

This API accepts three sets of images:
- Person photo
- Clothing items
- Place/background

Returns a photorealistic image of the person wearing the specified clothing in the given location.

## Architecture

- **API Gateway**: REST API endpoint
- **Lambda**: Node.js function for request processing
- **SageMaker**: InstantID model for image composition
- **S3**: Image storage and retrieval

## Prerequisites

- AWS Account with credits
- AWS CLI configured
- Node.js 18+
- AWS CDK installed globally

## Setup

### 1. Deploy SageMaker Endpoint

```bash
# Create model
aws sagemaker create-model \
  --model-name instantid-model \
  --primary-container Image=763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-inference:2.0.0-transformers4.28.1-gpu-py310-cu118-ubuntu20.04,ModelDataUrl=s3://your-bucket/instantid-model.tar.gz \
  --execution-role-arn arn:aws:iam::account:role/SageMakerRole

# Create endpoint configuration
aws sagemaker create-endpoint-config \
  --endpoint-config-name instantid-config \
  --production-variants VariantName=primary,ModelName=instantid-model,InstanceType=ml.g5.2xlarge,InitialInstanceCount=1

# Create endpoint (takes 10-15 minutes)
aws sagemaker create-endpoint \
  --endpoint-name instantid-endpoint \
  --endpoint-config-name instantid-config
```

### 2. Deploy Lambda Function

```javascript
const AWS = require('aws-sdk');
const sagemaker = new AWS.SageMakerRuntime();

exports.handler = async (event) => {
    const { personImage, clothingImages, placeImage } = JSON.parse(event.body);
    
    const params = {
        EndpointName: 'instantid-endpoint',
        ContentType: 'application/json',
        Body: JSON.stringify({
            person_image: personImage,
            clothing_images: clothingImages,
            place_image: placeImage,
            prompt: "photorealistic person wearing clothes in location"
        })
    };
    
    const result = await sagemaker.invokeEndpoint(params).promise();
    const generatedImage = JSON.parse(result.Body.toString());
    
    return {
        statusCode: 200,
        body: JSON.stringify({ imageUrl: generatedImage.url })
    };
};
```

### 3. Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api --name image-composition-api

# Add POST method for /generate endpoint
aws apigateway put-method \
  --rest-api-id your-api-id \
  --resource-id resource-id \
  --http-method POST \
  --authorization-type NONE
```

## API Usage

### Endpoint
```
POST https://your-api-id.execute-api.region.amazonaws.com/prod/generate
```

### Request Body
```json
{
  "personImage": "base64_encoded_image_or_s3_url",
  "clothingImages": ["clothing1_url", "clothing2_url"],
  "placeImage": "place_image_url"
}
```

### Response
```json
{
  "imageUrl": "https://s3.amazonaws.com/bucket/generated-image.jpg"
}
```

## Cost Estimation

- **SageMaker ml.g5.2xlarge**: ~$2.50/hour
- **Lambda**: $0.20 per 1M requests
- **API Gateway**: $3.50 per million API calls
- **S3 Storage**: $0.023/GB/month

## Why InstantID?

InstantID was chosen for:
- Superior facial identity preservation
- Photorealistic output quality
- Optimized for real person photos
- Consistent clothing/background integration

## Alternative Approaches Considered

- **Amazon Bedrock**: No image composition models available
- **DALL-E 3**: Text-to-image only, no multi-image input
- **ControlNet**: More complex setup, requires additional preprocessing
- **PhotoMaker**: Good but less consistent than InstantID

## Client Integration

### Mobile (React Native)
```javascript
const generateImage = async (personImg, clothingImgs, placeImg) => {
  const response = await fetch('https://your-api-endpoint/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personImage: personImg,
      clothingImages: clothingImgs,
      placeImage: placeImg
    })
  });
  return response.json();
};
```

### Web (JavaScript)
```javascript
fetch('https://your-api-endpoint/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ personImage, clothingImages, placeImage })
})
.then(response => response.json())
.then(data => console.log(data.imageUrl));
```

## Next Steps

1. Deploy SageMaker endpoint (longest step)
2. Create and test Lambda function
3. Set up API Gateway
4. Integrate with mobile/web clients
5. Add error handling and monitoring
