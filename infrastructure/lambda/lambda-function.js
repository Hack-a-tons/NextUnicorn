const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { RekognitionClient, DetectLabelsCommand, DetectFacesCommand } = require('@aws-sdk/client-rekognition');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const https = require('https');

const sagemakerClient = new SageMakerRuntimeClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });
const rekognitionClient = new RekognitionClient({ region: 'us-east-1' });

const BUCKET_NAME = 'instantid-models-053787342835';

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

async function analyzeImageWithRekognition(imageBuffer) {
    try {
        const [labelsResult, facesResult] = await Promise.all([
            rekognitionClient.send(new DetectLabelsCommand({
                Image: { Bytes: imageBuffer },
                MaxLabels: 10,
                MinConfidence: 70
            })),
            rekognitionClient.send(new DetectFacesCommand({
                Image: { Bytes: imageBuffer },
                Attributes: ['ALL']
            }))
        ]);

        const labels = labelsResult.Labels?.map(label => label.Name.toLowerCase()) || [];
        const faces = facesResult.FaceDetails || [];
        
        return {
            labels,
            faces: faces.length,
            demographics: faces.length > 0 ? {
                ageRange: faces[0].AgeRange,
                gender: faces[0].Gender?.Value,
                emotions: faces[0].Emotions?.slice(0, 3).map(e => e.Type.toLowerCase())
            } : null
        };
    } catch (error) {
        console.error('Rekognition analysis error:', error);
        return { labels: [], faces: 0, demographics: null };
    }
}

function createEnhancedPrompt(personAnalysis, clothingAnalysis, placeAnalysis) {
    // Person description
    let personDesc = 'a person';
    if (personAnalysis.demographics) {
        const { gender, ageRange, emotions } = personAnalysis.demographics;
        const age = ageRange ? `${Math.round((ageRange.Low + ageRange.High) / 2)}-year-old` : '';
        const mood = emotions && emotions.length > 0 ? emotions[0] : '';
        personDesc = `a ${age} ${gender || 'person'}${mood ? ` with ${mood} expression` : ''}`;
    }
    
    // Clothing description
    const clothingLabels = clothingAnalysis.labels.filter(label => 
        ['clothing', 'shirt', 'dress', 'jacket', 'pants', 'fashion', 'apparel'].some(term => 
            label.includes(term)
        )
    );
    const clothingDesc = clothingLabels.length > 0 ? 
        `wearing ${clothingLabels.slice(0, 3).join(', ')}` : 'wearing fashionable clothing';
    
    // Place description
    const placeLabels = placeAnalysis.labels.filter(label => 
        ['outdoor', 'indoor', 'beach', 'city', 'nature', 'building', 'landscape', 'scenery'].some(term => 
            label.includes(term)
        )
    );
    const placeDesc = placeLabels.length > 0 ? 
        `in a ${placeLabels.slice(0, 3).join(', ')} setting` : 'in a beautiful location';
    
    return `A photorealistic portrait of ${personDesc} ${clothingDesc} ${placeDesc}. Professional photography, high quality, detailed, perfect lighting, sharp focus, cinematic composition.`;
}

exports.handler = async (event) => {
    try {
        const { personImage, clothingImages, placeImage } = JSON.parse(event.body);
        
        console.log('Downloading and analyzing images...');
        
        // Download and analyze images in parallel
        const [personBuffer, clothingBuffer, placeBuffer] = await Promise.all([
            downloadImage(personImage).catch(() => null),
            downloadImage(clothingImages[0] || personImage).catch(() => null),
            downloadImage(placeImage).catch(() => null)
        ]);
        
        // Analyze images with Rekognition
        const [personAnalysis, clothingAnalysis, placeAnalysis] = await Promise.all([
            personBuffer ? analyzeImageWithRekognition(personBuffer) : { labels: [], faces: 0 },
            clothingBuffer ? analyzeImageWithRekognition(clothingBuffer) : { labels: [], faces: 0 },
            placeBuffer ? analyzeImageWithRekognition(placeBuffer) : { labels: [], faces: 0 }
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
                    num_inference_steps: 30,
                    guidance_scale: 8.5,
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
                message: "Image generated with AI-powered analysis",
                prompt: prompt,
                analysis: {
                    person: {
                        labels: personAnalysis.labels.slice(0, 5),
                        faces: personAnalysis.faces,
                        demographics: personAnalysis.demographics
                    },
                    clothing: {
                        labels: clothingAnalysis.labels.slice(0, 5)
                    },
                    place: {
                        labels: placeAnalysis.labels.slice(0, 5)
                    }
                },
                inputs: { personImage, clothingImages, placeImage },
                note: "Enhanced with Amazon Rekognition analysis. Image URL valid for 24 hours."
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
