import {
  proxyActivities, defineSignal, setHandler, condition, sleep, ApplicationFailure
}
  from '@temporalio/workflow';

import type * as activities from '../activities';
import type { Order } from '../interfaces/order';

const { requireApproval, processPayment, reserveInventory, deliverOrder, undoReserveInventory, processRefund } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 seconds',
  retry: { nonRetryableErrorTypes: ['CreditCardExpiredException'] }
});

export const approveOrder = defineSignal('approveOrder');

export async function OrderFulfillWorkflow3(order: Order): Promise<string> {
  let isApproved = false;
  setHandler(approveOrder, () => { isApproved = true; });

  const paymentResult = await processPayment(order);
  const inventoryResult = await reserveInventory(order);
  try {
    if (await requireApproval(order)) {
      const approvalOrTimeout = Promise.race([
        condition(() => isApproved),
        sleep(60000).then(() => { 
          throw new ApplicationFailure('Approval timed out'); 
        })
      ]);
      await approvalOrTimeout;
    }
  } catch (err) {
    let reason = 'Unknown';
    if (err instanceof ApplicationFailure && err.message === 'Approval timed out') {
      reason = 'No Approval';
    }
    const refundResult = await undoReserveInventory(order);
    const undoInventory = await processRefund(order);
    return `Order is reverted due to "${reason}" reason: ${refundResult}, ${undoInventory}`;
  }
  // else
  const deliveryResult = await deliverOrder(order);
  return `Order fulfilled: ${paymentResult}, ${inventoryResult}, ${deliveryResult}`;
}