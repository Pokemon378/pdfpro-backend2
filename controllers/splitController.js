const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

/**
 * Split PDF into multiple files based on options
 * @route POST /api/split
 * @param {File} req.file - PDF file to split
 * @param {String} req.body.mode - Split mode: 'all' (each page), 'range' (page ranges), 'custom'
 * @param {String} req.body.ranges - Page ranges (e.g., "1-3,5,7-9") for 'range' mode
 */
exports.split = async (req, res) => {
    let uploadedFile = null;
    const outputFiles = [];

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        uploadedFile = req.file.path;
        const mode = req.body.mode || 'all';

        // Load the PDF
        const pdfBytes = await fs.readFile(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();

        let pagesToSplit = [];

        // Determine split strategy
        if (mode === 'all') {
            // Split into individual pages
            for (let i = 0; i < totalPages; i++) {
                pagesToSplit.push([i]);
            }
        } else if (mode === 'range' && req.body.ranges) {
            // Parse ranges like "1-3,5,7-9"
            const ranges = req.body.ranges.split(',');
            for (const range of ranges) {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(n => parseInt(n.trim()) - 1);
                    const pages = [];
                    for (let i = start; i <= end && i < totalPages; i++) {
                        pages.push(i);
                    }
                    if (pages.length > 0) pagesToSplit.push(pages);
                } else {
                    const pageNum = parseInt(range.trim()) - 1;
                    if (pageNum >= 0 && pageNum < totalPages) {
                        pagesToSplit.push([pageNum]);
                    }
                }
            }
        } else {
            return res.status(400).json({ error: 'Invalid split mode or ranges' });
        }

        // Create split PDFs
        const outputDir = path.join(__dirname, '..', 'uploads');
        const timestamp = Date.now();

        for (let i = 0; i < pagesToSplit.length; i++) {
            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(pdfDoc, pagesToSplit[i]);
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            const outputPath = path.join(outputDir, `split-${timestamp}-${i + 1}.pdf`);
            await fs.writeFile(outputPath, pdfBytes);
            outputFiles.push(outputPath);
        }

        // Create ZIP archive
        const zipPath = path.join(outputDir, `split-${timestamp}.zip`);
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            // Clean up uploaded file and split PDFs
            await fs.unlink(uploadedFile).catch(() => { });
            for (const file of outputFiles) {
                await fs.unlink(file).catch(() => { });
            }

            // Send ZIP file
            res.download(zipPath, 'split-pages.zip', async (err) => {
                if (err) console.error('Download error:', err);
                await fs.unlink(zipPath).catch(() => { });
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // Add files to archive
        for (let i = 0; i < outputFiles.length; i++) {
            archive.file(outputFiles[i], { name: `page-${i + 1}.pdf` });
        }

        await archive.finalize();

    } catch (error) {
        console.error('Split error:', error);

        // Cleanup on error
        if (uploadedFile) await fs.unlink(uploadedFile).catch(() => { });
        for (const file of outputFiles) {
            await fs.unlink(file).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to split PDF',
            details: error.message
        });
    }
};
