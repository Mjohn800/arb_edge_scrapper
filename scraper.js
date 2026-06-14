const puppeteer = require('puppeteer');

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ]
  });
}

async function scrapePage(page, url, config) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector(config.eventSelector, { timeout: 10000 }).catch(() => {});
  return page.evaluate((config) => {
    const events = [];
    document.querySelectorAll(config.eventSelector).forEach(el => {
      const teams = el.querySelectorAll(config.teamSelector);
      const odds = el.querySelectorAll(config.oddsSelector);
      if (teams.length >= 2 && odds.length >= 2) {
        const home = teams[0]?.innerText?.trim();
        const away = teams[1]?.innerText?.trim();
        const o1 = parseFloat(odds[0]?.innerText);
        const draw = parseFloat(odds[1]?.innerText);
        const o2 = parseFloat(odds[2]?.innerText);
        if (!home || !away) return;
        events.push({
          id: config.key + '_' + Math.random().toString(36).substr(2, 9),
          home_team: home,
          away_team: away,
          bookmakers: [{
            key: config.key,
            title: config.name,
            markets: [{
              key: 'h2h',
              outcomes: [
                o1 > 1 ? { name: home, price: o1 } : null,
                draw > 1 ? { name: 'Draw', price: draw } : null,
                o2 > 1 ? { name: away, price: o2 } : null,
              ].filter(Boolean)
            }]
          }]
        });
      }
    });
    return events;
  }, config);
}

const BOOK_CONFIGS = {
  sportybet: {
    key: 'sportybet', name: 'SportyBet',
    url: 'https://www.sportybet.com/gh/sport/football',
    eventSelector: '.soccer-event, .event-item, [class*="event"]',
    teamSelector: '.team-name, [class*="team"], [class*="participant"]',
    oddsSelector: '.odd-value, [class*="odd"], [class*="price"]',
  },
  betway: {
    key: 'betway', name: 'Betway',
    url: 'https://www.betway.com.gh/sports/soccer',
    eventSelector: '[class*="event-row"], [class*="match-row"]',
    teamSelector: '[class*="team"], [class*="participant"]',
    oddsSelector: '[class*="odd"], [class*="price"], button[class*="bet"]',
  },
  '1xbet': {
    key: '1xbet', name: '1xBet',
    url: 'https://1xbet.com/en/line/football',
    eventSelector: '.c-events__item, [class*="event-row"]',
    teamSelector: '.c-events__team, [class*="team-name"]',
    oddsSelector: '.c-bets__bet, [class*="coef"]',
  },
  betano: {
    key: 'betano', name: 'Betano',
    url: 'https://www.betano.com.gh/sport/football',
    eventSelector: '[class*="event-row"], [class*="game-row"]',
    teamSelector: '[class*="participant"], [class*="team"]',
    oddsSelector: '[class*="odd"], [class*="price"]',
  },
  msport: {
    key: 'msport', name: 'MSport',
    url: 'https://www.msport.com/gh/football',
    eventSelector: '[class*="event"], [class*="match-item"]',
    teamSelector: '[class*="team"], [class*="name"]',
    oddsSelector: '[class*="odd"], [class*="price"]',
  },
  melbet: {
    key: 'melbet', name: 'MelBet',
    url: 'https://melbet.com/en/sport/football',
    eventSelector: '[class*="event-row"], [class*="game-row"]',
    teamSelector: '[class*="team"], [class*="name"]',
    oddsSelector: '[class*="odd"], [class*="coef"]',
  },
  bet365: {
    key: 'bet365', name: 'Bet365',
    url: 'https://www.bet365.com/#/AS/B1/',
    eventSelector: '[class*="event"], [class*="fixture"]',
    teamSelector: '[class*="participant"], [class*="team"]',
    oddsSelector: '[class*="odds"], [class*="price"], [class*="btn-odds"]',
  },
  pinnacle: {
    key: 'pinnacle', name: 'Pinnacle',
    url: 'https://www.pinnacle.com/en/soccer/matchups',
    eventSelector: '[class*="event"], [class*="match"]',
    teamSelector: '[class*="participant"], [class*="team"]',
    oddsSelector: '[class*="price"], [class*="odds"]',
  },
  betfair: {
    key: 'betfair_ex_eu', name: 'Betfair',
    url: 'https://www.betfair.com/exchange/plus/football',
    eventSelector: '[class*="event"], [class*="market"]',
    teamSelector: '[class*="runner"], [class*="team"]',
    oddsSelector: '[class*="lay"], [class*="back"], [class*="price"]',
  },
  marathonbet: {
    key: 'marathonbet', name: 'MarathonBet',
    url: 'https://www.marathonbet.com/en/betting/Football',
    eventSelector: '[class*="event"], tr[class*="event"]',
    teamSelector: '[class*="team"], [class*="opponent"]',
    oddsSelector: '[class*="odd"], [class*="coef"], td[class*="price"]',
  },
  unibet: {
    key: 'unibet_eu', name: 'Unibet',
    url: 'https://www.unibet.com/betting/sports/filter/football/all/matches',
    eventSelector: '[class*="event"], [class*="match"]',
    teamSelector: '[class*="participant"], [class*="team"]',
    oddsSelector: '[class*="odd"], [class*="price"]',
  },
  williamhill: {
    key: 'williamhill', name: 'William Hill',
    url: 'https://www.williamhill.com/sports/football',
    eventSelector: '[class*="event"], [class*="match"]',
    teamSelector: '[class*="team"], [class*="participant"]',
    oddsSelector: '[class*="odd"], [class*="price"], [class*="decimal"]',
  },
  footballcom: {
    key: 'footballcom', name: 'Football.com',
    url: 'https://www.football.com/betting/football',
    eventSelector: '[class*="event"], [class*="match"]',
    teamSelector: '[class*="team"], [class*="participant"]',
    oddsSelector: '[class*="odd"], [class*="price"]',
  },
};

function mergeEventsByMatch(allEvents) {
  const merged = {};
  for (const ev of allEvents) {
    if (!ev.home_team || !ev.away_team) continue;
    const key = (ev.home_team + '_vs_' + ev.away_team).toLowerCase().replace(/\s+/g, '');
    if (!merged[key]) {
      merged[key] = {
        id: ev.id,
        home_team: ev.home_team,
        away_team: ev.away_team,
        sport_key: 'soccer_epl',
        commence_time: new Date().toISOString(),
        bookmakers: []
      };
    }
    merged[key].bookmakers.push(...ev.bookmakers);
  }
  return Object.values(merged).filter(ev => ev.bookmakers.length >= 2);
}

async function scrapeAll() {
  const browser = await launchBrowser();
  const allEvents = [];

  for (const [name, config] of Object.entries(BOOK_CONFIGS)) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
    await page.setViewport({ width: 390, height: 844 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    try {
      console.log('Scraping', config.name, '...');
      const events = await scrapePage(page, config.url, config);
      console.log(config.name, ':', events.length, 'events found');
      allEvents.push(...events);
    } catch (err) {
      console.error(config.name, 'failed:', err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Total raw events:', allEvents.length);
  return mergeEventsByMatch(allEvents);
}

module.exports = { scrapeAll };
