// intent: 상수 중앙화 관리
export const CONSTANTS = {
  MOCK_PRICES: { BTCUSDT: 45000, ETHUSDT: 2500 },
  DEFAULT_PRICE: 50000,
  INITIAL_BALANCE: 1000,
  MAX_ASSET_PERCENT: 100,
  MIN_POSITION_PERCENT: 0.01,
  MIN_QUANTITY_THRESHOLD: 0.000001,
  TOAST_DURATION: 3000,
  PRECISION: {
    QUANTITY: 6,
    PRICE: 2,
    PERCENT: 1,
  },
};

// CSV 헤더 상수
export const CSV_HEADERS = [
  'Timestamp',
  'OrderID',
  'Symbol',
  'Side',
  'AssetPercent',
  'Quantity',
  'Price',
  'Notional',
  'Leverage',
  'Balance',
  'Profit%',
];
