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
- **S3**: Image storage and model artifacts

## Current Status ✅

### Completed Steps:
1. ✅ **AWS Account Setup**: Configured credentials and permissions
2. ✅ **SageMaker Model**: Downloaded and deployed InstantID model to S3
3. ✅ **Lambda Function**: Created with AWS SDK v3 for SageMaker integration
4. ✅ **API Gateway**: REST API with POST /generate endpoint
5. ✅ **IAM Roles**: Created LambdaExecutionRole and SageMakerRole with proper permissions
6. ✅ **Model Upload**: InstantID model (4.2GB) uploaded to S3
7. ✅ **Infrastructure**: All AWS resources created and configured

### Currently Deploying:
- 🔄 **SageMaker Endpoint**: `instantid-endpoint-v2` on ml.g5.xlarge (GPU instance)
  - Status: Creating (10-15 minutes)
  - Model: InstantID from HuggingFace
  - Instance: GPU-enabled for image generation

## API Endpoint

**Current API URL**: `https://vag36c2ztf.execute-api.us-east-1.amazonaws.com/prod/generate`

### Request Format
```bash
curl -X POST https://vag36c2ztf.execute-api.us-east-1.amazonaws.com/prod/generate \
  -H "Content-Type: application/json" \
  -d '{
    "personImage": "https://example.com/person.jpg",
    "clothingImages": ["https://example.com/shirt.jpg", "https://example.com/pants.jpg"],
    "placeImage": "https://example.com/beach.jpg"
  }'
```

### Response Format
```json
{
  "imageUrl": "https://s3.amazonaws.com/bucket/generated-image.jpg",
  "status": "success",
  "message": "Image composition completed successfully"
}
```

## Implementation Steps Completed

### 1. AWS Infrastructure Setup
```bash
# Created IAM roles
aws iam create-role --role-name SageMakerRole
aws iam create-role --role-name LambdaExecutionRole

# Added permissions
aws iam attach-role-policy --role-name SageMakerRole --policy-arn arn:aws:iam::aws:policy/AmazonSageMakerFullAccess
aws iam attach-role-policy --role-name LambdaExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 2. Model Deployment
```bash
# Created S3 bucket
aws s3 mb s3://instantid-models-053787342835

# Downloaded InstantID model via SageMaker notebook
# Uploaded 4.2GB model.tar.gz to S3

# Created SageMaker model
aws sagemaker create-model --model-name instantid-model-v2
```

### 3. Lambda Function
```javascript
const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');

exports.handler = async (event) => {
    const { personImage, clothingImages, placeImage } = JSON.parse(event.body);
    
    const command = new InvokeEndpointCommand({
        EndpointName: 'instantid-endpoint-v2',
        ContentType: 'application/json',
        Body: JSON.stringify({
            person_image: personImage,
            clothing_images: clothingImages,
            place_image: placeImage
        })
    });
    
    const result = await client.send(command);
    return { statusCode: 200, body: JSON.stringify(result) };
};
```

### 4. API Gateway Setup
```bash
# Created REST API
aws apigateway create-rest-api --name image-composition-api

# Added POST /generate endpoint
aws apigateway put-method --http-method POST
aws apigateway put-integration --type AWS_PROXY
```

## Next Steps (TODO)

### 1. Complete SageMaker Endpoint Deployment
- ⏳ Wait for `instantid-endpoint-v2` to reach "InService" status
- ✅ Verify endpoint is working with test requests

### 2. Update Lambda Function
```bash
# Update Lambda to use new endpoint name
aws lambda update-function-code --function-name image-composition
```

### 3. Test Real Image Generation
```bash
# Test with actual image URLs
curl -X POST https://vag36c2ztf.execute-api.us-east-1.amazonaws.com/prod/generate \
  -H "Content-Type: application/json" \
  -d '{
    "personImage": "https://real-person-image.jpg",
    "clothingImages": ["https://real-clothing.jpg"],
    "placeImage": "https://real-place.jpg"
  }'
```

### 4. Mobile/Web Integration
```javascript
// React Native / Web client
const generateImage = async (personImg, clothingImgs, placeImg) => {
  const response = await fetch('https://vag36c2ztf.execute-api.us-east-1.amazonaws.com/prod/generate', {
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

### 5. Production Optimizations
- [ ] Add error handling and retry logic
- [ ] Implement image preprocessing (resize, format conversion)
- [ ] Add authentication/API keys
- [ ] Set up monitoring and logging
- [ ] Configure auto-scaling for high traffic
- [ ] Add CORS headers for web clients

## Cost Estimation

- **SageMaker ml.g5.xlarge**: ~$1.50/hour
- **Lambda**: $0.20 per 1M requests
- **API Gateway**: $3.50 per million API calls
- **S3 Storage**: $0.023/GB/month (model storage)

## Resources Created

### AWS Account: 053787342835
- **S3 Bucket**: `instantid-models-053787342835`
- **SageMaker Model**: `instantid-model-v2`
- **SageMaker Endpoint**: `instantid-endpoint-v2` (ml.g5.xlarge)
- **Lambda Function**: `image-composition`
- **API Gateway**: `vag36c2ztf` (image-composition-api)
- **IAM Roles**: `SageMakerRole`, `LambdaExecutionRole`

## Why InstantID?

InstantID was chosen for:
- ✅ Superior facial identity preservation
- ✅ Photorealistic output quality
- ✅ Optimized for real person photos
- ✅ Consistent clothing/background integration
- ✅ Available on HuggingFace Hub

## Alternative Approaches Considered

- **Amazon Bedrock**: No image composition models available
- **DALL-E 3**: Text-to-image only, no multi-image input
- **ControlNet**: More complex setup, requires additional preprocessing
- **PhotoMaker**: Good but less consistent than InstantID

## Development Environment

- **Node.js**: 18.x
- **AWS CLI**: Configured with full permissions
- **Python**: 3.10 (for model download)
- **SageMaker Notebook**: ml.t3.medium (for model processing)

## Project Structure

```
NextUnicorn/
├── README.md
├── infrastructure/
│   ├── lambda/
│   │   └── lambda-function.js
│   ├── lib/
│   ├── bin/
│   └── package.json
└── .gitignore
```

## Monitoring

Check deployment status:
```bash
# SageMaker endpoint status
aws sagemaker describe-endpoint --endpoint-name instantid-endpoint-v2

# Lambda logs
aws logs get-log-events --log-group-name "/aws/lambda/image-composition"

# API Gateway metrics
aws cloudwatch get-metric-statistics --namespace AWS/ApiGateway
```

## Support

For issues or questions:
- Check CloudWatch logs for detailed error messages
- Verify SageMaker endpoint is "InService"
- Ensure all IAM permissions are properly configured
- Monitor costs in AWS Billing dashboard
