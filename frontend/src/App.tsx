import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TenantProvider } from "@/contexts/TenantContext";
import { OwnerOnboardingGate } from "@/components/OwnerOnboardingGate";
import { PageTransition } from "@/components/PageTransition";
import NotFound from "./pages/NotFound";

import Landing from "./pages/Landing";
import GymLogin from "./pages/GymLogin";
import AdminLogin from "./pages/AdminLogin";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminGyms from "./pages/admin/Gyms";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminSettings from "./pages/admin/Settings";

import OwnerLayout from "./layouts/OwnerLayout";
import OwnerDashboard from "./pages/owner/Dashboard";
import OwnerMembers from "./pages/owner/Members";
import OwnerMemberProfile from "./pages/owner/MemberProfile";
import OwnerAddMember from "./pages/owner/AddMember";
import OwnerMemberships from "./pages/owner/Memberships";
import OwnerAttendance from "./pages/owner/Attendance";
import OwnerDietTemplates from "./pages/owner/DietTemplates";
import OwnerExpenses from "./pages/owner/Expenses";
import OwnerPayroll from "./pages/owner/Payroll";
import OwnerReminders from "./pages/owner/Reminders";
import OwnerStaff from "./pages/owner/Staff";
import OwnerSettings from "./pages/owner/Settings";
import OwnerOnboarding from "./pages/owner/Onboarding";
import OwnerDemo from "./pages/demo/OwnerDemo";

import TrainerLayout from "./layouts/TrainerLayout";
import TrainerDashboard from "./pages/trainer/Dashboard";

import MemberLayout from "./layouts/MemberLayout";
import MemberDashboard from "./pages/member/Dashboard";
import MemberCheckIn from "./pages/member/CheckIn";
import MemberDiet from "./pages/member/Diet";
import MemberProgress from "./pages/member/Progress";
import MemberMembership from "./pages/member/Membership";
import MemberProfilePage from "./pages/member/Profile";
import ChangePasswordRequired from "./pages/ChangePasswordRequired";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <PageTransition>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/demo/:gymSlug" element={<OwnerDemo />} />

            {/* Super Admin — protected */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="gyms" element={<AdminGyms />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Per-gym login */}
            <Route path="/:gymSlug" element={
              <TenantProvider><GymLogin /></TenantProvider>
            } />

            {/* Owner — protected */}
            <Route path="/:gymSlug/owner" element={
              <TenantProvider>
                <ProtectedRoute allowedRoles={["owner"]} gymScoped>
                  <OwnerOnboardingGate>
                    <OwnerLayout />
                  </OwnerOnboardingGate>
                </ProtectedRoute>
              </TenantProvider>
            }>
              <Route index element={<OwnerDashboard />} />
              <Route path="members" element={<OwnerMembers />} />
              <Route path="members/new" element={<OwnerAddMember />} />
              <Route path="members/:id" element={<OwnerMemberProfile />} />
              <Route path="memberships" element={<OwnerMemberships />} />
              <Route path="attendance" element={<OwnerAttendance />} />
              <Route path="diet" element={<OwnerDietTemplates />} />
              <Route path="expenses" element={<OwnerExpenses />} />
              <Route path="payroll" element={<OwnerPayroll />} />
              <Route path="reminders" element={<OwnerReminders />} />
              <Route path="staff" element={<OwnerStaff />} />
              <Route path="settings" element={<OwnerSettings />} />
            </Route>

            <Route path="/:gymSlug/onboarding" element={
              <TenantProvider>
                <ProtectedRoute allowedRoles={["owner"]} gymScoped>
                  <OwnerOnboarding />
                </ProtectedRoute>
              </TenantProvider>
            } />

            <Route path="/:gymSlug/change-password-required" element={
              <TenantProvider>
                <ProtectedRoute allowedRoles={["owner", "trainer", "member"]} gymScoped>
                  <ChangePasswordRequired />
                </ProtectedRoute>
              </TenantProvider>
            } />

            {/* Trainer — protected */}
            <Route path="/:gymSlug/trainer" element={
              <TenantProvider>
                <ProtectedRoute allowedRoles={["trainer"]} gymScoped>
                  <TrainerLayout />
                </ProtectedRoute>
              </TenantProvider>
            }>
              <Route index element={<TrainerDashboard />} />
              <Route path="members" element={<OwnerMembers />} />
              <Route path="diet" element={<OwnerDietTemplates />} />
              <Route path="attendance" element={<OwnerAttendance />} />
            </Route>

            {/* Member — protected */}
            <Route path="/:gymSlug/member" element={
              <TenantProvider>
                <ProtectedRoute allowedRoles={["member"]} gymScoped>
                  <MemberLayout />
                </ProtectedRoute>
              </TenantProvider>
            }>
              <Route index element={<MemberDashboard />} />
              <Route path="checkin" element={<MemberCheckIn />} />
              <Route path="diet" element={<MemberDiet />} />
              <Route path="progress" element={<MemberProgress />} />
              <Route path="membership" element={<MemberMembership />} />
              <Route path="profile" element={<MemberProfilePage />} />
            </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageTransition>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
