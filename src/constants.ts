import { Network } from "@firefly-exchange/library";

export const Networks = {
  TESTNET_BOBA: {
    url: "https://l2-dev.firefly.exchange/",
    chainId: 78602,
    apiGateway: "https://dapi-dev.firefly.exchange",
    socketURL: "wss://dapi-dev.firefly.exchange",
    webSocketURL: "wss://k8s-albdapi-775184c5a7-538590878.us-east-1.elb.amazonaws.com:2063",
    onboardingUrl: "https://dev.firefly.exchange",
  },
  TESTNET_ARBITRUM: {
    url: "https://arbitrum-goerli.infura.io/v3/62bcda18381b45eab5435e1342da21a6",
    chainId: 421613,
    apiGateway: "https://api.arbitrum-staging.firefly.exchange/dapi-server",
    socketURL: "wss://api.arbitrum-staging.firefly.exchange/dapi-server",
    webSocketURL: "wss://api.arbitrum-staging.firefly.exchange/dapi-server-notifier/",
    onboardingUrl: "https://testnet.firefly.exchange",
  },
  PRODUCTION_BOBA: {
    url: "https://bobabeam.boba.network/",
    chainId: 1294,
    apiGateway: "https://dapi.firefly.exchange",
    socketURL: "wss://dapi.firefly.exchange",
    webSocketURL: "",
    onboardingUrl: "https://trade.firefly.exchange",
  },
  PRODUCTION_ARBITRUM: {
    url: "https://arb1.arbitrum.io/rpc/",
    chainId: 42161,
    apiGateway: "https://dapi-arb.firefly.exchange",
    socketURL: "wss://dapi-arb.firefly.exchange",
    webSocketURL: "",
    onboardingUrl: "https://trade-arb.firefly.exchange",
  },
};

export const DEFAULT_PRECISION = 2
export const ARBITRUM_NETWROK = "arbitrum"
export const EXTRA_FEES = 10000

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

//adding this here as it's temporary support for socket.io
export interface ExtendedNetwork extends Network {
  webSocketURL: string
}