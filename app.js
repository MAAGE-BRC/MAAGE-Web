var config = require('./config');
if (config.get('newrelic_license_key')) {
  require('newrelic');
}
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var packageJSON = require('./package.json');
var routes = require('./routes/index');
var users = require('./routes/users');
var reportProblem = require('./routes/reportProblem');
var notifySubmitSequence = require('./routes/notifySubmitSequence');
var linkedin = require('./routes/linkedin');
var google = require('./routes/google');
var workspace = require('./routes/workspace');
var outbreaks = require('./routes/outbreaks');
var viewers = require('./routes/viewers');
var remotePage = require('./routes/remotePage');
var search = require('./routes/search');
var contentViewer = require('./routes/content');
var apps = require('./routes/apps');
var uploads = require('./routes/uploads');
var jobs = require('./routes/jobs');
var systemStatus = require('./routes/systemStatus');
var help = require('./routes/help');
var app = express();
var httpProxy = require('http-proxy');
var apiProxy = httpProxy.createProxyServer();
var maintenanceMode = config.get('maintenanceMode') || process.env.MAINTENANCE_MODE === 'true';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, '/public/favicon.ico')));
app.use(logger('dev'));
app.use(cookieParser(config.get('cookieSecret')));

app.use(function (req, res, next) {
  // console.log("Config.production: ", config.production);
  // console.log("Session Data: ", req.session);
  req.config = config;
  req.production = config.get('production') || false;
  req.productionLayers = ['p3/layer/core'];
  req.package = packageJSON;
  // var authToken = "";
  // var userProf = "";
  req.applicationOptions = {
    version: '3.0',
    gaID: config.get('gaID') || false,
    uaID: config.get('uaID') || false,
    probModelSeedServiceURL: config.get('probModelSeedServiceURL'), // for dashboard
    shockServiceURL: config.get('shockServiceURL'), // for dashboard
    workspaceServiceURL: config.get('workspaceServiceURL'),
    appBaseURL: config.get('appBaseURL'),
    appServiceURL: config.get('appServiceURL'),
    dataServiceURL: config.get('dataServiceURL'),
    homologyServiceURL: config.get('homologyServiceURL'),
    mailinglistURL: config.get("mailinglistURL"),
    genomedistanceServiceURL: config.get('genomedistanceServiceURL'),
    compareregionServiceURL: config.get('compareregionServiceURL'),
    docsServiceURL: config.get('docsServiceURL'),
    enableDevTools: config.get('enableDevTools'),
    accountURL: config.get('accountURL'),
    appLabel: config.get('appLabel'),
    jiraLabel: config.get('jiraLabel'),
    appVersion: packageJSON.version,
    userServiceURL: config.get('userServiceURL'),
    localStorageCheckInterval: config.get('localStorageCheckInterval')
  };
  // console.log("Application Options: ", req.applicationOptions);
  next();
});

var proxies = config.get('proxy');

app.use('/p/:proxy/', function (req, res, next) {
  if (proxies[req.params.proxy]) {
    apiProxy.web(req, res, { target: proxies[req.params.proxy] });
  } else {
    next();
  }
});

app.use('/portal/portal/patric/Home', [
  function (req, res, next) {
    console.log('Got Portal Request');
    next();
  },
  express.static(path.join(__dirname, 'public/cached.html'))
]);

app.use('*jbrowse.conf', express.static(path.join(__dirname, 'public/js/jbrowse.conf')));

const staticHeaders = {
  maxage: '356d',
  setHeaders: function (res, path) {
    var d = new Date();
    d.setYear(d.getFullYear() + 1);
    res.setHeader('Expires', d.toGMTString())
  }
}

app.use('/js/' + packageJSON.version + '/', [
  express.static(path.join(__dirname, 'public/js/release/'), staticHeaders),
  express.static(path.join(__dirname, 'public/js/'),staticHeaders)
]);

app.use('/js/', express.static(path.join(__dirname, 'public/js/')));
app.use('/patric/images', express.static(path.join(__dirname, 'public/patric/images/'), {
  maxage: '365d',
  setHeaders: function (res, path) {
    var d = new Date();
    d.setYear(d.getFullYear() + 1);
    res.setHeader('Expires', d.toGMTString());
  }
}));
app.use('/public/pdfs/', [
  function (req, res, next) {
    res.redirect('https://docs.patricbrc.org/tutorial/');
  }
 ]);

app.use('/css', express.static(path.join(__dirname, 'public/css')));

app.use((req, res, next) => {
  if (maintenanceMode && !req.url.startsWith('/admin')) {
  res.status(503).render('errors/503', { title: '503 Service Unavailable' });
  } else {
  next();
  }
});


app.use('/patric/', express.static(path.join(__dirname, 'public/patric/')));
app.use('/maage/', express.static(path.join(__dirname, 'public/maage/')));
app.use('/public/', express.static(path.join(__dirname, 'public/')));
app.use('/', routes);
app.post('/reportProblem', reportProblem);
app.post('/notifySubmitSequence', notifySubmitSequence);
app.use('/linkedin', linkedin);
app.use('/google', google);
app.use('/workspace', workspace);
app.use('/content', contentViewer);
app.use('/webpage', contentViewer);
app.use('/user', contentViewer);
app.use('/sulogin', contentViewer);
app.use('/login', contentViewer);
app.use('/register', contentViewer);
app.use('/verify_refresh', contentViewer);
app.use('/verify_failure', contentViewer);
app.use('/remote', remotePage);
app.use('/outbreaks', outbreaks);
app.use('/view', viewers);
app.use('/search', search);
app.use('/searches', search);
app.use('/app', apps);
app.use('/job', jobs);
app.use('/status', systemStatus);  // system status page
app.use('/help', help);
app.use('/uploads', uploads);
app.use('/users', users);

// MTB Taxon Overview Route
app.use('/pathogens/mtb', [
  function (req, res, next) {
    res.redirect('/view/Taxonomy/1773#view_tab=overview');
  }
]);

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// dev error handler
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const knownErrors = [403, 404, 500, 503];
    const template = knownErrors.includes(status) ? `errors/${status}` : 'errors/error';

    console.error(err.stack);

    res.status(status).render(template, {
      title: `${status} Error`,
      error: err
    });
  });
}

// prod error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const knownErrors = [403, 404, 500, 503];
  const template = knownErrors.includes(status) ? `errors/${status}` : 'errors/error';

  console.error(err.stack);

  res.status(status).render(template, {
    title: `${status} Error`,
    error: {}
  });
});

module.exports = app;
