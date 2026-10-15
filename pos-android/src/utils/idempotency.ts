export const createIdempotencyKey = (prefix = 'android') => {
    const timestamp = Date.now().toString(36);
    const randomPart = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 24);
    return `${prefix}-${timestamp}-${randomPart}`;
};

export const fingerprintPayload = (payload: unknown) => JSON.stringify(payload);
