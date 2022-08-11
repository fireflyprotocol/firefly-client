/**
 * Get contract addresses
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS } from "../index";

async function main() {
  // ensure that account has enough BOBA/MOVR tokens to perform on-chain USDT.mint() call
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  // using TESTNET network, getUSDTBalance does not work on MAINNET
  const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
  await client.init()

  // get all contract addresses
  const allContractAddresses = await client.getContractAddresses()
  console.log("Contract Addresses: ", allContractAddresses);

  // get contract addresses of specific symbol
  const dotContractAddresses = await client.getContractAddresses(MARKET_SYMBOLS.DOT)
  console.log("Contract Addresses of DOT: ", dotContractAddresses);

}

main().then().catch(console.warn);
