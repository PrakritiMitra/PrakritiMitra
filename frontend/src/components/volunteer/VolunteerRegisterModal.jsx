// src/components/volunteer/VolunteerRegisterModal.jsx

import React, { useState } from "react";

const VolunteerRegisterModal = ({ open, onClose, volunteer, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [isGroup, setIsGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: "", phone: "", email: "" });

  const handleAddMember = () => {
    if (newMember.name && newMember.phone && newMember.email) {
      setGroupMembers([...groupMembers, newMember]);
      setNewMember({ name: "", phone: "", email: "" });
    }
  };

  const handleRegister = () => {
    // Validate group members if group registration
    if (isGroup) {
      if (!groupMembers.length) {
        alert("Please add at least one group member.");
        return;
      }
      for (const member of groupMembers) {
        if (!member.name || !member.phone || !member.email) {
          alert("All group members must have name, phone, and email.");
          return;
        }
      }
    }
    const payload = {
      groupMembers: isGroup ? groupMembers : [],
    };
    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
        <button
          className="absolute top-2 right-3 text-xl text-gray-500 hover:text-red-600"
          onClick={onClose}
        >
          ×
        </button>
        {step === 1 && (
          <div>
            <div className="text-lg font-semibold mb-4">Confirm Your Details</div>
            <div className="flex items-center gap-4 mb-4">
              {volunteer.profileImage ? (
                <img
                  src={`http://localhost:5000/uploads/Profiles/${volunteer.profileImage}`}
                  alt={volunteer.name}
                  className="w-12 h-12 rounded-full object-cover bg-gray-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-gray-700">
                  {volunteer.name[0]}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800">{volunteer.name}</p>
                <p className="text-sm text-gray-600">{volunteer.email}</p>
                <p className="text-sm text-gray-600">{volunteer.phone}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              To update your details, please go to your profile settings.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full mt-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="text-lg font-semibold mb-4">Register as Individual or Group?</div>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => { setIsGroup(false); setStep(4); }}
                className={`flex-1 py-2 rounded ${!isGroup ? 'bg-blue-600 text-white' : 'bg-white border border-blue-600 text-blue-600'} font-semibold`}
              >
                Individual
              </button>
              <button
                onClick={() => { setIsGroup(true); setStep(3); }}
                className={`flex-1 py-2 rounded ${isGroup ? 'bg-blue-600 text-white' : 'bg-white border border-blue-600 text-blue-600'} font-semibold`}
              >
                Group
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="text-lg font-semibold mb-2">Add Group Members</div>
            <div className="space-y-2 mb-2">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Full Name"
                value={newMember.name}
                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Phone Number"
                value={newMember.phone}
                onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
              />
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Email Address"
                value={newMember.email}
                onChange={e => setNewMember({ ...newMember, email: e.target.value })}
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Add Member
              </button>
            </div>

            {groupMembers.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-1">Added Members:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {groupMembers.map((member, index) => (
                    <li key={index}>{member.name} - {member.email}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between">
              <button
                className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className={`px-4 py-2 rounded ${groupMembers.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                disabled={groupMembers.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="text-lg font-semibold mb-3">Confirm & Register</div>
            <p className="mb-4 text-sm text-gray-600">
              Please confirm to register for this event. A QR code will be generated after successful registration.
            </p>
            <div className="flex justify-between">
              <button
                className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100"
                onClick={() => setStep(isGroup ? 3 : 2)}
              >
                Back
              </button>
              <button
                onClick={handleRegister}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerRegisterModal;