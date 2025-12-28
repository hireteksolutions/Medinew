import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctorDashboardService } from '../../services/api';
import { Users } from 'lucide-react';

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await doctorDashboardService.getPatients();
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Patients</h1>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : patients.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No patients yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {patients.map((patient: any) => (
            <Link
              key={patient._id}
              to={`/doctor/dashboard/patients/${patient._id}`}
              className="card hover:shadow-lg transition"
            >
              <div className="flex items-center space-x-4">
                {patient.profileImage ? (
                  <img
                    src={patient.profileImage}
                    alt={patient.firstName}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl">
                    {patient.firstName[0]}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <p className="text-gray-600">{patient.email}</p>
                  <p className="text-gray-600">{patient.phone}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

