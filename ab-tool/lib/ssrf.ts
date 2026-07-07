// SSRF-Schutz: Blocklist für private/reserved Hosts und Cloud-Metadata-Endpoints.
// Verwendet in /api/domains (CRUD) und /api/domains/verify (HTTP-Check).
export const BLOCKED_HOSTS = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|0\.0\.0\.0|\[::1\]|[0-9a-f:]+:[0-9a-f:]*:[0-9a-f:]+)$/i
export const BLOCKED_HOSTNAMES = ['metadata.google.internal', '169.254.169.254']
