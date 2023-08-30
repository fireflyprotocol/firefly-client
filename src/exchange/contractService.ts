import {
  address,
  ADJUST_MARGIN,
  FactoryName,
  mapContract,
  NETWORK_NAME,
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
  networkName: string,
  getPublicAddress: () => address
) => {
  const contract = mapContract(networkName, FactoryName.perpetual, perpContract).connect(wallet)

  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (networkName == NETWORK_NAME.arbitrum) {
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

export const setSubAccount=async (
  perpContract:any,
  publicAddress:address,
  status:boolean,
  wallet: Signer | Wallet,
  gasLimit: number,
  networkName: string
)=>{
  const contract = mapContract(networkName, FactoryName.perpetual, perpContract).connect(wallet);

  if (networkName == NETWORK_NAME.arbitrum) {
    gasLimit = (+await contract.estimateGas.setSubAccount(publicAddress,status)) + EXTRA_FEES;    
  }

  return TransformToResponseSchema(async () => {
    const tx = await contract.setSubAccount(publicAddress, status, {
      gasLimit,
    });
    if (wallet instanceof Wallet) {
      return tx.wait();
    }

    return tx;
  }, interpolate(SuccessMessages.setSubAccounts, {address:publicAddress,status:status?"added":"removed"}));

}

export const adjustMarginContractCall = async (
  operationType: ADJUST_MARGIN,
  perpContract: any,
  wallet: Signer | Wallet,
  amount: number,
  gasLimit: number,
  networkName: string,
  getPublicAddress: () => address
) => {
  const contract = mapContract(networkName, FactoryName.perpetual, perpContract).connect(wallet)

  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (networkName == NETWORK_NAME.arbitrum) {
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
  networkName: string,
  getMarginBankBalance: (address: string) => Promise<number>,
  getPublicAddress: () => address,
  amount?: number
) => {

  let amountNumber = amount;
  return TransformToResponseSchema(async () => {
    const mbContract = mapContract(networkName, FactoryName.marginBank, marginBankContract)

    if (!amount) {
      // get all margin bank balance when amount not provided by user
      amountNumber = await getMarginBankBalance((mbContract).address);
    }

    const amountString = toBigNumberStr(amountNumber!, MarginTokenPrecision);
    const contract = mbContract.connect(wallet)
  
    //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
    if (networkName == NETWORK_NAME.arbitrum) {
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
  networkName: string,
) => {
  const amountString = toBigNumberStr(amount, MarginTokenPrecision);
  const contract = (tokenContract as Contract).connect(wallet)
  const mbContract = mapContract(networkName, FactoryName.marginBank, marginBankContract)

  //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
  if (networkName == NETWORK_NAME.arbitrum) {
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
  networkName: string,
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
        networkName
      );
    }  
    
    const contract = mapContract(networkName, FactoryName.marginBank, marginBankContract).connect(wallet)

    //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
    if (networkName == NETWORK_NAME.arbitrum) {
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

export const closePositionCall = async (
  perpContract: any,
  wallet: Signer | Wallet,
  gasLimit: number,
  networkName: string,
  getPublicAddress: () => address
) => {

  return TransformToResponseSchema(async () => {
    
    const contract = mapContract(networkName, FactoryName.perpetual, perpContract).connect(wallet)

    //estimate gas in case of ARBITRUM network because it doesn't work on max block gas limit
    if (networkName == NETWORK_NAME.arbitrum) {
      gasLimit = (+await contract.estimateGas.closePosition(getPublicAddress())) + EXTRA_FEES;
    }

    // close position of user
    return (
      await contract
        .closePosition(getPublicAddress(), {
          gasLimit: gasLimit,
        })
    ).wait();
  }, interpolate(SuccessMessages.positionClosed, {address: getPublicAddress()}));
};
