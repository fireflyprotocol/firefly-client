/**
 * Getting user's USDT balance
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";
  // using TESTNET network
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);

  // will use USDT contract address from "/contracts/deployedContracts.json"
  console.log("User's balance in USDT is: ", await client.getUSDTBalance());

  // will use the provided USDT contract address"
  console.log(
    "User's balance in USDT is: ",
    await client.getUSDTBalance("0x57AB85a85f75fb4E9d2Ee85a28913F2DEe9aD283")
  );
}

main().then().catch(console.warn);
