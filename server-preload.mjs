import express from 'express';
import { installEnhancements } from './server-enhancements.mjs';
import { installInvoiceCreate } from './invoice-create-enhancements.mjs';
import { installPatientImport } from './patient-import-enhancements.mjs';
import { installEmployeeEnhancements } from './employee-enhancements.mjs';
import { installOcr } from './ocr-enhancements.mjs';
import { installPdf } from './pdf-enhancements.mjs';
import { installAuth } from './auth-enhancements.mjs';

function moveAuthRoutesFirst(app) {
  // Express 5 exposes the router as `app.router`; Express 4 used `_router`.
  // Support both so auth endpoints are always evaluated before the SPA fallback.
  const router = app.router || app._router;
  if (!router?.stack) return;
  const auth = router.stack.filter(layer => layer.route?.path?.startsWith('/api/auth'));
  if (!auth.length) return;
  router.stack = router.stack.filter(layer => !auth.includes(layer));
  const jsonIndex = router.stack.findIndex(layer => layer.name === 'jsonParser');
  router.stack.splice(jsonIndex >= 0 ? jsonIndex + 1 : 0, 0, ...auth);
}

const originalListen = express.application.listen;
if (!express.application.__resqListenPatched) {
  express.application.__resqListenPatched = true;
  express.application.listen = function (...args) {
    installEnhancements(this);
    installInvoiceCreate(this);
    installPatientImport(this);
    installEmployeeEnhancements(this);
    installOcr(this);
    installPdf(this);
    installAuth(this);
    moveAuthRoutesFirst(this);
    return originalListen.apply(this, args);
  };
}
