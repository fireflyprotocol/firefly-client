/**
 * Mint's Test USDT on TESTNET
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, bnStrToBaseNumber } from "../index";

async function main() {
  // ensure that account has enough BOBA/MOVR tokens to perform on-chain USDT.mint() call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using TESTNET network, getUSDTBalance does not work on MAINNET
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  await client.init()

  // balance will be 10K, will return true
  console.log("Tokens minted:", await client.mintTestUSDT());

  // initial balance will be zero"
  console.log(
    "User's balance in USDT is: ",
    bnStrToBaseNumber(await client.getUSDTBalance())
  );
}

main().then().catch(console.warn);
