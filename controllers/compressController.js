const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Compress PDF file by optimizing with pdf-lib
 * @route POST /api/compress
 * @param {File} req.file - PDF file to compress
 */
exports.compress = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const originalSize = req.file.size;

        // Load the PDF
        const pdfBytes = await fs.readFile(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Save with compression options
        const compressedPdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
        });

        const compressedSize = compressedPdfBytes.length;
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

        console.log(`Compression: ${originalSize} -> ${compressedSize} bytes (${compressionRatio}% reduction)`);

        const outputPath = path.join(__dirname, '..', 'uploads', `compressed-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, compressedPdfBytes);

        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));

        // Send the compressed file
        res.download(outputPath, 'compressed.pdf', async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up output file
            await fs.unlink(outputPath).catch(e => console.error('Output cleanup error:', e));
        });

    } catch (error) {
        console.error('Compress error:', error);

        // Clean up on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to compress PDF',
            details: error.message
        });
    }
};
