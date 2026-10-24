import { useEffect, useState } from 'react'
import './App.css'

export function App() {
  const [message, setMessage] = useState<string>('Loading...')

  useEffect(() => {
    fetch('/api/test')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`)
        }
        return res.json()
      })
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage(`Error: ${err.message}`))
  }, [])

  return (
    <div className="container">
      <h1>GridBricks</h1>
      <p>API Endpoint: <code>/api/test</code></p>
      <p>Response: <strong>{message}</strong></p>
    </div>
  )
}

export default App
