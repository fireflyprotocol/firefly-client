/**
 * Checks BOBA(gas) tokens balance
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, bnStrToBaseNumber } from "../index";

async function main() {
    // ensure that account has enough BOBA/MOVR tokens to perform on-chain USDC.mint() call
    const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

    // using TESTNET network, fundGas() does not work on MAINNET
    const client = new FireflyClient(true, Networks.TESTNET, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
    await client.init()
    
    console.log(
      "User's balance is: ",
      bnStrToBaseNumber(await client.getChainNativeBalance())
    );
}

main().then().catch(console.warn);
