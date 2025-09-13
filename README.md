# Image Composition API

> **⚠️ PROJECT ARCHIVED ⚠️**
> 
> This project was developed as part of **'Build YC's Next Unicorn: Hack Day at AWS'** ([event link](https://luma.com/yc-aws-hack-day-09-12-2025)). 
> 
> **Status**: All AWS resources have been shut down to avoid costs. This project is now superseded by [banana.cam](https://banana.cam).

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

## Final Status ❌

### Project Shutdown (September 13, 2025):
All AWS resources have been deleted to eliminate costs:

- ❌ **Lambda Function**: Deleted (`image-composition`)
- ❌ **API Gateway**: Deleted (`image-composition-api`)
- ❌ **SageMaker Endpoints**: All deleted (InstantID attempts failed)
- ❌ **SageMaker Models**: Deleted (InstantID + SDXL)
- ❌ **SageMaker Notebook**: Deleted (`instantid-downloader`)
- ❌ **CodeBuild Project**: Deleted (`instantid-docker-build`)
- ❌ **ECR Repository**: Deleted (`instantid-custom`)
- ❌ **S3 Bucket**: Deleted with all contents (`instantid-models-053787342835`)

### What Worked:
- ✅ **SDXL Integration**: Successfully deployed SDXL with Rekognition analysis
- ✅ **Intelligent Prompts**: Created sophisticated image analysis and prompt generation
- ✅ **AWS Infrastructure**: Full serverless architecture with proper IAM roles
- ✅ **API Development**: Working REST API with proper error handling

### What Didn't Work:
- ❌ **InstantID Deployment**: Multiple Docker container issues on SageMaker
- ❌ **True Image Composition**: Could not achieve person+clothing+background fusion
- ❌ **Cost Management**: SageMaker GPU instances too expensive for MVP

## Lessons Learned

1. **SageMaker Complexity**: Custom Docker containers on SageMaker require extensive debugging
2. **Package Dependencies**: ML model dependencies are fragile and version-sensitive  
3. **Cost Considerations**: GPU instances ($1,000+/month) not viable for early-stage projects
4. **Alternative Approaches**: VM-based deployment (Azure/AWS EC2) would be more cost-effective

## Alternative Implementation

For future development, consider:
- **Azure VM**: NCasT4_v3 (~$380/month vs $1,080/month SageMaker)
- **Direct Docker**: Skip SageMaker, use VM with Docker deployment
- **Simpler Models**: Start with ControlNet instead of InstantID
- **Hybrid Approach**: Use existing APIs (Replicate, RunPod) for MVP validation

## Cost Summary

- **Total AWS Costs**: $0/month (all resources deleted)
- **Development Cost**: ~$50 in SageMaker experiments
- **Final Status**: Complete shutdown, no ongoing charges

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
