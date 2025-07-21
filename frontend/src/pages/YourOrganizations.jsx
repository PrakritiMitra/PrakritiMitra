// src/pages/YourOrganizations.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";

export default function YourOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await axios.get("/api/organizations/approved", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setOrgs(res.data);
      } catch (err) {
        console.error("Failed to fetch your organizations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleCreateOrganization = () => {
    navigate("/register-organization");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-24 px-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Organizations</h1>
          <button
            onClick={handleCreateOrganization}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            + Create New Organization
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : orgs.length === 0 ? (
          <p className="text-gray-600">You're not a member of any organization yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {orgs.map((org) => (
              <div
                key={org._id}
                className="bg-white border rounded shadow p-4 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-blue-700">
                  {org.name}
                </h2>
                <p className="text-sm text-gray-600">{org.description}</p>
                <button
                  className="mt-2 text-sm text-blue-600 underline"
                  onClick={() => navigate(`/organization/${org._id}`)}
                >
                  Go to Dashboard
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
