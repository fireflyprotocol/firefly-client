import BigNumber from 'bignumber.js';
import { BIGNUMBER_BASE } from '../constants';

export function bigNumber(val: number | string): BigNumber {
  return new BigNumber(val);
}

export function toBigNumber(val: number | string): BigNumber {
  return new BigNumber(val).multipliedBy(BIGNUMBER_BASE);
}

export function toBigNumberStr(val: number | string): string {
  return toBigNumber(val).toFixed(0);
}

export function bnToString(val: number | string): string {
  return new BigNumber(val).toFixed(0);
}

export function bnStrToBaseNumber(val: number | string):number {
  return Number(new BigNumber(val).dividedBy(BIGNUMBER_BASE).toFixed(0));
}
