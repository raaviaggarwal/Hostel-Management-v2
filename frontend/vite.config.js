// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       '/api': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//       },
//     },
//   },
//   build: {
//     rolldownOptions: {
//       output: {
//         codeSplitting: {
//           groups: [
//             {
//               name: 'vendor',
//               test: /node_modules/,
//               priority: 1,
//               maxSize: 400 * 1024,
//               minSize: 60 * 1024,
//             },
//           ],
//         },
//       },
//     },
//   },
// })


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})