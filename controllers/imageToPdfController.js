const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

/**
 * Convert images to PDF
 * @route POST /api/image-to-pdf
 * @param {Array} req.files - Image files to convert
 * @param {String} req.body.pageSize - Page size: 'A4', 'Letter', 'auto' (default 'auto')
 */
exports.imageToPdf = async (req, res) => {
    const uploadedFiles = [];

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'At least one image file is required' });
        }

        uploadedFiles.push(...req.files.map(f => f.path));
        const pageSize = req.body.pageSize || 'auto';

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();

        // Process each image
        for (const file of req.files) {
            let imageBytes = await fs.readFile(file.path);
            let image;

            // Embed image based on type
            const ext = path.extname(file.originalname).toLowerCase();

            if (ext === '.png') {
                image = await pdfDoc.embedPng(imageBytes);
            } else if (['.jpg', '.jpeg'].includes(ext)) {
                image = await pdfDoc.embedJpg(imageBytes);
            } else {
                // Convert other formats to PNG using sharp
                const pngBuffer = await sharp(imageBytes).png().toBuffer();
                image = await pdfDoc.embedPng(pngBuffer);
            }

            // Determine page dimensions
            let pageWidth, pageHeight;

            if (pageSize === 'A4') {
                pageWidth = 595.28;  // A4 width in points
                pageHeight = 841.89; // A4 height in points
            } else if (pageSize === 'Letter') {
                pageWidth = 612;     // Letter width in points
                pageHeight = 792;    // Letter height in points
            } else {
                // Auto: use image dimensions
                pageWidth = image.width;
                pageHeight = image.height;
            }

            // Add page with image
            const page = pdfDoc.addPage([pageWidth, pageHeight]);

            // Calculate scaling to fit image on page while maintaining aspect ratio
            const imageAspectRatio = image.width / image.height;
            const pageAspectRatio = pageWidth / pageHeight;

            let drawWidth, drawHeight;
            if (imageAspectRatio > pageAspectRatio) {
                // Image is wider than page
                drawWidth = pageWidth;
                drawHeight = pageWidth / imageAspectRatio;
            } else {
                // Image is taller than page
                drawHeight = pageHeight;
                drawWidth = pageHeight * imageAspectRatio;
            }

            // Center image on page
            const x = (pageWidth - drawWidth) / 2;
            const y = (pageHeight - drawHeight) / 2;

            page.drawImage(image, {
                x: x,
                y: y,
                width: drawWidth,
                height: drawHeight
            });
        }

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, '..', 'uploads', `images-to-pdf-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, pdfBytes);

        // Clean up uploaded files
        for (const filePath of uploadedFiles) {
            await fs.unlink(filePath).catch(err => console.error('Cleanup error:', err));
        }

        // Send the PDF file
        res.download(outputPath, 'images.pdf', async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up output file
            await fs.unlink(outputPath).catch(e => console.error('Output cleanup error:', e));
        });

    } catch (error) {
        console.error('Image to PDF error:', error);

        // Clean up on error
        for (const filePath of uploadedFiles) {
            await fs.unlink(filePath).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to convert images to PDF',
            details: error.message
        });
    }
};
