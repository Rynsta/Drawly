"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-page flex min-h-[200px] items-center justify-center p-4">
          <GlassCard className="max-w-sm text-center">
            <p className="text-sm text-zinc-400">
              {this.state.message || "This panel hit a snag."}
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => this.setState({ hasError: false, message: undefined })}
            >
              Reset
            </Button>
          </GlassCard>
        </div>
      );
    }
    return this.props.children;
  }
}
