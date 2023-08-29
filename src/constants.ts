import { Network } from "@firefly-exchange/library";

export const Networks = {
  TESTNET_ARBITRUM: {
    url: "https://arbitrum-goerli.infura.io/v3/62bcda18381b45eab5435e1342da21a6",
    chainId: 421613,
    apiGateway: "https://dapi.api.arbitrum-staging.firefly.exchange",
    dmsURL: "https://api.arbitrum-staging.firefly.exchange/dead-man-switch",
    socketURL: "wss://dapi.api.arbitrum-staging.firefly.exchange",
    webSocketURL: "wss://notifications.api.arbitrum-staging.firefly.exchange/",
    onboardingUrl: "https://testnet.firefly.exchange",
  },
  PRODUCTION_ARBITRUM: {
    url: "https://arb1.arbitrum.io/rpc/",
    chainId: 42161,
    apiGateway: "https://dapi.api.arbitrum-prod.firefly.exchange",
    socketURL: "wss://dapi.api.arbitrum-prod.firefly.exchange",
    dmsURL: "https://api.arbitrum-prod.firefly.exchange/dead-man-switch",
    webSocketURL: "wss://notifications.api.arbitrum-prod.firefly.exchange/",
    onboardingUrl: "https://trade-arb.firefly.exchange",
    UUID: "uuid-default"
  },
  PRODUCTION_ARBITRUM_INTERNAL: {
    url: "https://arb1.arbitrum.io/rpc/",
    chainId: 42161,
    apiGateway: "https://dapi.api.arbitrum-prod.int.firefly.exchange",
    socketURL: "wss://dapi.api.arbitrum-prod.int.firefly.exchange",
    dmsURL: "https://api.arbitrum-prod.int.firefly.exchange/dead-man-switch",
    webSocketURL: "wss://notifications.api.arbitrum-prod.int.firefly.exchange/",
    onboardingUrl: "https://trade-arb.firefly.exchange",
    UUID: "uuid-default"
  }
};

export const DEFAULT_PRECISION = 2;
export const ARBITRUM_NETWROK = "arbitrum";
export const EXTRA_FEES = 10000;

//adding this here as it's temporary support for socket.io
export interface ExtendedNetwork extends Network {
  webSocketURL: string;
  dmsURL?: string;
}