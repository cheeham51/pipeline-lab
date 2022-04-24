import { Stack, StackProps, SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';

export class PipelineLabStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, 'MyPipeline', {
      crossAccountKeys: false,
      pipelineName: 'PipelineLab'
    })

    const sourceOutput = new Artifact()

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: 'cheeham51',
          repo: 'pipeline-lab',
          branch: 'main',
          actionName: 'PipelineSrouce',
          oauthToken: SecretValue.secretsManager('github-token'),
          output: sourceOutput
        })
      ]
    })

    const cdkBuildOutput = new Artifact()

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'CdkBuild',
          input: sourceOutput,
          outputs: [cdkBuildOutput],
          project: new PipelineProject(this, 'CdkBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build_specs/cdk_build_specs.yml')
          })
        })
      ]
    })

  }
}
