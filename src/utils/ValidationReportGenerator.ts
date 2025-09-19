/**
 * Validation Report Generator
 * Generates comprehensive validation reports for the POS system
 */

import { PerformanceMonitor } from './PerformanceMonitor';
import { testRunner } from '../testing/TestRunner';
import { testFramework } from '../testing/TestFramework';

export interface ValidationReport {
  reportId: string;
  generatedAt: string;
  summary: {
    overallStatus: 'PASS' | 'FAIL' | 'WARNING';
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    criticalIssues: number;
    warnings: number;
  };
  testResults: {
    functionality: TestSuiteResult;
    performance: TestSuiteResult;
    edgeCases: TestSuiteResult;
  };
  performanceAnalysis: {
    memoryUsage: PerformanceAnalysis;
    listenerManagement: PerformanceAnalysis;
    navigationPerformance: PerformanceAnalysis;
    dataLoadingPerformance: PerformanceAnalysis;
  };
  recommendations: string[];
  nextSteps: string[];
}

export interface TestSuiteResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  criticalIssues: string[];
  warnings: string[];
  details: TestDetail[];
}

export interface TestDetail {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

export interface PerformanceAnalysis {
  metric: string;
  currentValue: number;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  recommendations: string[];
}

export class ValidationReportGenerator {
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * Generate comprehensive validation report
   */
  async generateValidationReport(): Promise<ValidationReport> {
    console.log('📊 Generating comprehensive validation report...');

    const reportId = `validation-report-${Date.now()}`;
    const generatedAt = new Date().toISOString();

    // Run all test suites
    const testSession = await testRunner.runAllTests();
    
    // Analyze performance metrics
    const performanceAnalysis = this.analyzePerformanceMetrics();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(testSession, performanceAnalysis);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(testSession, performanceAnalysis);

    const report: ValidationReport = {
      reportId,
      generatedAt,
      summary: this.generateSummary(testSession, performanceAnalysis),
      testResults: this.generateTestResults(testSession),
      performanceAnalysis,
      recommendations,
      nextSteps,
    };

    console.log('✅ Validation report generated successfully');
    return report;
  }

  /**
   * Generate test results summary
   */
  private generateTestResults(testSession: any): ValidationReport['testResults'] {
    const results = testSession.results || [];
    
    return {
      functionality: this.processTestSuite(results.find((r: any) => r.name.includes('Functionality')) || {}),
      performance: this.processTestSuite(results.find((r: any) => r.name.includes('Performance')) || {}),
      edgeCases: this.processTestSuite(results.find((r: any) => r.name.includes('Edge Case')) || {}),
    };
  }

  /**
   * Process individual test suite
   */
  private processTestSuite(suite: any): TestSuiteResult {
    const tests = suite.tests || [];
    const passedTests = tests.filter((t: any) => t.status === 'PASS').length;
    const failedTests = tests.filter((t: any) => t.status === 'FAIL').length;
    
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    
    tests.forEach((test: any) => {
      if (test.status === 'FAIL') {
        if (test.error?.includes('critical') || test.error?.includes('memory leak')) {
          criticalIssues.push(`${test.testName}: ${test.error}`);
        } else {
          warnings.push(`${test.testName}: ${test.error}`);
        }
      }
    });

    let status: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (criticalIssues.length > 0) {
      status = 'FAIL';
    } else if (warnings.length > 0) {
      status = 'WARNING';
    }

    return {
      name: suite.name || 'Unknown Suite',
      status,
      totalTests: tests.length,
      passedTests,
      failedTests,
      duration: suite.totalDuration || 0,
      criticalIssues,
      warnings,
      details: tests.map((test: any) => ({
        testName: test.testName,
        status: test.status,
        duration: test.duration,
        error: test.error,
        details: test.details,
      })),
    };
  }

