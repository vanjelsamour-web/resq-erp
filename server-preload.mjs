import express from 'express';
import { installEnhancements } from './server-enhancements.mjs';

const originalListen = express.application.listen;
if (!express.application.__resqListenPatched) {
  express.application.__resqListenPatched = true;
  express.application.listen = function (...args) {
    installEnhancements(this);
    return originalListen.apply(this, args);
  };
}
