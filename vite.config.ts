import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Patch @circle-fin/app-kit's hardcoded Arc Testnet RPC URL.
// The package bundles 'https://rpc.testnet.arc.network/' which is unreliable;
// replace it with the stable endpoint at rpc.testnet.arc.io.
function patchArcRpc(): Plugin {
  return {
    name: 'patch-arc-rpc',
    transform(code, id) {
      if (id.includes('@circle-fin/app-kit') && code.includes('rpc.testnet.arc.network')) {
        return {
          code: code.replaceAll(
            'https://rpc.testnet.arc.network/',
            'https://rpc.testnet.arc.io/',
          ),
          map: null,
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [patchArcRpc(), react(), nodePolyfills()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'wagmi',
      'wagmi/chains',
      'wagmi/connectors',
      'viem',
      'viem/chains',
      'connectkit',
      'framer-motion',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process',
    ],
  },
  server: {
    allowedHosts: true,
    cors: true,
    hmr: {
      // The preview is served behind a TLS proxy; HMR WebSocket must use the
      // same host/port as the page so the browser doesn't try a bare ws://
      // connection to localhost which the proxy blocks.
      clientPort: 443,
      protocol: 'wss',
    },
  },
})
