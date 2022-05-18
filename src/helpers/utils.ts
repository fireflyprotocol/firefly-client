import BigNumber from 'bignumber.js';
import { BIGNUMBER_BASE } from '../constants';

export function toBigNumber(val: number | string): BigNumber {
  return new BigNumber(val).multipliedBy(BIGNUMBER_BASE);
}

export function toBigNumberStr(val: number | string): string {
  return toBigNumber(val).toFixed(0);
}

export function bnStrToNumber(val: number | string):number {
  return Number(new BigNumber(val).dividedBy(BIGNUMBER_BASE).toFixed(0));
}
