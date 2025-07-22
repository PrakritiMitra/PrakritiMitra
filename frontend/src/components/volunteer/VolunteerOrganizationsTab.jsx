import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const VolunteerOrganizationsTab = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data } = await axiosInstance.get("/api/organizations");
        setOrganizations(data);
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  if (loading) return <p>Loading organizations...</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">All Organizations</h2>

      {organizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div
              key={org._id}
              onClick={() => navigate(`/organizations/${org._id}`)}
              className="bg-white border rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer"
            >
              <h3 className="text-lg font-bold text-blue-800 mb-1">{org.name}</h3>
              <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                {org.description || "No description provided."}
              </p>
              {/* Optional: show number of events if populated */}
              {org.events?.length > 0 && (
                <p className="text-xs text-gray-500">
                  {org.events.length} upcoming event{org.events.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No organizations available.</p>
      )}
    </div>
  );
};

export default VolunteerOrganizationsTab;
