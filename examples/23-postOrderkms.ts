/**
 * Posts an order to exchange VIA KMS. Creates the signed order and places it to exchange,
 * without requiring two separate function calls.
 */

/* eslint-disable no-console */
import { Networks, FireflyClient, MARKET_SYMBOLS, ORDER_SIDE, ORDER_TYPE } from "../index";
import { AwsKmsSigner } from "ethers-aws-kms-signer";

async function main() {

  const kmsKeyArn='arn:aws:kms:ap-northeast-1:648912772077:key/254a5c49-9a68-48ca-81f7-8715de8dca73'
  const kmsSigner= new AwsKmsSigner({region: 'ap-northeast-1', keyId: kmsKeyArn})



  const dummyAccountKey='';
  const client = new FireflyClient(true, Networks.TESTNET_ARBITRUM, dummyAccountKey,kmsSigner); //passing isTermAccepted = true for compliance and authorizarion
  await client.init();
  
  console.log(MARKET_SYMBOLS.ETH);

  client.addMarket(MARKET_SYMBOLS.ETH);
  

 
  const ethLeverage = await client.getUserDefaultLeverage(MARKET_SYMBOLS.ETH);

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
