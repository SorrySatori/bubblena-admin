import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitní root — jinak si ho Turbopack odvodí z lockfilů výš v adresářích.
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
}

export default nextConfig
