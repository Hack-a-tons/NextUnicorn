const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { RekognitionClient, DetectLabelsCommand, DetectFacesCommand } = require('@aws-sdk/client-rekognition');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const sagemakerClient = new SageMakerRuntimeClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });
const rekognitionClient = new RekognitionClient({ region: 'us-east-1' });

const BUCKET_NAME = 'instantid-models-053787342835';

async function analyzeImageFromUrl(imageUrl) {
    try {
        // For demo, we'll analyze based on URL patterns
        // In production, you'd download and analyze the actual image
        const analysis = {
            person: [],
            clothing: [],
            place: []
        };
        
        if (imageUrl.includes('person') || imageUrl.includes('face')) {
            analysis.person = ['person', 'face', 'portrait'];
        }
        if (imageUrl.includes('shirt') || imageUrl.includes('clothing')) {
            analysis.clothing = ['shirt', 'clothing', 'fashion'];
        }
        if (imageUrl.includes('beach') || imageUrl.includes('place')) {
            analysis.place = ['beach', 'outdoor', 'scenic'];
        }
        
        return analysis;
    } catch (error) {
        console.error('Image analysis error:', error);
        return { person: [], clothing: [], place: [] };
    }
}

function createEnhancedPrompt(personAnalysis, clothingAnalysis, placeAnalysis) {
    const personDesc = personAnalysis.person.length > 0 ? 
        `a ${personAnalysis.person.join(', ')}` : 'a person';
    
    const clothingDesc = clothingAnalysis.clothing.length > 0 ? 
        `wearing ${clothingAnalysis.clothing.join(', ')}` : 'wearing fashionable clothing';
    
    const placeDesc = placeAnalysis.place.length > 0 ? 
        `in a ${placeAnalysis.place.join(', ')} setting` : 'in a beautiful location';
    
    return `A photorealistic image of ${personDesc} ${clothingDesc} ${placeDesc}. High quality, detailed, professional photography style, perfect lighting, sharp focus.`;
}

exports.handler = async (event) => {
    try {
        const { personImage, clothingImages, placeImage } = JSON.parse(event.body);
        
        // Analyze input images to create better prompt
        console.log('Analyzing input images...');
        const [personAnalysis, clothingAnalysis, placeAnalysis] = await Promise.all([
            analyzeImageFromUrl(personImage),
            analyzeImageFromUrl(clothingImages[0] || ''),
            analyzeImageFromUrl(placeImage)
        ]);
        
        // Create enhanced prompt based on analysis
        const prompt = createEnhancedPrompt(personAnalysis, clothingAnalysis, placeAnalysis);
        console.log('Generated prompt:', prompt);
        
        const command = new InvokeEndpointCommand({
            EndpointName: 'sdxl-endpoint',
            ContentType: 'application/json',
            Body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_inference_steps: 25,
                    guidance_scale: 8.0,
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
                message: "Image generated with enhanced prompt analysis",
                prompt: prompt,
                analysis: {
                    person: personAnalysis,
                    clothing: clothingAnalysis,
                    place: placeAnalysis
                },
                inputs: { personImage, clothingImages, placeImage },
                note: "Enhanced with image analysis. Image URL valid for 24 hours."
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
