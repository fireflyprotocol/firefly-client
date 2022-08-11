/**
 * Get symbols available on testnet
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  // ensure that account has enough BOBA/MOVR tokens to perform on-chain USDT.mint() call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using TESTNET network, getUSDTBalance does not work on MAINNET
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  await client.init()

  // all available symbols on exchange
  const symbols = await client.getMarketSymbols()
  console.log("Symbols on exchange:", symbols);
}

main().then().catch(console.warn);
