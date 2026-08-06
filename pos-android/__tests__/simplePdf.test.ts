import { buildSimplePdf } from '../src/utils/simplePdf';

describe('generator PDF laporan', () => {
    it('membuat PDF ASCII valid dan paginasi otomatis', () => {
        const pdf = buildSimplePdf(Array.from({ length: 80 }, (_, index) => `Baris laporan ${index + 1}`));
        const startXref = Number(pdf.match(/startxref\n(\d+)/)?.[1]);

        expect(pdf.startsWith('%PDF-1.4')).toBe(true);
        expect(pdf).toContain('/Count 2');
        expect(pdf).toContain('(Halaman 1/2) Tj');
        expect(pdf).toContain('(Halaman 2/2) Tj');
        expect(pdf.slice(startXref, startXref + 4)).toBe('xref');
        expect(Array.from(pdf).every((character) => character.charCodeAt(0) <= 127)).toBe(true);
        expect(pdf.endsWith('%%EOF\n')).toBe(true);
    });
});
