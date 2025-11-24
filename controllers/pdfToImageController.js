const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

/**
 * Convert PDF pages to images
 * @route POST /api/pdf-to-image
 * @param {File} req.file - PDF file to convert
 * @param {String} req.body.format - Output format: 'png' or 'jpg' (default 'png')
 * @param {Number} req.body.dpi - DPI resolution (default 150)
 */
exports.pdfToImage = async (req, res) => {
    let uploadedFile = null;
    const outputFiles = [];

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        uploadedFile = req.file.path;
        const format = (req.body.format || 'png').toLowerCase();
        const dpi = parseInt(req.body.dpi) || 150;

        // Validate format
        if (!['png', 'jpg', 'jpeg'].includes(format)) {
            return res.status(400).json({ error: 'Format must be png or jpg' });
        }

        const outputDir = path.join(__dirname, '..', 'uploads');
        const timestamp = Date.now();

        // Get page count
        const getPageCount = () => {
            return new Promise((resolve, reject) => {
                gm(uploadedFile).identify('%p ', (err, value) => {
                    if (err) reject(err);
                    else resolve(value.trim().split(' ').length);
                });
            });
        };

        const pageCount = await getPageCount();
        console.log(`Converting ${pageCount} pages to ${format.toUpperCase()} at ${dpi} DPI`);

        // Convert each page
        for (let i = 0; i < pageCount; i++) {
            const outputPath = path.join(outputDir, `page-${timestamp}-${i + 1}.${format}`);

            await new Promise((resolve, reject) => {
                gm(`${uploadedFile}[${i}]`)
                    .density(dpi, dpi)
                    .quality(90)
                    .write(outputPath, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });

            outputFiles.push(outputPath);
        }

        // Create ZIP archive
        const zipPath = path.join(outputDir, `images-${timestamp}.zip`);
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            // Clean up uploaded file and images
            await fs.unlink(uploadedFile).catch(() => { });
            for (const file of outputFiles) {
                await fs.unlink(file).catch(() => { });
            }

            // Send ZIP file
            res.download(zipPath, 'pdf-images.zip', async (err) => {
                if (err) console.error('Download error:', err);
                await fs.unlink(zipPath).catch(() => { });
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // Add images to archive
        for (let i = 0; i < outputFiles.length; i++) {
            archive.file(outputFiles[i], { name: `page-${i + 1}.${format}` });
        }

        await archive.finalize();

    } catch (error) {
        console.error('PDF to Image error:', error);

        // Cleanup on error
        if (uploadedFile) await fs.unlink(uploadedFile).catch(() => { });
        for (const file of outputFiles) {
            await fs.unlink(file).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to convert PDF to images',
            details: error.message
        });
    }
};
