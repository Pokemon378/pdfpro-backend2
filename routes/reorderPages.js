const express = require('express');
const { reorderPages } = require('../controllers/reorderPagesController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/reorder-pages
     * Reorder pages in PDF
     * Expects: single PDF file, order (comma-separated page numbers in new order)
     */
    router.post('/', upload.single('file'), reorderPages);

    return router;
};
