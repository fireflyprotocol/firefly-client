import {
  address,
  ADJUST_MARGIN,
  contracts_exchange,
  toBigNumberStr,
} from "@firefly-exchange/library";
import { Signer, Wallet } from "ethers";
import { DEFAULT_PRECISION, SignatureType, TransactionType } from "../constants";
import { SuccessMessages, TransformToResponseSchema } from "./contractErrorHandling.service";
import { approvalFromUSDCContractCall } from "./contractService";
//@ts-ignore
import { default as interpolate } from "interpolate";

export const adjustLeverageBiconomyCall = async (
  perpContract: any,
  leverage: number,
  biconomy: any,
  getPublicAddress: () => address
) => {
  return TransformToResponseSchema(async () => {
    const { data } = await perpContract.populateTransaction.adjustLeverage(
      getPublicAddress(),
      toBigNumberStr(leverage)
    );

    const txParams = {
      data: data,
      to: perpContract.address,
      from: getPublicAddress(),
      signatureType: SignatureType.PERSONAL_SIGN,
    };

    const bicProvider = biconomy.getEthersProvider();
    return bicProvider.send(TransactionType.eth_sendTransaction, [txParams]);
  }, interpolate(SuccessMessages.adjustLeverage, {leverage}));
};

export const adjustMarginBiconomyCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: any,
  amount: number,
  biconomy: any,
  getPublicAddress: () => address
) => {
  const msg = operationType === ADJUST_MARGIN.Add ? SuccessMessages.adjustMarginAdd : SuccessMessages.adjustMarginRemove
  return TransformToResponseSchema(async () => {
    let txParams: Object;
    //ADD MARGIN
    if (operationType === ADJUST_MARGIN.Add) {
      const { data } = await perpContract.populateTransaction.addMargin(
        getPublicAddress(),
        toBigNumberStr(amount)
      );

      txParams = {
        data: data,
        to: perpContract.address,
        from: getPublicAddress(),
        signatureType: SignatureType.PERSONAL_SIGN,
      };
    } 
    //REMOVE MARGIN
    else {
      const { data } = await perpContract.populateTransaction.removeMargin(
        getPublicAddress(),
        toBigNumberStr(amount)
      );

      txParams = {
        data: data,
        to: perpContract.address,
        from: getPublicAddress(),
        signatureType: SignatureType.PERSONAL_SIGN,
      };
    }

    const bicProvider = biconomy.getEthersProvider();
    return bicProvider.send(TransactionType.eth_sendTransaction, [txParams]);
  }, interpolate(msg, {amount: amount.toFixed(DEFAULT_PRECISION)}));
};

export const withdrawFromMarginBankBiconomyCall = async (
  marginBankContract: any,
  MarginTokenPrecision: number,
  biconomy: any,
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

    const { data } =
      await marginBankContract.populateTransaction.withdrawFromBank(
        getPublicAddress(),
        amountString
      );

    const txParams = {
      data: data,
      to: marginBankContract.address,
      from: getPublicAddress(),
      signatureType: SignatureType.PERSONAL_SIGN,
    };

    const bicProvider = biconomy.getEthersProvider();
    return bicProvider.send(TransactionType.eth_sendTransaction, [txParams]);
  }, interpolate(SuccessMessages.withdrawMargin, {amount: amountNumber?.toFixed(DEFAULT_PRECISION)}));
};

export const depositToMarginBankBiconomyCall = async (
  tokenContract: any,
  marginBankContract: any,
  amount: number,
  MarginTokenPrecision: number,
  wallet: Signer | Wallet,
  gasLimit: number,
  biconomy: any,
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
    const { data } = await marginBankContract.populateTransaction.depositToBank(
      getPublicAddress(),
      amountString
    );

    const txParams = {
      data: data,
      to: marginBankContract.address,
      from: getPublicAddress(),
      signatureType: SignatureType.PERSONAL_SIGN,
    };

    const bicProvider = biconomy.getEthersProvider();
    return bicProvider.send(TransactionType.eth_sendTransaction, [txParams]);
  }, interpolate(SuccessMessages.depositToBank, {amount: amount.toFixed(DEFAULT_PRECISION)}));
};
