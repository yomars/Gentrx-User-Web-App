import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Lottie from "lottie-react";
import { Box, Flex, Text, useToast } from "@chakra-ui/react";
import paymentProccesing from "../assets/paymentProccesing.json";
import showToast from "../Controllers/ShowToast";

function StripePaymentProcess() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  // Extract the payment intent from the URL search parameters
  const queryParams = new URLSearchParams(location.search);
  const paymentIntentId = queryParams.get("payment_intent");

  useEffect(() => {
    // Show the payment processing animation and redirect to homepage after 5 seconds
    const timeoutId = setTimeout(() => {
      showToast(toast, "success", "Payment Success");
      navigate("/", { replace: true });
    }, 8000);

    // Cleanup the timeout if the component is unmounted before the delay completes
    return () => clearTimeout(timeoutId);
  }, [navigate, toast]);

  return (
    <Box>
      <Flex justifyContent="center" mt={10}>
        <Lottie
          animationData={paymentProccesing}
          loop={true}
          style={{ width: "300px", maxWidth: "80vw" }}
        />
      </Flex>
      <Text textAlign="center" fontSize={20} fontWeight={600}>
        Processing Your Payment
      </Text>
      <Text textAlign="center" fontSize={20}>
        Please wait!
      </Text>
      {/* Display the payment intent ID if it's available */}
      {paymentIntentId && (
        <Text textAlign="center" fontSize={16} mt={4} color="gray.600">
          Payment ID: {paymentIntentId}
        </Text>
      )}
    </Box>
  );
}

export default StripePaymentProcess;
