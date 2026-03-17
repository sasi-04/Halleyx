import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "../styles/globals.css";
import { CeoLayout } from "../components/layout/CeoLayout";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <CeoLayout>
        <Component {...pageProps} />
      </CeoLayout>
    </QueryClientProvider>
  );
}

