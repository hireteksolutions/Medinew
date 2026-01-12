import { useState, useEffect } from 'react';
import { patientService, fileService } from '../../services/api';
import { useLoader } from '../../context/LoaderContext';
import { format } from 'date-fns';
import { 
  FileText, 
  Download, 
  Upload, 
  X, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Eye,
  FileIcon,
  Calendar,
  User,
  Loader2,
  FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DOCUMENT_TYPES } from '../../constants';
import Pagination from '../../components/common/Pagination';

interface MedicalRecord {
  _id: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  description?: string;
  doctorId?: {
    firstName: string;
    lastName: string;
    specialization?: string;
  };
  appointmentId?: any;
  createdAt: string;
  uploadedAt?: string;
  fileId?: string;
  file?: {
    size?: number;
    mimeType?: string;
    originalName?: string;
  };
}

export default function MedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { showLoader, hideLoader } = useLoader();

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    page: 1,
    pages: 0
  });

  const [formData, setFormData] = useState({
    file: null as File | null,
    documentType: '',
    description: '',
    appointmentId: '',
    doctorId: '',
  });

  const [formErrors, setFormErrors] = useState({
    file: '',
    documentType: '',
  });

  useEffect(() => {
    fetchRecords();
  }, [offset]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      showLoader('Loading medical records...');
      const params: any = {
        offset: offset,
        limit: limit
      };
      const response = await patientService.getMedicalRecords(params);
      const recordsData = response.data?.records || response.data || [];
      setRecords(Array.isArray(recordsData) ? recordsData : []);
      
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load medical records');
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return `File size exceeds 10MB limit. Selected file is ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, DOC, DOCX, JPG, PNG, or GIF files only.';
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file);
      
      if (error) {
        setFormErrors({ ...formErrors, file: error });
        toast.error(error);
        e.target.value = ''; // Reset input
        setSelectedFile(null);
        setFormData({ ...formData, file: null });
        return;
      }

      setFormErrors({ ...formErrors, file: '' });
      setSelectedFile(file);
      setFormData({ ...formData, file });
      toast.success(`File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, {
        icon: '✅',
        duration: 3000
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors = { file: '', documentType: '' };
    let hasErrors = false;

    if (!formData.file) {
      errors.file = 'Please select a file to upload';
      hasErrors = true;
    }

    if (!formData.documentType) {
      errors.documentType = 'Please select a document type';
      hasErrors = true;
    }

    if (hasErrors) {
      setFormErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      setFormErrors({ file: '', documentType: '' });
      setUploadProgress('Validating file...');
      
      // Validate file again
      if (formData.file) {
        const error = validateFile(formData.file);
        if (error) {
          setFormErrors({ ...formErrors, file: error });
          toast.error(error);
          return;
        }
      }

      setUploadProgress('Uploading file to secure storage...');
      showLoader('Uploading medical record...');

      // Upload the file first
      const fileResponse = await fileService.upload(formData.file!, {
        relatedEntityType: 'medical-record',
      });

      const fileData = fileResponse.data.file;
      const fileId = fileData.id;
      const uploadedFileUrl = fileData.signedUrl || fileData.fileUrl || fileData.publicUrl;

      setUploadProgress('Creating medical record...');

      // Then create the medical record
      await patientService.uploadMedicalRecord({
        fileId,
        documentType: formData.documentType,
        description: formData.description || undefined,
        appointmentId: formData.appointmentId || undefined,
        doctorId: formData.doctorId || undefined,
      });

      setUploadProgress('');
      
      toast.success(
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div>
            <div className="font-semibold">Medical record uploaded successfully!</div>
            <div className="text-sm text-gray-600">File: {formData.file!.name}</div>
          </div>
        </div>,
        { duration: 5000 }
      );

      // Reset form
      setShowUploadForm(false);
      setFormData({
        file: null,
        documentType: '',
        description: '',
        appointmentId: '',
        doctorId: '',
      });
      setSelectedFile(null);
      setFormErrors({ file: '', documentType: '' });
      
      // Refresh records
      await fetchRecords();
    } catch (error: any) {
      setUploadProgress('');
      
      const errorMessage = error.response?.data?.message || 'Failed to upload medical record';
      toast.error(
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <div className="font-semibold">Upload failed</div>
            <div className="text-sm text-gray-600">{errorMessage}</div>
          </div>
        </div>,
        { duration: 5000 }
      );
    } finally {
      setUploading(false);
      hideLoader();
      setUploadProgress('');
    }
  };

  const handleDelete = async (record: MedicalRecord) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.fileName}"?\n\n` +
      `This action will permanently remove the medical record and associated file from the system.\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(record._id);
      showLoader('Deleting medical record and file...');

      // Delete the medical record (backend should handle file deletion)
      await patientService.deleteMedicalRecord(record._id);

      toast.success(
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div>
            <div className="font-semibold">Medical record deleted successfully</div>
            <div className="text-sm text-gray-600">"{record.fileName}" has been removed</div>
          </div>
        </div>,
        { duration: 4000 }
      );

      // Refresh records
      await fetchRecords();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete medical record';
      toast.error(
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <div className="font-semibold">Delete failed</div>
            <div className="text-sm text-gray-600">{errorMessage}</div>
          </div>
        </div>,
        { duration: 5000 }
      );
    } finally {
      setDeletingId(null);
      hideLoader();
    }
  };

  const handleDownload = async (record: MedicalRecord) => {
    try {
      // Try to open file URL directly (works for public buckets or signed URLs)
      if (record.fileUrl) {
        window.open(record.fileUrl, '_blank');
        toast.success('Opening file...', { duration: 2000 });
      } else {
        toast.error('File URL not available');
      }
    } catch (error: any) {
      toast.error('Failed to download file. Please try again.');
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      [DOCUMENT_TYPES.PRESCRIPTION]: 'bg-blue-100 text-blue-700 border-blue-200',
      [DOCUMENT_TYPES.LAB_REPORT]: 'bg-green-100 text-green-700 border-green-200',
      [DOCUMENT_TYPES.XRAY]: 'bg-purple-100 text-purple-700 border-purple-200',
      [DOCUMENT_TYPES.SCAN]: 'bg-orange-100 text-orange-700 border-orange-200',
      [DOCUMENT_TYPES.OTHER]: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[type] || colors[DOCUMENT_TYPES.OTHER];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and organize your medical documents and reports
          </p>
        </div>
        <button
          onClick={() => {
            setShowUploadForm(!showUploadForm);
            if (showUploadForm) {
              // Reset form when closing
              setFormData({
                file: null,
                documentType: '',
                description: '',
                appointmentId: '',
                doctorId: '',
              });
              setSelectedFile(null);
              setFormErrors({ file: '', documentType: '' });
            }
          }}
          className="btn-primary flex items-center space-x-2 px-6 py-3"
          disabled={uploading}
        >
          {showUploadForm ? (
            <>
              <X className="w-5 h-5" />
              <span>Cancel Upload</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>Upload Record</span>
            </>
          )}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="card border-2 border-primary-200 bg-gradient-to-br from-white to-primary-50/30">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Upload className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Medical Record</h2>
              <p className="text-sm text-gray-600">Add a new medical document to your records</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Document Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => {
                  setFormData({ ...formData, documentType: e.target.value });
                  setFormErrors({ ...formErrors, documentType: '' });
                }}
                className={`input-field ${formErrors.documentType ? 'border-red-500' : ''}`}
                required
              >
                <option value="">Select document type</option>
                <option value={DOCUMENT_TYPES.PRESCRIPTION}>Prescription</option>
                <option value={DOCUMENT_TYPES.LAB_REPORT}>Lab Report</option>
                <option value={DOCUMENT_TYPES.XRAY}>X-Ray</option>
                <option value={DOCUMENT_TYPES.SCAN}>Scan (CT, MRI, etc.)</option>
                <option value={DOCUMENT_TYPES.OTHER}>Other</option>
              </select>
              {formErrors.documentType && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formErrors.documentType}</span>
                </p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                File <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (PDF, DOC, DOCX, JPG, PNG, GIF - Max 10MB)
                </span>
              </label>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors hover:border-primary-400 hover:bg-primary-50/50 bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {selectedFile ? (
                      <>
                        <FileCheck className="w-10 h-10 text-primary-500 mb-2" />
                        <p className="mb-1 text-sm font-semibold text-gray-700">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG, GIF (MAX. 10MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    required
                    disabled={uploading}
                  />
                </label>
              </div>
              {formErrors.file && (
                <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formErrors.file}</span>
                </p>
              )}
              {selectedFile && !formErrors.file && (
                <p className="mt-2 text-sm text-green-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>File ready to upload</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Add any additional notes, dates, or context about this record..."
                disabled={uploading}
              />
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm text-blue-700 font-medium">{uploadProgress}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex space-x-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={uploading || !formData.file || !formData.documentType}
                className="btn-primary flex items-center space-x-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload Record</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  setFormData({
                    file: null,
                    documentType: '',
                    description: '',
                    appointmentId: '',
                    doctorId: '',
                  });
                  setSelectedFile(null);
                  setFormErrors({ file: '', documentType: '' });
                }}
                className="btn-secondary px-6 py-3"
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      {loading ? (
        <div className="card text-center py-12">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading medical records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-16 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Medical Records Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Start building your medical history by uploading your first record. Keep all your important documents in one secure place.
            </p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="btn-primary inline-flex items-center space-x-2 px-6 py-3"
            >
              <Plus className="w-5 h-5" />
              <span>Upload Your First Record</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Medical Records ({pagination.total || records.length})
              </h3>
              <div className="text-sm text-gray-600">
                Showing {offset + 1} - {Math.min(offset + limit, pagination.total || records.length)} of {pagination.total || records.length}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-primary-100 rounded-lg">
                            <FileIcon className="w-5 h-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {record.fileName}
                          </div>
                          {record.file?.size && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatFileSize(record.file.size)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded text-xs font-semibold border ${getDocumentTypeColor(record.documentType)}`}>
                        {record.documentType.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {record.description ? (
                          <p className="truncate" title={record.description}>
                            {record.description}
                          </p>
                        ) : (
                          <span className="text-gray-400 italic">No description</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.doctorId ? (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            Dr. {record.doctorId.firstName} {record.doctorId.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {format(new Date(record.createdAt || record.uploadedAt || Date.now()), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDownload(record)}
                          className="inline-flex items-center space-x-1 px-3 py-2 text-sm text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => handleDelete(record)}
                          disabled={deletingId === record._id}
                          className="inline-flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete record"
                        >
                          {deletingId === record._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Pagination */}
      {!loading && records.length > 0 && pagination.total > 0 && (
        <div className="flex justify-center">
          <Pagination
            total={pagination.total}
            limit={pagination.limit || limit}
            offset={pagination.offset || offset}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
