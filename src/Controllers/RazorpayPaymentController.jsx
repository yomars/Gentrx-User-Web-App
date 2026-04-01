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
  const { settingsData } = useSettingsData();
  const payableAmount = Number(
    type === "Wallet" ? data?.amount : data?.total_amount ?? data?.amount
  );
  const clinicName = settingsData?.find(
    (value) => value.id_name === "clinic_name"
  )?.value;

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

    if (!paymentGetwaysData?.key || !paymentGetwaysData?.secret) {
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
        await loadRazorpaySdk();
      } catch {
        showToast(toast, "error", "Razorpay SDK failed to load.");
        handleCancel();
        return;
      }

      const options = {
        key: paymentGetwaysData?.key,
        amount: Math.round((Number.isFinite(payableAmount) ? payableAmount : 0) * 100),
        currency: currency_name,
        name: clinicName,
        description: data.desc || "Test Transaction",
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
      let formData = {
        amount: payableAmount,
        key: paymentGetwaysData?.key,
        secret: paymentGetwaysData?.secret,
        type: type,
        payload: JSON.stringify(data),
      };

      try {
        setisPaymentLoading(true);
        const response = await ADD(user.token, "create_rz_order", formData);

        if (cancelled) {
          return;
        }

        if (!response?.id) {
          throw new Error(response?.message || "Failed to create Razorpay order.");
        }

        setisPaymentLoading(false);
        placeOrder(response.id);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setisPaymentLoading(false);
        hasStartedCheckoutRef.current = false;
        showToast(
          toast,
          "error",
          error?.message || "Unable to start Razorpay checkout."
        );
        handleCancel();
      }
    };

    RazorPayOrder();

    // Cleanup function to reset references when component unmounts or `isOpen` changes
    return () => {
      cancelled = true;
    };
  }, [
    cancelFn,
    clinicName,
    data,
    data?.desc,
    isOpen,
    nextFn,
    onClose,
    payableAmount,
    paymentGetwaysData?.key,
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
