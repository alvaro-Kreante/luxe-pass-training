import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MemberSearchPage from "./page";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/members",
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

describe("Member search (/admin/members)", () => {
  it("shows no results before a query is entered", () => {
    render(<MemberSearchPage />);

    expect(screen.getByRole("heading", { name: "Find a member" })).toBeInTheDocument();
    expect(screen.queryByText("Camille Duforest")).not.toBeInTheDocument();
  });

  it("finds members by a partial name and shows the match count", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberSearchPage />);

    await user.type(screen.getByRole("searchbox", { name: /name, email, phone/i }), "duforest");

    expect(screen.getByText("Camille Duforest")).toBeInTheDocument();
    expect(screen.getByText("Théo Duforest-Marin")).toBeInTheDocument();
    expect(screen.getByText("Renée Duforest")).toBeInTheDocument();
    expect(screen.getByText("3 matches")).toBeInTheDocument();
  });

  it("finds a member by the last four digits of their phone", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberSearchPage />);

    await user.type(screen.getByRole("searchbox", { name: /name, email, phone/i }), "4172");

    expect(screen.getByText("Camille Duforest")).toBeInTheDocument();
    expect(screen.getByText("1 match")).toBeInTheDocument();
  });

  it("prefills the query from the ?q= search param", () => {
    searchParams = new URLSearchParams("q=duforest");
    render(<MemberSearchPage />);
    searchParams = new URLSearchParams();

    expect(screen.getByText("Camille Duforest")).toBeInTheDocument();
  });

  it("opens a member profile when a result is activated", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MemberSearchPage />);

    await user.type(screen.getByRole("searchbox", { name: /name, email, phone/i }), "duforest");
    await user.click(screen.getByRole("button", { name: /Camille Duforest/ }));

    expect(push).toHaveBeenCalledWith("/admin/members/camille-duforest");
  });

  it("always shows the cases opened today rail", () => {
    render(<MemberSearchPage />);

    expect(screen.getByText("Opened by you today")).toBeInTheDocument();
    expect(screen.getByText("Marcus Deyn")).toBeInTheDocument();
  });
});
