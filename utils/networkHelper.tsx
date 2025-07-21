import { Alert, Platform } from 'react-native';
import axios from 'axios';

interface NetworkTest {
  name: string;
  url: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

export class NetworkHelper {
  
  static async testConnectivity(baseUrl: string): Promise<NetworkTest[]> {
    const tests: NetworkTest[] = [];
    
    // Test basic connectivity
    const basicTest: NetworkTest = {
      name: 'Basic Connectivity',
      url: baseUrl,
      success: false,
    };
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${baseUrl}/health`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      const endTime = Date.now();
      
      basicTest.success = response.status === 200;
      basicTest.responseTime = endTime - startTime;
    } catch (error: any) {
      basicTest.success = false;
      basicTest.error = error.message || 'Unknown error';
    }
    
    tests.push(basicTest);
    
    // Test leaves endpoint
    const leavesTest: NetworkTest = {
      name: 'Leaves Endpoint',
      url: `${baseUrl}/leaves/`,
      success: false,
    };
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${baseUrl}/leaves/`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      const endTime = Date.now();
      
      leavesTest.success = response.status === 200;
      leavesTest.responseTime = endTime - startTime;
    } catch (error: any) {
      leavesTest.success = false;
      leavesTest.error = error.message || 'Unknown error';
    }
    
    tests.push(leavesTest);
    
    // Test complaints endpoint
    const complaintsTest: NetworkTest = {
      name: 'Complaints Endpoint',
      url: `${baseUrl}/complaints`,
      success: false,
    };
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${baseUrl}/complaints`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      const endTime = Date.now();
      
      complaintsTest.success = response.status === 200;
      complaintsTest.responseTime = endTime - startTime;
    } catch (error: any) {
      complaintsTest.success = false;
      complaintsTest.error = error.message || 'Unknown error';
    }
    
    tests.push(complaintsTest);
    
    return tests;
  }
  
  static async showNetworkDiagnostics(baseUrl: string): Promise<void> {
    Alert.alert(
      'Network Diagnostics',
      'Testing network connectivity...',
      [{ text: 'OK' }]
    );
    
    try {
      const tests = await this.testConnectivity(baseUrl);
      
      let report = `Platform: ${Platform.OS}\n`;
      report += `Base URL: ${baseUrl}\n\n`;
      
      tests.forEach(test => {
        report += `${test.name}:\n`;
        report += `  Status: ${test.success ? '✅ Success' : '❌ Failed'}\n`;
        report += `  URL: ${test.url}\n`;
        
        if (test.responseTime) {
          report += `  Response Time: ${test.responseTime}ms\n`;
        }
        
        if (test.error) {
          report += `  Error: ${test.error}\n`;
        }
        
        report += '\n';
      });
      
      Alert.alert(
        'Network Diagnostics Results',
        report,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      Alert.alert(
        'Diagnostic Error',
        `Failed to run network diagnostics: ${error}`,
        [{ text: 'OK' }]
      );
    }
  }
  
  static getNetworkTroubleshootingTips(): string[] {
    return [
      '1. Ensure your mobile device is connected to the same network as the server',
      '2. Check if the server IP address (192.168.1.26) is correct',
      '3. Verify the server is running and accessible on port 8080',
      '4. Try using ngrok for development (ngrok http 8080)',
      '5. Check firewall settings on the server',
      '6. Ensure the mobile device can ping the server IP',
      '7. Consider using HTTPS instead of HTTP',
      '8. Check for any corporate network restrictions',
    ];
  }
}
