import {
  address,
  ADJUST_MARGIN,
  contracts_exchange,
  toBigNumberStr,
} from "@firefly-exchange/library";

import { Contract, Signer, Wallet } from "ethers";
import { DEFAULT_PRECISION } from "../constants";
import { SuccessMessages, TransformToResponseSchema } from "./contractErrorHandling.service";
//@ts-ignore
import { default as interpolate } from "interpolate";

export const adjustLeverageContractCall = async (
  perpContract: any,
  wallet: Signer | Wallet,
  leverage: number,
  gasLimit: number,
  //@no-check
  getPublicAddress: () => address
) => {
  return TransformToResponseSchema(async () => {
    const tx = await (perpContract as contracts_exchange.Perpetual)
      .connect(wallet)
      .adjustLeverage(getPublicAddress(), toBigNumberStr(leverage), {
        gasLimit,
      });
    if (wallet instanceof Wallet) {
      return tx.wait();
    }

    return tx;
  }, interpolate(SuccessMessages.adjustLeverage, {leverage}));
};

export const adjustMarginContractCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: any,
  wallet: Signer | Wallet,
  amount: number,
  gasLimit: number,
  getPublicAddress: () => address
) => {
  const msg = operationType === ADJUST_MARGIN.Add ? SuccessMessages.adjustMarginAdd : SuccessMessages.adjustMarginRemove
  return TransformToResponseSchema(async () => {
    // ADD margin
    if (operationType === ADJUST_MARGIN.Add) {
      const tx = await (perpContract as contracts_exchange.Perpetual)
        .connect(wallet)
        .addMargin(getPublicAddress(), toBigNumberStr(amount), {
          gasLimit: gasLimit,
        });
      if (wallet instanceof Wallet) {
        return tx.wait();
      }

      return tx;
    }
    // REMOVE margin
    else {
      const tx = await (perpContract as contracts_exchange.Perpetual)
        .connect(wallet)
        .removeMargin(getPublicAddress(), toBigNumberStr(amount), {
          gasLimit: gasLimit,
        });
      if (wallet instanceof Wallet) {
        return tx.wait();
      }

      return tx;
    }
  }, interpolate(msg, {amount: amount.toFixed(DEFAULT_PRECISION)}));
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

  let amountNumber = amount;
  return TransformToResponseSchema(async () => {
    if (!amount) {
      // get all margin bank balance when amount not provided by user
      amountNumber = await getMarginBankBalance(
        (marginBankContract as contracts_exchange.MarginBank).address
      );
    }
    const amountString = toBigNumberStr(amountNumber!, MarginTokenPrecision);

    return (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(wallet)
        .withdrawFromBank(getPublicAddress(), amountString, {
          gasLimit: gasLimit,
        })
    ).wait();
  }, interpolate(SuccessMessages.withdrawMargin, {amount: amountNumber?.toFixed(DEFAULT_PRECISION)}));
};

export const approvalFromUSDCContractCall = async (
  tokenContract: any,
  marginBankContract: any,
  amount: number,
  MarginTokenPrecision: number,
  wallet: Signer | Wallet,
  gasLimit: number
) => {
  const amountString = toBigNumberStr(amount, MarginTokenPrecision);

  return TransformToResponseSchema(async () => {
    return await(
      await (tokenContract as Contract)
        .connect(wallet)
        .approve(
          (marginBankContract as contracts_exchange.MarginBank).address,
          amountString,
          { gasLimit: gasLimit }
        )
    ).wait();
  }, interpolate(SuccessMessages.approveUSDC, {amount: amount.toFixed(DEFAULT_PRECISION)}));
};

export const depositToMarginBankContractCall = async (
  tokenContract: any,
  marginBankContract: any,
  amount: number,
  MarginTokenPrecision: number,
  wallet: Signer | Wallet,
  gasLimit: number,
  getPublicAddress: () => address
) => {
  const amountString = toBigNumberStr(amount, MarginTokenPrecision);

  return TransformToResponseSchema(async () => {
    if (wallet instanceof Wallet) {
      await approvalFromUSDCContractCall(
        tokenContract,
        marginBankContract,
        amount,
        MarginTokenPrecision,
        wallet,
        gasLimit
      );
    }

    // deposit `amount` usdc to margin bank
    return (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(wallet)
        .depositToBank(getPublicAddress(), amountString, {
          gasLimit: gasLimit,
        })
    ).wait();
  }, interpolate(SuccessMessages.depositToBank, {amount: amount.toFixed(DEFAULT_PRECISION)}));
};
