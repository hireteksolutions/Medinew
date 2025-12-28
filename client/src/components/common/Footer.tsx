import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { PROJECT_CONFIG } from '../../config';
import { contactInfoService } from '../../services/api';

export const Footer = () => {
  const [contactInfo, setContactInfo] = useState<any>(null);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await contactInfoService.get();
        setContactInfo(response.data);
      } catch (error) {
        console.error('Error fetching contact info:', error);
        // Set default values if API fails
        setContactInfo({
          address: '123 Medical Street, Health City, HC 12345',
          phone: '+1 (555) 123-4567',
          email: PROJECT_CONFIG.email,
          socialMedia: {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: ''
          }
        });
      }
    };
    fetchContactInfo();
  }, []);
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">{PROJECT_CONFIG.shortName}</span>
              </div>
              <span className="text-xl font-bold">{PROJECT_CONFIG.name}</span>
            </div>
            <p className="text-gray-400 mb-4">
              Your trusted healthcare partner. We provide quality medical care with modern technology.
            </p>
            <div className="flex space-x-4">
              {contactInfo?.socialMedia?.facebook && (
                <a href={contactInfo.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {contactInfo?.socialMedia?.twitter && (
                <a href={contactInfo.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {contactInfo?.socialMedia?.instagram && (
                <a href={contactInfo.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {contactInfo?.socialMedia?.linkedin && (
                <a href={contactInfo.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition">Home</Link>
              </li>
              <li>
                <Link to="/doctors" className="text-gray-400 hover:text-white transition">Doctors</Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-400 hover:text-white transition">Services</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition">Contact</Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-gray-400">
              <li>Cardiology</li>
              <li>Pediatrics</li>
              <li>Orthopedics</li>
              <li>Neurology</li>
              <li>Dermatology</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start space-x-2">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{contactInfo?.address || '123 Medical Street, Health City, HC 12345'}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>{contactInfo?.phone || '+1 (555) 123-4567'}</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>{contactInfo?.email || PROJECT_CONFIG.email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} {PROJECT_CONFIG.name}. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

