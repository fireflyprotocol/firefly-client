import { getValue, isEmpty } from "@firefly-exchange/library";
import { serializeError } from "eth-rpc-errors";

export type ResponseSchema = {
  ok: boolean;
  data: any;
  message: string;
  errorCode: number | null;
};
interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}
export const handleResponse = (
  response: ProviderRpcError,
  ok: boolean
): ResponseSchema => {
  const mutatedResponse = {
    // TODO:needs to be implemented properly (BE have to change response model first )
    ok,
    data: getValue(response.data as object, "data", response.data),
    message: getValue(response.data as object, "message", response.message),
    errorCode: getValue(response.data as object, "code", response.code),
  };

  const data = getValue(response, "data", undefined);

  return {
    ...mutatedResponse,
    data: !isEmpty(data) ? data : undefined,
  };
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
        name: "",
      },
      true
    );
  } catch (error: any) {
    console.log("error", serializeError(error));
    return handleResponse(error, false);
  }
};
