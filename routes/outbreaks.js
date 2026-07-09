var express = require('express');
var router = express.Router();
var axios = require('axios');
var FeedParser = require('feedparser');
var securityUtils = require('../lib/securityUtils');

// WHO Disease Outbreak News (DON) API — returns dated, structured outbreak
// reports. The old general news RSS feed (news-english.xml) was press releases,
// not outbreaks, so species filtering almost never matched.
var WHO_DON_API = 'https://www.who.int/api/news/diseaseoutbreaknews';
var WHO_DON_ITEM_BASE = 'https://www.who.int/emergencies/disease-outbreak-news/item/';

// Only surface alerts published in the current year or the year before.
var ALERT_MIN_YEAR = new Date().getFullYear() - 1;

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

function fetchJson(url) {
  return axios.get(url, {
    responseType: 'json',
    timeout: 15000,
    headers: { accept: 'application/json' }
  }).then(function (response) {
    return response.data;
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

function buildSourceUrlMap(queryTerms) {
  // Link buttons must reproduce the SAME query the widget ran. The widget
  // searches all query terms (species plus an optional alternate name), so a
  // link built from only the species under-returns compared to what is shown.
  var terms = Array.isArray(queryTerms) ? queryTerms.filter(Boolean) : [queryTerms];
  var primary = terms[0] || '';

  // Google News honors an OR of quoted phrases, matching the merged results.
  var googleQuery = terms.map(function (t) { return '"' + t + '"'; }).join(' OR ');

  // WHO's site search is a Google Custom Search Engine. The working search URL
  // carries the term in both the server (?q=) and the client-side CSE (#gsc.q=)
  // parameters; wordsMode=AnyWord matches any of the words.
  var whoEncoded = encodeURIComponent(primary);
  var whoUrl = 'https://www.who.int/home/search-results?indexCatalogue=genericsearchindex1' +
    '&q=' + whoEncoded + '&wordsMode=AnyWord' +
    '#gsc.tab=0&gsc.q=' + whoEncoded + '&gsc.page=1';

  return {
    who: whoUrl,
    promed: 'https://promedmail.org/?s=' + encodeURIComponent(primary),
    googleNews: 'https://news.google.com/search?q=' + encodeURIComponent(googleQuery) + '&hl=en-US&gl=US&ceid=US%3Aen'
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

function normalizeWhoDonItem(raw) {
  var urlName = raw && raw.UrlName;
  var link = urlName ? WHO_DON_ITEM_BASE + encodeURIComponent(urlName) : null;
  if (link && !securityUtils.isValidHttpUrl(link)) {
    link = null;
  }

  return {
    source: 'WHO',
    title: normalizeText(raw && raw.Title, 220) || 'Untitled alert',
    summary: normalizeText(raw && raw.Summary, 260),
    link: link,
    pubDate: normalizeDate(raw && (raw.PublicationDate || raw.LastModified || raw.DateCreated))
  };
}

// Fetch the most recent WHO Disease Outbreak News items once, then filter
// in-memory per term (the API has no reliable full-text query parameter).
async function fetchWhoDonItems() {
  var url = WHO_DON_API +
    '?$top=50' +
    '&$orderby=' + encodeURIComponent('PublicationDate desc') +
    '&$select=' + encodeURIComponent('Title,Summary,UrlName,PublicationDate,LastModified,DateCreated');
  var data = await fetchJson(url);
  var value = data && Array.isArray(data.value) ? data.value : [];
  return value.map(normalizeWhoDonItem).filter(function (item) { return item.link; });
}

function buildGoogleNewsRssUrl(term, siteDomain, includeOutbreak) {
  var query = String(term || '').trim();
  if (includeOutbreak) {
    query += ' outbreak';
  }
  if (siteDomain) {
    query += ' site:' + siteDomain;
  }
  return 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=' + encodeURIComponent(query);
}

async function fetchGoogleNewsAlerts(term, termLower, tokens, maxItems) {
  var rawItems = await parseFeed(buildGoogleNewsRssUrl(term, null, false));

  return rawItems
    .map(function (item) { return normalizeFeedItem('Google News', item); })
    .filter(function (item) { return item.link; })
    .sort(function (a, b) { return (b.pubDate || '').localeCompare(a.pubDate || ''); })
    .slice(0, maxItems);
}

// ProMED has no working public feed (the site is frequently unreachable), so we
// still rely on a site:promedmail.org Google News query. Require the search term
// to actually appear so stale generic landing pages are not surfaced as alerts.
async function fetchPromedAlerts(term, termLower, tokens, maxItems) {
  var rawItems = await parseFeed(buildGoogleNewsRssUrl(term, 'promedmail.org', true));

  return rawItems
    .map(function (item) {
      var normalized = normalizeFeedItem('ProMED', item);
      if (!normalized.summary) {
        normalized.summary = 'Matched ProMED report mention';
      }
      return normalized;
    })
    .filter(function (item) { return item.link && itemMatchesTerm(item, termLower, tokens); })
    .sort(function (a, b) { return (b.pubDate || '').localeCompare(a.pubDate || ''); })
    .slice(0, maxItems);
}

function summarizeAlerts(species, totals) {
  var total = totals.total || 0;
  if (!total) {
    return 'No recent matching alerts found for ' + species + ' in WHO, ProMED, or Google News.';
  }

  // The source names, counts, and headlines are shown in the collapsible source
  // sections below, so the summary only reports the overall total here.
  return 'Found ' + total + ' recent alert' + (total === 1 ? '' : 's') +
    ' for ' + species + '.';
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

function isWithinRecentYears(pubDate) {
  if (!pubDate) {
    return false;
  }
  var year = new Date(pubDate).getFullYear();
  return !isNaN(year) && year >= ALERT_MIN_YEAR;
}

function mergeAlertsByUniq(items, maxItems) {
  var seen = {};
  var merged = [];

  items.forEach(function (item) {
    if (!isWithinRecentYears(item.pubDate)) {
      return;
    }
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
  var items = await fetchWhoDonItems();
  var all = items.filter(function (item) {
    return termContexts.some(function (ctx) {
      return itemMatchesTerm(item, ctx.lower, ctx.tokens);
    });
  });

  return mergeAlertsByUniq(all, maxItems);
}

async function fetchPromedAlertsForTerms(termContexts, maxItems) {
  var all = [];
  for (var i = 0; i < termContexts.length; i++) {
    var ctx = termContexts[i];
    var alerts = await fetchPromedAlerts(ctx.term, ctx.lower, ctx.tokens, maxItems);
    all = all.concat(alerts);
  }

  return mergeAlertsByUniq(all, maxItems);
}

async function fetchGoogleNewsAlertsForTerms(termContexts, maxItems) {
  var all = [];
  for (var i = 0; i < termContexts.length; i++) {
    var ctx = termContexts[i];
    var alerts = await fetchGoogleNewsAlerts(ctx.term, ctx.lower, ctx.tokens, maxItems);
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
    fetchPromedAlertsForTerms(termContexts, count),
    fetchGoogleNewsAlertsForTerms(termContexts, count)
  ]);

  var bySource = { WHO: [], ProMED: [], GoogleNews: [] };
  var sourceErrors = [];

  if (results[0].status === 'fulfilled') {
    bySource.WHO = results[0].value;
  } else {
    sourceErrors.push('WHO');
    console.error('WHO alert retrieval failed:', results[0].reason);
  }

  if (results[1].status === 'fulfilled') {
    bySource.ProMED = results[1].value;
  } else {
    sourceErrors.push('ProMED');
    console.error('ProMED alert retrieval failed:', results[1].reason);
  }

  if (results[2].status === 'fulfilled') {
    bySource.GoogleNews = results[2].value;
  } else {
    sourceErrors.push('Google News');
    console.error('Google News alert retrieval failed:', results[2].reason);
  }

  var highlights = bySource.WHO.concat(bySource.ProMED, bySource.GoogleNews)
    .sort(function (a, b) {
      return (b.pubDate || '').localeCompare(a.pubDate || '');
    })
    .slice(0, count);

  var totals = {
    WHO: bySource.WHO.length,
    ProMED: bySource.ProMED.length,
    GoogleNews: bySource.GoogleNews.length
  };
  totals.total = totals.WHO + totals.ProMED + totals.GoogleNews;

  res.json({
    species: species,
    queryTerms: queryTerms,
    generatedAt: new Date().toISOString(),
    sourceUrls: buildSourceUrlMap(queryTerms),
    totals: totals,
    summary: summarizeAlerts(species, totals),
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
