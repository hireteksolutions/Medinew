import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { appointmentService, doctorService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DASHBOARD_ROUTES, DATE_CONSTANTS, TOAST_MESSAGES } from '../constants';
import toast from 'react-hot-toast';
import { format, addDays, isAfter, startOfDay } from 'date-fns';
import { ChevronRight, ChevronLeft, Calendar, Clock, User, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import DatePickerComponent from '../components/common/DatePicker';

const appointmentSchema = z.object({
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentDate: z.string().min(1, 'Date is required'),
  timeSlot: z.object({
    start: z.string(),
    end: z.string(),
  }),
  reasonForVisit: z.string().min(5, 'Reason must be at least 5 characters'),
  symptoms: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function BookAppointment() {
  const { doctorId: paramDoctorId } = useParams<{ doctorId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      doctorId: paramDoctorId || '',
    },
  });

  const watchedDoctorId = watch('doctorId');
  const watchedDate = watch('appointmentDate');

  useEffect(() => {
    if (paramDoctorId) {
      fetchDoctorDetails(paramDoctorId);
      setValue('doctorId', paramDoctorId);
    } else {
      fetchDoctors();
    }
  }, [paramDoctorId]);

  useEffect(() => {
    if (watchedDoctorId) {
      fetchDoctorDetails(watchedDoctorId);
    }
  }, [watchedDoctorId]);

  useEffect(() => {
    if (watchedDoctorId && watchedDate) {
      fetchAvailableSlots(watchedDoctorId, watchedDate);
      setSelectedDate(watchedDate);
    }
  }, [watchedDate, watchedDoctorId]);

  const fetchDoctors = async () => {
    try {
      const response = await doctorService.getAll();
      setDoctors(response.data);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_DOCTORS_FAILED);
    }
  };

  const fetchDoctorDetails = async (id: string) => {
    try {
      const response = await doctorService.getById(id);
      setSelectedDoctor(response.data.doctor);
    } catch (error) {
      toast.error(TOAST_MESSAGES.LOADING_DOCTOR_DETAILS_FAILED);
    }
  };

  const fetchAvailableSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      return;
    }
    
    setLoadingSlots(true);
    try {
      const response = await appointmentService.getAvailableSlots(doctorId, date);
      setAvailableSlots(response.data.slots || []);
      if (response.data.slots && response.data.slots.length === 0) {
        toast.error('No available time slots for this date. Please select another date.');
      }
    } catch (error: any) {
      setAvailableSlots([]);
      toast.error(error.response?.data?.message || 'Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < DATE_CONSTANTS.APPOINTMENT_ADVANCE_DAYS; i++) {
      const date = addDays(today, i);
      dates.push(date);
    }
    return dates;
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!user) {
      toast.error(TOAST_MESSAGES.LOGIN_REQUIRED);
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      await appointmentService.create(data);
      toast.success(TOAST_MESSAGES.APPOINTMENT_BOOKED_SUCCESS);
      navigate(DASHBOARD_ROUTES.PATIENT.BASE);
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.APPOINTMENT_BOOK_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (step === 1 && !watchedDoctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (step === 2 && !watchedDate) {
      toast.error('Please select a date');
      return;
    }
    if (step === 3) {
      const selectedTimeSlot = watch('timeSlot');
      if (!selectedTimeSlot || !selectedTimeSlot.start || !selectedTimeSlot.end) {
        toast.error('Please select a time slot');
        return;
      }
    }
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold mb-8">Book Appointment</h1>

        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="hidden sm:flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="hidden sm:flex justify-between mt-2 text-xs sm:text-sm text-gray-600">
            <span className="text-center flex-1">Doctor</span>
            <span className="text-center flex-1">Date</span>
            <span className="text-center flex-1">Time</span>
            <span className="text-center flex-1">Details</span>
            <span className="text-center flex-1">Confirm</span>
          </div>
          {/* Mobile Progress Indicator */}
          <div className="sm:hidden flex items-center justify-center space-x-2 mb-4">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    step >= s
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-600 ml-4">Step {step} of 5</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card">
          {/* Step 1: Select Doctor */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <User className="w-6 h-6 mr-2" />
                Select Doctor
              </h2>
              {paramDoctorId ? (
                selectedDoctor && (
                  <div className="border rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-4">
                      {selectedDoctor.userId.profileImage ? (
                        <img
                          src={selectedDoctor.userId.profileImage}
                          alt={selectedDoctor.userId.firstName}
                          className="w-16 h-16 rounded-full"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl">
                          {selectedDoctor.userId.firstName[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">
                          Dr. {selectedDoctor.userId.firstName} {selectedDoctor.userId.lastName}
                        </h3>
                        <p className="text-primary-500">{selectedDoctor.specialization}</p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <select
                  {...register('doctorId')}
                  className="input-field mb-4"
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor.userId._id}>
                      Dr. {doctor.userId.firstName} {doctor.userId.lastName} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              )}
              {errors.doctorId && (
                <p className="text-danger-500 mb-4">{errors.doctorId.message}</p>
              )}
            </div>
          )}

          {/* Step 2: Select Date */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-2" />
                Select Date
              </h2>
              <div className="mb-4">
                <DatePickerComponent
                  selected={watchedDate ? new Date(watchedDate) : null}
                  onChange={(date) => {
                    if (date) {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      setValue('appointmentDate', dateStr);
                      setSelectedDate(dateStr);
                    }
                  }}
                  placeholderText="Select appointment date"
                  dateFormat="MM/dd/yyyy"
                  minDate={new Date()}
                  filterDate={(date) => {
                    // Only allow dates that are in the available dates range
                    const availableDates = getAvailableDates();
                    return availableDates.some(availDate => 
                      format(availDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                    );
                  }}
                  className="input-field"
                  required
                />
              </div>
              {errors.appointmentDate && (
                <p className="text-danger-500">{errors.appointmentDate.message}</p>
              )}
            </div>
          )}

          {/* Step 3: Select Time */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-semibold mb-2 flex items-center">
                <Clock className="w-6 h-6 mr-2" />
                Select Time Slot
              </h2>
              {watchedDate && (
                <p className="text-gray-600 mb-6">
                  Available time slots for {format(new Date(watchedDate), 'MMMM d, yyyy')}
                </p>
              )}
              
              {!watchedDoctorId || !watchedDate ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800">
                    Please select a doctor and date first to view available time slots.
                  </p>
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                  <span className="ml-4 text-gray-600">Loading available time slots...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-2">No available time slots</p>
                  <p className="text-gray-500 text-sm">
                    There are no available time slots for this date. Please select another date.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    {availableSlots.length} time slot{availableSlots.length !== 1 ? 's' : ''} available
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {availableSlots.map((slot, index) => {
                      const isSelected = watch('timeSlot.start') === slot.start && 
                                       watch('timeSlot.end') === slot.end;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setValue('timeSlot', slot, { shouldValidate: true });
                            toast.success(`Time slot ${slot.start} - ${slot.end} selected`);
                          }}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            isSelected
                              ? 'bg-primary-500 text-white border-primary-500 shadow-lg transform scale-105'
                              : 'bg-white border-gray-300 hover:border-primary-500 hover:bg-primary-50 hover:shadow-md'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <Clock className={`w-5 h-5 mb-1 ${isSelected ? 'text-white' : 'text-primary-500'}`} />
                            <span className="font-semibold text-sm sm:text-base">
                              {slot.start}
                            </span>
                            <span className="text-xs opacity-75">to</span>
                            <span className="font-semibold text-sm sm:text-base">
                              {slot.end}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {watch('timeSlot.start') && (
                    <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                      <p className="text-sm text-primary-800">
                        <strong>Selected:</strong> {watch('timeSlot.start')} - {watch('timeSlot.end')}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {errors.timeSlot && (
                <p className="text-danger-500 mt-4">{errors.timeSlot.message}</p>
              )}
            </div>
          )}

          {/* Step 4: Patient Details */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                Appointment Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Visit *
                  </label>
                  <textarea
                    {...register('reasonForVisit')}
                    rows={4}
                    className="input-field"
                    placeholder="Describe the reason for your visit..."
                  />
                  {errors.reasonForVisit && (
                    <p className="text-danger-500 mt-1">{errors.reasonForVisit.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Symptoms (Optional)
                  </label>
                  <textarea
                    {...register('symptoms')}
                    rows={4}
                    className="input-field"
                    placeholder="Describe any symptoms you're experiencing..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <CheckCircle className="w-6 h-6 mr-2" />
                Confirm Appointment
              </h2>
              {selectedDoctor && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Doctor</h3>
                    <p>
                      Dr. {selectedDoctor.userId.firstName} {selectedDoctor.userId.lastName}
                    </p>
                    <p className="text-primary-500">{selectedDoctor.specialization}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Date & Time</h3>
                    <p>{watchedDate && format(new Date(watchedDate), 'MMMM d, yyyy')}</p>
                    <p>
                      {watch('timeSlot.start')} - {watch('timeSlot.end')}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Reason</h3>
                    <p>{watch('reasonForVisit')}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Consultation Fee</h3>
                    <p className="text-2xl font-bold text-primary-500">
                      ₹{selectedDoctor.consultationFee}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 sm:mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary flex items-center"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Booking...' : 'Confirm Appointment'}
              </button>
            )}
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}

