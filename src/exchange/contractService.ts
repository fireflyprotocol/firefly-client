import {
  ADJUST_MARGIN,
  contracts_exchange,
  toBigNumberStr,
} from "@firefly-exchange/library";

import { Contract, Signer, Wallet } from "ethers";
import { TransformToResponseSchema } from "./contractErrorHandling.service";

export const adjustLeverageContractCall = async (
  perpContract: Contract,
  wallet: Signer | Wallet,
  leverage: number,
  gasLimit: number
) => {
  return TransformToResponseSchema(async () => {
    if (wallet.constructor.name === Wallet.name) {
      await (
        await (perpContract as contracts_exchange.Perpetual)
          .connect(wallet)
          .adjustLeverage(await wallet.getAddress(), toBigNumberStr(leverage), {
            gasLimit,
          })
      ).wait();
    }
    //called from UI
    else {
      await (perpContract as contracts_exchange.Perpetual)
          .connect(wallet)
          .adjustLeverage(await wallet.getAddress(), toBigNumberStr(leverage), {
            gasLimit,
          })
    }
  }, "Success");
};

export const adjustMarginContractCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: Contract,
  wallet: Signer | Wallet,
  amount: number,
  gasLimit: number,
) => {
  return TransformToResponseSchema(async () => {
    // ADD margin
    if (operationType === ADJUST_MARGIN.Add) {
      if (wallet.constructor.name === Wallet.name) {
        await (
          await (perpContract as contracts_exchange.Perpetual)
            .connect(wallet)
            .addMargin(await wallet.getAddress(), toBigNumberStr(amount), {
              gasLimit: gasLimit,
            })
        ).wait();
      }
      //called from UI
      else {
        await (perpContract as contracts_exchange.Perpetual)
            .connect(wallet)
            .addMargin(await wallet.getAddress(), toBigNumberStr(amount), {
              gasLimit: gasLimit,
            })
      }
    }
    // REMOVE margin
    else {
      if (wallet.constructor.name === Wallet.name) {
        await (
          await (perpContract as contracts_exchange.Perpetual)
            .connect(wallet)
            .removeMargin(wallet.getAddress(), toBigNumberStr(amount), {
              gasLimit: gasLimit,
            })
        ).wait();
      }
      //called from UI
      else {
        await (perpContract as contracts_exchange.Perpetual)
            .connect(wallet)
            .removeMargin(wallet.getAddress(), toBigNumberStr(amount), {
              gasLimit: gasLimit,
            })
      }
    }
  }, "Success");
};
export const withdrawFromMarginBankContractCall = async (
  marginBankContract: contracts_exchange.MarginBank,
  MarginTokenPrecision: number,
  wallet: Signer | Wallet,
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
  wallet: Signer | Wallet,
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
