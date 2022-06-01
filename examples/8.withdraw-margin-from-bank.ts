/**
 * Withdraw margin(USDT) from bank. Reduces locked margin(USDT) in Margin bank for user
 * and unlocks USDT in USDT contract.
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../src/index";

async function main() {
  // ensure that account has enough BOBA/MOVR tokens to perform on-chain contract call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using TESTNET network, getUSDTBalance does not work on MAINNET
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);

  // withdraws 1 USDT token from bank
  console.log(
    "USDT Withdrawn from MarginBank: ",
    await client.withdrawFromMarginBank(1)
  );
}

main().then().catch(console.warn);
