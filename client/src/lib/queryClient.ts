import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Mocked API logic for frontend-only app
  if (url === "/api/waitlist" && method === "POST") {
    const email = (data as any)?.email;
    if (email && email.endsWith("@duplicate.com")) {
      // Simulate duplicate email error
      return new Response(JSON.stringify({ message: "You're already on our waitlist!" }), { status: 409 });
    }
    return new Response(JSON.stringify({ message: "You've been added to the waitlist!" }), { status: 200 });
  }
  if (url === "/api/newsletter" && method === "POST") {
    const email = (data as any)?.email;
    if (email && email.endsWith("@duplicate.com")) {
      // Simulate duplicate email error
      return new Response(JSON.stringify({ message: "You're already subscribed!" }), { status: 409 });
    }
    return new Response(JSON.stringify({ message: "Thanks for subscribing!" }), { status: 200 });
  }
  // Default mock for other endpoints
  return new Response(JSON.stringify({ message: "Mocked response" }), { status: 200 });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> =>
  async ({ queryKey }) => {
    // Always return a mocked object for queries
    return {} as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
