/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, ExtendedNetwork } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using predefined network
  const client = new FireflyClient(true, Networks.TESTNET_BOBA, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
  // prints client address
  console.log(client.getPublicAddress());

  // using custom network
  const custNetwork: ExtendedNetwork = {
    url: "https://bobabase.boba.network/",
    chainId: 1297,
    apiGateway: "https://dapi-testnet.firefly.exchange",
    socketURL: "wss://dapi-testnet.firefly.exchange",
    webSocketURL: "",
    onboardingUrl: "https://testnet.firefly.exchange"
  };
  const clientCustomNetwork = new FireflyClient(true, custNetwork, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
  await clientCustomNetwork.init()
  // prints client address
  console.log(clientCustomNetwork.getPublicAddress());
}

main().then().catch(console.warn);
