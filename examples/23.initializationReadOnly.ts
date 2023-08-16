/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  // using predefined network
  const client = new FireflyClient(false, Networks.TESTNET_ARBITRUM); // passing isTermAccepted = true for compliance and authorizarion
  await client.init(
    false,
    "9737fb68940ae27f95d5a603792d4988a9fdcf3efeea7185b43f2bd045ee87f9"
  ); // initialze client via readOnlyToken
}

main().then().catch(console.warn);
