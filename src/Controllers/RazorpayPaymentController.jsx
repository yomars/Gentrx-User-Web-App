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
  const { settingsData } = useSettingsData();

  useEffect(() => {
    const title = settingsData?.find(
      (value) => value.id_name === "clinic_name"
    );
    const placeOrder = async (order_id) => {
      if (razorpayRef.current) return;

      const options = {
        key: paymentGetwaysData?.key,
        amount: data.amount * 100,
        currency: currency_name,
        name: title?.value,
        description: data.desc || "Test Transaction",
        order_id: order_id,
        handler: function (response) {
          nextFn(response.razorpay_payment_id);
          onClose();
          razorpayRef.current = null;
          razorpayRef.current.close();
          razorpayRef.current = null;
        },
        modal: {
          ondismiss: function () {
            onClose();
            setisPaymentLoading(false);
            razorpayRef.current = null;
            cancelFn && cancelFn();
            razorpayRef.current.close();
            razorpayRef.current = null;
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
        alert(response.error.description);
        onClose();
        setisPaymentLoading(false);
        razorpayRef.current = null;
        cancelFn && cancelFn();
      });

      razorpayRef.current.on("payment.closed", function () {
        onClose();
        setisPaymentLoading(false);
        razorpayRef.current = null;
        cancelFn && cancelFn();
      });

      razorpayRef.current.open();
    };

    const RazorPayOrder = async () => {
      let formData = {
        amount: type === "Wallet" ? data.amount : data.total_amount,
        key: paymentGetwaysData?.key,
        secret: paymentGetwaysData?.secret,
        type: type,
        payload: JSON.stringify(data),
      };

      try {
        setisPaymentLoading(true);
        const response = await ADD(user.token, "create_rz_order", formData);

        onClose();
        setisPaymentLoading(false);
        placeOrder(response.id);
      } catch (error) {
        setisPaymentLoading(false);
        showToast(toast, "error", JSON.stringify(error));
        onClose();
        razorpayRef.current = null;
      }
    };

    if (isOpen) {
      RazorPayOrder();
    }

    // Cleanup function to reset references when component unmounts or `isOpen` changes
    return () => {
      if (razorpayRef.current) {
        razorpayRef.current.close();
        razorpayRef.current = null;
      }
    };
  }, [
    cancelFn,
    data,
    data.amount,
    data.desc,
    isOpen,
    nextFn,
    onClose,
    paymentGetwaysData?.key,
    paymentGetwaysData?.secret,
    settingsData,
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
