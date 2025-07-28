import { useEffect, useRef, useState } from 'react'

const getWsUrl = () => {
  if (window.location.protocol === 'https:'){
    return "wss://chat-room-backend-apho.onrender.com";
  }
  return "ws://localhost:8080";
}

const WS_URL = getWsUrl();

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  type: 'chat' | 'system';
}

interface RoomInfo {
  roomCode: string;
  userCount: number;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<'lobby' | 'chat'>('lobby')
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [notification, setNotification] = useState('')
  
  const wsRef = useRef<WebSocket | null>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const roomCodeInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  useEffect(() => {
    if (currentScreen === 'chat' && username && roomCode) {
      connectToRoom()
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [currentScreen, username, roomCode])

  const generateRoomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  const createNewRoom = () => {
    const name = usernameInputRef.current?.value?.trim()
    if (!name) {
      showNotification('Please enter your name!')
      return
    }
    
    const newRoomCode = generateRoomCode()
    setUsername(name)
    setRoomCode(newRoomCode)
    setCurrentScreen('chat')
  }

  const joinExistingRoom = () => {
    const name = usernameInputRef.current?.value?.trim()
    const code = roomCodeInputRef.current?.value?.trim().toUpperCase()
    
    if (!name) {
      showNotification('Please enter your name!')
      return
    }
    
    if (!code) {
      showNotification('Please enter a room code!')
      return
    }
    
    setUsername(name)
    setRoomCode(code)
    setCurrentScreen('chat')
  }

  const connectToRoom = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setIsConnected(true)
      showNotification(`Connected to room: ${roomCode}`)
      ws.send(JSON.stringify({
        type: 'join',
        payload: {
          username,
          roomCode
        }
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'message') {
          setMessages(prev => [...prev, data.payload])
        } else if (data.type === 'roomInfo') {
          setRoomInfo(data.payload)
        } else if (data.type === 'notification') {
          showNotification(data.payload.message)
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      showNotification('Disconnected from server.')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
      showNotification('Connection failed. Please try again.')
    }

    wsRef.current = ws
  }

  const sendMessage = () => {
    const messageText = messageInputRef.current?.value?.trim()
    if (!messageText || !wsRef.current || !isConnected) return

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      payload: {
        message: messageText
      }
    }))

    if (messageInputRef.current) {
      messageInputRef.current.value = ''
    }
  }

