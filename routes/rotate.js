const express = require('express');
const { rotate } = require('../controllers/rotateController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/rotate
     * Rotate PDF pages
     * Expects: single PDF file, angle, pages (optional)
     */
    router.post('/', upload.single('file'), rotate);

    return router;
};
