import * as activity from '@temporalio/activity';
import { Order } from './interfaces/order';
import {
  reserveInventoryAPI,
  undoReserveInventoryAPI
} from './api';

export async function requireApproval(order: Order): Promise<boolean> {
  console.log(`Checking order requires approval (over $10k)`);

  // Simulate approval logic
  if (order.items.reduce((sum, item) =>
    sum + item.itemPrice * item.quantity, 0) > 10000) {
    console.log('Order requires approval');
    return true;
  }

  await simulateDelay(1000);
  return false;
}

export async function processPayment(order: Order): Promise<string> {
  console.log("Processing payment...");

  // Simulate payment processing logic
  if (order.payment.creditCard.expiration === "12/23") {
    throw new CreditCardExpiredException("Payment failed: Credit card expired");
  }

  await simulateDelay(1000);
  return `Payment is processed for ${order.items.length} items`;
}

export async function processRefund(order: Order): Promise<string> {
  console.log("Processing refund...");

  await simulateDelay(1000);
  return `Refund is processed for ${order.items.length} items`;
}

export async function reserveInventory(order: Order): Promise<string> {
  const info = activity.Context.current().info;
  const idempotencyKey = `temporal:${info.workflowExecution.workflowId}:${info.activityId}`
  // Simulate inventory reservation logic
  console.log("Reserving inventory...");
  await reserveInventoryAPI(idempotencyKey, order.items);

  await simulateDelay(1000);
  return `Inventory reserved for ${order.items.length} items`;
}

export async function undoReserveInventory(order: Order): Promise<string> {
  const info = activity.Context.current().info;
  const idempotencyKey = `temporal:${info.workflowExecution.workflowId}:${info.activityId}`
  // Simulate inventory reservation logic
  console.log("Undo reserving inventory...");
  await undoReserveInventoryAPI(idempotencyKey, order.items);

  await simulateDelay(1000);
  return `Inventory reserve is undo for ${order.items.length} items`;
}

export async function deliverOrder(order: Order): Promise<string> {
  // Simulate order delivery logic
  console.log("Delivering order...");

  await simulateDelay(1000);
  return `Order delivered for ${order.items.length} items`;
}

function simulateDelay(sleepMs: number): Promise<void> {
  // take sleepMs as input and introduce variance of +/- 20%
  const variance = sleepMs * 0.2;
  sleepMs += Math.floor(Math.random() * 2 * variance) - variance;
  console.log(`Simulating delay of ${sleepMs}ms`);
  return new Promise((resolve) => setTimeout(resolve, sleepMs));
}

export class CreditCardExpiredException extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = CreditCardExpiredException.name;
  }
}