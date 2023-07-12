import { Account, Chain, EIP1193Provider, Transport, WalletClient as WalletClient_ } from 'viem'
import { ConnectorData } from "wagmi"

declare global{
  interface Window {
    ronin?: {
      provider: EIP1193Provider,
      roninEvent: EventTarget
    }
  }
}

export type StorageStoreData = {
  state: { data?: ConnectorData }
}

export type WalletClient<
  TTransport extends Transport = Transport,
  TChain extends Chain = Chain,
  TAccount extends Account = Account,
> = WalletClient_<TTransport, TChain, TAccount>