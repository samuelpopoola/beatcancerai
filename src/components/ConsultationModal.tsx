import React, { useState } from 'react';

export interface DoctorProfile {
  id: string;
  name: string;
  specialty?: string;
  consultation_fee?: number;
  rating?: number;
  avatar?: string | null;
  experience_years?: number;
}

interface ConsultationModalProps {
  doctor: DoctorProfile;
  onClose: () => void;
  onStartVideo: (doctorId: string) => void;
  onStartChat: (doctorId: string) => void;
}

const ConsultationModal: React.FC<ConsultationModalProps> = ({ doctor, onClose, onStartVideo, onStartChat }) => {
  const [consultationType, setConsultationType] = useState<'video' | 'chat'>('video');

  const fee = doctor.consultation_fee ?? 0;

  const handleStart = () => {
    if (consultationType === 'video') {
      onStartVideo(doctor.id);
    } else {
      onStartChat(doctor.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-gray-900">Consult with Dr. {doctor.name}</h3>
        <p className="text-sm text-gray-600">{doctor.specialty || 'Oncology specialist'}</p>

        <div className="my-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <input
              type="radio"
              value="video"
              checked={consultationType === 'video'}
              onChange={(event) => setConsultationType(event.target.value as 'video' | 'chat')}
            />
            <span>📞 Video Consultation (₦{fee || 0})</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <input
              type="radio"
              value="chat"
              checked={consultationType === 'chat'}
              onChange={(event) => setConsultationType(event.target.value as 'video' | 'chat')}
            />
            <span>💬 Text Chat (₦{Math.max(fee * 0.5, 0).toFixed(0)})</span>
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleStart}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Start {consultationType === 'video' ? 'Video Call' : 'Chat'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationModal;
