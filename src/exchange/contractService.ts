import { contracts_exchange, toBigNumberStr } from "@firefly-exchange/library";

import { Contract, Signer } from "ethers";
import { TransformToResponseSchema } from "./contractErrorHandling.service";

export const adjustMarginContractCall = async (
  perpContract: Contract,
  wallet: Signer,
  leverage: number,
  gasLimit: number
) => {
  return TransformToResponseSchema(async () => {
    await (
      await (perpContract as contracts_exchange.Perpetual)
        .connect(wallet)
        .adjustLeverage(wallet.getAddress(), toBigNumberStr(-1) || leverage, {
          gasLimit,
        })
    ).wait();
  }, "Success");
};
