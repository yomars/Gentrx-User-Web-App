import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import Lottie from "lottie-react";
import { Box, Button, Flex, Text, useToast } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import paymentProccesing from "../assets/paymentProccesing.json";
import { ADD } from "../Controllers/ApiControllers";
import showToast from "../Controllers/ShowToast";
import PaymentGetwayData from "../Hooks/Paymntgetways";
import Loading from "../Components/Loading";
import user from "../Controllers/user";
import {
  clearPendingWalletTopup,
  getPendingWalletTopup,
  saveWalletTopupResult,
  updatePendingWalletTopup,
} from "../lib/walletTopup";

function StripePaymentProcess() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { paymentGetwaysLoading, paymentGetwaysData } = PaymentGetwayData();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Please wait!");
  // Extract the payment intent from the URL search parameters
  const queryParams = new URLSearchParams(location.search);
  const source = queryParams.get("source");
  const paymentIntentId = queryParams.get("payment_intent");
  const redirectStatus = queryParams.get("redirect_status");
  const paymentIntentClientSecret = queryParams.get(
    "payment_intent_client_secret"
  );
  const resolvedSource = useMemo(
    () => (typeof source === "string" ? source.toLowerCase() : ""),
    [source]
  );

  useEffect(() => {
    if (paymentGetwaysLoading) {
      return undefined;
    }

    let active = true;
    let timeoutId;

    const resolveStripeStatus = async () => {
      if (paymentIntentClientSecret && paymentGetwaysData?.key) {
        const stripe = await loadStripe(paymentGetwaysData.key);

        if (stripe) {
          const result = await stripe.retrievePaymentIntent(
            paymentIntentClientSecret
          );

          return result?.paymentIntent?.status || redirectStatus;
        }
      }

      return redirectStatus;
    };

    const redirectWithResult = (path, resultMessage) => {
      timeoutId = setTimeout(() => {
        if (resultMessage) {
          showToast(toast, "success", resultMessage);
        }

        navigate(path, { replace: true });
      }, 1500);
    };

    const finalizeWalletTopup = async () => {
      const pendingTopup = getPendingWalletTopup();

      if (!pendingTopup || !user?.id || !user?.token) {
        setStatus("error");
        setMessage("Unable to restore your wallet top-up session.");
        return;
      }

      if (
        pendingTopup.status === "completed" &&
        pendingTopup.paymentTransactionId === paymentIntentId
      ) {
        saveWalletTopupResult({
          status: "success",
          amount: pendingTopup.amount,
          transactionId: paymentIntentId,
          message: "Wallet loaded successfully.",
        });
        clearPendingWalletTopup();
        redirectWithResult(pendingTopup.returnPath || "/", null);
        return;
      }

      if (
        pendingTopup.status === "crediting" &&
        pendingTopup.paymentTransactionId === paymentIntentId
      ) {
        setMessage("Finalizing your wallet balance. Please wait...");
        return;
      }

      updatePendingWalletTopup({
        status: "crediting",
        paymentTransactionId: paymentIntentId,
        creditingAt: Date.now(),
      });

      const response = await ADD(user.token, "add_wallet_money", {
        user_id: user.id,
        amount: pendingTopup.amount,
        payment_transaction_id: paymentIntentId || "Stripe",
        payment_method: pendingTopup.paymentMethod || "stripe",
        transaction_type: "Credited",
        description:
          pendingTopup.description || "Amount credited to user wallet",
      });

      if (response?.response === 200) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user"] }),
          queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        ]);
        updatePendingWalletTopup({
          status: "completed",
          completedAt: Date.now(),
        });
        saveWalletTopupResult({
          status: "success",
          amount: pendingTopup.amount,
          transactionId: paymentIntentId,
          message: "Wallet loaded successfully.",
        });
        clearPendingWalletTopup();
        setStatus("success");
        setMessage("Wallet updated successfully.");
        redirectWithResult(pendingTopup.returnPath || "/", null);
        return;
      }

      setStatus("error");
      setMessage(response?.message || "Unable to credit your wallet.");
    };

    const processStripeReturn = async () => {
      try {
        const stripeStatus = await resolveStripeStatus();

        if (!active) {
          return;
        }

        if (stripeStatus !== "succeeded") {
          if (resolvedSource === "wallet") {
            clearPendingWalletTopup();
          }
          setStatus("error");
          setMessage("Payment was not completed.");
          return;
        }

        if (resolvedSource === "wallet") {
          await finalizeWalletTopup();
          return;
        }

        setStatus("success");
        setMessage("Payment completed successfully.");
        redirectWithResult("/", "Payment Success");
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus("error");
        setMessage(error?.message || "Unable to verify your payment.");
      }
    };

    processStripeReturn();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [
    navigate,
    paymentGetwaysData?.key,
    paymentGetwaysLoading,
    paymentIntentClientSecret,
    paymentIntentId,
    redirectStatus,
    resolvedSource,
    toast,
    queryClient,
  ]);

  if (paymentGetwaysLoading) return <Loading />;

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
        {status === "error" ? "Payment Status" : "Processing Your Payment"}
      </Text>
      <Text textAlign="center" fontSize={20}>
        {message}
      </Text>
      {/* Display the payment intent ID if it's available */}
      {paymentIntentId && (
        <Text textAlign="center" fontSize={16} mt={4} color="gray.600">
          Payment ID: {paymentIntentId}
        </Text>
      )}
      {status === "error" && (
        <Flex justifyContent="center" mt={6}>
          <Button onClick={() => navigate("/", { replace: true })}>
            Back to home
          </Button>
        </Flex>
      )}
    </Box>
  );
}

export default StripePaymentProcess;
