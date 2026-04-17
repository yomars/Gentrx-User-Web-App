import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Main from "./Global/Main";
import ErrorBoundary from "./ErrorBoundary";
import WhatsAppButton from "./Components/WhatsappFloatingBtn";
import { CityProvider } from "./Context/SelectedCity";

// Single stable QueryClient instance — must not be created inside the render function
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 80000,
      refetchOnWindowFocus: true,
      retry: false,
    },
  },
});

export default function App() {

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {" "}
        <CityProvider>
          <Main />
        </CityProvider>
        <WhatsAppButton />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
