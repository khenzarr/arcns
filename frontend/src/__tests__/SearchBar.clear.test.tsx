import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchBar from "../components/SearchBar";

describe("SearchBar clearing behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports an empty value and cancels a pending search when cleared", () => {
    vi.useFakeTimers();
    const onInput = vi.fn();
    const onSearch = vi.fn();

    render(<SearchBar onInput={onInput} onSearch={onSearch} />);
    const input = screen.getByRole("textbox", { name: /search for a flashnames name/i });

    fireEvent.change(input, { target: { value: "a" } });
    expect(onInput).toHaveBeenLastCalledWith("a", "arc");
    expect(screen.getByText("a.arc")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });
    expect(onInput).toHaveBeenLastCalledWith("", "arc");
    expect(screen.queryByText("a.arc")).not.toBeInTheDocument();

    vi.advanceTimersByTime(500);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("reports invalid edits so the parent can clear a stale result", () => {
    const onInput = vi.fn();

    render(<SearchBar onInput={onInput} onSearch={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /search for a flashnames name/i });

    fireEvent.change(input, { target: { value: "alice" } });
    fireEvent.change(input, { target: { value: "-alice" } });

    expect(onInput).toHaveBeenLastCalledWith("-alice", "arc");
    expect(screen.getByText(/cannot start with a hyphen/i)).toBeInTheDocument();
  });
});
