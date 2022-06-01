/**
 * Places a market order on exchange and listens to emitted events
 */

/* eslint-disable no-console */
import {
  Networks,
  FireflyClient,
  MARKET_SYMBOLS,
  ORDER_SIDE,
  PlaceOrderResponse,
} from "../src/index";

async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  client.addMarket(MARKET_SYMBOLS.DOT);

  // create socket connection
  client.sockets.open();

  // start listening to global market and local user events
  client.sockets.subscribeGlobalUpdatesBySymbol(MARKET_SYMBOLS.DOT);
  client.sockets.subscribeUserUpdateByAddress(client.getPublicAddress());

  const callback = ({ order }: { order: PlaceOrderResponse }) => {
    console.log(order);

    // kill sockets in order to stop script
    client.sockets.close();
  };

  client.sockets.onUserOrderUpdate(callback);

  // post a market order
  await client.postOrder({
    symbol: MARKET_SYMBOLS.DOT,
    price: 0,
    quantity: 0.5,
    side: ORDER_SIDE.BUY,
  });
}

main().then().catch(console.warn);
