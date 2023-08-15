/**
 * GenerateReadOnlyToken API
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  // ensure that account has enough native gas tokens to perform on-chain USDC.mint() call
  const dummyAccountKey =
    "4d6c9531e0042cc8f7cf13d8c3cf77bfe239a8fed95e198d498ee1ec0b1a7e83";

  // using TESTNET network
  const client = new FireflyClient(
    true,
    Networks.TESTNET_ARBITRUM,
    dummyAccountKey
  ); // passing isTermAccepted = true for compliance and authorizarion
  await client.init();

  // generate a read-only token for user which can be used to provide read-only access to data to non-owners
  const response = await client.generateReadOnlyToken();
  console.log("Readonly-token for user:", response.data);
}

main().then().catch(console.warn);
