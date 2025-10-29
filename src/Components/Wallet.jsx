/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react/prop-types */
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  List,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Skeleton,
  Text,
  useColorModeValue,
  useDisclosure,
  useMediaQuery,
  useToast,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ADD, GET } from "../Controllers/ApiControllers";
import currency from "../Controllers/currency";
import user from "../Controllers/user";
import Loading from "./Loading";
import { AddIcon, MinusIcon } from "@chakra-ui/icons";
import AddMoney from "./AddMoney";
import BalanceTransfer from "./BalanceTransfer";
import moment from "moment";

const getTransaction = async () => {
  let url = `get_all_transaction?user_id=${user?.id}&is_wallet_txn=1`;
  const trasection = await GET(url);
  if (trasection.response != 200) {
    throw Error(trasection.messege);
  }
  return trasection.data;
};

function WalletModel({ isModalOpen, closeModal, openModal }) {
  const toast = useToast();
  const token = user?.token;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isTransferOpen, 
    onOpen: onTransferOpen, 
    onClose: onTransferClose 
  } = useDisclosure();
  const cancelRef = useRef();
  const [isMobile] = useMediaQuery("(max-width: 600px)");

  const reLogin = async () => {
    let data = {
      phone: user?.phone,
    };
    const login = await ADD(user.token, "re_login_phone", data);
    if (login.response === 200) {
      localStorage.setItem(
        "user",
        JSON.stringify({ ...login.data, token: user.token })
      );
      return login.data;
    } else if (login.response === 201) {
      toast({
        title: login.messege,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    } else {
      toast({
        title: "Something Went Wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const { isLoading: isUserLoading, data: userData } = useQuery({
    queryKey: ["user"],
    queryFn: reLogin,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when the component mounts
    staleTime: 0,
  });

  if (isUserLoading) return <Loading />;

  return (
    <>
      {" "}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        isCentered
        scrollBehavior="inside"
        closeOnOverlayClick={false}
        size={isMobile ? "full" : "xl"}
      >
        <ModalOverlay />
        <ModalContent p={2} m={0}>
          <ModalBody p={0}>
            <ModalCloseButton zIndex={999} color={"#fff"} />
            <Box py={0} width={"100%"}>
              {isUserLoading ? (
                <Box
                  width={"100%"}
                  p={2}
                  borderRadius={5}
                  height={"200px"}
                  position={"relative"}
                  overflow={"hidden"}
                >
                  <Skeleton width={"100%"} height={"100%"} />
                </Box>
              ) : (
                <Box
                  width={"100%"}
                  p={2}
                  bg={"primary.main"}
                  borderRadius={5}
                  height={"200px"}
                  position={"relative"}
                  overflow={"hidden"}
                >
                  <Box
                    bg={"green"}
                    w={150}
                    h={150}
                    borderRadius={"50%"}
                    position={"absolute"}
                    left={"-40px"}
                    bottom={"-40px"}
                  ></Box>
                  <Box
                    bg={"green"}
                    w={150}
                    h={150}
                    borderRadius={"50%"}
                    position={"absolute"}
                    right={"-40px"}
                    top={"-40px"}
                  ></Box>
                  <Box
                    display={"flex"}
                    alignItems={"center"}
                    justifyContent={"center"}
                    h={"100%"}
                    color={"#fff"}
                    flexDirection={"column"}
                  >
                    <Text fontWeight={500} mb={0} p={0} fontSize={18}>
                      Current Balance
                    </Text>
                    <Text fontWeight={500} mt={1} p={0} fontSize={16}>
                      {currency}{" "}
                      {userData?.wallet_amount !== null
                        ? userData?.wallet_amount
                        : 0}
                    </Text>
                    <Flex gap={4} >
                        <Button
                          size={"sm"}
                          bg={"#54B435"}
                          fontSize={12}
                          color={"#fff"}
                          width={"200px"}
                          borderRadius={"10"}
                          _hover={{
                            transform: "translateY(-2px)",
                            boxShadow: "lg",
                            background: "#54B435",
                            fontSize: "12px",
                            color: "#fff",
                          }}
                          onClick={onOpen}
                          mt={5}
                        >
                          Add Money
                        </Button>
                        <Button
                          size={"sm"}
                          bg={"#54B435"}
                          fontSize={12}
                          color={"#fff"}
                          width={"200px"}
                          borderRadius={"10"}
                          _hover={{
                            transform: "translateY(-2px)",
                            boxShadow: "lg",
                            background: "#54B435",
                          }}
                          onClick={onTransferOpen}
                          mt={5}
                        >
                          Balance Transfer
                        </Button>
                    </Flex>
                  </Box>
                </Box>
              )}
              <Transection user={user} token={token} />
            </Box>
          </ModalBody>
          <ModalFooter px={0}>
            <Button
              w={"100%"}
              mt={3}
              bg={useColorModeValue("gray.800", "gray.500")}
              color={"white"}
              rounded={"md"}
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "lg",
              }}
              onClick={closeModal}
              size={"sm"}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <AddMoney
        isOpen={isOpen}
        onClose={onClose}
        cancelRef={cancelRef}
        user={user}
        token={token}
        closeModal={closeModal}
        openModal={openModal}
      />
      <BalanceTransfer
        isOpen={isTransferOpen}
        onClose={onTransferClose}
        cancelRef={cancelRef}
      />
    </>
  );
}

export default WalletModel;

const Transection = () => {
  const { isLoading, data } = useQuery({
    queryKey: ["transactions"],
    queryFn: getTransaction,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when the component mounts
    staleTime: 0,
  });
  if (isLoading) {
    return (
      <Box py={5} px={1}>
        <Skeleton h={5}></Skeleton>

        <Box mt={5}>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
          <Skeleton h={2}></Skeleton>
        </Box>
      </Box>
    );
  }

  return (
    <Box px={1} maxH={{ base: "90vh", md: "40vh" }} overflow={"scroll"} mt={5}>
      <Heading fontSize={16}>Transaction History</Heading>

      <Box mt={5} maxH={"40%"} overflow={"hidden"}>
        <List>
          {!data?.length ? (
            <Alert status="warning">
              <AlertIcon />
              No Transaction found
            </Alert>
          ) : (
            data?.map((tran) => (
              <Accordion allowToggle key={tran.id}>
                <AccordionItem>
                  <h2>
                    <AccordionButton py={3}>
                      <Flex
                        w={"100%"}
                        textAlign="left"
                        gap={4}
                        alignItems={"start"}
                        justifyContent={"space-between"}
                      >
                        {tran.transaction_type === "Credited" ? (
                          <IconButton
                            icon={<AddIcon />}
                            size={"xs"}
                            borderRadius={"full"}
                            colorScheme={"green"}
                          />
                        ) : (
                          <IconButton
                            icon={<MinusIcon />}
                            size={"xs"}
                            borderRadius={"full"}
                            colorScheme={"red"}
                          />
                        )}{" "}
                        <Text
                          fontSize={"sm"}
                          textAlign={"start"}
                          mb={0}
                          w={"100%"}
                          fontWeight={600}
                          color={
                            tran.transaction_type === "Credited"
                              ? "green.500"
                              : "red.500"
                          }
                        >
                          {currency} {tran?.amount} <br />
                          <Text
                            fontSize={"13"}
                            textAlign={"start"}
                            mb={0}
                            w={"100%"}
                            fontWeight={500}
                            color={"#000"}
                          >
                            {tran?.notes || tran.transaction_type === "Credited"
                              ? "Amount Creadited To Your Wallet"
                              : "Amount Debited From Your Wallet"}
                          </Text>
                        </Text>
                        <Text
                          fontSize={12}
                          maxW={"70%"}
                          textAlign={"left"}
                          mb={0}
                          color={
                            tran.transaction_type === "Credited"
                              ? "green.500"
                              : "red.500"
                          }
                          fontWeight={600}
                        >
                          {tran?.transaction_type}
                        </Text>
                      </Flex>
                    </AccordionButton>
                  </h2>
                  <AccordionPanel pb={4}>
                    <Text mb={0} fontSize={14}>
                      Transaction ID : {tran.id}
                    </Text>
                    <Text mb={0} fontSize={14}>
                      Payment ID : {tran.payment_transaction_id || "N/A"}
                    </Text>
                    <Text mb={0} fontSize={14}>
                      {moment(tran.created_at).format("DD MMM YY HH:MM a")}
                    </Text>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            ))
          )}
        </List>
      </Box>
    </Box>
  );
};
