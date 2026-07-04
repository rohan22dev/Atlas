import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiquidationBadge } from "./liquidation-badge";
import { HEALTH_FACTOR_MAX } from "@/lib/contracts/config";

describe("LiquidationBadge", () => {
  it("shows Healthy for debt-free / high health positions", () => {
    render(<LiquidationBadge healthFactor={HEALTH_FACTOR_MAX} />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("shows At Risk for a health factor between 1.05 and 1.5", () => {
    render(<LiquidationBadge healthFactor={12_000_000n} />);
    expect(screen.getByText("At Risk")).toBeInTheDocument();
  });

  it("shows Liquidatable for a health factor below 1.0", () => {
    render(<LiquidationBadge healthFactor={9_000_000n} />);
    expect(screen.getByText("Liquidatable")).toBeInTheDocument();
  });
});
