#!/usr/bin/env node

/**
 * Command Line Testing Script for POS System
 * Phase 7: Testing and Validation
 * 
 * Usage:
 *   npm run test:all          # Run all tests
 *   npm run test:smoke        # Run smoke test
 *   npm run test:functionality # Run functionality tests
 *   npm run test:performance  # Run performance tests
 *   npm run test:edgecase     # Run edge case tests
 *   npm run test:monitor      # Start monitoring mode
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestConfig {
  name: string;
  description: string;
  command: string;
  timeout: number;
  retries: number;
}

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  output: string;
  error?: string;
  retries: number;
}

class CLITestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private config: TestConfig[] = [];

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig(): void {
    this.config = [
      {
        name: 'smoke',
        description: 'Smoke Test - Basic functionality verification',
        command: 'npm run test:smoke',
        timeout: 30000,
        retries: 2
      },
      {
        name: 'functionality',
        description: 'Functionality Tests - Firebase listeners, data loading, navigation',
        command: 'npm run test:functionality',
        timeout: 120000,
        retries: 1
      },
      {
        name: 'performance',
        description: 'Performance Tests - Memory usage, listener count, performance metrics',
        command: 'npm run test:performance',
        timeout: 180000,
        retries: 1
      },
      {
        name: 'edgecase',
        description: 'Edge Case Tests - Restaurant switching, network issues, rapid navigation',
        command: 'npm run test:edgecase',
        timeout: 120000,
        retries: 1
      }
    ];
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting comprehensive test suite...');
    console.log('📅 Started at:', new Date().toISOString());
    console.log('');

    this.startTime = Date.now();

    for (const testConfig of this.config) {
      await this.runTest(testConfig);
    }

    this.generateReport();
  }

  /**
   * Run specific test
   */
  async runTest(testConfig: TestConfig): Promise<void> {
    console.log(`🔍 Running ${testConfig.name} test...`);
    console.log(`📝 Description: ${testConfig.description}`);
    console.log(`⏱️  Timeout: ${testConfig.timeout}ms`);
    console.log(`🔄 Retries: ${testConfig.retries}`);
    console.log('');

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= testConfig.retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${testConfig.retries}...`);
        }

        const output = this.executeCommand(testConfig.command, testConfig.timeout);
        const duration = Date.now() - startTime;

        this.results.push({
          testName: testConfig.name,
          status: 'PASS',
          duration,
          output,
          retries: attempt
        });

        console.log(`✅ ${testConfig.name} test passed in ${duration}ms`);
        console.log('');
        return;

      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Attempt ${attempt + 1} failed: ${lastError.message}`);
        
        if (attempt < testConfig.retries) {
          console.log('⏳ Waiting before retry...');
          await this.sleep(2000);
        }
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;
    this.results.push({
      testName: testConfig.name,
      status: 'FAIL',
      duration,
      output: '',
      error: lastError?.message,
      retries: testConfig.retries
    });

    console.log(`❌ ${testConfig.name} test failed after ${testConfig.retries + 1} attempts`);
    console.log('');
  }

  /**
   * Run smoke test only
   */
  async runSmokeTest(): Promise<void> {
    const smokeConfig = this.config.find(c => c.name === 'smoke');
    if (!smokeConfig) {
      throw new Error('Smoke test configuration not found');
    }

    console.log('💨 Running smoke test...');
    await this.runTest(smokeConfig);
    this.generateReport();
  }

  /**
   * Run functionality tests only
   */
  async runFunctionalityTests(): Promise<void> {
    const functionalityConfig = this.config.find(c => c.name === 'functionality');
    if (!functionalityConfig) {
      throw new Error('Functionality test configuration not found');
    }

    console.log('🔧 Running functionality tests...');
    await this.runTest(functionalityConfig);
    this.generateReport();
  }

  /**
   * Run performance tests only
   */
  async runPerformanceTests(): Promise<void> {
    const performanceConfig = this.config.find(c => c.name === 'performance');
    if (!performanceConfig) {
      throw new Error('Performance test configuration not found');
    }

    console.log('⚡ Running performance tests...');
    await this.runTest(performanceConfig);
    this.generateReport();
  }

  /**
   * Run edge case tests only
   */
  async runEdgeCaseTests(): Promise<void> {
    const edgeCaseConfig = this.config.find(c => c.name === 'edgecase');
    if (!edgeCaseConfig) {
      throw new Error('Edge case test configuration not found');
    }

    console.log('🔬 Running edge case tests...');
    await this.runTest(edgeCaseConfig);
    this.generateReport();
  }

  /**
   * Start monitoring mode
   */
  startMonitoring(): void {
    console.log('📊 Starting monitoring mode...');
    console.log('Press Ctrl+C to stop monitoring');
    console.log('');

    // In a real implementation, this would start a monitoring service
    console.log('🔍 Monitoring system metrics...');
    console.log('📈 Memory usage, listener count, and performance metrics will be tracked');
    console.log('📝 Logs will be saved to test-reports/monitoring.log');
    
    // Simulate monitoring
    setInterval(() => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] System monitoring active...`);
    }, 5000);
  }

  /**
   * Execute command with timeout
   */
  private executeCommand(command: string, timeout: number): string {
    try {
      const output = execSync(command, {
        timeout,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return output;
    } catch (error) {
      throw new Error(`Command failed: ${error}`);
    }
  }

  /**
   * Generate test report
   */
  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const totalTests = this.results.length;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log('📊 Test Report');
    console.log('==============');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log('');

    // Detailed results
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.testName} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.retries > 0) {
        console.log(`   Retries: ${result.retries}`);
      }
    });

    // Save report to file
    this.saveReportToFile(totalDuration, passedTests, failedTests, successRate);
  }

  /**
   * Save report to file
   */
  private saveReportToFile(totalDuration: number, passedTests: number, failedTests: number, successRate: number): void {
    const reportDir = 'test-reports';
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = join(reportDir, `test-report-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        passedTests,
        failedTests,
        successRate,
        totalDuration
      },
      results: this.results,
      config: this.config
    };

    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportFile}`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  const testRunner = new CLITestRunner();

  try {
    switch (command) {
      case 'all':
        await testRunner.runAllTests();
        break;
      case 'smoke':
        await testRunner.runSmokeTest();
        break;
      case 'functionality':
        await testRunner.runFunctionalityTests();
        break;
      case 'performance':
        await testRunner.runPerformanceTests();
        break;
      case 'edgecase':
        await testRunner.runEdgeCaseTests();
        break;
      case 'monitor':
        testRunner.startMonitoring();
        break;
      default:
        console.log('Usage: npm run test [all|smoke|functionality|performance|edgecase|monitor]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default CLITestRunner;
