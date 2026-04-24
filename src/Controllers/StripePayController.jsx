/* eslint-disable react/prop-types */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Center,
  useToast,
  Text,
  Button,
  Flex,
  Box,
  ModalHeader,
  ModalCloseButton,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js/pure";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { ADD } from "./ApiControllers";
import user from "./user";
import PaymentGetwayData from "../Hooks/Paymntgetways";
import Loading from "../Components/Loading";
import ISD_CODES from "./ISDCODES";
import showToast from "./ShowToast";
import {
  clearPendingAppointmentPayment,
  clearPendingWalletTopup,
  savePendingAppointmentPayment,
  savePendingWalletTopup,
} from "../lib/walletTopup";

// Stripe initialization
const getStripePromise = (key) => loadStripe(key);

const resolveStripeReturnBaseUrl = () => {
  const configuredFrontendOrigin = String(
    import.meta.env.VITE_FRONTEND_ORIGIN || import.meta.env.VITE_APP_ORIGIN || ""
  ).trim();

  if (configuredFrontendOrigin) {
    return configuredFrontendOrigin.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "https://gentrx.ph";
  }

  if (window.location.hostname.toLowerCase() === "api.gentrx.ph") {
    return "https://gentrx.ph";
  }

  return window.location.origin;
};

const formattedData = (data) => {
  const canonicalDoctorId = data.doctor_id || data.doct_id || "";
  const canonicalPatientCode = data.patient_code || data.patient_id || "";

  return {
    family_member_id: data.family_member_id,
    doctor_id: canonicalDoctorId,
    patient_code: canonicalPatientCode,
    status: data.status,
    date: data.date,
    time_slots: data.time_slots,
    doct_id: data.doct_id || canonicalDoctorId,
    dept_id: data.dept_id,
    type: data.type,
    payment_status: data.payment_status,
    fee: parseFloat(data.fee).toFixed(1),
    service_charge: parseFloat(data.service_charge).toFixed(1),
    tax: parseFloat(data.tax).toFixed(1),
    unit_tax_amount: parseFloat(data.unit_tax_amount).toFixed(1),
    total_amount: parseFloat(data.total_amount).toFixed(1),
    unit_total_amount: parseFloat(data.unit_total_amount).toFixed(1),
    invoice_description: data.invoice_description,
    payment_method: data.payment_method,
    user_id: data.user_id,
    is_wallet_txn: data.is_wallet_txn,
    coupon_id: data.coupon_id,
    coupon_title: data.coupon_title,
    coupon_value: data.coupon_value,
    coupon_off_amount: parseFloat(data.coupon_off_amount).toFixed(1),
    source: data.source,
  };
};

// Checkout Form
const CheckoutForm = ({ onSuccess, onCancel, type, data }) => {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!elements) return;

    const paymentElement = elements.getElement("payment");
    if (paymentElement) {
      const checkCompletion = (event) => setIsComplete(event.complete);

      paymentElement.on("change", checkCompletion);

      return () => paymentElement.off("change", checkCompletion);
    }
  }, [elements]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !isComplete) {
      showToast(toast, "error", "Please complete the payment details.");
      return;
    }

    setIsLoading(true);

    try {
      if (type === "Wallet") {
        savePendingWalletTopup({
          amount: data.amount,
          paymentMethod: "stripe",
          description: "Amount credited to user wallet",
          returnPath: `${window.location.pathname}${window.location.search}`,
          source: "wallet",
          status: "pending",
          userId: user?.id,
        });
      } else if (type === "Appointment") {
        savePendingAppointmentPayment({
          appointment: data,
          paymentMethod: "stripe",
          source: "appointment",
          status: "pending",
          userId: user?.id,
        });
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            return_url: `${resolveStripeReturnBaseUrl()}/stripe-payment?source=${type.toLowerCase()}`,
          },
        }
      );

      if (stripeError) {
        if (type === "Wallet") {
          clearPendingWalletTopup();
        } else if (type === "Appointment") {
          clearPendingAppointmentPayment();
        }
        setError(stripeError.message);
        showToast(toast, "error", stripeError.message);
        onCancel();
      } else if (paymentIntent?.status === "succeeded") {
        if (type === "Wallet") {
          clearPendingWalletTopup();
        }
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      if (type === "Wallet") {
        clearPendingWalletTopup();
      } else if (type === "Appointment") {
        clearPendingAppointmentPayment();
      }
      setError(err.message);
      showToast(toast, "error", err.message);
      onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex flexDir="column" w="100%">
      <Box as="form" onSubmit={handleSubmit}>
        <PaymentElement />
        <Center mt={4}>
          <Button
            size="sm"
            type="submit"
            colorScheme="green"
            w="100%"
            isLoading={isLoading}
            disabled={!stripe}
          >
            Pay Now
          </Button>
        </Center>
        {error && <Text color="red.500">{error}</Text>}
      </Box>
    </Flex>
  );
};

