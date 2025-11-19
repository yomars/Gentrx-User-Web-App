import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  VStack,
  useToast,
  FormErrorMessage,
  Heading,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useMutation } from "@tanstack/react-query";
import { ADD } from "../Controllers/ApiControllers";
import user from "../Controllers/user";
import showToast from "../Controllers/ShowToast";

const handleChangePassword = async (data) => {
  const res = await ADD(user.token, "change_password", data);
  if (res.response !== 200) {
    throw new Error(res.message);
  }
  return res;
};

const ChangePassword = () => {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const newPassword = watch("new_password");

  const mutation = useMutation({
    mutationFn: async (data) => {
      let formData = {
        user_id: user.id,
        old_password: data.old_password,
        new_password: data.new_password,
      };
      await handleChangePassword(formData);
    },
    onSuccess: () => {
      showToast(toast, "success", "Password changed successfully");
      reset();
    },
    onError: (error) => {
      showToast(toast, "error", error.message);
    },
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <Box
      w={"full"}
      bg={useColorModeValue("white", "gray.800")}
      boxShadow={"xl"}
      rounded={"lg"}
      mt={5}
      borderRadius={8}
      overflow={"hidden"}
    >
      <Heading
        fontSize={"lg"}
        textAlign={"center"}
        py={3}
        bg={"primary.main"}
        color={"#fff"}
      >
        Change Password
      </Heading>
      <Divider />
      <VStack
        as="form"
        onSubmit={handleSubmit(onSubmit)}
        spacing={4}
        p={6}
        align="stretch"
      >
        {/* Old Password */}
        <FormControl isInvalid={errors.old_password}>
          <FormLabel>Old Password</FormLabel>
          <InputGroup size={"md"}>
            <Input
              type={showOldPassword ? "text" : "password"}
              placeholder="Enter your old password"
              {...register("old_password", {
                required: "Old password is required",
              })}
            />
            <InputRightElement>
              <IconButton
                variant="ghost"
                size="sm"
                icon={showOldPassword ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowOldPassword(!showOldPassword)}
                aria-label={
                  showOldPassword ? "Hide password" : "Show password"
                }
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.old_password?.message}</FormErrorMessage>
        </FormControl>

        {/* New Password */}
        <FormControl isInvalid={errors.new_password}>
          <FormLabel>New Password</FormLabel>
          <InputGroup size={"md"}>
            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter your new password"
              {...register("new_password", {
                required: "New password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
            />
            <InputRightElement>
              <IconButton
                variant="ghost"
                size="sm"
                icon={showNewPassword ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={
                  showNewPassword ? "Hide password" : "Show password"
                }
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.new_password?.message}</FormErrorMessage>
        </FormControl>

        {/* Confirm New Password */}
        <FormControl isInvalid={errors.confirm_password}>
          <FormLabel>Re-Enter New Password</FormLabel>
          <InputGroup size={"md"}>
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your new password"
              {...register("confirm_password", {
                required: "Please confirm your new password",
                validate: (value) =>
                  value === newPassword || "Passwords do not match",
              })}
            />
            <InputRightElement>
              <IconButton
                variant="ghost"
                size="sm"
                icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>
            {errors.confirm_password?.message}
          </FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          colorScheme="green"
          size="md"
          width="full"
          isLoading={mutation.isPending}
        >
          Change Password
        </Button>
      </VStack>
    </Box>
  );
};

export default ChangePassword;