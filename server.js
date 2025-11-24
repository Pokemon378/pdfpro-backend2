const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// DIRECTORY SETUP
// ============================================
const uploadsDir = path.join(__dirname, 'uploads');
const tmpDir = path.join(__dirname, 'tmp');

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
    origin: '*', // In production, replace with your frontend domain
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// MULTER CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        files: 20 // Max 20 files per request
    },
    fileFilter: (req, file, cb) => {
        // Accept PDFs and images
        const allowedMimes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            'image/webp'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF and image files are allowed.`));
        }
    }
});

// ============================================
// IMPORT ROUTES
// ============================================
const mergeRoute = require('./routes/merge');
const splitRoute = require('./routes/split');
const compressRoute = require('./routes/compress');
const rotateRoute = require('./routes/rotate');
const watermarkRoute = require('./routes/watermark');
const pdfToImageRoute = require('./routes/pdfToImage');
const imageToPdfRoute = require('./routes/imageToPdf');
const deletePagesRoute = require('./routes/deletePages');
const reorderPagesRoute = require('./routes/reorderPages');
const extractTextRoute = require('./routes/extractText');

// ============================================
// MOUNT ROUTES
// ============================================
app.use('/api/merge', mergeRoute(upload));
app.use('/api/split', splitRoute(upload));
app.use('/api/compress', compressRoute(upload));
app.use('/api/rotate', rotateRoute(upload));
app.use('/api/watermark', watermarkRoute(upload));
app.use('/api/pdf-to-image', pdfToImageRoute(upload));
app.use('/api/image-to-pdf', imageToPdfRoute(upload));
app.use('/api/delete-pages', deletePagesRoute(upload));
app.use('/api/reorder-pages', reorderPagesRoute(upload));
app.use('/api/extract-text', extractTextRoute(upload));

// ============================================
// UTILITY ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'PDFPro Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Root endpoint - Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum is 20 files.' });
        }
        return res.status(400).json({ error: err.message });
    }

    // Custom errors
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ============================================
// CLEANUP SCHEDULER
// ============================================
// Clean up old files every 30 minutes
setInterval(() => {
    const cleanupDirs = [uploadsDir, tmpDir];
    const maxAge = 60 * 60 * 1000; // 1 hour

    cleanupDirs.forEach(dir => {
        fs.readdir(dir, (err, files) => {
            if (err) return;

            files.forEach(file => {
                const filePath = path.join(dir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;

                    const age = Date.now() - stats.mtimeMs;
                    if (age > maxAge) {
                        fs.unlink(filePath, (err) => {
                            if (!err) {
                                console.log(`Cleaned up old file: ${file}`);
                            }
                        });
                    }
                });
            });
        });
    });
}, 30 * 60 * 1000); // Run every 30 minutes

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 PDFPro Server Started');
    console.log('='.repeat(50));
    console.log(`📍 Port: ${PORT}`);
    console.log(`🕐 Time: ${new Date().toISOString()}`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`📁 Temp: ${tmpDir}`);
    console.log('='.repeat(50));
});

module.exports = app;
