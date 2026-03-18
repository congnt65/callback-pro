'use client'

import { useState } from 'react'

interface Props {
  endpointId: string
  requestCount: number
}

export default function EndpointHeader({ endpointId, requestCount }: Props) {
  const [copied, setCopied] = useState(false)
  const [showFull, setShowFull] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const hookUrl = origin + '/api/hook/' + endpointId
  const displayUrl = showFull
    ? hookUrl
    : hookUrl.slice(0, hookUrl.length - endpointId.length) + endpointId.slice(0, 8) + '...'

  function copy() {
    navigator.clipboard.writeText(hookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function toggleFull() {
    setShowFull(prev => prev ? false : true)
  }

  const pct = Math.min(100, (requestCount / 500) * 100)
  const barColor = pct >= 90 ? '#f85149' : pct >= 70 ? '#d29922' : '#3fb950'

  return (
    <div style={{ borderColor: '#30363d', backgroundColor: '#0d1117' }} className='px-4 py-3 border-b shrink-0'>
      <div className='flex items-center gap-2 mb-2'>
        <span style={{ color: '#8b949e' }} className='text-xs shrink-0'>Endpoint URL</span>
        <div style={{ backgroundColor: '#161b22', borderColor: '#30363d' }}
          className='flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5 rounded border overflow-hidden'>
          <span
            style={{ color: '#58a6ff', fontFamily: 'monospace' }}
            className='text-xs truncate flex-1 cursor-pointer select-all'
            onClick={toggleFull}
            title={hookUrl}
          >
            {displayUrl}
          </span>
          <button onClick={copy} style={{ color: copied ? '#3fb950' : '#8b949e' }}
            className='text-xs shrink-0 hover:opacity-80 transition-colors' title='Copy URL'>
            {copied ? (
              <svg width='14' height='14' viewBox='0 0 16 16' fill='currentColor'>
                <path d='M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z'/>
              </svg>
            ) : (
              <svg width='14' height='14' viewBox='0 0 16 16' fill='currentColor'>
                <path d='M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z'/>
                <path d='M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z'/>
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <div className='flex-1 h-1 rounded-full' style={{ backgroundColor: '#21262d' }}>
          <div className='h-1 rounded-full transition-all duration-300'
            style={{ width: pct + '%', backgroundColor: barColor }} />
        </div>
        <span style={{ color: '#6e7681' }} className='text-xs shrink-0'>{requestCount} / 500</span>
      </div>
    </div>
  )
}