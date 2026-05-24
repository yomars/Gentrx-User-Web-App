const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { connectToDb, pool, checkDbHealth, validateDbEnv } = require('./db');
const { admin: firebaseAdmin, firebaseStatus } = require('./firebase');
require('dotenv').config();

const parseBoolean = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    return String(value).trim().toLowerCase() === 'true';
};

const requiredServices = {
    requireDb: parseBoolean(process.env.REQUIRE_DB, true),
    requireFirebaseAuth: parseBoolean(process.env.REQUIRE_FIREBASE_AUTH, false),
};

const corsAllowList = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (curl, health checks) and explicit allow-list entries.
        if (!origin) {
            callback(null, true);
            return;
        }

        if (!corsAllowList.length || corsAllowList.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storageRootDir = path.join(__dirname, '..', 'storage');
const patientFilesStorageDir = path.join(storageRootDir, 'patient-files');
const clinicStorageDir = path.join(storageRootDir, 'clinics');
const clinicGalleryStorageDir = path.join(storageRootDir, 'clinic-gallery');
fs.mkdirSync(patientFilesStorageDir, { recursive: true });
fs.mkdirSync(clinicStorageDir, { recursive: true });
fs.mkdirSync(clinicGalleryStorageDir, { recursive: true });
app.use('/storage', express.static(storageRootDir));
app.use('/public/storage', express.static(storageRootDir));

const patientFilesUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, patientFilesStorageDir),
        filename: (_req, file, cb) => {
            const safeName = String(file.originalname || 'file')
                .replace(/[^a-zA-Z0-9._-]+/g, '_')
                .replace(/_+/g, '_');
            const ext = path.extname(safeName);
            const baseName = path.basename(safeName, ext) || 'file';
            cb(null, `${Date.now()}_${baseName}${ext}`);
        },
    }),
    limits: {
        files: 10,
        fileSize: 15 * 1024 * 1024,
    },
});

const createDiskUpload = (destinationDir, { files = 10, fileSize = 15 * 1024 * 1024 } = {}) => multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, destinationDir),
        filename: (_req, file, cb) => {
            const safeName = String(file.originalname || 'file')
                .replace(/[^a-zA-Z0-9._-]+/g, '_')
                .replace(/_+/g, '_');
            const ext = path.extname(safeName);
            const baseName = path.basename(safeName, ext) || 'file';
            cb(null, `${Date.now()}_${baseName}${ext}`);
        },
    }),
    limits: {
        files,
        fileSize,
    },
});

const clinicImageUpload = createDiskUpload(clinicStorageDir, { files: 1, fileSize: 10 * 1024 * 1024 });
const clinicGalleryUpload = createDiskUpload(clinicGalleryStorageDir, { files: 10, fileSize: 10 * 1024 * 1024 });

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbHealth = await checkDbHealth();
    const dependencies = {
        database: dbHealth,
        firebase: {
            ok: Boolean(firebaseStatus.initialized),
            source: firebaseStatus.source || null,
            error: firebaseStatus.error || null,
        },
    };

    const dbRequiredFailed = requiredServices.requireDb && !dependencies.database.ok;
    const firebaseRequiredFailed = requiredServices.requireFirebaseAuth && !dependencies.firebase.ok;
    const isHealthy = !dbRequiredFailed && !firebaseRequiredFailed;

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        required_services: requiredServices,
        dependencies,
    });
});

// Example: Query endpoint (PostgreSQL)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users LIMIT 10');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Example: Firebase Auth verification endpoint
app.post('/api/verify-token', async (req, res) => {
    if (!firebaseStatus.initialized) {
        return res.status(503).json({ error: 'Firebase auth service is not configured' });
    }

    const { idToken } = req.body;
    try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        res.json({ uid: decodedToken.uid, email: decodedToken.email });
    } catch (err) {
        res.status(401).json({ error: 'Invalid Firebase ID token' });
    }
});

// ===========================================================================
// FINANCE HELPERS
// ===========================================================================

/** Paginated query helper — returns rows + total count */
async function paginatedQuery({ baseSelect, from, joins = '', where = '1=1', params = [], start = 0, limit = 50, orderBy = 'created_at DESC' }) {
    const dataRes = await pool.query(
        `SELECT ${baseSelect} FROM ${from} ${joins} WHERE ${where} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, start]
    );
    const countRes = await pool.query(
        `SELECT COUNT(*) AS total FROM ${from} ${joins} WHERE ${where}`,
        params
    );
    return { rows: dataRes.rows, total: parseInt(countRes.rows[0].total, 10) };
}

function toMoney(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullablePositiveInt(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

let familyMembersPatientCodeSchemaValidated = false;

async function ensureFamilyMembersPatientCodeSchema() {
    if (familyMembersPatientCodeSchemaValidated) {
        return;
    }

    const familyColumns = await getTableColumns('family_members');
    if (!hasTableColumn(familyColumns, 'patient_code')) {
        throw new Error('Migration required: family_members.patient_code column is missing');
    }

    familyMembersPatientCodeSchemaValidated = true;
}

async function resolvePatientContextFromSource(source = {}) {
    const patientCode = String(source.patient_code || source.owner_id || '').trim();
    const rawUserId = toNullablePositiveInt(source.user_id);

    let patient = null;
    if (patientCode) {
        const patientRes = await pool.query(
            `SELECT id, user_id, patient_code, f_name, l_name, isd_code, phone, gender, dob
             FROM patients
             WHERE patient_code = $1
             LIMIT 1`,
            [patientCode]
        );
        patient = patientRes.rows[0] || null;
    } else if (rawUserId) {
        const patientRes = await pool.query(
            `SELECT id, user_id, patient_code, f_name, l_name, isd_code, phone, gender, dob
             FROM patients
             WHERE id = $1 OR user_id = $1
             ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END
             LIMIT 1`,
            [rawUserId]
        );
        patient = patientRes.rows[0] || null;
    }

    const effectiveUserId = toNullablePositiveInt(patient?.user_id) || toNullablePositiveInt(rawUserId) || toNullablePositiveInt(patient?.id);
    return {
        patient,
        patientCode: patient?.patient_code || patientCode || null,
        effectiveUserId,
    };
}

async function ensureSelfFamilyMemberForPatient(patientContext) {
    if (!patientContext?.patient || !patientContext?.patientCode) {
        return null;
    }

    await ensureFamilyMembersPatientCodeSchema();

    const existingByCode = await pool.query(
        `SELECT id FROM family_members WHERE patient_code = $1 ORDER BY id ASC LIMIT 1`,
        [patientContext.patientCode]
    );
    if (existingByCode.rows.length) {
        return toNullablePositiveInt(existingByCode.rows[0].id);
    }

    if (patientContext.effectiveUserId) {
        const existingByIdentity = await pool.query(
            `SELECT id
             FROM family_members
             WHERE user_id = $1
               AND LOWER(COALESCE(f_name, '')) = LOWER($2)
               AND LOWER(COALESCE(l_name, '')) = LOWER($3)
             ORDER BY id ASC
             LIMIT 1`,
            [
                patientContext.effectiveUserId,
                String(patientContext.patient.f_name || '').trim(),
                String(patientContext.patient.l_name || '').trim(),
            ]
        );
        if (existingByIdentity.rows.length) {
            const existingId = toNullablePositiveInt(existingByIdentity.rows[0].id);
            if (existingId) {
                await pool.query(
                    `UPDATE family_members SET patient_code = COALESCE(patient_code, $1), updated_at = NOW() WHERE id = $2`,
                    [patientContext.patientCode, existingId]
                );
            }
            return existingId;
        }
    }

    const insertColumns = ['user_id', 'f_name', 'l_name', 'isd_code', 'phone', 'gender', 'dob', 'created_at', 'updated_at'];
    const insertParams = [
        patientContext.effectiveUserId,
        String(patientContext.patient.f_name || '').trim() || 'Patient',
        String(patientContext.patient.l_name || '').trim() || 'Self',
        String(patientContext.patient.isd_code || '').trim(),
        String(patientContext.patient.phone || '').trim(),
        String(patientContext.patient.gender || '').trim() || null,
        patientContext.patient.dob || null,
    ];
    const valueTokens = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', 'NOW()', 'NOW()'];

    insertColumns.push('patient_code');
    insertParams.push(patientContext.patientCode);
    valueTokens.push(`$${insertParams.length}`);

    const inserted = await pool.query(
        `INSERT INTO family_members (${insertColumns.join(', ')}) VALUES (${valueTokens.join(', ')}) RETURNING id`,
        insertParams
    );
    return toNullablePositiveInt(inserted.rows[0]?.id);
}

async function getFamilyMemberById(familyMemberId) {
    if (!familyMemberId) {
        return null;
    }

    await ensureFamilyMembersPatientCodeSchema();

    const result = await pool.query(
        `SELECT id, user_id, patient_code, f_name, l_name
         FROM family_members
         WHERE id = $1
         LIMIT 1`,
        [familyMemberId]
    );

    return result.rows[0] || null;
}

function getScopedDoctorId(req) {
    return toNullablePositiveInt(
        req.query?.doctor_id ||
        req.body?.doctor_id ||
        req.headers['x-doctor-id'] ||
        req.headers['x-user-doctor-id'] ||
        req.headers['x-doctor-scope-id']
    );
}

function parseFeeBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
    return fallback;
}

function normalizeFeeRole(rawRole) {
    const role = String(rawRole || '').trim().toLowerCase();
    if (['doctor', 'user', 'clinic'].includes(role)) {
        return role;
    }
    return null;
}

function resolveFeeOwnership({ role, doctorId, userId, clinicId }) {
    const resolvedDoctorId = toNullablePositiveInt(doctorId);
    const resolvedUserId = toNullablePositiveInt(userId);
    const resolvedClinicId = toNullablePositiveInt(clinicId);

    if (role === 'doctor') {
        if (!resolvedDoctorId || resolvedUserId || resolvedClinicId) {
            return { valid: false, message: 'role=doctor requires doctor_id only.' };
        }
        return { valid: true, doctor_id: resolvedDoctorId, user_id: null, clinic_id: null };
    }

    if (role === 'user') {
        if (!resolvedUserId || resolvedDoctorId || resolvedClinicId) {
            return { valid: false, message: 'role=user requires user_id only.' };
        }
        return { valid: true, doctor_id: null, user_id: resolvedUserId, clinic_id: null };
    }

    if (role === 'clinic') {
        if (!resolvedClinicId || resolvedDoctorId || resolvedUserId) {
            return { valid: false, message: 'role=clinic requires clinic_id only.' };
        }
        return { valid: true, doctor_id: null, user_id: null, clinic_id: resolvedClinicId };
    }

    return { valid: false, message: 'role must be one of doctor, user, clinic.' };
}

async function ensureFeePaymentSequence() {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS seq_fee_payment_number START 1`);
}

async function buildDoctorPatientCodeExistsClause({ patientCodeExpression, doctorParamToken }) {
    const appointmentColumns = await getTableColumns('appointments');
    const doctorPredicates = [];

    if (hasTableColumn(appointmentColumns, 'doctor_id')) {
        doctorPredicates.push(`a.doctor_id = ${doctorParamToken}`);
    }
    if (hasTableColumn(appointmentColumns, 'doct_id')) {
        doctorPredicates.push(`a.doct_id = ${doctorParamToken}`);
    }

    if (!doctorPredicates.length || !hasTableColumn(appointmentColumns, 'patient_code')) {
        return null;
    }

    return `EXISTS (
        SELECT 1
        FROM appointments a
        WHERE a.patient_code = ${patientCodeExpression}
          AND (${doctorPredicates.join(' OR ')})
    )`;
}

async function doctorHasAccessToPatientCode(doctorId, patientCode) {
    const normalizedPatientCode = String(patientCode || '').trim();
    if (!doctorId || !normalizedPatientCode) {
        return false;
    }

    const clause = await buildDoctorPatientCodeExistsClause({
        patientCodeExpression: '$2',
        doctorParamToken: '$1',
    });

    if (!clause) {
        return false;
    }

    const result = await pool.query(
        `SELECT 1 WHERE ${clause} LIMIT 1`,
        [doctorId, normalizedPatientCode]
    );

    return Boolean(result.rows.length);
}

// ===========================================================================
// FINANCE: INVOICES
// ===========================================================================

const INVOICE_SELECT = `
    i.id, i.invoice_number, i.appointment_id, i.patient_code, i.clinic_id, i.doctor_id,
    i.invoice_description, i.service_charge, i.payment_method, i.payment_status,
    i.payment_transaction_id, i.is_wallet_txn, i.created_at, i.updated_at,
    CONCAT(p.f_name, ' ', p.l_name) AS patient_name,
    u.name AS doctor_name,
    c.title AS clinic_name
`;

const INVOICE_FROM  = 'invoices i';
const INVOICE_JOINS = `
    LEFT JOIN patients p ON p.patient_code = i.patient_code
    LEFT JOIN doctors d  ON d.id = i.doctor_id
    LEFT JOIN users u    ON u.id = d.user_id
    LEFT JOIN clinics c  ON c.id = i.clinic_id
`;

