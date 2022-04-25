#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineLabStack } from '../lib/pipeline_lab-stack';
import { BillingStack } from '../lib/billing-stack';
import { ServiceStack } from '../lib/service-stack';

const app = new cdk.App();

new PipelineLabStack(app, 'PipelineLabStack', {
});

new BillingStack(app, 'BillingStack', {
  budgetAmount: 5,
  emailAddress: 'cheeham51@hotmail.com',
});

new ServiceStack(app, 'ServiceStack');