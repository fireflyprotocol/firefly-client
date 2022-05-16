import { ethers } from 'ethers';
import util from 'util';
import Web3 from 'web3';

import {
  addressesAreEqual,
  combineHexStrings,
  stripHexPrefix,
} from './bytes';

import {
  SigningMethod,
  TypedSignature,
  address,
  SIGNATURE_TYPES,
} from '../types';

import { PREPEND_DEC, PREPEND_HEX } from '../constants';

export function isValidSigType(
  sigType: number,
): boolean {
  switch (sigType) {
    case SIGNATURE_TYPES.NO_PREPEND:
    case SIGNATURE_TYPES.DECIMAL:
    case SIGNATURE_TYPES.HEXADECIMAL:
      return true;
    default:
      return false;
  }
}

/**
 * Returns a signable EIP712 Hash of a struct, given the domain and struct hashes.
 */
export function getEIP712Hash(
  domainHash: string,
  structHash: string,
): string {
  return Web3.utils.soliditySha3(
    { t: 'bytes2', v: '0x1901' },
    { t: 'bytes32', v: domainHash },
    { t: 'bytes32', v: structHash },
  ) || '';
}

export function getPrependedHash(
  hash: string,
  sigType: SIGNATURE_TYPES,
): string | null {
  switch (sigType) {
    case SIGNATURE_TYPES.NO_PREPEND:
      return hash;
    case SIGNATURE_TYPES.DECIMAL:
      return Web3.utils.soliditySha3(
        { t: 'string', v: PREPEND_DEC },
        { t: 'bytes32', v: hash },
      );
    case SIGNATURE_TYPES.HEXADECIMAL:
      return Web3.utils.soliditySha3(
        { t: 'string', v: PREPEND_HEX },
        { t: 'bytes32', v: hash },
      );
    default:
      throw Error(`invalid sigType ${sigType}`);
  }
}

export function ecRecoverTypedSignature(
  hash: string,
  typedSignature: string,
): address {
  if (stripHexPrefix(typedSignature).length !== 66 * 2) {
    return '0x'; // return invalid address instead of throwing error
  }

  const sigType = parseInt(typedSignature.slice(-2), 16);

  let prependedHash: string | null;
  try {
    prependedHash = getPrependedHash(hash, sigType);
  } catch (e) {
    return '0x'; // return invalid address instead of throwing error
  }

  const signature = typedSignature.slice(0, -2);
  return prependedHash ? new Web3().eth.accounts.recover(
    prependedHash,
    signature,
    true, // hash is already prepended
  ) : '0x'; // return invalid address instead of throwing error
}

/**
 * Returns true if the hash has a non-null valid signature from a particular signer.
 */
export function hashHasValidSignature(
  hash: string,
  typedSignature: string,
  expectedSigner: address,
): boolean {
  const signer = ecRecoverTypedSignature(hash, typedSignature);
  return addressesAreEqual(signer, expectedSigner);
}

export function signatureToVRS(
  signature: string,
): {
      v: string,
      r: string,
      s: string,
  } {
  const stripped = stripHexPrefix(signature);

  if (stripped.length !== 130) {
    throw new Error(`Invalid raw signature: ${signature}`);
  }

  const r = stripped.substr(0, 64);
  const s = stripped.substr(64, 64);
  const v = stripped.substr(128, 2);

  return { v, r, s };
}

/**
 * Fixes any signatures that don't have a 'v' value of 27 or 28
 */
export function fixRawSignature(
  signature: string,
): string {
  const { v, r, s } = signatureToVRS(signature);

  let trueV: string;
  switch (v) {
    case '00':
      trueV = '1b';
      break;
    case '01':
      trueV = '1c';
      break;
    case '1b':
    case '1c':
      trueV = v;
      break;
    default:
      throw new Error(`Invalid v value: ${v}`);
  }

  return combineHexStrings(r, s, trueV);
}

