import { AiFillBell } from "react-icons/ai";
import { useState } from "react";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Button,
  Box,
  Flex,
  Image,
  useTheme,
} from "@chakra-ui/react";
import { BiBell } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADD, GET } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import imageBaseURL from "../Controllers/image";

// import messaging from firebase.js

const getData = async () => {
  const res = await GET(
    `get_user_notification/date/${user.id}/${user.created_at}`
  );
  if (res.response !== 200) {
    return [];
  }
  return res.data;
};
const getDotStatus = async () => {
  const res = await GET(`users_notification_seen_status/${user.id}`);
  if (res.response !== 200) {
    return [];
  }
  return res.data;
};

const updateReadStatus = async () => {
  let data = {
    id: user.id,
    notification_seen_at: true,
  };
  const res = await ADD(user.token, `update_user`, data);
  if (res.response !== 200) {
    return [];
  }
  return res.data;
};

function NotificationIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const theme = useTheme();

  const { data } = useQuery({
    queryKey: ["notification"],
    queryFn: getData,
  });
  const { data: dotStatus } = useQuery({
    queryKey: ["dot-status"],
    queryFn: getDotStatus,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await updateReadStatus();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["dot-status", user.id]);
    },
  });

  const handleMenuToggle = () => {
    if (!isOpen) {
      mutation.mutate();
    }
    setIsOpen(!isOpen);
  };

  return (
    <Menu isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <MenuButton
        as={Button}
        onClick={handleMenuToggle}
        variant="ghost"
        colorScheme="black"
        pos={"relative"}
        size={"sm"}
      >
        <BiBell fontSize={"20px"} />
        {dotStatus?.dot_status && (
          <Box
            bg="red.300"
            borderRadius="full"
            position="absolute"
            top="0"
            right="1"
            w={3}
            h={3}
            color={"#fff"}
            display={"flex"}
            alignItems={"center"}
            justifyContent={"center"}
          >
            <Box bg={"#fff"} w={"6px"} h={"6px"} borderRadius={"50%"}></Box>
          </Box>
        )}
      </MenuButton>
      <MenuList w={300} maxH={"90vh"} overflow={"scroll"}>
        {data?.slice(0, 20).map((item) => (
          <MenuItem key={item.id} color={"#000"}>
            <Box>
              <Flex gap={5} align={"center"}>
                <Box>
                  {" "}
                  {item?.image !== null ? (
                    <Image
                      src={`${imageBaseURL}/${item.image}`}
                      fallbackSrc="/imagePlaceholder.png"
                      w={8}
                    />
                  ) : (
                    <AiFillBell fontSize={24} color={theme.colors.teal[600]} />
                  )}
                </Box>

                <Box>
                  <Text
                    fontWeight={600}
                    color={"primary.text"}
                    mb={1}
                    lineHeight={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    fontWeight={500}
                    fontSize={"xs"}
                    lineHeight={"12px"}
                    maxW={"100%"}
                    wordBreak={"break-all"}
                  >
                    {item.body}
                  </Text>
                </Box>
              </Flex>
            </Box>
          </MenuItem>
        ))}
        {data?.length === 0 && (
          <MenuItem color={"#000"}>No notifications</MenuItem>
        )}
      </MenuList>
    </Menu>
  );
}

export default NotificationIcon;
