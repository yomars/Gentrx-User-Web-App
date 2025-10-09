import { Box, Flex, Text } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      width="100%"
      height="100%"
      bg={"gray.50"}
      zIndex={9999}
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Flex w={"100%"} h={"100%"} align={"center"} justify={"center"}>
        <Flex flexDir={"column"} align={"center"}>
          <div className="loading">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <Text letterSpacing={5}>PLEASE WAIT</Text>
        </Flex>
      </Flex>
    </Box>
  );
}
