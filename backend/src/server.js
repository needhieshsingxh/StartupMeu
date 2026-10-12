require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { getJwtSecret } = require('./middleware/auth');

const port = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure it.');
  }
  // Validate that JWT_SECRET is configured and sufficiently strong before accepting traffic
  getJwtSecret();

  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`StartupMeu Connect API listening on port ${port}`));
}

start().catch((error) => {
  console.error(`Unable to start StartupMeu Connect API: ${error.message}`);
  process.exit(1);
});
