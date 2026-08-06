const toPdfAscii = (value: unknown) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');

const escapePdfText = (value: string) => toPdfAscii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const wrapLine = (value: string, maxLength: number) => {
    const line = toPdfAscii(value);
    if (line.length <= maxLength) return [line];

    const result: string[] = [];
    let remaining = line;
    while (remaining.length > maxLength) {
        let splitAt = remaining.lastIndexOf(' ', maxLength);
        if (splitAt < Math.floor(maxLength * 0.6)) splitAt = maxLength;
        result.push(remaining.slice(0, splitAt).trimEnd());
        remaining = remaining.slice(splitAt).trimStart();
    }
    if (remaining) result.push(remaining);
    return result;
};

export const buildSimplePdf = (inputLines: string[]) => {
    const lines = inputLines.flatMap((line) => wrapLine(line, 94));
    const linesPerPage = 66;
    const pages: string[][] = [];
    for (let index = 0; index < Math.max(lines.length, 1); index += linesPerPage) {
        pages.push(lines.slice(index, index + linesPerPage));
    }

    const pageIds = pages.map((_, index) => 4 + index * 2);
    const objects: string[] = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

    pages.forEach((pageLines, index) => {
        const pageId = pageIds[index];
        const contentId = pageId + 1;
        const commands = [
            'BT',
            '/F1 8 Tf',
            '36 806 Td',
            '11 TL',
            ...pageLines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, 'T*']),
            '1 0 0 1 486 24 Tm',
            `(Halaman ${index + 1}/${pages.length}) Tj`,
            'ET',
        ].join('\n');

        objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
        objects[contentId] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
    });

    let pdf = '%PDF-1.4\n% LitePOS Warna Warni\n';
    const offsets: number[] = [0];
    for (let id = 1; id < objects.length; id += 1) {
        offsets[id] = pdf.length;
        pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n`;
    pdf += '0000000000 65535 f \n';
    for (let id = 1; id < objects.length; id += 1) {
        pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return pdf;
};
