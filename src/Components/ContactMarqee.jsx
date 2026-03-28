import { ImLocation } from "react-icons/im";
import { Box, Flex, HStack, Link, Text } from "@chakra-ui/react";
import useSettingsData from "../Hooks/SettingData";
import { PhoneIcon } from "@chakra-ui/icons";
import LocationSeletor from "./LocationSeletor";
function ContactMarqee({ settingsData: externalSettingsData }) {
  const { settingsData: queriedSettingsData } = useSettingsData();
  const settingsData =
    Array.isArray(externalSettingsData) && externalSettingsData.length
      ? externalSettingsData
      : queriedSettingsData;

  const phone1 = settingsData?.find((value) => value.id_name === "phone");
  const address = settingsData?.find((value) => value.id_name === "address");
  const phoneValue = phone1?.value || "";
  const addressValue = address?.value || "";

  if (!phoneValue && !addressValue) {
    return null;
  }

  return (
    <>
      {settingsData ? (
        <Box
          py={2}
          bg={"#67c487"}
          color={"#fff"}
          borderBottom={"0.5px solid"}
          borderColor={"gray.400"}
          px={2}
        >
          <div className="container">
            <Flex gap={4} align={"center"} justifyContent={"space-between"} wrap={"wrap"}>
              <Box display={{ base: "block", lg: "none" }}>
                <LocationSeletor />
              </Box>
              <Box flex={1} display={{ base: "none", lg: "block" }} textAlign={"center"}>
                <Text fontSize={"sm"} fontWeight={600}>
                  Quick access to trusted doctors. Book your appointment anytime using the GentRx mobile app.
                </Text>
              </Box>
              <Flex
                display={{ base: "none", lg: "flex" }}
                gap={7}
                justifyContent={"flex-end"}
                align={"center"}
              >
                <Link
                  href={`tel:${phoneValue}`}
                  display="flex"
                  color="#fff"
                  fontWeight="bold"
                  textTransform={"none"}
                >
                  <HStack spacing={1}>
                    <PhoneIcon boxSize={3} />
                    <Text fontSize="sm">{phoneValue}</Text>
                  </HStack>
                </Link>
                <Link
                  href={`https://www.google.com/maps?q=${encodeURIComponent(addressValue)}`}
                  display="flex"
                  color="#fff"
                  fontWeight="semibold"
                  isExternal
                  textTransform={"none"}
                >
                  <HStack spacing={2}>
                    <ImLocation />
                    <Text fontSize="sm">Address: {addressValue}</Text>
                  </HStack>
                </Link>
              </Flex>
            </Flex>
          </div>
        </Box>
      ) : null}
    </>
  );
}

export default ContactMarqee;
