/**
 * Withdraw margin(USDC) from bank. Reduces locked margin(USDC) in Margin bank for user
 * and unlocks USDC in USDC contract.
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";

async function main() {
  // ensure that account has enough BOBA/MOVR tokens to perform on-chain contract call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using TESTNET network, getUSDCBalance does not work on MAINNET
  const client = new FireflyClient(true, Networks.TESTNET, dummyAccountKey);  //passing isTermAccepted = true for authorization
  await client.init()

  // withdraws 1 USDC token from bank
  console.log(
    "USDC Withdrawn from MarginBank: ",
    await client.withdrawFromMarginBank(1)
  );
}

main().then().catch(console.warn);
