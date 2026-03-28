/* eslint-disable react-hooks/rules-of-hooks */
import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Image,
  Skeleton,
  Text,
} from "@chakra-ui/react";
import imageBaseURL from "./../Controllers/image";
import "swiper/css";
import { Link } from "react-router-dom";
import ErrorPage from "../Pages/ErrorPage";

export default function Departments() {
  const getData = async () => {
    const res = await GET("get_department_active");
    return res.data;
  };
  const { isLoading, data, error } = useQuery({
    queryKey: ["departments"],
    queryFn: getData,
  });

  if (error) return <ErrorPage />;

  return (
    <Box mt={5} className="container">
      {data ? (
        <>
          <Heading color={"primary.text"} fontWeight={600} textAlign={"center"}>
            Find the Right Care for Your Health
          </Heading>
          <Text
            fontSize={14}
            textAlign={"center"}
            mt={2}
            color={"gray.500"}
            fontWeight={500}
          >
            Browse a full list of medical departments. Pick your concern and
            book a doctor in minutes.
          </Text>
          <Box mt={4}>
            <Grid
              templateColumns={{
                base: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
                lg: "repeat(5, 1fr)",
              }}
              gap={6}
            >
              {data?.map((item) => (
                <GridItem
                  key={item.id}
                  backgroundColor={"gray.100"}
                  borderRadius={10}
                  cursor={"pointer"}
                  transition={"all 0.3s"}
                  _hover={{
                    backgroundColor: "primary.main",
                    color: "#fff",
                    transform: "scale(1.05)",
                    transition: "all 0.3s",
                  }}
                  as={Link}
                  to={`/department/${item.title}/${item.id}`}
                >
                  <Flex
                    flexDir={"column"}
                    align={"center"}
                    cursor={"pointer"}
                    padding={5}
                    justify={"center"}
                  >
                    <Box
                      overflow={"hidden"}
                      h={"80px"}
                      w={"80px"}
                      borderRadius={item.image ? "10%" : "0"}
                    >
                      {" "}
                      <Image
                        src={
                          item.image
                            ? `${imageBaseURL}/${item.image}`
                            : "imagePlaceholder.png"
                        }
                        w={{ base: "80px", md: "80px" }}
                      />
                    </Box>
                    <Text
                      mt={2}
                      fontSize={{ base: "15px", md: "16px", lg: "16px" }}
                      fontWeight={600}
                    >
                      {item.title}
                    </Text>
                  </Flex>
                </GridItem>
              ))}
            </Grid>
          </Box>
        </>
      ) : null}
      {isLoading ? (
        <>
          {" "}
          <Skeleton h={"100px"} w={"100%"} mt={5} />
        </>
      ) : null}
      {error ? (
        <>
          {" "}
          <Text
            fontSize={{ base: 12, md: 14 }}
            fontWeight={400}
            color={"red"}
            textAlign={"center"}
          >
            Something Went wrong!
          </Text>
          <Text
            fontSize={{ base: 12, md: 14 }}
            fontWeight={400}
            color={"red"}
            textAlign={"center"}
          >
            Can&apos;t Fetch Departments!
          </Text>
        </>
      ) : null}
    </Box>
  );
}
