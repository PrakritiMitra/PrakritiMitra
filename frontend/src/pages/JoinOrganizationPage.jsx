// src/pages/JoinOrganizationPage.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/layout/Navbar";
import { useNavigate } from "react-router-dom";

export default function JoinOrganizationPage() {
  const [organizations, setOrganizations] = useState([]);
  const [pendingOrgIds, setPendingOrgIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

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
      alert("Join request sent");
      setPendingOrgIds((prev) => new Set(prev).add(orgId));
      await fetchOrganizations();
    } catch (err) {
      if (err.response?.data?.message?.toLowerCase().includes("rejected")) {
        setOrganizations((prev) => prev.map(org => org._id === orgId ? { ...org, status: "rejected" } : org));
      }
      alert(err.response?.data?.message || "Request failed");
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
      alert("Join request withdrawn");
      setPendingOrgIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
      await fetchOrganizations();
    } catch (err) {
      alert(err.response?.data?.message || "Withdraw failed");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 ">
      <Navbar />
      <h1 className="text-2xl font-bold mb-4 px-6">Explore Organizations</h1>
      {loading ? (
        <p>Loading...</p>
      ) : organizations.length === 0 ? (
        <p>No new organizations available to join.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 mb-10">
          {organizations.map((org) => (
            <div
              key={org._id}
              className="bg-white border p-4 rounded shadow hover:shadow-md transition"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/organizations/${org._id}`)}
            >
              <h3 className="text-lg font-semibold text-blue-700">
                {org.name}
              </h3>
              <p className="text-sm text-gray-600">{org.description}</p>
              <div className="mt-3">
                {org.status === "pending" ? (
                  <>
                    <p className="text-sm text-yellow-600 font-medium">
                      Approval Pending
                    </p>
                    <button
                      className="ml-2 px-3 py-1 text-white bg-red-600 rounded hover:bg-red-700 text-sm"
                      onClick={(e) => { e.stopPropagation(); handleWithdrawRequest(org._id); }}
                    >
                      Withdraw Join
                    </button>
                  </>
                ) : org.status === "rejected" ? (
                  <>
                    <p className="text-sm text-red-600 font-medium">
                      Request Rejected
                    </p>
                    <button
                      className="ml-2 px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700 text-sm"
                      onClick={(e) => { e.stopPropagation(); handleJoinRequest(org._id); }}
                    >
                      Reapply to Join
                    </button>
                  </>
                ) : (
                  <button
                    className="px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700 text-sm"
                    onClick={(e) => { e.stopPropagation(); handleJoinRequest(org._id); }}
                  >
                    Request to Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
