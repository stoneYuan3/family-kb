// The separation here matters — `routes` define your URL patterns, `controllers` hold the actual logic for each endpoint, and `db` handles the database connection. This keeps things organized as the project grows. `server.js` is the entry point that just starts listening, and `app.js` is where you configure Express and attach your routes.
const express = require('express');
const usersRoutes = require('./routes/users');
const collectionsRoutes = require('./routes/collections');
const itemsRoutes = require('./routes/items');
const documentsRoutes = require('./routes/documents');
const authRoutes = require('./routes/auth');
const path = require('path');

const app = express()

app.use(express.json())

const cors = require('cors');  // add near the top with other requires
// add this BEFORE your routes, right after `const app = express()`
app.use(cors({ origin: 'http://localhost:3001' }));

app.use('/api/users', usersRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api', documentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req,res) => {
    res.json({status: 'ok'});
})

module.exports = app;