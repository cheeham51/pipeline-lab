import { Stack, StackProps, SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Artifact, IStage, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, CloudFormationCreateUpdateStackAction, GitHubSourceAction, CodeBuildActionType } from 'aws-cdk-lib/aws-codepipeline-actions';
import { BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Topic } from 'aws-cdk-lib/aws-sns';


import { ServiceStack } from './service-stack';
import { BillingStack } from './billing-stack';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { EventField, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

export class PipelineLabStack extends Stack {
  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  private readonly pipelineNotificationsTopic: Topic;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.pipelineNotificationsTopic = new Topic(this, 'PipelineNotificationsTopic', {
      topicName: 'PipelineNotifications'
    })

    this.pipelineNotificationsTopic.addSubscription(
      new EmailSubscription('cheeham51@hotmail.com')
    )

    this.pipeline = new Pipeline(this, 'MyPipeline', {
      crossAccountKeys: false,
      pipelineName: 'PipelineLab',
      restartExecutionOnUpdate: true
    })

    const cdkSourceOutput = new Artifact('CdkSourceOutput')
    this.serviceSourceOutput = new Artifact('ServiceSourceOutput')

    this.pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: 'cheeham51',
          repo: 'pipeline-lab',
          branch: 'main',
          actionName: 'cdkPipelineSource',
          oauthToken: SecretValue.secretsManager('github-token'),
          output: cdkSourceOutput
        }),
        new GitHubSourceAction({
          owner: 'cheeham51',
          repo: 'webapp_lab',
          branch: 'main',
          actionName: 'ServiceSource',
          oauthToken: SecretValue.secretsManager('github-token'),
          output: this.serviceSourceOutput
        })
      ]
    })

    this.cdkBuildOutput = new Artifact('CdkBuildOutput')
    this.serviceBuildOutput = new Artifact('ServiceBuildOutput')

    this.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'CdkBuild',
          input: cdkSourceOutput,
          outputs: [this.cdkBuildOutput],
          project: new PipelineProject(this, 'CdkBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build_specs/cdk_build_specs.yml')
          })
        }),
        new CodeBuildAction({
          actionName: 'ServiceBuild',
          input: this.serviceSourceOutput,
          outputs: [this.serviceBuildOutput],
          project: new PipelineProject(this, 'ServiceBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build_specs/service_build_specs.yml')
          })
        })
      ]
    })

    this.pipeline.addStage({
      stageName: 'PipelineUpdate',
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'PipelineUpdate',
          stackName: 'PipelineLabStack',
          templatePath: this.cdkBuildOutput.atPath('PipelineLabStack.template.json'),
          adminPermissions: true
        })
      ]
    })

  }

  public addServiceStage(serviceStack: ServiceStack, stageName: string): IStage {
    return this.pipeline.addStage({
      stageName: stageName,
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: "ServiceUpdate",
          stackName: serviceStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
          adminPermissions: true,
          parameterOverrides: {
            ...serviceStack.serviceCode.assign(this.serviceBuildOutput.s3Location)
          },
          extraInputs: [this.serviceBuildOutput]
        })
      ]
    })
  }

  public addBillingStackToStage(billingStack: BillingStack, stage: IStage) {
    stage.addAction(
      new CloudFormationCreateUpdateStackAction({
        actionName: 'BillingUpdate',
        stackName: billingStack.stackName,
        templatePath: this.cdkBuildOutput.atPath(`${billingStack.stackName}.template.json`),
        adminPermissions: true
      })
    )
  }

  public addServiceIntegrationTestToStage(stage: IStage, serviceEndpoint: string) {
    const integrationTestAction = new CodeBuildAction({
      actionName: "IntegrationTests",
      input: this.serviceSourceOutput,
      project: new PipelineProject(this, 'ServiceIntegrationTestsProject', {
        environment: {
          buildImage: LinuxBuildImage.STANDARD_5_0
        },
        buildSpec: BuildSpec.fromSourceFilename('build_specs/integ_test_build_specs.yml')
      }),
      environmentVariables: {
        SERVICE_ENDPOINT: {
          value: serviceEndpoint,
          type: BuildEnvironmentVariableType.PLAINTEXT
        }
      },
      type: CodeBuildActionType.TEST,
      runOrder: 2
    })
    stage.addAction(integrationTestAction)
    integrationTestAction.onStateChange(
      'IntegrationTestFailed',
      new SnsTopic(this.pipelineNotificationsTopic, {
        message: RuleTargetInput.fromText(`Integration Test Failed. See details here: ${EventField.fromPath('$.detail.execution-result.external-execution-url')}`)
      }),
      {
        ruleName: 'IntegrationTestFailed',
        eventPattern: {
          detail: {
            state: ['FAILED']
          }
        },
        description: 'Integration test has failed'
      }
    )
  }
}
