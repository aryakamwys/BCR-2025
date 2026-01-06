import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'dist')));

const apiHandler = async (req: any, res: any) => {
  const url = new URL(req.originalUrl, `http://${req.headers.host}`);
  const pathname = url.pathname;

  let apiPath = pathname.replace('/api/', '');
  apiPath = apiPath.replace(/\//g, '-');

  const apiFilePath = path.join(__dirname, 'api', `${apiPath}.ts`);

  try {
    const apiModule = await import(apiFilePath);
    const handler = apiModule.default;

    if (!handler) {
      throw new Error(`No default export found in ${apiFilePath}`);
    }

    const contentType = req.headers['content-type'] || '';
    let body = null;
    let isBase64Encoded = false;

    if (contentType.includes('multipart/form-data') && (req as any).rawBody) {
      body = (req as any).rawBody.toString('binary');
      isBase64Encoded = false;
    } else if (req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
    }

    const event = {
      httpMethod: req.method,
      headers: req.headers,
      queryStringParameters: Object.fromEntries(url.searchParams),
      body,
      isBase64Encoded,
    };

    const result = await handler(event);

    res.status(result.statusCode);
    Object.entries(result.headers).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });
    res.send(result.body);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error', stack: error.stack });
  }
};

app.use('/api', apiHandler);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
});
