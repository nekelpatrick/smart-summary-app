module.exports = async () => {
  // Global teardown for all tests
  console.log('🧹 Cleaning up test environment...')
  
  // Clear all timers
  if (global.setTimeout) {
    clearTimeout()
  }
  if (global.setInterval) {
    clearInterval()
  }
  
  // Clear all mocks
  if (jest && jest.clearAllMocks) {
    jest.clearAllMocks()
  }
  
  // Reset environment variables
  delete process.env.NODE_ENV
  delete process.env.NEXT_PUBLIC_API_URL
  
  // Clear performance data
  if (global.performance && global.performance.clearMarks) {
    global.performance.clearMarks()
    global.performance.clearMeasures()
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
  
  console.log('✅ Test environment cleaned up')
} 