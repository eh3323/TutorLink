import OpenAI from "openai";

import { ApiError, apiOk, handleRouteError } from "@/lib/api";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

const SYSTEM_PROMPT = `You write tight, useful post-tutoring summaries for both
the tutor and the tutee. You will be given a chat transcript between them.
Produce three short sections in plain markdown headings:

## What we covered
3-5 bullets of concrete topics actually discussed, in plain language.

## Practice for next time
3-5 bullets the tutee should review or work through before the next session.

## Open questions
1-3 questions that came up but weren't fully resolved (skip the section if none).

Keep it under 250 words total. Use the names that appear in the messages
when relevant. Don't hallucinate beyond the transcript. Don't add a closing
sign-off or pleasantries.`;

export async function POST(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    const session = await db.session.findUnique({
      where: { id },
      include: {
        thread: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              include: { sender: { include: { profile: true } } },
            },
          },
        },
        tutor: { include: { profile: true } },
        tutee: { include: { profile: true } },
      },
    });
    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", "Session was not found.");
    }
    if (
      sessionUser.id !== session.tutorId &&
      sessionUser.id !== session.tuteeId
    ) {
      throw new ApiError(403, "FORBIDDEN", "Not a participant.");
    }
    if (session.status !== "COMPLETED" && session.status !== "CONFIRMED") {
      throw new ApiError(
        400,
        "INVALID_STATE",
        "Summaries are generated for confirmed or completed sessions.",
      );
    }

    const messages = session.thread?.messages ?? [];
    if (messages.length < 4) {
      throw new ApiError(
        400,
        "NOT_ENOUGH_CONTEXT",
        "Need a few more chat messages before generating a summary.",
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        503,
        "AI_NOT_CONFIGURED",
        "Set OPENAI_API_KEY on the server to enable AI summaries.",
      );
    }

    // build a transcript: cap to last ~50 messages so we stay well under
    // context limits even for a chatty thread
    const slice = messages.slice(-50);
    const transcript = slice
      .map((m) => {
        const name = m.sender.profile?.fullName ?? m.sender.email;
        return `${name}: ${m.body}`;
      })
      .join("\n");

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Tutor: ${session.tutor.profile?.fullName ?? "Tutor"}\nTutee: ${session.tutee.profile?.fullName ?? "Tutee"}\nSubject: ${session.subjectId}\n\nTranscript:\n${transcript}`,
        },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new ApiError(502, "AI_EMPTY", "AI returned an empty summary.");
    }

    await db.session.update({
      where: { id: session.id },
      data: { summary: text, summaryGeneratedAt: new Date() },
    });

    // also drop a system note in the thread so both sides see it landed
    if (session.threadId) {
      try {
        await db.message.create({
          data: {
            threadId: session.threadId,
            senderId: sessionUser.id,
            body: `📝 generated a session summary — see it on the session page.`,
          },
        });
        await db.messageThread.update({
          where: { id: session.threadId },
          data: { updatedAt: new Date() },
        });
      } catch {
        // not fatal
      }
    }

    return apiOk({ summary: text, generatedAt: new Date().toISOString() });
  } catch (error) {
    return handleRouteError(error);
  }
}
