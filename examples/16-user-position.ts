/**
 * Gets user open position on provided(all) markets
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(true, Networks.TESTNET, dummyAccountKey); //passing isTermAccepted = true for authorization
  await client.init()

  const response = await client.getUserPosition({ symbol: MARKET_SYMBOLS.DOT });

  console.log(response.data);
}

main().then().catch(console.warn);
