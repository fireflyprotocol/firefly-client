/**
 * Getting user's USDC balance
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";
  // using TESTNET network
  const client = new FireflyClient(true, Networks.TESTNET_BOBA, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
  await client.init()

  // will use USDC contract address from contractAddresses (initialized above)
  console.log("User's balance in USDC is: ", await client.getUSDCBalance());

  // will use the provided USDC contract address"
  console.log(
    "User's balance in USDC is: ",
    await client.getUSDCBalance("0x57AB85a85f75fb4E9d2Ee85a28913F2DEe9aD283")
  );
}

main().then().catch(console.warn);
