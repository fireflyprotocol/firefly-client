/**
 * Places a market order on exchange and listens to emitted events
 */

/* eslint-disable no-console */
import {
  Networks,
  FireflyClient,
  MARKET_SYMBOLS,
  GetOrderBookResponse,
  PlaceOrderResponse,
  ORDER_SIDE,
  ORDER_TYPE
} from "../index";

async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(
    true,
    Networks.TESTNET_ARBITRUM,
    dummyAccountKey
  ); // passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  client.addMarket(MARKET_SYMBOLS.ETH);

  const callbackOrderUpdates = ({ order }: { order: PlaceOrderResponse }) => {
    console.log("OrderUpdate:", order);

      // kill sockets in order to stop script
  client.sockets.close();
  };
  const callbackOrderBookUpdates = ({
    orderbook,
  }: {
    orderbook: GetOrderBookResponse;
  }) => {
    console.log("OrderbookState:", orderbook);
  };

  const callbackExchangeHealth = ({ isAlive }: { isAlive: boolean }) => {
    console.log("Exchange Health:", isAlive);
  };

  const connection_callback = async () => {
    console.log("Sockets connected");
    // start listening to global market and local user events
    client.sockets.subscribeGlobalUpdatesBySymbol(MARKET_SYMBOLS.ETH);
    client.sockets.subscribeUserUpdateByToken();

    client.sockets.onUserOrderUpdate(callbackOrderUpdates);
    client.sockets.onOrderBookUpdate(callbackOrderBookUpdates);
    client.sockets.onExchangeHealthChange(callbackExchangeHealth);

  };

  const disconnection_callback = async () => {
    console.log("Sockets disconnected");
    try {
      await client.cancelAllOpenOrders(MARKET_SYMBOLS.ETH);
    } catch (e) {
      console.log(e);
    }
  };

  // adding listeners
  await client.sockets.listen("connect", connection_callback);
  await client.sockets.listen("disconnect", disconnection_callback);

  // create socket connection
  client.sockets.open();

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
