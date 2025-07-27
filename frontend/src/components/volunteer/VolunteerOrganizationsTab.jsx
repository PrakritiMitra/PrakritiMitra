import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const VolunteerOrganizationsTab = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filter organizations based on search term
  const filterOrganizations = (orgs) => {
    if (!searchTerm.trim()) return orgs;
    
    const searchLower = searchTerm.toLowerCase();
    return orgs.filter(org => {
      const name = org.name?.toLowerCase() || '';
      const description = org.description?.toLowerCase() || '';
      const city = org.city?.toLowerCase() || '';
      const state = org.state?.toLowerCase() || '';
      
      return name.includes(searchLower) ||
             description.includes(searchLower) ||
             city.includes(searchLower) ||
             state.includes(searchLower);
    });
  };

  const filteredOrganizations = filterOrganizations(organizations);

  if (loading) return <p>Loading organizations...</p>;

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search organizations by name, description, city, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">All Organizations</h2>

      {filteredOrganizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrganizations.map((org) => (
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
      ) : searchTerm ? (
        <p className="text-gray-500">No organizations found matching "{searchTerm}".</p>
      ) : (
        <p className="text-gray-500">No organizations available.</p>
      )}
    </div>
  );
};

export default VolunteerOrganizationsTab;
