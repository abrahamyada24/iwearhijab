jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));
jest.mock('react-native-fs', () => ({ CachesDirectoryPath: '/cache' }));
jest.mock('react-native-view-shot', () => 'ViewShot');
jest.mock('react-native-camera-kit', () => ({
  Camera: 'Camera',
  CameraType: { Back: 'back' },
}));
jest.mock('react-native-share', () => ({ open: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  DefaultTheme: { colors: {} },
  DarkTheme: { colors: {} },
  createNavigationContainerRef: () => ({ isReady: () => true }),
}));
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: (props: any) =>
      require('react').createElement('Route', { name: props.name }),
  }),
}));
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'Tab' }),
}));
jest.mock('../src/database/db', () => ({
  getDBConnection: jest.fn(async () => ({})),
  createTables: jest.fn(async () => {}),
}));
jest.mock(
  '../src/components/AppDialogProvider',
  () =>
    ({ children }: any) =>
      children,
);
jest.mock('../src/services/secureAuthStorage', () => ({
  clearAuthSession: jest.fn(),
  AUTH_INACTIVITY_TIMEOUT_MS: 57600000,
  getLastAuthActivity: jest.fn(async () => Date.now()),
  markAuthActivity: jest.fn(),
  getAuthToken: jest.fn(async () => 'token'),
}));
jest.mock('@react-native-documents/picker', () => ({
  saveDocuments: jest.fn(),
}));
jest.mock('react-native-thermal-receipt-printer-image-qr', () => ({
  BLEPrinter: {},
  USBPrinter: {},
}));
jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  showApiError: jest.fn(),
  resolveApiAssetUrl: (value: string) => value,
}));
jest.mock('../src/services/saasDataService', () => ({
  fetchProducts: jest.fn(async () => [
    {
      id: 1,
      name: 'Hijab',
      variant: 'Pashmina',
      color: 'Rose',
      price: 50000,
      finalPrice: 45000,
      stock: 10,
      isActive: true,
    },
  ]),
  fetchCategories: jest.fn(async () => [{ id: 1, name: 'Hijab' }]),
  fetchCustomers: jest.fn(async () => []),
  createTransaction: jest.fn(),
  loadDeviceSettings: jest.fn(),
  saveDeviceSettings: jest.fn(),
}));
jest.mock('../src/services/licenseService', () => ({
  licenseToSettings: jest.fn(),
}));
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useStore } from '../src/store/useStore';
import api from '../src/services/api';
import ProductsScreen from '../src/retail/ProductsScreen';
import ExpensesScreen from '../src/retail/ExpensesScreen';
import ReportsScreen from '../src/retail/ReportsScreen';
import HomeScreen from '../src/retail/HomeScreen';
import TransactionsScreen from '../src/retail/TransactionsScreen';
import SettingsScreen from '../src/retail/SettingsScreen';
import { Button, Chips, Field } from '../src/retail/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../src/App';

const navigation = {
  addListener: jest.fn(() => () => {}),
  navigate: jest.fn(),
  goBack: jest.fn(),
};
jest.setTimeout(30000);
let rendered: Renderer.ReactTestRenderer;
const renderedText = () =>
  rendered.root
    .findAll(() => true)
    .flatMap(node =>
      [node.props.children]
        .flat()
        .filter(
          child => typeof child === 'string' || typeof child === 'number',
        ),
    )
    .join(' ');
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useStore.setState({
    user: { id: 1, role: 'CASHIER', activeStoreId: 10, name: 'Staff' },
    cart: [],
  });
  (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered.unmount());
});
async function render(component: React.ReactElement) {
  await act(async () => {
    rendered = Renderer.create(component);
  });
  return rendered;
}

