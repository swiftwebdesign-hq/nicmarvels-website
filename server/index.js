import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import {
  Account,
  Client,
  ID,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
} from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = (() => {
  if (typeof __dirname === 'string') return __dirname;
  try {
    const metaUrl = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
    if (metaUrl) return path.dirname(fileURLToPath(metaUrl));
  } catch {}
  return process.cwd();
})();

// Detect serverless execution. Netlify does not reliably set NETLIFY=true on
// the Lambda, so we also check the AWS-provided variables that are always
// present inside the Lambda runtime.
const isServerless =
  process.env.NETLIFY === 'true' ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.AWS_EXECUTION_ENV);

// Load a local .env only when running standalone (local dev / tests).
// On Netlify, environment variables come from the dashboard, so this branch is
// skipped and the dynamic import never executes at runtime on Lambda.

const app = express();
const PORT = Number(process.env.PORT || 4173);
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'ogunlekeprecious001@gmail.com').trim().toLowerCase();
const MAX_FILE_BYTES = 2 * 1024 * 1024;

if (isServerless) app.set('trust proxy', 1);

const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const siteOrigin = String(process.env.URL || '').trim().replace(/\/$/, '');
if (siteOrigin) allowedOrigins.add(siteOrigin);

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 600,
}));

app.use(express.json({ limit: '48kb' }));

function clientIpKey(req) {
  const clientIp = req.ip
    || req.get('x-nf-client-connection-ip')?.split(',')[0]?.trim()
    || req.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  return ipKeyGenerator(clientIp);
}

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { message: 'Too many applications from this connection. Please wait and try again.' },
});

const recordReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: clientIpKey,
  message: { message: 'Too many record requests. Please wait before trying again.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 2, fileSize: MAX_FILE_BYTES, fields: 40, fieldSize: 6000 },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('Only JPG, PNG and WEBP images are accepted.'));
    }
    callback(null, true);
  },
});

const requiredConfig = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_REGISTRATIONS_TABLE_ID',
  'APPWRITE_STORAGE_BUCKET_ID',
  'APPWRITE_ADMIN_USER_ID',
];

const configured = () => requiredConfig.every((key) => Boolean(process.env[key]?.trim()));

function apiUnavailable(res) {
  return res.status(503).json({ message: 'The academy records service is not configured yet.' });
}

function serverClient() {
  if (!configured()) throw new Error('Missing required Appwrite configuration');
  return new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
}

function ids() {
  return {
    databaseId: process.env.APPWRITE_DATABASE_ID,
    tableId: process.env.APPWRITE_REGISTRATIONS_TABLE_ID,
    bucketId: process.env.APPWRITE_STORAGE_BUCKET_ID,
  };
}

function adminPermissions() {
  const role = Role.user(process.env.APPWRITE_ADMIN_USER_ID);
  return [Permission.read(role), Permission.update(role), Permission.delete(role)];
}

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

const optionalText = (max = 500) => z.string().trim().max(max).optional().default('');

const submissionSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  middleName: optionalText(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  dateOfBirth: z.string().trim().min(1).max(32),
  maritalStatus: z.enum(['Single', 'Married']),
  pregnant: z.enum(['Yes', 'No']),
  addressLine1: z.string().trim().min(1).max(500),
  addressLine2: optionalText(500),
  city: z.string().trim().min(1).max(160),
  state: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(3).max(80),
  gender: z.enum(['Male', 'Female']),
  sewingExperience: z.enum(['Yes', 'No']),
  program: z.enum([
    'Beginners → Advanced (8 Months)',
    'Intermediate → Advanced (5 Months)',
    'Beginners → Intermediate (4 Months)',
    'Beginners (3 Months)',
    'Intermediate (3 Months)',
    'Advanced Class (3 Months)',
  ]),
  estimatedStartDate: optionalText(32),
  guardianFirstName: optionalText(120),
  guardianLastName: optionalText(120),
  guardianAddress: optionalText(500),
  guardianPhone: optionalText(80),
  guardianEmail: z.union([z.literal(''), z.string().trim().email().max(320)]).optional().default(''),
  declarationAccepted: z.literal('yes').transform(() => true),
});

function uploadedImageKind(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

async function authenticateAdmin(req, res, next) {
  if (!configured()) return apiUnavailable(res);
  const auth = req.get('authorization') || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!jwt || jwt.length > 4096) {
    return sendError(res, 401, 'Sign in with the academy account to continue.');
  }
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(jwt);
    const profile = await new Account(client).get();
    if (
      String(profile.email || '').toLowerCase() !== ADMIN_EMAIL ||
      profile.$id !== process.env.APPWRITE_ADMIN_USER_ID
    ) {
      return sendError(res, 403, 'This account is not authorised to view academy records.');
    }
    req.admin = { id: profile.$id, email: String(profile.email).toLowerCase() };
    next();
  } catch {
    return sendError(res, 401, 'Your session could not be verified. Please sign in again.');
  }
}

app.get('/api/health', (_req, res) => res.json({ configured: configured() }));

