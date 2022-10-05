import {
  ADJUST_MARGIN,
  contracts_exchange,
  toBigNumberStr,
} from "@firefly-exchange/library";

import { Contract, Signer } from "ethers";
import { TransformToResponseSchema } from "./contractErrorHandling.service";

export const adjustLeverageContractCall = async (
  perpContract: Contract,
  wallet: Signer,
  leverage: number,
  gasLimit: number
) => {
  return TransformToResponseSchema(async () => {
    await (
      await (perpContract as contracts_exchange.Perpetual)
        .connect(wallet)
        .adjustLeverage(await wallet.getAddress(), toBigNumberStr(leverage), {
          gasLimit,
        })
    ).wait();
  }, "Success");
};

export const adjustMarginContractCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: Contract,
  wallet: Signer,
  amount: number,
  gasLimit: number
) => {
  return TransformToResponseSchema(async () => {
    if (operationType === ADJUST_MARGIN.Add) {
      await (
        await (perpContract as contracts_exchange.Perpetual)
          .connect(wallet)
          .addMargin(await wallet.getAddress(), toBigNumberStr(amount), {
            gasLimit: gasLimit,
          })
      ).wait();
    }
    // REMOVE margin
    else {
      await (
        await (perpContract as contracts_exchange.Perpetual)
          .connect(wallet)
          .removeMargin(wallet.getAddress(), toBigNumberStr(amount), {
            gasLimit: gasLimit,
          })
      ).wait();
    }
  }, "Success");
};
export const withdrawFromMarginBankContractCall = async (
  marginBankContract: contracts_exchange.MarginBank,
  MarginTokenPrecision: number,
  wallet: Signer,
  gasLimit: number,
  //@no-check
  getMarginBankBalance: (address: string) => Promise<number>,
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

    await (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(wallet)
        .withdrawFromBank(await wallet.getAddress(), amountString, {
          gasLimit: gasLimit,
        })
    ).wait();
  }, "Success");
};

export const depositToMarginBankContractCall = async (
  tokenContract: Contract,
  marginBankContract: Contract,
  amountString: string,
  wallet: Signer,
  gasLimit: number
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
    await (
      await (marginBankContract as contracts_exchange.MarginBank)
        .connect(wallet)
        .depositToBank(await wallet.getAddress(), amountString, {
          gasLimit: gasLimit,
        })
    ).wait();
  }, "Success");
};