const express = require('express');
const cors = require('cors');
const { scrapeAll } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

let cachedOdds = [];
let lastScrape = null;

async function runScraper() {
  try {
    console.log('Starting scrape...');
    cachedOdds = await scrapeAll();
    lastScrape = new Date();
    console.log('Scrape complete. Events found:', cachedOdds.length);
  } catch (err) {
    console.error('Scrape failed:', err.message);
  }
}

app.get('/odds', (req, res) => {
  res.json({
    data: cachedOdds,
    lastScrape,
    total: cachedOdds.length
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', lastScrape, total: cachedOdds.length });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Scraper running on port', PORT);
  runScraper();
  setInterval(runScraper, 5 * 60 * 1000);
});
