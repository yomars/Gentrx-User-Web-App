/* eslint-disable react/prop-types */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Spinner,
  Center,
  useToast,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import { ADD } from "./ApiControllers";
import user from "./user";
import showToast from "./ShowToast";
import currency_name from "./CurrName";
import PaymentGetwayData from "../Hooks/Paymntgetways";
import useSettingsData from "../Hooks/SettingData";

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
};

const loadRazorpaySdk = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is unavailable"));
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[data-sdk="razorpay-checkout"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay SDK failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.defer = true;
    script.dataset.sdk = "razorpay-checkout";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });
};

const RazorpayPaymentController = ({
  isOpen,
  onClose,
  data,
  nextFn,
  cancelFn,
  type,
}) => {
  const { paymentGetwaysData } = PaymentGetwayData();
  const [isPaymentLoading, setisPaymentLoading] = useState(false);
  const toast = useToast();
  const razorpayRef = useRef(null);
  const hasStartedCheckoutRef = useRef(false);
  const paymentDescriptionRef = useRef("Test Transaction");
  const paymentPayloadRef = useRef("{}");
  const { settingsData } = useSettingsData();
  const payableAmount = Number(
    type === "Wallet" ? data?.amount : data?.total_amount ?? data?.amount
  );
  const clinicName = settingsData?.find(
    (value) => value.id_name === "clinic_name"
  )?.value;

  useEffect(() => {
    if (!isOpen || hasStartedCheckoutRef.current) {
      return;
    }
    paymentDescriptionRef.current = data?.desc || "Test Transaction";
    paymentPayloadRef.current = JSON.stringify(data || {});
  }, [data, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      hasStartedCheckoutRef.current = false;
      setisPaymentLoading(false);
      if (razorpayRef.current) {
        razorpayRef.current.close();
        razorpayRef.current = null;
      }
      return;
    }

    if (hasStartedCheckoutRef.current) {
      return;
    }

    if (!paymentGetwaysData?.key) {
      showToast(toast, "error", "Razorpay key is missing. Please check payment setup.");
      cancelFn && cancelFn();
      onClose();
      return;
    }

    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      showToast(toast, "error", "Invalid payment amount.");
      cancelFn && cancelFn();
      onClose();
      return;
    }

    let cancelled = false;
    hasStartedCheckoutRef.current = true;

    const cleanupRazorpay = () => {
      if (razorpayRef.current) {
        razorpayRef.current.close();
        razorpayRef.current = null;
      }
    };

    const handleCancel = () => {
      setisPaymentLoading(false);
      hasStartedCheckoutRef.current = false;
      cleanupRazorpay();
      cancelFn && cancelFn();
      onClose();
    };

    const handleSuccess = (paymentId) => {
      setisPaymentLoading(false);
      hasStartedCheckoutRef.current = false;
      cleanupRazorpay();
      nextFn(paymentId);
      onClose();
    };

    const placeOrder = async (order_id) => {
      if (cancelled || razorpayRef.current) return;
      try {
        await withTimeout(
          loadRazorpaySdk(),
          15000,
          "Razorpay SDK timed out. Please check your connection and retry."
        );
      } catch (error) {
        showToast(
          toast,
          "error",
          error?.message || "Razorpay SDK failed to load."
        );
        handleCancel();
        return;
      }

      const options = {
        key: paymentGetwaysData?.key,
        amount: Math.round((Number.isFinite(payableAmount) ? payableAmount : 0) * 100),
        currency: currency_name,
        name: clinicName,
        description: paymentDescriptionRef.current,
        order_id: order_id,
        handler: function (response) {
          handleSuccess(response.razorpay_payment_id);
        },
        modal: {
          ondismiss: function () {
            handleCancel();
          },
        },
        prefill: {
          name: user?.name || "John Doe", // Prefill with user's name
          email: user?.email || "johndoe@example.com", // Prefill with user's email
          contact: user?.phone || "9876543210", // Prefill with user's phone number
          phone: user?.phone || "9876543210", // Prefill with user's phone number
        },
        notes: {
          address: "Razorpay Corporate Office",
        },
        theme: {
          color: "#20409A",
        },
      };

      razorpayRef.current = new window.Razorpay(options);

      razorpayRef.current.on("payment.failed", function (response) {
        showToast(
          toast,
          "error",
          response?.error?.description || "Razorpay payment failed."
        );
        handleCancel();
      });

      razorpayRef.current.on("payment.closed", function () {
        handleCancel();
      });

      razorpayRef.current.open();
    };

    const RazorPayOrder = async () => {
      // NOTE: key is included so the backend knows which gateway is in use;
      // secret is intentionally NOT forwarded — the backend must read it from
      // its own stored credentials, never from a client-supplied value.
      let formData = {
        amount: payableAmount,
        key: paymentGetwaysData?.key,
        type: type,
        payload: paymentPayloadRef.current,
      };

      // Temporary compatibility path for test mode only.
      // Some legacy backends still expect `secret` from request payload.
      if (paymentGetwaysData?.is_test_mode && paymentGetwaysData?.secret) {
        formData.secret = paymentGetwaysData.secret;
      }

      try {
        setisPaymentLoading(true);
        const response = await withTimeout(
          ADD(user.token, "create_rz_order", formData),
          20000,
          "Payment request timed out. Please try again."
        );

        if (cancelled) {
          return;
        }

        // Handle HTTP error responses (e.g., 400 validation errors from backend)
        if (response?.response >= 400) {
          let errorMsg = response?.message || "";
          
          // Provide helpful guidance for common errors
          if (response?.response === 400) {
            errorMsg =
              errorMsg && errorMsg.toLowerCase() !== "error"
                ? errorMsg
                : "Payment setup is incomplete. Please contact support or try again later.";
          } else {
            errorMsg =
              errorMsg && errorMsg.toLowerCase() !== "error"
                ? errorMsg
                : `Request failed with status ${response.response}. Please check your details and try again.`;
          }
          
          throw new Error(errorMsg);
        }

        if (!response?.id) {
          // Provide a meaningful message — backend may return a generic "error" string
          const rawMsg = response?.message || "";
          const friendlyMsg =
            rawMsg && rawMsg.toLowerCase() !== "error"
              ? rawMsg
              : "Unable to start payment. Please try again or contact support.";
          throw new Error(friendlyMsg);
        }

        setisPaymentLoading(false);
        placeOrder(response.id);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setisPaymentLoading(false);
        hasStartedCheckoutRef.current = false;
        const errorMsg =
          error?.message ||
          "Unable to start Razorpay checkout. Please contact support.";
        showToast(toast, "error", errorMsg);
        handleCancel();
      }
    };

    RazorPayOrder();

    // Cleanup function to reset references when component unmounts or `isOpen` changes
    return () => {
      cancelled = true;
      setisPaymentLoading(false);
      hasStartedCheckoutRef.current = false;
    };
  }, [
    cancelFn,
    clinicName,
    isOpen,
    nextFn,
    onClose,
    payableAmount,
    paymentGetwaysData?.key,
    paymentGetwaysData?.is_test_mode,
    paymentGetwaysData?.secret,
    toast,
    type,
  ]); // Added `isOpen` to dependency array

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay
        bg="rgba(0, 0, 0, 0.6)" // Semi-transparent background
        backdropFilter="blur(8px)" // Blur effect
      />
      <ModalContent bg={"transparent"} boxShadow={"none"}>
        <ModalBody>
          <Center>
            {isPaymentLoading ? (
              <Spinner size="xl" thickness="4px" color="#FFF" />
            ) : (
              <>
                <Text fontSize={"md"}>Processing Payment.....</Text>
                <Text fontSize={"sm"}>Please Wait!</Text>
              </>
            )}
          </Center>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default RazorpayPaymentController;
