const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Add watermark to PDF
 * @route POST /api/watermark
 * @param {File} req.file - PDF file to watermark
 * @param {String} req.body.text - Watermark text
 * @param {Number} req.body.opacity - Opacity (0-1, default 0.3)
 * @param {Number} req.body.rotation - Rotation angle in degrees (default 45)
 * @param {String} req.body.position - Position: 'center', 'diagonal' (default 'diagonal')
 * @param {Number} req.body.fontSize - Font size (default 48)
 */
exports.watermark = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const watermarkText = req.body.text || 'WATERMARK';
        const opacity = parseFloat(req.body.opacity) || 0.3;
        const rotation = parseFloat(req.body.rotation) || 45;
        const position = req.body.position || 'diagonal';
        const fontSize = parseInt(req.body.fontSize) || 48;

        // Validate opacity
        if (opacity < 0 || opacity > 1) {
            return res.status(400).json({ error: 'Opacity must be between 0 and 1' });
        }

        // Load the PDF
        const pdfBytes = await fs.readFile(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Add watermark to each page
        for (const page of pages) {
            const { width, height } = page.getSize();
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
            const textHeight = fontSize;

            // Calculate position
            let x, y;
            if (position === 'center') {
                x = (width - textWidth) / 2;
                y = (height - textHeight) / 2;
            } else {
                // Diagonal position (default)
                x = (width - textWidth) / 2;
                y = (height - textHeight) / 2;
            }

            // Draw watermark
            page.drawText(watermarkText, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(0.5, 0.5, 0.5),
                opacity: opacity,
                rotate: { angle: rotation, type: 'degrees' }
            });
        }

        // Save the watermarked PDF
        const watermarkedPdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, '..', 'uploads', `watermarked-${Date.now()}.pdf`);
        await fs.writeFile(outputPath, watermarkedPdfBytes);

        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(err => console.error('Cleanup error:', err));

        // Send the watermarked file
        res.download(outputPath, 'watermarked.pdf', async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up output file
            await fs.unlink(outputPath).catch(e => console.error('Output cleanup error:', e));
        });

    } catch (error) {
        console.error('Watermark error:', error);

        // Clean up on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Failed to add watermark',
            details: error.message
        });
    }
};
