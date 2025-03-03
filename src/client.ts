import fs from 'fs/promises';
import path from 'path';
import { Connection, Client } from '@temporalio/client';
import { runWorkflows, getDefaultOrders } from './starter';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { Order, OrderItem } from './interfaces/order';
import { NativeConnection } from '@temporalio/worker';
import { Env, getEnv } from './interfaces/env';

// Extended Env interface to include API key
interface EnvWithApiKey extends Env {
  clientApiKey?: string;
}

/**
 * Schedule a Workflow connecting with either mTLS or API key authentication.
 * Configuration is provided via environment variables.
 * 
 * For mTLS: Requires clientCertPath and clientKeyPath
 * For API key: Requires clientApiKey
 * Note that serverNameOverride and serverRootCACertificate are optional.
 */
async function run({
  address,
  namespace,
  clientCertPath,
  clientKeyPath,
  clientApiKey,
  serverNameOverride,
  serverRootCACertificatePath,
  taskQueue,
}: EnvWithApiKey, numOrders?: number, invalidPercentage?: number) {
  let connection: Connection | NativeConnection;

  // Check for mTLS certificates first
  if (clientCertPath && clientKeyPath) {
    console.log('Using mTLS authentication');
    const serverRootCACertificate = serverRootCACertificatePath
      ? await fs.readFile(serverRootCACertificatePath)
      : undefined;

    connection = await Connection.connect({
      address,
      tls: {
        serverNameOverride,
        serverRootCACertificate,
        clientCertPair: {
          crt: await fs.readFile(clientCertPath),
          key: await fs.readFile(clientKeyPath),
        },
      },
    });
  }
  // If no mTLS certificates, check for API key
  else if (clientApiKey) {
    console.log('Using API key authentication');
    connection = await Connection.connect({
      address,
      tls: true,
      apiKey: clientApiKey,
      metadata: {
        'temporal-namespace': namespace,
      },
    });
  }
  // Fallback to unencrypted connection (not recommended for production)
  else {
    console.log('Warning: Using unencrypted connection');
    connection = await Connection.connect({ address });
    console.log('Connected to Temporal');
  }
  console.log(`Generating orders with ${numOrders} orders and ${invalidPercentage}% invalid orders`); 
  // Generate orders
  const orders = numOrders && invalidPercentage !== undefined 
    ? generateOrders(numOrders, invalidPercentage) 
    : getDefaultOrders();

  const client = new Client({ connection, namespace });
  await runWorkflows(client, taskQueue, orders);
}

// Rest of the code remains unchanged
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrders(count: number, invalidPercentage: number): Order[] {
  const stockDatabasePath = path.resolve(__dirname, '../data/stock_database.json');
  const stockData = require(stockDatabasePath);
  const orders: Order[] = [];
  const numInvalidOrders = Math.floor((invalidPercentage / 100) * count);

  for (let i = 0; i < count; i++) {
    const numItems = getRandomInt(5, 10);
    const orderItems: OrderItem[] = [];

    for (let j = 0; j < numItems; j++) {
      const itemIndex = getRandomInt(0, stockData.length - 1);
      const item = stockData[itemIndex];
      orderItems.push({
        itemName: item.itemName,
        itemPrice: item.itemPrice,
        quantity: getRandomInt(1, 99),
      });
    }

    const order: Order = {
      items: orderItems,
      payment: {
        creditCard: {
          number: "1234 5678 1234 5678",
          expiration: "12/25"
        }
      }
    };

    if (i < numInvalidOrders) {
      makeOrderInvalid(order);
    }

    orders.push(order);
  }

  return orders;
}

function makeOrderInvalid(order: Order): void {
  if (order.items.length > 0) {
    order.items[0].itemName += "@@@";
  }
}

const argv = yargs(hideBin(process.argv)).options({
  numOrders: { type: 'number', alias: 'n' },
  invalidPercentage: { type: 'number', alias: 'i' }
}).argv as { numOrders?: number, invalidPercentage?: number };

run(getEnv(), 3, 0).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);