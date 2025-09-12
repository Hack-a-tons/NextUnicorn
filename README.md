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

## AWS Services Used

### Core Services (Currently Implemented)

#### 1. **Amazon SageMaker**
- **Purpose**: ML model hosting and inference
- **Resources**:
  - Model: `instantid-model-v2` (InstantID for image composition)
  - Endpoint: `instantid-endpoint-v2` (ml.g5.xlarge GPU instance)
  - Notebook Instance: `instantid-downloader` (ml.t3.medium for model processing)
- **Cost**: ~$1.50/hour for inference endpoint
- **Usage**: Hosts InstantID model for photorealistic image generation

#### 2. **AWS Lambda**
- **Purpose**: Serverless API processing
- **Resources**:
  - Function: `image-composition` (Node.js 18.x runtime)
  - Memory: 128 MB, Timeout: 30 seconds
- **Cost**: $0.20 per 1M requests + compute time
- **Usage**: Processes API requests and calls SageMaker endpoint

#### 3. **Amazon API Gateway**
- **Purpose**: REST API management and routing
- **Resources**:
  - API: `vag36c2ztf` (image-composition-api)
  - Endpoint: `/generate` (POST method)
- **Cost**: $3.50 per million API calls
- **Usage**: Public API endpoint for mobile/web clients

#### 4. **Amazon S3**
- **Purpose**: Object storage for models and generated images
- **Resources**:
  - Bucket: `instantid-models-053787342835`
  - Objects: `model.tar.gz` (4.2GB InstantID model)
- **Cost**: $0.023/GB/month storage + data transfer
- **Usage**: Stores ML model artifacts and generated images

#### 5. **AWS IAM**
- **Purpose**: Identity and access management
- **Resources**:
  - Roles: `SageMakerRole`, `LambdaExecutionRole`
  - Policies: Custom policies for service permissions
- **Cost**: Free
- **Usage**: Manages permissions between AWS services

#### 6. **Amazon CloudWatch**
- **Purpose**: Monitoring and logging
- **Resources**:
  - Log Groups: `/aws/lambda/image-composition`, `/aws/sagemaker/Endpoints/instantid-endpoint-v2`
  - Metrics: API Gateway, Lambda, SageMaker metrics
- **Cost**: $0.50/GB ingested + $0.03/GB stored
- **Usage**: Application monitoring and debugging

### Future Services (Planned Implementation)

#### 7. **Amazon Cognito** (Authentication)
- **Purpose**: User authentication and API security
- **Planned Usage**: 
  - User pools for mobile/web app authentication
  - API Gateway authorizers for secure access
  - JWT token validation
- **Estimated Cost**: $0.0055 per monthly active user

#### 8. **Amazon CloudFront** (CDN)
- **Purpose**: Global content delivery and caching
- **Planned Usage**:
  - Cache generated images globally
  - Reduce API latency for international users
  - Serve static assets for web clients
- **Estimated Cost**: $0.085/GB data transfer + $0.0075 per 10,000 requests

#### 9. **Amazon DynamoDB** (Database)
- **Purpose**: Store user data and generation history
- **Planned Usage**:
  - User profiles and preferences
  - Image generation history and metadata
  - Usage analytics and billing data
- **Estimated Cost**: $0.25/GB storage + $1.25 per million read/write requests

#### 10. **Amazon SQS** (Message Queue)
- **Purpose**: Asynchronous processing for long-running tasks
- **Planned Usage**:
  - Queue image generation requests
  - Handle batch processing
  - Decouple API from ML processing
- **Estimated Cost**: $0.40 per million requests

#### 11. **Amazon SNS** (Notifications)
- **Purpose**: Push notifications and alerts
- **Planned Usage**:
  - Notify users when image generation completes
  - Send system alerts and monitoring notifications
  - Mobile push notifications
- **Estimated Cost**: $0.50 per million notifications

#### 12. **AWS Step Functions** (Workflow Orchestration)
- **Purpose**: Complex image processing workflows
- **Planned Usage**:
  - Multi-step image processing pipelines
  - Error handling and retry logic
  - Coordinate multiple ML models
