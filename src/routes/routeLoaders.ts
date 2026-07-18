const loaders = {
  home: () => import('@/src/screens/HomeScreen'), patients: () => import('@/src/screens/PatientsScreen'), newPatient: () => import('@/src/screens/NewPatientScreen'), patient: () => import('@/src/screens/PatientProfileScreen'), portal: () => import('@/src/screens/PatientPortalPreviewScreen'), session: () => import('@/src/features/guided-session/GuidedSessionFlow'), plans: () => import('@/src/screens/PlansScreen'), newPlan: () => import('@/src/screens/PlanBuilderScreen'), plan: () => import('@/src/screens/PlanDetailScreen'), exercises: () => import('@/src/screens/ExercisesScreen'), newExercise: () => import('@/src/screens/NewExerciseScreen'), exercise: () => import('@/src/screens/ExerciseDetailScreen'), activity: () => import('@/src/screens/ActivityScreen'), activityDetail: () => import('@/src/screens/ActivityDetailScreen'), assistant: () => import('@/src/screens/AssistantScreen'), exports: () => import('@/src/screens/ExportsScreen'), settings: () => import('@/src/screens/SettingsScreen'), settingsDetail: () => import('@/src/screens/SettingsDetailScreen'), systemStates: () => import('@/src/screens/SystemStatesScreen'), record: () => import('@/src/features/clinical-record/ClinicalRecordScreen'), draft: () => import('@/src/features/atal-ai/AtalAIDraftReviewScreen'), feedback: () => import('@/src/screens/FeedbackScreen'),
};

export const routeLoaders = loaders;

export function preloadHref(href: string) {
  const path = href.split('?')[0];
  if (path === '/') return loaders.home();
  if (path === '/patients') return loaders.patients();
  if (path === '/patients/new') return loaders.newPatient();
  if (/^\/patients\/[^/]+\/session$/.test(path)) return loaders.session();
  if (/^\/patients\/[^/]+\/portal-preview$/.test(path)) return loaders.portal();
  if (/^\/patients\/[^/]+\/clinical-record$/.test(path)) return loaders.record();
  if (path.startsWith('/patients/')) return loaders.patient();
  if (path === '/plans') return loaders.plans();
  if (path === '/plans/new') return loaders.newPlan();
  if (path.startsWith('/plans/')) return loaders.plan();
  if (path === '/exercises') return loaders.exercises();
  if (path === '/exercises/new') return loaders.newExercise();
  if (path.startsWith('/exercises/')) return loaders.exercise();
  if (path === '/activity') return loaders.activity();
  if (path.startsWith('/activity/')) return loaders.activityDetail();
  if (path.startsWith('/assistant/drafts/')) return loaders.draft();
  if (path === '/assistant') return loaders.assistant();
  if (path === '/exports') return loaders.exports();
  if (path === '/settings/feedback') return loaders.feedback();
  if (path.startsWith('/settings/')) return loaders.settingsDetail();
  if (path === '/settings') return loaders.settings();
  if (path === '/system-states') return loaders.systemStates();
  return Promise.resolve();
}
