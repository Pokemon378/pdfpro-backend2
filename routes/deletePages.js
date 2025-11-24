const express = require('express');
const { deletePages } = require('../controllers/deletePagesController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/delete-pages
     * Delete specific pages from PDF
     * Expects: single PDF file, pages (comma-separated page numbers)
     */
    router.post('/', upload.single('file'), deletePages);

    return router;
};
