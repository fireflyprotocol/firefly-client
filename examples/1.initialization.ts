/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { Networks, Network, FireflyClient } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using predefined network
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  // prints client address
  console.log(client.getPublicAddress());

  // using custom network
  const custNetwork: Network = {
    url: "https://bobabase.boba.network/",
    chainId: 1297,
    apiGateway: "https://dapi-testnet.firefly.exchange",
    socketURL: "wss://dapi-testnet.firefly.exchange",
  };
  const clientCustomNetwork = new FireflyClient(custNetwork, dummyAccountKey);
  // prints client address
  console.log(clientCustomNetwork.getPublicAddress());
}

main().then().catch(console.warn);