test('Staff melihat produk/varian/warna tanpa tombol tambah, edit, hapus', async () => {
  await render(
    <ProductsScreen route={{ name: 'ProductList' }} navigation={navigation} />,
  );
  const buttons = rendered.root
    .findAllByType(Button)
    .map(item => item.props.title);
  expect(renderedText()).toContain('Pashmina');
  expect(renderedText()).toContain('Rose');
  for (const title of ['Tambah Produk', 'Edit', 'Hapus'])
    expect(buttons).not.toContain(title);
});
test('Staff tidak memuat endpoint laporan/pengeluaran dan hanya mendapat pengaturan Tema/Printer', async () => {
  await render(<ExpensesScreen navigation={navigation} />);
  expect(api.get).not.toHaveBeenCalled();
  await act(async () => rendered.unmount());
  await render(<ReportsScreen navigation={navigation} />);
  expect(api.get).not.toHaveBeenCalled();
  await act(async () => rendered.unmount());
  await render(<SettingsScreen navigation={navigation} />);
  expect(
    rendered.root
      .findByType(Chips)
      .props.options.map((item: any) => item.label),
  ).toEqual(['Tema', 'Printer']);
});
test('dashboard Staff menampilkan Cash/QRIS tanpa laba dan menu khusus manager', async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: {
      data: {
        summary: { totalProfit: 999999 },
        todayPaymentBreakdown: {
          cash: 75000,
          qris: 45000,
          cashCount: 2,
          qrisCount: 1,
        },
      },
    },
  });
  await render(<HomeScreen navigation={navigation} />);
  const json = renderedText();
  expect(json).toContain('75.000');
  expect(json).toContain('45.000');
  expect(json).not.toContain('Laba kotor');
  expect(json).not.toContain('999.999');
  const buttons = rendered.root
    .findAllByType(Button)
    .map(item => item.props.title);
  expect(buttons).toContain('Transaksi');
  expect(buttons).not.toContain('Laporan');
  expect(buttons).not.toContain('Pengeluaran');
});
test('filter transaksi meneruskan invoice/member/tanggal dan detail diambil dari endpoint lengkap', async () => {
  (api.get as jest.Mock).mockImplementation(async (url: string) =>
    url === '/transactions/8'
      ? {
          data: {
            data: {
              id: 8,
              invoiceNumber: 'INV/8',
              grandTotal: 50000,
              subTotal: 50000,
              status: 'PAID',
              items: [
                {
                  productId: 1,
                  product: { name: 'Hijab' },
                  qty: 1,
                  price: 50000,
                },
              ],
              payments: [{ paymentType: 'QRIS_MANUAL' }],
            },
          },
        }
      : {
          data: {
            data: [
              {
                id: 8,
                invoiceNumber: 'INV/8',
                createdAt: '2026-10-22T08:00:00Z',
                grandTotal: 50000,
                status: 'PAID',
              },
            ],
            meta: { totalPages: 2 },
          },
        },
  );
  await render(<TransactionsScreen navigation={navigation} />);
  const search = rendered.root
    .findAllByType(Field)
    .find(item => item.props.label === 'Cari Invoice / Member...')!;
  await act(async () => search.props.onChangeText('MEM-01'));
  await act(async () =>
    rendered.root
      .findAllByType(Button)
      .find(item => item.props.title === 'Terapkan')!
      .props.onPress(),
  );
  expect(api.get).toHaveBeenLastCalledWith('/transactions', {
    params: expect.objectContaining({
      search: 'MEM-01',
      page: 1,
      startDate: expect.any(String),
      endDate: expect.any(String),
    }),
  });
  await act(async () =>
    rendered.root
      .findAllByType(Button)
      .find(item => item.props.title === 'Detail / Cetak Ulang')!
      .props.onPress(),
  );
  expect(navigation.navigate).toHaveBeenCalledWith(
    'ReceiptPreview',
    expect.objectContaining({
      autoPrint: false,
      receiptData: expect.objectContaining({
        paymentMethod: 'QRIS',
        items: [expect.objectContaining({ name: 'Hijab', quantity: 1 })],
      }),
    }),
  );
});

test('navigator root memblokir rute manager untuk Staff dan menghapus rute lama', async () => {
  await render(<App />);
  const routes = rendered.root
    .findAllByType('Route' as any)
    .map(node => node.props.name);
  expect(routes).toContain('Transaksi');
  expect(routes).not.toContain('Laporan');
  for (const route of [
    'PackageList',
    'StockOpname',
    'StockReceiving',
    'KitchenQueue',
    'TableOrders',
  ])
    expect(routes).not.toContain(route);
  await act(async () =>
    useStore.setState({ user: { id: 1, role: 'ADMIN', activeStoreId: 10 } }),
  );
  expect(
    rendered.root.findAllByType('Route' as any).map(node => node.props.name),
  ).toContain('Laporan');
});

test('pengeluaran Admin mengirim kategori baru dan filter tanggal yang sama', async () => {
  useStore.setState({ user: { id: 1, role: 'ADMIN', activeStoreId: 10 } });
  (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
  await render(<ExpensesScreen navigation={navigation} />);
  await act(async () =>
    rendered.root
      .findAllByType(Chips)
      .find(node => node.props.options[0]?.label === 'Semua Kategori')!
      .props.onChange('Konveksi'),
  );
  expect(api.get).toHaveBeenLastCalledWith('/expenses', {
    params: expect.objectContaining({
      category: 'Konveksi',
      startDate: expect.any(String),
      endDate: expect.any(String),
    }),
  });
  await act(async () =>
    rendered.root
      .findAllByType(Button)
      .find(node => node.props.title === 'Tambah Pengeluaran')!
      .props.onPress(),
  );
  await act(async () =>
    rendered.root
      .findAllByType(Field)
      .find(node => node.props.label === 'Keterangan')!
      .props.onChangeText('Jahit hijab'),
  );
  await act(async () =>
    rendered.root
      .findAllByType(Field)
      .find(node => node.props.label === 'Nominal')!
      .props.onChangeText('15000'),
  );
  await act(async () =>
    rendered.root
      .findAllByType(Chips)
      .find(node => node.props.options[0] === 'Umum')!
      .props.onChange('Konveksi'),
  );
  await act(async () =>
    rendered.root
      .findAllByType(Button)
      .find(node => node.props.title === 'Simpan')!
      .props.onPress(),
  );
  expect(api.post).toHaveBeenCalledWith('/expenses', {
    description: 'Jahit hijab',
    amount: 15000,
    category: 'Konveksi',
  });
});
