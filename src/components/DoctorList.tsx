import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ConsultationModal, { DoctorProfile } from './ConsultationModal';

interface DoctorListProps {
  onStartVideo: (doctorId: string) => void;
  onStartChat: (doctorId: string) => void;
}

const fallbackDoctors: DoctorProfile[] = [
  {
    id: 'mock-adebayo',
    name: 'Adebayo Johnson',
    specialty: 'Oncology Specialist',
    consultation_fee: 15000,
    rating: 4.9,
    avatar: null,
    experience_years: 12,
  } as DoctorProfile,
  {
    id: 'mock-chinwe',
    name: 'Chinwe Okoro',
    specialty: 'Radiation Oncology',
    consultation_fee: 12000,
    rating: 4.8,
    avatar: null,
    experience_years: 8,
  } as DoctorProfile,
];

const DoctorList: React.FC<DoctorListProps> = ({ onStartVideo, onStartChat }) => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, specialty, rating, consultation_fee, experience_years, avatar, video_consultation');

      if (!error && Array.isArray(data) && data.length) {
        setDoctors(
          data
            .filter((doc: any) => doc.video_consultation !== false)
            .map((doc: any) => ({
              id: doc.id,
              name: doc.name || 'Specialist',
              specialty: doc.specialty,
              consultation_fee: doc.consultation_fee,
              rating: doc.rating,
              avatar: doc.avatar,
              experience_years: doc.experience_years,
            }))
        );
      } else {
        console.error('Failed to load doctors', error);
        try {
          // Attempt to seed fallback doctors directly if table is empty/absent
          await supabase
            .from('doctors')
            .upsert(
              fallbackDoctors.map((doc) => ({
                name: doc.name,
                specialty: doc.specialty,
                experience_years: doc.experience_years,
                consultation_fee: doc.consultation_fee,
                video_consultation: true,
              })),
              { onConflict: 'name' }
            );
        } catch (seedErr) {
          console.warn('Unable to seed doctors automatically', seedErr);
        }
        setDoctors(fallbackDoctors);
      }
      setLoading(false);
    };

    fetchDoctors();
  }, []);

  return (
    <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Available Oncologists</h3>
      {loading && <p className="mt-2 text-sm text-gray-500">Fetching clinical team…</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {doctors.map((doctor) => (
          <div key={doctor.id} className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              {doctor.avatar ? (
                <img src={doctor.avatar} alt={doctor.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  Dr
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900">Dr. {doctor.name}</h4>
                <p className="text-sm text-gray-500">{doctor.specialty || 'Oncology'}</p>
                <p className="text-xs text-gray-400">⭐ {doctor.rating ?? '4.8'} rating</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDoctor(doctor)}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Consult Now
            </button>
          </div>
        ))}
      </div>

      {selectedDoctor && (
        <ConsultationModal
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onStartVideo={onStartVideo}
          onStartChat={onStartChat}
        />
      )}
    </div>
  );
};

export default DoctorList;
