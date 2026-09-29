// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (objs) => (objs ? objs.ios : undefined) },
  StyleSheet: {
    create: (styles) => styles,
  },
  Alert: {
    alert: jest.fn(),
  },
}));
