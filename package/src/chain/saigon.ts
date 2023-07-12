import { Chain } from "wagmi";

export const saigon = {
  id: 2021,
  name: 'Saigon Testnet',
  network: 'saigon',
  nativeCurrency: { name: 'RON', symbol: 'RON', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://saigon-testnet.roninchain.com/rpc'],
    },
    public: {
      http: ['https://saigon-testnet.roninchain.com/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Saigon Explorer', url: 'https://saigon-explorer.roninchain.com/' },
  },
} as const satisfies Chain