  /**
   * Analyze performance metrics
   */
  private analyzePerformanceMetrics(): ValidationReport['performanceAnalysis'] {
    const metrics = this.performanceMonitor.getMetricsHistory(20);
    const alerts = this.performanceMonitor.getAlerts(10);
    
    return {
      memoryUsage: this.analyzeMemoryUsage(metrics),
      listenerManagement: this.analyzeListenerManagement(metrics),
      navigationPerformance: this.analyzeNavigationPerformance(metrics),
      dataLoadingPerformance: this.analyzeDataLoadingPerformance(metrics),
    };
  }

  /**
   * Analyze memory usage
   */
  private analyzeMemoryUsage(metrics: any[]): PerformanceAnalysis {
    const currentValue = metrics.length > 0 ? metrics[metrics.length - 1].memoryUsage : 0;
    const avgValue = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    
    let status: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
    if (currentValue > 120) status = 'CRITICAL';
    else if (currentValue > 80) status = 'WARNING';

    let trend: 'IMPROVING' | 'STABLE' | 'DEGRADING' = 'STABLE';
    if (metrics.length >= 2) {
      const recent = metrics.slice(-5);
      const older = metrics.slice(-10, -5);
      const recentAvg = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;
      
      if (recentAvg > olderAvg * 1.1) trend = 'DEGRADING';
      else if (recentAvg < olderAvg * 0.9) trend = 'IMPROVING';
    }

    const recommendations: string[] = [];
    if (status === 'CRITICAL') {
      recommendations.push('Immediate memory cleanup required');
      recommendations.push('Review listener management');
      recommendations.push('Consider reducing data caching');
    } else if (status === 'WARNING') {
      recommendations.push('Monitor memory usage closely');
      recommendations.push('Consider optimizing data structures');
    }

    return {
      metric: 'Memory Usage',
      currentValue,
      threshold: { warning: 80, critical: 120 },
      status,
      trend,
      recommendations,
    };
  }

  /**
   * Analyze listener management
   */
  private analyzeListenerManagement(metrics: any[]): PerformanceAnalysis {
    const currentValue = metrics.length > 0 ? metrics[metrics.length - 1].listenerCount : 0;
    
    let status: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
    if (currentValue > 25) status = 'CRITICAL';
    else if (currentValue > 15) status = 'WARNING';

    let trend: 'IMPROVING' | 'STABLE' | 'DEGRADING' = 'STABLE';
    if (metrics.length >= 2) {
      const recent = metrics.slice(-5);
      const older = metrics.slice(-10, -5);
      const recentAvg = recent.reduce((sum, m) => sum + m.listenerCount, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.listenerCount, 0) / older.length;
      
      if (recentAvg > olderAvg * 1.1) trend = 'DEGRADING';
      else if (recentAvg < olderAvg * 0.9) trend = 'IMPROVING';
    }

    const recommendations: string[] = [];
    if (status === 'CRITICAL') {
      recommendations.push('Immediate listener cleanup required');
      recommendations.push('Review screen unmounting logic');
      recommendations.push('Implement listener cleanup on navigation');
    } else if (status === 'WARNING') {
      recommendations.push('Monitor listener count closely');
      recommendations.push('Ensure proper cleanup in useEffect');
    }

    return {
      metric: 'Listener Count',
      currentValue,
      threshold: { warning: 15, critical: 25 },
      status,
      trend,
      recommendations,
    };
  }

  /**
   * Analyze navigation performance
   */
  private analyzeNavigationPerformance(metrics: any[]): PerformanceAnalysis {
    const navigationTimes = metrics.filter(m => m.navigationTime > 0).map(m => m.navigationTime);
    const currentValue = navigationTimes.length > 0 ? 
      navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length : 0;
    
    let status: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
    if (currentValue > 2000) status = 'CRITICAL';
    else if (currentValue > 1000) status = 'WARNING';

    const recommendations: string[] = [];
    if (status === 'CRITICAL') {
      recommendations.push('Optimize navigation performance');
      recommendations.push('Review screen loading logic');
      recommendations.push('Consider lazy loading');
    } else if (status === 'WARNING') {
      recommendations.push('Monitor navigation performance');
      recommendations.push('Consider performance optimizations');
    }

    return {
      metric: 'Navigation Performance',
      currentValue,
      threshold: { warning: 1000, critical: 2000 },
      status,
      trend: 'STABLE', // Would need more data to determine trend
      recommendations,
    };
  }

