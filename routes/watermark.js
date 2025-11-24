const express = require('express');
const { watermark } = require('../controllers/watermarkController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/watermark
     * Add watermark to PDF
     * Expects: single PDF file, text, opacity, rotation, position, fontSize (all optional except text)
     */
    router.post('/', upload.single('file'), watermark);

    return router;
};
