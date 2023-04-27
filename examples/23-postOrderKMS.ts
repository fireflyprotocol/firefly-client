/**
 * Posts an order to exchange VIA KMS. Creates the signed order and places it to exchange,
 * without requiring two separate function calls.
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS, ORDER_SIDE, ORDER_TYPE } from "../index";
import { AwsKmsSigner } from "ethers-aws-kms-signer";

async function main() {


  //for keyId input the arn of the kms key that have to be used.
  const kmsSigner= new AwsKmsSigner({region: 'ap-northeast-1', keyId: 'arn:aws:kms:ap-northxxxxx'});

  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM, kmsSigner); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  
  client.addMarket(MARKET_SYMBOLS.ETH);
  

  const ethLeverage = await client.getUserDefaultLeverage(MARKET_SYMBOLS.ETH);

  //KMS key provided will be used to sign this order and submit it to exchange
  const response = await client.postOrder({
    symbol: MARKET_SYMBOLS.ETH,
    price: 50,
    quantity: 0.5,
    side: ORDER_SIDE.BUY,
    leverage: ethLeverage,
    orderType: ORDER_TYPE.LIMIT
    });

  console.log(response.data);
}

main().then().catch(console.warn);
