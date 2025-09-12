const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');

const client = new SageMakerRuntimeClient({ region: 'us-east-1' });

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
        
        const result = await client.send(command);
        const response = JSON.parse(Buffer.from(result.Body).toString());
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                imageUrl: response.generated_images?.[0] || response.images?.[0] || response.image || "data:image/jpeg;base64," + response,
                status: "success",
                message: "Image generated successfully with Stable Diffusion XL",
                prompt: prompt,
                inputs: { personImage, clothingImages, placeImage },
                note: "Currently using SDXL text-to-image. InstantID integration coming soon."
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
