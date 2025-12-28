import { useState, useEffect } from 'react';
import { patientService, fileService } from '../../services/api';
import { useLoader } from '../../context/LoaderContext';
import { format } from 'date-fns';
import { FileText, Download, Upload, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { DOCUMENT_TYPES } from '../../constants';
import Pagination from '../../components/common/Pagination';

export default function MedicalRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      // Handle paginated response structure: { records: [...], pagination: {...} }
      const recordsData = response.data?.records || response.data || [];
      setRecords(Array.isArray(recordsData) ? recordsData : []);
      
      // Update pagination state
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      console.error('Error fetching records:', error);
      toast.error(error.response?.data?.message || 'Failed to load medical records');
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file) {
      toast.error('Please select a file');
      return;
    }

    if (!formData.documentType) {
      toast.error('Please select document type');
      return;
    }

    try {
      setUploading(true);
      showLoader('Uploading medical record...');

      // First upload the file
      const fileResponse = await fileService.upload(formData.file, {
        relatedEntityType: 'medical-record',
      });

      const fileId = fileResponse.data.file.id;

      // Then create the medical record
      await patientService.uploadMedicalRecord({
        fileId,
        documentType: formData.documentType,
        description: formData.description,
        appointmentId: formData.appointmentId || undefined,
        doctorId: formData.doctorId || undefined,
      });

      toast.success('Medical record uploaded successfully');
      setShowUploadForm(false);
      setFormData({
        file: null,
        documentType: '',
        description: '',
        appointmentId: '',
        doctorId: '',
      });
      fetchRecords();
    } catch (error: any) {
      console.error('Error uploading record:', error);
      toast.error(error.response?.data?.message || 'Failed to upload medical record');
    } finally {
      setUploading(false);
      hideLoader();
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this medical record?')) {
      return;
    }

    try {
      showLoader('Deleting medical record...');
      await patientService.deleteMedicalRecord(recordId);
      toast.success('Medical record deleted successfully');
      fetchRecords();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast.error(error.response?.data?.message || 'Failed to delete medical record');
    } finally {
      hideLoader();
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Medical Records</h1>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="btn-primary flex items-center space-x-2"
        >
          {showUploadForm ? (
            <>
              <X className="w-5 h-5" />
              <span>Cancel</span>
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
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Medical Record</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select document type</option>
                <option value={DOCUMENT_TYPES.PRESCRIPTION}>Prescription</option>
                <option value={DOCUMENT_TYPES.LAB_REPORT}>Lab Report</option>
                <option value={DOCUMENT_TYPES.XRAY}>X-Ray</option>
                <option value={DOCUMENT_TYPES.SCAN}>Scan</option>
                <option value={DOCUMENT_TYPES.OTHER}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="input-field"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
              />
              {formData.file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Add any additional notes or description..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary flex items-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : 'Upload Record'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="btn-secondary"
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records List */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No medical records found</p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Your First Record</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <FileText className="w-6 h-6 text-primary-500" />
                    <h3 className="text-xl font-semibold">{record.fileName}</h3>
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {record.documentType}
                    </span>
                  </div>
                  <div className="space-y-2 text-gray-600">
                    {record.description && (
                      <p>
                        <strong>Description:</strong> {record.description}
                      </p>
                    )}
                    {record.doctorId && (
                      <p>
                        <strong>Doctor:</strong> {record.doctorId.firstName} {record.doctorId.lastName}
                      </p>
                    )}
                    <p>
                      <strong>Uploaded:</strong> {format(new Date(record.createdAt || record.uploadedAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <a
                    href={record.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => handleDelete(record._id)}
                    className="btn-danger flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {!loading && records.length > 0 && pagination.total > 0 && (
        <div className="mt-6">
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
