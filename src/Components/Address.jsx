import { BsFillTelephoneFill } from "react-icons/bs";
/* eslint-disable react/prop-types */
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import user from "../Controllers/user";
import { GET } from "../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import Loading from "./Loading";
import { useForm } from "react-hook-form";
import { useState } from "react";
import ISDCODEMODAL from "./ISDCODEMODAL";
import defaultISD from "../Controllers/defaultISD";
import MapComponent from "./Maps";
import ErrorPage from "../Pages/ErrorPage";

const formatAddress = (address) => {
  const { name, flat_no, apartment_name, area, landmark, city, pincode } =
    address;
  let addressString = `${name}, \n`;

  if (flat_no) {
    addressString += `${flat_no}, `;
  }

  if (apartment_name) {
    addressString += `${apartment_name}, `;
  }

  addressString += `${area}, ${landmark}, ${city} - ${pincode}`;
  return addressString;
};

export default function Address({ setAddress, setStep }) {
  const [newAddress, setnewAddress] = useState(false);
  const getData = async () => {
    const res = await GET(`address/user/${user.id}`);
    
    return res.data;
  };
  const { isLoading, data , error } = useQuery({
    queryKey: ["address"],
    queryFn: getData,
  });

    if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <Box className="container" mt={0} minH={"50vh"}>
      {" "}
      <Flex gap={5} mt={2} align={"center"} justify={"center"}>
        {newAddress ? (
          <AddressForm setAddress={setAddress} setnewAddress={setnewAddress} />
        ) : (
          <Box
            w={"900px"}
            maxW={"100vw"}
            border={"1px solid"}
            borderColor={"gray.200"}
            p={2}
            borderRadius={4}
            h={"fit-content"}
            bg={"#fff"}
            position={"relative"}
            pt={5}
          >
            {data.map((item) => (
              <Box
                key={item.id}
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                p={{ base: "2", md: "2" }}
                bg="white"
                width="100%"
                mb={4}
                minW={"100%"}
                cursor={"pointer"}
                py={{ base: 2, md: 2 }}
                onClick={() => {
                  setAddress(item);
                  setStep(3)
                }}
              >
                <Text fontWeight={600} color={"gray.700"} fontSize={"sm"}>
                  {formatAddress(item)}
                </Text>
                <Flex
                  fontWeight={600}
                  align={"center"}
                  gap={2}
                  color={"gray.700"}
                  fontSize={"sm"}
                >
                  {" "}
                  <BsFillTelephoneFill fontSize={14} />
                  <Text> {item.s_phone}</Text>
                </Flex>
              </Box>
            ))}
            <Flex bottom={5} w={"100%"} gap={5}>
              <Button
                size={"sm"}
                w={"full"}
                onClick={() => {
                  setStep(1);
                }}
              >
                Back
              </Button>
              <Button
                size={"sm"}
                w={"full"}
                colorScheme={"green"}
                onClick={() => {
                  setnewAddress(true);
                }}
              >
                Add New Address
              </Button>
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
}

const AddressForm = ({ setAddress, setnewAddress }) => {
  const apiKey = "AIzaSyDnoksQQHzBiosL0DacQrW_FzFNXSqVxG8"; // Replace with your actual API key
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isd_code, setisd_code] = useState(defaultISD);
  const { register, handleSubmit } = useForm();
  const [mapData, setmapData] = useState();

  const onSubmit = (data) => {
    
  };

  

  return (
    <Box
      bg="white"
      p={6}
      rounded="md"
      w="full"
      maxW="md"
      mx="auto"
      mt={4}
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="lg"
    >
      {mapData ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input
                type="text"
                placeholder="Enter your name"
                {...register("name", { required: true })}
                defaultValue={`${user.f_name} ${user.l_name}`}
              />
            </FormControl>

            <FormControl mt={0} isRequired>
              <FormLabel>Phone </FormLabel>
              <InputGroup size={"md"}>
                <InputLeftAddon
                  cursor={"pointer"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                >
                  {isd_code}
                </InputLeftAddon>
                <Input
                  placeholder="Enter your phone number"
                  type="Tel"
                  fontSize={16}
                  {...register("phone", { required: true })}
                  defaultValue={user.phone}
                />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Flat No.</FormLabel>
              <Input
                type="text"
                placeholder="Enter your flat number"
                {...register("flat_no")}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Apartment Name</FormLabel>
              <Input
                type="text"
                placeholder="Enter your apartment name"
                {...register("apartment_name")}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Area/Street</FormLabel>
              <Input
                type="text"
                placeholder="Enter your area/street"
                {...register("area")}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Landmark</FormLabel>
              <Input
                type="text"
                placeholder="Enter a landmark"
                {...register("landmark")}
              />
            </FormControl>

            <FormControl>
              <FormLabel>City</FormLabel>
              <Input
                type="text"
                placeholder="Enter your city"
                {...register("city", { required: true })}
                defaultValue={mapData?.city}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Pincode</FormLabel>
              <Input
                type="text"
                placeholder="Enter your pincode"
                {...register("pincode", { required: true })}
                defaultValue={mapData?.pin}
              />
            </FormControl>
          </VStack>
          <Flex gap={4}>
            {" "}
            <Button
              mt={4}
              colorScheme="gray"
              width="full"
              size={"sm"}
              onClick={() => {
                setnewAddress(false);
              }}
            >
              Cancel
            </Button>
            <Button
              mt={4}
              colorScheme="green"
              type="submit"
              width="full"
              size={"sm"}
            >
              Next
            </Button>
          </Flex>
        </form>
      ) : (
        <Box>
          {" "}
          <MapComponent apiKey={apiKey} setmapData={setmapData} />
          <Button
            mt={4}
            colorScheme="gray"
            width="full"
            size={"sm"}
            onClick={() => {
              setnewAddress(false);
            }}
          >
            Cancel
          </Button>
        </Box>
      )}

      <ISDCODEMODAL
        onClose={onClose}
        isOpen={isOpen}
        setisd_code={setisd_code}
      />
    </Box>
  );
};
