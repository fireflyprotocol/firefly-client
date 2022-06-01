import BigNumber from "bignumber.js";

export const ARGS_SEPERATOR = "{||}";

const ONE_MINUTE_IN_SECONDS = new BigNumber(60);
const ONE_HOUR_IN_SECONDS = ONE_MINUTE_IN_SECONDS.times(60);
const ONE_DAY_IN_SECONDS = ONE_HOUR_IN_SECONDS.times(24);
const ONE_YEAR_IN_SECONDS = ONE_DAY_IN_SECONDS.times(365);

export const ORDER_FLAGS = {
  IS_BUY: 1,
  IS_DECREASE_ONLY: 2,
  IS_NEGATIVE_LIMIT_FEE: 4,
};

export const ZERO_REPEAT_60 =
  "000000000000000000000000000000000000000000000000000000000000";

export const EIP712_ORDER_STRUCT = [
  { type: "bytes32", name: "flags" },
  { type: "uint256", name: "amount" },
  { type: "uint256", name: "limitPrice" },
  { type: "uint256", name: "triggerPrice" },
  { type: "uint256", name: "limitFee" },
  { type: "uint256", name: "leverage" },
  { type: "address", name: "maker" },
  { type: "address", name: "taker" },
  { type: "uint256", name: "expiration" },
];

export const INTEGERS = {
  ONE_MINUTE_IN_SECONDS,
  ONE_HOUR_IN_SECONDS,
  ONE_DAY_IN_SECONDS,
  ONE_YEAR_IN_SECONDS,
  ZERO: new BigNumber(0),
  ONE: new BigNumber(1),
  ONES_255: new BigNumber(
    "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  ), // 2**256-1
};

export const EIP712_DOMAIN_STRING: string =
  "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
export const EIP712_DOMAIN_VERSION = "1.0";

export const EIP712_ORDER_SIGNATURE_TYPE_ARR = [
  "bytes32",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "uint256",
  "address",
  "address",
  "uint256",
];

export const DEFAULT_EIP712_DOMAIN_NAME = "Orders";

export const EIP712_ORDER_STRUCT_STRING =
  "Order(" +
  "bytes32 flags," +
  "uint256 amount," +
  "uint256 limitPrice," +
  "uint256 triggerPrice," +
  "uint256 limitFee," +
  "uint256 leverage," +
  "address maker," +
  "address taker," +
  "uint256 expiration" +
  ")";

export const EIP712_CANCEL_ORDER_STRUCT = [
  { type: "string", name: "action" },
  { type: "bytes32[]", name: "orderHashes" },
];

export const EIP712_CANCEL_ORDER_STRUCT_STRING =
  "CancelLimitOrder(string action,bytes32[] orderHashes)";

export const PREPEND_DEC: string = "\x19Ethereum Signed Message:\n32";

export const PREPEND_HEX: string = "\x19Ethereum Signed Message:\n\x20";

export const EIP712_DOMAIN_STRING_NO_CONTRACT: string =
  "EIP712Domain(" +
  "string name," +
  "string version," +
  "uint256 chainId" +
  ")";

export const EIP712_DOMAIN_STRUCT_NO_CONTRACT = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
];

export const EIP712_DOMAIN_STRUCT = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

export const BASE_DECIMALS = 18;
export const BIGNUMBER_BASE = new BigNumber(1).shiftedBy(BASE_DECIMALS);

export const Networks = {
  TESTNET: {
    url: "https://bobabase.boba.network/",
    chainId: 1297,
    apiGateway: "https://dapi-testnet.firefly.exchange",
    socketURL: "wss://dapi-testnet.firefly.exchange",
  },
};
