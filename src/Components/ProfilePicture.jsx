/* eslint-disable react/prop-types */
import { useRef } from "react";
import { Box, IconButton, Image, useToast } from "@chakra-ui/react";
import { BiEdit } from "react-icons/bi";
import imageBaseURL from "../Controllers/image";
import { ADD } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import showToast from "../Controllers/ShowToast";
import Loading from "./Loading";
import { updateUserLocalStorage } from "../Controllers/updateUserLocalStorage";
import { resolveMediaUrl } from "../lib/media";

const handleUpdate = async (data) => {
  const res = await ADD(user.token, "update_user", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};

function ProfilePicture({ img }) {
  const fileInputRef = useRef(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data) => {
      const formData = new FormData();
      formData.append("id", user.id);
      formData.append("image", data);
      await handleUpdate(formData);
    },
    onSuccess: () => {
      showToast(toast, "success", "Profile Picture Changed");
      queryClient.invalidateQueries("user");
      updateUserLocalStorage(user.phone);
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validFormats = ["image/png", "image/jpeg", "image/svg+xml"];
      if (validFormats.includes(file.type)) {
        mutation.mutate(file);
      } else {
        toast({
          title: "Invalid file type.",
          description: "Please select a PNG, JPG, or SVG file.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  if (mutation.isPending) return <Loading />;

  return (
    <Box w={"100%"}>
      <Box pos={"relative"} w={"fit-content"}>
        <Image
          src={resolveMediaUrl(img) || `${imageBaseURL}/${img}`}
          w={32}
          h={32}
          fallbackSrc="/user.png"
          borderRadius={"full"}
          objectFit="cover"
        />
        <IconButton
          size={"sm"}
          icon={<BiEdit fontSize={20} />}
          variant={"ghost"}
          pos={"absolute"}
          top={0}
          right={0}
          _hover={{
            background: "rgba(0, 0, 266, 0.5)",
            color: "#fff",
          }}
          onClick={() => fileInputRef.current.click()}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept=".png, .jpg, .jpeg, .svg"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>
    </Box>
  );
}

export default ProfilePicture;
