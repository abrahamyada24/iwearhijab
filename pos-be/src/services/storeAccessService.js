const serializeStore = (membership) => ({
  id: membership.store.id,
  slug: membership.store.slug,
  name: membership.store.name,
  type: membership.store.type,
  role: membership.role,
});

const listActiveMemberships = (prisma, userId) => prisma.storeMembership.findMany({
  where: {
    userId: Number(userId),
    isActive: true,
    store: { isActive: true },
  },
  include: { store: true },
  orderBy: { storeId: 'asc' },
});

const resolveActiveMembership = async (prisma, session) => {
  if (session.activeStoreId) {
    const selected = await prisma.storeMembership.findUnique({
      where: {
        userId_storeId: {
          userId: session.userId,
          storeId: session.activeStoreId,
        },
      },
      include: { store: true },
    });
    if (selected?.isActive && selected.store?.isActive) return selected;
  }

  const fallback = await prisma.storeMembership.findFirst({
    where: {
      userId: session.userId,
      isActive: true,
      store: { isActive: true },
    },
    include: { store: true },
    orderBy: { storeId: 'asc' },
  });

  if (fallback && fallback.storeId !== session.activeStoreId) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { activeStoreId: fallback.storeId },
    });
  }
  return fallback;
};

module.exports = {
  listActiveMemberships,
  resolveActiveMembership,
  serializeStore,
};
