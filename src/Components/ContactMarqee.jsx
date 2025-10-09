import { ImLocation } from "react-icons/im";
import { Box, Flex, HStack, Link, Text } from "@chakra-ui/react";
import useSettingsData from "../Hooks/SettingData";
import { PhoneIcon } from "@chakra-ui/icons";
import LocationSeletor from "./LocationSeletor";
function ContactMarqee() {
  const { settingsData } = useSettingsData();

  const phone1 = settingsData?.find((value) => value.id_name === "phone");
  const address = settingsData?.find((value) => value.id_name === "address");

  return (
    <>
      {settingsData ? (
        <Box
          py={2}
          bg={"green.900"}
          color={"#fff"}
          borderBottom={"0.5px solid"}
          borderColor={"gray.400"}
          px={2}
        >
          <div className="container">
            <Flex gap={2} align={"center"} justifyContent={"space-between"}>
              <Box display={{ base: "block", lg: "none" }}>
                {" "}
                <LocationSeletor />
              </Box>
              <Box display={{ base: "none", lg: "block" }} w={"100%"}>
                <div className="container">
                  {" "}
                  <Flex gap={7} justifyContent={"flex-end"}>
                    {" "}
                    <a
                      href={`tel:${phone1.value}`}
                      display="flex"
                      color="green.500"
                      fontWeight="bold"
                    >
                      <HStack spacing={1}>
                        <PhoneIcon boxSize={3} />
                        <Text fontSize="sm">{phone1.value}</Text>
                      </HStack>
                    </a>
                    <Link
                      href={`https://www.google.com/maps?q=${address.value}`}
                      display="flex"
                      color="#fff"
                      fontWeight="semi-bold"
                      isExternal
                      textTransform={"none"}
                    >
                      <HStack spacing={2}>
                        <ImLocation />
                        <Text fontSize="sm">Address: {address.value}</Text>
                      </HStack>
                    </Link>
                  </Flex>
                </div>{" "}
              </Box>
            </Flex>
          </div>{" "}
        </Box>
      ) : null}
    </>
  );
}

export default ContactMarqee;
