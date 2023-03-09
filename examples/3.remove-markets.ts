/**
 * Removing Markets code example
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";
  // using TESTNET network
  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

  // will return false as DOT market does not exist
  console.log("Market Removed: ", client.removeMarket(MARKET_SYMBOLS.DOT));

  // will add dot market to client and will be using the orders contract
  // from contractAddresses initialized with init() method above
  console.log("Market Added: ", client.addMarket(MARKET_SYMBOLS.DOT));

  // will return true as DOT market is removed
  console.log("Market Removed: ", client.removeMarket(MARKET_SYMBOLS.DOT));
}

main().then().catch(console.warn);
