import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrganizationById,
  getOrganizationTeam
} from '../api/organization';
import { getEventsByOrganization } from '../api/event';
import EventCard from '../components/event/EventCard';
import Navbar from '../components/layout/Navbar';
import { OrganizationSponsorshipSection } from '../components/sponsor';

const orgFileUrl = (filename) =>
  filename ? `http://localhost:5000/uploads/organizationdetails/${filename.replace(/\\/g, '/')}` : null;

function FilePreview({ filePath, label }) {
  if (!filePath) return null;
  const url = orgFileUrl(filePath);
  if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return (
      <div className="my-2">
        <div className="font-semibold text-sm">{label}</div>
        <img src={url} alt={label} className="max-w-[180px] max-h-[180px] rounded mt-1" />
      </div>
    );
  }
  if (filePath.match(/\.(pdf)$/i)) {
    return (
      <div className="my-2">
        <div className="font-semibold text-sm">{label}</div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View PDF</a>
      </div>
    );
  }
  return null;
}

export default function OrganizationPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [team, setTeam] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [orgRes, teamRes, eventsRes] = await Promise.all([
          getOrganizationById(id),
          getOrganizationTeam(id),
          getEventsByOrganization(id)
        ]);
        setOrg(orgRes.data);
        setTeam(teamRes.data);
        setEvents(eventsRes);

        // Check if current user is admin of this organization
        if (user) {
          const memberEntry = teamRes.data.find(
            (member) => member.userId._id === user._id
          );
          if (memberEntry && memberEntry.status === "approved") {
            setIsAdmin(
              orgRes.data.createdBy === user._id || memberEntry.isAdmin
            );
          }
        }
      } catch (err) {
        setOrg(null);
        setTeam([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!org) return <div className="p-8">Organization not found.</div>;

  const {
    name,
    description,
    logo,
    website,
    headOfficeLocation,
    orgEmail,
    visionMission,
    orgPhone,
    yearOfEstablishment,
    focusArea,
    focusAreaOther,
    socialLinks = [],
    documents = {}
  } = org;

  // Event logic (same as OrganizationPage)
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startDateTime) >= now);
  const past = events.filter((e) => new Date(e.startDateTime) < now);

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow mt-10">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {logo && (
          <img src={orgFileUrl(logo)} alt={name} className="w-28 h-28 rounded-lg object-cover border" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-blue-700 mb-1">{name}</h1>
          <div className="text-gray-600 mb-2">{description}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-700 rounded hover:bg-blue-50 transition"
            onClick={() => setDrawerOpen(true)}
          >
            <span className="material-icons"></span>
            View Organizers
          </button>
          {isAdmin && (
            <>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                onClick={() => navigate(`/organization/${id}/settings`)}
              >
                ⚙️ Settings
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                onClick={() => navigate(`/organization/${id}/applications`)}
              >
                📋 View Applications
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Sponsorship Section */}
      <OrganizationSponsorshipSection 
        organizationId={id}
        organization={org}
        isAdmin={isAdmin}
      />
      
      <hr className="my-4" />
      <div className="font-semibold text-lg mb-1">About</div>
      <div className="mb-3">{visionMission}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <div className="font-semibold text-sm">Head Office</div>
          <div>{headOfficeLocation}</div>
        </div>
        <div>
          <div className="font-semibold text-sm">Email</div>
          <div>{orgEmail}</div>
        </div>
        <div>
          <div className="font-semibold text-sm">Phone</div>
          <div>{orgPhone}</div>
        </div>
        <div>
          <div className="font-semibold text-sm">Year of Establishment</div>
          <div>{yearOfEstablishment}</div>
        </div>
        <div>
          <div className="font-semibold text-sm">Focus Area</div>
          <div>{focusArea === 'Other' ? focusAreaOther : focusArea}</div>
        </div>
        <div>
          <div className="font-semibold text-sm">Website</div>
          {website ? <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{website}</a> : '-'}
        </div>
      </div>
      <hr className="my-4" />
      <div className="font-semibold text-lg mb-1">Social Media Links</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {socialLinks.length > 0 && socialLinks.map((link, idx) => (
          link ? <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{link}</a> : null
        ))}
        {(!socialLinks || socialLinks.length === 0) && <span className="text-gray-500">No links provided.</span>}
      </div>
      <hr className="my-4" />
      <div className="font-semibold text-lg mb-1">Documents</div>
      <div className="flex flex-wrap gap-6 mb-3">
        <FilePreview filePath={documents.gstCertificate} label="GST Certificate" />
        <FilePreview filePath={documents.panCard} label="PAN Card" />
        <FilePreview filePath={documents.ngoRegistration} label="NGO Registration" />
        <FilePreview filePath={documents.letterOfIntent} label="Letter of Intent" />
      </div>
      <hr className="my-4" />
      <div className="font-semibold text-lg mb-1">Upcoming Events</div>
      {upcoming.length === 0 ? (
        <p className="text-gray-500">No upcoming events.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {upcoming.map((e) => (
            <EventCard key={e._id} event={e} />
          ))}
        </div>
      )}
      <div className="font-semibold text-lg mb-1 mt-8">Past Events</div>
      {past.length === 0 ? (
        <p className="text-gray-500">No past events.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {past.map((e) => (
            <EventCard key={e._id} event={e} />
          ))}
        </div>
      )}
      {/* Drawer for Organizers */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-end z-50">
          <div className="bg-white w-full max-w-sm h-full shadow-lg p-6 relative overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-red-600 text-2xl"
              onClick={() => setDrawerOpen(false)}
            >
              &times;
            </button>
            <div className="font-bold text-lg mb-2">Organizers</div>
            <hr className="mb-2" />
            {team.length === 0 && <div className="text-gray-500">No organizers found.</div>}
            {team.filter(member => member.status === 'approved').map((member) => (
              <div key={member._id} className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-blue-50 p-2 rounded-lg border transition"
                onClick={() => navigate(`/organizer/${member.userId?._id}`)}
              >
                {member.userId?.profileImage ? (
                  <img src={`http://localhost:5000/uploads/Profiles/${member.userId.profileImage}`} alt={member.userId?.name} className="w-10 h-10 rounded-full object-cover border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-lg font-bold text-blue-700">
                    {member.userId?.name?.[0]}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{member.userId?.name || 'Unknown'}</div>
                  <div className="text-blue-600 text-sm">{member.userId?.username ? `@${member.userId.username}` : ''}</div>
                  <div className="text-gray-600 text-sm">{member.userId?.email}</div>
                </div>
              </div>
            ))}
          </div>
                 </div>
       )}
     </div>
     </>
   );
 }
