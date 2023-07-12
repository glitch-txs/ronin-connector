# Ronin Connector for Wagmi

### Install

```bash
npm i ronin-connector
```
```bash
yarn add ronin-connector
```
```bash
pnpm add ronin-connector
```

### Configuration
```ts
import { RoninConnector, ronin } from 'ronin-connector'

const connector = new RoninConnector({
  chains:[ronin],
  options:{
    projectId: '...',
    metadata:{
      name: 'wagmi',
      description: 'my wagmi app',
      url: 'https://wagmi.sh',
      icons: ['https://wagmi.sh/icon.png'],
    },
  }
})
```

### Features
- Connect to Ronin Browser Wallet.
- If the wallet browser extension is not installed it will generate an URI for creating a QRCode for the mobile wallet app to scan.
- Connect to mobile wallet app.