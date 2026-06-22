const nconf = require('nconf');
const path = require('path');

const defaults = {
  'http_port': 12003,
  'application_id': 'patric3',
  'p3_clientId': 'patric3',
  'p3_clientSecret': 'patric3',
  'appLabel': 'dev',
  'newsFeedRSS': 'https://docs.patricbrc.org/news.rss',
  'sessionTTL': 2628000000,
  'workspaceServiceURL': 'https://www.bv-brc.org/services/Workspace',
  'appServiceURL': 'https://www.bv-brc.org/services/app_service',
  appBaseURL: 'https://www.patricbrc.org',
  'homologyServiceURL': 'https://www.bv-brc.org/services/homology_service',
  'genomedistanceServiceURL': 'https://www.bv-brc.org/services/minhash_service',
  'compareregionServiceURL': 'https://www.bv-brc.org/services/compare_regions',
  'probModelSeedServiceURL': 'https://www.bv-brc.org/services/ProbModelSEED', // only for status dashboard
  'shockServiceURL': 'https://www.bv-brc.org/services/shock_api', // only for status dashboard
  dataServiceURL: 'https://www.bv-brc.org/services/data_api',
  accountURL: 'http://user.patric.local:3002/',
  docsServiceURL: 'https://www.bv-brc.org/docs/',
  userServiceURL: '',
  localStorageCheckInterval: 86400,
  enableDevTools: false,
  reportProblemEmailAddress: 'help@maage-brc.org',
  sequenceSubmissionNotificationEmailAddress: ['gbsubmit@bvbrc.org'],
  'email': {
    'localSendmail': false,
    'defaultFrom': 'BV-BRC <do-not-reply@bv-brc.org>',
    'defaultSender': 'BV-BRC <do-not-reply@bv-brc.org>',
    'host': '',
    'port': 25
  },
  proxy: {
    'brcdownloads': 'http://brcdownloads.patricbrc.org'
  },
  linkedinConfigFile: path.join(__dirname, 'linkedin.txt')
};

const config_filename = 'p3-web.conf';
const config_file = path.join(__dirname, config_filename);

module.exports = nconf.argv().env().file(config_file).defaults(defaults);
