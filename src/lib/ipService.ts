import path from 'path';
import { promises as fs } from 'fs';
import { AzureFileMetadata } from '../types/azure';

// Directory paths - using single source of truth in public directory
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

/**
 * Get file metadata information
 */
export async function getFileMetadata(): Promise<AzureFileMetadata[]> {
  try {
    const metadataPath = path.join(DATA_DIR, 'file-metadata.json');
    const fileContent = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(fileContent) as AzureFileMetadata[];
  } catch (error) {
    throw new Error(`Failed to load file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}