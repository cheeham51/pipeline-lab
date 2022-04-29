import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParametersCode, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Alias } from 'aws-cdk-lib/aws-lambda';
import { LambdaDeploymentConfig, LambdaDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';

interface ServiceStackProps extends StackProps {
    stageName: string
}

export class ServiceStack extends Stack {
    public readonly serviceCode: CfnParametersCode
    public readonly serviceEndpointOutput: CfnOutput
    constructor(scope: Construct, id: string, props: ServiceStackProps) {
        super(scope, id, props);

        this.serviceCode = Code.fromCfnParameters()
        
        const myFunction = new Function(this, 'MyFunction', {
            runtime: Runtime.NODEJS_14_X,
            handler: 'src/lambda.handler',
            code: this.serviceCode,
            functionName: `ServiceLambda${props.stageName}`,
            description: `Generated on ${new Date().toISOString}`
        })

        const alias = new Alias(this, 'myFunctionAlias', {
            version: myFunction.currentVersion,
            aliasName: `ServiceLambdaAlias${props.stackName}`
        })

        const myApi = new LambdaRestApi(this, 'myapi', {
            handler: alias,
        })

        if (props.stageName === 'Prod') {
            new LambdaDeploymentGroup(this, 'DeploymentGroup', {
                alias: alias,
                deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES
            })
        }

        this.serviceEndpointOutput = new CfnOutput(this, 'ApiEndpointOutput', {
            exportName: `ServiceEndpoint${props.stageName}`,
            value: myApi.url,
            description: 'API Endpoint'
        })

    }
}
