/* eslint-disable react/prop-types */
import {
  Box,
  Button,
  Flex,
  Input,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { useState } from "react";
 // Adjust the path as needed
import { FlagIcon } from "react-flag-kit";
import ISD_CODES from "../Controllers/ISDCODES";

function ISDCODEMODAL({ isOpen, onClose, setisd_code }) {
  const [filterCode, setFilterCode] = useState("");
  const filteredCountries = ISD_CODES.filter(
    (country) =>
      country.name.toLowerCase().includes(filterCode.toLowerCase()) ||
      country.dial_code.includes(filterCode)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior={"inside"}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign={"center"}>Choose Region</ModalHeader>
        <ModalCloseButton />
        <ModalBody pt={0} pos={"relative"}>
          <Input
            mt={2}
            placeholder="Search country name , code"
            onChange={(e) => {
              setFilterCode(e.target.value);
            }}
          />
          <Box mt={4}>
            {filteredCountries.map((code) => (
              <Flex
                cursor={"pointer"}
                key={code.name}
                align={"center"}
                gap={2}
                mb={5}
                onClick={() => {
                  setisd_code(code.dial_code);
                  onClose();
                }}
              >
                <FlagIcon code={code.code} size={28} />
                <Text fontSize={16}>{code.dial_code}</Text>
                <Text fontSize={16}>{code.name}</Text>
              </Flex>
            ))}
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="green" w={100} onClick={onClose} size={"sm"}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export default ISDCODEMODAL;
