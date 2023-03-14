/**
 * Get symbols available on testnet
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  // ensure that account has enough native gas tokens to perform on-chain USDC.mint() call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using TESTNET network
  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

  // all available symbols on exchange
  const symbols = await client.getMarketSymbols()
  console.log("Symbols on exchange:", symbols);
}

main().then().catch(console.warn);
