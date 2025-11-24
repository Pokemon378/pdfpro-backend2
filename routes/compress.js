const express = require('express');
const { compress } = require('../controllers/compressController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/compress
     * Compress PDF file
     * Expects: single PDF file
     */
    router.post('/', upload.single('file'), compress);

    return router;
};
