export const parseFormattedNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

export const normalizeNumericInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '');
};

export const formatNumberId = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number).toLocaleString('id-ID') : '0';
};

export const formatRupiah = (value) => `Rp ${formatNumberId(value)}`;