- **Estimated Cost**: $25 per million state transitions

#### 13. **Amazon Rekognition** (Image Analysis)
- **Purpose**: Content moderation and image analysis
- **Planned Usage**:
  - Detect inappropriate content in uploaded images
  - Extract metadata from images
  - Face detection and analysis
- **Estimated Cost**: $1.00 per 1,000 images analyzed

#### 14. **AWS Secrets Manager** (Security)
- **Purpose**: Secure storage of API keys and secrets
- **Planned Usage**:
  - Store third-party API keys
  - Database connection strings
  - Encryption keys for sensitive data
- **Estimated Cost**: $0.40 per secret per month

#### 15. **Amazon ElastiCache** (Caching)
- **Purpose**: In-memory caching for performance
- **Planned Usage**:
  - Cache frequently requested images
  - Store user session data
  - Reduce database load
- **Estimated Cost**: $0.017/hour for cache.t3.micro

#### 16. **AWS WAF** (Web Application Firewall)
- **Purpose**: API security and DDoS protection
- **Planned Usage**:
  - Rate limiting for API endpoints
  - Block malicious requests
  - Geographic restrictions if needed
- **Estimated Cost**: $1.00 per web ACL + $0.60 per million requests

### Development & Operations Services

#### 17. **AWS CodePipeline** (CI/CD)
- **Purpose**: Automated deployment pipeline
- **Planned Usage**:
  - Automated testing and deployment
  - Infrastructure as Code updates
  - Multi-environment management
- **Estimated Cost**: $1.00 per active pipeline per month

#### 18. **AWS CodeBuild** (Build Service)
- **Purpose**: Build and test automation
- **Planned Usage**:
  - Compile and package Lambda functions
  - Run automated tests
  - Build Docker images for custom containers
- **Estimated Cost**: $0.005 per build minute

#### 19. **Amazon ECR** (Container Registry)
- **Purpose**: Store custom Docker images
- **Planned Usage**:
  - Custom SageMaker inference containers
  - Lambda container images
  - Version control for ML models
- **Estimated Cost**: $0.10/GB per month

#### 20. **AWS X-Ray** (Distributed Tracing)
- **Purpose**: Application performance monitoring
- **Planned Usage**:
  - Trace requests across services
  - Identify performance bottlenecks
  - Debug distributed applications
- **Estimated Cost**: $5.00 per million traces

## Resources Created

### AWS Account: 053787342835
- **S3 Bucket**: `instantid-models-053787342835`
- **SageMaker Model**: `instantid-model-v2`
- **SageMaker Endpoint**: `instantid-endpoint-v2` (ml.g5.xlarge)
- **SageMaker Notebook**: `instantid-downloader` (ml.t3.medium)
- **Lambda Function**: `image-composition`
- **API Gateway**: `vag36c2ztf` (image-composition-api)
- **IAM Roles**: `SageMakerRole`, `LambdaExecutionRole`
- **CloudWatch Logs**: Multiple log groups for monitoring

## Total Estimated Monthly Costs

### Current Implementation (MVP)
- **SageMaker Endpoint**: $1,080/month (24/7 operation)
- **Lambda**: $5-20/month (depending on usage)
- **API Gateway**: $10-50/month (depending on traffic)
- **S3**: $1/month (model storage)
- **CloudWatch**: $5-15/month (logs and metrics)
- **Total MVP**: ~$1,100-1,200/month

### Full Production Implementation
- **Core Services**: $1,200/month
- **Additional Services**: $200-500/month
- **Data Transfer**: $50-200/month
- **Total Production**: ~$1,500-2,000/month

### Cost Optimization Strategies
1. **SageMaker**: Use auto-scaling and scheduled scaling
2. **Lambda**: Optimize memory allocation and execution time
3. **S3**: Use Intelligent Tiering for cost optimization
4. **CloudWatch**: Set up log retention policies
5. **Reserved Instances**: For predictable workloads

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