// Main Stripe Payment Controller
const StripePaymentController = ({
  isOpen,
  onClose,
  data,
  nextFn,
  cancelFn,
  type,
}) => {
  const { paymentGetwaysLoading, paymentGetwaysData } = PaymentGetwayData();
  const toast = useToast();
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [, setisLoading] = useState(false);
  const [addressData, setAddressData] = useState({
    name: data.name || "",
    address: "",
    city: "",
    state: "",
    country: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setisLoading(true);
    try {
      const formData = {
        name: addressData.name,
        address_line1: addressData.address,
        city: addressData.city,
        state: addressData.state,
        country: addressData.country,
        STRIPE_SECRET_KEY: paymentGetwaysData.secret,
        amount: type === "Wallet" ? data.amount : data.total_amount,
        currency: "USD",
        payload:
          type === "Wallet"
            ? JSON.stringify(data)
            : JSON.stringify(formattedData(data)),
        description: data.desc,
        type,
      };
      const res = await ADD(user.token, "create_intent", formData);
      setisLoading(false);
      if (res.response !== 200) {
        throw new Error(res.message);
      }
      setPaymentIntent(res);
    } catch (error) {
      setisLoading(false);
      showToast(toast, "error", error.message);
    }
  };

  const handleSuccess = (paymentId) => {
    setPaymentIntent(null);
    nextFn(paymentId);
    onClose();
  };

  const handleCancel = () => {
    setPaymentIntent(null);
    cancelFn?.();
    onClose();
  };

  if (paymentGetwaysLoading) return <Loading />;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size={{ base: "full", md: "md" }}
      closeOnOverlayClick={false}
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Stripe Secure Payment</ModalHeader>
        <ModalCloseButton />
        <Divider />
        <ModalBody>
          <Center>
            {paymentIntent ? (
              <Elements
                stripe={getStripePromise(paymentGetwaysData.key)}
                options={{ clientSecret: paymentIntent.client_secret }}
              >
                <CheckoutForm
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                  type={type}
                  data={data}
                />
              </Elements>
            ) : (
              <Box
                as="form"
                onSubmit={handleSubmit}
                p={4}
                borderWidth="1px"
                borderRadius="md"
              >
                <VStack spacing={4}>
                  <Text
                    fontWeight="600"
                    bg="green.100"
                    p={2}
                    borderRadius="md"
                    textAlign="center"
                  >
                    Please Fill the Details
                  </Text>

                  <FormControl isRequired>
                    <FormLabel>Name</FormLabel>
                    <Input
                      name="name"
                      value={addressData.name}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Address</FormLabel>
                    <Input
                      name="address"
                      value={addressData.address}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>City</FormLabel>
                    <Input
                      name="city"
                      value={addressData.city}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>State</FormLabel>
                    <Input
                      name="state"
                      value={addressData.state}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Country</FormLabel>
                    <Select
                      name="country"
                      value={addressData.country}
                      onChange={handleChange}
                      placeholder="Select country"
                    >
                      {ISD_CODES.map((item) => (
                        <option value={item.name} key={item.dial_code}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <Button type="submit" colorScheme="green" w="full">
                    Submit
                  </Button>
                </VStack>
              </Box>
            )}
          </Center>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default StripePaymentController;
