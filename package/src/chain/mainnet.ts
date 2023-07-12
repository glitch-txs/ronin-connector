import { Chain } from "wagmi";

export const ronin = {
  id: 2020,
  name: 'Ronin mainnet',
  network: 'ronin',
  nativeCurrency: { name: 'RON', symbol: 'RON', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://api.roninchain.com/rpc'],
    },
    public: {
      http: ['https://api.roninchain.com/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Ronin Explorer', url: 'https://app.roninchain.com/' },
  },
} as const satisfies Chain