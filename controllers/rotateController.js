const { PDFDocument, degrees } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Rotate PDF pages
 * @route POST /api/rotate
 * @param {File} req.file - PDF file to rotate
 * @param {Number} req.body.angle - Rotation angle: 90, 180, or 270
 * @param {String} req.body.pages - Pages to rotate: 'all' or comma-separated page numbers
 */
exports.rotate = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const angle = parseInt(req.body.angle) || 90;
        const pagesToRotate = req.body.pages || 'all';

        // Validate angle
        if (![90, 180, 270].includes(angle)) {
            return res.status(400).json({ error: 'Angle must be 90, 180, or 270 degrees' });
        }

        // Load the PDF
        const pdfBytes = await fs.readFile(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();
        const pages = pdfDoc.getPages();

        // Determine which pages to rotate
        let pageIndices = [];
        if (pagesToRotate === 'all') {
            pageIndices = Array.from({ length: totalPages }, (_, i) => i);
        } else {
            // Parse comma-separated page numbers
            pageIndices = pagesToRotate
                .split(',')
                .map(p => parseInt(p.trim()) - 1)
                .filter(p => p >= 0 && p < totalPages);
        }

        // Rotate specified pages
        pageIndices.forEach(index => {
            const page = pages[index];
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + angle) % 360));
        });

        // Save the rotated PDF
        const rotatedPdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, '..', 'uploads', `rotated-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, rotatedPdfBytes);

        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));

        // Send the rotated file
        res.download(outputPath, 'rotated.pdf', async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up output file
            await fs.unlink(outputPath).catch(e => console.error('Output cleanup error:', e));
        });

    } catch (error) {
        console.error('Rotate error:', error);

        // Clean up on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to rotate PDF',
            details: error.message
        });
    }
};
