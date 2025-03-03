import { promises as fs } from 'fs';
import path from 'path';
import { OrderItem } from './interfaces/order';
import * as activity from '@temporalio/activity';

const stockDatabasePath = path.resolve(__dirname, '../data/stock_database.json');

interface StockItem {
  itemName: string;
  itemPrice: number;
  stock: number;
}

async function reserveInventoryAPI(idempotencyKey: string, orderItems: OrderItem[]): Promise<void> {
  console.log(`Reserving inventory for order with idempotency key: ${idempotencyKey}`);
  
  // // Simulate inventory service downtime when order has more than 100 items quantity
  // // The activity will sleep the first 3 times it is called
  // // And throw an error to simulate API call timeout
  const activityInfo = activity.Context.current().info;
  if (orderItems.reduce((sum, item) => sum + item.quantity, 0) > 100) {
    if (activityInfo.attempt <= 4) {
      console.log(`Inventory service down, attempt ${activityInfo.attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      throw new Error("Inventory service down");
    }
  }
  // mock API logic code
  const stockData = await fs.readFile(stockDatabasePath, 'utf-8');
  const stockDatabase: StockItem[] = JSON.parse(stockData);

  for (const orderItem of orderItems) {
    let itemName = orderItem.itemName;

    // // //  SIMULATE BUG FIX FOR INVALID DATA BUG
    // // // Removes @@@ from the end of the item name if present
    if (itemName.endsWith('@@@')) {
      itemName = itemName.slice(0, -3);
      console.log(`BUG FIX: Removed @@@ from item name: ${itemName}`);
    }

    const stockItem = stockDatabase.find(item => item.itemName === itemName);

    if (!stockItem) {
      throw new Error(`Couldn't find item in stock database: ${orderItem.itemName}`);
    }

    console.log(`Reserving inventory for item: ${orderItem.itemName}`);
  }
  // simulating the reservation with print statements
}


async function undoReserveInventoryAPI(idempotencyKey: string, orderItems: OrderItem[]): Promise<void> {
  console.log(`Undo reserving inventory for order with idempotency key: ${idempotencyKey}`);

  // mock API logic code
  const stockData = await fs.readFile(stockDatabasePath, 'utf-8');
  const stockDatabase: StockItem[] = JSON.parse(stockData);

  for (const orderItem of orderItems) {
    const itemName = orderItem.itemName;

    const stockItem = stockDatabase.find(item => item.itemName === itemName);

    if (!stockItem) {
      throw new Error(`Couldn't find item in stock database: ${orderItem.itemName}`);
    }

    console.log(`Undo reserving inventory for item: ${orderItem.itemName}`);
  }
  // simulating the reservation with print statements
}

export { reserveInventoryAPI, undoReserveInventoryAPI };
