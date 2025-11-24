const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Merge multiple PDF files into a single PDF
 * @route POST /api/merge
 * @param {Array} req.files - Array of PDF files to merge
 */
exports.merge = async (req, res) => {
    const uploadedFiles = [];

    try {
        // Validate files
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({
                error: 'At least 2 PDF files are required for merging'
            });
        }

        // Store file paths for cleanup
        uploadedFiles.push(...req.files.map(f => f.path));

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();

        // Process each PDF file
        for (const file of req.files) {
            const pdfBytes = await fs.readFile(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(__dirname, '..', 'uploads', `merged-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, mergedPdfBytes);

        // Clean up uploaded files
        for (const filePath of uploadedFiles) {
            await fs.unlink(filePath).catch(err => console.error('Cleanup error:', err));
        }

        // Send the merged file
        res.download(outputPath, 'merged.pdf', async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up output file after download
            await fs.unlink(outputPath).catch(e => console.error('Output cleanup error:', e));
        });

    } catch (error) {
        console.error('Merge error:', error);

        // Clean up on error
        for (const filePath of uploadedFiles) {
            await fs.unlink(filePath).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to merge PDFs',
            details: error.message
        });
    }
};
