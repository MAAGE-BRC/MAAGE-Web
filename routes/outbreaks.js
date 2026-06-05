var express = require('express');
var router = express.Router();
var axios = require('axios');
var FeedParser = require('feedparser');
var securityUtils = require('../lib/securityUtils');

var WHO_RSS_FEED = 'https://www.who.int/rss-feeds/news-english.xml';

function parseFeed(url) {
  return new Promise(function (resolve, reject) {
    axios.get(url, {
      responseType: 'stream',
      timeout: 15000
    }).then(function (response) {
      var feedparser = new FeedParser();
      var items = [];

      response.data.on('error', function (err) {
        reject(err);
      });

      feedparser.on('error', function (err) {
        reject(err);
      });

      feedparser.on('readable', function () {
        var item;
        while ((item = this.read())) {
          items.push(item);
        }
      });

      feedparser.on('end', function () {
        resolve(items);
      });

      response.data.pipe(feedparser);
    }).catch(function (err) {
      reject(err);
    });
  });
}

function normalizeText(value, maxLength) {
  var text = securityUtils.sanitizeText(String(value || '')).replace(/\s+/g, ' ').trim();
  if (!maxLength || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 1) + '...';
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  var d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function buildSourceUrlMap(term) {
  var encoded = encodeURIComponent(term);
  return {
    who: 'https://www.who.int/emergencies/disease-outbreak-news?query=' + encoded,
    healthmap: 'https://www.healthmap.org/en/?q=' + encoded,
    promed: 'https://promedmail.org/?s=' + encoded
  };
}

function itemMatchesTerm(item, termLower, tokens) {
  var haystack = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
  if (!haystack) {
    return false;
  }
  if (haystack.indexOf(termLower) !== -1) {
    return true;
  }
  return tokens.some(function (token) {
    return haystack.indexOf(token) !== -1;
  });
}

function normalizeFeedItem(source, item) {
  var title = normalizeText(item && item.title, 220);
  var summary = normalizeText(item && (item.summary || item.description || item.content), 260);
  var link = item && securityUtils.isValidHttpUrl(item.link) ? item.link : null;
  var pubDate = normalizeDate(item && (item.pubdate || item.date || item.pubDate));

  return {
    source: source,
    title: title || 'Untitled alert',
    summary: summary || '',
    link: link,
    pubDate: pubDate
  };
}

function normalizeHealthMapJsonItem(raw) {
  var link = raw && (raw.url || raw.link || raw.alert_url || raw.alertURL || raw.guid);
  if (link && !securityUtils.isValidHttpUrl(link)) {
    link = null;
  }

  return {
    source: 'HealthMap',
    title: normalizeText(raw && (raw.title || raw.headline || raw.summary), 220) || 'Untitled alert',
    summary: normalizeText(raw && (raw.description || raw.summary || raw.snippet), 260),
    link: link,
    pubDate: normalizeDate(raw && (raw.pubDate || raw.date || raw.timestamp || raw.reportDate))
  };
}

async function fetchWhoAlerts(termLower, tokens, maxItems) {
  var rawItems = await parseFeed(WHO_RSS_FEED);

  return rawItems
    .map(function (item) { return normalizeFeedItem('WHO', item); })
    .filter(function (item) { return item.link && itemMatchesTerm(item, termLower, tokens); })
    .sort(function (a, b) { return (b.pubDate || '').localeCompare(a.pubDate || ''); })
    .slice(0, maxItems);
}

function buildGoogleNewsRssUrl(term, siteDomain) {
  var query = '"' + term + '" site:' + siteDomain + ' outbreak';
  return 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=' + encodeURIComponent(query);
}

async function fetchPromedAlerts(term, maxItems) {
  var rawItems = await parseFeed(buildGoogleNewsRssUrl(term, 'promedmail.org'));

  return rawItems
    .map(function (item) {
      var normalized = normalizeFeedItem('ProMED', item);
      if (!normalized.summary) {
        normalized.summary = 'Matched ProMED report mention';
      }
      return normalized;
    })
    .filter(function (item) { return item.link; })
    .sort(function (a, b) { return (b.pubDate || '').localeCompare(a.pubDate || ''); })
    .slice(0, maxItems);
}

async function fetchHealthMapAlerts(term, termLower, tokens, maxItems) {
  var rawItems = await parseFeed(buildGoogleNewsRssUrl(term, 'healthmap.org'));

  return rawItems
    .map(function (item) { return normalizeFeedItem('HealthMap', item); })
    .filter(function (item) { return item.link && itemMatchesTerm(item, termLower, tokens); })
    .sort(function (a, b) { return (b.pubDate || '').localeCompare(a.pubDate || ''); })
    .slice(0, maxItems);
}

function summarizeAlerts(species, totals, highlights) {
  var total = totals.total || 0;
  if (!total) {
    return 'No recent matching alerts found for ' + species + ' in WHO, HealthMap, or ProMED.';
  }

  var prefix = 'Found ' + total + ' recent alerts for ' + species +
    ' across WHO (' + totals.WHO + '), HealthMap (' + totals.HealthMap + '), and ProMED (' + totals.ProMED + ').';

  if (!highlights.length) {
    return prefix;
  }

  var latest = highlights.slice(0, 2).map(function (item) {
    var dateText = item.pubDate ? item.pubDate.substring(0, 10) : 'undated';
    return item.source + ': ' + item.title + ' (' + dateText + ')';
  }).join(' | ');

  return prefix + ' Latest signals: ' + latest;
}

function buildTermContext(term) {
  var normalized = normalizeText(term, 150);
  var lower = normalized.toLowerCase();
  var tokens = lower.split(/[^a-z0-9]+/).filter(function (token) {
    return token.length >= 4;
  });

  return {
    term: normalized,
    lower: lower,
    tokens: tokens
  };
}

function mergeAlertsByUniq(items, maxItems) {
  var seen = {};
  var merged = [];

  items.forEach(function (item) {
    var key = [item.source || '', item.link || '', item.title || ''].join('|');
    if (!key || seen[key]) {
      return;
    }
    seen[key] = true;
    merged.push(item);
  });

  merged.sort(function (a, b) {
    return (b.pubDate || '').localeCompare(a.pubDate || '');
  });

  return merged.slice(0, maxItems);
}

async function fetchWhoAlertsForTerms(termContexts, maxItems) {
  var rawItems = await parseFeed(WHO_RSS_FEED);
  var all = rawItems
    .map(function (item) { return normalizeFeedItem('WHO', item); })
    .filter(function (item) {
      if (!item.link) {
        return false;
      }
      return termContexts.some(function (ctx) {
        return itemMatchesTerm(item, ctx.lower, ctx.tokens);
      });
    });

  return mergeAlertsByUniq(all, maxItems);
}

async function fetchHealthMapAlertsForTerms(termContexts, maxItems) {
  var all = [];
  for (var i = 0; i < termContexts.length; i++) {
    var ctx = termContexts[i];
    var alerts = await fetchHealthMapAlerts(ctx.term, ctx.lower, ctx.tokens, maxItems);
    all = all.concat(alerts);
  }

  return mergeAlertsByUniq(all, maxItems);
}

async function fetchPromedAlertsForTerms(termContexts, maxItems) {
  var all = [];
  for (var i = 0; i < termContexts.length; i++) {
    var ctx = termContexts[i];
    var alerts = await fetchPromedAlerts(ctx.term, maxItems);
    all = all.concat(alerts);
  }

  return mergeAlertsByUniq(all, maxItems);
}

router.get('/alerts', async function (req, res) {
  var species = normalizeText(req.query.species, 150);
  if (!species || species.length < 3) {
    return res.status(400).json({ message: 'A valid species query term is required.' });
  }

  var altTerm = normalizeText(req.query.altTerm, 150);

  var count = securityUtils.validateIntegerInRange(req.query.count, 1, 15, 8);
  var queryTerms = [species];
  if (altTerm && altTerm.toLowerCase() !== species.toLowerCase()) {
    queryTerms.push(altTerm);
  }

  var termContexts = queryTerms.map(buildTermContext).filter(function (ctx) {
    return !!ctx.term;
  });

  var results = await Promise.allSettled([
    fetchWhoAlertsForTerms(termContexts, count),
    fetchHealthMapAlertsForTerms(termContexts, count),
    fetchPromedAlertsForTerms(termContexts, count)
  ]);

  var bySource = { WHO: [], HealthMap: [], ProMED: [] };
  var sourceErrors = [];

  if (results[0].status === 'fulfilled') {
    bySource.WHO = results[0].value;
  } else {
    sourceErrors.push('WHO');
    console.error('WHO alert retrieval failed:', results[0].reason);
  }

  if (results[1].status === 'fulfilled') {
    bySource.HealthMap = results[1].value;
  } else {
    sourceErrors.push('HealthMap');
    console.error('HealthMap alert retrieval failed:', results[1].reason);
  }

  if (results[2].status === 'fulfilled') {
    bySource.ProMED = results[2].value;
  } else {
    sourceErrors.push('ProMED');
    console.error('ProMED alert retrieval failed:', results[2].reason);
  }

  var highlights = bySource.WHO.concat(bySource.HealthMap, bySource.ProMED)
    .sort(function (a, b) {
      return (b.pubDate || '').localeCompare(a.pubDate || '');
    })
    .slice(0, count);

  var totals = {
    WHO: bySource.WHO.length,
    HealthMap: bySource.HealthMap.length,
    ProMED: bySource.ProMED.length
  };
  totals.total = totals.WHO + totals.HealthMap + totals.ProMED;

  res.json({
    species: species,
    queryTerms: queryTerms,
    generatedAt: new Date().toISOString(),
    sourceUrls: buildSourceUrlMap(species),
    totals: totals,
    summary: summarizeAlerts(species, totals, highlights),
    highlights: highlights,
    bySource: bySource,
    unavailableSources: sourceErrors
  });
});

/* GET home page. */
router.get('*', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('p3app', { title: 'PATRIC', request: req, response: res });
});

module.exports = router;
