/* eslint-disable react/prop-types */
import { GET } from "../../Controllers/ApiControllers";
import { useQuery } from "@tanstack/react-query";
import Loading from "../../Components/Loading";
import { Alert, AlertIcon, Box, ChakraProvider, Text } from "@chakra-ui/react";
import DOMPurify from "dompurify";
import { NotFoundPage } from "../NotFoundPage";

function Webpage({ id }) {
  const getData = async () => {
    const res = await GET(`get_web_page/page/${id}`);

    if (res.response !== 200) {
      throw new Error(res.message);
    }
    return res.data;
  };

  const { isLoading, data, error } = useQuery({
    queryKey: ["web-page", id],
    queryFn: getData,
  });

  if (isLoading) return <Loading />;
  if (!data || error) return <NotFoundPage />;

  const migratedHtml = String(data.body || "")
    .replace(/https:\/\/www\.gentrx\.com\.ph/gi, "https://www.gentrx.ph")
    .replace(/https:\/\/gentrx\.com\.ph/gi, "https://www.gentrx.ph")
    .replace(/info@gentrx\.com\.ph/gi, "info@gentrx.ph");

  const sanitizedHtml = DOMPurify.sanitize(migratedHtml);

  return (
    <Box>
      {" "}
      <Box bg={"primary.main"} p={4} py={{ base: "4", md: "10" }}>
        <Box className="container">
          <Text
            fontFamily={"Quicksand, sans-serif"}
            fontSize={{ base: 20, md: 32 }}
            fontWeight={700}
            textAlign={"center"}
            mt={0}
            color={"#fff"}
          >
            {data?.title}
          </Text>
        </Box>
      </Box>{" "}
      <Box className="container" mt={5} pb={20} px={5}>
        <ChakraProvider resetCSS={false}>
          {" "}
          {data && (
            <div className="no-chakra">
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            </div>
          )}
        </ChakraProvider>
      </Box>
    </Box>
  );
}

export default Webpage;
