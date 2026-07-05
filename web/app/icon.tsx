import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  const logoPath = join(process.cwd(), 'public', 'logo.jpg')
  const logoData = readFileSync(logoPath)
  const base64 = logoData.toString('base64')
  
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <img
          src={`data:image/jpeg;base64,${base64}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    ),
    { ...size }
  )
}
