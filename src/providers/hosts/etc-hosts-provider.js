import fs from 'fs';
import os from 'os';
import { BaseHostsProvider } from './base-provider.js';

/**
 * /etc/hosts Provider
 *
 * Manages host entries in the system hosts file (/etc/hosts on Unix,
 * C:\Windows\System32\drivers\etc\hosts on Windows).
 */
export class EtcHostsProvider extends BaseHostsProvider {
  constructor(config, fullConfig, executor) {
    super(config, fullConfig, executor);

    // Marker comments for identifying entries managed by this tool
    this.startMarker = '# >>> dev-cli managed hosts';
    this.endMarker = '# <<< dev-cli managed hosts';
  }

  /**
   * Get provider name
   */
  getName() {
    return 'etc-hosts';
  }

  /**
   * Get the path to the hosts file based on OS
   */
  getHostsFilePath() {
    if (os.platform() === 'win32') {
      return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    }
    return '/etc/hosts';
  }

  /**
   * Check if we can read and potentially write to the hosts file
   */
  async isAvailable() {
    const hostsPath = this.getHostsFilePath();

    try {
      // Check if file exists and is readable
      fs.accessSync(hostsPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if we have write access (requires sudo on Unix)
   */
  async hasWriteAccess() {
    const hostsPath = this.getHostsFilePath();

    try {
      fs.accessSync(hostsPath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read the current hosts file content
   */
  readHostsFile() {
    const hostsPath = this.getHostsFilePath();
    return fs.readFileSync(hostsPath, 'utf-8');
  }

  /**
   * Write content to the hosts file (requires elevated privileges)
   */
  async writeHostsFile(content) {
    const hostsPath = this.getHostsFilePath();

    // Try direct write first
    if (await this.hasWriteAccess()) {
      fs.writeFileSync(hostsPath, content);
      return;
    }

    // Need elevated privileges
    if (os.platform() === 'win32') {
      throw new Error(
        'Cannot write to hosts file. Please run as Administrator.'
      );
    }

    // On Unix, use sudo via executor
    const tempFile = `/tmp/hosts-${Date.now()}`;
    fs.writeFileSync(tempFile, content);

    try {
      await this.executor.run('sudo', ['cp', tempFile, hostsPath], {
        interactive: true,
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Parse the hosts file into entries
   */
  parseHostsFile(content) {
    const entries = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse: IP hostname [aliases...]
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const ip = parts[0];
        const hostnames = parts.slice(1);

        for (const hostname of hostnames) {
          entries.push({ ip, hostname });
        }
      }
    }

    return entries;
  }

  /**
   * Get the managed section of the hosts file
   */
  getManagedSection(content) {
    const startIndex = content.indexOf(this.startMarker);
    const endIndex = content.indexOf(this.endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    return {
      before: content.substring(0, startIndex),
      managed: content.substring(startIndex, endIndex + this.endMarker.length),
      after: content.substring(endIndex + this.endMarker.length),
    };
  }

  /**
   * Build the managed hosts section
   */
  buildManagedSection(entries, ip) {
    const lines = [this.startMarker];

    for (const hostname of entries) {
      lines.push(`${ip}\t${hostname}`);
    }

    lines.push(this.endMarker);
    return lines.join('\n');
  }

  /**
   * Add host entries
   */
  async addEntries(hosts = null, ip = null) {
    const hostnames = hosts || this.entries;
    const targetIP = ip || this.ip;

    if (hostnames.length === 0) {
      return { added: [], skipped: [] };
    }

    // Validate entries
    for (const hostname of hostnames) {
      if (!this.isValidHostname(hostname)) {
        throw new Error(`Invalid hostname: ${hostname}`);
      }
    }

    if (!this.isValidIP(targetIP)) {
      throw new Error(`Invalid IP address: ${targetIP}`);
    }

    const content = this.readHostsFile();
    const existingEntries = this.parseHostsFile(content);

    // Find which hosts already exist
    const added = [];
    const skipped = [];

    for (const hostname of hostnames) {
      const exists = existingEntries.some(
        e => e.hostname === hostname && e.ip === targetIP
      );

      if (exists) {
        skipped.push(hostname);
      } else {
        added.push(hostname);
      }
    }

    if (added.length === 0) {
      return { added, skipped };
    }

    // Build new hosts file content
    const sections = this.getManagedSection(content);
    let newContent;

    if (sections) {
      // Update existing managed section
      const existingManaged = sections.managed
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('#');
        })
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[1]; // hostname
        })
        .filter(Boolean);

      const allEntries = [...new Set([...existingManaged, ...added])];
      const managedSection = this.buildManagedSection(allEntries, targetIP);

      newContent = sections.before + managedSection + sections.after;
    } else {
      // Create new managed section
      const managedSection = this.buildManagedSection(added, targetIP);
      newContent = content.trimEnd() + '\n\n' + managedSection + '\n';
    }

    await this.writeHostsFile(newContent);

    return { added, skipped };
  }

  /**
   * Remove host entries
   */
  async removeEntries(hosts) {
    if (!hosts || hosts.length === 0) {
      return { removed: [], notFound: [] };
    }

    const content = this.readHostsFile();
    const sections = this.getManagedSection(content);

    if (!sections) {
      return { removed: [], notFound: hosts };
    }

    // Parse managed entries
    const managedLines = sections.managed.split('\n');
    const removed = [];
    const notFound = [];
    const remainingLines = [];

    for (const line of managedLines) {
      const trimmed = line.trim();

      // Keep marker lines
      if (trimmed.startsWith('#')) {
        remainingLines.push(line);
        continue;
      }

      // Check if this line should be removed
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const hostname = parts[1];

        if (hosts.includes(hostname)) {
          removed.push(hostname);
        } else {
          remainingLines.push(line);
        }
      }
    }

    // Find hosts that weren't in the managed section
    for (const hostname of hosts) {
      if (!removed.includes(hostname)) {
        notFound.push(hostname);
      }
    }

    // Build new content
    const newManagedSection = remainingLines.join('\n');

    // If only markers remain, remove the whole section
    const hasEntries = remainingLines.some(
      line => !line.trim().startsWith('#') && line.trim()
    );

    let newContent;
    if (hasEntries) {
      newContent = sections.before + newManagedSection + sections.after;
    } else {
      // Remove the empty managed section entirely
      newContent = sections.before.trimEnd() + sections.after;
    }

    await this.writeHostsFile(newContent);

    return { removed, notFound };
  }

  /**
   * Check which entries exist
   */
  async checkEntries(hosts = null) {
    const hostnames = hosts || this.entries;

    if (hostnames.length === 0) {
      return { present: [], missing: [] };
    }

    const content = this.readHostsFile();
    const entries = this.parseHostsFile(content);

    const present = [];
    const missing = [];

    for (const hostname of hostnames) {
      const exists = entries.some(e => e.hostname === hostname);

      if (exists) {
        present.push(hostname);
      } else {
        missing.push(hostname);
      }
    }

    return { present, missing };
  }

  /**
   * List all managed entries
   */
  async listEntries() {
    const content = this.readHostsFile();
    const sections = this.getManagedSection(content);

    if (!sections) {
      return [];
    }

    const entries = [];
    const lines = sections.managed.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip markers and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        entries.push({
          ip: parts[0],
          hostname: parts[1],
        });
      }
    }

    return entries;
  }
}
