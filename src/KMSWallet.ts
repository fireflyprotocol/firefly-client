import { keccak256 } from "js-sha3";
import * as ethutil from "ethereumjs-util";
import BN from "bn.js";
import { KMSClient, GetPublicKeyCommand, SignCommand, GetPublicKeyResponse, SignResponse } from "@aws-sdk/client-kms";
import { Transaction, TxData } from "ethereumjs-tx";
//@ts-ignore: asn1.js has no typings defined
import * as asn1 from "asn1.js";

export interface Signature {
  r: BN;
  s: BN;
}

export interface RecoveredPublicAddress {
  pubKey: string;
  v: number;
}

class KMSWallet {
  kms: KMSClient;
  keyId: string;
  ethAddr: string;
  ethAddrHash: Buffer;
  EcdsaSigAsnParse: any;
  EcdsaPubKey: any;
  sig: Signature;
  recoveredPubAddr: RecoveredPublicAddress;

  constructor(kms: KMSClient, keyId: string) {
    this.kms = kms;
    this.keyId = keyId;

    this.EcdsaSigAsnParse = asn1.define("EcdsaSig", function (this: any) {
      // parsing this according to https://tools.ietf.org/html/rfc3279#section-2.2.3
      this.seq().obj(this.key("r").int(), this.key("s").int());
    });

    this.EcdsaPubKey = asn1.define("EcdsaPubKey", function (this: any) {
      // parsing this according to https://tools.ietf.org/html/rfc5480#section-2
      this.seq().obj(
        this.key("algo")
          .seq()
          .obj(this.key("a").objid(), this.key("b").objid()),
        this.key("pubKey").bitstr()
      );
    });

    this.ethAddr = "";
    this.ethAddrHash = Buffer.from("");
    this.sig = {} as Signature;
    this.recoveredPubAddr = {} as RecoveredPublicAddress;
  } // end of constructor

  async init(): Promise<void> {
    const pubKey = await this.getPublicKey();
    this.ethAddr = this.getEthereumAddress(Buffer.from(pubKey.PublicKey as Uint8Array));
    this.ethAddrHash = ethutil.keccak(Buffer.from(this.ethAddr));
    this.sig = await this.findEthereumSig(this.ethAddrHash);
    this.recoveredPubAddr = this.findRightKey(
      this.ethAddrHash,
      this.sig.r,
      this.sig.s,
      this.ethAddr
    );
  }

  getEthereumAddress(publicKey: Buffer): string {
    // The public key is ASN1 encoded in a format according to
    // https://tools.ietf.org/html/rfc5480#section-2
    // I used https://lapo.it/asn1js to figure out how to parse this
    // and defined the schema in the EcdsaPubKey object
    const res = this.EcdsaPubKey.decode(publicKey, "der");
    let pubKeyBuffer: Buffer = res.pubKey.data;

    // The public key starts with a 0x04 prefix that needs to be removed
    // more info: https://www.oreilly.com/library/view/mastering-ethereum/9781491971932/ch04.html
    pubKeyBuffer = pubKeyBuffer.slice(1, pubKeyBuffer.length);

    const address = keccak256(pubKeyBuffer); // keccak256 hash of publicKey
    const buf2 = Buffer.from(address, "hex");
    return "0x" + buf2.slice(-20).toString("hex"); // take last 20 bytes as ethereum adress
  }

  async findEthereumSig(plaintext: Buffer) {
    const signature:SignResponse = await this.sign(plaintext);
    if (signature.Signature === undefined) {
      throw new Error("Signature is undefined.");
    }

    const decoded = this.EcdsaSigAsnParse.decode(Buffer.from(signature.Signature), "der");
    const r: BN = decoded.r;
    let s: BN = decoded.s;

    // const tempsig = r.toString(16) + s.toString(16);

    const secp256k1N = new BN(
      "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
      16
    ); // max value on the curve
    const secp256k1halfN = secp256k1N.div(new BN(2)); // half of the curve
    // Because of EIP-2 not all elliptic curve signatures are accepted
    // the value of s needs to be SMALLER than half of the curve
    // i.e. we need to flip s if it's greater than half of the curve
    if (s.gt(secp256k1halfN)) {
      // console.log("s is on the wrong side of the curve... flipping - tempsig: " + tempsig + " length: " + tempsig.length);
      // According to EIP2 https://github.com/ethereum/EIPs/blob/master/EIPS/eip-2.md
      // if s < half the curve we need to invert it
      // s = curve.n - s
      s = secp256k1N.sub(s);
      return {r, s};
    }
    // if s is less than half of the curve, we're on the "good" side of the curve, we can just return
    return {r, s};
  }

  recoverPubKeyFromSig(msg: Buffer, r: BN, s: BN, v: number): string {
    const rBuffer = r.toBuffer();
    const sBuffer = s.toBuffer();
    const pubKey = ethutil.ecrecover(msg, v, rBuffer, sBuffer);
    const addrBuf = ethutil.pubToAddress(pubKey);
    return ethutil.bufferToHex(addrBuf);
  }

  findRightKey(msg: Buffer, r: BN, s: BN, expectedEthAddr: string) {
    // This is the wrapper function to find the right v value
    // There are two matching signatues on the elliptic curve
    // we need to find the one that matches to our public key
    // it can be v = 27 or v = 28
    let v = 27;
    let pubKey = this.recoverPubKeyFromSig(msg, r, s, v);
    if (pubKey != expectedEthAddr) {
      // if the pub key for v = 27 does not match
      // it has to be v = 28
      v = 28;
      pubKey = this.recoverPubKeyFromSig(msg, r, s, v);
    }
    // console.log("Found the right ETH Address: " + pubKey + " v: " + v);
    return {pubKey, v};
  }

  async getPublicKey(): Promise<GetPublicKeyResponse> {
    const cmd = new GetPublicKeyCommand({
      KeyId: this.keyId,
    })
    return this.kms.send(cmd)
  }

  async sign(msgHash: Buffer): Promise<SignResponse> {
    const cmd = new SignCommand({
      // key id or 'Alias/<alias>'
      KeyId: this.keyId,
      Message: msgHash,
      // 'ECDSA_SHA_256' is the one compatible with ECC_SECG_P256K1.
      SigningAlgorithm: "ECDSA_SHA_256",
      MessageType: "RAW"
    });
 
    return this.kms.send(cmd)
  }

  async getSerializedTx(txParams: TxData): Promise<string> {
    const tx = new Transaction(txParams);
    const txHash = tx.hash(false);
    const sig = await this.findEthereumSig(txHash);
    const recoveredPubAddr = this.findRightKey(
      txHash,
      sig.r,
      sig.s,
      this.ethAddr
    );
    tx.r = sig.r.toBuffer();
    tx.s = sig.s.toBuffer();
    tx.v = new BN(recoveredPubAddr.v).toBuffer();

    return tx.serialize().toString("hex");
  }





}

export { KMSWallet };