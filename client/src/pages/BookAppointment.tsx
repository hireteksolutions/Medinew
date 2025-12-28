import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { appointmentService, doctorService, patientService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DASHBOARD_ROUTES, DATE_CONSTANTS, TOAST_MESSAGES } from '../constants';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  CheckCircle, 
  ArrowLeft, 
  CreditCard, 
  IndianRupee, 
  History, 
  Stethoscope, 
  Pill, 
  ChevronDown, 
  Star,
  MapPin,
  Award,
  Sparkles
} from 'lucide-react';
import DatePickerComponent from '../components/common/DatePicker';
import DiseaseCheckboxes from '../components/common/DiseaseCheckboxes';
import BMICalculator from '../components/common/BMICalculator';
import { CommonDiseaseId } from '../constants/diseases';

const appointmentSchema = z.object({
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentDate: z.string().min(1, 'Date is required'),
  timeSlot: z.object({
    start: z.string(),
    end: z.string(),
  }),
  reasonForVisit: z.string().min(5, 'Reason must be at least 5 characters'),
  symptoms: z.string().optional(),
  paymentGateway: z.enum(['online', 'offline'], {
    required_error: 'Please select a payment method',
  }),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const steps = [
  { number: 1, title: 'Select Doctor', icon: User },
  { number: 2, title: 'Select Date', icon: Calendar },
  { number: 3, title: 'Select Time', icon: Clock },
  { number: 4, title: 'Appointment Details', icon: FileText },
  { number: 5, title: 'Confirm', icon: CheckCircle },
];

export default function BookAppointment() {
  const { doctorId: paramDoctorId } = useParams<{ doctorId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDiseases, setSelectedDiseases] = useState<CommonDiseaseId[]>([]);
  const [height, setHeight] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [consultationHistory, setConsultationHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
  const [isFollowUp, setIsFollowUp] = useState<boolean>(false);
  const [previousAppointmentId, setPreviousAppointmentId] = useState<string | null>(null);

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

  useEffect(() => {
    if (user && step === 4) {
      fetchConsultationHistory();
    }
  }, [user, step]);

  useEffect(() => {
    const prevAppointmentId = searchParams.get('previousAppointmentId');
    const followUp = searchParams.get('isFollowUp') === 'true';
    
    setPreviousAppointmentId(prevAppointmentId);
    setIsFollowUp(followUp);
    
    if (prevAppointmentId && followUp && user) {
      fetchConsultationDetails(prevAppointmentId);
    }
  }, [searchParams, user]);

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
      let slots = response.data.slots || [];
      
      const selectedDateObj = new Date(date);
      const today = new Date();
      const isToday = selectedDateObj.toDateString() === today.toDateString();
      
      if (isToday) {
        const currentTime = today.getHours() * 60 + today.getMinutes();
        slots = slots.filter((slot: any) => {
          const [hours, minutes] = slot.start.split(':').map(Number);
          const slotTime = hours * 60 + minutes;
          return slotTime > currentTime;
        });
      }
      
      setAvailableSlots(slots);
      if (slots.length === 0) {
        if (isToday) {
          toast.error('No available time slots remaining for today. Please select another date.');
        } else {
          toast.error('No available time slots for this date. Please select another date.');
        }
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

  const fetchConsultationHistory = async () => {
    if (!user) return;
    
    try {
      setLoadingHistory(true);
      const response = await patientService.getConsultationHistory({ limit: 5, offset: 0 });
      const consultations = response.data?.consultations || response.data || [];
      setConsultationHistory(Array.isArray(consultations) ? consultations : []);
    } catch (error: any) {
      console.error('Error fetching consultation history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchConsultationDetails = async (appointmentId: string) => {
    try {
      const response = await patientService.getConsultationDetails(appointmentId);
      const consultation = response.data?.consultation;
      if (consultation) {
        if (consultation.reasonForVisit) {
          setValue('reasonForVisit', `Follow-up: ${consultation.reasonForVisit}`);
        }
        if (consultation.symptoms) {
          setValue('symptoms', consultation.symptoms);
        }
      }
    } catch (error) {
      console.error('Error fetching consultation details:', error);
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!user) {
      toast.error(TOAST_MESSAGES.LOGIN_REQUIRED);
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      let calculatedBMI = 0;
      if (height > 0 && weight > 0) {
        const heightInMeters = height / 100;
        calculatedBMI = weight / (heightInMeters * heightInMeters);
      }

      const appointmentData = {
        ...data,
        selectedDiseases: selectedDiseases,
        height: height > 0 ? height : undefined,
        weight: weight > 0 ? weight : undefined,
        bmi: calculatedBMI > 0 ? parseFloat(calculatedBMI.toFixed(1)) : undefined,
        isFollowUp: isFollowUp || undefined,
        previousAppointmentId: previousAppointmentId || undefined,
      };

      const response = await appointmentService.create(appointmentData);
      toast.success(TOAST_MESSAGES.APPOINTMENT_BOOKED_SUCCESS);
      const appointmentId = response.data.appointment?._id || response.data.appointment?.id;
      if (appointmentId) {
        if (data.paymentGateway === 'online') {
          navigate(`/payment/${appointmentId}`);
        } else {
          navigate(DASHBOARD_ROUTES.PATIENT.BASE);
        }
      } else {
        navigate(DASHBOARD_ROUTES.PATIENT.BASE);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || TOAST_MESSAGES.APPOINTMENT_BOOK_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
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
    if (step === 4) {
      const reasonForVisit = watch('reasonForVisit');
      if (!reasonForVisit || reasonForVisit.trim().length < 5) {
        toast.error('Please provide a reason for visit (at least 5 characters)');
        return;
      }
    }
    if (step === 5) {
      const paymentGateway = watch('paymentGateway');
      if (!paymentGateway) {
        toast.error('Please select a payment method');
        return;
      }
    }
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            Book Your Appointment
          </h1>
          <p className="text-lg text-gray-600">
            Simple steps to schedule your consultation
          </p>
        </div>

        {/* Progress Steps - Modern Design */}
        <div className="mb-10">
          <div className="hidden md:flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
            {steps.map((stepItem, index) => {
              const Icon = stepItem.icon;
              const isActive = step >= stepItem.number;
              const isCurrent = step === stepItem.number;
              return (
                <div key={stepItem.number} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                      isActive
                        ? isCurrent
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/50 scale-110'
                          : 'bg-primary-500 text-white shadow-md'
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    }`}
                  >
                    {isActive ? (
                      <Icon className="w-6 h-6" />
                    ) : (
                      <span>{stepItem.number}</span>
                    )}
                  </div>
                  <span
                    className={`mt-3 text-xs font-medium transition-colors ${
                      isActive ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  >
                    {stepItem.title}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Mobile Progress */}
          <div className="md:hidden flex items-center justify-center space-x-2 mb-4">
            {steps.map((stepItem) => {
              const isActive = step >= stepItem.number;
              return (
                <div
                  key={stepItem.number}
                  className={`h-2 rounded-full transition-all ${
                    isActive ? 'bg-primary-500 w-8' : 'bg-gray-300 w-2'
                  }`}
                />
              );
            })}
          </div>
          <div className="md:hidden text-center">
            <span className="text-sm font-medium text-gray-600">
              Step {step} of {steps.length}: {steps[step - 1].title}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Step 1: Select Doctor */}
            {step === 1 && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mr-4">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Select Doctor</h2>
                    <p className="text-gray-600">Choose your preferred healthcare provider</p>
                  </div>
                </div>

                {paramDoctorId ? (
                  selectedDoctor && (
                    <div className="bg-gradient-to-br from-primary-50 to-indigo-50 rounded-xl p-6 border-2 border-primary-200 mb-6">
                      <div className="flex items-start space-x-4">
                        {selectedDoctor.userId.profileImage ? (
                          <img
                            src={selectedDoctor.userId.profileImage}
                            alt={selectedDoctor.userId.firstName}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                            {selectedDoctor.userId.firstName[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-900 mb-1">
                            Dr. {selectedDoctor.userId.firstName} {selectedDoctor.userId.lastName}
                          </h3>
                          <p className="text-primary-600 font-semibold mb-2">{selectedDoctor.specialization}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{selectedDoctor.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="w-4 h-4 text-primary-500" />
                              <span>{selectedDoctor.experience} years exp.</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <IndianRupee className="w-4 h-4 text-green-600" />
                              <span className="font-semibold text-green-600">₹{selectedDoctor.consultationFee}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {doctors.map((doctor) => {
                      const isSelected = watchedDoctorId === doctor.userId._id;
                      return (
                        <button
                          key={doctor._id}
                          type="button"
                          onClick={() => {
                            setValue('doctorId', doctor.userId._id);
                            fetchDoctorDetails(doctor.userId._id);
                          }}
                          className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-indigo-50 shadow-lg scale-[1.02]'
                              : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            {doctor.userId.profileImage ? (
                              <img
                                src={doctor.userId.profileImage}
                                alt={doctor.userId.firstName}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-md">
                                {doctor.userId.firstName[0]}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-lg text-gray-900">
                                  Dr. {doctor.userId.firstName} {doctor.userId.lastName}
                                </h3>
                                {isSelected && (
                                  <CheckCircle className="w-6 h-6 text-primary-500" />
                                )}
                              </div>
                              <p className="text-primary-600 font-medium mb-2">{doctor.specialization}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span>{doctor.rating?.toFixed(1) || 'N/A'}</span>
                                </div>
                                <span>•</span>
                                <span>{doctor.experience} years</span>
                                <span>•</span>
                                <span className="font-semibold text-green-600">₹{doctor.consultationFee}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.doctorId && (
                  <p className="text-red-500 mt-4 text-sm font-medium">{errors.doctorId.message}</p>
                )}
              </div>
            )}

            {/* Step 2: Select Date */}
            {step === 2 && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mr-4">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Select Date</h2>
                    <p className="text-gray-600">Choose your preferred appointment date</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
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
                      const availableDates = getAvailableDates();
                      return availableDates.some(availDate => 
                        format(availDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      );
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                    required
                  />
                  {watchedDate && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-primary-200">
                      <p className="text-sm text-gray-600 mb-1">Selected Date</p>
                      <p className="text-lg font-semibold text-primary-600">
                        {format(new Date(watchedDate), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
                {errors.appointmentDate && (
                  <p className="text-red-500 mt-4 text-sm font-medium">{errors.appointmentDate.message}</p>
                )}
              </div>
            )}

            {/* Step 3: Select Time Slot */}
            {step === 3 && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mr-4">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Select Time Slot</h2>
                    <p className="text-gray-600">
                      {watchedDate 
                        ? `Available slots for ${format(new Date(watchedDate), 'MMMM d, yyyy')}`
                        : 'Choose your preferred time'}
                    </p>
                  </div>
                </div>

                {!watchedDoctorId || !watchedDate ? (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                    <p className="text-yellow-800 font-medium">
                      Please select a doctor and date first to view available time slots.
                    </p>
                  </div>
                ) : loadingSlots ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500 mb-4"></div>
                    <span className="text-gray-600 font-medium">Loading available time slots...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-8 text-center">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-700 font-semibold text-lg mb-2">No available time slots</p>
                    <p className="text-gray-500">
                      There are no available time slots for this date. Please select another date.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-800">
                        <Sparkles className="w-4 h-4 inline mr-2" />
                        {availableSlots.length} time slot{availableSlots.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {availableSlots.map((slot, index) => {
                        const isSelected = watch('timeSlot.start') === slot.start && 
                                         watch('timeSlot.end') === slot.end;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setValue('timeSlot', slot, { shouldValidate: true });
                            }}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                              isSelected
                                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white border-primary-500 shadow-lg scale-105'
                                : 'bg-white border-gray-300 hover:border-primary-400 hover:bg-primary-50 hover:shadow-md'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <Clock className={`w-5 h-5 mb-2 ${isSelected ? 'text-white' : 'text-primary-500'}`} />
                              <span className="font-bold text-base">
                                {slot.start}
                              </span>
                              <span className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                                to {slot.end}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {watch('timeSlot.start') && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-indigo-50 rounded-xl border-2 border-primary-200">
                        <p className="text-sm text-gray-600 mb-1">Selected Time Slot</p>
                        <p className="text-lg font-bold text-primary-600">
                          {watch('timeSlot.start')} - {watch('timeSlot.end')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {errors.timeSlot && (
                  <p className="text-red-500 mt-4 text-sm font-medium">{errors.timeSlot.message}</p>
                )}
              </div>
            )}

            {/* Step 4: Appointment Details */}
            {step === 4 && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mr-4">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
                    <p className="text-gray-600">Tell us about your visit</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Consultation History */}
                  {user && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                      <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <History className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">Your Consultation History</h3>
                            <p className="text-sm text-gray-600">
                              {consultationHistory.length > 0 
                                ? `${consultationHistory.length} previous consultation${consultationHistory.length !== 1 ? 's' : ''} found`
                                : 'View your past consultations'}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                      </button>

                      {showHistory && (
                        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                          {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                            </div>
                          ) : consultationHistory.length === 0 ? (
                            <div className="text-center py-6">
                              <History className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600">No previous consultations found</p>
                            </div>
                          ) : (
                            consultationHistory.map((consultation) => (
                              <div
                                key={consultation._id}
                                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                                    {consultation.doctorId?.firstName?.[0] || 'D'}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">
                                      Dr. {consultation.doctorId?.firstName} {consultation.doctorId?.lastName}
                                    </h4>
                                    <p className="text-sm text-blue-600 mb-2">{consultation.doctorId?.specialization}</p>
                                    <p className="text-xs text-gray-500 mb-3">
                                      {format(new Date(consultation.appointmentDate), 'MMM d, yyyy')}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (consultation.reasonForVisit) {
                                          setValue('reasonForVisit', `Follow-up: ${consultation.reasonForVisit}`);
                                        }
                                        if (consultation.symptoms) {
                                          setValue('symptoms', consultation.symptoms);
                                        }
                                        toast.success('Consultation details copied to form');
                                      }}
                                      className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                      Use This Information
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for Visit <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('reasonForVisit')}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="Describe the reason for your visit..."
                    />
                    {errors.reasonForVisit && (
                      <p className="text-red-500 mt-2 text-sm">{errors.reasonForVisit.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Symptoms (Optional)
                    </label>
                    <textarea
                      {...register('symptoms')}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder="Describe any symptoms you're experiencing..."
                    />
                  </div>

                  <BMICalculator
                    height={height}
                    weight={weight}
                    onHeightChange={setHeight}
                    onWeightChange={setWeight}
                  />

                  <DiseaseCheckboxes
                    selectedDiseases={selectedDiseases}
                    onChange={setSelectedDiseases}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Confirm & Payment */}
            {step === 5 && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mr-4">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Confirm Appointment</h2>
                    <p className="text-gray-600">Review and select payment method</p>
                  </div>
                </div>

                {/* Appointment Summary */}
                {selectedDoctor && (
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200 mb-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                      <Sparkles className="w-5 h-5 text-primary-500 mr-2" />
                      Appointment Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-white rounded-lg">
                        <User className="w-5 h-5 text-primary-500 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Doctor</p>
                          <p className="font-semibold text-gray-900">
                            Dr. {selectedDoctor.userId.firstName} {selectedDoctor.userId.lastName}
                          </p>
                          <p className="text-sm text-primary-600">{selectedDoctor.specialization}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-white rounded-lg">
                        <Calendar className="w-5 h-5 text-primary-500 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                          <p className="font-semibold text-gray-900">
                            {watchedDate && format(new Date(watchedDate), 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-700">
                            {watch('timeSlot.start')} - {watch('timeSlot.end')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-white rounded-lg">
                        <FileText className="w-5 h-5 text-primary-500 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Reason</p>
                          <p className="font-semibold text-gray-900">{watch('reasonForVisit')}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg text-white">
                        <span className="font-semibold">Consultation Fee</span>
                        <span className="text-2xl font-bold flex items-center gap-1">
                          <IndianRupee className="w-6 h-6" />
                          {selectedDoctor.consultationFee}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method Selection */}
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-4">Select Payment Method</h3>
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('paymentGateway', 'online', { shouldValidate: true });
                      }}
                      className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                        watch('paymentGateway') === 'online'
                          ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-indigo-50 shadow-lg'
                          : 'border-gray-300 bg-white hover:border-primary-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                            watch('paymentGateway') === 'online'
                              ? 'bg-gradient-to-br from-primary-500 to-primary-600'
                              : 'bg-gray-200'
                          }`}>
                            <CreditCard className={`w-7 h-7 ${
                              watch('paymentGateway') === 'online' ? 'text-white' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-gray-900">Pay Online</h4>
                            <p className="text-sm text-gray-600">Credit/Debit card, UPI, or wallet</p>
                          </div>
                        </div>
                        {watch('paymentGateway') === 'online' && (
                          <CheckCircle className="w-6 h-6 text-primary-500" />
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setValue('paymentGateway', 'offline', { shouldValidate: true });
                      }}
                      className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                        watch('paymentGateway') === 'offline'
                          ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-indigo-50 shadow-lg'
                          : 'border-gray-300 bg-white hover:border-primary-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                            watch('paymentGateway') === 'offline'
                              ? 'bg-gradient-to-br from-primary-500 to-primary-600'
                              : 'bg-gray-200'
                          }`}>
                            <IndianRupee className={`w-7 h-7 ${
                              watch('paymentGateway') === 'offline' ? 'text-white' : 'text-gray-600'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-gray-900">Pay at Clinic</h4>
                            <p className="text-sm text-gray-600">Cash or card when you visit</p>
                          </div>
                        </div>
                        {watch('paymentGateway') === 'offline' && (
                          <CheckCircle className="w-6 h-6 text-primary-500" />
                        )}
                      </div>
                    </button>
                  </div>
                  {errors.paymentGateway && (
                    <p className="text-red-500 mt-4 text-sm font-medium">{errors.paymentGateway.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="px-6 sm:px-8 py-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Previous
              </button>
              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                >
                  Next Step
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirm Appointment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
