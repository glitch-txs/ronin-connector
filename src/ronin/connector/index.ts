import type { Chain } from '@wagmi/chains'
import WalletConnectProvider from '@walletconnect/ethereum-provider'
import { EthereumProviderOptions } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider'
import { normalizeNamespaces } from '@walletconnect/utils'
import {
  EIP1193Events,
  EIP1193Provider,
  ProviderRpcError,
  SwitchChainError,
  UserRejectedRequestError,
  createWalletClient,
  custom,
  getAddress,
  numberToHex,
} from 'viem'
import { Connector } from 'wagmi'
import { WalletClient } from '../types'
import { isMobile } from '../utils/isMobile'

type RoninOptions = {
  /**
   * WalletConnect Cloud Project ID.
   * @link https://cloud.walletconnect.com/sign-in.
   */
  projectId: EthereumProviderOptions['projectId']
  /**
   * Metadata for your app.
   * @link https://docs.walletconnect.com/2.0/javascript/providers/ethereum#initialization
   */
  metadata?: EthereumProviderOptions['metadata']
  /**
   * Option to override default relay url.
   * @link https://docs.walletconnect.com/2.0/web/providers/ethereum
   */
  relayUrl?: string
  /**
   * MetaMask and other injected providers do not support programmatic disconnect.
   * This flag simulates the disconnect behavior by keeping track of connection status in storage. See [GitHub issue](https://github.com/MetaMask/metamask-extension/issues/10353) for more info.
   * @default true
   */
  shimDisconnect?: boolean
}

type ConnectConfig = {
  /** Target chain to connect to. */
  chainId?: number
  /** If provided, will attempt to connect to an existing pairing. */
  pairingTopic?: string
}

const NAMESPACE = 'eip155'
const REQUESTED_CHAINS_KEY = 'requestedChains'
const ADD_ETH_CHAIN_METHOD = 'wallet_addEthereumChain'
const mobile = isMobile()

export class RoninConnector extends Connector<
  WalletConnectProvider | EIP1193Provider,
  RoninOptions
