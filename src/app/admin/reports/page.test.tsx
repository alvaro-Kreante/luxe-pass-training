import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ExportPage from "./page";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/reports",
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/download", () => ({
  downloadTextFile: vi.fn(),
}));

import { downloadTextFile } from "@/lib/download";

describe("Export data (/admin/reports)", () => {
  it("defaults to the Bookings dataset with its row count in the rail", () => {
    render(<ExportPage />);

    expect(screen.getByRole("heading", { name: "Export data" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Bookings/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("1,208 bookings")).toBeInTheDocument();
  });

  it("updates the row count when a different dataset is chosen", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await user.click(screen.getByRole("radio", { name: /^Members/ }));

    expect(screen.getByText("1,842 members")).toBeInTheDocument();
  });

  it("preselects the dataset from the ?dataset= query param", () => {
    searchParams = new URLSearchParams("dataset=revenue-by-partner");
    render(<ExportPage />);
    searchParams = new URLSearchParams();

    expect(screen.getByRole("radio", { name: /Revenue by partner/ })).toHaveAttribute("aria-checked", "true");
  });

  it("removes a filter chip when its close button is activated", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    expect(screen.getByText("New York")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove New York" }));

    expect(screen.queryByText("New York")).not.toBeInTheDocument();
  });

  it("shows 9 columns selected by default with no personal data", () => {
    render(<ExportPage />);

    expect(screen.getByText("9 · no personal data")).toBeInTheDocument();
  });

  it("requires a reason before a personal column can be included", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await user.click(screen.getByRole("checkbox", { name: "Member name" }));

    expect(screen.getByRole("textbox", { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download CSV" })).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /reason/i }), "Finance audit request");

    expect(screen.getByRole("button", { name: "Download CSV" })).toBeEnabled();
  });

  it("downloads a CSV for the current dataset and columns", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, csv] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toContain("bookings");
    expect(csv).toContain("Booking reference");
  });

  it("changes the primary action label with the delivery method", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExportPage />);

    await user.click(screen.getByRole("radio", { name: /Email it to me/ }));
    expect(screen.getByRole("button", { name: "Email me the CSV" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Save as a scheduled report/ }));
    expect(screen.getByRole("button", { name: "Save scheduled report" })).toBeInTheDocument();
  });

  it("preselects Save as a scheduled report from ?delivery=schedule", () => {
    searchParams = new URLSearchParams("delivery=schedule");
    render(<ExportPage />);
    searchParams = new URLSearchParams();

    expect(screen.getByRole("radio", { name: /Save as a scheduled report/ })).toHaveAttribute("aria-checked", "true");
  });
});
