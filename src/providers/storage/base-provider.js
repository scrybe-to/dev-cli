import fs from 'fs';
import path from 'path';

/**
 * Base Storage Provider - Abstract interface for storage operations
 *
 * All storage providers (Filesystem, S3, MinIO) inherit from this class
 * and implement the required methods.
 */
export class BaseStorageProvider {
  constructor(config, fullConfig, executor) {
    if (new.target === BaseStorageProvider) {
      throw new Error('BaseStorageProvider is abstract and cannot be instantiated directly');
    }

    this.config = config;
    this.fullConfig = fullConfig;
    this.executor = executor;
  }

  /**
   * Get provider name
   *
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Check if storage is available and properly configured
   *
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * List files in a path/bucket
   *
   * @param {string} remotePath - Path to list (relative to root/bucket)
   * @param {Object} options - List options
   * @returns {Promise<Object[]>} Array of file/directory objects
   */
  async list(remotePath = '', options = {}) {
    throw new Error('list() must be implemented by subclass');
  }

  /**
   * Upload a file
   *
   * @param {string} localPath - Local file path
   * @param {string} remotePath - Remote destination path
   * @param {Object} options - Upload options
   * @returns {Promise<void>}
   */
  async upload(localPath, remotePath, options = {}) {
    throw new Error('upload() must be implemented by subclass');
  }

  /**
   * Download a file
   *
   * @param {string} remotePath - Remote file path
   * @param {string} localPath - Local destination path
   * @param {Object} options - Download options
   * @returns {Promise<void>}
   */
  async download(remotePath, localPath, options = {}) {
    throw new Error('download() must be implemented by subclass');
  }

  /**
   * Delete a file or directory
   *
   * @param {string} remotePath - Remote path to delete
   * @param {Object} options - Delete options
   * @returns {Promise<void>}
   */
  async delete(remotePath, options = {}) {
    throw new Error('delete() must be implemented by subclass');
  }

  /**
   * Copy a file
   *
   * @param {string} sourcePath - Source path
   * @param {string} destPath - Destination path
   * @param {Object} options - Copy options
   * @returns {Promise<void>}
   */
  async copy(sourcePath, destPath, options = {}) {
    throw new Error('copy() must be implemented by subclass');
  }

  /**
   * Move/rename a file
   *
   * @param {string} sourcePath - Source path
   * @param {string} destPath - Destination path
   * @param {Object} options - Move options
   * @returns {Promise<void>}
   */
  async move(sourcePath, destPath, options = {}) {
    throw new Error('move() must be implemented by subclass');
  }

  /**
   * Check if a file/path exists
   *
   * @param {string} remotePath - Path to check
   * @returns {Promise<boolean>}
   */
  async exists(remotePath) {
    throw new Error('exists() must be implemented by subclass');
  }

  /**
   * Get file/path information (size, modified date, etc.)
   *
   * @param {string} remotePath - Path to get info for
   * @returns {Promise<Object>}
   */
  async stat(remotePath) {
    throw new Error('stat() must be implemented by subclass');
  }

  /**
   * Create a directory
   *
   * @param {string} remotePath - Directory path to create
   * @param {Object} options - Create options
   * @returns {Promise<void>}
   */
  async mkdir(remotePath, options = {}) {
    throw new Error('mkdir() must be implemented by subclass');
  }

  /**
   * Get storage usage information
   *
   * @returns {Promise<{used: number, total: number, formatted: string}>}
   */
  async getUsage() {
    throw new Error('getUsage() must be implemented by subclass');
  }

  /**
   * Get the base path for this storage
   *
   * @returns {string}
   */
  getBasePath() {
    throw new Error('getBasePath() must be implemented by subclass');
  }

  /**
   * Get the backup directory path
   *
   * @returns {string}
   */
  getBackupPath() {
    const backupPath = this.config.filesystem?.backupPath ||
                       this.config.backupPath ||
                       './backups';
    const projectRoot = this.fullConfig.paths?.projectRoot || process.cwd();

    return path.isAbsolute(backupPath)
      ? backupPath
      : path.join(projectRoot, backupPath);
  }

  /**
   * Get the snapshot directory path
   *
   * @returns {string}
   */
  getSnapshotPath() {
    const snapshotPath = this.config.filesystem?.snapshotPath ||
                         this.config.snapshotPath ||
                         './snapshots';
    const projectRoot = this.fullConfig.paths?.projectRoot || process.cwd();

    return path.isAbsolute(snapshotPath)
      ? snapshotPath
      : path.join(projectRoot, snapshotPath);
  }

  /**
   * Ensure a local directory exists
   *
   * @param {string} dirPath - Directory path
   */
  ensureLocalDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Format bytes to human readable string
   *
   * @param {number} bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
