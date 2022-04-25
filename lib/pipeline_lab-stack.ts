import { Stack, StackProps, SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, CloudFormationCreateUpdateStackAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';

export class PipelineLabStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, 'MyPipeline', {
      crossAccountKeys: false,
      pipelineName: 'PipelineLab'
    })

    const cdkSourceOutput = new Artifact('CdkSourceOutput')
    const serviceSourceOutput = new Artifact('ServiceSourceOutput')

    pipeline.addStage({
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
          output: serviceSourceOutput
        })
      ]
    })

    const cdkBuildOutput = new Artifact('CdkBuildOutput')
    const serviceBuildOutput = new Artifact('ServiceBuildOutput')

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'CdkBuild',
          input: cdkSourceOutput,
          outputs: [cdkBuildOutput],
          project: new PipelineProject(this, 'CdkBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build_specs/cdk_build_specs.yml')
          })
        }),
        new CodeBuildAction({
          actionName: 'ServiceBuild',
          input: serviceSourceOutput,
          outputs: [serviceBuildOutput],
          project: new PipelineProject(this, 'ServiceBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build_specs/service_build_specs.yml')
          })
        })
      ]
    })

    pipeline.addStage({
      stageName: 'PipelineUpdate',
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'PipelineUpdate',
          stackName: 'PipelineLabStack',
          templatePath: cdkBuildOutput.atPath('PipelineLabStack.template.json'),
          adminPermissions: true
        })
      ]
    })

  }
}
