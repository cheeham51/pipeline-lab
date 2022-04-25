#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineLabStack } from '../lib/pipeline_lab-stack';
import { BillingStack } from '../lib/billing-stack';
import { ServiceStack } from '../lib/service-stack';

const app = new cdk.App();

const pipelineLabStack = new PipelineLabStack(app, 'PipelineLabStack', {});

new BillingStack(app, 'BillingStack', {
  budgetAmount: 5,
  emailAddress: 'cheeham51@hotmail.com',
});

const serviceStackProd = new ServiceStack(app, 'ServiceStackProd');

pipelineLabStack.addServiceStage(serviceStackProd, 'Prod');