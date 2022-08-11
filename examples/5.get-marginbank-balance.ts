/**
 * Getting user's USDC balance locked in Margin Bank
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";
  // using TESTNET network
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  await client.init()
  
  // will use margin bank contract from contractAddresses (initialized above)
  console.log(
    "User's locked USDC in margin bank are: ",
    await client.getMarginBankBalance()
  );

  // will use the provided MarginBank contract address"
  console.log(
    "User's locked USDC in margin bank are: ",
    await client.getMarginBankBalance(
      "0xbDd8210d4F74fC97d4E93950a1FF201fe425C68f"
    )
  );
}

main().then().catch(console.warn);
