import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Polyfill for TextDecoder and TextEncoder
import { TextDecoder, TextEncoder } from 'util'
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock navigator.clipboard - make it configurable to avoid redefinition errors
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
  readText: jest.fn().mockResolvedValue(''),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
  configurable: true,
});

// Mock localStorage
const localStoragePrototype = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(() => null),
  removeItem: jest.fn(() => null),
  clear: jest.fn(() => null),
};

Object.defineProperty(window, 'localStorage', {
  value: localStoragePrototype,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStoragePrototype,
  writable: true,
});

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: An update to') ||
     args[0].includes('act(...)'))
  ) {
    return;
  }
  originalError.call(console, ...args)
}

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('componentWillMount has been renamed'))
  ) {
    return;
  }
  originalWarn.call(console, ...args)
}

// Mock window.URL for blob operations
global.URL = {
  createObjectURL: jest.fn((object) => `blob:${object.name || 'file'}`),
  revokeObjectURL: jest.fn((url) => {
    // Mock implementation - url parameter intentionally unused
    void url;
  }),
};

// Mock window.URL for blob operations
Object.defineProperty(window, 'URL', {
  value: global.URL,
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock performance.mark and performance.measure
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000,
    },
    navigation: {
      type: 0,
      redirectCount: 0,
    },
    timing: {
      navigationStart: Date.now(),
      loadEventEnd: Date.now() + 1000,
    },
    now: jest.fn(() => Date.now()),
  },
  writable: true,
})

// Mock navigator properties
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
})

Object.defineProperty(navigator, 'maxTouchPoints', {
  value: 0,
})

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
})

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    this.onerror = null
    
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
  }
  
  send(data) {
    // Mock implementation - data parameter used for type checking
    void data
  }
  
  close() {
    this.readyState = 3
    if (this.onclose) this.onclose()
  }
}

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
}

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0))
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id))

// Mock scroll methods
window.scroll = jest.fn()
window.scrollTo = jest.fn()

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: () => {},
}))

// Mock focus methods
HTMLElement.prototype.focus = jest.fn()
HTMLElement.prototype.blur = jest.fn()

// Mock form validation
HTMLFormElement.prototype.reportValidity = jest.fn(() => true)
HTMLInputElement.prototype.reportValidity = jest.fn(() => true)

// Global test utilities
global.testUtils = {
  createStreamResponse: (chunks) => {
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode(chunk))
            if (index === chunks.length - 1) {
              setTimeout(() => controller.close(), 10)
            }
          }, index * 10)
        })
      },
    })
    
    return {
      ok: true,
      body: stream,
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    }
  },
  
  createErrorResponse: (status, message) => ({
    ok: false,
    status,
    statusText: message,
    headers: new Headers(),
    text: () => Promise.resolve(message),
    json: () => Promise.resolve({ error: message }),
  }),
  
  mockPerformanceObserver: (callback) => {
    const observer = new PerformanceObserver(callback)
    observer.observe = jest.fn()
    observer.disconnect = jest.fn()
    return observer
  },
}

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  
  // Reset clipboard mock
  mockClipboard.writeText.mockClear()
  mockClipboard.readText.mockClear()
  
  // Reset performance mocks
  performance.mark.mockClear()
  performance.measure.mockClear()
  performance.getEntriesByName.mockClear()
  
  // Reset fetch mock
  if (global.fetch.mockReset) {
    global.fetch.mockReset()
  }
  
  // Reset navigator properties
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    writable: true,
  })
  
  // Reset window dimensions
  Object.defineProperty(window, 'innerWidth', {
    value: 1024,
    writable: true,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    value: 768,
    writable: true,
  })
  
  // Clean up DOM
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

// Global test setup
beforeAll(() => {
  // Suppress specific warnings that are expected in tests
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (
      args[0]?.includes?.('ReactDOMTestUtils.act') ||
      args[0]?.includes?.('Warning: An invalid form control')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

// Global test teardown
afterAll(() => {
  // Restore original console methods
  console.error = originalError
  console.warn = originalWarn
}) 