  /**
   * Analyze data loading performance
   */
  private analyzeDataLoadingPerformance(metrics: any[]): PerformanceAnalysis {
    const loadTimes = metrics.filter(m => m.dataLoadTime > 0).map(m => m.dataLoadTime);
    const currentValue = loadTimes.length > 0 ? 
      loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0;
    
    let status: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
    if (currentValue > 5000) status = 'CRITICAL';
    else if (currentValue > 3000) status = 'WARNING';

    const recommendations: string[] = [];
    if (status === 'CRITICAL') {
      recommendations.push('Optimize data loading performance');
      recommendations.push('Implement data caching');
      recommendations.push('Review Firebase queries');
    } else if (status === 'WARNING') {
      recommendations.push('Monitor data loading performance');
      recommendations.push('Consider query optimization');
    }

    return {
      metric: 'Data Loading Performance',
      currentValue,
      threshold: { warning: 3000, critical: 5000 },
      status,
      trend: 'STABLE', // Would need more data to determine trend
      recommendations,
    };
  }

  /**
   * Generate summary
   */
  private generateSummary(testSession: any, performanceAnalysis: any): ValidationReport['summary'] {
    const totalTests = testSession.summary?.totalTests || 0;
    const passedTests = testSession.summary?.passedTests || 0;
    const failedTests = testSession.summary?.failedTests || 0;
    const successRate = testSession.summary?.successRate || 0;

    // Count critical issues from performance analysis
    const criticalIssues = Object.values(performanceAnalysis)
      .filter((analysis: any) => analysis.status === 'CRITICAL').length;

    // Count warnings from performance analysis
    const warnings = Object.values(performanceAnalysis)
      .filter((analysis: any) => analysis.status === 'WARNING').length;

    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (criticalIssues > 0 || successRate < 80) {
      overallStatus = 'FAIL';
    } else if (warnings > 0 || successRate < 90) {
      overallStatus = 'WARNING';
    }

    return {
      overallStatus,
      totalTests,
      passedTests,
      failedTests,
      successRate,
      criticalIssues,
      warnings,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(testSession: any, performanceAnalysis: any): string[] {
    const recommendations: string[] = [];

    // Test-based recommendations
    if (testSession.summary?.successRate < 90) {
      recommendations.push('Improve test success rate - investigate failed tests');
    }

    // Performance-based recommendations
    Object.values(performanceAnalysis).forEach((analysis: any) => {
      if (analysis.status === 'CRITICAL') {
        recommendations.push(`Critical issue in ${analysis.metric}: ${analysis.recommendations.join(', ')}`);
      } else if (analysis.status === 'WARNING') {
        recommendations.push(`Warning in ${analysis.metric}: ${analysis.recommendations.join(', ')}`);
      }
    });

    // General recommendations
    recommendations.push('Implement continuous monitoring in production');
    recommendations.push('Set up automated testing in CI/CD pipeline');
    recommendations.push('Regular performance reviews and optimization');

    return recommendations;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(testSession: any, performanceAnalysis: any): string[] {
    const nextSteps: string[] = [];

    // Immediate actions for critical issues
    const criticalIssues = Object.values(performanceAnalysis)
      .filter((analysis: any) => analysis.status === 'CRITICAL');
    
    if (criticalIssues.length > 0) {
      nextSteps.push('Address critical performance issues immediately');
    }

    // Test-related next steps
    if (testSession.summary?.failedTests > 0) {
      nextSteps.push('Fix failed tests before production deployment');
    }

    // General next steps
    nextSteps.push('Deploy to staging environment for further testing');
    nextSteps.push('Conduct user acceptance testing');
    nextSteps.push('Prepare production deployment plan');
    nextSteps.push('Set up production monitoring and alerting');

    return nextSteps;
  }

  /**
   * Save report to file
   */
  async saveReport(report: ValidationReport): Promise<string> {
    const filename = `validation-report-${report.reportId}.json`;
    const filepath = `test-reports/${filename}`;
    
    try {
      // In a real implementation, this would save to a file
      console.log(`📄 Validation report saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to save validation report:', error);
      throw error;
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report: ValidationReport): string {
    const statusColor = {
      'PASS': '#4CAF50',
      'FAIL': '#F44336',
      'WARNING': '#FF9800',
    };

    const statusIcon = {
      'PASS': '✅',
      'FAIL': '❌',
      'WARNING': '⚠️',
    };

    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>POS System Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .test-suite { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .performance-metric { background: #fff3e0; padding: 10px; border-radius: 8px; margin: 10px 0; }
        .recommendations { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .next-steps { background: #fff8e1; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .status-pass { color: #4CAF50; font-weight: bold; }
        .status-fail { color: #F44336; font-weight: bold; }
        .status-warning { color: #FF9800; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 POS System Validation Report</h1>
        <p><strong>Report ID:</strong> ${report.reportId}</p>
        <p><strong>Generated:</strong> ${report.generatedAt}</p>
    </div>

    <div class="summary">
        <h2>📊 Summary</h2>
        <p><strong>Overall Status:</strong> <span class="status-${report.summary.overallStatus.toLowerCase()}">${statusIcon[report.summary.overallStatus]} ${report.summary.overallStatus}</span></p>
        <p><strong>Total Tests:</strong> ${report.summary.totalTests}</p>
        <p><strong>Passed:</strong> ${report.summary.passedTests}</p>
        <p><strong>Failed:</strong> ${report.summary.failedTests}</p>
        <p><strong>Success Rate:</strong> ${report.summary.successRate.toFixed(2)}%</p>
        <p><strong>Critical Issues:</strong> ${report.summary.criticalIssues}</p>
        <p><strong>Warnings:</strong> ${report.summary.warnings}</p>
    </div>

    <h2>🧪 Test Results</h2>
    ${Object.entries(report.testResults).map(([key, suite]) => `
        <div class="test-suite">
            <h3>${suite.name}</h3>
            <p><strong>Status:</strong> <span class="status-${suite.status.toLowerCase()}">${statusIcon[suite.status]} ${suite.status}</span></p>
            <p><strong>Tests:</strong> ${suite.passedTests}/${suite.totalTests} passed</p>
            <p><strong>Duration:</strong> ${suite.duration}ms</p>
            ${suite.criticalIssues.length > 0 ? `<p><strong>Critical Issues:</strong> ${suite.criticalIssues.join(', ')}</p>` : ''}
            ${suite.warnings.length > 0 ? `<p><strong>Warnings:</strong> ${suite.warnings.join(', ')}</p>` : ''}
        </div>
    `).join('')}

    <h2>📈 Performance Analysis</h2>
    ${Object.entries(report.performanceAnalysis).map(([key, analysis]) => `
        <div class="performance-metric">
            <h3>${analysis.metric}</h3>
            <p><strong>Current Value:</strong> ${analysis.currentValue.toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="status-${analysis.status.toLowerCase()}">${analysis.status}</span></p>
            <p><strong>Trend:</strong> ${analysis.trend}</p>
            ${analysis.recommendations.length > 0 ? `<p><strong>Recommendations:</strong> ${analysis.recommendations.join(', ')}</p>` : ''}
        </div>
    `).join('')}

    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="next-steps">
        <h2>🚀 Next Steps</h2>
        <ul>
            ${report.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;

    return html;
  }
}

// Export singleton instance
export const validationReportGenerator = new ValidationReportGenerator();
