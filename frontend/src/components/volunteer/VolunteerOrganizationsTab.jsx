import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import OrganizationCard from "../common/OrganizationCard";

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
      const focusArea = org.focusArea?.toLowerCase() || '';
      const focusAreaOther = org.focusAreaOther?.toLowerCase() || '';
      
      return name.includes(searchLower) ||
             description.includes(searchLower) ||
             city.includes(searchLower) ||
             state.includes(searchLower) ||
             focusArea.includes(searchLower) ||
             focusAreaOther.includes(searchLower);
    });
  };

  const filteredOrganizations = filterOrganizations(organizations);

  const handleOrganizationClick = (organization) => {
    navigate(`/organizations/${organization._id}`);
  };

  if (loading) return <p>Loading organizations...</p>;

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search organizations by name, description, city, state, or focus area..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => (
            <div key={org._id} className="transform hover:-translate-y-1 transition-all duration-300">
              <OrganizationCard
                organization={org}
                onClick={() => handleOrganizationClick(org)}
                variant="default"
                showStats={true}
                autoSize={true}
              />
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