export function createTypedSignature(
  signature: string,
  sigType: number,
): string {
  if (!isValidSigType(sigType)) {
    throw new Error(`Invalid signature type: ${sigType}`);
  }
  return `${fixRawSignature(signature)}0${sigType}`;
}

export function signatureToSolidityStruct(
  typedSignature: TypedSignature,
): {
    vType: string,
    r: string;
    s: string
} {
  const rawSignature = typedSignature.slice(0, 132);
  const signatureType = typedSignature.slice(132, 134);
  const { v, r, s } = signatureToVRS(rawSignature);
  return {
    vType: `0x${v}${signatureType}`,
    r: `0x${r}`,
    s: `0x${s}`,
  };
}

export async function ethSignTypedDataInternal(
  provider: any,
  signer: string,
  data: any,
  signingMethod: SigningMethod,
): Promise<TypedSignature> {
  let sendMethod: string;
  let rpcMethod: string;
  let rpcData: any;

  switch (signingMethod) {
    case SigningMethod.TypedData:
      sendMethod = 'send';
      rpcMethod = 'eth_signTypedData';
      rpcData = data;
      break;
    case SigningMethod.MetaMask:
      sendMethod = 'sendAsync';
      rpcMethod = 'eth_signTypedData_v3';
      rpcData = JSON.stringify(data);
      break;
    case SigningMethod.MetaMaskLatest:
      sendMethod = 'sendAsync';
      rpcMethod = 'eth_signTypedData_v4';
      rpcData = JSON.stringify(data);
      break;
    case SigningMethod.CoinbaseWallet:
      sendMethod = 'sendAsync';
      rpcMethod = 'eth_signTypedData';
      rpcData = data;
      break;
    default:
      throw new Error(`Invalid signing method ${signingMethod}`);
  }

  const sendAsync = util.promisify(provider[sendMethod]).bind(provider);
  const response = await sendAsync({
    method: rpcMethod,
    params: [signer, rpcData],
    jsonrpc: '2.0',
    id: new Date().getTime(),
  });
  if (response.error) {
    throw new Error(response.error.message);
  }
  return `0x${stripHexPrefix(response.result)}0${SIGNATURE_TYPES.NO_PREPEND}`;
}

export type SignableObject<T> = {
    address: string;
} & T;

export type SignedObject<T> = SignableObject<T> & { $$$signature$$$: string };

/**
 * sign a signable object with a private key
 * @param signer
 * @param object
 * @returns a signed object
 */
export const signObject = async <T>(
  signer: ethers.Signer,
  object: SignableObject<T>): Promise<SignedObject<T>> => {
  const sanitizedJSON = JSON.parse(JSON.stringify(object));
  const sortedObj = Object.keys(sanitizedJSON)
    .sort()
    .map((key) => ({ [key]: sanitizedJSON[key] }))
    .reduce((a, b) => Object.assign(a, b)) as SignableObject<T>;
  const signature = await signer.signMessage(JSON.stringify(sortedObj));
  return {
    ...sortedObj,
    $$$signature$$$: signature,
  };
};
/**
 * verify a signed object with a public key
 * @param object
 * @returns true if the signature is valid
 */
export const verifySignedObject = <T>(object: SignedObject<T>): boolean => {
  let isValid = false;
  const web3 = new Web3();
  const sanitizedJSON = JSON.parse(JSON.stringify(object));

  const sortedObj = Object.keys(sanitizedJSON)
    .filter((key) => key !== '$$$signature$$$')
    .sort()
    .map((key) => ({ [key]: sanitizedJSON[key] }))
    .reduce((a, b) => Object.assign(a, b));
  try {
    isValid = sanitizedJSON.address.toLowerCase() === web3.eth.accounts
      .recover(JSON.stringify(sortedObj), sanitizedJSON.$$$signature$$$)
      .toLowerCase();
  } catch (e) {
    /* eslint-disable no-console */
    console.log('Error:', e);
  }
  return isValid;
};
