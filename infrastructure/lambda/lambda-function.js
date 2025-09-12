const AWS = require('aws-sdk');
const sagemaker = new AWS.SageMakerRuntime();

exports.handler = async (event) => {
    try {
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
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ imageUrl: generatedImage.url })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
