import { getValue } from "@firefly-exchange/library";
import { serializeError } from "eth-rpc-errors";
export type ResponseSchema = {
  ok: boolean;
  data: any;
  message: string;
  code?: number | string;
  stack?: string;
};
interface ProviderRpcError {
  code: number | string;
  message: string;
  data?: unknown;
  stack?: string;
}
export const handleResponse = (
  response: ProviderRpcError,
  ok: boolean
): ResponseSchema => {
  const mutatedResponse: ResponseSchema = {
    ok,
    data: getValue(
      response.data as object,
      "originalError.transaction",
      response.data
    ),
    message: getValue(
      response.data as object,
      "originalError.reason",
      response.message
    ),
    code: getValue(
      response.data as object,
      "originalError.code",
      response.code
    ),
    stack: response.message,
  };
  return mutatedResponse;
};

export const TransformToResponseSchema = async (
  contactCall: () => Promise<void>,
  successMessage: string
): Promise<ResponseSchema> => {
  try {
    const result = await contactCall();
    return handleResponse(
      {
        data: result,
        message: successMessage,
        code: 200,
      },
      true
    );
  } catch (error: any) {
    return handleResponse({ ...serializeError(error) }, false);
  }
};


export enum SuccessMessages {
  adjustLeverage = "Leverage Adjusted to {leverage}x.",
  adjustMarginAdd = "{amount} USDC margin Added to position.",
  adjustMarginRemove = "{amount} USDC margin Removed from position.",
  withdrawMargin = "{amount} USDC withdrawn.",
  approveUSDC = "{amount} USDC approved.",
  depositToBank = "{amount} USDC deposited to Margin Bank."
}

export enum VerificationStatus{
  Success = "success",
  Restricted = "restricted",
  Blocked = "blocked"
}

export enum APIErrorMessages {
  // eslint-disable-next-line max-len
  restrictedUser = "Your address has been identified as ‘high risk’ by Chainalysis. You will not be allowed to make further deposits or add to your positions. You may, however, close any open positions and withdraw your funds. When you have closed all positions and withdrawn all of your funds, your user address will be blacklisted on the exchange",
}