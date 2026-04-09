import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    category?: string;
    title?: string;
    description?: string;
    steps?: string;
  };

  const title = body.title?.trim().slice(0, 200) ?? "";
  const description = body.description?.trim().slice(0, 3000) ?? "";
  const category = (["ui", "crash", "data", "performance", "other"].includes(body.category ?? "")
    ? body.category : "other") as string;
  const steps = body.steps?.trim().slice(0, 2000) ?? "";

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const toEmail = process.env.BUG_REPORT_EMAIL ?? "atferreira9921@gmail.com";
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    // Log to console when email is not configured (dev mode)
    console.warn("[bug-report] RESEND_API_KEY not set — logging report instead");
    console.info("[bug-report]", { from: user.email, category, title, description, steps });
    return NextResponse.json({ ok: true });
  }

  const categoryLabel: Record<string, string> = {
    ui: "UI / Visual",
    crash: "Crash / Error",
    data: "Wrong data",
    performance: "Performance",
    other: "Other",
  };

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #6366f1 100%); padding: 28px 32px;">
      <div style="font-size: 28px; margin-bottom: 6px;">🐛</div>
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">New Bug Report</h1>
      <p style="color: #c7d2fe; margin: 4px 0 0; font-size: 14px;">Holiday Planner</p>
    </div>
    <div style="padding: 32px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Reported by</td>
          <td style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 600;">${escapeHtml(user.email ?? "unknown")}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Category</td>
          <td style="padding: 8px 0;">
            <span style="background: #ede9fe; color: #7c3aed; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 99px;">
              ${escapeHtml(categoryLabel[category] ?? category)}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Submitted</td>
          <td style="padding: 8px 0; color: #0f172a; font-size: 13px;">${new Date().toUTCString()}</td>
        </tr>
      </table>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 0 0 8px;">Title</p>
        <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">${escapeHtml(title)}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 0 0 8px;">Description</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(description)}</div>
      </div>

      ${steps ? `
      <div>
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 0 0 8px;">Steps to reproduce</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(steps)}</div>
      </div>
      ` : ""}
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Holiday Planner <noreply@holidayplanner.app>",
        to: toEmail,
        subject: `[Bug] ${title}`,
        html,
        reply_to: user.email ?? undefined,
      }),
    });

    if (!res.ok) {
      console.error("[bug-report] Resend error:", await res.text());
      return NextResponse.json({ error: "Failed to send report" }, { status: 502 });
    }
  } catch (err) {
    console.error("[bug-report] fetch error:", err);
    return NextResponse.json({ error: "Failed to send report" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
