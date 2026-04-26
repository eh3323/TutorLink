import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";
import { getCurrentUserProfileData } from "@/lib/profile";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const profileData = await getCurrentUserProfileData(session.user.id);
  const { user, profile, tutorProfile, tuteeProfile, capabilities } = profileData;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex rounded bg-emerald-400/15 px-2 py-1 text-sm font-medium text-emerald-200">
              Profile data connected
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              TutorLink Dashboard
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              This protected page now reads real user and profile data from the
              database. It is the backend checkpoint before marketplace,
              messaging, and session flows.
            </p>
          </div>
          <SignOutButton />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">User ID</p>
            <p className="mt-2 break-all text-sm text-white">{user.id}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-2 text-sm text-white">{user.email}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Role</p>
            <p className="mt-2 text-sm text-white">{user.role ?? "Not set"}</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Base profile</h2>
            <dl className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Full name
                </dt>
                <dd className="text-white">{profile?.fullName ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Major</dt>
                <dd className="text-white">{profile?.major ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">School</dt>
                <dd className="text-white">{profile?.school ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  Graduation year
                </dt>
                <dd className="text-white">
                  {profile?.graduationYear?.toString() ?? "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Bio</dt>
                <dd className="text-white">{profile?.bio ?? "Not set"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Role capabilities</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>
                Tutor actions:{" "}
                <span className="text-white">
                  {capabilities.canActAsTutor ? "Enabled" : "Disabled"}
                </span>
              </li>
              <li>
                Tutee actions:{" "}
                <span className="text-white">
                  {capabilities.canActAsTutee ? "Enabled" : "Disabled"}
                </span>
              </li>
              <li>
                School email verified:{" "}
                <span className="text-white">
                  {user.schoolEmailVerifiedAt ? "Yes" : "No"}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Tutor profile</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>
                Headline: <span className="text-white">{tutorProfile?.headline ?? "Not set"}</span>
              </li>
              <li>
                Rate:{" "}
                <span className="text-white">
                  {tutorProfile?.hourlyRateCents != null
                    ? `$${(tutorProfile.hourlyRateCents / 100).toFixed(2)} / hour`
                    : "Not set"}
                </span>
              </li>
              <li>
                Online:{" "}
                <span className="text-white">
                  {tutorProfile ? (tutorProfile.supportsOnline ? "Yes" : "No") : "Unavailable"}
                </span>
              </li>
              <li>
                In person:{" "}
                <span className="text-white">
                  {tutorProfile
                    ? tutorProfile.supportsInPerson
                      ? "Yes"
                      : "No"
                    : "Unavailable"}
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Tutee profile</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>
                Budget:{" "}
                <span className="text-white">
                  {tuteeProfile?.preferredBudgetCents != null
                    ? `$${(tuteeProfile.preferredBudgetCents / 100).toFixed(2)} target`
                    : "Not set"}
                </span>
              </li>
              <li>
                Online:{" "}
                <span className="text-white">
                  {tuteeProfile ? (tuteeProfile.supportsOnline ? "Yes" : "No") : "Unavailable"}
                </span>
              </li>
              <li>
                In person:{" "}
                <span className="text-white">
                  {tuteeProfile
                    ? tuteeProfile.supportsInPerson
                      ? "Yes"
                      : "No"
                    : "Unavailable"}
                </span>
              </li>
              <li>
                Learning goals:{" "}
                <span className="text-white">{tuteeProfile?.learningGoals ?? "Not set"}</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
