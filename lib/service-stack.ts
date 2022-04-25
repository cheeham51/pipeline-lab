import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParametersCode, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';

interface ServiceStackProps extends StackProps {
    stageName: string
}

export class ServiceStack extends Stack {
    public readonly serviceCode: CfnParametersCode
    constructor(scope: Construct, id: string, props: ServiceStackProps) {
        super(scope, id, props);

        this.serviceCode = Code.fromCfnParameters()
        
        const myFunction = new Function(this, 'MyFunction', {
            runtime: Runtime.NODEJS_14_X,
            handler: 'src/lambda.handler',
            code: this.serviceCode,
            functionName: `ServiceLambda${props.stageName}`
        })

        new LambdaRestApi(this, 'myapi', {
            handler: myFunction,
        })

    }
}
