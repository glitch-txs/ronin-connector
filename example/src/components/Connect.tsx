import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import QRCode from "react-qr-code"

export default function Connect() {
  const { connector: activeConnector, isConnected, address } = useAccount()
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  
  const [uri, setUri] = useState<string>('')

  useEffect(()=>{
    connectors[0].on('message', (args)=>{
      if(args.type === 'display_uri'){
        setUri(args.data as string)
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