/**
 * Fund gas tokens on user's account
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, bnStrToBaseNumber } from "../index";

async function main() {
    // ensure that account has enough BOBA/MOVR tokens to perform on-chain USDC.mint() call
    const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

    // using TESTNET network, fundGas() does not work on MAINNET
    const client = new FireflyClient(Networks.TESTNET, dummyAccountKey);
    await client.init()
  
    // balance will be 0.01, will return success message
    console.log("Gas tokens funded:", (await client.fundGas()).data?.message);
  
    // initial balance will be zero"
    console.log(
      "User's gas tokens balance is: ",
      bnStrToBaseNumber(await client.getGasBalance())
    );
}

main().then().catch(console.warn);
