import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { WaitlistModal } from "./waitlist-modal";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Story 4.1 — "If full option to be on the waitlist" (`Waitlist.dc.html`).
 */
let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `waitlist-modal-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

function renderModal() {
  const onOpenChange = vi.fn();
  const onChangeDate = vi.fn();
  const onJoinWaitlist = vi.fn();

  render(
    <WaitlistModal
      open
      onOpenChange={onOpenChange}
      lounge={ainsworth}
      dateIso="2025-09-14"
      time="3:30 PM"
      onChangeDate={onChangeDate}
      onJoinWaitlist={onJoinWaitlist}
    />,
  );

  return { onOpenChange, onChangeDate, onJoinWaitlist };
}

describe("Waitlist.dc.html", () => {
  it("anuncia que el slot se llenó y ofrece unirse a la lista de espera", () => {
    renderModal();

    expect(screen.getByText("That slot just filled up")).toBeInTheDocument();
    expect(screen.getByText(/Join the waitlist for 3:30 PM/)).toBeInTheDocument();
    expect(screen.getByText("1st in line")).toBeInTheDocument();
  });

  it("ofrece alternativas de hora y de otro lounge cercano", () => {
    renderModal();

    expect(screen.getByText(/Same day, 90 minutes later/)).toBeInTheDocument();
    expect(screen.getByText(/Same time, next day/)).toBeInTheDocument();
    expect(screen.getByText(/1.8 mi from The Ainsworth/)).toBeInTheDocument();
  });

  it("'Join waitlist' llama a onJoinWaitlist", async () => {
    const user = userEvent.setup({ delay: null });
    const { onJoinWaitlist } = renderModal();

    await user.click(screen.getByRole("button", { name: "Join waitlist" }));

    expect(onJoinWaitlist).toHaveBeenCalledTimes(1);
  });

  it("'Change date' llama a onChangeDate", async () => {
    const user = userEvent.setup({ delay: null });
    const { onChangeDate } = renderModal();

    await user.click(screen.getByRole("button", { name: "Change date" }));

    expect(onChangeDate).toHaveBeenCalledTimes(1);
  });
});
