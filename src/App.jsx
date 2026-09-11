import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { useConference } from './lib/store.jsx';
import { ErrorState, Spinner } from './components/ui.jsx';

import { HomePage } from './pages/HomePage.jsx';
import { SchedulePage } from './pages/SchedulePage.jsx';
import { SessionPage } from './pages/SessionPage.jsx';
import { SpeakersPage } from './pages/SpeakersPage.jsx';
import { SpeakerPage } from './pages/SpeakerPage.jsx';
import { MyPlanPage } from './pages/MyPlanPage.jsx';
import { VenuesPage } from './pages/VenuesPage.jsx';
import { FoodPage } from './pages/FoodPage.jsx';
import { ExpoPage } from './pages/ExpoPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export function App() {
  const { ready, error } = useConference();

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!ready) return <Spinner className="min-h-dvh" />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="sessions/:id" element={<SessionPage />} />
        <Route path="speakers" element={<SpeakersPage />} />
        <Route path="speakers/:id" element={<SpeakerPage />} />
        <Route path="my-plan" element={<MyPlanPage />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route path="food" element={<FoodPage />} />
        <Route path="expo" element={<ExpoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
