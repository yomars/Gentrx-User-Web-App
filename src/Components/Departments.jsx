import { useQuery } from "@tanstack/react-query";
import { GET } from "../Controllers/ApiControllers";
import { useState } from "react";
import {
  Box,
  Button,
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
  const [showAll, setShowAll] = useState(false);

  const getData = async () => {
    const res = await GET("get_specialization");
    return res.data;
  };
  const { isLoading, data, error } = useQuery({
    queryKey: ["home-specializations"],
    queryFn: getData,
  });

  if (error) return <ErrorPage />;

  const legacyOrder = [
    "Surgeon",
    "Optometrist",
    "Oncologist",
    "Pulmonologist",
    "Rheumatologist",
    "Endoctrinologist",
    "Infectious Disease",
    "Cardiologist",
    "Nephrologist",
    "Gastroenterologist",
  ];

  const titleOverrides = {
    Endoctrinologist: "Endocrinologist",
  };

  const prioritizedDepartments = legacyOrder
    .map((title) => data?.find((item) => item.title === title))
    .filter(Boolean);

  const remainingDepartments = (data || []).filter(
    (item) => !legacyOrder.includes(item.title)
  );

  const orderedDepartments = [...prioritizedDepartments, ...remainingDepartments];
  const defaultVisibleCount = 10;
  const homepageDepartments = showAll
    ? orderedDepartments
    : orderedDepartments.slice(0, defaultVisibleCount);

  return (
    <Box mt={2} className="container">
      {data ? (
        <>
          <Flex
            justify="space-between"
            align={{ base: "center", md: "flex-start" }}
            gap={4}
            flexDir={{ base: "column", md: "row" }}
          >
            <Box flex={1}>
              <Heading
                color="#34C38F"
                fontWeight={600}
                textAlign={{ base: "center", md: "left" }}
                fontSize={{ base: "28.8px", md: "41.6px" }}
                lineHeight={1.1}
              >
                Find the Right Care for Your Health
              </Heading>
              <Text
                fontSize={{ base: "14.4px", md: "16px" }}
                textAlign={{ base: "center", md: "left" }}
                mt={4}
                color="#65748b"
                fontWeight={500}
                maxW="980px"
              >
                Browse a full list of medical departments. Pick your concern and
                book a doctor in minutes.
              </Text>
            </Box>
            {orderedDepartments.length > defaultVisibleCount ? (
              <Button
                bg="#1f48dd"
                color="#fff"
                borderRadius="999px"
                px={8}
                h="64px"
                fontSize={{ base: "10.4px", md: "17.68px" }}
                fontWeight={600}
                _hover={{ bg: "#173bb8" }}
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? "Show Less" : "View All"}
              </Button>
            ) : null}
          </Flex>
          <Box mt={8}>
            <Grid
              templateColumns={{
                base: "repeat(1, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(5, 1fr)",
              }}
              gap={{ base: 6, lg: 4 }}
            >
              {homepageDepartments.map((item) => (
                <GridItem
                  key={item.id}
                  backgroundColor="#d6dce4"
                  borderRadius="16px"
                  cursor={"pointer"}
                  minH={{ base: "220px", md: "236px" }}
                  transition={"transform 0.2s ease, box-shadow 0.2s ease"}
                  _hover={{
                    transform: "translateY(-3px)",
                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
                  }}
                  as={Link}
                  to="/doctors"
                >
                  <Flex
                    flexDir={"column"}
                    align={"center"}
                    p={{ base: 6, md: 7 }}
                    justify={"center"}
                    minH="100%"
                    textAlign={"center"}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      h={{ base: "110px", md: "120px" }}
                      w={{ base: "110px", md: "120px" }}
                      borderRadius="full"
                      bg="radial-gradient(circle at 30% 20%, #cae4d9 0%, #0b6d30 72%)"
                      boxShadow="inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 18px rgba(11,109,48,0.16)"
                    >
                      <Image
                        src={
                          item.image
                            ? `${imageBaseURL}/${item.image}`
                            : "/imagePlaceholder.png"
                        }
                        fallbackSrc="/imagePlaceholder.png"
                        maxW={{ base: "78px", md: "90px" }}
                        maxH={{ base: "78px", md: "90px" }}
                        objectFit="contain"
                      />
                    </Box>
                    <Text
                      mt={5}
                      fontSize={{ base: "20.8px", md: "14.4px", lg: "16px" }}
                      fontWeight={500}
                      color="#0f2a52"
                      lineHeight={1.25}
                    >
                      {titleOverrides[item.title] || item.title}
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
