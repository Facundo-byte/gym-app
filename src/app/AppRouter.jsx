import { Route, Routes } from 'react-router'
import AppLayout from '../layouts/AppLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import RoutinesPage from '../pages/RoutinesPage.jsx'
import ExercisesPage from '../pages/ExercisesPage.jsx'
import ExerciseEditorPage from '../pages/ExerciseEditorPage.jsx'
import RoutineDetailPage from '../pages/RoutineDetailPage.jsx'
import RoutineEditorPage from '../pages/RoutineEditorPage.jsx'
import AssignmentEditorPage from '../pages/AssignmentEditorPage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="routines/new" element={<RoutineEditorPage />} />
        <Route path="routines/:id" element={<RoutineDetailPage />} />
        <Route path="routines/:id/edit" element={<RoutineEditorPage />} />
        <Route path="routines/:id/days/:dayOfWeek/assignments/new" element={<AssignmentEditorPage />} />
        <Route path="routines/:id/days/:dayOfWeek/assignments/:assignmentId/edit" element={<AssignmentEditorPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/new" element={<ExerciseEditorPage />} />
        <Route path="exercises/:id/edit" element={<ExerciseEditorPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<LoginPage mode="signup" />} />
        <Route path="forgot-password" element={<LoginPage mode="reset" />} />
        <Route path="account/password" element={<LoginPage mode="password" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
