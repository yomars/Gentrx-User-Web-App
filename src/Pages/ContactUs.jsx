import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  FormControl,
  Input,
  Textarea,
  Button,
  Icon,
  useToast,
  Flex,
  Checkbox,
  Container,
  Image,
} from "@chakra-ui/react";
import { BiLocationPlus } from "react-icons/bi";
import { FaEnvelope } from "react-icons/fa";
import { IoMdCall } from "react-icons/io";
import { BsChatDots } from "react-icons/bs";
import useSettingsData from "../Hooks/SettingData";
import user from "../Controllers/user";
import { ADD } from "../Controllers/ApiControllers";
import { useMutation } from "@tanstack/react-query";
import showToast from "../Controllers/ShowToast";
import { useForm } from "react-hook-form";
import { useState } from "react";
import MobileAppSection from "@/Components/MobileAppSection";

const addContactForm = async (data) => {
  const res = await ADD(user?.token || "", "add_contact_us_form_data", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};

export default function ContactUs() {
  const { settingsData } = useSettingsData();
  const phone1 = settingsData?.find((value) => value.id_name === "phone");
  const phone2 = settingsData?.find(
    (value) => value.id_name === "phone_second"
  );
  const email = settingsData?.find((value) => value.id_name === "email");
  const address = settingsData?.find((value) => value.id_name === "address");

  const toast = useToast();
  const [showMsg, setshowMsg] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const mutation = useMutation({
    mutationFn: async (data) => {
      setshowMsg(false);
      let formData = { ...data };
      await addContactForm(formData);
    },
    onSuccess: () => {
      showToast(toast, "success", "Success");
      setshowMsg(true);
      reset();
      setAgreeTerms(false);
      setTimeout(() => {
        setshowMsg(false);
      }, 5000);
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
    },
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <Box bg="white">
      {/* Hero Section */}
      <Box className="container" pt={{ base: 4, md: 10 }} px={{ base: 4, md: 8 }}>
        <Flex
          direction={{ base: "column", lg: "row" }}
          gap={8}
          align="center"
          position="relative"
        >
          {/* Hero Image */}
          <Box flex={1} position="relative" w="full">
            <Image
              src="/images/contact-hero.png"
              alt="Contact Us"
              w="full"
              h={{ base: "180px", md: "300px", lg: "431px" }}
              objectFit="contain"
              borderRadius="15px"
            />
          </Box>

          {/* Green overlay card */}
          <Box
            position={{ base: "relative", lg: "absolute" }}
            right={{ base: 0, lg: "120px" }}
            top={{ base: 0, lg: "50%" }}
            transform={{ base: "none", lg: "translateY(50%)" }}
            bg="#64b981"
            borderRadius="15px"
            p={{ base: 4, md: 5 }}
            w={{ base: "full", lg: "354px" }}
            mt={{ base: -10, lg: 0 }}
          >
            <Text
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontSize={{ base: "14px", md: "20px" }}
              fontWeight="700"
              color="white"
              lineHeight="1.25"
            >
              We are ready to serve you and respond to your questions, concerns,
              and appointment needs.
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Title and Description */}
      <Box className="container" px={{ base: 4, md: 8 }} pt={{ base: 10, md: 16 }}>
        <Box textAlign="center" maxW="1200px" mx="auto">
          <Heading
            as="h1"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontSize={{ base: "28px", md: "34px" }}
            fontWeight="700"
            color="#0c8f3a"
            mb={6}
          >
            We Are Here to Assist You With Any Inquiry
          </Heading>
          <Text
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontSize={{ base: "16px", md: "20px" }}
            fontWeight="400"
            color="rgba(0,0,0,0.75)"
            lineHeight="1.5"
          >
            If you have questions about appointments, services, or patient care,
            reach out to us. Our team is ready to help and ensure you get the
            support you need.
          </Text>
        </Box>
      </Box>

      {/* Contact Info Boxes and Form */}
      <Box className="container" px={{ base: 4, md: 8 }} py={{ base: 10, md: 16 }}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
          {/* Left — Contact Info Cards */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {/* Contact Number */}
            <Box
              bg="#64b981"
              p={6}
              borderRadius="10px"
              color="white"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              minH="220px"
            >
              <Icon as={IoMdCall} boxSize={10} mb={4} />
              <Heading
                as="h3"
                fontSize="18px"
                fontWeight="700"
                mb={2}
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                Contact Number
              </Heading>
              <Text fontSize="14px" fontWeight="500">{phone1?.value}</Text>
              <Text fontSize="14px" fontWeight="500">{phone2?.value}</Text>
            </Box>

            {/* Customer Support */}
            <Box
              bg="#64b981"
              p={6}
              borderRadius="10px"
              color="white"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              minH="220px"
            >
              <Icon as={FaEnvelope} boxSize={10} mb={4} />
              <Heading
                as="h3"
                fontSize="18px"
                fontWeight="700"
                mb={2}
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                Customer Support
              </Heading>
              <Text fontSize="14px" fontWeight="500">{email?.value}</Text>
            </Box>

            {/* Location */}
            <Box
              bg="#64b981"
              p={6}
              borderRadius="10px"
              color="white"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              minH="220px"
            >
              <Icon as={BiLocationPlus} boxSize={10} mb={4} />
              <Heading
                as="h3"
                fontSize="18px"
                fontWeight="700"
                mb={2}
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                We are located at
              </Heading>
              <Text fontSize="14px" fontWeight="500">{address?.value}</Text>
            </Box>

            {/* Chat with us */}
            <Box
              bg="#64b981"
              p={6}
              borderRadius="10px"
              color="white"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              minH="220px"
            >
              <Icon as={BsChatDots} boxSize={10} mb={4} />
              <Heading
                as="h3"
                fontSize="18px"
                fontWeight="700"
                mb={2}
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                Chat with us
              </Heading>
              <Text fontSize="14px" fontWeight="500">Facebook Page</Text>
              <Text fontSize="14px" fontWeight="500">Instagram Page</Text>
            </Box>
          </SimpleGrid>

          {/* Right — Contact Form */}
          <Box>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl mb={4} isInvalid={errors.name}>
                <Input
                  type="text"
                  placeholder="Full Name"
                  h="55px"
                  borderColor="#c3c3c3"
                  borderRadius="5px"
                  fontSize="16px"
                  color="#6a6a6a"
                  _placeholder={{ color: "#6a6a6a" }}
                  {...register("name", { required: "Name is required" })}
                />
              </FormControl>

              <FormControl mb={4} isInvalid={errors.email}>
                <Input
                  type="email"
                  placeholder="Email Address"
                  h="55px"
                  borderColor="#c3c3c3"
                  borderRadius="5px"
                  fontSize="16px"
                  color="#6a6a6a"
                  _placeholder={{ color: "#6a6a6a" }}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: "Invalid email format",
                    },
                  })}
                />
              </FormControl>

              <FormControl mb={4} isInvalid={errors.subject}>
                <Input
                  type="text"
                  placeholder="Contact Number"
                  h="55px"
                  borderColor="#c3c3c3"
                  borderRadius="5px"
                  fontSize="16px"
                  color="#6a6a6a"
                  _placeholder={{ color: "#6a6a6a" }}
                  {...register("subject", {
                    required: "Contact number is required",
                  })}
                />
              </FormControl>

              <FormControl mb={4} isInvalid={errors.message}>
                <Textarea
                  placeholder="Message"
                  h="119px"
                  borderColor="#c3c3c3"
                  borderRadius="5px"
                  fontSize="16px"
                  color="#6a6a6a"
                  _placeholder={{ color: "#6a6a6a" }}
                  {...register("message", {
                    required: "Message is required",
                  })}
                />
              </FormControl>

              <Checkbox
                isChecked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                mb={4}
                fontSize="16px"
                color="rgba(0,0,0,0.75)"
              >
                I agree to our privacy policy and terms and conditions
              </Checkbox>

              <Button
                type="submit"
                bg="#1243f0"
                color="white"
                h="50px"
                w="210px"
                borderRadius="100px"
                fontSize="14px"
                fontWeight="500"
                isLoading={mutation.isPending}
                _hover={{ bg: "#0d32c0" }}
                boxShadow="0px 1px 2px 0px rgba(0,0,0,0.05)"
              >
                Submit
              </Button>

              {showMsg && (
                <Box mt={4} p={4} bg="green.50" borderRadius="md" color="green.700">
                  <Text fontWeight="600">Message Received!</Text>
                  <Text fontSize="sm">
                    We have received your message and will get back to you soon.
                  </Text>
                </Box>
              )}
            </form>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Mobile App Section */}
      <Container maxW="1500px" px={{ base: 4, md: "96px" }} pt={{ base: 10, md: 20 }} pb={{ base: 10, md: 20 }}>
        <MobileAppSection />
      </Container>
    </Box>
  );
}
