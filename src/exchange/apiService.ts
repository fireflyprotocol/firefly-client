import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from "axios";
import { getValue, isEmpty } from "@firefly-exchange/library";
import { ResponseSchema } from "./contractErrorHandling.service";

export class APIService {
  private apiService: AxiosInstance;

  private token: string | undefined = undefined;

  constructor(url: string) {
    this.apiService = axios.create({
      baseURL: url,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });
  }

  async get<T>(
    url: string,
    queryParams?: object,
    config?: AxiosRequestConfig & { isAuthenticationRequired?: boolean }
  ) {
    const response = await this.apiService.get(url, {
      params: queryParams,
      ...config,
      transformRequest: config?.isAuthenticationRequired
        ? this.transformRequest
        : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(
    url: string,
    data: object,
    config?: AxiosRequestConfig & { isAuthenticationRequired?: boolean }
  ) {
    const response = await this.apiService.post(url, data, {
      ...config,
      transformRequest: config?.isAuthenticationRequired
        ? this.transformRequest
        : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(
    url: string,
    data: object,
    config?: AxiosRequestConfig & { isAuthenticationRequired?: boolean }
  ) {
    const response = await this.apiService.put(url, data, {
      ...config,
      transformRequest: config?.isAuthenticationRequired
        ? this.transformRequest
        : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(
    url: string,
    data: object,
    config?: AxiosRequestConfig & { isAuthenticationRequired?: boolean }
  ) {
    const response = await this.apiService.patch(url, data, {
      ...config,
      transformRequest: config?.isAuthenticationRequired
        ? this.transformRequest
        : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(
    url: string,
    data: object,
    config?: AxiosRequestConfig & { isAuthenticationRequired?: boolean }
  ) {
    const response = await this.apiService.delete(url, {
      ...config,
      data,
      transformRequest: config?.isAuthenticationRequired
        ? this.transformRequest
        : undefined,
    });
    return this.handleResponse<T>(response);
  }

  setAuthToken = async (token: string) => {
    this.token = token;
  };
  //= ==============================================================//
  //                    PRIVATE HELPER FUNCTIONS
  //= ==============================================================//

  private transformRequest = (data: any, headers?: any) => {
    headers.Authorization = `Bearer ${this.token}`;
    return JSON.stringify(data);
  };

  // TODO; create interface for response
  private handleResponse<T>(response: AxiosResponse<any>) {
    const mutatedResponse = {
      // TODO:needs to be implemented properly (BE have to change response model first )
      ok:
        response.statusText === "OK" ||
        (response.status >= 200 && response.status < 300),
      status: response.status,
      response: {
        data: getValue(response.data, "error.data", response.data),
        message: getValue(response.data, "error.message", "success"),
        errorCode: getValue(response.data, "error.code", null),
      },
    };

    const data: T = getValue(response, "data", undefined);

    if (mutatedResponse.ok) {
      return { ...mutatedResponse, data };
    }
    return {
      ...mutatedResponse,
      data: !isEmpty(data) ? data : undefined,
    };
  }

  public transformAPItoResponseSchema(APIResponse: any): ResponseSchema {
    const mutatedResponse = {
      ok: APIResponse.ok,
      data: APIResponse.response.data,
      message: APIResponse.response.message,
      code: APIResponse.status,
    };
    return mutatedResponse;
  }
}
