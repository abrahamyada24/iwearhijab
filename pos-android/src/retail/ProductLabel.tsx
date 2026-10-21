import React, { useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { saveDocuments } from '@react-native-documents/picker';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import { Button, Sheet } from './ui';
import { productLabel, rupiah } from './policy';
import { useStore } from '../store/useStore';
import { connectConfiguredPrinter } from '../utils/printerConnection';
const QRCode = require('qrcode/lib/core/qrcode');

export default function ProductLabel({ product, onClose }: any) {
  const shot = useRef<any>(null);
  const settings = useStore(s => s.settings);
  const [busy, setBusy] = useState(false);
  const [height, setHeight] = useState(0);
  const code = String(product?.barcode || product?.sku || '');
  const matrix = useMemo(
    () =>
      code && code.length <= 512
        ? QRCode.create(code, { errorCorrectionLevel: 'M' }).modules
        : null,
    [code],
  );
  const path = useMemo(() => {
    if (!matrix) return '';
    let value = '';
    for (let row = 0; row < matrix.size; row++)
      for (let col = 0; col < matrix.size; col++)
        if (matrix.get(row, col)) value += `M${col + 4} ${row + 4}h1v1h-1z`;
    return value;
  }, [matrix]);
  const exportLabel = async (print: boolean) => {
    setBusy(true);
    try {
      const uri = await shot.current.capture();
      if (print) {
        const printer = await connectConfiguredPrinter(settings);
        await printer.printImageBase64(
          await RNFS.readFile(uri.replace('file://', ''), 'base64'),
          { imageWidth: 384, imageHeight: Math.round((height * 384) / 300) },
        );
      } else {
        const name = code.replace(/[^a-zA-Z0-9-]/g, '_');
        const result = await saveDocuments({
          sourceUris: [uri],
          fileName: `Label-${name}.png`,
          mimeType: 'image/png',
        });
        if (result[0]?.error) throw new Error(result[0].error);
      }
    } catch (error: any) {
      if (!String(error.code).includes('CANCEL'))
        Alert.alert('Label Belum Diproses', error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible={Boolean(product)}
      title="Label Produk"
      onClose={onClose}
      busy={busy}
    >
      {product && (
        <ViewShot
          ref={shot}
          options={{ format: 'png', quality: 1, width: 384 }}
        >
          <View
            onLayout={event => setHeight(event.nativeEvent.layout.height)}
            style={{
              backgroundColor: 'white',
              width: 300,
              alignSelf: 'center',
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: 'black',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              {productLabel(product)}
            </Text>
            {matrix && (
              <Svg
                width={160}
                height={160}
                viewBox={`0 0 ${matrix.size + 8} ${matrix.size + 8}`}
                style={{ backgroundColor: 'white', marginVertical: 12 }}
              >
                <Path d={path} fill="black" />
              </Svg>
            )}
            <Text style={{ color: 'black', fontSize: 12 }}>{code}</Text>
            <Text
              style={{
                color: 'black',
                fontSize: 18,
                fontWeight: 'bold',
                marginTop: 10,
              }}
            >
              {rupiah(product.finalPrice ?? product.price)}
            </Text>
          </View>
        </ViewShot>
      )}
      <Button
        title="Cetak Label"
        disabled={busy || !matrix || !height}
        onPress={() => exportLabel(true)}
      />
      <Button
        title="Unduh Label PNG"
        secondary
        disabled={busy || !matrix || !height}
        onPress={() => exportLabel(false)}
      />
    </Sheet>
  );
}
