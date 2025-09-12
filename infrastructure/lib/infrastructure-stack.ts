import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function
    const imageCompositionFunction = new lambda.Function(this, 'ImageCompositionFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'lambda-function.handler',
      code: lambda.Code.fromAsset('lambda'),
      timeout: cdk.Duration.seconds(30),
    });

    // Add SageMaker permissions to Lambda
    imageCompositionFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sagemaker:InvokeEndpoint'],
      resources: ['arn:aws:sagemaker:us-east-1:053787342835:endpoint/instantid-endpoint']
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'ImageCompositionApi', {
      restApiName: 'Image Composition Service',
      description: 'API for combining person, clothing, and place images'
    });

    const generateResource = api.root.addResource('generate');
    generateResource.addMethod('POST', new apigateway.LambdaIntegration(imageCompositionFunction));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Image Composition API URL'
    });
  }
}
