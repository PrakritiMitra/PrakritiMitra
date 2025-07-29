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
import OrganizerPublicPage from "./pages/OrganizerPublicPage";
import VolunteerPublicPage from "./pages/VolunteerPublicPage";
import EventAttendancePage from './pages/EventAttendancePage';
import OrganizationPublicPage from "./pages/OrganizationPublicPage";
import VolunteerMyEvents from "./pages/VolunteerMyEvents";
import ResourceCenter from "./pages/ResourceCenter";
import CreateEventPage from "./pages/CreateEventPage";
import React, { useState } from "react";
import axios from "./api/axiosInstance";
import ChatBubble from "./components/aiChatbot/ChatBubble";
import ChatWindow from "./components/aiChatbot/ChatWindow";
import FAQSection from "./pages/FAQSection";
import TeamPage from "./pages/Team.jsx";

const SUGGESTED_QUESTIONS = [
  "What is your pricing?",
  "How much does it cost?",
  "Tell me about your price plans.",
  "Hello",
  "Hi",
  "Hey",
  "How do I reset my password?",
  "I forgot my password",
  "How can I contact support?",
  "How do I get support?",
  "What features do you have?",
  "What can you do?",
  "How do I register?",
  "How do I sign up?",
  "How do I create an account?",
  "How do I login?",
  "How do I log in?",
  "How do I sign in?",
  "What events are coming up?",
  "Show me upcoming events",
  "How do I volunteer?",
  "How can I join as a volunteer?",
  "How can my organization partner?",
  "How do I register my organization?",
  "Where is the FAQ?",
  "Frequently asked questions",
  "Where are you based?",
  "What is your location?",
  "How can I donate?",
  "How can I contribute?",
];

function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! How can I help you today?" },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (msg) => {
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: msg },
    ]);
    setLoading(true);
    try {
      const res = await axios.post("/api/chat", { message: msg });
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: res.data.response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (suggestion) => {
    if (!loading) {
      handleSendMessage(suggestion);
    }
  };

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/faqs" element={<FAQSection />} />
          <Route path="/team" element={<TeamPage />} />

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
            path="/volunteer/my-events"
            element={
              <PrivateRoute>
                <VolunteerMyEvents />
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
          <Route
            path="/organizer/:id"
            element={
              <PrivateRoute>
                <OrganizerPublicPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/volunteer/:id"
            element={
              <PrivateRoute>
                <VolunteerPublicPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/events/:eventId/attendance"
            element={
              <PrivateRoute>
                <EventAttendancePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizations/:id"
            element={
              <PrivateRoute>
                <OrganizationPublicPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <PrivateRoute>
                <ResourceCenter />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-event"
            element={
              <PrivateRoute>
                <CreateEventPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
      <ChatBubble onClick={() => setChatOpen(true)} />
      <ChatWindow
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        suggestions={SUGGESTED_QUESTIONS}
        onQuickReply={handleQuickReply}
      />
    </>
  );
}

export default App;
