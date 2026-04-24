import { useQuery } from "@tanstack/react-query"; // Adjust the import according to your project structure
import { GET } from "../Controllers/ApiControllers";

const parseEnvBool = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const isPlaceholderKey = (key) => {
  if (typeof key !== "string" || key.length === 0) {
    return true;
  }
  return /^x+$/i.test(key.trim());
};

const getData = async () => {
  const res = await GET(`get_payment_gateway_active`);
  return res.data;
};

const PaymentGetwayData = () => {
  const testModeEnabled = parseEnvBool(import.meta.env.VITE_RAZORPAY_TEST_MODE);
  const testModeKey = import.meta.env.VITE_RAZORPAY_TEST_KEY?.trim();
  const testModeSecret = import.meta.env.VITE_RAZORPAY_TEST_SECRET?.trim();

  const {
    isLoading: paymentGetwaysLoading,
    data: paymentGetwaysData,
    error: paymentGetwaysError,
  } = useQuery({
    queryKey: ["payment-getway-active"],
    queryFn: getData,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const shouldUseTestOverride =
    testModeEnabled &&
    (Boolean(testModeKey) || isPlaceholderKey(paymentGetwaysData?.key));

  const mergedPaymentGatewayData = shouldUseTestOverride
    ? {
        ...(paymentGetwaysData || {}),
        title: "Razorpay",
        key: testModeKey || paymentGetwaysData?.key,
        secret: testModeSecret || paymentGetwaysData?.secret,
        is_test_mode: true,
      }
    : paymentGetwaysData;

  return {
    paymentGetwaysLoading,
    paymentGetwaysData: mergedPaymentGatewayData,
    paymentGetwaysError,
  };
};

export default PaymentGetwayData;