app.post(
  '/api/submissions',
  formLimiter,
  upload.fields([
    { name: 'passportPhoto', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  async (req, res) => {
    if (!configured()) return apiUnavailable(res);
    if (req.body?.website) return res.status(202).json({ ok: true });

    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Please review the required fields and submit again.');
    }

    const files = req.files || {};
    const passport = files.passportPhoto?.[0];
    const signature = files.signature?.[0];

    for (const file of [passport, signature].filter(Boolean)) {
      if (!uploadedImageKind(file.buffer)) {
        return sendError(res, 400, 'An uploaded file is not a valid JPG, PNG or WEBP image.');
      }
    }

    const client = serverClient();
    const storage = new Storage(client);
    const tables = new TablesDB(client);
    const { databaseId, tableId, bucketId } = ids();
    const uploadedIds = [];

    try {
      async function store(file, prefix) {
        if (!file) return '';
        const kind = uploadedImageKind(file.buffer);
        const fileId = ID.unique();
        await storage.createFile({
          bucketId,
          fileId,
          file: InputFile.fromBuffer(file.buffer, `${prefix}-${fileId}.${kind.ext}`),
          permissions: adminPermissions(),
        });
        uploadedIds.push(fileId);
        return fileId;
      }

      const passportFileId = await store(passport, 'passport');
      const signatureFileId = await store(signature, 'signature');

      const data = {
        ...parsed.data,
        passportFileId,
        signatureFileId,
        submissionTime: new Date().toISOString(),
        processed: false,
      };

      await tables.createRow({
        databaseId,
        tableId,
        rowId: ID.unique(),
        data,
        permissions: adminPermissions(),
      });

      return res.status(201).json({ ok: true });
    } catch (error) {
      await Promise.all(
        uploadedIds.map((fileId) => storage.deleteFile({ bucketId, fileId }).catch(() => undefined))
      );
      console.error('Enrollment submission failed:', error?.code || error?.type || 'upstream error');
      return sendError(res, 502, 'The application could not be saved. Please try again later.');
    }
  }
);

app.get('/api/submissions', recordReadLimiter, authenticateAdmin, async (_req, res) => {
  try {
    const { databaseId, tableId } = ids();
    const tables = new TablesDB(serverClient());
    const rows = [];
    let total = 0;
    let offset = 0;

    while (true) {
      const result = await tables.listRows({
        databaseId,
        tableId,
        queries: [Query.orderDesc('$createdAt'), Query.limit(100), Query.offset(offset)],
      });
      const page = result.rows || [];
      rows.push(...page);
      total = result.total || rows.length;
      if (!page.length || rows.length >= total) break;
      offset += page.length;
    }

    return res.json({ rows, total });
  } catch (error) {
    console.error('Unable to list academy records:', error?.code || error?.type || 'upstream error');
    return sendError(res, 502, 'Private records are temporarily unavailable.');
  }
});

app.get('/api/submissions/:rowId', authenticateAdmin, async (req, res) => {
  try {
    const { databaseId, tableId } = ids();
    const tables = new TablesDB(serverClient());
    const row = await tables.getRow({ databaseId, tableId, rowId: req.params.rowId });
    return res.json({ row });
  } catch (error) {
    return sendError(
      res,
      error?.code === 404 ? 404 : 502,
      error?.code === 404 ? 'Application not found.' : 'The application could not be opened.'
    );
  }
});

app.patch('/api/submissions/:rowId', authenticateAdmin, async (req, res) => {
  const body = z.object({ processed: z.boolean() }).safeParse(req.body);
  if (!body.success) return sendError(res, 400, 'A valid processed status is required.');

  try {
    const { databaseId, tableId } = ids();
    const tables = new TablesDB(serverClient());
    const row = await tables.updateRow({
      databaseId,
      tableId,
      rowId: req.params.rowId,
      data: { processed: body.data.processed },
    });
    return res.json({ ok: true, row });
  } catch (error) {
    return sendError(
      res,
      error?.code === 404 ? 404 : 502,
      error?.code === 404 ? 'Application not found.' : 'The application could not be updated.'
    );
  }
});

app.get('/api/files/:fileId', authenticateAdmin, async (req, res) => {
  try {
    const { bucketId } = ids();
    const storage = new Storage(serverClient());
    const metadata = await storage.getFile({ bucketId, fileId: req.params.fileId });
    const bytes = await storage.getFileView({ bucketId, fileId: req.params.fileId });
    res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', bytes.byteLength);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Content-Disposition', 'inline; filename="academy-upload"');
    return res.end(Buffer.from(bytes));
  } catch (error) {
    return sendError(res, error?.code === 404 ? 404 : 502, 'The private file could not be opened.');
  }
});

app.use(
  express.static(path.resolve(currentDir, '../site/admin'), {
    index: 'index.html',
    extensions: ['html'],
    maxAge: '1h',
  })
);

app.get('*', (_req, res) =>
  res.sendFile(path.resolve(currentDir, '../site/admin/index.html'), (error) => {
    if (error && !res.headersSent) return sendError(res, 404, 'Not found.');
  })
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return sendError(
      res,
      400,
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 2 MB or smaller.'
        : 'Please check the selected files and try again.'
    );
  }
  if (error?.message === 'Origin not allowed') {
    return sendError(res, 403, 'This site is not allowed to access the academy records service.');
  }
  if (error?.message?.startsWith('Only JPG')) {
    return sendError(res, 400, error.message);
  }
  console.error('Unhandled academy API error:', error?.name || 'Error');
  return sendError(res, 500, 'The request could not be completed.');
});

// ---------------------------------------------------------------------------
// Export for the Netlify Function bundle. This is the value
// netlify/functions/api.js imports as `app`.
// ---------------------------------------------------------------------------
export default app;

// ---------------------------------------------------------------------------
// Only start a listening socket when running as a standalone process.
// Inside a Lambda there is no listening socket — serverless-http bridges the
// event into Express — and calling app.listen() there is wasted work that can
// wedge a cold start. The isServerless flag is computed at the top of the file.
// ---------------------------------------------------------------------------
if (!isServerless) {
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Niksmarvel private portal listening on port ${PORT}; configured=${configured()}`)
  );
}
