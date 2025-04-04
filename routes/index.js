var express = require("express");
var router = express.Router();

/* Home. */
router.get("/", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("index", { title: "PATRIC", request: req, response: res });
});

/* About MAAGE */
// router.get("/about", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/about", { title: "PATRIC", request: req, response: res });
// });

/* MAAGE Team */
// router.get("/team", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/team", { title: "PATRIC", request: req, response: res });
// });

/* MAAGE Advisory Boards. */
// router.get("/advisory-boards", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/advisory-boards", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* Dashboard. */
// router.get("/dashboard", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/dashboard", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* Dashboard. */
// router.get("/dashboard-2", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/dashboard-2", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* Announcements. */
// router.get("/announcements", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/announcements", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* Citations */
// router.get("/citation", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/citation", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* GET publications page. */
// router.get("/publications", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/publications", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* GET related resources page. */
// router.get("/related-resources", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/related-resources", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* SARS-CoV-2 */
// router.get("/sars-cov-2", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/sars-cov-2", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* SARS-CoV-2 User Guide */
// router.get("/docs/user-guides/sars-cov-2", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("docs/user-guides/sars-cov-2", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* SARS-CoV-2 Tutorial */
// router.get("/docs/tutorials/sars-cov-2", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("docs/tutorials/sars-cov-2", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* GET outreach page. */
// router.get("/brc-calendar", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/brc-calendar", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* GET all searches page. */
// router.get("/searches", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/searches", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* GET all tools & services page. */
// router.get("/tools", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/tools", { title: "PATRIC", request: req, response: res });
// });

/* GET privacy policy page. */
// router.get("/privacy-policy", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/privacy-policy", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

/* Dashboard Demo 1. */
router.get("/dev/dashboard/demo-1", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("dev/dashboard/demo-1", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* Dashboard Demo 2. */
router.get("/dev/dashboard/demo-2", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("dev/dashboard/demo-2", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* Dashboard Demo 3. */
router.get("/dev/dashboard/demo-3", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("dev/dashboard/demo-3", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* Page Demo 1. */
router.get("/dev/page/demo-1", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("dev/page/demo-1", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

/* Page Demo 2. */
router.get("/dev/page/demo-2", function (req, res) {
  req.applicationModule = "p3/app/p3app";
  res.render("dev/page/demo-2", {
    title: "PATRIC",
    request: req,
    response: res,
  });
});

// /* Announcements. */
// router.get("/announcements", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/announcements", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* Citations */
// router.get("/citation", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/citation", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* GET publications page. */
// router.get("/publications", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/publications", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* GET related resources page. */
// router.get("/related-resources", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/related-resources", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* SARS-CoV-2 */
// router.get("/sars-cov-2", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/sars-cov-2", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* SARS-CoV-2 User Guide */
// router.get("/docs/user-guides/sars-cov-2", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("docs/user-guides/sars-cov-2", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* SARS-CoV-2 Tutorial */
// router.get("/docs/tutorials/sars-cov-2", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("docs/tutorials/sars-cov-2", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* GET outreach page. */
// router.get("/brc-calendar", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/brc-calendar", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* GET all searches page. */
// router.get("/searches", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/searches", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* GET all tools & services page. */
// router.get("/tools", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/tools", { title: "PATRIC", request: req, response: res });
// });

// /* GET privacy policy page. */
// router.get("/privacy-policy", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/privacy-policy", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

// /* GET privacy policy page. */
// router.get("/verify_failure", function (req, res) {
//   req.applicationModule = "p3/app/p3app";
//   res.render("pages/verify_failure", {
//     title: "PATRIC",
//     request: req,
//     response: res,
//   });
// });

module.exports = router;
