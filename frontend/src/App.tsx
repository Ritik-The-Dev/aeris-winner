import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AnalysisProvider } from './context/AnalysisContext';
import { Shell } from './components/layout/Shell';
import { Landing } from './components/landing/Landing';
import { OverviewPage } from './components/overview/OverviewPage';
import { WindfieldPage } from './components/windfield/WindfieldPage';
import { AccuracyPage } from './components/accuracy/AccuracyPage';
import { IntervalsPage } from './components/intervals/IntervalsPage';
import { MethodPage } from './components/method/MethodPage';

function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1560px] flex-col items-start px-4 py-24 sm:px-6 lg:px-8">
      <p className="eyebrow">404 / Off the map</p>
      <h1 className="mt-4 max-w-[14ch] font-display text-[clamp(3rem,7vw,6rem)] leading-[0.9] text-paper">
        No interval here.
      </h1>
      <p className="mt-5 max-w-[48ch] text-sm leading-relaxed text-mist">
        This route is outside the audit window. Return to the overview, or open the method
        to see how the window is defined.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/overview" className="btn-primary">
          Return to the audit
        </Link>
        <Link to="/method" className="btn-outline">
          Read the method
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnalysisProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Landing />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="windfield" element={<WindfieldPage />} />
            <Route path="accuracy" element={<AccuracyPage />} />
            <Route path="intervals" element={<IntervalsPage />} />
            <Route path="method" element={<MethodPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AnalysisProvider>
    </BrowserRouter>
  );
}
