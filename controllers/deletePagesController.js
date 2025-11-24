const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Delete specific pages from PDF
 * @route POST /api/delete-pages
 * @param {File} req.file - PDF file
 * @param {String} req.body.pages - Comma-separated page numbers to delete (e.g., "1,3,5")
 */
exports.deletePages = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        if (!req.body.pages) {
            return res.status(400).json({ error: 'Pages to delete are required' });
        }

        // Load the PDF
        const pdfBytes = await fs.readFile(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();

        // Parse page numbers to delete (1-indexed)
        const pagesToDelete = req.body.pages
            .split(',')
            .map(p => parseInt(p.trim()) - 1)
            .filter(p => p >= 0 && p < totalPages)
            .sort((a, b) => b - a); // Sort in descending order for safe deletion

        if (pagesToDelete.length === 0) {
            return res.status(400).json({ error: 'No valid page numbers provided' });
        }

        if (pagesToDelete.length >= totalPages) {
            return res.status(400).json({ error: 'Cannot delete all pages from PDF' });
        }

        // Remove pages (in reverse order to maintain indices)
        for (const pageIndex of pagesToDelete) {
            pdfDoc.removePage(pageIndex);
        }

        console.log(`Deleted ${pagesToDelete.length} pages from PDF`);

        // Save the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, '..', 'uploads', `deleted-pages-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, modifiedPdfBytes);

        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));

        // Send the modified file
        res.download(outputPath, 'modified.pdf', async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up output file
            await fs.unlink(outputPath).catch(e => console.error('Output cleanup error:', e));
        });

    } catch (error) {
        console.error('Delete pages error:', error);

        // Clean up on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to delete pages',
            details: error.message
        });
    }
};
