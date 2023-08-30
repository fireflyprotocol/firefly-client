/**
 * closes position when market is delisted
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  // ensure that account has enough native gas tokens to perform on-chain contract call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM, dummyAccountKey);  //passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  // closes a user position when a market is delisted.
  console.log(
    await client.closePosition('ETH-PERP')
  );
}

main().then().catch(console.warn);
