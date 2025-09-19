/**
 * Main Test Runner for Phase 7: Testing and Validation
 * Orchestrates all test suites and provides comprehensive reporting
 */

import { testFramework } from './TestFramework';
import { functionalityTestSuite } from './FunctionalityTestSuite';
import { performanceTestSuite } from './PerformanceTestSuite';
import { edgeCaseTestSuite } from './EdgeCaseTestSuite';
import { store } from '../redux/storeFirebase';
import { RootState } from '../redux/storeFirebase';

export interface TestSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  testSuites: string[];
  results: any[];
  performanceMetrics: any[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    totalDuration: number;
  };
}

export class TestRunner {
  private currentSession?: TestSession;
  private isRunning: boolean = false;

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestSession> {
    if (this.isRunning) {
      throw new Error('Test session already running');
    }

    this.isRunning = true;
    const sessionId = `test-session-${Date.now()}`;
    
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      testSuites: [],
      results: [],
      performanceMetrics: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0,
        totalDuration: 0
      }
    };

    console.log(`🧪 Starting comprehensive test session: ${sessionId}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);

    try {
      // Initialize test framework
      await testFramework.initialize();

      // Run Step 7.1: Functionality Testing
      console.log('\n📋 Step 7.1: Functionality Testing');
      this.currentSession.testSuites.push('Functionality Testing');
      await functionalityTestSuite.runAllTests();

      // Run Step 7.2: Performance Testing
      console.log('\n⚡ Step 7.2: Performance Testing');
      this.currentSession.testSuites.push('Performance Testing');
      await performanceTestSuite.runAllTests();

      // Run Step 7.3: Edge Case Testing
      console.log('\n🔬 Step 7.3: Edge Case Testing');
      this.currentSession.testSuites.push('Edge Case Testing');
      await edgeCaseTestSuite.runAllTests();

      // Generate final report
      await this.generateFinalReport();

    } catch (error) {
      console.error('❌ Test session failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
        this.currentSession.summary.totalDuration = this.currentSession.endTime - this.currentSession.startTime;
      }
    }

    return this.currentSession!;
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suiteName: string): Promise<void> {
    console.log(`🧪 Running test suite: ${suiteName}`);

    switch (suiteName.toLowerCase()) {
      case 'functionality':
        await functionalityTestSuite.runAllTests();
        break;
      case 'performance':
        await performanceTestSuite.runAllTests();
        break;
      case 'edgecase':
      case 'edge-case':
        await edgeCaseTestSuite.runAllTests();
        break;
      default:
        throw new Error(`Unknown test suite: ${suiteName}`);
    }
  }

  /**
   * Run quick smoke test
   */
  async runSmokeTest(): Promise<void> {
    console.log('💨 Running smoke test...');

    testFramework.startTestSuite('Smoke Test');

    try {
      // Test basic functionality
      await testFramework.runTest('App Initialization', async () => {
        const state = store.getState() as RootState;
        if (!state.auth.isLoggedIn) {
          throw new Error('App not properly initialized');
        }
      });

      await testFramework.runTest('Firebase Connection', async () => {
        const state = store.getState() as RootState;
        const restaurantId = state.auth.restaurantId;
        
        if (!restaurantId) {
          throw new Error('No restaurant ID found');
        }
      });

      await testFramework.runTest('Navigation State', async () => {
        const state = store.getState() as RootState;
        if (!state.auth.role) {
          throw new Error('No user role found');
        }
      });

    } catch (error) {
      console.error('❌ Smoke test failed:', error);
      throw error;
    } finally {
      testFramework.endTestSuite();
    }
  }

  /**
   * Generate comprehensive test report
   */
  private async generateFinalReport(): Promise<void> {
    if (!this.currentSession) return;

    console.log('\n📊 Generating comprehensive test report...');

    // Collect all test results
    const allTestSuites = testFramework['testSuites'];
    this.currentSession.results = allTestSuites;

    // Calculate summary statistics
    const totalTests = allTestSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = allTestSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(test => test.status === 'PASS').length, 0
    );
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    this.currentSession.summary = {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      totalDuration: this.currentSession.endTime ? 
        this.currentSession.endTime - this.currentSession.startTime : 0
    };

    // Generate detailed report
    const report = this.generateDetailedReport();
    console.log('\n' + report);

    // Save report to file
    await this.saveReportToFile(report);
  }

  /**
   * Generate detailed test report
   */
  private generateDetailedReport(): string {
    if (!this.currentSession) return '';

    let report = '# POS System Comprehensive Test Report\n\n';
    report += `## Test Session Information\n`;
    report += `- Session ID: ${this.currentSession.sessionId}\n`;
    report += `- Start Time: ${new Date(this.currentSession.startTime).toISOString()}\n`;
    report += `- End Time: ${this.currentSession.endTime ? new Date(this.currentSession.endTime).toISOString() : 'In Progress'}\n`;
    report += `- Total Duration: ${this.currentSession.summary.totalDuration}ms\n\n`;

    report += `## Summary\n`;
    report += `- Total Tests: ${this.currentSession.summary.totalTests}\n`;
    report += `- Passed: ${this.currentSession.summary.passedTests}\n`;
    report += `- Failed: ${this.currentSession.summary.failedTests}\n`;
    report += `- Success Rate: ${this.currentSession.summary.successRate.toFixed(2)}%\n\n`;

    report += `## Test Suites\n`;
    this.currentSession.testSuites.forEach(suiteName => {
      report += `- ${suiteName}\n`;
    });
    report += '\n';

    // Detailed test results
    this.currentSession.results.forEach(suite => {
      report += `## ${suite.name}\n`;
      report += `Duration: ${suite.totalDuration}ms\n\n`;

      suite.tests.forEach(test => {
        const status = test.status === 'PASS' ? '✅' : '❌';
        report += `- ${status} ${test.testName} (${test.duration}ms)\n`;
        if (test.error) {
          report += `  Error: ${test.error}\n`;
        }
      });
      report += '\n';
    });

    // Performance metrics
    if (this.currentSession.performanceMetrics.length > 0) {
      report += `## Performance Metrics\n`;
      this.currentSession.performanceMetrics.forEach((metrics, index) => {
        report += `### Snapshot ${index + 1}\n`;
        report += `- Memory Usage: ${metrics.memoryUsage}MB\n`;
        report += `- Listener Count: ${metrics.listenerCount}\n`;
        report += `- Render Count: ${metrics.renderCount}\n\n`;
      });
    }

    // Recommendations
    report += `## Recommendations\n`;
    if (this.currentSession.summary.successRate < 90) {
      report += `- ⚠️ Success rate below 90%. Review failed tests and fix issues.\n`;
    }
    if (this.currentSession.summary.failedTests > 0) {
      report += `- 🔍 Investigate ${this.currentSession.summary.failedTests} failed tests.\n`;
    }
    report += `- 📊 Monitor performance metrics in production.\n`;
    report += `- 🧪 Run tests regularly to catch regressions.\n\n`;

    report += `---\n`;
    report += `*Report generated by POS System Test Framework*\n`;

    return report;
  }

  /**
   * Save report to file
   */
  private async saveReportToFile(report: string): Promise<void> {
    try {
      // In a real implementation, this would save to a file
      // For now, we'll just log it
      console.log('📄 Test report saved (simulated)');
    } catch (error) {
      console.error('❌ Failed to save test report:', error);
    }
  }

  /**
   * Get current test session status
   */
  getSessionStatus(): { isRunning: boolean; session?: TestSession } {
    return {
      isRunning: this.isRunning,
      session: this.currentSession
    };
  }

  /**
   * Stop current test session
   */
  stopSession(): void {
    if (this.isRunning) {
      console.log('🛑 Stopping test session...');
      this.isRunning = false;
      if (this.currentSession) {
        this.currentSession.endTime = Date.now();
      }
    }
  }
}

// Export singleton instance
export const testRunner = new TestRunner();

// Export convenience functions
export const runAllTests = () => testRunner.runAllTests();
export const runSmokeTest = () => testRunner.runSmokeTest();
export const runTestSuite = (suiteName: string) => testRunner.runTestSuite(suiteName);
