import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AtalPersistentShell } from '@/src/components/atal/AtalShell';
import type { SettingsKind } from '@/src/screens/SettingsDetailScreen';
import { ThemeProvider } from '@/src/context/ThemeContext';

const HomeScreen = lazy(() => import('@/src/screens/HomeScreen').then((module) => ({ default: module.HomeScreen })));
const PatientsScreen = lazy(() => import('@/src/screens/PatientsScreen').then((module) => ({ default: module.PatientsScreen })));
const NewPatientScreen = lazy(() => import('@/src/screens/NewPatientScreen').then((module) => ({ default: module.NewPatientScreen })));
const PatientProfileScreen = lazy(() => import('@/src/screens/PatientProfileScreen').then((module) => ({ default: module.PatientProfileScreen })));
const PatientPortalPreviewScreen = lazy(() => import('@/src/screens/PatientPortalPreviewScreen').then((module) => ({ default: module.PatientPortalPreviewScreen })));
const GuidedSessionFlow = lazy(() => import('@/src/features/guided-session/GuidedSessionFlow').then((module) => ({ default: module.GuidedSessionFlow })));
const PlansScreen = lazy(() => import('@/src/screens/PlansScreen').then((module) => ({ default: module.PlansScreen })));
const PlanBuilderScreen = lazy(() => import('@/src/screens/PlanBuilderScreen').then((module) => ({ default: module.PlanBuilderScreen })));
const PlanDetailScreen = lazy(() => import('@/src/screens/PlanDetailScreen').then((module) => ({ default: module.PlanDetailScreen })));
const ExercisesScreen = lazy(() => import('@/src/screens/ExercisesScreen').then((module) => ({ default: module.ExercisesScreen })));
const NewExerciseScreen = lazy(() => import('@/src/screens/NewExerciseScreen').then((module) => ({ default: module.NewExerciseScreen })));
const ExerciseDetailScreen = lazy(() => import('@/src/screens/ExerciseDetailScreen').then((module) => ({ default: module.ExerciseDetailScreen })));
const ActivityScreen = lazy(() => import('@/src/screens/ActivityScreen').then((module) => ({ default: module.ActivityScreen })));
const ActivityDetailScreen = lazy(() => import('@/src/screens/ActivityDetailScreen').then((module) => ({ default: module.ActivityDetailScreen })));
const AssistantScreen = lazy(() => import('@/src/screens/AssistantScreen').then((module) => ({ default: module.AssistantScreen })));
const ExportsScreen = lazy(() => import('@/src/screens/ExportsScreen').then((module) => ({ default: module.ExportsScreen })));
const SettingsScreen = lazy(() => import('@/src/screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen })));
const SettingsDetailScreen = lazy(() => import('@/src/screens/SettingsDetailScreen').then((module) => ({ default: module.SettingsDetailScreen })));
const SystemStatesScreen = lazy(() => import('@/src/screens/SystemStatesScreen').then((module) => ({ default: module.SystemStatesScreen })));
const ClinicalRecordScreen = lazy(() => import('@/src/features/clinical-record/ClinicalRecordScreen').then((module) => ({ default: module.ClinicalRecordScreen })));
const AtalAIDraftReviewScreen = lazy(() => import('@/src/features/atal-ai/AtalAIDraftReviewScreen').then((module) => ({ default: module.AtalAIDraftReviewScreen })));
const FeedbackScreen = lazy(() => import('@/src/screens/FeedbackScreen').then((module) => ({ default: module.FeedbackScreen })));

function PatientProfileRoute() { const { id = 'p01' } = useParams(); return <PatientProfileScreen patientId={id} />; }
function PatientPreviewRoute() { const { id = 'p01' } = useParams(); return <PatientPortalPreviewScreen patientId={id} />; }
function PatientSessionRoute() { const { id = 'p01' } = useParams(); return <GuidedSessionFlow patientId={id} />; }
function ClinicalRecordRoute() { const { id = 'p01' } = useParams(); return <ClinicalRecordScreen patientId={id} />; }
function PlanDetailRoute() { const { id = 'pl01' } = useParams(); return <PlanDetailScreen planId={id} />; }
function ExerciseDetailRoute() { const { id = 'e01' } = useParams(); return <ExerciseDetailScreen exerciseId={id} />; }
function ActivityDetailRoute() { const { id = 'p01' } = useParams(); return <ActivityDetailScreen patientId={id} />; }
function SettingsDetailRoute({ kind }: { kind: SettingsKind }) { return <SettingsDetailScreen kind={kind} />; }
function AIDraftRoute() { const { draftId = '' } = useParams(); return <AtalAIDraftReviewScreen draftId={draftId} />; }
function RouteLoader() { return <div className="atal-route-skeleton" role="status" aria-live="polite"><span /><span /><span /><small>Cargando Atal…</small></div>; }

function PrivateAppRoutes() {
  return <AtalPersistentShell><Suspense fallback={<RouteLoader />}><Routes>
    <Route path="/" element={<HomeScreen />} />
    <Route path="/patients" element={<PatientsScreen />} />
    <Route path="/patients/new" element={<NewPatientScreen />} />
    <Route path="/patients/:id" element={<PatientProfileRoute />} />
    <Route path="/patients/:id/clinical-record" element={<ClinicalRecordRoute />} />
    <Route path="/plans" element={<PlansScreen />} />
    <Route path="/plans/new" element={<PlanBuilderScreen />} />
    <Route path="/plans/:id" element={<PlanDetailRoute />} />
    <Route path="/exercises" element={<ExercisesScreen />} />
    <Route path="/exercises/new" element={<NewExerciseScreen />} />
    <Route path="/exercises/:id" element={<ExerciseDetailRoute />} />
    <Route path="/activity" element={<ActivityScreen />} />
    <Route path="/activity/:id" element={<ActivityDetailRoute />} />
    <Route path="/exports" element={<ExportsScreen />} />
    <Route path="/settings" element={<SettingsScreen />} />
    <Route path="/settings/profile" element={<SettingsDetailRoute kind="profile" />} />
    <Route path="/settings/privacy" element={<SettingsDetailRoute kind="privacy" />} />
    <Route path="/settings/ai" element={<SettingsDetailRoute kind="ai" />} />
    <Route path="/settings/appearance" element={<SettingsDetailRoute kind="appearance" />} />
    <Route path="/settings/feedback" element={<FeedbackScreen />} />
    <Route path="/system-states" element={<SystemStatesScreen />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></AtalPersistentShell>;
}

export function App() {
  return <ThemeProvider><BrowserRouter><Routes>
    <Route path="/patients/:id/portal-preview" element={<Suspense fallback={<RouteLoader />}><PatientPreviewRoute /></Suspense>} />
    <Route path="/patients/:id/session" element={<Suspense fallback={<RouteLoader />}><PatientSessionRoute /></Suspense>} />
    <Route path="/assistant" element={<Suspense fallback={<RouteLoader />}><AssistantScreen /></Suspense>} />
    <Route path="/assistant/drafts/:draftId" element={<Suspense fallback={<RouteLoader />}><AIDraftRoute /></Suspense>} />
    <Route path="*" element={<PrivateAppRoutes />} />
  </Routes></BrowserRouter></ThemeProvider>;
}
