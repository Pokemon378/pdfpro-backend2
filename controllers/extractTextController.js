const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Extract text from PDF
 * @route POST /api/extract-text
 * @param {File} req.file - PDF file to extract text from
 */
exports.extractText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        // Read PDF file
        const dataBuffer = await fs.readFile(req.file.path);

        // Parse PDF and extract text
        const data = await pdfParse(dataBuffer);

        console.log(`Extracted text from ${data.numpages} pages`);

        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));

        // Return extracted text
        res.json({
            success: true,
            pages: data.numpages,
            text: data.text,
            info: data.info,
            metadata: data.metadata
        });

    } catch (error) {
        console.error('Extract text error:', error);

        // Clean up on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to extract text from PDF',
            details: error.message
        });
    }
};
