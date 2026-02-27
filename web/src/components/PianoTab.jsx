import React, { useState } from 'react'

export default function PianoTab({ isRunning, audioContext, setAudioContext }) {
  const [recordingNotes, setRecordingNotes] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [isPlayingLoop, setIsPlayingLoop] = useState(false)
  const [recordStartTime, setRecordStartTime] = useState(null)

  const playNote = (frequency, duration = 0.2) => {
    if (!audioContext) return
    const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)()
    if (!audioContext) setAudioContext(ctx)
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.value = frequency
    osc.type = 'triangle'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)

    // Record note if recording
    if (isRecording && recordStartTime) {
      const noteTime = Date.now() - recordStartTime
      setRecordingNotes(prev => [...prev, { frequency, duration, time: noteTime }])
    }
  }

  const initAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      setAudioContext(ctx)
    }
  }

  const startRecording = () => {
    setRecordingNotes([])
    setRecordStartTime(Date.now())
    setIsRecording(true)
  }

  const stopRecording = () => {
    setIsRecording(false)
    setRecordStartTime(null)
  }

  const playLoop = async () => {
    if (recordingNotes.length === 0 || !audioContext) return
    setIsPlayingLoop(true)
    
    const ctx = audioContext
    const startTime = Date.now()
    
    // Get the max time from recorded notes to know loop duration
    const maxTime = Math.max(...recordingNotes.map(n => n.time + n.duration * 1000))
    
    // Playback loop
    const playbackInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      if (elapsed > maxTime) {
        clearInterval(playbackInterval)
        setIsPlayingLoop(false)
        return
      }
      
      // Find and play notes that should play at this time
      recordingNotes.forEach(note => {
        if (Math.abs(note.time - elapsed) < 50) { // 50ms tolerance
          playNote(note.frequency, note.duration)
        }
      })
    }, 10)
  }

  const clearLoop = () => {
    setRecordingNotes([])
    setIsRecording(false)
    setRecordStartTime(null)
    setIsPlayingLoop(false)
  }

  const notes = [
    { name: 'C', freq: 261.63, key: 'C' },
    { name: 'D', freq: 293.66, key: 'D' },
    { name: 'E', freq: 329.63, key: 'E' },
    { name: 'F', freq: 349.23, key: 'F' },
    { name: 'G', freq: 392.00, key: 'G' },
    { name: 'A', freq: 440.00, key: 'A' },
    { name: 'B', freq: 493.88, key: 'B' },
  ]

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Piano Synth</h3>
      
      {/* Looper Controls */}
      <div style={{ background: '#FFF3E0', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #FFB74D' }}>
        <p style={{ fontSize: '11px', fontWeight: '600', color: '#E65100', marginBottom: '8px', margin: '0 0 8px 0' }}>🔄 Looper</p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isRunning}
            style={{
              padding: '6px 10px',
              background: isRecording ? '#FF5722' : '#FF9800',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: isRunning ? 'pointer' : 'not-allowed',
              opacity: isRunning ? 1 : 0.5,
              animation: isRecording ? 'pulse 0.8s infinite' : 'none',
            }}
          >
            {isRecording ? '⏹ Stop Recording' : '● Record'}
          </button>
          <button
            onClick={playLoop}
            disabled={recordingNotes.length === 0 || !isRunning || isRecording || isPlayingLoop}
            style={{
              padding: '6px 10px',
              background: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: (recordingNotes.length > 0 && isRunning && !isRecording && !isPlayingLoop) ? 'pointer' : 'not-allowed',
              opacity: (recordingNotes.length > 0 && isRunning && !isRecording) ? 1 : 0.5,
            }}
          >
            {isPlayingLoop ? '▶ Playing...' : '▶ Play Loop'}
          </button>
          <button
            onClick={clearLoop}
            disabled={recordingNotes.length === 0 || !isRunning}
            style={{
              padding: '6px 10px',
              background: '#F44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: (recordingNotes.length > 0 && isRunning) ? 'pointer' : 'not-allowed',
              opacity: (recordingNotes.length > 0 && isRunning) ? 1 : 0.5,
            }}
          >
            🗑 Clear
          </button>
        </div>
        {recordingNotes.length > 0 && (
          <p style={{ fontSize: '10px', color: '#E65100', margin: '0' }}>
            📝 {recordingNotes.length} note{recordingNotes.length !== 1 ? 's' : ''} recorded
            {isPlayingLoop && ' • Currently playing'}
          </p>
        )}
      </div>

      {/* Piano Keys */}
      <button
        onClick={initAudioContext}
        disabled={!isRunning}
        style={{
          padding: '8px 12px',
          background: isRunning ? '#34C759' : '#ccc',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          cursor: isRunning ? 'pointer' : 'not-allowed',
          marginBottom: '12px',
          opacity: isRunning ? 1 : 0.5,
        }}
      >
        🎵 Enable Audio
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', opacity: isRunning ? 1 : 0.4, pointerEvents: isRunning ? 'auto' : 'none' }}>
        {notes.map(note => (
          <button
            key={note.key}
            onMouseDown={() => playNote(note.freq)}
            style={{
              padding: '20px 8px',
              background: '#fff',
              border: '2px solid #007AFF',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.1s',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#007AFF'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = '#000'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {note.name}
            <br />
            <span style={{ fontSize: '10px' }}>{note.key}</span>
          </button>
        ))}
      </div>
      <p style={{ fontSize: '10px', color: '#666', marginTop: '12px' }}>
        Click keys to play notes or use keyboard: C, D, E, F, G, A, B
      </p>
    </div>
  )
}
