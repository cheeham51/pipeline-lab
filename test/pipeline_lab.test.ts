import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as PipelineLab from '../lib/pipeline_lab-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/pipeline_lab-stack.ts
test('Test Pipeline Lab Stack', () => {
  const app = new cdk.App();
// //     // WHEN
  const stack = new PipelineLab.PipelineLabStack(app, 'MyTestStack');
// //     // THEN
  const template = Template.fromStack(stack);

  template.hasResource('AWS::CodePipeline::Pipeline', {});
});
