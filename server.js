const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const readFilePath = path.join(rootDir, 'read.text');
const port = process.env.PORT || 3000;
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.text': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

function normalizeRequestPath(urlPathname) {
    const decodedPath = decodeURIComponent(urlPathname);
    const targetPath = decodedPath === '/' ? '/index.html' : decodedPath;
    const unsafePath = path.join(rootDir, targetPath);
    const normalizedPath = path.normalize(unsafePath);

    if (!normalizedPath.startsWith(rootDir)) {
        return null;
    }

    return normalizedPath;
}

const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/save-wish') {
        let body = '';

        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 1024) {
                req.destroy();
            }
        });

        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const wish = typeof parsed.wish === 'string' ? parsed.wish.trim() : '';

                if (!wish) {
                    sendJson(res, 400, { success: false, message: '愿望不能为空' });
                    return;
                }

                const now = new Date();
                const dateText = now.toLocaleString('zh-CN', { hour12: false });
                const line = `[${dateText}] ${wish}\n`;

                fs.appendFile(readFilePath, line, 'utf8', (error) => {
                    if (error) {
                        sendJson(res, 500, { success: false, message: '写入失败' });
                        return;
                    }

                    sendJson(res, 200, { success: true });
                });
            } catch (error) {
                sendJson(res, 400, { success: false, message: '请求格式错误' });
            }
        });

        return;
    }

    const filePath = normalizeRequestPath(requestUrl.pathname);

    if (!filePath) {
        res.writeHead(403, { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { ...corsHeaders, 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
