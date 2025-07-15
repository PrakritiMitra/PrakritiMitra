// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import RegisterOrganization from "./pages/RegisterOrganization";
import VolunteerEvents from "./pages/VolunteerEvents";
import OrganizationPage from "./pages/OrganizationPage";
import JoinOrganizationPage from "./pages/JoinOrganizationPage";
import YourOrganizations from "./pages/YourOrganizations";
import MyRequests from "./pages/MyRequests";
import ProfilePage from "./pages/ProfilePage";
import EventDetailsPage from "./pages/EventDetailsPage";
import MyEvents from "./pages/MyEvents";
import EditEventPage from "./pages/EditEventPage";
import VolunteerOrganizationPage from "./pages/VolunteerOrganizationPage";
import VolunteerEventDetailsPage from "./pages/VolunteerEventDetailsPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/volunteer/dashboard"
          element={
            <PrivateRoute>
              <VolunteerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/organizer/dashboard"
          element={
            <PrivateRoute>
              <OrganizerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/register-organization"
          element={
            <PrivateRoute>
              <RegisterOrganization />
            </PrivateRoute>
          }
        />
        <Route
          path="/events"
          element={
            <PrivateRoute>
              <VolunteerEvents />
            </PrivateRoute>
          }
        />
        <Route
          path="/organization/:id"
          element={
            <PrivateRoute>
              <OrganizationPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/join-organization"
          element={
            <PrivateRoute>
              <JoinOrganizationPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/your-organizations"
          element={
            <PrivateRoute>
              <YourOrganizations />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-requests"
          element={
            <PrivateRoute>
              <MyRequests />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-events"
          element={
            <PrivateRoute>
              <MyEvents />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <PrivateRoute>
              <EventDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            <PrivateRoute>
              <EditEventPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/volunteer/events/:id"
          element={
            <PrivateRoute>
              <VolunteerEventDetailsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/volunteer/organization/:id"
          element={
            <PrivateRoute>
              <VolunteerOrganizationPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
