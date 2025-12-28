import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { appointmentService, paymentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DASHBOARD_ROUTES } from '../constants';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  CreditCard,
  Wallet,
  Building2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader,
  CreditCard as CardIcon,
  Smartphone,
} from 'lucide-react';

type PaymentMethod = 'online' | 'cash' | 'card' | 'upi' | 'wallet';

export default function Payment() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentType, setPaymentType] = useState<'online' | 'clinic'>('online');

  useEffect(() => {
    if (!appointmentId) {
      toast.error('Appointment ID is required');
      navigate('/');
      return;
    }

    fetchAppointment();
  }, [appointmentId]);

  const fetchAppointment = async () => {
    try {
      const response = await appointmentService.getById(appointmentId!);
      setAppointment(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load appointment details');
      navigate('/');
    }
  };

  const handlePaymentTypeChange = (type: 'online' | 'clinic') => {
    setPaymentType(type);
    setSelectedPaymentMethod(null);
    if (type === 'clinic') {
      setSelectedPaymentMethod('cash');
    }
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
  };

  const handleProceedToPayment = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        appointmentId: appointmentId!,
        paymentMethod: selectedPaymentMethod,
        paymentGateway: paymentType === 'clinic' ? 'offline' : undefined,
      };

      const response = await paymentService.create(paymentData);

      if (paymentType === 'clinic') {
        // For offline payments, just redirect to success
        toast.success('Payment scheduled for collection at clinic');
        navigate(`${DASHBOARD_ROUTES.PATIENT.BASE}/appointments`, {
          state: { paymentCreated: true, appointmentId },
        });
      } else {
        // For online payments, handle gateway response
        const { gatewayResponse } = response.data;

        if (gatewayResponse && gatewayResponse.clientSecret) {
          // Handle Stripe payment
          toast.success('Redirecting to payment gateway...');
          // TODO: Integrate with Stripe Checkout or similar
          // For now, just mark as pending and redirect
          navigate(`${DASHBOARD_ROUTES.PATIENT.BASE}/appointments`, {
            state: { paymentCreated: true, appointmentId },
          });
        } else if (gatewayResponse && gatewayResponse.orderId) {
          // Handle Razorpay payment
          toast.success('Redirecting to payment gateway...');
          // TODO: Integrate with Razorpay Checkout
          navigate(`${DASHBOARD_ROUTES.PATIENT.BASE}/appointments`, {
            state: { paymentCreated: true, appointmentId },
          });
        } else {
          // Generic online payment
          toast.success('Payment initiated successfully');
          navigate(`${DASHBOARD_ROUTES.PATIENT.BASE}/appointments`, {
            state: { paymentCreated: true, appointmentId },
          });
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const consultationFee = appointment.consultationFee || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-primary-500 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-primary-500 text-white p-6">
            <h1 className="text-2xl font-bold">Complete Payment</h1>
            <p className="text-primary-100 mt-1">Appointment Number: {appointment.appointmentNumber}</p>
          </div>

          {/* Appointment Summary */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Appointment Summary</h2>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600">Doctor:</span>
                <span className="font-medium">
                  {appointment.doctorId?.firstName} {appointment.doctorId?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Specialization:</span>
                <span className="font-medium">{appointment.doctorId?.specialization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">
                  {appointment.timeSlot?.start} - {appointment.timeSlot?.end}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Select Payment Method</h2>

            {/* Payment Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handlePaymentTypeChange('online')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentType === 'online'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentType === 'online'
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-400'
                    }`}
                  >
                    {paymentType === 'online' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-left">Pay Online</div>
                    <div className="text-sm text-gray-600 text-left">Secure online payment</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePaymentTypeChange('clinic')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentType === 'clinic'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentType === 'clinic'
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-400'
                    }`}
                  >
                    {paymentType === 'clinic' && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-left">Pay at Clinic</div>
                    <div className="text-sm text-gray-600 text-left">Pay when you visit</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Payment Method Selection */}
            {paymentType === 'online' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { method: 'card' as PaymentMethod, label: 'Card', icon: CardIcon },
                    { method: 'upi' as PaymentMethod, label: 'UPI', icon: Smartphone },
                    { method: 'wallet' as PaymentMethod, label: 'Wallet', icon: Wallet },
                    { method: 'online' as PaymentMethod, label: 'Net Banking', icon: CreditCard },
                  ].map(({ method, label, icon: Icon }) => (
                    <button
                      key={method}
                      onClick={() => handlePaymentMethodSelect(method)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center space-y-2 ${
                        selectedPaymentMethod === method
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paymentType === 'clinic' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">Pay at Clinic</div>
                    <div className="text-sm text-blue-700">
                      You can pay when you visit the clinic. Cash, card, or other payment methods
                      will be accepted at the reception.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Consultation Fee</span>
                <span className="text-lg font-semibold">₹{consultationFee}</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-gray-200">
                <span>Total Amount</span>
                <span className="text-primary-500">₹{consultationFee}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToPayment}
                disabled={loading || !selectedPaymentMethod}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Proceed to Payment</span>
                  </>
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  <div className="font-semibold text-gray-800 mb-1">Secure Payment</div>
                  <div>
                    Your payment information is encrypted and secure. We do not store your card
                    details.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

