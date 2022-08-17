/**
 * Deposits USDC from USDC contract to MarginBank
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

  // deposits 10 USDC to margin bank, uses default USDC/MarginBank Contracts
  // assuming user has 1 USDC locked in margin bank, else will throw
  console.log(
    "USDC Deposited to MarginBank: ",
    await client.depositToMarginBank(10)
  );
}

main().then().catch(console.warn);
