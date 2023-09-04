/**
 * Get User Orders code example
 */

/* eslint-disable no-console */
import { Networks, FireflyClient } from "../index";
import { ORDER_STATUS } from "@firefly-exchange/library";

async function main() {
  // private key of the wallet
  const dummyAccountKey =
    "a182091b4d5a090b65d604e36f68629a692e3bf2aa864bd3f037854034cdd676";

  const client = new FireflyClient(
    true,
    Networks.TESTNET_ARBITRUM,
    dummyAccountKey
  );

  // load/init contract addresses
  await client.init();

 // fetch open limit orders of all markets
  let resp = await client.getUserOrdersByType({
    limitStatuses: [ORDER_STATUS.OPEN, ORDER_STATUS.PARTIAL_FILLED],
  });
  console.log(resp.data);
}

main().then().catch(console.warn);
