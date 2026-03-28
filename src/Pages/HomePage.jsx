import { FaRegHospital } from "react-icons/fa";
import { IoMdPeople } from "react-icons/io";
import { MdHealthAndSafety } from "react-icons/md";
import { FaCheckCircle, FaHandHoldingMedical } from "react-icons/fa";
import { FaHospitalAlt } from "react-icons/fa";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Image,
  List,
  ListIcon,
  ListItem,
  Text,
  useTheme,
} from "@chakra-ui/react";
import { BiCalendar } from "react-icons/bi";
import Departments from "../Components/Departments";
import Doctors from "../Components/Doctors";
import { Link } from "react-router-dom";
import Testimonials from "../Components/Testimonials";
import useSettingsData from "../Hooks/SettingData";
import imageBaseURL from "../Controllers/image";
import Clinics from "../Components/Clinics";

export default function HomePage() {
  const theme = useTheme();
  const { settingsData } = useSettingsData();
  const doctorImage = settingsData?.find(
    (value) => value.id_name === "web_doctor_image"
  );

  const name = settingsData?.find((value) => value.id_name === "clinic_name");
  const playStoreLink = settingsData?.find(
    (value) => value.id_name === "play_store_link"
  );
  const appStoreLink = settingsData?.find(
    (value) => value.id_name === "app_store_link"
  );
  const appGalleryLink = settingsData?.find(
    (value) => value.id_name === "app_gallery_link"
  );
  const clinicName = name?.value || "GentRx";
  const doctorImageSrc = doctorImage?.value
    ? `${imageBaseURL}/${doctorImage.value}`
    : "/doctor-2.png";
  const playStoreHref = playStoreLink?.value || "#";
  const appStoreHref = appStoreLink?.value || "#";
  const appGalleryHref = appGalleryLink?.value || "#";
  return (
    <Box>
      <Box bg={"primary.main"} maxW={"100vw"} minH={"60vh"}>
        <div className="container">
          <Flex
            gap={5}
            pt={30}
            align={"center"}
            maxW={"100%"}
            flexDir={{ base: "column", md: "row" }}
          >
            <Box pb={12} flex={1} maxW={"100%"}>
              <Text
                fontSize={{ base: "20", md: "24", lg: "30" }}
                color={"#FFF"}
                mt={5}
                fontWeight={400}
              >
                Welcome to {clinicName}
              </Text>
              <Heading
                color={"primary.text"}
                as={"h1"}
                fontSize={{ base: "32", md: "46", lg: "48" }}
                fontWeight={600}
              >
                Best Health Care at Your Fingertips
              </Heading>
              <Text
                fontSize={{ base: "16", md: "16", lg: "16" }}
                color={"#ffffff80"}
                mt={5}
                fontWeight={400}
              >
                {clinicName} connects you to licensed doctors in minutes. You
                can book a visit, choose your specialist, and manage your
                records in one app. Download the app and start booking today.
              </Text>

              <Flex gap={4} mt={4} wrap={"wrap"}>
                <a href={playStoreHref} target="_blank" rel="noopener noreferrer">
                  <Image src="/play store.png" w={120} />
                </a>
                <a href={appStoreHref} target="_blank" rel="noopener noreferrer">
                  <Image src="/app store.png" w={120} />
                </a>
                <a href={appGalleryHref} target="_blank" rel="noopener noreferrer">
                  <Image src="/appgallery.png" w={120} />
                </a>
              </Flex>

              <Flex gap={5} mt={5}>
                <Button
                  bg={"#FFF"}
                  w={200}
                  onClick={() => {
                    const section = document.querySelector("#started");
                    section.scrollIntoView({
                      behavior: "smooth",
                      block: "end",
                    });
                  }}
                >
                  Get Started
                </Button>
                <Button
                  w={200}
                  bg={"transparent"}
                  color={"#fff"}
                  border={"1px solid #fff"}
                  _hover={{
                    color: "primary.main",
                    bg: "#fff",
                  }}
                  as={Link}
                  to={"/doctors"}
                >
                  Get Appointment
                </Button>
              </Flex>
            </Box>
            <Image
              src={doctorImageSrc}
              w={{ base: "80%", md: "20%" }}
              flex={1}
            />
          </Flex>

          <Grid
            templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
            gap={4}
            pb={10}
          >
            {[
              { value: "35+", label: "Years of Experience" },
              { value: "30+", label: "Years of Experience" },
              { value: "100+", label: "Years of Experience" },
              { value: "500+", label: "Years of Experience" },
            ].map((stat) => (
              <GridItem key={stat.value} textAlign="center" color="#fff">
                <Heading fontSize={{ base: "28px", md: "36px" }} color="primary.text">
                  {stat.value}
                </Heading>
                <Text fontSize={{ base: "12px", md: "14px" }} color="#ffffffcc">
                  {stat.label}
                </Text>
              </GridItem>
            ))}
          </Grid>
        </div>
      </Box>
      <Box>
        <div className="container">
          <Box my={10}>
            <Grid
              templateColumns={{
                base: "repeat(1, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(3, 1fr)",
              }}
            >
              <GridItem backgroundColor={"primary.text"} cursor={"pointer"}>
                <Box p={12} display={"flex"} alignItems={"center"}>
                  <Box>
                    <Heading color={"#FFF"} fontSize={{ base: "25", md: "28" }}>
                      Reach Out to Us
                    </Heading>
                    <Text color={"#FFF"} fontWeight={500}>
                      Feel free to get in touch anytime. We`re ready to assist
                      you!
                    </Text>
                  </Box>
                </Box>
                <Button
                  colorScheme="gray"
                  w={"100%"}
                  size={"sm"}
                  leftIcon={<BiCalendar />}
                  borderRadius={0}
                  background={"#000"}
                  color={"#fff"}
                  py={7}
                  _hover={{
                    bg: "#000",
                  }}
                  as={Link}
                  to={"/doctors"}
                >
                  Make Appointment
                </Button>
              </GridItem>
              <GridItem
                backgroundColor={"primary.main"}
                cursor={"pointer"}
                borderRight={"0.5px solid"}
                borderColor={"gray.300"}
              >
                <Box p={8}>
                  <FaHospitalAlt
                    color={theme.colors.primary["text"]}
                    fontSize={32}
                  />
                  <Heading
                    color={"#FFF"}
                    mt={5}
                    fontSize={{ base: "25", md: "28" }}
                  >
                    24-Hour Service
                  </Heading>
                  <Text color={"#FFF"} fontWeight={500}>
                    We take pride in offering 24-hour medical services to ensure
                    you receive the care you need, whenever you need it.
                  </Text>
                </Box>
              </GridItem>
              <GridItem
                backgroundColor={"primary.main"}
                cursor={"pointer"}
                borderTop={{ base: "0.5px solid", md: "0" }}
                borderColor={"gray.300"}
              >
                <Box p={8}>
                  <FaHandHoldingMedical
                    color={theme.colors.primary["text"]}
                    fontSize={32}
                  />
                  <Heading
                    color={"#FFF"}
                    mt={5}
                    fontSize={{ base: "25", md: "28" }}
                  >
                    Advanced Medical Technology
                  </Heading>
                  <Text color={"#FFF"} fontWeight={500}>
                    We utilize cutting-edge medical technology to deliver the
                    highest quality care.
                  </Text>
                </Box>
              </GridItem>
            </Grid>
          </Box>
        </div>
      </Box>

      {/*  */}
      <Box pt={10} bg={"gray.100"}>
        <div className="container">
          <Flex gap={5} pt={16} flexDir={{ base: "column", md: "row" }}>
            <Flex flex={1} justify={{ base: "center", md: "left" }}>
              <Image src="/doctor-2.png" w={{ base: 300, md: 400 }} />
            </Flex>
            <Box flex={1} pb={10}>
              <Text
                fontSize={{ base: 22, md: 32 }}
                fontWeight={500}
                mt={0}
                color={"gray.600"}
              >
                Reliable Care You Can Count On <br />
                <Text as={"span"} color={"primary.text"} fontWeight={600}>
                  Whenever You Need Medical Support
                </Text>{" "}
                
              </Text>
              <Text fontSize={16} mt={2} color={"gray.500"} fontWeight={500}>
                Choose your specialist, set your schedule, and confirm your
                visit with ease.
              </Text>
              <List
                spacing={5}
                textAlign="start"
                mt={10}
                color={"gray.800"}
                fontSize={16}
              >
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  Top-tier Specialists in Healthcare.
                </ListItem>
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  Advanced Doctor Services Available.
                </ListItem>
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  Discounts Offered on All Medical Treatments.
                </ListItem>
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  Easy and Swift Enrollment Process.
                </ListItem>
              </List>
              <Button
                mt={10}
                colorScheme="green"
                w={"100%"}
                size={"sm"}
                leftIcon={<BiCalendar />}
                as={Link}
                to={"/doctors"}
              >
                Make Appointment
              </Button>
            </Box>
          </Flex>
        </div>
      </Box>
      <Box id="started">
        <Clinics />
        <Box pb={30} pt={2} mt={5}>
          <Departments />
        </Box>
      </Box>

      {/* doctors */}
      <Box bg={"#fff"} pb={30} pt={30} mt={10}>
        <Doctors />
      </Box>

      {/* payment methods */}
      <Box bg={"gray.50"} py={14}>
        <div className="container">
          <Heading color={"primary.text"} fontWeight={600} textAlign={"center"}>
            Simple and Secure Payment Options
          </Heading>
          <Text
            fontSize={14}
            textAlign={"center"}
            mt={2}
            color={"gray.500"}
            fontWeight={500}
          >
            Pay using trusted platforms available nationwide. Choose the
            method that fits your needs.
          </Text>
          <Flex
            mt={8}
            gap={8}
            justify={"center"}
            align={"center"}
            wrap={"wrap"}
          >
            <Image src="/icons/payment-methods/gcash.svg" h={10} />
            <Image src="/icons/payment-methods/paymaya-combined.svg" h={10} />
            <Image src="/icons/payment-methods/dragonpay.png" h={10} />
            <Image src="/icons/payment-methods/visa.svg" h={10} />
            <Image src="/icons/payment-methods/mastercard.svg" h={10} />
          </Flex>
        </div>
      </Box>

      {/* labs */}

      {/* <Box pt={10}>
        <div className="container">
          <Flex gap={5} pt={16} flexDir={{ base: "column", md: "row" }}>
            <Flex flex={1} justify={{ base: "center", md: "left" }}>
              <Image src="/labs.svg" w={{ base: 400, md: 500 }} />
            </Flex>
            <Box flex={1} pb={10}>
              <Text
                fontSize={{ base: 22, md: 28 }}
                fontWeight={600}
                color={"green.text"}
                letterSpacing={"1px"}
                mb={0}
              >
                Lab Tests Services
              </Text>
              <Text
                fontSize={{ base: 22, md: 32 }}
                fontWeight={500}
                mt={0}
                color={"gray.600"}
              >
                Comprehensive{" "}
                <Text as={"span"} color={"primary.text"} fontWeight={600}>
                  Testing Solutions
                </Text>{" "}
                <br />
                for Your Health Needs.
              </Text>
              <Text fontSize={16} mt={2} color={"gray.500"} fontWeight={500}>
                Our advanced laboratory facilities offer a comprehensive range
                of diagnostic tests, conducted by experienced medical
                technicians.
              </Text>
              <List
                spacing={5}
                textAlign="start"
                mt={10}
                color={"gray.800"}
                fontSize={16}
              >
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  Extensive Range of Diagnostic Tests Available.
                </ListItem>
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  State-of-the-Art Laboratory Facilities.
                </ListItem>
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  Experienced and Caring Medical Technicians.
                </ListItem>
                <ListItem>
                  <ListIcon
                    as={FaCheckCircle}
                    color="primary.text"
                    fontSize={20}
                  />
                  Timely and Accurate Test Results.
                </ListItem>
              </List>
              <Button
                mt={10}
                colorScheme="green"
                w={"100%"}
                size={"sm"}
                leftIcon={<BiCalendar />}
                onClick={() => {
                  if (labref.current) {
                    labref.current.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                Book Lab Test Now
              </Button>
            </Box>
          </Flex>
        </div>
      </Box>

      <Box bg={"#fff"} mt={"10"} ref={labref}>
        <LabTests />
      </Box> */}
      <Box pt={5}>
        <div className="container">
          <Box>
            {" "}
            <Text
              fontSize={{ base: 24, md: 32 }}
              fontWeight={500}
              textAlign={"center"}
              mt={0}
              color={"primary.text"}
            >
              Why Choose Our Hospital?
            </Text>
            <Text
              fontSize={14}
              textAlign={"center"}
              mt={2}
              color={"gray.500"}
              fontWeight={500}
            >
              At {clinicName}, we understand that your health and well-being
              are of paramount importance. <br /> Here{"`"}s why we believe you
              should choose us for your medical needs:
            </Text>
            <Box mt={5}>
              <Grid
                templateColumns={{
                  base: "repeat(1, 1fr)",
                  md: "repeat(3, 1fr)",
                  lg: "repeat(3, 1fr)",
                }}
                gap={6}
              >
                <GridItem
                  backgroundColor={"primary.400"}
                  borderRadius={10}
                  cursor={"pointer"}
                  color={"#fff"}
                >
                  <Box p={5}>
                    <MdHealthAndSafety fontSize={60} />
                    <Heading fontSize={28}>Personalized Care</Heading>
                    <Text fontSize={14}>
                      At {clinicName}, we prioritize your health and well-being
                      above all else. Our hospital offers comprehensive medical
                      services tailored to meet your individual needs, ensuring
                      you receive the highest quality of care at every step of
                      your journey
                    </Text>
                  </Box>
                </GridItem>
                <GridItem
                  backgroundColor={"primary.500"}
                  borderRadius={10}
                  cursor={"pointer"}
                  color={"#fff"}
                >
                  <Box p={5}>
                    <IoMdPeople fontSize={60} />
                    <Heading fontSize={28}>Expert Team</Heading>
                    <Text fontSize={14}>
                      With a dedicated team of experienced healthcare
                      professionals, including doctors, nurses, and support
                      staff, we are committed to providing you with personalized
                      attention and expert medical guidance. You can trust our
                      skilled team to deliver compassionate care and support
                      throughout your treatment.
                    </Text>
                  </Box>
                </GridItem>
                <GridItem
                  backgroundColor={"primary.900"}
                  borderRadius={10}
                  cursor={"pointer"}
                  color={"#fff"}
                >
                  <Box p={5}>
                    <FaRegHospital fontSize={60} />
                    <Heading fontSize={28} mt={2}>
                      Cutting-Edge Facilities
                    </Heading>
                    <Text fontSize={14}>
                      At {clinicName}, we prioritize your health and well-being
                      above all else. Our hospital offers comprehensive medical
                      services tailored to meet your individual needs, ensuring
                      you receive the highest quality of care at every step of
                      your journey
                    </Text>
                  </Box>
                </GridItem>
              </Grid>
            </Box>
          </Box>
        </div>
      </Box>

      {/* banner */}
      <Box mt={10} bg={"#fff"} pt={5} pb={24}>
        <div className="container">
          {" "}
          <Flex p={3} align={"center"} flexDir={{ base: "column", md: "row" }}>
            <Box flex={1}>
              {" "}
              <Text
                fontSize={{ base: 18, md: 24 }}
                fontWeight={600}
                mt={0}
                color={"primary.text"}
              >
                Our Operational Method
              </Text>
              <Heading
                fontSize={{ base: "36px", md: "48px" }}
                w={{ base: "95%", md: "70%" }}
              >
                Your Step by Step Guide to Booking a Visit and Completing Your
                Treatment
              </Heading>
            </Box>
            <Box flex={1}>
              {" "}
              <Text
                fontSize={{ base: 14, md: 18 }}
                fontWeight={400}
                mt={0}
                color={"gray.600"}
              >
                Follow these steps to set your appointment and complete your
                visit with ease.
              </Text>
            </Box>
          </Flex>
          <Box mt={10}>
            {" "}
            <Grid
              templateColumns={{
                base: "repeat(2, 1fr)",
                md: "repeat(2, 1fr)",
                lg: "repeat(4, 1fr)",
              }}
              gap={6}
            >
              <GridItem align={"center"}>
                <Box p={4}>
                  <Image src="/appoinment.png" w={"80px"} />
                  <Text
                    fontSize={{ base: "14px", md: "18px" }}
                    fontWeight={600}
                    mt={3}
                  >
                    Book An Appointment
                  </Text>
                </Box>
              </GridItem>
              <GridItem align={"center"}>
                <Box p={4}>
                  <Image src="checkup.png" w={"80px"} />
                  <Text
                    fontSize={{ base: "14px", md: "18px" }}
                    fontWeight={600}
                    mt={3}
                  >
                    Conduct Checkup
                  </Text>
                </Box>
              </GridItem>
              <GridItem align={"center"}>
                <Box p={4}>
                  <Image src="treatment.png" w={"80px"} />
                  <Text
                    fontSize={{ base: "14px", md: "18px" }}
                    fontWeight={600}
                    mt={3}
                  >
                    Perform Treatment
                  </Text>
                </Box>
              </GridItem>
              <GridItem align={"center"}>
                <Box p={4}>
                  <Image src="priscribe.png" w={"80px"} />
                  <Text
                    fontSize={{ base: "14px", md: "18px" }}
                    fontWeight={600}
                    mt={3}
                  >
                    Prescribe and Payment
                  </Text>
                </Box>
              </GridItem>
            </Grid>
          </Box>
        </div>
      </Box>

      {/* faq */}
      <Box mt={10} pt={5} pb={24}>
        <FAQ />
      </Box>
      <Box mt={10} bg={"#fff"} pt={5} pb={24}>
        <Testimonials />
      </Box>
    </Box>
  );
}

