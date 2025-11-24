const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Reorder pages in PDF
 * @route POST /api/reorder-pages
 * @param {File} req.file - PDF file
 * @param {String} req.body.order - New page order as comma-separated numbers (e.g., "3,1,2,4")
 */
exports.reorderPages = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        if (!req.body.order) {
            return res.status(400).json({ error: 'Page order is required' });
        }

        // Load the PDF
        const pdfBytes = await fs.readFile(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();

        // Parse new page order (1-indexed)
        const newOrder = req.body.order
            .split(',')
            .map(p => parseInt(p.trim()) - 1);

        // Validate order
        if (newOrder.length !== totalPages) {
            return res.status(400).json({
                error: `Order must contain exactly ${totalPages} page numbers`
            });
        }

        // Check for valid page numbers and no duplicates
        const uniquePages = new Set(newOrder);
        if (uniquePages.size !== totalPages) {
            return res.status(400).json({ error: 'Order contains duplicate page numbers' });
        }

        for (const pageNum of newOrder) {
            if (pageNum < 0 || pageNum >= totalPages) {
                return res.status(400).json({
                    error: `Invalid page number: ${pageNum + 1}. Must be between 1 and ${totalPages}`
                });
            }
        }

        // Create new PDF with reordered pages
        const newPdfDoc = await PDFDocument.create();

        for (const pageIndex of newOrder) {
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
            newPdfDoc.addPage(copiedPage);
        }

        console.log(`Reordered ${totalPages} pages`);

        // Save the reordered PDF
        const reorderedPdfBytes = await newPdfDoc.save();
        const outputPath = path.join(__dirname, '..', 'uploads', `reordered-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, reorderedPdfBytes);

        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));

        // Send the reordered file
        res.download(outputPath, 'reordered.pdf', async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up output file
            await fs.unlink(outputPath).catch(e => console.error('Output cleanup error:', e));
        });

    } catch (error) {
        console.error('Reorder pages error:', error);

        // Clean up on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to reorder pages',
            details: error.message
        });
    }
};
