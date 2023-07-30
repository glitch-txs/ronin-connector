import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { createConfig, configureChains } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { WagmiConfig } from 'wagmi'
import { RoninConnector, ronin, saigon } from 'ronin-connector'
import { metadata } from '@/utils/metadata'

const { publicClient } = configureChains([saigon], [publicProvider()])
 
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID as string
if(!projectId) throw Error("Project ID missing")

const config = createConfig({
  autoConnect:true,
  connectors: [ new RoninConnector({
    chains:[saigon, ronin],
    options:{
      projectId,
      metadata
    }
  })],
  publicClient,
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig config={config} >
      <Component {...pageProps} />
    </WagmiConfig>
    )
}
