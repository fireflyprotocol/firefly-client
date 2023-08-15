/**
 * Listens for market health
 */

/* eslint-disable no-console */
import {
  FireflyClient,
  MARKET_SYMBOLS,
  Networks,
  MARKET_STATUS,
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

  const callback = ({
    status,
    symbol,
  }: {
    status: MARKET_STATUS;
    symbol: string;
  }) => {
    console.log(`${symbol} market is ${status}`);

    // kill sockets in order to stop script
    client.sockets.close();
  };

  const connection_callback = async () => {
    // This callback will be invoked as soon as the socket connection is established

    // triggered when market health updates are received
    client.sockets.onMarketHealthChange(callback);
  };

  const disconnection_callback = async () => {
    console.log("Sockets disconnected, performing actions...");
  };

  // must specify connection_callback before opening the sockets below
  await client.sockets.listen("connect", connection_callback);
  await client.sockets.listen("disconnect", disconnection_callback);

  console.log("Making socket connection to firefly exchange");
  client.sockets.open();
}

main().then().catch(console.warn);
