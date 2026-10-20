import { createReceiptImageBlob } from "./receiptImage";
let activePort = null;
let queue = Promise.resolve();
const MODE_KEY = "iwear_serial_printer";
export const hasThermalPrinter = () =>
  typeof window !== "undefined" && localStorage.getItem(MODE_KEY) === "true";
export const connectThermalPrinter = async () => {
  if (!navigator.serial)
    throw new Error(
      "Gunakan Chrome atau Edge di komputer untuk printer Bluetooth/serial.",
    );
  const port = await navigator.serial.requestPort();
  if (activePort?.writable) await activePort.close();
  await port.open({ baudRate: 9600 });
  activePort = port;
  localStorage.setItem(MODE_KEY, "true");
};
export const disconnectThermalPrinter = async () => {
  await queue.catch(() => undefined);
  if (activePort?.writable) await activePort.close();
  activePort = null;
  localStorage.removeItem(MODE_KEY);
};
export const shouldOpenCashDrawer = (transaction) =>
  ["PAID", "COMPLETED"].includes(transaction?.status) &&
  transaction?.payments?.some((payment) => payment.paymentType === "CASH") &&
  Number(transaction.changeAmount) > 0;

// ESC/POS raster command. Rasterization keeps Arial, the logo, and QR labels intact.
export const rasterBytes = (pixels, width, height) => {
  const stride = Math.ceil(width / 8);
  const result = new Uint8Array(8 + stride * height);
  result.set([
    0x1d,
    0x76,
    0x30,
    0,
    stride & 255,
    stride >> 8,
    height & 255,
    height >> 8,
  ]);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const shade =
        (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) *
          (pixels[i + 3] / 255) +
        255 * (1 - pixels[i + 3] / 255);
      if (shade < 160) result[8 + y * stride + (x >> 3)] |= 0x80 >> x % 8;
    }
  return result;
};
const sendReceipt = async (
  node,
  { transaction, allowDrawer = false, paperWidth = 58 } = {},
) => {
  if (!activePort?.writable) {
    const ports = await navigator.serial?.getPorts();
    if (ports?.length !== 1)
      throw new Error("Hubungkan ulang printer pada Pengaturan → Printer.");
    activePort = ports[0];
    await activePort.open({ baudRate: 9600 });
  }
  const blob = await createReceiptImageBlob(node);
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = Number(paperWidth) === 80 ? 576 : 384;
  canvas.height = Math.round((bitmap.height * canvas.width) / bitmap.width);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const writer = activePort.writable.getWriter();
  try {
    await writer.write(new Uint8Array([0x1b, 0x40]));
    // Small raster bands fit the limited buffers in generic 58 mm printers.
    for (let top = 0; top < canvas.height; top += 64) {
      const height = Math.min(64, canvas.height - top);
      const bytes = rasterBytes(
        context.getImageData(0, top, canvas.width, height).data,
        canvas.width,
        height,
      );
      await writer.write(bytes);
    }
    await writer.write(new Uint8Array([0x1b, 0x64, 4]));
    const key = "iwear_drawer_" + transaction?.invoiceNumber;
    if (
      allowDrawer &&
      shouldOpenCashDrawer(transaction) &&
      !localStorage.getItem(key)
    ) {
      // Mark before writing: a connection error must not reopen a drawer on retry.
      localStorage.setItem(key, "sent");
      await writer.write(new Uint8Array([0x1b, 0x70, 0, 50, 250]));
    }
  } finally {
    writer.releaseLock();
  }
};
export const printThermalReceipt = (node, options) => {
  const job = queue
    .catch(() => undefined)
    .then(() => sendReceipt(node, options));
  queue = job;
  return job;
};
