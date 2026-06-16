const host = window.location.hostname;
const port = window.location.port;
const origin = window.location.origin;

const isLocalhost =
  host === 'localhost' ||
  host === '127.0.0.1';

const isStaticDevPort =
  port === '8001' || port === '8080' || port === '3000' || port === '5173';

export const API_BASE =
  isLocalhost && isStaticDevPort
    ? 'http://localhost:8000/api'
    : `${origin}/api`;