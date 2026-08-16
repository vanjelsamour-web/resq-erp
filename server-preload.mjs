import express from 'express';
import { installEnhancements } from './server-enhancements.mjs';
import { installInvoiceCreate } from './invoice-create-enhancements.mjs';
import { installPatientImport } from './patient-import-enhancements.mjs';
import { installEmployeeEnhancements } from './employee-enhancements.mjs';
import { installOcr } from './ocr-enhancements.mjs';
import { installPdf } from './pdf-enhancements.mjs';
import { installAuth } from './auth-enhancements.mjs';
import { installProcurementEnhancements } from './procurement-enhancements.mjs';

function moveApiRoutesFirst(app) {
  const router = app.router || app._router;
  if (!router?.stack) return;
  const api = router.stack.filter(layer => layer.route?.path?.startsWith('/api/'));
  if (!api.length) return;
  router.stack = router.stack.filter(layer => !api.includes(layer));
  const jsonIndex = router.stack.findIndex(layer => layer.name === 'jsonParser');
  router.stack.splice(jsonIndex >= 0 ? jsonIndex + 1 : 0, 0, ...api);
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
    installProcurementEnhancements(this);
    moveApiRoutesFirst(this);
    return originalListen.apply(this, args);
  };
}
