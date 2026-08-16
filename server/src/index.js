import 'dotenv/config'
import { createApp } from './app.js'

const port = process.env.PORT || 5000

createApp().listen(port, () => {
  console.log(`Hostel Management API listening on :${port}`)
})