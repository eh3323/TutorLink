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
  const verificationStatus = data.user.verificationStatus ?? "UNVERIFIED";

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

        {verificationStatus !== "VERIFIED" ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
            <p className="font-semibold text-white">
              {verificationStatus === "PENDING"
                ? "Verification pending"
                : "Get verified"}
            </p>
            <p className="mt-1 text-xs text-amber-100/80">
              {verificationStatus === "PENDING"
                ? "An admin will approve your account soon. You'll get a badge across the platform once approved."
                : "Anyone can apply — tutors and tutees alike. Submit a short note in the Identity verification section below and an admin will review it."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm text-emerald-100">
            <p className="font-semibold text-white">Verified</p>
            <p className="mt-1 text-xs text-emerald-100/80">
              Your account is verified. The badge appears wherever you are
              listed on TutorLink.
            </p>
          </div>
        )}

        <AvatarUploader
          fullName={data.profile?.fullName ?? data.user.email}
          initialAvatarUrl={data.profile?.avatarUrl ?? null}
        />
        <ProfileEditor initialData={data} />
      </div>
    </main>
  );
}
