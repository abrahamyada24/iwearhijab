import RNFS from 'react-native-fs';
import { saveDocuments } from '@react-native-documents/picker';
import { buildSimplePdf } from '../utils/simplePdf';

export async function saveExport(
  name: string,
  content: string,
  mime = 'text/csv',
) {
  const source = `${RNFS.CachesDirectoryPath}/${name}`;
  await RNFS.writeFile(source, content, 'utf8');
  try {
    const result = await saveDocuments({
      sourceUris: [`file://${source}`],
      fileName: name,
      mimeType: mime,
    });
    if (result[0]?.error) throw new Error(result[0].error);
  } finally {
    await RNFS.unlink(source).catch(() => {});
  }
}
export async function savePdf(name: string, lines: string[]) {
  return saveExport(name, buildSimplePdf(lines), 'application/pdf');
}
export function csv(rows: unknown[][]) {
  return (
    '\uFEFF' +
    rows
      .map(row =>
        row
          .map(value => {
            let text = String(value ?? '');
            if (/^[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
          })
          .join(','),
      )
      .join('\r\n')
  );
}
