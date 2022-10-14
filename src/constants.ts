export const Networks = {
  TESTNET: {
    url: "https://bobabase.boba.network/",
    chainId: 1297,
    apiGateway: "https://dapi-testnet.firefly.exchange",
    socketURL: "wss://dapi-testnet.firefly.exchange",
    onboardingUrl: "https://testnet.firefly.exchange",
  },
  DEV: {
    url: "https://l2-dev.firefly.exchange/",
    chainId: 78602,
    apiGateway: "https://dapi-dev.firefly.exchange",
    socketURL: "wss://dapi-dev.firefly.exchange/",
    onboardingUrl: "https://dev.firefly.exchange",
  },
  SANDBOX: {
    url: "https://l2-dev.firefly.exchange/",
    chainId: 78602,
    apiGateway: "https://dapi-dev-sandbox.firefly.exchange",
    socketURL: "wss://dapi-dev-sandbox.firefly.exchange/",
    onboardingUrl: "https://dev-sandbox.firefly.exchange",
  },
  PRODUCTION: {
    url: "https://bobabeam.boba.network/",
    chainId: 1294,
    apiGateway: "https://dapi.firefly.exchange",
    socketURL: "wss://dapi.firefly.exchange",
    onboardingUrl: "https://trade.firefly.exchange",
  },
};

export const DEFAULT_PRECISION = 2

//TODO: should come from server
export const BICONOMY_API_KEY =
  "up_rW7i3I.b96415e2-3176-4cc9-9761-e245fa48b449";

//TODO: move to library
export enum SignatureType {
  PERSONAL_SIGN = 'PERSONAL_SIGN'
}

export enum TransactionType {
  eth_sendTransaction = 'eth_sendTransaction'
}
