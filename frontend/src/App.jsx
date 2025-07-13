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
        <Route path="/events" element={<VolunteerEvents />} />
        <Route path="/organization/:id" element={<OrganizationPage />} />
        <Route path="/join-organization" element={<JoinOrganizationPage />} />
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
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
