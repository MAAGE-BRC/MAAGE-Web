var express = require('express');
var router = express.Router();

router.get('*', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('p3app', { title: 'Surveillance Dashboard | MAAGE', request: req, response: res });
});

module.exports = router;
