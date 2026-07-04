import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Total Collateral" value="$1,000.00" />);
    expect(screen.getByText("Total Collateral")).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  it("shows a loading skeleton instead of the value when isLoading is true", () => {
    render(<StatCard label="Total Collateral" value="$1,000.00" isLoading />);
    expect(screen.queryByText("$1,000.00")).not.toBeInTheDocument();
  });

  it("renders an optional hint", () => {
    render(<StatCard label="Health Factor" value="1.85" hint="Above safe threshold" />);
    expect(screen.getByText("Above safe threshold")).toBeInTheDocument();
  });
});