> {
  readonly id = 'roninWallet'
  readonly name = 'Ronin Wallet'
  readonly ready = true
  protected shimDisconnectKey = `${this.id}.shimDisconnect`

  #provider?: WalletConnectProvider
  #initProviderPromise?: Promise<void>

  #isExtension: boolean = typeof window === 'undefined' ? false : Boolean(window.ronin)

  constructor(config: { chains?: Chain[]; options: RoninOptions }) {
    super({
      ...config,
      options: { shimDisconnect: true, ...config.options },
    })

    if(!this.#isExtension)
    this.#createProvider()
  }

  async connect() {
    try {
      const provider = await this.getProvider()
      if(this.#isExtension){
        window.ronin?.roninEvent.addEventListener('accountsChanged', this.onAccountsChanged)
        window.ronin?.roninEvent.addEventListener('chainChanged', this.onChainChanged)
        window.ronin?.roninEvent.addEventListener('disconnect', this.onDisconnect)
  
        this.emit('message', { type: 'connecting' })
  
        const accounts = await (provider as EIP1193Provider).request({
          method: 'eth_requestAccounts',
        })
        const account = getAddress(accounts[0] as string)

        // Switch to chain if provided
        let id = await this.getChainId()
        let unsupported = this.isChainUnsupported(id)
  
        // Add shim to storage signalling wallet is connected
        if (this.options.shimDisconnect)
        this.storage?.setItem(this.shimDisconnectKey, true)
  
        this.emit('connect', { account, chain: { id, unsupported } })
        return { account, chain: { id, unsupported } }
      }

      // If Ronin Wallet Extension is not installed
      this.#setupListeners()

      // If there no active session, or the chains are stale, connect.
      if (!(provider as WalletConnectProvider).session) {
        this.emit('message', { type: 'connecting' })

        await (provider as WalletConnectProvider).connect()

        this.#setRequestedChainsIds(this.chains.map(({ id }) => id))
      }

      // If session exists and chains are authorized, enable provider for required chain
      const accounts = await (provider as WalletConnectProvider).enable()
      const account = getAddress(accounts[0]!)
      const id = await this.getChainId()
      const unsupported = this.isChainUnsupported(id)

      return {
        account,
        chain: { id, unsupported },
      }
    } catch (error) {
      if (/user rejected/i.test((error as ProviderRpcError)?.message)) {
        throw new UserRejectedRequestError(error as Error)
      }
      throw error
    }
  }

  async disconnect() {
    const provider = await this.getProvider()

    try {
      if(this.#isExtension){
        window.ronin?.roninEvent.removeEventListener('accountsChanged', this.onAccountsChanged)
        window.ronin?.roninEvent.removeEventListener('chainChanged', this.onChainChanged)
        window.ronin?.roninEvent.removeEventListener('disconnect', this.onDisconnect)

        this.emit('change', { account: undefined })
        this.emit('disconnect')
  
        // Remove shim signalling wallet is disconnected
        if (this.options.shimDisconnect)
        this.storage?.removeItem(this.shimDisconnectKey)
        return
      }

      await (provider as WalletConnectProvider).disconnect()
      this.emit('change', { account: undefined })
      this.emit('disconnect')

    } catch (error) {
      if (!/No matching key/i.test((error as Error).message)) throw error
    } finally {
      this.#removeListeners()
      this.#setRequestedChainsIds([])
    }
  }

  async getAccount() {
    const provider = await this.getProvider()

    if(!this.#isExtension) {
      const { accounts } = (provider as WalletConnectProvider)
      return getAddress(accounts[0]!)
    } 
    
    const accounts = await (provider as EIP1193Provider).request({method: 'eth_accounts'})
    return getAddress(accounts[0]!)
  }

  async getChainId() {
    const provider = await this.getProvider()
    if(!this.#isExtension) return (provider as WalletConnectProvider).chainId 

    const chainId = await (provider as EIP1193Provider).request({method: 'eth_chainId'})
    return Number(chainId)
  }

  async getProvider({ chainId }: { chainId?: number } = {}) {
    
    if(window?.ronin){
      if(window.ronin.provider.on!) return window.ronin.provider

      window.ronin.provider.on = window.ronin.roninEvent.addEventListener as EIP1193Events['on']
      window.ronin.provider.removeListener = window.ronin.roninEvent.removeEventListener as EIP1193Events['removeListener']
      this.#isExtension = true
      return window.ronin.provider
    }

    this.#isExtension = false
    if (!this.#provider) await this.#createProvider()
    if (chainId) await this.switchChain(chainId)
    return this.#provider!
  }

  async getWalletClient({
    chainId,
  }: { chainId?: number } = {}): Promise<WalletClient> {
    const [provider, account] = await Promise.all([
      this.getProvider({ chainId }),
      this.getAccount(),
    ])
    const chain = this.chains.find((x) => x.id === chainId)
    if (!provider) throw new Error('provider is required.')
    return createWalletClient({
      account,
      chain,
      transport: custom(provider),
    })
  }

  async isAuthorized() {
    try {
      if (
        this.options.shimDisconnect && this.#isExtension &&
        // If shim does not exist in storage, wallet is disconnected
        !this.storage?.getItem(this.shimDisconnectKey)
      )
        return false
      const [account] = await this.getAccount()
      // If an account does not exist on the session, then the connector is unauthorized.
      if (!account) return false

      return true
    } catch {
      return false
    }
  }

  async switchChain(chainId: number) {
    const chain = this.chains.find((chain) => chain.id === chainId)
    if (!chain)
      throw new SwitchChainError(new Error('chain not found on connector.'))

    try {
      const provider = await this.getProvider()
      const namespaceChains = this.#getNamespaceChainsIds()
      const namespaceMethods = this.#getNamespaceMethods()
      const isChainApproved = namespaceChains.includes(chainId)

      if (!isChainApproved && namespaceMethods.includes(ADD_ETH_CHAIN_METHOD)) {
        await (provider as EIP1193Provider).request({
          method: ADD_ETH_CHAIN_METHOD,
          params: [
            {
              chainId: numberToHex(chain.id),
              blockExplorerUrls: [chain.blockExplorers?.default?.url ?? ''],
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [...chain.rpcUrls.default.http],
            },
          ],
        })
        const requestedChains = this.#getRequestedChainsIds()
        requestedChains.push(chainId)
        this.#setRequestedChainsIds(requestedChains)
      }
      await (provider as EIP1193Provider).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(chainId) }],
      })

      return chain
    } catch (error) {
      const message =
        typeof error === 'string' ? error : (error as ProviderRpcError)?.message
      if (/user rejected request/i.test(message)) {
        throw new UserRejectedRequestError(error as Error)
      }
      throw new SwitchChainError(error as Error)
    }
  }

  async #createProvider() {
    if (!this.#initProviderPromise && typeof window !== 'undefined') {
      this.#initProviderPromise = this.#initProvider()
    }
    return this.#initProviderPromise
  }

  async #initProvider() {
    const { EthereumProvider, OPTIONAL_EVENTS, OPTIONAL_METHODS } =
      await import('@walletconnect/ethereum-provider')
    const [defaultChain, ...optionalChains] = this.chains.map(({ id }) => id)
    if (defaultChain) {
      const {
        projectId,
        metadata,
        relayUrl,
      } = this.options
      this.#provider = await EthereumProvider.init({
        showQrModal: false,
        projectId,
        optionalMethods: OPTIONAL_METHODS,
        optionalEvents: OPTIONAL_EVENTS,
        chains: [defaultChain],
        optionalChains: optionalChains.length ? optionalChains : undefined,
        rpcMap: Object.fromEntries(
          this.chains.map((chain) => [
            chain.id,
            chain.rpcUrls.default.http[0]!,
          ]),
        ),
        metadata,
        relayUrl,
      })
    }
  }

  #setupListeners() {
    if (!this.#provider) return
    this.#removeListeners()
    this.#provider.on('accountsChanged', this.onAccountsChanged)
    this.#provider.on('chainChanged', this.onChainChanged)
    this.#provider.on('disconnect', this.onDisconnect)
    this.#provider.on('session_delete', this.onDisconnect)
    this.#provider.on('display_uri', this.onDisplayUri)
    this.#provider.on('connect', this.onConnect)
  }

  #removeListeners() {
    if (!this.#provider) return
    this.#provider.removeListener('accountsChanged', this.onAccountsChanged)
    this.#provider.removeListener('chainChanged', this.onChainChanged)
    this.#provider.removeListener('disconnect', this.onDisconnect)
    this.#provider.removeListener('session_delete', this.onDisconnect)
    this.#provider.removeListener('display_uri', this.onDisplayUri)
    this.#provider.removeListener('connect', this.onConnect)
  }

  #setRequestedChainsIds(chains: number[]) {
    this.storage?.setItem(REQUESTED_CHAINS_KEY, chains)
  }

  #getRequestedChainsIds(): number[] {
    return this.storage?.getItem(REQUESTED_CHAINS_KEY) ?? []
  }

  #getNamespaceChainsIds() {
    if (!this.#provider) return []
    const namespaces = this.#provider.session?.namespaces
    if (!namespaces) return []

    const normalizedNamespaces = normalizeNamespaces(namespaces)
    const chainIds = normalizedNamespaces[NAMESPACE]?.chains?.map((chain) =>
      parseInt(chain.split(':')[1] || ''),
    )

    return chainIds ?? []
  }

  #getNamespaceMethods() {
    if (!this.#provider) return []
    const namespaces = this.#provider.session?.namespaces
    if (!namespaces) return []

    const normalizedNamespaces = normalizeNamespaces(namespaces)
    const methods = normalizedNamespaces[NAMESPACE]?.methods

    return methods ?? []
  }

  protected onAccountsChanged = async() => {
    const address = await this.getAccount()
    if (!address) this.emit('disconnect')
    else this.emit('change', { account: address })
  }

  protected onChainChanged = async() => {
    const id = await this.getChainId()
    const unsupported = this.isChainUnsupported(id)
    this.emit('change', { chain: { id, unsupported } })
  }

  protected onDisconnect = () => {
    this.#setRequestedChainsIds([])
    this.emit('disconnect')
  }

  protected onDisplayUri = (uri: string) => {
    this.emit('message', { type: 'display_uri', data: uri })
    if(mobile && uri)
    window.open(`https://wallet.roninchain.com/auth-connect?uri=${uri}`, '_self', 'noreferrer noopener')
  }

  protected onConnect = () => {
    this.emit('connect', {})
  }
}
