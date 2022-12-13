/**
 * Add and Remove Margin from position
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS, ADJUST_MARGIN } from "../index";

async function main() {
    // ensure that account has enough BOBA/MOVR tokens to perform on-chain USDC.mint() call
    const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

    // using TESTNET network
    const client = new FireflyClient(true, Networks.TESTNET_BOBA, dummyAccountKey); //passing isTermAccepted = true for compliance and authorizarion
    await client.init()
    
    // ADD margin - will add 10 margin to DOT-PERP position
    console.log(
        "Added margin: ",
        await client.adjustMargin(MARKET_SYMBOLS.DOT, ADJUST_MARGIN.Add, 10)
    );

    // REMOVE MARGIN - will remove 10 margin from DOT-PERP position
    console.log(
        "Removed margin: ",
        await client.adjustMargin(MARKET_SYMBOLS.DOT, ADJUST_MARGIN.Remove, 10)
    );
}

main().then().catch(console.warn);
