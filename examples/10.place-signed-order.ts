/**
 * Places the signed order on orderbook
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS, ORDER_SIDE } from "../index";

async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  await client.initializeContractAddresses()

  client.addMarket(MARKET_SYMBOLS.DOT);

  // will create a signed order to sell 0.1 DOT at MARKET price
  const signedOrder = await client.createSignedOrder({
    symbol: MARKET_SYMBOLS.DOT, // asset to be traded
    price: 0, // 0 implies market order anything > 0 is limit order
    quantity: 0.1, // the amount of asset to trade
    side: ORDER_SIDE.SELL, // buy or sell
  });

  const response = await client.placeSignedOrder(signedOrder);
  console.log(response.data);
}

main().then().catch(console.warn);
