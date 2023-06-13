/**
 * Client initialization code example
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  // using predefined network
  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM); //passing isTermAccepted = true for compliance and authorizarion
  await client.init(true, "9737fb68940ae27f95d5a603792d4988a9fdcf3efeea7185b43f2bd045ee87f9"); //initialoze client via readOnlyToken
}


main().then().catch(console.warn);
