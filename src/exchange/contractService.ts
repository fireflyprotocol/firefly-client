import {
  address,
  ADJUST_MARGIN,
  contracts_exchange,
  toBigNumberStr,
} from "@firefly-exchange/library";

import { Contract, Signer, Wallet } from "ethers";
import { TransformToResponseSchema } from "./contractErrorHandling.service";

export const adjustLeverageContractCall = async (
  perpContract: any,
  wallet: Signer | Wallet,
  leverage: number,
  gasLimit: number,
  getPublicAddress: () => address
) => {
  return TransformToResponseSchema(async () => {
    const tx = await (perpContract as contracts_exchange.Perpetual)
    .connect(wallet)
    .adjustLeverage(getPublicAddress(), toBigNumberStr(leverage), {
      gasLimit,
    })
    if (wallet.constructor.name === Wallet.name) {
      return await (tx).wait();
    }

    return tx;
  }, "Success");
};

export const adjustMarginContractCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: any,
  wallet: Signer | Wallet,
  amount: number,
  gasLimit: number,
  getPublicAddress: () => address
) => {
  return TransformToResponseSchema(async () => {
    // ADD margin
    if (operationType === ADJUST_MARGIN.Add) {
      const tx = await (perpContract as contracts_exchange.Perpetual)
      .connect(wallet)
      .addMargin(getPublicAddress(), toBigNumberStr(amount), {
        gasLimit: gasLimit,
      })
      if (wallet.constructor.name === Wallet.name) {
        return await (tx).wait();
      }

      return tx;
    }
    // REMOVE margin
    else {
      const tx = await (perpContract as contracts_exchange.Perpetual)
      .connect(wallet)
      .removeMargin(getPublicAddress(), toBigNumberStr(amount), {
        gasLimit: gasLimit,
      })
      if (wallet.constructor.name === Wallet.name) {
        return await (tx).wait();
      }

      return tx;
    }
  }, "Success");
};
export const withdrawFromMarginBankContractCall = async (
  marginBankContract: any,
  MarginTokenPrecision: number,
  wallet: Signer | Wallet,
  gasLimit: number,
  //@no-check
  getMarginBankBalance: (address: string) => Promise<number>,
  getPublicAddress: () => address,
  amount?: number
) => {
  return TransformToResponseSchema(async () => {
    let amountNumber = amount;
    if (!amount) {
      // get all margin bank balance when amount not provided by user
      amountNumber = await getMarginBankBalance(
        (marginBankContract as contracts_exchange.MarginBank).address
      );
    }
    const amountString = toBigNumberStr(amountNumber!, MarginTokenPrecision);

   return await (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(wallet)
        .withdrawFromBank(getPublicAddress(), amountString, {
          gasLimit: gasLimit,
        })
    ).wait();
  }, "Success");
};

export const depositToMarginBankContractCall = async (
  tokenContract: any,
  marginBankContract: any,
  amountString: string,
  wallet: Signer | Wallet,
  gasLimit: number,
  getPublicAddress: () => address
) => {
  return TransformToResponseSchema(async () => { 
    await (
      await (tokenContract as Contract)
        .connect(wallet)
        .approve(
          (marginBankContract as contracts_exchange.MarginBank).address,
          amountString,
          { gasLimit: gasLimit }
        )
    ).wait();

    // deposit `amount` usdc to margin bank
   return await (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(wallet)
        .depositToBank(getPublicAddress(), amountString, {
          gasLimit: gasLimit,
        })
    ).wait();
  }, "Success");
};