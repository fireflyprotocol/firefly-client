import {
  address,
  ADJUST_MARGIN,
  contracts_exchange,
  toBigNumberStr,
} from "@firefly-exchange/library";
import { Signer, Wallet } from "ethers";
import { SignatureType, TransactionType } from "../constants";
import { TransformToResponseSchema } from "./contractErrorHandling.service";
import { approvalFromUSDCContractCall } from "./contractService";

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
  }, "Success");
};

export const adjustMarginBiconomyCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: any,
  amount: number,
  biconomy: any,
  getPublicAddress: () => address
) => {
  return TransformToResponseSchema(async () => {
    let txParams: Object;
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
    } else {
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
  }, "Success");
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
  return TransformToResponseSchema(async () => {
    let amountNumber = amount;
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
  }, "Success");
};

export const depositToMarginBankBiconomyCall = async (
  tokenContract: any,
  marginBankContract: any,
  amountString: string,
  wallet: Signer | Wallet,
  gasLimit: number,
  biconomy: any,
  getPublicAddress: () => address
) => {
  return TransformToResponseSchema(async () => {
    if (wallet.constructor.name === Wallet.name) {
      await approvalFromUSDCContractCall(
        tokenContract,
        marginBankContract,
        amountString,
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
  }, "Success");
};
