import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Budget } from './constructs/budget';

interface BillingStackProps extends StackProps {
    budgetAmount: number,
    emailAddress: string,
}

export class BillingStack extends Stack {
  constructor(scope: Construct, id: string, props: BillingStackProps) {
    super(scope, id, props);

    new Budget (this, 'MyBudget', {
        budgetAmount: props.budgetAmount,
        emailAddress: props.emailAddress
    })
    
  }
}
