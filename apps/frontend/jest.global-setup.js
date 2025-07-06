module.exports = async () => {
  // Global setup for all tests
  console.log('🚀 Setting up test environment...')
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
  
  // Mock date to ensure consistent snapshots
  const mockDate = new Date('2024-01-01T00:00:00Z')
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) {
        return mockDate
      }
      return super(...args)
    }
    
    static now() {
      return mockDate.getTime()
    }
  }
  
  // Setup performance measurement
  global.performance = {
    ...global.performance,
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000,
    },
  }
  
  // Setup fetch mock
  global.fetch = jest.fn()
  
  console.log('✅ Test environment ready')
} 