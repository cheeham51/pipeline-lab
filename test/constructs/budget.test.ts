import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Budget } from '../../lib/constructs/budget';

test('Budget Construct', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'BudgetStack')

      new Budget(stack, 'TestBudget', {
          emailAddress: 'test@example.com',
          budgetAmount: 5
      })

      const template = Template.fromStack(stack);
    
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget : {
            BudgetType: 'COST',
            TimeUnit: 'MONTHLY',
            BudgetLimit: {
                Amount: 5,
                Unit: 'USD',
            },
            BudgetName: 'MonthlyBudget',
        },
        NotificationsWithSubscribers: [
            {
                Notification: {
                    ComparisonOperator: 'GREATER_THAN',
                    NotificationType: 'ACTUAL',
                    Threshold: 100,
                    ThresholdType: 'PERCENTAGE',
                  },
                  Subscribers: [{
                    Address: 'test@example.com',
                    SubscriptionType: 'EMAIL',
                  }],
            }
        ]
      });
});
    