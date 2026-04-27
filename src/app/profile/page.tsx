import { redirect } from "next/navigation";

import { AvatarUploader } from "@/components/avatar-uploader";
import { auth } from "@/lib/auth";
import { getCurrentUserProfileData } from "@/lib/profile";
import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const data = await getCurrentUserProfileData(session.user.id);

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Account
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Edit your profile</h1>
          <p className="mt-2 text-sm text-slate-400">
            Update your role, bio, and tutor or tutee details. Changes are used
            everywhere tutors and tutees are shown on TutorLink.
          </p>
        </div>
        <AvatarUploader
          fullName={data.profile?.fullName ?? data.user.email}
          initialAvatarUrl={data.profile?.avatarUrl ?? null}
        />
        <ProfileEditor initialData={data} />
      </div>
    </main>
  );
}
