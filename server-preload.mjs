import express from 'express';
import { installEnhancements } from './server-enhancements.mjs';
import { installInvoiceCreate } from './invoice-create-enhancements.mjs';
import { installPatientImport } from './patient-import-enhancements.mjs';
import { installEmployeeEnhancements } from './employee-enhancements.mjs';
import { installOcr } from './ocr-enhancements.mjs';
import { installPdf } from './pdf-enhancements.mjs';

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
    return originalListen.apply(this, args);
  };
}
