import React from 'react';
import OrganizationCard from './OrganizationCard';

// Sample organization data for demo
const sampleOrganizations = [
  {
    _id: '1',
    name: 'Eco Warriors Mumbai',
    description: 'A dedicated environmental organization focused on beach cleanup, tree planting, and community awareness programs in Mumbai. We work with local communities to create sustainable environmental practices.',
    logoUrl: null,
    website: 'https://ecowarriorsmumbai.org',
    city: 'Mumbai',
    state: 'Maharashtra',
    headOfficeLocation: 'Andheri West',
    yearOfEstablishment: 2018,
    focusArea: 'Environmental Conservation',
    verifiedStatus: 'blueVerified',
    team: [
      { status: 'approved' },
      { status: 'approved' },
      { status: 'pending' }
    ],
    events: [
      { startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 1 week from now
      { startDateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }, // 2 weeks from now
      { startDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 1 week ago
    ],
    memberCount: 45,
    totalEvents: 23,
    upcomingEvents: 8,
    pastEvents: 15,
    volunteerImpact: {
      totalEvents: 23,
      totalVolunteers: 156,
      totalWasteCollectedKg: 1250
    },
    sponsorshipImpact: {
      totalSponsorships: 12,
      totalSponsorshipValue: 250000,
      activeSponsors: 8
    }
  },
  {
    _id: '2',
    name: 'Green Thumbs Delhi',
    description: 'Urban gardening and sustainable agriculture organization promoting rooftop gardens, community farming, and environmental education in Delhi NCR.',
    logoUrl: null,
    website: 'https://greenthumbsdelhi.in',
    city: 'Delhi',
    state: 'Delhi',
    headOfficeLocation: 'Connaught Place',
    yearOfEstablishment: 2020,
    focusArea: 'Urban Agriculture',
    verifiedStatus: 'blueApplicant',
    team: [
      { status: 'approved' },
      { status: 'approved' }
    ],
    events: [
      { startDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }, // 3 days from now
      { startDateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
    ],
    memberCount: 28,
    totalEvents: 15,
    upcomingEvents: 3,
    pastEvents: 12,
    volunteerImpact: {
      totalEvents: 15,
      totalVolunteers: 89,
      totalWasteCollectedKg: 450
    },
    sponsorshipImpact: {
      totalSponsorships: 6,
      totalSponsorshipValue: 120000,
      activeSponsors: 4
    }
  },
  {
    _id: '3',
    name: 'Ocean Guardians Chennai',
    description: 'Marine conservation organization working to protect coastal ecosystems, marine life, and promote sustainable fishing practices along the Tamil Nadu coastline.',
    logoUrl: null,
    website: 'https://oceanguardianschennai.org',
    city: 'Chennai',
    state: 'Tamil Nadu',
    headOfficeLocation: 'Marina Beach',
    yearOfEstablishment: 2019,
    focusArea: 'Marine Conservation',
    verifiedStatus: 'blueChampion',
    team: [
      { status: 'approved' },
      { status: 'approved' },
      { status: 'approved' },
      { status: 'pending' }
    ],
    events: [
      { startDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }, // 5 days from now
      { startDateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
      { startDateTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }, // 8 days ago
    ],
    memberCount: 67,
    totalEvents: 31,
    upcomingEvents: 12,
    pastEvents: 19,
    volunteerImpact: {
      totalEvents: 31,
      totalVolunteers: 234,
      totalWasteCollectedKg: 2100
    },
    sponsorshipImpact: {
      totalSponsorships: 18,
      totalSponsorshipValue: 450000,
      activeSponsors: 12
    }
  }
];

const OrganizationCardDemo = () => {
  const handleCardClick = (org) => {
    console.log('Organization clicked:', org.name);
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">
          Organization Card Component Demo
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-700">Default Variant (360px)</h3>
            <OrganizationCard
              organization={sampleOrganizations[0]}
              onClick={() => console.log('Organization clicked:', sampleOrganizations[0].name)}
              variant="default"
              showStats={true}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-700">Compact Variant (200px)</h3>
            <OrganizationCard
              organization={sampleOrganizations[1]}
              onClick={() => console.log('Organization clicked:', sampleOrganizations[1].name)}
              variant="compact"
              showStats={true}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-700">Detailed Variant (500px)</h3>
            <OrganizationCard
              organization={sampleOrganizations[2]}
              onClick={() => console.log('Organization clicked:', sampleOrganizations[2].name)}
              variant="detailed"
              showStats={true}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-700">Dashboard Variant (320px)</h3>
            <OrganizationCard
              organization={sampleOrganizations[0]}
              onClick={() => console.log('Organization clicked:', sampleOrganizations[0].name)}
              variant="dashboard"
              showStats={true}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-700">Browse Variant (280px)</h3>
            <OrganizationCard
              organization={sampleOrganizations[1]}
              onClick={() => console.log('Organization clicked:', sampleOrganizations[1].name)}
              variant="browse"
              showStats={true}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-700">AutoSize (280px - No Actions)</h3>
            <OrganizationCard
              organization={sampleOrganizations[2]}
              onClick={() => console.log('Organization clicked:', sampleOrganizations[2].name)}
              variant="default"
              showStats={true}
              autoSize={true}
            />
          </div>
        </div>

        {/* Usage Instructions */}
        <section className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Usage Instructions</h2>
          <div className="space-y-4 text-slate-700">
            <div>
              <h3 className="font-semibold text-slate-800">Props:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code className="bg-slate-100 px-2 py-1 rounded">organization</code> - Organization data object</li>
                <li><code className="bg-slate-100 px-2 py-1 rounded">onClick</code> - Click handler function</li>
                <li><code className="bg-slate-100 px-2 py-1 rounded">variant</code> - "default", "compact", or "detailed"</li>
                <li><code className="bg-slate-100 px-2 py-1 rounded">showStats</code> - Boolean to show/hide statistics</li>
                <li><code className="bg-slate-100 px-2 py-1 rounded">className</code> - Additional CSS classes</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-800">Variants:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Default:</strong> Standard card with stats and full information</li>
                <li><strong>Compact:</strong> Minimal card for lists and sidebars</li>
                <li><strong>Detailed:</strong> Large card with impact metrics and extended information</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800">Features:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Responsive design with hover effects</li>
                <li>Verification status indicators</li>
                <li>Member and event statistics</li>
                <li>Impact metrics for detailed variant</li>
                <li>Website links and location information</li>
                <li>Focus area and establishment year</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OrganizationCardDemo;
