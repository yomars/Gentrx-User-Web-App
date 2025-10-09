import { useQuery } from "@tanstack/react-query"; // Adjust the import according to your project structure
import { GET } from "../Controllers/ApiControllers";

const getData = async () => {
  const res = await GET(`get_payment_gateway_active`);
  return res.data;
};

const PaymentGetwayData = () => {
  const {
    isLoading: paymentGetwaysLoading,
    data: paymentGetwaysData,
    error: paymentGetwaysError,
  } = useQuery({
    queryKey: ["payment-getway-active"],
    queryFn: getData,
    staleTime: 0, // Data is considered stale immediately
    cacheTime: 0, // Cache will not be stored
    refetchOnWindowFocus: true, // Refetch when the window is focused
    refetchInterval: false, // Disable periodic refetching, set to a number if needed
  });

  return { paymentGetwaysLoading, paymentGetwaysData, paymentGetwaysError };
};

export default PaymentGetwayData;
