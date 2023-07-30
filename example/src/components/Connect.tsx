import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi'
import QRCode from "react-qr-code"

type DataUriEvent = {
  uri: string,
  mobile: boolean
}

type Args = {
  type: string;
  data?: unknown;
}

export default function Connect() {
  const { connector: activeConnector, isConnected, address } = useAccount()
  const { chain } = useNetwork()
  const { disconnect } = useDisconnect()
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  
  const [uri, setUri] = useState<string>('')
  console.log(chain)
  useEffect(()=>{
    const handleUri = (args: Args)=>{
      if(args.type === 'display_uri'){
        const { mobile, uri } = args.data as DataUriEvent

        // If user is on mobile device we don't need to generate the QRCode
        if(mobile) return

        setUri(uri)
      }
    }
    connectors[0].on('message', handleUri)

    return ()=>{
      connectors[0].off('message', handleUri)
    }
  },[connectors])
 
  return (
    <>
      {isConnected && <div>Connected to {activeConnector?.name} as {address} <br/> chain: {chain?.name} </div>}

      {isConnected ? <button onClick={()=>disconnect()}>Disconnect</button> :
      connectors.map((connector) => (
        <button
          disabled={!connector.ready}
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {isLoading &&
            pendingConnector?.id === connector.id &&
            ' (connecting)'}
        </button>
      ))}
 
      {error && <div>{error.message}</div>}

      { uri && (
      <>
        Scan With Your Phone
        <br/>
        <QRCode size={300} level='M' value={uri} bgColor='#101010' fgColor='#fff' />
      </>) }
    </>
  )
}