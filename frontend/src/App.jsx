import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ActivateVendorPage, ChangePasswordPage, ResetPasswordPage } from './pages/PasswordWorkflowPage.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { VendorDashboard } from './pages/VendorDashboard.jsx';
import { VendorProfilePage } from './pages/VendorProfilePage.jsx';
import { ShowCreatePage } from './pages/ShowCreatePage.jsx';
import { ShowDetailsPage } from './pages/ShowDetailsPage.jsx';
import { ShowEditPage } from './pages/ShowEditPage.jsx';
import { ShowsListPage } from './pages/ShowsListPage.jsx';
import { FloorMapManagementPage } from './pages/FloorMapManagementPage.jsx';
import { MapEditorPage } from './pages/MapEditorPage.jsx';
import { BoothManagementPage } from './pages/BoothManagementPage.jsx';
import { AdminVendorsPage } from './pages/AdminVendorsPage.jsx';
import { AdminVendorCreatePage } from './pages/AdminVendorCreatePage.jsx';
import { AdminVendorDetailPage } from './pages/AdminVendorDetailPage.jsx';
import { VendorShowDetailsPage } from './pages/VendorShowDetailsPage.jsx';
import { VendorFloorMapPage } from './pages/VendorFloorMapPage.jsx';
import { VendorMyBoothPage } from './pages/VendorMyBoothPage.jsx';
import { AdminAssignmentsPage } from './pages/AdminAssignmentsPage.jsx';
import { ShowAssignmentsPage } from './pages/ShowAssignmentsPage.jsx';
import { PublicMapPage } from './pages/PublicMapPage.jsx';
import { PublicVendorDirectoryPage } from './pages/PublicVendorDirectoryPage.jsx';
import { AdminEventDayPage } from './pages/AdminEventDayPage.jsx';
import { AdminQaChecklistPage } from './pages/AdminQaChecklistPage.jsx';
import { AdminReleaseNotesPage } from './pages/AdminReleaseNotesPage.jsx';
import { AdminNotificationsPage } from './pages/AdminNotificationsPage.jsx';
import { AdminHelpPage, VendorHelpPage } from './pages/HelpPages.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { NotFoundPage } from './pages/FallbackPages.jsx';

export function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/vendor/activate" element={<ActivateVendorPage />} />
      <Route path="/vendor/reset-password" element={<ResetPasswordPage />} />
      <Route path="/public/shows/:token/map" element={<PublicMapPage />} />
      <Route path="/public/shows/:token/vendors" element={<PublicVendorDirectoryPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/qa-checklist"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminQaChecklistPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/release-notes"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminReleaseNotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/help"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminHelpPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/booth-assignments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAssignmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:showId/event-day"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminEventDayPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:showId/readiness"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ShowReadinessRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:showId/assignments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ShowAssignmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminVendorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors/new"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminVendorCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors/:vendorId"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminVendorDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors/:vendorId/edit"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <VendorEditRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ShowsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/new"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ShowCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ShowDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ShowEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:showId/booths"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <BoothManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:showId/floor-map"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <FloorMapManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shows/:showId/floor-map/editor"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MapEditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/help"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorHelpPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/profile"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/shows/:showId"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorShowDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/shows/:showId/floor-map"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorFloorMapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/shows/:showId/my-booth"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorMyBoothPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </ErrorBoundary>
  );
}

function VendorEditRedirect() {
  const { vendorId } = useParams();
  return <Navigate to={`/admin/vendors/${vendorId}`} replace />;
}

function ShowReadinessRedirect() {
  const { showId } = useParams();
  return <Navigate to={`/admin/shows/${showId}/edit`} replace />;
}
