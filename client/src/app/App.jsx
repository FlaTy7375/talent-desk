import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../widgets/layout/ui/AppLayout";
import { ProtectedRoute } from "../features/auth";
import HomePage from "../pages/home/ui/HomePage";
import PositionsPage from "../pages/positions/ui/PositionsPage";
import LoginPage from "../pages/login/ui/LoginPage";
import SearchPage from "../pages/search/ui/SearchPage";
import NotFoundPage from "../pages/not-found/ui/NotFoundPage";
import AuthCallbackPage from "../pages/auth-callback/ui/AuthCallbackPage";
import AttributesPage from "../pages/attributes/ui/AttributesPage";
import ProfilePage from "../pages/profile/ui/ProfilePage";
import CvPage from "../pages/cv/ui/CvPage";
import PositionDetailPage from "../pages/position-detail/ui/PositionDetailPage";
import AdminUsersPage from "../pages/admin-users/ui/AdminUsersPage";
import UserPublicPage from "../pages/user-public/ui/UserPublicPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="positions" element={<PositionsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route
            path="attributes"
            element={
              <ProtectedRoute roles={["RECRUITER", "ADMIN"]}>
                <AttributesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/:id"
            element={
              <ProtectedRoute roles={["CANDIDATE", "RECRUITER", "ADMIN"]}>
                <UserPublicPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="cvs/:id"
            element={
              <ProtectedRoute>
                <CvPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="positions/:id"
            element={<PositionDetailPage />}
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
