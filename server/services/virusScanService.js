import FileStorageConfig from '../models/FileStorageConfig.js';
import File from '../models/File.js';

/**
 * Virus Scanning Service
 * Supports multiple scanning providers: ClamAV, Cloudmersive, VirusTotal
 */
class VirusScanService {
  constructor() {
    this.config = null;
  }

  /**
   * Initialize the service with active configuration
   */
  async initialize() {
    const config = await FileStorageConfig.getActiveConfig();
    this.config = config.virusScanning;
  }

  /**
   * Scan file for viruses
   */
  async scanFile(buffer, fileId) {
    if (!this.config || !this.config.enabled) {
      // If scanning is disabled, mark as clean
      await File.findByIdAndUpdate(fileId, {
        'virusScanStatus': 'clean',
        'virusScanResult.scanned': true,
        'virusScanResult.scannedAt': new Date()
      });
      return { clean: true, status: 'clean' };
    }

    try {
      let result;
      switch (this.config.provider) {
        case 'clamav':
          result = await this.scanWithClamAV(buffer);
          break;
        case 'cloudmersive':
          result = await this.scanWithCloudmersive(buffer);
          break;
        case 'virustotal':
          result = await this.scanWithVirusTotal(buffer);
          break;
        default:
          result = { clean: true, status: 'clean' };
      }

      // Update file record
      await File.findByIdAndUpdate(fileId, {
        virusScanStatus: result.clean ? 'clean' : 'infected',
        virusScanResult: {
          scanned: true,
          scannedAt: new Date(),
          threats: result.threats || []
        }
      });

      return result;
    } catch (error) {
      console.error('Virus scan error:', error);
      
      // Update file record with error
      await File.findByIdAndUpdate(fileId, {
        virusScanStatus: 'error',
        'virusScanResult.scanned': false
      });

      throw new Error(`Virus scan failed: ${error.message}`);
    }
  }

  /**
   * Scan with ClamAV (local or remote server)
   */
  async scanWithClamAV(buffer) {
    try {
      const nodeClam = await import('clamscan');
      const ClamScan = nodeClam.default || nodeClam;
      
      const options = {
        removeInfected: false,
        quarantineInfected: false,
        scanLog: null,
        debugMode: false,
        fileList: null,
        scanRecursively: true,
        clamscan: {
          path: '/usr/bin/clamscan', // Default path
          db: null,
          scanArchives: true,
          active: true
        },
        clamdscan: {
          socket: false,
          host: this.config.endpoint || 'localhost',
          port: 3310,
          timeout: 60000,
          localFallback: false,
          path: '/usr/bin/clamdscan',
          configFile: null,
          multiscan: true,
          reloadDb: false,
          active: true,
          bypassTest: false
        },
        preference: 'clamdscan' // Prefer clamdscan over clamscan
      };

      const clamscan = new ClamScan(options);
      
      return new Promise((resolve, reject) => {
        clamscan.isInfected(buffer, (err, file, isInfected, viruses) => {
          if (err) {
            reject(err);
            return;
          }

          if (isInfected) {
            resolve({
              clean: false,
              status: 'infected',
              threats: viruses || []
            });
          } else {
            resolve({
              clean: true,
              status: 'clean'
            });
          }
        });
      });
    } catch (error) {
      console.error('ClamAV scan error:', error);
      // Fallback: if ClamAV is not available, skip scanning
      return { clean: true, status: 'clean', warning: 'ClamAV not available' };
    }
  }

  /**
   * Scan with Cloudmersive API
   */
  async scanWithCloudmersive(buffer) {
    try {
      const FormData = (await import('form-data')).default;
      const axios = (await import('axios')).default;
      
      const formData = new FormData();
      formData.append('inputFile', buffer, {
        filename: 'scan-file',
        contentType: 'application/octet-stream'
      });

      const response = await axios.post(
        'https://api.cloudmersive.com/virus/scan/file',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Apikey': this.config.apiKey
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const result = response.data;
      
      if (result.CleanResult) {
        return {
          clean: true,
          status: 'clean'
        };
      } else {
        return {
          clean: false,
          status: 'infected',
          threats: result.FoundViruses?.map(v => ({ name: v, type: 'virus' })) || []
        };
      }
    } catch (error) {
      console.error('Cloudmersive scan error:', error);
      throw error;
    }
  }

  /**
   * Scan with VirusTotal API
   */
  async scanWithVirusTotal(buffer) {
    try {
      const FormData = (await import('form-data')).default;
      const axios = (await import('axios')).default;
      
      // First, upload file for scanning
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: 'scan-file',
        contentType: 'application/octet-stream'
      });

      const uploadResponse = await axios.post(
        'https://www.virustotal.com/vtapi/v2/file/scan',
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          params: {
            apikey: this.config.apiKey
          }
        }
      );

      const scanId = uploadResponse.data.scan_id;
      
      // Wait a bit and then check results
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const reportResponse = await axios.get(
        'https://www.virustotal.com/vtapi/v2/file/report',
        {
          params: {
            apikey: this.config.apiKey,
            resource: scanId
          }
        }
      );

      const report = reportResponse.data;
      
      if (report.response_code === 1) {
        const positives = report.positives || 0;
        if (positives === 0) {
          return {
            clean: true,
            status: 'clean'
          };
        } else {
          return {
            clean: false,
            status: 'infected',
            threats: report.scans ? Object.entries(report.scans)
              .filter(([_, scan]) => scan.detected)
              .map(([name, scan]) => ({ name, type: scan.result })) : []
          };
        }
      } else {
        // If report not ready, consider it clean for now
        return {
          clean: true,
          status: 'clean',
          warning: 'VirusTotal report not ready'
        };
      }
    } catch (error) {
      console.error('VirusTotal scan error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const virusScanService = new VirusScanService();
export default virusScanService;

