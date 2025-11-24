const express = require('express');
const { extractText } = require('../controllers/extractTextController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/extract-text
     * Extract text from PDF
     * Expects: single PDF file
     * Returns: JSON with extracted text
     */
    router.post('/', upload.single('file'), extractText);

    return router;
};