app.get('/api/v1/get_invoice', async (req, res) => {
    try {
        const start     = parseInt(req.query.start || 0, 10);
        const end       = parseInt(req.query.end   || 49, 10);
        const limit     = end - start + 1;
        const search    = (req.query.search    || '').trim();
        const clinicId  = req.query.clinic_id  || null;
        const doctorId  = getScopedDoctorId(req);

        const conditions = [];
        const params     = [];

        if (clinicId) { params.push(clinicId); conditions.push(`i.clinic_id = $${params.length}`); }
        if (doctorId) { params.push(doctorId); conditions.push(`i.doctor_id = $${params.length}`); }
        if (search) {
            const s = `%${search}%`;
            params.push(s, s, s);
            const n = params.length;
            conditions.push(`(i.invoice_number ILIKE $${n - 2} OR i.payment_status ILIKE $${n - 1} OR CONCAT(p.f_name,' ',p.l_name) ILIKE $${n})`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const { rows, total } = await paginatedQuery({ baseSelect: INVOICE_SELECT, from: INVOICE_FROM, joins: INVOICE_JOINS, where, params, start, limit, orderBy: 'i.created_at DESC' });
        res.json({ response: 200, status: true, data: rows, total_record: total });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_invoice/:id', async (req, res) => {
    try {
        const doctorId = getScopedDoctorId(req);
        const params = [req.params.id];
        let where = 'i.id = $1';
        if (doctorId) {
            params.push(doctorId);
            where += ` AND i.doctor_id = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT ${INVOICE_SELECT} FROM ${INVOICE_FROM} ${INVOICE_JOINS} WHERE ${where}`,
            params
        );
        if (!result.rows.length) return res.status(404).json({ response: 404, status: false, message: 'Invoice not found' });
        res.json({ response: 200, status: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_invoice', async (req, res) => {
    try {
        const { appointment_id, clinic_id, patient_code, doctor_id, invoice_description, service_charge, payment_method, payment_status, payment_transaction_id, is_wallet_txn } = req.body;
        if (!patient_code) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }
        const result = await pool.query(
            `INSERT INTO invoices (invoice_number, appointment_id, clinic_id, patient_code, doctor_id, invoice_description, service_charge, payment_method, payment_status, payment_transaction_id, is_wallet_txn)
             VALUES (CONCAT('INV-', EXTRACT(YEAR FROM NOW()), '-', LPAD(NEXTVAL('seq_invoice_number')::TEXT, 6, '0')), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, invoice_number`,
            [appointment_id, clinic_id, patient_code, doctor_id, invoice_description || 'Appointment Payment', service_charge || 0, payment_method || 'Other', payment_status || 'Pending', payment_transaction_id, is_wallet_txn ? true : false]
        );
        res.json({ response: 200, status: true, message: 'Invoice created.', id: result.rows[0].id, invoice_number: result.rows[0].invoice_number });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/update_invoice', async (req, res) => {
    try {
        const { id, payment_status, payment_method, payment_transaction_id, service_charge, invoice_description } = req.body;
        if (!id) return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        await pool.query(
            `UPDATE invoices SET payment_status=COALESCE($1,payment_status), payment_method=COALESCE($2,payment_method), payment_transaction_id=COALESCE($3,payment_transaction_id), service_charge=COALESCE($4,service_charge), invoice_description=COALESCE($5,invoice_description), updated_at=NOW() WHERE id=$6`,
            [payment_status, payment_method, payment_transaction_id, service_charge, invoice_description, id]
        );
        res.json({ response: 200, status: true, message: 'Invoice updated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// FINANCE: PAYMENTS
// ===========================================================================

const PAYMENT_SELECT = `
    py.id, py.appointment_id, py.invoice_id, py.patient_code, py.clinic_id, py.doctor_id,
    py.service_charge, py.payment_method, py.payment_status, py.payment_transaction_id,
    py.invoice_description, py.is_wallet_txn, py.created_at, py.updated_at, i.invoice_number,
    CONCAT(p.f_name, ' ', p.l_name) AS patient_name,
    u.name AS doctor_name,
    c.title AS clinic_name
`;

const PAYMENT_FROM  = 'payments py';
const PAYMENT_JOINS = `
    LEFT JOIN patients p ON p.patient_code = py.patient_code
    LEFT JOIN doctors d  ON d.id  = py.doctor_id
    LEFT JOIN users u    ON u.id  = d.user_id
    LEFT JOIN clinics c  ON c.id  = py.clinic_id
    LEFT JOIN invoices i ON i.id  = py.invoice_id
`;

app.get('/api/v1/get_payment', async (req, res) => {
    try {
        const start    = parseInt(req.query.start || 0,  10);
        const end      = parseInt(req.query.end   || 49, 10);
        const limit    = end - start + 1;
        const search   = (req.query.search   || '').trim();
        const clinicId = req.query.clinic_id || null;
        const doctorId = getScopedDoctorId(req);

        const conditions = [];
        const params     = [];

        if (clinicId) { params.push(clinicId); conditions.push(`py.clinic_id = $${params.length}`); }
        if (doctorId) { params.push(doctorId); conditions.push(`py.doctor_id = $${params.length}`); }
        if (search) {
            const s = `%${search}%`;
            params.push(s, s, s, s);
            const n = params.length;
            conditions.push(`(py.payment_status ILIKE $${n - 3} OR py.payment_method ILIKE $${n - 2} OR py.payment_transaction_id ILIKE $${n - 1} OR CONCAT(p.f_name,' ',p.l_name) ILIKE $${n})`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const { rows, total } = await paginatedQuery({ baseSelect: PAYMENT_SELECT, from: PAYMENT_FROM, joins: PAYMENT_JOINS, where, params, start, limit, orderBy: 'py.created_at DESC' });
        res.json({ response: 200, status: true, data: rows, total_record: total });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_payment/:id', async (req, res) => {
    try {
        const doctorId = getScopedDoctorId(req);
        const params = [req.params.id];
        let where = 'py.id = $1';
        if (doctorId) {
            params.push(doctorId);
            where += ` AND py.doctor_id = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT ${PAYMENT_SELECT} FROM ${PAYMENT_FROM} ${PAYMENT_JOINS} WHERE ${where}`,
            params
        );
        if (!result.rows.length) return res.status(404).json({ response: 404, status: false, message: 'Payment not found' });
        res.json({ response: 200, status: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_payment', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const {
            appointment_id,
            invoice_id,
            clinic_id,
            patient_code,
            doctor_id,
            service_charge,
            amount,
            payment_method,
            payment_status,
            payment_transaction_id,
            transaction_reference,
            invoice_description,
            is_wallet_txn,
        } = req.body;
        const walletIdentity = normalizePatientWalletIdentity(req.body);
        const resolvedPatientCode = String(
            patient_code || walletIdentity.patientCode || walletIdentity.ownerId || ''
        ).trim();
        const walletLookupCode = String(
            walletIdentity.lookupPatientCode || resolvedPatientCode
        ).trim();

        if (!resolvedPatientCode) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const chargeAmount = toMoney(service_charge ?? amount, 0);
        const paymentReference = String(payment_transaction_id || transaction_reference || '').trim() || null;
        const walletDistribution = normalizeOwnerWalletIdentity(req.body || {});

        // Wallet deduction for wallet-based payments (atomic, with balance lock)
        if (is_wallet_txn) {
            await ensurePatientWallet(client, walletLookupCode);
            const wallet = await findPatientWallet(client, walletLookupCode, { forUpdate: true });
            if (!wallet || toMoney(wallet.balance, 0) < chargeAmount) {
                await client.query('ROLLBACK');
                return res.status(422).json({ response: 422, status: false, message: 'Insufficient wallet balance.' });
            }
            await client.query(`UPDATE wallets SET balance = COALESCE(balance, 0) - $1, updated_at=NOW() WHERE id=$2`, [chargeAmount, wallet.id]);
            await insertWalletTransaction(client, {
                walletId: wallet.id,
                patientCode: resolvedPatientCode,
                appointmentId: appointment_id,
                amount: chargeAmount,
                type: 'debit',
                description: invoice_description || 'Appointment Payment',
            });
        }

        if (String(payment_status || '').trim().toLowerCase() === 'paid') {
            await applyWalletDistributionCredits(client, {
                appointmentId: appointment_id,
                patientCode: resolvedPatientCode,
                invoiceDescription: invoice_description || 'Appointment Payment',
                doctorOwnerId: walletDistribution.doctorOwnerId,
                clinicOwnerId: walletDistribution.clinicOwnerId,
                pipeOwnerId: walletDistribution.pipeOwnerId,
                doctorFee: walletDistribution.doctorFee,
                clinicFee: walletDistribution.clinicFee,
                pipeFee: walletDistribution.pipeFee,
            });
        }

        const py = await client.query(
            `INSERT INTO payments (appointment_id, invoice_id, clinic_id, patient_code, doctor_id, service_charge, payment_method, payment_status, payment_transaction_id, invoice_description, is_wallet_txn)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [appointment_id, invoice_id, clinic_id, resolvedPatientCode, doctor_id, chargeAmount, payment_method || 'Other', payment_status || 'Pending', paymentReference, invoice_description || 'Appointment Payment', is_wallet_txn ? true : false]
        );
        const paymentId = py.rows[0].id;

        // Auto-create master ledger transaction (atomic via DB sequence)
        const txnStatus = { paid: 'success', failed: 'failed', cancelled: 'cancelled' }[(payment_status || '').toLowerCase()] || 'pending';
        await client.query(
            `INSERT INTO transactions (transaction_id, clinic_id, appointment_id, patient_code, doctor_id, payment_id, invoice_id, amount, type, status, payment_method, description)
             VALUES (CONCAT('TXN-', EXTRACT(YEAR FROM NOW()), '-', LPAD(NEXTVAL('seq_transaction_number')::TEXT, 6, '0')), $1,$2,$3,$4,$5,$6,$7,'debit',$8,$9,$10)`,
            [clinic_id, appointment_id, resolvedPatientCode, doctor_id, paymentId, invoice_id, chargeAmount, txnStatus, payment_method, invoice_description || 'Appointment Payment']
        );

        await client.query('COMMIT');
        res.json({ response: 200, status: true, message: 'Payment recorded.', payment_id: paymentId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ response: 500, status: false, message: err.message });
    } finally {
        client.release();
    }
});

// ===========================================================================
// FINANCE + SCHEDULING: CONFIRM SCHEDULE WITH WALLET PAYMENT (atomic)
// Rules enforced:
// 1) Appointment remains pending until wallet payment succeeds
// 2) Wallet balance is validated and deducted before confirmation
// 3) Insufficient balance blocks confirmation with clear message
// ===========================================================================
app.post('/api/v1/confirm_schedule_wallet_payment', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            appointment_id,
            patient_code,
            clinic_id,
            doctor_id,
            service_charge,
            amount,
            invoice_description,
            payment_method,
            payment_transaction_id,
            transaction_reference,
        } = req.body;
        const walletIdentity = normalizePatientWalletIdentity(req.body);

        const appointmentId = Number(appointment_id);
        const patientCode = String(
            patient_code || walletIdentity.patientCode || walletIdentity.ownerId || ''
        ).trim();
        const walletLookupCode = String(
            walletIdentity.lookupPatientCode || patientCode
        ).trim();

        if (!appointmentId || !patientCode) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                response: 422,
                status: false,
                message: 'appointment_id and patient_code are required',
            });
        }

        const appointmentRes = await client.query(
            `SELECT id, status FROM appointments WHERE id = $1 FOR UPDATE`,
            [appointmentId]
        );

        if (!appointmentRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                response: 404,
                status: false,
                message: 'Appointment not found',
            });
        }

        const currentStatus = String(appointmentRes.rows[0].status || '').toLowerCase();
        if (['confirmed', 'completed', 'visited'].includes(currentStatus)) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                response: 409,
                status: false,
                message: 'Appointment is already confirmed',
            });
        }

        const paymentAmount = toMoney(service_charge ?? amount, 0);
        const walletDistribution = normalizeOwnerWalletIdentity(req.body || {});
        if (paymentAmount < 0) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                response: 422,
                status: false,
                message: 'service_charge cannot be negative',
            });
        }

        await ensurePatientWallet(client, walletLookupCode);
        const walletRes = await findPatientWallet(client, walletLookupCode, { forUpdate: true });

        const walletBalance = toMoney(walletRes?.balance, 0);
        if (!walletRes || walletBalance < paymentAmount) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                response: 422,
                status: false,
                message: 'Insufficient wallet balance. Please top up to continue.',
                required_amount: paymentAmount,
                available_balance: walletBalance,
            });
        }

        if (paymentAmount > 0) {
            await client.query(
                `UPDATE wallets SET balance = COALESCE(balance, 0) - $1, updated_at=NOW() WHERE id=$2`,
                [paymentAmount, walletRes.id]
            );
            await insertWalletTransaction(client, {
                walletId: walletRes.id,
                patientCode,
                appointmentId,
                amount: paymentAmount,
                type: 'debit',
                description: invoice_description || 'Appointment payment',
            });
        }

        await applyWalletDistributionCredits(client, {
            appointmentId,
            patientCode,
            invoiceDescription: invoice_description || 'Appointment payment',
            doctorOwnerId: walletDistribution.doctorOwnerId,
            clinicOwnerId: walletDistribution.clinicOwnerId,
            pipeOwnerId: walletDistribution.pipeOwnerId,
            doctorFee: walletDistribution.doctorFee,
            clinicFee: walletDistribution.clinicFee,
            pipeFee: walletDistribution.pipeFee,
        });

        const walletPaymentReference = String(payment_transaction_id || transaction_reference || '').trim() || `wallet_${Date.now()}`;

        const invoiceRes = await client.query(
            `INSERT INTO invoices (
                invoice_number, appointment_id, clinic_id, patient_code, doctor_id,
                invoice_description, service_charge, payment_method, payment_status,
                payment_transaction_id, is_wallet_txn
             ) VALUES (
                CONCAT('INV-', EXTRACT(YEAR FROM NOW()), '-', LPAD(NEXTVAL('seq_invoice_number')::TEXT, 6, '0')),
                $1,$2,$3,$4,$5,$6,$7,'Paid',$8,TRUE
             ) RETURNING id, invoice_number`,
            [
                appointmentId,
                clinic_id || null,
                patientCode,
                doctor_id || null,
                invoice_description || 'Appointment payment',
                paymentAmount,
                payment_method || 'Wallet',
                walletPaymentReference,
            ]
        );

        const paymentRes = await client.query(
            `INSERT INTO payments (
                appointment_id, invoice_id, clinic_id, patient_code, doctor_id,
                service_charge, payment_method, payment_status, payment_transaction_id,
                invoice_description, is_wallet_txn
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,'Paid',$8,$9,TRUE) RETURNING id`,
            [
                appointmentId,
                invoiceRes.rows[0].id,
                clinic_id || null,
                patientCode,
                doctor_id || null,
                paymentAmount,
                payment_method || 'Wallet',
                walletPaymentReference,
                invoice_description || 'Appointment payment',
            ]
        );

        await client.query(
            `INSERT INTO transactions (
                transaction_id, clinic_id, appointment_id, patient_code, doctor_id,
                payment_id, invoice_id, amount, type, status, payment_method, description
             ) VALUES (
                CONCAT('TXN-', EXTRACT(YEAR FROM NOW()), '-', LPAD(NEXTVAL('seq_transaction_number')::TEXT, 6, '0')),
                $1,$2,$3,$4,$5,$6,$7,'debit','success',$8,$9
             )`,
            [
                clinic_id || null,
                appointmentId,
                patientCode,
                doctor_id || null,
                paymentRes.rows[0].id,
                invoiceRes.rows[0].id,
                paymentAmount,
                payment_method || 'Wallet',
                invoice_description || 'Appointment payment',
            ]
        );

        await client.query(
            `UPDATE appointments SET status='Confirmed' WHERE id=$1`,
            [appointmentId]
        );

        const updatedWalletRes = await findPatientWallet(client, walletLookupCode);

        await client.query('COMMIT');

        return res.json({
            response: 200,
            status: true,
            message: 'Payment successful. Appointment confirmed.',
            data: {
                appointment_id: appointmentId,
                invoice_id: invoiceRes.rows[0].id,
                invoice_number: invoiceRes.rows[0].invoice_number,
                payment_id: paymentRes.rows[0].id,
                wallet_balance: updatedWalletRes?.balance ?? walletBalance,
            },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        return res.status(500).json({ response: 500, status: false, message: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/v1/update_payment', async (req, res) => {
    try {
        const { id, payment_status, payment_method, payment_transaction_id } = req.body;
        if (!id) return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        await pool.query(
            `UPDATE payments SET payment_status=COALESCE($1,payment_status), payment_method=COALESCE($2,payment_method), payment_transaction_id=COALESCE($3,payment_transaction_id), updated_at=NOW() WHERE id=$4`,
            [payment_status, payment_method, payment_transaction_id, id]
        );
        if (payment_status) {
            const s = { paid: 'success', failed: 'failed', cancelled: 'cancelled' }[payment_status.toLowerCase()] || 'pending';
            await pool.query(`UPDATE transactions SET status=$1, updated_at=NOW() WHERE payment_id=$2`, [s, id]);
        }
        res.json({ response: 200, status: true, message: 'Payment updated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// FINANCE: FEES
// ===========================================================================

const FEE_SELECT = `
    f.id, f.payment_id, f.title, f.amount, f.percentage, f.base_charge,
    LOWER(f.role) AS role, f.doctor_id, f.user_id, f.clinic_id,
    f.created_at, f.updated_at,
    u.name AS doctor_name,
    usr.name AS user_name,
    c.title AS clinic_name,
    CASE
      WHEN LOWER(f.role) = 'doctor' THEN COALESCE(u.name, CONCAT('Doctor #', f.doctor_id::TEXT))
      WHEN LOWER(f.role) = 'user' THEN COALESCE(usr.name, CONCAT('User #', f.user_id::TEXT))
      WHEN LOWER(f.role) = 'clinic' THEN COALESCE(c.title, CONCAT('Clinic #', f.clinic_id::TEXT))
      ELSE 'Unknown'
    END AS owner_name
`;

const FEE_FROM = 'tbl_fees f';
const FEE_JOINS = `
    LEFT JOIN doctors d ON d.id = f.doctor_id
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN users usr ON usr.id = f.user_id
    LEFT JOIN clinics c ON c.id = f.clinic_id
`;

app.get('/api/v1/get_fee', async (req, res) => {
    try {
        const start = parseInt(req.query.start || 0, 10);
        const end = parseInt(req.query.end || 49, 10);
        const limit = end - start + 1;
        const search = String(req.query.search || '').trim();
        const clinicId = toNullablePositiveInt(req.query.clinic_id);
        const role = normalizeFeeRole(req.query.role);
        const doctorId = getScopedDoctorId(req);

        const baseChargeFilter = req.query.base_charge;
        const hasBaseChargeFilter = !(baseChargeFilter === undefined || baseChargeFilter === null || String(baseChargeFilter).trim() === '');
        const baseCharge = parseFeeBoolean(baseChargeFilter, false);

        const conditions = [];
        const params = [];

        if (clinicId) {
            params.push(clinicId);
            conditions.push(`f.clinic_id = $${params.length}`);
        }

        if (doctorId) {
            params.push(doctorId);
            conditions.push(`f.doctor_id = $${params.length}`);
        }

        if (role) {
            params.push(role);
            conditions.push(`LOWER(f.role) = $${params.length}`);
        }

        if (hasBaseChargeFilter) {
            params.push(baseCharge);
            conditions.push(`f.base_charge = $${params.length}`);
        }

        if (search) {
            const s = `%${search}%`;
            params.push(s, s, s, s);
            const n = params.length;
            conditions.push(`(
                f.payment_id ILIKE $${n - 3}
                OR f.title ILIKE $${n - 2}
                OR LOWER(f.role) ILIKE $${n - 1}
                OR COALESCE(u.name, usr.name, c.title, '') ILIKE $${n}
            )`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const { rows, total } = await paginatedQuery({
            baseSelect: FEE_SELECT,
            from: FEE_FROM,
            joins: FEE_JOINS,
            where,
            params,
            start,
            limit,
            orderBy: 'f.created_at DESC',
        });

        return res.json({ response: 200, status: true, data: rows, total_record: total });
    } catch (err) {
        return res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_fee/:id', async (req, res) => {
    try {
        const doctorId = getScopedDoctorId(req);
        const params = [req.params.id];
        let where = 'f.id = $1';

        if (doctorId) {
            params.push(doctorId);
            where += ` AND f.doctor_id = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT ${FEE_SELECT} FROM ${FEE_FROM} ${FEE_JOINS} WHERE ${where}`,
            params
        );

        if (!result.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Fee not found' });
        }

        return res.json({ response: 200, status: true, data: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_fee', async (req, res) => {
    try {
        const scopedDoctorId = getScopedDoctorId(req);
        const role = normalizeFeeRole(req.body.role);
        const title = String(req.body.title || '').trim();
        const amount = Number(req.body.amount ?? 0);
        const percentage = Number(req.body.percentage ?? 0);
        const base_charge = parseFeeBoolean(req.body.base_charge, false);

        if (!title) {
            return res.status(422).json({ response: 422, status: false, message: 'title is required' });
        }
        if (!role) {
            return res.status(422).json({ response: 422, status: false, message: 'role must be one of doctor, user, clinic' });
        }
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(422).json({ response: 422, status: false, message: 'amount must be a number greater than or equal to 0' });
        }
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
            return res.status(422).json({ response: 422, status: false, message: 'percentage must be between 0 and 100' });
        }

        const owner = resolveFeeOwnership({
            role,
            doctorId: req.body.doctor_id,
            userId: req.body.user_id,
            clinicId: req.body.clinic_id,
        });
        if (!owner.valid) {
            return res.status(422).json({ response: 422, status: false, message: owner.message });
        }

        if (scopedDoctorId && owner.doctor_id !== scopedDoctorId) {
            return res.status(403).json({ response: 403, status: false, message: 'Doctor scope mismatch for fee ownership.' });
        }

        await ensureFeePaymentSequence();

        const result = await pool.query(
            `INSERT INTO tbl_fees (payment_id, doctor_id, user_id, clinic_id, title, amount, percentage, base_charge, role)
             VALUES (LPAD(NEXTVAL('seq_fee_payment_number')::TEXT, 8, '0'), $1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, payment_id`,
            [
                owner.doctor_id,
                owner.user_id,
                owner.clinic_id,
                title,
                amount,
                percentage,
                base_charge,
                role,
            ]
        );

        return res.json({
            response: 200,
            status: true,
            message: 'Fee created.',
            id: result.rows[0].id,
            payment_id: result.rows[0].payment_id,
        });
    } catch (err) {
        return res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/update_fee', async (req, res) => {
    try {
        const scopedDoctorId = getScopedDoctorId(req);
        const id = toNullablePositiveInt(req.body.id);

        if (!id) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        }

        const current = await pool.query(`SELECT * FROM tbl_fees WHERE id = $1`, [id]);
        if (!current.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Fee not found' });
        }

        const existing = current.rows[0];
        if (scopedDoctorId && Number(existing.doctor_id || 0) !== scopedDoctorId) {
            return res.status(403).json({ response: 403, status: false, message: 'Doctor scope mismatch for fee record.' });
        }

        const role = normalizeFeeRole(req.body.role ?? existing.role);
        const title = req.body.title !== undefined ? String(req.body.title || '').trim() : existing.title;
        const amount = req.body.amount !== undefined ? Number(req.body.amount) : Number(existing.amount);
        const percentage = req.body.percentage !== undefined ? Number(req.body.percentage) : Number(existing.percentage);
        const base_charge = req.body.base_charge !== undefined
            ? parseFeeBoolean(req.body.base_charge, false)
            : Boolean(existing.base_charge);

        if (!title) {
            return res.status(422).json({ response: 422, status: false, message: 'title is required' });
        }
        if (!role) {
            return res.status(422).json({ response: 422, status: false, message: 'role must be one of doctor, user, clinic' });
        }
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(422).json({ response: 422, status: false, message: 'amount must be a number greater than or equal to 0' });
        }
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
            return res.status(422).json({ response: 422, status: false, message: 'percentage must be between 0 and 100' });
        }

        const owner = resolveFeeOwnership({
            role,
            doctorId: req.body.doctor_id !== undefined ? req.body.doctor_id : existing.doctor_id,
            userId: req.body.user_id !== undefined ? req.body.user_id : existing.user_id,
            clinicId: req.body.clinic_id !== undefined ? req.body.clinic_id : existing.clinic_id,
        });
        if (!owner.valid) {
            return res.status(422).json({ response: 422, status: false, message: owner.message });
        }

        if (scopedDoctorId && owner.doctor_id !== scopedDoctorId) {
            return res.status(403).json({ response: 403, status: false, message: 'Doctor scope mismatch for fee ownership.' });
        }

        await pool.query(
            `UPDATE tbl_fees
             SET doctor_id = $1,
                 user_id = $2,
                 clinic_id = $3,
                 title = $4,
                 amount = $5,
                 percentage = $6,
                 base_charge = $7,
                 role = $8,
                 updated_at = NOW()
             WHERE id = $9`,
            [
                owner.doctor_id,
                owner.user_id,
                owner.clinic_id,
                title,
                amount,
                percentage,
                base_charge,
                role,
                id,
            ]
        );

        return res.json({ response: 200, status: true, message: 'Fee updated.' });
    } catch (err) {
        return res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/delete_fee', async (req, res) => {
    try {
        const scopedDoctorId = getScopedDoctorId(req);
        const id = toNullablePositiveInt(req.body.id);

        if (!id) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        }

        if (scopedDoctorId) {
            const scopedDelete = await pool.query(
                `DELETE FROM tbl_fees WHERE id = $1 AND doctor_id = $2 RETURNING id`,
                [id, scopedDoctorId]
            );
            if (!scopedDelete.rows.length) {
                return res.status(404).json({ response: 404, status: false, message: 'Fee not found' });
            }
            return res.json({ response: 200, status: true, message: 'Fee deleted.' });
        }

        const result = await pool.query(`DELETE FROM tbl_fees WHERE id = $1 RETURNING id`, [id]);
        if (!result.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Fee not found' });
        }

        return res.json({ response: 200, status: true, message: 'Fee deleted.' });
    } catch (err) {
        return res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// FINANCE: TRANSACTIONS (read-only — populated by payment/wallet flows)
// ===========================================================================

const TXN_SELECT = `
    t.id, t.transaction_id, t.appointment_id, t.payment_id, t.invoice_id,
    t.amount, t.type, t.status, t.payment_method, t.description, t.reference,
    t.created_at, t.updated_at,
    CONCAT(p.f_name, ' ', p.l_name) AS patient_name,
    u.name AS doctor_name,
    c.title AS clinic_name
`;
const TXN_FROM  = 'transactions t';
const TXN_JOINS = `
    LEFT JOIN patients p ON p.patient_code = t.patient_code
    LEFT JOIN doctors d  ON d.id = t.doctor_id
    LEFT JOIN users u    ON u.id = d.user_id
    LEFT JOIN clinics c  ON c.id = t.clinic_id
`;

app.get('/api/v1/get_transaction', async (req, res) => {
    try {
        const start    = parseInt(req.query.start || 0,  10);
        const end      = parseInt(req.query.end   || 49, 10);
        const limit    = end - start + 1;
        const search   = (req.query.search   || '').trim();
        const clinicId = req.query.clinic_id || null;
        const doctorId = getScopedDoctorId(req);

        const conditions = [];
        const params     = [];

        if (clinicId) { params.push(clinicId); conditions.push(`t.clinic_id = $${params.length}`); }
        if (doctorId) { params.push(doctorId); conditions.push(`t.doctor_id = $${params.length}`); }
        if (search) {
            const s = `%${search}%`;
            params.push(s, s, s, s);
            const n = params.length;
            conditions.push(`(t.transaction_id ILIKE $${n - 3} OR t.type ILIKE $${n - 2} OR t.status ILIKE $${n - 1} OR CONCAT(p.f_name,' ',p.l_name) ILIKE $${n})`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const { rows, total } = await paginatedQuery({ baseSelect: TXN_SELECT, from: TXN_FROM, joins: TXN_JOINS, where, params, start, limit, orderBy: 't.created_at DESC' });
        res.json({ response: 200, status: true, data: rows, total_record: total });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_transaction/:id', async (req, res) => {
    try {
        const doctorId = getScopedDoctorId(req);
        const params = [req.params.id];
        let where = 't.id = $1';
        if (doctorId) {
            params.push(doctorId);
            where += ` AND t.doctor_id = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT ${TXN_SELECT} FROM ${TXN_FROM} ${TXN_JOINS} WHERE ${where}`,
            params
        );
        if (!result.rows.length) return res.status(404).json({ response: 404, status: false, message: 'Transaction not found' });
        res.json({ response: 200, status: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// FINANCE: WALLETS
// ===========================================================================

app.get('/api/v1/get_wallet', async (req, res) => {
    try {
        const walletJoinCondition = await buildWalletPatientJoinCondition('w.', 'p.');
        const start    = parseInt(req.query.start || 0,  10);
        const end      = parseInt(req.query.end   || 49, 10);
        const limit    = end - start + 1;
        const search   = (req.query.search   || '').trim();
        const clinicId = req.query.clinic_id || null;
        const doctorId = getScopedDoctorId(req);

        const conditions = [];
        const params     = [];

        if (clinicId) { params.push(clinicId); conditions.push(`p.clinic_id = $${params.length}`); }
        if (doctorId) {
            params.push(doctorId);
            const doctorScopeClause = await buildDoctorPatientCodeExistsClause({
                patientCodeExpression: 'p.patient_code',
                doctorParamToken: `$${params.length}`,
            });
            conditions.push(doctorScopeClause || '1=0');
        }
        if (search) {
            const s = `%${search}%`;
            params.push(s);
            conditions.push(`CONCAT(p.f_name,' ',p.l_name) ILIKE $${params.length}`);
        }

        const where  = conditions.length ? conditions.join(' AND ') : '1=1';
        const base   = `w.id, w.patient_code, w.balance, w.currency, w.created_at, w.updated_at, CONCAT(p.f_name,' ',p.l_name) AS patient_name, c.title AS clinic_name`;
        const from   = 'wallets w';
        const joins  = `JOIN patients p ON ${walletJoinCondition} LEFT JOIN clinics c ON c.id = p.clinic_id`;

        const { rows, total } = await paginatedQuery({ baseSelect: base, from, joins, where, params, start, limit, orderBy: 'w.updated_at DESC' });

        const summaryConditions = [];
        const summaryParams = [];
        if (clinicId) {
            summaryParams.push(clinicId);
            summaryConditions.push(`p.clinic_id = $${summaryParams.length}`);
        }
        if (doctorId) {
            summaryParams.push(doctorId);
            const summaryDoctorScopeClause = await buildDoctorPatientCodeExistsClause({
                patientCodeExpression: 'p.patient_code',
                doctorParamToken: `$${summaryParams.length}`,
            });
            summaryConditions.push(summaryDoctorScopeClause || '1=0');
        }
        const summaryWhere  = summaryConditions.length ? `WHERE ${summaryConditions.join(' AND ')}` : '';
        const summaryRes    = await pool.query(
            `SELECT SUM(w.balance) AS total_balance, COUNT(*) AS total_wallets, COUNT(CASE WHEN w.balance > 0 THEN 1 END) AS active_wallets FROM wallets w JOIN patients p ON ${walletJoinCondition} ${summaryWhere}`,
            summaryParams
        );
        res.json({ response: 200, status: true, data: rows, total_record: total, summary: summaryRes.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_wallet/:patient_code', async (req, res) => {
    try {
        const patientCode = String(req.params.patient_code || '').trim();
        const doctorId = getScopedDoctorId(req);

        if (doctorId) {
            const hasAccess = await doctorHasAccessToPatientCode(doctorId, patientCode);
            if (!hasAccess) {
                return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient does not belong to this doctor' });
            }
        }

        await ensurePatientWallet(pool, patientCode);
        const wallet = await findPatientWallet(pool, patientCode);
        const patient = await fetchPatientPublicByIdentifier(patientCode);
        res.json({
            response: 200,
            status: true,
            data: wallet ? {
                ...wallet,
                patient_name: patient ? `${patient.f_name || ''} ${patient.l_name || ''}`.trim() : null,
            } : null,
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

async function handleGetWalletTransactions(req, res) {
    try {
        const start     = parseInt(req.query.start     || 0,  10);
        const end       = parseInt(req.query.end       || 49, 10);
        const limit     = end - start + 1;
        const search    = (req.query.search    || '').trim();
        const clinicId  = req.query.clinic_id || null;
        const doctorId  = getScopedDoctorId(req);
        const patientCode = String(req.query.patient_code || '').trim();
        const ownerId = String(req.query.owner_id || '').trim();
        const ownerType = normalizeWalletOwnerType(req.query.owner_type);

        const conditions = [];
        const params     = [];

        if (clinicId) {
            params.push(clinicId);
            conditions.push(`p.clinic_id = $${params.length}`);
        }

        if (doctorId) {
            params.push(doctorId);
            const doctorScopeClause = await buildDoctorPatientCodeExistsClause({
                patientCodeExpression: 'wt.patient_code',
                doctorParamToken: `$${params.length}`,
            });
            conditions.push(doctorScopeClause || '1=0');
        }

        if (ownerId) {
            params.push(ownerType, ownerId, ownerId);
            const n = params.length;
            conditions.push(`(
                (LOWER(COALESCE(w.owner_type, '')) = $${n - 2} AND w.owner_id = $${n - 1})
                OR wt.patient_code = $${n}
            )`);
        } else if (patientCode) {
            params.push(patientCode);
            conditions.push(`wt.patient_code = $${params.length}`);
        }

        if (search) {
            const s = `%${search}%`;
            params.push(s, s);
            const n = params.length;
            conditions.push(`(wt.type ILIKE $${n - 1} OR wt.description ILIKE $${n})`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const base  = `wt.id, wt.wallet_id, wt.patient_code, w.owner_id, w.owner_type, wt.appointment_id, wt.amount, wt.type, wt.description, wt.created_at, wt.updated_at, CONCAT(p.f_name,' ',p.l_name) AS patient_name, c.title AS clinic_name`;
        const from  = 'wallet_transactions wt';
        const joins = 'LEFT JOIN wallets w ON w.id = wt.wallet_id JOIN patients p ON p.patient_code = wt.patient_code LEFT JOIN clinics c ON c.id=p.clinic_id';

        const { rows, total } = await paginatedQuery({ baseSelect: base, from, joins, where, params, start, limit, orderBy: 'wt.created_at DESC' });
        res.json({ response: 200, status: true, data: rows, total_record: total });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
}

app.get('/api/v1/get_wallet_transaction', handleGetWalletTransactions);
app.get('/api/v1/get_all_transaction', handleGetWalletTransactions);

app.post('/api/v1/wallet_topup', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { patient_code, amount, service_charge, description, transaction_reference, payment_transaction_id } = req.body;
        const walletIdentity = normalizePatientWalletIdentity(req.body);
        const resolvedPatientCode = String(
            patient_code || walletIdentity.patientCode || walletIdentity.ownerId || ''
        ).trim();
        const walletLookupCode = String(
            walletIdentity.lookupPatientCode || resolvedPatientCode
        ).trim();
        const numericAmount = service_charge ?? amount;
        if (!walletLookupCode || !numericAmount || isNaN(Number(numericAmount)) || Number(numericAmount) <= 0) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'owner_id/patient_code and a positive numeric amount are required' });
        }

        const numAmount = Number(numericAmount);
        const txnRef = String(transaction_reference || payment_transaction_id || '').trim();
        const idempotencyMatch = await buildPatientWalletMatchCondition('w.', '$2');

        // Check for idempotency — if transaction_reference already exists, return cached result
        if (txnRef) {
            const existing = await client.query(
                `SELECT wt.wallet_id, w.patient_code, w.balance, wt.created_at FROM wallet_transactions wt
                 JOIN wallets w ON w.id = wt.wallet_id
                 WHERE wt.description LIKE $1 AND (${idempotencyMatch}) LIMIT 1`,
                [`%${txnRef}%`, walletLookupCode]
            );
            if (existing.rows.length) {
                await client.query('ROLLBACK');
                return res.json({
                    response: 200,
                    status: true,
                    message: 'Wallet topped up (idempotent replay).',
                    new_balance: existing.rows[0].balance,
                    idempotent_replay: true
                });
            }
        }

        await ensurePatientWallet(client, walletLookupCode);
        const wallet = await findPatientWallet(client, walletLookupCode, { forUpdate: true });
        await client.query(`UPDATE wallets SET balance = COALESCE(balance, 0) + $1, updated_at=NOW() WHERE id=$2`, [numAmount, wallet.id]);
        const updatedWallet = await findPatientWallet(client, walletLookupCode);
        await insertWalletTransaction(client, {
            walletId: wallet.id,
            patientCode: resolvedPatientCode || wallet.patient_code || walletLookupCode,
            amount: numAmount,
            type: 'topup',
            description: (txnRef ? `Admin wallet top-up [${txnRef}]` : 'Admin wallet top-up') || description || 'Admin wallet top-up',
        });
        await client.query(
            `INSERT INTO transactions (transaction_id, patient_code, amount, type, status, description, reference) VALUES (CONCAT('TXN-', EXTRACT(YEAR FROM NOW()), '-', LPAD(NEXTVAL('seq_transaction_number')::TEXT, 6, '0')),$1,$2,'credit','success',$3,$4)`,
            [resolvedPatientCode || wallet.patient_code || walletLookupCode, numAmount, description || 'Wallet top-up', txnRef]
        );
        await client.query('COMMIT');
        res.json({ response: 200, status: true, message: 'Wallet topped up.', new_balance: updatedWallet?.balance ?? numAmount, idempotent_replay: false });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ response: 500, status: false, message: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/v1/wallet_deduct', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { patient_code, amount, service_charge, description, transaction_reference, payment_transaction_id } = req.body;
        const walletIdentity = normalizePatientWalletIdentity(req.body);
        const resolvedPatientCode = String(
            patient_code || walletIdentity.patientCode || walletIdentity.ownerId || ''
        ).trim();
        const walletLookupCode = String(
            walletIdentity.lookupPatientCode || resolvedPatientCode
        ).trim();
        const numericAmount = service_charge ?? amount;
        if (!walletLookupCode || !numericAmount || isNaN(Number(numericAmount)) || Number(numericAmount) <= 0) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'owner_id/patient_code and a positive numeric amount are required' });
        }

        const numAmount = Number(numericAmount);
        const txnRef = String(transaction_reference || payment_transaction_id || '').trim();
        const idempotencyMatch = await buildPatientWalletMatchCondition('w.', '$2');

        // Check for idempotency — if transaction_reference already exists, return cached result
        if (txnRef) {
            const existing = await client.query(
                `SELECT wt.wallet_id, w.patient_code, w.balance, wt.created_at FROM wallet_transactions wt
                 JOIN wallets w ON w.id = wt.wallet_id
                 WHERE wt.description LIKE $1 AND (${idempotencyMatch}) LIMIT 1`,
                [`%${txnRef}%`, walletLookupCode]
            );
            if (existing.rows.length) {
                await client.query('ROLLBACK');
                return res.json({
                    response: 200,
                    status: true,
                    message: 'Amount deducted (idempotent replay).',
                    new_balance: existing.rows[0].balance,
                    idempotent_replay: true
                });
            }
        }

        await ensurePatientWallet(client, walletLookupCode);
        const wallet = await findPatientWallet(client, walletLookupCode, { forUpdate: true });
        if (!wallet || toMoney(wallet.balance, 0) < numAmount) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'Insufficient wallet balance.' });
        }
        await client.query(`UPDATE wallets SET balance = COALESCE(balance, 0) - $1, updated_at=NOW() WHERE id=$2`, [numAmount, wallet.id]);
        await insertWalletTransaction(client, {
            walletId: wallet.id,
            patientCode: resolvedPatientCode || wallet.patient_code || walletLookupCode,
            amount: numAmount,
            type: 'debit',
            description: (txnRef ? `Admin wallet deduction [${txnRef}]` : 'Admin wallet deduction') || description || 'Admin wallet deduction',
        });
        const updated = await findPatientWallet(client, walletLookupCode);
        await client.query('COMMIT');
        res.json({ response: 200, status: true, message: 'Amount deducted.', new_balance: updated?.balance ?? 0, idempotent_replay: false });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ response: 500, status: false, message: err.message });
    } finally {
        client.release();
    }
});

// ===========================================================================
// FINANCE: WALLET RECONCILIATION (audit / sync verification)
// ===========================================================================
app.get('/api/v1/wallet_reconciliation', async (req, res) => {
    try {
        const identity = normalizePatientWalletIdentity(req.query || {});
        const patientCode = (req.query.patient_code || identity.ownerId || '').trim();
        const clinicId = req.query.clinic_id || null;

        if (!patientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const patient = await pool.query(`SELECT id, patient_code, clinic_id FROM patients WHERE patient_code = $1`, [patientCode]);
        if (!patient.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        if (clinicId && patient.rows[0].clinic_id && Number(patient.rows[0].clinic_id) !== Number(clinicId)) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient belongs to a different clinic' });
        }

        // Fetch actual wallet balance
        const wallet = await findPatientWallet(pool, identity.lookupPatientCode || patientCode);
        const actualBalance = wallet ? parseFloat(wallet.balance || 0) : 0;

        // Calculate expected balance from transaction ledger
        const txnRes = await pool.query(
            `SELECT
                COALESCE(SUM(CASE WHEN type IN ('credit','topup') THEN amount ELSE 0 END), 0) AS total_credits,
                COALESCE(SUM(CASE WHEN type IN ('debit','spent') THEN amount ELSE 0 END), 0) AS total_debits
             FROM transactions
             WHERE patient_code = $1 AND status = 'success'`,
            [patientCode]
        );

        const totalCredits = txnRes.rows[0] ? parseFloat(txnRes.rows[0].total_credits || 0) : 0;
        const totalDebits = txnRes.rows[0] ? parseFloat(txnRes.rows[0].total_debits || 0) : 0;
        const expectedBalance = totalCredits - totalDebits;

        const discrepancy = Math.abs(actualBalance - expectedBalance);
        const inSync = discrepancy < 0.01; // Allow 0.01 rounding error

        // Fetch recent transactions for context
        const recentTxns = await pool.query(
            `SELECT id, transaction_id, type, amount, status, description, created_at
             FROM transactions
             WHERE patient_code = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [patientCode]
        );

        res.json({
            response: 200,
            status: true,
            data: {
                patient_code: patientCode,
                clinic_id: patient.rows[0].clinic_id,
                actual_balance: actualBalance,
                expected_balance: expectedBalance,
                total_credits: totalCredits,
                total_debits: totalDebits,
                discrepancy: discrepancy,
                in_sync: inSync,
                wallet_id: wallet ? wallet.id : null,
                recent_transactions: recentTxns.rows
            }
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// USER: LOOKUP BY PATIENT CODE (patient-code-first resolution)
// ===========================================================================
app.get('/api/v1/get_user', async (req, res) => {
    try {
        const patientCode = (req.query.patient_code || '').trim();
        const userId = (req.query.user_id || '').trim();
        const patientColumns = await getTableColumns('patients');
        const walletJoinCondition = await buildWalletPatientJoinCondition('w.', 'p.');

        // Try patient_code first, fallback to user_id
        if (patientCode) {
            const patientRes = await pool.query(
                `SELECT p.*, u.id as user_id, u.email, u.phone, w.balance as wallet_amount
                 FROM patients p
                 LEFT JOIN users u ON u.id = p.user_id
                 LEFT JOIN wallets w ON ${walletJoinCondition}
                 WHERE p.patient_code = $1${patientNotDeletedClause(patientColumns, 'p.')} LIMIT 1`,
                [patientCode]
            );
            if (patientRes.rows.length) {
                return res.json({ response: 200, status: true, data: patientRes.rows[0] });
            }
        }

        // Fallback to user_id
        if (userId) {
            const userRes = await pool.query(
                `SELECT p.*, u.id as user_id, u.email, u.phone, w.balance as wallet_amount
                 FROM patients p
                 LEFT JOIN users u ON u.id = p.user_id
                 LEFT JOIN wallets w ON ${walletJoinCondition}
                 WHERE p.user_id = $1${patientNotDeletedClause(patientColumns, 'p.')} LIMIT 1`,
                [userId]
            );
            if (userRes.rows.length) {
                return res.json({ response: 200, status: true, data: userRes.rows[0] });
            }
        }

        res.status(404).json({ response: 404, status: false, message: 'User not found' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: ENCOUNTERS (patient-focused electronic medical records)
// ===========================================================================
// Access control: Non-admin users can only access encounters for their clinic patients
// Clinic isolation validated in each endpoint

const EMR_ENCOUNTER_SELECT = `
    ee.id, ee.appointment_id, ee.patient_code, ee.clinic_id, ee.doctor_id,
    ee.encounter_type, ee.chief_complaint, ee.status, ee.primary_soap_note_id,
    ee.created_at, ee.updated_at,
    CONCAT(p.f_name, ' ', p.l_name) AS patient_name,
    u.name AS doctor_name,
    c.title AS clinic_name
`;
const EMR_ENCOUNTER_FROM  = 'emr_encounters ee';
const EMR_ENCOUNTER_JOINS = `
    LEFT JOIN patients p ON p.patient_code = ee.patient_code
    LEFT JOIN doctors d  ON d.id = ee.doctor_id
    LEFT JOIN users u    ON u.id = d.user_id
    LEFT JOIN clinics c  ON c.id = ee.clinic_id
`;

const toNullableClinicId = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isAdminRole = (roleName = '') => {
    const normalized = String(roleName || '').trim().toLowerCase();
    return normalized === 'super admin' || normalized === 'admin';
};

const getRequesterContext = (req) => {
    const roleName = req.headers['x-user-role'] || req.headers['x-role-name'] || req.query.user_role || req.body?.user_role || '';
    const clinicId = toNullableClinicId(
        req.headers['x-clinic-id'] || req.headers['x-user-clinic-id'] || req.query.requester_clinic_id || req.body?.requester_clinic_id
    );
    return {
        roleName,
        isAdmin: isAdminRole(roleName),
        clinicId,
    };
};

async function getPatientByCode(patientCode) {
    const patientRes = await pool.query(`SELECT id, clinic_id, patient_code FROM patients WHERE patient_code = $1`, [patientCode]);
    if (!patientRes.rows.length) {
        return null;
    }
    return patientRes.rows[0];
}

async function getEncounterScope(encounterId) {
    const encounterRes = await pool.query(
        `SELECT id, clinic_id, patient_code, doctor_id FROM emr_encounters WHERE id = $1`,
        [encounterId]
    );
    if (!encounterRes.rows.length) {
        return null;
    }
    return encounterRes.rows[0];
}

async function getLabOrderScope(labOrderId) {
    const orderRes = await pool.query(
        `SELECT id, clinic_id, patient_code FROM emr_lab_orders WHERE id = $1`,
        [labOrderId]
    );
    if (!orderRes.rows.length) {
        return null;
    }
    return orderRes.rows[0];
}

app.get('/api/v1/get_emr_encounters', async (req, res) => {
    try {
        const start        = parseInt(req.query.start        || 0,  10);
        const end          = parseInt(req.query.end          || 49, 10);
        const limit        = end - start + 1;
        const search       = (req.query.search       || '').trim();
        const clinicId     = req.query.clinic_id     || null;
        const patientCode  = req.query.patient_code  || null;
        const doctorId     = getScopedDoctorId(req);

        const conditions = [];
        const params     = [];

        if (clinicId)    { params.push(clinicId);    conditions.push(`ee.clinic_id      = $${params.length}`); }
        if (patientCode) { params.push(patientCode); conditions.push(`ee.patient_code   = $${params.length}`); }
        if (doctorId)    { params.push(doctorId);    conditions.push(`ee.doctor_id      = $${params.length}`); }
        if (search) {
            const s = `%${search}%`;
            params.push(s, s, s);
            const n = params.length;
            conditions.push(`(ee.chief_complaint ILIKE $${n - 2} OR ee.encounter_type ILIKE $${n - 1} OR CONCAT(p.f_name,' ',p.l_name) ILIKE $${n})`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const { rows, total } = await paginatedQuery({ baseSelect: EMR_ENCOUNTER_SELECT, from: EMR_ENCOUNTER_FROM, joins: EMR_ENCOUNTER_JOINS, where, params, start, limit, orderBy: 'ee.created_at DESC' });
        res.json({ response: 200, status: true, data: rows, total_record: total });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_emr_encounters/:id', async (req, res) => {
    try {
        const doctorId = getScopedDoctorId(req);
        const params = [req.params.id];
        let where = 'ee.id = $1';
        if (doctorId) {
            params.push(doctorId);
            where += ` AND ee.doctor_id = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT ${EMR_ENCOUNTER_SELECT} FROM ${EMR_ENCOUNTER_FROM} ${EMR_ENCOUNTER_JOINS} WHERE ${where}`,
            params
        );
        if (!result.rows.length) return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        res.json({ response: 200, status: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_emr_encounter', async (req, res) => {
    try {
        const { appointment_id, patient_code, clinic_id, doctor_id, encounter_type, chief_complaint, status } = req.body;
        if (!patient_code || !clinic_id) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code and clinic_id are required' });
        }

        const patient = await getPatientByCode(patient_code);
        if (!patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        if (patient.clinic_id && Number(patient.clinic_id) !== Number(clinic_id)) {
            return res.status(422).json({ response: 422, status: false, message: 'clinic_id does not match patient clinic' });
        }

        const requester = getRequesterContext(req);
        if (!requester.isAdmin && requester.clinicId && patient.clinic_id && Number(requester.clinicId) !== Number(patient.clinic_id)) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient belongs to a different clinic' });
        }

        const result = await pool.query(
            `INSERT INTO emr_encounters (appointment_id, patient_code, clinic_id, doctor_id, encounter_type, chief_complaint, status, encounter_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [appointment_id || null, patient_code, clinic_id, doctor_id || null, encounter_type || 'OPD', chief_complaint || '', status || 'draft', new Date().toISOString().slice(0, 10)]
        );
        res.json({ response: 200, status: true, message: 'Encounter created.', encounter_id: result.rows[0].id });
    } catch (err) {
        console.error('[ERROR] add_emr_encounter:', err.message, err.stack);
        res.status(500).json({ response: 500, status: false, message: `Error creating encounter: ${err.message}` });
    }
});

app.post('/api/v1/update_emr_encounter', async (req, res) => {
    try {
        const { id, encounter_type, chief_complaint, status, primary_soap_note_id } = req.body;
        if (!id) return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        await pool.query(
            `UPDATE emr_encounters SET encounter_type=COALESCE($1,encounter_type), chief_complaint=COALESCE($2,chief_complaint), status=COALESCE($3,status), primary_soap_note_id=COALESCE($4,primary_soap_note_id), updated_at=NOW() WHERE id=$5`,
            [encounter_type, chief_complaint, status, primary_soap_note_id, id]
        );
        res.json({ response: 200, status: true, message: 'Encounter updated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: SOAP NOTES (subjective, objective, assessment, plan)
// ===========================================================================

app.post('/api/v1/add_soap_note', async (req, res) => {
    try {
        const { encounter_id, subjective_section, objective_section, assessment_section, plan_section, is_final, version } = req.body;
        if (!encounter_id) {
            return res.status(422).json({ response: 422, status: false, message: 'encounter_id is required' });
        }

        const encounter = await getEncounterScope(encounter_id);
        if (!encounter) {
            return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_soap_notes (clinic_id, encounter_id, patient_code, doctor_id, subjective_section, objective_section, assessment_section, plan_section, is_final, version)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, version`,
            [encounter.clinic_id, encounter_id, encounter.patient_code, encounter.doctor_id || null, subjective_section || '', objective_section || '', assessment_section || '', plan_section || '', is_final ? true : false, version || 1]
        );
        res.json({ response: 200, status: true, message: 'SOAP note created.', soap_note_id: result.rows[0].id, version: result.rows[0].version });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/update_soap_note', async (req, res) => {
    try {
        const { id, subjective_section, objective_section, assessment_section, plan_section, is_final, amendment_reason } = req.body;
        if (!id) return res.status(422).json({ response: 422, status: false, message: 'id is required' });

        // Fetch the current SOAP note so we can preserve it as history
        const currentRes = await pool.query(
            `SELECT * FROM emr_soap_notes WHERE id=$1`,
            [id]
        );
        if (!currentRes.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'SOAP note not found' });
        }
        const current = currentRes.rows[0];

        // Determine the root amended_from chain — always point back to the original note
        const rootId = current.amended_from || current.id;

        // Mark the current (now-superseded) note as superseded so history queries can filter it
        await pool.query(
            `UPDATE emr_soap_notes SET is_superseded=true, updated_at=NOW() WHERE id=$1`,
            [id]
        );

        // Insert a new row carrying the updated content — this preserves full history
        const newVersion = (current.version || 1) + 1;
        const result = await pool.query(
            `INSERT INTO emr_soap_notes
               (clinic_id, encounter_id, patient_code, doctor_id,
                subjective_section, objective_section, assessment_section, plan_section,
                is_final, version, amended_from, amendment_reason)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING id, version`,
            [
                current.clinic_id,
                current.encounter_id,
                current.patient_code,
                current.doctor_id,
                subjective_section !== undefined ? subjective_section : current.subjective_section,
                objective_section  !== undefined ? objective_section  : current.objective_section,
                assessment_section !== undefined ? assessment_section : current.assessment_section,
                plan_section       !== undefined ? plan_section       : current.plan_section,
                is_final !== undefined ? Boolean(is_final) : current.is_final,
                newVersion,
                rootId,
                amendment_reason || null,
            ]
        );

        res.json({
            response: 200,
            status: true,
            message: 'SOAP note updated (history preserved).',
            soap_note_id: result.rows[0].id,
            version: result.rows[0].version,
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// Returns full SOAP history for an encounter, newest version first.
// Active (current) note has is_superseded=false; older versions have is_superseded=true.
app.get('/api/v1/get_soap_history/:encounter_id', async (req, res) => {
    try {
        const encounterId = req.params.encounter_id;
        if (!encounterId) return res.status(422).json({ response: 422, status: false, message: 'encounter_id is required' });

        const result = await pool.query(
            `SELECT sn.id, sn.encounter_id, p.patient_code, sn.doctor_id,
                    sn.subjective_section, sn.objective_section, sn.assessment_section, sn.plan_section,
                    sn.version, sn.is_final, sn.amended_from, sn.amendment_reason,
                    sn.created_at, sn.updated_at
             FROM emr_soap_notes sn
             LEFT JOIN patients p ON p.patient_code = sn.patient_code
             WHERE sn.encounter_id=$1
             ORDER BY sn.version DESC, sn.created_at DESC`,
            [encounterId]
        );
        res.json({ response: 200, status: true, data: result.rows, total_record: result.rows.length });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_emr_summary/:patient_code', async (req, res) => {
    try {
        const patientCode = req.params.patient_code;
        const scopedClinicId = toNullableClinicId(req.query.clinic_id);
        const doctorId = getScopedDoctorId(req);

        const patient = await getPatientByCode(patientCode);
        if (!patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        if (doctorId) {
            const hasAccess = await doctorHasAccessToPatientCode(doctorId, patientCode);
            if (!hasAccess) {
                return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient does not belong to this doctor' });
            }
        }

        if (scopedClinicId && patient.clinic_id && Number(patient.clinic_id) !== Number(scopedClinicId)) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient belongs to a different clinic' });
        }

        const requester = getRequesterContext(req);
        if (!requester.isAdmin && requester.clinicId && patient.clinic_id && Number(requester.clinicId) !== Number(patient.clinic_id)) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient belongs to a different clinic' });
        }

        const scopeParams = [patientCode];
        let scopeClause = `patient_code=$1`;
        if (scopedClinicId) {
            scopeParams.push(scopedClinicId);
            scopeClause += ` AND clinic_id=$2`;
        }
        if (doctorId) {
            scopeParams.push(doctorId);
            scopeClause += ` AND doctor_id=$${scopeParams.length}`;
        }
        
        // Fetch latest SOAP note (active only — is_superseded=false)
        const soapRes = await pool.query(
            `SELECT id, encounter_id, subjective_section, objective_section, assessment_section, plan_section, version, is_final, created_at
             FROM emr_soap_notes WHERE encounter_id IN (SELECT id FROM emr_encounters WHERE ${scopeClause}) AND (is_superseded IS NULL OR is_superseded=false) ORDER BY version DESC, created_at DESC LIMIT 1`,
            scopeParams
        );
        
        // Fetch latest vitals
        const vitalsRes = await pool.query(
            `SELECT id, encounter_id, temperature_celsius, systolic_bp, diastolic_bp, heart_rate_bpm, respiratory_rate, oxygen_saturation, weight_kg, height_cm, bmi, pain_scale, blood_glucose_mg_dl, recorded_at
             FROM emr_vitals_snapshot WHERE encounter_id IN (SELECT id FROM emr_encounters WHERE ${scopeClause}) ORDER BY recorded_at DESC LIMIT 1`,
            scopeParams
        );
        
        // Fetch diagnoses (last 5)
        const diagRes = await pool.query(
            `SELECT id, encounter_id, icd10_code, diagnosis_text, confidence, is_primary, work_related, created_at
             FROM emr_diagnoses WHERE encounter_id IN (SELECT id FROM emr_encounters WHERE ${scopeClause}) ORDER BY created_at DESC LIMIT 5`,
            scopeParams
        );
        
        // Fetch medications (last 10)
        const medsRes = await pool.query(
            `SELECT id, encounter_id, medicine_name, strength, dosage, unit, frequency, route, duration, special_instructions, refills
             FROM emr_medications WHERE encounter_id IN (SELECT id FROM emr_encounters WHERE ${scopeClause}) ORDER BY created_at DESC LIMIT 10`,
            scopeParams
        );
        
        // Fetch lab orders (last 5)
        const labOrdersRes = await pool.query(
            `SELECT id, encounter_id, test_name, test_category, clinical_indication, is_urgent, status, ordered_date
             FROM emr_lab_orders WHERE encounter_id IN (SELECT id FROM emr_encounters WHERE ${scopeClause}) ORDER BY ordered_date DESC LIMIT 5`,
            scopeParams
        );
        
        // Fetch lab results (last 10)
        const labResultsRes = await pool.query(
            `SELECT id, lab_order_id, parameter_name, result_value, result_unit, reference_range, flag, status, result_date
             FROM emr_lab_results WHERE lab_order_id IN (SELECT id FROM emr_lab_orders WHERE encounter_id IN (SELECT id FROM emr_encounters WHERE ${scopeClause})) ORDER BY result_date DESC LIMIT 10`,
            scopeParams
        );
        
        // Fetch allergies
        const allergiesRes = await pool.query(
            `SELECT id, allergen_type AS allergy_type, allergen_name, severity, reaction_description AS notes, is_active
             FROM patient_allergies WHERE patient_code=$1 AND is_active=true`,
            [patientCode]
        );
        
        // Fetch referrals (active)
        const referralsRes = await pool.query(
            `SELECT id, encounter_id, referred_to, specialty, urgency, status, reason, referred_date
             FROM emr_referrals WHERE encounter_id IN (SELECT id FROM emr_encounters WHERE ${scopeClause}) ORDER BY referred_date DESC LIMIT 5`,
            scopeParams
        );
        
        // Fetch medical profile
        const profileRes = await pool.query(
            `SELECT id, blood_type, occupation, employer_name, philhealth_id, sss_no, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone
             FROM patient_medical_profiles WHERE patient_code=$1`,
            [patientCode]
        );
        
        res.json({
            response: 200,
            status: true,
            data: {
                latest_soap: soapRes.rows[0] || null,
                latest_vitals: vitalsRes.rows[0] || null,
                recent_diagnoses: diagRes.rows || [],
                recent_medications: medsRes.rows || [],
                recent_lab_orders: labOrdersRes.rows || [],
                recent_lab_results: labResultsRes.rows || [],
                allergies: allergiesRes.rows || [],
                recent_referrals: referralsRes.rows || [],
                medical_profile: profileRes.rows[0] || null
            }
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: VITALS
// ===========================================================================

app.post('/api/v1/add_vitals_snapshot', async (req, res) => {
    try {
        const { encounter_id, temperature_celsius, systolic_bp, diastolic_bp, heart_rate_bpm, respiratory_rate, oxygen_saturation, weight_kg, height_cm, bmi, pain_scale, blood_glucose_mg_dl } = req.body;
        if (!encounter_id) {
            return res.status(422).json({ response: 422, status: false, message: 'encounter_id is required' });
        }

        const encounter = await getEncounterScope(encounter_id);
        if (!encounter) {
            return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_vitals_snapshot (clinic_id, encounter_id, patient_code, temperature_celsius, systolic_bp, diastolic_bp, heart_rate_bpm, respiratory_rate, oxygen_saturation, weight_kg, height_cm, bmi, pain_scale, blood_glucose_mg_dl)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
            [encounter.clinic_id, encounter_id, encounter.patient_code, temperature_celsius || null, systolic_bp || null, diastolic_bp || null, heart_rate_bpm || null, respiratory_rate || null, oxygen_saturation || null, weight_kg || null, height_cm || null, bmi || null, pain_scale || null, blood_glucose_mg_dl || null]
        );
        res.json({ response: 200, status: true, message: 'Vitals recorded.', vitals_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: DIAGNOSES
// ===========================================================================

app.post('/api/v1/add_diagnosis', async (req, res) => {
    try {
        const { encounter_id, icd10_code, diagnosis_text, confidence, is_primary, work_related } = req.body;
        if (!encounter_id || !icd10_code) {
            return res.status(422).json({ response: 422, status: false, message: 'encounter_id and icd10_code are required' });
        }

        const encounter = await getEncounterScope(encounter_id);
        if (!encounter) {
            return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_diagnoses (clinic_id, encounter_id, patient_code, icd10_code, diagnosis_text, confidence, is_primary, work_related)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [encounter.clinic_id, encounter_id, encounter.patient_code, icd10_code, diagnosis_text || '', confidence || 'Confirmed', is_primary ? true : false, work_related ? true : false]
        );
        res.json({ response: 200, status: true, message: 'Diagnosis added.', diagnosis_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: MEDICATIONS
// ===========================================================================

app.post('/api/v1/add_medication', async (req, res) => {
    try {
        const { encounter_id, medicine_name, strength, dosage, unit, frequency, route, duration, special_instructions, refills } = req.body;
        if (!encounter_id || !medicine_name) {
            return res.status(422).json({ response: 422, status: false, message: 'encounter_id and medicine_name are required' });
        }

        const encounter = await getEncounterScope(encounter_id);
        if (!encounter) {
            return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_medications (clinic_id, encounter_id, patient_code, medicine_name, strength, dosage, unit, frequency, route, duration, special_instructions, refills)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
            [encounter.clinic_id, encounter_id, encounter.patient_code, medicine_name, strength || '', dosage || 0, unit || 'tablet', frequency || 'as needed', route || 'Oral', duration || '', special_instructions || '', refills || 0]
        );
        res.json({ response: 200, status: true, message: 'Medication added.', medication_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: LAB ORDERS & RESULTS
// ===========================================================================

app.post('/api/v1/add_lab_order', async (req, res) => {
    try {
        const { encounter_id, test_name, test_category, clinical_indication, is_urgent, status } = req.body;
        if (!encounter_id || !test_name) {
            return res.status(422).json({ response: 422, status: false, message: 'encounter_id and test_name are required' });
        }

        const encounter = await getEncounterScope(encounter_id);
        if (!encounter) {
            return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_lab_orders (clinic_id, encounter_id, patient_code, doctor_id, test_name, test_category, clinical_indication, is_urgent, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [encounter.clinic_id, encounter_id, encounter.patient_code, encounter.doctor_id || null, test_name, test_category || 'Hematology', clinical_indication || '', is_urgent ? true : false, status || 'pending']
        );
        res.json({ response: 200, status: true, message: 'Lab order created.', lab_order_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_lab_result', async (req, res) => {
    try {
        const { lab_order_id, parameter_name, result_value, result_unit, reference_range, reference_min, reference_max, flag, status } = req.body;
        if (!lab_order_id || !parameter_name) {
            return res.status(422).json({ response: 422, status: false, message: 'lab_order_id and parameter_name are required' });
        }

        const labOrder = await getLabOrderScope(lab_order_id);
        if (!labOrder) {
            return res.status(404).json({ response: 404, status: false, message: 'Lab order not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_lab_results (clinic_id, lab_order_id, patient_code, parameter_name, result_value, result_unit, reference_range, reference_min, reference_max, flag, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [labOrder.clinic_id, lab_order_id, labOrder.patient_code, parameter_name, result_value || '', result_unit || '', reference_range || '', reference_min || null, reference_max || null, flag || 'N', status || 'Normal']
        );
        res.json({ response: 200, status: true, message: 'Lab result recorded.', result_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: DOCUMENTS (medical files/images)
// ===========================================================================

app.post('/api/v1/add_emr_document', async (req, res) => {
    try {
        const { encounter_id, document_category, document_title, file_name, file_path, file_size_bytes, file_mime_type, uploaded_by } = req.body;
        if (!encounter_id || !document_category) {
            return res.status(422).json({ response: 422, status: false, message: 'encounter_id and document_category are required' });
        }

        const encounter = await getEncounterScope(encounter_id);
        if (!encounter) {
            return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_documents (clinic_id, encounter_id, patient_code, document_category, document_title, file_name, file_path, file_size_bytes, file_mime_type, uploaded_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [encounter.clinic_id, encounter_id, encounter.patient_code, document_category, document_title || '', file_name || '', file_path || '', file_size_bytes || 0, file_mime_type || 'application/octet-stream', uploaded_by || null]
        );
        res.json({ response: 200, status: true, message: 'Document linked.', document_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: ALLERGIES
// ===========================================================================

app.get('/api/v1/get_allergies/:patient_code', async (req, res) => {
    try {
        const patientCode = req.params.patient_code;
        const scopedClinicId = toNullableClinicId(req.query.clinic_id);
        const patient = await getPatientByCode(patientCode);
        if (!patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }
        if (scopedClinicId && patient.clinic_id && Number(patient.clinic_id) !== Number(scopedClinicId)) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient belongs to a different clinic' });
        }

        const result = await pool.query(
            `SELECT id, patient_code, allergen_type AS allergy_type, allergen_name, severity, reaction_description AS notes, is_active, created_at
             FROM patient_allergies WHERE patient_code=$1 AND is_active=true ORDER BY severity DESC, created_at DESC`,
            [patientCode]
        );
        res.json({ response: 200, status: true, data: result.rows, total_record: result.rows.length });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_allergy', async (req, res) => {
    try {
        const { patient_code, clinic_id, allergy_type, allergen_name, severity, notes } = req.body;
        if (!patient_code || !allergen_name) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code and allergen_name are required' });
        }

        const patient = await getPatientByCode(patient_code);
        if (!patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        const effectiveClinicId = toNullableClinicId(clinic_id) || patient.clinic_id;
        if (Number(patient.clinic_id) !== Number(effectiveClinicId)) {
            return res.status(422).json({ response: 422, status: false, message: 'clinic_id does not match patient clinic' });
        }

        const result = await pool.query(
            `INSERT INTO patient_allergies (patient_code, clinic_id, allergen_type, allergen_name, reaction_description, severity, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
            [patient_code, effectiveClinicId, allergy_type || 'Medication', allergen_name, notes || '', severity || 'Moderate']
        );
        res.json({ response: 200, status: true, message: 'Allergy recorded.', allergy_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: REFERRALS
// ===========================================================================

app.post('/api/v1/add_referral', async (req, res) => {
    try {
        const { encounter_id, referred_to, specialty, urgency, reason, status } = req.body;
        if (!encounter_id || !specialty) {
            return res.status(422).json({ response: 422, status: false, message: 'encounter_id and specialty are required' });
        }

        const encounter = await getEncounterScope(encounter_id);
        if (!encounter) {
            return res.status(404).json({ response: 404, status: false, message: 'Encounter not found' });
        }

        const result = await pool.query(
            `INSERT INTO emr_referrals (clinic_id, encounter_id, patient_code, referred_to, specialty, urgency, reason, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [encounter.clinic_id, encounter_id, encounter.patient_code, referred_to || '', specialty, urgency || 'Routine', reason || '', status || 'pending']
        );
        res.json({ response: 200, status: true, message: 'Referral created.', referral_id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// EMR: PATIENT MEDICAL PROFILE
// ===========================================================================

app.get('/api/v1/get_patient_medical_profile/:patient_code', async (req, res) => {
    try {
        const patientCode = req.params.patient_code;
        const clinicId = toNullableClinicId(req.query.clinic_id);
        const doctorId = getScopedDoctorId(req);

        const patient = await getPatientByCode(patientCode);
        if (!patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        if (doctorId) {
            const hasAccess = await doctorHasAccessToPatientCode(doctorId, patientCode);
            if (!hasAccess) {
                return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient does not belong to this doctor' });
            }
        }

        if (clinicId && Number(patient.clinic_id) !== Number(clinicId)) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient belongs to a different clinic' });
        }

        const profileRes = await pool.query(
            `SELECT * FROM patient_medical_profiles WHERE patient_code = $1 LIMIT 1`,
            [patientCode]
        );

        res.json({ response: 200, status: true, data: profileRes.rows[0] || null });
    } catch (err) {
        console.error('[ERROR] get_patient_medical_profile:', err.message, err.stack);
        res.status(500).json({ response: 500, status: false, message: `Error retrieving patient profile: ${err.message}` });
    }
});

app.post('/api/v1/upsert_patient_medical_profile', async (req, res) => {
    try {
        const {
            patient_code,
            clinic_id,
            occupation,
            employer_name,
            department,
            philhealth_id,
            sss_no,
            blood_type,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
        } = req.body;

        if (!patient_code) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const patient = await getPatientByCode(patient_code);
        if (!patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        const effectiveClinicId = toNullableClinicId(clinic_id) || patient.clinic_id;
        // Only reject clinic mismatch when patient is assigned to a specific clinic.
        if (effectiveClinicId && patient.clinic_id && Number(patient.clinic_id) !== Number(effectiveClinicId)) {
            return res.status(422).json({ response: 422, status: false, message: 'clinic_id does not match patient clinic' });
        }

        const upsertRes = await pool.query(
            `INSERT INTO patient_medical_profiles (
                patient_code, clinic_id, occupation, employer_name, department,
                philhealth_id, sss_no, blood_type,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (patient_code)
            DO UPDATE SET
                clinic_id = EXCLUDED.clinic_id,
                occupation = EXCLUDED.occupation,
                employer_name = EXCLUDED.employer_name,
                department = EXCLUDED.department,
                philhealth_id = EXCLUDED.philhealth_id,
                sss_no = EXCLUDED.sss_no,
                blood_type = EXCLUDED.blood_type,
                emergency_contact_name = EXCLUDED.emergency_contact_name,
                emergency_contact_phone = EXCLUDED.emergency_contact_phone,
                emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
                updated_at = NOW()
            RETURNING id, patient_code`,
            [
                patient_code,
                effectiveClinicId,
                occupation || null,
                employer_name || null,
                department || null,
                philhealth_id || null,
                sss_no || null,
                blood_type || null,
                emergency_contact_name || null,
                emergency_contact_phone || null,
                emergency_contact_relationship || null,
            ]
        );

        res.json({ response: 200, status: true, message: 'Patient medical profile saved.', data: upsertRes.rows[0] });
    } catch (err) {
        console.error('[ERROR] upsert_patient_medical_profile:', err.message, err.stack);
        res.status(500).json({ response: 500, status: false, message: `Error saving patient profile: ${err.message}` });
    }
});

// ===========================================================================
// PATIENT AUTH: password hashing (no extra deps — uses built-in crypto)
// ===========================================================================
const crypto = require('crypto');

// Attempt to use bcrypt if available; fall back to HMAC-SHA256 otherwise.
let _bcrypt;
try { _bcrypt = require('bcrypt'); } catch (_) { _bcrypt = null; }

function hashPassword(plaintext) {
    if (_bcrypt) return _bcrypt.hashSync(String(plaintext), 10);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt).update(String(plaintext)).digest('hex');
    return `sha256:${salt}:${hash}`;
}

function verifyPassword(plaintext, stored) {
    if (!stored) return false;
    if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
        return _bcrypt ? _bcrypt.compareSync(String(plaintext), stored) : false;
    }
    if (stored.startsWith('sha256:')) {
        const parts = stored.split(':');
        if (parts.length !== 3) return false;
        const [, salt, hash] = parts;
        return crypto.createHmac('sha256', salt).update(String(plaintext)).digest('hex') === hash;
    }
    // Plain-text fallback for legacy / seeded records
    return stored === String(plaintext);
}

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'gentrx_jwt_secret_change_me';

function generateToken(patient) {
    return jwt.sign(
        { id: patient.id, patient_code: patient.patient_code, phone: patient.phone },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

/** Normalise any phone representation to E.164 (+63XXXXXXXXXX for PH) */
function normalisePhone(phone, defaultCountryCode = '63') {
    if (!phone) return null;
    let d = String(phone).replace(/\D/g, '');
    if (!d) return null;
    if (d.length === 10) return `+${defaultCountryCode}${d}`;
    if (d.length === 11 && d.startsWith('0')) return `+${defaultCountryCode}${d.substring(1)}`;
    if (d.length === 12 && d.startsWith(defaultCountryCode)) return `+${d}`;
    if (d.startsWith(`+${defaultCountryCode}`.replace('+', ''))) return `+${d}`;
    if (d.length > 10) return `+${d}`;
    return `+${defaultCountryCode}${d}`;
}

// Ensure patient_otp_codes table exists (idempotent)
async function ensureOtpTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS patient_otp_codes (
            id          SERIAL PRIMARY KEY,
            phone       VARCHAR(30)  NOT NULL,
            otp_code    VARCHAR(10)  NOT NULL,
            request_id  VARCHAR(60)  UNIQUE NOT NULL,
            verified    BOOLEAN      DEFAULT FALSE,
            expires_at  TIMESTAMPTZ  NOT NULL,
            created_at  TIMESTAMPTZ  DEFAULT NOW()
        )
    `);
}

async function ensurePatientFilesTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS patient_files (
            id SERIAL PRIMARY KEY,
            patient_id INTEGER NULL,
            patient_code VARCHAR(50) NULL,
            owner_id VARCHAR(100) NULL,
            owner_type VARCHAR(30) NULL,
            user_id VARCHAR(100) NULL,
            clinic_id INTEGER NULL,
            file_name TEXT NULL,
            file TEXT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

const tableColumnsCache = new Map();
const tableColumnMetadataCache = new Map();

function clearTableSchemaCache(tableName) {
    tableColumnsCache.delete(tableName);
    tableColumnMetadataCache.delete(tableName);
}

async function getTableColumns(tableName) {
    if (tableColumnsCache.has(tableName)) {
        return tableColumnsCache.get(tableName);
    }
    const result = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
    );
    const columns = new Set(result.rows.map((row) => row.column_name));
    tableColumnsCache.set(tableName, columns);
    return columns;
}

async function getTableColumnMetadata(tableName) {
    if (tableColumnMetadataCache.has(tableName)) {
        return tableColumnMetadataCache.get(tableName);
    }

    const result = await pool.query(
        `SELECT column_name, is_generated, data_type, udt_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
    );

    const metadata = new Map(result.rows.map((row) => [row.column_name, row]));
    tableColumnMetadataCache.set(tableName, metadata);
    return metadata;
}

function hasTableColumn(columns, name) {
    return columns.has(name);
}

function hasWritableTableColumn(metadata, name) {
    const column = metadata.get(name);
    return Boolean(column) && String(column.is_generated || '').toUpperCase() !== 'ALWAYS';
}

function getFirstExistingColumn(columns, names) {
    return names.find((name) => hasTableColumn(columns, name)) || null;
}

function optionalColumn(alias, columns, columnName, asName = columnName) {
    if (hasTableColumn(columns, columnName)) {
        return `${alias}${columnName}${asName !== columnName ? ` AS ${asName}` : ''}`;
    }
    return `NULL AS ${asName}`;
}

function imageColumn(alias, columns) {
    if (hasTableColumn(columns, 'image')) {
        return `${alias}image AS image`;
    }
    if (hasTableColumn(columns, 'image_url')) {
        return `${alias}image_url AS image`;
    }
    if (hasTableColumn(columns, 'profile_image')) {
        return `${alias}profile_image AS image`;
    }
    return 'NULL AS image';
}

function getActiveColumnName(columns) {
    if (hasTableColumn(columns, 'is_active')) {
        return 'is_active';
    }
    if (hasTableColumn(columns, 'active')) {
        return 'active';
    }
    return null;
}

function getImageColumnName(columns) {
    return getFirstExistingColumn(columns, ['image', 'image_url', 'logo', 'profile_image']);
}

function getPasswordColumnName(columns) {
    return getFirstExistingColumn(columns, ['password', 'password_hash']);
}

function toBooleanFlag(value, fallback = null) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        if (Number.isNaN(value)) {
            return fallback;
        }
        return value !== 0;
    }

    if (Array.isArray(value)) {
        if (!value.length) {
            return fallback;
        }
        return toBooleanFlag(value[0], fallback);
    }

    if (typeof value === 'object') {
        if (Object.prototype.hasOwnProperty.call(value, 'active')) {
            return toBooleanFlag(value.active, fallback);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'isActive')) {
            return toBooleanFlag(value.isActive, fallback);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'checked')) {
            return toBooleanFlag(value.checked, fallback);
        }
        if (Object.prototype.hasOwnProperty.call(value, 'value')) {
            return toBooleanFlag(value.value, fallback);
        }
    }

    const normalized = String(value || '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 't', 'y', 'active', 'enabled'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off', 'f', 'n', 'inactive', 'disabled'].includes(normalized)) {
        return false;
    }

    return fallback;
}

function normalizeBooleanForColumn(metadata, columnName, value) {
    if (value === undefined || value === null) {
        return value;
    }

    const columnMeta = metadata?.get(columnName);
    const dataType = String(columnMeta?.data_type || '').toLowerCase();
    const udtName = String(columnMeta?.udt_name || '').toLowerCase();
    const isNumericFlag = ['smallint', 'integer', 'bigint', 'numeric', 'decimal'].includes(dataType)
        || ['int2', 'int4', 'int8', 'numeric', 'decimal'].includes(udtName);

    if (isNumericFlag) {
        return value ? 1 : 0;
    }

    return Boolean(value);
}

function buildFullName(fName, lName, fallback = 'Clinic User') {
    const value = `${String(fName || '').trim()} ${String(lName || '').trim()}`.replace(/\s+/g, ' ').trim();
    return value || fallback;
}

function getUploadedFile(req) {
    return Array.isArray(req.files) && req.files.length ? req.files[0] : null;
}

function toStorageRelativePath(file) {
    if (!file?.filename || !file?.destination) {
        return null;
    }

    return path.posix.join(path.basename(file.destination), file.filename).replace(/\\/g, '/');
}

async function safeUnlinkStoragePath(storagePath) {
    const relativePath = String(storagePath || '').trim().replace(/^\/+/, '');
    if (!relativePath) {
        return;
    }

    const absolutePath = path.resolve(storageRootDir, relativePath);
    if (!absolutePath.startsWith(path.resolve(storageRootDir))) {
        return;
    }

    try {
        await fs.promises.unlink(absolutePath);
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            console.warn(`[CLINIC] Failed to remove file ${absolutePath}: ${error.message}`);
        }
    }
}

async function ensureLocationSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS countries (
            id SERIAL PRIMARY KEY,
            title VARCHAR(150) NOT NULL,
            iso_code VARCHAR(16),
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS states (
            id SERIAL PRIMARY KEY,
            country_id INTEGER NULL REFERENCES countries(id),
            title VARCHAR(150) NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS cities (
            id SERIAL PRIMARY KEY,
            state_id INTEGER NULL REFERENCES states(id),
            title VARCHAR(150) NOT NULL,
            latitude DOUBLE PRECISION NULL,
            longitude DOUBLE PRECISION NULL,
            default_city BOOLEAN NOT NULL DEFAULT FALSE,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso_code VARCHAR(16)`);
    await pool.query(`ALTER TABLE countries ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`);
    await pool.query(`ALTER TABLE countries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
    await pool.query(`ALTER TABLE countries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
    await pool.query(`ALTER TABLE states ADD COLUMN IF NOT EXISTS country_id INTEGER NULL REFERENCES countries(id)`);
    await pool.query(`ALTER TABLE states ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`);
    await pool.query(`ALTER TABLE states ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
    await pool.query(`ALTER TABLE states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
    await pool.query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS state_id INTEGER NULL REFERENCES states(id)`);
    await pool.query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION NULL`);
    await pool.query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION NULL`);
    await pool.query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS default_city BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`);
    await pool.query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);
    await pool.query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`);

    clearTableSchemaCache('countries');
    clearTableSchemaCache('states');
    clearTableSchemaCache('cities');
}

async function ensureClinicSchema() {
    await ensureLocationSchema();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS clinics (
            id SERIAL PRIMARY KEY,
            city_id INTEGER NULL REFERENCES cities(id),
            title VARCHAR(200) NOT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const alterStatements = [
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS city_id INTEGER NULL REFERENCES cities(id)`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS address TEXT`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS description TEXT`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS phone VARCHAR(60)`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS phone_second VARCHAR(60)`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(60)`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS opening_hours TEXT`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS ambulance_btn_enable BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS ambulance_number VARCHAR(60)`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stop_booking BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS coupon_enable BOOLEAN NOT NULL DEFAULT FALSE`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS tax NUMERIC(10, 2)`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS image_url TEXT`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`
    ];

    for (const statement of alterStatements) {
        await pool.query(statement);
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS clinic_images (
            id SERIAL PRIMARY KEY,
            clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
            image TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    clearTableSchemaCache('clinics');
    clearTableSchemaCache('clinic_images');
}

function patientNotDeletedClause(columns, alias = '') {
    return hasTableColumn(columns, 'deleted_at')
        ? ` AND (${alias}deleted_at IS NULL OR ${alias}deleted_at > NOW())`
        : '';
}

async function buildWalletPatientJoinCondition(walletAlias = 'w.', patientAlias = 'p.') {
    const walletColumns = await getTableColumns('wallets');
    const conditions = [];

    if (hasTableColumn(walletColumns, 'patient_code')) {
        conditions.push(`${walletAlias}patient_code = ${patientAlias}patient_code`);
    }
    if (hasTableColumn(walletColumns, 'owner_id') && hasTableColumn(walletColumns, 'owner_type')) {
        conditions.push(`LOWER(COALESCE(${walletAlias}owner_type, '')) = 'patient' AND ${walletAlias}owner_id = ${patientAlias}patient_code`);
    }

    return conditions.length ? conditions.map((condition) => `(${condition})`).join(' OR ') : '1=0';
}

async function buildPatientWalletMatchCondition(walletAlias = '', paramToken = '$1') {
    const walletColumns = await getTableColumns('wallets');
    const conditions = [];

    if (hasTableColumn(walletColumns, 'patient_code')) {
        conditions.push(`${walletAlias}patient_code = ${paramToken}`);
    }
    if (hasTableColumn(walletColumns, 'owner_id') && hasTableColumn(walletColumns, 'owner_type')) {
        conditions.push(`LOWER(COALESCE(${walletAlias}owner_type, '')) = 'patient' AND ${walletAlias}owner_id = ${paramToken}`);
    }

    return conditions.length ? conditions.map((condition) => `(${condition})`).join(' OR ') : '1=0';
}

async function findPatientWallet(db, patientCode, { forUpdate = false } = {}) {
    const resolvedPatientCode = String(patientCode || '').trim();
    if (!resolvedPatientCode) {
        return null;
    }

    const walletColumns = await getTableColumns('wallets');
    const matchCondition = await buildPatientWalletMatchCondition('', '$1');
    const orderClauses = [];
    if (hasTableColumn(walletColumns, 'patient_code')) {
        orderClauses.push(`CASE WHEN patient_code = $1 THEN 0 ELSE 1 END`);
    }
    if (hasTableColumn(walletColumns, 'updated_at')) {
        orderClauses.push('updated_at DESC NULLS LAST');
    } else {
        orderClauses.push('id DESC');
    }

    const result = await db.query(
        `SELECT
            id,
            ${optionalColumn('', walletColumns, 'patient_code')},
            ${optionalColumn('', walletColumns, 'owner_id')},
            ${optionalColumn('', walletColumns, 'owner_type')},
            ${optionalColumn('', walletColumns, 'balance')},
             LEFT JOIN patients p ON p.patient_code = sn.patient_code
            ${optionalColumn('', walletColumns, 'created_at')},
            ${optionalColumn('', walletColumns, 'updated_at')}
         FROM wallets
         WHERE ${matchCondition}
         ORDER BY ${orderClauses.join(', ')}
         LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
        [resolvedPatientCode]
    );

    return result.rows[0] || null;
}

async function ensurePatientWallet(db, patientCode) {
    const resolvedPatientCode = String(patientCode || '').trim();
    if (!resolvedPatientCode) {
        return null;
    }

    const existingWallet = await findPatientWallet(db, resolvedPatientCode);
    if (existingWallet) {
        return existingWallet;
    }

    const walletColumns = await getTableColumns('wallets');
    const insertColumns = [];
    const insertValues = [];
    const insertParams = [];
    const addInsertValue = (columnName, value) => {
        if (!hasTableColumn(walletColumns, columnName)) {
            return;
        }
        insertColumns.push(columnName);
        insertParams.push(value);
        insertValues.push(`$${insertParams.length}`);
    };

    addInsertValue('patient_code', resolvedPatientCode);
    addInsertValue('owner_id', resolvedPatientCode);
    addInsertValue('owner_type', 'patient');
    addInsertValue('balance', 0);
    addInsertValue('currency', 'PHP');
    if (hasTableColumn(walletColumns, 'created_at')) {
        insertColumns.push('created_at');
        insertValues.push('NOW()');
    }
    if (hasTableColumn(walletColumns, 'updated_at')) {
        insertColumns.push('updated_at');
        insertValues.push('NOW()');
    }

    if (insertColumns.length) {
        await db.query(
            `INSERT INTO wallets (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) ON CONFLICT DO NOTHING`,
            insertParams
        );
    }

    return findPatientWallet(db, resolvedPatientCode);
}

function normalizeWalletOwnerType(rawOwnerType) {
    const normalized = String(rawOwnerType || '').trim().toLowerCase();
    return normalized || 'patient';
}

function normalizePatientWalletIdentity(source = {}) {
    const ownerType = normalizeWalletOwnerType(source.owner_type);
    const ownerId = String(source.owner_id || '').trim();
    const patientCode = String(source.patient_code || source.patientCode || '').trim();
    const userId = String(source.user_id || source.userId || '').trim();
    const patientId = String(source.patient_id || source.patientId || '').trim();

    // Current mobile contract uses owner_id=patient_code for patient wallets.
    // Keep legacy fallbacks to patient_code/user_id/patient_id during migration.
    const lookupPatientCode = ownerType === 'patient'
        ? (ownerId || patientCode || userId || patientId)
        : (patientCode || ownerId || userId || patientId);

    return {
        ownerType,
        ownerId,
        patientCode,
        userId,
        patientId,
        lookupPatientCode,
    };
}

function normalizeOwnerWalletIdentity(source = {}) {
    const toTrimmedString = (value) => String(value || '').trim();

    const doctorOwnerId = toTrimmedString(
        source.doctor_wallet_owner_id || source.doct_id || source.doctor_id
    );
    const clinicOwnerId = toTrimmedString(
        source.clinic_wallet_owner_id || source.clinic_id
    );
    const pipeOwnerId = toTrimmedString(
        source.pipe_wallet_owner_id ||
        source.pipe_user_id ||
        source.pipe_owner_user_id ||
        source.pipe_owner_id
    );

    const doctorFee = toMoney(source.doctor_fee ?? source.opd_fee, 0);
    const clinicFee = toMoney(source.clinic_fee, 0);
    const pipeFee = toMoney(source.pipe_fee, 0);
    const fallbackDoctorFee = toMoney(source.fee ?? source.amount, 0);

    if (doctorFee === 0 && clinicFee === 0 && pipeFee === 0 && fallbackDoctorFee > 0) {
        return {
            doctorOwnerId,
            clinicOwnerId,
            pipeOwnerId,
            doctorFee: fallbackDoctorFee,
            clinicFee: 0,
            pipeFee: 0,
        };
    }

    return {
        doctorOwnerId,
        clinicOwnerId,
        pipeOwnerId,
        doctorFee,
        clinicFee,
        pipeFee,
    };
}

async function findOwnerWallet(db, ownerId, ownerType, { forUpdate = false } = {}) {
    const resolvedOwnerId = String(ownerId || '').trim();
    const resolvedOwnerType = String(ownerType || '').trim().toLowerCase();
    if (!resolvedOwnerId || !resolvedOwnerType) {
        return null;
    }

    const walletColumns = await getTableColumns('wallets');
    if (!hasTableColumn(walletColumns, 'owner_id') || !hasTableColumn(walletColumns, 'owner_type')) {
        return null;
    }

    const orderClauses = [];
    if (hasTableColumn(walletColumns, 'updated_at')) {
        orderClauses.push('updated_at DESC NULLS LAST');
    } else {
        orderClauses.push('id DESC');
    }

    const result = await db.query(
        `SELECT
            id,
            ${optionalColumn('', walletColumns, 'patient_code')},
            ${optionalColumn('', walletColumns, 'owner_id')},
            ${optionalColumn('', walletColumns, 'owner_type')},
            ${optionalColumn('', walletColumns, 'balance')},
            ${optionalColumn('', walletColumns, 'currency')},
            ${optionalColumn('', walletColumns, 'created_at')},
            ${optionalColumn('', walletColumns, 'updated_at')}
         FROM wallets
         WHERE owner_id = $1
           AND LOWER(COALESCE(owner_type, '')) = $2
         ORDER BY ${orderClauses.join(', ')}
         LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
        [resolvedOwnerId, resolvedOwnerType]
    );

    return result.rows[0] || null;
}

async function ensureOwnerWallet(db, ownerId, ownerType) {
    const resolvedOwnerId = String(ownerId || '').trim();
    const resolvedOwnerType = String(ownerType || '').trim().toLowerCase();
    if (!resolvedOwnerId || !resolvedOwnerType) {
        return null;
    }

    const existingWallet = await findOwnerWallet(db, resolvedOwnerId, resolvedOwnerType);
    if (existingWallet) {
        return existingWallet;
    }

    const walletColumns = await getTableColumns('wallets');
    const insertColumns = [];
    const insertValues = [];
    const insertParams = [];
    const addInsertValue = (columnName, value) => {
        if (!hasTableColumn(walletColumns, columnName)) {
            return;
        }
        insertColumns.push(columnName);
        insertParams.push(value);
        insertValues.push(`$${insertParams.length}`);
    };

    if (hasTableColumn(walletColumns, 'patient_code') && resolvedOwnerType === 'patient') {
        addInsertValue('patient_code', resolvedOwnerId);
    }
    addInsertValue('owner_id', resolvedOwnerId);
    addInsertValue('owner_type', resolvedOwnerType);
    addInsertValue('balance', 0);
    addInsertValue('currency', 'PHP');
    if (hasTableColumn(walletColumns, 'created_at')) {
        insertColumns.push('created_at');
        insertValues.push('NOW()');
    }
    if (hasTableColumn(walletColumns, 'updated_at')) {
        insertColumns.push('updated_at');
        insertValues.push('NOW()');
    }

    if (insertColumns.length) {
        await db.query(
            `INSERT INTO wallets (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) ON CONFLICT DO NOTHING`,
            insertParams
        );
    }

    return findOwnerWallet(db, resolvedOwnerId, resolvedOwnerType, { forUpdate: true });
}

async function applyWalletDistributionCredits(db, {
    appointmentId,
    patientCode,
    invoiceDescription,
    doctorOwnerId,
    clinicOwnerId,
    pipeOwnerId,
    doctorFee,
    clinicFee,
    pipeFee,
}) {
    const entries = [
        {
            ownerType: 'doctor',
            ownerId: doctorOwnerId,
            amount: toMoney(doctorFee, 0),
            label: 'Doctor fee credit',
        },
        {
            ownerType: 'clinic',
            ownerId: clinicOwnerId,
            amount: toMoney(clinicFee, 0),
            label: 'Clinic fee credit',
        },
        {
            ownerType: 'pipe',
            ownerId: pipeOwnerId,
            amount: toMoney(pipeFee, 0),
            label: 'Pipe fee credit',
        },
    ];

    for (const entry of entries) {
        if (entry.amount <= 0) {
            continue;
        }

        const resolvedOwnerId = String(entry.ownerId || '').trim();
        if (!resolvedOwnerId) {
            const message = entry.ownerType === 'pipe'
                ? 'pipe_wallet_owner_id (users.id of pipe owner) is required when pipe_fee is greater than zero'
                : `${entry.ownerType}_wallet_owner_id is required when ${entry.ownerType}_fee is greater than zero`;
            throw new Error(message);
        }

        const wallet = await ensureOwnerWallet(db, resolvedOwnerId, entry.ownerType);
        if (!wallet?.id) {
            throw new Error(`Unable to resolve ${entry.ownerType} wallet for owner_id=${resolvedOwnerId}`);
        }

        await db.query(
            `UPDATE wallets SET balance = COALESCE(balance, 0) + $1, updated_at=NOW() WHERE id=$2`,
            [entry.amount, wallet.id]
        );

        await insertWalletTransaction(db, {
            walletId: wallet.id,
            patientCode: patientCode || null,
            appointmentId: appointmentId || null,
            amount: entry.amount,
            type: 'credit',
            description: invoiceDescription || entry.label,
        });
    }
}

async function insertWalletTransaction(db, {
    walletId,
    patientCode = null,
    appointmentId = null,
    amount,
    type,
    description,
}) {
    const walletTransactionColumns = await getTableColumns('wallet_transactions');
    const insertColumns = [];
    const insertValues = [];
    const insertParams = [];

    const addInsertValue = (columnName, value) => {
        if (!hasTableColumn(walletTransactionColumns, columnName)) {
            return;
        }
        insertColumns.push(columnName);
        insertParams.push(value);
        insertValues.push(`$${insertParams.length}`);
    };

    addInsertValue('wallet_id', walletId);
    addInsertValue('patient_code', patientCode);
    addInsertValue('appointment_id', appointmentId);
    addInsertValue('amount', amount);
    addInsertValue('type', type);
    addInsertValue('description', description || null);

    if (hasTableColumn(walletTransactionColumns, 'created_at')) {
        insertColumns.push('created_at');
        insertValues.push('NOW()');
    }
    if (hasTableColumn(walletTransactionColumns, 'updated_at')) {
        insertColumns.push('updated_at');
        insertValues.push('NOW()');
    }

    if (!insertColumns.length) {
        throw new Error('wallet_transactions insert failed: table has no compatible columns');
    }

    await db.query(
        `INSERT INTO wallet_transactions (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')})`,
        insertParams
    );
}

function clinicActiveClause(columns, alias = '') {
    if (hasTableColumn(columns, 'is_active')) {
        return ` WHERE COALESCE((${alias}is_active)::text, 'true') NOT IN ('false', 'f', '0')`;
    }
    if (hasTableColumn(columns, 'active')) {
        return ` WHERE COALESCE((${alias}active)::text, 'true') NOT IN ('false', 'f', '0')`;
    }
    return '';
}

async function fetchPatientByPhone(phone, { includePassword = false } = {}) {
    const patientColumns = await getTableColumns('patients');
    const rawPhone = String(phone || '').trim();
    const e164 = normalisePhone(rawPhone) || rawPhone;
    const local10 = e164.replace(/^\+63/, '');

    const selectColumns = [
        'id',
        'f_name',
        'l_name',
        'phone',
        optionalColumn('', patientColumns, 'isd_code'),
        optionalColumn('', patientColumns, 'patient_code'),
        optionalColumn('', patientColumns, 'clinic_id'),
        optionalColumn('', patientColumns, 'email'),
        optionalColumn('', patientColumns, 'gender'),
        optionalColumn('', patientColumns, 'dob'),
        optionalColumn('', patientColumns, 'created_at'),
        optionalColumn('', patientColumns, 'is_active'),
        optionalColumn('', patientColumns, 'fcm'),
        imageColumn('', patientColumns),
    ];

    if (includePassword && hasTableColumn(patientColumns, 'password')) {
        selectColumns.push('password');
    }

    const result = await pool.query(
        `SELECT ${selectColumns.join(', ')}
         FROM patients
         WHERE (phone = $1 OR phone = $2 OR phone = $3 OR phone = $4)${patientNotDeletedClause(patientColumns)}
         LIMIT 1`,
        [rawPhone, e164, local10, `0${local10}`]
    );

    return result.rows[0] || null;
}

async function fetchPatientPublicByIdentifier(identifier) {
    const patientColumns = await getTableColumns('patients');
    const clinicColumns = await getTableColumns('clinics');
    const walletJoinCondition = await buildWalletPatientJoinCondition('w.', 'p.');
    const patientCode = String(identifier || '').trim();
    const hasClinicId = hasTableColumn(patientColumns, 'clinic_id');
    const titleSelect = hasTableColumn(clinicColumns, 'title')
        ? 'c.title AS clinic_name'
        : hasTableColumn(clinicColumns, 'name')
            ? 'c.name AS clinic_name'
            : 'NULL AS clinic_name';

    const result = await pool.query(
        `SELECT
            p.id,
            p.f_name,
            p.l_name,
            p.phone,
            ${optionalColumn('p.', patientColumns, 'isd_code')},
            ${optionalColumn('p.', patientColumns, 'patient_code')},
            ${optionalColumn('p.', patientColumns, 'clinic_id')},
            ${optionalColumn('p.', patientColumns, 'email')},
            ${optionalColumn('p.', patientColumns, 'gender')},
            ${optionalColumn('p.', patientColumns, 'dob')},
            ${optionalColumn('p.', patientColumns, 'created_at')},
            ${optionalColumn('p.', patientColumns, 'fcm')},
            ${imageColumn('p.', patientColumns)},
            w.balance AS wallet_amount,
            ${titleSelect}
         FROM patients p
         LEFT JOIN wallets w ON ${walletJoinCondition}
         ${hasClinicId ? 'LEFT JOIN clinics c ON c.id = p.clinic_id' : 'LEFT JOIN clinics c ON 1=0'}
         WHERE p.patient_code = $1${patientNotDeletedClause(patientColumns, 'p.')}
         LIMIT 1`,
        [patientCode]
    );

    return result.rows[0] || null;
}

async function fetchClinicRecords({ singleId = null, start = 0, end = 49, search = '', clinicId = null, activeOnly = false } = {}) {
    await ensureClinicSchema();

    const clinicColumns = await getTableColumns('clinics');
    const cityColumns = await getTableColumns('cities');
    const stateColumns = await getTableColumns('states');
    const userColumns = await getTableColumns('users');

    const titleColumn = getFirstExistingColumn(clinicColumns, ['title', 'name']);
    const imageColumn = getImageColumnName(clinicColumns);
    const clinicActiveColumn = getActiveColumnName(clinicColumns);
    const userActiveColumn = getActiveColumnName(userColumns);
    const userHasDeletedAt = hasTableColumn(userColumns, 'deleted_at');
    const hasCityJoin = cityColumns.size > 0 && hasTableColumn(clinicColumns, 'city_id');
    const hasStateJoin = hasCityJoin && stateColumns.size > 0 && hasTableColumn(cityColumns, 'state_id');

    const titleExpression = titleColumn ? `c.${titleColumn}` : 'c.id::text';
    const activeExpression = clinicActiveColumn
        ? `CASE WHEN COALESCE((c.${clinicActiveColumn})::text, 'false') NOT IN ('false', 'f', '0') THEN 1 ELSE 0 END AS active`
        : '1 AS active';
    const imageExpression = imageColumn ? `c.${imageColumn} AS image` : 'NULL AS image';
    const cityTitleColumn = getFirstExistingColumn(cityColumns, ['title', 'name']) || 'title';
    const stateTitleColumn = getFirstExistingColumn(stateColumns, ['title', 'name']) || 'title';
    const cityTitleExpression = hasCityJoin
        ? `ci.${cityTitleColumn} AS city_title`
        : hasTableColumn(clinicColumns, 'city')
            ? 'c.city AS city_title'
            : 'NULL AS city_title';
    const stateTitleExpression = hasStateJoin
        ? `st.${stateTitleColumn} AS state_title`
        : 'NULL AS state_title';
    const userScopeWhere = [
        'u.clinic_id = c.id',
        userHasDeletedAt ? '(u.deleted_at IS NULL OR u.deleted_at > NOW())' : null,
        userActiveColumn ? `COALESCE((u.${userActiveColumn})::text, 'true') NOT IN ('false', 'f', '0')` : null,
    ].filter(Boolean).join(' AND ');
    const userIdExpression = userColumns.size && hasTableColumn(userColumns, 'clinic_id')
        ? `(SELECT u.id FROM users u WHERE ${userScopeWhere} ORDER BY u.id ASC LIMIT 1) AS user_id`
        : 'NULL AS user_id';
    const fallbackEmailExpression = userColumns.size && hasTableColumn(userColumns, 'clinic_id') && hasTableColumn(userColumns, 'email')
        ? `(SELECT u.email FROM users u WHERE ${userScopeWhere} ORDER BY u.id ASC LIMIT 1)`
        : 'NULL';
    const fallbackPhoneExpression = userColumns.size && hasTableColumn(userColumns, 'clinic_id') && hasTableColumn(userColumns, 'phone')
        ? `(SELECT u.phone FROM users u WHERE ${userScopeWhere} ORDER BY u.id ASC LIMIT 1)`
        : 'NULL';
    const emailExpression = hasTableColumn(clinicColumns, 'email')
        ? `COALESCE(c.email, ${fallbackEmailExpression}) AS email`
        : `${fallbackEmailExpression} AS email`;
    const phoneExpression = hasTableColumn(clinicColumns, 'phone')
        ? `COALESCE(c.phone, ${fallbackPhoneExpression}) AS phone`
        : `${fallbackPhoneExpression} AS phone`;
    const clinicFeeExpression = hasTableColumn(clinicColumns, 'clinic_fee')
        ? 'c.clinic_fee AS clinic_fee'
        : hasTableColumn(clinicColumns, 'fee')
            ? 'c.fee AS clinic_fee'
            : '0 AS clinic_fee';
    const feeExpression = hasTableColumn(clinicColumns, 'fee')
        ? 'c.fee AS fee'
        : hasTableColumn(clinicColumns, 'clinic_fee')
            ? 'c.clinic_fee AS fee'
            : '0 AS fee';
    const joins = [
        hasCityJoin ? 'LEFT JOIN cities ci ON ci.id = c.city_id' : '',
        hasStateJoin ? 'LEFT JOIN states st ON st.id = ci.state_id' : '',
    ].filter(Boolean).join(' ');

    const conditions = [];
    const params = [];

    if (singleId) {
        params.push(singleId);
        conditions.push(`c.id = $${params.length}`);
    } else if (clinicId) {
        params.push(clinicId);
        conditions.push(`c.id = $${params.length}`);
    }

    if (activeOnly && clinicActiveColumn) {
        conditions.push(`COALESCE((c.${clinicActiveColumn})::text, 'true') NOT IN ('false', 'f', '0')`);  
    }

    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
        const searchValue = `%${normalizedSearch}%`;
        params.push(searchValue, searchValue, searchValue);
        const titleParam = `$${params.length - 2}`;
        const addressParam = `$${params.length - 1}`;
        const cityParam = `$${params.length}`;
        const searchPredicates = [`${titleExpression} ILIKE ${titleParam}`];
        if (hasTableColumn(clinicColumns, 'address')) {
            searchPredicates.push(`COALESCE(c.address, '') ILIKE ${addressParam}`);
        }
        if (hasCityJoin) {
            searchPredicates.push(`COALESCE(ci.${cityTitleColumn}, '') ILIKE ${cityParam}`);
        } else if (hasTableColumn(clinicColumns, 'city')) {
            searchPredicates.push(`COALESCE(c.city, '') ILIKE ${cityParam}`);
        }
        conditions.push(`(${searchPredicates.join(' OR ')})`);
    }

    const where = conditions.length ? conditions.join(' AND ') : '1=1';
    const baseSelect = `
        c.id,
        ${titleExpression} AS title,
        ${optionalColumn('c.', clinicColumns, 'clinic_code')},
        ${activeExpression},
        ${optionalColumn('c.', clinicColumns, 'city_id')},
        ${optionalColumn('c.', clinicColumns, 'address')},
        ${phoneExpression},
        ${emailExpression},
        ${optionalColumn('c.', clinicColumns, 'phone_second')},
        ${optionalColumn('c.', clinicColumns, 'description')},
        ${optionalColumn('c.', clinicColumns, 'latitude')},
        ${optionalColumn('c.', clinicColumns, 'longitude')},
        ${optionalColumn('c.', clinicColumns, 'opening_hours')},
        ${optionalColumn('c.', clinicColumns, 'whatsapp')},
        ${optionalColumn('c.', clinicColumns, 'ambulance_btn_enable')},
        ${optionalColumn('c.', clinicColumns, 'ambulance_number')},
        ${optionalColumn('c.', clinicColumns, 'stop_booking')},
        ${optionalColumn('c.', clinicColumns, 'coupon_enable')},
        ${optionalColumn('c.', clinicColumns, 'tax')},
        ${clinicFeeExpression},
        ${feeExpression},
        ${optionalColumn('c.', clinicColumns, 'created_at')},
        ${optionalColumn('c.', clinicColumns, 'updated_at')},
        ${imageExpression},
        ${cityTitleExpression},
        ${stateTitleExpression},
        ${userIdExpression}
    `;

    if (singleId) {
        const result = await pool.query(
            `SELECT ${baseSelect}
             FROM clinics c
             ${joins}
             WHERE ${where}
             ORDER BY ${titleExpression} ASC
             LIMIT 1`,
            params
        );
        return result.rows[0] || null;
    }

    const limit = Math.max(0, Number(end) - Number(start) + 1) || 50;
    const { rows, total } = await paginatedQuery({
        baseSelect,
        from: 'clinics c',
        joins,
        where,
        params,
        start,
        limit,
        orderBy: `${titleExpression} ASC`,
    });
    return { rows, total };
}

async function fetchClinicsForClient(singleId = null) {
    const result = await fetchClinicRecords({ singleId, activeOnly: true, start: 0, end: 9999 });
    return singleId ? result : result.rows;
}

async function resolvePreferredClinicRoleId(client) {
    const roleColumns = await getTableColumns('roles');
    if (!roleColumns.size) {
        return null;
    }

    const roleNameColumn = getFirstExistingColumn(roleColumns, ['name', 'role_name']);
    if (!roleNameColumn) {
        return null;
    }

    const activeColumn = getActiveColumnName(roleColumns);
    const result = await client.query(
        `SELECT id, LOWER(COALESCE(${roleNameColumn}, '')) AS role_name
         FROM roles
         ${activeColumn ? `WHERE COALESCE((${activeColumn})::text, 'true') NOT IN ('false', 'f', '0')` : ''}
         ORDER BY CASE
             WHEN LOWER(COALESCE(${roleNameColumn}, '')) = 'clinic admin' THEN 0
             WHEN LOWER(COALESCE(${roleNameColumn}, '')) = 'clinic' THEN 1
             WHEN LOWER(COALESCE(${roleNameColumn}, '')) = 'admin' THEN 2
             ELSE 99
         END,
         id ASC
         LIMIT 1`
    );

    return result.rows[0]?.id || null;
}

async function assignClinicRoleIfAvailable(client, userId, roleId) {
    if (!userId || !roleId) {
        return;
    }

    const userRoleColumns = await getTableColumns('user_roles');
    if (userRoleColumns.size) {
        await client.query(
            `INSERT INTO user_roles (user_id, role_id, created_at)
             SELECT $1, $2, NOW()
             WHERE NOT EXISTS (
                 SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2
             )`,
            [userId, roleId]
        );
        return;
    }

    const legacyRoleColumns = await getTableColumns('users_role_assign');
    if (legacyRoleColumns.size) {
        await client.query(
            `INSERT INTO users_role_assign (user_id, role_id, assigned_by, created_at)
             VALUES ($1, $2, $1, NOW())
             ON CONFLICT DO NOTHING`,
            [userId, roleId]
        );
    }
}

async function createClinicAdminUser(client, { clinicId, email, password, fName, lName }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
        return null;
    }

    const userColumns = await getTableColumns('users');
    if (!userColumns.size) {
        return null;
    }

    const existingUser = await client.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [normalizedEmail]
    );
    if (existingUser.rows.length) {
        const error = new Error('Clinic admin email already exists.');
        error.statusCode = 409;
        throw error;
    }

    const userMetadata = await getTableColumnMetadata('users');
    const roleId = await resolvePreferredClinicRoleId(client);
    const passwordColumn = getPasswordColumnName(userColumns);
    const insertColumns = [];
    const insertValues = [];
    const insertParams = [];
    const addInsertValue = (columnName, value) => {
        if (!hasTableColumn(userColumns, columnName)) {
            return;
        }
        if (!hasWritableTableColumn(userMetadata, columnName)) {
            return;
        }
        insertColumns.push(columnName);
        insertParams.push(value);
        insertValues.push(`$${insertParams.length}`);
    };

    addInsertValue('clinic_id', clinicId);
    addInsertValue('role_id', roleId);
    addInsertValue('email', normalizedEmail);
    if (passwordColumn) {
        addInsertValue(passwordColumn, hashPassword(password));
    }
    addInsertValue('f_name', String(fName || '').trim());
    addInsertValue('l_name', String(lName || '').trim());
    addInsertValue('name', buildFullName(fName, lName));
    if (hasTableColumn(userColumns, 'active')) {
        insertColumns.push('active');
        insertValues.push('TRUE');
    }
    if (hasTableColumn(userColumns, 'is_active') && hasWritableTableColumn(userMetadata, 'is_active')) {
        insertColumns.push('is_active');
        insertValues.push('TRUE');
    }
    if (hasTableColumn(userColumns, 'created_at')) {
        insertColumns.push('created_at');
        insertValues.push('NOW()');
    }
    if (hasTableColumn(userColumns, 'updated_at')) {
        insertColumns.push('updated_at');
        insertValues.push('NOW()');
    }

    const insertedUser = await client.query(
        `INSERT INTO users (${insertColumns.join(', ')})
         VALUES (${insertValues.join(', ')})
         RETURNING id`,
        insertParams
    );

    const userId = insertedUser.rows[0]?.id || null;
    await assignClinicRoleIfAvailable(client, userId, roleId);
    return userId;
}

async function getClinicDependentCounts(client, clinicId) {
    const dependencyTables = [
        'users',
        'patients',
        'doctors',
        'appointments',
        'invoices',
        'payments',
        'transactions',
        'emr_encounters',
    ];

    const counts = {};
    for (const tableName of dependencyTables) {
        const columns = await getTableColumns(tableName);
        if (!columns.size || !hasTableColumn(columns, 'clinic_id')) {
            continue;
        }

        const result = await client.query(
            `SELECT COUNT(*) AS total FROM ${tableName} WHERE clinic_id = $1`,
            [clinicId]
        );
        counts[tableName] = Number(result.rows[0]?.total || 0);
    }

    return counts;
}

function getActiveCaseExpression(alias, columns) {
    const activeColumn = getActiveColumnName(columns);
    if (!activeColumn) {
        return '1';
    }
    return `CASE WHEN COALESCE((${alias}${activeColumn})::text, 'false') NOT IN ('false', 'f', '0') THEN 1 ELSE 0 END`;
}

async function listCountries() {
    await ensureLocationSchema();
    const countryColumns = await getTableColumns('countries');
    const titleColumn = getFirstExistingColumn(countryColumns, ['title', 'name']) || 'title';
    const rows = await pool.query(
        `SELECT
            id,
            ${titleColumn} AS title,
            ${optionalColumn('', countryColumns, 'iso_code')},
            ${getActiveCaseExpression('', countryColumns)} AS active,
            ${optionalColumn('', countryColumns, 'created_at')},
            ${optionalColumn('', countryColumns, 'updated_at')}
         FROM countries
         ORDER BY ${titleColumn} ASC`
    );
    return rows.rows;
}

async function listStates() {
    await ensureLocationSchema();
    const stateColumns = await getTableColumns('states');
    const countryColumns = await getTableColumns('countries');
    const stateTitleColumn = getFirstExistingColumn(stateColumns, ['title', 'name']) || 'title';
    const countryTitleColumn = getFirstExistingColumn(countryColumns, ['title', 'name']) || 'title';
    const rows = await pool.query(
        `SELECT
            s.id,
            s.${stateTitleColumn} AS title,
            ${optionalColumn('s.', stateColumns, 'country_id')},
            ${getActiveCaseExpression('s.', stateColumns)} AS active,
            ${optionalColumn('s.', stateColumns, 'created_at')},
            ${optionalColumn('s.', stateColumns, 'updated_at')},
            c.${countryTitleColumn} AS country_title
         FROM states s
         LEFT JOIN countries c ON c.id = s.country_id
         ORDER BY s.${stateTitleColumn} ASC`
    );
    return rows.rows;
}

async function listCities() {
    await ensureLocationSchema();
    const cityColumns = await getTableColumns('cities');
    const stateColumns = await getTableColumns('states');
    const cityTitleColumn = getFirstExistingColumn(cityColumns, ['title', 'name']) || 'title';
    const stateTitleColumn = getFirstExistingColumn(stateColumns, ['title', 'name']) || 'title';
    const rows = await pool.query(
        `SELECT
            ci.id,
            ci.${cityTitleColumn} AS title,
            ${optionalColumn('ci.', cityColumns, 'state_id')},
            ${optionalColumn('ci.', cityColumns, 'latitude')},
            ${optionalColumn('ci.', cityColumns, 'longitude')},
            CASE WHEN COALESCE((ci.default_city)::text, '0') NOT IN ('false', 'f', '0') THEN 1 ELSE 0 END AS default_city,
            ${getActiveCaseExpression('ci.', cityColumns)} AS active,
            ${optionalColumn('ci.', cityColumns, 'created_at')},
            ${optionalColumn('ci.', cityColumns, 'updated_at')},
            st.${stateTitleColumn} AS state_title
         FROM cities ci
         LEFT JOIN states st ON st.id = ci.state_id
         ORDER BY ci.${cityTitleColumn} ASC`
    );
    return rows.rows;
}

// ===========================================================================
// PATIENT AUTH: check_patient
// ===========================================================================

app.get('/api/v1/check_patient', async (req, res) => {
    try {
        const rawPhone = (req.query.phone || '').trim();
        if (!rawPhone) {
            return res.status(400).json({ response: 400, status: false, message: 'phone is required' });
        }
        const patient = await fetchPatientByPhone(rawPhone);
        const userExists = Boolean(patient) && (patient.is_active !== false);
        return res.json({
            response: 201,
            status: userExists,
            message: userExists ? 'Patient found' : 'Patient not found',
            data: userExists ? { patient_code: patient.patient_code } : null,
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// PATIENT AUTH: OTP send & verify
// ===========================================================================

app.post('/api/v1/patient/send-otp', async (req, res) => {
    try {
        await ensureOtpTable();
        const rawPhone = (req.body.phone || '').toString().trim();
        if (!rawPhone) {
            return res.status(422).json({ response: 422, status: false, message: 'phone is required' });
        }
        const e164 = normalisePhone(rawPhone) || rawPhone;
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const requestId = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        // Invalidate previous OTPs for this phone
        await pool.query(`UPDATE patient_otp_codes SET verified=TRUE WHERE phone=$1 AND verified=FALSE`, [e164]);

        await pool.query(
            `INSERT INTO patient_otp_codes (phone, otp_code, request_id, expires_at) VALUES ($1,$2,$3,$4)`,
            [e164, code, requestId, expiresAt]
        );

        // Attempt to send SMS via configured provider
        let smsSent = false;
        const semaphoreKey = process.env.SEMAPHORE_API_KEY;
        const senderName   = process.env.SMS_SENDER_NAME || 'GentRx';

        if (semaphoreKey) {
            try {
                const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
                const httpModule = fetch || require('https');
                // Semaphore SMS API
                const params = new URLSearchParams({
                    apikey:  semaphoreKey,
                    number:  e164,
                    message: `Your GentRx verification code is: ${code}. Valid for 10 minutes.`,
                    sendername: senderName,
                });
                // Fire-and-forget; we don't block on the SMS response
                const http = require('https');
                const postData = params.toString();
                const options = {
                    hostname: 'api.semaphore.co',
                    path: '/api/v4/messages',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
                };
                const smsReq = http.request(options, () => {});
                smsReq.on('error', () => {});
                smsReq.write(postData);
                smsReq.end();
                smsSent = true;
            } catch (_) { /* SMS is best-effort */ }
        }

        console.log(`[OTP] Phone: ${e164} | Code: ${code} | Sent via SMS: ${smsSent}`);

        res.json({
            response: 200,
            status: true,
            message: smsSent ? 'OTP sent via SMS' : 'OTP generated (SMS not configured)',
            data: { request_id: requestId, phone: e164 },
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/patient/verify-otp', async (req, res) => {
    try {
        await ensureOtpTable();
        const rawPhone = (req.body.phone || '').toString().trim();
        const code     = (req.body.otp   || '').toString().trim();
        if (!rawPhone || !code) {
            return res.status(422).json({ response: 422, status: false, message: 'phone and otp are required' });
        }
        const e164 = normalisePhone(rawPhone) || rawPhone;

        const result = await pool.query(
            `SELECT id FROM patient_otp_codes
             WHERE phone=$1 AND otp_code=$2 AND verified=FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [e164, code]
        );

        if (!result.rows.length) {
            return res.status(422).json({ response: 422, status: false, message: 'Invalid or expired OTP' });
        }

        await pool.query(`UPDATE patient_otp_codes SET verified=TRUE WHERE id=$1`, [result.rows[0].id]);

        // Issue a short-lived verification token (not a full session token)
        const verificationToken = jwt.sign({ phone: e164, purpose: 'otp_verify' }, JWT_SECRET, { expiresIn: '30m' });

        res.json({
            response: 200,
            status: true,
            message: 'OTP verified successfully',
            verification_token: verificationToken,
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// PATIENT AUTH: signup & login & logout
// ===========================================================================

app.post('/api/v1/patient/signup', async (req, res) => {
    try {
        const { f_name, l_name, phone, isd_code, password, clinic_id, verification_token, email } = req.body;
        if (!f_name || !phone || !password) {
            return res.status(422).json({ response: 422, status: false, message: 'f_name, phone, and password are required' });
        }

        // Optional: verify the verification_token from OTP flow
        if (verification_token) {
            try {
                const decoded = jwt.verify(verification_token, JWT_SECRET);
                if (decoded.purpose !== 'otp_verify') throw new Error('invalid purpose');
            } catch (jwtErr) {
                return res.status(422).json({ response: 422, status: false, message: 'Invalid verification token. Please verify your phone first.' });
            }
        }

        const e164 = normalisePhone(phone) || phone;
        const local10 = e164.replace(/^\+63/, '');
        const patientColumns = await getTableColumns('patients');

        // Duplicate check
        const existing = await pool.query(
            `SELECT id FROM patients WHERE (phone=$1 OR phone=$2 OR phone=$3 OR phone=$4)${patientNotDeletedClause(patientColumns)} LIMIT 1`,
            [phone, e164, local10, `0${local10}`]
        );
        if (existing.rows.length) {
            return res.status(409).json({ response: 409, status: false, message: 'Phone number is already registered. Please login instead.' });
        }

        const hashed = hashPassword(password);
        const effectiveClinicId = clinic_id ? parseInt(clinic_id, 10) || null : null;

        // Generate patient code: GCP-XXXXXXXX
        const seqRes = await pool.query(`SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(patient_code, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) + 1 AS next_num FROM patients`);
        const nextNum = seqRes.rows[0].next_num || 1;
        const patientCode = `GCP-${String(nextNum).padStart(8, '0')}`;

        const insertColumns = [];
        const insertValues = [];
        const insertParams = [];
        const addInsertValue = (columnName, value) => {
            if (!hasTableColumn(patientColumns, columnName)) {
                return;
            }
            insertColumns.push(columnName);
            insertParams.push(value);
            insertValues.push(`$${insertParams.length}`);
        };

        addInsertValue('f_name', f_name.trim());
        addInsertValue('l_name', (l_name || '').trim());
        addInsertValue('phone', local10);
        addInsertValue('isd_code', isd_code || '+63');
        addInsertValue('password', hashed);
        addInsertValue('clinic_id', effectiveClinicId);
        addInsertValue('email', email || null);
        addInsertValue('patient_code', patientCode);
        if (hasTableColumn(patientColumns, 'is_active')) {
            insertColumns.push('is_active');
            insertValues.push('TRUE');
        }
        if (hasTableColumn(patientColumns, 'created_at')) {
            insertColumns.push('created_at');
            insertValues.push('NOW()');
        }
        if (hasTableColumn(patientColumns, 'updated_at')) {
            insertColumns.push('updated_at');
            insertValues.push('NOW()');
        }

        const insertRes = await pool.query(
            `INSERT INTO patients (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING id, patient_code`,
            insertParams
        );

        const newPatient = await fetchPatientPublicByIdentifier(insertRes.rows[0].patient_code);
        // Create wallet for new patient
        await ensurePatientWallet(pool, patientCode);

        const token = generateToken({ id: newPatient.id, patient_code: patientCode, phone: newPatient.phone || local10 });

        res.json({
            response: 200,
            status: true,
            message: 'Registration successful',
            token,
            data: newPatient,
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/patient/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) {
            return res.status(422).json({ response: 422, status: false, message: 'phone and password are required' });
        }
        const patient = await fetchPatientByPhone(phone, { includePassword: true });

        if (!patient) {
            return res.status(401).json({ response: 401, status: false, message: 'Phone number not found. Please register first.' });
        }

        if (patient.is_active === false) {
            return res.status(403).json({ response: 403, status: false, message: 'Account is deactivated. Please contact support.' });
        }

        if (!verifyPassword(password, patient.password)) {
            return res.status(401).json({ response: 401, status: false, message: 'Incorrect PIN. Please try again.' });
        }

        const token = generateToken(patient);

        // Fetch wallet balance
        const wallet = await findPatientWallet(pool, patient.patient_code);
        const walletAmount = wallet ? parseFloat(wallet.balance || 0) : 0;

        const { password: _pw, ...safePatient } = patient;
        safePatient.wallet_amount = walletAmount;

        res.json({
            response: 200,
            status: true,
            message: 'Successfully',
            token,
            data: safePatient,
        });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/patient/logout', async (req, res) => {
    // Stateless JWT — just acknowledge; client discards token
    res.json({ response: 200, status: true, message: 'Logged out successfully' });
});

// ===========================================================================
// PATIENT CRUD: get_patients, update_patient, soft_delete
// ===========================================================================

app.get('/api/v1/get_patients', async (req, res) => {
    try {
        const clinicId  = req.query.clinic_id || null;
        const search    = (req.query.search || '').trim();
        const doctorId  = getScopedDoctorId(req);
        const start     = parseInt(req.query.start || 0, 10);
        const end       = parseInt(req.query.end   || 49, 10);
        const limit     = end - start + 1;

        const conditions = ['(p.deleted_at IS NULL OR p.deleted_at > NOW())'];
        const params     = [];

        if (clinicId)  { params.push(clinicId); conditions.push(`p.clinic_id = $${params.length}`); }
        if (doctorId) {
            params.push(doctorId);
            const doctorScopeClause = await buildDoctorPatientCodeExistsClause({
                patientCodeExpression: 'p.patient_code',
                doctorParamToken: `$${params.length}`,
            });
            conditions.push(doctorScopeClause || '1=0');
        }
        if (search) {
            const s = `%${search}%`;
            params.push(s, s, s);
            const n = params.length;
            conditions.push(`(CONCAT(p.f_name,' ',p.l_name) ILIKE $${n - 2} OR p.phone ILIKE $${n - 1} OR p.patient_code ILIKE $${n})`);
        }

        const where = conditions.join(' AND ');
        const BASE = `p.id, p.f_name, p.l_name, p.phone, p.isd_code, p.patient_code, p.email, p.gender, p.dob, p.profile_image, p.clinic_id, p.is_active, p.created_at`;

        const walletJoinCondition = await buildWalletPatientJoinCondition('w.', 'p.');
        const dataRes = await pool.query(
            `SELECT ${BASE}, w.balance AS wallet_amount FROM patients p LEFT JOIN wallets w ON ${walletJoinCondition} WHERE ${where} ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, start]
        );
        const countRes = await pool.query(`SELECT COUNT(*) AS total FROM patients p WHERE ${where}`, params);

        res.json({ response: 200, status: true, data: dataRes.rows, total_record: parseInt(countRes.rows[0].total, 10) });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

async function handleGetPatientByCode(req, res, patientCodeParam) {
    try {
        const patientCode = String(patientCodeParam || '').trim();
        if (!patientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        if (/^\d+$/.test(patientCode)) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code must be a non-numeric code' });
        }

        const doctorId = getScopedDoctorId(req);
        const patient = await fetchPatientPublicByIdentifier(patientCode);

        if (!patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        if (doctorId) {
            const hasAccess = await doctorHasAccessToPatientCode(doctorId, patient.patient_code);
            if (!hasAccess) {
                return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient does not belong to this doctor' });
            }
        }
        res.json({ response: 200, status: true, data: patient });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
}

// Canonical patient lookup route (patient_code only)
app.get('/api/v1/get_patients/by-code/:patient_code', async (req, res) => {
    return handleGetPatientByCode(req, res, req.params.patient_code);
});

// Compatibility alias that now enforces patient_code (rejects numeric patient_id)
app.get('/api/v1/get_patients/:id', async (req, res) => {
    return handleGetPatientByCode(req, res, req.params.id);
});

app.post('/api/v1/update_patient', async (req, res) => {
    try {
        const { id, f_name, l_name, gender, dob, email, fcm, notification_seen_at } = req.body;
        if (!id) return res.status(422).json({ response: 422, status: false, message: 'id is required' });

        const patientColumns = await getTableColumns('patients');
        const sets = [];
        const params = [];

        if (f_name !== undefined && hasTableColumn(patientColumns, 'f_name')) { params.push(f_name); sets.push(`f_name=$${params.length}`); }
        if (l_name !== undefined && hasTableColumn(patientColumns, 'l_name')) { params.push(l_name); sets.push(`l_name=$${params.length}`); }
        if (gender !== undefined && hasTableColumn(patientColumns, 'gender')) { params.push(gender); sets.push(`gender=$${params.length}`); }
        if (dob !== undefined && hasTableColumn(patientColumns, 'dob')) { params.push(dob); sets.push(`dob=$${params.length}`); }
        if (email !== undefined && hasTableColumn(patientColumns, 'email')) { params.push(email); sets.push(`email=$${params.length}`); }
        if (fcm !== undefined && hasTableColumn(patientColumns, 'fcm')) { params.push(fcm); sets.push(`fcm=$${params.length}`); }
        if (notification_seen_at && hasTableColumn(patientColumns, 'notification_seen_at')) { sets.push(`notification_seen_at=NOW()`); }

        if (!sets.length) return res.json({ response: 200, status: true, message: 'Nothing to update.' });

        if (hasTableColumn(patientColumns, 'updated_at')) {
            sets.push(`updated_at=NOW()`);
        }
        params.push(id);

        await pool.query(`UPDATE patients SET ${sets.join(',')} WHERE id=$${params.length}`, params);
        res.json({ response: 200, status: true, message: 'Patient updated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/patient_soft_delete', async (req, res) => {
    try {
        const uid = req.body.user_id || req.body.id;
        if (!uid) return res.status(422).json({ response: 422, status: false, message: 'user_id is required' });
        const patientColumns = await getTableColumns('patients');
        const updates = [];
        if (hasTableColumn(patientColumns, 'deleted_at')) updates.push('deleted_at=NOW()');
        if (hasTableColumn(patientColumns, 'is_active')) updates.push('is_active=FALSE');
        if (hasTableColumn(patientColumns, 'updated_at')) updates.push('updated_at=NOW()');
        if (!updates.length) {
            return res.json({ response: 200, status: true, message: 'Account deactivated.' });
        }
        await pool.query(`UPDATE patients SET ${updates.join(', ')} WHERE id=$1`, [uid]);
        res.json({ response: 200, status: true, message: 'Account deactivated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/remove_patient_image', async (req, res) => {
    try {
        const uid = req.body.id || req.body.user_id;
        if (!uid) return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        const patientColumns = await getTableColumns('patients');
        const imageField = hasTableColumn(patientColumns, 'image')
            ? 'image'
            : hasTableColumn(patientColumns, 'profile_image')
                ? 'profile_image'
                : null;
        if (!imageField) {
            return res.json({ response: 200, status: true, message: 'Profile image removed.' });
        }
        const setClause = hasTableColumn(patientColumns, 'updated_at')
            ? `${imageField}=NULL, updated_at=NOW()`
            : `${imageField}=NULL`;
        await pool.query(`UPDATE patients SET ${setClause} WHERE id=$1`, [uid]);
        res.json({ response: 200, status: true, message: 'Profile image removed.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// CLINIC ENDPOINTS (for registration + browsing)
// ===========================================================================

app.get('/api/v1/get_country', async (_req, res) => {
    try {
        const data = await listCountries();
        res.json({ response: 200, status: true, data });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_states', async (_req, res) => {
    try {
        const data = await listStates();
        res.json({ response: 200, status: true, data });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_city', async (_req, res) => {
    try {
        const data = await listCities();
        res.json({ response: 200, status: true, data });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_country', async (req, res) => {
    try {
        await ensureLocationSchema();

        const countryColumns = await getTableColumns('countries');
        const titleColumn = getFirstExistingColumn(countryColumns, ['title', 'name']) || 'title';
        const title = String(req.body?.title || '').trim();
        const isoCode = String(req.body?.iso_code || '').trim().toUpperCase();

        if (!title) {
            return res.status(422).json({ response: 422, status: false, message: 'title is required.' });
        }
        if (hasTableColumn(countryColumns, 'iso_code') && !isoCode) {
            return res.status(422).json({ response: 422, status: false, message: 'iso_code is required.' });
        }

        const duplicate = await pool.query(
            `SELECT id FROM countries WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1)) LIMIT 1`,
            [title]
        );
        if (duplicate.rows.length) {
            return res.status(409).json({ response: 409, status: false, message: 'Country title already exists.' });
        }

        const insertColumns = [titleColumn];
        const insertValues = ['$1'];
        const insertParams = [title];

        if (hasTableColumn(countryColumns, 'iso_code')) {
            insertColumns.push('iso_code');
            insertParams.push(isoCode || null);
            insertValues.push(`$${insertParams.length}`);
        }
        if (hasTableColumn(countryColumns, 'active')) {
            insertColumns.push('active');
            insertValues.push('TRUE');
        }
        if (hasTableColumn(countryColumns, 'is_active')) {
            insertColumns.push('is_active');
            insertValues.push('TRUE');
        }
        if (hasTableColumn(countryColumns, 'created_at')) {
            insertColumns.push('created_at');
            insertValues.push('NOW()');
        }
        if (hasTableColumn(countryColumns, 'updated_at')) {
            insertColumns.push('updated_at');
            insertValues.push('NOW()');
        }

        const inserted = await pool.query(
            `INSERT INTO countries (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING id`,
            insertParams
        );

        res.json({ response: 200, status: true, message: 'Country added.', id: inserted.rows[0]?.id || null });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/update_country', async (req, res) => {
    try {
        await ensureLocationSchema();

        const countryId = toNullablePositiveInt(req.body?.id);
        if (!countryId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const countryColumns = await getTableColumns('countries');
        const countryColumnMetadata = await getTableColumnMetadata('countries');
        const titleColumn = getFirstExistingColumn(countryColumns, ['title', 'name']) || 'title';
        const existing = await pool.query(`SELECT id FROM countries WHERE id = $1 LIMIT 1`, [countryId]);
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Country not found.' });
        }

        const sets = [];
        const params = [];

        if (req.body?.title !== undefined) {
            const title = String(req.body.title || '').trim();
            if (!title) {
                return res.status(422).json({ response: 422, status: false, message: 'title is required.' });
            }

            const duplicate = await pool.query(
                `SELECT id FROM countries WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1)) AND id <> $2 LIMIT 1`,
                [title, countryId]
            );
            if (duplicate.rows.length) {
                return res.status(409).json({ response: 409, status: false, message: 'Country title already exists.' });
            }

            params.push(title);
            sets.push(`${titleColumn} = $${params.length}`);
        }

        if (req.body?.iso_code !== undefined && hasTableColumn(countryColumns, 'iso_code')) {
            const isoCode = String(req.body.iso_code || '').trim().toUpperCase();
            if (!isoCode) {
                return res.status(422).json({ response: 422, status: false, message: 'iso_code is required.' });
            }
            params.push(isoCode);
            sets.push(`iso_code = $${params.length}`);
        }

        const activeColumn = getActiveColumnName(countryColumns);
        if (req.body?.active !== undefined && activeColumn) {
            const nextActive = toBooleanFlag(req.body.active, null);
            if (nextActive === null) {
                return res.status(422).json({ response: 422, status: false, message: 'active must be a boolean-like value.' });
            }
            params.push(normalizeBooleanForColumn(countryColumnMetadata, activeColumn, nextActive));
            sets.push(`${activeColumn} = $${params.length}`);
        }

        if (!sets.length) {
            return res.json({ response: 200, status: true, message: 'Nothing to update.' });
        }

        if (hasTableColumn(countryColumns, 'updated_at')) {
            sets.push('updated_at = NOW()');
        }

        params.push(countryId);
        await pool.query(`UPDATE countries SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

        res.json({ response: 200, status: true, message: 'Country updated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/delete_country', async (req, res) => {
    try {
        await ensureLocationSchema();

        const countryId = toNullablePositiveInt(req.body?.id);
        if (!countryId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const countryColumns = await getTableColumns('countries');
        const existing = await pool.query(`SELECT id FROM countries WHERE id = $1 LIMIT 1`, [countryId]);
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Country not found.' });
        }

        const stateColumns = await getTableColumns('states');
        let stateCount = 0;
        if (stateColumns.size && hasTableColumn(stateColumns, 'country_id')) {
            const stateResult = await pool.query(`SELECT COUNT(*) AS total FROM states WHERE country_id = $1`, [countryId]);
            stateCount = Number(stateResult.rows[0]?.total || 0);
        }

        if (stateCount > 0) {
            const activeColumn = getActiveColumnName(countryColumns);
            if (!activeColumn) {
                return res.status(409).json({ response: 409, status: false, message: 'Country is linked to states and cannot be deleted.' });
            }

            await pool.query(
                `UPDATE countries SET ${activeColumn} = FALSE${hasTableColumn(countryColumns, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE id = $1`,
                [countryId]
            );
            return res.json({ response: 200, status: true, message: 'Country archived because states are linked.' });
        }

        await pool.query(`DELETE FROM countries WHERE id = $1`, [countryId]);
        res.json({ response: 200, status: true, message: 'Country deleted.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_state', async (req, res) => {
    try {
        await ensureLocationSchema();

        const stateColumns = await getTableColumns('states');
        const titleColumn = getFirstExistingColumn(stateColumns, ['title', 'name']) || 'title';
        const title = String(req.body?.title || '').trim();
        const countryId = toNullablePositiveInt(req.body?.country_id);

        if (!title) {
            return res.status(422).json({ response: 422, status: false, message: 'title is required.' });
        }
        if (hasTableColumn(stateColumns, 'country_id') && !countryId) {
            return res.status(422).json({ response: 422, status: false, message: 'country_id is required.' });
        }

        if (countryId) {
            const countryResult = await pool.query(`SELECT id FROM countries WHERE id = $1 LIMIT 1`, [countryId]);
            if (!countryResult.rows.length) {
                return res.status(422).json({ response: 422, status: false, message: 'country_id does not exist.' });
            }
        }

        const duplicate = await pool.query(
            `SELECT id FROM states WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1))${countryId ? ' AND country_id = $2' : ''} LIMIT 1`,
            countryId ? [title, countryId] : [title]
        );
        if (duplicate.rows.length) {
            return res.status(409).json({ response: 409, status: false, message: 'State title already exists.' });
        }

        const insertColumns = [titleColumn];
        const insertValues = ['$1'];
        const insertParams = [title];

        if (hasTableColumn(stateColumns, 'country_id')) {
            insertColumns.push('country_id');
            insertParams.push(countryId || null);
            insertValues.push(`$${insertParams.length}`);
        }
        if (hasTableColumn(stateColumns, 'active')) {
            insertColumns.push('active');
              insertValues.push('1');
        }
        if (hasTableColumn(stateColumns, 'is_active')) {
            insertColumns.push('is_active');
              insertValues.push('1');
        }
        if (hasTableColumn(stateColumns, 'created_at')) {
            insertColumns.push('created_at');
            insertValues.push('NOW()');
        }
        if (hasTableColumn(stateColumns, 'updated_at')) {
            insertColumns.push('updated_at');
            insertValues.push('NOW()');
        }

        const inserted = await pool.query(
            `INSERT INTO states (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING id`,
            insertParams
        );

        res.json({ response: 200, status: true, message: 'State added.', id: inserted.rows[0]?.id || null });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/update_state', async (req, res) => {
    try {
        await ensureLocationSchema();

        const stateId = toNullablePositiveInt(req.body?.id);
        if (!stateId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const stateColumns = await getTableColumns('states');
        const stateColumnMetadata = await getTableColumnMetadata('states');
        const titleColumn = getFirstExistingColumn(stateColumns, ['title', 'name']) || 'title';
        const existing = await pool.query(`SELECT id, country_id FROM states WHERE id = $1 LIMIT 1`, [stateId]);
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'State not found.' });
        }

        const sets = [];
        const params = [];
        let targetCountryId = existing.rows[0].country_id;

        if (req.body?.title !== undefined) {
            const title = String(req.body.title || '').trim();
            if (!title) {
                return res.status(422).json({ response: 422, status: false, message: 'title is required.' });
            }
            params.push(title);
            sets.push(`${titleColumn} = $${params.length}`);
        }

        if (req.body?.country_id !== undefined && hasTableColumn(stateColumns, 'country_id')) {
            const countryId = toNullablePositiveInt(req.body.country_id);
            if (!countryId) {
                return res.status(422).json({ response: 422, status: false, message: 'country_id is required.' });
            }
            const countryResult = await pool.query(`SELECT id FROM countries WHERE id = $1 LIMIT 1`, [countryId]);
            if (!countryResult.rows.length) {
                return res.status(422).json({ response: 422, status: false, message: 'country_id does not exist.' });
            }
            targetCountryId = countryId;
            params.push(countryId);
            sets.push(`country_id = $${params.length}`);
        }

        const activeColumn = getActiveColumnName(stateColumns);
        if (req.body?.active !== undefined && activeColumn) {
            const nextActive = toBooleanFlag(req.body.active, null);
            if (nextActive === null) {
                return res.status(422).json({ response: 422, status: false, message: 'active must be a boolean-like value.' });
            }
            params.push(normalizeBooleanForColumn(stateColumnMetadata, activeColumn, nextActive));
            sets.push(`${activeColumn} = $${params.length}`);
        }

        if (req.body?.title !== undefined) {
            const title = String(req.body.title || '').trim();
            const duplicate = await pool.query(
                `SELECT id FROM states WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1)) AND id <> $2${targetCountryId ? ' AND country_id = $3' : ''} LIMIT 1`,
                targetCountryId ? [title, stateId, targetCountryId] : [title, stateId]
            );
            if (duplicate.rows.length) {
                return res.status(409).json({ response: 409, status: false, message: 'State title already exists.' });
            }
        }

        if (!sets.length) {
            return res.json({ response: 200, status: true, message: 'Nothing to update.' });
        }

        if (hasTableColumn(stateColumns, 'updated_at')) {
            sets.push('updated_at = NOW()');
        }

        params.push(stateId);
        await pool.query(`UPDATE states SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

        res.json({ response: 200, status: true, message: 'State updated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/delete_state', async (req, res) => {
    try {
        await ensureLocationSchema();

        const stateId = toNullablePositiveInt(req.body?.id);
        if (!stateId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const stateColumns = await getTableColumns('states');
        const existing = await pool.query(`SELECT id FROM states WHERE id = $1 LIMIT 1`, [stateId]);
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'State not found.' });
        }

        const cityColumns = await getTableColumns('cities');
        let cityCount = 0;
        if (cityColumns.size && hasTableColumn(cityColumns, 'state_id')) {
            const cityResult = await pool.query(`SELECT COUNT(*) AS total FROM cities WHERE state_id = $1`, [stateId]);
            cityCount = Number(cityResult.rows[0]?.total || 0);
        }

        if (cityCount > 0) {
            const activeColumn = getActiveColumnName(stateColumns);
            if (!activeColumn) {
                return res.status(409).json({ response: 409, status: false, message: 'State is linked to cities and cannot be deleted.' });
            }

            await pool.query(
                `UPDATE states SET ${activeColumn} = FALSE${hasTableColumn(stateColumns, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE id = $1`,
                [stateId]
            );
            return res.json({ response: 200, status: true, message: 'State archived because cities are linked.' });
        }

        await pool.query(`DELETE FROM states WHERE id = $1`, [stateId]);
        res.json({ response: 200, status: true, message: 'State deleted.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_city', async (req, res) => {
    try {
        await ensureLocationSchema();

        const cityColumns = await getTableColumns('cities');
        const titleColumn = getFirstExistingColumn(cityColumns, ['title', 'name']) || 'title';
        const title = String(req.body?.title || '').trim();
        const stateId = toNullablePositiveInt(req.body?.state_id);

        if (!title) {
            return res.status(422).json({ response: 422, status: false, message: 'title is required.' });
        }
        if (hasTableColumn(cityColumns, 'state_id') && !stateId) {
            return res.status(422).json({ response: 422, status: false, message: 'state_id is required.' });
        }

        if (stateId) {
            const stateResult = await pool.query(`SELECT id FROM states WHERE id = $1 LIMIT 1`, [stateId]);
            if (!stateResult.rows.length) {
                return res.status(422).json({ response: 422, status: false, message: 'state_id does not exist.' });
            }
        }

        const duplicate = await pool.query(
            `SELECT id FROM cities WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1))${stateId ? ' AND state_id = $2' : ''} LIMIT 1`,
            stateId ? [title, stateId] : [title]
        );
        if (duplicate.rows.length) {
            return res.status(409).json({ response: 409, status: false, message: 'City title already exists.' });
        }

        const insertColumns = [titleColumn];
        const insertValues = ['$1'];
        const insertParams = [title];

        if (hasTableColumn(cityColumns, 'state_id')) {
            insertColumns.push('state_id');
            insertParams.push(stateId || null);
            insertValues.push(`$${insertParams.length}`);
        }
        if (hasTableColumn(cityColumns, 'active')) {
            insertColumns.push('active');
              insertValues.push('1');
        }
        if (hasTableColumn(cityColumns, 'is_active')) {
            insertColumns.push('is_active');
              insertValues.push('1');
        }
        if (hasTableColumn(cityColumns, 'default_city')) {
            insertColumns.push('default_city');
              insertValues.push('0');
        }
        if (hasTableColumn(cityColumns, 'created_at')) {
            insertColumns.push('created_at');
            insertValues.push('NOW()');
        }
        if (hasTableColumn(cityColumns, 'updated_at')) {
            insertColumns.push('updated_at');
            insertValues.push('NOW()');
        }

        const inserted = await pool.query(
            `INSERT INTO cities (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING id`,
            insertParams
        );

        res.json({ response: 200, status: true, message: 'City added.', id: inserted.rows[0]?.id || null });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/update_city', async (req, res) => {
    try {
        await ensureLocationSchema();

        const cityId = toNullablePositiveInt(req.body?.id);
        if (!cityId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const cityColumns = await getTableColumns('cities');
        const cityColumnMetadata = await getTableColumnMetadata('cities');
        const titleColumn = getFirstExistingColumn(cityColumns, ['title', 'name']) || 'title';
        const existing = await pool.query(`SELECT id, state_id FROM cities WHERE id = $1 LIMIT 1`, [cityId]);
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'City not found.' });
        }

        const sets = [];
        const params = [];
        let targetStateId = existing.rows[0].state_id;

        if (req.body?.title !== undefined) {
            const title = String(req.body.title || '').trim();
            if (!title) {
                return res.status(422).json({ response: 422, status: false, message: 'title is required.' });
            }
            params.push(title);
            sets.push(`${titleColumn} = $${params.length}`);
        }

        if (req.body?.state_id !== undefined && hasTableColumn(cityColumns, 'state_id')) {
            const stateId = toNullablePositiveInt(req.body.state_id);
            if (!stateId) {
                return res.status(422).json({ response: 422, status: false, message: 'state_id is required.' });
            }
            const stateResult = await pool.query(`SELECT id FROM states WHERE id = $1 LIMIT 1`, [stateId]);
            if (!stateResult.rows.length) {
                return res.status(422).json({ response: 422, status: false, message: 'state_id does not exist.' });
            }
            targetStateId = stateId;
            params.push(stateId);
            sets.push(`state_id = $${params.length}`);
        }

        if (req.body?.latitude !== undefined && hasTableColumn(cityColumns, 'latitude')) {
            if (req.body.latitude === null || req.body.latitude === '') {
                sets.push('latitude = NULL');
            } else {
                const latitude = Number(req.body.latitude);
                if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
                    return res.status(422).json({ response: 422, status: false, message: 'Latitude must be between -90 and 90.' });
                }
                params.push(latitude);
                sets.push(`latitude = $${params.length}`);
            }
        }

        if (req.body?.longitude !== undefined && hasTableColumn(cityColumns, 'longitude')) {
            if (req.body.longitude === null || req.body.longitude === '') {
                sets.push('longitude = NULL');
            } else {
                const longitude = Number(req.body.longitude);
                if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
                    return res.status(422).json({ response: 422, status: false, message: 'Longitude must be between -180 and 180.' });
                }
                params.push(longitude);
                sets.push(`longitude = $${params.length}`);
            }
        }

        const activeColumn = getActiveColumnName(cityColumns);
        if (req.body?.active !== undefined && activeColumn) {
            const nextActive = toBooleanFlag(req.body.active, null);
            if (nextActive === null) {
                return res.status(422).json({ response: 422, status: false, message: 'active must be a boolean-like value.' });
            }
            params.push(normalizeBooleanForColumn(cityColumnMetadata, activeColumn, nextActive));
            sets.push(`${activeColumn} = $${params.length}`);
        }

        const hasDefaultCity = hasTableColumn(cityColumns, 'default_city');
        const hasDefaultCityValue = req.body?.default_city !== undefined && hasDefaultCity;
        let nextDefaultCity = null;
        if (hasDefaultCityValue) {
            nextDefaultCity = toBooleanFlag(req.body.default_city, null);
            if (nextDefaultCity === null) {
                return res.status(422).json({ response: 422, status: false, message: 'default_city must be a boolean-like value.' });
            }
            params.push(normalizeBooleanForColumn(cityColumnMetadata, 'default_city', nextDefaultCity));
            sets.push(`default_city = $${params.length}`);
        }

        if (req.body?.title !== undefined) {
            const title = String(req.body.title || '').trim();
            const duplicate = await pool.query(
                `SELECT id FROM cities WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1)) AND id <> $2${targetStateId ? ' AND state_id = $3' : ''} LIMIT 1`,
                targetStateId ? [title, cityId, targetStateId] : [title, cityId]
            );
            if (duplicate.rows.length) {
                return res.status(409).json({ response: 409, status: false, message: 'City title already exists.' });
            }
        }

        if (!sets.length) {
            return res.json({ response: 200, status: true, message: 'Nothing to update.' });
        }

        if (hasTableColumn(cityColumns, 'updated_at')) {
            sets.push('updated_at = NOW()');
        }

        params.push(cityId);
        await pool.query(`UPDATE cities SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

        if (hasDefaultCity && nextDefaultCity === true && targetStateId) {
            const resetDefaultValue = normalizeBooleanForColumn(cityColumnMetadata, 'default_city', false);
            await pool.query(
                `UPDATE cities
                 SET default_city = $1${hasTableColumn(cityColumns, 'updated_at') ? ', updated_at = NOW()' : ''}
                 WHERE state_id = $2 AND id <> $3`,
                [resetDefaultValue, targetStateId, cityId]
            );
        }

        res.json({ response: 200, status: true, message: 'City updated.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/delete_city', async (req, res) => {
    try {
        await ensureLocationSchema();

        const cityId = toNullablePositiveInt(req.body?.id);
        if (!cityId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const cityColumns = await getTableColumns('cities');
        const existing = await pool.query(`SELECT id FROM cities WHERE id = $1 LIMIT 1`, [cityId]);
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'City not found.' });
        }

        const clinicColumns = await getTableColumns('clinics');
        let clinicCount = 0;
        if (clinicColumns.size && hasTableColumn(clinicColumns, 'city_id')) {
            const clinicResult = await pool.query(`SELECT COUNT(*) AS total FROM clinics WHERE city_id = $1`, [cityId]);
            clinicCount = Number(clinicResult.rows[0]?.total || 0);
        }

        if (clinicCount > 0) {
            const activeColumn = getActiveColumnName(cityColumns);
            if (!activeColumn) {
                return res.status(409).json({ response: 409, status: false, message: 'City is linked to clinics and cannot be deleted.' });
            }

            await pool.query(
                `UPDATE cities SET ${activeColumn} = FALSE${hasTableColumn(cityColumns, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE id = $1`,
                [cityId]
            );
            return res.json({ response: 200, status: true, message: 'City archived because clinics are linked.' });
        }

        await pool.query(`DELETE FROM cities WHERE id = $1`, [cityId]);
        res.json({ response: 200, status: true, message: 'City deleted.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/patient/clinics', async (req, res) => {
    try {
        const result = await fetchClinicsForClient();
        res.json({ response: 200, status: true, data: result });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_clinic_page', async (req, res) => {
    try {
        const start = parseInt(req.query.start || 0, 10);
        const end = parseInt(req.query.end || 49, 10);
        const search = String(req.query.search || '').trim();
        const clinicId = req.query.clinic_id || null;
        const result = await fetchClinicRecords({ start, end, search, clinicId, activeOnly: false });
        res.json({ response: 200, status: true, data: result.rows, total_record: result.total });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_clinic', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) {
            const result = await fetchClinicRecords({ start: 0, end: 9999, activeOnly: false });
            return res.json({ response: 200, status: true, data: result.rows, total_record: result.total });
        }

        const result = await fetchClinicRecords({ singleId: id, activeOnly: false });
        if (!result) {
            return res.status(404).json({ response: 404, status: false, message: 'Clinic not found' });
        }
        res.json({ response: 200, status: true, data: result });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_clinic/:id', async (req, res) => {
    try {
        const result = await fetchClinicRecords({ singleId: req.params.id, activeOnly: false });
        if (!result) return res.status(404).json({ response: 404, status: false, message: 'Clinic not found' });
        res.json({ response: 200, status: true, data: result });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_clinic', clinicImageUpload.any(), async (req, res) => {
    const client = await pool.connect();
    const uploadedFile = getUploadedFile(req);
    const uploadedPath = toStorageRelativePath(uploadedFile);

    try {
        await ensureClinicSchema();
        await client.query('BEGIN');

        const { title, city_id } = req.body;
        const clinicEmail = String(req.body.email || '').trim().toLowerCase();
        const clinicAdminPassword = String(req.body.password || '');
        const clinicAdminFirstName = String(req.body.f_name || '').trim();
        const clinicAdminLastName = String(req.body.l_name || '').trim();
        if (!String(title || '').trim()) {
            throw Object.assign(new Error('Clinic title is required.'), { statusCode: 422 });
        }
        if (!toNullablePositiveInt(city_id)) {
            throw Object.assign(new Error('city_id is required.'), { statusCode: 422 });
        }

        const nextLatitude = req.body.latitude !== undefined && req.body.latitude !== '' ? Number(req.body.latitude) : undefined;
        const nextLongitude = req.body.longitude !== undefined && req.body.longitude !== '' ? Number(req.body.longitude) : undefined;
        if (nextLatitude !== undefined && (!Number.isFinite(nextLatitude) || nextLatitude < -90 || nextLatitude > 90)) {
            throw Object.assign(new Error('Latitude must be between -90 and 90.'), { statusCode: 422 });
        }
        if (nextLongitude !== undefined && (!Number.isFinite(nextLongitude) || nextLongitude < -180 || nextLongitude > 180)) {
            throw Object.assign(new Error('Longitude must be between -180 and 180.'), { statusCode: 422 });
        }

        const clinicColumns = await getTableColumns('clinics');
        const titleColumn = getFirstExistingColumn(clinicColumns, ['title', 'name']) || 'title';
        const nextClinicCodeRaw = req.body.clinic_code !== undefined ? String(req.body.clinic_code || '').trim().toUpperCase() : undefined;
        const nextClinicCode = nextClinicCodeRaw ? nextClinicCodeRaw : undefined;

        if (nextClinicCode !== undefined && !/^[A-Z]{3}$/.test(nextClinicCode)) {
            throw Object.assign(new Error('clinic_code must be exactly 3 capital letters.'), { statusCode: 422 });
        }

        const duplicate = await client.query(
            `SELECT id FROM clinics WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1)) LIMIT 1`,
            [String(title).trim()]
        );
        if (duplicate.rows.length) {
            throw Object.assign(new Error('Clinic title already exists.'), { statusCode: 409 });
        }

        if (nextClinicCode !== undefined && hasTableColumn(clinicColumns, 'clinic_code')) {
            const duplicateCode = await client.query(
                `SELECT id FROM clinics WHERE UPPER(TRIM(clinic_code)) = $1 LIMIT 1`,
                [nextClinicCode]
            );
            if (duplicateCode.rows.length) {
                throw Object.assign(new Error('Clinic code already exists.'), { statusCode: 409 });
            }
        }

        const imageColumn = getImageColumnName(clinicColumns);
        const insertColumns = [];
        const insertValues = [];
        const insertParams = [];
        const addInsertValue = (columnName, value) => {
            if (!hasTableColumn(clinicColumns, columnName)) {
                return;
            }
            insertColumns.push(columnName);
            insertParams.push(value);
            insertValues.push(`$${insertParams.length}`);
        };

        addInsertValue(titleColumn, String(title).trim());
        addInsertValue('clinic_code', nextClinicCode);
        addInsertValue('city_id', toNullablePositiveInt(city_id));
        addInsertValue('address', req.body.address !== undefined ? req.body.address : undefined);
        addInsertValue('description', req.body.description !== undefined ? req.body.description : undefined);
        addInsertValue('latitude', nextLatitude);
        addInsertValue('longitude', nextLongitude);
        if (clinicEmail) {
            addInsertValue('email', clinicEmail);
        }
        if (imageColumn && uploadedPath) {
            addInsertValue(imageColumn, uploadedPath);
        }
        if (hasTableColumn(clinicColumns, 'active')) {
            insertColumns.push('active');
            insertValues.push('TRUE');
        }
        if (hasTableColumn(clinicColumns, 'is_active')) {
            insertColumns.push('is_active');
            insertValues.push('TRUE');
        }
        if (hasTableColumn(clinicColumns, 'created_at')) {
            insertColumns.push('created_at');
            insertValues.push('NOW()');
        }
        if (hasTableColumn(clinicColumns, 'updated_at')) {
            insertColumns.push('updated_at');
            insertValues.push('NOW()');
        }

        const insertedClinic = await client.query(
            `INSERT INTO clinics (${insertColumns.join(', ')})
             VALUES (${insertValues.join(', ')})
             RETURNING id`,
            insertParams
        );

        const clinicId = insertedClinic.rows[0]?.id;
        let userId = null;
        if (clinicEmail && clinicAdminPassword) {
            userId = await createClinicAdminUser(client, {
                clinicId,
                email: clinicEmail,
                password: clinicAdminPassword,
                fName: clinicAdminFirstName,
                lName: clinicAdminLastName,
            });
        }

        if (userId && hasTableColumn(clinicColumns, 'user_id')) {
            await client.query(`UPDATE clinics SET user_id = $1 WHERE id = $2`, [userId, clinicId]);
        }

        await client.query('COMMIT');
        res.json({ response: 200, status: true, message: 'Clinic created.', id: clinicId, user_id: userId });
    } catch (err) {
        await client.query('ROLLBACK');
        if (uploadedPath) {
            await safeUnlinkStoragePath(uploadedPath);
        }
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ response: statusCode, status: false, message: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/v1/update_clinic', clinicImageUpload.any(), async (req, res) => {
    const uploadedFile = getUploadedFile(req);
    const uploadedPath = toStorageRelativePath(uploadedFile);

    try {
        await ensureClinicSchema();

        const clinicId = toNullablePositiveInt(req.body.id);
        if (!clinicId) {
            throw Object.assign(new Error('id is required.'), { statusCode: 422 });
        }

        const currentClinic = await fetchClinicRecords({ singleId: clinicId, activeOnly: false });
        if (!currentClinic) {
            throw Object.assign(new Error('Clinic not found.'), { statusCode: 404 });
        }

        const clinicColumns = await getTableColumns('clinics');
        const titleColumn = getFirstExistingColumn(clinicColumns, ['title', 'name']) || 'title';
        const nextClinicCodeRaw = req.body.clinic_code !== undefined ? String(req.body.clinic_code || '').trim().toUpperCase() : undefined;
        // Silently ignore clinic_code that doesn't match the 3-letter pattern so legacy codes
        // (e.g. "C003") stored in the DB don't block unrelated field updates on the clinic.
        const nextClinicCode = (nextClinicCodeRaw && /^[A-Z]{3}$/.test(nextClinicCodeRaw)) ? nextClinicCodeRaw : undefined;

        const imageColumn = getImageColumnName(clinicColumns);
        const userColumns = await getTableColumns('users');
        const userMetadata = await getTableColumnMetadata('users');
        const updates = [];
        const params = [];
        const addClinicUpdate = (columnName, value) => {
            if (!hasTableColumn(clinicColumns, columnName) || value === undefined) {
                return;
            }
            params.push(value);
            updates.push(`${columnName} = $${params.length}`);
        };

        const nextTitle = req.body.title !== undefined ? String(req.body.title || '').trim() : null;
        if (nextTitle !== null) {
            if (!nextTitle) {
                throw Object.assign(new Error('Clinic title is required.'), { statusCode: 422 });
            }
            const duplicate = await pool.query(
                `SELECT id FROM clinics WHERE LOWER(TRIM(${titleColumn})) = LOWER(TRIM($1)) AND id <> $2 LIMIT 1`,
                [nextTitle, clinicId]
            );
            if (duplicate.rows.length) {
                throw Object.assign(new Error('Clinic title already exists.'), { statusCode: 409 });
            }
            addClinicUpdate(titleColumn, nextTitle);
        }

        if (nextClinicCode !== undefined && hasTableColumn(clinicColumns, 'clinic_code')) {
            const duplicateCode = await pool.query(
                `SELECT id FROM clinics WHERE UPPER(TRIM(clinic_code)) = $1 AND id <> $2 LIMIT 1`,
                [nextClinicCode, clinicId]
            );
            if (duplicateCode.rows.length) {
                throw Object.assign(new Error('Clinic code already exists.'), { statusCode: 409 });
            }
            addClinicUpdate('clinic_code', nextClinicCode);
        }

        const nextLatitude = req.body.latitude !== undefined && req.body.latitude !== '' ? Number(req.body.latitude) : undefined;
        const nextLongitude = req.body.longitude !== undefined && req.body.longitude !== '' ? Number(req.body.longitude) : undefined;
        if (nextLatitude !== undefined && (!Number.isFinite(nextLatitude) || nextLatitude < -90 || nextLatitude > 90)) {
            throw Object.assign(new Error('Latitude must be between -90 and 90.'), { statusCode: 422 });
        }
        if (nextLongitude !== undefined && (!Number.isFinite(nextLongitude) || nextLongitude < -180 || nextLongitude > 180)) {
            throw Object.assign(new Error('Longitude must be between -180 and 180.'), { statusCode: 422 });
        }

        addClinicUpdate('city_id', req.body.city_id !== undefined ? toNullablePositiveInt(req.body.city_id) : undefined);
        addClinicUpdate('address', req.body.address !== undefined ? req.body.address : undefined);
        addClinicUpdate('description', req.body.description !== undefined ? req.body.description : undefined);
        addClinicUpdate('phone', req.body.phone !== undefined ? String(req.body.phone || '').trim() || null : undefined);
        addClinicUpdate('phone_second', req.body.phone_second !== undefined ? String(req.body.phone_second || '').trim() || null : undefined);
        addClinicUpdate('email', req.body.email !== undefined ? String(req.body.email || '').trim().toLowerCase() || null : undefined);
        addClinicUpdate('whatsapp', req.body.whatsapp !== undefined ? String(req.body.whatsapp || '').trim() || null : undefined);
        addClinicUpdate('opening_hours', req.body.opening_hours !== undefined ? req.body.opening_hours : undefined);
        addClinicUpdate('latitude', nextLatitude);
        addClinicUpdate('longitude', nextLongitude);
        addClinicUpdate('ambulance_btn_enable', req.body.ambulance_btn_enable !== undefined ? toBooleanFlag(req.body.ambulance_btn_enable, false) : undefined);
        addClinicUpdate('ambulance_number', req.body.ambulance_number !== undefined ? String(req.body.ambulance_number || '').trim() || null : undefined);
        addClinicUpdate('stop_booking', req.body.stop_booking !== undefined ? toBooleanFlag(req.body.stop_booking, false) : undefined);
        addClinicUpdate('coupon_enable', req.body.coupon_enable !== undefined ? toBooleanFlag(req.body.coupon_enable, false) : undefined);
        addClinicUpdate('tax', req.body.tax !== undefined && req.body.tax !== '' ? Number(req.body.tax) : req.body.tax !== undefined ? null : undefined);
        addClinicUpdate('active', req.body.active !== undefined ? toBooleanFlag(req.body.active, true) : undefined);
        addClinicUpdate('is_active', req.body.active !== undefined ? toBooleanFlag(req.body.active, true) : undefined);
        if (imageColumn && uploadedPath) {
            addClinicUpdate(imageColumn, uploadedPath);
        }
        if (hasTableColumn(clinicColumns, 'updated_at')) {
            updates.push('updated_at = NOW()');
        }

        if (updates.length) {
            params.push(clinicId);
            await pool.query(`UPDATE clinics SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
        }

        if (currentClinic.user_id && userColumns.size) {
            const userUpdates = [];
            const userParams = [];
            const addUserUpdate = (columnName, value) => {
                if (!hasTableColumn(userColumns, columnName) || !hasWritableTableColumn(userMetadata, columnName) || value === undefined) {
                    return;
                }
                userParams.push(value);
                userUpdates.push(`${columnName} = $${userParams.length}`);
            };

            if (!hasTableColumn(clinicColumns, 'email') && req.body.email !== undefined) {
                addUserUpdate('email', String(req.body.email || '').trim().toLowerCase() || null);
            }
            if (!hasTableColumn(clinicColumns, 'phone') && req.body.phone !== undefined) {
                addUserUpdate('phone', String(req.body.phone || '').trim() || null);
            }
            if (hasTableColumn(userColumns, 'updated_at')) {
                userUpdates.push('updated_at = NOW()');
            }

            if (userUpdates.length) {
                userParams.push(currentClinic.user_id);
                await pool.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${userParams.length}`, userParams);
            }
        }

        if (uploadedPath && currentClinic.image && currentClinic.image !== uploadedPath) {
            await safeUnlinkStoragePath(currentClinic.image);
        }

        const refreshedClinic = await fetchClinicRecords({ singleId: clinicId, activeOnly: false });
        res.json({ response: 200, status: true, message: 'Clinic updated.', data: refreshedClinic });
    } catch (err) {
        if (uploadedPath) {
            await safeUnlinkStoragePath(uploadedPath);
        }
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ response: statusCode, status: false, message: err.message });
    }
});

app.post('/api/v1/remove_clinic_image', async (req, res) => {
    try {
        await ensureClinicSchema();

        const clinicId = toNullablePositiveInt(req.body.id || req.body.clinic_id);
        if (!clinicId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const clinicColumns = await getTableColumns('clinics');
        const imageColumn = getImageColumnName(clinicColumns);
        const currentClinic = await fetchClinicRecords({ singleId: clinicId, activeOnly: false });

        if (!currentClinic) {
            return res.status(404).json({ response: 404, status: false, message: 'Clinic not found.' });
        }

        if (!imageColumn) {
            return res.json({ response: 200, status: true, message: 'Clinic image removed.' });
        }

        await pool.query(
            `UPDATE clinics SET ${imageColumn} = NULL${hasTableColumn(clinicColumns, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE id = $1`,
            [clinicId]
        );

        await safeUnlinkStoragePath(currentClinic.image);
        res.json({ response: 200, status: true, message: 'Clinic image removed.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.get('/api/v1/get_clinic_images', async (req, res) => {
    try {
        await ensureClinicSchema();
        const clinicId = toNullablePositiveInt(req.query.clinic_id);
        if (!clinicId) {
            return res.status(422).json({ response: 422, status: false, message: 'clinic_id is required.' });
        }

        const result = await pool.query(
            `SELECT id, clinic_id, image, created_at, updated_at
             FROM clinic_images
             WHERE clinic_id = $1
             ORDER BY created_at DESC, id DESC`,
            [clinicId]
        );
        res.json({ response: 200, status: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/add_clinic_image', clinicGalleryUpload.any(), async (req, res) => {
    const uploadedFile = getUploadedFile(req);
    const uploadedPath = toStorageRelativePath(uploadedFile);

    try {
        await ensureClinicSchema();

        const clinicId = toNullablePositiveInt(req.body.clinic_id);
        if (!clinicId) {
            throw Object.assign(new Error('clinic_id is required.'), { statusCode: 422 });
        }
        if (!uploadedPath) {
            throw Object.assign(new Error('image is required.'), { statusCode: 422 });
        }

        const clinic = await fetchClinicRecords({ singleId: clinicId, activeOnly: false });
        if (!clinic) {
            throw Object.assign(new Error('Clinic not found.'), { statusCode: 404 });
        }

        const inserted = await pool.query(
            `INSERT INTO clinic_images (clinic_id, image, created_at, updated_at)
             VALUES ($1, $2, NOW(), NOW())
             RETURNING id, clinic_id, image, created_at, updated_at`,
            [clinicId, uploadedPath]
        );
        res.json({ response: 200, status: true, message: 'Clinic image uploaded.', data: inserted.rows[0] });
    } catch (err) {
        if (uploadedPath) {
            await safeUnlinkStoragePath(uploadedPath);
        }
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ response: statusCode, status: false, message: err.message });
    }
});

app.post('/api/v1/delete_clinic_image', async (req, res) => {
    try {
        await ensureClinicSchema();

        const imageId = toNullablePositiveInt(req.body.id);
        if (!imageId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const imageResult = await pool.query(`SELECT id, image FROM clinic_images WHERE id = $1 LIMIT 1`, [imageId]);
        if (!imageResult.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Clinic image not found.' });
        }

        await pool.query(`DELETE FROM clinic_images WHERE id = $1`, [imageId]);
        await safeUnlinkStoragePath(imageResult.rows[0].image);
        res.json({ response: 200, status: true, message: 'Clinic image deleted.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

app.post('/api/v1/delete_clinic', async (req, res) => {
    const client = await pool.connect();
    let inTransaction = false;

    try {
        await ensureClinicSchema();

        const clinicId = toNullablePositiveInt(req.body.id);
        if (!clinicId) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required.' });
        }

        const clinic = await fetchClinicRecords({ singleId: clinicId, activeOnly: false });
        if (!clinic) {
            return res.status(404).json({ response: 404, status: false, message: 'Clinic not found.' });
        }

        await client.query('BEGIN');
        inTransaction = true;
        const dependencies = await getClinicDependentCounts(client, clinicId);
        const hasDependencies = Object.values(dependencies).some((count) => count > 0);

        if (hasDependencies) {
            const clinicColumns = await getTableColumns('clinics');
            const activeColumn = getActiveColumnName(clinicColumns) || 'active';
            await client.query(
                `UPDATE clinics SET ${activeColumn} = FALSE${hasTableColumn(clinicColumns, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE id = $1`,
                [clinicId]
            );

            const userColumns = await getTableColumns('users');
            const userActiveColumn = getActiveColumnName(userColumns);
            if (userColumns.size && hasTableColumn(userColumns, 'clinic_id') && userActiveColumn) {
                await client.query(
                    `UPDATE users SET ${userActiveColumn} = FALSE${hasTableColumn(userColumns, 'updated_at') ? ', updated_at = NOW()' : ''} WHERE clinic_id = $1`,
                    [clinicId]
                );
            }

            await client.query('COMMIT');
            inTransaction = false;
            return res.json({
                response: 200,
                status: true,
                message: 'Clinic archived because linked records still exist.',
                archived: true,
                dependencies,
            });
        }

        const galleryImages = await client.query(`SELECT image FROM clinic_images WHERE clinic_id = $1`, [clinicId]);
        await client.query(`DELETE FROM clinic_images WHERE clinic_id = $1`, [clinicId]);
        await client.query(`DELETE FROM clinics WHERE id = $1`, [clinicId]);
        await client.query('COMMIT');
        inTransaction = false;

        for (const row of galleryImages.rows) {
            await safeUnlinkStoragePath(row.image);
        }
        await safeUnlinkStoragePath(clinic.image);

        res.json({ response: 200, status: true, message: 'Clinic deleted.' });
    } catch (err) {
        if (inTransaction) {
            await client.query('ROLLBACK');
        }
        res.status(500).json({ response: 500, status: false, message: err.message });
    } finally {
        client.release();
    }
});

// ===========================================================================
// PATIENT FILES (compatibility endpoints used by mobile app)
// ===========================================================================

app.post('/api/v1/add_file_by_patient', patientFilesUpload.any(), async (req, res) => {
    const client = await pool.connect();
    try {
        await ensurePatientFilesTable();
        await client.query('BEGIN');

        const identity = normalizePatientWalletIdentity(req.body || {});
        const resolvedPatientCode = String(
            req.body.patient_code || identity.lookupPatientCode || ''
        ).trim();
        const resolvedClinicId = String(req.body.clinic_id || '').trim();
        const resolvedUserId = String(req.body.user_id || req.body.from_user_id || '').trim();
        const files = Array.isArray(req.files) ? req.files : [];

        if (!resolvedPatientCode) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'patient_code or owner_id is required' });
        }
        if (!files.length) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'At least one file is required' });
        }

        const patient = await fetchPatientPublicByIdentifier(resolvedPatientCode);
        const patientFilesColumns = await getTableColumns('patient_files');
        const uploadedRows = [];

        for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            const customName = String((req.body || {})[`file_names[${i}]`] || '').trim();
            const fallbackName = String(file.originalname || file.filename || `file_${i + 1}`).trim();
            const fileName = customName || fallbackName;
            const relativeFile = `patient-files/${file.filename}`;

            const insertColumns = [];
            const insertValues = [];
            const insertParams = [];
            const addInsertValue = (columnName, value) => {
                if (!hasTableColumn(patientFilesColumns, columnName)) {
                    return;
                }
                insertColumns.push(columnName);
                insertParams.push(value);
                insertValues.push(`$${insertParams.length}`);
            };

            addInsertValue('patient_id', patient && Number.isFinite(Number(patient.id)) ? Number(patient.id) : null);
            addInsertValue('patient_code', resolvedPatientCode);
            addInsertValue('owner_id', resolvedPatientCode);
            addInsertValue('owner_type', 'patient');
            addInsertValue('user_id', resolvedUserId || null);
            addInsertValue('clinic_id', Number.isFinite(Number(resolvedClinicId)) ? Number(resolvedClinicId) : null);
            addInsertValue('file_name', fileName);
            addInsertValue('file', relativeFile);

            if (hasTableColumn(patientFilesColumns, 'created_at')) {
                insertColumns.push('created_at');
                insertValues.push('NOW()');
            }
            if (hasTableColumn(patientFilesColumns, 'updated_at')) {
                insertColumns.push('updated_at');
                insertValues.push('NOW()');
            }

            const insertRes = await client.query(
                `INSERT INTO patient_files (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING id, patient_id, patient_code, file_name, file, created_at`,
                insertParams
            );
            const row = insertRes.rows[0] || {};
            uploadedRows.push({
                ...row,
                f_name: patient ? patient.f_name : null,
                l_name: patient ? patient.l_name : null,
            });
        }

        await client.query('COMMIT');
        res.status(201).json({
            response: 200,
            status: true,
            message: 'Files uploaded successfully',
            data: uploadedRows,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ response: 500, status: false, message: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/v1/get_patient_file', async (req, res) => {
    try {
        await ensurePatientFilesTable();
        const source = {
            ...(req.body || {}),
            ...(req.query || {}),
        };

        // Reject legacy numeric patient_id — only patient_code is accepted externally
        if (source.patient_id && !source.patient_code) {
            return res.status(201).json({ response: 201, status: false, message: 'patient_id is not accepted; use patient_code' });
        }

        const identity = normalizePatientWalletIdentity(source);
        // Use source.patient_code explicitly; do NOT fall through to identity.lookupPatientCode
        // to avoid patient_id being misinterpreted as a patient_code lookup.
        const resolvedPatientCode = String(source.patient_code || '').trim();
        const resolvedUserId = String(source.user_id || identity.userId || '').trim();
        const search = String(source.search || '').trim();

        const patientFilesColumns = await getTableColumns('patient_files');
        const params = [];
        const conditions = [];

        if (resolvedPatientCode) {
            // patient_files table uses patient_id FK, not patient_code.
            // Resolve patient_code -> patient.id via subquery.
            params.push(resolvedPatientCode);
            conditions.push(`pf.patient_id = (SELECT id FROM patients WHERE patient_code = $${params.length} LIMIT 1)`);
        }
        if (resolvedUserId && hasTableColumn(patientFilesColumns, 'user_id')) {
            params.push(resolvedUserId);
            conditions.push(`pf.user_id = $${params.length}`);
        }
        if (search) {
            params.push(`%${search}%`);
            conditions.push(`COALESCE(pf.file_name, '') ILIKE $${params.length}`);
        }

        if (!conditions.length) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code, owner_id, or user_id is required' });
        }

        const fileSelect = hasTableColumn(patientFilesColumns, 'file')
            ? 'pf.file AS file'
            : hasTableColumn(patientFilesColumns, 'file_path')
                ? 'pf.file_path AS file'
                : 'NULL AS file';

        const result = await pool.query(
            `SELECT
                pf.id,
                ${optionalColumn('pf.', patientFilesColumns, 'patient_id')},
                ${optionalColumn('pf.', patientFilesColumns, 'patient_code')},
                ${optionalColumn('pf.', patientFilesColumns, 'owner_id')},
                ${optionalColumn('pf.', patientFilesColumns, 'owner_type')},
                ${optionalColumn('pf.', patientFilesColumns, 'file_name')},
                ${fileSelect},
                ${optionalColumn('pf.', patientFilesColumns, 'created_at')},
                p.patient_code,
                p.f_name,
                p.l_name
             FROM patient_files pf
             LEFT JOIN patients p ON p.id = pf.patient_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY pf.created_at DESC, pf.id DESC`,
            params
        );

        res.json({ response: 200, status: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// WALLET: balance transfer (patient-to-patient by phone)
// ===========================================================================

app.post('/api/v1/balance_transfer', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const identity = normalizePatientWalletIdentity(req.body || {});
        const fromPatientCode = String(
            req.body.from_patient_code || req.body.patient_code || identity.lookupPatientCode || ''
        ).trim();
        const toPhone = String(req.body.to_phone || '').trim();
        const description = String(req.body.description || 'Wallet balance transfer').trim();
        const amountRaw = req.body.amount;
        const amount = Number(amountRaw);
        const txRef = String(req.body.transaction_reference || req.body.payment_transaction_id || '').trim();

        if (!fromPatientCode || !toPhone || !Number.isFinite(amount) || amount <= 0) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'from_patient_code, to_phone and positive amount are required' });
        }

        if (txRef) {
            const existing = await client.query(
                `SELECT id FROM transactions WHERE patient_code = $1 AND reference = $2 AND type = 'debit' LIMIT 1`,
                [fromPatientCode, txRef]
            );
            if (existing.rows.length) {
                const fromWalletReplay = await findPatientWallet(client, fromPatientCode);
                return res.json({
                    response: 200,
                    status: true,
                    message: 'Balance transfer processed (idempotent replay).',
                    idempotent_replay: true,
                    data: {
                        from_patient_code: fromPatientCode,
                        from_wallet_balance: fromWalletReplay ? Number(fromWalletReplay.balance || 0) : 0,
                    },
                });
            }
        }

        const recipient = await fetchPatientByPhone(toPhone);
        if (!recipient || !recipient.patient_code) {
            await client.query('ROLLBACK');
            return res.status(404).json({ response: 404, status: false, message: 'Recipient patient not found' });
        }
        if (String(recipient.patient_code).trim() === fromPatientCode) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'Cannot transfer to the same wallet' });
        }

        await ensurePatientWallet(client, fromPatientCode);
        await ensurePatientWallet(client, recipient.patient_code);

        const senderWallet = await findPatientWallet(client, fromPatientCode, { forUpdate: true });
        const recipientWallet = await findPatientWallet(client, recipient.patient_code, { forUpdate: true });

        if (!senderWallet || !recipientWallet) {
            await client.query('ROLLBACK');
            return res.status(500).json({ response: 500, status: false, message: 'Unable to resolve wallets for transfer' });
        }
        if (toMoney(senderWallet.balance, 0) < amount) {
            await client.query('ROLLBACK');
            return res.status(422).json({ response: 422, status: false, message: 'Insufficient wallet balance.' });
        }

        await client.query(`UPDATE wallets SET balance = COALESCE(balance, 0) - $1, updated_at=NOW() WHERE id=$2`, [amount, senderWallet.id]);
        await client.query(`UPDATE wallets SET balance = COALESCE(balance, 0) + $1, updated_at=NOW() WHERE id=$2`, [amount, recipientWallet.id]);

        await insertWalletTransaction(client, {
            walletId: senderWallet.id,
            patientCode: fromPatientCode,
            amount,
            type: 'debit',
            description: `Transfer to ${recipient.phone || toPhone}${txRef ? ` [${txRef}]` : ''}: ${description}`,
        });
        await insertWalletTransaction(client, {
            walletId: recipientWallet.id,
            patientCode: recipient.patient_code,
            amount,
            type: 'credit',
            description: `Transfer from ${fromPatientCode}${txRef ? ` [${txRef}]` : ''}: ${description}`,
        });

        await client.query(
            `INSERT INTO transactions (transaction_id, patient_code, amount, type, status, description, reference)
             VALUES (CONCAT('TXN-', EXTRACT(YEAR FROM NOW()), '-', LPAD(NEXTVAL('seq_transaction_number')::TEXT, 6, '0')),$1,$2,'debit','success',$3,$4)`,
            [fromPatientCode, amount, `Balance transfer to ${recipient.patient_code}`, txRef || null]
        );
        await client.query(
            `INSERT INTO transactions (transaction_id, patient_code, amount, type, status, description, reference)
             VALUES (CONCAT('TXN-', EXTRACT(YEAR FROM NOW()), '-', LPAD(NEXTVAL('seq_transaction_number')::TEXT, 6, '0')),$1,$2,'credit','success',$3,$4)`,
            [recipient.patient_code, amount, `Balance transfer from ${fromPatientCode}`, txRef || null]
        );

        const senderUpdated = await findPatientWallet(client, fromPatientCode);
        const recipientUpdated = await findPatientWallet(client, recipient.patient_code);

        await client.query('COMMIT');
        res.json({
            response: 200,
            status: true,
            message: 'Balance transferred successfully',
            idempotent_replay: false,
            data: {
                from_patient_code: fromPatientCode,
                to_patient_code: recipient.patient_code,
                transferred_amount: amount,
                from_wallet_balance: senderUpdated ? Number(senderUpdated.balance || 0) : 0,
                to_wallet_balance: recipientUpdated ? Number(recipientUpdated.balance || 0) : amount,
            },
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ response: 500, status: false, message: err.message });
    } finally {
        client.release();
    }
});

// ===========================================================================
// LEGACY OTP ENDPOINTS (forward to patient OTP for compatibility)
// ===========================================================================

app.post('/api/v1/otp/send', async (req, res) => {
    // Normalise legacy request shape to new patient OTP format
    req.body.phone = req.body.phone_number || req.body.phone;
    return app._router.handle(
        Object.assign(req, { url: '/api/v1/patient/send-otp', path: '/api/v1/patient/send-otp', method: 'POST' }),
        res,
        () => res.status(404).json({ response: 404, status: false, message: 'Not found' })
    );
});

app.post('/api/v1/otp/verify', async (req, res) => {
    req.body.phone = req.body.phone || req.body.phone_number;
    req.body.otp   = req.body.code  || req.body.otp;
    return app._router.handle(
        Object.assign(req, { url: '/api/v1/patient/verify-otp', path: '/api/v1/patient/verify-otp', method: 'POST' }),
        res,
        () => res.status(404).json({ response: 404, status: false, message: 'Not found' })
    );
});

app.post('/api/v1/otp/cancel', async (req, res) => {
    const requestId = req.body.request_id;
    if (requestId) {
        try {
            await pool.query(`UPDATE patient_otp_codes SET verified=TRUE WHERE request_id=$1`, [requestId]);
        } catch (_error) {
            // Best-effort cancel route: ignore persistence errors and still return success.
        }
    }
    res.json({ response: 200, status: true, message: 'OTP cancelled.' });
});

// ===========================================================================
// PATIENT PASSWORD CHANGE
// ===========================================================================

app.post('/api/v1/patient_change_password', async (req, res) => {
    try {
        const { user_id, old_password, new_password } = req.body;
        if (!user_id || !old_password || !new_password) {
            return res.status(422).json({ response: 422, status: false, message: 'user_id, old_password and new_password are required' });
        }
        const result = await pool.query(`SELECT id, password FROM patients WHERE id=$1 LIMIT 1`, [user_id]);
        if (!result.rows.length) return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        if (!verifyPassword(old_password, result.rows[0].password)) {
            return res.status(401).json({ response: 401, status: false, message: 'Old password is incorrect' });
        }
        await pool.query(`UPDATE patients SET password=$1, updated_at=NOW() WHERE id=$2`, [hashPassword(new_password), user_id]);
        res.json({ response: 200, status: true, message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// PATIENT VITALS
// ===========================================================================

/**
 * GET /api/v1/get_vitals_family_member_id_type
 * Query params: family_member_id, patient_code (optional), user_id (optional), type, start_date, end_date
 * If patient_code is provided, validates that family_member belongs to that patient's user
 */
app.get('/api/v1/get_vitals_family_member_id_type', async (req, res) => {
    try {
        const source = { ...req.query, ...req.body };
        const requestedFamilyMemberId = toNullablePositiveInt(source.family_member_id);
        const requiredPatientCode = String(source.patient_code || '').trim();
        const type = String(source.type || '').trim();
        const startDate = String(source.start_date || '').trim();
        const endDate = String(source.end_date || '').trim();

        if (!requiredPatientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const patientContext = await resolvePatientContextFromSource({ patient_code: requiredPatientCode });
        if (!patientContext.patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        let familyMemberId = requestedFamilyMemberId;
        if (!familyMemberId && patientContext.patient) {
            familyMemberId = await ensureSelfFamilyMemberForPatient(patientContext);
        }

        if (!familyMemberId) {
            return res.status(422).json({ response: 422, status: false, message: 'family_member_id is required' });
        }

        const familyMember = await getFamilyMemberById(familyMemberId);
        if (!familyMember) {
            return res.status(404).json({ response: 404, status: false, message: 'Family member not found' });
        }
        if (String(familyMember.patient_code || '').trim() !== requiredPatientCode) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: family member does not belong to this patient' });
        }

        const params = [familyMemberId, requiredPatientCode];
        const conditions = ['family_member_id = $1', 'patient_code = $2'];

        if (type) {
            params.push(type);
            conditions.push(`type = $${params.length}`);
        }
        if (startDate) {
            params.push(startDate);
            conditions.push(`date >= $${params.length}`);
        }
        if (endDate) {
            params.push(endDate);
            conditions.push(`date <= $${params.length}`);
        }

        const result = await pool.query(
            `SELECT id, user_id, family_member_id, bp_systolic, bp_diastolic, weight, spo2,
                    temperature, sugar_random, sugar_fasting, type, date, time, created_at, updated_at
             FROM vitals_measurements
             WHERE ${conditions.join(' AND ')}
             ORDER BY date DESC, time DESC, id DESC`,
            params
        );

        res.json({ response: 200, status: true, data: result.rows });
    } catch (err) {
        console.error('[ERROR] get_vitals_family_member_id_type:', err.message, err.stack);
        res.status(500).json({ response: 500, status: false, message: `Error retrieving vitals: ${err.message}` });
    }
});

/**
 * POST /api/v1/add_vitals
 * Body: user_id, family_member_id, type, bp_systolic, bp_diastolic, weight, spo2,
 *       temperature, sugar_random, sugar_fasting, date, time
 */
app.post('/api/v1/add_vitals', async (req, res) => {
    try {
        const body = req.body || {};
        const requiredPatientCode = String(body.patient_code || '').trim();
        if (!requiredPatientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const patientContext = await resolvePatientContextFromSource({ patient_code: requiredPatientCode });
        if (!patientContext.patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        let familyMemberId = toNullablePositiveInt(body.family_member_id);
        const type = String(body.type || '').trim() || null;

        if (!familyMemberId && patientContext.patient) {
            familyMemberId = await ensureSelfFamilyMemberForPatient(patientContext);
        }

        if (!familyMemberId) {
            return res.status(422).json({ response: 422, status: false, message: 'family_member_id is required' });
        }

        const familyMember = await getFamilyMemberById(familyMemberId);
        if (!familyMember) {
            return res.status(404).json({ response: 404, status: false, message: 'Family member not found' });
        }

        const userId = toNullablePositiveInt(familyMember.user_id) || patientContext.effectiveUserId;
        if (!userId) {
            return res.status(422).json({ response: 422, status: false, message: 'user_id is required' });
        }

        if (String(familyMember.patient_code || '').trim() !== requiredPatientCode) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: family member does not belong to this patient' });
        }

        const toNullableFloat = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        const toNullableDate = (v) => {
            const s = String(v || '').trim();
            return s || null;
        };

        const result = await pool.query(
            `INSERT INTO vitals_measurements
                (user_id, family_member_id, patient_code, type, bp_systolic, bp_diastolic, weight, spo2,
                 temperature, sugar_random, sugar_fasting, date, time, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
             RETURNING *`,
            [
                userId,
                familyMemberId,
                requiredPatientCode,
                type,
                toNullableFloat(body.bp_systolic),
                toNullableFloat(body.bp_diastolic),
                toNullableFloat(body.weight),
                toNullableFloat(body.spo2),
                toNullableFloat(body.temperature),
                toNullableFloat(body.sugar_random),
                toNullableFloat(body.sugar_fasting),
                toNullableDate(body.date),
                toNullableDate(body.time),
            ]
        );

        res.json({ response: 200, status: true, message: 'Vitals added successfully.', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

/**
 * POST /api/v1/update_vitals
 * Body: id, user_id, family_member_id, type, bp_systolic, bp_diastolic, weight, spo2,
 *       temperature, sugar_random, sugar_fasting, date, time
 */
app.post('/api/v1/update_vitals', async (req, res) => {
    try {
        const body = req.body || {};
        const id = toNullablePositiveInt(body.id);
        const requiredPatientCode = String(body.patient_code || '').trim();
        if (!requiredPatientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const patientContext = await resolvePatientContextFromSource({ patient_code: requiredPatientCode });
        if (!patientContext.patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }

        if (!id) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        }

        const existing = await pool.query(
            `SELECT id, family_member_id, patient_code FROM vitals_measurements WHERE id = $1 LIMIT 1`,
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Vitals record not found' });
        }
        if (String(existing.rows[0].patient_code || '').trim() !== requiredPatientCode) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient_code mismatch' });
        }

        let requestedFamilyMemberId = body.family_member_id !== undefined ? toNullablePositiveInt(body.family_member_id) : undefined;
        if (requestedFamilyMemberId === undefined) {
            requestedFamilyMemberId = toNullablePositiveInt(existing.rows[0].family_member_id);
        }
        if (!requestedFamilyMemberId && patientContext.patient) {
            requestedFamilyMemberId = await ensureSelfFamilyMemberForPatient(patientContext);
        }
        if (!requestedFamilyMemberId) {
            return res.status(422).json({ response: 422, status: false, message: 'family_member_id is required' });
        }

        const familyMember = await getFamilyMemberById(requestedFamilyMemberId);
        if (!familyMember) {
            return res.status(404).json({ response: 404, status: false, message: 'Family member not found' });
        }

        if (String(familyMember.patient_code || '').trim() !== requiredPatientCode) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: family member does not belong to this patient' });
        }

        const toNullableFloat = (v) => {
            if (v === undefined) return undefined;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };

        const updates = [];
        const params = [];

        const addUpdate = (col, value) => {
            if (value === undefined) return;
            params.push(value);
            updates.push(`${col} = $${params.length}`);
        };

        addUpdate('family_member_id', requestedFamilyMemberId);
        const resolvedUserId = toNullablePositiveInt(familyMember.user_id) || patientContext.effectiveUserId;
        if (resolvedUserId !== null && resolvedUserId !== undefined) addUpdate('user_id', resolvedUserId);
        addUpdate('patient_code', requiredPatientCode);
        if (body.type !== undefined) addUpdate('type', String(body.type || '').trim() || null);
        if (body.bp_systolic !== undefined) addUpdate('bp_systolic', toNullableFloat(body.bp_systolic));
        if (body.bp_diastolic !== undefined) addUpdate('bp_diastolic', toNullableFloat(body.bp_diastolic));
        if (body.weight !== undefined) addUpdate('weight', toNullableFloat(body.weight));
        if (body.spo2 !== undefined) addUpdate('spo2', toNullableFloat(body.spo2));
        if (body.temperature !== undefined) addUpdate('temperature', toNullableFloat(body.temperature));
        if (body.sugar_random !== undefined) addUpdate('sugar_random', toNullableFloat(body.sugar_random));
        if (body.sugar_fasting !== undefined) addUpdate('sugar_fasting', toNullableFloat(body.sugar_fasting));
        if (body.date !== undefined) addUpdate('date', String(body.date || '').trim() || null);
        if (body.time !== undefined) addUpdate('time', String(body.time || '').trim() || null);

        if (!updates.length) {
            return res.status(422).json({ response: 422, status: false, message: 'No fields to update' });
        }

        updates.push('updated_at = NOW()');
        params.push(id);

        const result = await pool.query(
            `UPDATE vitals_measurements SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
            params
        );

        res.json({ response: 200, status: true, message: 'Vitals updated successfully.', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

/**
 * POST /api/v1/delete_vitals
 * Body: id
 */
app.post('/api/v1/delete_vitals', async (req, res) => {
    try {
        const body = req.body || {};
        const id = toNullablePositiveInt((req.body || {}).id);
        const requiredPatientCode = String(body.patient_code || '').trim();
        if (!requiredPatientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const patientContext = await resolvePatientContextFromSource({ patient_code: requiredPatientCode });
        if (!patientContext.patient) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }
        if (!id) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        }

        const existing = await pool.query(
            `SELECT id, family_member_id, patient_code FROM vitals_measurements WHERE id = $1 LIMIT 1`,
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Vitals record not found' });
        }
        if (String(existing.rows[0].patient_code || '').trim() !== requiredPatientCode) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: patient_code mismatch' });
        }

        const familyMember = await getFamilyMemberById(toNullablePositiveInt(existing.rows[0].family_member_id));
        if (!familyMember) {
            return res.status(404).json({ response: 404, status: false, message: 'Family member not found' });
        }
        if (String(familyMember.patient_code || '').trim() !== requiredPatientCode) {
            return res.status(403).json({ response: 403, status: false, message: 'Access denied: family member does not belong to this patient' });
        }

        await pool.query(`DELETE FROM vitals_measurements WHERE id = $1 AND patient_code = $2`, [id, requiredPatientCode]);
        res.json({ response: 200, status: true, message: 'Vitals deleted successfully.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// FAMILY MEMBERS
// ===========================================================================

/**
 * GET /api/v1/get_family_members/user/:user_id
 */
app.get('/api/v1/get_family_members/user/:user_id', async (req, res) => {
    try {
        const userId = toNullablePositiveInt(req.params.user_id);
        if (!userId) {
            return res.status(422).json({ response: 422, status: false, message: 'user_id is required' });
        }

        const result = await pool.query(
            `SELECT id, user_id, f_name, l_name, isd_code, phone, gender, dob, created_at, updated_at
             FROM family_members
             WHERE user_id = $1
             ORDER BY created_at ASC, id ASC`,
            [userId]
        );

        res.json({ response: 200, status: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

/**
 * GET /api/v1/get_family_members/patient/:patient_code
 * Returns all family members linked to the user associated with this patient.
 * patient_code is the primary external identifier — never patient_id.
 * Includes user_f_name, user_l_name, user_phone for admin table display.
 */
app.get('/api/v1/get_family_members/patient/:patient_code', async (req, res) => {
    try {
        const patientCode = String(req.params.patient_code || '').trim();
        if (!patientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const patientContext = await resolvePatientContextFromSource({ patient_code: patientCode });
        if (!patientContext.patient) {
            return res.json({ response: 200, status: true, data: [] });
        }

        await ensureSelfFamilyMemberForPatient(patientContext);
        await ensureFamilyMembersPatientCodeSchema();

        const params = [patientCode, patientContext.effectiveUserId || null];
        const whereClause = patientContext.effectiveUserId
            ? 'fm.patient_code = $1 AND fm.user_id = $2'
            : 'fm.patient_code = $1';

        const result = await pool.query(
            `SELECT fm.id, fm.user_id, fm.patient_code, fm.f_name, fm.l_name, fm.isd_code, fm.phone, fm.gender, fm.dob, fm.created_at, fm.updated_at,
                    u.f_name AS user_f_name, u.l_name AS user_l_name, u.phone AS user_phone
             FROM family_members fm
             LEFT JOIN users u ON u.id = fm.user_id
             WHERE ${whereClause}
             ORDER BY fm.created_at ASC, fm.id ASC`,
            patientContext.effectiveUserId ? params : [patientCode]
        );

        res.json({ response: 200, status: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

/**
 * GET /api/v1/get_family_members/:id
 * Returns a single family member by id.
 */
app.get('/api/v1/get_family_members/:id', async (req, res) => {
    try {
        const id = toNullablePositiveInt(req.params.id);
        if (!id) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        }

        const result = await pool.query(
            `SELECT id, user_id, f_name, l_name, isd_code, phone, gender, dob, created_at, updated_at
             FROM family_members WHERE id = $1 LIMIT 1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Family member not found' });
        }

        res.json({ response: 200, status: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

/**
 * POST /api/v1/add_family_member
 * Body: user_id (or patient_code/owner_id for mobile), f_name, l_name, phone, gender, isd_code, dob
 */
app.post('/api/v1/add_family_member', async (req, res) => {
    try {
        const body = req.body || {};
        const patientCode = String(body.patient_code || '').trim();
        if (!patientCode) {
            return res.status(422).json({ response: 422, status: false, message: 'patient_code is required' });
        }

        const p = await pool.query(`SELECT id, user_id, patient_code FROM patients WHERE patient_code = $1 LIMIT 1`, [patientCode]);
        if (!p.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Patient not found' });
        }
        const userId = toNullablePositiveInt(p.rows[0].user_id) || toNullablePositiveInt(p.rows[0].id);
        if (!userId) {
            return res.status(422).json({ response: 422, status: false, message: 'Unable to resolve user_id from patient_code' });
        }

        const fName = String(body.f_name || '').trim();
        const lName = String(body.l_name || '').trim();
        const phone = String(body.phone || '').trim();
        const isdCode = String(body.isd_code || '').trim();
        const gender = String(body.gender || '').trim() || null;
        const dob = String(body.dob || '').trim() || null;

        if (!fName || !lName) {
            return res.status(422).json({ response: 422, status: false, message: 'f_name and l_name are required' });
        }

        await ensureFamilyMembersPatientCodeSchema();
        const insertColumns = ['user_id', 'f_name', 'l_name', 'isd_code', 'phone', 'gender', 'dob', 'created_at', 'updated_at'];
        const insertValues = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', 'NOW()', 'NOW()'];
        const insertParams = [userId, fName, lName, isdCode, phone, gender, dob];

        insertColumns.push('patient_code');
        insertParams.push(patientCode);
        insertValues.push(`$${insertParams.length}`);

        const result = await pool.query(
            `INSERT INTO family_members (${insertColumns.join(', ')})
             VALUES (${insertValues.join(', ')})
             RETURNING *`,
            insertParams
        );

        res.json({ response: 200, status: true, message: 'Family member added successfully.', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

/**
 * POST /api/v1/update_family_member
 * Body: id, f_name, l_name, phone, gender, isd_code, dob
 */
app.post('/api/v1/update_family_member', async (req, res) => {
    try {
        const body = req.body || {};
        const id = toNullablePositiveInt(body.id);
        if (!id) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        }

        const existing = await pool.query(
            `SELECT id FROM family_members WHERE id = $1 LIMIT 1`,
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Family member not found' });
        }

        const updates = [];
        const params = [];

        const addUpdate = (col, value) => {
            if (value === undefined) return;
            params.push(value);
            updates.push(`${col} = $${params.length}`);
        };

        if (body.f_name !== undefined) addUpdate('f_name', String(body.f_name || '').trim());
        if (body.l_name !== undefined) addUpdate('l_name', String(body.l_name || '').trim());
        if (body.phone !== undefined) addUpdate('phone', String(body.phone || '').trim());
        if (body.isd_code !== undefined) addUpdate('isd_code', String(body.isd_code || '').trim());
        if (body.gender !== undefined) addUpdate('gender', String(body.gender || '').trim() || null);
        if (body.dob !== undefined) addUpdate('dob', String(body.dob || '').trim() || null);

        if (!updates.length) {
            return res.status(422).json({ response: 422, status: false, message: 'No fields to update' });
        }

        updates.push('updated_at = NOW()');
        params.push(id);

        const result = await pool.query(
            `UPDATE family_members SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
            params
        );

        res.json({ response: 200, status: true, message: 'Family member updated successfully.', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

/**
 * POST /api/v1/delete_family_member
 * Body: id
 */
app.post('/api/v1/delete_family_member', async (req, res) => {
    try {
        const id = toNullablePositiveInt((req.body || {}).id);
        if (!id) {
            return res.status(422).json({ response: 422, status: false, message: 'id is required' });
        }

        const existing = await pool.query(
            `SELECT id FROM family_members WHERE id = $1 LIMIT 1`,
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ response: 404, status: false, message: 'Family member not found' });
        }

        await pool.query(`DELETE FROM family_members WHERE id = $1`, [id]);
        res.json({ response: 200, status: true, message: 'Family member deleted successfully.' });
    } catch (err) {
        res.status(500).json({ response: 500, status: false, message: err.message });
    }
});

// ===========================================================================
// Start server
// ===========================================================================
const PORT = process.env.PORT || 3000;

async function startServer() {
    if (requiredServices.requireDb) {
        const missingDbEnv = validateDbEnv();
        if (missingDbEnv.length > 0) {
            throw new Error(`Missing required DB environment variables: ${missingDbEnv.join(', ')}`);
        }
        await connectToDb();
    }

    if (requiredServices.requireFirebaseAuth && !firebaseStatus.initialized) {
        throw new Error('REQUIRE_FIREBASE_AUTH=true but Firebase service account is not configured');
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer().catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
});