  const handleEnterKey = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  const copyRoomCodeToClipboard = () => {
    const textArea = document.createElement("textarea");
    textArea.value = roomCode;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showNotification('Room code copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy room code.');
    }
    document.body.removeChild(textArea);
  }

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(''), 3000)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const leaveCurrentRoom = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    setCurrentScreen('lobby')
    setMessages([])
    setRoomInfo(null)
    setUsername('')
    setRoomCode('')
  }

  if (currentScreen === 'lobby') {
    return (
      <div className='min-h-screen bg-black flex items-center justify-center p-4' style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        `}</style>
        
        <div className='bg-gray-900 rounded-xl p-8 w-full max-w-md border border-gray-700 shadow-2xl'>
          <div className='text-center mb-8'>
            <div className='flex items-center justify-center gap-3 mb-3'>
              <div className='w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center'>
                <span className='text-white text-lg'>💬</span>
              </div>
              <h1 className='text-3xl font-bold text-white tracking-tight'>ChatFlow</h1>
            </div>
            <p className='text-gray-400 text-sm font-medium'>Instant messaging • Temporary rooms</p>
          </div>

          <input
            ref={usernameInputRef}
            type='text'
            placeholder='Enter your display name'
            className='w-full bg-gray-800 text-white p-4 rounded-xl mb-6 border border-gray-600 focus:border-gray-500 focus:outline-none transition-all duration-200 font-medium placeholder-gray-500'
            onKeyPress={(e) => handleEnterKey(e, createNewRoom)}
          />

          <button
            onClick={createNewRoom}
            className='w-full bg-gray-700 text-white py-4 rounded-xl cursor-pointer font-semibold mb-6 hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
          >
            Create New Room
          </button>

          <div className='relative mb-4'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-gray-700'></div>
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='bg-gray-900 px-4 text-gray-500 font-medium'>or join existing</span>
            </div>
          </div>

          <div className='flex gap-3'>
            <input
              ref={roomCodeInputRef}
              type='text'
              placeholder='Room Code'
              className='flex-1 bg-gray-800 text-white p-4 rounded-xl border border-gray-600 focus:border-gray-500 focus:outline-none uppercase font-mono tracking-wider transition-all duration-200 placeholder-gray-500'
              onKeyPress={(e) => handleEnterKey(e, joinExistingRoom)}
              onChange={(e) => e.target.value = e.target.value.toUpperCase()}
            />
            <button
              onClick={joinExistingRoom}
              className='bg-gray-700 text-white px-6 py-4 cursor-pointer rounded-xl font-semibold hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl'
            >
              Join
            </button>
          </div>
        </div>

        {notification && (
          <div className='fixed top-5 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 text-white px-6 py-3 rounded-xl flex items-center gap-3 shadow-xl transition-all duration-300 animate-pulse'>
            <span className='font-medium'>{notification}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='h-screen bg-black flex flex-col' style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(107, 114, 128, 0.5); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.8); }
      `}</style>
      
      <div className='bg-gray-900 w-full h-full flex flex-col'>
        
        <div className='bg-gray-800 p-5 flex justify-between items-center border-b border-gray-700'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center'>
              <span className='text-white text-lg'>💬</span>
            </div>
            <h1 className='text-xl font-bold text-white tracking-tight'>ChatFlow</h1>
          </div>
          <button
            onClick={leaveCurrentRoom}
            className='text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-600 rounded-lg'
            title='Leave room'
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
            </svg>
          </button>
        </div>

        <div className='bg-gray-800 px-5 py-3 flex justify-between items-center border-b border-gray-700'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <div className={`w-2 h-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
              <span className='text-gray-400 text-sm font-medium'>Room:</span>
            </div>
            <span className='text-white font-mono font-semibold tracking-wider text-lg'>{roomCode}</span>
            <button
              onClick={copyRoomCodeToClipboard}
              className='text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-600 rounded'
              title='Copy room code'
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 bg-gray-500 rounded-full'></div>
            <span className='text-gray-400 text-sm font-medium'>
              {roomInfo?.userCount || 1} user{(roomInfo?.userCount || 1) !== 1 ? 's' : ''} online
            </span>
          </div>
        </div>

        <div 
          className='flex-1 p-5 overflow-y-auto bg-gray-900 custom-scrollbar'
        >
          {messages.length === 0 ? (
            <div className='text-center text-gray-500 flex flex-col justify-center items-center h-full'>
              <div className='text-6xl mb-4'>👋</div>
              <p className='text-lg font-medium mb-2'>Welcome to your chat room!</p>
              <p className='text-sm'>Share the room code with others to start chatting.</p>
            </div>
          ) : (
            <div className='space-y-4'>
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === 'system' ? (
                    <div className='text-center'>
                      <div className='inline-block bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-full font-medium'>
                        {msg.message}
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col'>
                      <div className='flex items-center gap-3 mb-2'>
                        <div className='w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-bold'>
                          {msg.username.charAt(0).toUpperCase()}
                        </div>
                        <span className='text-gray-400 font-semibold text-sm'>
                          {msg.username}
                        </span>
                        <span className='text-gray-500 text-xs font-medium'>
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      <div className='ml-9'>
                        <div className='bg-gray-700 text-white rounded-2xl px-4 py-3 inline-block max-w-[75%] break-words shadow-lg'>
                          <p className='leading-relaxed'>{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className='p-5 bg-gray-800 border-t border-gray-700'>
          <div className='flex gap-3'>
            <input
              ref={messageInputRef}
              type='text'
              placeholder={isConnected ? 'Type your message...' : 'Connecting...'}
              className='flex-1 bg-gray-700 text-white p-4 rounded-xl border border-gray-600 focus:border-gray-500 focus:outline-none transition-all duration-200 font-medium placeholder-gray-500'
              onKeyPress={(e) => handleEnterKey(e, sendMessage)}
              disabled={!isConnected}
            />
            <button
              onClick={sendMessage}
              disabled={!isConnected}
              className={`px-8 py-4 rounded-xl font-semibold transition-all duration-200 ${
                isConnected 
                  ? 'bg-gray-600 text-white hover:bg-gray-500 shadow-lg hover:shadow-xl transform hover:scale-[1.02]' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Send
            </button>
          </div>
          
          {!isConnected && (
            <div className='flex items-center justify-center gap-2 mt-3'>
              <div className='w-2 h-2 bg-red-500 rounded-full animate-ping'></div>
              <p className='text-red-400 text-sm font-medium'>
                Disconnected. Attempting to reconnect...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
