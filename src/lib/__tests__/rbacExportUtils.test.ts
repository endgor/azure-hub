import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRoleExportFilename, exportRolesToCSV, exportRolesToJSON } from '../rbacExportUtils';
import type { AzureRole } from '@/types/rbac';
import * as downloadUtils from '../downloadUtils';

// Mock downloadUtils
vi.mock('../downloadUtils', () => ({
  downloadFile: vi.fn(),
  downloadJSON: vi.fn(),
  downloadExcel: vi.fn(),
}));

describe('rbacExportUtils', () => {
  const mockRoles: AzureRole[] = [
    {
      id: '/providers/Microsoft.Authorization/roleDefinitions/test-role-1',
      roleName: 'Test Role 1',
      type: 'Microsoft.Authorization/roleDefinitions',
      description: 'Test role description',
      roleType: 'BuiltInRole',
      permissions: [
        {
          actions: ['Microsoft.Storage/storageAccounts/read', 'Microsoft.Storage/storageAccounts/write'],
          notActions: ['Microsoft.Storage/storageAccounts/delete'],
          dataActions: ['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'],
          notDataActions: [],
        },
      ],
      assignableScopes: ['/'],
    },
    {
      id: '/providers/Microsoft.Authorization/roleDefinitions/test-role-2',
      roleName: 'Test Role 2',
      type: 'Microsoft.Authorization/roleDefinitions',
      description: 'Another test role',
      roleType: 'CustomRole',
      permissions: [
        {
          actions: ['Microsoft.Compute/virtualMachines/read'],
          notActions: [],
          dataActions: [],
          notDataActions: [],
        },
      ],
      assignableScopes: ['/subscriptions/test-sub'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRoleExportFilename', () => {
    it('should generate filename for single role', () => {
      const filename = generateRoleExportFilename(1);
      // Includes prefix: azure-rbac_COUNT_role/roles_DATE.json
      expect(filename).toMatch(/^azure-rbac_1_role_\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should generate filename for multiple roles', () => {
      const filename = generateRoleExportFilename(5);
      expect(filename).toMatch(/^azure-rbac_5_roles_\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should handle zero roles', () => {
      const filename = generateRoleExportFilename(0);
      expect(filename).toMatch(/^azure-rbac_0_roles_\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('exportRolesToCSV', () => {
    it('should generate CSV with headers and data', () => {
      exportRolesToCSV(mockRoles, 'test.csv');

      expect(downloadUtils.downloadFile).toHaveBeenCalledOnce();
      const [csvContent, filename, mimeType] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];

      expect(filename).toBe('test.csv');
      expect(mimeType).toBe('text/csv;charset=utf-8;');

      // Check CSV headers
      expect(csvContent).toContain('Role Name');
      expect(csvContent).toContain('Role Type');
      expect(csvContent).toContain('Description');
      expect(csvContent).toContain('Permission Type');
      expect(csvContent).toContain('Permission');

      // Check role data
      expect(csvContent).toContain('Test Role 1');
      expect(csvContent).toContain('Built-in');
      expect(csvContent).toContain('Microsoft.Storage/storageAccounts/read');
      expect(csvContent).toContain('Action');
      expect(csvContent).toContain('Not Action');
      expect(csvContent).toContain('Data Action');
    });

    it('should escape quotes in CSV values', () => {
      const roleWithQuotes: AzureRole[] = [
        {
          ...mockRoles[0],
          description: 'Role with "quoted" text',
        },
      ];

      exportRolesToCSV(roleWithQuotes, 'test.csv');

      const [csvContent] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];
      expect(csvContent).toContain('Role with ""quoted"" text');
    });

    it('should handle empty role array', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      exportRolesToCSV([], 'test.csv');

      expect(consoleWarnSpy).toHaveBeenCalledWith('No roles to export');
      expect(downloadUtils.downloadFile).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should include all permission types in CSV', () => {
      exportRolesToCSV(mockRoles, 'test.csv');

      const [csvContent] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];

      // Verify all permission types are present
      expect(csvContent).toContain('"Action"');
      expect(csvContent).toContain('"Not Action"');
      expect(csvContent).toContain('"Data Action"');
    });
  });

  describe('exportRolesToJSON', () => {
    it('should export single role as object', () => {
      exportRolesToJSON([mockRoles[0]], 'test.json');

      expect(downloadUtils.downloadFile).toHaveBeenCalledOnce();
      const [jsonContent, filename, mimeType] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];

      expect(filename).toBe('test.json');
      expect(mimeType).toBe('application/json');

      const parsed = JSON.parse(jsonContent as string);
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('properties');
      expect(parsed.properties.roleName).toBe('Test Role 1');
      expect(parsed.properties.permissions).toHaveLength(1);
    });

    it('should export multiple roles as array', () => {
      exportRolesToJSON(mockRoles, 'test.json');

      const [jsonContent] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];
      const parsed = JSON.parse(jsonContent as string);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].properties.roleName).toBe('Test Role 1');
      expect(parsed[1].properties.roleName).toBe('Test Role 2');
    });

    it('should format JSON with indentation', () => {
      exportRolesToJSON([mockRoles[0]], 'test.json');

      const [jsonContent] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];

      // Check that JSON is prettified (contains newlines and spaces)
      expect(jsonContent).toContain('\n');
      expect(jsonContent).toContain('  '); // 2-space indentation
    });

    it('should handle empty role array', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      exportRolesToJSON([], 'test.json');

      expect(consoleWarnSpy).toHaveBeenCalledWith('No roles to export');
      expect(downloadUtils.downloadFile).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should include all role properties in Azure format', () => {
      exportRolesToJSON([mockRoles[0]], 'test.json');

      const [jsonContent] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];
      const parsed = JSON.parse(jsonContent as string);

      expect(parsed.id).toBe('/providers/Microsoft.Authorization/roleDefinitions/test-role-1');
      expect(parsed.properties).toHaveProperty('roleName');
      expect(parsed.properties).toHaveProperty('description');
      expect(parsed.properties).toHaveProperty('assignableScopes');
      expect(parsed.properties).toHaveProperty('permissions');

      const permission = parsed.properties.permissions[0];
      expect(permission).toHaveProperty('actions');
      expect(permission).toHaveProperty('notActions');
      expect(permission).toHaveProperty('dataActions');
      expect(permission).toHaveProperty('notDataActions');
    });

    it('should handle roles with missing optional fields', () => {
      const minimalRole: AzureRole = {
        id: 'test-id',
        roleName: 'Minimal Role',
        type: 'Microsoft.Authorization/roleDefinitions',
        roleType: 'BuiltInRole',
        permissions: [
          {
            actions: ['*'],
            notActions: [],
            dataActions: [],
            notDataActions: [],
          },
        ],
      };

      exportRolesToJSON([minimalRole], 'test.json');

      const [jsonContent] = vi.mocked(downloadUtils.downloadFile).mock.calls[0];
      const parsed = JSON.parse(jsonContent as string);

      expect(parsed.properties.description).toBe('');
      expect(parsed.properties.assignableScopes).toEqual(['/']);
    });
  });
});
