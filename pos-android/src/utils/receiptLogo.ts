import { resolveApiAssetUrl } from '../services/api';

// Library printer thermal menskalakan lebar dan tinggi secara terpisah.
// Kedua dimensi harus dikirim dengan rasio yang sama seperti kanvas hasil capture.
export const RECEIPT_LOGO_CAPTURE_WIDTH = 240;
export const RECEIPT_LOGO_CAPTURE_HEIGHT = 120;
export const RECEIPT_LOGO_INNER_WIDTH = 220;
export const RECEIPT_LOGO_INNER_HEIGHT = 100;
export const RECEIPT_LOGO_PRINT_WIDTH = 180;
export const RECEIPT_LOGO_PRINT_HEIGHT = Math.round(
    RECEIPT_LOGO_PRINT_WIDTH * RECEIPT_LOGO_CAPTURE_HEIGHT / RECEIPT_LOGO_CAPTURE_WIDTH,
);

export const getReceiptLogoPrintOptions = () => ({
    imageWidth: RECEIPT_LOGO_PRINT_WIDTH,
    imageHeight: RECEIPT_LOGO_PRINT_HEIGHT,
});

export const resolveReceiptLogoUri = (logo?: string | null, apiBaseUrl?: string | null) => (
    resolveApiAssetUrl(logo, apiBaseUrl)
);

