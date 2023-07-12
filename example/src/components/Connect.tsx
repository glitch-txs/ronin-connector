import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import QRCode from "react-qr-code"

type DataUriEvent = {
  uri: string,
  mobile: boolean
}

export default function Connect() {
  const { connector: activeConnector, isConnected, address } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  
  const [uri, setUri] = useState<string>('')

  useEffect(()=>{
    connectors[0].on('message', (args)=>{
      if(args.type === 'display_uri'){
        const { mobile, uri } = args.data as DataUriEvent

        // If user is on mobile device we don't need to generate the QRCode
        if(mobile) return

        setUri(uri)
      }
    })

    return ()=>connectors[0].off('message', console.log) as any
  },[])
 
  return (
    <>
      {isConnected && <div>Connected to {activeConnector?.name} as {address}</div>}

      {connectors.map((connector) => (
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

      <button onClick={()=>connectors[0].disconnect()}>Disconnect</button>
 
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