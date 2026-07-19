import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AtalPersistentShell } from '@/src/components/atal/AtalShell';
import { HomeScreen } from '@/src/screens/HomeScreen';
import { PatientsScreen } from '@/src/screens/PatientsScreen';
import { NewPatientScreen } from '@/src/screens/NewPatientScreen';
import { PatientProfileScreen } from '@/src/screens/PatientProfileScreen';
import { PatientPortalPreviewScreen } from '@/src/screens/PatientPortalPreviewScreen';
import { GuidedSessionFlow } from '@/src/features/guided-session/GuidedSessionFlow';
import { PlansScreen } from '@/src/screens/PlansScreen';
import { PlanBuilderScreen } from '@/src/screens/PlanBuilderScreen';
import { PlanDetailScreen } from '@/src/screens/PlanDetailScreen';
import { ExercisesScreen } from '@/src/screens/ExercisesScreen';
import { NewExerciseScreen } from '@/src/screens/NewExerciseScreen';
import { ExerciseDetailScreen } from '@/src/screens/ExerciseDetailScreen';
import { ActivityScreen } from '@/src/screens/ActivityScreen';
import { ActivityDetailScreen } from '@/src/screens/ActivityDetailScreen';
import { AssistantScreen } from '@/src/screens/AssistantScreen';
import { ExportsScreen } from '@/src/screens/ExportsScreen';
import { SettingsScreen } from '@/src/screens/SettingsScreen';
import { SettingsDetailScreen, type SettingsKind } from '@/src/screens/SettingsDetailScreen';
import { SystemStatesScreen } from '@/src/screens/SystemStatesScreen';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { ClinicalRecordScreen } from '@/src/features/clinical-record/ClinicalRecordScreen';
import { AtalAIDraftReviewScreen } from '@/src/features/atal-ai/AtalAIDraftReviewScreen';
import { FeedbackScreen } from '@/src/screens/FeedbackScreen';

function PatientProfileRoute() { const { id = 'p01' } = useParams(); return <PatientProfileScreen patientId={id} />; }
function PatientPreviewRoute() { const { id = 'p01' } = useParams(); return <PatientPortalPreviewScreen patientId={id} />; }
function PatientSessionRoute() { const { id = 'p01' } = useParams(); return <GuidedSessionFlow patientId={id} />; }
function ClinicalRecordRoute() { const { id = 'p01' } = useParams(); return <ClinicalRecordScreen patientId={id} />; }
function PlanDetailRoute() { const { id = 'pl01' } = useParams(); return <PlanDetailScreen planId={id} />; }
function ExerciseDetailRoute() { const { id = 'e01' } = useParams(); return <ExerciseDetailScreen exerciseId={id} />; }
function ActivityDetailRoute() { const { id = 'p01' } = useParams(); return <ActivityDetailScreen patientId={id} />; }
function SettingsDetailRoute({ kind }: { kind: SettingsKind }) { return <SettingsDetailScreen kind={kind} />; }
function AIDraftRoute() { const { draftId = '' } = useParams(); return <AtalAIDraftReviewScreen draftId={draftId} />; }

function PrivateAppRoutes() {
  return <AtalPersistentShell><Routes>
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
    <Route path="/assistant" element={<AssistantScreen />} />
    <Route path="/assistant/drafts/:draftId" element={<AIDraftRoute />} />
    <Route path="/exports" element={<ExportsScreen />} />
    <Route path="/settings" element={<SettingsScreen />} />
    <Route path="/settings/profile" element={<SettingsDetailRoute kind="profile" />} />
    <Route path="/settings/privacy" element={<SettingsDetailRoute kind="privacy" />} />
    <Route path="/settings/ai" element={<SettingsDetailRoute kind="ai" />} />
    <Route path="/settings/appearance" element={<SettingsDetailRoute kind="appearance" />} />
    <Route path="/settings/feedback" element={<FeedbackScreen />} />
    <Route path="/system-states" element={<SystemStatesScreen />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AtalPersistentShell>;
}

export function App() {
  return <ThemeProvider><BrowserRouter><Routes>
    <Route path="/patients/:id/portal-preview" element={<PatientPreviewRoute />} />
    <Route path="/patients/:id/session" element={<PatientSessionRoute />} />
    <Route path="*" element={<PrivateAppRoutes />} />
  </Routes></BrowserRouter></ThemeProvider>;
}
