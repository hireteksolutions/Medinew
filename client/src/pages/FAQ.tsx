import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How do I book an appointment?',
    answer: 'You can book an appointment by browsing our doctors page, selecting a doctor, and following the booking process. You need to be logged in to book an appointment.',
  },
  {
    question: 'Can I cancel or reschedule my appointment?',
    answer: 'Yes, you can cancel or reschedule your appointment from your dashboard. Go to the Appointments section and select the appointment you want to modify.',
  },
  {
    question: 'How do I view my medical records?',
    answer: 'You can view your medical records in the Medical Records section of your patient dashboard. All your documents and prescriptions will be available there.',
  },
  {
    question: 'Is my information secure?',
    answer: 'Yes, we use industry-standard security measures to protect your personal and medical information. All data is encrypted and stored securely.',
  },
  {
    question: 'How do I become a doctor on the platform?',
    answer: 'You can register as a doctor during signup. After registration, your account will be reviewed by our admin team before approval.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-center">Frequently Asked Questions</h1>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="card">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between text-left"
              >
                <h2 className="text-xl font-semibold">{faq.question}</h2>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <p className="mt-4 text-gray-700">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

