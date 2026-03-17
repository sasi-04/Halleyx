import React, { Suspense } from "react";
import CreateRequestClient from "./CreateRequestClient";

export default function CreateRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-8 text-center text-slate-300">
          Loading…
        </div>
      }
    >
      <CreateRequestClient />
    </Suspense>
  );
}

