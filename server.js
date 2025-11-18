const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'pairing_site')));

// Body parser to handle form data (if needed)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pairing_site', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

