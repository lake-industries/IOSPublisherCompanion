import React, { useState } from 'react'

export default function SolarPanelModel({ project }) {
  const [panelAngle, setPanelAngle] = useState(45)
  const [sunIntensity, setSunIntensity] = useState(100)
  const [temperature, setTemperature] = useState(25)

  // Calculate efficiency based on angle and intensity
  const angleEfficiency = Math.cos((panelAngle - 45) * (Math.PI / 180)) * 100
  const tempFactor = Math.max(0, 100 - (temperature - 25) * 0.5)
  const totalEfficiency = (angleEfficiency * sunIntensity * tempFactor) / 10000

  // Calculate power output (simplified model)
  const maxPower = 400 // watts (typical panel)
  const powerOutput = (maxPower * totalEfficiency) / 100

  return (
    <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}>
      <h4 style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 12px 0', color: '#333' }}>
        ☀️ Solar Panel Model: {project.name}
      </h4>

      {/* Visual Panel Representation */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '140px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Sun rays */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          fontSize: '28px',
          opacity: sunIntensity / 100,
          filter: 'drop-shadow(0 0 8px rgba(255,200,0,0.8))'
        }}>
          ☀️
        </div>

        {/* Solar Panel */}
        <div style={{
          width: '120px',
          height: '80px',
          background: 'linear-gradient(to right, #1e90ff, #00bfff)',
          borderRadius: '4px',
          border: '2px solid #0066cc',
          transform: `rotateZ(${panelAngle - 90}deg)`,
          transformOrigin: 'center',
          boxShadow: `0 0 ${sunIntensity / 2}px rgba(30,144,255,0.6)`,
          position: 'relative',
        }}>
          {/* Grid pattern */}
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'linear-gradient(90deg, transparent 24%, #0066cc 25%, #0066cc 26%, transparent 27%, transparent 74%, #0066cc 75%, #0066cc 76%, transparent 77%), linear-gradient(transparent 24%, #0066cc 25%, #0066cc 26%, transparent 27%, transparent 74%, #0066cc 75%, #0066cc 76%, transparent 77%)',
            backgroundSize: '20px 20px',
            borderRadius: '2px',
          }} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
            Panel Angle: <span style={{ color: '#0066cc', fontWeight: '700' }}>{panelAngle.toFixed(0)}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="90"
            value={panelAngle}
            onChange={(e) => setPanelAngle(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>Optimal: 45°</div>
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
            Sun Intensity: <span style={{ color: '#ff9500', fontWeight: '700' }}>{sunIntensity.toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={sunIntensity}
            onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '10px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '4px' }}>
            Temperature: <span style={{ color: '#ff3b30', fontWeight: '700' }}>{temperature.toFixed(0)}°C</span>
          </label>
          <input
            type="range"
            min="-10"
            max="60"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>Higher temp = lower efficiency</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={{
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        padding: '10px',
        marginTop: '12px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px'
      }}>
        <div style={{ textAlign: 'center', padding: '8px', borderRight: '1px solid #e0e0e0' }}>
          <p style={{ fontSize: '9px', color: '#999', margin: '0 0 4px 0', fontWeight: '600' }}>EFFICIENCY</p>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#0066cc', margin: 0 }}>
            {totalEfficiency.toFixed(1)}%
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <p style={{ fontSize: '9px', color: '#999', margin: '0 0 4px 0', fontWeight: '600' }}>POWER OUTPUT</p>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#34C759', margin: 0 }}>
            {powerOutput.toFixed(0)}W
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div style={{
        background: '#FFF3E0',
        border: '1px solid #FFB74D',
        borderRadius: '6px',
        padding: '8px',
        marginTop: '10px',
        fontSize: '9px',
        color: '#E65100'
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>💡 Optimization Tips:</p>
        <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
          {panelAngle < 40 && <li>Increase angle for better performance</li>}
          {panelAngle > 50 && <li>Decrease angle slightly for optimal efficiency</li>}
          {temperature > 40 && <li>Ensure adequate ventilation to reduce heat</li>}
          {sunIntensity < 70 && <li>Consider panel positioning or weather conditions</li>}
        </ul>
      </div>
    </div>
  )
}
