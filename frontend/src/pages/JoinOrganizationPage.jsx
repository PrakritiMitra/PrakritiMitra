// src/pages/JoinOrganizationPage.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import Navbar from "../components/layout/Navbar";
import { useNavigate } from "react-router-dom";
import OrganizationCard from "../components/common/OrganizationCard";
import { 
  BuildingOfficeIcon,
  ClockIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

export default function JoinOrganizationPage() {
  const [organizations, setOrganizations] = useState([]);
  const [pendingOrgIds, setPendingOrgIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("token");
      const allOrgsRes = await axios.get("/api/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allOrgs = allOrgsRes.data;
      const teamStatuses = {};
      const pending = new Set();
      const approved = new Set();
      const rejected = new Set();
      const createdByMe = new Set();
      for (const org of allOrgs) {
        if (org.createdBy === user._id) {
          createdByMe.add(org._id);
          continue;
        }
        try {
          const teamRes = await axios.get(
            `/api/organizations/${org._id}/team`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const member = teamRes.data.find((m) => m.userId._id === user._id);
          if (member?.status === "approved") {
            approved.add(org._id);
          } else if (member?.status === "pending") {
            pending.add(org._id);
          } else if (member?.status === "rejected") {
            rejected.add(org._id);
          }
        } catch (err) {
          // ignore
        }
      }
      const visible = allOrgs.map((org) => ({
        ...org,
        status: approved.has(org._id)
          ? "approved"
          : pending.has(org._id)
          ? "pending"
          : rejected.has(org._id)
          ? "rejected"
          : createdByMe.has(org._id)
          ? "creator"
          : "none",
      }));
      const filtered = visible.filter(
        (org) => org.status !== "approved" && org.status !== "creator"
      );
      setOrganizations(filtered);
    } catch (err) {
      console.error("❌ Failed to load organizations:", err);
    } finally {
      setLoading(false);
      // Trigger animations
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleJoinRequest = async (orgId) => {
    try {
      await axios.post(
        `http://localhost:5000/api/organizations/${orgId}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      // Show success toast
      toast.success("Join request sent successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setPendingOrgIds((prev) => new Set(prev).add(orgId));
      await fetchOrganizations();
    } catch (err) {
      if (err.response?.data?.message?.toLowerCase().includes("rejected")) {
        setOrganizations((prev) => prev.map(org => org._id === orgId ? { ...org, status: "rejected" } : org));
      }
      
      // Show error toast
      toast.error(err.response?.data?.message || "Request failed", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      console.error(err);
    }
  };

  const handleWithdrawRequest = async (orgId) => {
    try {
      await axios.delete(`http://localhost:5000/api/organizations/${orgId}/withdraw`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      // Show success toast
      toast.success("Join request withdrawn successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setPendingOrgIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
      await fetchOrganizations();
    } catch (err) {
      // Show error toast
      toast.error(err.response?.data?.message || "Withdraw failed", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'rejected': return <XCircleIcon className="w-4 h-4" />;
      default: return <BuildingOfficeIcon className="w-4 h-4" />;
    }
  };

  const handleOrganizationClick = (organization) => {
    navigate(`/organizations/${organization._id}`);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <BuildingOfficeIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-4">
              Explore Organizations
            </h1>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Discover and join environmental organizations to participate in events and make a positive impact.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <BuildingOfficeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Available Organizations</p>
                <p className="text-2xl font-bold text-slate-900">{organizations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Requests</p>
                <p className="text-2xl font-bold text-slate-900">{organizations.filter(org => org.status === 'pending').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Verified Orgs</p>
                <p className="text-2xl font-bold text-slate-900">{organizations.filter(org => org.verifiedStatus === 'verified').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {organizations.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No organizations available
                </h3>
                <p className="text-slate-600 mb-6">
                  All available organizations have been joined or you're already a member of them.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org, index) => (
                <div
                  key={org._id}
                  className={`transform hover:-translate-y-1 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Organization Card */}
                  <OrganizationCard
                    organization={org}
                    onClick={() => handleOrganizationClick(org)}
                    variant="default"
                    showStats={true}
                    autoSize={false}
                    actionButtons={
                      <div className="space-y-3">
                        {org.status === "pending" ? (
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${getStatusColor('pending')}`}>
                              {getStatusIcon('pending')}
                              Approval Pending
                            </span>
                            <button
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWithdrawRequest(org._id);
                              }}
                            >
                              <XCircleIcon className="w-4 h-4" />
                              Withdraw
                            </button>
                          </div>
                        ) : org.status === "rejected" ? (
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${getStatusColor('rejected')}`}>
                              {getStatusIcon('rejected')}
                              Request Rejected
                            </span>
                            <button
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinRequest(org._id);
                              }}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Reapply
                            </button>
                          </div>
                        ) : (
                          <button
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinRequest(org._id);
                            }}
                          >
                            <UsersIcon className="w-4 h-4" />
                            Request to Join
                          </button>
                        )}
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
