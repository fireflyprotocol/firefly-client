/**
 * Places a market order on exchange and listens to emitted events
 */

/* eslint-disable no-console */
import {
  FireflyClient,
  MARKET_SYMBOLS,
  Networks,
  ORDER_SIDE,
  ORDER_TYPE,
  PlaceOrderResponse,
} from "../../index";

async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "c6fa38ca12f7ab92622a96887675d872e6fb61e1b7a5870df31bb863344295be";

  const client = new FireflyClient(
    true,
    Networks.TESTNET_ARBITRUM,
    dummyAccountKey
  ); // passing isTermAccepted = true for compliance and authorizarion

  // load/init contract addresses
  await client.init();

  client.addMarket(MARKET_SYMBOLS.ETH);

  const callback = ({ order }: { order: PlaceOrderResponse }) => {
    console.log(order);

    // kill sockets in order to stop script
    client.sockets.close();
  };
  const connection_callback = async () => {
    // This callback will be invoked as soon as the socket connection is established
    // start listening to local user events
    client.sockets.subscribeUserUpdateByToken();

    // triggered when order updates are received
    client.sockets.onUserOrderCancellationFailed(callback);
  };

  const disconnection_callback = async () => {
    console.log("Sockets disconnected, performing actions...");
  };

  // must specify connection_callback before opening the sockets below
  await client.sockets.listen("connect", connection_callback);
  await client.sockets.listen("disconnect", disconnection_callback);

  console.log("Making socket connection to firefly exchange");
  client.sockets.open();

  /** ****  Placing an Order ***** */
  // default leverage of account is set to 3 on firefly
  const leverage = await client.getUserDefaultLeverage(MARKET_SYMBOLS.ETH);

  // post a market order
  await client.postOrder({
    symbol: MARKET_SYMBOLS.ETH,
    price: 0,
    quantity: 0.5,
    side: ORDER_SIDE.BUY,
    orderType: ORDER_TYPE.MARKET,
    leverage,
  });
}

main().then().catch(console.warn);
