const express = require('express');
const { pdfToImage } = require('../controllers/pdfToImageController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/pdf-to-image
     * Convert PDF pages to images
     * Expects: single PDF file, format (png/jpg), dpi (optional)
     */
    router.post('/', upload.single('file'), pdfToImage);

    return router;
};
