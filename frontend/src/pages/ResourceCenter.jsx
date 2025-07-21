import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import ResourceCard from "../components/resources/ResourceCard";

const DOMAIN_LIST = [
  "Beach Cleanup",
  "Tree Plantation",
  "Awareness Drive",
  "Animal Rescue",
  "Education",
];

const TYPE_LIST = [
  { key: "youtube-video", label: "YouTube Video" },
  { key: "pdf", label: "PDF" },
  { key: "image", label: "Image" },
  { key: "blog", label: "Blog" },
  { key: "faq", label: "FAQ" },
  { key: "website", label: "Website" },
  { key: "news", label: "News" },
  { key: "case-study", label: "Case Study" },
  { key: "event-report", label: "Event Report" },
  { key: "interview", label: "Interview" },
  { key: "podcast", label: "Podcast" },
  { key: "workshop", label: "Workshop" },
];

export default function ResourceCenter() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  // Fetch all resources on mount (for initial state)
  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line
  }, []);

  // Fetch resources by domain and type
  const fetchResources = async (domain, type) => {
    setLoading(true);
    setError("");
    try {
      let url = "/resources";
      const params = [];
      if (domain) params.push(`domain=${encodeURIComponent(domain)}`);
      if (type) params.push(`type=${encodeURIComponent(type)}`);
      if (params.length > 0) url += `?${params.join("&")}`;
      const res = await axiosInstance.get(url);
      setResources(res.data);
    } catch (err) {
      setError("Failed to load resources. Please try again later.");
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle domain selection
  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setSelectedType(null);
    setDrawerOpen(false);
    fetchResources(domain, null);
  };

  // Handle type selection
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    fetchResources(selectedDomain, type);
  };

  // Reset filters
  const handleReset = () => {
    setSelectedDomain(null);
    setSelectedType(null);
    fetchResources();
  };

  // Strict filtering on frontend as a safeguard (in case backend returns extra data)
  const filteredResources = resources.filter((resource) => {
    if (selectedDomain && selectedType) {
      return resource.domain === selectedDomain && resource.type === selectedType;
    } else if (selectedDomain) {
      return resource.domain === selectedDomain;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      {/* Side Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={() => setDrawerOpen(false)}
        ></div>
      )}
      {/* Side Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Domain drawer"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h2 className="text-lg font-bold text-blue-800">Domains</h2>
          <button
            className="text-gray-500 hover:text-blue-700 text-2xl font-bold focus:outline-none"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-2">
          {DOMAIN_LIST.map((domain) => (
            <button
              key={domain}
              className={`w-full text-left px-4 py-2 rounded font-medium transition ${selectedDomain === domain ? "bg-blue-100 text-blue-800" : "hover:bg-blue-50 text-gray-700"}`}
              onClick={() => handleDomainSelect(domain)}
            >
              {domain}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 pt-24 px-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-blue-800">Resource Center</h1>
          <div className="flex gap-2">
            {(selectedDomain || selectedType) && (
              <button
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium text-sm"
                onClick={handleReset}
              >
                Reset Filters
              </button>
            )}
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow"
              onClick={() => setDrawerOpen(true)}
            >
              Show Domains
            </button>
          </div>
        </div>
        {/* Type Buttons */}
        {selectedDomain && (
          <div className="mb-6 flex flex-wrap gap-2">
            {TYPE_LIST.map((type) => (
              <button
                key={type.key}
                className={`px-3 py-1 rounded font-medium text-sm border transition ${selectedType === type.key ? "bg-blue-600 text-white border-blue-700" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"}`}
                onClick={() => handleTypeSelect(type.key)}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}
        {/* Resource Cards */}
        {loading ? (
          <div className="text-center py-10 text-lg text-gray-500">Loading resources...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 font-semibold">{error}</div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No resources found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource._id} resource={resource} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
