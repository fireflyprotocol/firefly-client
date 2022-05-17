import BigNumber from "bignumber.js";

export const ARGS_SEPERATOR = '{||}';

const ONE_MINUTE_IN_SECONDS = new BigNumber(60);
const ONE_HOUR_IN_SECONDS = ONE_MINUTE_IN_SECONDS.times(60);
const ONE_DAY_IN_SECONDS = ONE_HOUR_IN_SECONDS.times(24);
const ONE_YEAR_IN_SECONDS = ONE_DAY_IN_SECONDS.times(365);

// ============ P1TraderConstants.sol ============

export const TRADER_FLAG_ORDERS = new BigNumber(1);
export const TRADER_FLAG_LIQUIDATION = new BigNumber(2);
export const TRADER_FLAG_DELEVERAGING = new BigNumber(4);

export const ORDER_FLAGS = {
    IS_BUY: 1,
    IS_DECREASE_ONLY: 2,
    IS_NEGATIVE_LIMIT_FEE: 4,
};

export const ZERO_REPEAT_60 = '000000000000000000000000000000000000000000000000000000000000';

export const ADDRESSES = {
    ZERO: '0x0000000000000000000000000000000000000000',
    TEST: [
        '0x06012c8cf97bead5deae237070f9587f8e7a266d',
        '0x22012c8cf97bead5deae237070f9587f8e7a266d',
        '0x33012c8cf97bead5deae237070f9587f8e7a266d',
        '0x44012c8cf97bead5deae237070f9587f8e7a266d',
        '0x55012c8cf97bead5deae237070f9587f8e7a266d',
        '0x66012c8cf97bead5deae237070f9587f8e7a266d',
        '0x77012c8cf97bead5deae237070f9587f8e7a266d',
        '0x88012c8cf97bead5deae237070f9587f8e7a266d',
        '0x99012c8cf97bead5deae237070f9587f8e7a266d',
        '0xaa012c8cf97bead5deae237070f9587f8e7a266d',
    ],
};

export const EIP712_ORDER_STRUCT = [
    { type: 'bytes32', name: 'flags' },
    { type: 'uint256', name: 'amount' },
    { type: 'uint256', name: 'limitPrice' },
    { type: 'uint256', name: 'triggerPrice' },
    { type: 'uint256', name: 'limitFee' },
    { type: 'uint256', name: 'leverage' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'taker' },
    { type: 'uint256', name: 'expiration' },
];

export const INTEGERS = {
    ONE_MINUTE_IN_SECONDS,
    ONE_HOUR_IN_SECONDS,
    ONE_DAY_IN_SECONDS,
    ONE_YEAR_IN_SECONDS,
    ZERO: new BigNumber(0),
    ONE: new BigNumber(1),
    ONES_255: new BigNumber(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    ), // 2**256-1
};


export const EIP712_DOMAIN_STRING: string =
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)';
export const EIP712_DOMAIN_VERSION = '1.0';

export type ContractArgs = {
    type: string,
    value: string,
    appendNetwork: boolean
}

export type ContractMeta = {
    name: string,
    args: ContractArgs[] | string[]
}

// Proxies
export const proxiesContractNames = ['CurrencyConverterProxy', 'LiquidatorProxy', 'SoloBridgeProxy', 'WethProxy'];

// Test Contracts
export const testContractNames = ['Test_ExchangeWrapper', 'Test_Lib', 'Test_Funder', 'Test_Monolith', 'Test_Oracle', 'Test_Trader', 'Test_Solo', 'Test_Token', 'Test_Token2', 'Test_MakerOracle', 'Test_ChainlinkAggregator', 'WETH9'];

// Protocol Contract
export const baseProtocol = [
    { name: 'PerpetualV1', args: [] },
    { name: 'PerpetualProxy', args: [{ type: 'contract', value: 'PerpetualV1' }, { type: 'account', value: 'deployer' }, { type: '_', value: '0x' }] },
    { name: 'SystemConfig', args: [] },
    { name: 'TradeInfo', args: [{ type: 'contract', value: 'PerpetualProxy' }] },
    { name: 'MarginBank', args: [{ type: `env${ARGS_SEPERATOR}contract${ARGS_SEPERATOR}_`, value: `USDC_ADDRESS_${ARGS_SEPERATOR}Test_Token${ARGS_SEPERATOR}0x0000000000000000000000000000000000000000`, appendNetwork: true }] }
] as ContractMeta[]

// Funding Oracles
export const fundingOracles = [
    { name: 'FundingOracle', args: [{ type: `env${ARGS_SEPERATOR}_`, value: `FUNDING_RATE_PROVIDER_ADDRESS_${ARGS_SEPERATOR}0x0000000000000000000000000000000000000000`, appendNetwork: true }] },
    { name: 'InverseFundingOracle', args: [{ type: `env${ARGS_SEPERATOR}_`, value: `FUNDING_RATE_PROVIDER_ADDRESS_${ARGS_SEPERATOR}0x0000000000000000000000000000000000000000`, appendNetwork: true }] },
] as ContractMeta[]

