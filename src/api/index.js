const express = require('express');

const emojis = require('./emojis');
const dokuweb = require('./dokuweb')

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/emojis', emojis);
router.use('/dokuweb', dokuweb);

module.exports = router;
