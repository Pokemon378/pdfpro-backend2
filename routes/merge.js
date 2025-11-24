const express = require('express');
const { merge } = require('../controllers/mergeController');

module.exports = (upload) => {
    const router = express.Router();

    /**
     * POST /api/merge
     * Merge multiple PDF files into one
     * Expects: multiple PDF files
     */
    router.post('/', upload.array('files', 20), merge);

    return router;
};
