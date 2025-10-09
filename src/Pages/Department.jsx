import { Box, Flex, Image, Text } from "@chakra-ui/react";

import { useNavigate, useParams } from "react-router-dom";
import DoctorsByDeptID from "./DoctorsDeptID";
import { GET } from "../Controllers/ApiControllers";
import Loading from "../Components/Loading";
import { useQuery } from "@tanstack/react-query";
import imageBaseURL from "../Controllers/image";

export default function Department() {
  const { id, name } = useParams();
  const navigate = useNavigate();

  const getData = async () => {
    const res = await GET("get_department_active");
    return res.data;
  };
  const { isLoading: deptLoading, data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: getData,
  });

  if (deptLoading) {
    return <Loading />;
  }
  return (
    <Box>
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "20" }}>
        <Box className="container">
          <Text
            fontSize={{ base: 28, md: 40 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            {name} Department
          </Text>

          <Text
            fontSize={{ base: 14, md: 22 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            Explore a Multifaceted Team of <br />
            <Text as={"span"} color={"green.text"} fontWeight={800}>
              {name} Department
            </Text>
          </Text>
        </Box>
      </Box>{" "}
      <div className="container">
        <Box>
          <Text
            fontSize={16}
            textAlign={"center"}
            mt={4}
            color={"gray.500"}
            fontWeight={500}
          >
            Experience the ease of finding the right medical <br /> expert for
            your needs with our comprehensive selection of doctors.
          </Text>
          <Flex mt={5} gap={5} flexDir={{ base: "column", md: "row" }}>
            <Box w={{ base: "100%", md: "70%" }}>
              <DoctorsByDeptID deptID={id} deptName={name} />
            </Box>
            <Box
              w={{ base: "100%", md: "30%" }}
              bg={"#fff"}
              borderRadius={8}
              h={"fit-content"}
              p={4}
              boxShadow={"2px 2px 20px 0 rgb(82 66 47 / 12%)"}
            >
              <Text fontSize={20} textAlign={"center"} fontWeight={500}>
                Explore Other Departments
              </Text>

              <Box mt={10}>
                {deptData.map((dept) => (
                  <Box
                    key={dept.id}
                    w={"100%"}
                    mb={5}
                    _hover={{ border: "1px solid #0032ff" }}
                    transition={"border 0.1s ease"}
                    border={"1px solid"}
                    borderColor={"gray.200"}
                    p={2}
                    borderRadius={4}
                    cursor={"pointer"}
                    onClick={() => {
                      navigate(`/department/${dept.title}/${dept.id}`);
                    }}
                  >
                    <Flex gap={5} align={"center"}>
                      <Image src={`${imageBaseURL}/${dept.image}`} w={"50px"} />
                      <Text
                        fontSize={18}
                        textAlign={"center"}
                        fontWeight={500}
                        textTransform={"capitalize"}
                      >
                        {dept.title}
                      </Text>
                    </Flex>
                  </Box>
                ))}
              </Box>
            </Box>
          </Flex>
        </Box>
      </div>
    </Box>
  );
}
