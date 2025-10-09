/* eslint-disable react/prop-types */
import QRCode from "react-qr-code";
import { Center } from "@chakra-ui/react";

const MeetingQR = ({ data }) => {
  return (
    <Center>
      <Center p={4} bg="white" w="300px" textAlign="center">
        <QRCode value={data} size={150} bgColor="#ffffff" fgColor="#000000" />
      </Center>
    </Center>
  );
};

export default MeetingQR;
