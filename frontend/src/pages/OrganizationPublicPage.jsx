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
import { getProfileImageUrl, getAvatarInitial, getRoleColors } from '../utils/avatarUtils';
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  canNavigateToUser 
} from '../utils/safeUserUtils';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  MapPinIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon
} from "@heroicons/react/24/outline";

const orgFileUrl = (filename) =>
  filename ? `http://localhost:5000/uploads/organizationdetails/${filename.replace(/\\/g, '/')}` : null;

// Get organization initials for default logo
const getOrganizationInitials = (name) => {
  if (!name || name.trim().length === 0) return '?';
  
  const trimmedName = name.trim();
  if (trimmedName.length === 1) {
    return trimmedName.toUpperCase();
  }
  
  const words = trimmedName.split(/\s+/);
  if (words.length === 1) {
    return trimmedName.substring(0, 2).toUpperCase();
  }
  
  const initials = words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  return initials.length > 0 ? initials : '?';
};

function FilePreview({ filePath, label }) {
  if (!filePath) return null;
  const url = orgFileUrl(filePath);
  if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          {label}
        </div>
        <img src={url} alt={label} className="max-w-[180px] max-h-[180px] rounded-lg shadow-sm" />
      </div>
    );
  }
  if (filePath.match(/\.(pdf)$/i)) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          {label}
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          View PDF
        </a>
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
  const [isVisible, setIsVisible] = useState(false);

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
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Organization Not Found</h1>
            <p className="text-slate-600">The organization you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-4 border-white/20">
              {logo ? (
                <img src={orgFileUrl(logo)} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold relative">
                  {getOrganizationInitials(name)}
                  <BuildingOfficeIcon className="absolute bottom-2 right-2 w-6 h-6 text-white/80" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-3">{name}</h1>
              <p className="text-lg text-slate-600 mb-4 leading-relaxed">{description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                onClick={() => setDrawerOpen(true)}
              >
                <EyeIcon className="w-5 h-5" />
                View Organizers
              </button>
              {isAdmin && (
                <>
                  <button
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    onClick={() => navigate(`/organization/${id}/settings`)}
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                    Settings
                  </button>
                  <button
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    onClick={() => navigate(`/organization/${id}/applications`)}
                  >
                    <ClipboardDocumentListIcon className="w-5 h-5" />
                    View Applications
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Sponsorship Section */}
        <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <OrganizationSponsorshipSection 
            organizationId={id}
            organization={org}
            isAdmin={isAdmin}
          />
        </div>
        
        {/* About Section */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-white" />
            </div>
            About
          </h2>
          <p className="text-slate-700 mb-6 leading-relaxed">{visionMission}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Head Office</div>
              </div>
              <div className="text-slate-600">{headOfficeLocation}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Email</div>
              </div>
              <div className="text-slate-600">{orgEmail}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <PhoneIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Phone</div>
              </div>
              <div className="text-slate-600">{orgPhone}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Established</div>
              </div>
              <div className="text-slate-600">{yearOfEstablishment}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Focus Area</div>
              </div>
              <div className="text-slate-600">{focusArea === 'Other' ? focusAreaOther : focusArea}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <GlobeAltIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Website</div>
              </div>
              {website ? (
                <a 
                  href={website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  {website}
                </a>
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <GlobeAltIcon className="w-5 h-5 text-white" />
            </div>
            Social Media Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {socialLinks.length > 0 && socialLinks.map((link, idx) => (
              link ? (
                <a 
                  key={idx} 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 text-blue-600 hover:text-blue-700 hover:bg-white/70 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  <span className="break-all">{link}</span>
                </a>
              ) : null
            ))}
            {(!socialLinks || socialLinks.length === 0) && (
              <span className="text-slate-500">No social media links provided.</span>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            Documents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilePreview filePath={documents.gstCertificate} label="GST Certificate" />
            <FilePreview filePath={documents.panCard} label="PAN Card" />
            <FilePreview filePath={documents.ngoRegistration} label="NGO Registration" />
            <FilePreview filePath={documents.letterOfIntent} label="Letter of Intent" />
          </div>
        </div>

        {/* Events Sections */}
        <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Upcoming Events */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              Upcoming Events ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-lg">No upcoming events scheduled.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcoming.map((e) => (
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            )}
          </div>

          {/* Past Events */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              Past Events ({past.length})
            </h2>
            {past.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-lg">No past events found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {past.map((e) => (
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer for Organizers */}
        {drawerOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-end z-50">
            <div className="bg-white/95 backdrop-blur-sm w-full max-w-md h-full shadow-2xl p-6 relative overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 text-white" />
                  </div>
                  Organizers
                </h2>
                <button
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                  onClick={() => setDrawerOpen(false)}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              {team.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserGroupIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-lg">No organizers found.</p>
                </div>
              )}
              
              {team.filter(member => member.status === 'approved').map((member) => {
                const safeUser = getSafeUserData(member.userId);
                const canNavigate = canNavigateToUser(member.userId);
                
                return (
                  <div 
                    key={member._id} 
                    className={`flex items-center gap-4 mb-4 p-4 rounded-xl border border-slate-200 transition-all duration-200 group ${
                      safeUser.isDeleted ? 'opacity-75 bg-gray-50 cursor-default' : 'cursor-pointer hover:bg-blue-50'
                    }`}
                    onClick={() => canNavigate && navigate(`/organizer/${getSafeUserId(member.userId)}`)}
                  >
                    {getProfileImageUrl(safeUser) ? (
                      <img 
                        src={getProfileImageUrl(safeUser)} 
                        alt={getSafeUserName(safeUser)} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-md">
                        {getAvatarInitial(safeUser)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className={`font-semibold transition-colors ${
                        safeUser.isDeleted ? 'text-gray-600' : 'text-slate-900 group-hover:text-blue-700'
                      }`}>
                        {getSafeUserName(safeUser)}
                        {safeUser.isDeleted && (
                          <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">Deleted User</span>
                        )}
                      </div>
                      <div className={`text-sm ${
                        safeUser.isDeleted ? 'text-gray-500' : 'text-blue-600'
                      }`}>
                        {safeUser.username ? `@${safeUser.username}` : ''}
                      </div>
                      <div className={`text-sm ${
                        safeUser.isDeleted ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        {safeUser.email || 'N/A'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
