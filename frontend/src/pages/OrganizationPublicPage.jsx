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
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 group">
        <div className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          {label}
        </div>
        <img src={url} alt={label} className="max-w-[180px] max-h-[180px] rounded-lg shadow-sm group-hover:shadow-md transition-all duration-300" />
      </div>
    );
  }
  if (filePath.match(/\.(pdf)$/i)) {
    return (
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-300 group">
        <div className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          {label}
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 hover:scale-105"
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
  const [upcomingEventsToShow, setUpcomingEventsToShow] = useState(2);
  const [pastEventsToShow, setPastEventsToShow] = useState(2);

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
      <div className="pt-20 sm:pt-24 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
        <div className="w-full">
        {/* Header Section */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 hover:shadow-xl hover:scale-[1.02] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 delay-300 hover:shadow-xl hover:scale-[1.01] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-white" />
            </div>
            About
          </h2>
          <p className="text-slate-700 mb-6 leading-relaxed">{visionMission}</p>
          
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Head Office</div>
              </div>
              <div className="text-slate-600">{headOfficeLocation}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Email</div>
              </div>
              <div className="text-slate-600">{orgEmail}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <PhoneIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Phone</div>
              </div>
              <div className="text-slate-600">{orgPhone}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Established</div>
              </div>
              <div className="text-slate-600">{yearOfEstablishment}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-slate-700">Focus Area</div>
              </div>
              <div className="text-slate-600">{focusArea === 'Other' ? focusAreaOther : focusArea}</div>
            </div>
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
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
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 delay-400 hover:shadow-xl hover:scale-[1.01] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <GlobeAltIcon className="w-5 h-5 text-white" />
            </div>
            Social Media Links
          </h2>
          <div className="flex flex-wrap gap-4">
            {socialLinks.length > 0 && socialLinks.map((link, idx) => {
              if (!link) return null;
              
              // Determine social media platform and icon
              const getSocialIcon = (url) => {
                const lowerUrl = url.toLowerCase();
                if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagram')) {
                  return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('linkedin.com') || lowerUrl.includes('linkedin')) {
                  return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) {
                  return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('facebook')) {
                  return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  );
                } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtube')) {
                  return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  );
                } else {
                  return <ArrowTopRightOnSquareIcon className="w-6 h-6" />;
                }
              };

              const getSocialGradient = (url) => {
                const lowerUrl = url.toLowerCase();
                if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagram')) {
                  return 'from-pink-500 to-purple-600';
                } else if (lowerUrl.includes('linkedin.com') || lowerUrl.includes('linkedin')) {
                  return 'from-blue-600 to-blue-700';
                } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) {
                  return 'from-blue-400 to-blue-500';
                } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('facebook')) {
                  return 'from-blue-600 to-blue-800';
                } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtube')) {
                  return 'from-red-500 to-red-600';
                } else {
                  return 'from-purple-500 to-purple-600';
                }
              };

              return (
                <a 
                  key={idx} 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-md"
                  style={{ background: `linear-gradient(135deg, ${getSocialGradient(link).includes('pink') ? '#ec4899' : getSocialGradient(link).includes('blue') ? '#3b82f6' : getSocialGradient(link).includes('red') ? '#ef4444' : '#8b5cf6'}, ${getSocialGradient(link).includes('purple') ? '#9333ea' : getSocialGradient(link).includes('blue') ? '#1d4ed8' : getSocialGradient(link).includes('red') ? '#dc2626' : '#7c3aed'})` }}
                  title={link}
                >
                  {getSocialIcon(link)}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                    {link.length > 30 ? link.substring(0, 30) + '...' : link}
                  </div>
                </a>
              );
            })}
            {(!socialLinks || socialLinks.length === 0) && (
              <div className="text-center py-8 w-full">
                <GlobeAltIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No social media links provided.</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 transition-all duration-1000 delay-500 hover:shadow-xl hover:scale-[1.01] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8 hover:shadow-xl hover:scale-[1.01] transition-all duration-500">
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
                             <div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {upcoming.slice(0, upcomingEventsToShow).map((e) => (
                     <EventCard key={e._id} event={e} />
                   ))}
                 </div>
                 {upcoming.length > upcomingEventsToShow && (
                   <div className="text-center mt-6">
                     <button
                       onClick={() => setUpcomingEventsToShow(upcomingEventsToShow + 2)}
                       className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                     >
                       Show More Events ({upcoming.length - upcomingEventsToShow} more)
                     </button>
                   </div>
                 )}
               </div>
            )}
          </div>

          {/* Past Events */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 hover:shadow-xl hover:scale-[1.01] transition-all duration-500">
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
                             <div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {past.slice(0, pastEventsToShow).map((e) => (
                     <EventCard key={e._id} event={e} />
                   ))}
                 </div>
                 {past.length > pastEventsToShow && (
                   <div className="text-center mt-6">
                     <button
                       onClick={() => setPastEventsToShow(pastEventsToShow + 2)}
                       className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                     >
                       Show More Events ({past.length - pastEventsToShow} more)
                     </button>
                   </div>
                 )}
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
    </div>
  );
}
