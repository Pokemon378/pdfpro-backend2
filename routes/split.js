const express = require('express');
const { split } = require('../controllers/splitController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/split
     * Split PDF into multiple files
     * Expects: single PDF file, mode, ranges (optional)
     */
    router.post('/', upload.single('file'), split);

    return router;
};
