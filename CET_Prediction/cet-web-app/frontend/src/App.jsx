import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './config/firebase';
import ChatBot from './components/ChatBot';

// Components
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './components/auth/Profile';
import Predictor from './pages/Predictor';
import LandingPage from './pages/LandingPage';
import ProfileOnboarding from './components/auth/ProfileOnboarding';
import OptionFormBuilder from './components/optionform/OptionFormBuilder';
import CompareColleges from "./pages/CompareColleges";

// Floating Chat Widget Component
const FloatingChatWidget = ({ user }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  
  // Don't show chat widget on landing, login, or signup pages
  const hideOnRoutes = ['/', '/login', '/signup'];
  const shouldHide = hideOnRoutes.includes(location.pathname);
  
  if (shouldHide || !user) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 animate-bounce-slow group"
          aria-label="Open college assistant chat"
        >
          <div className="relative">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
              />
            </svg>
            <span className="absolute -top-2 -right-2 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center">
                <span className="text-xs font-bold text-white">AI</span>
              </span>
            </span>
          </div>
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            College Assistant
          </div>
        </button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">College Admission Assistant</h3>
              <p className="text-sm opacity-90">Ask me about colleges, cutoffs & admissions</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          </div>
          
          {/* Chat Container */}
          <div className="h-[calc(100%-72px)]">
            <ChatBot />
          </div>
        </div>
      )}
    </>
  );
};

// Main App Component
function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-semibold">Loading College Predictor...</p>
          <p className="text-gray-500 mt-2">Setting up your college admission assistant</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="relative">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/signup" 
            element={!user ? <Signup /> : <Navigate to="/dashboard" replace />} 
          />

          {/* Onboarding Route */}
          <Route
            path="/onboarding"
            element={user ? <ProfileOnboarding /> : <Navigate to="/login" replace />}
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/predictor"
            element={user ? <Predictor /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/builder"
            element={user ? <OptionFormBuilder /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/compare"
            element={user ? <CompareColleges /> : <Navigate to="/login" replace />}
          />

          {/* Catch-all - Redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Floating Chat Widget - Only shown when user is logged in */}
        <FloatingChatWidget user={user} />
      </div>
    </Router>
  );
}

export default App;