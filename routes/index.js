var express = require("express");
var router = express.Router();

/* Home. */
router.get("/", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("index", { title: "PATRIC", request: req, response: res });
});

/* About MAAGE */
router.get("/about", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/about", { title: "PATRIC", request: req, response: res });
});

/* Team Members */
router.get("/team", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/team", { title: "PATRIC", request: req, response: res });
});

/* Team Members */
router.get("/team-temp", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/team-temp", { title: "PATRIC", request: req, response: res });
});

/* Advisory Boards. */
// router.get("/advisory-boards", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/advisory-boards", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });


/* Announcements. */
router.get("/announcements", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/announcements", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* GET calendar page. */
router.get("/calendar", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("pages/calendar", {
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

/* GET all tools & services page. */
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
