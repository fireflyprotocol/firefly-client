/**
 * Adding Markets code example
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";
  // using TESTNET network
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  await client.init()

  // will add dot market to client and will be using the orders contract
  // from contractAddresses initialized with init() method above
  console.log("Market Added: ", client.addMarket(MARKET_SYMBOLS.DOT));
  const client2 = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  await client2.init()

  console.log(
    "Market Added: ",
    client2.addMarket(
      MARKET_SYMBOLS.DOT,
      "0x36AAc8c385E5FA42F6A7F62Ee91b5C2D813C451C"
    )
  );
  // this will throw because ETH market is not yet available on TESTNET.
  // the function looks up the contractAddresses (initialized above) to determine if a particular
  // market is available or not
  try {
    client.addMarket(MARKET_SYMBOLS.ETH);
  } catch (e) {
    // do something about the error: like not providing invalid MARKET NAMES
  }
}

main().then().catch(console.warn);
