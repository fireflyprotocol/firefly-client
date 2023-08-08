/**
 * Places a market order on exchange and listens to emitted events
 */

/* eslint-disable no-console */
import {
  Networks,
  FireflyClient,
  MARKET_SYMBOLS,
  GetOrderBookResponse,
  ORDER_SIDE,
  ORDER_TYPE,
  PlaceOrderResponse
} from "../index";


async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM, dummyAccountKey); // passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  client.addMarket(MARKET_SYMBOLS.ETH);


  const connection_callback = () => {
    console.log("Sockets connected");
    // start listening to global market and local user events
    client.sockets.subscribeGlobalUpdatesBySymbol(MARKET_SYMBOLS.ETH);
    client.sockets.subscribeUserUpdateByToken();
  }

  const disconnection_callback = () => {
    console.log("Sockets disconnected");

  }

  // create socket connection
  client.sockets.open(connection_callback, disconnection_callback);
  const callbackOrderUpdates = ({ order }: { order: PlaceOrderResponse }) => {
    console.log(order);
    // kill sockets in order to stop script
    client.sockets.close();

  };
  const callbackOrderBookUpdates = ({ orderbook }: { orderbook: GetOrderBookResponse }) => {
    console.log(orderbook);
  };

  client.sockets.onUserOrderUpdate(callbackOrderUpdates);
  client.sockets.onOrderBookUpdate(callbackOrderBookUpdates);

  // post a market order
  await client.postOrder({
    symbol: MARKET_SYMBOLS.ETH,
    price: 0,
    quantity: 0.5,
    side: ORDER_SIDE.BUY,
    orderType: ORDER_TYPE.MARKET,
  });
}

main().then().catch(console.warn);
