import api from './api';

export interface ActiveShiftData {
    id: string;
    openingCash: number;
    openedAt: string;
}

const toActiveShift = (shift: any): ActiveShiftData => ({
    id: String(shift.id),
    openingCash: Number(shift.openingCash || 0),
    openedAt: shift.openedAt || new Date().toISOString(),
});

export const openCashierShift = async (user: any, openingCash: number): Promise<ActiveShiftData> => {
    try {
        const response = await api.post('/shifts/open', { openingCash });
        const serverShift = response.data?.data;
        if (!serverShift) throw new Error('Server tidak mengembalikan data shift.');
        return toActiveShift(serverShift);
    } catch (error: any) {
        const existingServerShift = error.response?.status === 409 ? error.response?.data?.data : null;
        if (existingServerShift) {
            return toActiveShift(existingServerShift);
        }
        throw error;
    }
};

export const closeCashierShift = async (shift: ActiveShiftData, closingCash: number) => {
    try {
        const response = await api.post(`/shifts/${encodeURIComponent(shift.id)}/close`, { closingCash });
        const serverShift = response.data?.data;
        if (!serverShift) throw new Error('Server tidak mengembalikan data penutupan shift.');
        return serverShift;
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 400 && /sudah ditutup/i.test(error.response?.data?.message || '')) {
            return { ...shift, status: 'CLOSED', closedAt: new Date().toISOString(), closingCash };
        }

        throw error;
    }
};
