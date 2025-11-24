const express = require('express');
const { imageToPdf } = require('../controllers/imageToPdfController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/image-to-pdf
     * Convert images to PDF
     * Expects: multiple image files, pageSize (optional)
     */
    router.post('/', upload.array('files', 20), imageToPdf);

    return router;
};
