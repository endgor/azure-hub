import { describe, it, expect } from 'vitest';
import { prepareDataForExport, generateFilename } from '../exportUtils';
import type { AzureIpAddress } from '@/types/azure';

describe('exportUtils', () => {
  describe('prepareDataForExport', () => {
    it('should transform Azure IP data into export format', () => {
      const mockData: AzureIpAddress[] = [
        {
          serviceTagId: 'Storage',
          ipAddressPrefix: '20.60.0.0/24',
          region: 'eastus',
          systemService: 'AzureStorage',
          networkFeatures: 'API,ServiceEndpoints',
        },
        {
          serviceTagId: 'Compute',
          ipAddressPrefix: '20.61.0.0/24',
          region: 'westus',
          systemService: 'AzureCompute',
          networkFeatures: 'API',
        },
      ];

      const result = prepareDataForExport(mockData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        'Service Tag': 'Storage',
        'IP Range': '20.60.0.0/24',
        Region: 'eastus',
        'System Service': 'AzureStorage',
        'Network Features': 'API,ServiceEndpoints',
      });
      expect(result[1]).toEqual({
        'Service Tag': 'Compute',
        'IP Range': '20.61.0.0/24',
        Region: 'westus',
        'System Service': 'AzureCompute',
        'Network Features': 'API',
      });
    });

    it('should handle missing optional fields', () => {
      const mockData: AzureIpAddress[] = [
        {
          serviceTagId: 'Storage',
          ipAddressPrefix: '20.60.0.0/24',
        },
      ];

      const result = prepareDataForExport(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        'Service Tag': 'Storage',
        'IP Range': '20.60.0.0/24',
        Region: '',
        'System Service': '',
        'Network Features': '',
      });
    });

    it('should handle empty arrays', () => {
      const result = prepareDataForExport([]);
      expect(result).toEqual([]);
    });
  });

  describe('generateFilename', () => {
    it('should generate filename for CSV format', () => {
      const filename = generateFilename('192.168.1.0', 'csv');
      expect(filename).toMatch(/^azure-ip-ranges_192_168_1_0_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should generate filename for XLSX format', () => {
      const filename = generateFilename('192.168.1.0', 'xlsx');
      expect(filename).toMatch(/^azure-ip-ranges_192_168_1_0_\d{4}-\d{2}-\d{2}\.xlsx$/);
    });

    it('should sanitize special characters in query', () => {
      const filename = generateFilename('192.168.1.0/24', 'csv');
      expect(filename).not.toContain('/');
      expect(filename).toMatch(/192_168_1_0_24/);
    });

    it('should handle empty query string', () => {
      const filename = generateFilename('', 'csv');
      // Empty query results in double underscore: azure-ip-ranges__DATE.csv
      expect(filename).toMatch(/^azure-ip-ranges__\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });
});
