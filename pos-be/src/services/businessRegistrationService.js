const RESERVED_STORE_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'login',
  'register',
  'support',
  'www',
]);

const normalizeStoreSlug = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-')
  .slice(0, 80)
  .replace(/-+$/g, '');

const validateStoreSlug = (value) => {
  const slug = normalizeStoreSlug(value);
  if (slug.length < 3) return 'Slug usaha minimal 3 karakter.';
  if (RESERVED_STORE_SLUGS.has(slug)) return 'Slug usaha tersebut tidak dapat digunakan.';
  return null;
};

const generateAvailableStoreSlug = async (prisma, source) => {
  let base = normalizeStoreSlug(source);
  if (base.length < 3) base = `usaha-${base || 'baru'}`;
  if (RESERVED_STORE_SLUGS.has(base)) base = `${base}-usaha`;
  base = base.slice(0, 80).replace(/-+$/g, '');

  for (let suffix = 0; suffix < 10000; suffix += 1) {
    const suffixText = suffix === 0 ? '' : `-${suffix + 1}`;
    const candidate = `${base.slice(0, 80 - suffixText.length).replace(/-+$/g, '')}${suffixText}`;
    const existing = await prisma.store.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error('Tidak dapat membuat slug usaha unik.');
};

module.exports = {
  RESERVED_STORE_SLUGS,
  generateAvailableStoreSlug,
  normalizeStoreSlug,
  validateStoreSlug,
};
