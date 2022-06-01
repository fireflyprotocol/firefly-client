/**
 * Deposits USDT from USDT contract to MarginBank
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../src/index";

async function main() {
  // ensure that account has enough BOBA/MOVR tokens to perform on-chain contract call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using TESTNET network, getUSDTBalance does not work on MAINNET
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);

  // deposits 10 USDT to margin bank, uses default USDT/MarginBank Contracts
  // assuming user has 1 USDT locked in margin bank, else will throw
  console.log(
    "USDT Deposited to MarginBank: ",
    await client.depositToMarginBank(10)
  );
}

main().then().catch(console.warn);
