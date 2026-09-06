import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LoungeEditPage from "./page";

let currentId = "the-vestry";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/the-vestry",
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: currentId }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Lounge editor (/admin/lounges/[id])", () => {
  it("shows the pending approval chip and the three changes waiting", () => {
    render(<LoungeEditPage />);

    expect(screen.getByRole("heading", { name: "The Vestry" })).toBeInTheDocument();
    expect(screen.getByText("3 changes waiting for approval")).toBeInTheDocument();
    expect(screen.getByText("Amenity added")).toBeInTheDocument();
    expect(screen.getByText("Friday hours extended")).toBeInTheDocument();
    expect(screen.getByText("Photo added")).toBeInTheDocument();
  });

  it("shows the amenity being added and the photo waiting for approval", () => {
    render(<LoungeEditPage />);

    expect(screen.getByText("Showers · being added")).toBeInTheDocument();
    expect(screen.getByText("Shower suite · 3024 × 2016")).toBeInTheDocument();
  });

  it("approves all three changes at once", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungeEditPage />);

    await user.click(screen.getByRole("button", { name: "Approve all three" }));

    expect(screen.queryByText("3 changes waiting for approval")).not.toBeInTheDocument();
    expect(screen.getByText(/Published/)).toBeInTheDocument();
  });

  it("approves changes one by one", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungeEditPage />);

    await user.click(screen.getByRole("button", { name: "Approve one by one" }));
    expect(screen.getByText("2 changes waiting for approval")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Approve one by one" }));
    expect(screen.getByText("1 change waiting for approval")).toBeInTheDocument();
  });

  it("sends the changes back to their author", async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoungeEditPage />);

    await user.click(screen.getByRole("button", { name: "Send back to Theo" }));

    expect(screen.queryByText("3 changes waiting for approval")).not.toBeInTheDocument();
    expect(screen.getByText(/Sent back to Theo/)).toBeInTheDocument();
  });

  it("shows no approval rail for a lounge without pending changes", () => {
    currentId = "the-ainsworth";
    render(<LoungeEditPage />);
    currentId = "the-vestry";

    expect(screen.getByRole("heading", { name: "The Ainsworth" })).toBeInTheDocument();
    expect(screen.queryByText(/\d+ changes? waiting for approval$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve all three" })).not.toBeInTheDocument();
  });

  it("calls notFound for an unknown lounge id", () => {
    currentId = "no-such-lounge";
    expect(() => render(<LoungeEditPage />)).toThrow("NEXT_NOT_FOUND");
    currentId = "the-vestry";
  });
});
