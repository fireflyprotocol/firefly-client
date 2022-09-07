export const Networks = {
  TESTNET: {
    url: "https://bobabase.boba.network/",
    chainId: 1297,
    apiGateway: "https://dapi-testnet.firefly.exchange",
    socketURL: "wss://dapi-testnet.firefly.exchange",
    onboardingUrl: "https://testnet.firefly.exchange"
  },
  DEV: {
    url: "https://l2-dev.firefly.exchange/",
    chainId: 78602,
    apiGateway: "https://dapi-dev.firefly.exchange",
    socketURL: "wss://dev.firefly.exchange/",
    onboardingUrl: "https://dev.firefly.exchange"
  },
  SANDBOX: {
    url: "https://l2-dev.firefly.exchange/",
    chainId: 78602,
    apiGateway: "https://dapi-dev-sandbox.firefly.exchange",
    socketURL: "wss://dapi-dev-sandbox.firefly.exchange/",
    onboardingUrl: "https://dev-sandbox.firefly.exchange"
  },
  PRODUCTION: {
    url: "",
    chainId: 0,
    apiGateway: "",
    socketURL: "",
    onboardingUrl: ""
  }
};
