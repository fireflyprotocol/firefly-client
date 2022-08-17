/**
 * Create an order signature on chain and returns it. The signature is used to verify
 * during on-chain trade settlement whether the orders being settled against each other
 * were actually signed on by the maker/taker of the order or not.
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS, ORDER_SIDE } from "../index";

async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(true, Networks.TESTNET, dummyAccountKey);  //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

  client.addMarket(MARKET_SYMBOLS.DOT);

  // this will throw because BTC Market does not exist in client.
  try {
    client.createSignedOrder({
      symbol: MARKET_SYMBOLS.BTC,
      price: 0,
      quantity: 0.1,
      side: ORDER_SIDE.SELL,
    });
  } catch (e) {
    console.log("Error:", e);
  }

  // will create a signed order to sell 0.1 DOT at MARKET price
  const signedOrder = await client.createSignedOrder({
    symbol: MARKET_SYMBOLS.DOT, // asset to be traded
    price: 0, // 0 implies market order anything > 0 is limit order
    quantity: 0.1, // the amount of asset to trade
    side: ORDER_SIDE.SELL, // buy or sell
  });

  console.log("Signed Order Created:", signedOrder);
}

main().then().catch(console.warn);
