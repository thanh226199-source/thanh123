const express = require("express");
const router = express.Router();
const rules = require("../config/loyaltyRules");

// GET /api/loyalty/rules
router.get("/rules", (req, res) => {
  res.json(rules);
});

module.exports = router;
