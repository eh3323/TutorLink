import Link from "next/link";
import { redirect } from "next/navigation";

import { AvatarUploader } from "@/components/avatar-uploader";
import { RoleBadge } from "@/components/role-badge";
import { auth } from "@/lib/auth";
import { getCurrentUserProfileData } from "@/lib/profile";
import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const data = await getCurrentUserProfileData(session.user.id);
  const isAdmin = session.user.isAdmin === true;
  const verificationStatus = data.tutorProfile?.verificationStatus ?? null;
  const isTutor = data.capabilities.canActAsTutor;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Account
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">Edit your profile</h1>
            <RoleBadge role={data.user.role} isAdmin={isAdmin} />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Update your role, bio, and tutor or tutee details. Changes are used
            everywhere tutors and tutees are shown on TutorLink.
          </p>
        </div>

        <Link
          href={`/users/${data.user.id}`}
          className="self-start rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          See how others view your profile →
        </Link>

        {isTutor && verificationStatus !== "VERIFIED" ? (
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 text-sm text-cyan-100">
            <p className="font-semibold text-white">
              {verificationStatus === "PENDING"
                ? "Verification pending"
                : "Get your tutor profile verified"}
            </p>
            <p className="mt-1 text-xs text-cyan-100/80">
              {verificationStatus === "PENDING"
                ? "An admin will review your profile soon. Verified tutors get a badge and rank higher in search."
                : "Fill in your headline, hourly rate, and at least one subject, then click Submit for verification in the Tutor section below. An admin will review and grant the badge."}
            </p>
          </div>
        ) : null}

        <AvatarUploader
          fullName={data.profile?.fullName ?? data.user.email}
          initialAvatarUrl={data.profile?.avatarUrl ?? null}
        />
        <ProfileEditor initialData={data} />
      </div>
    </main>
  );
}
