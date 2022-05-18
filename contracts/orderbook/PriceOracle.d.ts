/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  Contract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import { TypedEventFilter, TypedEvent, TypedListener } from "./commons";

interface PriceOracleInterface extends ethers.utils.Interface {
  functions: {
    "getAdmin()": FunctionFragment;
    "getPrice(string)": FunctionFragment;
    "prices(string)": FunctionFragment;
    "setAdmin(address)": FunctionFragment;
    "setPrice(string,uint256,uint256)": FunctionFragment;
    "timestamps(string)": FunctionFragment;
  };

  encodeFunctionData(functionFragment: "getAdmin", values?: undefined): string;
  encodeFunctionData(functionFragment: "getPrice", values: [string]): string;
  encodeFunctionData(functionFragment: "prices", values: [string]): string;
  encodeFunctionData(functionFragment: "setAdmin", values: [string]): string;
  encodeFunctionData(
    functionFragment: "setPrice",
    values: [string, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "timestamps", values: [string]): string;

  decodeFunctionResult(functionFragment: "getAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getPrice", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "prices", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setPrice", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "timestamps", data: BytesLike): Result;

  events: {
    "LogOraclePriceUpdated(string,uint256,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "LogOraclePriceUpdated"): EventFragment;
}

export class PriceOracle extends Contract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: PriceOracleInterface;

  functions: {
    getAdmin(overrides?: CallOverrides): Promise<[string]>;

    "getAdmin()"(overrides?: CallOverrides): Promise<[string]>;

    getPrice(
      key: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber]>;

    "getPrice(string)"(
      key: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber]>;

    prices(arg0: string, overrides?: CallOverrides): Promise<[BigNumber]>;

    "prices(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    setAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setPrice(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "setPrice(string,uint256,uint256)"(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    timestamps(arg0: string, overrides?: CallOverrides): Promise<[BigNumber]>;

    "timestamps(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;
  };

  getAdmin(overrides?: CallOverrides): Promise<string>;

  "getAdmin()"(overrides?: CallOverrides): Promise<string>;

  getPrice(
    key: string,
    overrides?: CallOverrides
  ): Promise<[BigNumber, BigNumber]>;

  "getPrice(string)"(
    key: string,
    overrides?: CallOverrides
  ): Promise<[BigNumber, BigNumber]>;

  prices(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

  "prices(string)"(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

  setAdmin(
    admin: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setAdmin(address)"(
    admin: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setPrice(
    key: string,
    price: BigNumberish,
    timestamp: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "setPrice(string,uint256,uint256)"(
    key: string,
    price: BigNumberish,
    timestamp: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  timestamps(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

  "timestamps(string)"(
    arg0: string,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  callStatic: {
    getAdmin(overrides?: CallOverrides): Promise<string>;

    "getAdmin()"(overrides?: CallOverrides): Promise<string>;

    getPrice(
      key: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber]>;

    "getPrice(string)"(
      key: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber]>;

    prices(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    "prices(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setAdmin(admin: string, overrides?: CallOverrides): Promise<boolean>;

    "setAdmin(address)"(
      admin: string,
      overrides?: CallOverrides
    ): Promise<boolean>;

    setPrice(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    "setPrice(string,uint256,uint256)"(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    timestamps(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    "timestamps(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  filters: {
    LogOraclePriceUpdated(
      key: null,
      price: null,
      timestamp: null
    ): TypedEventFilter<
      [string, BigNumber, BigNumber],
      { key: string; price: BigNumber; timestamp: BigNumber }
    >;
  };

  estimateGas: {
    getAdmin(overrides?: CallOverrides): Promise<BigNumber>;

    "getAdmin()"(overrides?: CallOverrides): Promise<BigNumber>;

    getPrice(key: string, overrides?: CallOverrides): Promise<BigNumber>;

    "getPrice(string)"(
      key: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    prices(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    "prices(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setPrice(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "setPrice(string,uint256,uint256)"(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    timestamps(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    "timestamps(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getAdmin(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    "getAdmin()"(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getPrice(
      key: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getPrice(string)"(
      key: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    prices(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "prices(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    setAdmin(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setAdmin(address)"(
      admin: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setPrice(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "setPrice(string,uint256,uint256)"(
      key: string,
      price: BigNumberish,
      timestamp: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    timestamps(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "timestamps(string)"(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
