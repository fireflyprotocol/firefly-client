/**
 * Creates cancellation signature and places the order on exchange for cancellation
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS, ORDER_SIDE, ORDER_TYPE } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

  client.addMarket(MARKET_SYMBOLS.DOT);

  // post a limit order
  const response = await client.postOrder({
    symbol: MARKET_SYMBOLS.DOT,
    price: 15,
    quantity: 0.5,
    side: ORDER_SIDE.SELL,
    orderType: ORDER_TYPE.LIMIT
  });

  // posts order for cancellation on exchange
  const cancellationResponse = await client.postCancelOrder({
    symbol: MARKET_SYMBOLS.DOT,
    hashes: [response.response.data.hash],
  });

  console.log(cancellationResponse.data);
}

main().then().catch(console.warn);
