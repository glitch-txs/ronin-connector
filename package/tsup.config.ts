import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'es2021',
  clean: true,
  bundle: true,
  dts: true,
  platform:'browser',
  external:['wagmi', 'viem', 'typescript']
})