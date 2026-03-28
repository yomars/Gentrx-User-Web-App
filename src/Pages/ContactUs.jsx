import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  GridItem,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Icon,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { BiLocationPlus } from "react-icons/bi";
import { FaEnvelope } from "react-icons/fa";
import { IoMdCall } from "react-icons/io";
import useSettingsData from "../Hooks/SettingData";
import user from "../Controllers/user";
import { ADD } from "../Controllers/ApiControllers";
import { useMutation } from "@tanstack/react-query";
import showToast from "../Controllers/ShowToast";
import { useForm } from "react-hook-form";
import { useState } from "react";

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
  const addressValue = address?.value || "Address not specified";
  const phone1Value = phone1?.value || "N/A";
  const phone2Value = phone2?.value || "";
  const emailValue = email?.value || "N/A";

  const toast = useToast();
  const [showMsg, setshowMsg] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const mutation = useMutation({
    mutationFn: async (data) => {
      setshowMsg(false);
      let formData = {
        ...data,
      };
      await addContactForm(formData);
  
    },
    onSuccess: () => {
      showToast(toast, "success", "Success");
      setshowMsg(true);
      reset();
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
    <Box>
      {" "}
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "20" }}>
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 20, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            We Are Here to Assist You With Any Inquiry
          </Text>

          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 12, md: 16 }}
            fontWeight={500}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            If you have questions about appointments, services, or patient
            care, reach out to us. Our team is ready to help and ensure you
            get the support you need.
          </Text>
        </Box>
      </Box>{" "}
      <Box p={[4, 6, 8]} maxW="1200px" mx="auto">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
          <Box
            p={6}
            boxShadow="md"
            borderRadius="md"
            textAlign="center"
            bg="white"
          >
            <Icon as={BiLocationPlus} boxSize={8} mb={4} color="blue.500" />
            <Heading as="h3" size="md" mb={2}>
              We are located at
            </Heading>
            <Text>{addressValue}</Text>
          </Box>

          <Box
            p={6}
            boxShadow="md"
            borderRadius="md"
            textAlign="center"
            bg="white"
          >
            <Icon as={IoMdCall} boxSize={8} mb={4} color="blue.500" />
            <Heading as="h3" size="md" mb={2}>
              Contact Number
            </Heading>
            <Text>{phone1Value}</Text>
            <Text>{phone2Value}</Text>
          </Box>

          <Box
            p={6}
            boxShadow="md"
            borderRadius="md"
            textAlign="center"
            bg="white"
          >
            <Icon as={FaEnvelope} boxSize={8} mb={4} color="blue.500" />
            <Heading as="h3" size="md" mb={2}>
              Customer Support
            </Heading>
            <Text>{emailValue}</Text>
          </Box>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <GridItem>
            <Box
              as="iframe"
              src={`https://www.google.com/maps?q=${encodeURIComponent(addressValue)}&hl=es;z=14&output=embed`}
              width="100%"
              height="400"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen=""
              aria-hidden="false"
              tabIndex="0"
            />
          </GridItem>
          <GridItem>
            <Box p={6} boxShadow="md" borderRadius="md" bg="white">
              <form onSubmit={handleSubmit(onSubmit)}>
                <SimpleGrid columns={2} spacing={4}>
                  <FormControl isInvalid={errors.name}>
                    <FormLabel>Your Name</FormLabel>
                    <Input
                      type="text"
                      placeholder="Your Name"
                      {...register("name", { required: "Name is required" })}
                    />
                  </FormControl>

                  <FormControl isInvalid={errors.email}>
                    <FormLabel>Your Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="Your Email"
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^\S+@\S+\.\S+$/,
                          message: "Invalid email format",
                        },
                      })}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl mt={4} isInvalid={errors.subject}>
                  <FormLabel>Subject</FormLabel>
                  <Input
                    type="text"
                    placeholder="Subject"
                    {...register("subject", {
                      required: "Subject is required",
                    })}
                  />
                </FormControl>

                <FormControl mt={4} isInvalid={errors.message}>
                  <FormLabel>Message</FormLabel>
                  <Textarea
                    placeholder="Message"
                    {...register("message", {
                      required: "Message is required",
                    })}
                  />
                </FormControl>

                <Text mt={3} fontSize={13} color="gray.600">
                  I agree to our privacy policy and terms and conditions
                </Text>

                {showMsg ? (
                  <Alert
                    mt={4}
                    status="success"
                    variant="subtle"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                  >
                    <AlertIcon boxSize="20px" mr={0} />
                    <AlertTitle mt={2} fontSize="md">
                      Message Recived!
                    </AlertTitle>
                    <AlertDescription maxWidth="sm">
                      We have received your message and will get back to you
                      soon.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  colorScheme="green"
                  mt={4}
                  width="full"
                  type="submit"
                  isLoading={mutation.isPending}
                >
                  Submit
                </Button>
              </form>
            </Box>
          </GridItem>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
