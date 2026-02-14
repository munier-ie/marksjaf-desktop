const express = require('express');
const { getItems, getCategories } = require('../controllers/itemsController');

const router = express.Router();

router.get('/', getItems);
router.get('/categories', getCategories);

module.exports = router;