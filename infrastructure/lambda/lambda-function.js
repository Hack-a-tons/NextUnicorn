const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const sagemakerClient = new SageMakerRuntimeClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });

const BUCKET_NAME = 'instantid-models-053787342835';

exports.handler = async (event) => {
    try {
        const { personImage, clothingImages, placeImage } = JSON.parse(event.body);
        
        // Create a detailed prompt from the input images
        const prompt = `A photorealistic image of a person wearing fashionable clothing in a beautiful location. High quality, detailed, professional photography style.`;
        
        const command = new InvokeEndpointCommand({
            EndpointName: 'sdxl-endpoint',
            ContentType: 'application/json',
            Body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_inference_steps: 20,
                    guidance_scale: 7.5,
                    width: 1024,
                    height: 1024
                }
            })
        });
        
        const result = await sagemakerClient.send(command);
        const response = JSON.parse(Buffer.from(result.Body).toString());
        
        // Extract base64 image data
        let imageData;
        if (response.generated_images && response.generated_images[0]) {
            imageData = response.generated_images[0];
        } else if (response.images && response.images[0]) {
            imageData = response.images[0];
        } else if (typeof response === 'string') {
            imageData = response;
        } else {
            throw new Error('No image data found in response');
        }
        
        // Remove data URL prefix if present
        if (imageData.startsWith('data:image/')) {
            imageData = imageData.split(',')[1];
        }
        
        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomId = crypto.randomBytes(8).toString('hex');
        const filename = `generated-images/${timestamp}-${randomId}.jpg`;
        
        // Upload to S3
        const uploadCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: Buffer.from(imageData, 'base64'),
            ContentType: 'image/jpeg'
        });
        
        await s3Client.send(uploadCommand);
        
        // Generate presigned URL (valid for 24 hours)
        const getObjectCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename
        });
        
        const presignedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 86400 });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                imageUrl: presignedUrl,
                status: "success",
                message: "Image generated and saved to S3 successfully",
                prompt: prompt,
                inputs: { personImage, clothingImages, placeImage },
                note: "Image URL valid for 24 hours. Currently using SDXL text-to-image."
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: error.message,
                status: "error"
            })
        };
    }
};
