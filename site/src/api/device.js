// Single entry point for talking to the device's REST API (see REST_API.md).
// Every call goes through request(), which turns HTTP error statuses into
// exceptions — plain fetch() only rejects on network failure.
import { httpPrefix } from '../espaddr';

export const apiUrl = path => `${httpPrefix ?? ''}${path}`;

export class ApiError extends Error {
    constructor(path, status) {
        super(`${path} failed (HTTP ${status})`);
        this.name   = 'ApiError';
        this.path   = path;
        this.status = status;
    }
}

// Form-encode params, skipping undefined/null so optional fields are omitted.
const toForm = params => new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null));

async function request(path, init) {
    const res = await fetch(apiUrl(path), init);
    if (!res.ok) throw new ApiError(path, res.status);
    return res;
}

// GET and parse JSON. Pass { signal } to make the call abortable.
export const getJson = async (path, params, init) =>
    (await request(params ? `${path}?${toForm(params)}` : path, init)).json();

// POST form-encoded params; resolves to the Response.
export const post = (path, params = {}, init) =>
    request(path, { ...init, method: 'POST', body: toForm(params) });