// Price Oracles
export const priceOracles = [
    {
        name: 'ChainlinkOracle', args: [
            { type: `env${ARGS_SEPERATOR}contract${ARGS_SEPERATOR}_`, value: `CHAIN_LINK_PRICE_ORACLE_ADDRESS_${ARGS_SEPERATOR}Test_ChainlinkAggregator${ARGS_SEPERATOR}0x0000000000000000000000000000000000000000`, appendNetwork: true },
            { type: 'contract', value: 'PerpetualProxy' },
            { type: `env${ARGS_SEPERATOR}_`, value: `CHAIN_LINK_ORACLE_ADJUSTMENT_EXPONENT_${ARGS_SEPERATOR}28`, appendNetwork: true }
        ]
    },
    { name: 'MakerOracle', args: [] },
    {
        name: 'OracleInverter', args: [
            { type: 'contract', value: 'MakerOracle' },
            { type: 'contract', value: 'PerpetualProxy' },
            { type: `env${ARGS_SEPERATOR}_`, value: `CHAIN_LINK_INVERSE_ORACLE_ADJUSTMENT_EXPONENT_${ARGS_SEPERATOR}16`, appendNetwork: true }
        ],
    },
    { name: 'MirrorOracleETHUSD', args: [{ type: `env${ARGS_SEPERATOR}contract`, value: `MAKER_PRICE_ORACLE_ADDRESS_${ARGS_SEPERATOR}Test_MakerOracle`, appendNetwork: true }] }

] as ContractMeta[]

// Traders
export const traders = [
    { name: 'Orders', args: [{ type: 'contract', value: 'PerpetualProxy' }, { type: 'globals', value: 'networkChainId' }] },
    { name: 'InverseOrders', args: [{ type: 'contract', value: 'PerpetualProxy' }, { type: 'globals', value: 'networkChainId' }] },
    { name: 'Deleveraging', args: [{ type: 'contract', value: 'PerpetualProxy' }, { type: `env${ARGS_SEPERATOR}_`, value: `DELEVERAGING_OPERATOR_ADDRESS_${ARGS_SEPERATOR}0x0000000000000000000000000000000000000000`, appendNetwork: true }] },
    { name: 'Liquidation', args: [{ type: 'contract', value: 'PerpetualProxy' }] }
] as ContractMeta[]

// Proxies
export const proxies = [
    { name: 'CurrencyConverterProxy', args: [] },
    {
        name: 'LiquidatorProxy', args: [
            { type: 'contract', value: 'PerpetualProxy' },
            { type: 'contract', value: 'Liquidation' },
            { type: `env${ARGS_SEPERATOR}_`, value: `INSURANCE_FUND_ADDRESS_${ARGS_SEPERATOR}0x0000000000000000000000000000000000000000`, appendNetwork: true },
            { type: `env${ARGS_SEPERATOR}_`, value: `INSURANCE_FEE_${ARGS_SEPERATOR}100000000000000000`, appendNetwork: true }]
    },
    { name: 'SoloBridgeProxy', args: [{ type: `env${ARGS_SEPERATOR}contract`, value: `SOLO_ADDRESS_${ARGS_SEPERATOR}Test_Solo`, appendNetwork: true }, { type: 'globals', value: 'networkChainId' }] },
    { name: 'WethProxy', args: [{ type: `env${ARGS_SEPERATOR}contract`, value: `WETH_ADDRESS_${ARGS_SEPERATOR}WETH9`, appendNetwork: true }] }
] as ContractMeta[]


export const EIP712_ORDER_SIGNATURE_TYPE_ARR = ['bytes32',
  'uint256',
  'uint256',
  'uint256',
  'uint256',
  'uint256',
  'address',
  'address',
  'uint256'];

export const DEFAULT_EIP712_DOMAIN_NAME = 'Orders';

export const EIP712_ORDER_STRUCT_STRING = 'Order('
    + 'bytes32 flags,'
    + 'uint256 amount,'
    + 'uint256 limitPrice,'
    + 'uint256 triggerPrice,'
    + 'uint256 limitFee,'
    + 'uint256 leverage,'
    + 'address maker,'
    + 'address taker,'
    + 'uint256 expiration'
    + ')';

export const EIP712_CANCEL_ORDER_STRUCT = [
  { type: 'string', name: 'action' },
  { type: 'bytes32[]', name: 'orderHashes' },
];

export const EIP712_CANCEL_ORDER_STRUCT_STRING = 'CancelLimitOrder('
    + 'string action,'
    + 'bytes32[] orderHashes'
    + ')';

export const PREPEND_DEC: string = '\x19Ethereum Signed Message:\n32';

export const PREPEND_HEX: string = '\x19Ethereum Signed Message:\n\x20';
    
export const EIP712_DOMAIN_STRING_NO_CONTRACT: string = 'EIP712Domain('
    + 'string name,'
    + 'string version,'
    + 'uint256 chainId'
    + ')';

export const EIP712_DOMAIN_STRUCT_NO_CONTRACT = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
];

export const EIP712_DOMAIN_STRUCT = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
];


export const BASE_DECIMALS = 18;
export const BIGNUMBER_BASE = new BigNumber(1).shiftedBy(BASE_DECIMALS);

export const Networks = { 
  TESTNET:  {url: 'https://bobabase.boba.network/', chainId: 1297 },
  MAINNET:  {url: 'https://bobabeam.boba.network/', chainId: 1291 },
}


