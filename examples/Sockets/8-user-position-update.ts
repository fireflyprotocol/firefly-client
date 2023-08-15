/**
 * Places a market order on exchange and listens to emitted events
 */

/* eslint-disable no-console */
import {
  FireflyClient,
  GetPositionResponse,
  MARKET_SYMBOLS,
  Networks,
  ORDER_SIDE,
  ORDER_TYPE,
} from "../../index";

async function main() {
  // no gas fee is required to create order signature.
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(
    true,
    Networks.TESTNET_ARBITRUM,
    dummyAccountKey
  ); // passing isTermAccepted = true for compliance and authorizarion

  // load/init contract addresses
  await client.init();

  client.addMarket(MARKET_SYMBOLS.ETH);

  const callback = ({ position }: { position: GetPositionResponse }) => {
    console.log(position);

    // kill sockets in order to stop script
    client.sockets.close();
  };
  const connection_callback = async () => {
    // This callback will be invoked as soon as the socket connection is established
    // start listening to local user events
    client.sockets.subscribeUserUpdateByToken();

    // triggered when user position updates are received
    client.sockets.onUserPositionUpdate(callback);
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
