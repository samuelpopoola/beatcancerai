import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import LandingPage from './pages/LandingPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import MedicalRecords from './pages/MedicalRecords';
import CarePlan from './pages/CarePlan';
import Insights from './pages/Insights';
import MedicationScheduler from './pages/MedicationScheduler';
import Messaging from './pages/Messaging';
import TreatmentTracker from './pages/TreatmentTracker';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
// EnvironmentChecker removed: do not render environment banners in production UI

function AppContent() {
  const { currentPage, user, isLoading } = useApp();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLoginClick={() => navigate('/auth')} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'onboarding':
        return <Onboarding />;
      case 'dashboard':
        return <Dashboard />;
      case 'records':
        return <MedicalRecords />;
      case 'care-plan':
        return <CarePlan />;
      case 'insights':
        return <Insights />;
      case 'medications':
        return <MedicationScheduler />;
      case 'messaging':
        return <Messaging />;
      case 'treatment-tracker':
        return <TreatmentTracker />;
      default:
        return <Dashboard />;
    }
  };

  if (currentPage === 'onboarding') {
    return renderPage();
  }

  return <Layout>{renderPage()}</Layout>;
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<AppContent />} />
          <Route path="/medications" element={<Layout><MedicationScheduler /></Layout>} />
          <Route path="/messaging" element={<Layout><Messaging /></Layout>} />
          <Route path="/treatment-tracker" element={<Layout><TreatmentTracker /></Layout>} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
