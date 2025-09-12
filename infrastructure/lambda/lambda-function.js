const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');

const client = new SageMakerRuntimeClient({ region: 'us-east-1' });

exports.handler = async (event) => {
    try {
        const { personImage, clothingImages, placeImage } = JSON.parse(event.body);
        
        const command = new InvokeEndpointCommand({
            EndpointName: 'instantid-endpoint-v3',
            ContentType: 'application/json',
            Body: JSON.stringify({
                inputs: {
                    person_image: personImage,
                    clothing_images: clothingImages,
                    place_image: placeImage,
                    prompt: "photorealistic person wearing clothes in location"
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
                imageUrl: response.generated_image || response.image_url || response.url,
                status: "success",
                message: "Image composition completed successfully",
                inputs: { personImage, clothingImages, placeImage }
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
