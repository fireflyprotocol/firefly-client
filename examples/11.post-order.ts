/**
 * Posts an order to exchange. Creates the signed order and places it to exchange,
 * without requiring two separate function calls.
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS, ORDER_SIDE } from "../index";

async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  client.addMarket(MARKET_SYMBOLS.DOT);

  // will post a limit order of 0.5 quantity at price 11
  const response = await client.postOrder({
    symbol: MARKET_SYMBOLS.DOT,
    price: 11,
    quantity: 0.5,
    side: ORDER_SIDE.BUY,
  });

  console.log(response.data);
}

main().then().catch(console.warn);