const FAQ = () => {
  const { settingsData } = useSettingsData();
  const name = settingsData?.find((value) => value.id_name === "clinic_name");
  const clinicName = name?.value || "GentRx";
  const faqs1 = [
    {
      question: `What services does ${clinicName} offer?`,
      answer: `${clinicName} offers a comprehensive range of medical services, including dental, gynecology, orthology, neurology, general medicine, dermatology, and cardiology. We also provide advanced lab testing and diagnostic services.`,
    },
    {
      question: `What makes ${clinicName} different from other healthcare providers?`,
      answer: `${clinicName} stands out due to its commitment to affordable healthcare, advanced medical technology, top-tier specialists, and 24-hour service. We also offer discounts on all medical treatments and ensure a swift enrollment process.`,
    },
    {
      question: `How can I book an Appointment at ${clinicName}?`,
      answer: `You can easily book an Appointment through our website by navigating to the 'Book An Appointment' section. Simply select the service you need, choose a convenient time, and confirm your booking.`,
    },
    {
      question: `What types of diagnostic tests are available at your lab?`,
      answer: `Our laboratory offers a wide range of diagnostic tests, including Complete Blood Count (CBC), Hemoglobin (Hb) tests, X-rays, and CT scans. We provide timely and accurate results to support your healthcare needs.`,
    },
    {
      question: `Are there any discounts available on medical treatments?`,
      answer: `Yes, ${clinicName} offers discounts on all medical treatments. For example, we provide a 5% discount on CBC and Hemoglobin tests, and a 10% discount on X-rays and CT scans.`,
    },

    // Add more FAQs here
  ];

  const faqs2 = [
    {
      question: `What are your operating hours?`,
      answer: `${clinicName} operates 24 hours a day, 7 days a week, ensuring that you receive the care you need whenever you need it.`,
    },
    {
      question: `Who are the doctors at ${clinicName}?`,
      answer: `Our team consists of highly qualified and experienced doctors specializing in various fields such as cardiology, neurology, dermatology, and more. Detailed information about our doctors is available on the 'Meet Our Doctors' page on our website.`,
    },
    {
      question: `How can I contact ${clinicName} for more information?`,
      answer: `You can reach out to us anytime via the contact information provided on our website. We are always ready to assist you with any inquiries or support you may need.`,
    },
    {
      question: `What is the process for receiving treatment at ${clinicName}?`,
      answer: `The treatment process at ${clinicName} involves booking an Appointment, conducting a checkup, performing the necessary treatment, and prescribing medications or further care. Our streamlined process ensures efficient and effective care.`,
    },
    {
      question: `How does ${clinicName} ensure the quality of its medical services?`,
      answer: `We utilize cutting-edge medical technology and state-of-the-art facilities to provide the highest quality care. Our dedicated team of healthcare professionals ensures personalized attention and expert medical guidance throughout your treatment journey.`,
    },

    // Add more FAQs here
  ];

  return (
    <Box>
      {" "}
      <div className="container">
        <Heading
          fontWeight={600}
          mt={0}
          color={"primary.text"}
          textAlign={"center"}
          fontSize={{ base: "24px", md: "30px" }}
        >
          FAQ
        </Heading>{" "}
        <Box mt={10}>
          {" "}
          <Grid
            templateColumns={{
              base: "repeat(1, 1fr)",
              md: "repeat(2, 1fr)",
              lg: "repeat(2, 1fr)",
            }}
            gap={6}
          >
            <GridItem align={"center"}>
              {" "}
              <Accordion allowToggle>
                {faqs1.map((faq, index) => (
                  <AccordionItem key={index}>
                    <h2>
                      <AccordionButton
                        _expanded={{ bg: "primary.main", color: "white" }}
                      >
                        <Box
                          as="span"
                          flex="1"
                          textAlign="left"
                          fontWeight={600}
                          fontSize={18}
                          py={2}
                        >
                          {faq.question}
                        </Box>{" "}
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4} textAlign={"left"}>
                      {faq.answer}
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </GridItem>
            <GridItem align={"center"}>
              {" "}
              <Accordion allowToggle>
                {faqs2.map((faq, index) => (
                  <AccordionItem key={index}>
                    <h2>
                      <AccordionButton
                        _expanded={{ bg: "primary.main", color: "white" }}
                      >
                        <Box
                          as="span"
                          flex="1"
                          textAlign="left"
                          fontWeight={600}
                          fontSize={18}
                          py={2}
                        >
                          {faq.question}
                        </Box>{" "}
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4} textAlign={"left"}>
                      {faq.answer}
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </GridItem>
          </Grid>
        </Box>
      </div>
    </Box>
  );
};
