import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MemberProfilePage from "./page";

const push = vi.fn();
let currentId = "camille-duforest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/members/camille-duforest",
  useRouter: () => ({ push }),
  useParams: () => ({ id: currentId }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

describe("Member profile (/admin/members/[id])", () => {
  it("shows the membership level, account status and metric tiles", () => {
    render(<MemberProfilePage />);

    expect(screen.getByRole("heading", { name: "Camille Duforest" })).toBeInTheDocument();
    expect(screen.getByText("Annual · Active")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getAllByText("$2,516.66").length).toBeGreaterThan(0);
  });

  it("lists the complete booking history with status and charged amount", () => {
    render(<MemberProfilePage />);

    expect(screen.getByText("LP-840388")).toBeInTheDocument();
    expect(screen.getByText("No-show")).toBeInTheDocument();
    expect(screen.getByText("$35.00 fee")).toBeInTheDocument();
  });

  it("shows payment transaction details in the rail", () => {
    render(<MemberProfilePage />);

    expect(screen.getByText("No-show fee — The Ainsworth")).toBeInTheDocument();
    expect(screen.getByText("Sep 14 · Visa 4242 · ch_3PkR2f8Q")).toBeInTheDocument();
  });

  it("opens the booking override drawer from Modify booking", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberProfilePage />);

    await user.click(screen.getByRole("button", { name: "Modify booking" }));

    expect(screen.getByRole("heading", { name: "Modify booking" })).toBeInTheDocument();
  });

  it("exports the member's booking history as a CSV file", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberProfilePage />);

    await user.click(screen.getByRole("button", { name: "Export this member's history" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toContain("camille-duforest");
    expect(csv).toContain("LP-840388");
  });

  it("hides Modify booking for a member without an upcoming visit", () => {
    currentId = "theo-duforest-marin";
    render(<MemberProfilePage />);
    currentId = "camille-duforest";

    expect(screen.queryByRole("button", { name: "Modify booking" })).not.toBeInTheDocument();
  });

  it("calls notFound for an unknown member id", () => {
    currentId = "no-such-member";
    expect(() => render(<MemberProfilePage />)).toThrow("NEXT_NOT_FOUND");
    currentId = "camille-duforest";
  });
});
