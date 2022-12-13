import {
  address,
  ADJUST_MARGIN,
  contracts_exchange_boba,
  contracts_exchange_arbitrum,
  toBigNumberStr,
} from "@firefly-exchange/library";

import { Contract, Signer, Wallet } from "ethers";
import { DEFAULT_PRECISION, EXTRA_FEES } from "../constants";
import { SuccessMessages, TransformToResponseSchema } from "./contractErrorHandling.service";
//@ts-ignore
import { default as interpolate } from "interpolate";

export const adjustLeverageContractCall = async (
  perpContract: any,
  wallet: Signer | Wallet,
  leverage: number,
  gasLimit: number,
  estimateGas: boolean,
  getPublicAddress: () => address
) => {
  let contract = estimateGas ? (perpContract as contracts_exchange_arbitrum.Perpetual) : (perpContract as contracts_exchange_boba.Perpetual)
  contract = contract.connect(wallet)
  
  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (estimateGas) {
    gasLimit = (+await contract.estimateGas.adjustLeverage(getPublicAddress(), toBigNumberStr(leverage))) + EXTRA_FEES;    
  }
  return TransformToResponseSchema(async () => {
    const tx = await contract.adjustLeverage(getPublicAddress(), toBigNumberStr(leverage), {
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
  estimateGas: boolean,
  getPublicAddress: () => address
) => {
  let contract = estimateGas ? (perpContract as contracts_exchange_arbitrum.Perpetual) : (perpContract as contracts_exchange_boba.Perpetual)
  contract = contract.connect(wallet)

  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (estimateGas) {
    if (operationType == ADJUST_MARGIN.Add) {
      gasLimit = (+await contract.estimateGas.addMargin(getPublicAddress(), toBigNumberStr(amount))) + EXTRA_FEES;
    }
    else {
      gasLimit = (+await contract.estimateGas.removeMargin(getPublicAddress(), toBigNumberStr(amount))) + EXTRA_FEES;
    }
  }
  const msg = operationType === ADJUST_MARGIN.Add ? SuccessMessages.adjustMarginAdd : SuccessMessages.adjustMarginRemove
  return TransformToResponseSchema(async () => {
    // ADD margin
    if (operationType === ADJUST_MARGIN.Add) {
      const tx = await contract
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
      const tx = await contract
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
  estimateGas: boolean,
  getMarginBankBalance: (address: string) => Promise<number>,
  getPublicAddress: () => address,
  amount?: number
) => {

  let amountNumber = amount;
  return TransformToResponseSchema(async () => {
    let contract = estimateGas ? (marginBankContract as contracts_exchange_arbitrum.MarginBank) : (marginBankContract as contracts_exchange_boba.MarginBank)

    if (!amount) {
      // get all margin bank balance when amount not provided by user
      amountNumber = await getMarginBankBalance((contract).address);
    }

    const amountString = toBigNumberStr(amountNumber!, MarginTokenPrecision);
    contract = contract.connect(wallet)
  
    //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
    if (estimateGas) {
      gasLimit = (+await contract.estimateGas.withdrawFromBank(getPublicAddress(), amountString)) + EXTRA_FEES;    
    }

    return (
      await contract.withdrawFromBank(
        getPublicAddress(), 
        amountString, {
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
  gasLimit: number,
  estimateGas: boolean
) => {
  const amountString = toBigNumberStr(amount, MarginTokenPrecision);
  const contract = (tokenContract as Contract).connect(wallet)
  const mbContract = estimateGas ? (marginBankContract as contracts_exchange_arbitrum.MarginBank) : (marginBankContract as contracts_exchange_boba.MarginBank)

  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (estimateGas) {
    gasLimit = (+await contract.estimateGas.approve((mbContract).address, amountString)) + EXTRA_FEES;    
  }

  return TransformToResponseSchema(async () => {
    return await(
      await contract
        .approve(
          (mbContract).address,
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
  estimateGas: boolean,
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
        gasLimit,
        estimateGas
      );
    }  
    
    let contract = estimateGas ? (marginBankContract as contracts_exchange_arbitrum.MarginBank) : (marginBankContract as contracts_exchange_boba.MarginBank)
    contract = contract.connect(wallet)
    //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
    if (estimateGas) {
      gasLimit = (+await contract.estimateGas.depositToBank(getPublicAddress(), amountString)) + EXTRA_FEES;
    }

    // deposit `amount` usdc to margin bank
    return (
      await contract
        .depositToBank(getPublicAddress(), amountString, {
          gasLimit: gasLimit,
        })
    ).wait();
  }, interpolate(SuccessMessages.depositToBank, {amount: amount.toFixed(DEFAULT_PRECISION)}));
};
