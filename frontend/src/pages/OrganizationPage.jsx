// src/pages/OrganizationPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import Avatar from "../components/common/Avatar";
import { approveTeamMember, rejectTeamMember, getOrganizationOrganizers } from "../api/organization";
import EventCreationWrapper from "../components/event/EventCreationWrapper";
import EventCard from "../components/event/EventCard";
import { OrganizationSponsorshipSection } from "../components/sponsor";
import { formatDate } from "../utils/dateUtils";
import { 
  PlusIcon, 
  Cog6ToothIcon, 
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UsersIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { showAlert } from "../utils/notifications";

export default function OrganizationPage() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [memberEntry, setMemberEntry] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [organizersError, setOrganizersError] = useState("");
  const [showOrganizers, setShowOrganizers] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [upcomingVisible, setUpcomingVisible] = useState(0);
  const [pastVisible, setPastVisible] = useState(0);
  const [gridColumns, setGridColumns] = useState(1);

  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setOrganizersError("");

        const [orgRes, eventRes] = await Promise.all([
          axiosInstance.get(`/api/organizations/${id}`),
          axiosInstance.get(`/api/events/organization/${id}`),
        ]);

        setOrganization(orgRes.data);
        setEvents(eventRes.data);

        if (user?.role === "organizer") {
          const teamRes = await axiosInstance.get(`/api/organizations/${id}/team`);
          const team = teamRes.data;

          const memberEntry = team.find(
            (member) => member.userId._id === user._id
          );

          if (memberEntry) {
            setMemberEntry(memberEntry);
            if (memberEntry.status === "pending") {
              setHasRequested(true);
              setIsMember(false);
              setIsAdmin(false);
            } else if (memberEntry.status === "approved") {
              setHasRequested(false);
              setIsMember(true);
              setIsAdmin(
                orgRes.data.createdBy === user._id || memberEntry.isAdmin
              );
            }
          } else {
            setHasRequested(false);
            setIsMember(false);
            setIsAdmin(false);
          }

          const pending = team.filter((member) => member.status === "pending");
          setPendingRequests(pending);
        }
        // Fetch organizers for this org (all roles) only if token exists
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const orgOrganizers = await getOrganizationOrganizers(id);
            setOrganizers(orgOrganizers);
          } catch (err) {
            setOrganizersError("You must be logged in to see organizers.");
            setOrganizers([]);
          }
        } else {
          setOrganizersError("You must be logged in to see organizers.");
          setOrganizers([]);
        }
      } catch (err) {
        console.error("Error loading organization:", err);
      } finally {
        setLoading(false);
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    };

    fetchData();
  }, [id]);

  // Calculate optimal initial display based on grid columns
  const calculateOptimalDisplay = (totalEvents, columns) => {
    if (totalEvents === 0) return 0;
    
    // Show 1 complete row by default
    const oneRow = columns;
    
    // If we have less than 1 complete row, show all
    if (totalEvents <= oneRow) return totalEvents;
    
    // If we have more than 1 complete row, show 1 complete row
    return oneRow;
  };

  // Smart show more/less functions
  const showMore = (currentVisible, totalEvents, columns) => {
    const currentRows = Math.ceil(currentVisible / columns);
    const nextRow = currentRows + 1;
    const nextVisible = nextRow * columns;
    
    // Don't exceed total events
    return Math.min(nextVisible, totalEvents);
  };

  const showLess = (currentVisible, columns) => {
    const currentRows = Math.ceil(currentVisible / columns);
    if (currentRows <= 1) return columns; // Keep at least 1 row
    
    const prevRow = currentRows - 1;
    return prevRow * columns;
  };

  // Update grid columns based on screen size
  useEffect(() => {
    const updateGridColumns = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setGridColumns(3);
      } else if (window.innerWidth >= 768) { // md breakpoint
        setGridColumns(2);
      } else {
        setGridColumns(1);
      }
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, []);

  const handleJoinRequest = async () => {
    try {
      setJoining(true);
      await axiosInstance.post(`/api/organizations/${id}/join`);
      setHasRequested(true);
      showAlert.success("Join request sent.");
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Request failed.");
    } finally {
      setJoining(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await approveTeamMember(id, userId);
      showAlert.success("User approved successfully");
      setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Approval failed");
    }
  };

  const handleReject = async (userId) => {
    try {
      await rejectTeamMember(id, userId);
      showAlert.success("User rejected successfully");
      setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
    } catch (err) {
      showAlert.error(err.response?.data?.message || "Rejection failed");
    }
  };

  // Add this function to remove a pending request by userId
  const removePendingRequest = (userId) => {
    setPendingRequests((prev) => prev.filter((m) => m.userId._id !== userId));
  };

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startDateTime) >= now);
  const past = events.filter((e) => new Date(e.startDateTime) < now);

  // Set optimal initial display when events or grid columns change
  useEffect(() => {
    if (upcoming.length > 0) {
      setUpcomingVisible(calculateOptimalDisplay(upcoming.length, gridColumns));
    }
    if (past.length > 0) {
      setPastVisible(calculateOptimalDisplay(past.length, gridColumns));
    }
  }, [upcoming.length, past.length, gridColumns]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 relative">
      <Navbar />
      
      {/* Show Organizers Button - fixed top right */}
      {organizers.length > 0 && !organizersError && (
        <button
          className={`fixed z-50 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200
            top-[calc(2cm+1.5rem)]
            ${showOrganizers ? 'right-[340px]' : 'right-8'}
          `}
          style={{ transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          onClick={() => setShowOrganizers((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            {showOrganizers ? 'Hide Organizers' : 'Show Organizers'}
          </div>
        </button>
      )}
      
      {/* Organizers Drawer */}
      {organizers.length > 0 && !organizersError && (
        <div
          className={`fixed top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-sm shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showOrganizers ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent">Organizers</h2>
            <button
              className="text-slate-500 hover:text-red-600 text-2xl font-bold transition-colors duration-200"
              onClick={() => setShowOrganizers(false)}
              aria-label="Close organizers drawer"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-64px)] px-6 py-4 space-y-4">
            {organizers.map((org) => (
              <div
                key={org.userId._id}
                className="flex items-center bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-4 border border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-blue-50/50"
                onClick={() => navigate(`/organizer/${org.userId._id}`)}
              >
                <Avatar user={org.userId} size="lg" role="organizer" className="mr-4" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 text-lg">{org.userId.name}</span>
                  {org.userId.username && (
                    <span className="text-sm text-slate-600">@{org.userId.username}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {organization ? (
          <>
            {/* Header Section */}
            <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-4">
                  {organization.name}
                </h1>
                <p className="text-slate-700 text-lg mb-4">{organization.description}</p>

                <div className="flex flex-wrap gap-4 items-center">
                  {organization.website && (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <GlobeAltIcon className="w-4 h-4" />
                      Visit Website
                    </a>
                  )}

                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl">
                    <ShieldCheckIcon className="w-4 h-4" />
                    {organization.verifiedStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* Sponsorship Section */}
            <div className={`mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <OrganizationSponsorshipSection 
                organizationId={id}
                organization={organization}
                isAdmin={isAdmin}
              />
            </div>

            {/* Join status UI */}
            {user?.role === "organizer" && (
              <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  {isAdmin ? (
                    <div className="flex items-center gap-3 text-emerald-700">
                      <CheckCircleIcon className="w-6 h-6" />
                      <p className="font-semibold">
                        Joined as admin{" "}
                        {memberEntry?.updatedAt &&
                          `on ${formatDate(memberEntry.updatedAt)}`}
                      </p>
                    </div>
                  ) : isMember ? (
                    <div className="flex items-center gap-3 text-emerald-700">
                      <CheckCircleIcon className="w-6 h-6" />
                      <p className="font-semibold">
                        Joined as member{" "}
                        {memberEntry?.updatedAt &&
                          `on ${formatDate(memberEntry.updatedAt)}`}
                      </p>
                    </div>
                  ) : hasRequested ? (
                    <div className="flex items-center gap-3 text-amber-700">
                      <ClockIcon className="w-6 h-6" />
                      <p className="font-semibold">Join request sent</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleJoinRequest}
                      disabled={joining}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                    >
                      <UsersIcon className="w-5 h-5" />
                      {joining ? "Sending..." : "Request to Join"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={`mb-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex flex-wrap gap-4">
                {(isAdmin || isMember) && (
                  <button
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    onClick={() => setShowEventForm(true)}
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create New Event
                  </button>
                )}

                {isAdmin && (
                  <>
                    <button
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                      onClick={() => navigate(`/organization/${id}/settings`)}
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                      Settings
                    </button>
                    <button
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                      onClick={() => navigate(`/organization/${id}/applications`)}
                    >
                      <ClipboardDocumentListIcon className="w-5 h-5" />
                      View Applications
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Pending Requests */}
            {isAdmin && pendingRequests.length > 0 && (
              <div className={`mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Pending Join Requests</h3>
                  <div className="space-y-4">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.userId._id}
                        data-userid={req.userId._id}
                        className="flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          {req.userId.profileImage ? (
                            <img
                              src={`http://localhost:5000/uploads/Profiles/${req.userId.profileImage}`}
                              alt={req.userId.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center text-lg font-bold text-white shadow-md">
                              {req.userId.name?.[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{req.userId.name}</p>
                            <p className="text-sm text-slate-600">
                              {req.userId.username ? `@${req.userId.username}` : ''} • {req.userId.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                            onClick={() => handleApprove(req.userId._id)}
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                            onClick={() => handleReject(req.userId._id)}
                          >
                            <XCircleIcon className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className={`mb-8 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                  <CalendarIcon className="w-6 h-6" />
                  Upcoming Events ({upcoming.length})
                </h2>
                {upcoming.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No upcoming events.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {upcoming.slice(0, upcomingVisible).map((e) => (
                        <EventCard key={e._id} event={e} />
                      ))}
                    </div>
                    
                    {/* Smart Show More/Less Controls */}
                    {upcoming.length > upcomingVisible && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                        {/* Show More Button */}
                        <div className="relative">
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                            onClick={() => setUpcomingVisible(showMore(upcomingVisible, upcoming.length, gridColumns))}
                          >
                            {/* Animated background overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            
                            <span className="relative flex items-center justify-center gap-2">
                              <span className="text-sm sm:text-base">Show More Events</span>
                              <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform duration-300" />
                            </span>
                          </button>
                          
                          {/* Event count badge - positioned outside button container */}
                          <div className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-blue-500 z-10">
                            +{Math.min(gridColumns, upcoming.length - upcomingVisible)}
                          </div>
                        </div>
                        
                        {/* Show Less Button */}
                        {upcomingVisible > gridColumns && (
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-300 hover:border-slate-400"
                            onClick={() => setUpcomingVisible(showLess(upcomingVisible, gridColumns))}
                          >
                            <span className="flex items-center justify-center gap-2">
                              <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-transform duration-300" />
                              <span className="text-sm sm:text-base">Show Less Events</span>
                            </span>
                            
                            {/* Event count badge */}
                            <div className="absolute -top-2 -right-2 bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-slate-400">
                              -{gridColumns}
                            </div>
                          </button>
                        )}
                        
                        {/* Events Info Display */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span>
                            Showing <span className="font-semibold text-slate-700">{upcomingVisible}</span> of <span className="font-semibold text-slate-700">{upcoming.length}</span> events
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Past Events */}
            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                  <ClockIcon className="w-6 h-6" />
                  Past Events ({past.length})
                </h2>
                {past.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No past events.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {past.slice(0, pastVisible).map((e) => (
                        <EventCard key={e._id} event={e} />
                      ))}
                    </div>
                    
                    {/* Smart Show More/Less Controls */}
                    {past.length > pastVisible && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                        {/* Show More Button */}
                        <div className="relative">
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                            onClick={() => setPastVisible(showMore(pastVisible, past.length, gridColumns))}
                          >
                            {/* Animated background overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            
                            <span className="relative flex items-center justify-center gap-2">
                              <span className="text-sm sm:text-base">Show More Events</span>
                              <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform duration-300" />
                            </span>
                          </button>
                          
                          {/* Event count badge - positioned outside button container */}
                          <div className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-blue-500 z-10">
                            +{Math.min(gridColumns, past.length - pastVisible)}
                          </div>
                        </div>
                        
                        {/* Show Less Button */}
                        {pastVisible > gridColumns && (
                          <button
                            className="group relative px-8 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-300 hover:border-slate-400"
                            onClick={() => setPastVisible(showLess(pastVisible, gridColumns))}
                          >
                            <span className="flex items-center justify-center gap-2">
                              <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-transform duration-300" />
                              <span className="text-sm sm:text-base">Show Less Events</span>
                            </span>
                            
                            {/* Event count badge */}
                            <div className="absolute -top-2 -right-2 bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-slate-400">
                              -{gridColumns}
                            </div>
                          </button>
                        )}
                        
                        {/* Events Info Display */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span>
                            Showing <span className="font-semibold text-slate-700">{pastVisible}</span> of <span className="font-semibold text-slate-700">{past.length}</span> events
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <XCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Organization not found
              </h3>
              <p className="text-slate-600">
                The organization you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Event creation modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl relative my-10 max-h-[90vh] overflow-y-auto border border-white/20">
            <button
              className="absolute top-4 right-6 text-slate-500 hover:text-red-600 text-3xl font-bold transition-colors duration-200"
              onClick={() => setShowEventForm(false)}
            >
              ×
            </button>
            <EventCreationWrapper
              selectedOrgId={id}
              onClose={() => setShowEventForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
