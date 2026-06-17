var express = require("express");
var router = express.Router();

const HOME_VARIANTS = {
  default: "home",
  dev: "home-dev",
  temp: "home-temp",
  mock1: "home-mock1",
};

/* GET home. */
router.get("/", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  const variantKey = req.query.variant && HOME_VARIANTS[req.query.variant] ? req.query.variant : "mock1";
  res.render("index", { title: "PATRIC", request: req, response: res, homeVariant: variantKey });
});

/* GET demo */
router.get("/demo", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/demo", { title: "PATRIC", request: req, response: res });
});

/* GET test */
router.get("/test", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/test", { title: "PATRIC", request: req, response: res });
});

/* GET about */
router.get("/about", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/about", { title: "PATRIC", request: req, response: res });
});

/* GET team */
router.get("/team", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/team", { title: "PATRIC", request: req, response: res });
});

/* GET advisory boards. */
router.get("/advisory-boards", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/advisory-boards", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* GET announcements. */
router.get("/announcements", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/announcements", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* GET events page. */
router.get("/events", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/events", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* GET publications page. */
router.get("/publications", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/publications", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* GET related resources page. */
router.get("/related-resources", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/related-resources", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* GET all searches page. */
router.get("/searches", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/searches", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* GET all tools page. */
router.get("/tools", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/tools", { title: "PATRIC", request: req, response: res });
});

/* GET privacy policy page. */
router.get("/privacy-policy", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/privacy-policy", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

module.exports = router;
